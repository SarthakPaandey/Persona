"""RAG (Retrieval-Augmented Generation) engine."""

import structlog
from dataclasses import dataclass, field
from typing import List

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_pinecone import PineconeVectorStore

from app.config import Settings
from app.core.llm import get_llm
from app.core.prompt_templates import format_chat_prompt
from app.models.schemas import ConversationMessage
from app.services.persona_service import PersonaService

logger = structlog.get_logger()


def _aimessage_content_to_str(content: object) -> str:
    """Normalize LangChain AIMessage content (str or multimodal list) to a plain string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(str(block.get("text") or block.get("content") or ""))
            else:
                parts.append(str(block))
        return "".join(parts)
    return str(content)


@dataclass
class RAGResult:
    """Result from a RAG query."""

    answer: str
    source_documents: List[Document] = field(default_factory=list)
    confidence: float = 0.0


class RAGEngine:
    """
    RAG pipeline that retrieves relevant documents from the vector store
    and generates grounded responses using GPT-4o.
    """

    def __init__(self, settings: Settings, vector_store: PineconeVectorStore):
        self.settings = settings
        self.vector_store = vector_store
        self.llm = get_llm(settings)
        self._persona = PersonaService()

    async def query(
        self,
        query: str,
        conversation_history: List[ConversationMessage],
        additional_context: str = "",
    ) -> RAGResult:
        """Process a query through the RAG pipeline."""
        logger.info("RAG query", query=query[:100])

        retrieved_docs = await self._retrieve(query)
        retrieved_docs = self._filter_excluded_github(retrieved_docs, query)
        context = self._format_context(retrieved_docs)
        history_str = self._format_history(conversation_history)

        cfg = self._persona.config
        role_req = cfg.get("target_role_requirements") or ""
        if not isinstance(role_req, str):
            role_req = ""
        bg_notes = cfg.get("background_notes") or ""
        if not isinstance(bg_notes, str):
            bg_notes = ""

        display_name = (cfg.get("name") or "").strip() or self.settings.persona_name
        display_role = (cfg.get("role") or "").strip() or self.settings.persona_role

        raw_show = cfg.get("github_showcase_repos") or []
        showcase_str = (
            ", ".join(str(x).strip() for x in raw_show if x)
            if isinstance(raw_show, list)
            else ""
        )

        system_prompt = format_chat_prompt(
            persona_name=display_name,
            persona_role=display_role,
            context=context,
            conversation_history=history_str,
            additional_context=additional_context,
            role_requirements=role_req,
            background_notes=bg_notes,
            github_showcase_repos=showcase_str,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ]

        response = await self.llm.ainvoke(messages)

        confidence = self._calculate_confidence(retrieved_docs)

        logger.info(
            "RAG response generated",
            query=query[:50],
            num_sources=len(retrieved_docs),
            confidence=confidence,
        )

        source_docs: List[Document] = []
        for doc, score in retrieved_docs:
            merged = Document(
                page_content=doc.page_content,
                metadata={**doc.metadata, "score": float(score)},
            )
            source_docs.append(merged)

        return RAGResult(
            answer=_aimessage_content_to_str(getattr(response, "content", None)),
            source_documents=source_docs,
            confidence=confidence,
        )

    def _is_project_query(self, query: str) -> bool:
        q = query.lower()
        return any(
            w in q
            for w in (
                "github",
                "git hub",
                "repository",
                "repo",
                "project",
                "portfolio",
                "open source",
                "code",
                "build",
            )
        )

    def _retrieve_k(self, query: str) -> int:
        """Use a larger top-k when the user asks about projects/GitHub (more candidates to rank)."""
        k = self.settings.retrieval_top_k
        if self._is_project_query(query):
            return min(16, k + 8)
        return k

    def _merge_showcase_boost(self, query: str, docs_with_scores: List[tuple]) -> List[tuple]:
        """
        Pure vector search can surface unrelated small repos. Merge in a second retrieval biased toward
        AI/ML + flagship repo names, then rank showcase repos first.
        """
        raw = self._persona.config.get("github_showcase_repos") or []
        if not isinstance(raw, list) or not raw:
            return docs_with_scores
        showcase = {str(x).strip() for x in raw if x}
        if not showcase or not self._is_project_query(query):
            return docs_with_scores

        bias_q = (
            f"{query} artificial intelligence machine learning LLM RAG agents "
            f"embeddings Pinecone LangChain production {' '.join(sorted(showcase))}"
        )
        try:
            extra = self.vector_store.similarity_search_with_score(
                bias_q, k=min(24, len(showcase) + 14)
            )
        except Exception as e:
            logger.warning("showcase boost search failed", error=str(e))
            extra = []

        def doc_key(doc: Document) -> tuple:
            return (doc.metadata.get("source", ""), doc.page_content[:160])

        best: dict = {}
        for doc, score in docs_with_scores + extra:
            if score < self.settings.similarity_threshold:
                continue
            k = doc_key(doc)
            if k not in best or score > best[k][1]:
                best[k] = (doc, score)

        if not best:
            for doc, score in docs_with_scores + extra:
                k = doc_key(doc)
                if k not in best or score > best[k][1]:
                    best[k] = (doc, score)

        items = list(best.values())

        q_lower = query.lower()
        is_recent = any(w in q_lower for w in ("recent", "latest", "newest", "current", "last updated"))

        def rank(item: tuple) -> tuple:
            doc, score = item
            repo = (doc.metadata.get("repo_name") or "").strip()
            
            pri = 1 if repo in showcase else 0

            if is_recent:
                date_str = doc.metadata.get("last_updated", "1970-01-01")
                return (pri, date_str, score)

            return (pri, score)

        items.sort(key=rank, reverse=True)
        return items[:12]

    def _filter_excluded_github(
        self, docs_with_scores: List[tuple], query: str
    ) -> List[tuple]:
        """Drop low-signal GitHub repos listed in persona_config (e.g. profile readme only)."""
        raw = self._persona.config.get("github_exclude_repos") or []
        if not isinstance(raw, list) or not raw:
            return docs_with_scores
        excluded = {str(x).strip() for x in raw if x}
        if not excluded:
            return docs_with_scores

        q = query.lower()
        project_like = any(
            w in q for w in ("github", "repo", "project", "portfolio", "code", "build")
        )
        if not project_like:
            return docs_with_scores

        filtered = []
        for doc, score in docs_with_scores:
            repo = doc.metadata.get("repo_name") or ""
            src = doc.metadata.get("source", "")
            if src.startswith("github:") and repo in excluded:
                continue
            filtered.append((doc, score))

        return filtered if filtered else docs_with_scores[:5]

    async def _retrieve(self, query: str) -> List[tuple]:
        """Retrieve relevant documents from vector store."""
        try:
            k = self._retrieve_k(query)
            results = self.vector_store.similarity_search_with_score(query, k=k)

            filtered = [
                (doc, score)
                for doc, score in results
                if score >= self.settings.similarity_threshold
            ]

            logger.info(
                "Documents retrieved",
                total=len(results),
                after_filter=len(filtered),
            )

            base = filtered if filtered else (results[:5] if results else [])
            merged = self._merge_showcase_boost(query, base)
            return merged if merged else base

        except Exception as e:
            logger.error("Retrieval failed", error=str(e))
            return []

    def _format_context(self, docs_with_scores: List[tuple]) -> str:
        """Format retrieved documents into context string."""
        if not docs_with_scores:
            return "No relevant documents found in the knowledge base."

        context_parts = []
        for i, (doc, score) in enumerate(docs_with_scores, 1):
            source = doc.metadata.get("source", "unknown")
            context_parts.append(
                f"[Source {i}: {source} (relevance: {score:.2f})]\n{doc.page_content}"
            )

        return "\n\n---\n\n".join(context_parts)

    def _format_history(self, history: List[ConversationMessage]) -> str:
        """Format conversation history."""
        if not history:
            return "No previous conversation."

        formatted = []
        for msg in history[-10:]:
            role = "User" if msg.role == "user" else "Assistant"
            formatted.append(f"{role}: {msg.content}")

        return "\n".join(formatted)

    def _calculate_confidence(self, docs_with_scores: List[tuple]) -> float:
        """Calculate confidence score based on retrieval quality."""
        if not docs_with_scores:
            return 0.0

        scores = [score for _, score in docs_with_scores]
        avg_score = sum(scores) / len(scores)
        return min(avg_score, 1.0)

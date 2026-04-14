"""Operational ingestion endpoints for refreshing vector data in production."""

import structlog
from fastapi import APIRouter, HTTPException, Request

from app.ingestion.ingest_github import ingest_github
from app.ingestion.ingest_resume import ingest_resume

logger = structlog.get_logger()
router = APIRouter()


@router.post(
    "/github",
    responses={500: {"description": "GitHub ingestion failed"}},
)
async def ingest_github_route(request: Request, clear_existing: bool = True):
    """Refresh GitHub documents in the vector store."""
    settings = request.app.state.settings
    vector_store_manager = request.app.state.vector_store_manager

    try:
        if clear_existing:
            vector_store_manager.delete_by_metadata(
                metadata_filter={"document_type": {"$eq": "github"}},
                namespace="",
            )

        github_chunks = ingest_github(settings, vector_store_manager)
        return {
            "success": True,
            "chunks_ingested": github_chunks,
            "clear_existing": clear_existing,
        }
    except Exception as e:
        logger.error("github_ingestion_endpoint_failed", error=str(e))
        raise HTTPException(status_code=500, detail="GitHub ingestion failed") from e


@router.post(
    "/all",
    responses={
        400: {"description": "Resume file not found"},
        500: {"description": "Ingestion failed"},
    },
)
async def ingest_all_route(request: Request, clear_namespace: bool = False):
    """Run resume + GitHub ingestion in one request."""
    settings = request.app.state.settings
    vector_store_manager = request.app.state.vector_store_manager

    try:
        if clear_namespace:
            vector_store_manager.delete_namespace("")

        resume_chunks = ingest_resume(settings, vector_store_manager)
        github_chunks = ingest_github(settings, vector_store_manager)

        return {
            "success": True,
            "resume_chunks": resume_chunks,
            "github_chunks": github_chunks,
            "total_chunks": resume_chunks + github_chunks,
            "clear_namespace": clear_namespace,
        }
    except FileNotFoundError as e:
        logger.error("ingestion_resume_missing", error=str(e))
        raise HTTPException(status_code=400, detail="Resume file not found") from e
    except Exception as e:
        logger.error("full_ingestion_endpoint_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Ingestion failed") from e

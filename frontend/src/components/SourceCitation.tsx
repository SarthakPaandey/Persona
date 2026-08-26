import React from 'react';
import { FileText, Github, Satellite } from 'lucide-react';

import { Source } from '@/lib/types';
import { formatRelevance, formatSourceLabel } from '@/utils/formatters';

interface SourceCitationProps {
  source: Source;
}

function getSourceIcon(sourceName: string) {
  const prefix = sourceName.split(':')[0];
  if (prefix === 'github') return <Github size={13} aria-hidden="true" />;
  if (prefix === 'resume') return <FileText size={13} aria-hidden="true" />;
  return <Satellite size={13} aria-hidden="true" />;
}

export default function SourceCitation({ source }: SourceCitationProps) {
  return (
    <div className="group rounded-xl border border-white/[0.07] bg-space-900/60 backdrop-blur px-3.5 py-3 transition-colors hover:border-cyan-400/20 hover:bg-space-900/80">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
        <span className="w-7 h-7 rounded-lg border border-cyan-400/15 bg-cyan-500/10 text-cyan-300 flex items-center justify-center shrink-0">
          {getSourceIcon(source.source)}
        </span>
        <span className="truncate text-slate-200">{formatSourceLabel(source.source)}</span>
        {source.relevance_score > 0 && (
          <span
            className="ml-auto shrink-0 text-[10px] font-mono font-semibold tracking-wide text-violet-200 bg-violet-500/10 border border-violet-400/20 rounded-full px-2 py-1"
            title="Retrieval relevance score"
          >
            {formatRelevance(source.relevance_score)} match
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed border-l-2 border-cyan-400/20 pl-2.5">
        “{source.content}”
      </p>
    </div>
  );
}

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
    <div className="rounded-lg border border-cyan-400/15 bg-space-900/70 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
        <span className="text-cyan-300">{getSourceIcon(source.source)}</span>
        <span className="truncate">{formatSourceLabel(source.source)}</span>
        {source.relevance_score > 0 && (
          <span
            className="ml-auto shrink-0 text-[10px] font-semibold text-violet-300/90 bg-violet-500/10 border border-violet-400/25 rounded-full px-2 py-0.5"
            title="Retrieval relevance score"
          >
            {formatRelevance(source.relevance_score)} match
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
        “{source.content}”
      </p>
    </div>
  );
}

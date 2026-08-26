'use client';

import React from 'react';
import { BookOpen, Bot, CalendarCheck, Github, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  personaName: string;
  onPick: (query: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Sparkles,
    title: 'Skills & experience',
    query: 'What AI engineering skills do you have?',
  },
  {
    icon: Github,
    title: 'Latest projects',
    query: 'Show me your latest GitHub projects',
  },
  {
    icon: BookOpen,
    title: 'RAG deep dive',
    query: 'Tell me about your RAG experience',
  },
  {
    icon: CalendarCheck,
    title: 'Book an interview',
    query: "I'd like to book an interview",
  },
];

export default function EmptyState({ personaName, onPick }: EmptyStateProps) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-2 py-12 sm:py-14 animate-fade-up">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur flex items-center justify-center text-cyan-300 shadow-glow-sm">
        <Bot size={22} strokeWidth={1.8} aria-hidden="true" />
      </div>

      <h2 className="mt-4 font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
        Ask RORI
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Ask about {personaName} — skills, projects, or availability
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[520px]">
        {SUGGESTIONS.map(({ icon: Icon, title, query }) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            className="group text-left flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-black/30 hover:bg-black/40 hover:border-white/[0.12] backdrop-blur-sm transition-colors"
          >
            <span className="w-8 h-8 shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-400/20 flex items-center justify-center transition-colors">
              <Icon size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-200 group-hover:text-white leading-none">
                {title}
              </span>
              <span className="block mt-1 text-xs text-slate-500 leading-snug truncate">
                {query}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

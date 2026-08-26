'use client';

import React from 'react';
import { ArrowUpRight, BookOpen, Bot, CalendarCheck, Github, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  personaName: string;
  onPick: (query: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Sparkles,
    label: 'Skills & experience',
    query: 'What AI engineering skills does Sarthak have?',
  },
  {
    icon: Github,
    label: 'Latest projects',
    query: "Show me Sarthak's latest GitHub projects",
  },
  {
    icon: BookOpen,
    label: 'RAG deep dive',
    query: "Tell me about Sarthak's RAG experience",
  },
  {
    icon: CalendarCheck,
    label: 'Book an interview',
    query: 'I’d like to book an interview with Sarthak',
  },
];

export default function EmptyState({ personaName, onPick }: EmptyStateProps) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-2 py-10 sm:py-12 animate-fade-up">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-400 animate-float">
        <Bot size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>

      <h2 className="mt-3 font-display text-lg font-medium tracking-tight text-slate-100">
        Ask RORI
      </h2>
      <p className="mt-1 text-sm text-slate-500">Ask about {personaName}</p>

      <div className="mt-7 w-full max-w-[520px] space-y-2">
        {SUGGESTIONS.map(({ icon: Icon, label, query }, i) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group flex w-full items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.10] px-4 py-3 text-left transition-colors animate-fade-up hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
          >
            <span className="w-7 h-7 shrink-0 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors">
              <Icon size={13} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-none text-slate-200 group-hover:text-white">
                {label}
              </span>
              <span className="block text-xs leading-none text-slate-500 truncate mt-1">
                {query}
              </span>
            </span>
            <ArrowUpRight
              size={14}
              className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-600">Tap a question or type your own below</p>
    </div>
  );
}

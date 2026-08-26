'use client';

import React from 'react';
import { BookOpen, CalendarCheck, Github, Rocket, Sparkles } from 'lucide-react';

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
    <div className="min-h-full flex flex-col items-center justify-center text-center px-2 py-10 animate-fade-up">
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-full bg-cyan-500/20 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/space/astronaut.jpg"
          alt="Astronaut RORI on a spacewalk"
          className="relative w-24 h-24 rounded-full object-cover ring-2 ring-cyan-400/80 shadow-glow"
          draggable={false}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 text-lg"
          style={{ filter: 'drop-shadow(0 0 6px rgba(103, 232, 249, 0.9))' }}
        >
          ✦
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400/60" />
        <span className="text-cyan-300 text-xs">✦</span>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/60" />
      </div>

      <h2 className="mt-4 font-display text-3xl sm:text-4xl tracking-wide text-slate-50">
        Greetings,{' '}
        <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
          Traveler
        </span>
      </h2>
      <p className="mt-3 max-w-md text-sm sm:text-[15px] leading-relaxed text-slate-300/90">
        You&apos;ve boarded the ship of <span className="text-cyan-300">RORI</span> —{' '}
        {personaName}&apos;s AI navigator. Ask about the mission log, or chart a
        course for an interview below.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {SUGGESTIONS.map(({ icon: Icon, title, query }) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            className="group text-left p-3.5 rounded-xl border border-cyan-400/15 bg-black/40 hover:bg-black/55 hover:border-cyan-400/45 backdrop-blur-sm transition-all duration-150 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-cyan-500/12 text-cyan-300 flex items-center justify-center transition-colors group-hover:bg-cyan-500/25 group-hover:text-cyan-200">
                <Icon size={15} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-slate-100">{title}</span>
            </span>
            <span className="block mt-1.5 text-xs text-slate-400 leading-relaxed">
              {query}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tracking-widest uppercase">
        <Rocket size={11} aria-hidden="true" /> Transmission channel secured
      </p>
    </div>
  );
}

'use client';

import React from 'react';
import { ArrowUpRight, BookOpen, CalendarCheck, Github, Rocket, Sparkles, Zap } from 'lucide-react';

interface EmptyStateProps {
  personaName: string;
  onPick: (query: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Sparkles,
    accent: 'cyan' as const,
    title: 'Skills & experience',
    query: 'What AI engineering skills do you have?',
    hint: 'Stack, RAG, agents',
  },
  {
    icon: Github,
    accent: 'violet' as const,
    title: 'Latest projects',
    query: 'Show me your latest GitHub projects',
    hint: 'Live code & demos',
  },
  {
    icon: BookOpen,
    accent: 'emerald' as const,
    title: 'RAG deep dive',
    query: 'Tell me about your RAG experience',
    hint: 'Pinecone → production',
  },
  {
    icon: CalendarCheck,
    accent: 'amber' as const,
    title: 'Book an interview',
    query: "I'd like to book an interview",
    hint: 'Find a slot, confirm',
  },
];

const accentMap = {
  cyan: 'bg-cyan-500/10 text-cyan-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-200 border-cyan-400/20',
  violet: 'bg-violet-500/10 text-violet-300 group-hover:bg-violet-500/20 group-hover:text-violet-200 border-violet-400/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-200 border-emerald-400/20',
  amber: 'bg-amber-500/10 text-amber-300 group-hover:bg-amber-500/20 group-hover:text-amber-200 border-amber-400/20',
};

export default function EmptyState({ personaName, onPick }: EmptyStateProps) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-2 py-8 sm:py-10 animate-fade-up">
      {/* Hero halo + orbital */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute -inset-10 rounded-full blur-[42px] opacity-60"
          style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.22) 0%, rgba(139,92,246,0.18) 45%, transparent 72%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-full border border-cyan-400/10"
          style={{ transform: 'scale(1.08)' }}
        />
        <div className="relative w-28 h-28 rounded-full p-[2px] bg-gradient-to-br from-cyan-300/70 via-violet-400/50 to-cyan-300/30 shadow-glow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/space/astronaut.jpg"
            alt="Astronaut RORI on a spacewalk"
            className="w-full h-full rounded-full object-cover bg-space-950"
            draggable={false}
          />
        </div>
        <span aria-hidden="true" className="orbit-ring" style={{ inset: -6 }} />
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-space-950 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-glow-sm"
          style={{ filter: 'drop-shadow(0 0 10px rgba(103,232,249,0.9))' }}
        >
          <Zap size={13} />
        </span>
        {/* ground glow */}
        <div
          aria-hidden="true"
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full blur-[14px] bg-cyan-400/25"
        />
      </div>

      {/* Telemetry rail */}
      <div className="mt-6 flex items-center gap-2.5 text-[10px] font-mono tracking-[0.18em] text-slate-500 uppercase">
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          NAV-COM ONLINE
        </span>
        <span className="hidden sm:inline h-3 w-px bg-white/10" />
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-cyan-300/70" />
          MISSION READY
        </span>
      </div>

      <h2 className="mt-4 font-display text-[30px] sm:text-[38px] leading-none tracking-tight text-slate-50">
        Greetings,{' '}
        <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
          Traveler
        </span>
      </h2>
      <p className="mt-3 max-w-[36rem] text-sm sm:text-[15px] leading-relaxed text-slate-300/90">
        You&apos;ve boarded the vessel of <span className="text-cyan-200 font-medium">RORI</span> —{' '}
        {personaName}&apos;s autonomous navigator. Probe the mission log, inspect the archives, or
        chart a course for an interview.
      </p>

      {/* Stats bar */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[
          'RAG indexed',
          'Voice link live',
          'Calendar synced',
        ].map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] backdrop-blur px-3 py-1 text-[11px] font-medium tracking-wide text-slate-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[560px]">
        {SUGGESTIONS.map(({ icon: Icon, accent, title, query, hint }, i) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group text-left p-4 rounded-2xl border border-white/[0.08] bg-black/35 hover:bg-black/50 backdrop-blur-md transition-all duration-200 magnetic-lift shimmer-card animate-fade-up text-left"
          >
            <span className="flex items-start justify-between gap-3">
              <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-colors ${accentMap[accent]}`}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="w-7 h-7 rounded-full border border-white/[0.06] bg-white/[0.03] text-slate-500 group-hover:text-cyan-300 group-hover:border-cyan-400/30 flex items-center justify-center transition-colors">
                <ArrowUpRight size={14} aria-hidden="true" />
              </span>
            </span>
            <span className="block mt-3 text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white">
              {title}
            </span>
            <span className="block mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{query}</span>
            <span className="mt-2 inline-flex text-[11px] font-mono tracking-wide text-slate-500 group-hover:text-slate-400">{hint}</span>
          </button>
        ))}
      </div>

      <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-3 py-1.5 text-[11px] font-mono tracking-widest uppercase text-cyan-200/80">
        <Rocket size={11} aria-hidden="true" className="text-cyan-300" /> Transmission channel secured — ask anything
      </p>
    </div>
  );
}

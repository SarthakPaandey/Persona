import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';

interface HeaderProps {
  name: string;
  role: string;
  resumeConfigured: boolean;
  voiceEnabled: boolean;
}

function useUtcClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        [
          String(now.getUTCHours()).padStart(2, '0'),
          String(now.getUTCMinutes()).padStart(2, '0'),
          String(now.getUTCSeconds()).padStart(2, '0'),
        ].join(':') + ' UTC'
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return time;
}

function StatusPill({
  ok,
  label,
  icon,
}: {
  ok: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border backdrop-blur-sm transition-colors ${
        ok
          ? 'bg-emerald-500/[0.09] border-emerald-500/20 text-emerald-200'
          : 'bg-white/[0.035] border-white/[0.07] text-slate-500'
      }`}
      title={label}
    >
      {icon ? (
        <span className={ok ? 'text-emerald-300' : 'text-slate-500'}>{icon}</span>
      ) : (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}
        />
      )}
      {label}
    </div>
  );
}

export default function Header({
  name,
  role,
  resumeConfigured,
  voiceEnabled,
}: HeaderProps) {
  const utcTime = useUtcClock();
  const displayRole = role === 'Candidate' ? 'AI/ML Engineer' : role || 'AI/ML Engineer';

  return (
    <header className="relative flex items-center gap-3.5 px-4 sm:px-5 py-4 border-b border-white/[0.07] bg-black/30 backdrop-blur-xl overflow-hidden">
      {/* glass highlight */}
      <div aria-hidden="true" className="absolute inset-0 glass-highlight pointer-events-none" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent"
      />

      <div className="relative shrink-0">
        <div className="relative w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-br from-cyan-400/60 via-violet-400/40 to-cyan-400/20 shadow-glow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/space/astronaut.jpg"
            alt="RORI"
            className="w-full h-full rounded-full object-cover bg-space-900"
            draggable={false}
          />
        </div>
        {/* orbital ring — only when systems online */}
        {resumeConfigured && <span aria-hidden="true" className="orbit-ring" />}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-black ${resumeConfigured ? 'bg-emerald-400' : 'bg-slate-600'}`}
          title={resumeConfigured ? 'Systems locked' : 'Indexing…'}
        >
          {resumeConfigured && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
          )}
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <h1 className="font-display text-[17px] tracking-[0.09em] flex flex-wrap items-center gap-2 leading-none">
          <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent font-semibold uppercase">
            RORI
          </span>
          <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-cyan-500/[0.10] text-cyan-200 border border-cyan-400/20">
            Ship AI
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-500">
            <Radio size={10} className="text-cyan-400/70" aria-hidden="true" />
            NAV-COM
          </span>
        </h1>
        <p className="text-[13px] leading-tight truncate mt-1">
          <span className="text-slate-200 font-medium">Navigator for {name}</span>
          <span className="text-slate-500 mx-1.5">•</span>
          <span className="text-slate-400">{displayRole}</span>
        </p>
        <p className="hidden lg:block text-[11px] text-slate-500 mt-0.5 tracking-wide">
          Ask about the mission log — skills, projects, experience — or chart a course for an interview.
        </p>
      </div>

      <div className="relative flex items-center gap-2 shrink-0">
        <StatusPill
          ok={resumeConfigured}
          label={resumeConfigured ? 'SIGNAL LOCKED' : 'SIGNAL SEARCHING'}
        />
        <StatusPill
          ok={voiceEnabled}
          label={voiceEnabled ? 'VOICE LINK' : 'VOICE STANDBY'}
          icon={voiceEnabled ? <Mic size={11} /> : <MicOff size={11} />}
        />
        <div className="hidden lg:flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-300">
            <span className="led-dot w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            LINK SECURE
          </span>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          {utcTime ? (
            <span className="text-[11px] font-mono tracking-wide text-cyan-200/80">{utcTime}</span>
          ) : (
            <span className="text-[11px] font-mono text-slate-600">--:--:-- UTC</span>
          )}
        </div>
        {/* mobile condensed clock */}
        {utcTime && (
          <span className="lg:hidden text-[10px] font-mono tracking-widest text-cyan-300/70 border border-white/[0.06] bg-white/[0.04] rounded-full px-2 py-1">
            {utcTime.slice(0, 5)}
          </span>
        )}
      </div>
    </header>
  );
}

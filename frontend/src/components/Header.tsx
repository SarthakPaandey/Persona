import React, { useEffect, useState } from 'react';

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

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm transition-colors ${
        ok
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
          : 'bg-white/[0.04] border-white/[0.08] text-slate-500'
      }`}
      title={label}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-600'}`}
      />
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

  return (
    <header className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-cyan-400/15 bg-black/25 backdrop-blur-sm">
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/space/astronaut.jpg"
          alt="RORI"
          className="w-11 h-11 rounded-full object-cover ring-2 ring-cyan-400/70 shadow-glow-sm"
          draggable={false}
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-space-950"
          title="Online"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg tracking-[0.08em] flex items-center gap-2.5 leading-tight">
          <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent font-semibold uppercase">
            RORI
          </span>
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-400/25">
            Ship AI
          </span>
        </h1>
        <p className="text-[13px] text-slate-400 truncate mt-0.5">
          AI representative for {role} {name}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StatusPill
          ok={resumeConfigured}
          label={resumeConfigured ? 'Systems online' : 'Systems offline'}
        />
        <StatusPill ok={voiceEnabled} label={voiceEnabled ? 'Voice on' : 'Voice off'} />
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-mono text-slate-400">
          <span className="led-dot w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          LIVE
          {utcTime && <span className="text-cyan-300/80">{utcTime}</span>}
        </div>
      </div>
    </header>
  );
}

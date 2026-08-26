import React, { useEffect, useState } from 'react';
import { Bot, Mic, MicOff } from 'lucide-react';

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
    <header className="relative flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/[0.06] bg-black/20 backdrop-blur-xl overflow-hidden">
      {/* glass highlight */}
      <div aria-hidden="true" className="absolute inset-0 glass-highlight pointer-events-none opacity-50" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="relative shrink-0">
        <div className="relative w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur flex items-center justify-center text-slate-300">
          <Bot size={16} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <span
          className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-black ${resumeConfigured ? 'bg-emerald-400' : 'bg-slate-600'}`}
          title={resumeConfigured ? 'Online' : 'Indexing…'}
        >
          {resumeConfigured && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
          )}
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <h1 className="font-display text-[15px] tracking-[0.08em] flex items-center gap-2 leading-none">
          <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent font-semibold uppercase">
            RORI
          </span>
          <span className="text-[9px] font-sans font-semibold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            Ship AI
          </span>
        </h1>
        <p className="text-xs leading-tight truncate mt-1">
          <span className="text-slate-300 font-medium">{name}</span>
          <span className="text-slate-600 mx-1">•</span>
          <span className="text-slate-500">{displayRole}</span>
        </p>
      </div>

      <div className="relative flex items-center gap-1.5 shrink-0">
        <StatusPill
          ok={resumeConfigured}
          label={resumeConfigured ? 'ONLINE' : 'OFFLINE'}
        />
        <StatusPill
          ok={voiceEnabled}
          label={voiceEnabled ? 'VOICE' : 'VOICE OFF'}
          icon={voiceEnabled ? <Mic size={11} /> : <MicOff size={11} />}
        />
        <div className="hidden sm:flex items-center gap-1.5 pl-2.5 pr-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
          <span className="led-dot w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          {utcTime ? (
            <span className="text-[11px] font-mono tracking-wide text-slate-400">{utcTime}</span>
          ) : (
            <span className="text-[11px] font-mono text-slate-600">--:--:--</span>
          )}
        </div>
      </div>
    </header>
  );
}

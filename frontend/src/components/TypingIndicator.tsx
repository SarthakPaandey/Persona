import React from 'react';

export default function TypingIndicator() {
  return (
    <div
      className="flex gap-3 animate-fade-up"
      role="status"
      aria-label="RORI is composing a transmission"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="relative shrink-0 w-7 h-7 rounded-full p-[1px] bg-gradient-to-br from-cyan-400/40 to-violet-400/30 mt-1">
        <img
          src="/space/astronaut.jpg"
          alt=""
          className="w-full h-full rounded-full object-cover"
          draggable={false}
        />
        <span className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulse" aria-hidden="true" />
      </div>
      <div className="rounded-2xl rounded-tl-md border border-white/[0.08] bg-black/45 backdrop-blur-md px-4 py-3.5 shadow-panel">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-200/70">RORI is thinking</span>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot"
              style={{ animationDelay: '0.14s' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot"
              style={{ animationDelay: '0.28s' }}
            />
          </span>
        </div>
        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 animate-shimmer" style={{ animationDuration: '1.2s' }} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function TypingIndicator() {
  return (
    <div
      className="flex gap-3 animate-fade-up"
      role="status"
      aria-label="RORI is typing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/space/astronaut.jpg"
        alt=""
        className="shrink-0 w-7 h-7 rounded-full object-cover ring-1 ring-cyan-400/60 mt-1 animate-pulse"
        draggable={false}
      />
      <div className="rounded-2xl rounded-tl-md border border-cyan-400/15 bg-black/40 backdrop-blur-sm px-4 py-3.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce-dot"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}

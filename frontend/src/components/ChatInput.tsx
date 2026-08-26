'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Command, Mic } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const MAX_LENGTH = 2000;

const QUICK_CHIPS = [
  { label: 'Skills', query: 'What AI engineering skills does Sarthak have?' },
  { label: 'Projects', query: 'Show me your flagship projects' },
  { label: 'RAG', query: 'Tell me about your RAG pipeline' },
  { label: 'Book', query: "I'd like to book an interview" },
] as const;

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [input]);

  // Re-focus after a send completes so users can keep typing.
  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  const count = input.length;
  const pct = Math.min(count / MAX_LENGTH, 1);
  const nearLimit = pct > 0.85;

  return (
    <form onSubmit={handleSubmit} aria-label="Send a message" className="space-y-2">
      {!input && !isLoading && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {QUICK_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onSend(c.query)}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07] hover:border-cyan-400/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-slate-300 hover:text-cyan-200 transition-colors backdrop-blur"
            >
              <Command size={11} className="text-slate-500" aria-hidden="true" />
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 rounded-[18px] border border-white/[0.08] bg-black/45 backdrop-blur-xl px-3 py-2.5 transition-all duration-200 focus-within:border-cyan-300/50 focus-within:ring-1 focus-within:ring-cyan-400/20 focus-within:shadow-[0_0_0_1px_rgba(103,232,249,0.10),0_18px_40px_rgba(0,0,0,0.45),0_0_22px_rgba(34,211,238,0.10)]">
        <div aria-hidden="true" className="absolute inset-0 rounded-[inherit] glass-highlight pointer-events-none opacity-40" />
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Transmit a message to RORI…"
          rows={1}
          disabled={isLoading}
          maxLength={MAX_LENGTH}
          aria-label="Message"
          className="chat-input relative flex-1 resize-none bg-transparent py-1.5 pl-1 pr-1 text-[15px] leading-6 placeholder:text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed max-h-[148px]"
        />
        <div className="relative flex items-center gap-1.5 shrink-0">
          {nearLimit && (
            <span className={`hidden sm:inline text-[11px] font-mono tabular-nums ${pct > 0.95 ? 'text-amber-300' : 'text-slate-500'}`}>
              {count}/{MAX_LENGTH}
            </span>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label={isLoading ? 'Sending' : 'Send message'}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_6px_18px_rgba(124,58,237,0.35)]"
          >
            {isLoading ? (
              <span
                className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowUp size={17} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-slate-400">
            ↵
          </span>
          <span className="hidden sm:inline">to send</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-slate-400">
            ⇧↵
          </span>
          <span className="hidden sm:inline">new line</span>
          <span className="sm:hidden">Enter to send • Shift+Enter new line</span>
        </p>
        <span className={`text-[11px] font-mono tabular-nums sm:hidden ${nearLimit ? (pct > 0.95 ? 'text-amber-300' : 'text-slate-500') : 'text-slate-600'}`}>
          {count > 0 ? `${count}/${MAX_LENGTH}` : ''}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono tracking-wide text-slate-600">
          <Mic size={11} aria-hidden="true" className="opacity-50" />
          voice ready
        </span>
      </div>
    </form>
  );
}

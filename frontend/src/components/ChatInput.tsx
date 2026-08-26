'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const MAX_LENGTH = 2000;

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
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // Re-focus after a send completes so users can keep typing.
  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  return (
    <form onSubmit={handleSubmit} aria-label="Send a message">
      <div className="flex items-end gap-2 rounded-2xl border border-cyan-400/25 bg-black/40 backdrop-blur px-4 py-2.5 transition-all duration-200 focus-within:border-cyan-300/60 focus-within:ring-1 focus-within:ring-cyan-400/30 focus-within:shadow-glow-sm">
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
          className="chat-input flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 disabled:opacity-40 disabled:cursor-not-allowed max-h-[140px]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label={isLoading ? 'Sending' : 'Send message'}
          className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-glow-sm"
        >
          {isLoading ? (
            <span
              className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowUp size={17} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-slate-600">
        Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}

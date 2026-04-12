'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[#00ff41] bg-black/80 px-3 sm:px-4 py-3 sm:py-4"
    >
      <div className="flex items-end gap-2 sm:gap-3 font-mono">
        <span className="text-[#00ff41] mb-2 sm:mb-3 select-none ml-1 sm:ml-2 text-sm">&gt;</span>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="INQUIRE ABOUT CAPTAIN SARTHAK OR BOOK AN INTERVIEW..."
          className="flex-1 resize-none bg-black/50 border border-[#00ff41]/50 text-[#00ff41] px-3 sm:px-4 py-2 text-sm sm:text-lg terminal-input focus:outline-none focus:border-[#00ff41] placeholder:text-[#00ff41]/30 uppercase min-h-[44px]"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#00ff41]/20 border border-[#00ff41] text-[#00ff41] font-bold text-sm sm:text-lg hover:bg-[#00ff41]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 uppercase tracking-wider whitespace-nowrap"
        >
          {isLoading ? (
            <span className="text-[#00ff41] animate-pulse text-sm sm:text-base">TRANSMITTING...</span>
          ) : (
            'EXECUTE'
          )}
        </button>
      </div>
      <p className="text-[#00ff41]/50 text-xs sm:text-sm mt-3 sm:mt-4 text-center font-mono opacity-80 tracking-widest flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <span className="flex items-center justify-center gap-2"><span>🔒</span> GUEST TERMINAL SECURED</span>
        <span className="opacity-50">•</span>
        <span className="flex items-center justify-center gap-2"><span>💬</span> TALK TO RORI ABOUT CAPTAIN SARTHAK</span>
      </p>
    </form>
  );
}

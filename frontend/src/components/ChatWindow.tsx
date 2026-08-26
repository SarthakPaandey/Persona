"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { Message } from "@/lib/types";

import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatWindowProps {
  readonly messages: Message[];
  readonly isLoading: boolean;
  readonly emptyState?: React.ReactNode;
}

const NEAR_BOTTOM_THRESHOLD_PX = 140;

export default function ChatWindow({
  messages,
  isLoading,
  emptyState,
}: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const lastMessage = messages.at(-1);
  const showTypingIndicator =
    isLoading &&
    (lastMessage?.role !== "assistant" || !lastMessage?.content?.trim());
  const isInitial = messages.length <= 1;

  // Track whether the user is scrolled near the bottom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsNearBottom(distance < NEAR_BOTTOM_THRESHOLD_PX);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new content only if the user hasn't scrolled away.
  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading, isNearBottom]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 scroll-smooth"
        aria-live="polite"
        aria-label="Conversation"
      >
        {isInitial && emptyState ? (
          emptyState
        ) : (
          <>
            <div className="flex items-center gap-3 py-1" aria-hidden="true">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono tracking-widest uppercase text-slate-500">
                <span className="w-1 h-1 rounded-full bg-emerald-400/80" /> Today • Encrypted link
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06]" />
            </div>

            {messages.map((message) => {
              const isTypingPlaceholder =
                isLoading &&
                message.id === lastMessage?.id &&
                message.role === "assistant" &&
                !message.content?.trim();

              if (isTypingPlaceholder) return null;
              const isLastAssistant = message.id === lastMessage?.id && message.role === "assistant";

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={Boolean(isLastAssistant && isLoading)}
                />
              );
            })}
          </>
        )}

        {showTypingIndicator && <TypingIndicator />}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Jump to latest — appears when scrolled up */}
      <div
        className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 transition-all duration-200 ${
          !isNearBottom ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-black/70 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium tracking-wide text-cyan-200 shadow-panel hover:bg-black/80 transition-colors"
        >
          <ArrowDown size={13} aria-hidden="true" />
          Jump to latest
        </button>
      </div>
    </div>
  );
}

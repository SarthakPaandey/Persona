"use client";

import React, { useEffect, useRef, useState } from "react";

import { Message } from "@/lib/types";

import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatWindowProps {
  readonly messages: Message[];
  readonly isLoading: boolean;
  readonly emptyState?: React.ReactNode;
}

const NEAR_BOTTOM_THRESHOLD_PX = 120;

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
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5"
      aria-live="polite"
      aria-label="Conversation"
    >
      {isInitial && emptyState ? (
        emptyState
      ) : (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-medium text-zinc-600">Today</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {messages.map((message) => {
            const isTypingPlaceholder =
              isLoading &&
              message.id === lastMessage?.id &&
              message.role === "assistant" &&
              !message.content?.trim();

            if (isTypingPlaceholder) return null;

            return <MessageBubble key={message.id} message={message} />;
          })}
        </>
      )}

      {showTypingIndicator && <TypingIndicator />}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}

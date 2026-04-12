"use client";

import React, { useEffect, useRef } from "react";

import { Message } from "@/lib/types";

import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 bg-black/80">
      <div className="text-center text-xs text-[#00ff41]/40 font-mono mb-4 sm:mb-8 py-1 sm:py-2 border-y border-[#00ff41]/20 text-[10px] sm:text-xs">
        [ENCRYPTED CHANNEL SECURED / STARDATE 2026.04.13]
      </div>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}

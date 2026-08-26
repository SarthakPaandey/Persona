"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Check, Copy } from "lucide-react";

import { Message } from "@/lib/types";

import CalendarWidget from "./CalendarWidget";
import SourceCitation from "./SourceCitation";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function formatTimestamp(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; ignore.
    }
  };

  const time = message.timestamp ? formatTimestamp(new Date(message.timestamp)) : "";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[86%] sm:max-w-[74%]">
          <div className="relative rounded-[18px] rounded-br-md bg-gradient-to-br from-violet-600 via-violet-600 to-cyan-500 text-white px-4 py-3 shadow-[0_8px_24px_rgba(124,58,237,0.28),0_0_0_1px_rgba(103,232,249,0.18)]">
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/[0.10] to-transparent pointer-events-none" />
            <div className="relative chat-markdown text-[15px] leading-6 [&_a]:text-cyan-100 [&_strong]:text-white [&_code]:text-cyan-100 [&_code]:bg-white/10 [&_code]:border-white/20">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          {time && (
            <time className="mt-1.5 block text-right text-[11px] font-mono tracking-wide text-slate-500 pr-1">
              {time}
            </time>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-up">
      <div
        aria-hidden="true"
        className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-cyan-300 mt-1 backdrop-blur"
      >
        <Bot size={14} strokeWidth={1.9} />
      </div>

      <div className="min-w-0 max-w-[90%] sm:max-w-[78%] group/bubble">
        <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-black/30 backdrop-blur px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-mono tracking-wide text-slate-500">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Bot size={11} aria-hidden="true" />
              RORI
            </span>
            <span className="w-1 h-1 rounded-full bg-white/15" aria-hidden="true" />
            <span>{time || 'now'}</span>
          </div>

          <div className="chat-markdown text-[15px] text-slate-200">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && message.content?.trim() && <span className="stream-cursor" aria-hidden="true" />}
          </div>

          {(message.bookingLink || (message.availableSlots?.length ?? 0) > 0) && (
            <div className="mt-3">
              <CalendarWidget
                slots={message.availableSlots}
                bookingLink={message.bookingLink}
                timezone={message.timezone}
              />
            </div>
          )}

          {!!message.sources?.length && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                aria-expanded={showSources}
                className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-200 ${showSources ? "rotate-90" : ""}`}
                  aria-hidden="true"
                >
                  ▸
                </span>
                Sources ({message.sources.length})
              </button>

              {showSources && (
                <div className="mt-2.5 space-y-2 animate-fade-up">
                  {message.sources.map((source, idx) => (
                    <SourceCitation key={`${source.source}-${idx}`} source={source} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 pl-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy message"}
            title="Copy message"
            className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

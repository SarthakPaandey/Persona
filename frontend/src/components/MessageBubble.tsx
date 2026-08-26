"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Check, Copy, Sparkles } from "lucide-react";

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
        <div className="relative rounded-2xl rounded-tl-md border border-white/[0.08] bg-black/45 backdrop-blur-md px-4 py-3.5 overflow-hidden shadow-panel">
          {/* left accent beam */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-3 bottom-3 w-px bg-gradient-to-b from-cyan-300/70 via-cyan-300/20 to-transparent"
          />
          {/* top highlight */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-300/20 via-white/10 to-transparent opacity-60" />
          <div aria-hidden="true" className="absolute inset-0 glass-highlight pointer-events-none opacity-[0.55]" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide">
              <span className="inline-flex items-center gap-1.5 text-cyan-200">
                <Sparkles size={11} className="text-cyan-300" aria-hidden="true" />
                RORI
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" aria-hidden="true" />
              <span className="font-mono text-slate-500">{time || 'now'}</span>
              {isStreaming && (
                <span className="ml-1 inline-flex items-center gap-1 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  streaming
                </span>
              )}
            </div>

            <div className="chat-markdown text-[15px] text-slate-200">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && message.content?.trim() && <span className="stream-cursor" aria-hidden="true" />}
            </div>

            {(message.bookingLink || (message.availableSlots?.length ?? 0) > 0) && (
              <div className="mt-3.5">
                <CalendarWidget
                  slots={message.availableSlots}
                  bookingLink={message.bookingLink}
                  timezone={message.timezone}
                />
              </div>
            )}

            {!!message.sources?.length && (
              <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSources(!showSources)}
                  aria-expanded={showSources}
                  className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-cyan-200/80 hover:text-cyan-100 transition-colors"
                >
                  <span
                    className={`inline-block transition-transform duration-200 ${showSources ? "rotate-90" : ""}`}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  Signal sources — {message.sources.length} {message.sources.length === 1 ? 'fragment' : 'fragments'}
                </button>

                {showSources && (
                  <div className="mt-3 space-y-2.5 animate-fade-up">
                    {message.sources.map((source, idx) => (
                      <SourceCitation key={`${source.source}-${idx}`} source={source} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2 pl-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy message"}
            title="Copy message"
            className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-slate-500 hover:text-cyan-300 transition-colors opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="text-[11px] font-mono text-slate-600 hidden sm:inline">• Encrypted • RAG-grounded</span>
        </div>
      </div>
    </div>
  );
}

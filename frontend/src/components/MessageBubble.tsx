"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy } from "lucide-react";

import { Message } from "@/lib/types";

import CalendarWidget from "./CalendarWidget";
import SourceCitation from "./SourceCitation";

interface MessageBubbleProps {
  message: Message;
}

function formatTimestamp(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; ignore.
    }
  };

  const time = message.timestamp ? formatTimestamp(new Date(message.timestamp)) : "";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-cyan-600 text-cyan-50 px-4 py-2.5 shadow-glow-sm ring-1 ring-cyan-300/30">
            <div className="chat-markdown text-[15px] [&_a]:text-cyan-200 [&_strong]:text-white [&_code]:text-cyan-200 [&_code]:bg-slate-950/50">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          {time && (
            <time className="mt-1 block text-right text-[11px] text-slate-600 pr-1">
              {time}
            </time>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/space/astronaut.jpg"
        alt=""
        className="shrink-0 w-7 h-7 rounded-full object-cover ring-1 ring-cyan-400/60 mt-1"
        draggable={false}
      />

      <div className="min-w-0 max-w-[88%] sm:max-w-[80%] group">
        <div className="rounded-2xl rounded-tl-md border border-cyan-400/15 bg-black/40 backdrop-blur-sm px-4 py-3 transition-colors group-hover:border-cyan-400/30">
          <div className="chat-markdown text-[15px] text-slate-200">
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
            <div className="mt-3 pt-2.5 border-t border-cyan-400/10">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                aria-expanded={showSources}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300/70 hover:text-cyan-200 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-200 ${showSources ? "rotate-90" : ""}`}
                  aria-hidden="true"
                >
                  ▸
                </span>
                Signal sources ({message.sources.length})
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
          {time && <time className="text-[11px] text-slate-600">{time}</time>}
          {message.content && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy message"}
              title="Copy message"
              className="text-slate-600 hover:text-cyan-300 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

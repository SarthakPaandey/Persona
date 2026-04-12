"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

import { Message } from "@/lib/types";

import CalendarWidget from "./CalendarWidget";
import SourceCitation from "./SourceCitation";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

   return (
     <div
       className={`flex message-enter font-mono ${isUser ? "justify-end" : "justify-start"}`}
     >
       <div
         className={`max-w-[90%] sm:max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 border ${
           isUser
             ? "bg-black/80 text-[#00ff41] border-[#00ff41]/50 ml-2 sm:ml-8"
             : "bg-black/90 text-[#00ff41] border-[#00ff41] mr-2 sm:mr-8 shadow-[0_0_10px_rgba(0,255,65,0.2)]"
         }`}
       >
         <div className="text-xs text-[#00ff41]/50 mb-1 border-b border-[#00ff41]/20 pb-1 uppercase flex flex-row justify-between items-center tracking-widest text-[10px] sm:text-xs">
           <span>{isUser ? "GUEST // RECRUITER" : "RORI // SHIP AI"}</span>
           <span>{isUser ? "👤" : "🤖"}</span>
         </div>
         <div
           className={`chat-markdown terminal-text ${isUser ? "text-[#00ff41]" : "text-[#00ff41]"} text-sm sm:text-base overflow-wrap break-words`}
         >
           <ReactMarkdown>{message.content}</ReactMarkdown>
         </div>

        {(message.bookingLink || (message.availableSlots?.length ?? 0) > 0) && (
          <div className="mt-4 border-t border-[#00ff41]/30 pt-4">
            <CalendarWidget
              slots={message.availableSlots}
              bookingLink={message.bookingLink}
              timezone={message.timezone}
            />
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 border-t border-[#00ff41]/20 pt-2">
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="text-xs text-[#00ff41]/70 hover:text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 px-2 py-1 uppercase"
            >
              &gt; {showSources ? "HIDE" : "EXAMINE"} DATA SECURE SOURCES (
              {message.sources.length})
            </button>

            {showSources && (
              <div className="mt-2 space-y-2 border-l-2 border-[#00ff41]/30 pl-3">
                {message.sources.map((source, idx) => (
                  <SourceCitation key={idx} source={source} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

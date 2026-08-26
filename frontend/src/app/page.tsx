"use client";

import { AlertTriangle } from "lucide-react";

import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import CosmicBackground from "@/components/CosmicBackground";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import { useChat } from "@/hooks/useChat";
import { usePersona } from "@/hooks/usePersona";

export default function Home() {
  const { persona, isLoading: isPersonaLoading } = usePersona();
  const personaName = !isPersonaLoading && persona.name ? persona.name : "Sarthak";
  const { messages, isLoading, sendMessage } = useChat(personaName);

  return (
    <>
      <CosmicBackground />

      {/* Full-bleed layout — no boxed panel, no boundary */}
      <div className="relative z-10 flex flex-col h-dvh">
        <Header
          name={personaName}
          role={persona.role || "Candidate"}
          resumeConfigured={persona.resume_configured}
          voiceEnabled={persona.voice_enabled}
        />

        <div className="flex-1 min-h-0 flex flex-col w-full max-w-[720px] mx-auto">
          {!isPersonaLoading && !persona.resume_configured && (
            <div
              role="status"
              className="mx-3 sm:mx-4 mt-3 flex items-center gap-2.5 rounded-full border border-amber-400/15 bg-amber-500/[0.06] px-3.5 py-2 text-xs leading-relaxed text-amber-200/80 backdrop-blur-sm"
            >
              <AlertTriangle size={13} className="shrink-0 text-amber-300/80" aria-hidden="true" />
              <span>Archives unindexed — run ingestion for grounded answers.</span>
            </div>
          )}

          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            emptyState={<EmptyState personaName={personaName} onPick={sendMessage} />}
          />

          {/* Floating input — no enclosing box, just soft backdrop for legibility */}
          <div className="shrink-0 px-3 sm:px-4 pb-4 sm:pb-5 pt-3">
            <div className="rounded-[20px] bg-black/20 backdrop-blur-[6px] p-1.5 sm:p-2">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
            <p className="mt-2 text-center text-[11px] font-mono tracking-wide text-white/30">
              RORI can make mistakes — verify important details
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

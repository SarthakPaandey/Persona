"use client";

import { AlertTriangle } from "lucide-react";

import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import CosmicBackground from "@/components/CosmicBackground";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import { useChat } from "@/hooks/useChat";
import { usePersona } from "@/hooks/usePersona";

function HudCorner({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute w-5 h-5 border-cyan-300/70 pointer-events-none z-20 ${className}`}
    />
  );
}

export default function Home() {
  const { persona, isLoading: isPersonaLoading } = usePersona();
  const personaName = !isPersonaLoading && persona.name ? persona.name : "Sarthak";
  const { messages, isLoading, sendMessage } = useChat(personaName);

  return (
    <>
      <CosmicBackground />

      <div className="relative z-10 flex flex-col h-dvh max-w-3xl mx-auto p-3 sm:p-6">
        <div className="relative flex flex-col flex-1 min-h-0 rounded-2xl border border-cyan-400/25 shadow-panel overflow-hidden animate-fade-in ring-1 ring-black/60 backdrop-blur-2xl">
          {/* Deep glass over the nebula */}
          <div className="absolute inset-0 bg-space-950/45" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none"
          />
          <div aria-hidden="true" className="absolute inset-0 hud-grid pointer-events-none" />
          <div aria-hidden="true" className="panel-scan" />

          {/* HUD corner brackets */}
          <HudCorner className="top-2 left-2 border-t-2 border-l-2" />
          <HudCorner className="top-2 right-2 border-t-2 border-r-2" />
          <HudCorner className="bottom-2 left-2 border-b-2 border-l-2" />
          <HudCorner className="bottom-2 right-2 border-b-2 border-r-2" />

          {/* Cyan accent line along the top */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
          />

          <div className="relative z-10 flex flex-col flex-1 min-h-0">
            <Header
              name={personaName}
              role={persona.role || "Candidate"}
              resumeConfigured={persona.resume_configured}
              voiceEnabled={persona.voice_enabled}
            />

            {!isPersonaLoading && !persona.resume_configured && (
              <div
                role="status"
                className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-300/90 backdrop-blur-sm"
              >
                <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
                <span>
                  The archives are unindexed — run ingestion for grounded answers.
                </span>
              </div>
            )}

            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              emptyState={<EmptyState personaName={personaName} onPick={sendMessage} />}
            />

            <div className="px-4 sm:px-6 pb-4">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

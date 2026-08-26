"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

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
      className={`absolute w-5 h-5 border-white/20 pointer-events-none z-20 ${className}`}
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

      <div className="relative z-10 flex flex-col h-dvh max-w-[840px] mx-auto p-3 sm:p-5 lg:p-6">
        {/* soft outer glow behind the deck — ultra subtle */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 blur-[46px] opacity-[0.16] pointer-events-none hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 68% 42% at 50% 36%, rgba(34,211,238,0.10), transparent 68%), radial-gradient(ellipse 48% 30% at 50% 88%, rgba(139,92,246,0.08), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col flex-1 min-h-0 rounded-[22px] border border-white/[0.07] bg-black/25 shadow-panel overflow-hidden backdrop-blur-2xl animate-fade-in">
          {/* glass + depth — muted */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/20" />
          <div className="absolute inset-0 bg-space-950/22" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/28 pointer-events-none"
          />
          <div aria-hidden="true" className="absolute inset-0 hud-grid pointer-events-none opacity-30" />
          <div aria-hidden="true" className="panel-scan opacity-25" />
          <div aria-hidden="true" className="absolute inset-0 glass-highlight pointer-events-none opacity-[0.22]" />

          {/* HUD corner brackets — faint */}
          <HudCorner className="top-3 left-3 border-t border-l rounded-tl-sm" />
          <HudCorner className="top-3 right-3 border-t border-r rounded-tr-sm" />
          <HudCorner className="bottom-3 left-3 border-b border-l rounded-bl-sm" />
          <HudCorner className="bottom-3 right-3 border-b border-r rounded-br-sm" />

          {/* top hairline */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
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
                className="mx-4 sm:mx-6 mt-3 flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-amber-200/90 backdrop-blur-sm"
              >
                <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300">
                  <AlertTriangle size={14} aria-hidden="true" />
                </span>
                <span>
                  Archives unindexed — run ingestion for grounded answers. RORI will still answer from the mission brief.
                </span>
              </div>
            )}

            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              emptyState={<EmptyState personaName={personaName} onPick={sendMessage} />}
            />

            <div className="px-3 sm:px-5 pb-4 pt-2 border-t border-white/[0.06] bg-black/20 backdrop-blur-sm">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>

        <p className="mt-3 hidden sm:flex items-center justify-center gap-2 text-[11px] font-mono tracking-widest uppercase text-slate-500/70">
          <ShieldCheck size={11} className="text-slate-500" aria-hidden="true" />
          Secure channel • RAG-grounded • Built for {personaName}
        </p>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import Header from "@/components/Header";
import { useChat } from "@/hooks/useChat";
import { usePersona } from "@/hooks/usePersona";

 const SpaceBackground = () => {
   const [stars, setStars] = useState<
     { id: number; left: string; top: string; delay: string; duration: string }[]
   >([]);
   const [isMobile, setIsMobile] = useState(false);

   useEffect(() => {
     // Detect mobile for performance optimization
     const checkMobile = typeof window !== 'undefined' && window.innerWidth < 768;
     setIsMobile(checkMobile);
     
     // Generate stars only on client side to avoid hydration mismatch
     const starCount = checkMobile ? 30 : 100;
     
     const generatedStars = Array.from({ length: starCount }).map((_, i) => ({
       id: i,
       left: `${Math.random() * 100}vw`,
       top: `${Math.random() * 100}vh`,
       delay: `${Math.random() * 5}s`,
       duration: `${3 + Math.random() * 7}s`,
     }));
     setStars(generatedStars);
   }, []);

   return (
     <div className="space-background">
       {stars.map((star) => (
         <div
           key={star.id}
           className="star"
           style={{
             left: star.left,
             top: star.top,
             width: `${Math.random() * 2 + 1}px`,
             height: `${Math.random() * 2 + 1}px`,
             animationDelay: star.delay,
             animationDuration: star.duration,
           }}
         />
       ))}
       {/* Distant light dots generated above, adding shooting stars here - fewer on mobile */}
       {!isMobile && (
         <>
           <div
             className="shooting-star"
             style={{ top: "10vh", left: "80vw", animationDelay: "2s" }}
           />
           <div
             className="shooting-star"
             style={{ top: "40vh", left: "60vw", animationDelay: "7s" }}
           />
           <div
             className="shooting-star"
             style={{ top: "20vh", left: "30vw", animationDelay: "12s" }}
           />
           <div
             className="shooting-star"
             style={{ top: "60vh", left: "10vw", animationDelay: "18s" }}
           />
         </>
       )}

       {/* Multiple UFOs with varying sizes, speeds, and timing */}
       <div
         className="absolute text-4xl sm:text-6xl drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] opacity-0 will-change-transform"
         style={{ animation: "ship-fly 20s ease-in-out infinite 2s" }}
       >
         🛸
       </div>
       <div
         className="absolute text-3xl sm:text-5xl drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] opacity-0 will-change-transform"
         style={{
           animation: "ship-fly-reverse 25s ease-in-out infinite 8s",
           top: "25vh",
         }}
       >
         🛸
       </div>
       {!isMobile && (
         <>
           <div
             className="absolute text-5xl drop-shadow-[0_0_18px_rgba(0,255,255,0.7)] opacity-0 will-change-transform"
             style={{
               animation: "ship-fly 30s ease-in-out infinite 15s",
               top: "70vh",
             }}
           >
             🛸
           </div>
           <div
             className="absolute text-3xl drop-shadow-[0_0_12px_rgba(0,255,255,0.5)] opacity-0 will-change-transform"
             style={{
               animation: "ship-fly-reverse 22s ease-in-out infinite 3s",
               top: "45vh",
             }}
           >
             🛸
           </div>
         </>
       )}

       {/* Multiple satellites with different orbits */}
       <div
         className="absolute text-5xl sm:text-5xl drop-shadow-[0_0_15px_rgba(200,200,255,0.8)] opacity-0 will-change-transform"
         style={{
           animation: "satellite-orbit 35s linear infinite 5s",
           top: "15vh",
         }}
       >
         🛰️
       </div>
       {!isMobile && (
         <>
           <div
             className="absolute text-4xl drop-shadow-[0_0_12px_rgba(200,200,255,0.6)] opacity-0 will-change-transform"
             style={{
               animation: "satellite-orbit-reverse 40s linear infinite 12s",
               top: "60vh",
             }}
           >
             🛰️
           </div>
           <div
             className="absolute text-6xl drop-shadow-[0_0_20px_rgba(200,200,255,0.9)] opacity-0 will-change-transform"
             style={{
               animation: "satellite-orbit 28s linear infinite 20s",
               top: "30vh",
             }}
           >
             🛰️
           </div>
         </>
       )}
     </div>
   );
};

export default function Home() {
  const { persona } = usePersona();
  const { messages, isLoading, sendMessage } = useChat(persona.name || "Captain Sarthak");

  return (
    <>
      <SpaceBackground />

      <div className="relative z-10 flex flex-col h-screen max-w-5xl mx-auto p-4 sm:p-6">
        <div className="terminal-container flex flex-col flex-1 h-full rounded-sm overflow-hidden relative">
          <div className="crt-overlay"></div>
          <Header
            name="Sarthak Pandey"
            role="Captain"
            resumeConfigured={persona.resume_configured}
            voiceEnabled={persona.voice_enabled}
          />

          <main className="flex-1 overflow-hidden flex flex-col">
             {!persona.resume_configured && (
               <div className="mx-2 sm:mx-4 mt-2 sm:mt-4 border border-green-500/50 bg-green-900/20 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#00ff41]">
                 [SYSTEM ALERT] Resume grounding is offline. Initialize database
                 sequence before mission critical deployment.
               </div>
             )}

            <ChatWindow messages={messages} isLoading={isLoading} />
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </main>

           {messages.length === 1 && (
             <div className="px-2 sm:px-4 pb-3 sm:pb-4">
               <p className="text-xs sm:text-sm text-[#00ff41]/70 mb-2 font-mono uppercase tracking-widest flex items-center gap-2">
                 <span>💡</span> Suggested Inquiries:
               </p>
               <div className="flex flex-wrap gap-1 sm:gap-2 font-mono">
                 {[
                   "What are Captain Sarthak's AI engineering skills?",
                   "Show me his latest GitHub projects",
                   "Explain his experience with RAG",
                   "Request transmission to schedule interview",
                 ].map((q) => (
                   <button
                     key={q}
                     type="button"
                     onClick={() => sendMessage(q)}
                     className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-black/50 border border-[#00ff41]/50 text-[#00ff41] hover:bg-[#00ff41]/20 hover:border-[#00ff41] transition-colors whitespace-nowrap"
                   >
                     &gt; {q}
                   </button>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

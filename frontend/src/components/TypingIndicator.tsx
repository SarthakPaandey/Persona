import React from 'react';

export default function TypingIndicator() {
   return (
     <div className="flex justify-start message-enter font-mono">
       <div className="bg-black/60 border border-[#00ff41]/50 px-3 sm:px-4 py-2 sm:py-3 shadow-[0_0_10px_rgba(0,255,65,0.2)] ml-2 sm:ml-8">
         <div className="text-xs text-[#00ff41]/50 mb-1 sm:mb-2 border-b border-[#00ff41]/20 pb-1 flex justify-between uppercase text-[10px] sm:text-xs">
           <span>RORI // SHIP AI</span>
           <span>🤖</span>
         </div>
         <div className="flex items-center mt-1 sm:mt-2 opacity-90 h-5 sm:h-6">
           <span className="text-[#00ff41] text-[1rem] sm:text-[1.15rem] leading-none uppercase tracking-widest mr-2 text-shadow-sm">PROCESSING</span>
           <span className="terminal-cursor"></span>
         </div>
       </div>
     </div>
   );
}

import React from 'react';

interface HeaderProps {
  name: string;
  role: string;
  resumeConfigured: boolean;
  voiceEnabled: boolean;
}

export default function Header({
  name,
  role,
  resumeConfigured,
  voiceEnabled,
}: HeaderProps) {
   return (
     <header className="border-b border-[#00ff41] bg-black/80 px-3 sm:px-6 py-3 sm:py-4 font-mono terminal-text">
       <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
         <div className="w-10 h-10 sm:w-12 sm:h-12 border border-[#00ff41] bg-black flex items-center justify-center text-[#00ff41] font-bold text-lg sm:text-xl shadow-[0_0_10px_rgba(0,255,65,0.4)]">
           [R]
         </div>

         <div className="min-w-0">
           <h1 className="text-lg sm:text-xl font-bold text-[#00ff41] tracking-widest uppercase flex items-center gap-2 flex-wrap">
             <span>🤖</span> RORI // COPILOT AI
           </h1>
           <p className="text-xs sm:text-sm text-[#00ff41]/70 truncate">
             Representing {role} {name} • Awaiting Guest Inquiries
           </p>
         </div>

         <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-wrap">
           <span
             className={`inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm uppercase tracking-wider ${
               resumeConfigured ? 'text-[#00ff41]' : 'text-red-500'
             }`}
           >
             <span
               className={`w-2 sm:w-2.5 h-2 sm:h-2.5 ${
                 resumeConfigured ? 'bg-[#00ff41] shadow-[0_0_5px_#00ff41]' : 'bg-red-500 shadow-[0_0_5px_red]'
               }`}
             />
             {resumeConfigured ? 'Datacore: ONLINE' : 'Datacore: OFFLINE'}
           </span>
           <span
             className={`inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm uppercase tracking-wider ${
               voiceEnabled ? 'text-[#00ff41]' : 'text-[#00ff41]/40'
             }`}
           >
             <span
               className={`w-2 sm:w-2.5 h-2 sm:h-2.5 ${
                 voiceEnabled ? 'bg-[#00ff41] animate-pulse shadow-[0_0_5px_#00ff41]' : 'bg-[#00ff41]/40'
               }`}
             />
             {voiceEnabled ? 'Comms: ACTIVE' : 'Comms: MUTED'}
           </span>
           <span className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-[#00ff41] uppercase tracking-wider">
             <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 bg-[#00ff41] animate-pulse shadow-[0_0_5px_#00ff41]" />
             Sys: READY
           </span>
         </div>
      </div>
    </header>
  );
}

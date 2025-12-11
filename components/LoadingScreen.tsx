"use client";

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

type LoadingScreenProps = {
  showWelcomeScreen?: boolean;
};

const LoadingScreen = ({ showWelcomeScreen = false }: LoadingScreenProps = {}) => {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Progress bar simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoaded(true), 800); // Small delay before "redirect"
          return 100;
        }
        // Randomize speed to make it feel real
        const jump = Math.floor(Math.random() * 5) + 1; 
        return Math.min(prev + jump, 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (isLoaded && showWelcomeScreen) {
    return (
      <div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center font-sans animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 mb-4 ring-1 ring-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-light tracking-tight">Welcome back.</h1>
        </div>
      </div>
    );
  }
  
  // If loaded but not showing welcome screen, just keep showing loading (parent will handle redirect)
  if (isLoaded && !showWelcomeScreen) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-300 flex flex-col items-center justify-center font-sans relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow delay-700"></div>

      <div className="w-full max-w-md px-8 relative z-10 flex flex-col items-center">
        

        {/* Heart Rate Animation Section */}
        <div className="mb-12 flex flex-col items-center justify-center relative h-32 w-full">

          {/* ECG Line Container */}
          <div className="relative w-full h-24 flex items-center justify-center">

            <svg viewBox="0 0 500 150" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
               <defs>
                 <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                   <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                   <stop offset="10%" stopColor="rgba(34, 211, 238, 0.2)" />
                   <stop offset="50%" stopColor="rgba(34, 211, 238, 1)" />
                   <stop offset="90%" stopColor="rgba(34, 211, 238, 0.2)" />
                   <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                 </linearGradient>
               </defs>
               
               {/* The static faint line */}
               <path 
                 d="M0,75 L100,75 L110,75 L120,40 L130,110 L140,75 L160,75 L170,60 L180,90 L190,75 L500,75" 
                 fill="none" 
                 stroke="#1e293b" 
                 strokeWidth="2" 
               />

               {/* The animated heart rate line */}
               <path 
                 className="ecg-line"
                 d="M0,75 L100,75 L110,75 L120,40 L130,110 L140,75 L160,75 L170,60 L180,90 L190,75 L500,75" 
                 fill="none" 
                 stroke="url(#ecg-gradient)" 
                 strokeWidth="3" 
                 strokeLinecap="round"
                 strokeLinejoin="round"
               />

            </svg>
            
            {/* Moving Blip */}
            <div className="absolute top-0 bottom-0 left-0 right-0 animate-scan">
               <div className="h-full w-2 bg-gradient-to-r from-transparent to-cyan-400/20 blur-sm"></div>
            </div>

          </div>

        </div>



        {/* Loading Indicator */}
        <div className="w-full space-y-6">
          

          {/* Text Status */}
          <div className="h-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 tracking-wide uppercase transition-all duration-300">

             <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />

             <span className="animate-fade-in">

               Loading your overview...

             </span>

          </div>



          {/* Progress Bar Container */}
          <div className="relative h-1.5 w-full bg-slate-900 rounded-full overflow-hidden backdrop-blur-sm ring-1 ring-white/5 border border-white/5">

            {/* Active Bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
            
            {/* Shimmer Effect on Bar */}
            <div 
              className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
              style={{ 
                left: `${progress}%`,
                transition: 'left 0.3s ease-out',
                transform: 'translateX(-100%)' 
              }}
            ></div>

          </div>



          {/* Percentage */}
          <div className="text-center">

             <span className="text-xs font-mono text-slate-500">{progress}% COMPLETE</span>

          </div>



        </div>

      </div>



      {/* Footer Text */}
      <div className="absolute bottom-8 text-xs text-slate-600 font-mono tracking-widest uppercase opacity-60">

        Secure Environment v1.0

      </div>



      <style>{`

        .ecg-line {

          stroke-dasharray: 1000;

          stroke-dashoffset: 1000;

          animation: draw-ecg 2s linear infinite;

        }



        @keyframes draw-ecg {

          0% {

            stroke-dashoffset: 1000;

            opacity: 0;

          }

          10% {

            opacity: 1;

          }

          90% {

            opacity: 1;

          }

          100% {

            stroke-dashoffset: 0;

            opacity: 0;

          }

        }



        @keyframes pulse-slow {

          0%, 100% { opacity: 0.1; transform: scale(1); }

          50% { opacity: 0.15; transform: scale(1.05); }

        }



        .animate-pulse-slow {

          animation: pulse-slow 6s infinite ease-in-out;

        }

        

        .animate-fade-in {

          animation: fadeIn 0.5s ease-out forwards;

        }

        

        @keyframes fadeIn {

          from { opacity: 0; }

          to { opacity: 1; }

        }

      `}</style>

    </div>

  );
};

export default LoadingScreen;


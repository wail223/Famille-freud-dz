
import React, { useCallback } from 'react';
import { GameState } from '../types';

interface HostViewProps {
  state: GameState;
}

const HostView: React.FC<HostViewProps> = ({ state }) => {
  const { currentRound, score, teamAScore, teamBScore, strikes, status, isStealPhase, currentTurn } = state;

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-between p-2 md:p-4 bg-[#0c0e14] relative overflow-hidden text-white font-['Cairo']">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_#0c0e14_100%)] opacity-50 pointer-events-none"></div>
      
      {/* En-tête compact */}
      <div className="z-10 w-full flex flex-col items-center shrink-0 pt-1">
        <div className="gold-gradient px-4 md:px-6 py-1 rounded-full shadow-lg border-b-2 border-amber-900/40 transform scale-75 md:scale-90 mb-1">
          <h1 className="text-lg md:text-2xl font-black text-black tracking-tighter uppercase italic leading-none">
            Une Famille en Or
          </h1>
        </div>
        
        <div className="min-h-[40px] md:min-h-[70px] flex flex-col items-center justify-center px-4 w-full max-w-6xl">
            {currentRound ? (
            <div key={currentRound.question} className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <h2 dir="rtl" className="text-xl md:text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center leading-tight">
                    {currentRound.question}
                </h2>
                {isStealPhase && (
                    <div className="mt-1 bg-red-600 px-4 py-0.5 rounded-full animate-pulse border-2 border-red-400">
                        <span dir="rtl" className="text-[10px] md:text-xs font-black text-white">⚠️ محاولة سرقة النقاط ⚠️</span>
                    </div>
                )}
            </div>
            ) : (
                <h2 className="text-base md:text-xl font-bold text-slate-500 animate-pulse uppercase tracking-widest italic">في انتظار السؤال...</h2>
            )}
        </div>
      </div>

      {/* Plateau Central : Key ajoutée pour forcer le remount total à chaque question */}
      <div className="z-10 flex-1 w-full max-w-[1300px] px-2 md:px-6 py-2 flex items-center justify-center overflow-hidden">
        <div 
          key={currentRound?.question || 'idle'} 
          className="grid grid-cols-1 md:grid-cols-2 gap-x-3 md:gap-x-6 gap-y-2 md:gap-y-3 w-full h-full max-h-[65vh]"
        >
            {currentRound ? (
            currentRound.top_10.map((ans, idx) => {
                const isGold = idx === 0;
                const bgClass = isGold 
                    ? 'gold-gradient' 
                    : 'bg-gradient-to-br from-slate-100 to-slate-300';
                
                return (
                    <div key={ans.id} className={`board-slot h-full min-h-[40px] md:min-h-[55px] w-full relative ${ans.revealed ? 'revealed' : ''}`}>
                        <div className="board-slot-inner w-full h-full relative">
                            {/* Face Cachée */}
                            <div className={`board-slot-front absolute inset-0 border-2 rounded-lg flex items-center justify-center shadow-lg ${bgClass} border-white/20`}>
                                <span className="text-xl md:text-3xl font-black italic text-black/20">{idx + 1}</span>
                            </div>
                            
                            {/* Face Révélée */}
                            <div dir="rtl" className={`board-slot-back absolute inset-0 border-[3px] rounded-lg flex items-center justify-between px-3 md:px-5 shadow-xl overflow-hidden ${bgClass} ${isGold ? 'border-amber-200' : 'border-slate-50'}`}>
                                <div className="flex-1 min-w-0 pr-2">
                                    <span className={`font-black text-black leading-none block truncate ${
                                        ans.text.length > 25 ? 'text-xs md:text-base' : ans.text.length > 15 ? 'text-sm md:text-xl' : 'text-base md:text-2xl'
                                    }`}>
                                        {ans.text}
                                    </span>
                                </div>
                                <div className="h-full flex items-center border-r-2 border-black/10 pr-3 md:pr-5 -ml-5 bg-black/5 min-w-[45px] md:min-w-[70px] justify-center">
                                    <span className="text-lg md:text-2xl font-black text-black italic font-sans">{ans.points}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })
            ) : (
            Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-full min-h-[40px] bg-blue-950/20 border-2 border-blue-900/30 rounded-lg animate-pulse"></div>
            ))
            )}
        </div>
      </div>

      {/* Bas de l'écran (Scores et Croix) */}
      <div className="z-10 w-full flex flex-col items-center gap-2 md:gap-3 pb-2 shrink-0">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-8 h-8 md:w-14 md:h-14 rounded-lg flex items-center justify-center border-[3px] transition-all duration-500 ${i <= strikes ? 'bg-red-600 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] rotate-6 scale-110' : 'bg-slate-900/60 border-slate-800 opacity-10'}`}>
              <span className={`text-xl md:text-3xl font-black leading-none ${i <= strikes ? 'text-white' : 'text-transparent'}`}>X</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-10 w-full max-w-5xl justify-center px-2">
            {/* Team A */}
            <div className={`transition-all duration-500 flex flex-col items-center ${currentTurn === 'left' ? 'scale-105' : 'opacity-40 grayscale'}`}>
                <div className="bg-blue-600 text-white px-4 py-0.5 rounded-lg border-b-2 border-blue-800 shadow-lg">
                    <span className="text-xs md:text-base font-black uppercase tracking-tighter">Équipe A</span>
                </div>
                <span className="text-lg md:text-2xl font-black text-blue-400 mt-0.5 font-sans">{teamAScore}</span>
            </div>
            
            {/* Round Score */}
            <div className="bg-black/90 border border-amber-500 rounded-xl px-4 py-1.5 md:py-2 flex flex-col items-center shadow-2xl min-w-[100px] md:min-w-[180px]">
                <span dir="rtl" className="text-amber-500 text-[7px] md:text-[9px] font-black tracking-widest mb-0.5">الرصيد الحالي</span>
                <span className="text-2xl md:text-5xl font-black text-white italic font-sans">{score}</span>
            </div>

            {/* Team B */}
            <div className={`transition-all duration-500 flex flex-col items-center ${currentTurn === 'right' ? 'scale-105' : 'opacity-40 grayscale'}`}>
                <div className="bg-red-600 text-white px-4 py-0.5 rounded-lg border-b-2 border-red-800 shadow-lg">
                    <span className="text-xs md:text-base font-black uppercase tracking-tighter">Équipe B</span>
                </div>
                <span className="text-lg md:text-2xl font-black text-red-400 mt-0.5 font-sans">{teamBScore}</span>
            </div>
        </div>
      </div>

      {status === 'STRIKE_ANIMATION' && (
        <div className="fixed inset-0 z-[100] bg-red-600/95 flex items-center justify-center animate-in zoom-in duration-100">
            <span className="text-[40vh] md:text-[50vh] font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none select-none">X</span>
        </div>
      )}

      <button onClick={toggleFullScreen} className="absolute top-2 right-2 z-[60] p-1.5 bg-white/5 rounded-lg text-white/10 hover:text-white transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </button>
    </div>
  );
};

export default HostView;

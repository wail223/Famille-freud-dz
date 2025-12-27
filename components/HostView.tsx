
import React from 'react';
import { GameState } from '../types';

interface HostViewProps {
  state: GameState;
}

const HostView: React.FC<HostViewProps> = ({ state }) => {
  const { currentRound, score, strikes, buzzerWinner, status } = state;

  return (
    <div className="h-screen w-full flex flex-col items-center justify-between p-8 bg-[#0c0e14] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/20 blur-[150px] rounded-full"></div>

      {/* Header / Question */}
      <div className="z-10 text-center w-full mt-4">
        <div className="inline-block px-12 py-4 gold-gradient rounded-full shadow-[0_0_50px_rgba(191,149,63,0.3)] mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase italic">
            Une Famille en Or
          </h1>
        </div>
        <div className="min-h-[100px] flex items-center justify-center">
            {currentRound ? (
            <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg max-w-5xl leading-tight">
                {currentRound.question}
            </h2>
            ) : (
            <h2 className="text-3xl md:text-5xl font-bold text-gray-500 animate-pulse">
                En attente du début de la manche...
            </h2>
            )}
        </div>
      </div>

      {/* The Board */}
      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 w-full max-w-7xl px-4">
        {currentRound ? (
          currentRound.top_10.map((ans, idx) => (
            <div 
              key={ans.id} 
              className={`board-slot h-16 md:h-24 w-full relative ${ans.revealed ? 'revealed' : ''}`}
            >
              <div className="board-slot-inner w-full h-full relative">
                {/* Front (Hidden) */}
                <div className="board-slot-front absolute inset-0 bg-gradient-to-b from-blue-800 to-blue-950 border-4 border-blue-400/30 rounded-lg flex items-center justify-center shadow-2xl">
                    <span className="text-4xl font-black text-blue-400 opacity-50 italic">{idx + 1}</span>
                </div>
                {/* Back (Revealed) */}
                <div className="board-slot-back absolute inset-0 gold-gradient border-4 border-amber-200 rounded-lg flex items-center justify-between px-8 shadow-2xl overflow-hidden">
                    <span className="text-2xl md:text-3xl font-black text-gray-900 uppercase truncate pr-4">
                      {ans.text}
                    </span>
                    <div className="h-full flex items-center bg-black/10 px-4 -mr-8">
                        <span className="text-3xl md:text-4xl font-black text-gray-900 italic">
                        {ans.points}
                        </span>
                    </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 md:h-24 bg-blue-950/30 border-4 border-blue-900/50 rounded-lg animate-pulse"></div>
          ))
        )}
      </div>

      {/* Footer Info / Scores / Strikes */}
      <div className="z-10 w-full flex flex-col items-center gap-8 mb-4">
        {/* Strikes Section */}
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-16 h-16 md:w-24 md:h-24 rounded-lg flex items-center justify-center border-4 ${i <= strikes ? 'bg-red-600 border-red-400' : 'bg-gray-900/50 border-gray-800'}`}
            >
              <span className={`text-5xl md:text-7xl font-black ${i <= strikes ? 'text-white' : 'text-gray-800 opacity-20'}`}>X</span>
            </div>
          ))}
        </div>

        {/* Global Score & Buzzer Status */}
        <div className="flex items-end gap-12">
            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${buzzerWinner === 'left' ? 'bg-green-600 border-white scale-110 shadow-lg' : 'bg-blue-900/20 border-blue-800 opacity-50'}`}>
                <span className="text-xl font-bold uppercase">Équipe A</span>
            </div>
            
            <div className="bg-black/60 border-4 border-amber-500 rounded-3xl px-12 py-6 flex flex-col items-center shadow-[0_0_80px_rgba(245,158,11,0.2)]">
                <span className="text-amber-500 text-sm font-bold tracking-[0.3em] uppercase mb-2">Points Cumulés</span>
                <span className="text-7xl font-black text-white italic tracking-tighter">{score}</span>
            </div>

            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${buzzerWinner === 'right' ? 'bg-green-600 border-white scale-110 shadow-lg' : 'bg-blue-900/20 border-blue-800 opacity-50'}`}>
                <span className="text-xl font-bold uppercase">Équipe B</span>
            </div>
        </div>
      </div>

      {/* Strike Animation Overlay */}
      {status === 'STRIKE_ANIMATION' && (
        <div className="fixed inset-0 z-50 bg-red-900/80 flex items-center justify-center animate-pulse">
            <span className="text-[25vw] font-black text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]">X</span>
        </div>
      )}
    </div>
  );
};

export default HostView;

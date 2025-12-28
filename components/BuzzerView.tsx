
import React, { useState, useEffect, useCallback } from 'react';
import { GameState } from '../types';
import { soundService } from '../services/soundService';

interface BuzzerViewProps {
  side: 'left' | 'right';
  state: GameState;
  onBuzz: () => void;
}

const BuzzerView: React.FC<BuzzerViewProps> = ({ side, state, onBuzz }) => {
  const isWinner = state.buzzerWinner === side;
  const isOpponentWinner = state.buzzerWinner && state.buzzerWinner !== side;
  const isActive = state.status === 'BUZZING';

  const handlePress = useCallback(() => {
    if (!isActive || state.buzzerWinner) return;
    soundService.play('BUZZER');
    onBuzz();
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
  }, [isActive, state.buzzerWinner, onBuzz]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handlePress();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress]);

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-between p-8 transition-all duration-500 overflow-hidden ${
        isWinner ? 'bg-green-600' : isOpponentWinner ? 'bg-red-950' : 'bg-[#0a0c10]'
    }`}>
      {/* Team Header */}
      <div className="text-center pt-8">
        <p className="text-white/40 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Identifiant Équipe</p>
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter shadow-sm">
            {side === 'left' ? 'CÔTÉ A' : 'CÔTÉ B'}
        </h2>
      </div>

      {/* Main Buzzer Circle */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-white opacity-5 blur-[100px] rounded-full scale-150"></div>
        
        <button
            disabled={!isActive || !!state.buzzerWinner}
            onPointerDown={(e) => { e.preventDefault(); handlePress(); }}
            className={`
            relative w-[60vw] h-[60vw] max-w-[300px] max-h-[300px] rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 border-[15px]
            ${isWinner 
                ? 'bg-white text-green-600 border-green-400 scale-110' 
                : isActive 
                ? 'bg-red-600 border-red-500 text-white shadow-red-500/20 shadow-inner' 
                : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed grayscale'
            }
            `}
        >
            <span className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic drop-shadow-md">
                {isWinner ? 'OK' : 'BUZZ'}
            </span>
            {isActive && !state.buzzerWinner && (
                <span className="absolute -bottom-12 text-[10px] font-black text-white/30 uppercase tracking-widest animate-pulse">Toucher l'écran</span>
            )}
        </button>
      </div>

      {/* Status Footer */}
      <div className="pb-12 text-center h-12 flex items-center justify-center">
        {isOpponentWinner ? (
            <span className="text-white font-black text-sm uppercase italic animate-bounce tracking-widest">L'autre équipe a buzzé !</span>
        ) : isActive ? (
            <span className="text-amber-500 font-black text-lg uppercase italic tracking-widest">SOYEZ PRÊTS !</span>
        ) : (
            <span className="text-white/20 font-black text-xs uppercase tracking-widest">En attente de l'animateur</span>
        )}
      </div>
    </div>
  );
};

export default BuzzerView;

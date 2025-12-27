
import React, { useState, useEffect } from 'react';
import { GameState } from '../types';

interface BuzzerViewProps {
  side: 'left' | 'right';
  state: GameState;
  onBuzz: () => void;
}

const BuzzerView: React.FC<BuzzerViewProps> = ({ side, state, onBuzz }) => {
  const isWinner = state.buzzerWinner === side;
  const isOpponentWinner = state.buzzerWinner && state.buzzerWinner !== side;
  const isActive = state.status === 'BUZZING';

  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    if (!isActive || state.buzzerWinner) return;
    setPressed(true);
    onBuzz();
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
  };

  useEffect(() => {
    if (!state.buzzerWinner) setPressed(false);
  }, [state.buzzerWinner]);

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center p-8 transition-colors duration-500 ${
        isWinner ? 'bg-green-600' : isOpponentWinner ? 'bg-red-900' : 'bg-slate-900'
    }`}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-widest mb-2">
            ÉQUIPE {side === 'left' ? 'A' : 'B'}
        </h1>
        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
            {isActive ? 'SOYEZ PRÊTS...' : 'ATTENDEZ LE GO...'}
        </p>
      </div>

      <button
        disabled={!isActive || !!state.buzzerWinner}
        onPointerDown={handlePress}
        className={`
          w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-75 active:scale-90
          ${isWinner 
            ? 'bg-white text-green-600 scale-110' 
            : isActive 
              ? 'bg-red-600 border-8 border-red-500 text-white animate-pulse' 
              : 'bg-slate-800 text-slate-600 border-8 border-slate-700 opacity-50'
          }
        `}
      >
        <span className="text-5xl font-black tracking-tighter uppercase italic">
            {isWinner ? 'GAGNÉ !' : 'BUZZ'}
        </span>
      </button>

      {isOpponentWinner && (
        <div className="mt-12 text-center animate-bounce">
            <span className="text-white font-black text-xl uppercase italic">L'autre équipe a buzzé !</span>
        </div>
      )}
    </div>
  );
};

export default BuzzerView;

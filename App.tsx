
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Role, SyncMessage } from './types';
import HostView from './components/HostView';
import AdminView from './components/AdminView';
import BuzzerView from './components/BuzzerView';
import { soundService } from './services/soundService';
import { syncStateToFirebase, listenToFirebaseState, sendBuzzToFirebase, listenToBuzzEvents } from './services/firebaseService';

const INITIAL_STATE: GameState = {
  currentRound: null,
  score: 0,
  teamAScore: 0,
  teamBScore: 0,
  strikes: 0,
  buzzerWinner: null,
  currentTurn: null,
  isStealPhase: false,
  status: 'IDLE',
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [buzzerSide, setBuzzerSide] = useState<'left' | 'right'>('left');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const prevStateRef = useRef<GameState>(INITIAL_STATE);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Déverrouillage audio universel (iPhone/Android)
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundService.unlock();
      setSoundEnabled(true);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Surveillance de l'état pour jouer les sons automatiquement sur tous les écrans
  useEffect(() => {
    if (!soundEnabled) return;

    const prev = prevStateRef.current;
    const curr = state;

    // 1. Nouvelle Question (Transition Whoosh)
    if (curr.currentRound?.question !== prev.currentRound?.question && curr.currentRound) {
      soundService.play('NEW_QUESTION');
    }

    // 2. Réponse Révélée (Ding)
    if (curr.currentRound && prev.currentRound) {
      const prevRevealedCount = prev.currentRound.top_10.filter(a => a.revealed).length;
      const currRevealedCount = curr.currentRound.top_10.filter(a => a.revealed).length;
      if (currRevealedCount > prevRevealedCount) {
        soundService.play('CORRECT');
      }
    }

    // 3. Faute / Strike (Le "X")
    if (curr.strikes > prev.strikes) {
      soundService.play('STRIKE');
    }

    // 4. Phase de Vol (Alerte tension)
    if (curr.isStealPhase && !prev.isStealPhase) {
      soundService.play('STEAL');
    }

    // 5. Attribution des points / Victoire de manche (Fanfare)
    // Se déclenche si le score global d'une équipe a augmenté
    const scoreAIncreased = curr.teamAScore > prev.teamAScore;
    const scoreBIncreased = curr.teamBScore > prev.teamBScore;
    if (scoreAIncreased || scoreBIncreased) {
      soundService.play('WIN');
    }

    prevStateRef.current = state;
  }, [state, soundEnabled]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel('famille_en_or_dz');
    
    channelRef.current.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.type === 'UPDATE_STATE') {
        setState(event.data.payload);
      } else if (event.data.type === 'BUZZ') {
        handleIncomingBuzz(event.data.payload);
      }
    };

    const unsubscribeState = listenToFirebaseState((newState) => {
      if (newState) setState(newState);
    });

    const unsubscribeBuzz = listenToBuzzEvents((side) => {
      handleIncomingBuzz(side);
    });

    return () => {
      channelRef.current?.close();
      unsubscribeState();
      unsubscribeBuzz();
    };
  }, []);

  const updateState = useCallback((partial: Partial<GameState>) => {
    setState(prev => {
      const newState = { ...prev, ...partial };
      setTimeout(() => {
        channelRef.current?.postMessage({ type: 'UPDATE_STATE', payload: newState });
        syncStateToFirebase(newState);
      }, 0);
      return newState;
    });
  }, []);

  const handleIncomingBuzz = useCallback((side: 'left' | 'right') => {
    setState(prev => {
      if (prev.buzzerWinner || prev.status !== 'BUZZING') return prev;
      const newState: GameState = { 
        ...prev, 
        buzzerWinner: side, 
        currentTurn: side, 
        status: 'PLAYING' 
      };
      // Son local immédiat pour le buzzer
      soundService.play('BUZZER');
      setTimeout(() => {
        channelRef.current?.postMessage({ type: 'UPDATE_STATE', payload: newState });
        syncStateToFirebase(newState);
      }, 0);
      return newState;
    });
  }, []);

  const onBuzz = useCallback(() => {
    if (state.status === 'BUZZING' && !state.buzzerWinner) {
      soundService.play('BUZZER');
      channelRef.current?.postMessage({ type: 'BUZZ', payload: buzzerSide });
      sendBuzzToFirebase(buzzerSide);
    }
  }, [buzzerSide, state.status, state.buzzerWinner]);

  const resetBuzzer = useCallback(() => {
    updateState({ 
      buzzerWinner: null, 
      currentTurn: null, 
      isStealPhase: false, 
      status: 'BUZZING',
      strikes: 0 
    });
  }, [updateState]);

  if (!role) {
    return (
      <div className="min-h-screen w-full bg-[#0c0e14] text-white flex flex-col items-center py-10 px-4 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0c0e14_100%)] overflow-y-auto">
        <div className="max-w-4xl w-full flex flex-col items-center">
          <header className="mb-12 text-center">
            <div className="inline-block px-6 py-2 gold-gradient rounded-full mb-4 shadow-2xl transform -rotate-1">
              <h1 className="text-lg md:text-2xl font-black text-black uppercase italic tracking-tighter leading-none">ÉDITION ALGÉRIENNE</h1>
            </div>
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter text-white drop-shadow-lg leading-tight">UNE FAMILLE EN OR</h2>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4">
            <button onClick={() => setRole(Role.HOST)} className="group bg-slate-900 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-8 transition-all active:scale-95 shadow-xl">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-3 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-black uppercase italic">Écran TV</h3>
            </button>

            <button onClick={() => setRole(Role.ADMIN)} className="group bg-slate-900 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-8 transition-all active:scale-95 shadow-xl">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:-rotate-3 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <h3 className="text-xl font-black uppercase italic">Régie</h3>
            </button>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 flex flex-col items-center shadow-xl">
              <h3 className="text-xl font-black uppercase italic mb-6">Buzzers</h3>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('left'); }} className="bg-blue-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-90 transition-all">Équipe A</button>
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('right'); }} className="bg-red-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-90 transition-all">Équipe B</button>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center animate-pulse">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Cliquer n'importe où pour débloquer le son</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0c0e14]">
      {role === Role.HOST && <HostView state={state} />}
      {role === Role.ADMIN && <AdminView state={state} updateState={updateState} resetBuzzer={resetBuzzer} />}
      {role === Role.BUZZER && <BuzzerView side={buzzerSide} state={state} onBuzz={onBuzz} />}
      <button className="fixed bottom-6 left-6 p-4 bg-white/5 rounded-full text-white/20 hover:text-white hover:bg-white/10 transition-all z-[100] border border-white/10 shadow-lg backdrop-blur-sm" onClick={() => setRole(null)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </button>
    </div>
  );
};

export default App;

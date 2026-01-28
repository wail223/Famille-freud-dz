
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Role, SyncMessage } from './types';
import HostView from './components/HostView';
import AdminView from './components/AdminView';
import BuzzerView from './components/BuzzerView';
import { soundService } from './services/soundService';
import { syncStateToFirebase, listenToFirebaseState, sendBuzzToFirebase, listenToBuzzEvents, setSessionId } from './services/firebaseService';

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
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false); // État pour basculer entre Accueil et Input
  const [inputCode, setInputCode] = useState('');
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

  // Surveillance de l'état pour jouer les sons
  useEffect(() => {
    if (!soundEnabled) return;

    const prev = prevStateRef.current;
    const curr = state;

    if (curr.currentRound?.question !== prev.currentRound?.question && curr.currentRound) {
      soundService.play('NEW_QUESTION');
    }

    if (curr.currentRound && prev.currentRound) {
      const prevRevealedCount = prev.currentRound.top_10.filter(a => a.revealed).length;
      const currRevealedCount = curr.currentRound.top_10.filter(a => a.revealed).length;
      if (currRevealedCount > prevRevealedCount) {
        soundService.play('CORRECT');
      }
    }

    if (curr.strikes > prev.strikes) {
      soundService.play('STRIKE');
    }

    if (curr.isStealPhase && !prev.isStealPhase) {
      soundService.play('STEAL');
    }

    const scoreAIncreased = curr.teamAScore > prev.teamAScore;
    const scoreBIncreased = curr.teamBScore > prev.teamBScore;
    if (scoreAIncreased || scoreBIncreased) {
      soundService.play('WIN');
    }

    prevStateRef.current = state;
  }, [state, soundEnabled]);

  // Connexion à la session (Firebase + BroadcastChannel)
  useEffect(() => {
    if (!sessionCode) return;

    // 1. Initialiser le service Firebase avec le code
    setSessionId(sessionCode);

    // 2. Créer un channel unique pour cette session
    channelRef.current = new BroadcastChannel(`famille_en_or_dz_${sessionCode}`);
    
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
  }, [sessionCode]);

  const generateSessionCode = () => {
    // Génère un code de 4 caractères (chiffres et lettres majuscules sans confusion comme O/0 ou I/1)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGame = () => {
    const newCode = generateSessionCode();
    setSessionCode(newCode);
    // On assume qu'une nouvelle session démarre à zéro
    setState(INITIAL_STATE);
  };

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length > 0) {
      setSessionCode(inputCode.toUpperCase().trim());
    }
  };

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

  // Écran 1 : Accueil (Choix Créer ou Rejoindre)
  if (!sessionCode) {
    return (
        <div className="min-h-screen w-full bg-[#0c0e14] text-white flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0c0e14_100%)]">
            <div className="max-w-md w-full flex flex-col items-center animate-in zoom-in duration-500">
                <div className="gold-gradient px-6 py-2 rounded-full mb-8 shadow-2xl transform -rotate-1">
                    <h1 className="text-xl md:text-2xl font-black text-black uppercase italic tracking-tighter leading-none">ÉDITION ALGÉRIENNE</h1>
                </div>
                
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full">
                    {!isJoining ? (
                        /* MENU PRINCIPAL */
                        <div className="flex flex-col gap-4">
                             <h2 className="text-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Bienvenue</h2>
                            <button 
                                onClick={handleCreateGame}
                                className="bg-amber-500 text-black font-black py-5 rounded-2xl text-lg uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-900/20"
                            >
                                Créer une partie
                            </button>
                            <button 
                                onClick={() => setIsJoining(true)}
                                className="bg-slate-800 text-slate-300 font-bold py-5 rounded-2xl text-sm uppercase tracking-widest hover:bg-slate-700 active:scale-95 transition-all border border-slate-700"
                            >
                                Rejoindre une partie
                            </button>
                        </div>
                    ) : (
                        /* FORMULAIRE REJOINDRE */
                        <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <button onClick={() => setIsJoining(false)} className="text-slate-500 hover:text-white text-xs uppercase font-bold tracking-widest">
                                    ← Retour
                                </button>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Rejoindre</span>
                            </div>
                            <form onSubmit={joinSession} className="flex flex-col gap-4">
                                <input 
                                    type="text" 
                                    placeholder="CODE SESSION" 
                                    className="bg-black/50 border-2 border-slate-700 rounded-2xl p-4 text-center text-2xl font-black tracking-widest text-amber-500 placeholder-slate-600 focus:border-amber-500 outline-none transition-colors uppercase"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    maxLength={4}
                                    autoFocus
                                />
                                <button 
                                    type="submit"
                                    disabled={!inputCode}
                                    className="bg-green-600 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-green-500 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-green-900/20"
                                >
                                    Valider
                                </button>
                            </form>
                        </div>
                    )}
                </div>
                <p className="mt-8 text-slate-600 text-[10px] uppercase font-bold tracking-widest">Une Famille en Or</p>
            </div>
        </div>
    );
  }

  // Écran 2 : Choix du Rôle (Reste identique mais affiche le code généré)
  if (!role) {
    return (
      <div className="min-h-screen w-full bg-[#0c0e14] text-white flex flex-col items-center py-10 px-4 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0c0e14_100%)] overflow-y-auto">
        <div className="max-w-4xl w-full flex flex-col items-center">
          <header className="mb-8 text-center relative">
            <button onClick={() => { setSessionCode(null); setIsJoining(false); setInputCode(''); }} className="absolute -top-6 -left-4 text-xs text-slate-500 hover:text-white uppercase font-bold tracking-widest flex items-center gap-1">
                <span>← Quitter</span>
            </button>
            <div className="inline-block px-6 py-2 gold-gradient rounded-full mb-4 shadow-2xl transform -rotate-1">
              <h1 className="text-lg md:text-2xl font-black text-black uppercase italic tracking-tighter leading-none">CODE : <span className="tracking-widest">{sessionCode}</span></h1>
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

  // Écran 3 : Jeu Actif
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

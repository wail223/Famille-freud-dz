
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Role, SyncMessage } from './types';
import HostView from './components/HostView';
import AdminView from './components/AdminView';
import BuzzerView from './components/BuzzerView';
import { soundService } from './services/soundService';
import { db, syncStateToFirebase, listenToFirebaseState, sendBuzzToFirebase, listenToBuzzEvents } from './services/firebaseService';

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
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel('famille_en_or_dz');
    
    channelRef.current.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.type === 'UPDATE_STATE') {
        setState(event.data.payload);
      } else if (event.data.type === 'BUZZ') {
        handleIncomingBuzz(event.data.payload);
      } else if (event.data.type === 'RESET_BUZZ') {
        resetBuzzer();
      }
    };

    const unsubscribeState = listenToFirebaseState((newState) => {
      setState(newState);
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
      
      // On ne synchronise que si on est ADMIN pour éviter les conflits
      // (L'admin est le chef d'orchestre du state)
      channelRef.current?.postMessage({ type: 'UPDATE_STATE', payload: newState });
      syncStateToFirebase(newState);
      
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
      
      channelRef.current?.postMessage({ type: 'UPDATE_STATE', payload: newState });
      syncStateToFirebase(newState);
      
      return newState;
    });
  }, []);

  const onBuzz = useCallback(() => {
    // Note: on utilise ici buzzerSide qui est stable car propre à chaque instance de buzzer
    if (state.status === 'BUZZING' && !state.buzzerWinner) {
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
      strikes: 0 // Reset des fautes aussi au nouveau buzzer
    });
  }, [updateState]);

  const enableAudio = () => {
    soundService.unlock();
    setSoundEnabled(true);
  };

  if (!role) {
    return (
      <div className="h-screen bg-[#0c0e14] text-white flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0c0e14_100%)] overflow-hidden text-center">
        {!soundEnabled && (
           <button onClick={enableAudio} className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center group px-6">
              <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center animate-bounce mb-6 shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-transform group-hover:scale-110">
                 <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.414 4.243 1 1 0 11-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.414-2.828 1 1 0 010-1.415z"/></svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-widest text-amber-500 mb-2">Prêt pour le Show ?</h1>
              <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.3em] font-bold">Appuyez pour activer les effets sonores</p>
           </button>
        )}
        
        <div className="max-w-5xl w-full flex flex-col items-center max-h-screen animate-in fade-in zoom-in duration-700">
          <header className="mb-8 md:mb-12">
            <div className="inline-block px-8 py-3 gold-gradient rounded-full mb-6 shadow-2xl border-b-4 border-amber-900/40 transform -rotate-1">
              <h1 className="text-xl md:text-3xl font-black text-black uppercase italic tracking-tighter leading-none">
                DUAL SYNC : LOCAL + CLOUD
              </h1>
            </div>
            <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none mb-4 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">UNE FAMILLE EN OR</h2>
            <div className="flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-amber-500/50"></span>
                <p className="text-amber-500 font-black uppercase text-xs md:text-base tracking-[0.5em] animate-pulse">ALGERIA HYBRID SYNC 🇩🇿</p>
                <span className="h-px w-8 bg-amber-500/50"></span>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full px-4">
            <button onClick={() => setRole(Role.HOST)} className="group bg-slate-900/40 border-2 border-slate-800 hover:border-amber-500 rounded-[2.5rem] p-8 transition-all hover:scale-105 shadow-xl hover:shadow-amber-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform shadow-lg shadow-blue-600/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Écran TV</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Affichage plateau</p>
            </button>

            <button onClick={() => setRole(Role.ADMIN)} className="group bg-slate-900/40 border-2 border-slate-800 hover:border-amber-500 rounded-[2.5rem] p-8 transition-all hover:scale-105 shadow-xl hover:shadow-amber-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:-rotate-12 transition-transform shadow-lg shadow-amber-600/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Animateur</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Console de contrôle</p>
            </button>

            <div className="bg-slate-900/40 border-2 border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center shadow-xl backdrop-blur-sm">
              <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-600/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">Buzzers</h3>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('left'); }} className="bg-blue-700 hover:bg-blue-600 py-3 rounded-xl font-black text-xs transition-all shadow-lg shadow-blue-900/40 active:scale-90">Équipe A</button>
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('right'); }} className="bg-red-700 hover:bg-red-600 py-3 rounded-xl font-black text-xs transition-all shadow-lg shadow-red-900/40 active:scale-90">Équipe B</button>
              </div>
            </div>
          </div>
          <p className="mt-12 text-slate-600 text-[9px] uppercase tracking-[0.6em] font-black">Mode Hybride : BroadcastChannel + Firebase Realtime</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {role === Role.HOST && <HostView state={state} />}
      {role === Role.ADMIN && <AdminView state={state} updateState={updateState} resetBuzzer={resetBuzzer} />}
      {role === Role.BUZZER && <BuzzerView side={buzzerSide} state={state} onBuzz={onBuzz} />}
      <button className="fixed bottom-6 left-6 p-4 bg-white/5 rounded-full hover:bg-white/20 text-white/30 hover:text-white transition-all z-[100] backdrop-blur-xl border border-white/10 shadow-2xl" onClick={() => setRole(null)}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </button>
    </div>
  );
};

export default App;

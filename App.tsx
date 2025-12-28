
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
      strikes: 0 
    });
  }, [updateState]);

  const enableAudio = () => {
    soundService.unlock();
    setSoundEnabled(true);
  };

  if (!role) {
    return (
      <div className="min-h-screen w-full bg-[#0c0e14] text-white flex flex-col items-center py-12 px-4 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0c0e14_100%)] overflow-y-auto">
        {!soundEnabled && (
           <button onClick={enableAudio} className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center justify-center px-6">
              <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center animate-bounce mb-6 shadow-[0_0_40px_rgba(245,158,11,0.6)]">
                 <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.414 4.243 1 1 0 11-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.414-2.828 1 1 0 010-1.415z"/></svg>
              </div>
              <h1 className="text-2xl font-black uppercase italic text-amber-500 mb-2">FAMILLETNA DZ</h1>
              <p className="text-slate-400 text-xs uppercase tracking-[0.3em]">Cliquer pour activer le son</p>
           </button>
        )}
        
        <div className="max-w-4xl w-full flex flex-col items-center animate-in fade-in duration-700">
          <header className="mb-12 text-center">
            <div className="inline-block px-6 py-2 gold-gradient rounded-full mb-6 shadow-xl transform -rotate-1">
              <h1 className="text-lg md:text-2xl font-black text-black uppercase italic tracking-tighter">
                ÉDITION ALGÉRIENNE
              </h1>
            </div>
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter mb-4">UNE FAMILLE EN OR</h2>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <button onClick={() => setRole(Role.HOST)} className="group bg-slate-900/60 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-8 transition-all active:scale-95">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-black uppercase italic mb-1">Écran TV</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Plateau</p>
            </button>

            <button onClick={() => setRole(Role.ADMIN)} className="group bg-slate-900/60 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-8 transition-all active:scale-95">
              <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:-rotate-6 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <h3 className="text-xl font-black uppercase italic mb-1">Régie</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Contrôle</p>
            </button>

            <div className="bg-slate-900/60 border-2 border-slate-800 rounded-3xl p-8 flex flex-col items-center">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-xl font-black uppercase italic mb-4">Buzzers</h3>
              <div className="grid grid-cols-2 gap-2 w-full">
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('left'); }} className="bg-blue-700 py-3 rounded-xl font-black text-[10px] active:scale-90">ÉQUIPE A</button>
                <button onClick={() => { setRole(Role.BUZZER); setBuzzerSide('right'); }} className="bg-red-700 py-3 rounded-xl font-black text-[10px] active:scale-90">ÉQUIPE B</button>
              </div>
            </div>
          </div>
          
          <div className="mt-12 mb-20 text-center">
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.5em] font-black">Sync Cloud Realtime Activée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {role === Role.HOST && <HostView state={state} />}
      {role === Role.ADMIN && <AdminView state={state} updateState={updateState} resetBuzzer={resetBuzzer} />}
      {role === Role.BUZZER && <BuzzerView side={buzzerSide} state={state} onBuzz={onBuzz} />}
      <button className="fixed bottom-6 left-6 p-4 bg-white/10 rounded-full text-white/40 hover:text-white transition-all z-[100] border border-white/5" onClick={() => setRole(null)}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </button>
    </div>
  );
};

export default App;

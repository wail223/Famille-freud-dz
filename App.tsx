
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Role, SyncMessage } from './types';
import HostView from './components/HostView';
import AdminView from './components/AdminView';
import BuzzerView from './components/BuzzerView';

const INITIAL_STATE: GameState = {
  currentRound: null,
  score: 0,
  strikes: 0,
  buzzerWinner: null,
  status: 'IDLE',
};

const CHANNEL_NAME = 'une_famille_en_or_algerie';

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [buzzerSide, setBuzzerSide] = useState<'left' | 'right'>('left');

  // Broadcast Channel for sync across tabs
  const channel = useMemo(() => new BroadcastChannel(CHANNEL_NAME), []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { type, payload } = event.data;
      if (type === 'UPDATE_STATE') {
        setState(payload);
      } else if (type === 'BUZZ') {
        handleIncomingBuzz(payload);
      } else if (type === 'RESET_BUZZ') {
        // Fix string widening of the 'status' field in state update
        setState(prev => ({ ...prev, buzzerWinner: null, status: 'BUZZING' as const }));
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, [channel]);

  const updateState = useCallback((partial: Partial<GameState>) => {
    setState(prev => {
      const newState = { ...prev, ...partial };
      channel.postMessage({ type: 'UPDATE_STATE', payload: newState });
      return newState;
    });
  }, [channel]);

  const handleIncomingBuzz = useCallback((side: 'left' | 'right') => {
    setState(prev => {
      if (prev.buzzerWinner || prev.status !== 'BUZZING') return prev;
      // Explicitly type newState to ensure 'status' literal is not widened to string
      const newState: GameState = { ...prev, buzzerWinner: side, status: 'PLAYING' };
      channel.postMessage({ type: 'UPDATE_STATE', payload: newState });
      return newState;
    });
  }, [channel]);

  const onBuzz = useCallback(() => {
    channel.postMessage({ type: 'BUZZ', payload: buzzerSide });
    handleIncomingBuzz(buzzerSide);
  }, [channel, buzzerSide, handleIncomingBuzz]);

  const resetBuzzer = useCallback(() => {
    channel.postMessage({ type: 'RESET_BUZZ', payload: null });
    // Fix string widening of the 'status' field in state update
    setState(prev => ({ ...prev, buzzerWinner: null, status: 'BUZZING' as const }));
  }, [channel]);

  if (!role) {
    return (
      <div className="h-screen bg-[#0c0e14] flex items-center justify-center p-6 text-white">
        <div className="max-w-xl w-full flex flex-col gap-8 text-center">
            <div className="gold-gradient p-1 rounded-3xl shadow-[0_0_100px_rgba(191,149,63,0.3)]">
                <div className="bg-[#0c0e14] rounded-3xl p-8">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-4">
                        Choisis ton Rôle
                    </h1>
                    <p className="text-slate-400 font-bold mb-8 italic">Une Famille en Or : Édition Algérienne</p>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => setRole(Role.HOST)}
                            className="bg-blue-600 hover:bg-blue-500 py-6 px-4 rounded-2xl text-xl font-black transition-all flex flex-col items-center gap-1 shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                        >
                            <span className="uppercase">Écran Principal</span>
                            <span className="text-xs font-normal opacity-70">(PC / TV)</span>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <button 
                                onClick={() => { setRole(Role.BUZZER); setBuzzerSide('left'); }}
                                className="bg-red-600 hover:bg-red-500 py-4 px-4 rounded-2xl text-lg font-black transition-all flex flex-col items-center gap-1 border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                            >
                                <span className="uppercase">Buzzer A</span>
                            </button>
                            <button 
                                onClick={() => { setRole(Role.BUZZER); setBuzzerSide('right'); }}
                                className="bg-red-600 hover:bg-red-500 py-4 px-4 rounded-2xl text-lg font-black transition-all flex flex-col items-center gap-1 border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                            >
                                <span className="uppercase">Buzzer B</span>
                            </button>
                        </div>

                        <button 
                            onClick={() => setRole(Role.ADMIN)}
                            className="bg-slate-700 hover:bg-slate-600 py-4 px-4 rounded-2xl text-xl font-black transition-all flex flex-col items-center gap-1 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
                        >
                            <span className="uppercase italic">Animateur / Admin</span>
                        </button>
                    </div>
                </div>
            </div>
            <p className="text-slate-500 text-xs">
                Ouvre cette page sur plusieurs appareils (ou onglets) et choisis des rôles différents pour jouer en famille.
            </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {role === Role.HOST && <HostView state={state} />}
      {role === Role.ADMIN && <AdminView state={state} updateState={updateState} resetBuzzer={resetBuzzer} />}
      {role === Role.BUZZER && <BuzzerView side={buzzerSide} state={state} onBuzz={onBuzz} />}
      
      {/* Hidden button to switch role for testing */}
      <button 
        className="fixed bottom-2 right-2 p-2 bg-white/5 rounded text-[8px] hover:bg-white/20 text-white transition-all z-[100]"
        onClick={() => setRole(null)}
      >
        CHANGE ROLE
      </button>
    </>
  );
};

export default App;

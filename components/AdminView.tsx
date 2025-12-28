
import React, { useState } from 'react';
import { GameState, Role } from '../types';
import { generateRound, validateAnswer } from '../services/geminiService';
import { soundService } from '../services/soundService';

interface AdminViewProps {
  state: GameState;
  updateState: (newState: Partial<GameState>) => void;
  resetBuzzer: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ state, updateState, resetBuzzer }) => {
  const [themeInput, setThemeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleNewRound = async () => {
    if (!themeInput) return;
    setLoading(true);
    setFeedback("Génération en cours...");
    try {
      const round = await generateRound(themeInput);
      updateState({
        currentRound: {
          ...round,
          top_10: round.top_10.map((a: any) => ({ ...a, revealed: false }))
        },
        score: 0,
        strikes: 0,
        buzzerWinner: null,
        currentTurn: null,
        isStealPhase: false,
        status: 'BUZZING'
      });
      setThemeInput('');
      setFeedback("");
    } catch (error) {
      setFeedback("Erreur lors de la génération.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualReveal = (id: number) => {
    if (!state.currentRound) return;
    const ans = state.currentRound.top_10.find(a => a.id === id);
    
    if (ans && !ans.revealed) {
      soundService.play('CORRECT');
      
      const newScore = state.score + ans.points;
      const newTop10 = state.currentRound.top_10.map(a => 
        a.id === id ? { ...a, revealed: true } : a
      );

      const allRevealed = newTop10.every(a => a.revealed);
      
      const updates: Partial<GameState> = {
        currentRound: { ...state.currentRound, top_10: newTop10 },
        score: newScore
      };

      if (allRevealed) {
          soundService.play('WIN');
          const winner = state.currentTurn || state.buzzerWinner;
          if (winner) {
              updateState({
                  ...updates,
                  teamAScore: state.teamAScore + (winner === 'left' ? newScore : 0),
                  teamBScore: state.teamBScore + (winner === 'right' ? newScore : 0),
                  status: 'IDLE',
                  currentTurn: null,
                  isStealPhase: false
              });
              setFeedback(`TABLEAU COMPLET ! Points pour l'équipe ${winner === 'left' ? 'A' : 'B'}`);
              return;
          }
      }

      if (state.isStealPhase) {
          soundService.play('WIN');
          const winner = state.currentTurn as 'left' | 'right';
          updateState({
              ...updates,
              teamAScore: state.teamAScore + (winner === 'left' ? newScore : 0),
              teamBScore: state.teamBScore + (winner === 'right' ? newScore : 0),
              status: 'IDLE',
              currentTurn: null,
              isStealPhase: false
          });
          setFeedback(`VOL RÉUSSI par l'équipe ${winner === 'left' ? 'A' : 'B'} !`);
      } else {
          updateState(updates);
      }
      
      return newScore;
    }
    return state.score;
  };

  const awardPointsAndEndRound = (winnerSide: 'left' | 'right', finalScore?: number) => {
    soundService.play('WIN');
    const scoreToAward = finalScore !== undefined ? finalScore : state.score;
    
    updateState({
        teamAScore: state.teamAScore + (winnerSide === 'left' ? scoreToAward : 0),
        teamBScore: state.teamBScore + (winnerSide === 'right' ? scoreToAward : 0),
        status: 'IDLE',
        currentTurn: null,
        isStealPhase: false
    });
    setFeedback(`Terminé ! Points attribués à l'équipe ${winnerSide === 'left' ? 'A' : 'B'}`);
  };

  const handleGuess = async () => {
    if (!guessInput || !state.currentRound) return;
    setLoading(true);
    setFeedback("Analyse sémantique...");
    try {
      const result = await validateAnswer(guessInput, state.currentRound.top_10);
      
      if (result.match && result.id) {
        const alreadyRevealed = state.currentRound.top_10.find(a => a.id === result.id)?.revealed;
        if (alreadyRevealed) {
          setFeedback("Déjà trouvé ! Erreur.");
          triggerStrike();
          setGuessInput('');
          return;
        }
        
        setFeedback(result.message);
        handleManualReveal(result.id);
        setGuessInput('');
      } else {
        setFeedback("Khati ! (Faux)");
        triggerStrike();
      }
    } catch (error) {
      setFeedback("Erreur de connexion API.");
    } finally {
      setLoading(false);
    }
  };

  const triggerStrike = () => {
    soundService.play('STRIKE');
    const newStrikes = state.strikes + 1;
    
    if (state.isStealPhase) {
        awardPointsAndEndRound(state.buzzerWinner === 'left' ? 'right' : 'left' as 'left' | 'right');
        setFeedback("Vol raté ! Les points retournent à l'autre équipe.");
        return;
    }

    const nextUpdate: Partial<GameState> = { 
        strikes: newStrikes,
        status: 'STRIKE_ANIMATION' 
    };

    if (newStrikes >= 3) {
        soundService.play('STEAL');
        nextUpdate.isStealPhase = true;
        nextUpdate.currentTurn = state.buzzerWinner === 'left' ? 'right' : 'left';
        setFeedback("3 FAUTES ! Phase de VOL activée.");
    }

    updateState(nextUpdate);

    // Retour au jeu normal après l'animation de la croix
    setTimeout(() => {
      // On passe explicitement newStrikes pour être sûr de ne pas revenir en arrière
      updateState({ status: 'PLAYING', strikes: newStrikes });
    }, 2000);
  };

  return (
    <div className="h-screen bg-[#0f1117] text-white flex flex-col overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-800 p-3 px-6 flex justify-between items-center shadow-xl z-20">
        <div className="flex items-center gap-3">
            <div className="gold-gradient p-1 rounded-md">
                <div className="bg-black p-1 px-3 rounded-sm">
                    <span className="font-black italic text-[10px]">RÉGIE</span>
                </div>
            </div>
            <h1 className="text-lg font-black uppercase tracking-tight">Famille en Or DZ</h1>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
                <div className={`w-2 h-2 rounded-full ${state.status !== 'IDLE' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{state.status}</span>
            </div>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto custom-scroll">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
            <h2 dir="rtl" className="text-[12px] font-black text-amber-500 uppercase tracking-widest mb-4 font-['Cairo']">إعداد المرحلة</h2>
            <div className="flex flex-col gap-3">
              <input dir="rtl" type="text" placeholder="أدخل موضوع جزائري..." className="bg-black/40 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-bold text-sm text-white font-['Cairo']" value={themeInput} onChange={(e) => setThemeInput(e.target.value)} />
              <button disabled={loading} onClick={handleNewRound} className="bg-amber-500 hover:bg-amber-600 text-black font-black py-4 rounded-xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest">Lancer la question</button>
            </div>
          </section>

          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase">État des Équipes</span>
                <button onClick={resetBuzzer} className="text-[9px] font-black bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">RÉINITIALISER BUZZERS</button>
             </div>
             <div className="flex gap-3 mb-6">
                <div className={`flex-1 h-4 rounded-full transition-all border-2 ${state.currentTurn === 'left' ? 'bg-blue-600 border-white shadow-[0_0_12px_rgba(37,99,235,0.5)]' : 'bg-slate-800 border-transparent opacity-30'}`}></div>
                <div className={`flex-1 h-4 rounded-full transition-all border-2 ${state.currentTurn === 'right' ? 'bg-red-600 border-white shadow-[0_0_12px_rgba(220,38,38,0.5)]' : 'bg-slate-800 border-transparent opacity-30'}`}></div>
             </div>
             <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-slate-800">
                <div className="text-center">
                    <span className="text-[9px] block opacity-50 uppercase mb-1 font-black">Équipe A</span>
                    <span className="font-black text-blue-400 text-2xl">{state.teamAScore}</span>
                </div>
                <div className="h-10 w-px bg-slate-700"></div>
                <div className="text-center">
                    <span className="text-[9px] block opacity-50 uppercase mb-1 font-black">Équipe B</span>
                    <span className="font-black text-red-400 text-2xl">{state.teamBScore}</span>
                </div>
             </div>
          </section>

          {state.currentRound && (
            <section className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-5">
                <span className="text-[9px] font-black text-amber-500/60 uppercase block mb-2 tracking-widest">Note pour l'Animateur</span>
                <p className="text-amber-200/80 italic text-sm font-medium leading-relaxed">"{state.currentRound.anecdote_host}"</p>
            </section>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          {state.currentRound ? (
            <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col h-full shadow-2xl overflow-hidden">
                <div className="mb-6 flex justify-between items-start">
                    <div className="flex-1 pr-4">
                        <h2 dir="rtl" className="text-2xl font-black italic tracking-tight mb-2 leading-tight font-['Cairo']">{state.currentRound.question}</h2>
                        <div className="flex gap-4 items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Cagnotte : <span className="text-amber-500 font-black text-sm">{state.score}</span></span>
                            <span className="text-slate-700">|</span>
                            <span className="text-[10px] font-black text-red-500 uppercase">Fautes : {state.strikes}/3</span>
                        </div>
                    </div>
                    {state.isStealPhase && (
                        <div className="bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black animate-pulse shadow-xl border border-red-400">🚨 VOL DE POINTS</div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 flex-1 overflow-y-auto custom-scroll pr-2">
                  {state.currentRound.top_10.map((ans, idx) => (
                    <button key={ans.id} onClick={() => handleManualReveal(ans.id)} disabled={ans.revealed} className={`group flex justify-between items-center p-4 rounded-xl border transition-all ${ans.revealed ? 'bg-green-500/10 border-green-500/30 text-green-400 opacity-60' : 'bg-black/30 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{idx + 1}</span>
                        <span dir="rtl" className="font-bold text-sm font-['Cairo']">{ans.text}</span>
                      </div>
                      <span className="text-amber-500 font-black text-sm">{ans.points}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-black/60 p-6 rounded-2xl border border-slate-800 shadow-inner">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input dir="rtl" type="text" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} placeholder="اكتب الإجابة..." className="flex-1 bg-transparent border-b-2 border-slate-700 px-2 py-3 outline-none focus:border-green-500 font-bold text-xl text-white transition-all font-['Cairo']" onKeyDown={(e) => e.key === 'Enter' && handleGuess()} />
                        <div className="flex gap-3">
                            <button onClick={handleGuess} disabled={loading || !guessInput} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95">VALIDE</button>
                            <button onClick={triggerStrike} className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-4 rounded-xl shadow-lg transition-all active:scale-95">ERREUR</button>
                        </div>
                    </div>
                    {feedback && <p className="mt-4 text-center font-black text-amber-500 uppercase text-[10px] tracking-widest animate-pulse">{feedback}</p>}
                </div>
                <div className="mt-6 flex gap-4">
                    <button onClick={() => awardPointsAndEndRound('left')} className="flex-1 py-3 bg-blue-900/30 border border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Forcer Gain Équipe A</button>
                    <button onClick={() => awardPointsAndEndRound('right')} className="flex-1 py-3 bg-red-900/30 border border-red-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Forcer Gain Équipe B</button>
                </div>
            </section>
          ) : (
            <div className="flex-1 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-12 opacity-50">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </div>
                <p className="text-xl font-black uppercase italic text-slate-700 tracking-widest">En attente d'une nouvelle manche</p>
                <p className="text-xs text-slate-800 uppercase font-bold mt-2">Utilisez le panneau latéral pour générer une question</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminView;

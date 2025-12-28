
import React, { useState } from 'react';
import { GameState } from '../types';
import { generateRound, validateAnswer } from '../services/geminiService';

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

  // Réinitialisation complète de la partie (Firebase + Local)
  const handleFullReset = () => {
    const confirmMessage = "⚠️ EFFACER TOUTE LA PARTIE ?\n\nScores, rounds et historique seront remis à ZÉRO.";
    if (window.confirm(confirmMessage)) {
      updateState({
        currentRound: null,
        score: 0,
        teamAScore: 0,
        teamBScore: 0,
        strikes: 0,
        buzzerWinner: null,
        currentTurn: null,
        isStealPhase: false,
        status: 'IDLE',
      });
      setFeedback("⚠️ PARTIE RÉINITIALISÉE");
      setTimeout(() => setFeedback(""), 2000);
    }
  };

  const handleNewRound = async () => {
    if (!themeInput || loading) return;
    setLoading(true);
    setFeedback("Génération du tableau...");
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
      setFeedback("Erreur API Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualReveal = (id: number) => {
    if (!state.currentRound) return;
    const ans = state.currentRound.top_10.find(a => a.id === id);
    if (ans && !ans.revealed) {
      const newScore = state.score + ans.points;
      const newTop10 = state.currentRound.top_10.map(a => 
        a.id === id ? { ...a, revealed: true } : a
      );
      updateState({
        currentRound: { ...state.currentRound, top_10: newTop10 },
        score: newScore
      });
    }
  };

  const awardPointsAndEndRound = (winnerSide: 'left' | 'right') => {
    updateState({
      teamAScore: state.teamAScore + (winnerSide === 'left' ? state.score : 0),
      teamBScore: state.teamBScore + (winnerSide === 'right' ? state.score : 0),
      status: 'IDLE',
      currentTurn: null,
      isStealPhase: false,
      score: 0
    });
    setFeedback(`VICTOIRE ÉQUIPE ${winnerSide === 'left' ? 'A' : 'B'}`);
    setTimeout(() => setFeedback(""), 2000);
  };

  const handleGuess = async () => {
    if (!guessInput || !state.currentRound || loading) return;
    setLoading(true);
    try {
      const result = await validateAnswer(guessInput, state.currentRound.top_10);
      if (result.match && result.id) {
        handleManualReveal(result.id);
        setGuessInput('');
      } else {
        triggerStrike();
      }
    } catch (error) {
      setFeedback("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const triggerStrike = () => {
    const newStrikes = state.strikes + 1;
    updateState({ strikes: newStrikes, status: 'STRIKE_ANIMATION' });
    setTimeout(() => updateState({ status: 'PLAYING' }), 1500);
  };

  return (
    <div className="h-screen bg-[#0a0c10] text-white flex flex-col overflow-hidden font-sans">
      {/* Header Compact - Safe Area iPhone */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 px-6 flex justify-between items-center shrink-0 pt-[env(safe-area-inset-top)]">
        <h1 className="text-sm font-black text-amber-500 tracking-[0.2em]">RÉGIE DZ</h1>
        <button onClick={handleFullReset} className="bg-red-600/10 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black border border-red-500/20 active:bg-red-600 active:text-white transition-all">
          RESET PARTIE
        </button>
      </header>

      {/* Main content with massive padding-bottom to avoid overlap by fixed footer */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-[340px] custom-scroll">
        {/* Nouveau Round */}
        <section className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl">
          <div className="flex flex-col gap-3">
            <input 
              dir="rtl" 
              type="text" 
              placeholder="Ex: الماكلة في الدزاير..." 
              className="w-full bg-black/50 border border-slate-700 rounded-2xl px-5 py-4 text-lg outline-none focus:border-amber-500 font-['Cairo']" 
              value={themeInput} 
              onChange={(e) => setThemeInput(e.target.value)} 
            />
            <button 
              disabled={loading || !themeInput} 
              onClick={handleNewRound} 
              className="w-full bg-amber-500 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              {loading ? 'Génération...' : 'Lancer le Round'}
            </button>
          </div>
        </section>

        {/* Scores Équipes */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-5 rounded-3xl border-2 text-center transition-all ${state.currentTurn === 'left' ? 'bg-blue-600 border-white' : 'bg-slate-900 border-slate-800 opacity-40 grayscale'}`}>
            <span className="text-[10px] block font-black uppercase mb-1">Équipe A</span>
            <span className="text-3xl font-black">{state.teamAScore}</span>
          </div>
          <div className={`p-5 rounded-3xl border-2 text-center transition-all ${state.currentTurn === 'right' ? 'bg-red-600 border-white' : 'bg-slate-900 border-slate-800 opacity-40 grayscale'}`}>
            <span className="text-[10px] block font-black uppercase mb-1">Équipe B</span>
            <span className="text-3xl font-black">{state.teamBScore}</span>
          </div>
        </div>

        {/* Interface de jeu active */}
        {state.currentRound ? (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
               <h2 dir="rtl" className="text-xl font-black font-['Cairo'] mb-4 text-center leading-snug text-amber-200">{state.currentRound.question}</h2>
               <div className="flex gap-3">
                 <div className="flex-1 bg-black/40 p-3 rounded-2xl text-center">
                    <span className="text-[9px] block text-slate-500 uppercase font-black">Points Round</span>
                    <span className="text-2xl font-black text-amber-500">{state.score}</span>
                 </div>
                 <div className="flex-1 bg-black/40 p-3 rounded-2xl text-center">
                    <span className="text-[9px] block text-slate-500 uppercase font-black">Fautes</span>
                    <span className="text-2xl font-black text-red-500">{state.strikes}/3</span>
                 </div>
               </div>
            </div>

            {/* Liste des Réponses - Gros boutons tactiles */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase ml-4 mb-1 tracking-widest">Tableau des Réponses</span>
              {state.currentRound.top_10.map((ans, idx) => (
                <button 
                  key={ans.id} 
                  onClick={() => handleManualReveal(ans.id)} 
                  disabled={ans.revealed}
                  className={`flex justify-between items-center p-5 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${
                    ans.revealed 
                      ? 'bg-green-600/10 text-green-400 border-green-600/30 opacity-50' 
                      : 'bg-slate-900 border-slate-800 shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black">{idx+1}</span>
                    <span dir="rtl" className="font-['Cairo'] text-lg">{ans.text}</span>
                  </div>
                  <span className="text-amber-500 font-black text-xl">{ans.points}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-30 select-none">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <p className="text-xl font-black uppercase tracking-widest italic">Attente de manche</p>
          </div>
        )}
      </main>

      {/* Footer de saisie collant pour iPhone - Optimisé avec un padding fixe plus élevé au-dessus */}
      {state.currentRound && (
        <div className="fixed bottom-[20px] left-4 right-4 bg-slate-900/95 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-slate-700/50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-50">
          <input 
            dir="rtl" 
            type="text" 
            value={guessInput} 
            onChange={(e) => setGuessInput(e.target.value)} 
            placeholder="Entrez la réponse..." 
            className="w-full bg-transparent border-b-2 border-slate-700 py-3 mb-4 text-2xl text-center font-['Cairo'] outline-none focus:border-green-500" 
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()} 
          />
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleGuess} disabled={loading} className="bg-green-600 text-white font-black py-5 rounded-2xl text-sm uppercase active:bg-green-700 transition-colors shadow-lg shadow-green-900/20">VÉRIFIER</button>
            <button onClick={triggerStrike} className="bg-red-600 text-white font-black py-5 rounded-2xl text-sm uppercase active:bg-red-700 transition-colors shadow-lg shadow-red-900/20">FAUTE (X)</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button onClick={() => awardPointsAndEndRound('left')} className="bg-blue-600/30 text-blue-400 border border-blue-500/30 py-3 rounded-xl text-[9px] font-black uppercase active:bg-blue-600 active:text-white transition-all">Gain A</button>
            <button onClick={() => awardPointsAndEndRound('right')} className="bg-red-600/30 text-red-400 border border-red-500/30 py-3 rounded-xl text-[9px] font-black uppercase active:bg-red-600 active:text-white transition-all">Gain B</button>
            <button onClick={resetBuzzer} className="bg-slate-700 text-slate-300 py-3 rounded-xl text-[9px] font-black uppercase active:bg-slate-600">Buzzer</button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="fixed top-24 left-6 right-6 bg-amber-500 text-black px-6 py-4 rounded-2xl text-center font-black text-sm shadow-2xl animate-in slide-in-from-top duration-300 z-[100]">
          {feedback}
        </div>
      )}
    </div>
  );
};

export default AdminView;

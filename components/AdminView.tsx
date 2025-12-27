
import React, { useState } from 'react';
import { GameState, Role } from '../types';
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

  const handleNewRound = async () => {
    if (!themeInput) return;
    setLoading(true);
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
        status: 'BUZZING'
      });
      setThemeInput('');
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la génération. Réessaie !");
    } finally {
      setLoading(false);
    }
  };

  const handleManualReveal = (id: number) => {
    if (!state.currentRound) return;
    const ans = state.currentRound.top_10.find(a => a.id === id);
    if (ans && !ans.revealed) {
      const newTop10 = state.currentRound.top_10.map(a => 
        a.id === id ? { ...a, revealed: true } : a
      );
      updateState({
        currentRound: { ...state.currentRound, top_10: newTop10 },
        score: state.score + ans.points
      });
    }
  };

  const handleGuess = async () => {
    if (!guessInput || !state.currentRound) return;
    setLoading(true);
    try {
      const result = await validateAnswer(guessInput, state.currentRound.top_10);
      setFeedback(result.message);
      
      if (result.match && result.id) {
        handleManualReveal(result.id);
        setGuessInput('');
      } else {
        triggerStrike();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const triggerStrike = () => {
    const newStrikes = state.strikes + 1;
    updateState({ status: 'STRIKE_ANIMATION', strikes: newStrikes });
    setTimeout(() => {
      updateState({ status: 'PLAYING' });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col gap-6 text-white overflow-y-auto">
      <header className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h1 className="text-xl font-black text-amber-500 uppercase italic">Admin Console</h1>
        <div className="text-sm font-bold bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full">
            Role: Moderator
        </div>
      </header>

      {/* New Round Generation */}
      <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            Nouvelle Manche
        </h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Ex: Ramadan, Mariage, Les voitures..."
            className="flex-1 bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-amber-500 transition-colors"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
          />
          <button 
            disabled={loading}
            onClick={handleNewRound}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black px-6 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? '...' : 'Générer'}
          </button>
        </div>
      </section>

      {state.currentRound && (
        <div className="flex flex-col gap-6">
          {/* Answer Controls */}
          <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Réponses ({state.currentRound.top_10.filter(a => a.revealed).length}/10)</h2>
                <button 
                    onClick={resetBuzzer}
                    className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded border border-red-500/30 font-bold uppercase"
                >
                    Reset Buzzer
                </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2 mb-6">
              {state.currentRound.top_10.map((ans) => (
                <button
                  key={ans.id}
                  onClick={() => handleManualReveal(ans.id)}
                  disabled={ans.revealed}
                  className={`flex justify-between items-center p-3 rounded-lg border-2 transition-all ${
                    ans.revealed 
                      ? 'bg-green-500/20 border-green-500 text-green-400' 
                      : 'bg-slate-950 border-slate-700 hover:border-amber-500'
                  }`}
                >
                  <span className="font-bold">{ans.id}. {ans.text}</span>
                  <span className="bg-amber-500 text-black px-2 rounded font-black">{ans.points}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Saisie Famille</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Tape la réponse proposée..."
                  className="flex-1 bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                />
                <button 
                  onClick={handleGuess}
                  disabled={loading}
                  className="bg-green-600 text-white font-bold px-4 rounded-lg"
                >
                  OK
                </button>
                <button 
                  onClick={triggerStrike}
                  className="bg-red-600 text-white font-bold px-4 rounded-lg"
                >
                  X
                </button>
              </div>
              {feedback && <p className="text-center italic text-amber-400 font-bold">{feedback}</p>}
            </div>
          </section>

          {/* Anecdote Section */}
          <section className="bg-amber-900/20 p-4 rounded-xl border border-amber-800/50">
            <h3 className="text-xs font-black text-amber-500 uppercase mb-2">Note pour l'Animateur</h3>
            <p className="text-amber-200 italic">"{state.currentRound.anecdote_host}"</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminView;

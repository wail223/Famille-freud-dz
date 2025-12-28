
export enum Role {
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  BUZZER = 'BUZZER'
}

export interface Answer {
  id: number;
  text: string;
  points: number;
  revealed: boolean;
}

export interface GameState {
  currentRound: {
    question: string;
    top_10: Answer[];
    anecdote_host: string;
  } | null;
  score: number; // Points accumulés dans la manche actuelle
  teamAScore: number; // Score global Équipe A
  teamBScore: number; // Score global Équipe B
  strikes: number;
  buzzerWinner: 'left' | 'right' | null;
  currentTurn: 'left' | 'right' | null;
  isStealPhase: boolean; // Si on est dans la phase de vol (après 3 fautes)
  status: 'IDLE' | 'BUZZING' | 'PLAYING' | 'STRIKE_ANIMATION';
}

export interface SyncMessage {
  type: 'UPDATE_STATE' | 'BUZZ' | 'RESET_BUZZ';
  payload: any;
}

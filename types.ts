
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
  score: number;
  strikes: number;
  buzzerWinner: 'left' | 'right' | null;
  status: 'IDLE' | 'BUZZING' | 'PLAYING' | 'STRIKE_ANIMATION';
}

export interface SyncMessage {
  type: 'UPDATE_STATE' | 'BUZZ' | 'RESET_BUZZ';
  payload: any;
}


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/**
 * Configuration Firebase pour le projet : familetna-f0d53
 */
const firebaseConfig = {
  apiKey: "AIzaSyArdIzFUUDFMR510ylL-hmY-GvzuB2lQII",
  authDomain: "familetna-f0d53.firebaseapp.com",
  databaseURL: "https://familetna-f0d53-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "familetna-f0d53",
  storageBucket: "familetna-f0d53.firebasestorage.app",
  messagingSenderId: "432453573012",
  appId: "1:432453573012:web:7fd15030fa71885548d781"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

let currentSessionId: string | null = null;

/**
 * Initialise l'ID de session pour isoler les parties
 */
export const setSessionId = (sessionId: string) => {
  currentSessionId = sessionId.toUpperCase().trim();
};

const getSessionPath = (subPath: string) => {
  if (!currentSessionId) throw new Error("Aucune session initialisée");
  return `sessions/${currentSessionId}/${subPath}`;
};

/**
 * Met à jour l'état global sur Firebase
 */
export const syncStateToFirebase = async (newState: any) => {
  if (!currentSessionId) return;
  await set(ref(db, getSessionPath('game_state')), newState);
};

/**
 * Écoute les changements d'état en temps réel
 */
export const listenToFirebaseState = (callback: (state: any) => void) => {
  if (!currentSessionId) return () => {};
  const stateRef = ref(db, getSessionPath('game_state'));
  return onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
};

/**
 * Gère le buzz via une transaction simple
 */
export const sendBuzzToFirebase = async (side: 'left' | 'right') => {
  if (!currentSessionId) return;
  const buzzRef = ref(db, getSessionPath('buzz_event'));
  await set(buzzRef, { side, timestamp: Date.now() });
};

/**
 * Écoute les événements de buzz
 */
export const listenToBuzzEvents = (callback: (side: 'left' | 'right') => void) => {
  if (!currentSessionId) return () => {};
  const buzzRef = ref(db, getSessionPath('buzz_event'));
  return onValue(buzzRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.side) {
      callback(data.side);
    }
  });
};

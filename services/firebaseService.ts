// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getDatabase, ref, onValue, set } from "firebase/database";
// @ts-ignore
import { getAuth, signInAnonymously } from "firebase/auth";

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

let app: any;
let auth: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);

  // Connexion anonyme automatique au démarrage
  signInAnonymously(auth)
    .then(() => {
      console.log("[Firebase] Authentification anonyme réussie");
    })
    .catch((error: any) => {
      console.error("[Firebase] Erreur d'authentification:", error);
    });
} catch (e) {
  console.error("[Firebase] CRITICAL INITIALIZATION ERROR:", e);
}

export { auth, db };

let currentSessionId: string | null = null;

/**
 * Initialise l'ID de session pour isoler les parties
 */
export const setSessionId = (sessionId: string) => {
  currentSessionId = sessionId.toUpperCase().trim();
  console.log(`[Firebase] Session ID set to: ${currentSessionId}`);
};

const getSessionPath = (subPath: string) => {
  if (!currentSessionId) throw new Error("Aucune session initialisée");
  return `sessions/${currentSessionId}/${subPath}`;
};

/**
 * Met à jour l'état global sur Firebase
 */
export const syncStateToFirebase = async (newState: any) => {
  if (!currentSessionId || !db) {
    // console.warn("[Firebase] Tentative de sync sans Session ID ou DB non init");
    return;
  }
  try {
    await set(ref(db, getSessionPath('game_state')), newState);
  } catch (e) {
    console.error("[Firebase] Erreur d'écriture:", e);
  }
};

/**
 * Écoute les changements d'état en temps réel
 */
export const listenToFirebaseState = (callback: (state: any) => void) => {
  if (!currentSessionId || !db) return () => {};
  
  const stateRef = ref(db, getSessionPath('game_state'));
  console.log(`[Firebase] Listening to ${getSessionPath('game_state')}`);

  return onValue(stateRef, (snapshot: any) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  }, (error: any) => {
    console.error("[Firebase] Erreur de lecture:", error);
  });
};

/**
 * Gère le buzz via une transaction simple
 */
export const sendBuzzToFirebase = async (side: 'left' | 'right') => {
  if (!currentSessionId || !db) return;
  const buzzRef = ref(db, getSessionPath('buzz_event'));
  try {
    await set(buzzRef, { side, timestamp: Date.now() });
  } catch (e) {
    console.error("[Firebase] Erreur d'envoi buzz:", e);
  }
};

/**
 * Écoute les événements de buzz
 */
export const listenToBuzzEvents = (callback: (side: 'left' | 'right') => void) => {
  if (!currentSessionId || !db) return () => {};
  const buzzRef = ref(db, getSessionPath('buzz_event'));
  return onValue(buzzRef, (snapshot: any) => {
    const data = snapshot.val();
    if (data && data.side) {
      callback(data.side);
    }
  });
};
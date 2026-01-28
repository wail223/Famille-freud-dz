
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Connexion anonyme automatique au démarrage
signInAnonymously(auth)
  .then(() => {
    console.log("[Firebase] Authentification anonyme réussie");
  })
  .catch((error) => {
    console.error("[Firebase] Erreur d'authentification:", error);
  });

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
  if (!currentSessionId) {
    console.warn("[Firebase] Tentative de sync sans Session ID");
    return;
  }
  // On attend que l'auth soit prête si besoin, mais Firebase le gère en offline généralement
  try {
    await set(ref(db, getSessionPath('game_state')), newState);
  } catch (e) {
    console.error("[Firebase] Erreur d'écriture (Avez-vous mis à jour les règles ?):", e);
  }
};

/**
 * Écoute les changements d'état en temps réel
 */
export const listenToFirebaseState = (callback: (state: any) => void) => {
  if (!currentSessionId) return () => {};
  
  const stateRef = ref(db, getSessionPath('game_state'));
  console.log(`[Firebase] Listening to ${getSessionPath('game_state')}`);

  return onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("[Firebase] Données reçues update");
      callback(data);
    } else {
        console.log("[Firebase] Aucune donnée reçue (null) ou chemin vide");
    }
  }, (error) => {
    console.error("[Firebase] Erreur de lecture (Permissions ?):", error);
  });
};

/**
 * Gère le buzz via une transaction simple
 */
export const sendBuzzToFirebase = async (side: 'left' | 'right') => {
  if (!currentSessionId) return;
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
  if (!currentSessionId) return () => {};
  const buzzRef = ref(db, getSessionPath('buzz_event'));
  return onValue(buzzRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.side) {
      callback(data.side);
    }
  });
};

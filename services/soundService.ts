
const SOUNDS = {
  // Classic Game Show Buzzer pour les erreurs (Le 'X')
  STRIKE: 'https://assets.mixkit.co/active_storage/sfx/2958/2958-preview.mp3', 
  // 'Ding' cristallin pour les bonnes réponses
  CORRECT: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  // Fanfare de victoire pour la fin d'une manche
  WIN: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  // Son de tension dramatique pour la phase de vol
  STEAL: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  // Carillon/Whoosh pour l'apparition d'une nouvelle question
  NEW_QUESTION: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  // Buzzer physique pour les candidats
  BUZZER: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'
};

class SoundService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isUnlocked: boolean = false;

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.audioCache.set(key, audio);
    });
  }

  // Déverrouille le contexte audio sur iPhone/Android après le premier toucher
  unlock() {
    if (this.isUnlocked) return;
    this.audioCache.forEach((audio) => {
      // Lecture/Pause immédiate pour autoriser les lectures futures par script
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    });
    this.isUnlocked = true;
    console.log("Audio Engine Unlocked via Interaction");
  }

  play(soundKey: keyof typeof SOUNDS) {
    const audio = this.audioCache.get(soundKey);
    if (audio) {
      // On utilise une version clonée ou on réinitialise pour permettre des sons rapides successifs
      audio.currentTime = 0;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si la lecture échoue (ex: encore bloqué), on tente une lecture sur un clone
          const clone = audio.cloneNode() as HTMLAudioElement;
          clone.volume = audio.volume;
          clone.play().catch(e => console.warn(`Audio play failed for ${soundKey}:`, e));
        });
      }
    }
  }
}

export const soundService = new SoundService();

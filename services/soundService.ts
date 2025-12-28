
const SOUNDS = {
  // Buzzer d'alerte type TV
  BUZZER: 'https://cdn.pixabay.com/audio/2022/10/30/audio_3396e3876e.mp3', 
  // Ding de bonne réponse classique
  CORRECT: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1513b.mp3',
  // Buzzer d'erreur (Le X)
  STRIKE: 'https://cdn.pixabay.com/audio/2022/03/24/audio_7399066487.mp3',
  // Tension pour le vol de points
  STEAL: 'https://cdn.pixabay.com/audio/2021/08/04/audio_275e6d87f7.mp3',
  // Fanfare de victoire
  WIN: 'https://cdn.pixabay.com/audio/2024/02/07/audio_097498c114.mp3'
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

  unlock() {
    if (this.isUnlocked) return;
    this.audioCache.forEach((audio) => {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    });
    this.isUnlocked = true;
  }

  play(soundKey: keyof typeof SOUNDS) {
    const audio = this.audioCache.get(soundKey);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn("Audio error:", e));
    }
  }
}

export const soundService = new SoundService();


const SOUNDS = {
  BUZZER: 'https://raw.githubusercontent.com/Aris-Tottle/Family-Feud-Assets/master/sounds/buzzer.mp3',
  CORRECT: 'https://raw.githubusercontent.com/Aris-Tottle/Family-Feud-Assets/master/sounds/ding.mp3',
  STRIKE: 'https://raw.githubusercontent.com/Aris-Tottle/Family-Feud-Assets/master/sounds/strike.mp3',
  STEAL: 'https://raw.githubusercontent.com/Aris-Tottle/Family-Feud-Assets/master/sounds/steal-opportunity.mp3',
  WIN: 'https://raw.githubusercontent.com/Aris-Tottle/Family-Feud-Assets/master/sounds/win.mp3'
};

class SoundService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isUnlocked: boolean = false;

  constructor() {
    // Préchargement passif
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.load();
      this.audioCache.set(key, audio);
    });
  }

  unlock() {
    if (this.isUnlocked) return;
    // Jouer un son silencieux sur tous les éléments du cache pour les débloquer
    this.audioCache.forEach((audio) => {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    });
    this.isUnlocked = true;
    console.log("Audio Unlocked & Preloaded");
  }

  play(soundKey: keyof typeof SOUNDS) {
    try {
      const audio = this.audioCache.get(soundKey);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn("Audio play blocked: Recliquez sur le bouton de déblocage au début.");
            // Tentative de secours si non débloqué
            const fallback = new Audio(SOUNDS[soundKey]);
            fallback.play().catch(() => {});
        });
      }
    } catch (e) {
      console.error("Sound error", e);
    }
  }
}

export const soundService = new SoundService();

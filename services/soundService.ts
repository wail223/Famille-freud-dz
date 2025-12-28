
const SOUNDS = {
  BUZZER: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  CORRECT: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  STRIKE: 'https://assets.mixkit.co/active_storage/sfx/2958/2958-preview.mp3',
  STEAL: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  WIN: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
};

class SoundService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isUnlocked: boolean = false;

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
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

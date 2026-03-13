// Звуковые уведомления для чата
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Инициализируем AudioContext только на клиенте
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private async initAudioContext() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSounds();
    } catch (error) {
      console.warn('AudioContext не поддерживается:', error);
    }
  }

  private async loadSounds() {
    if (!this.audioContext) return;

    // Создаем звуки программно (без внешних файлов)
    const sounds = {
      message: this.createMessageSound(),
      notification: this.createNotificationSound(),
      join: this.createJoinSound(),
      leave: this.createLeaveSound(),
      typing: this.createTypingSound()
    };

    for (const [name, audioBuffer] of Object.entries(sounds)) {
      this.sounds.set(name, audioBuffer);
    }
  }

  private createMessageSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Создаем приятный звук уведомления
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 5) * 0.3;
    }

    return buffer;
  }

  private createNotificationSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Двойной тон для уведомлений
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq1 = 600;
      const freq2 = 800;
      data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * Math.exp(-t * 3) * 0.2;
    }

    return buffer;
  }

  private createJoinSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Восходящий тон для присоединения
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 400 + (t * 400); // От 400Hz до 800Hz
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2) * 0.25;
    }

    return buffer;
  }

  private createLeaveSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Нисходящий тон для выхода
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 800 - (t * 400); // От 800Hz до 400Hz
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2) * 0.25;
    }

    return buffer;
  }

  private createTypingSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Короткий клик для набора текста
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() - 0.5) * Math.exp(-t * 20) * 0.1;
    }

    return buffer;
  }

  async playSound(soundName: string, volume: number = 1) {
    if (!this.enabled || !this.audioContext || !this.sounds.has(soundName)) {
      return;
    }

    try {
      // Возобновляем AudioContext если он приостановлен
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const buffer = this.sounds.get(soundName);
      if (!buffer) return;

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = Math.min(Math.max(volume, 0), 1);
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Ошибка воспроизведения звука:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Методы для удобства
  playMessageSound() {
    this.playSound('message');
  }

  playNotificationSound() {
    this.playSound('notification');
  }

  playJoinSound() {
    this.playSound('join');
  }

  playLeaveSound() {
    this.playSound('leave');
  }

  playTypingSound() {
    this.playSound('typing', 0.5);
  }
}

// Экспортируем синглтон
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null as any;
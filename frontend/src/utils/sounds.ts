// ============================================================
// Sound Effects — Lightweight audio using Web Audio API
// Generates procedural sounds (no external files needed).
// ============================================================

type SoundType = 'click' | 'boxComplete' | 'gameOver' | 'playerJoin' | 'error';

let audioCtx: AudioContext | null = null;
let _muted = localStorage.getItem('dots-boxes-muted') === 'true';

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean): void {
  _muted = muted;
  localStorage.setItem('dots-boxes-muted', String(muted));
}

export function toggleMute(): boolean {
  setMuted(!_muted);
  return _muted;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15): void {
  if (_muted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio context is not available
  }
}

export function playSound(type: SoundType): void {
  switch (type) {
    case 'click':
      playTone(800, 0.08, 'sine', 0.1);
      break;
    case 'boxComplete':
      // Rising chime
      playTone(523, 0.15, 'sine', 0.12);
      setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 80);
      setTimeout(() => playTone(784, 0.25, 'sine', 0.12), 160);
      break;
    case 'gameOver':
      // Fanfare
      playTone(523, 0.2, 'square', 0.08);
      setTimeout(() => playTone(659, 0.2, 'square', 0.08), 150);
      setTimeout(() => playTone(784, 0.2, 'square', 0.08), 300);
      setTimeout(() => playTone(1047, 0.4, 'square', 0.1), 450);
      break;
    case 'playerJoin':
      playTone(600, 0.12, 'sine', 0.1);
      setTimeout(() => playTone(800, 0.12, 'sine', 0.1), 100);
      break;
    case 'error':
      playTone(300, 0.15, 'square', 0.08);
      setTimeout(() => playTone(200, 0.2, 'square', 0.08), 120);
      break;
  }
}

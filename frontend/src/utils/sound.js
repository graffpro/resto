/**
 * Plays a "cash register / new order" notification using Web Audio API.
 * No external file required. Sounds like a bright two-tone bell ding.
 *
 * Usage:
 *   import { playOrderBell } from '@/utils/sound';
 *   playOrderBell();
 */
let audioCtx = null;

function getCtx() {
  if (audioCtx) return audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

function tone(ctx, freq, startAt, duration, gain = 0.18) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startAt);
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playOrderBell() {
  const ctx = getCtx();
  if (!ctx) return;
  // Resume in case the context is suspended (Chrome autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  // Two-tone "ding-ding" bell
  tone(ctx, 1318.51, now,        0.18, 0.22); // E6
  tone(ctx, 1567.98, now + 0.12, 0.22, 0.20); // G6
  // Soft afterglow
  tone(ctx, 880,     now + 0.22, 0.34, 0.10); // A5
}

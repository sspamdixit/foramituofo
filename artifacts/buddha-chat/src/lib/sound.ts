/**
 * Windchime sound system — synthesized via Web Audio, no assets required.
 *
 * All tones are drawn from an A-minor pentatonic scale (A C D E G) so every
 * note combination sounds good. Each hit uses:
 *   • A sine-wave fundamental with a quick exponential ring-out
 *   • One inharmonic overtone at ~2.756× frequency — that ratio is what makes
 *     struck metal tubes sound like windchimes instead of organ pipes
 *   • A tiny random detune on the overtone so no two strikes are identical
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// A-minor pentatonic across two octaves: A C D E G
const NOTES = [
  440,  // A4
  523,  // C5
  587,  // D5
  659,  // E5
  784,  // G5
  880,  // A5
  1047, // C6
  1175, // D6
  1319, // E6
  1568, // G6
];

function pick(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Core windchime voice.
 *
 * @param freq     Fundamental frequency in Hz
 * @param volume   Peak amplitude (0–1). Keep ≤ 0.15 in practice.
 * @param ringMs   How long the fundamental rings before silence (ms)
 */
function chimeNote(freq: number, volume: number, ringMs: number) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const ring = ringMs / 1000;

  const out = ac.createGain();
  out.gain.value = 1;
  out.connect(ac.destination);

  // ── Fundamental ──────────────────────────────────────────────────────────
  const o1 = ac.createOscillator();
  o1.type = "sine";
  o1.frequency.value = freq;
  const g1 = ac.createGain();
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(volume, now + 0.006);   // fast attack
  g1.gain.exponentialRampToValueAtTime(volume * 0.28, now + 0.075); // knock transient
  g1.gain.exponentialRampToValueAtTime(0.00015, now + ring);         // long ring
  o1.connect(g1);
  g1.connect(out);
  o1.start(now);
  o1.stop(now + ring + 0.05);

  // ── Inharmonic overtone (2.756×) ─────────────────────────────────────────
  // Decays ~3× faster than the fundamental — gives the sharp metallic "ting"
  // while the fundamental carries the tone.
  const o2 = ac.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq * 2.756;
  o2.detune.value = (Math.random() - 0.5) * 16; // ±8 cents randomness
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(volume * 0.45, now + 0.005);
  g2.gain.exponentialRampToValueAtTime(0.00015, now + ring * 0.32);
  o2.connect(g2);
  g2.connect(out);
  o2.start(now);
  o2.stop(now + ring * 0.32 + 0.05);
}

/**
 * Typing chime — played on each keypress in the chat input.
 * Bright, high, very quiet. Upper 5 notes of the scale.
 */
export function playTypeChime() {
  chimeNote(pick(NOTES.slice(5)), 0.052, 850);
}

/**
 * Stream chime — played every ~120 ms while Buddha's response text loads.
 * Mid-range, slightly warmer and longer than the typing chime.
 */
export function playStreamChime() {
  chimeNote(pick(NOTES.slice(2, 8)), 0.085, 1350);
}

/**
 * Arrival chime — a two-note cluster fired once when a Buddha message first
 * appears. Richer than the per-character stream chimes.
 */
export function playChime(volume = 0.18) {
  const freq1 = pick(NOTES.slice(3, 7));
  chimeNote(freq1, volume, 1900);
  setTimeout(() => chimeNote(pick(NOTES.slice(4, 8)), volume * 0.65, 1500), 55);
}

/**
 * Singing-bowl chime synthesized via Web Audio. No audio asset required.
 * The chime is triggered when a new Buddha teaching arrives.
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
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

interface Partial {
  freq: number;
  gain: number;
  duration: number;
  detune?: number;
}

// Tibetan-bowl-flavored partials: a low fundamental plus a few inharmonic
// overtones that decay at different rates. Adds the characteristic shimmer.
const PARTIALS: Partial[] = [
  { freq: 396, gain: 0.9, duration: 4.2 },
  { freq: 792, gain: 0.45, duration: 3.0, detune: -6 },
  { freq: 1188, gain: 0.22, duration: 2.2, detune: 8 },
  { freq: 1584, gain: 0.12, duration: 1.4, detune: -4 },
];

export function playChime(volume = 0.22) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  for (const p of PARTIALS) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = p.freq;
    if (p.detune) osc.detune.value = p.detune;

    const env = ac.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(p.gain, now + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0001, now + p.duration);

    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + p.duration + 0.1);
  }
}

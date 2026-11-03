/* =========================================================================
 *  AudioEngine — procedural chiptune soundtrack + sound effects.
 *  Everything is synthesized with the Web Audio API (no audio files).
 *  Music is scheduled with a small look-ahead sequencer.
 * ========================================================================= */

export type TrackName = 'menu' | 'quest' | 'party' | 'room' | 'finale';
export type SfxName =
  | 'click'
  | 'hover'
  | 'collect'
  | 'pop'
  | 'golden'
  | 'catch'
  | 'miss'
  | 'jump'
  | 'portal'
  | 'blow'
  | 'wish'
  | 'confetti'
  | 'fanfare'
  | 'unlock'
  | 'gift';

interface TrackDef {
  bpm: number;
  lead: (string | null)[];
  bass: (string | null)[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  leadGain: number;
  bassGain: number;
  sparkle: boolean;
}

/* Note name → frequency. Format: 'A4', 'C#5', 'A#3' ... */
const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(note: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  if (!m) return 440;
  const semis = NOTE_OFFSETS[m[1]] + (m[2] ? 1 : 0);
  const octave = parseInt(m[3], 10);
  const midi = (octave + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const _ = null;

/* ---------------------------------------------------------------- tracks */
const TRACKS: Record<TrackName, TrackDef> = {
  menu: {
    bpm: 84,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.05,
    bassGain: 0.06,
    sparkle: true,
    lead: [
      'A4', _, 'C5', _, 'E5', _, 'C5', _,
      'D5', _, 'C5', _, 'B4', _, 'G4', _,
      'A4', _, 'C5', _, 'E5', _, 'G5', _,
      'E5', _, 'D5', _, 'C5', _, _, _,
    ],
    bass: [
      'A2', _, _, _, 'E3', _, _, _,
      'F2', _, _, _, 'C3', _, _, _,
      'A2', _, _, _, 'E3', _, _, _,
      'G2', _, _, _, 'D3', _, _, _,
    ],
  },
  quest: {
    bpm: 112,
    leadWave: 'square',
    bassWave: 'triangle',
    leadGain: 0.042,
    bassGain: 0.06,
    sparkle: false,
    lead: [
      'C5', _, 'E5', _, 'G5', _, 'E5', _,
      'F5', _, 'E5', _, 'D5', _, 'B4', _,
      'C5', _, 'D5', _, 'E5', _, 'G5', _,
      'A5', _, 'G5', _, 'E5', _, 'C5', _,
    ],
    bass: [
      'C3', _, 'G2', _, 'C3', _, 'G2', _,
      'F2', _, 'C3', _, 'F2', _, 'C3', _,
      'A2', _, 'E3', _, 'A2', _, 'E3', _,
      'G2', _, 'D3', _, 'G2', _, 'B2', _,
    ],
  },
  party: {
    bpm: 126,
    leadWave: 'square',
    bassWave: 'triangle',
    leadGain: 0.04,
    bassGain: 0.062,
    sparkle: true,
    lead: [
      'E5', _, 'E5', _, 'G5', _, 'E5', _,
      'D5', _, 'E5', _, 'C5', _, _, _,
      'E5', _, 'G5', _, 'A5', _, 'G5', _,
      'E5', _, 'D5', _, 'C5', _, _, _,
    ],
    bass: [
      'C3', _, 'C3', _, 'G2', _, 'G2', _,
      'A2', _, 'A2', _, 'F2', _, 'G2', _,
      'C3', _, 'C3', _, 'G2', _, 'G2', _,
      'F2', _, 'A2', _, 'G2', _, 'G2', _,
    ],
  },
  room: {
    bpm: 76,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.05,
    bassGain: 0.055,
    sparkle: true,
    lead: [
      'F4', _, 'A4', _, 'C5', _, 'A4', _,
      'G4', _, 'A4', _, 'D5', _, 'C5', _,
      'A4', _, 'C5', _, 'D5', _, 'F5', _,
      'D5', _, 'C5', _, 'A4', _, _, _,
    ],
    bass: [
      'F2', _, _, _, 'C3', _, _, _,
      'G2', _, _, _, 'D3', _, _, _,
      'F2', _, _, _, 'A2', _, _, _,
      'G2', _, _, _, 'C3', _, _, _,
    ],
  },
  finale: {
    bpm: 88,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.055,
    bassGain: 0.06,
    sparkle: true,
    lead: [
      'A4', _, 'B4', _, 'C5', _, 'E5', _,
      'D5', _, 'C5', _, 'A4', _, _, _,
      'G4', _, 'A4', _, 'C5', _, 'F5', _,
      'E5', _, 'D5', _, 'C5', _, _, _,
    ],
    bass: [
      'A2', _, _, _, 'E3', _, _, _,
      'F2', _, _, _, 'C3', _, _, _,
      'C3', _, _, _, 'G2', _, _, _,
      'A2', _, _, _, 'E3', _, _, _,
    ],
  },
};

const STEP_DUR_MULTIPLIER = 2; // 8th notes: step = (60/bpm)/2

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private track: TrackName | null = null;
  private step = 0;
  private nextStepTime = 0;
  private muted = false;
  private pendingTrack: TrackName | null = null;

  get ready(): boolean {
    return this.ctx !== null;
  }

  /** Must be called from a user gesture. Idempotent. */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);

      /* dreamy feedback delay on the music bus */
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 1;
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.28;
      const fb = ctx.createGain();
      fb.gain.value = 0.22;
      const wet = ctx.createGain();
      wet.gain.value = 0.16;
      this.musicBus.connect(this.master);
      this.musicBus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(this.master);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);

      if (this.pendingTrack) {
        const t = this.pendingTrack;
        this.pendingTrack = null;
        this.playTrack(t);
      }
    } catch {
      /* audio unavailable — game stays silent, still playable */
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  /* ------------------------------------------------------------ music */
  playTrack(name: TrackName): void {
    if (!this.ctx || !this.musicBus) {
      this.pendingTrack = name;
      return;
    }
    if (this.track === name && this.schedulerId !== null) return;
    this.track = name;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    if (this.schedulerId === null) {
      this.schedulerId = setInterval(() => this.schedule(), 60);
    }
  }

  stopMusic(): void {
    this.track = null;
    this.pendingTrack = null;
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.track || !this.musicBus) return;
    const def = TRACKS[this.track];
    const stepDur = 60 / def.bpm / STEP_DUR_MULTIPLIER;
    while (this.nextStepTime < this.ctx.currentTime + 0.25) {
      const i = this.step % def.lead.length;
      const leadNote = def.lead[i];
      const bassNote = def.bass[i % def.bass.length];
      if (leadNote) this.voice(noteFreq(leadNote), this.nextStepTime, stepDur * 0.92, def.leadWave, def.leadGain, this.musicBus);
      if (bassNote) this.voice(noteFreq(bassNote), this.nextStepTime, stepDur * 1.7, def.bassWave, def.bassGain, this.musicBus);
      if (def.sparkle && i % 8 === 4) {
        this.voice(noteFreq('C7'), this.nextStepTime, 0.09, 'sine', 0.012, this.musicBus);
      }
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  private voice(
    freq: number,
    when: number,
    dur: number,
    wave: OscillatorType,
    gain: number,
    bus: GainNode,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  /* -------------------------------------------------------------- sfx */
  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'click':
        this.blip(520, t, 0.07, 'square', 0.06, 380);
        break;
      case 'hover':
        this.blip(880, t, 0.04, 'sine', 0.02);
        break;
      case 'collect':
        this.blip(660, t, 0.09, 'sine', 0.09);
        this.blip(880, t + 0.07, 0.09, 'sine', 0.09);
        this.blip(1320, t + 0.14, 0.16, 'sine', 0.08);
        this.blip(1760, t + 0.2, 0.22, 'triangle', 0.05);
        break;
      case 'golden':
        this.blip(988, t, 0.1, 'triangle', 0.09);
        this.blip(1319, t + 0.08, 0.1, 'triangle', 0.09);
        this.blip(1760, t + 0.16, 0.2, 'triangle', 0.09);
        this.blip(2637, t + 0.24, 0.3, 'sine', 0.06);
        break;
      case 'pop':
        this.noise(t, 0.09, 0.16, 1800);
        this.blip(320, t, 0.06, 'square', 0.05, 90);
        break;
      case 'catch':
        this.blip(784, t, 0.08, 'triangle', 0.08);
        this.blip(1175, t + 0.06, 0.12, 'triangle', 0.07);
        break;
      case 'miss':
        this.blip(220, t, 0.14, 'sawtooth', 0.035, 110);
        break;
      case 'jump':
        this.blip(300, t, 0.12, 'square', 0.04, 620);
        break;
      case 'portal':
        this.blip(180, t, 0.7, 'sine', 0.08, 950);
        this.blip(240, t + 0.1, 0.6, 'triangle', 0.05, 1200);
        this.noise(t + 0.1, 0.5, 0.03, 4000);
        break;
      case 'blow':
        this.noise(t, 0.45, 0.12, 900, 200);
        break;
      case 'wish':
        this.blip(523, t, 0.18, 'sine', 0.07);
        this.blip(659, t + 0.15, 0.18, 'sine', 0.07);
        this.blip(784, t + 0.3, 0.24, 'sine', 0.07);
        this.blip(1047, t + 0.45, 0.4, 'sine', 0.08);
        break;
      case 'confetti':
        for (let i = 0; i < 6; i++) {
          this.blip(700 + i * 180 + Math.random() * 120, t + i * 0.045, 0.08, 'triangle', 0.05);
        }
        this.noise(t, 0.5, 0.05, 6000);
        break;
      case 'fanfare':
        {
          const seq: [number, number][] = [
            [523, 0], [659, 0.12], [784, 0.24], [1047, 0.36],
          ];
          seq.forEach(([f, d]) => this.blip(f, t + d, 0.22, 'square', 0.07));
          this.blip(1319, t + 0.52, 0.5, 'square', 0.06);
          this.blip(1047, t + 0.52, 0.5, 'triangle', 0.06);
          this.noise(t + 0.5, 0.6, 0.04, 5000);
        }
        break;
      case 'unlock':
        this.blip(440, t, 0.1, 'triangle', 0.07);
        this.blip(880, t + 0.1, 0.24, 'triangle', 0.07);
        break;
      case 'gift':
        this.blip(392, t, 0.1, 'triangle', 0.07);
        this.blip(523, t + 0.09, 0.1, 'triangle', 0.07);
        this.blip(659, t + 0.18, 0.28, 'triangle', 0.08);
        break;
    }
  }

  private blip(
    freq: number,
    when: number,
    dur: number,
    wave: OscillatorType,
    gain: number,
    slideTo?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), when + dur);
    }
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private noise(
    when: number,
    dur: number,
    gain: number,
    filterFreq: number,
    filterEnd?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, when);
    if (filterEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), when + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(when);
  }
}

/* Module-level singleton. Safe on the client; never touched during SSR. */
export const audio: AudioEngine =
  (globalThis as { __bqAudio?: AudioEngine }).__bqAudio ?? new AudioEngine();
(globalThis as { __bqAudio?: AudioEngine }).__bqAudio = audio;

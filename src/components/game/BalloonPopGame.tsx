'use client';

/* =========================================================================
 *  BalloonPopGame — "Balloon Fiesta" mini-game.
 *  Pop GOALS.BALLOON_POPS floating balloons over a moonlit meadow.
 *  Every ~6th spawn is a GOLDEN balloon worth 3 pops that trails sparkles.
 *  Scene: night sky, twinkling stars, crescent moon, pixel trees, gift
 *  boxes on the grass, rising ambient embers, confetti pop bursts.
 * ========================================================================= */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { canvasPoint, useGameCanvas, type GameCanvasFrame } from '@/lib/game/canvas';
import { ParticleSystem } from '@/lib/game/particles';
import {
  drawBalloon,
  drawGiftBox,
  drawMoon,
  drawPixelTextCentered,
  drawTree,
  mulberry32,
} from '@/lib/game/sprites';
import { audio } from '@/lib/game/audio';
import { GOALS } from '@/lib/game/config';
import { GameFrame, ResultCard } from '@/components/game/GameFrame';

export interface BalloonResult {
  pops: number;
  golden: number;
  timeSec: number;
}

/* ------------------------------------------------------------- constants */

interface BalloonColor {
  color: string;
  shade: string;
  rgb: [number, number, number];
}

function makeColor(color: string, shade: string): BalloonColor {
  const n = parseInt(color.slice(1), 16);
  const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return { color, shade, rgb };
}

const COLORS: readonly BalloonColor[] = [
  makeColor('#f2a2c0', '#d18396'), // rose
  makeColor('#f7c948', '#c98f1b'), // gold
  makeColor('#a78bfa', '#6d4fc4'), // lavender
  makeColor('#7ee0c3', '#4aa88a'), // mint
  makeColor('#8fb8de', '#5f83b0'), // soft blue
];
const GOLDEN: BalloonColor = makeColor('#f7c948', '#c98f1b');

const EMBER_COLORS: readonly string[] = ['#ffd45e', '#f2a2c0', '#a78bfa', '#7ee0c3'];

const MAX_BALLOONS = 9;
const GOLDEN_EVERY = 6; // every ~6th spawn is golden

/* -------------------------------------------------------------- entities */

interface Balloon {
  s: number; // pixel scale (2 .. 3.5), slower = bigger
  baseX: number; // drift center
  x: number;
  y: number; // bottom anchor of the body
  vy: number; // px/s (negative = rising)
  amp: number; // horizontal drift amplitude
  freq: number; // drift speed (rad/s)
  phase: number;
  ci: number; // index into COLORS
  golden: boolean;
  trailT: number; // sparkle trail accumulator
}

interface Floater {
  x: number;
  y: number;
  text: string; // "+1" / "+3"
  gold: boolean;
  life: number;
  maxLife: number;
}

interface RunState {
  running: boolean;
  completed: boolean;
  time: number;
  pops: number;
  golden: number;
  escapes: number;
  spawnTimer: number;
  sinceGolden: number;
  emberTimer: number;
}

interface StarDef {
  fx: number;
  fy: number;
  size: number;
  big: boolean;
  phase: number;
  speed: number;
  warm: boolean;
}

interface TuftDef {
  fx: number;
  fh: number;
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* Keyframes for the READY? 3-2-1 countdown pop-in. */
const COUNTDOWN_CSS = `
@keyframes bqCdPop {
  0% { transform: scale(2.4); opacity: 0; }
  45% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ================================================================ game == */

export default function BalloonPopGame({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (result: BalloonResult) => void;
}) {
  /* HUD / lifecycle state only — gameplay lives in refs. */
  const [runId, setRunId] = useState(0);
  const [countdown, setCountdown] = useState<string | null>('READY?');
  const [pops, setPops] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<BalloonResult | null>(null);

  const particles = useMemo(() => new ParticleSystem(), []);

  /* Static scenery, precomputed once with a seeded PRNG (resize-safe
     because positions are stored as fractions of the canvas size). */
  const scenery = useMemo(() => {
    const rnd = mulberry32(20251130);
    const stars: StarDef[] = Array.from({ length: 40 }, () => {
      const big = rnd() < 0.22;
      return {
        fx: rnd(),
        fy: rnd(),
        size: big ? 2 : 1,
        big,
        phase: rnd() * Math.PI * 2,
        speed: 0.8 + rnd() * 2.2,
        warm: rnd() < 0.3,
      };
    });
    const tufts: TuftDef[] = Array.from({ length: 16 }, () => ({ fx: rnd(), fh: rnd() }));
    return { stars, tufts };
  }, []);

  const gameRef = useRef<RunState>({
    running: false,
    completed: false,
    time: 0,
    pops: 0,
    golden: 0,
    escapes: 0,
    spawnTimer: 0.4,
    sinceGolden: 2,
    emberTimer: 0.2,
  });
  const balloonsRef = useRef<Balloon[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const latestTRef = useRef(0);
  const lastSecRef = useRef(0);

  /* ---------------------------------------------------------- draw loop */

  const draw = (frame: GameCanvasFrame): void => {
    const { ctx, w, h, dt, t } = frame;
    const g = gameRef.current;
    const balloons = balloonsRef.current;
    const floaters = floatersRef.current;
    latestTRef.current = t;

    /* night sky */
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(1, '#2a1b4e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const gh = Math.max(10, Math.round(h * 0.08));
    const groundY = h - gh;

    /* twinkling stars */
    const skyBottom = groundY - 6;
    for (const st of scenery.stars) {
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * st.speed + st.phase));
      const sx = Math.round(st.fx * w);
      const sy = Math.round(st.fy * skyBottom);
      ctx.fillStyle = st.warm ? `rgba(255,224,168,${tw})` : `rgba(224,232,255,${tw})`;
      ctx.fillRect(sx, sy, st.size, st.size);
      if (st.big && tw > 0.88) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (tw - 0.88) * 3)})`;
        ctx.fillRect(sx - 2, sy + 1, 6, 1);
        ctx.fillRect(sx + 1, sy - 2, 1, 6);
      }
    }

    /* crescent moon, top-right */
    drawMoon(
      ctx,
      Math.round(w * 0.8),
      Math.round(h * 0.17),
      Math.max(7, Math.min(11, Math.round(h * 0.042))),
      t,
    );

    /* grass band with darker tufts */
    ctx.fillStyle = '#1e4d3d';
    ctx.fillRect(0, groundY, w, gh);
    ctx.fillStyle = '#2a6b4c';
    ctx.fillRect(0, groundY, w, 1);
    ctx.fillStyle = '#16402f';
    for (const tf of scenery.tufts) {
      const tx = 2 + Math.round(tf.fx * (w - 4));
      const th = 2 + Math.round(tf.fh * 3);
      ctx.fillRect(tx, groundY - th, 2, th + 1);
    }

    /* pixel trees on the sides + party gift boxes */
    const ts = Math.max(2, Math.min(3, h / 100));
    drawTree(ctx, Math.max(18, Math.round(w * 0.1)), groundY + 2, ts, 0, t);
    drawTree(ctx, Math.min(w - 18, Math.round(w * 0.9)), groundY + 2, Math.max(1.8, ts * 0.92), 1, t);
    if (w >= 330) drawTree(ctx, Math.round(w * 0.78), groundY + 2, ts * 0.66, 0, t);
    const gs = Math.max(1.1, Math.min(1.7, w / 320));
    drawGiftBox(ctx, Math.round(w * 0.34), groundY + 2, gs, '#e05252', '#a83a3a', '#ffd97a');
    drawGiftBox(ctx, Math.round(w * 0.56), groundY + 2, gs * 0.85, '#8a63d2', '#5f3fa8', '#f2a2c0');

    /* update balloons */
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      b.y += b.vy * dt;
      b.x = b.baseX + Math.sin(t * b.freq + b.phase) * b.amp;
      if (b.y + b.s < -8) {
        balloons.splice(i, 1);
        if (g.running && !g.completed) g.escapes += 1;
        continue;
      }
      if (b.golden) {
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.07;
          particles.ember(
            b.x + (Math.random() - 0.5) * 8,
            b.y - 6 * b.s + Math.random() * 8,
            Math.random() < 0.35 ? '#fff3c0' : '#ffd45e',
          );
        }
      }
    }

    /* spawning (paused during countdown and after the goal) */
    if (g.running && !g.completed) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0 && balloons.length < MAX_BALLOONS) {
        const interval = Math.max(0.8, 1.35 - g.pops * 0.022);
        g.spawnTimer = interval * (0.8 + Math.random() * 0.4);
        g.sinceGolden += 1;
        const golden = g.sinceGolden >= GOLDEN_EVERY;
        if (golden) g.sinceGolden = Math.random() < 0.5 ? 0 : -1;
        const s = 2 + Math.random() * 1.5;
        const amp = 5 + Math.random() * 9;
        const margin = amp + 4 * s + 6;
        const baseX = w - 2 * margin > 8 ? margin + Math.random() * (w - 2 * margin) : w / 2;
        balloons.push({
          s,
          baseX,
          x: baseX,
          y: h + 9 * s + 14,
          vy: -h * (0.085 + (3.5 - s) * 0.05 + Math.random() * 0.02),
          amp,
          freq: 0.5 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2,
          ci: Math.floor(Math.random() * COLORS.length),
          golden,
          trailT: 0,
        });
      }
    }

    /* ambient rising embers */
    g.emberTimer -= dt;
    if (g.emberTimer <= 0) {
      g.emberTimer = 0.3 + Math.random() * 0.5;
      particles.ember(
        w * (0.06 + Math.random() * 0.88),
        groundY - 2 - Math.random() * 22,
        EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
      );
    }

    /* floating score text */
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += dt;
      f.y -= 26 * dt;
      if (f.life >= f.maxLife) floaters.splice(i, 1);
    }

    /* run timer (starts after the countdown, freezes at the goal) */
    if (g.running && !g.completed) {
      g.time += dt;
      const shown = Math.floor(g.time);
      if (shown !== lastSecRef.current) {
        lastSecRef.current = shown;
        setTimeSec(shown);
      }
    }

    /* balloons with a soft color glow */
    for (const b of balloons) {
      const col = b.golden ? GOLDEN : COLORS[b.ci];
      const bob = Math.sin(t * 1.6 + b.phase) * 2.4;
      const cy = b.y + bob - 4.5 * b.s;
      const r = 7.5 * b.s;
      const alpha = b.golden ? 0.24 + 0.1 * Math.sin(t * 5 + b.phase) : 0.15;
      const glow = ctx.createRadialGradient(b.x, cy, 0, b.x, cy, r);
      glow.addColorStop(0, `rgba(${col.rgb[0]},${col.rgb[1]},${col.rgb[2]},${alpha})`);
      glow.addColorStop(1, `rgba(${col.rgb[0]},${col.rgb[1]},${col.rgb[2]},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(b.x - r, cy - r, r * 2, r * 2);
      drawBalloon(ctx, b.x, b.y, b.s, col.color, col.shade, t, b.phase);
    }

    /* particles (confetti, sparkles, embers) */
    particles.update(dt);
    particles.draw(ctx);

    /* rising score text on top */
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.life / f.maxLife);
      const fx = Math.round(f.x);
      const fy = Math.round(f.y);
      drawPixelTextCentered(ctx, f.text, fx + 1, fy + 1, 2, '#140b26');
      drawPixelTextCentered(ctx, f.text, fx, fy, 2, f.gold ? '#ffd97a' : '#fff6e0');
    }
    ctx.globalAlpha = 1;
  };

  const canvasRef = useGameCanvas(draw);

  /* --------------------------------------------------- run lifecycle */

  /* Fresh run: reset all state, then re-trigger the countdown effect. */
  const startRun = (): void => {
    const g = gameRef.current;
    g.running = false;
    g.completed = false;
    g.time = 0;
    g.pops = 0;
    g.golden = 0;
    g.escapes = 0;
    g.sinceGolden = 2;
    g.emberTimer = 0.2;
    balloonsRef.current.length = 0;
    floatersRef.current.length = 0;
    particles.clear();
    lastSecRef.current = 0;
    setPops(0);
    setTimeSec(0);
    setCompleted(false);
    setResult(null);
    setCountdown('READY?');
    setRunId((n) => n + 1);
  };

  /* READY? 3-2-1 POP! countdown; the run timer starts at "POP!". */
  useEffect(() => {
    gameRef.current.spawnTimer = 0.4 + (runId % 3) * 0.12; // slight per-run variation
    const timers: number[] = [];
    const at = (ms: number, fn: () => void): void => {
      timers.push(window.setTimeout(fn, ms));
    };
    at(500, () => setCountdown('3'));
    at(950, () => setCountdown('2'));
    at(1400, () => setCountdown('1'));
    at(1850, () => {
      setCountdown('POP!');
      gameRef.current.running = true;
    });
    at(2350, () => setCountdown(null));
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [runId]);

  /* -------------------------------------------------------- popping */

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    audio.init(); // idempotent; first tap unlocks SFX
    const g = gameRef.current;
    if (!g.running || g.completed) return;
    const { x, y } = canvasPoint(canvas, e.clientX, e.clientY);

    /* frontmost (last drawn) balloon wins */
    const balloons = balloonsRef.current;
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      const bob = Math.sin(latestTRef.current * 1.6 + b.phase) * 2.4;
      const top = b.y + bob - 9 * b.s - 4;
      const bottom = b.y + bob + b.s + 8;
      const halfW = 4 * b.s + 4; // body half-width + generous slack
      if (x < b.x - halfW || x > b.x + halfW || y < top || y > bottom) continue;

      balloons.splice(i, 1);
      const px = b.x;
      const py = b.y + bob - 4.5 * b.s;
      particles.confetti(px, py, 18);
      if (b.golden) {
        g.golden += 1;
        particles.sparkle(px, py, 12);
        audio.sfx('golden');
      } else {
        audio.sfx('pop');
      }
      g.pops += b.golden ? 3 : 1;
      floatersRef.current.push({
        x: px,
        y: py - 6,
        text: b.golden ? '+3' : '+1',
        gold: b.golden,
        life: 0,
        maxLife: 0.9,
      });
      setPops(g.pops);

      if (g.pops >= GOALS.BALLOON_POPS && !g.completed) {
        g.completed = true; // guard: exactly once per completed run
        const finalResult: BalloonResult = {
          pops: g.pops,
          golden: g.golden,
          timeSec: Math.round(g.time * 10) / 10,
        };
        setResult(finalResult);
        setCompleted(true);
        onComplete(finalResult);
      }
      return;
    }

    /* whiff — a small dust puff so misses still feel responsive */
    particles.dust(x, y, 3);
  };

  /* ----------------------------------------------------------- view */

  return (
    <GameFrame
      title="BALLOON FIESTA"
      hint="TAP THE BALLOONS BEFORE THEY FLOAT AWAY"
      onBack={onBack}
      hud={
        <div className="mt-1 flex items-center justify-center gap-3 font-pixel text-[8px] tracking-widest text-[#ffd97a]">
          <span>
            POPS {Math.min(pops, GOALS.BALLOON_POPS)}/{GOALS.BALLOON_POPS}
          </span>
          <span aria-hidden="true" className="text-[#ffd97a]/40">
            |
          </span>
          <span>TIME {formatTime(timeSec)}</span>
        </div>
      }
    >
      <style>{COUNTDOWN_CSS}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 h-full w-full touch-none select-none"
      />

      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            key={countdown}
            className="animate-[bqCdPop_0.42s_ease-out_both] font-pixel text-4xl tracking-widest text-[#ffd97a] drop-shadow-[0_0_18px_rgba(247,201,72,0.85)] sm:text-5xl"
          >
            {countdown}
          </div>
        </div>
      )}

      {completed && result && (
        <ResultCard
          title="FIESTA COMPLETE!"
          lines={[
            `Balloons popped: ${result.pops}`,
            `Golden pops: ${result.golden}`,
            `Time: ${result.timeSec} sec`,
          ]}
          onReplay={startRun}
          onExit={onBack}
        />
      )}
    </GameFrame>
  );
}

'use client';

/* =========================================================================
 *  GiftCatchGame — "Gift Cascade"
 *  Catch falling birthday gifts with a woven basket under a night sky.
 *  Every 5th gift is golden (worth 2). Reach GOALS.GIFTS_CATCH to win.
 * ========================================================================= */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GOALS } from '@/lib/game/config';
import { audio } from '@/lib/game/audio';
import { ParticleSystem } from '@/lib/game/particles';
import {
  drawGarland,
  drawGiftBox,
  drawMoon,
  drawPixelTextCentered,
  drawTree,
  mulberry32,
} from '@/lib/game/sprites';
import {
  canvasPoint,
  useGameCanvas,
  useIsTouch,
  useKeys,
  type GameCanvasFrame,
} from '@/lib/game/canvas';
import { GameFrame, ResultCard } from '@/components/game/GameFrame';
import { TouchControls } from '@/components/game/TouchControls';

/* ------------------------------------------------------------- contract */

export interface GiftResult {
  caught: number;
  misses: number;
  timeSec: number;
}

/* ------------------------------------------------------------- tuning */

type Phase = 'countdown' | 'playing' | 'won';

const GROUND_H = 14; // ground band height (logical px)
const GIFT_S = 2; // gift pixel scale (box is 12*s wide, 13*s tall)
const B_S = 2; // basket pixel scale
const B_TOP_W = 34 * B_S; // basket rim width
const B_BOT_W = 26 * B_S; // basket base width
const B_ROWS = 10; // woven body rows
const B_HALF = B_TOP_W / 2;
const BASKET_SPEED = 300; // logical px/s at 480-wide canvas
const CATCH_MARGIN = 6; // extra px of horizontal forgiveness
const FLOATY_LIFE = 0.95;
const COUNT_TOTAL = 1.9; // READY? 3 2 1 GO!

const GIFT_PALETTES = [
  ['#e05252', '#a83a3a'], // red
  ['#5eead4', '#2c6b5a'], // teal
  ['#a78bfa', '#6d4fc4'], // purple
] as const;
const GOLD_PALETTE = ['#e8b64c', '#b9822a'] as const;
const RIBBON = '#fff1c4';

/* ------------------------------------------------------------- types */

type Palette = readonly [string, string];

interface Gift {
  bx: number; // sway center (x)
  cx: number; // current center x
  py: number; // previous bottom y
  y: number; // bottom y
  vy: number;
  amp: number;
  swaySpeed: number;
  phase: number;
  t: number;
  trailT: number;
  golden: boolean;
  palette: Palette;
}

interface Floaty {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Basket {
  x: number; // center x (-1 = unset, snaps to center)
  tilt: number;
  flash: number;
  dragging: boolean;
  dragX: number | null;
}

interface RunState {
  phase: Phase;
  countdownT: number;
  time: number;
  caught: number;
  misses: number;
  spawnT: number;
  spawned: number;
  gifts: Gift[];
  floaties: Floaty[];
  basket: Basket;
}

interface Star {
  nx: number;
  ny: number;
  size: number;
  speed: number;
  phase: number;
  color: string;
}

interface Flake {
  nx: number;
  y: number;
  vy: number;
  drift: number;
  phase: number;
  alpha: number;
}

interface Tuft {
  nx: number;
  h: number;
}

interface Scene {
  stars: Star[];
  flakes: Flake[];
  tufts: Tuft[];
}

interface HudState {
  caught: number;
  misses: number;
  time: number;
}

/* ------------------------------------------------------------- helpers */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function countLabelFor(ct: number): string {
  if (ct < 0.4) return 'READY?';
  if (ct < 0.8) return '3';
  if (ct < 1.2) return '2';
  if (ct < 1.6) return '1';
  return 'GO!';
}

function createRunState(): RunState {
  return {
    phase: 'countdown',
    countdownT: 0,
    time: 0,
    caught: 0,
    misses: 0,
    spawnT: 0,
    spawned: 0,
    gifts: [],
    floaties: [],
    basket: { x: -1, tilt: 0, flash: 0, dragging: false, dragX: null },
  };
}

function buildScene(): Scene {
  const rnd = mulberry32(20241201);
  const starColors = ['#ffffff', '#cfd8ff', '#ffe9c4', '#a8c8ff'];
  const stars: Star[] = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      nx: rnd(),
      ny: rnd() * 0.72,
      size: rnd() < 0.2 ? 2 : 1,
      speed: 0.6 + rnd() * 2.2,
      phase: rnd() * Math.PI * 2,
      color: starColors[Math.floor(rnd() * starColors.length)],
    });
  }
  const flakes: Flake[] = [];
  for (let i = 0; i < 22; i++) {
    flakes.push({
      nx: rnd(),
      y: rnd() * 320,
      vy: 7 + rnd() * 13,
      drift: 0.4 + rnd() * 0.9,
      phase: rnd() * Math.PI * 2,
      alpha: 0.25 + rnd() * 0.45,
    });
  }
  const tufts: Tuft[] = [];
  for (let i = 0; i < 9; i++) {
    tufts.push({ nx: 0.05 + rnd() * 0.9, h: 2 + Math.floor(rnd() * 3) });
  }
  return { stars, flakes, tufts };
}

/* ------------------------------------------------------------ basket art */

function drawBasket(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  tilt: number,
  flash: number,
): void {
  /* soft ground shadow (unrotated) */
  ctx.fillStyle = 'rgba(6, 16, 12, 0.5)';
  ctx.fillRect(cx - B_BOT_W / 2 - 2, baseY - 1, B_BOT_W + 4, 3);

  const pivotY = baseY - 5.5 * B_S;
  ctx.save();
  ctx.translate(cx, pivotY);
  ctx.rotate(tilt);
  ctx.translate(-cx, -pivotY);

  const rimY = baseY - B_ROWS * B_S;

  /* side handles behind the rim */
  ctx.fillStyle = '#6b4426';
  ctx.fillRect(cx - B_HALF - 5, rimY - 2, 6, 3);
  ctx.fillRect(cx + B_HALF - 1, rimY - 2, 6, 3);

  /* woven trapezoid body */
  for (let r = 0; r < B_ROWS; r++) {
    const p = r / (B_ROWS - 1);
    const rowW = B_TOP_W + (B_BOT_W - B_TOP_W) * p;
    const x0 = cx - rowW / 2;
    const y0 = baseY - (B_ROWS - r) * B_S;
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(x0, y0, rowW, B_S);
    /* dark weave segments, offset every other row */
    ctx.fillStyle = '#6b4426';
    const seg = 3 * B_S;
    const off = (r % 2) * seg;
    for (let sx = x0 + off; sx < x0 + rowW; sx += seg * 2) {
      ctx.fillRect(sx, y0, Math.min(seg, x0 + rowW - sx), B_S);
    }
    /* lighter weave highlight rows */
    if (r % 2 === 0) {
      ctx.fillStyle = '#a5713f';
      ctx.fillRect(x0 + 1, y0, Math.max(0, rowW - 2), 1);
    }
  }

  /* golden trim on the rim */
  ctx.fillStyle = '#b9822a';
  ctx.fillRect(cx - B_HALF - 2, rimY - 2, B_TOP_W + 4, 3);
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(cx - B_HALF - 2, rimY - 2, B_TOP_W + 4, 1);

  /* golden caps on the handles */
  ctx.fillStyle = '#ffd45e';
  ctx.fillRect(cx - B_HALF - 5, rimY - 2, 2, 3);
  ctx.fillRect(cx + B_HALF + 3, rimY - 2, 2, 3);

  /* catch flash */
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash / 0.2) * 0.85;
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(cx - B_HALF - 2, rimY - 2, B_TOP_W + 4, 3);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* ------------------------------------------------------------ movement */

function updateBasket(
  run: RunState,
  dt: number,
  w: number,
  joyX: number,
  keysDown: Set<string>,
): void {
  const st = run.basket;
  if (st.x < 0) st.x = w / 2;

  let vx = 0;
  if (run.phase !== 'countdown') {
    if (st.dragging && st.dragX !== null) {
      const target = clamp(st.dragX, B_HALF + 6, w - B_HALF - 6);
      const nx = st.x + (target - st.x) * Math.min(1, dt * 22);
      vx = (nx - st.x) / Math.max(dt, 1e-4);
      st.x = nx;
    } else {
      const speed = BASKET_SPEED * clamp(w / 480, 0.75, 1.2);
      let dir = 0;
      if (keysDown.has('arrowleft') || keysDown.has('a')) dir -= 1;
      if (keysDown.has('arrowright') || keysDown.has('d')) dir += 1;
      if (dir !== 0) {
        vx = dir * speed;
      } else if (joyX !== 0) {
        vx = joyX * speed;
      }
      st.x += vx * dt;
    }
  }

  st.x = clamp(st.x, B_HALF + 6, w - B_HALF - 6);
  const tiltTarget = clamp(vx / 340, -1, 1) * 0.12;
  st.tilt += (tiltTarget - st.tilt) * Math.min(1, dt * 12);
}

/* ------------------------------------------------------------ keyframes */

const GCG_KEYFRAMES = `
@keyframes gcgPop {
  0% { transform: scale(2.1); opacity: 0; }
  60% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ============================================================ component */

/* Precomputed ambient scene + particle system. Module-level singletons:
   pure data built from a seeded PRNG, safe to create during SSR. */
const SCENE = buildScene();
const particles = new ParticleSystem();

export default function GiftCatchGame({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (result: GiftResult) => void;
}) {
  const [hud, setHud] = useState<HudState>({ caught: 0, misses: 0, time: 0 });
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countLabel, setCountLabel] = useState<string>('READY?');
  const [result, setResult] = useState<GiftResult | null>(null);

  const runRef = useRef<RunState>(createRunState());

  const hudRef = useRef<HudState>(hud);
  const lastLabelRef = useRef<string>('READY?');
  const completedRef = useRef(false);
  const joyRef = useRef({ x: 0 });

  const keysRef = useKeys();
  const isTouch = useIsTouch();

  /* ------------------------------------------------------- game loop */

  const draw = (frame: GameCanvasFrame): void => {
    const { ctx, w, h, dt, t } = frame;
    const scene = SCENE;
    const run = runRef.current;
    const groundY = h - GROUND_H;

    /* --- countdown (timer + spawning start after GO) --- */
    if (run.phase === 'countdown') {
      run.countdownT += dt;
      const label = countLabelFor(run.countdownT);
      if (label !== lastLabelRef.current) {
        lastLabelRef.current = label;
        setCountLabel(label);
      }
      if (run.countdownT >= COUNT_TOTAL) {
        run.phase = 'playing';
        run.spawnT = 0.45;
        setPhase('playing');
      }
    }

    if (run.phase === 'playing') run.time += dt;

    /* --- basket movement --- */
    updateBasket(run, dt, w, joyRef.current.x, keysRef.current.down);

    /* --- spawning --- */
    if (run.phase === 'playing') {
      run.spawnT -= dt;
      if (run.spawnT <= 0) {
        const prog = Math.min(1, run.caught / GOALS.GIFTS_CATCH);
        run.spawnT += 0.9 - 0.35 * prog;
        run.spawned += 1;
        const hFactor = clamp(h / 280, 0.85, 1.5);
        const golden = run.spawned % 5 === 0;
        const bx = 24 + Math.random() * Math.max(10, w - 48);
        run.gifts.push({
          bx,
          cx: bx,
          py: -18,
          y: -18,
          vy: (60 + 90 * prog) * hFactor + Math.random() * 16,
          amp: 5 + Math.random() * 8,
          swaySpeed: 1.1 + Math.random() * 1.3,
          phase: Math.random() * Math.PI * 2,
          t: 0,
          trailT: 0,
          golden,
          palette: golden
            ? GOLD_PALETTE
            : GIFT_PALETTES[Math.floor(Math.random() * GIFT_PALETTES.length)],
        });
      }
    }

    /* --- gifts: fall, sway, catch, miss --- */
    const rimTop = groundY - B_ROWS * B_S - 2;
    const gifts = run.gifts;
    for (let i = gifts.length - 1; i >= 0; i--) {
      const g = gifts[i];
      g.t += dt;
      g.py = g.y;
      g.y += g.vy * dt;
      g.cx = g.bx + Math.sin(g.phase + g.t * g.swaySpeed) * g.amp;

      if (g.golden) {
        g.trailT += dt;
        if (g.trailT >= 0.09) {
          g.trailT = 0;
          particles.sparkle(g.cx + (Math.random() - 0.5) * 8, g.y - 5, 2, '#ffe9a8');
        }
      }

      const inBand = g.y >= rimTop - 1 && g.y <= rimTop + 10;
      const crossedRim = g.py <= rimTop + 2 && g.y > rimTop - 1;
      if (
        run.phase === 'playing' &&
        (inBand || crossedRim) &&
        Math.abs(g.cx - run.basket.x) < B_HALF + CATCH_MARGIN
      ) {
        gifts.splice(i, 1);
        run.caught += g.golden ? 2 : 1;
        run.basket.flash = 0.2;
        particles.sparkle(g.cx, rimTop + 2, g.golden ? 24 : 14, g.golden ? '#ffe9a8' : '#ffd45e');
        run.floaties.push({
          x: g.cx,
          y: rimTop - 10,
          text: g.golden ? '+2' : '+1',
          color: g.golden ? '#ffd97a' : '#fff1c4',
          life: 0,
        });
        audio.sfx(g.golden ? 'golden' : 'catch');
        continue;
      }

      if (g.y >= groundY - 1) {
        gifts.splice(i, 1);
        particles.dust(g.cx, groundY - 2, 7);
        if (run.phase === 'playing') {
          run.misses += 1;
          run.floaties.push({ x: g.cx, y: groundY - 26, text: 'MISS', color: '#9aa3b2', life: 0 });
          audio.sfx('miss');
        }
      }
    }

    /* --- floating texts --- */
    const floaties = run.floaties;
    for (let i = floaties.length - 1; i >= 0; i--) {
      const f = floaties[i];
      f.life += dt;
      f.y -= 26 * dt;
      if (f.life >= FLOATY_LIFE) floaties.splice(i, 1);
    }

    run.basket.flash = Math.max(0, run.basket.flash - dt);
    particles.update(dt);

    /* --- win check (fires exactly once) --- */
    if (run.phase === 'playing' && run.caught >= GOALS.GIFTS_CATCH) {
      run.phase = 'won';
      const finalResult: GiftResult = {
        caught: run.caught,
        misses: run.misses,
        timeSec: Math.round(run.time * 10) / 10,
      };
      setResult(finalResult);
      setPhase('won');
      particles.confetti(run.basket.x, groundY - 46, 60, 1.1);
      audio.sfx('fanfare');
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete(finalResult);
      }
    }

    /* --- HUD sync (only on change) --- */
    const timeInt = Math.floor(run.time);
    const prevHud = hudRef.current;
    if (run.caught !== prevHud.caught || run.misses !== prevHud.misses || timeInt !== prevHud.time) {
      const nextHud: HudState = { caught: run.caught, misses: run.misses, time: timeInt };
      hudRef.current = nextHud;
      setHud(nextHud);
    }

    /* ============================ RENDER ============================ */

    /* night sky gradient */
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(0.55, '#1c1440');
    sky.addColorStop(1, '#2a1b4e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* twinkling stars */
    for (const s of scene.stars) {
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.nx * w), Math.round(s.ny * h), s.size, s.size);
    }
    ctx.globalAlpha = 1;

    /* moon, garland, trees */
    drawMoon(ctx, Math.max(30, w * 0.12), 34, 9, t);
    drawGarland(ctx, 16, 46, w - 16, 42, t);
    drawTree(ctx, 16, groundY, 2, 0, t);
    drawTree(ctx, w - 16, groundY, 2, 1, t);

    /* ground band + grass tufts */
    ctx.fillStyle = '#1e4d3d';
    ctx.fillRect(0, groundY, w, GROUND_H);
    ctx.fillStyle = '#153a2e';
    ctx.fillRect(0, groundY, w, 2);
    for (const tf of scene.tufts) {
      const gx = Math.round(tf.nx * w);
      ctx.fillStyle = '#2f7a55';
      ctx.fillRect(gx, groundY - tf.h, 1, tf.h);
      ctx.fillRect(gx + 2, groundY - tf.h + 1, 1, Math.max(1, tf.h - 1));
      ctx.fillStyle = '#49a370';
      ctx.fillRect(gx + 1, groundY - tf.h - 1, 1, tf.h + 1);
    }

    /* ambient drifting dust */
    for (const f of scene.flakes) {
      f.y += f.vy * dt;
      f.phase += f.drift * dt;
      if (f.y > groundY) {
        f.y = -2;
        f.nx = Math.random();
      }
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = '#dfe6ff';
      ctx.fillRect(Math.round(f.nx * w + Math.sin(f.phase) * 5), Math.round(f.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    /* gifts (golden ones get a pulsing glow) */
    for (const g of run.gifts) {
      if (g.golden) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 5 + g.phase);
        const gy = g.y - 7 * GIFT_S;
        const r = 19 * GIFT_S;
        const glow = ctx.createRadialGradient(g.cx, gy, 0, g.cx, gy, r);
        glow.addColorStop(0, `rgba(255, 214, 120, ${(0.26 + pulse * 0.16).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(g.cx - r, gy - r, r * 2, r * 2);
      }
      const [box, shade] = g.palette;
      drawGiftBox(ctx, g.cx - 6 * GIFT_S, g.y, GIFT_S, box, shade, RIBBON);
    }

    /* basket on top so gifts slip in behind the rim */
    drawBasket(ctx, run.basket.x, groundY, run.basket.tilt, run.basket.flash);

    /* particles */
    particles.draw(ctx);

    /* floating +1 / +2 / MISS texts */
    for (const f of run.floaties) {
      const a = f.life / FLOATY_LIFE;
      ctx.globalAlpha = a > 0.65 ? Math.max(0, 1 - (a - 0.65) / 0.35) : 1;
      drawPixelTextCentered(ctx, f.text, f.x + 1, f.y + 1, 2, 'rgba(8, 10, 24, 0.75)');
      drawPixelTextCentered(ctx, f.text, f.x, f.y, 2, f.color);
    }
    ctx.globalAlpha = 1;
  };

  const canvasRef = useGameCanvas(draw);

  /* ------------------------------------------------------- pointer drag */

  const startDrag = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas || e.target !== canvas) return;
    if (runRef.current.phase === 'won') return;
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(canvas, e.clientX, e.clientY);
    runRef.current.basket.dragging = true;
    runRef.current.basket.dragX = p.x;
  };

  const moveDrag = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    const run = runRef.current;
    if (!run.basket.dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = canvasPoint(canvas, e.clientX, e.clientY);
    run.basket.dragX = p.x;
  };

  const endDrag = (): void => {
    const run = runRef.current;
    run.basket.dragging = false;
    run.basket.dragX = null;
  };

  /* ------------------------------------------------------------- replay */

  const resetRun = (): void => {
    const run = runRef.current;
    run.phase = 'countdown';
    run.countdownT = 0;
    run.time = 0;
    run.caught = 0;
    run.misses = 0;
    run.spawnT = 0;
    run.spawned = 0;
    run.gifts.length = 0;
    run.floaties.length = 0;
    run.basket.dragging = false;
    run.basket.dragX = null;
    run.basket.flash = 0;
    particles.clear();
    completedRef.current = false;
    lastLabelRef.current = 'READY?';
    const freshHud: HudState = { caught: 0, misses: 0, time: 0 };
    hudRef.current = freshHud;
    setHud(freshHud);
    setPhase('countdown');
    setCountLabel('READY?');
    setResult(null);
  };

  /* -------------------------------------------------------------- render */

  const hudNode = (
    <div className="mt-1 flex items-center justify-center gap-2 font-pixel text-[8px] tracking-wider sm:gap-4">
      <span className="text-[#ffd97a]">
        CAUGHT {hud.caught}/{GOALS.GIFTS_CATCH}
      </span>
      <span className="text-white/80">MISS {hud.misses}</span>
      <span className="text-white/60">TIME {formatTime(hud.time)}</span>
    </div>
  );

  return (
    <GameFrame
      title="GIFT CASCADE"
      hint={isTouch ? 'DRAG OR JOYSTICK TO MOVE THE BASKET' : 'ARROWS / A D / DRAG TO MOVE THE BASKET'}
      hud={hudNode}
      onBack={onBack}
    >
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full touch-none select-none"
          style={{ imageRendering: 'pixelated' }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />

        {/* virtual joystick, above the canvas layer */}
        {isTouch && phase !== 'won' && (
          <TouchControls mode="joystick" onVector={(x) => { joyRef.current.x = x; }} />
        )}

        {/* READY? 3-2-1-GO! */}
        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span
              key={countLabel}
              style={{ animation: 'gcgPop 0.32s ease-out both' }}
              className="font-pixel text-3xl tracking-widest text-[#ffd97a] drop-shadow-[0_0_16px_rgba(247,201,72,0.85)] sm:text-4xl"
            >
              {countLabel}
            </span>
          </div>
        )}

        {/* victory */}
        {phase === 'won' && result && (
          <ResultCard
            title="ALL GIFTS CAUGHT!"
            lines={[
              `Gifts caught: ${result.caught} (golden bonus included)`,
              `Misses: ${result.misses}`,
              `Time: ${result.timeSec} sec`,
            ]}
            onReplay={resetRun}
            onExit={onBack}
          />
        )}

        <style>{GCG_KEYFRAMES}</style>
      </div>
    </GameFrame>
  );
}

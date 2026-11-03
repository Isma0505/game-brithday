'use client';

/* =========================================================================
 *  StarTrailGame — THE MAIN QUEST.
 *  Explore the enchanted night forest, gather the 5 magical stars and
 *  awaken the Golden Portal that leads to the birthday room.
 * ========================================================================= */

import { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { audio } from '@/lib/game/audio';
import { canvasPoint, useGameCanvas, useIsTouch, useKeys } from '@/lib/game/canvas';
import { ParticleSystem } from '@/lib/game/particles';
import {
  drawCastle, drawGarland, drawLamp, drawMagicStar, drawMoon, drawMountainRange,
  drawPortal, drawSprite, drawTree, getCharacter, mulberry32, spriteScaleFor,
} from '@/lib/game/sprites';
import { GameFrame } from './GameFrame';
import { TouchControls } from './TouchControls';

export interface StarTrailGameProps {
  characterId: string;
  collectedIds: string[];
  onStarCollect: (id: string) => void;
  onEnterPortal: () => void;
  onBack: () => void;
}

/* ---------------------------------------------------------------- layout */

const WORLD_W = 2300;

interface Platform { x: number; yOff: number; w: number }
const PLATFORMS: Platform[] = [
  { x: 540, yOff: 46, w: 90 },
  { x: 700, yOff: 88, w: 80 },
  { x: 850, yOff: 40, w: 90 },
  { x: 1180, yOff: 54, w: 90 },
  { x: 1350, yOff: 100, w: 80 },
  { x: 1560, yOff: 60, w: 90 },
  { x: 1730, yOff: 112, w: 80 },
];

interface StarSpot { id: string; x: number; yOff: number }
const STAR_SPOTS: StarSpot[] = [
  { id: 's0', x: 300, yOff: 34 },
  { id: 's1', x: 585, yOff: 46 + 30 },
  { id: 's2', x: 1000, yOff: 34 },
  { id: 's3', x: 1390, yOff: 100 + 30 },
  { id: 's4', x: 1770, yOff: 112 + 30 },
];

const PORTAL_X = 2050;

/* ------------------------------------------------------------------ game */

export function StarTrailGame({
  characterId, collectedIds, onStarCollect, onEnterPortal, onBack,
}: StarTrailGameProps) {
  const isTouch = useIsTouch();
  const keys = useKeys();
  const [collected, setCollected] = useState<string[]>(collectedIds);
  const [portalOpen, setPortalOpen] = useState(collectedIds.length >= STAR_SPOTS.length);
  const enteredRef = useRef(false);

  const char = getCharacter(characterId);

  /* persistent game state */
  const G = useRef({
    camX: 0,
    px: 60,
    py: 0,            /* feet y, set on first frame */
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    coyote: 0,
    jumpBuffer: 0,
    landSquash: 0,
    blinkAt: 2.5,
    blinkLeft: 0,
    dustTimer: 0,
    portalAppear: 0,
    touchVX: 0,
    touchJump: false,
  });
  const particlesRef = useRef<ParticleSystem | null>(null);
  if (particlesRef.current == null) particlesRef.current = new ParticleSystem();
  const decorRef = useRef<{
    trees: { x: number; v: 0 | 1; s: number }[];
    lamps: number[];
    garlands: { a: number; b: number; h: number }[];
    tiedBalloons: { x: number; color: [string, string] }[];
    presents: { x: number; c: [string, string, string] }[];
    tufts: { x: number; kind: number }[];
    fireflies: { x: number; y: number; phase: number; speed: number }[];
  } | null>(null);
  if (decorRef.current == null) {
    const rnd = mulberry32(777);
    const trees: { x: number; v: 0 | 1; s: number }[] = [];
    const lamps: number[] = [];
    const tufts: { x: number; kind: number }[] = [];
    for (let x = 40; x < WORLD_W - 40; x += 90 + rnd() * 130) {
      trees.push({ x, v: (rnd() < 0.42 ? 1 : 0) as 0 | 1, s: 1 + rnd() * 0.5 });
    }
    for (let x = 180; x < WORLD_W - 60; x += 340 + rnd() * 260) lamps.push(Math.round(x));
    for (let x = 0; x < WORLD_W; x += 14 + rnd() * 26) {
      tufts.push({ x, kind: rnd() < 0.12 ? 1 : rnd() < 0.2 ? 2 : 0 });
    }
    /* garlands between nearby tree pairs */
    const garlands: { a: number; b: number; h: number }[] = [];
    for (let i = 0; i < trees.length - 1; i++) {
      if (trees[i + 1].x - trees[i].x < 175 && rnd() < 0.75) {
        garlands.push({ a: trees[i].x, b: trees[i + 1].x, h: 40 + rnd() * 16 });
      }
    }
    const balloonColors: [string, string][] = [
      ['#f2a2c0', '#d18396'], ['#f7c948', '#c98f1b'], ['#a78bfa', '#6d4fc4'], ['#7ee0c3', '#4aa88a'],
    ];
    const tiedBalloons = lamps.slice(0, 4).map((x, i) => ({ x: x + 10, color: balloonColors[i % 4] }));
    const presentColors: [string, string, string][] = [
      ['#e05252', '#a83a3a', '#fff1c4'], ['#5ec8b0', '#3a8f7a', '#fff1c4'], ['#a78bfa', '#6d4fc4', '#ffd97a'],
    ];
    const presents: { x: number; c: [string, string, string] }[] = [];
    for (let i = 0; i < 5; i++) {
      presents.push({ x: PORTAL_X + 60 + i * 26 + rnd() * 10, c: presentColors[i % 3] });
    }
    const fireflies = Array.from({ length: 30 }, () => ({
      x: rnd() * WORLD_W,
      y: 30 + rnd() * 150,
      phase: rnd() * Math.PI * 2,
      speed: 0.5 + rnd() * 1.4,
    }));
    decorRef.current = { trees, lamps, garlands, tiedBalloons, presents, tufts, fireflies };
  }

  const canvasRef = useGameCanvas(({ ctx, w, h, dt, t }) => {
    const g = G.current;
    const unit = h / 240;
    const groundY = h - 36 * unit;
    const s = spriteScaleFor(h);
    const pw = 12 * s;
    const ph = 16 * s;
    const particles = particlesRef.current!;

    if (g.py === 0) g.py = groundY;

    /* ---------------------------------------------------------- input */
    const k = keys.current.down;
    let move = 0;
    if (k.has('arrowleft') || k.has('a')) move -= 1;
    if (k.has('arrowright') || k.has('d')) move += 1;
    if (Math.abs(g.touchVX) > 0.15) move = g.touchVX;
    if (keys.current.consumePressed('arrowup') || keys.current.consumePressed('w') || keys.current.consumePressed(' ')) {
      g.jumpBuffer = 0.14;
    }
    if (g.touchJump) {
      g.jumpBuffer = 0.14;
      g.touchJump = false;
    }

    /* ------------------------------------------------------- physics */
    const MOVE = 160 * unit;
    const ACCEL = 900 * unit;
    const FRICTION = 1100 * unit;
    const GRAVITY = 900 * unit;
    const JUMP_V = 330 * unit;

    if (move !== 0) {
      g.vx += move * ACCEL * dt;
      g.facing = move > 0 ? 1 : -1;
    } else {
      const f = FRICTION * dt;
      if (Math.abs(g.vx) <= f) g.vx = 0;
      else g.vx -= Math.sign(g.vx) * f;
    }
    g.vx = Math.max(-MOVE, Math.min(MOVE, g.vx));

    g.vy += GRAVITY * dt;
    const prevBottom = g.py;
    g.py += g.vy * dt;
    g.px += g.vx * dt;
    g.px = Math.max(pw / 2 + 6, Math.min(WORLD_W - pw / 2 - 6, g.px));

    /* ground + one-way platforms */
    let landed = false;
    const wasGround = g.onGround;
    if (g.py >= groundY) { g.py = groundY; g.vy = 0; landed = true; }
    else {
      for (const p of PLATFORMS) {
        const topY = groundY - p.yOff * unit;
        const withinX = g.px + pw * 0.3 > p.x && g.px - pw * 0.3 < p.x + p.w;
        if (g.vy > 0 && withinX && prevBottom <= topY + 2 && g.py >= topY) {
          g.py = topY;
          g.vy = 0;
          landed = true;
          break;
        }
      }
    }
    g.onGround = landed;
    if (landed && !wasGround) {
      g.landSquash = 0.14;
      particles.dust(g.px, g.py, 7);
    }
    g.coyote = g.onGround ? 0.1 : Math.max(0, g.coyote - dt);
    g.jumpBuffer = Math.max(0, g.jumpBuffer - dt);
    if (g.jumpBuffer > 0 && g.coyote > 0) {
      g.vy = -JUMP_V;
      g.coyote = 0;
      g.jumpBuffer = 0;
      audio.sfx('jump');
      particles.dust(g.px, g.py, 5);
    }
    g.landSquash = Math.max(0, g.landSquash - dt);
    g.blinkAt -= dt;
    if (g.blinkAt <= 0) { g.blinkLeft = 0.13; g.blinkAt = 2.4 + Math.random() * 2.4; }
    if (g.blinkLeft > 0) g.blinkLeft -= dt;

    /* running dust */
    if (g.onGround && Math.abs(g.vx) > 60 * unit) {
      g.dustTimer -= dt;
      if (g.dustTimer <= 0) {
        g.dustTimer = 0.13;
        particles.dust(g.px - g.facing * pw * 0.3, g.py, 2);
      }
    }

    /* -------------------------------------------------- stars & portal */
    const starCount = collectedIds.length; /* mutated below via local var */
    const allStars = collectedIds.length >= STAR_SPOTS.length;
    if (allStars && g.portalAppear < 1) {
      g.portalAppear = Math.min(1, g.portalAppear + dt * 1.2);
    }

    let collectedThisFrame: string | null = null;
    for (const spot of STAR_SPOTS) {
      if (collectedIds.includes(spot.id)) continue;
      const sx = spot.x;
      const sy = groundY - spot.yOff * unit + Math.sin(t * 2 + spot.x) * 3 * unit;
      if (Math.hypot(g.px - sx, g.py - ph / 2 - sy) < 24 * unit) {
        collectedThisFrame = spot.id;
        particles.sparkle(sx, sy, 20);
        particles.sparkle(sx, sy, 8, '#ffffff');
        audio.sfx('collect');
        break;
      }
    }
    if (collectedThisFrame) {
      collectedIds.push(collectedThisFrame);
      onStarCollect(collectedThisFrame);
      setCollected([...collectedIds]);
      if (collectedIds.length >= STAR_SPOTS.length) {
        setPortalOpen(true);
        setTimeout(() => audio.sfx('portal'), 350);
      }
    }

    /* portal entry */
    if (g.portalAppear > 0.55 && !enteredRef.current) {
      const portalX = PORTAL_X;
      if (Math.abs(g.px - portalX) < 22 * unit && Math.abs(g.py - groundY) < 60 * unit) {
        enteredRef.current = true;
        audio.sfx('portal');
        particles.sparkle(g.px, g.py - ph / 2, 40, '#ffe9a8');
        onEnterPortal();
      }
    }

    /* ------------------------------------------------------- camera */
    const targetCam = g.px - w / 2 + g.facing * 30 * unit;
    g.camX += (targetCam - g.camX) * Math.min(1, 1 - Math.exp(-5 * dt));
    g.camX = Math.max(0, Math.min(WORLD_W - w, g.camX));
    const cam = g.camX;

    /* ========================================================== DRAW */
    /* sky */
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05060f');
    sky.addColorStop(0.45, '#0b1026');
    sky.addColorStop(0.8, '#1c1440');
    sky.addColorStop(1, '#241a4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* background stars (slow parallax) */
    const bgRnd = mulberry32(42);
    for (let i = 0; i < 70; i++) {
      const bx = (bgRnd() * WORLD_W * 0.4 - cam * 0.12) % (w + 20);
      const sxp = bx < -10 ? bx + w + 20 : bx;
      const syp = bgRnd() * h * 0.7;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + bgRnd()) + i));
      ctx.fillStyle = bgRnd() < 0.15 ? `rgba(255,214,140,${tw})` : `rgba(235,235,255,${tw})`;
      ctx.fillRect(sxp, syp, bgRnd() < 0.12 ? 2 : 1.3, 1.3);
    }

    /* moon */
    drawMoon(ctx, w - 60, 44, 18, t);

    /* mountains (two parallax bands) */
    drawMountainRange(ctx, w, groundY + 2, cam * 0.22, '#191340', 3.1);
    drawMountainRange(ctx, w, groundY + 2, cam * 0.38, '#221a4e', 7.7);

    /* castle in the distance */
    const castleScreenX = 1500 - cam * 0.42;
    if (castleScreenX > -160 && castleScreenX < w + 160) {
      drawCastle(ctx, castleScreenX, groundY + 2, 2.6 * unit, t, '#1c1440');
    }

    /* far silhouette trees */
    for (const tr of decorRef.current!.trees) {
      const sx = tr.x * 1.0 - cam * 0.55;
      if (sx < -60 || sx > w + 60) continue;
      ctx.globalAlpha = 0.55;
      drawTree(ctx, sx, groundY + 2, tr.s * 1.5 * unit, tr.v, t);
      ctx.globalAlpha = 1;
    }

    /* fireflies */
    for (const f of decorRef.current!.fireflies) {
      const fx = f.x - cam;
      if (fx < -20 || fx > w + 20) continue;
      const fy = groundY - f.y * unit + Math.sin(t * f.speed + f.phase) * 10 * unit;
      const glowA = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.6 + f.phase));
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6 * unit);
      fg.addColorStop(0, `rgba(255, 236, 170, ${glowA})`);
      fg.addColorStop(1, 'rgba(255, 236, 170, 0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - 6 * unit, fy - 6 * unit, 12 * unit, 12 * unit);
      ctx.fillStyle = `rgba(255, 244, 200, ${glowA})`;
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }

    /* ground */
    ctx.fillStyle = '#17352b';
    ctx.fillRect(0, groundY + 6 * unit, w, h - groundY);
    ctx.fillStyle = '#1e4d3d';
    ctx.fillRect(0, groundY, w, 6 * unit);
    ctx.fillStyle = '#2f7a55';
    ctx.fillRect(0, groundY, w, 2 * unit);
    for (const tf of decorRef.current!.tufts) {
      const sx = tf.x - cam;
      if (sx < -8 || sx > w + 8) continue;
      if (tf.kind === 0) {
        ctx.fillStyle = '#2f7a55';
        ctx.fillRect(sx, groundY - 2 * unit, 1.6 * unit, 2 * unit);
      } else if (tf.kind === 1) {
        ctx.fillStyle = '#ffd97a';
        ctx.fillRect(sx, groundY - 2.4 * unit, 1.6 * unit, 1.6 * unit);
        ctx.fillStyle = '#e05252';
        ctx.fillRect(sx - 0.6 * unit, groundY - 3.4 * unit, 2.8 * unit, 1.2 * unit);
      } else {
        ctx.fillStyle = '#f2a2c0';
        ctx.fillRect(sx, groundY - 3 * unit, 1.8 * unit, 1.8 * unit);
        ctx.fillStyle = '#2f7a55';
        ctx.fillRect(sx + 0.4 * unit, groundY - 1.6 * unit, 1 * unit, 1.6 * unit);
      }
    }

    /* platforms */
    for (const p of PLATFORMS) {
      const sx = p.x - cam;
      if (sx < -140 || sx > w + 140) continue;
      const topY = groundY - p.yOff * unit;
      const ph2 = 10 * unit;
      ctx.fillStyle = '#4a3222';
      ctx.fillRect(sx, topY + 2.4 * unit, p.w, ph2);
      ctx.fillStyle = '#5f4230';
      ctx.fillRect(sx + p.w - 3 * unit, topY + 2.4 * unit, 3 * unit, ph2);
      ctx.fillStyle = '#1e4d3d';
      ctx.fillRect(sx, topY, p.w, 2.6 * unit);
      ctx.fillStyle = '#3d8f63';
      ctx.fillRect(sx, topY, p.w, 1.2 * unit);
      /* hanging vines */
      const vr = mulberry32(p.x);
      for (let i = 0; i < Math.floor(p.w / 22); i++) {
        const vx2 = sx + 6 + vr() * (p.w - 12);
        const vl = (2 + vr() * 4) * unit;
        ctx.fillStyle = '#2f7a55';
        ctx.fillRect(vx2, topY + 2.4 * unit + ph2, 1.2, vl);
      }
    }

    /* world trees + lamps + garlands + balloons + presents */
    for (const tr of decorRef.current!.trees) {
      const sx = tr.x - cam;
      if (sx < -80 || sx > w + 80) continue;
      drawTree(ctx, sx, groundY, tr.s * 2.2 * unit, tr.v, t);
    }
    for (const lx of decorRef.current!.lamps) {
      const sx = lx - cam;
      if (sx < -40 || sx > w + 40) continue;
      drawLamp(ctx, sx, groundY, 1.4 * unit, t);
    }
    for (const gl of decorRef.current!.garlands) {
      const ax = gl.a - cam;
      const bx = gl.b - cam;
      if (bx < -40 || ax > w + 40) continue;
      const ay = groundY - gl.h * unit;
      drawGarland(ctx, ax, ay, bx, ay, t);
    }
    for (const bl of decorRef.current!.tiedBalloons) {
      const sx = bl.x - cam;
      if (sx < -30 || sx > w + 30) continue;
      drawBalloonTied(ctx, sx, groundY - 46 * unit, bl.color, t, bl.x);
    }
    for (const pr of decorRef.current!.presents) {
      const sx = pr.x - cam;
      if (sx < -50 || sx > w + 50) continue;
      drawSpriteBox(ctx, sx, groundY, pr.c, unit);
    }

    /* magical stars */
    for (const spot of STAR_SPOTS) {
      if (collectedIds.includes(spot.id)) continue;
      const sx = spot.x - cam;
      if (sx < -30 || sx > w + 30) continue;
      const sy = groundY - spot.yOff * unit + Math.sin(t * 2 + spot.x) * 3 * unit;
      drawMagicStar(ctx, sx, sy, 1.5 * unit, t, spot.x);
    }

    /* golden portal */
    if (g.portalAppear > 0) {
      const pxr = PORTAL_X - cam;
      if (pxr > -120 && pxr < w + 120) {
        const appear = g.portalAppear;
        const cyc = groundY - 34 * unit;
        drawPortal(ctx, pxr, cyc, t, 1.7 * unit * (0.4 + 0.6 * appear), appear);
        /* rising sparkles around portal */
        if (Math.random() < appear * 0.35) {
          particles.ember(pxr + (Math.random() - 0.5) * 26 * unit, cyc + 30 * unit, '#ffd45e');
        }
        if (appear > 0.9) {
          const labelA = 0.6 + 0.4 * Math.sin(t * 3);
          ctx.fillStyle = `rgba(255, 224, 150, ${labelA})`;
          ctx.font = `${Math.round(7 * unit)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('WALK INTO THE LIGHT', pxr, cyc - 44 * unit);
        }
      }
    }

    /* ------------------------------------------------------------ player */
    {
      const bob = g.onGround && Math.abs(g.vx) < 10 * unit ? Math.sin(t * 2.6) * 1.2 * unit : 0;
      const runBounce = g.onGround && Math.abs(g.vx) > 10 * unit ? Math.abs(Math.sin(t * 11)) * -2.2 * unit : 0;
      const squash = g.landSquash > 0 ? 1 - g.landSquash * 1.4 : 1; /* <1 on landing */
      const stretch = !g.onGround ? 1.07 : 1;
      const tilt = g.onGround ? g.facing * Math.min(0.07, Math.abs(g.vx) / (MOVE * 3.4)) : g.facing * 0.04;
      const spr = g.blinkLeft > 0 ? char.blink : char.idle;
      /* shadow on ground/platform below */
      let shadowY = groundY;
      for (const p of PLATFORMS) {
        const topY = groundY - p.yOff * unit;
        const withinX = g.px + pw * 0.3 > p.x && g.px - pw * 0.3 < p.x + p.w;
        if (withinX && g.py <= topY + 4) shadowY = Math.min(shadowY, topY);
      }
      const shW = pw * 0.9;
      const shA = Math.max(0.08, 0.3 - (shadowY - g.py) / (200 * unit));
      ctx.fillStyle = `rgba(0,0,0,${shA})`;
      ctx.fillRect(g.px - cam - shW / 2, shadowY - 1.4 * unit, shW, 2 * unit);
      /* aura */
      const aura = ctx.createRadialGradient(g.px - cam, g.py - ph / 2, 0, g.px - cam, g.py - ph / 2, pw);
      aura.addColorStop(0, char.aura);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(g.px - cam - pw, g.py - ph - pw, pw * 2, ph + pw * 2);
      /* body */
      ctx.save();
      ctx.translate(g.px - cam, g.py + bob + runBounce);
      ctx.rotate(tilt);
      ctx.scale(2 - squash * stretch, squash * stretch);
      drawSprite(ctx, spr, -pw / 2, -ph, s);
      ctx.restore();
    }

    /* particles */
    particles.update(dt);
    particles.draw(ctx);

    /* world-edge fades */
    const fade = ctx.createLinearGradient(0, 0, 26, 0);
    fade.addColorStop(0, 'rgba(5,6,15,0.9)');
    fade.addColorStop(1, 'rgba(5,6,15,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 26, h);
    const fadeR = ctx.createLinearGradient(w - 26, 0, w, 0);
    fadeR.addColorStop(0, 'rgba(5,6,15,0)');
    fadeR.addColorStop(1, 'rgba(5,6,15,0.9)');
    ctx.fillStyle = fadeR;
    ctx.fillRect(w - 26, 0, 26, h);

    void starCount;
  });

  /* pointer tap = jump too (quick way on mobile without joystick) */
  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const pt = canvasPoint(canvas, e.clientX, e.clientY);
    void pt;
    if (!enteredRef.current) G.current.jumpBuffer = 0.14;
  };

  const starIcons = (
    <div className="mt-1 flex items-center justify-center gap-1.5">
      {STAR_SPOTS.map((sp, i) => (
        <Star
          key={sp.id}
          className={`h-3.5 w-3.5 transition-all duration-500 ${
            i < collected.length
              ? 'fill-[#ffd97a] text-[#ffd97a] drop-shadow-[0_0_6px_rgba(247,201,72,0.9)]'
              : 'text-white/25'
          }`}
        />
      ))}
      <span className="ml-1 font-pixel text-[8px] text-white/85">{collected.length}/5</span>
    </div>
  );

  return (
    <GameFrame
      title="STARLIGHT TRAIL"
      hint={isTouch ? 'JOYSTICK: MOVE • A: JUMP' : 'ARROWS / WASD: MOVE • SPACE: JUMP'}
      hud={portalOpen ? (
        <p className="mt-0.5 animate-[glowPulse_1.6s_ease-in-out_infinite] font-pixel text-[7px] text-[#ffd97a]">
          PORTAL OPEN — HEAD RIGHT!
        </p>
      ) : undefined}
      onBack={onBack}
    >
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="pixelated h-full w-full"
          style={{ imageRendering: 'pixelated' }}
          onPointerDown={onCanvasPointer}
          aria-label="Starlight Trail game world"
        />
        {isTouch && (
          <TouchControls
            mode="joystick"
            onVector={(x) => { G.current.touchVX = x; }}
            onAction={() => { G.current.touchJump = true; }}
            actionLabel="JUMP"
          />
        )}
      </div>
    </GameFrame>
  );
}

/* small local draw helpers */
function drawBalloonTied(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  color: [string, string], t: number, seed: number,
) {
  const sway = Math.sin(t * 1.8 + seed) * 2;
  ctx.strokeStyle = 'rgba(235,225,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + sway, y + 16);
  ctx.lineTo(x, y + 44);
  ctx.stroke();
  ctx.fillStyle = color[0];
  ctx.beginPath();
  ctx.ellipse(x + sway, y + 8, 5.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color[1];
  ctx.fillRect(x + sway - 1.5, y + 15, 3, 2.4);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(x + sway - 2.6, y + 4.5, 1.6, 2.6);
}

function drawSpriteBox(
  ctx: CanvasRenderingContext2D, x: number, baseY: number,
  c: [string, string, string], unit: number,
) {
  const w = 13 * unit;
  const h = 10 * unit;
  ctx.fillStyle = c[0];
  ctx.fillRect(x - w / 2, baseY - h, w, h);
  ctx.fillStyle = c[1];
  ctx.fillRect(x - w / 2, baseY - h, w, 1.6 * unit);
  ctx.fillRect(x + w / 2 - 1.4 * unit, baseY - h, 1.4 * unit, h);
  ctx.fillStyle = c[2];
  ctx.fillRect(x - 1.2 * unit, baseY - h - 2 * unit, 2.4 * unit, h + 2 * unit);
  ctx.fillRect(x - w / 2 - 1.4 * unit, baseY - h - 2.6 * unit, w + 2.8 * unit, 2.6 * unit);
  ctx.fillRect(x - 3 * unit, baseY - h - 4.4 * unit, 2.6 * unit, 2 * unit);
  ctx.fillRect(x + 0.6 * unit, baseY - h - 4.4 * unit, 2.6 * unit, 2 * unit);
}

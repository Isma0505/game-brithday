'use client';

/* =========================================================================
 *  BirthdayRoom — the surprise level.
 *  A warm magical room: giant cake with candles, balloons and gifts
 *  (decorated by your performance in the mini-games), and a wish ritual
 *  at the cake. Then... "Open Your Gift".
 * ========================================================================= */

import { Gift, MoonStar } from 'lucide-react';
import { useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { canvasPoint, useGameCanvas, useIsTouch, useKeys } from '@/lib/game/canvas';
import { BIRTHDAY_MESSAGE } from '@/lib/game/config';
import { ParticleSystem } from '@/lib/game/particles';
import {
  drawBalloon, drawCake, drawGarland, drawGiftBox, drawMagicStar,
  drawPixelTextCentered, drawSprite, drawTree, getCharacter, mulberry32, spriteScaleFor,
} from '@/lib/game/sprites';
import { GameFrame } from './GameFrame';
import { TouchControls } from './TouchControls';

export interface BirthdayRoomProps {
  characterId: string;
  wished: boolean;
  balloonPops: number;
  giftsCaught: number;
  onWish: () => void;
  onOpenGift: () => void;
  onBack: () => void;
}

type WishPhase = 'idle' | 'blowing' | 'dark' | 'relight';

export function BirthdayRoom({
  characterId, wished: initialWished, balloonPops, giftsCaught, onWish, onOpenGift, onBack,
}: BirthdayRoomProps) {
  const isTouch = useIsTouch();
  const keys = useKeys();
  const [wished, setWished] = useState(initialWished);
  const [wishOverlay, setWishOverlay] = useState<'none' | 'dark' | 'done'>('none');

  const char = getCharacter(characterId);
  const G = useRef({
    px: -1, /* set on first frame */
    vx: 0,
    facing: 1,
    blinkAt: 2.2,
    blinkLeft: 0,
    wish: { phase: 'idle' as WishPhase, t: 0 },
    lit: [true, true, true] as boolean[],
    confettiTimer: 0,
    touchVX: 0,
    touchAction: false,
  });
  const particlesRef = useRef<ParticleSystem | null>(null);
  if (particlesRef.current == null) particlesRef.current = new ParticleSystem();

  /* room dressing (deterministic) */
  const decorRef = useRef<{
    balloons: { x: number; y: number; c: [string, string]; phase: number }[];
    presents: { x: number; y: number; s: number; c: [string, string, string] }[];
  } | null>(null);
  if (decorRef.current == null) {
    const rnd = mulberry32(99);
    const palette: [string, string][] = [
      ['#f2a2c0', '#d18396'], ['#f7c948', '#c98f1b'], ['#a78bfa', '#6d4fc4'],
      ['#7ee0c3', '#4aa88a'], ['#8fb8de', '#5f83b0'],
    ];
    const nBalloons = Math.max(6, Math.min(22, 6 + Math.floor(balloonPops / 4)));
    const balloons = Array.from({ length: nBalloons }, (_, i) => ({
      x: 40 + i * ((860 - 80) / Math.max(1, nBalloons - 1)) + rnd() * 24,
      y: 26 + rnd() * 30,
      c: palette[i % palette.length],
      phase: rnd() * Math.PI * 2,
    }));
    const nPresents = Math.max(3, Math.min(14, 3 + Math.floor(giftsCaught / 3)));
    const presentColors: [string, string, string][] = [
      ['#e05252', '#a83a3a', '#fff1c4'], ['#5ec8b0', '#3a8f7a', '#fff1c4'],
      ['#a78bfa', '#6d4fc4', '#ffd97a'], ['#e8b64c', '#b9822a', '#fff1c4'],
    ];
    const presents: { x: number; y: number; s: number; c: [string, string, string] }[] = [];
    for (let i = 0; i < nPresents; i++) {
      const row = i < 5 ? 0 : i < 9 ? 1 : 2;
      const col = i % 5;
      presents.push({
        x: 108 + col * 34 + row * 17 + rnd() * 8,
        y: row,
        s: 1.15 - row * 0.08,
        c: presentColors[(i + row) % presentColors.length],
      });
    }
    decorRef.current = { balloons, presents };
  }

  const doInteract = () => {
    const g = G.current;
    if (g.wish.phase !== 'idle') return;
    if (wished) {
      /* already wished — just a little celebration */
      audio.sfx('wish');
      particlesRef.current!.confetti(g.px, 40, 30, 0.8);
      setWishOverlay('done');
      setTimeout(() => setWishOverlay('none'), 2200);
      return;
    }
    g.wish = { phase: 'blowing', t: 0 };
    audio.sfx('blow');
  };

  const canvasRef = useGameCanvas(({ ctx, w, h, dt, t }) => {
    const g = G.current;
    const unit = h / 240;
    const floorY = h - 42 * unit;
    const particles = particlesRef.current!;
    if (g.px < 0) g.px = w * 0.3;

    const pw = 12 * spriteScaleFor(h);
    const ph = 16 * spriteScaleFor(h);

    /* ---------------------------------------------- input & movement */
    const k = keys.current.down;
    let move = 0;
    if (k.has('arrowleft') || k.has('a')) move -= 1;
    if (k.has('arrowright') || k.has('d')) move += 1;
    if (Math.abs(g.touchVX) > 0.15) move = g.touchVX;
    if (keys.current.consumePressed('e') || keys.current.consumePressed(' ')) g.touchAction = true;
    const SPEED = 150 * unit;
    if (move !== 0) {
      g.vx = move * SPEED;
      g.facing = move > 0 ? 1 : -1;
    } else g.vx = 0;
    g.px = Math.max(pw / 2 + 14, Math.min(w - pw / 2 - 14, g.px + g.vx * dt));
    g.blinkAt -= dt;
    if (g.blinkAt <= 0) { g.blinkLeft = 0.13; g.blinkAt = 2.6 + Math.random() * 2.2; }
    if (g.blinkLeft > 0) g.blinkLeft -= dt;

    const cakeX = w * 0.62;
    const nearCake = Math.abs(g.px - cakeX) < 52 * unit;

    /* queued touch interaction */
    if (g.touchAction) {
      g.touchAction = false;
      if (nearCake) doInteract();
    }

    /* --------------------------------------------------- wish ritual */
    const wish = g.wish;
    if (wish.phase === 'blowing') {
      wish.t += dt;
      const outCount = Math.min(3, Math.floor(wish.t / 0.28));
      for (let i = 0; i < outCount; i++) {
        if (g.lit[i]) {
          g.lit[i] = false;
          particles.smoke(cakeX + (i - 1) * 6 * unit, floorY - 66 * unit);
          audio.sfx('blow');
        }
      }
      if (wish.t > 1.15) {
        wish.phase = 'dark';
        wish.t = 0;
        setWishOverlay('dark');
      }
    } else if (wish.phase === 'dark') {
      wish.t += dt;
      if (wish.t > 2.8) {
        wish.phase = 'relight';
        wish.t = 0;
        g.lit = [true, true, true];
        setWishOverlay('done');
        setWished(true);
        onWish();
        audio.sfx('wish');
        audio.sfx('confetti');
        for (let i = 0; i < 3; i++) {
          particles.confetti(cakeX + (i - 1) * 40 * unit, floorY - 60 * unit, 26, 0.9);
        }
        particles.sparkle(g.px, floorY - ph / 2, 24, '#ffe9a8');
      }
    } else if (wish.phase === 'relight') {
      wish.t += dt;
      if (wish.t > 2.6) {
        wish.phase = 'idle';
        setWishOverlay('none');
      }
    }

    /* golden embers */
    g.confettiTimer -= dt;
    if (g.confettiTimer <= 0) {
      g.confettiTimer = 0.22;
      particles.ember(Math.random() * w, floorY - 4, Math.random() < 0.8 ? '#ffd45e' : '#f2a2c0');
    }

    /* ========================================================== DRAW */
    /* walls */
    const wall = ctx.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, '#241a4a');
    wall.addColorStop(1, '#312258');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, floorY);

    /* warm center light */
    const warm = ctx.createRadialGradient(cakeX, floorY - 70 * unit, 0, cakeX, floorY - 70 * unit, w * 0.5);
    warm.addColorStop(0, 'rgba(255, 200, 120, 0.13)');
    warm.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, floorY);

    /* window with night sky */
    {
      const wx = 52 * unit;
      const wy = 52 * unit;
      const ww = 64 * unit;
      const wh = 52 * unit;
      const skyIn = ctx.createLinearGradient(0, wy, 0, wy + wh);
      skyIn.addColorStop(0, '#0b1026');
      skyIn.addColorStop(1, '#1c1440');
      ctx.fillStyle = skyIn;
      ctx.fillRect(wx, wy, ww, wh);
      const wr = mulberry32(5);
      for (let i = 0; i < 14; i++) {
        const stx = wx + wr() * ww;
        const sty = wy + wr() * wh * 0.8;
        ctx.fillStyle = `rgba(240,240,255,${0.3 + 0.6 * Math.abs(Math.sin(t * (0.6 + wr()) + i))})`;
        ctx.fillRect(stx, sty, 1.4, 1.4);
      }
      drawMagicStar(ctx, wx + ww * 0.72, wy + wh * 0.3, 0.9 * unit, t, 3);
      /* frame */
      ctx.fillStyle = '#5a3f2a';
      ctx.fillRect(wx - 3 * unit, wy - 3 * unit, ww + 6 * unit, 3 * unit);
      ctx.fillRect(wx - 3 * unit, wy + wh, ww + 6 * unit, 3 * unit);
      ctx.fillRect(wx - 3 * unit, wy - 3 * unit, 3 * unit, wh + 6 * unit);
      ctx.fillRect(wx + ww, wy - 3 * unit, 3 * unit, wh + 6 * unit);
      ctx.fillRect(wx + ww / 2 - 1 * unit, wy, 2 * unit, wh);
      ctx.fillRect(wx, wy + wh / 2 - 1 * unit, ww, 2 * unit);
      /* moonlight spill */
      const spill = ctx.createLinearGradient(wx, wy + wh, wx, floorY);
      spill.addColorStop(0, 'rgba(180, 200, 255, 0.10)');
      spill.addColorStop(1, 'rgba(180, 200, 255, 0)');
      ctx.fillStyle = spill;
      ctx.fillRect(wx - 6 * unit, wy + wh, ww + 12 * unit, floorY - wy - wh);
    }

    /* string lights across the top */
    drawGarland(ctx, 0, 20 * unit, w * 0.45, 30 * unit, t);
    drawGarland(ctx, w * 0.55, 30 * unit, w, 20 * unit, t);

    /* HAPPY BIRTHDAY banner */
    {
      const bY = 40 * unit;
      ctx.fillStyle = 'rgba(20,14,40,0.72)';
      const bW = (14 * 4 + 2) * 2.1 * unit;
      ctx.fillRect(w / 2 - bW / 2, bY - 3 * unit, bW, 13 * unit);
      ctx.fillStyle = '#e05252';
      ctx.fillRect(w / 2 - bW / 2, bY - 3 * unit, bW, 1.4 * unit);
      ctx.fillRect(w / 2 - bW / 2, bY + 8.6 * unit, bW, 1.4 * unit);
      drawPixelTextCentered(ctx, 'HAPPY BIRTHDAY', w / 2, bY, 2.1 * unit, '#ffd97a');
    }

    /* balloons at ceiling */
    for (const b of decorRef.current!.balloons) {
      drawBalloon(ctx, b.x, b.y + 10 * unit, 1.25 * unit, b.c[0], b.c[1], t, b.phase);
    }

    /* floor */
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.fillStyle = '#5f4230';
    ctx.fillRect(0, floorY, w, 2.4 * unit);
    ctx.fillStyle = '#3a2718';
    for (let x = 0; x < w; x += 46 * unit) ctx.fillRect(x, floorY + 2.4 * unit, 1.4, h - floorY);
    ctx.fillStyle = '#3a2718';
    ctx.fillRect(0, floorY + 12 * unit, w, 1);
    ctx.fillRect(0, floorY + 26 * unit, w, 1);

    /* rug under the cake table */
    ctx.fillStyle = '#7a2a3f';
    ctx.fillRect(cakeX - 84 * unit, floorY + 5 * unit, 168 * unit, 22 * unit);
    ctx.fillStyle = '#9a3a52';
    ctx.fillRect(cakeX - 76 * unit, floorY + 7 * unit, 152 * unit, 18 * unit);
    ctx.fillStyle = '#ffd97a';
    ctx.fillRect(cakeX - 70 * unit, floorY + 10 * unit, 140 * unit, 1.6 * unit);

    /* gift pyramid */
    for (const pr of decorRef.current!.presents) {
      drawGiftBox(ctx, pr.x, floorY - pr.y * 15 * unit, pr.s * unit, pr.c[0], pr.c[1], pr.c[2]);
    }

    /* little magic tree in the corner */
    drawTree(ctx, w - 34 * unit, floorY + 2, 1.7 * unit, 1, t);

    /* table + cake */
    {
      const tableTop = floorY - 20 * unit;
      ctx.fillStyle = '#6b4426';
      ctx.fillRect(cakeX - 58 * unit, tableTop, 116 * unit, 5 * unit);
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(cakeX - 58 * unit, tableTop, 116 * unit, 1.8 * unit);
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(cakeX - 52 * unit, tableTop + 5 * unit, 5 * unit, 20 * unit);
      ctx.fillRect(cakeX + 47 * unit, tableTop + 5 * unit, 5 * unit, 20 * unit);
      drawCake(ctx, cakeX, tableTop - 1, 1.55 * unit, t, g.lit);
      /* relight glow */
      if (g.lit.every(Boolean) && wish.phase !== 'idle') {
        const glow = ctx.createRadialGradient(cakeX, tableTop - 30 * unit, 0, cakeX, tableTop - 30 * unit, 60 * unit);
        glow.addColorStop(0, 'rgba(255, 214, 130, 0.28)');
        glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cakeX - 60 * unit, tableTop - 90 * unit, 120 * unit, 120 * unit);
      }
    }

    /* interact prompt */
    if (nearCake && wish.phase === 'idle' && wishOverlay === 'none') {
      const pY = floorY - 108 * unit + Math.sin(t * 3) * 2 * unit;
      const label = wished ? 'PRESS E — CELEBRATE!' : isTouch ? 'TAP A — MAKE A WISH' : 'PRESS E — MAKE A WISH';
      const lw = (label.length * 4 + 2) * 1.7 * unit;
      ctx.fillStyle = 'rgba(10, 8, 24, 0.85)';
      ctx.fillRect(cakeX - lw / 2, pY - 6 * unit, lw, 11 * unit);
      ctx.fillStyle = '#ffd97a';
      ctx.fillRect(cakeX - lw / 2, pY - 6 * unit, lw, 1.2 * unit);
      ctx.fillRect(cakeX - lw / 2, pY + 4 * unit, lw, 1.2 * unit);
      drawPixelTextCentered(ctx, label, cakeX, pY - 2.4 * unit, 1.7 * unit, '#ffe9a8');
    }

    /* ------------------------------------------------------------ player */
    {
      const bob = Math.abs(g.vx) > 4 ? Math.abs(Math.sin(t * 10)) * -2 * unit : Math.sin(t * 2.6) * 1.2 * unit;
      const spr = g.blinkLeft > 0 ? char.blink : char.idle;
      const shA = 0.28;
      ctx.fillStyle = `rgba(0,0,0,${shA})`;
      ctx.fillRect(g.px - pw * 0.45, floorY - 1.6 * unit, pw * 0.9, 2.2 * unit);
      ctx.save();
      ctx.translate(g.px, floorY + bob);
      if (g.facing < 0) ctx.scale(-1, 1);
      drawSprite(ctx, spr, -pw / 2, -ph, spriteScaleFor(h));
      ctx.restore();
      const aura = ctx.createRadialGradient(g.px, floorY - ph / 2, 0, g.px, floorY - ph / 2, pw);
      aura.addColorStop(0, char.aura);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(g.px - pw, floorY - ph - pw, pw * 2, ph + pw * 2);
    }

    particles.update(dt);
    particles.draw(ctx);

    /* darkness during the wish */
    if (wish.phase === 'dark') {
      const a = Math.min(0.55, wish.t * 0.6);
      ctx.fillStyle = `rgba(2, 3, 12, ${a})`;
      ctx.fillRect(0, 0, w, h);
    }
  });

  /* pointer tap = interact (mobile-friendly) */
  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = canvasPoint(e.currentTarget, e.clientX, e.clientY);
    void pt;
    G.current.touchAction = true;
  };

  return (
    <GameFrame
      title="THE BIRTHDAY ROOM"
      hint={isTouch ? 'JOYSTICK: MOVE • A: INTERACT' : 'ARROWS / WASD: MOVE • E: INTERACT'}
      onBack={onBack}
    >
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="pixelated h-full w-full"
          style={{ imageRendering: 'pixelated' }}
          onPointerDown={onCanvasPointer}
          aria-label="Birthday room"
        />
        {isTouch && (
          <TouchControls
            mode="joystick"
            onVector={(x) => { G.current.touchVX = x; }}
            onAction={() => { G.current.touchAction = true; }}
            actionLabel="WISH"
          />
        )}

        {/* wish overlay */}
        {wishOverlay !== 'none' && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            {wishOverlay === 'dark' ? (
              <p className="animate-[fadeIn_1.2s_both] font-elegant text-xl italic text-[#ffe9a8] drop-shadow-[0_0_20px_rgba(255,214,120,0.6)] sm:text-3xl">
                {BIRTHDAY_MESSAGE.wishPrompt}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <MoonStar className="h-8 w-8 animate-[glowPulse_1.6s_ease-in-out_infinite] text-[#ffd97a]" />
                <p className="animate-[riseIn_0.8s_both] font-pixel text-[10px] leading-relaxed text-[#ffd97a] drop-shadow-[0_0_12px_rgba(247,201,72,0.6)] sm:text-sm">
                  {BIRTHDAY_MESSAGE.wishDone}
                </p>
              </div>
            )}
          </div>
        )}

        {/* open gift button */}
        <div className="absolute inset-x-0 bottom-6 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => { audio.sfx('fanfare'); onOpenGift(); }}
            onMouseEnter={() => audio.sfx('hover')}
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-[#ffe9a8] via-[#ffd97a] to-[#e8a528] px-8 py-4 font-pixel text-[10px] text-[#2a1b04] shadow-[0_0_36px_rgba(247,201,72,0.55)] transition-all animate-[glowPulse_2s_ease-in-out_infinite] hover:brightness-110 active:scale-95 sm:text-xs"
          >
            <Gift className="h-5 w-5" />
            <span className="relative z-10">OPEN YOUR GIFT</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </GameFrame>
  );
}

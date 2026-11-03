'use client';

/* =========================================================================
 *  HubScreen — The Astral Fair.
 *  Three playable wonders + the Golden Portal to the birthday room.
 *  Progress decorates the final room, so every game matters.
 * ========================================================================= */

import { ArrowRightLeft, Check, Lock, RotateCcw, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { GOALS } from '@/lib/game/config';
import { drawBalloon, drawGiftBox, drawMagicStar, drawPortal, getCharacter, drawSprite, drawTree } from '@/lib/game/sprites';
import type { GameProgress } from '@/lib/game/storage';
import { SkyCanvas } from './SkyCanvas';

interface HubScreenProps {
  progress: GameProgress;
  onPlay: (game: 'trail' | 'balloon' | 'gift') => void;
  onRoom: () => void;
  onChangeCharacter: () => void;
  onReset: () => void;
}

type CardId = 'trail' | 'balloon' | 'gift' | 'room';

/* Animated preview canvas per card. */
function PortalPreview({ id }: { id: CardId }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 150;
    const H = 84;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    let time = 0;
    const s = 1.35;
    const groundY = H - 10;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(1, '#241a4a');

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      /* stars */
      for (let i = 0; i < 14; i++) {
        const x = (i * 47) % W;
        const y = (i * 29) % (H * 0.6);
        ctx.fillStyle = `rgba(240,240,255,${0.25 + 0.6 * Math.abs(Math.sin(time * (1 + i * 0.13) + i))})`;
        ctx.fillRect(x, y, 1.4, 1.4);
      }
      drawTree(ctx, 16, groundY, s * 0.9, 0, time);
      drawTree(ctx, W - 16, groundY, s * 0.9, 1, time);
      /* ground */
      ctx.fillStyle = '#1e4d3d';
      ctx.fillRect(0, groundY, W, 10);
      ctx.fillStyle = '#173d31';
      ctx.fillRect(0, groundY, W, 2.4);

      const cx = W / 2;
      switch (id) {
        case 'trail':
          drawPortal(ctx, cx, groundY - 22, time, s * 0.92);
          drawMagicStar(ctx, cx, groundY - 46, 1.1, time);
          break;
        case 'balloon': {
          const colors: [string, string][] = [
            ['#f2a2c0', '#d18396'], ['#f7c948', '#c98f1b'], ['#a78bfa', '#6d4fc4'], ['#7ee0c3', '#4aa88a'],
          ];
          colors.forEach(([c, sh], i) => {
            const bx = cx + (i - 1.5) * 16;
            const by = 18 + Math.sin(time * 1.4 + i * 1.7) * 3.5 + (i % 2) * 8;
            drawBalloon(ctx, bx, by, 1.15, c, sh, time, i * 2.3);
          });
          break;
        }
        case 'gift':
          drawGiftBox(ctx, cx - 20, groundY - 2, s, '#e05252', '#a83a3a', '#fff1c4');
          drawGiftBox(ctx, cx + 4, groundY - 2, s, '#5ec8b0', '#3a8f7a', '#fff1c4');
          drawGiftBox(ctx, cx - 6, groundY - 16, s * 0.8, '#a78bfa', '#6d4fc4', '#ffd97a');
          break;
        case 'room':
          drawPortal(ctx, cx, groundY - 20, time, s, 1);
          /* golden sparks */
          for (let i = 0; i < 8; i++) {
            const a = time * 1.8 + i * (Math.PI / 4);
            const px = cx + Math.cos(a) * 26;
            const py = groundY - 22 + Math.sin(a * 1.4) * 20;
            ctx.fillStyle = `rgba(255,222,140,${0.4 + 0.5 * Math.sin(time * 5 + i)})`;
            ctx.fillRect(px, py, 2, 2);
          }
          break;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return <canvas ref={canvasRef} className="pixelated h-full w-full object-cover" style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

/* Animated character badge. */
function HeroBadge({ characterId }: { characterId: string }) {
  const char = getCharacter(characterId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 60;
    canvas.height = 66;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let blinkAt = 2;
    let blinkLeft = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      blinkAt -= dt;
      if (blinkAt <= 0) { blinkLeft = 0.13; blinkAt = 2.4 + Math.random() * 2; }
      if (blinkLeft > 0) blinkLeft -= dt;
      ctx.clearRect(0, 0, 60, 66);
      const bob = Math.sin(t * 2.4) * 1.4;
      const spr = blinkLeft > 0 ? char.blink : char.idle;
      const aura = ctx.createRadialGradient(30, 36, 0, 30, 36, 30);
      aura.addColorStop(0, char.aura);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 60, 66);
      drawSprite(ctx, spr, (60 - spr.w * 3) / 2, (66 - spr.h * 3) / 2 + bob, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [char]);

  return <canvas ref={canvasRef} className="pixelated h-full w-full object-contain" style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

export function HubScreen({ progress, onPlay, onRoom, onChangeCharacter, onReset }: HubScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3200);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const doneCount = (progress.trailDone ? 1 : 0) + (progress.balloonDone ? 1 : 0) + (progress.giftsDone ? 1 : 0);
  const roomOpen = progress.trailDone;

  const cards: {
    id: CardId;
    name: string;
    desc: string;
    status: string;
    done: boolean;
    locked: boolean;
    onClick: () => void;
    accent: string;
  }[] = [
    {
      id: 'trail',
      name: 'STARLIGHT TRAIL',
      desc: 'Run, leap and gather the 5 magical stars hidden in the enchanted forest.',
      status: progress.trailDone
        ? 'All 5 stars found!'
        : `Stars ${progress.trailStars.length}/${GOALS.STARS} found`,
      done: progress.trailDone,
      locked: false,
      onClick: () => onPlay('trail'),
      accent: '#a78bfa',
    },
    {
      id: 'balloon',
      name: 'BALLOON FIESTA',
      desc: 'Pop floating balloons across the night sky. Golden ones count triple!',
      status: progress.balloonDone
        ? `Best: ${progress.balloonPops} pops in ${progress.balloonTimeSec?.toFixed(1) ?? '—'}s`
        : `Pop ${GOALS.BALLOON_POPS} balloons`,
      done: progress.balloonDone,
      locked: false,
      onClick: () => onPlay('balloon'),
      accent: '#f2a2c0',
    },
    {
      id: 'gift',
      name: 'GIFT CASCADE',
      desc: 'Catch the falling presents with your basket. Golden gifts are worth two.',
      status: progress.giftsDone
        ? `Best: ${progress.giftsCaught} gifts caught`
        : `Catch ${GOALS.GIFTS_CATCH} gifts`,
      done: progress.giftsDone,
      locked: false,
      onClick: () => onPlay('gift'),
      accent: '#5eead4',
    },
    {
      id: 'room',
      name: 'THE GOLDEN PORTAL',
      desc: roomOpen
        ? 'The way is open. Your surprise awaits inside...'
        : 'A sealed gate of golden light. The 5 stars will awaken it.',
      status: roomOpen ? 'ENTER THE BIRTHDAY ROOM' : 'LOCKED',
      done: roomOpen,
      locked: !roomOpen,
      onClick: () => { if (roomOpen) onRoom(); },
      accent: '#ffd97a',
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SkyCanvas />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(115%_90%_at_50%_38%,transparent_55%,rgba(4,6,18,0.62)_100%)]" />

      <div className="absolute inset-0 flex flex-col items-center gap-4 overflow-y-auto px-4 py-6 sm:gap-6 sm:py-8">
        <header className="text-center">
          <p className="font-retro text-lg text-[#9fe8d8]">Welcome back, brave soul</p>
          <h1 className="font-pixel text-base text-[#ffd97a] drop-shadow-[0_0_14px_rgba(247,201,72,0.55)] sm:text-2xl">
            THE ASTRAL FAIR
          </h1>
          <p className="mt-2 font-elegant text-sm italic text-white/70 sm:text-base">
            Three wonders await — and one secret hides behind golden light.
          </p>
        </header>

        {/* progress + hero */}
        <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/12 bg-[#14102b]/70 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {progress.character ? (
              <div className="h-12 w-11 shrink-0">
                <HeroBadge characterId={progress.character} />
              </div>
            ) : null}
            <div>
              <p className="font-pixel text-[8px] text-white/80 sm:text-[9px]">
                {progress.character ? getCharacter(progress.character).name.toUpperCase() : 'NO HERO'}
              </p>
              <button
                onClick={() => { audio.sfx('click'); onChangeCharacter(); }}
                className="mt-1 flex items-center gap-1.5 font-retro text-sm text-[#ffd97a]/80 transition-colors hover:text-[#ffd97a]"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Change hero
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="font-pixel text-[7px] tracking-widest text-white/60 sm:text-[8px]">BIRTHDAY MAGIC</p>
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              {([0, 1, 2] as const).map((i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rotate-45 border transition-all duration-500 ${
                    i < doneCount
                      ? 'border-[#ffd97a] bg-[#ffd97a] shadow-[0_0_10px_rgba(247,201,72,0.8)]'
                      : 'border-white/25 bg-transparent'
                  }`}
                />
              ))}
              <span className="ml-1 font-retro text-base text-white/60">{doneCount}/3</span>
            </div>
          </div>
        </div>

        {/* cards */}
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                if (card.locked) { audio.sfx('miss'); return; }
                audio.sfx('click');
                card.onClick();
              }}
              onMouseEnter={() => { if (!card.locked) audio.sfx('hover'); }}
              className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 active:scale-[0.98] ${
                card.locked
                  ? 'cursor-not-allowed border-white/10 bg-[#0d0a1e]/80 opacity-70'
                  : card.done && card.id === 'room'
                    ? 'animate-[glowPulse_2.4s_ease-in-out_infinite] border-[#ffd97a]/70 bg-[#1c1440]/85 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(247,201,72,0.35)]'
                    : 'border-white/12 bg-[#14102b]/75 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_10px_36px_rgba(120,90,220,0.3)]'
              }`}
            >
              <div className="relative h-24 w-full overflow-hidden border-b border-white/8 sm:h-28">
                <PortalPreview id={card.id} />
                {card.locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#070514]/78 backdrop-blur-[1.5px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <Lock className="h-6 w-6 text-white/70" />
                      <span className="font-pixel text-[7px] tracking-widest text-white/60">SEALED</span>
                    </div>
                  </div>
                )}
                {card.done && card.id !== 'room' && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-[#7ee0c3]/60 bg-[#0d2b24]/85 px-2 py-0.5 font-pixel text-[6px] text-[#7ee0c3]">
                    <Check className="h-3 w-3" /> CLEARED
                  </span>
                )}
                {card.id === 'trail' && !card.done && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-[#ffd97a]/50 bg-[#2a1b04]/85 px-2 py-0.5 font-pixel text-[6px] text-[#ffd97a]">
                    <Star className="h-3 w-3" /> MAIN QUEST
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3
                  className="font-pixel text-[9px] tracking-wide sm:text-[10px]"
                  style={{ color: card.locked ? 'rgba(255,255,255,0.5)' : card.accent }}
                >
                  {card.name}
                </h3>
                <p className="mt-2 min-h-[2.4rem] font-retro text-base leading-tight text-white/65">
                  {card.desc}
                </p>
                <p
                  className={`mt-2 font-pixel text-[7px] tracking-wider ${
                    card.locked ? 'text-white/40' : card.done ? 'text-[#7ee0c3]' : 'text-white/75'
                  }`}
                >
                  {card.status}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* reset progress (two-step confirm so it can never fire by accident) */}
        <button
          onClick={() => {
            if (confirmReset) {
              audio.sfx('unlock');
              onReset();
            } else {
              audio.sfx('miss');
              setConfirmReset(true);
            }
          }}
          className={`mb-8 flex items-center gap-2 rounded-lg border px-4 py-2 font-pixel text-[7px] tracking-widest transition-all active:scale-95 ${
            confirmReset
              ? 'border-[#e05252]/70 bg-[#2a0f14]/80 text-[#ff9c9c] shadow-[0_0_16px_rgba(224,82,82,0.35)]'
              : 'border-white/10 bg-white/[0.03] text-white/35 hover:border-white/25 hover:text-white/60'
          }`}
          aria-label="Reset game progress"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirmReset ? 'TAP AGAIN TO RESET' : 'RESET QUEST'}
        </button>
      </div>
    </div>
  );
}

'use client';

/* =========================================================================
 *  FinaleCinematic — THE SECRET GIFT.
 *  Dark screen → glowing gift box → golden burst → confetti storm →
 *  the personal birthday message. Pure emotional payoff.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react';
import { Heart, RotateCcw, Sparkles } from 'lucide-react';
import { audio } from '@/lib/game/audio';
import { useGameCanvas } from '@/lib/game/canvas';
import { BIRTHDAY_MESSAGE } from '@/lib/game/config';
import { ParticleSystem } from '@/lib/game/particles';
import { drawGoldenGift, drawMoon, drawPixelTextCentered, mulberry32 } from '@/lib/game/sprites';
import { SkyCanvas } from './SkyCanvas';

export interface FinaleCinematicProps {
  onPlayAgain: () => void;
  onBackRoom: () => void;
  onSeen: () => void;
}

const BURST_AT = 3.4; /* seconds */

export function FinaleCinematic({ onPlayAgain, onBackRoom, onSeen }: FinaleCinematicProps) {
  const [burst, setBurst] = useState(false);
  const burstRef = useRef(false);
  /* canvas-elapsed time at the burst moment; -1 = not yet happened */
  const burstAtRef = useRef(-1);
  const particlesRef = useRef<ParticleSystem | null>(null);
  if (particlesRef.current == null) particlesRef.current = new ParticleSystem();

  const seenRef = useRef(false);

  useEffect(() => {
    /* guard: mark the finale as seen exactly once, even if the effect
       re-runs due to a prop identity change */
    if (!seenRef.current) {
      seenRef.current = true;
      onSeen();
    }
    const t1 = setTimeout(() => audio.sfx('portal'), 600);
    const t2 = setTimeout(() => {
      audio.sfx('fanfare');
      audio.sfx('confetti');
      burstRef.current = true;
      setBurst(true);
    }, BURST_AT * 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onSeen]);

  const canvasRef = useGameCanvas(({ ctx, w, h, dt, t }) => {
    const particles = particlesRef.current!;
    const cx = w / 2;
    const baseY = h * 0.68;
    const s = Math.max(2, h / 90);

    /* darkness of the room */
    ctx.fillStyle = '#04050e';
    ctx.fillRect(0, 0, w, h);

    /* faint stars appear after burst */
    if (burstRef.current) {
      const rnd = mulberry32(2024);
      for (let i = 0; i < 46; i++) {
        const sx = rnd() * w;
        const sy = rnd() * h * 0.8;
        const tw = 0.2 + 0.6 * Math.abs(Math.sin(t * (0.4 + rnd()) + i * 1.7));
        ctx.fillStyle = `rgba(240,235,255,${tw * 0.5})`;
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
    }

    /* pre-burst: pulsing seam glow */
    if (!burstRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      const glow = ctx.createRadialGradient(cx, baseY - 12 * s, 0, cx, baseY - 12 * s, 70 * s * (0.7 + pulse * 0.3));
      glow.addColorStop(0, `rgba(255, 214, 120, ${0.10 + pulse * 0.14})`);
      glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      drawGoldenGift(ctx, cx, baseY, s * 0.9, t, 0);
    } else {
      /* record the burst moment on the first frame it is visible */
      if (burstAtRef.current < 0) burstAtRef.current = t;
      const since = t - burstAtRef.current;

      /* burst moment: screen flash */
      if (since < 0.5) {
        ctx.fillStyle = `rgba(255, 240, 200, ${0.75 * (1 - since / 0.5)})`;
        ctx.fillRect(0, 0, w, h);
      }

      /* rotating god rays */
      ctx.save();
      ctx.translate(cx, baseY - 20 * s);
      for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12 + dt * 0.05);
        const ray = ctx.createLinearGradient(0, 0, 0, -h);
        ray.addColorStop(0, 'rgba(255, 220, 140, 0.10)');
        ray.addColorStop(1, 'rgba(255, 220, 140, 0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(-4 * s, 0);
        ctx.lineTo(4 * s, 0);
        ctx.lineTo(40 * s, -h);
        ctx.lineTo(-40 * s, -h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      /* light beam from the box */
      const beam = ctx.createLinearGradient(cx, baseY, cx, 0);
      beam.addColorStop(0, 'rgba(255, 232, 170, 0.42)');
      beam.addColorStop(1, 'rgba(255, 232, 170, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(cx - 16 * s, baseY);
      ctx.lineTo(cx + 16 * s, baseY);
      ctx.lineTo(cx + 60 * s, 0);
      ctx.lineTo(cx - 60 * s, 0);
      ctx.closePath();
      ctx.fill();

      /* the gift, opening over ~0.6s */
      const openAmount = Math.min(1, since / 0.6);
      const shake = since < 0.7 ? (Math.random() - 0.5) * 3 : 0;
      drawGoldenGift(ctx, cx + shake, baseY, s * 0.9, t, openAmount);

      /* continuous celebration: fountains + falling confetti */
      particles.fountain(w, baseY - 6 * s, 90, dt);
      if (Math.random() < 0.5) {
        particles.ember(Math.random() * w, h + 4, Math.random() < 0.7 ? '#ffd45e' : '#f2a2c0');
      }

      /* soft moon watching over the scene */
      drawMoon(ctx, w - 54, 40, 14, t);

      /* pixel text under the box */
      drawPixelTextCentered(ctx, 'FOR YOU', cx, baseY + 12 * s, Math.max(2, Math.round(s * 0.5)), '#ffe9a8');
    }

    particles.update(dt);
    particles.draw(ctx);
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#04050e]">
      {/* dark sky fades in behind after burst */}
      <div
        className={`absolute inset-0 transition-opacity duration-[2500ms] ${burst ? 'opacity-60' : 'opacity-0'}`}
      >
        <SkyCanvas hills={false} />
      </div>

      <canvas
        ref={canvasRef}
        className="pixelated absolute inset-0 h-full w-full"
        style={{ imageRendering: 'pixelated' }}
        aria-label="Birthday surprise"
      />

      {/* THE MESSAGE */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        {burst && (
          <>
            <p className="animate-[riseIn_1.2s_1s_both] font-elegant font-black tracking-wide bg-gradient-to-b from-[#fff6d8] via-[#ffd97a] to-[#d99a1e] bg-clip-text text-[clamp(1rem,3.6vw,2rem)] text-transparent">
              {BIRTHDAY_MESSAGE.introGreetingLine1}
            </p>
            <h1 className="animate-[riseIn_1.2s_1.8s_both] font-elegant font-black leading-tight tracking-wide bg-gradient-to-b from-[#fff6d8] via-[#ffd97a] to-[#d99a1e] bg-clip-text text-[clamp(1.4rem,5vw,2.9rem)] text-transparent">
              {BIRTHDAY_MESSAGE.introGreetingLine2}
            </h1>
            <h2 className="mt-4 animate-[riseIn_1.2s_2.8s_both] font-pixel text-[clamp(0.7rem,2.6vw,1.2rem)] leading-relaxed text-white drop-shadow-[0_0_20px_rgba(200,170,255,0.7)]">
              {BIRTHDAY_MESSAGE.finaleTitle}
            </h2>
            <div className="mt-5 space-y-1.5">
              {BIRTHDAY_MESSAGE.finaleLines.map((line, i) => (
                <p
                  key={i}
                  className="animate-[riseIn_1.2s_both] font-retro text-[clamp(1.1rem,3vw,1.6rem)] leading-snug text-white/90"
                  style={{ animationDelay: `${3.6 + i * 0.7}s` }}
                >
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-6 animate-[fadeIn_1.4s_5.8s_both] flex items-center gap-2 font-elegant text-sm italic text-[#ffd97a]/80">
              <Sparkles className="h-3.5 w-3.5" />
              {BIRTHDAY_MESSAGE.signature}
              <Heart className="h-3.5 w-3.5 fill-[#ffd97a]/80 text-[#ffd97a]/80" />
            </p>

            {/* buttons */}
            <div className="pointer-events-auto mt-8 flex animate-[riseIn_1s_6.6s_both] flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={() => { audio.sfx('click'); onPlayAgain(); }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-8 py-3.5 font-pixel text-[9px] text-[#2a1b04] shadow-[0_0_26px_rgba(247,201,72,0.45)] transition-all hover:brightness-110 active:scale-95 sm:text-[10px]"
              >
                <RotateCcw className="h-4 w-4" /> PLAY AGAIN
              </button>
              <button
                onClick={() => { audio.sfx('click'); onBackRoom(); }}
                className="rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 font-pixel text-[9px] text-white/85 backdrop-blur-sm transition-all hover:border-[#ffd97a]/60 hover:text-[#ffd97a] active:scale-95 sm:text-[10px]"
              >
                BACK TO THE ROOM
              </button>
            </div>
          </>
        )}
      </div>

      {/* pre-burst hint */}
      {!burst && (
        <p className="absolute inset-x-0 bottom-10 text-center animate-[glowPulse_2s_ease-in-out_infinite] font-pixel text-[8px] tracking-[0.3em] text-[#ffd97a]/80">
          SOMETHING IS GLOWING...
        </p>
      )}

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_100%_at_50%_50%,transparent_50%,rgba(2,3,10,0.7)_100%)]" />
    </div>
  );
}

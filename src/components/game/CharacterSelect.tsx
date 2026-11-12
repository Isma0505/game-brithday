'use client';

/* =========================================================================
 *  CharacterSelect — "Ready for your birthday adventure?"
 *  Four pixel-art heroes with idle animations (breathing bob + blink).
 * ========================================================================= */

import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { CHARACTERS, drawSprite, getCharacter, type PixelCharacter } from '@/lib/game/sprites';
import { SkyCanvas } from './SkyCanvas';
import { useLanguage } from '@/lib/game/i18n';

interface CharacterSelectProps {
  initialCharacter: string | null;
  onConfirm: (id: string) => void;
  onBack: () => void;
}

/* Animated character preview canvas (idle bob + periodic blink + aura). */
function CharacterPreview({ char, size = 3 }: { char: PixelCharacter; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 12 * size + 8;
    const H = 16 * size + 10;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let blinkAt = 1.4 + Math.random() * 2;
    let blinkLeft = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      blinkAt -= dt;
      if (blinkAt <= 0) {
        blinkLeft = 0.14;
        blinkAt = 2.2 + Math.random() * 2.4;
      }
      if (blinkLeft > 0) blinkLeft -= dt;

      ctx.clearRect(0, 0, W, H);

      /* aura */
      const bob = Math.sin(t * 2.4) * 1.6;
      const cy = H / 2 + 2;
      const aura = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, W * 0.62);
      aura.addColorStop(0, char.aura);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, W, H);

      /* sparkles */
      for (let i = 0; i < 3; i++) {
        const a = t * (0.7 + i * 0.3) + i * 2.1;
        const sx = W / 2 + Math.cos(a) * W * 0.4;
        const sy = cy + Math.sin(a * 1.3) * H * 0.34;
        ctx.fillStyle = `rgba(255,224,150,${0.4 + 0.4 * Math.sin(t * 4 + i * 2)})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      const sprite = blinkLeft > 0 ? char.blink : char.idle;
      drawSprite(ctx, sprite, (W - sprite.w * size) / 2, (H - sprite.h * size) / 2 + bob, size);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [char, size]);

  return <canvas ref={canvasRef} className="pixelated h-full w-full object-contain" style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

export function CharacterSelect({ initialCharacter, onConfirm, onBack }: CharacterSelectProps) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<string | null>(initialCharacter);

  const choose = (id: string) => {
    audio.sfx('hover');
    setSelected(id);
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SkyCanvas hills={false} />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(110%_90%_at_50%_40%,transparent_55%,rgba(4,6,18,0.6)_100%)]" />

      {/* back */}
      <button
        onClick={() => { audio.sfx('click'); onBack(); }}
        className="group absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/15 bg-[#14102b]/80 px-3 py-2 font-pixel text-[8px] text-white/80 backdrop-blur-sm transition-all hover:border-[#ffd97a]/50 hover:text-[#ffd97a] active:scale-95"
        aria-label={language === 'id' ? 'Kembali' : 'Back'}
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> {language === 'id' ? 'KEMBALI' : 'BACK'}
      </button>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 py-16 sm:gap-7">
        <header className="text-center">
          <h1 className="font-pixel text-sm text-[#ffd97a] drop-shadow-[0_0_12px_rgba(247,201,72,0.6)] sm:text-xl">
            {language === 'id' ? 'PILIH PAHLAWANMU' : 'CHOOSE YOUR HERO'}
          </h1>
          <p className="mt-3 font-elegant text-base text-white/85 sm:text-lg">
            {language === 'id' ? 'Siap untuk petualangan ulang tahunmu?' : 'Ready for your birthday adventure?'}
          </p>
          <p className="font-retro text-lg text-white/50">
            {language === 'id' ? 'Pilih teman — mereka semua mendukungmu.' : 'Pick a companion — each one is cheering for you.'}
          </p>
        </header>

        {/* cards */}
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CHARACTERS.map((c) => {
            const isSel = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                onMouseEnter={() => audio.sfx('hover')}
                className={`group relative flex flex-col items-center rounded-2xl border p-3 pb-4 transition-all duration-300 active:scale-[0.97] sm:p-4 ${
                  isSel
                    ? '-translate-y-1 border-[#ffd97a]/80 bg-[#1c1440]/90 shadow-[0_0_34px_rgba(247,201,72,0.3)]'
                    : 'border-white/12 bg-[#14102b]/75 hover:-translate-y-0.5 hover:border-white/30'
                }`}
                aria-pressed={isSel}
              >
                <div className="h-20 w-20 sm:h-24 sm:w-24">
                  <CharacterPreview char={c} />
                </div>
                <span className="mt-2 font-pixel text-[9px] text-white sm:text-[10px]">{c.name.toUpperCase()}</span>
                <span className="mt-1 font-elegant text-[11px] italic text-[#cabdfd] sm:text-xs">{c.title}</span>
                <span className="mt-1.5 hidden font-retro text-sm leading-tight text-white/55 sm:block">{c.trait}</span>
                {isSel && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-[#ffd97a]/70 bg-[#2a1b04] px-2 py-0.5 font-pixel text-[6px] text-[#ffd97a] shadow-[0_0_12px_rgba(247,201,72,0.6)]">
                    {language === 'id' ? 'DIPILIH' : 'SELECTED'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* confirm */}
        <button
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            audio.sfx('gift');
            onConfirm(selected);
          }}
          className={`rounded-xl px-10 py-4 font-pixel text-[10px] transition-all sm:text-xs ${
            selected
              ? 'animate-[glowPulse_2.2s_ease-in-out_infinite] bg-gradient-to-b from-[#ffd97a] to-[#e8a528] text-[#2a1b04] shadow-[0_0_28px_rgba(247,201,72,0.45)] hover:brightness-110 active:scale-95'
              : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/30'
          }`}
        >
          {selected
            ? `${language === 'id' ? 'MULAI SEBAGAI' : 'BEGIN AS'} ${getCharacter(selected).name.toUpperCase()}`
            : (language === 'id' ? 'PILIH PAHLAWAN' : 'SELECT A HERO')}
        </button>
      </div>
    </div>
  );
}

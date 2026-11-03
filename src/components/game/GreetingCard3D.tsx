'use client';

/* =========================================================================
 *  GreetingCard3D — A LETTER FOR YOU.
 *  A sealed letter floats in the night sky. Break the golden wax seal and
 *  the cover swings open in real 3D (CSS perspective) revealing the
 *  personal birthday message. Desktop gets pointer-tilt parallax,
 *  mobile gets the same experience via simple taps.
 * ========================================================================= */

import { Heart, MailOpen, RotateCcw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { BIRTHDAY_MESSAGE } from '@/lib/game/config';
import { GameFrame } from './GameFrame';
import { SkyCanvas } from './SkyCanvas';

export interface GreetingCard3DProps {
  onBack: () => void;
  onOpened: () => void;
}

export function GreetingCard3D({ onBack, onOpened }: GreetingCard3DProps) {
  const [sealBroken, setSealBroken] = useState(false);
  const [opened, setOpened] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const openedRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const openCard = useCallback(() => {
    if (opened || sealBroken) return;
    audio.sfx('unlock');
    setSealBroken(true);
    timers.current.push(
      window.setTimeout(() => {
        setOpened(true);
        audio.sfx('wish');
        audio.sfx('confetti');
        if (!openedRef.current) {
          openedRef.current = true;
          onOpened();
        }
      }, 420),
    );
  }, [opened, sealBroken, onOpened]);

  const closeCard = useCallback(() => {
    if (!opened) return;
    audio.sfx('click');
    setOpened(false);
    setSealBroken(false);
  }, [opened]);

  /* desktop pointer-tilt (touch devices simply skip this) */
  const onTiltMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  }, []);
  const onTiltLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  /* golden specks drifting around the scene */
  const specks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 3 + Math.random() * 94,
        bottom: Math.random() * 34,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 4,
        size: 2 + Math.random() * 2.6,
      })),
    [],
  );

  return (
    <GameFrame title={BIRTHDAY_MESSAGE.cardTitle} onBack={onBack}>
      <div className="absolute inset-0 select-none overflow-hidden">
        <SkyCanvas />
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_55%_at_50%_42%,rgba(120,90,220,0.18),transparent_70%)]" />

        {/* drifting golden specks */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {specks.map((s) => (
            <span
              key={s.id}
              className="absolute rounded-full bg-[#ffd97a]"
              style={{
                left: `${s.left}%`,
                bottom: `${s.bottom}%`,
                width: s.size,
                height: s.size,
                animation: `goldDrift ${s.duration}s linear ${s.delay}s infinite`,
                boxShadow: '0 0 6px rgba(255,215,120,0.8)',
              }}
            />
          ))}
        </div>

        {/* ============================ THE 3D CARD ========================= */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-14 [perspective:1500px]">
          <div className="[animation:floaty_5s_ease-in-out_infinite]">
            <div
              className="relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
              style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
              onPointerMove={onTiltMove}
              onPointerLeave={onTiltLeave}
            >
              <div
                className="relative h-[min(108vw,58vh,430px)] w-[min(82vw,44vh,325px)] rounded-xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] [transform-style:preserve-3d]"
              >
                {/* ============ inside base: left art + right message ============ */}
                <div className="absolute inset-0 grid grid-cols-2 overflow-hidden rounded-xl border border-[#ffd97a]/25 bg-[#191238]">
                  {/* left inner panel */}
                  <div className="relative m-1.5 rounded-lg bg-gradient-to-br from-[#241a4a] to-[#14102b]">
                    <div className="absolute inset-2 rounded-md border border-[#ffd97a]/20" />
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-3">
                      <Heart className="h-7 w-7 animate-[glowPulse_2.4s_ease-in-out_infinite] fill-[#f2a2c0] text-[#f2a2c0]" />
                      <Sparkles className="h-4 w-4 text-[#ffd97a]/80" />
                      <p className="text-center font-elegant text-xs italic leading-snug text-white/60">
                        one night,
                        <br /> one quest,
                        <br /> one gift —
                        <br /> all for you
                      </p>
                    </div>
                  </div>

                  {/* right inner panel — THE MESSAGE */}
                  <div className={`relative m-1.5 rounded-lg bg-gradient-to-br from-[#fdf6e8] to-[#f3e6cc] ${opened ? 'animate-[fadeIn_0.8s_both]' : 'opacity-100'}`}>
                    <div className="absolute inset-2 rounded-md border border-[#c9a24a]/40" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-1 overflow-hidden px-3 py-4 text-center">
                      <p className="animate-[riseIn_0.7s_0.55s_both] font-elegant text-[11px] italic text-[#7a5a18]">
                        {BIRTHDAY_MESSAGE.cardGreeting} {BIRTHDAY_MESSAGE.brotherName},
                      </p>
                      <p className="animate-[riseIn_0.7s_0.75s_both] font-elegant text-base font-black leading-tight tracking-wide bg-gradient-to-b from-[#a8721c] via-[#8a5a10] to-[#6b440a] bg-clip-text text-transparent sm:text-lg">
                        {BIRTHDAY_MESSAGE.introGreetingLine1}
                      </p>
                      <p className="animate-[riseIn_0.7s_0.95s_both] font-elegant text-lg font-black leading-tight tracking-wide bg-gradient-to-b from-[#a8721c] via-[#8a5a10] to-[#6b440a] bg-clip-text text-transparent sm:text-xl">
                        {BIRTHDAY_MESSAGE.introGreetingLine2}
                      </p>
                      <span className="my-1.5 block h-px w-12 animate-[fadeIn_0.8s_1.15s_both] bg-[#c9a24a]" />
                      <div className="space-y-1">
                        {BIRTHDAY_MESSAGE.finaleLines.map((line, i) => (
                          <p
                            key={i}
                            className="animate-[riseIn_0.7s_both] font-elegant text-[10px] italic leading-snug text-[#4a3a20] sm:text-xs"
                            style={{ animationDelay: `${1.25 + i * 0.35}s` }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                      <p className="mt-2 animate-[fadeIn_1s_2.4s_both] flex items-center gap-1 font-elegant text-[9px] italic text-[#8a6a2a]">
                        <Heart className="h-2.5 w-2.5 fill-[#c96a8a] text-[#c96a8a]" />
                        {BIRTHDAY_MESSAGE.signature}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ============ swinging cover ============ */}
                <button
                  onClick={openCard}
                  disabled={opened || sealBroken}
                  aria-label={opened ? 'Card opened' : 'Open the birthday card'}
                  className={`absolute inset-0 rounded-xl [transform-origin:left_center] [transform-style:preserve-3d] outline-none transition-transform duration-[1100ms] [transition-timing-function:cubic-bezier(0.30,0.9,0.35,1.05)] focus-visible:ring-2 focus-visible:ring-[#ffd97a] ${
                    opened ? 'pointer-events-none [transform:rotateY(-165deg)]' : 'cursor-pointer'
                  }`}
                >
                  {/* cover FRONT (seen when closed) */}
                  <span className="absolute inset-0 overflow-hidden rounded-xl border border-[#ffd97a]/45 bg-gradient-to-br from-[#2a1e56] via-[#1c1440] to-[#120c2e] [backface-visibility:hidden]">
                    <span className="absolute inset-2.5 rounded-lg border border-[#ffd97a]/30" />
                    <span className="absolute inset-0 [background:radial-gradient(65%_45%_at_50%_36%,rgba(247,201,72,0.14),transparent_70%)]" />
                    {/* corner stars */}
                    {[
                      { l: '10%', t: '9%', s: 10 }, { l: '86%', t: '13%', s: 7 },
                      { l: '14%', t: '86%', s: 7 }, { l: '84%', t: '83%', s: 10 },
                    ].map((st, i) => (
                      <Sparkles
                        key={i}
                        className="absolute text-[#ffd97a]/70"
                        style={{ left: st.l, top: st.t, width: st.s, height: st.s }}
                      />
                    ))}
                    <span className="relative flex h-full flex-col items-center justify-center gap-4 p-6">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ffd97a]/60 bg-[#120c2e]/80 shadow-[0_0_26px_rgba(247,201,72,0.35)]">
                        <Heart className="h-7 w-7 animate-[glowPulse_2.6s_ease-in-out_infinite] fill-[#ffd97a] text-[#ffd97a]" />
                      </span>
                      <span className="font-pixel text-[10px] tracking-[0.3em] text-[#ffd97a] drop-shadow-[0_0_10px_rgba(247,201,72,0.7)]">
                        {BIRTHDAY_MESSAGE.cardCoverText}
                      </span>
                      <span className="font-elegant text-sm italic text-white/65">
                        a secret birthday quest, from someone who loves you
                      </span>
                    </span>
                    {/* wax seal */}
                    <span
                      className={`absolute bottom-6 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#e8b64c] bg-gradient-to-br from-[#ffd97a] via-[#e8a528] to-[#b9822a] shadow-[0_0_22px_rgba(247,201,72,0.55),inset_0_2px_6px_rgba(255,255,255,0.55)] transition-all duration-500 ${
                        sealBroken ? 'scale-[1.7] rotate-45 opacity-0' : 'animate-[floaty_3.4s_ease-in-out_infinite]'
                      }`}
                    >
                      <Heart className="h-5 w-5 fill-[#7a4a10] text-[#7a4a10]" />
                    </span>
                  </span>

                  {/* cover BACK (seen after it swings open) */}
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3a2b6e] to-[#241a4a] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <span className="absolute inset-2.5 rounded-lg border border-[#ffd97a]/25" />
                    <span className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(45deg,transparent_0_14px,rgba(247,201,72,0.12)_14px_16px)]" />
                    <span className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#ffd97a]/40 bg-[#120c2e]/70">
                      <Heart className="h-4 w-4 fill-[#ffd97a]/70 text-[#ffd97a]/70" />
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div className="pointer-events-auto mt-7 flex items-center gap-3">
            {!opened ? (
              <button
                onClick={openCard}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#ffe9a8] via-[#ffd97a] to-[#e8a528] px-7 py-3.5 font-pixel text-[9px] text-[#2a1b04] shadow-[0_0_28px_rgba(247,201,72,0.5)] transition-all animate-[glowPulse_2.2s_ease-in-out_infinite] hover:brightness-110 active:scale-95 sm:text-[10px]"
              >
                <MailOpen className="h-4 w-4" /> BREAK THE SEAL
              </button>
            ) : (
              <button
                onClick={closeCard}
                className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-pixel text-[9px] text-white/85 backdrop-blur-sm transition-all hover:border-[#ffd97a]/60 hover:text-[#ffd97a] active:scale-95 sm:text-[10px]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> CLOSE THE CARD
              </button>
            )}
          </div>

          {!opened && !sealBroken && (
            <p className="mt-3 animate-[glowPulse_2s_ease-in-out_infinite] font-pixel text-[7px] tracking-[0.3em] text-[#ffd97a]/75">
              TAP THE CARD TO OPEN IT
            </p>
          )}
        </div>
      </div>
    </GameFrame>
  );
}

'use client';

/* =========================================================================
 *  LoadingScreen — "Kindling the stars..." premium boot sequence.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react';
import { SkyCanvas } from './SkyCanvas';

const STEPS = [
  'Kindling the starlight...',
  'Wrapping the presents...',
  'Frosting the cake...',
  'Waking the moon...',
  'Opening the portal...',
];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let p = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      /* ease towards 100 with varying speed for a organic feel */
      const speed = p < 60 ? 46 : p < 85 ? 30 : 38;
      p = Math.min(100, p + speed * dt);
      setProgress(p);
      if (p >= 100) {
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(onDone, 420);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const stepIndex = Math.min(STEPS.length - 1, Math.floor((progress / 100) * STEPS.length));

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SkyCanvas hills={false} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-8">
        {/* spinning star */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-[spinSlow_3.2s_linear_infinite]">
            <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-[0_0_12px_rgba(247,201,72,0.8)]">
              <path
                d="M20 2 L23.5 15.5 L37 20 L23.5 24.5 L20 38 L16.5 24.5 L3 20 L16.5 15.5 Z"
                fill="#ffd97a"
              />
              <circle cx="20" cy="20" r="3.4" fill="#fff6d8" />
            </svg>
          </div>
          <div className="absolute inset-[-8px] animate-[glowPulse_2s_ease-in-out_infinite] rounded-full bg-[#ffd97a]/15 blur-xl" />
        </div>

        <div className="text-center">
          <p className="font-pixel text-[10px] tracking-[0.3em] text-[#ffd97a] drop-shadow-[0_0_10px_rgba(247,201,72,0.6)] sm:text-xs">
            BIRTHDAY QUEST
          </p>
          <p className="mt-2 font-elegant text-sm italic tracking-wide text-white/60">
            The Secret Gift
          </p>
        </div>

        {/* progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2.5 overflow-hidden rounded-full border border-white/15 bg-[#14102b]/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c98f1b] via-[#ffd97a] to-[#fff3c4] shadow-[0_0_14px_rgba(247,201,72,0.7)] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-retro text-base text-white/70">{STEPS[stepIndex]}</span>
            <span className="font-pixel text-[8px] text-[#ffd97a]/80">{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

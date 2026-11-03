'use client';

/* =========================================================================
 *  GameFrame — shared chrome for mini-games:
 *  top HUD bar (back / title / custom HUD), bottom hint, vignette.
 *  Also exports ResultCard shown when a mini-game is completed.
 * ========================================================================= */

import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { audio } from '@/lib/game/audio';

interface GameFrameProps {
  title: string;
  hint?: string;
  hud?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

export function GameFrame({ title, hint, hud, onBack, children }: GameFrameProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070a18]">
      {children}

      {/* top HUD */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-gradient-to-b from-[#070a18]/90 to-transparent px-3 py-3 sm:px-5">
        {onBack ? (
          <button
            onClick={() => { audio.sfx('click'); onBack(); }}
            className="group flex items-center gap-2 rounded-lg border border-white/15 bg-[#14102b]/80 px-3 py-2 text-[10px] font-pixel text-white/85 backdrop-blur-sm transition-all hover:border-[#ffd97a]/50 hover:text-[#ffd97a] active:scale-95"
            aria-label="Back to the fair"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">FAIR</span>
          </button>
        ) : <div />}
        <div className="min-w-0 flex-1 text-center">
          <span className="font-pixel text-[9px] tracking-wider text-[#ffd97a] drop-shadow-[0_0_8px_rgba(247,201,72,0.6)] sm:text-[10px]">
            {title}
          </span>
          {hud}
        </div>
        <div className="w-[52px] sm:w-[86px]" />
      </div>

      {/* bottom hint */}
      {hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-2">
          <span className="rounded-md bg-black/45 px-3 py-1 font-pixel text-[7px] tracking-wide text-white/55 sm:text-[8px]">
            {hint}
          </span>
        </div>
      )}

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 [background:radial-gradient(120%_100%_at_50%_45%,transparent_55%,rgba(4,6,20,0.55)_100%)]" />
    </div>
  );
}

/* ------------------------------------------------------------ result card */

interface ResultCardProps {
  title: string;
  lines: string[];
  onReplay: () => void;
  onExit: () => void;
  replayLabel?: string;
  exitLabel?: string;
}

export function ResultCard({
  title, lines, onReplay, onExit,
  replayLabel = 'PLAY AGAIN', exitLabel = 'BACK TO FAIR',
}: ResultCardProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#070a18]/70 backdrop-blur-[3px]">
      <div className="mx-4 w-full max-w-sm animate-[riseIn_0.45s_ease-out_both] rounded-2xl border border-[#ffd97a]/40 bg-[#14102b]/95 p-6 text-center shadow-[0_0_50px_rgba(247,201,72,0.25)]">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#ffd97a] shadow-[0_0_12px_rgba(247,201,72,0.8)]" />
        <h2 className="font-pixel text-sm text-[#ffd97a] drop-shadow-[0_0_10px_rgba(247,201,72,0.5)]">
          {title}
        </h2>
        <div className="mt-4 space-y-1.5">
          {lines.map((line, i) => (
            <p key={i} className="font-retro text-lg leading-tight text-white/85">{line}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => { audio.sfx('click'); onReplay(); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-5 py-3 font-pixel text-[9px] text-[#2a1b04] shadow-[0_4px_20px_rgba(247,201,72,0.45)] transition-all hover:brightness-110 hover:shadow-[0_4px_28px_rgba(247,201,72,0.65)] active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {replayLabel}
          </button>
          <button
            onClick={() => { audio.sfx('click'); onExit(); }}
            className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-pixel text-[9px] text-white/85 transition-all hover:border-[#ffd97a]/50 hover:text-[#ffd97a] active:scale-95"
          >
            {exitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

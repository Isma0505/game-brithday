'use client';

/* =========================================================================
 *  IntroScreen — the big cinematic opening.
 *  Shows the grand birthday greeting letter-by-letter, the game title,
 *  and the glowing START ADVENTURE button.
 * ========================================================================= */

import { Crown, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { BIRTHDAY_MESSAGE, GAME_SUBTITLE, GAME_TITLE } from '@/lib/game/config';
import { DEFAULT_PROGRESS, type GameProgress } from '@/lib/game/storage';
import { SkyCanvas } from './SkyCanvas';
import { useLanguage } from '@/lib/game/i18n';

interface IntroScreenProps {
  progress: GameProgress;
  onStart: () => void;      // go to character select
  onContinue: () => void;   // resume → hub
  onNewGame: () => void;    // reset save → character select
}

function GreetingLine({ text, delayBase, className }: { text: string; delayBase: number; className?: string }) {
  return (
    <span className={`block ${className ?? ''}`} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          /* gradient lives on each letter: a transformed child breaks
             background-clip:text on the parent, so the line-level clip
             would render the whole greeting invisible */
          className="animate-letter-in inline-block whitespace-pre bg-gradient-to-b from-[#fff6d8] via-[#ffd97a] to-[#d99a1e] bg-clip-text text-transparent"
          style={{ animationDelay: `${delayBase + i * 45}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export function IntroScreen({ progress, onStart, onContinue, onNewGame }: IntroScreenProps) {
  const { language } = useLanguage();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const hasSave = progress.character !== null && (progress.trailStars.length > 0 || progress.balloonDone || progress.giftsDone || progress.trailDone);
  const fiveGamesDone = progress.trailDone && progress.balloonDone && progress.giftsDone && progress.lanternDone && progress.memoryDone;

  /* staggered reveal: greeting → title → menu */
  useEffect(() => {
    const t = setTimeout(() => setShowMenu(true), 2300);
    return () => clearTimeout(t);
  }, []);

  /* subtle 3D tilt following the pointer */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const rx = (e.clientY / window.innerHeight - 0.5) * -5;
      const ry = (e.clientX / window.innerWidth - 0.5) * 7;
      el.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SkyCanvas />

      {/* deep vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(115%_90%_at_50%_42%,transparent_52%,rgba(4,6,18,0.72)_100%)]" />

      <div
        ref={cardRef}
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 py-8 text-center transition-transform duration-300 ease-out will-change-transform"
      >
        {/* crown */}
        <div className={`animate-[floaty_3.4s_ease-in-out_infinite] ${showMenu ? 'opacity-90' : ''}`}>
          <Crown className="h-8 w-8 text-[#ffd97a] drop-shadow-[0_0_14px_rgba(247,201,72,0.9)] sm:h-10 sm:w-10" strokeWidth={1.6} />
        </div>

        {/* GRAND GREETING */}
        <h1 className="font-elegant font-black leading-tight tracking-wide drop-shadow-[0_2px_18px_rgba(247,201,72,0.4)]">
          <GreetingLine text={language === 'id' ? 'SELAMAT ULANG TAHUN' : BIRTHDAY_MESSAGE.introGreetingLine1} delayBase={200} className="text-[clamp(1.15rem,4.2vw,2.4rem)]" />
          <GreetingLine
            text={language === 'id' ? 'KAKAKU SAYANG' : BIRTHDAY_MESSAGE.introGreetingLine2}
            delayBase={1100}
            className="mt-1 text-[clamp(1.5rem,6vw,3.4rem)] drop-shadow-[0_4px_24px_rgba(247,201,72,0.5)]"
          />
        </h1>

        {/* pixel divider */}
        <div
          className="mt-1 flex items-center gap-2 opacity-0 animate-[fadeIn_1s_1.9s_both]"
          aria-hidden="true"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#ffd97a]/70 sm:w-16" />
          <Sparkles className="h-4 w-4 text-[#ffd97a]/90" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#ffd97a]/70 sm:w-16" />
        </div>

        {/* GAME TITLE */}
        <div className="opacity-0 animate-[riseIn_0.9s_2s_both]">
          <h2 className="font-pixel text-[clamp(0.85rem,3vw,1.5rem)] tracking-wider text-white drop-shadow-[0_0_18px_rgba(160,130,255,0.65)]">
            {GAME_TITLE.toUpperCase()}
          </h2>
          <p className="mt-2 font-elegant text-sm italic tracking-[0.2em] text-[#cabdfd] sm:text-base">
            — {language === 'id' ? 'HADIAH RAHASIA' : GAME_SUBTITLE} —
          </p>
        </div>

        {/* SUBTITLES */}
        <div className="mt-1 min-h-[3.4rem] opacity-0 animate-[fadeIn_1s_2.4s_both]">
          <p className="font-elegant text-base text-white/90 sm:text-lg">{language === 'id' ? 'Petualangan khusus untukmu' : BIRTHDAY_MESSAGE.introSubtitle1}</p>
          <p className="mt-1 font-retro text-lg text-[#9fe8d8] sm:text-xl">{language === 'id' ? 'Hari ini bukan hari biasa...' : BIRTHDAY_MESSAGE.introSubtitle2}</p>
          {hasSave && !fiveGamesDone && (
            <p className="mx-auto mt-3 max-w-sm font-retro text-base leading-tight text-[#ffd97a]">
              {language === 'id'
                ? 'Selesaikan 5 game dan lihatlah kejutan yang akan menanti!'
                : 'Complete 5 games and discover the surprise waiting for you!'}
            </p>
          )}
          {hasSave && fiveGamesDone && !progress.portalDone && (
            <p className="mx-auto mt-3 max-w-sm font-retro text-base leading-tight text-[#ffd97a]">
              {language === 'id'
                ? 'Semua 5 game selesai! Portal emas sudah menunggumu.'
                : 'All 5 games are complete! The Golden Portal is waiting.'}
            </p>
          )}
        </div>

        {/* MENU */}
        <div className={`mt-2 flex flex-col items-center gap-3 transition-all duration-700 ${showMenu ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {hasSave ? (
            <>
              <button
                onClick={() => { audio.sfx('click'); onContinue(); }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-10 py-4 font-pixel text-[11px] text-[#2a1b04] shadow-[0_0_30px_rgba(247,201,72,0.45)] transition-all animate-[glowPulse_2.2s_ease-in-out_infinite] hover:brightness-110 active:scale-95 sm:text-xs"
              >
                <span className="relative z-10">
                  {fiveGamesDone && !progress.portalDone
                    ? (language === 'id' ? 'AYO MULAI' : "LET'S START")
                    : (language === 'id' ? 'LANJUTKAN PETUALANGAN' : 'CONTINUE ADVENTURE')}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
              <button
                onClick={() => { audio.sfx('click'); onNewGame(); }}
                className="font-pixel text-[8px] tracking-widest text-white/45 underline-offset-4 transition-colors hover:text-[#ffd97a] hover:underline sm:text-[9px]"
              >
                {language === 'id' ? 'MULAI PERMAINAN BARU' : 'START A NEW GAME'}
              </button>
            </>
          ) : (
            <button
              onClick={() => { audio.sfx('click'); onStart(); }}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-10 py-4 font-pixel text-[11px] text-[#2a1b04] shadow-[0_0_30px_rgba(247,201,72,0.45)] transition-all animate-[glowPulse_2.2s_ease-in-out_infinite] hover:brightness-110 active:scale-95 sm:text-sm"
            >
              <span className="relative z-10">{language === 'id' ? 'MULAI PETUALANGAN' : 'START ADVENTURE'}</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          )}
        </div>

        {/* signature */}
        <p className="absolute bottom-4 left-0 right-0 font-retro text-base text-white/35 sm:bottom-5">
          {BIRTHDAY_MESSAGE.signature}
        </p>
      </div>
    </div>
  );
}

export function progressIsEmpty(p: GameProgress): boolean {
  return JSON.stringify(p) === JSON.stringify({ ...DEFAULT_PROGRESS, muted: p.muted });
}

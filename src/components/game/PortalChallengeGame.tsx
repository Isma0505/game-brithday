'use client';

import { Heart, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { useLanguage } from '@/lib/game/i18n';
import { GameFrame } from './GameFrame';

const TOTAL_SIGILS = 12;

interface SigilPosition {
  left: number;
  top: number;
}

function nextPosition(): SigilPosition {
  return {
    left: 12 + Math.random() * 76,
    top: 20 + Math.random() * 58,
  };
}

export function PortalChallengeGame({
  onBack,
  onComplete,
  onEnterRoom,
}: {
  onBack: () => void;
  onComplete: () => void;
  onEnterRoom: () => void;
}) {
  const [collected, setCollected] = useState(0);
  const [position, setPosition] = useState<SigilPosition>(() => nextPosition());
  const [completed, setCompleted] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    audio.playTrack('quest');
  }, []);

  const collectSigil = useCallback(() => {
    if (completed) return;
    audio.sfx('sparkle');
    setCollected((current) => {
      const next = current + 1;
      if (next >= TOTAL_SIGILS) {
        setCompleted(true);
        onComplete();
        audio.sfx('fanfare');
      } else {
        setPosition(nextPosition());
      }
      return next;
    });
  }, [completed, onComplete]);

  const reset = useCallback(() => {
    setCollected(0);
    setPosition(nextPosition());
    setCompleted(false);
  }, []);

  return (
    <GameFrame
      title={t('PORTAL SIGIL')}
      hint={t('TAP THE GOLDEN SIGIL BEFORE IT MOVES')}
      hud={
        <p className="mt-1 font-pixel text-[8px] tracking-widest text-[#ffd97a]">
          {t('SIGILS')} {collected}/{TOTAL_SIGILS}
        </p>
      }
      onBack={onBack}
    >
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#312258_0%,#070a18_72%)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[min(70vw,70vh)] w-[min(70vw,70vh)] rounded-full border border-[#ffd97a]/20 shadow-[0_0_80px_rgba(247,201,72,0.18),inset_0_0_80px_rgba(167,139,250,0.14)]" />
        </div>
        {!completed && (
          <button
            type="button"
            aria-label={language === 'id' ? 'Kumpulkan sigil emas' : 'Collect golden sigil'}
            onClick={collectSigil}
            className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border-2 border-[#ffe9a8] bg-[#3a2b12]/90 text-[#ffd97a] shadow-[0_0_34px_rgba(247,201,72,0.8)] transition-transform active:scale-90"
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            <Sparkles className="h-9 w-9 animate-[glowPulse_1.2s_ease-in-out_infinite]" />
          </button>
        )}
        {completed && (
          <div className="absolute inset-0 z-30 overflow-hidden bg-[#070a18]/55">
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className="absolute bottom-[-12%] h-12 w-10 rounded-[50%] border-2 shadow-[0_0_18px_rgba(255,217,122,0.45)] animate-[balloonRise_7s_linear_infinite]"
                  style={{
                    left: `${3 + (i * 7.3) % 94}%`,
                    animationDelay: `${(i % 7) * -0.75}s`,
                    background: ['#f2a2c0', '#f7c948', '#a78bfa', '#7ee0c3'][i % 4],
                    borderColor: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span className="absolute left-1/2 top-full h-20 w-px bg-white/35" />
                </span>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center px-4 py-16">
              <div className="w-full max-w-sm animate-[riseIn_0.65s_ease-out_both] rounded-3xl border border-[#ffd97a]/60 bg-[#14102b]/95 p-5 text-center shadow-[0_0_60px_rgba(247,201,72,0.35)]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#3a2b12] text-[#ffd97a] shadow-[0_0_22px_rgba(247,201,72,0.6)]">
                  <Heart className="h-6 w-6 fill-[#f2a2c0] text-[#f2a2c0]" />
                </div>
                <h2 className="font-pixel text-sm text-[#ffd97a] drop-shadow-[0_0_10px_rgba(247,201,72,0.6)]">
                  {language === 'id' ? 'KEJUTAN TERBUKA!' : 'SURPRISE UNLOCKED!'}
                </h2>
                <div className="mx-auto mt-4 rounded-2xl border border-[#c9a24a]/55 bg-gradient-to-br from-[#fff5d8] to-[#f3dfb2] p-4 text-[#5b4216] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                  <p className="font-elegant text-xl font-bold">
                    {language === 'id' ? 'Selamat Ulang Tahun!' : 'Happy Birthday!'}
                  </p>
                  <p className="mt-2 font-elegant text-sm italic leading-relaxed">
                    {language === 'id'
                      ? 'Semoga hari istimewamu dipenuhi kebahagiaan, cinta, dan kejutan indah.'
                      : 'May your special day be filled with happiness, love, and wonderful surprises.'}
                  </p>
                  <p className="mt-3 flex items-center justify-center gap-1 font-elegant text-xs">
                    <Heart className="h-3 w-3 fill-[#c96a8a] text-[#c96a8a]" />
                    {language === 'id' ? 'Dengan cinta untukmu' : 'With love, just for you'}
                  </p>
                </div>
                <p className="mt-4 font-retro text-lg text-white/80">
                  {language === 'id' ? '12 sigil emas terkumpul!' : 'All 12 golden sigils collected!'}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={onEnterRoom}
                    className="rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-5 py-3 font-pixel text-[9px] text-[#2a1b04] shadow-[0_4px_20px_rgba(247,201,72,0.45)] active:scale-95"
                  >
                    {t('ENTER BIRTHDAY ROOM')}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-xl border border-white/20 px-5 py-3 font-pixel text-[9px] text-white/80 active:scale-95"
                  >
                    {language === 'id' ? 'MAIN LAGI' : 'PLAY AGAIN'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  );
}

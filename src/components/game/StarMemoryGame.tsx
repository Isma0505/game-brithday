'use client';

import { useState } from 'react';
import { audio } from '@/lib/game/audio';
import { useLanguage } from '@/lib/game/i18n';
import { GameFrame, ResultCard } from './GameFrame';

const SYMBOLS = ['★', '☾', '✦', '♥'];
const CARDS = ['★', '☾', '✦', '♥', '✦', '★', '♥', '☾'];

export function StarMemoryGame({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const done = matched.length === CARDS.length;

  const choose = (index: number) => {
    if (locked || open.includes(index) || matched.includes(index) || done) return;
    audio.sfx('click');
    const nextOpen = [...open, index];
    setOpen(nextOpen);
    if (nextOpen.length !== 2) return;
    setLocked(true);
    const [a, b] = nextOpen;
    window.setTimeout(() => {
      if (CARDS[a] === CARDS[b]) {
        audio.sfx('sparkle');
        setMatched((current) => {
          const next = [...current, a, b];
          if (next.length === CARDS.length) {
            audio.sfx('fanfare');
            onComplete();
          }
          return next;
        });
      }
      setOpen([]);
      setLocked(false);
    }, 550);
  };

  return (
    <GameFrame
      title={language === 'id' ? 'MEMORI BINTANG' : 'STAR MEMORY'}
      hint={language === 'id' ? 'TEMUKAN SEMUA PASANGAN SIMBOL' : 'FIND ALL MATCHING SYMBOLS'}
      hud={<p className="mt-1 font-pixel text-[8px] tracking-widest text-[#ffd97a]">{language === 'id' ? 'PASANGAN' : 'PAIRS'} {matched.length / 2}/{SYMBOLS.length}</p>}
      onBack={onBack}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,#312258_0%,#070a18_72%)] p-6">
        <div className="grid w-full max-w-sm grid-cols-4 gap-3">
          {CARDS.map((symbol, index) => {
            const visible = open.includes(index) || matched.includes(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => choose(index)}
                className={`aspect-square rounded-xl border-2 font-elegant text-3xl transition-all active:scale-95 ${
                  visible ? 'border-[#ffd97a] bg-[#3a2b12] text-[#ffd97a]' : 'border-[#a78bfa]/50 bg-[#14102b] text-transparent'
                }`}
              >
                {visible ? symbol : '?'}
              </button>
            );
          })}
        </div>
        {done && (
          <ResultCard
            title={language === 'id' ? 'MEMORI SELESAI!' : 'MEMORY COMPLETE!'}
            lines={[language === 'id' ? 'Semua pasangan bintang ditemukan.' : 'All star pairs found.']}
            onReplay={onBack}
            onExit={onBack}
          />
        )}
      </div>
    </GameFrame>
  );
}

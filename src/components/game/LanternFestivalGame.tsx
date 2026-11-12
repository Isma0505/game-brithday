'use client';

import { Gem, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { useLanguage } from '@/lib/game/i18n';
import { GameFrame, ResultCard } from './GameFrame';

const ROUND_TOTAL = 18;
const ROUND_SECONDS = 45;
const COLORS = [
  { name: 'rose', label: { id: 'MERAH MUDA', en: 'ROSE' }, color: '#f2a2c0', glow: '#e86d9b' },
  { name: 'gold', label: { id: 'EMAS', en: 'GOLD' }, color: '#f7c948', glow: '#e8a528' },
  { name: 'violet', label: { id: 'UNGU', en: 'VIOLET' }, color: '#a78bfa', glow: '#7658db' },
  { name: 'mint', label: { id: 'MINT', en: 'MINT' }, color: '#7ee0c3', glow: '#42b994' },
] as const;

interface Crystal {
  id: number;
  color: typeof COLORS[number];
  left: number;
  top: number;
  tilt: number;
}

function makeCrystals(round: number): Crystal[] {
  const target = COLORS[round % COLORS.length];
  return Array.from({ length: 10 }, (_, id) => {
    const color = id === (round * 3) % 10
      ? target
      : COLORS[(round + id + 1) % COLORS.length];
    return {
      id,
      color,
      left: 10 + ((id * 29 + round * 17) % 78),
      top: 16 + ((id * 41 + round * 13) % 66),
      tilt: -15 + ((id * 23 + round * 11) % 30),
    };
  });
}

export function LanternFestivalGame({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const { language } = useLanguage();
  const [round, setRound] = useState(0);
  const [crystals, setCrystals] = useState(() => makeCrystals(0));
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);

  const target = COLORS[round % COLORS.length];
  const targetLabel = target.label[language];

  useEffect(() => {
    if (done || failed) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setFailed(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [done, failed]);

  const chooseCrystal = useCallback((crystal: Crystal) => {
    if (done || failed) return;
    if (crystal.color.name === target.name) {
      audio.sfx('sparkle');
      setFlash('hit');
      window.setTimeout(() => setFlash(null), 180);
      setCombo((value) => value + 1);
      setRound((current) => {
        const next = current + 1;
        if (next >= ROUND_TOTAL) {
          setDone(true);
          audio.sfx('fanfare');
          onComplete();
        } else {
          setCrystals(makeCrystals(next));
        }
        return next;
      });
    } else {
      audio.sfx('miss');
      setFlash('miss');
      window.setTimeout(() => setFlash(null), 180);
      setCombo(0);
      setMistakes((value) => value + 1);
      setTimeLeft((value) => Math.max(0, value - 2));
    }
  }, [done, failed, onComplete, target.name]);

  const reset = useCallback(() => {
    setRound(0);
    setCrystals(makeCrystals(0));
    setCombo(0);
    setMistakes(0);
    setTimeLeft(ROUND_SECONDS);
    setDone(false);
    setFailed(false);
  }, []);

  const text = useMemo(() => language === 'id'
    ? {
      title: 'PERBURUAN KRISTAL',
      hint: 'KETUK KRISTAL DENGAN WARNA TARGET',
      target: 'CARI WARNA',
      combo: 'KOMBO',
      mistakes: 'SALAH',
      success: 'KRISTAL TERKUMPUL!',
      successLine: 'Semua kristal cahaya berhasil diamankan.',
      failed: 'WAKTU HABIS!',
      failedLine: 'Jangan biarkan kristalnya menghilang.',
      retry: 'COBA LAGI',
    }
    : {
      title: 'CRYSTAL HUNT',
      hint: 'TAP THE CRYSTAL THAT MATCHES THE TARGET',
      target: 'FIND COLOR',
      combo: 'COMBO',
      mistakes: 'MISS',
      success: 'CRYSTALS COLLECTED!',
      successLine: 'Every light crystal has been secured.',
      failed: 'TIME IS UP!',
      failedLine: 'The crystals slipped into the night.',
      retry: 'TRY AGAIN',
    }, [language]);

  return (
    <GameFrame
      title={text.title}
      hint={text.hint}
      hud={<p className="mt-1 font-pixel text-[8px] tracking-widest text-[#ffd97a]">{round}/{ROUND_TOTAL} · {timeLeft}s</p>}
      onBack={onBack}
    >
      <div className={`absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#312258_0%,#070a18_75%)] ${flash === 'hit' ? 'animate-[crystalFlash_0.18s_ease-out]' : ''}`}>
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(#fff1c4_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 text-center">
          <p className="font-pixel text-[7px] tracking-[0.25em] text-white/55">{text.target}</p>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-white/15 bg-[#14102b]/85 px-4 py-2 shadow-[0_0_24px_rgba(167,139,250,0.3)]">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: target.color, boxShadow: `0 0 14px ${target.glow}` }} />
            <span className="font-pixel text-[9px]" style={{ color: target.color }}>{targetLabel}</span>
          </div>
          <p className="mt-1 font-retro text-base text-[#ffd97a]">{text.combo} x{combo} · {text.mistakes} {mistakes}</p>
        </div>

        {!done && !failed && crystals.map((crystal) => (
          <button
            key={crystal.id}
            type="button"
            aria-label={`${text.target}: ${crystal.color.label[language]}`}
            onClick={() => chooseCrystal(crystal)}
            className="absolute flex h-14 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-transform hover:scale-125 active:scale-90"
            style={{ left: `${crystal.left}%`, top: `${crystal.top}%`, transform: `translate(-50%, -50%) rotate(${crystal.tilt}deg)` }}
          >
            <span className="absolute inset-1 rounded-[45%] border-2 opacity-90" style={{ backgroundColor: `${crystal.color.color}30`, borderColor: crystal.color.color, boxShadow: `0 0 20px ${crystal.color.glow}` }} />
            <Gem className="relative h-8 w-8" style={{ color: crystal.color.color }} />
          </button>
        ))}

        {(done || failed) && (
          <ResultCard
            title={done ? text.success : text.failed}
            lines={[done ? text.successLine : text.failedLine, `${text.combo}: ${combo} · ${text.mistakes}: ${mistakes}`]}
            onReplay={reset}
            onExit={onBack}
            replayLabel={text.retry}
          />
        )}
        <Sparkles className="pointer-events-none absolute bottom-16 left-1/2 h-7 w-7 -translate-x-1/2 animate-[glowPulse_2s_ease-in-out_infinite] text-[#ffd97a]" />
      </div>
    </GameFrame>
  );
}

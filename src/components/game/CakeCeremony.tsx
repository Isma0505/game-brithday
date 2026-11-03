'use client';

/* =========================================================================
 *  CakeCeremony — THE GRAND BIRTHDAY CAKE.
 *  A huge celebration cake with CAKE_CANDLES candles. Tap each flame
 *  (or hold the BLOW button) to put them out; when the last flame dies
 *  the room falls dark, the wish is made, and confetti rains down.
 *  Fully touch-friendly: every target is a large pointer-down button.
 * ========================================================================= */

import { Wind, RotateCcw, PartyPopper } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '@/lib/game/audio';
import { BIRTHDAY_MESSAGE, GOALS } from '@/lib/game/config';
import { GameFrame } from './GameFrame';
import { SkyCanvas } from './SkyCanvas';

export interface CakeCeremonyProps {
  onBack: () => void;
  onDone: () => void;
  onRoom: () => void;
  roomOpen: boolean;
}

type Stage = 'idle' | 'wish' | 'celebrate';

const CANDLES = GOALS.CAKE_CANDLES;

const STICK_COLORS = [
  ['#f2a2c0', '#d18396'],
  ['#f7c948', '#c98f1b'],
  ['#a78bfa', '#6d4fc4'],
  ['#7ee0c3', '#4aa88a'],
  ['#8fb8de', '#5f83b0'],
  ['#e05252', '#a83a3a'],
  ['#f7c948', '#c98f1b'],
] as const;

const CONFETTI_COLORS = ['#ffd97a', '#f2a2c0', '#a78bfa', '#7ee0c3', '#8fb8de', '#e05252', '#fff1c4'];

/* deterministic sprinkle layout for the icing */
const SPRINKLES = [
  { l: 12, t: 30, r: 24, c: '#ffd97a' }, { l: 30, t: 55, r: -40, c: '#7ee0c3' },
  { l: 55, t: 25, r: 70, c: '#f2a2c0' }, { l: 74, t: 60, r: -15, c: '#a78bfa' },
  { l: 88, t: 35, r: 45, c: '#8fb8de' }, { l: 20, t: 75, r: -60, c: '#e05252' },
  { l: 45, t: 80, r: 10, c: '#7ee0c3' }, { l: 66, t: 78, r: -30, c: '#ffd97a' },
  { l: 84, t: 82, r: 60, c: '#f2a2c0' }, { l: 8, t: 58, r: -80, c: '#a78bfa' },
];

export function CakeCeremony({ onBack, onDone, onRoom, roomOpen }: CakeCeremonyProps) {
  const [lit, setLit] = useState<boolean[]>(() => Array(CANDLES).fill(true));
  const [smoking, setSmoking] = useState<boolean[]>(() => Array(CANDLES).fill(false));
  const [stage, setStage] = useState<Stage>('idle');
  const [wind, setWind] = useState(false);

  /* refs mirror state so hold-intervals and timeouts never read stale values */
  const litRef = useRef(lit);
  const stageRef = useRef(stage);
  const windTimer = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    if (windTimer.current !== null) window.clearInterval(windTimer.current);
  }, []);

  const litCount = lit.filter(Boolean).length;

  const blowIndex = useCallback(
    (i: number) => {
      if (stageRef.current !== 'idle' || !litRef.current[i]) return;
      const next = [...litRef.current];
      next[i] = false;
      litRef.current = next;
      setLit(next);

      setSmoking((prev) => {
        const s = [...prev];
        s[i] = true;
        return s;
      });
      later(() => {
        setSmoking((prev) => {
          const s = [...prev];
          s[i] = false;
          return s;
        });
      }, 1500);

      audio.sfx('blow');

      if (!next.some(Boolean)) {
        stageRef.current = 'wish';
        later(() => setStage('wish'), 650);
        later(() => {
          stageRef.current = 'celebrate';
          setStage('celebrate');
          onDone();
          audio.sfx('wish');
          audio.sfx('confetti');
          audio.sfx('fanfare');
        }, 3300);
      }
    },
    [later, onDone],
  );

  /* blow the left-most lit candle (used by the BLOW hold button) */
  const blowNext = useCallback(() => {
    const i = litRef.current.findIndex(Boolean);
    if (i >= 0) blowIndex(i);
  }, [blowIndex]);

  const startWind = useCallback(() => {
    if (windTimer.current !== null || stageRef.current !== 'idle') return;
    setWind(true);
    blowNext();
    windTimer.current = window.setInterval(blowNext, 340);
  }, [blowNext]);

  const stopWind = useCallback(() => {
    if (windTimer.current !== null) {
      window.clearInterval(windTimer.current);
      windTimer.current = null;
    }
    setWind(false);
  }, []);

  const relight = useCallback(() => {
    const fresh = Array(CANDLES).fill(true);
    litRef.current = fresh;
    setLit(fresh);
    stageRef.current = 'idle';
    setStage('idle');
    audio.sfx('wish');
  }, []);

  /* celebratory confetti pieces (stable random layout) */
  const confetti = useMemo(
    () =>
      Array.from({ length: 64 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        duration: 2.8 + Math.random() * 2.4,
        size: 5 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() < 0.4,
      })),
    [],
  );

  /* ambient golden specks drifting up around the cake */
  const specks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        bottom: Math.random() * 30,
        delay: Math.random() * 5,
        duration: 4.5 + Math.random() * 3.5,
        size: 2 + Math.random() * 2.5,
      })),
    [],
  );

  return (
    <GameFrame
      title={BIRTHDAY_MESSAGE.cakeTitle}
      hint={stage === 'idle' ? BIRTHDAY_MESSAGE.cakeHint : undefined}
      hud={
        <p className="mt-0.5 font-pixel text-[7px] tracking-widest text-white/80 sm:text-[8px]">
          CANDLES {CANDLES - litCount}/{CANDLES}
        </p>
      }
      onBack={() => {
        stopWind();
        onBack();
      }}
    >
      <div className="absolute inset-0 touch-none select-none">
        <SkyCanvas />

        {/* warm spotlight that fades as candles go out */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity: 0.18 + 0.55 * (litCount / CANDLES),
            background:
              'radial-gradient(60% 46% at 50% 62%, rgba(255,196,110,0.34) 0%, rgba(255,170,80,0.10) 45%, transparent 75%)',
          }}
          aria-hidden="true"
        />

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

        {/* ================================ THE CAKE ======================== */}
        <div className="absolute inset-0 flex items-end justify-center pb-[13vh]">
          <div className="relative w-[min(88vw,400px)]">
            {/* candle glow halo */}
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-40 w-[130%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
              style={{
                opacity: 0.25 + 0.75 * (litCount / CANDLES),
                background:
                  'radial-gradient(closest-side, rgba(255,214,130,0.5), rgba(255,190,90,0.14) 55%, transparent 100%)',
              }}
              aria-hidden="true"
            />

            {/* wind streaks while blowing */}
            {wind && (
              <div className="pointer-events-none absolute -top-8 left-1/2 z-20 h-24 w-[130%] -translate-x-1/2" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="absolute h-[3px] w-16 rounded-full bg-gradient-to-l from-white/70 via-white/30 to-transparent"
                    style={{ top: 12 + i * 14, left: '6%', animation: `windStreak ${0.5 + i * 0.08}s linear ${i * 0.09}s infinite` }}
                  />
                ))}
              </div>
            )}

            {/* candles row — sits on the top tier */}
            <div className="absolute inset-x-0 z-10 flex justify-center gap-[2%] px-[24%]" style={{ top: -58 }}>
              {Array.from({ length: CANDLES }, (_, i) => {
                const [c1, c2] = STICK_COLORS[i % STICK_COLORS.length];
                return (
                  <button
                    key={i}
                    onPointerDown={(e) => { e.preventDefault(); blowIndex(i); }}
                    disabled={!lit[i]}
                    aria-label={lit[i] ? `Blow out candle ${i + 1}` : `Candle ${i + 1} is out`}
                    className="relative flex h-[104px] w-11 touch-none flex-col items-center justify-end outline-none"
                  >
                    {/* flame / smoke */}
                    <span className="relative block h-9 w-full">
                      {lit[i] ? (
                        <span
                          className="absolute bottom-1 left-1/2"
                          style={{
                            animation: `flameFlicker ${wind ? 0.12 : 0.26}s ease-in-out infinite alternate`,
                          }}
                        >
                          <span className="block h-7 w-[18px] rounded-[50%_50%_46%_54%/62%_62%_38%_38%] bg-gradient-to-b from-[#fffbe8] via-[#ffd97a] to-[#ff9d2e] shadow-[0_0_22px_rgba(255,190,80,0.95),0_0_44px_rgba(255,160,40,0.5)]" />
                        </span>
                      ) : smoking[i] ? (
                        <>
                          {[0, 1, 2].map((k) => (
                            <span
                              key={k}
                              className="absolute bottom-2 left-1/2 h-3.5 w-3.5 rounded-full bg-gray-300/70 blur-[2px]"
                              style={{ animation: `smokeUp 1.15s ease-out ${k * 0.18}s both` }}
                            />
                          ))}
                        </>
                      ) : null}
                      {/* wick */}
                      <span className="absolute bottom-0.5 left-1/2 h-2 w-[3px] -translate-x-1/2 rounded bg-[#3a2a20]" />
                    </span>
                    {/* striped stick */}
                    <span
                      className="relative block h-[52px] w-[13px] overflow-hidden rounded-[3px] shadow-[inset_-3px_0_4px_rgba(0,0,0,0.25)]"
                      style={{ background: `repeating-linear-gradient(135deg, ${c1} 0 5px, ${c2} 5px 10px)` }}
                    />
                  </button>
                );
              })}
            </div>

            {/* top tier — chocolate with cream drips */}
            <div className="relative z-[5] mx-auto w-[54%]">
              <Tier
                height={64}
                body="linear-gradient(180deg,#8a5a33 0%,#6b4426 100%)"
                frosting="#fff1e4"
                drips={6}
                sprinkles={SPRINKLES.slice(0, 4)}
              />
            </div>
            {/* middle tier — strawberry cream */}
            <div className="relative z-[4] mx-auto -mt-1 w-[76%]">
              <Tier
                height={80}
                body="linear-gradient(180deg,#f2a2c0 0%,#d18396 100%)"
                frosting="#fff7ec"
                drips={8}
                sprinkles={SPRINKLES.slice(2, 8)}
              />
            </div>
            {/* bottom tier — vanilla gold */}
            <div className="relative z-[3] mx-auto -mt-1 w-[96%]">
              <Tier
                height={94}
                body="linear-gradient(180deg,#ffd98f 0%,#e8b05e 100%)"
                frosting="#f2a2c0"
                drips={10}
                sprinkles={SPRINKLES.slice(4, 10)}
              />
            </div>

            {/* plate */}
            <div className="relative z-[2] mx-auto -mt-2 h-5 w-[112%] -translate-x-[5.5%] rounded-[50%] bg-gradient-to-b from-[#e9e4ff] via-[#b9b2dd] to-[#8d86b8] shadow-[0_14px_30px_rgba(0,0,0,0.55)]" />
            {/* table shadow */}
            <div className="mx-auto mt-3 h-3 w-[130%] -translate-x-[11.5%] rounded-[50%] bg-black/45 blur-md" aria-hidden="true" />
          </div>
        </div>

        {/* BLOW hold-button (bottom right, big touch target) */}
        {stage === 'idle' && (
          <button
            onPointerDown={(e) => { e.preventDefault(); startWind(); }}
            onPointerUp={stopWind}
            onPointerLeave={stopWind}
            onPointerCancel={stopWind}
            aria-label="Hold to blow out the candles"
            className={`absolute bottom-16 right-4 z-30 flex h-20 w-20 touch-none select-none flex-col items-center justify-center gap-1 rounded-full border-2 backdrop-blur-sm transition-transform active:scale-90 sm:right-8 ${
              wind
                ? 'border-white/80 bg-[#3b5a78]/90 text-white shadow-[0_0_30px_rgba(180,220,255,0.6)]'
                : 'border-[#8fb8de]/70 bg-[#14102b]/85 text-[#8fb8de] shadow-[0_0_20px_rgba(143,184,222,0.4)]'
            }`}
          >
            <Wind className={`h-6 w-6 ${wind ? 'animate-pulse' : ''}`} />
            <span className="font-pixel text-[8px] tracking-wider">BLOW</span>
          </button>
        )}

        {/* ============ WISH VEIL (all candles out) ============ */}
        {stage === 'wish' && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#02030c]/85 [animation:veilIn_0.9s_ease-out_both]">
            <p className="animate-[fadeIn_1.2s_0.4s_both] px-6 text-center font-elegant text-2xl italic text-[#ffe9a8] drop-shadow-[0_0_22px_rgba(255,214,120,0.65)] sm:text-4xl">
              {BIRTHDAY_MESSAGE.wishPrompt}
            </p>
          </div>
        )}

        {/* ============ CELEBRATION ============ */}
        {stage === 'celebrate' && (
          <>
            {/* confetti rain */}
            <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
              {confetti.map((c) => (
                <span
                  key={c.id}
                  className="absolute top-0"
                  style={{
                    left: `${c.left}%`,
                    width: c.size,
                    height: c.round ? c.size : c.size * 0.45,
                    background: c.color,
                    borderRadius: c.round ? '50%' : '2px',
                    animation: `confettiDrop ${c.duration}s linear ${c.delay}s infinite`,
                    boxShadow: '0 0 6px rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>

            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02030c]/55 px-5 backdrop-blur-[2px]">
              <div className="w-full max-w-md animate-[riseIn_0.6s_ease-out_both] rounded-2xl border border-[#ffd97a]/45 bg-[#14102b]/95 p-6 text-center shadow-[0_0_60px_rgba(247,201,72,0.3)] sm:p-8">
                <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-[#ffd97a] shadow-[0_0_14px_rgba(247,201,72,0.9)]" />
                <p className="font-elegant text-lg font-black tracking-wide bg-gradient-to-b from-[#fff6d8] via-[#ffd97a] to-[#d99a1e] bg-clip-text text-transparent sm:text-2xl">
                  {BIRTHDAY_MESSAGE.introGreetingLine1}
                </p>
                <p className="font-elegant text-xl font-black tracking-wide bg-gradient-to-b from-[#fff6d8] via-[#ffd97a] to-[#d99a1e] bg-clip-text text-transparent sm:text-3xl">
                  {BIRTHDAY_MESSAGE.introGreetingLine2}
                </p>
                <p className="mt-4 font-retro text-xl leading-tight text-white/85 sm:text-2xl">
                  {BIRTHDAY_MESSAGE.cakeWishDone}
                </p>
                <p className="mt-1 font-retro text-lg leading-tight text-white/60">
                  {BIRTHDAY_MESSAGE.finaleLines[0]}
                </p>

                <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:flex-wrap">
                  <button
                    onClick={() => { audio.sfx('click'); relight(); }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ffd97a] to-[#e8a528] px-5 py-3 font-pixel text-[8px] text-[#2a1b04] shadow-[0_4px_20px_rgba(247,201,72,0.45)] transition-all hover:brightness-110 active:scale-95 sm:text-[9px]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> RELIGHT THE CANDLES
                  </button>
                  {roomOpen && (
                    <button
                      onClick={() => { audio.sfx('click'); onRoom(); }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#ffd97a]/50 bg-[#2a1b04]/60 px-5 py-3 font-pixel text-[8px] text-[#ffd97a] transition-all hover:border-[#ffd97a] hover:bg-[#2a1b04] active:scale-95 sm:text-[9px]"
                    >
                      <PartyPopper className="h-3.5 w-3.5" /> ENTER THE BIRTHDAY ROOM
                    </button>
                  )}
                  <button
                    onClick={() => { audio.sfx('click'); onBack(); }}
                    className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-pixel text-[8px] text-white/85 transition-all hover:border-[#ffd97a]/50 hover:text-[#ffd97a] active:scale-95 sm:text-[9px]"
                  >
                    BACK TO THE FAIR
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </GameFrame>
  );
}

/* ------------------------------------------------------------- cake tier */

interface TierProps {
  height: number;
  body: string;
  frosting: string;
  drips: number;
  sprinkles?: { l: number; t: number; r: number; c: string }[];
}

function Tier({ height, body, frosting, drips, sprinkles = [] }: TierProps) {
  return (
    <div className="relative" style={{ height }}>
      {/* frosting cap with scalloped drips */}
      <div className="absolute inset-x-0 top-0 z-[2]">
        <div className="h-3.5 w-full rounded-t-lg" style={{ background: frosting }} />
        <div className="flex justify-between px-[2%]" style={{ marginTop: -4 }}>
          {Array.from({ length: drips }, (_, i) => (
            <span
              key={i}
              className="block rounded-b-full"
              style={{
                background: frosting,
                width: `${100 / drips - 3}%`,
                height: i % 2 === 0 ? 14 : 9,
                paddingTop: 2,
              }}
            />
          ))}
        </div>
      </div>
      {/* body */}
      <div
        className="absolute inset-x-0 bottom-0 top-2 rounded-b-xl shadow-[inset_-14px_0_22px_rgba(0,0,0,0.28),inset_10px_0_18px_rgba(255,255,255,0.12)]"
        style={{ background: body }}
      >
        {sprinkles.map((s, i) => (
          <span
            key={i}
            className="absolute h-[5px] w-[13px] rounded-full"
            style={{ left: `${s.l}%`, top: `${s.t}%`, transform: `rotate(${s.r}deg)`, background: s.c, boxShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
          />
        ))}
        {/* gold ribbon at the base */}
        <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-b-xl bg-gradient-to-b from-[#ffe9a8]/90 via-[#e8b64c]/80 to-[#b9822a]/80" />
      </div>
    </div>
  );
}

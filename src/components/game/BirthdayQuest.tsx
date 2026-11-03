'use client';

/* =========================================================================
 *  BirthdayQuest — root orchestrator & state machine.
 *
 *  loading → intro → character ⇄ hub ⇄ { trail | balloon | gift } → room → finale
 *
 *  Owns:
 *  - the save file (localStorage via lib/game/storage)
 *  - music routing per phase (procedural chiptune via lib/game/audio)
 *  - the global mute toggle
 * ========================================================================= */

import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { audio, type TrackName } from '@/lib/game/audio';
import {
  clearProgress,
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
  type GameProgress,
} from '@/lib/game/storage';
import BalloonPopGame from './BalloonPopGame';
import { BirthdayRoom } from './BirthdayRoom';
import { CharacterSelect } from './CharacterSelect';
import { FinaleCinematic } from './FinaleCinematic';
import GiftCatchGame from './GiftCatchGame';
import { HubScreen } from './HubScreen';
import { IntroScreen } from './IntroScreen';
import { LoadingScreen } from './LoadingScreen';
import { StarTrailGame } from './StarTrailGame';

type Phase =
  | 'loading'
  | 'intro'
  | 'character'
  | 'hub'
  | 'trail'
  | 'balloon'
  | 'gift'
  | 'room'
  | 'finale';

const PHASE_MUSIC: Partial<Record<Phase, TrackName>> = {
  intro: 'menu',
  character: 'menu',
  hub: 'menu',
  trail: 'quest',
  balloon: 'party',
  gift: 'party',
  room: 'room',
  finale: 'finale',
};

export default function BirthdayQuest() {
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS);
  const [phase, setPhase] = useState<Phase>('loading');
  const [hydrated, setHydrated] = useState(false);

  /* hydrate the save file once on mount (client-only external store) */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage must hydrate after mount to avoid SSR mismatch
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  /* audio must be unlocked by a user gesture (browser policy) */
  useEffect(() => {
    const unlock = () => audio.init();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /* keep the engine in sync with the persisted mute flag */
  useEffect(() => {
    audio.setMuted(progress.muted);
  }, [progress.muted]);

  /* route the soundtrack per phase */
  useEffect(() => {
    const track = PHASE_MUSIC[phase];
    if (track) audio.playTrack(track);
  }, [phase]);

  /* ----------------------------- progress helpers ---------------------- */

  const update = useCallback((patch: Partial<GameProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...patch };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleStarCollect = useCallback((id: string) => {
    setProgress((prev) => {
      if (prev.trailStars.includes(id)) return prev;
      const next = { ...prev, trailStars: [...prev.trailStars, id] };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleBalloonComplete = useCallback(
    (result: { pops: number; timeSec: number }) => {
      setProgress((prev) => {
        const next: GameProgress = {
          ...prev,
          balloonPops: Math.max(prev.balloonPops, result.pops),
          balloonDone: true,
          balloonTimeSec:
            prev.balloonTimeSec === null
              ? result.timeSec
              : Math.min(prev.balloonTimeSec, result.timeSec),
        };
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  const handleGiftComplete = useCallback((result: { caught: number }) => {
    setProgress((prev) => {
      const next: GameProgress = {
        ...prev,
        giftsCaught: Math.max(prev.giftsCaught, result.caught),
        giftsDone: true,
      };
      saveProgress(next);
      return next;
    });
  }, []);

  /* fresh save but keep going straight to hero selection */
  const startNewGame = useCallback(() => {
    clearProgress();
    setProgress({ ...DEFAULT_PROGRESS });
    setPhase('character');
  }, []);

  /* full reset from the hub — back to the boot sequence */
  const resetGame = useCallback(() => {
    clearProgress();
    setProgress({ ...DEFAULT_PROGRESS });
    setPhase('loading');
  }, []);

  const toggleMute = useCallback(() => {
    audio.init(); /* toggling counts as a gesture */
    setProgress((prev) => {
      const next = { ...prev, muted: !prev.muted };
      saveProgress(next);
      return next;
    });
  }, []);

  /* ---- stable callbacks passed to children ------------------------------
   * Every child receives memoized handlers: components like
   * FinaleCinematic/LoadingScreen run effects that depend on these props,
   * so a fresh inline identity each render would cause update loops. */
  const goIntro = useCallback(() => setPhase('intro'), []);
  const goCharacter = useCallback(() => setPhase('character'), []);
  const goHub = useCallback(() => setPhase('hub'), []);
  const goRoom = useCallback(() => setPhase('room'), []);
  const goFinale = useCallback(() => setPhase('finale'), []);
  const playGame = useCallback((_game: 'trail' | 'balloon' | 'gift') => {
    setPhase(_game);
  }, []);
  const continueGame = useCallback(() => {
    setPhase(progress.character ? 'hub' : 'character');
    /* dep on the primitive progress.character — identity changes only when the hero changes */
  }, [progress.character]);
  const confirmCharacter = useCallback(
    (id: string) => {
      update({ character: id });
      setPhase('hub');
    },
    [update],
  );
  const enterPortal = useCallback(() => {
    update({ trailDone: true });
    setPhase('room');
  }, [update]);
  const makeWish = useCallback(() => update({ wished: true }), [update]);
  const markFinaleSeen = useCallback(() => update({ finaleSeen: true }), [update]);

  /* --------------------------------- render ---------------------------- */

  const characterId = progress.character ?? 'astra';

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden bg-[#070a18] text-white"
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label="Birthday Quest — The Secret Gift"
    >
      {phase === 'loading' && <LoadingScreen onDone={goIntro} />}

      {phase === 'intro' && hydrated && (
        <IntroScreen
          progress={progress}
          onStart={goCharacter}
          onContinue={continueGame}
          onNewGame={startNewGame}
        />
      )}

      {phase === 'character' && (
        <CharacterSelect
          initialCharacter={progress.character}
          onConfirm={confirmCharacter}
          onBack={goIntro}
        />
      )}

      {phase === 'hub' && (
        <HubScreen
          progress={progress}
          onPlay={playGame}
          onRoom={goRoom}
          onChangeCharacter={goCharacter}
          onReset={resetGame}
        />
      )}

      {phase === 'trail' && (
        <StarTrailGame
          characterId={characterId}
          collectedIds={progress.trailStars.slice()}
          onStarCollect={handleStarCollect}
          onEnterPortal={enterPortal}
          onBack={goHub}
        />
      )}

      {phase === 'balloon' && (
        <BalloonPopGame onBack={goHub} onComplete={handleBalloonComplete} />
      )}

      {phase === 'gift' && (
        <GiftCatchGame onBack={goHub} onComplete={handleGiftComplete} />
      )}

      {phase === 'room' && (
        <BirthdayRoom
          characterId={characterId}
          wished={progress.wished}
          balloonPops={progress.balloonPops}
          giftsCaught={progress.giftsCaught}
          onWish={makeWish}
          onOpenGift={goFinale}
          onBack={goHub}
        />
      )}

      {phase === 'finale' && (
        <FinaleCinematic
          onPlayAgain={goHub}
          onBackRoom={goRoom}
          onSeen={markFinaleSeen}
        />
      )}

      {/* global mute toggle (hidden during the boot sequence) */}
      {phase !== 'loading' && (
        <button
          onClick={toggleMute}
          aria-label={progress.muted ? 'Unmute music and sound' : 'Mute music and sound'}
          className="absolute right-2.5 top-2.5 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#14102b]/80 text-white/80 backdrop-blur-sm transition-all hover:border-[#ffd97a]/50 hover:text-[#ffd97a] active:scale-95"
        >
          {progress.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}

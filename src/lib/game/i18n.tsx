'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'id' | 'en';

const translations: Record<string, { id: string; en: string }> = {
  'FAIR': { id: 'PASAR', en: 'FAIR' },
  'Back to the fair': { id: 'Kembali ke pasar', en: 'Back to the fair' },
  'PLAY AGAIN': { id: 'MAIN LAGI', en: 'PLAY AGAIN' },
  'BACK TO FAIR': { id: 'KEMBALI KE PASAR', en: 'BACK TO FAIR' },
  'INDONESIA': { id: 'INDONESIA', en: 'INDONESIA' },
  'ENGLISH': { id: 'INGGRIS', en: 'ENGLISH' },
  'Mute music and sound': { id: 'Matikan musik dan suara', en: 'Mute music and sound' },
  'Unmute music and sound': { id: 'Nyalakan musik dan suara', en: 'Unmute music and sound' },
  'LANGUAGE': { id: 'BAHASA', en: 'LANGUAGE' },
  'STARLIGHT TRAIL': { id: 'JEJAK BINTANG', en: 'STARLIGHT TRAIL' },
  'BALLOON FIESTA': { id: 'PISTA BALON', en: 'BALLOON FIESTA' },
  'GIFT CASCADE': { id: 'HUJAN HADIAH', en: 'GIFT CASCADE' },
  'THE WISHING CAKE': { id: 'KUE HARAPAN', en: 'THE WISHING CAKE' },
  'A LETTER FOR YOU': { id: 'SURAT UNTUKMU', en: 'A LETTER FOR YOU' },
  'THE GOLDEN PORTAL': { id: 'PORTAL EMAS', en: 'THE GOLDEN PORTAL' },
  'THE BIRTHDAY ROOM': { id: 'RUANG ULANG TAHUN', en: 'THE BIRTHDAY ROOM' },
  'PORTAL SIGIL': { id: 'SIGIL PORTAL', en: 'PORTAL SIGIL' },
  'THE GRAND BIRTHDAY CAKE': { id: 'KUE ULANG TAHUN BESAR', en: 'THE GRAND BIRTHDAY CAKE' },
  'JOYSTICK: MOVE • A: JUMP': { id: 'JOYSTICK: GERAK • A: LOMPAT', en: 'JOYSTICK: MOVE • A: JUMP' },
  'JOYSTICK: MOVE • A: INTERACT': { id: 'JOYSTICK: GERAK • A: AKSI', en: 'JOYSTICK: MOVE • A: INTERACT' },
  'DRAG OR JOYSTICK TO MOVE THE BASKET': { id: 'GESER ATAU GUNAKAN JOYSTICK UNTUK MENGGERAKKAN KERANJANG', en: 'DRAG OR JOYSTICK TO MOVE THE BASKET' },
  'TAP THE BALLOONS BEFORE THEY FLOAT AWAY': { id: 'KETUK BALON SEBELUM TERBANG PERGI', en: 'TAP THE BALLOONS BEFORE THEY FLOAT AWAY' },
  'TAP THE GOLDEN SIGIL BEFORE IT MOVES': { id: 'KETUK SIGIL EMAS SEBELUM BERPINDAH', en: 'TAP THE GOLDEN SIGIL BEFORE IT MOVES' },
  'SIGILS': { id: 'SIGIL', en: 'SIGILS' },
  'ENTER BIRTHDAY ROOM': { id: 'MASUK RUANG ULANG TAHUN', en: 'ENTER BIRTHDAY ROOM' },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('id');

  useEffect(() => {
    const saved = window.localStorage.getItem('bq_language');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the persisted language after mount
    if (saved === 'id' || saved === 'en') setLanguage(saved);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (next) => {
      setLanguage(next);
      window.localStorage.setItem('bq_language', next);
    },
    toggleLanguage: () => {
      const next = language === 'id' ? 'en' : 'id';
      setLanguage(next);
      window.localStorage.setItem('bq_language', next);
    },
    t: (text) => translations[text]?.[language] ?? text,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

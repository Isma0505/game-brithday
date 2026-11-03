/* =========================================================================
 *  BIRTHDAY QUEST — THE SECRET GIFT
 *  ---------------------------------------------------------------------
 *  ✦ EDIT PERSONAL MESSAGE HERE ✦  (Ubah pesan pribadimu di file ini!)
 *
 *  Semua teks ucapan untuk kakakmu berada di objek BIRTHDAY_MESSAGE di
 *  bawah ini. Cukup ganti tulisan di antara tanda kutip, simpan file,
 *  dan seluruh game (intro, ruangan ulang tahun, dan ending sinematik)
 *  akan otomatis memakai pesan barumu. Tidak perlu mengubah kode lain.
 * ========================================================================= */

export const BIRTHDAY_MESSAGE = {
  /* Nama panggilan kakakmu — dipakai di beberapa tempat dalam game. */
  brotherName: 'Kakanda Tersayang', // ← GANTI: contoh: 'Bang Raka'

  /* Kalimat besar di layar pembuka (muncul perlahan, huruf demi huruf). */
  introGreetingLine1: 'SELAMAT ULANG TAHUN',
  introGreetingLine2: 'KAKAKU SAYANG',

  /* Subjudul layar pembuka. */
  introSubtitle1: 'An Adventure Made Just for You',
  introSubtitle2: 'Today is not an ordinary day...',

  /* Pesan final sinematik (muncul setelah gift box terbuka). */
  finaleTitle: 'Happy Birthday, Brother!',
  finaleLines: [
    'You deserve all the happiness in the world.',
    'Thank you for being the best brother.',
    'May every wish you make tonight come true.',
  ],

  /* Tanda tangan kecil di bagian akhir. */
  signature: '— made with love, just for you —',

  /* Pesan saat kamu melakukan "Make a Wish" di ruangan ulang tahun. */
  wishPrompt: 'Make a wish, brother...',
  wishDone: 'Your wish has been sealed with starlight.',
} as const;

/* -------------------------------------------------------------------------
 *  Gameplay goals — tidak perlu diubah, tapi boleh jika ingin menantang.
 * ---------------------------------------------------------------------- */
export const GOALS = {
  STARS: 5, // bintang ajaib yang harus dikumpulkan di Starlight Trail
  BALLOON_POPS: 25, // balon yang harus meletus di Balloon Fiesta
  GIFTS_CATCH: 15, // hadiah yang harus ditangkap di Gift Cascade
} as const;

export const GAME_TITLE = 'Birthday Quest';
export const GAME_SUBTITLE = 'The Secret Gift';

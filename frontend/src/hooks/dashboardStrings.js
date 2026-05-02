/**
 * Curated list of strings that ALL staff dashboards display repeatedly
 * (tile labels, subtitles, common buttons, status words, nav entries).
 *
 * When a non-Azerbaijani user opens any dashboard for the very first time,
 * `useAutoTranslatePage` will eventually translate these via the MutationObserver
 * — but that can cause a ~1 second flash of Azerbaijani before the batch
 * request resolves. `useDashboardPrewarmTranslations` sends ONE batch request
 * early (before the DOM is even painted) so the cache is warm and the initial
 * render already swaps to the target language.
 *
 * To add more strings, just append them here.
 */
export const DASHBOARD_COMMON_STRINGS = [
  // ──  Shell / nav / auth  ──
  'Admin Paneli',
  'Restoran əməliyyatlarını idarə et',
  'Owner Panel',
  'Restoranları və partnyorları idarə edin',
  'Mətbəx',
  'Ofisiant',
  'Master Ofitsiant',
  'Logout',
  'Çıxış',
  'APK',
  'Profil',
  'Ana səhifə',

  // ── Metro-tile labels ──
  'Canlı',
  'Masalar',
  'Aktiv Masalar',
  'Çatdırılma',
  'Rezervasiyalar',
  'Menyu',
  'Məkanlar',
  'İstifadəçilər',
  'Personal',
  'Anbar',
  'Stok',
  'Xərclər',
  'Endirimlər',
  'Promo',
  'Analitika',
  'Satışlar',
  'Tənzimləmələr',
  'Ayarlar',
  'Restoran',
  'Restoranlar',
  'Partnyorlar',
  'Featured',
  'Sistem',

  // ── Stat tile labels + captions ──
  'Bu günkü gəlir',
  'BU GÜNKÜ GƏLIR',
  'Emal olunan sifarişlər',
  'Aktiv sifariş',
  'AKTIV SIFARIŞ',
  'açıq masa',
  'Çatdırılma gözləyən',
  'ÇATDIRILMA GÖZLƏYƏN',
  'Saytdan gələn sifarişlər',
  'Bu günkü rezerv',
  'BU GÜNKÜ REZERV',
  'Təsdiq gözləyənlər daxil',

  // ── Status words ──
  'Aktiv',
  'AKTIV',
  'Gözləyir',
  'Hazırlanır',
  'Hazırdır',
  'Yolda',
  'Çatdırıldı',
  'Ləğv edildi',
  'Təsdiqləndi',
  'Rədd edildi',

  // ── Common buttons ──
  'Yenilə',
  'Saxla',
  'Ləğv et',
  'Sil',
  'Redaktə et',
  'Əlavə et',
  'Yeni Sifariş',
  'Hesabı Bağla',
  'Masa Dəyişdir',
  'Müştəri adına sifariş götür',
  'Sifariş götür',

  // ── Common table headers ──
  'Ad',
  'Qiymət',
  'Miqdar',
  'Cəmi',
  'CƏMI',
  'Status',
  'Tarix',
  'Müştəri',
  'Telefon',
  'Ünvan',
  'Masa',
  'MƏKAN',
  'SIFARIŞ',
  'ENDIRIM',
  'Kateqoriya',
  'Sifarişlər',
  'Vaxtlı Xidmətlər',
  'Vaxtlı Xidmət',
];

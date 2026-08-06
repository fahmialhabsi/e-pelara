/**
 * Format NIP PNS 18 digit polos jadi berkelompok "8-6-1-3" sesuai konvensi
 * BKN (YYYYMMDD-TTBBBB-J-UUU): tanggal lahir, TMT pengangkatan, jenis
 * kelamin, nomor urut. Contoh: 197507302001121001 -> "19750730 200112 1 001".
 *
 * Fase 20 (FASE20-MARGIN-TTD-BUGFIX-WORD.md) — dicek dulu 11 generator
 * dokumen resmi lain di aplikasi ini (renstraGenerateController.js,
 * lakipPkExportService.js, dpaController.js, dpaPergeseranController.js,
 * rkaExportController.js, dkk), semuanya masih render NIP mentah tanpa
 * pengelompokan spasi — tidak ada util serupa yang bisa direuse, jadi ini
 * baru. Silakan reuse dari sini (bukan bikin salinan lagi) kalau modul lain
 * butuh format NIP yang sama nanti.
 *
 * @param {string|number|null|undefined} nipRaw
 * @returns {string} NIP berkelompok, atau nilai asli apa adanya kalau bukan
 *   persis 18 digit (mis. placeholder "-"/"NIP. —"/string kosong).
 */
function formatNip(nipRaw) {
  const digits = String(nipRaw ?? '').replace(/\D/g, '');
  if (digits.length !== 18) return nipRaw;
  return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
}

module.exports = { formatNip };

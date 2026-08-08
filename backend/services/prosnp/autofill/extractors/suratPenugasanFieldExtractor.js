'use strict';

/**
 * Spesifikasi 35 v3 §21 — B.1.1 Field Mapping. Rule-based regex/heuristik
 * murni (`DOCUMENT_EXTRACTED`), TIDAK ADA panggilan AI di sini (AI hanya utk
 * `narrativeDraftAdapter`/klasifikasi sekunder, terpisah). `extractIndonesianDate`
 * diekspor dari sini dan dipakai ulang oleh `rapatForkopimdaFieldExtractor.js`/
 * `cadanganTargetFieldExtractor.js` — bukan file baru, mengikuti file list §26.
 */

const BULAN_ID = {
  januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
  juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
};

function pad2(n) { return String(n).padStart(2, '0'); }

/** Mengembalikan { value: 'YYYY-MM-DD', raw: string, index: number } atau null. */
function extractIndonesianDate(text) {
  if (!text) return null;
  const namaBulan = Object.keys(BULAN_ID).join('|');
  const reNamaBulan = new RegExp(`\\b(\\d{1,2})\\s+(${namaBulan})\\s+(\\d{4})\\b`, 'i');
  const mNama = text.match(reNamaBulan);
  if (mNama) {
    return { value: `${mNama[3]}-${BULAN_ID[mNama[2].toLowerCase()]}-${pad2(mNama[1])}`, raw: mNama[0], index: mNama.index };
  }
  const reSlash = /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/;
  const mSlash = text.match(reSlash);
  if (mSlash) {
    return { value: `${mSlash[3]}-${pad2(mSlash[2])}-${pad2(mSlash[1])}`, raw: mSlash[0], index: mSlash.index };
  }
  return null;
}

function field(fieldKey, value, { confidence = 'NONE', reason, method = null, sourceRef = {}, requiresReview = confidence !== 'HIGH' } = {}) {
  return {
    field_key: fieldKey,
    value: value === undefined ? null : value,
    source_type: value === null || value === undefined ? 'NOT_FOUND' : 'DOCUMENT_EXTRACTED',
    source_reference: sourceRef,
    confidence: value === null || value === undefined ? 'NONE' : confidence,
    reason: reason || (value === null ? 'Pola tidak ditemukan pada teks dokumen.' : undefined),
    extraction_method: method,
    requires_review: value === null || value === undefined ? true : requiresReview,
  };
}

function extractNomorSurat(text) {
  const m = text.match(/NOMOR\s*:?\s*([A-Za-z0-9][\w./-]{4,})/i);
  if (!m) return field('nomor_surat', null);
  return field('nomor_surat', m[1].trim(), { confidence: 'HIGH', method: 'regex_nomor_surat_v1', sourceRef: { text_offset: [m.index, m.index + m[0].length] } });
}

function extractTanggalSurat(text) {
  const tanggal = extractIndonesianDate(text);
  if (!tanggal) return field('tanggal_surat', null);
  return field('tanggal_surat', tanggal.value, { confidence: 'HIGH', method: 'regex_tanggal_indonesia_v1', sourceRef: { text_offset: [tanggal.index, tanggal.index + tanggal.raw.length] } });
}

function extractPejabatPenandatangan(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cutoff = Math.floor(lines.length * 0.6);
  for (let i = Math.max(cutoff, lines.length - 15); i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Z][A-Z.,\s]{4,60}$/.test(line) && !/^(SURAT|KEPUTUSAN|PERATURAN|NOTULEN|LAPORAN|NOMOR|MENIMBANG|MENGINGAT|MEMUTUSKAN|MENETAPKAN|KESATU|KEDUA|KETIGA)\b/.test(line)) {
      return field('pejabat_penandatangan', line, { confidence: 'MEDIUM', method: 'heuristik_baris_akhir_v1', reason: 'Baris huruf kapital dekat akhir dokumen, kemiripan nama pejabat — verifikasi manual disarankan.' });
    }
  }
  return field('pejabat_penandatangan', null);
}

function extractCakupan(text) {
  const has = (s) => new RegExp(s, 'i').test(text);
  const buat = (key, pola) => {
    const cocok = has(pola);
    return field(key, cocok ? true : null, { confidence: cocok ? 'MEDIUM' : 'NONE', method: 'keyword_match_v1', requiresReview: true, reason: cocok ? `Kata kunci "${pola}" ditemukan pada teks.` : undefined });
  };
  return [
    buat('cakupan_pengadaan', 'pengadaan'),
    buat('cakupan_pengelolaan', 'pengelolaan'),
    buat('cakupan_penyaluran', 'penyaluran'),
  ];
}

/**
 * §21 "Ringkasan Isi Penugasan" — RULE_DERIVED (ringkas otomatis dari teks),
 * SELALU requires_review=true. Field ini wajib diisi (NOT NULL) pada entity
 * `ProsnSuratPenugasan`, jadi selalu diberi nilai (bukan NOT_FOUND) agar
 * autofill dapat menyelesaikan pembuatan entity — pengguna WAJIB meninjau
 * sebelum submit (§16 catatan otomatis, prioritas RULE_ENHANCED tanpa AI).
 */
function extractRingkasanIsi(text) {
  const menimbang = text.match(/Menimbang\s*:?\s*([^\n]{10,300})/i);
  const ringkas = (menimbang ? menimbang[1] : text.replace(/\s+/g, ' ')).trim().slice(0, 300);
  return {
    field_key: 'ringkasan_isi',
    value: ringkas || 'Ringkasan otomatis tidak dapat dibentuk — isi manual.',
    source_type: 'RULE_DERIVED',
    source_reference: {},
    confidence: 'LOW',
    reason: 'Ringkasan otomatis dari teks dokumen — WAJIB ditinjau sebelum digunakan.',
    extraction_method: 'ringkas_menimbang_v1',
    requires_review: true,
  };
}

function extractSuratPenugasanFields(text) {
  return [
    extractNomorSurat(text),
    extractTanggalSurat(text),
    extractPejabatPenandatangan(text),
    ...extractCakupan(text),
    extractRingkasanIsi(text),
  ];
}

module.exports = { extractSuratPenugasanFields, extractIndonesianDate, BULAN_ID, field };

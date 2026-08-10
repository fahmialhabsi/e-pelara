'use strict';

/**
 * Spesifikasi 35 v3 §22 — B.1.2 Field Mapping. `unsur_forkopimda_hadir`
 * SENGAJA selalu LOW/requires_review (override kebijakan §14 khusus field
 * ini) — name-matching daftar hadir rawan salah, tidak pernah auto-checked.
 */
const { extractIndonesianDate, field } = require('./suratPenugasanFieldExtractor');

const UNSUR_FORKOPIMDA = ['GUBERNUR', 'BUPATI', 'WALIKOTA', 'DANDIM', 'KAPOLRES', 'KAPOLDA', 'DANREM', 'KAJARI', 'KEJARI', 'KETUA DPRD', 'KEPALA KEJAKSAAN'];

function extractTanggalRapat(text) {
  const tanggal = extractIndonesianDate(text);
  if (!tanggal) return field('tanggal_rapat', null);
  return field('tanggal_rapat', tanggal.value, { confidence: 'HIGH', method: 'regex_tanggal_indonesia_v1', sourceRef: { text_offset: [tanggal.index, tanggal.index + tanggal.raw.length] } });
}

/**
 * P1 DOCX structured table corrective — label baris "Rapat" adalah nama
 * field GENERIK pada tabel metadata notulen pemerintahan (bukan spesifik
 * satu fixture), dipakai sbg sumber PERTAMA krn deterministic label:value
 * (mis. dari preamble hasil rekonstruksi tabel DOCX, lihat
 * `prosnpDocumentTextExtractor.js`). Fallback ke pola keyword lama
 * ("RAPAT KOORDINASI" di badan teks) bila label baris tsb tidak ditemukan.
 */
function extractNamaForum(text) {
  const labelLine = text.match(/^Rapat\s*:\s*(.{5,150})$/im);
  if (labelLine) {
    return field('nama_forum', labelLine[1].trim(), { confidence: 'HIGH', method: 'docx_table_label_v1', reason: 'Baris label "Rapat" ditemukan sbg pasangan label:value deterministik.', requiresReview: false });
  }
  const m = text.match(/RAPAT\s+KOORDINASI[^\n]{0,120}/i);
  if (!m) return field('nama_forum', null);
  return field('nama_forum', m[0].trim(), { confidence: 'MEDIUM', method: 'regex_nama_forum_v1' });
}

function extractJenisForum(text) {
  const isForkopimda = /FORKOPIMDA|FORUM KOORDINASI PIMPINAN/i.test(text);
  return field('jenis_forum', isForkopimda ? 'Forkopimda' : null, { confidence: isForkopimda ? 'MEDIUM' : 'NONE', method: 'keyword_match_v1' });
}

/**
 * Corrective pass "B.1.2 is_forkopimda Boolean Extraction" — kolom boolean
 * `is_forkopimda` (satu-satunya syarat forum-type yang dibaca rule engine
 * B.1.2, lihat prosnpB12RuleEngine.js) sebelumnya TIDAK PERNAH diekstrak sama
 * sekali, walau sinyal teksnya identik dgn `extractJenisForum` di atas —
 * akibatnya field ini selalu jatuh ke default model (`false`) meski dokumen
 * eksplisit menyebut Forkopimda. Fungsi ini menggunakan SIS SINYAL yang sama
 * (bukan classifier baru/lebih luas). Ketiadaan sinyal TIDAK PERNAH
 * disimpulkan sbg `false` (itu bukan fakta dokumen) — `field()` otomatis
 * mengembalikan `null`/NONE/requires_review saat value null.
 */
function extractIsForkopimda(text) {
  const isForkopimda = /FORKOPIMDA|FORUM KOORDINASI PIMPINAN/i.test(text);
  return field('is_forkopimda', isForkopimda ? true : null, { confidence: 'MEDIUM', method: 'keyword_match_v1', requiresReview: true });
}

function extractPimpinanRapat(text) {
  const m = text.match(/(?:dipimpin\s+oleh|pimpinan\s+rapat)\s*:?\s*([^\n]{3,80})/i);
  if (!m) return field('pimpinan_rapat', null);
  return field('pimpinan_rapat', m[1].trim(), { confidence: 'MEDIUM', method: 'regex_pimpinan_rapat_v1' });
}

function extractLokasi(text) {
  // Berhenti di koma/titik/titik-koma (bukan hanya batas 120 char) — pola
  // lama memotong tengah kalimat berikutnya krn "tempat" jg cocok sbg
  // substring "ber-TEMPAT" lalu menelan sisa kalimat sampai 120 char
  // (temuan biner nyata: Notulen asli "bertempat di Bela Hotel Ternate, dan
  // di buka..." -> lama menangkap hingga "...yang dam" terpotong).
  const m = text.match(/(?:tempat|lokasi)\s*:?\s*([^\n,;]{3,120})/i);
  if (!m) return field('lokasi', null);
  const nilai = m[1].trim().replace(/^di\s+/i, '');
  if (!nilai) return field('lokasi', null);
  return field('lokasi', nilai, { confidence: 'MEDIUM', method: 'regex_lokasi_v1' });
}

/** LOW default WAJIB (§22/§14 override) — tidak pernah auto-checked walau match banyak. */
function extractUnsurForkopimdaHadir(text) {
  const upper = text.toUpperCase();
  const hadir = UNSUR_FORKOPIMDA.filter((u) => upper.includes(u));
  if (!hadir.length) return field('unsur_forkopimda_hadir', null);
  return {
    field_key: 'unsur_forkopimda_hadir',
    value: hadir,
    source_type: 'DOCUMENT_EXTRACTED',
    source_reference: {},
    confidence: 'LOW',
    reason: 'Name-matching daftar hadir terhadap unsur Forkopimda rawan salah — WAJIB ditinjau manual, tidak pernah auto-checked (§14 override).',
    extraction_method: 'keyword_match_daftar_hadir_v1',
    requires_review: true,
  };
}

function extractTopik(text) {
  const has = (s) => new RegExp(s, 'i').test(text);
  const buat = (key, pola) => {
    const cocok = has(pola);
    return field(key, cocok ? true : null, { confidence: cocok ? 'MEDIUM' : 'NONE', method: 'keyword_match_v1', requiresReview: true });
  };
  return [
    buat('topik_pengadaan', 'pengadaan'),
    buat('topik_pengelolaan', 'pengelolaan'),
    buat('topik_penyaluran', 'penyaluran'),
  ];
}

/**
 * Corrective Pass Real-World 2025 — kolom `agenda` (TEXT) existing, belum
 * diekstrak sebelumnya. Label "Agenda:" diikuti PARAGRAF (bisa multi-baris)
 * sampai baris kosong atau label berikutnya (Hadir/Hasil/Kesimpulan/dst) —
 * BUKAN hanya baris pertama, karena konsep kunci (mis. CPPD/CBP) sering
 * berada di baris ke-2/3 paragraf yang sama.
 */
function extractAgenda(text) {
  // "Agenda Rapat" adalah variasi label generik yang sama umumnya dgn
  // "Agenda" polos pada tabel metadata notulen pemerintahan (P1 corrective).
  const m = text.match(/Agenda(?:\s+Rapat)?\s*:?\s*\n?([\s\S]{5,400}?)(?:\n\s*\n|\n\s*(?:Hadir|Hasil|Kesimpulan|Tembusan|Notulis)\b|$)/i);
  if (m) {
    const paragraf = m[1].replace(/\s+/g, ' ').trim();
    if (paragraf) return field('agenda', paragraf, { confidence: 'MEDIUM', method: 'regex_agenda_label_v1' });
  }
  // Fallback: tidak ada label "Agenda" eksplisit — ambil kalimat yg memuat topik inti
  // ProSN (Ketahanan Pangan/CPPD/CBP) sbg kandidat ringkasan agenda, LOW+review.
  const fallback = text.match(/[^\n]*\b(Ketahanan\s+Pangan|CPPD|CBP)\b[^\n]*/i);
  if (!fallback) return field('agenda', null);
  return field('agenda', fallback[0].trim(), { confidence: 'LOW', method: 'keyword_fallback_v1', reason: 'Tidak ada label "Agenda" eksplisit — diambil dari kalimat yang memuat topik inti (Ketahanan Pangan/CPPD/CBP).' });
}

/**
 * `notulis` — INFORMASIONAL (tidak ada kolom `notulis` pada `ProsnRapatForkopimda`,
 * §22 "if supported"), aman ditambahkan krn diabaikan `createCore` (§45 NO
 * DATABASE CHANGE, pola sama dgn `jabatan_penandatangan` B.1.1).
 */
function extractNotulis(text) {
  const m = text.match(/Notulis\s*:?\s*([^\n]{3,120})/i);
  if (!m) return field('notulis', null);
  return field('notulis', m[1].trim(), { confidence: 'MEDIUM', method: 'regex_notulis_v1' });
}

/**
 * §21/§24/§33 — angka pendukung (mis. "50 Ton") yang disebut dalam Notulen/
 * Laporan HANYA SUPPORTING, tidak pernah authoritative. Field ini SENGAJA
 * TIDAK bernama `target_ton` (kolom itu milik `ProsnCadanganTarget`, entity
 * type BERBEDA dari RAPAT_FORKOPIMDA — secara struktural TIDAK BISA mengisi
 * B.1.3 lewat orchestrator, lihat dispatch per-entityType) — field ini murni
 * informasional/audit-trail, confidence LOW, requires_review selalu true.
 */
function extractAngkaPendukung(text) {
  const m = text.match(/([\d.,]+)\s*ton\b/i);
  if (!m) return field('catatan_angka_pendukung', null);
  return {
    field_key: 'catatan_angka_pendukung',
    value: m[0].trim(),
    source_type: 'DOCUMENT_EXTRACTED',
    source_reference: {},
    confidence: 'LOW',
    reason: 'Angka pendukung (SUPPORTING) dari Notulen/Laporan — BUKAN penetapan resmi target B.1.3 (§21/§24 mandat: hanya Keputusan Gubernur yang otoritatif).',
    extraction_method: 'regex_angka_pendukung_v1',
    requires_review: true,
  };
}

function extractRapatForkopimdaFields(text) {
  return [
    extractTanggalRapat(text),
    extractNamaForum(text),
    extractJenisForum(text),
    extractIsForkopimda(text),
    extractPimpinanRapat(text),
    extractLokasi(text),
    extractAgenda(text),
    extractNotulis(text),
    extractUnsurForkopimdaHadir(text),
    ...extractTopik(text),
    extractAngkaPendukung(text),
  ];
}

module.exports = { extractRapatForkopimdaFields };

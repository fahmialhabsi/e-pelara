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

function extractNamaForum(text) {
  const m = text.match(/RAPAT\s+KOORDINASI[^\n]{0,120}/i);
  if (!m) return field('nama_forum', null);
  return field('nama_forum', m[0].trim(), { confidence: 'MEDIUM', method: 'regex_nama_forum_v1' });
}

function extractJenisForum(text) {
  const isForkopimda = /FORKOPIMDA|FORUM KOORDINASI PIMPINAN/i.test(text);
  return field('jenis_forum', isForkopimda ? 'Forkopimda' : null, { confidence: isForkopimda ? 'MEDIUM' : 'NONE', method: 'keyword_match_v1' });
}

function extractPimpinanRapat(text) {
  const m = text.match(/(?:dipimpin\s+oleh|pimpinan\s+rapat)\s*:?\s*([^\n]{3,80})/i);
  if (!m) return field('pimpinan_rapat', null);
  return field('pimpinan_rapat', m[1].trim(), { confidence: 'MEDIUM', method: 'regex_pimpinan_rapat_v1' });
}

function extractLokasi(text) {
  const m = text.match(/(?:tempat|lokasi)\s*:?\s*([^\n]{3,120})/i);
  if (!m) return field('lokasi', null);
  return field('lokasi', m[1].trim(), { confidence: 'MEDIUM', method: 'regex_lokasi_v1' });
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

function extractRapatForkopimdaFields(text) {
  return [
    extractTanggalRapat(text),
    extractNamaForum(text),
    extractJenisForum(text),
    extractPimpinanRapat(text),
    extractLokasi(text),
    extractUnsurForkopimdaHadir(text),
    ...extractTopik(text),
  ];
}

module.exports = { extractRapatForkopimdaFields };

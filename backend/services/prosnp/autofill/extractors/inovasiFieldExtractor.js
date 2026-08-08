'use strict';

/**
 * Spesifikasi 35 v3 §24 — B.1.4 Field Mapping. `relevansi_*` TIDAK PERNAH
 * auto-checked (keputusan substantif, §12 mandat eksplisit). Status/Nomor/
 * Tanggal Perkada HANYA HIGH bila dokumen `peraturan_gubernur` — dokumen
 * `peraturan_daerah` TIDAK PERNAH mengisi field ini HIGH/auto (Perda != Perkada).
 */
const { extractIndonesianDate, field } = require('./suratPenugasanFieldExtractor');

function extractNamaInovasi(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines.find((l) => l.length >= 8 && l.length <= 150 && !/^(NOMOR|TANGGAL|LAPORAN|SURAT)\b/i.test(l));
  if (!first) return field('nama_inovasi', null);
  return field('nama_inovasi', first, { confidence: 'LOW', method: 'heuristik_baris_pertama_v1', reason: 'Baris pertama dokumen yang cukup panjang — kandidat judul, wajib ditinjau.' });
}

function extractRingkas(text, fieldKey, label) {
  const m = text.match(new RegExp(`${label}\\s*:?\\s*([^\\n]{5,300})`, 'i'));
  if (!m) return field(fieldKey, null);
  return field(fieldKey, m[1].trim(), { confidence: 'LOW', method: 'regex_ringkas_v1', reason: `Ditemukan dekat label "${label}" — ringkasan otomatis, wajib ditinjau.` });
}

/** TIDAK PERNAH auto-checked (§12/§24) — SUGGESTION only, requires_review selalu true. */
function extractRelevansi(text) {
  const has = (s) => new RegExp(s, 'i').test(text);
  const buat = (key, pola) => {
    const cocok = has(pola);
    return {
      field_key: key,
      value: cocok ? true : null,
      source_type: cocok ? 'DOCUMENT_EXTRACTED' : 'NOT_FOUND',
      source_reference: {},
      confidence: cocok ? 'MEDIUM' : 'NONE',
      reason: 'Keputusan substantif — SELALU wajib ditinjau manual, tidak pernah auto-checked (§12/§24).',
      extraction_method: cocok ? 'keyword_match_v1' : null,
      requires_review: true,
    };
  };
  return [
    buat('relevansi_pengadaan', 'pengadaan'),
    buat('relevansi_pengelolaan', 'pengelolaan'),
    buat('relevansi_penyaluran', 'penyaluran'),
    buat('relevansi_umum', 'umum'),
  ];
}

function perkadaNotApplicable(fieldKey, jenisDokumen) {
  const isPerda = jenisDokumen === 'peraturan_daerah';
  return {
    field_key: fieldKey,
    value: null,
    source_type: 'NOT_FOUND',
    source_reference: {},
    confidence: 'NONE',
    reason: isPerda
      ? 'Dokumen ini Peraturan Daerah, bukan Peraturan Gubernur/Perkada — tidak memenuhi requirement Perkada B.1.4 kecuali direview manual.'
      : `Dokumen belum terklasifikasi sebagai Peraturan Gubernur (klasifikasi saat ini: ${jenisDokumen || 'tidak diketahui'}).`,
    extraction_method: null,
    requires_review: true,
  };
}

function extractStatusPerkada(text, jenisDokumen) {
  if (jenisDokumen !== 'peraturan_gubernur') return perkadaNotApplicable('status_perkada', jenisDokumen);
  return field('status_perkada', 'ditetapkan', { confidence: 'HIGH', method: 'klasifikasi_dokumen_v1', reason: 'Dokumen terklasifikasi Peraturan Gubernur (Perkada tingkat provinsi) — status ditetapkan.' });
}

function extractNomorPerkada(text, jenisDokumen) {
  if (jenisDokumen !== 'peraturan_gubernur') return perkadaNotApplicable('nomor_perkada', jenisDokumen);
  const m = text.match(/NOMOR\s*:?\s*([A-Za-z0-9][\w./-]{4,})/i);
  if (!m) return field('nomor_perkada', null);
  return field('nomor_perkada', m[1].trim(), { confidence: 'HIGH', method: 'regex_nomor_perkada_v1', sourceRef: { text_offset: [m.index, m.index + m[0].length] } });
}

function extractTanggalPerkada(text, jenisDokumen) {
  if (jenisDokumen !== 'peraturan_gubernur') return perkadaNotApplicable('tanggal_perkada', jenisDokumen);
  const tanggal = extractIndonesianDate(text);
  if (!tanggal) return field('tanggal_perkada', null);
  return field('tanggal_perkada', tanggal.value, { confidence: 'HIGH', method: 'regex_tanggal_indonesia_v1', sourceRef: { text_offset: [tanggal.index, tanggal.index + tanggal.raw.length] } });
}

function extractInovasiFields(text, jenisDokumen) {
  return [
    extractNamaInovasi(text),
    extractRingkas(text, 'masalah_awal', 'MASALAH'),
    extractRingkas(text, 'tujuan', 'TUJUAN'),
    extractRingkas(text, 'unsur_kebaruan', 'KEBARUAN'),
    ...extractRelevansi(text),
    extractStatusPerkada(text, jenisDokumen),
    extractNomorPerkada(text, jenisDokumen),
    extractTanggalPerkada(text, jenisDokumen),
  ];
}

module.exports = { extractInovasiFields };

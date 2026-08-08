'use strict';

/**
 * Spesifikasi 35 v3 §23 — B.1.3 Field Mapping. HANYA nomor/tanggal keputusan +
 * target ton (BUKAN pagu/realisasi — itu tetap 100% jalur `dpaRecallAdapter`
 * existing, tidak disentuh). Field ini HANYA diisi dari dokumen berklasifikasi
 * `keputusan_gubernur` — dokumen `peraturan_gubernur` TIDAK PERNAH mengisi
 * field ini walau isinya mirip (§23 tabel, larangan eksplisit).
 */
const { extractIndonesianDate, field } = require('./suratPenugasanFieldExtractor');

function notApplicable(fieldKey, jenisDokumen) {
  return {
    field_key: fieldKey,
    value: null,
    source_type: 'NOT_FOUND',
    source_reference: {},
    confidence: 'NONE',
    reason: jenisDokumen
      ? `Dokumen ini berklasifikasi "${jenisDokumen}", bukan Keputusan Gubernur — tidak memenuhi syarat sumber field ini (§23).`
      : 'Dokumen belum terklasifikasi sebagai Keputusan Gubernur.',
    extraction_method: null,
    requires_review: true,
  };
}

function extractNomorKeputusan(text) {
  const m = text.match(/NOMOR\s*:?\s*([A-Za-z0-9][\w./-]{4,})/i);
  if (!m) return field('nomor_keputusan', null);
  return field('nomor_keputusan', m[1].trim(), { confidence: 'HIGH', method: 'regex_nomor_keputusan_v1', sourceRef: { text_offset: [m.index, m.index + m[0].length] } });
}

function extractTanggalKeputusan(text) {
  const tanggal = extractIndonesianDate(text);
  if (!tanggal) return field('tanggal_keputusan', null);
  return field('tanggal_keputusan', tanggal.value, { confidence: 'HIGH', method: 'regex_tanggal_indonesia_v1', sourceRef: { text_offset: [tanggal.index, tanggal.index + tanggal.raw.length] } });
}

function extractTargetTon(text) {
  const m = text.match(/target[^\n]{0,40}?([\d.,]+)\s*ton/i) || text.match(/([\d.,]+)\s*ton\b/i);
  if (!m) return field('target_ton', null);
  const numeric = Number(m[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return field('target_ton', null);
  return field('target_ton', numeric, { confidence: 'MEDIUM', method: 'regex_target_ton_v1', reason: 'Angka eksplisit ditemukan dekat kata "ton" pada dokumen resmi — verifikasi manual disarankan.' });
}

/** jenisDokumen = hasil klasifikasi (§10), WAJIB 'keputusan_gubernur' agar field diisi. */
function extractCadanganTargetFields(text, jenisDokumen) {
  if (jenisDokumen !== 'keputusan_gubernur') {
    return [
      notApplicable('nomor_keputusan', jenisDokumen),
      notApplicable('tanggal_keputusan', jenisDokumen),
      notApplicable('target_ton', jenisDokumen),
    ];
  }
  return [extractNomorKeputusan(text), extractTanggalKeputusan(text), extractTargetTon(text)];
}

module.exports = { extractCadanganTargetFields };

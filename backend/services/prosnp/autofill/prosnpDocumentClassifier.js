'use strict';

/**
 * Spesifikasi 35 v3 §10 (revisi v2 — disambiguasi wajib Keputusan Gubernur vs
 * Peraturan Gubernur vs Peraturan Daerah). Rule-based selalu jalan duluan
 * dan WAJIB; AI secondary (default OFF) tidak diimplementasikan di Fase 3 —
 * baris `PROSNP_AUTOFILL_AI_CLASSIFICATION_ENABLED` gate disediakan sbg
 * dokumentasi kontrak, TIDAK diaktifkan (konsisten dgn Ollama tetap OFF).
 */

const JENIS_DOKUMEN_PROSN = [
  'surat_penugasan',
  'sk_penugasan',
  'keputusan_gubernur',
  'peraturan_daerah',
  'peraturan_gubernur',
  'laporan_pelaksanaan',
  'notulen_rapat_koordinasi',
];

const AI_CLASSIFICATION_ENABLED = String(process.env.PROSNP_AUTOFILL_AI_CLASSIFICATION_ENABLED || '').toLowerCase() === 'true';

function classifyDocument(text) {
  const upper = String(text || '').toUpperCase();
  const has = (s) => upper.includes(s.toUpperCase());

  // Disambiguasi wajib §10: heading mengandung GUBERNUR tapi tidak ada kata
  // PERSIS "KEPUTUSAN" ATAU "PERATURAN" ditemukan sama sekali -> jangan menebak.
  if (has('GUBERNUR') && !has('KEPUTUSAN') && !has('PERATURAN')) {
    return {
      jenis_dokumen: null,
      confidence: 'NONE',
      reason: 'Tidak dapat membedakan Keputusan Gubernur vs Peraturan Gubernur dari teks — periksa manual.',
      method: 'rule_based',
      requires_review: true,
    };
  }

  const isPerda = has('PERATURAN DAERAH');
  const isPerdaProcedure = has('DPRD') || has('PERSETUJUAN BERSAMA');

  const rules = [
    { jenis_dokumen: 'keputusan_gubernur', strong: ['KEPUTUSAN GUBERNUR'], weak: ['MEMUTUSKAN', 'MENETAPKAN'], guard: () => has('KEPUTUSAN GUBERNUR') },
    { jenis_dokumen: 'peraturan_daerah', strong: ['PERATURAN DAERAH'], weak: ['DENGAN RAHMAT TUHAN YANG MAHA ESA', 'DPRD', 'PERSETUJUAN BERSAMA'], guard: () => isPerda },
    // Peraturan Gubernur HANYA valid bila BUKAN Perda (tidak lewat prosedur DPRD/persetujuan bersama) — pembeda eksplisit §10.
    { jenis_dokumen: 'peraturan_gubernur', strong: ['PERATURAN GUBERNUR'], weak: ['DENGAN RAHMAT TUHAN YANG MAHA ESA'], guard: () => has('PERATURAN GUBERNUR') && !isPerdaProcedure },
    { jenis_dokumen: 'notulen_rapat_koordinasi', strong: ['NOTULEN'], weak: ['DAFTAR HADIR', 'RAPAT KOORDINASI'], guard: () => true },
    { jenis_dokumen: 'laporan_pelaksanaan', strong: ['LAPORAN PELAKSANAAN', 'LAPORAN KEGIATAN'], weak: [], guard: () => true },
    // surat_penugasan/sk_penugasan HANYA dipertimbangkan bila bukan salah satu produk hukum di atas (hindari salah tebak dokumen campuran).
    {
      jenis_dokumen: null, // ditentukan setelah tahu varian
      strong: ['SURAT TUGAS', 'SURAT KEPUTUSAN'],
      weak: ['MENUGASKAN', 'KESATU', 'MENIMBANG'],
      guard: () => !has('KEPUTUSAN GUBERNUR') && !has('PERATURAN GUBERNUR') && !isPerda,
      resolveJenis: () => (has('SURAT KEPUTUSAN') ? 'sk_penugasan' : 'surat_penugasan'),
    },
  ];

  const candidates = [];
  for (const rule of rules) {
    if (!rule.guard()) continue;
    const strongMatched = rule.strong.filter(has);
    const weakMatched = rule.weak.filter(has);
    const totalMatched = strongMatched.length + weakMatched.length;
    if (totalMatched === 0) continue;
    const jenis = rule.resolveJenis ? rule.resolveJenis() : rule.jenis_dokumen;
    let confidence;
    if (strongMatched.length > 0 && totalMatched >= 2) confidence = 'HIGH';
    else if (totalMatched === 1) confidence = 'MEDIUM';
    else confidence = 'LOW'; // >=2 cocok tapi semuanya weak/generik, tanpa heading definitif
    candidates.push({ jenis_dokumen: jenis, confidence, matched: [...strongMatched, ...weakMatched], score: totalMatched });
  }

  if (!candidates.length) {
    return { jenis_dokumen: null, confidence: 'NONE', reason: 'Tidak ada pola dokumen ProSN yang cocok pada teks ini.', method: 'rule_based', requires_review: true };
  }

  const RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  candidates.sort((a, b) => RANK[b.confidence] - RANK[a.confidence] || b.score - a.score);
  const best = candidates[0];

  return {
    jenis_dokumen: best.jenis_dokumen,
    confidence: best.confidence,
    reason: `Cocok pola: ${best.matched.join(', ')}.`,
    method: 'rule_based',
    requires_review: best.confidence !== 'HIGH',
  };
}

module.exports = { classifyDocument, JENIS_DOKUMEN_PROSN, AI_CLASSIFICATION_ENABLED };

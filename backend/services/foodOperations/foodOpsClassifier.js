'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Classifier module-owned, TERPISAH
 * dari `prosnpDocumentClassifier.js` (mandat §26: "DO NOT modify ProSN
 * classifier rules/types. FoodOps classifier owns its own type list.").
 *
 * REUSE eksplisit: `splitIdentityAndReferenceZones` diimpor apa adanya dari
 * classifier ProSN — fungsi itu murni struktural (pemisahan blok
 * Menimbang/Mengingat/Memperhatikan/Dasar dari identitas dokumen), tidak
 * menyebut satu pun tipe dokumen, sehingga aman dipakai ulang tanpa
 * menyentuh/memodifikasi file ProSN sama sekali. Algoritma heading-window +
 * first-match-wins + tier HIGH/MEDIUM/LOW/NONE diadaptasi (bukan disalin
 * modul-nya) khusus untuk daftar tipe FoodOps Phase 0 (mandat §28).
 */
const { splitIdentityAndReferenceZones } = require('../prosnp/autofill/prosnpDocumentClassifier');

const HEADING_WINDOW_CHARS = 600;

/** Mandat §6 — daftar minimum document_type Phase 0 (module-owned, extensible). */
const FOOD_OPS_DOCUMENT_TYPES = [
  'undang_undang', 'peraturan_pemerintah', 'peraturan_presiden', 'permendagri',
  'peraturan_daerah', 'peraturan_gubernur', 'keputusan_gubernur', 'surat_keputusan',
  'surat_tugas', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi', 'berita_acara',
  'kartu_stok', 'kartu_gudang', 'kartu_persediaan', 'laporan', 'bukti_serah_terima',
  'surat_jalan', 'materi', 'other',
];

/** Mandat §28 — minimum rules yang WAJIB diklasifikasi Phase 0. */
const CANONICAL_RULES = [
  { document_type: 'peraturan_daerah', strong: [/\bPERATURAN\s+DAERAH\b/i], weak: [/\bDENGAN\s+RAHMAT\s+TUHAN\s+YANG\s+MAHA\s+ESA\b/i, /\bDPRD\b/i, /\bPERSETUJUAN\s+BERSAMA\b/i] },
  { document_type: 'peraturan_gubernur', strong: [/\bPERATURAN\s+GUBERNUR\b/i], weak: [/\bDENGAN\s+RAHMAT\s+TUHAN\s+YANG\s+MAHA\s+ESA\b/i] },
  { document_type: 'keputusan_gubernur', strong: [/\bKEPUTUSAN\s+GUBERNUR\b/i], weak: [/\bMEMUTUSKAN\b/i, /\bMENETAPKAN\b/i] },
  { document_type: 'surat_keputusan', strong: [/\bSURAT\s+KEPUTUSAN\b/i], weak: [/\bMEMUTUSKAN\b/i, /\bMENETAPKAN\b/i] },
  { document_type: 'surat_tugas', strong: [/\bSURAT\s+TUGAS\b/i, /\bSURAT\s+PERINTAH\s+TUGAS\b/i], weak: [/\bMENUGASKAN\b/i, /\bKESATU\b/i] },
  { document_type: 'undangan', strong: [/\bSURAT\s+UNDANGAN\b/i, /^\s*UNDANGAN\b/im], weak: [/\bMENGHARAP\s+KEHADIRAN\b/i, /\bHARI\s*\/?\s*TANGGAL\b/i] },
  { document_type: 'daftar_hadir', strong: [/\bDAFTAR\s+HADIR\b/i], weak: [/\bTANDA\s+TANGAN\b/i] },
  { document_type: 'notulen', strong: [/\bNOTULEN\b/i], weak: [/\bDAFTAR\s+HADIR\b/i, /\bRAPAT\s+KOORDINASI\b/i] },
  { document_type: 'berita_acara', strong: [/\bBERITA\s+ACARA\b/i], weak: [/\bPADA\s+HARI\s+INI\b/i] },
  { document_type: 'laporan', strong: [/\bLAPORAN\s+HASIL\b/i, /\bLAPORAN\s+PELAKSANAAN\b/i, /\bLAPORAN\s+KEGIATAN\b/i], weak: [/\bLAPORAN\b/i] },
];

function firstMatchIndex(patterns, str) {
  let earliest = Infinity;
  let matchedText = null;
  for (const p of patterns) {
    const m = str.match(p);
    if (m && m.index < earliest) { earliest = m.index; matchedText = m[0]; }
  }
  return { index: earliest, matchedText };
}
function countMatches(patterns, str) {
  return patterns.filter((p) => p.test(str)).length;
}

/**
 * Mandat §27 — kontrak output normalized, reuse vocabulary confidence
 * HIGH/MEDIUM/LOW/NONE persis dari ProSN (bukan kosakata baru yang bersaing).
 */
function classifyFoodOpsDocument(text) {
  const { identityText, referenceText } = splitIdentityAndReferenceZones(text);
  const headingWindow = identityText.slice(0, HEADING_WINDOW_CHARS);
  const identityBody = identityText.slice(HEADING_WINDOW_CHARS);

  const isPerdaProcedure = /\bPERSETUJUAN\s+BERSAMA\b/i.test(identityText);
  const referenceMentions = [];
  if (referenceText && referenceText.trim()) {
    referenceText.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) referenceMentions.push(trimmed.slice(0, 160));
    });
  }

  const candidates = [];
  for (const rule of CANONICAL_RULES) {
    if (rule.document_type === 'peraturan_gubernur' && isPerdaProcedure) continue; // eslint-disable-line no-continue

    const headingStrong = firstMatchIndex(rule.strong, headingWindow);
    const bodyStrongCount = countMatches(rule.strong, identityBody);
    const weakCount = countMatches(rule.weak, identityText);
    if (headingStrong.index === Infinity && bodyStrongCount === 0 && weakCount === 0) continue; // eslint-disable-line no-continue

    let confidence;
    let headingPosition = Infinity;
    if (headingStrong.index < Infinity) {
      confidence = 'HIGH';
      headingPosition = headingStrong.index;
    } else if (bodyStrongCount > 0 || weakCount >= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    candidates.push({
      document_type: rule.document_type,
      confidence,
      headingPosition,
      identityEvidence: headingStrong.matchedText ? [headingStrong.matchedText] : [],
      reason: headingStrong.matchedText
        ? `Heading identitas ditemukan: "${headingStrong.matchedText}".`
        : 'Pola pendukung ditemukan pada isi dokumen (bukan heading eksplisit).',
    });
  }

  if (!candidates.length) {
    return {
      document_type: 'other', confidence: 'NONE', reason: 'Tidak ada pola tipe dokumen FoodOps Phase 0 yang cocok pada teks ini.',
      method: 'food_ops_rule_based_v1', requires_review: true, identity_evidence: [], reference_mentions: referenceMentions,
    };
  }

  const RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  candidates.sort((a, b) => RANK[b.confidence] - RANK[a.confidence] || a.headingPosition - b.headingPosition);
  const best = candidates[0];

  return {
    document_type: best.document_type,
    confidence: best.confidence,
    reason: best.reason,
    method: 'food_ops_rule_based_v1',
    requires_review: best.confidence !== 'HIGH',
    identity_evidence: best.identityEvidence,
    reference_mentions: referenceMentions,
  };
}

module.exports = { classifyFoodOpsDocument, FOOD_OPS_DOCUMENT_TYPES };

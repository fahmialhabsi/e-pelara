'use strict';

/**
 * Spesifikasi 35 v3 §10 (revisi v2 — disambiguasi Keputusan Gubernur vs
 * Peraturan Gubernur vs Peraturan Daerah) + Corrective Pass "Real-World 2025
 * Golden Evidence" (temuan CEA: DOCUMENT-REFERENCE CLASSIFICATION LEAKAGE).
 *
 * PRINSIP KOREKSI UTAMA: identitas dokumen (PRIMARY DOCUMENT IDENTITY) HARUS
 * dibedakan dari dokumen hukum yang sekadar DIRUJUK (REFERENCED DOCUMENTS).
 * Sebuah Surat Penugasan yang menyebut "Peraturan Daerah Nomor 4 Tahun 2023"
 * pada klausul "Menimbang" TIDAK berubah menjadi peraturan_daerah — kutipan
 * itu adalah REFERENCE ZONE, bukan identitas dokumen.
 *
 * Algoritma (rule-based, deterministik, TANPA AI/Ollama):
 *   1. `splitIdentityAndReferenceZones(text)` — pisahkan teks per baris:
 *      baris di dalam blok Menimbang/Mengingat/Memperhatikan/Dasar (dan baris
 *      tunggal berisi cue "menindaklanjuti/berdasarkan/sesuai dengan/merujuk/
 *      tembusan") masuk REFERENCE ZONE; sisanya masuk IDENTITY ZONE. Blok
 *      REFERENCE ZONE berakhir saat baris diktum (MEMUTUSKAN/MENETAPKAN/
 *      MENUGASKAN/KESATU) ditemukan.
 *   2. Di dalam IDENTITY ZONE, HEADING WINDOW (§15, header-window logic —
 *      tanpa perlu page-structure baru) = N karakter pertama. Pola KUAT
 *      (heading persis, §14 VERY STRONG) yang match di dalam window ini
 *      menang berdasarkan POSISI PALING AWAL (first-match-wins) — bukan
 *      jumlah match terbanyak — supaya judul seperti "PERATURAN GUBERNUR ...
 *      TENTANG PELAKSANAAN PERATURAN DAERAH ..." tidak salah menang ke
 *      peraturan_daerah hanya krn kata itu tersebuvt lagi di baris TENTANG.
 *   3. Pola KUAT yang HANYA match di luar heading window (body IDENTITY ZONE)
 *      dianggap LOW/MEDIUM, tidak pernah mengalahkan heading window manapun.
 *   4. Baris REFERENCE ZONE TIDAK PERNAH ikut proses (1)-(3) sama sekali —
 *      hanya dipakai membangun `reference_mentions` (metadata, bukan vote).
 *
 * TIDAK ADA special-case nama file/nomor/tanggal/nama orang — seluruh logika
 * generik berbasis struktur dokumen (mandat §50).
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

// §15 header-window — cukup luas utk memuat kop+heading+nomor+TENTANG+issuer
// pada seluruh contoh nyata (surat/pergub/kepgub/notulen/laporan), tapi tidak
// seluas itu hingga menelan isi Menimbang/Mengingat bila kebetulan tidak
// terdeteksi sbg REFERENCE ZONE (baris masking di langkah 1 adalah lini
// pertahanan utama; window ini lini pertahanan kedua).
const HEADING_WINDOW_CHARS = 600;

// Header seksi resmi Indonesia lazim berprefiks angka romawi/angka/huruf
// ("I. DASAR", "1. Menimbang", "A. Mengingat") — prefiks opsional ini WAJIB
// diterima, bukan hanya bentuk polos "Dasar:", supaya laporan/SK yang
// memberi nomor pada tiap bab tidak lolos dari REFERENCE ZONE masking
// (temuan biner nyata: "I. DASAR" pada Laporan Satgas MBG). Label JUGA lazim
// langsung diikuti isi pada baris yang SAMA ("Menimbang : bahwa ...",
// "Mengingat : 1. Pasal 18 ..." — bukan baris label berdiri sendiri) — pola
// ini TIDAK mensyaratkan akhir baris ($) lagi, cukup label di AWAL baris,
// supaya seluruh klausul Menimbang/Mengingat tetap ter-mask sbg REFERENCE
// ZONE (temuan biner nyata: Pergub CPPD asli menulis "Menimbang :"/
// "Mengingat :" digabung dgn isi, sehingga kata "DPRD" di dalamnya bocor ke
// identityText dan salah memicu guard peraturan_daerah-vs-peraturan_gubernur).
const REFERENCE_SECTION_START = /^(?:[IVXLCM]+\.|\d+\.|[A-Z]\.)?\s*(?:menimbang|mengingat|memperhatikan|dasar)\b/i;
const REFERENCE_INLINE_CUE = /\b(menindaklanjuti|berdasarkan|sesuai dengan|merujuk pada|merujuk)\b/i;
// WAJIB huruf awal kapital ("Tembusan"/"TEMBUSAN") — heading seksi Tembusan
// SELALU ditulis kapital sbg baris mandiri. Case-insensitive penuh (mandat
// lama) salah menangkap kalimat isi yang KEBETULAN word-wrap sehingga baris
// baru dimulai dgn kata "tembusan" huruf kecil di tengah kalimat (temuan
// biner nyata: "...disampaikan kepada Gubernur ... dengan\ntembusan kepada
// Menteri Dalam Negeri..." pada Surat Penugasan asli), yang memotong wilayah
// pencarian signer sebelum mencapai blok tanda tangan sesungguhnya.
const TEMBUSAN_START = /^(?:Tembusan|TEMBUSAN)\b/;
const SECTION_END_CUE = /^(memutuskan|menetapkan|menugaskan|kesatu)\b/i;

/**
 * Dokumen resmi ttt menulis judul dgn tracking/letter-spacing per-huruf
 * (mis. "L A P O R A N" alih-alih "LAPORAN") — ekstraksi teks PDF membaca
 * spasi tsb apa adanya sehingga pola heading berbasis kata utuh gagal cocok
 * (temuan biner nyata: 2 Laporan Satgas MBG). HANYA baris yang SELURUHNYA
 * berupa huruf kapital tunggal berspasi (>=3 huruf) yang digabung — supaya
 * tidak menyentuh enumerasi huruf ("A. ...") atau singkatan wajar di tengah
 * kalimat.
 */
function normalizeSpacedCapsLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (/^(?:[A-Z]\s){2,}[A-Z]$/.test(trimmed)) return trimmed.replace(/\s+/g, '');
      return line;
    })
    .join('\n');
}

/**
 * §5/§9 mandat — pisahkan IDENTITY ZONE dari REFERENCE ZONE per baris,
 * dengan state machine sederhana (section header eksplisit ATAU cue inline).
 * TIDAK memerlukan page-structure baru (§15) — beroperasi di atas flattened
 * text yang sudah ada.
 */
function splitIdentityAndReferenceZones(rawText) {
  const text = normalizeSpacedCapsLines(rawText);
  const lines = String(text || '').split(/\r?\n/);
  let inReferenceSection = false;
  let pastTembusan = false; // one-way switch — Tembusan selalu blok PENUTUP surat, tidak ada identitas sesudahnya
  const identityLines = [];
  const referenceLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (pastTembusan) { referenceLines.push(rawLine); continue; } // eslint-disable-line no-continue
    if (TEMBUSAN_START.test(line)) { pastTembusan = true; referenceLines.push(rawLine); continue; } // eslint-disable-line no-continue
    if (SECTION_END_CUE.test(line)) inReferenceSection = false;
    if (REFERENCE_SECTION_START.test(line)) {
      inReferenceSection = true;
      referenceLines.push(rawLine);
      continue; // eslint-disable-line no-continue
    }
    if (inReferenceSection) {
      referenceLines.push(rawLine);
      continue; // eslint-disable-line no-continue
    }
    if (REFERENCE_INLINE_CUE.test(line)) {
      // Baris tunggal dgn cue inline (mis. "Menindaklanjuti Peraturan Daerah ...")
      // — HANYA baris ini yang direferensikan, TIDAK mengubah state utk baris berikutnya.
      referenceLines.push(rawLine);
      continue; // eslint-disable-line no-continue
    }
    identityLines.push(rawLine);
  }

  return { identityText: identityLines.join('\n'), referenceText: referenceLines.join('\n') };
}

// Pola kanonis per tipe: `strong` = heading persis (VERY STRONG §14), `weak` =
// pendukung struktural (diktum/keyword generik). `docTypeRefPattern` dipakai
// utk mendeteksi REFERENCE MENTIONS (dokumen lain yg dirujuk, bukan identitas).
const CANONICAL_RULES = [
  { jenis_dokumen: 'keputusan_gubernur', strong: [/\bKEPUTUSAN\s+GUBERNUR\b/i], weak: [/\bMEMUTUSKAN\b/i, /\bMENETAPKAN\b/i] },
  { jenis_dokumen: 'peraturan_daerah', strong: [/\bPERATURAN\s+DAERAH\b/i], weak: [/\bDENGAN\s+RAHMAT\s+TUHAN\s+YANG\s+MAHA\s+ESA\b/i, /\bDPRD\b/i, /\bPERSETUJUAN\s+BERSAMA\b/i] },
  { jenis_dokumen: 'peraturan_gubernur', strong: [/\bPERATURAN\s+GUBERNUR\b/i], weak: [/\bDENGAN\s+RAHMAT\s+TUHAN\s+YANG\s+MAHA\s+ESA\b/i] },
  { jenis_dokumen: 'notulen_rapat_koordinasi', strong: [/\bNOTULEN\b/i], weak: [/\bDAFTAR\s+HADIR\b/i, /\bRAPAT\s+KOORDINASI\b/i] },
  { jenis_dokumen: 'laporan_pelaksanaan', strong: [/\bLAPORAN\s+HASIL\b/i, /\bLAPORAN\s+PELAKSANAAN\b/i, /\bLAPORAN\s+KEGIATAN\b/i, /\bLAPORAN\s+KETERSEDIAAN\b/i], weak: [] },
  {
    jenis_dokumen: null, // ditentukan resolveJenis
    strong: [/\bSURAT\s+TUGAS\b/i, /\bSURAT\s+PERINTAH\s+TUGAS\b/i, /\bSURAT\s+PENUGASAN\b/i, /\bSURAT\s+KEPUTUSAN\b/i, /Perihal\s*:?\s*[^\n]{0,10}Penugasan/i],
    weak: [/\bMENUGASKAN\b/i, /\bKESATU\b/i],
    resolveJenis: (matchedText) => (/SURAT\s+KEPUTUSAN/i.test(matchedText) ? 'sk_penugasan' : 'surat_penugasan'),
  },
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

/** §20 mandat — dokumen lain yang DISEBUT (bukan identitas), dibangun dari REFERENCE ZONE saja. */
function extractReferenceMentions(referenceText) {
  if (!referenceText || !referenceText.trim()) return [];
  const mentions = [];
  const REF_TYPE_PATTERNS = [
    { type: 'peraturan_daerah', pattern: /\bPERATURAN\s+DAERAH\b/i },
    { type: 'peraturan_gubernur', pattern: /\bPERATURAN\s+GUBERNUR\b/i },
    { type: 'keputusan_gubernur', pattern: /\bKEPUTUSAN\s+GUBERNUR\b/i },
    { type: 'undang_undang', pattern: /\bUNDANG-UNDANG\b/i },
    { type: 'peraturan_pemerintah', pattern: /\bPERATURAN\s+PEMERINTAH\b/i },
    { type: 'peraturan_presiden', pattern: /\bPERATURAN\s+PRESIDEN\b/i },
    { type: 'surat_edaran', pattern: /\bSURAT\s+EDARAN\b/i },
  ];
  referenceText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return; // eslint-disable-line consistent-return
    REF_TYPE_PATTERNS.forEach(({ type, pattern }) => {
      if (!pattern.test(trimmed)) return; // eslint-disable-line consistent-return
      // Format "Nomor X Tahun YYYY" (Perda/Perpres/UU/dst) ATAU format
      // "Nomor 365/KPTS/MU/2025" (SK/Keputusan Gubernur, umum di pemerintahan).
      const nomorTahun = trimmed.match(/Nomor\s+(\d+)\s+Tahun\s+(\d{4})/i)
        || trimmed.match(/Nomor\s+([\w./-]+?)\/(\d{4})\b/i);
      mentions.push({
        type,
        raw: trimmed.slice(0, 160),
        number: nomorTahun ? nomorTahun[1] : null,
        year: nomorTahun ? Number(nomorTahun[2]) : null,
      });
    });
  });
  return mentions;
}

function classifyDocument(text) {
  const { identityText, referenceText } = splitIdentityAndReferenceZones(text);
  const headingWindow = identityText.slice(0, HEADING_WINDOW_CHARS);
  const identityBody = identityText.slice(HEADING_WINDOW_CHARS);
  const referenceMentions = extractReferenceMentions(referenceText);

  // HANYA frasa konstitusional spesifik pengesahan Perda ("PERSETUJUAN
  // BERSAMA" DPRD-Gubernur) yang dipakai sbg guard — kata "DPRD" SENDIRIAN
  // dihapus dari cek ini krn Peraturan Gubernur yang sah pun lazim menyebut
  // DPRD di pasal substantif (mis. kewajiban pelaporan tahunan kepada DPRD),
  // BUKAN sbg klausul pengesahan (temuan biner nyata: Pergub CPPD 101/2025
  // asli menyebut DPRD di luar klausul pengesahan, salah tereliminasi dari
  // kandidat peraturan_gubernur sebelum perbaikan ini).
  const isPerdaProcedure = /\bPERSETUJUAN\s+BERSAMA\b/i.test(identityText);

  const candidates = [];
  for (const rule of CANONICAL_RULES) {
    // Peraturan Gubernur HANYA valid bila BUKAN Perda (tidak lewat prosedur DPRD/persetujuan bersama) — pembeda eksplisit §10.
    if (rule.jenis_dokumen === 'peraturan_gubernur' && isPerdaProcedure) continue; // eslint-disable-line no-continue
    // surat_penugasan/sk_penugasan HANYA dipertimbangkan bila heading window TIDAK didominasi produk hukum lain (hindari salah tebak dokumen campuran).
    if (rule.jenis_dokumen === null) {
      const headingHasOtherLegalProduct = /\bKEPUTUSAN\s+GUBERNUR\b|\bPERATURAN\s+GUBERNUR\b|\bPERATURAN\s+DAERAH\b/i.test(headingWindow);
      if (headingHasOtherLegalProduct) continue; // eslint-disable-line no-continue
    }

    const headingStrong = firstMatchIndex(rule.strong, headingWindow);
    const bodyStrongCount = countMatches(rule.strong, identityBody);
    const weakCount = countMatches(rule.weak, identityText);

    if (headingStrong.index === Infinity && bodyStrongCount === 0 && weakCount === 0) continue; // eslint-disable-line no-continue

    const jenis = rule.resolveJenis ? rule.resolveJenis(headingStrong.matchedText || '') : rule.jenis_dokumen;
    let confidence;
    let headingPosition = Infinity;
    if (headingStrong.index < Infinity) {
      // §14 VERY STRONG — heading persis pada identity block menang sendiri, TIDAK
      // perlu korespondensi pola kedua (mandat §40: jangan downgrade evidence kuat).
      confidence = 'HIGH';
      headingPosition = headingStrong.index;
    } else if (bodyStrongCount > 0 || weakCount >= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    candidates.push({
      jenis_dokumen: jenis,
      confidence,
      headingPosition,
      identityEvidence: headingStrong.matchedText ? [headingStrong.matchedText] : [],
      reason: headingStrong.matchedText
        ? `Heading identitas ditemukan: "${headingStrong.matchedText}".`
        : `Pola pendukung ditemukan pada isi dokumen (bukan heading eksplisit).`,
    });
  }

  if (!candidates.length) {
    // Disambiguasi wajib §10 — HANYA dipakai sbg FALLBACK saat tidak ada satu
    // pun kandidat cocok (bukan pre-check di awal): kalau heading window
    // menyebut "GUBERNUR" tapi tidak ada kata PERSIS "KEPUTUSAN"/"PERATURAN"
    // sama sekali di sana, tandai ambigu (OCR rusak) daripada generik "tidak
    // cocok". Dicek pada beberapa BARIS PERTAMA identity zone saja (bukan
    // seluruh dokumen) — supaya field "Pimpinan Rapat: Gubernur ..." pada
    // Notulen (yang SUDAH match candidate notulen_rapat_koordinasi sblm baris
    // ini tercapai) tidak pernah sampai ke cabang fallback ini.
    const firstIdentityLines = identityText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6).join('\n');
    const isAmbiguousGubernur = /\bGUBERNUR\b/i.test(firstIdentityLines) && !/\bKEPUTUSAN\b/i.test(firstIdentityLines) && !/\bPERATURAN\b/i.test(firstIdentityLines);
    return {
      jenis_dokumen: null,
      confidence: 'NONE',
      reason: isAmbiguousGubernur
        ? 'Tidak dapat membedakan Keputusan Gubernur vs Peraturan Gubernur dari teks — periksa manual.'
        : 'Tidak ada pola dokumen ProSN yang cocok pada teks ini.',
      method: 'rule_based_zone_aware_v2',
      requires_review: true,
      identity_evidence: [],
      reference_mentions: referenceMentions,
    };
  }

  // §14: heading window match (posisi PALING AWAL) menang mutlak di atas
  // MEDIUM/LOW — first-match-wins DI DALAM tier HIGH, supaya "PERATURAN
  // GUBERNUR ... TENTANG PELAKSANAAN PERATURAN DAERAH ..." tidak keliru
  // menang ke peraturan_daerah hanya krn disebut lagi di baris TENTANG.
  const RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  candidates.sort((a, b) => RANK[b.confidence] - RANK[a.confidence] || a.headingPosition - b.headingPosition);
  const best = candidates[0];

  return {
    jenis_dokumen: best.jenis_dokumen,
    confidence: best.confidence,
    reason: best.reason,
    method: 'rule_based_zone_aware_v2',
    requires_review: best.confidence !== 'HIGH',
    identity_evidence: best.identityEvidence,
    reference_mentions: referenceMentions,
  };
}

module.exports = { classifyDocument, JENIS_DOKUMEN_PROSN, AI_CLASSIFICATION_ENABLED, splitIdentityAndReferenceZones };

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

// Marker jabatan penanda tangan yang dikenal (bisa diperluas tanpa mengubah
// algoritma). Harus persis satu BARIS (bukan substring kalimat lain) supaya
// tidak salah tangkap kalimat biasa yang kebetulan menyebut jabatan ini.
const OFFICE_MARKER_PATTERNS = [
  { pattern: /^(PJ\.?\s+)?GUBERNUR\s+MALUKU\s+UTARA\s*,?\s*$/i, isPj: (line) => /^PJ\.?\s+/i.test(line), jabatan: 'Gubernur Maluku Utara' },
];
const NON_PERSON_LABELS = /^(NIP|TEMBUSAN|SEKRETARIS\s+DAERAH|SEKDA|ASISTEN|KARO\s+HUKUM|KEPALA\s+BIRO|NOTULIS|AN\.|A\.N\.|U\.B\.)\b/i;

/**
 * Corrective Pass "Real-World 2025 Golden Evidence" — signer WAJIB dicari di
 * SELURUH dokumen (multi-page; teks sudah digabung lintas halaman oleh
 * `prosnpDocumentTextExtractor.js`), BUKAN hanya beberapa baris terakhir
 * (bug lama: window `lines.length-15` gagal menjangkau signer di halaman 2
 * bila ada blok Tembusan/lampiran sesudahnya). Anchor: cari marker
 * jabatan/office TERAKHIR SEBELUM Tembusan (signature block selalu mendekati
 * akhir isi surat, tapi SEBELUM daftar tembusan) — bukan window baris tetap.
 * Nama diambil dari baris SETELAH marker jabatan, menolak label non-orang
 * (§39 False Positive Guard). Tidak pernah mengarang nama bila tidak grounded.
 */
function extractSignerBlock(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim());
  // WAJIB huruf awal kapital ("Tembusan"/"TEMBUSAN") — heading Tembusan SELALU
  // baris mandiri berkapital. Case-insensitive penuh salah menangkap kalimat
  // isi yang KEBETULAN word-wrap sehingga baris baru dimulai dgn kata
  // "tembusan" huruf kecil di tengah kalimat (temuan biner nyata: Surat
  // Penugasan asli — "...disampaikan kepada Gubernur ... dengan\ntembusan
  // kepada Menteri Dalam Negeri..." memotong wilayah pencarian SEBELUM
  // mencapai blok tanda tangan sesungguhnya).
  const tembusanIndex = lines.findIndex((l) => /^(?:Tembusan|TEMBUSAN)\b/.test(l));
  const searchEnd = tembusanIndex === -1 ? lines.length : tembusanIndex;

  let officeLineIndex = -1;
  let officeMarker = null;
  for (let i = searchEnd - 1; i >= 0; i -= 1) {
    if (!lines[i]) continue; // eslint-disable-line no-continue
    const found = OFFICE_MARKER_PATTERNS.find((m) => m.pattern.test(lines[i]));
    if (found) { officeLineIndex = i; officeMarker = found; break; }
  }
  if (officeLineIndex === -1) return { jabatan: null, nama: null, officeLineIndex: -1 };

  const isPj = officeMarker.isPj(lines[officeLineIndex]);
  const jabatan = isPj ? `Pj. ${officeMarker.jabatan}` : officeMarker.jabatan;

  for (let i = officeLineIndex + 1; i < Math.min(officeLineIndex + 6, searchEnd); i += 1) {
    const candidate = lines[i];
    if (!candidate) continue; // eslint-disable-line no-continue
    if (NON_PERSON_LABELS.test(candidate)) break;
    // Hasil OCR dokumen ter-scan kerap menyisipkan noise non-huruf di awal
    // baris nama (mis. "¢/;SAMSUDDIN ABDUL KADIR") — buang HANYA prefix
    // non-huruf generik ini sebelum validasi pola nama, TANPA menebak isi.
    const cleaned = candidate.replace(/^[^A-Za-z]+/, '').trim();
    if (/^[A-Z][A-Za-z.,'\s-]{3,60}$/.test(cleaned) && !/\d{4,}/.test(cleaned)) {
      return { jabatan, nama: cleaned.replace(/,\s*$/, '').trim(), officeLineIndex };
    }
  }
  // Jabatan ketemu tapi nama tidak grounded -- JANGAN mengarang nama (§17/§39).
  return { jabatan, nama: null, officeLineIndex };
}

function extractPejabatPenandatangan(text) {
  const { nama } = extractSignerBlock(text);
  if (!nama) return field('pejabat_penandatangan', null);
  return field('pejabat_penandatangan', nama, { confidence: 'HIGH', method: 'anchor_office_marker_v2', reason: 'Nama ditemukan tepat setelah marker jabatan penanda tangan (bukan window baris tetap) — mendukung dokumen multi-halaman.' });
}

/**
 * §17 — `jabatan_penandatangan`, field INFORMASIONAL utk preview UI. TIDAK
 * ada kolom DB `jabatan_penandatangan` pada `ProsnSuratPenugasan` (hanya
 * `pejabat_penandatangan` menyimpan nama) — field ini sengaja TIDAK dibaca
 * `createCore`/`fieldsToPayload` sehingga aman diikutsertakan tanpa migration
 * (§45 NO DATABASE CHANGE), murni konteks tambahan bagi peninjau.
 */
function extractJabatanPenandatangan(text) {
  const { jabatan } = extractSignerBlock(text);
  if (!jabatan) return field('jabatan_penandatangan', null);
  return field('jabatan_penandatangan', jabatan, { confidence: 'HIGH', method: 'anchor_office_marker_v2', reason: 'Diturunkan dari marker jabatan yang sama dengan pejabat_penandatangan (informasional, tidak disimpan sbg kolom terpisah).' });
}

/**
 * §18 — Penerima tugas/OPD. Pola "Kepada Yth./Yth./Kepala ..." — TIDAK
 * melakukan fuzzy-matching ke master OPD (murni ekstraksi teks mentah),
 * SELALU requires_review sesuai instruksi eksplisit ("Jika text candidate
 * tidak dapat diresolusi dgn aman: requires_review"). field_key memakai nama
 * kolom asli `opd_penerima_nama` (ProsnSuratPenugasan) supaya benar2
 * ter-terapkan bila user mengonfirmasi, bukan sekadar informasional.
 */
function extractOpdPenerimaNama(text) {
  // Dicari BERBASIS BARIS (label harus berada di AWAL baris), bukan substring
  // bebas di seluruh dokumen — pola lama (`Kepada\s+...`) mensyaratkan spasi
  // persis setelah "Kepada", sehingga gagal pada label surat yang lazim
  // ditulis "Kepada," (koma) dan malah salah menangkap kemunculan kata
  // "kepada" di tengah kalimat isi surat (temuan biner nyata: Surat Penugasan
  // asli menangkap "kepada Perum Bulog, dengan ini kami sampaikan..." krn itu
  // kemunculan PERTAMA yg diikuti spasi, bukan label "Kepada," yg sebenarnya).
  const lines = String(text || '').split(/\r?\n/);
  const LABEL_LINE = /^\s*(?:Kepada|Yth\.?)\b[\s,:.-]*(.*)$/i;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(LABEL_LINE);
    if (!m) continue; // eslint-disable-line no-continue
    const sameLine = m[1] && m[1].trim().length >= 5 ? m[1].trim() : null;
    let raw = sameLine;
    if (!raw) {
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j += 1) {
        const candidate = lines[j].trim();
        if (!candidate || candidate.length < 5) continue; // eslint-disable-line no-continue -- lewati baris kosong/kota pendek ("di", "Sofifi")
        raw = candidate;
        break;
      }
    }
    if (!raw) continue; // eslint-disable-line no-continue
    // Lepas noise OCR non-huruf di awal baris + prefiks jabatan personal
    // ("Kepala"/"Yth." SEBELUM nama OPD itu sendiri) supaya field ini
    // merepresentasikan NAMA OPD, bukan jabatan orangnya — mis. "Kepala Dinas
    // Pangan Provinsi Maluku Utara" -> "Dinas Pangan Provinsi Maluku Utara".
    const kandidat = raw
      .replace(/^[^A-Za-z]+/, '')
      .replace(/^(?:Yth\.?|Kepala)\s+/i, '')
      .trim()
      .replace(/[.,]$/, '');
    if (!kandidat || kandidat.length < 5 || /^di$/i.test(kandidat)) continue; // eslint-disable-line no-continue
    return field('opd_penerima_nama', kandidat, { confidence: 'MEDIUM', method: 'regex_kepada_yth_v2', requiresReview: true, reason: 'Kandidat penerima dari label "Kepada/Yth." pada baris — bukan hasil pencocokan master OPD, wajib ditinjau.' });
  }
  return field('opd_penerima_nama', null);
}

/**
 * §19 — Tanggal berlaku HARUS berbeda dari tanggal_surat: HANYA diisi bila
 * dokumen SECARA EKSPLISIT menyatakan frasa "berlaku" (mis. "berlaku sejak
 * tanggal ...", "terhitung mulai tanggal ..."). TIDAK PERNAH mengasumsikan
 * tanggal_berlaku = tanggal_surat begitu saja walau kebetulan sama nilainya
 * pada sebagian dokumen. field_key memakai nama kolom asli
 * `tanggal_mulai_berlaku` (ProsnSuratPenugasan).
 */
function extractTanggalMulaiBerlaku(text) {
  const cue = text.match(/berlaku\s*(?:sejak|mulai|terhitung\s+mulai)?\s*(?:tanggal\s*)?/i);
  if (!cue) return field('tanggal_mulai_berlaku', null);
  const windowText = text.slice(cue.index, cue.index + 100);
  const tanggal = extractIndonesianDate(windowText);
  if (!tanggal) return field('tanggal_mulai_berlaku', null);
  return field('tanggal_mulai_berlaku', tanggal.value, { confidence: 'HIGH', method: 'regex_tanggal_berlaku_v1', reason: 'Ditemukan dekat frasa eksplisit "berlaku" — bukan diasumsikan sama dgn tanggal_surat.' });
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
    extractJabatanPenandatangan(text),
    extractOpdPenerimaNama(text),
    extractTanggalMulaiBerlaku(text),
    ...extractCakupan(text),
    extractRingkasanIsi(text),
  ];
}

module.exports = { extractSuratPenugasanFields, extractIndonesianDate, extractSignerBlock, BULAN_ID, field };

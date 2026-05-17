"use strict";

const DEFAULT_MAX_INPUT_CHARS = 12000;

const ALLOWED_PROVIDER_FIELDS = [
  "proposal_source_type",
  "nomor_temuan",
  "judul_temuan",
  "ringkasan_temuan",
  "status_tindak_lanjut",
  "tahun",
  "periode_type",
  "periode_label",
  "nama_opd",
  "unit_terkait",
  "tahun_pemeriksaan",
  "tanggal_dokumen",

  "akun_pos",
  "jenis_transaksi",
  "jenis_dokumen_pertanggungjawaban",
  "status_dokumen",
  "catatan_koreksi",

  "nama_kegiatan",
  "tahapan_pelaksanaan",
  "lokasi",
  "output_kegiatan",
  "kendala_pelaksanaan",
  "target_pelaksanaan",

  "nama_kategori_baru",
  "deskripsi_kategori_baru",
  "alasan_pengajuan_kategori",
  "contoh_sumber_risiko",
];

const cleanText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const isTruthyEnv = (value) =>
  ["1", "true", "yes", "on"].includes(
    String(value || "").trim().toLowerCase()
  );

const getMaxInputChars = () => {
  const value = Number(process.env.MR_NARRATIVE_MAX_INPUT_CHARS || 0);
  return value > 0 ? value : DEFAULT_MAX_INPUT_CHARS;
};

const maskMoney = (text) => {
  if (!isTruthyEnv(process.env.MR_NARRATIVE_MASK_MONEY)) return text;

  return text.replace(
    /Rp\.?\s?[\d.,]+/gi,
    "[NILAI_TEMUAN]"
  );
};

const maskDocumentNumber = (text) => {
  if (!isTruthyEnv(process.env.MR_NARRATIVE_MASK_DOCUMENT_NUMBER)) return text;

  return text.replace(
    /\b[A-Z]{1,10}[-/][A-Z0-9./-]{4,}\b/gi,
    "[NO_DOKUMEN]"
  );
};

const truncateText = (text, maxChars) => {
  if (!text || text.length <= maxChars) {
    return {
      value: text,
      truncated: false,
    };
  }

  return {
    value: `${text.slice(0, maxChars)}\n[TERPOTONG_KARENA_BATAS_INPUT]`,
    truncated: true,
  };
};

const sanitizeProviderPayload = (payload = {}) => {
  const maxChars = getMaxInputChars();
  const sanitized = {};
  const redactionNotes = [];
  let truncated = false;

  ALLOWED_PROVIDER_FIELDS.forEach((field) => {
    const rawValue = payload[field];

    if (rawValue === undefined || rawValue === null || rawValue === "") return;

    if (typeof rawValue === "number") {
      sanitized[field] = rawValue;
      return;
    }

    let value = cleanText(rawValue);

    if (!value) return;

    const beforeMask = value;
    value = maskMoney(value);
    value = maskDocumentNumber(value);

    if (value !== beforeMask) {
      redactionNotes.push(`Field ${field} mengalami masking.`);
    }

    const truncatedResult = truncateText(value, maxChars);

    if (truncatedResult.truncated) {
      truncated = true;
      redactionNotes.push(`Field ${field} dipotong karena melebihi batas karakter.`);
    }

    sanitized[field] = truncatedResult.value;
  });

  return {
    sanitizedPayload: sanitized,
    meta: {
      allowed_fields: ALLOWED_PROVIDER_FIELDS,
      max_input_chars: maxChars,
      truncated,
      redaction_notes: redactionNotes,
      masking: {
        money: isTruthyEnv(process.env.MR_NARRATIVE_MASK_MONEY),
        document_number: isTruthyEnv(process.env.MR_NARRATIVE_MASK_DOCUMENT_NUMBER),
      },
    },
  };
};

module.exports = {
  ALLOWED_PROVIDER_FIELDS,
  sanitizeProviderPayload,
};
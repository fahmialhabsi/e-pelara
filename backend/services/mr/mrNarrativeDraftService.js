'use strict';

/**
 * MR Narrative Draft Service
 *
 * PHASE 4 — STEP 18C-1B
 * AI-Assisted Proposal Intake Narrative Drafting Foundation.
 *
 * Guard:
 * - Service ini hanya membuat draft narasi.
 * - Service ini tidak boleh menghitung skor risiko.
 * - Service ini tidak boleh mengubah workflow.
 * - Service ini tidak boleh menerima / mengembalikan field teknis governance.
 * - User tetap menjadi final reviewer sebelum data disimpan ke proposal-intake.
 */

const {
  executeNarrativeProvider,
  executeRuleEnhancedFallbackProvider,
} = require('./narrativeProviders/narrativeProviderFactory');
const { getAuditNarrativeStyleBlock } = require('./narrativeProviders/narrativeAuditStyleHelper');

const TECHNICAL_BLOCKED_FIELDS = [
  'id',
  'context_id',
  'context_item_id',
  'periode_id',
  'renstra_id',
  'indikator_id',
  'stage',
  'ref_id',
  'source_table',
  'source_id',
  'kode_risiko',
  'kemungkinan',
  'dampak',
  'skor_risiko',
  'level_risiko',
  'level_risiko_ref_id',
  'matrix_code',
  'matrix_id',
  'is_above_appetite',
  'risk_code_auto_generated',
  'is_priority_candidate',
  'owner_user_id',
  'owner_division_id',
  'versi',
  'status_revisi',
  'last_revised_at',
  'last_revised_by',
  'dibuat_oleh',
  'diverifikasi_oleh',
  'disetujui_oleh',
  'ditolak_oleh',
  'dibuat_pada',
  'diverifikasi_pada',
  'disetujui_pada',
  'ditolak_pada',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
];

const ALLOWED_SOURCE_TYPES = [
  'TINDAK_LANJUT_BPK',
  'TINDAK_LANJUT_INSPEKTORAT',
  'LAKIP',
  'LAPORAN_KEUANGAN',
  'PELAKSANAAN_KEGIATAN',
  'PERTANGGUNGJAWABAN_KEUANGAN',
  'SPIP_E_SIGAP',
  'MANUAL_ADHOC',
  'LAINNYA',
];

const OUTPUT_FIELDS = [
  'rekomendasi',
  'objek_risiko',
  'nama_risiko',
  'uraian_risiko',
  'penyebab_risiko',
  'dampak_risiko',
  'rencana_tindak_lanjut_awal',
  'pic',
  'target_waktu',
  'catatan',
];

const REQUIRED_OUTPUT_FIELDS = [
  'rekomendasi',
  'objek_risiko',
  'nama_risiko',
  'uraian_risiko',
  'penyebab_risiko',
  'dampak_risiko',
  'rencana_tindak_lanjut_awal',
  'pic',
  'catatan',
];

class NarrativeDraftError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'NarrativeDraftError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const cleanText = (value) =>
  String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeSourceType = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');

const cleanObject = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    }),
  );

const assertRequired = (payload = {}, fields = []) => {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new NarrativeDraftError(`Field wajib belum lengkap: ${missing.join(', ')}`, 400, {
      missing_fields: missing,
    });
  }
};

const assertNoBlockedFields = (payload = {}) => {
  const blocked = TECHNICAL_BLOCKED_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(payload, field),
  );

  if (blocked.length > 0) {
    throw new NarrativeDraftError(
      `Field tidak diperbolehkan untuk draft narasi: ${blocked[0]}`,
      400,
      {
        blocked: true,
        blocked_fields: blocked,
      },
    );
  }
};

// UBAH FUNGSI INI
const getRequiredFieldsBySource = (payload) => {
  const sourceType = normalizeSourceType(payload.proposal_source_type);

  if (sourceType === 'TINDAK_LANJUT_BPK' || sourceType === 'TINDAK_LANJUT_INSPEKTORAT') {
    return ['proposal_source_type', 'judul_temuan', 'ringkasan_temuan', 'status_tindak_lanjut'];
  }

  if (sourceType === 'LAKIP') {
    return ['proposal_source_type', 'ringkasan_temuan'];
  }

  if (sourceType === 'LAPORAN_KEUANGAN') {
    return ['proposal_source_type', 'akun_pos'];
  }

  if (sourceType === 'PELAKSANAAN_KEGIATAN') {
    return ['proposal_source_type', 'nama_kegiatan'];
  }

  if (sourceType === 'PERTANGGUNGJAWABAN_KEUANGAN') {
    return ['proposal_source_type', 'jenis_dokumen_pertanggungjawaban'];
  }

  // ✨ TAMBAHKAN LOGIKA INI:
  // Jika nama_kegiatan ada (jalur Renstra), ringkasan_temuan tidak lagi diwajibkan
  if (payload.nama_kegiatan) {
    return ['proposal_source_type'];
  }

  return ['proposal_source_type', 'ringkasan_temuan'];
};

const buildSourceInstruction = (sourceType) => {
  const commonInstruction = `
Anda adalah asisten penyusun draft narasi Manajemen Risiko sektor pemerintahan daerah.

Tugas:
1. Pahami substansi input.
2. Jangan menyalin mentah ringkasan sebagai rekomendasi.
3. Susun narasi yang profesional, rasional, operasional, dan relevan.
4. Objek risiko harus menggambarkan objek pengendalian utama.
5. Nama risiko harus berupa pernyataan risiko, bukan sekadar judul temuan.
6. Penyebab risiko harus menjelaskan faktor penyebab utama.
7. Dampak risiko harus menjelaskan konsekuensi jika risiko tidak dikendalikan.
8. Rencana tindak lanjut awal harus berupa langkah konkret.
9. Catatan harus memuat kebutuhan koordinasi, pelaporan, bukti dukung, atau penguatan kelembagaan bila relevan.
10. Jangan membuat angka, tanggal, instansi, lokasi, atau fakta baru yang tidak ada dalam input.
11. Jangan mengisi skor risiko, level risiko, matrix, workflow, atau field teknis.
`;

  const sourceSpecific = {
    TINDAK_LANJUT_BPK:
      'Fokus pada tindak lanjut temuan pemeriksaan BPK, rekomendasi pemeriksaan, penguatan pengendalian, bukti tindak lanjut, PIC, target waktu, dan akuntabilitas penyelesaian.',
    TINDAK_LANJUT_INSPEKTORAT:
      'Fokus pada hasil pengawasan internal, perbaikan pengendalian intern, kepatuhan, penyelesaian rekomendasi, dan bukti tindak lanjut.',
    LAKIP:
      'Fokus pada akuntabilitas kinerja: penyusunan dan penyampaian LAKIP, indikator kinerja, target dan capaian, output/outcome, perjanjian kinerja, evaluasi SAKIP/APIP, kelengkapan bukti dukung, dan konsistensi data kinerja. Gunakan pola narasi pengawasan BPKP/BPK (bukan ringkasan generik).',
    LAPORAN_KEUANGAN:
      'Fokus pada akun/pos laporan keuangan, pengakuan, pengukuran, penyajian, pengungkapan, rekonsiliasi, bukti transaksi, dan kepatuhan standar akuntansi pemerintahan.',
    PELAKSANAAN_KEGIATAN:
      'Fokus pada target kegiatan, tahapan pelaksanaan, output, lokasi, kendala, keterlambatan, kualitas pelaksanaan, dan manfaat kegiatan.',
    PERTANGGUNGJAWABAN_KEUANGAN:
      'Fokus pada SPJ, bukti pengeluaran, validitas transaksi, kelengkapan dokumen, pajak, pertanggungjawaban bendahara, dan kepatuhan administrasi keuangan.',
    SPIP_E_SIGAP:
      'Fokus pada pengendalian intern, RTP, risiko operasional, monitoring SPIP, evidence, dan perbaikan kontrol.',
    MANUAL_ADHOC:
      'Fokus pada isu risiko ad hoc yang belum masuk kategori formal, tetapi tetap harus disusun secara terstruktur dan dapat diaudit.',
    LAINNYA:
      'Fokus pada kategori risiko baru, alasan pengajuan, objek pengendalian, potensi dampak, dan kebutuhan review oleh pengelola MR.',
  };

  const auditStyle = getAuditNarrativeStyleBlock();

  return [auditStyle, commonInstruction, `Fokus sumber risiko:\n${sourceSpecific[sourceType] || sourceSpecific.LAINNYA}`]
    .filter(Boolean)
    .join('\n\n');
};

const buildNarrativeJsonSchemaInstruction = () => `
Output wajib berupa JSON valid tanpa markdown, tanpa penjelasan tambahan.

Format:
{
  "rekomendasi": "string",
  "objek_risiko": "string",
  "nama_risiko": "string",
  "uraian_risiko": "string",
  "penyebab_risiko": "string",
  "dampak_risiko": "string",
  "rencana_tindak_lanjut_awal": "string",
  "pic": "string",
  "target_waktu": "string",
  "catatan": "string",
  "confidence": 0.0,
  "needs_user_review": true,
  "basis_ringkasan": ["string"]
}

Ketentuan:
- Semua field string wajib terisi.
- Gunakan bahasa Indonesia formal.
- Gunakan bullet list untuk penyebab_risiko, dampak_risiko, rencana_tindak_lanjut_awal, dan catatan bila substansinya banyak.
- confidence bernilai 0 sampai 1.
- needs_user_review wajib true.
`;

const buildPrompt = (payload = {}) => {
  const sourceType = normalizeSourceType(payload.proposal_source_type);

  return [
    buildSourceInstruction(sourceType),
    buildNarrativeJsonSchemaInstruction(),
    'Input proposal intake:',
    JSON.stringify(
      cleanObject({
        proposal_source_type: sourceType,
        nomor_temuan: payload.nomor_temuan,
        judul_temuan: payload.judul_temuan,
        ringkasan_temuan: payload.ringkasan_temuan,
        status_tindak_lanjut: payload.status_tindak_lanjut,
        tahun: payload.tahun,
        periode_type: payload.periode_type,
        periode_label: payload.periode_label,
        nama_opd: payload.nama_opd,
        unit_terkait: payload.unit_terkait,
        akun_pos: payload.akun_pos,
        jenis_transaksi: payload.jenis_transaksi,
        jenis_dokumen_pertanggungjawaban: payload.jenis_dokumen_pertanggungjawaban,
        nama_kegiatan: payload.nama_kegiatan,
        tahapan_pelaksanaan: payload.tahapan_pelaksanaan,
        lokasi: payload.lokasi,
        output_kegiatan: payload.output_kegiatan,
        kendala_pelaksanaan: payload.kendala_pelaksanaan,
        target_pelaksanaan: payload.target_pelaksanaan,
        nama_kategori_baru: payload.nama_kategori_baru,
        deskripsi_kategori_baru: payload.deskripsi_kategori_baru,
        alasan_pengajuan_kategori: payload.alasan_pengajuan_kategori,
        contoh_sumber_risiko: payload.contoh_sumber_risiko,
      }),
      null,
      2,
    ),
  ].join('\n\n');
};

const parseJsonStrict = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new NarrativeDraftError('Provider narasi tidak mengembalikan teks.', 502);
  }

  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new NarrativeDraftError('Output provider narasi bukan JSON valid.', 502, {
        provider_output_preview: trimmed.slice(0, 500),
      });
    }

    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      throw new NarrativeDraftError('Output provider narasi gagal diparse sebagai JSON.', 502, {
        provider_output_preview: trimmed.slice(0, 500),
      });
    }
  }
};

const validateNarrativeResult = (result = {}) => {
  const missing = REQUIRED_OUTPUT_FIELDS.filter((field) => {
    const value = result[field];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new NarrativeDraftError(`Draft narasi belum lengkap: ${missing.join(', ')}`, 502, {
      missing_output_fields: missing,
    });
  }

  const technicalLeak = TECHNICAL_BLOCKED_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(result, field),
  );

  if (technicalLeak.length > 0) {
    throw new NarrativeDraftError(
      `Output narasi mengandung field teknis terlarang: ${technicalLeak[0]}`,
      502,
      {
        blocked_output_fields: technicalLeak,
      },
    );
  }

  const tooShortFields = REQUIRED_OUTPUT_FIELDS.filter((field) => {
    const value = result[field];

    if (typeof value !== 'string') return false;

    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

    return wordCount < 3;
  });

  if (tooShortFields.length > 0) {
    throw new NarrativeDraftError(
      `Draft narasi terlalu pendek: ${tooShortFields.join(', ')}`,
      502,
      {
        too_short_output_fields: tooShortFields,
      },
    );
  }

  return {
    rekomendasi: cleanText(result.rekomendasi),
    objek_risiko: cleanText(result.objek_risiko),
    nama_risiko: cleanText(result.nama_risiko),
    uraian_risiko: cleanText(result.uraian_risiko),
    penyebab_risiko: cleanText(result.penyebab_risiko),
    dampak_risiko: cleanText(result.dampak_risiko),
    rencana_tindak_lanjut_awal: cleanText(result.rencana_tindak_lanjut_awal),
    pic: cleanText(result.pic),
    target_waktu: cleanText(result.target_waktu),
    catatan: cleanText(result.catatan),
    confidence:
      typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0,
    needs_user_review: true,
    basis_ringkasan: Array.isArray(result.basis_ringkasan)
      ? result.basis_ringkasan.map(cleanText).filter(Boolean).slice(0, 10)
      : [],
  };
};

const normalizePreviewPayload = (body = {}) => {
  assertNoBlockedFields(body);

  const sourceType = normalizeSourceType(body.proposal_source_type);

  if (!ALLOWED_SOURCE_TYPES.includes(sourceType)) {
    throw new NarrativeDraftError('Sumber usulan risiko tidak didukung untuk draft narasi.', 400, {
      proposal_source_type: body.proposal_source_type,
      normalized_source_type: sourceType,
      allowed_source_types: ALLOWED_SOURCE_TYPES,
    });
  }

  const payload = cleanObject({
    proposal_source_type: sourceType,
    nomor_temuan: cleanText(body.nomor_temuan),
    judul_temuan: cleanText(body.judul_temuan),
    ringkasan_temuan: cleanText(body.ringkasan_temuan),
    status_tindak_lanjut: cleanText(body.status_tindak_lanjut),

    tahun: body.tahun ? Number(body.tahun) : undefined,
    periode_type: cleanText(body.periode_type),
    periode_label: cleanText(body.periode_label),

    nama_opd: cleanText(body.nama_opd),
    unit_terkait: cleanText(body.unit_terkait),

    akun_pos: cleanText(body.akun_pos),
    jenis_transaksi: cleanText(body.jenis_transaksi),
    jenis_dokumen_pertanggungjawaban: cleanText(body.jenis_dokumen_pertanggungjawaban),

    nama_kegiatan: cleanText(body.nama_kegiatan),
    tahapan_pelaksanaan: cleanText(body.tahapan_pelaksanaan),
    lokasi: cleanText(body.lokasi),
    output_kegiatan: cleanText(body.output_kegiatan),
    kendala_pelaksanaan: cleanText(body.kendala_pelaksanaan),
    target_pelaksanaan: cleanText(body.target_pelaksanaan),

    nama_kategori_baru: cleanText(body.nama_kategori_baru),
    deskripsi_kategori_baru: cleanText(body.deskripsi_kategori_baru),
    alasan_pengajuan_kategori: cleanText(body.alasan_pengajuan_kategori),
    contoh_sumber_risiko: cleanText(body.contoh_sumber_risiko),
    target_waktu: cleanText(body.target_waktu),
  });

  assertRequired(payload, getRequiredFieldsBySource(payload));

  return payload;
};

const previewProposalNarrative = async ({ body = {}, user = null } = {}) => {
  const payload = normalizePreviewPayload(body);
  const prompt = buildPrompt(payload);

  let providerResult = await executeNarrativeProvider({
    payload,
    prompt,
    user,
  });

  let result;

  try {
    result = validateNarrativeResult(providerResult.data);
  } catch (error) {
    const shouldFallbackFromExternalInvalidOutput =
      providerResult?.meta?.external_provider_requested === true &&
      providerResult?.meta?.provider !== 'rule_enhanced';

    if (!shouldFallbackFromExternalInvalidOutput) {
      throw error;
    }

    providerResult = await executeRuleEnhancedFallbackProvider({
      payload,
      prompt,
      user,
      requestedProvider: providerResult.meta.requested_provider,
      fallbackReason:
        error?.message ||
        'Output provider eksternal tidak lolos validasi. Fallback ke rule_enhanced.',
      providerErrorName: error?.name || 'ProviderValidationError',
      providerErrorDetails: error?.details || null,
    });

    result = validateNarrativeResult(providerResult.data);
  }

  return {
    success: true,
    message: 'Draft narasi berhasil dibuat.',
    data: result,
    meta: {
      provider: providerResult.meta.provider,
      requested_provider: providerResult.meta.requested_provider,
      fallback_used: providerResult.meta.fallback_used,
      fallback_reason: providerResult.meta.fallback_reason,
      provider_error_name: providerResult.meta.provider_error_name || null,
      provider_error_details: providerResult.meta.provider_error_details || null,
      needs_user_review: true,
      audit_mode: false,
      quality_guard: {
        enabled: true,
        min_word_guard: true,
        technical_output_guard: true,
        user_review_required: true,
      },
      provider_security_guard: {
        enabled: true,
        external_provider_enabled: providerResult.meta.external_provider_enabled,
        external_provider_requested: providerResult.meta.external_provider_requested,
        api_key_exposure_guard:
          'API key tidak boleh di-hardcode, tidak boleh dikirim ke frontend, dan tidak boleh dibagikan di chat/dokumen.',
      },
      generated_fields: OUTPUT_FIELDS,
      blocked_technical_fields: TECHNICAL_BLOCKED_FIELDS,
    },
  };
};

module.exports = {
  NarrativeDraftError,
  OUTPUT_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  TECHNICAL_BLOCKED_FIELDS,
  ALLOWED_SOURCE_TYPES,

  buildPrompt,
  normalizePreviewPayload,
  validateNarrativeResult,
  previewProposalNarrative,
};

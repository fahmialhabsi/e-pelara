const { assertFinalReportNotOverwrite, assertResidualRiskEvaluated, assertReportReadinessForFinalFlow } = require("./mrPolicyEngineService");
const { ensureReportSnapshotForFlow } = require("./mrSnapshotService");
const { buildReportGovernanceContract, dedupeRisikoPrioritas, dedupeRencanaPengendalian, dedupeRealisasiPengendalian, dedupeKejadianRisiko } = require("../../helpers/mr/mrReportGovernanceContractHelper");
// backend/services/mr/mrPlanningReportQueryService.js

const { sequelize, MrPlanningSnapshot } = require('../../models');
const { QueryTypes } = require('sequelize');

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toPercent = (part, total) => {
  const p = toNumber(part);
  const t = toNumber(total);

  if (!t) return 0;

  return Number(((p / t) * 100).toFixed(2));
};

// ─── R17C-2A: Placeholder guard ────────────────────────────────────────────
// Nilai-nilai di bawah ini dianggap placeholder / belum diisi dan wajib
// diganti dengan bahasa pemerintahan yang aman sebelum ditampilkan di laporan.
const PLACEHOLDER_PATTERNS = [
  /^isi\s+nama\s+risiko$/i,
  /^isi\s+uraian\s+risiko$/i,
  /^isi\s+nama$/i,
  /^isi\s+uraian$/i,
  /^isi\s+objek\s+risiko$/i,
  /^isi\s+kode\s+risiko$/i,
  /^isi\s+indikator$/i,
  /^isi\s+dampak$/i,
  /^isi\s+penyebab$/i,
  /^isi\s+judul\s+temuan\s+yang\s+sama$/i,
  /^isi\s+nomor\s+temuan\s+yang\s+sama$/i,
  /^isi\s+judul\s+temuan$/i,
  /^isi\s+nomor\s+temuan$/i,
  /^isi\s+.+$/i,
  /^todo$/i,
  /^tbd$/i,
  /^xxx+$/i,
  /^---+$/i,
  /^\.\.\.*$/,
];

/**
 * Kembalikan `fallback` jika `value` merupakan placeholder/belum diisi.
 * Nilai null/undefined/string kosong juga dianggap belum diisi.
 */
const cleanPlaceholder = (value, fallback = 'Belum Diisi') => {
  if (value === undefined || value === null) return fallback;
  const str = String(value).trim();
  if (!str) return fallback;
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(str))) return fallback;
  return str;
};

/**
 * Bersihkan nilai, kembalikan null jika placeholder/kosong.
 * Berguna untuk field numerik/kode yang tidak boleh tampil sebagai teks.
 */
const cleanPlaceholderOrNull = (value) => {
  const cleaned = cleanPlaceholder(value, null);
  return cleaned;
};

const isPlaceholderValue = (value) => {
  if (value === undefined || value === null) return false;

  const str = String(value).trim();

  if (!str) return false;

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(str));
};

const normalizeIssueValue = (value) => {
  if (value === undefined || value === null) return null;
  return String(value).trim();
};

const buildPlaceholderIssueKey = (issue = {}) =>
  [
    issue.source,
    issue.row_id,
    issue.context_id,
    issue.risk_id,
    issue.field,
    issue.value,
  ].join('|');

const buildPlaceholderSummaryKey = (issue = {}) =>
  [issue.source, issue.field, issue.value].join('|');

const buildRiskReference = (issue = {}) => ({
  row_id: issue.row_id || null,
  context_id: issue.context_id || null,
  risk_id: issue.risk_id || null,
  kode_risiko: issue.kode_risiko || null,
  kode_konteks: issue.kode_konteks || null,
});

const createPlaceholderIssue = ({ source, row = {}, field, value, severity = 'blocking' }) => ({
  source,
  row_id: row.id || row._raw_id || null,
  context_id: row.context_id || row.mr_planning_context_id || null,
  risk_id: row.risk_id || row.mr_planning_risk_id || row.id || null,
  kode_risiko: row.kode_risiko || null,
  kode_konteks: row.kode_konteks || null,
  field,
  value: normalizeIssueValue(value),
  severity,
  message: `Field ${field} pada ${source} masih berisi placeholder: ${normalizeIssueValue(value)}`,
});

const collectPlaceholderIssuesFromRow = ({
  source,
  row = {},
  fields = [],
  severity = 'blocking',
}) => {
  if (!row || typeof row !== 'object') return [];

  return fields
    .filter((field) => isPlaceholderValue(row[field]))
    .map((field) =>
      createPlaceholderIssue({
        source,
        row,
        field,
        value: row[field],
        severity,
      }),
    );
};

const collectPlaceholderIssuesFromMetadata = ({
  source,
  row = {},
  metadata = {},
  fields = [],
  severity = 'blocking',
}) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }

  return fields
    .filter((field) => isPlaceholderValue(metadata[field]))
    .map((field) =>
      createPlaceholderIssue({
        source,
        row,
        field: `metadata_json.${field}`,
        value: metadata[field],
        severity,
      }),
    );
};

const buildReportDataQualityGate = ({ context = {}, contextItems = [], lampiran = {} } = {}) => {
  const daftarRisiko = Array.isArray(lampiran.daftar_risiko) ? lampiran.daftar_risiko : [];

  const risikoPrioritas = Array.isArray(lampiran.risiko_prioritas) ? lampiran.risiko_prioritas : [];

  const rencanaPengendalian = Array.isArray(lampiran.rencana_pengendalian)
    ? lampiran.rencana_pengendalian
    : [];

  const realisasiPengendalian = Array.isArray(lampiran.realisasi_pengendalian)
    ? lampiran.realisasi_pengendalian
    : [];

  const reviuUsulanRisikoBaru = Array.isArray(lampiran.reviu_usulan_risiko_baru)
    ? lampiran.reviu_usulan_risiko_baru
    : [];

  const riskMap = lampiran.risk_map || {};

  const generatedSections =
    lampiran.generated_sections &&
    typeof lampiran.generated_sections === 'object' &&
    !Array.isArray(lampiran.generated_sections)
      ? lampiran.generated_sections
      : {};

  const issues = [];

  daftarRisiko.forEach((risk) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'lampiran.daftar_risiko',
        row: risk,
        fields: [
          'nama_risiko',
          'risk_statement',
          'uraian_risiko',
          'penyebab_risiko',
          'dampak_risiko',
          'kategori_risiko',
          'sumber_risiko',
          'metode_pencapaian_tujuan_spip',
          'kode_risiko',
          'jenis_konteks',
          'nama_konteks_laporan',
          'indikator_atau_objek_risiko',
        ],
      }),
    );

    issues.push(
      ...collectPlaceholderIssuesFromMetadata({
        source: 'lampiran.daftar_risiko',
        row: risk,
        metadata: risk.metadata_json,
        fields: [
          'judul_temuan',
          'nomor_temuan',
          'ringkasan_temuan',
          'objek_risiko',
          'rekomendasi',
          'rencana_tindak_lanjut_awal',
        ],
      }),
      ...collectPlaceholderIssuesFromMetadata({
        source: 'lampiran.daftar_risiko.context_item_metadata_json',
        row: risk,
        metadata: risk.context_item_metadata_json,
        fields: [
          'judul_temuan',
          'nomor_temuan',
          'ringkasan_temuan',
          'objek_risiko',
          'rekomendasi',
          'rencana_tindak_lanjut_awal',
        ],
      }),
    );
  });

  contextItems.forEach((item) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'context_items',
        row: item,
        fields: [
          'kode_konteks',
          'nama_konteks',
          'uraian_konteks',
          'kode_indikator',
          'nama_indikator',
          'penanggung_jawab',
        ],
      }),
    );

    issues.push(
      ...collectPlaceholderIssuesFromMetadata({
        source: 'context_items',
        row: item,
        metadata: item.metadata_json,
        fields: [
          'judul_temuan',
          'nomor_temuan',
          'ringkasan_temuan',
          'objek_risiko',
          'rekomendasi',
          'rencana_tindak_lanjut_awal',
          'pic',
        ],
      }),
    );
  });

  risikoPrioritas.forEach((risk) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'lampiran.risiko_prioritas',
        row: risk,
        fields: ['nama_risiko', 'uraian_risiko', 'priority_reason'],
      }),
    );
  });

  rencanaPengendalian.forEach((item) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'lampiran.rencana_pengendalian',
        row: item,
        fields: [
          'kegiatan_pengendalian',
          'target_output',
          'indikator_keluaran',
          'penanggung_jawab',
        ],
      }),
    );
  });

  realisasiPengendalian.forEach((item) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'lampiran.realisasi_pengendalian',
        row: item,
        fields: ['hasil_monitoring', 'realisasi_mitigasi', 'kendala', 'tindak_lanjut'],
      }),
    );
  });

  reviuUsulanRisikoBaru.forEach((risk) => {
    issues.push(
      ...collectPlaceholderIssuesFromRow({
        source: 'lampiran.reviu_usulan_risiko_baru',
        row: risk,
        fields: [
          'nama_risiko',
          'kode_risiko',
          'status_risiko',
          'status_revisi',
          'keputusan_reviu',
          'alasan_jika_ditolak',
        ],
      }),
    );
  });

  if (Array.isArray(riskMap)) {
    riskMap.forEach((row) => {
      issues.push(
        ...collectPlaceholderIssuesFromRow({
          source: 'lampiran.risk_map',
          row,
          fields: [
            'nama_risiko',
            'kode_risiko',
            'level_risiko',
            'skor_risiko',
            'inherent_level',
            'residual_level',
            'actual_level',
          ],
        }),
      );
    });
  } else if (riskMap && typeof riskMap === 'object') {
    Object.entries(riskMap).forEach(([mapType, group]) => {
      if (!group || typeof group !== 'object') return;

      Object.values(group).forEach((cell) => {
        const risks = Array.isArray(cell?.risks) ? cell.risks : [];

        risks.forEach((risk) => {
          issues.push(
            ...collectPlaceholderIssuesFromRow({
              source: `lampiran.risk_map.${mapType}`,
              row: risk,
              fields: [
                'nama_risiko',
                'kode_risiko',
                'level_risiko',
                'skor_risiko',
                'inherent_level',
                'residual_level',
                'actual_level',
              ],
            }),
          );
        });
      });
    });
  }

  Object.entries(generatedSections).forEach(([sectionKey, section]) => {
    const rows = Array.isArray(section?.rows) ? section.rows : [];

    rows.forEach((row) => {
      issues.push(
        ...collectPlaceholderIssuesFromRow({
          source: `generated_sections.${sectionKey}`,
          row,
          fields: [
            'nama_risiko',
            'nama_usulan_risiko',
            'pernyataan_risiko',
            'uraian_risiko',
            'nama_konteks',
            'indikator',
            'indikator_atau_objek_risiko',
            'kategori_risiko',
            'uraian_dampak',
            'kode_risiko',
            'objek_risiko',
            'judul_temuan',
            'nomor_temuan',
          ],
        }),
      );

      issues.push(
        ...collectPlaceholderIssuesFromMetadata({
          source: `generated_sections.${sectionKey}`,
          row,
          metadata: row.metadata_json,
          fields: [
            'judul_temuan',
            'nomor_temuan',
            'ringkasan_temuan',
            'objek_risiko',
            'rekomendasi',
            'rencana_tindak_lanjut_awal',
          ],
        }),
      );
    });
  });

  const uniqueIssues = Array.from(
    new Map(
      issues.map((issue) => {
        return [buildPlaceholderIssueKey(issue), issue];
      }),
    ).values(),
  );

  const placeholderSummaryMap = new Map();

  uniqueIssues.forEach((issue) => {
    const key = buildPlaceholderSummaryKey(issue);
    const current = placeholderSummaryMap.get(key) || {
      source: issue.source,
      field: issue.field,
      value: issue.value,
      severity: issue.severity,
      count: 0,
      risk_ids: [],
      row_ids: [],
      context_ids: [],
      kode_risiko_list: [],
      kode_konteks_list: [],
      references: [],
      message: issue.message,
    };

    current.count += 1;
    current.references.push(buildRiskReference(issue));

    if (issue.risk_id !== null && issue.risk_id !== undefined) {
      current.risk_ids.push(issue.risk_id);
    }

    if (issue.row_id !== null && issue.row_id !== undefined) {
      current.row_ids.push(issue.row_id);
    }

    if (issue.context_id !== null && issue.context_id !== undefined) {
      current.context_ids.push(issue.context_id);
    }

    if (issue.kode_risiko) {
      current.kode_risiko_list.push(issue.kode_risiko);
    }

    if (issue.kode_konteks) {
      current.kode_konteks_list.push(issue.kode_konteks);
    }

    placeholderSummaryMap.set(key, current);
  });

  const placeholderSummary = Array.from(placeholderSummaryMap.values()).map((item) => ({
    ...item,
    risk_ids: [...new Set(item.risk_ids)],
    row_ids: [...new Set(item.row_ids)],
    context_ids: [...new Set(item.context_ids)],
    kode_risiko_list: [...new Set(item.kode_risiko_list)],
    kode_konteks_list: [...new Set(item.kode_konteks_list)],
  }));

  const blockingIssues = uniqueIssues.filter((issue) => issue.severity === 'blocking');

  return {
    status: blockingIssues.length ? 'merah' : 'hijau',
    report_context_id: context?.id || null,
    tahun: context?.tahun || null,
    nama_opd: context?.nama_opd || null,
    placeholder_count: uniqueIssues.length,
    blocking_placeholder_count: blockingIssues.length,
    has_placeholder: uniqueIssues.length > 0,
    has_blocking_placeholder: blockingIssues.length > 0,
    blocking_issues: blockingIssues.map((issue) => issue.message),
    issues: uniqueIssues,
    placeholder_summary: placeholderSummary,
    unique_placeholder_fields: placeholderSummary.map((item) => ({
      source: item.source,
      field: item.field,
      value: item.value,
      count: item.count,
      risk_ids: item.risk_ids,
      kode_risiko_list: item.kode_risiko_list,
      context_ids: item.context_ids,
      row_ids: item.row_ids,
    })),
    issue_preview: uniqueIssues.slice(0, 25),
    message: blockingIssues.length
      ? `Terdapat ${blockingIssues.length} field placeholder yang harus diperbaiki dari sumber data sebelum laporan dinyatakan final.`
      : 'Tidak ditemukan placeholder blocking pada data laporan.',
  };
};

const getReportDataQualityGate = (report = {}) => {
  return (
    report?.data_quality_gate ||
    report?.report_quality_gate?.data_quality_gate ||
    report?.lampiran?.data_quality_gate ||
    null
  );
};

const buildDataQualityWarningNotice = (report = {}) => {
  const gate = getReportDataQualityGate(report);

  if (!gate?.has_blocking_placeholder && !gate?.has_placeholder) {
    return null;
  }

  const count = Number(gate?.blocking_placeholder_count || gate?.placeholder_count || 0);

  const issues = Array.isArray(gate?.issue_preview)
    ? gate.issue_preview
    : Array.isArray(gate?.issues)
      ? gate.issues.slice(0, 10)
      : [];

  return {
    title: 'CATATAN DATA QUALITY',
    status: gate?.status || 'merah',
    placeholder_count: Number(gate?.placeholder_count || 0),
    blocking_placeholder_count: Number(gate?.blocking_placeholder_count || 0),
    message: `Laporan ini masih memuat ${count} field placeholder yang harus diperbaiki dari sumber data sebelum laporan dinyatakan final atau siap ditandatangani. File ini dapat digunakan untuk review internal, tetapi belum menjadi dokumen final.`,
    issues,
  };
};

const appendDataQualityGateToReportQualityGate = (reportQualityGate = {}, dataQualityGate = {}) => {
  if (!dataQualityGate?.has_blocking_placeholder) {
    return {
      ...reportQualityGate,
      data_quality_gate: dataQualityGate,
    };
  }

  const dataQualityIssue =
    dataQualityGate.message || 'Masih terdapat placeholder pada data laporan.';

  const pedomanBlockingIssues = [
    ...(reportQualityGate.pedoman_blocking_issues || []),
    `Data Quality: ${dataQualityIssue}`,
  ];

  const finalReportBlockingIssues = [
    ...(reportQualityGate.final_report_blocking_issues || []),
    'Data laporan masih memuat placeholder sehingga belum boleh menjadi laporan final/PDF.',
  ];

  const blockingIssues = [
    ...(reportQualityGate.blocking_issues || []),
    `Data Quality: ${dataQualityIssue}`,
  ];

  const pedomanSummary = reportQualityGate.pedoman_summary || {};
  const previousMerah = Number(pedomanSummary.merah || 0);
  const previousHijau = Number(pedomanSummary.hijau || 0);

  return {
    ...reportQualityGate,
    data_quality_gate: dataQualityGate,

    pedoman_overall_status: 'merah',
    overall_status: 'merah',
    final_report_status: 'pedoman_has_blocking_issues',
    pdf_ready: false,

    pedoman_summary: {
      ...pedomanSummary,
      merah: Math.max(previousMerah, 1),
      hijau: previousMerah > 0 ? previousHijau : Math.max(previousHijau - 1, 0),
    },

    pedoman_blocking_issues: [...new Set(pedomanBlockingIssues)],
    final_report_blocking_issues: [...new Set(finalReportBlockingIssues)],

    blocking_issues: [...new Set(blockingIssues)],
    non_blocking_notes: reportQualityGate.non_blocking_notes || [],
  };
};

// ─── R17C-2A: Helper Metode Pencapaian Tujuan SPIP ─────────────────────────
/**
 * Petakan stage/source ke deskripsi Metode Pencapaian Tujuan SPIP
 * sesuai PP No. 60 Tahun 2008.
 * Kolom ini belum ada di DB saat ini; didapat dari inferensi konteks.
 */
const SPIP_METHOD_MAP = {
  renstra:
    '1. Kegiatan yang Efektif dan Efisien; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  program:
    '1. Kegiatan yang Efektif dan Efisien; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  strategi: '1. Kegiatan yang Efektif dan Efisien',
  sub_kegiatan: '1. Kegiatan yang Efektif dan Efisien',
  temuan_bpk:
    '2. Keandalan Pelaporan Keuangan; 3. Pengamanan Aset Negara; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  tindak_lanjut_bpk:
    '2. Keandalan Pelaporan Keuangan; 3. Pengamanan Aset Negara; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  temuan_inspektorat:
    '1. Kegiatan yang Efektif dan Efisien; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  tindak_lanjut_inspektorat:
    '1. Kegiatan yang Efektif dan Efisien; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  pelaksanaan_kegiatan: '1. Kegiatan yang Efektif dan Efisien',
  pertanggungjawaban_keuangan: '2. Keandalan Pelaporan Keuangan; 3. Pengamanan Aset Negara',
  spip_e_sigap:
    '1. Kegiatan yang Efektif dan Efisien; 4. Ketaatan terhadap Peraturan Perundang-undangan',
  manual_adhoc: '1. Kegiatan yang Efektif dan Efisien',
  lainnya: 'Belum Tersedia',
};

const resolveSpipMethod = (item = {}) => {
  // Prioritas: field DB jika suatu saat tersedia
  if (item.metode_pencapaian_tujuan_spip && !/belum/i.test(item.metode_pencapaian_tujuan_spip)) {
    return item.metode_pencapaian_tujuan_spip;
  }

  const stage = String(item.stage || '')
    .toLowerCase()
    .trim();
  const sourceTable = String(item.source_table || '')
    .toLowerCase()
    .trim();
  const proposalCode = String(item.proposal_source_code || '')
    .toLowerCase()
    .trim();
  const objectType = String(item.object_source_type || '')
    .toLowerCase()
    .trim();

  // Cek dari proposal_source_code dulu (lebih spesifik)
  if (proposalCode && SPIP_METHOD_MAP[proposalCode]) {
    return SPIP_METHOD_MAP[proposalCode];
  }

  // Cek stage
  if (stage && SPIP_METHOD_MAP[stage]) return SPIP_METHOD_MAP[stage];

  // Inferensi dari object_source_type
  if (objectType === 'indikator_renstra') {
    return SPIP_METHOD_MAP.renstra;
  }

  // Inferensi dari source_table
  for (const [key, val] of Object.entries(SPIP_METHOD_MAP)) {
    if (sourceTable.includes(key)) return val;
  }

  return 'Belum Tersedia';
};

// ─── R17C-2A: Mapper rows Pedoman No 4 ─────────────────────────────────────
/**
 * Ubah raw daftarRisiko menjadi rows siap cetak sesuai kolom Form Coaching Clinic
 * Inspektorat — Pedoman No 4 (Identifikasi Risiko):
 *   Jenis Konteks | Nama Konteks | Anggaran | Indikator |
 *   Kode Risiko | Pernyataan Risiko | Kategori Risiko |
 *   Uraian Dampak | Metode Pencapaian Tujuan SPIP
 *
 * Aturan:
 * - Placeholder seperti "isi nama risiko", "isi uraian risiko" → "Belum Diisi"
 * - Null/tidak ada → "Belum Tersedia" atau "Belum ditetapkan" sesuai konteks
 * - Tidak membuat data palsu
 * - Fallback dari field metadata yang sudah ada
 */
const buildPedoman4Rows = (daftarRisiko = []) => {
  if (!Array.isArray(daftarRisiko) || !daftarRisiko.length) return [];

  return daftarRisiko.map((item, idx) => {
    // 1. Jenis Konteks — dari jenis_konteks atau fallback stage/source
    const jenisKonteks =
      cleanPlaceholder(item.jenis_konteks, null) ||
      cleanPlaceholder(item.sumber_data, null) ||
      cleanPlaceholder(item.object_source_type, null) ||
      cleanPlaceholder(item.stage, null) ||
      'Belum Tersedia';

    // 2. Nama Konteks — dari nama_konteks_laporan atau fallback
    const namaKonteks =
      cleanPlaceholder(item.nama_konteks_laporan, null) ||
      cleanPlaceholder(item.nama_konteks, null) ||
      cleanPlaceholder(item.indikator_atau_objek_risiko, null) ||
      cleanPlaceholder(item.nama_indikator, null) ||
      'Belum Tersedia';

    // 3. Anggaran — nilai numerik jika ada, teks fallback jika tidak
    let anggaran = 'Belum Tersedia';
    const anggaranRaw = item.anggaran_terkait ?? item.nilai_terkait;
    if (anggaranRaw !== null && anggaranRaw !== undefined && anggaranRaw !== '') {
      const anggaranNum = Number(anggaranRaw);
      if (Number.isFinite(anggaranNum) && anggaranNum > 0) {
        anggaran = anggaranNum;
      } else if (String(anggaranRaw).trim()) {
        anggaran = String(anggaranRaw).trim();
      }
    }

    // 4. Indikator — kode + nama indikator, atau objek risiko untuk non-Renstra
    const indikatorLabel =
      cleanPlaceholder(item.indikator_atau_objek_risiko, null) ||
      cleanPlaceholder(item.nama_indikator, null) ||
      cleanPlaceholder(item.kode_indikator, null) ||
      cleanPlaceholder(item.nama_konteks_laporan, null) ||
      'Belum Tersedia';

    // 5. Kode Risiko — wajib ada, jika tidak ada gunakan placeholder resmi
    const kodeRisiko = cleanPlaceholder(item.kode_risiko, null) || 'Belum ditetapkan';

    // 6. Pernyataan Risiko — nama_risiko atau uraian; cegah placeholder
    const pernyataanRisiko =
      cleanPlaceholder(item.nama_risiko, null) ||
      cleanPlaceholder(item.uraian_risiko, null) ||
      'Belum Diisi';

    // 7. Kategori Risiko — dari field kategori; fallback "Belum Diisi"
    const kategoriRisiko = cleanPlaceholder(item.kategori_risiko, null) || 'Belum Diisi';

    // 8. Uraian Dampak — dari dampak_risiko atau uraian_risiko jika ada
    const uraianDampak = cleanPlaceholder(item.dampak_risiko, null) || 'Belum Diisi';

    // 9. Metode Pencapaian Tujuan SPIP — inferensi dari stage/source
    const metodePencapaianSpip = resolveSpipMethod(item);

    return {
      no: idx + 1,
      jenis_konteks: jenisKonteks,
      nama_konteks: namaKonteks,
      anggaran,
      indikator: indikatorLabel,
      kode_risiko: kodeRisiko,
      pernyataan_risiko: pernyataanRisiko,
      kategori_risiko: kategoriRisiko,
      uraian_dampak: uraianDampak,
      metode_pencapaian_tujuan_spip: metodePencapaianSpip,

      // Field asli tetap tersedia untuk backward-compat
      _raw_id: item.id,
      _raw_status: item.status_revisi,
      _raw_skor: item.skor_risiko,
      _raw_level: item.level_risiko,
      _is_placeholder:
        cleanPlaceholder(item.nama_risiko, null) === null ||
        cleanPlaceholder(item.uraian_risiko, null) === null,
    };
  });
};
// ─── end R17C-2A helpers ────────────────────────────────────────────────────

const NIL_EVENT_MESSAGE = 'Tidak terdapat kejadian risiko aktual dalam cakupan laporan.';

const NIL_UNREALIZED_CONTROL_MESSAGE =
  'Tidak terdapat rencana pengendalian yang belum terealisasi dalam cakupan laporan.';

const UNASSESSED_EFFECTIVENESS_MESSAGE = 'Belum dapat dinilai.';

const REPORT_FIELD_ORIGIN_GROUPS = {
  USER_INPUT: 'user_input_fields',
  REFERENCE: 'reference_fields',
  HIDDEN_SYSTEM_MAPPED: 'hidden_system_mapped_fields',
  AUTO_CALCULATED: 'auto_calculated_fields',
  AUTO_GENERATED_REPORT: 'auto_generated_report_sections',
  FALLBACK: 'fallback_sections',
};

const REFERENCE_GROUP_CODES = [
  'RISK_CATEGORY',
  'RISK_SOURCE',
  'RISK_APPETITE',
  'IMPACT_AREA',
  'LIKELIHOOD',
  'IMPACT',
  'RISK_LEVEL',
  'RISK_STATUS',
  'MITIGATION_RESPONSE',
  'CONTROL_EFFECTIVENESS',
  'WARNING_SEVERITY',
  'DEVIATION_SEVERITY',
  'PERIODE_TYPE',
  'CONTEXT_TYPE',
  'ROOT_CAUSE_CATEGORY',
  'SPIP_ELEMENT',
  'SPIP_SUB_ELEMENT',
  'RTP_OUTPUT',
  'SPIP_METHOD',
  'PRIORITY_LEVEL',
  'REVIEW_STATUS',
  'MONITORING_STATUS',
];

const HIGH_RISK_LEVELS = ['TINGGI', 'HIGH', 'EKSTREM', 'EXTREME'];

const APPROVED_RISK_STATUSES = ['approved', 'final', 'selesai', 'disetujui'];

const DRAFT_RISK_STATUSES = ['draft'];

const VERIFICATION_RISK_STATUSES = ['verifikasi', 'diajukan', 'diverifikasi'];

const REJECTED_RISK_STATUSES = ['ditolak', 'rejected'];

const normalizeReportStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isApprovedRiskStatus = (value) =>
  APPROVED_RISK_STATUSES.includes(normalizeReportStatus(value));

const buildUnifiedReportApprovalGate = ({ daftarRisiko = [] } = {}) => {
  const rows = Array.isArray(daftarRisiko) ? daftarRisiko : [];

  const totalRisiko = rows.length;

  const approvedRows = rows.filter((risk) => isApprovedRiskStatus(risk.status_revisi));

  const draftRows = rows.filter((risk) =>
    DRAFT_RISK_STATUSES.includes(normalizeReportStatus(risk.status_revisi)),
  );

  const verificationRows = rows.filter((risk) =>
    VERIFICATION_RISK_STATUSES.includes(normalizeReportStatus(risk.status_revisi)),
  );

  const rejectedRows = rows.filter((risk) =>
    REJECTED_RISK_STATUSES.includes(normalizeReportStatus(risk.status_revisi)),
  );

  const notApprovedRows = rows.filter((risk) => !isApprovedRiskStatus(risk.status_revisi));

  const readyToSign = totalRisiko > 0 && notApprovedRows.length === 0;

  const blockingStatuses = [
    ...new Set(notApprovedRows.map((risk) => normalizeReportStatus(risk.status_revisi || 'draft'))),
  ].filter(Boolean);

  const documentStatus = readyToSign ? 'final' : 'draft';

  const documentStatusLabel = readyToSign
    ? 'Final - Siap Ditandatangani'
    : 'Draft - Belum Siap Ditandatangani';

  const coverNote = readyToSign
    ? 'Seluruh risiko dalam laporan ini telah memenuhi persyaratan persetujuan dan dokumen siap diajukan untuk penandatanganan.'
    : 'Laporan ini masih memuat risiko yang belum seluruhnya disetujui. Dokumen belum siap ditandatangani sampai seluruh risiko diselesaikan melalui proses verifikasi dan persetujuan.';

  const closingNote = readyToSign
    ? 'Seluruh data risiko dalam laporan ini telah melalui proses persetujuan dan dinyatakan siap untuk ditandatangani.'
    : 'Laporan ini belum siap ditandatangani karena masih terdapat data risiko yang berstatus Draft, Dalam Verifikasi, atau perlu perbaikan. Pengelola risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan.';

  return {
    document_status: documentStatus,
    document_status_label: documentStatusLabel,
    ready_to_sign: readyToSign,

    total_risiko: totalRisiko,
    approved_count: approvedRows.length,
    draft_count: draftRows.length,
    verification_count: verificationRows.length,
    rejected_count: rejectedRows.length,
    not_approved_count: notApprovedRows.length,

    blocking_statuses: blockingStatuses,

    cover_note: coverNote,
    closing_note: closingNote,

    not_approved_risks: notApprovedRows.map((risk) => ({
      id: risk.id,
      kode_risiko: risk.kode_risiko,
      nama_risiko: risk.nama_risiko,
      status_revisi: risk.status_revisi,
      jenis_konteks: risk.jenis_konteks,
      sumber_data: risk.sumber_data,
      context_id: risk.context_id,
      stage: risk.stage,
      ref_id: risk.ref_id,
    })),
  };
};

const SENSITIVE_CATEGORY_KEYWORDS = [
  'FRAUD',
  'KEPATUHAN',
  'COMPLIANCE',
  'BPK',
  'INSPEKTORAT',
  'K3',
  'KESELAMATAN',
  'BENCANA',
  'REPUTASI',
  'REPUTATION',
];

const tableColumnCache = new Map();

const getTableColumns = async (tableName) => {
  if (tableColumnCache.has(tableName)) {
    return tableColumnCache.get(tableName);
  }

  const rows = await sequelize.query(
    `
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
    `,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );

  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  tableColumnCache.set(tableName, columns);

  return columns;
};

const hasColumn = (columns, columnName) => columns.has(columnName);

const selectColumn = ({ columns, alias, column, as = column, fallback = 'NULL' }) => {
  if (!hasColumn(columns, column)) {
    return `${fallback} AS ${as}`;
  }

  return `${alias}.${column} AS ${as}`;
};

const normalizeLevel = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const isHighRiskLevel = (value) => HIGH_RISK_LEVELS.includes(normalizeLevel(value));

const containsSensitiveKeyword = (...values) => {
  const text = values.map((value) => String(value || '').toUpperCase()).join(' ');

  return SENSITIVE_CATEGORY_KEYWORDS.some((keyword) => text.includes(keyword));
};

const toBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();

  return ['1', 'true', 'yes', 'ya', 'y', 'above', 'di_atas', 'di atas'].includes(normalized);
};

const buildReportFieldOriginMeta = ({
  userInputFields = [],
  referenceFields = [],
  hiddenSystemMappedFields = [],
  autoCalculatedFields = [],
  autoGeneratedReportSections = [],
  fallbackSections = [],
  notes = [],
} = {}) => ({
  user_input_fields: userInputFields,
  reference_fields: referenceFields,
  hidden_system_mapped_fields: hiddenSystemMappedFields,
  auto_calculated_fields: autoCalculatedFields,
  auto_generated_report_sections: autoGeneratedReportSections,
  fallback_sections: fallbackSections,
  notes,
});

const buildSectionMeta = ({
  pedoman,
  title,
  description,
  userInputFields = [],
  referenceFields = [],
  hiddenSystemMappedFields = [],
  autoCalculatedFields = [],
  autoGeneratedReportSections = [],
  fallbackSections = [],
  sourceTables = [],
  notes = [],
}) => ({
  pedoman,
  title,
  description,
  source_tables: sourceTables,
  field_origin: buildReportFieldOriginMeta({
    userInputFields,
    referenceFields,
    hiddenSystemMappedFields,
    autoCalculatedFields,
    autoGeneratedReportSections,
    fallbackSections,
    notes,
  }),
});

const buildGlobalFieldOriginMeta = () =>
  buildReportFieldOriginMeta({
    userInputFields: [
      'nama_risiko',
      'uraian_risiko',
      'kategori_risiko',
      'sumber_risiko',
      'penyebab_risiko',
      'dampak_risiko',
      'kemungkinan',
      'dampak',
      'existing_control_description',
      'uraian_penyebab',
      'why_1',
      'why_2',
      'why_3',
      'why_4',
      'why_5',
      'kegiatan_pengendalian',
      'target_output',
      'indikator_keluaran',
      'penanggung_jawab',
      'hasil_monitoring',
      'realisasi_mitigasi',
      'progress_persen',
      'kendala',
      'tindak_lanjut',
      'uraian_kejadian',
      'tanggal_kejadian',
      'tempat_kejadian',
      'pemicu_kejadian',
      'dampak_kejadian',
    ],
    referenceFields: [
      'RISK_CATEGORY',
      'RISK_SOURCE',
      'RISK_APPETITE',
      'LIKELIHOOD',
      'IMPACT',
      'RISK_LEVEL',
      'MITIGATION_RESPONSE',
      'CONTROL_EFFECTIVENESS',
      'ROOT_CAUSE_CATEGORY',
      'SPIP_ELEMENT',
      'SPIP_SUB_ELEMENT',
      'RTP_OUTPUT',
      'mr_risk_matrix',
    ],
    hiddenSystemMappedFields: [
      'context_id',
      'context_item_id',
      'periode_id',
      'tahun',
      'jenis_dokumen',
      'renstra_id',
      'opd_id',
      'indikator_id',
      'stage',
      'ref_id',
      'owner_user_id',
      'owner_division_id',
      'source_table',
      'source_id',
      'kode_konteks',
      'nama_konteks',
      'kode_indikator',
      'nama_indikator',
    ],
    autoCalculatedFields: [
      'kode_risiko',
      'skor_risiko',
      'level_risiko',
      'is_above_appetite',
      'inherent_score',
      'inherent_level',
      'residual_score',
      'residual_level',
      'risk_after_mitigation_score',
      'risk_after_mitigation_level',
      'actual_score',
      'actual_level',
      'priority_reason',
      'risk_map',
      'status_reviu',
      'keputusan_reviu',
    ],
    autoGeneratedReportSections: [
      'summary',
      'narasi',
      'daftar_risiko',
      'analisis_risiko',
      'risiko_prioritas',
      'root_cause_analysis',
      'rencana_pengendalian',
      'monitoring_level_risiko',
      'pengendalian_belum_terealisasi',
      'efektivitas_pengendalian',
      'reviu_usulan_risiko_baru',
      'risk_map',
      'setting_parameter',
    ],
    fallbackSections: [
      NIL_EVENT_MESSAGE,
      NIL_UNREALIZED_CONTROL_MESSAGE,
      UNASSESSED_EFFECTIVENESS_MESSAGE,
      'Belum tersedia',
      'Belum diisi',
      'Belum ada rekomendasi',
    ],
    notes: [
      'User cukup memberi input dasar atau bukti/realisasi yang memang diperlukan.',
      'Aplikasi melakukan pemetaan data, perhitungan, pengelompokan, dan penyajian laporan berdasarkan data dan dokumen pendukung yang tersedia.',
      'Perhitungan skor, level, matriks, prioritas, peta risiko, dan efektivitas bersumber dari data Manajemen Risiko, bukan dari tampilan antarmuka.',
    ],
  });

const buildRiskPriorityReason = (item = {}) => {
  const reasons = [];

  if (toBooleanFlag(item.is_above_appetite)) {
    reasons.push('Berada di atas selera risiko');
  }

  if (toNumber(item.skor_risiko) >= 10) {
    reasons.push('Skor risiko tinggi');
  }

  if (isHighRiskLevel(item.level_risiko)) {
    reasons.push(`Level risiko ${item.level_risiko}`);
  }

  if (isHighRiskLevel(item.residual_level)) {
    reasons.push(`Level residu ${item.residual_level}`);
  }

  if (
    String(item.control_adequacy_status || '')
      .toLowerCase()
      .includes('tidak')
  ) {
    reasons.push('Kecukupan pengendalian belum memadai');
  }

  if (
    containsSensitiveKeyword(
      item.kategori_risiko,
      item.sumber_risiko,
      item.nama_risiko,
      item.uraian_risiko,
    )
  ) {
    reasons.push('Kategori/sumber risiko sensitif');
  }

  return reasons.length ? reasons.join('; ') : 'Prioritas umum berdasarkan data risiko.';
};

const isPriorityRisk = (item = {}) =>
  toBooleanFlag(item.is_above_appetite) ||
  toNumber(item.skor_risiko) >= 10 ||
  isHighRiskLevel(item.level_risiko) ||
  isHighRiskLevel(item.residual_level) ||
  String(item.control_adequacy_status || '')
    .toLowerCase()
    .includes('tidak') ||
  containsSensitiveKeyword(
    item.kategori_risiko,
    item.sumber_risiko,
    item.nama_risiko,
    item.uraian_risiko,
  );

const buildRiskMap = ({ risks = [], analyses = [], monitoring = [] }) => {
  const makeEmptyCells = () => {
    const cells = {};

    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      for (let impact = 1; impact <= 5; impact += 1) {
        cells[`${likelihood}x${impact}`] = {
          likelihood,
          impact,
          total: 0,
          risks: [],
        };
      }
    }

    return cells;
  };

  const addToMap = (cells, item, likelihoodValue, impactValue, sourceType) => {
    const likelihood = toNumber(likelihoodValue);
    const impact = toNumber(impactValue);

    if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
      return;
    }

    const key = `${likelihood}x${impact}`;

    cells[key].total += 1;
    cells[key].risks.push({
      id: item.id,
      kode_risiko: item.kode_risiko,
      nama_risiko: item.nama_risiko,
      level_risiko:
        item.level_risiko || item.inherent_level || item.residual_level || item.actual_level,
      skor_risiko:
        item.skor_risiko || item.inherent_score || item.residual_score || item.actual_score,
      source_type: sourceType,
    });
  };

  const inherent = makeEmptyCells();
  const residual = makeEmptyCells();
  const actual = makeEmptyCells();

  risks.forEach((item) => {
    addToMap(inherent, item, item.kemungkinan, item.dampak, 'inherent_from_risk');
  });

  analyses.forEach((item) => {
    addToMap(
      residual,
      item,
      item.residual_likelihood,
      item.residual_impact,
      'residual_from_analysis',
    );
  });

  monitoring.forEach((item) => {
    addToMap(actual, item, item.actual_likelihood, item.actual_impact, 'actual_from_monitoring');
  });

  return {
    inherent,
    residual,
    actual,
    fallback_note:
      'Jika likelihood/impact residual atau aktual belum tersedia, sel peta terkait tidak diisi secara spekulatif.',
    notes: [
      'Peta risiko dibangun otomatis dari nilai kemungkinan dan dampak yang tersedia.',
      'User tidak menggambar atau memindahkan risiko pada peta risiko.',
      'Sistem menempatkan risiko ke matriks 5x5 berdasarkan data yang tersedia.',
    ],
  };
};

const assertContextId = (contextId) => {
  const id = Number(contextId);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('contextId laporan MR tidak valid.');
    error.status = 400;
    error.code = 'MR_REPORT_INVALID_CONTEXT_ID';
    throw error;
  }

  return id;
};

const DEFAULT_REPORT_SCOPE_MODE = 'unified';

const normalizeReportScopeMode = (value) => {
  const normalized = String(value || DEFAULT_REPORT_SCOPE_MODE)
    .trim()
    .toLowerCase();

  if (['context', 'context_only', 'single_context'].includes(normalized)) {
    return 'context';
  }

  return 'unified';
};

const buildReportScope = ({ context = {}, scopeMode } = {}) => {
  const normalizedScopeMode = normalizeReportScopeMode(scopeMode);

  const contextId = toNumber(context.id);
  const tahun = toNumber(context.tahun, null);
  const opdId = toNumber(context.opd_id, null);

  const canUseUnifiedScope =
    normalizedScopeMode === 'unified' &&
    Number.isInteger(tahun) &&
    tahun > 0 &&
    Number.isInteger(opdId) &&
    opdId > 0;

  const effectiveScopeMode = canUseUnifiedScope ? 'unified' : 'context';

  return {
    scope_mode: effectiveScopeMode,
    anchor_context_id: contextId,
    tahun,
    opd_id: opdId,
    nama_opd: context.nama_opd || null,
    periode_type: context.periode_type || null,
    periode_label: context.periode_label || null,
    periode_id: context.periode_id || null,
    cakupan_laporan: 'Laporan Manajemen Risiko Terpadu',
    scope_note:
      effectiveScopeMode === 'unified'
        ? 'Cakupan laporan menggunakan seluruh risiko pada perangkat daerah dan tahun laporan yang sama.'
        : 'Cakupan laporan fallback ke context tunggal karena tahun/opd_id anchor context belum valid.',
  };
};

const buildRiskScopeWhere = (reportScope = {}, riskAlias = 'r') => {
  if (reportScope.scope_mode === 'unified') {
    return `
      ${riskAlias}.tahun = :scopeTahun
      AND (
        ${riskAlias}.opd_id = :scopeOpdId
        OR ${riskAlias}.context_id IN (
          SELECT cscope.id
          FROM mr_planning_context cscope
          WHERE cscope.tahun = :scopeTahun
            AND (
              cscope.opd_id = :scopeOpdId
              OR LOWER(COALESCE(cscope.nama_opd, '')) = LOWER(COALESCE(:scopeNamaOpd, ''))
            )
        )
      )
    `;
  }

  return `${riskAlias}.context_id = :contextId`;
};

const buildRiskScopeReplacements = (contextId, reportScope = {}) => {
  const replacements = { contextId: assertContextId(contextId) };

  if (reportScope.scope_mode === 'unified') {
    replacements.scopeTahun = reportScope.tahun;
    replacements.scopeOpdId = reportScope.opd_id;
    replacements.scopeNamaOpd = reportScope.nama_opd || '';
  }

  return replacements;
};

const enrichContextWithReportScope = (context = {}, reportScope = {}) => ({
  ...context,
  cakupan_laporan: reportScope.cakupan_laporan,
  tipe_periode_laporan: context.periode_type || null,
  periode_pelaporan: context.periode_label || null,
  report_scope: reportScope,
});

const normalizeDocType = (value) =>
  String(value || '')
    .toLowerCase()
    .trim();

const findOfficialByRole = (officials = [], role = '') => {
  const normalizedRole = normalizeLower(role);

  if (normalizedRole === 'kepala_dinas') {
    return officials.find((item) => normalizeLower(item.jabatan).includes('kepala dinas')) || null;
  }

  if (normalizedRole === 'sekretaris') {
    return officials.find((item) => normalizeLower(item.jabatan).includes('sekretaris')) || null;
  }

  return null;
};

const getReportOfficials = async (context = {}) => {
  const namaOpd = normalizeString(context.nama_opd);
  const tahun = Number(context.tahun);
  const jenisDokumen = normalizeDocType(context.jenis_dokumen);

  if (!namaOpd) {
    return {
      pemilik_risiko: null,
      koordinator_risiko: null,
      penandatangan_laporan: null,
      source: 'opd_penanggung_jawab',
      warning: 'nama_opd pada context belum tersedia.',
    };
  }

  const rows = await sequelize.query(
    `
    SELECT
      id,
      nama_opd,
      nama_bidang_opd,
      nama,
      nip,
      jabatan,
      tahun,
      jenis_dokumen,
      tenant_id
    FROM opd_penanggung_jawab
    WHERE nama_opd = :namaOpd
      AND (tahun = :tahun OR tahun IS NULL)
      AND (
        LOWER(COALESCE(jenis_dokumen, '')) = :jenisDokumen
        OR jenis_dokumen IS NULL
        OR jenis_dokumen = ''
      )
    ORDER BY
      CASE
        WHEN tahun = :tahun THEN 1
        WHEN tahun IS NULL THEN 2
        ELSE 3
      END,
      CASE
        WHEN LOWER(jabatan) LIKE '%kepala dinas%' THEN 1
        WHEN LOWER(jabatan) LIKE '%sekretaris%' THEN 2
        ELSE 3
      END,
      id DESC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        namaOpd,
        tahun,
        jenisDokumen,
      },
    },
  );

  const kepalaDinas = findOfficialByRole(rows, 'kepala_dinas');
  const sekretaris = findOfficialByRole(rows, 'sekretaris');

  return {
    pemilik_risiko: kepalaDinas,
    koordinator_risiko: sekretaris,
    penandatangan_laporan: kepalaDinas,
    source: 'opd_penanggung_jawab',
    total_officials_found: rows.length,
  };
};

const enrichContextWithOfficials = async (context = {}) => {
  const officials = await getReportOfficials(context);

  const pemilik = officials.pemilik_risiko;
  const koordinator = officials.koordinator_risiko;
  const penandatangan = officials.penandatangan_laporan;

  return {
    ...context,

    nama_pemilik_risiko: pemilik?.nama || context.nama_pemilik_risiko || null,
    jabatan_pemilik_risiko: pemilik?.jabatan || context.jabatan_pemilik_risiko || null,
    nip_pemilik_risiko: pemilik?.nip || context.nip_pemilik_risiko || null,

    nama_koordinator: koordinator?.nama || context.nama_koordinator || null,
    jabatan_koordinator: koordinator?.jabatan || context.jabatan_koordinator || null,
    nip_koordinator: koordinator?.nip || context.nip_koordinator || null,

    nama_penandatangan: penandatangan?.nama || context.nama_penandatangan || pemilik?.nama || null,
    jabatan_penandatangan:
      penandatangan?.jabatan || context.jabatan_penandatangan || pemilik?.jabatan || null,
    nip_penandatangan: penandatangan?.nip || context.nip_penandatangan || pemilik?.nip || null,

    report_officials: officials,
  };
};

const getContext = async (contextId) => {
  const id = assertContextId(contextId);

  const rows = await sequelize.query(
    `
    SELECT
      c.id,
      c.periode_id,
      c.tahun,
      c.periode_type,
      c.periode_label,
      c.periode_awal,
      c.periode_akhir,
      c.jenis_dokumen,
      c.renstra_id,
      c.opd_id,
      c.nama_opd,
      c.pemilik_risiko_user_id,
      c.nama_pemilik_risiko,
      c.jabatan_pemilik_risiko,
      c.koordinator_user_id,
      c.nama_koordinator,
      c.jabatan_koordinator,
      c.owner_user_id,
      c.owner_division_id,
      c.nama_unit_kerja,
      c.selera_risiko_ref_id,
      c.selera_risiko,
      c.status_revisi,
      c.versi,
      c.is_active,
      c.created_at,
      c.updated_at
    FROM mr_planning_context c
    WHERE c.id = :contextId
    LIMIT 1
    `,
    {
      replacements: { contextId: id },
      type: QueryTypes.SELECT,
    },
  );

  if (!rows.length) {
    const error = new Error('Context MR untuk laporan tidak ditemukan.');
    error.status = 404;
    error.code = 'MR_REPORT_CONTEXT_NOT_FOUND';
    throw error;
  }

  const context = rows[0] || null;

  if (!context) return null;

  return enrichContextWithOfficials(context);
};

const getContextItems = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const contextItemColumns = await getTableColumns('mr_planning_context_item');

  const sourceSystemSelect = hasColumn(contextItemColumns, 'source_system')
    ? 'ci.source_system'
    : `
      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%' THEN 'lakip'
        WHEN LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan') THEN 'lk'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%' THEN 'spip'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%' THEN 'e_sigap'
        ELSE 'e_pelara'
      END
    `;

  const sourceLabelSelect = hasColumn(contextItemColumns, 'source_label')
    ? 'ci.source_label'
    : 'NULL';

  const metadataJsonSelect = hasColumn(contextItemColumns, 'metadata_json')
    ? 'ci.metadata_json'
    : 'NULL';

  const proposalSourceCodeSelect = hasColumn(contextItemColumns, 'metadata_json')
    ? `
      UPPER(
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.proposal_source_code')),
          JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.proposal_source_type')),
          ''
        )
      )
    `
    : "''";

  const customSourceLabelSelect = hasColumn(contextItemColumns, 'metadata_json')
    ? `
    COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.nama_kategori_baru')),
      JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.proposal_source_label')),
      ${sourceLabelSelect},
      NULL
    )
  `
    : sourceLabelSelect;

  const nilaiTerkaitSelect = hasColumn(contextItemColumns, 'nilai_terkait')
    ? 'ci.nilai_terkait'
    : `
      COALESCE(
        ci.pagu_tahun_1,
        ci.pagu_tahun_2,
        ci.pagu_tahun_3,
        ci.pagu_tahun_4,
        ci.pagu_tahun_5,
        ci.pagu_tahun_6
      )
    `;

  const rows = await sequelize.query(
    `
    SELECT
      ci.id,
      ci.mr_planning_context_id,
      ci.periode_id,
      ci.tahun,
      ci.jenis_dokumen,
      ci.renstra_id,
      ci.opd_id,
      ci.stage,
      ci.ref_id,
      ci.indikator_id,
      ci.source_table,
      ci.source_id,
      ${sourceSystemSelect} AS source_system,
      ${sourceLabelSelect} AS source_label,
      ${metadataJsonSelect} AS metadata_json,
      ${proposalSourceCodeSelect} AS proposal_source_code,
      ci.kode_konteks,
      ci.nama_konteks,
      ci.kode_indikator,
      ci.nama_indikator,
      ci.satuan,
      ci.baseline,
      ci.target_tahun_1,
      ci.target_tahun_2,
      ci.target_tahun_3,
      ci.target_tahun_4,
      ci.target_tahun_5,
      ci.target_tahun_6,
      ci.pagu_tahun_1,
      ci.pagu_tahun_2,
      ci.pagu_tahun_3,
      ci.pagu_tahun_4,
      ci.pagu_tahun_5,
      ci.pagu_tahun_6,
      ${nilaiTerkaitSelect} AS nilai_terkait,
      ci.urutan,
      ci.is_primary,
      ci.is_active,

      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_INSPEKTORAT'
            OR LOWER(COALESCE(ci.stage, '')) = 'temuan_inspektorat'
          )
          THEN 'Tindak Lanjut Inspektorat'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_BPK'
            OR LOWER(COALESCE(ci.stage, '')) = 'temuan_bpk'
          )
          THEN 'Tindak Lanjut BPK'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('LAKIP')
          THEN 'LAKIP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('LAPORAN_KEUANGAN', 'LK')
          THEN 'Laporan Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PELAKSANAAN_KEGIATAN'
          THEN 'Pelaksanaan Kegiatan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PERTANGGUNGJAWABAN_KEUANGAN'
          THEN 'Pertanggungjawaban Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'SPIP_E_SIGAP'
          THEN 'SPIP/e-SIGAP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('MANUAL_ADHOC', 'LAINNYA')
          THEN 'Manual/Adhoc'

        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lakip'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%'
          THEN 'LAKIP'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lk'
          OR LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan')
          THEN 'Laporan Keuangan'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%bpk%'
          THEN 'Temuan BPK'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%inspektorat%'
          THEN 'Temuan Inspektorat'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) IN ('spip', 'e_sigap')
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%'
          THEN 'SPIP/e-SIGAP'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%manual%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%adhoc%'
          THEN 'Manual/Adhoc'
        ELSE 'Renstra'
      END AS jenis_konteks,

      COALESCE(ci.nama_konteks, ${sourceLabelSelect}, ci.nama_indikator) AS nama_konteks_laporan,

      COALESCE(ci.nama_indikator, ci.nama_konteks, ${sourceLabelSelect}) AS indikator_atau_objek_risiko,

      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          THEN 'objek_risiko_non_renstra'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'e_pelara'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%lakip%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%lk%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%bpk%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%inspektorat%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%spip%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%sigap%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%manual%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%adhoc%'
          THEN 'indikator_renstra'
        ELSE 'objek_risiko_non_renstra'
      END AS object_source_type

    FROM mr_planning_context_item ci
    WHERE
      ${
        reportScope.scope_mode === 'unified'
          ? `
          ci.mr_planning_context_id IN (
            SELECT DISTINCT r.context_id
            FROM mr_planning_risk r
            WHERE ${buildRiskScopeWhere(reportScope, 'r')}
          )
        `
          : 'ci.mr_planning_context_id = :contextId'
      }
    ORDER BY ci.mr_planning_context_id ASC, ci.is_primary DESC, ci.urutan ASC, ci.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getSummary = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const rows = await sequelize.query(
    `
    SELECT
      c.id AS context_id,
      c.tahun,
      c.periode_type,
      c.periode_label,
      c.periode_awal,
      c.periode_akhir,
      c.jenis_dokumen,
      c.renstra_id,
      c.opd_id,
      c.nama_opd,
      c.selera_risiko,
      c.status_revisi AS context_status_revisi,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk r
        WHERE ${riskScopeWhere}
      ) AS total_risiko,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk r
        WHERE ${riskScopeWhere}
          AND r.status_revisi IN ('draft', 'verifikasi', 'diajukan', 'diverifikasi', 'ditolak')
      ) AS total_usulan_risiko,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk r
        WHERE ${riskScopeWhere}
          AND r.is_above_appetite = 1
      ) AS total_risiko_di_atas_selera,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk_analysis a
        JOIN mr_planning_risk r
          ON r.id = a.mr_planning_risk_id
        WHERE ${riskScopeWhere}
          AND a.is_active = 1
          AND a.is_latest = 1
      ) AS total_analisis,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk_analysis a
        JOIN mr_planning_risk r
          ON r.id = a.mr_planning_risk_id
        WHERE ${riskScopeWhere}
          AND a.is_active = 1
          AND a.is_latest = 1
          AND LOWER(COALESCE(a.existing_control_status, '')) IN (
            'tidak efektif',
            'belum efektif',
            'kurang efektif'
          )
      ) AS total_existing_control_tidak_efektif,

      (
        SELECT COUNT(*)
        FROM mr_planning_risk_analysis a
        JOIN mr_planning_risk r
          ON r.id = a.mr_planning_risk_id
        WHERE ${riskScopeWhere}
          AND a.is_active = 1
          AND a.is_latest = 1
          AND LOWER(COALESCE(a.control_adequacy_status, '')) IN (
            'tidak memadai',
            'belum memadai',
            'tidak efektif',
            'belum efektif'
          )
      ) AS total_control_belum_memadai,

      (
        SELECT COUNT(*)
        FROM mr_planning_root_cause rc
        JOIN mr_planning_risk r
          ON r.id = rc.mr_planning_risk_id
        WHERE ${riskScopeWhere}
      ) AS total_root_cause,

      (
        SELECT COUNT(*)
        FROM mr_planning_mitigation m
        JOIN mr_planning_risk r
          ON r.id = m.mr_planning_risk_id
        WHERE ${riskScopeWhere}
      ) AS total_kegiatan_pengendalian,

      (
        SELECT COUNT(*)
        FROM mr_planning_monitoring mon
        JOIN mr_planning_risk r
          ON r.id = mon.mr_planning_risk_id
        WHERE ${riskScopeWhere}
      ) AS total_monitoring,

      (
        SELECT COUNT(*)
        FROM mr_planning_monitoring mon
        JOIN mr_planning_risk r
          ON r.id = mon.mr_planning_risk_id
        WHERE ${riskScopeWhere}
          AND mon.progress_persen > 0
      ) AS total_pengendalian_terealisasi,

      (
        SELECT COALESCE(AVG(mon.progress_persen), 0)
        FROM mr_planning_monitoring mon
        JOIN mr_planning_risk r
          ON r.id = mon.mr_planning_risk_id
        WHERE ${riskScopeWhere}
      ) AS rata_rata_progress,

      (
        SELECT COUNT(*)
        FROM mr_planning_monitoring mon
        JOIN mr_planning_risk r
          ON r.id = mon.mr_planning_risk_id
        WHERE ${riskScopeWhere}
          AND mon.terjadi_risiko = 1
      ) AS total_kejadian_risiko

    FROM mr_planning_context c
    WHERE c.id = :contextId
    LIMIT 1
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  if (!rows.length) {
    const error = new Error('Summary laporan MR tidak ditemukan.');
    error.status = 404;
    error.code = 'MR_REPORT_SUMMARY_NOT_FOUND';
    throw error;
  }

  const row = rows[0];

  const totalRisiko = toNumber(row.total_risiko);
  const totalDiAtasSelera = toNumber(row.total_risiko_di_atas_selera);
  const totalExistingTidakEfektif = toNumber(row.total_existing_control_tidak_efektif);
  const totalControlBelumMemadai = toNumber(row.total_control_belum_memadai);
  const totalPengendalianTerealisasi = toNumber(row.total_pengendalian_terealisasi);
  const totalKegiatanPengendalian = toNumber(row.total_kegiatan_pengendalian);

  return {
    ...row,
    total_risiko: totalRisiko,
    total_usulan_risiko: toNumber(row.total_usulan_risiko),
    total_risiko_di_atas_selera: totalDiAtasSelera,
    total_analisis: toNumber(row.total_analisis),
    total_existing_control_tidak_efektif: totalExistingTidakEfektif,
    total_control_belum_memadai: totalControlBelumMemadai,
    total_root_cause: toNumber(row.total_root_cause),
    total_kegiatan_pengendalian: totalKegiatanPengendalian,
    total_monitoring: toNumber(row.total_monitoring),
    total_pengendalian_terealisasi: totalPengendalianTerealisasi,
    rata_rata_progress: Number(toNumber(row.rata_rata_progress).toFixed(2)),
    total_kejadian_risiko: toNumber(row.total_kejadian_risiko),

    persen_risiko_di_atas_selera: toPercent(totalDiAtasSelera, totalRisiko),
    persen_existing_control_tidak_efektif: toPercent(totalExistingTidakEfektif, totalRisiko),
    persen_control_belum_memadai: toPercent(totalControlBelumMemadai, totalRisiko),
    persen_pengendalian_terealisasi: toPercent(
      totalPengendalianTerealisasi,
      totalKegiatanPengendalian,
    ),
    selera_risiko_label: resolveSeleraRisikoLabel(row),
    status_revisi_label: formatRiskStatusLabel(row.context_status_revisi),
  };
};

const getDaftarRisiko = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const riskColumns = await getTableColumns('mr_planning_risk');
  const contextItemColumns = await getTableColumns('mr_planning_context_item');

  const sourceSystemSelect = hasColumn(contextItemColumns, 'source_system')
    ? 'ci.source_system'
    : `
      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%' THEN 'lakip'
        WHEN LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan') THEN 'lk'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%' THEN 'spip'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%' THEN 'e_sigap'
        ELSE 'e_pelara'
      END
    `;

  const sourceLabelSelect = hasColumn(contextItemColumns, 'source_label')
    ? 'ci.source_label'
    : 'NULL';

  const metadataJsonSelect = hasColumn(contextItemColumns, 'metadata_json')
    ? 'ci.metadata_json'
    : 'NULL';

  const proposalSourceCodeSelect = hasColumn(contextItemColumns, 'metadata_json')
    ? `
      UPPER(
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.proposal_source_code')),
          JSON_UNQUOTE(JSON_EXTRACT(ci.metadata_json, '$.proposal_source_type')),
          ''
        )
      )
    `
    : "''";

  const nilaiTerkaitSelect = hasColumn(contextItemColumns, 'nilai_terkait')
    ? 'ci.nilai_terkait'
    : `
      COALESCE(
        ci.pagu_tahun_1,
        ci.pagu_tahun_2,
        ci.pagu_tahun_3,
        ci.pagu_tahun_4,
        ci.pagu_tahun_5,
        ci.pagu_tahun_6
      )
    `;

  const contextItemJoinCondition = hasColumn(riskColumns, 'context_item_id')
    ? `
     AND (
       ci.id = r.context_item_id
       OR (
         ci.stage = r.stage
         AND ci.ref_id = r.ref_id
         AND ci.indikator_id <=> r.indikator_id
       )
     )
    `
    : `
     AND (
       ci.stage = r.stage
       AND ci.ref_id = r.ref_id
       AND ci.indikator_id <=> r.indikator_id
     )
    `;

  return sequelize.query(
    `
    SELECT
      r.id,
      r.context_id,
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'context_item_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'periode_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'tahun' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'jenis_dokumen' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'renstra_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'opd_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'owner_user_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'owner_division_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'stage' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'ref_id' })},
      ${selectColumn({ columns: riskColumns, alias: 'r', column: 'indikator_id' })},

      r.kode_risiko,
      r.nama_risiko,
      r.uraian_risiko,
      r.kategori_risiko,
      r.sumber_risiko,
      r.penyebab_risiko,
      r.dampak_risiko,
      r.kemungkinan,
      r.dampak,
      r.skor_risiko,
      r.level_risiko,
      r.selera_risiko,
      r.status_risiko,
      r.status_revisi,
      r.versi,

      ci.source_table,
      ci.source_id,
      ${sourceSystemSelect} AS source_system,
      ${sourceLabelSelect} AS source_label,
      ${metadataJsonSelect} AS context_item_metadata_json,
      ${proposalSourceCodeSelect} AS proposal_source_code,
      ci.kode_konteks,
      ci.nama_konteks,
      ci.kode_indikator,
      ci.nama_indikator,
      ci.satuan,
      ci.baseline,
      ci.pagu_tahun_1,
      ci.pagu_tahun_2,
      ci.pagu_tahun_3,
      ci.pagu_tahun_4,
      ci.pagu_tahun_5,
      ci.pagu_tahun_6,

            CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_INSPEKTORAT'
            OR LOWER(COALESCE(r.stage, ci.stage, '')) = 'temuan_inspektorat'
          )
          THEN 'Tindak Lanjut Inspektorat'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_BPK'
            OR LOWER(COALESCE(r.stage, ci.stage, '')) = 'temuan_bpk'
          )
          THEN 'Tindak Lanjut BPK'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('LAKIP')
          THEN 'LAKIP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('LAPORAN_KEUANGAN', 'LK')
          THEN 'Laporan Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PELAKSANAAN_KEGIATAN'
          THEN 'Pelaksanaan Kegiatan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PERTANGGUNGJAWABAN_KEUANGAN'
          THEN 'Pertanggungjawaban Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'SPIP_E_SIGAP'
          THEN 'SPIP/e-SIGAP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('MANUAL_ADHOC', 'LAINNYA')
          THEN 'Manual/Adhoc'

        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lakip'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%'
          THEN 'LAKIP'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lk'
          OR LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan')
          THEN 'Laporan Keuangan'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%bpk%'
          THEN 'Temuan BPK'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%inspektorat%'
          THEN 'Temuan Inspektorat'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) IN ('spip', 'e_sigap')
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%'
          THEN 'SPIP/e-SIGAP'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%manual%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%adhoc%'
          THEN 'Manual/Adhoc'
        ELSE 'Renstra'
      END AS jenis_konteks,

      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_INSPEKTORAT'
            OR LOWER(COALESCE(r.stage, ci.stage, '')) = 'temuan_inspektorat'
          )
          THEN 'Tindak Lanjut Inspektorat / Temuan Pengawasan Inspektorat'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND (
            ${proposalSourceCodeSelect} = 'TINDAK_LANJUT_BPK'
            OR LOWER(COALESCE(r.stage, ci.stage, '')) = 'temuan_bpk'
          )
          THEN 'Tindak Lanjut BPK / LHP BPK'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'LAKIP'
          THEN 'LAKIP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('LAPORAN_KEUANGAN', 'LK')
          THEN 'Laporan Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PELAKSANAAN_KEGIATAN'
          THEN 'Pelaksanaan Kegiatan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'PERTANGGUNGJAWABAN_KEUANGAN'
          THEN 'Pertanggungjawaban Keuangan'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} = 'SPIP_E_SIGAP'
          THEN 'SPIP/e-SIGAP'

        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          AND ${proposalSourceCodeSelect} IN ('MANUAL_ADHOC', 'LAINNYA')
          THEN 'Input Manual Pengelola Risiko'

        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%bpk%' THEN 'LHP BPK'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%inspektorat%' THEN 'LHP Inspektorat / Temuan Pengawasan Inspektorat'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lakip'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%' THEN 'LAKIP'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lk'
          OR LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan') THEN 'Laporan Keuangan'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) IN ('spip', 'e_sigap')
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%' THEN 'SPIP/e-SIGAP'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%manual%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%adhoc%' THEN 'Input Manual Pengelola Risiko'
        ELSE 'indikator_renstra / Renstra'
      END AS sumber_data,

      COALESCE(ci.nama_konteks, ${sourceLabelSelect}, ci.nama_indikator, r.nama_risiko) AS nama_konteks_laporan,

      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          THEN 'objek_risiko_non_renstra'
        WHEN (
          LOWER(COALESCE(${sourceSystemSelect}, '')) = 'e_pelara'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%lakip%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%lk%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%bpk%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%inspektorat%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%spip%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%sigap%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%manual%'
          AND LOWER(COALESCE(ci.source_table, '')) NOT LIKE '%adhoc%'
        )
          THEN 'indikator_renstra'
        ELSE 'objek_risiko_non_renstra'
      END AS object_source_type,

      ${nilaiTerkaitSelect} AS anggaran_terkait,

      CASE
        WHEN ${nilaiTerkaitSelect} IS NULL THEN 'Belum tersedia'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%bpk%' THEN 'Nilai temuan / nilai pengembalian / nilai penyimpangan'
        WHEN LOWER(COALESCE(ci.source_table, '')) LIKE '%inspektorat%' THEN 'Nilai temuan / nilai tindak lanjut pengawasan'
        WHEN LOWER(COALESCE(${sourceSystemSelect}, '')) = 'lk'
          OR LOWER(COALESCE(ci.source_table, '')) IN ('lk', 'laporan_keuangan', 'laporan keuangan') THEN 'Nilai akun / nilai transaksi / nilai koreksi'
        ELSE 'Pagu / nilai terkait dari sumber konteks'
      END AS nilai_terkait_source,

      'Belum tersedia' AS metode_pencapaian_tujuan_spip,

      CASE
        WHEN LOWER(COALESCE(ci.source_table, '')) = 'proposal_intake'
          THEN 'Objek risiko proposal-intake/non-Renstra tidak diklaim sebagai indikator Renstra.'
        WHEN (
          LOWER(COALESCE(${sourceSystemSelect}, '')) <> 'e_pelara'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%lakip%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%lk%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%bpk%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%inspektorat%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%spip%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%sigap%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%manual%'
          OR LOWER(COALESCE(ci.source_table, '')) LIKE '%adhoc%'
        )
          THEN 'Objek risiko non-Renstra tidak diklaim sebagai indikator Renstra.'
        ELSE NULL
      END AS non_renstra_guard_note

      ,COALESCE(NULLIF(TRIM(r.selera_risiko), ''), NULLIF(TRIM(c.selera_risiko), ''), 'Belum Ditetapkan') AS selera_risiko_label
      ,COALESCE(
        CASE
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('aktif', 'active') THEN 'Aktif'
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('dipantau') THEN 'Dipantau'
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('closed', 'selesai') THEN 'Selesai'
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('draft') THEN 'Draft'
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('approved', 'disetujui') THEN 'Disetujui'
          WHEN LOWER(COALESCE(r.status_risiko, '')) IN ('belum_diisi') THEN 'Belum Diisi'
          ELSE NULL
        END,
        NULLIF(TRIM(r.status_risiko), ''),
        'Belum Diisi'
      ) AS status_risiko_label

    FROM mr_planning_risk r
    LEFT JOIN mr_planning_context_item ci
      ON ci.mr_planning_context_id = r.context_id
    LEFT JOIN mr_planning_context c
      ON c.id = r.context_id
    ${contextItemJoinCondition}
    WHERE ${riskScopeWhere}
    ORDER BY r.context_id ASC, r.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getAnalisisRisiko = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const analysisColumns = await getTableColumns('mr_planning_risk_analysis');

  return sequelize.query(
    `
    SELECT
      a.id,
      a.mr_planning_risk_id,
      r.kode_risiko,
      r.nama_risiko,
      r.kategori_risiko,
      r.sumber_risiko,
      r.dampak_risiko,
      a.existing_control_status,
      a.existing_control_description,
      a.control_adequacy_status,
      a.control_adequacy_note,
      ${selectColumn({
        columns: analysisColumns,
        alias: 'a',
        column: 'inherent_likelihood',
      })},
      ${selectColumn({
        columns: analysisColumns,
        alias: 'a',
        column: 'inherent_impact',
      })},
      a.inherent_score,
      a.inherent_level,
      ${selectColumn({
        columns: analysisColumns,
        alias: 'a',
        column: 'residual_likelihood',
      })},
      ${selectColumn({
        columns: analysisColumns,
        alias: 'a',
        column: 'residual_impact',
      })},
      a.residual_score,
      a.residual_level,
      a.selera_risiko,
      a.is_above_appetite,
      a.analysis_note,
      a.rekomendasi,
      a.status_revisi,
      a.versi
    FROM mr_planning_risk_analysis a
    JOIN mr_planning_risk r
      ON r.id = a.mr_planning_risk_id
    WHERE ${riskScopeWhere}
      AND a.is_active = 1
      AND a.is_latest = 1
    ORDER BY a.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getRisikoPrioritas = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const rows = await sequelize.query(
    `
    SELECT
      r.id,
      r.kode_risiko,
      r.nama_risiko,
      r.uraian_risiko,
      r.kategori_risiko,
      r.sumber_risiko,
      r.kemungkinan,
      r.dampak,
      r.skor_risiko,
      r.level_risiko,
      r.selera_risiko,
      r.is_above_appetite,
      a.existing_control_status,
      a.control_adequacy_status,
      a.residual_score,
      a.residual_level,
      a.rekomendasi
    FROM mr_planning_risk r
    LEFT JOIN mr_planning_risk_analysis a
      ON a.mr_planning_risk_id = r.id
      AND a.is_active = 1
      AND a.is_latest = 1
    WHERE ${riskScopeWhere}
    ORDER BY r.skor_risiko DESC, r.context_id ASC, r.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  const mappedRows = rows
    .map((item) => ({
      ...item,
      is_priority_candidate: isPriorityRisk(item),
      priority_reason: buildRiskPriorityReason(item),
      field_origin: buildReportFieldOriginMeta({
        userInputFields: ['nama_risiko', 'uraian_risiko', 'kategori_risiko', 'sumber_risiko'],
        referenceFields: [
          'kategori_risiko',
          'sumber_risiko',
          'kemungkinan',
          'dampak',
          'selera_risiko',
          'control_adequacy_status',
        ],
        hiddenSystemMappedFields: ['id', 'kode_risiko'],
        autoCalculatedFields: [
          'skor_risiko',
          'level_risiko',
          'is_above_appetite',
          'residual_score',
          'residual_level',
          'is_priority_candidate',
          'priority_reason',
        ],
        fallbackSections: ['rekomendasi jika belum tersedia'],
      }),
    }))
    .filter((item) => item.is_priority_candidate)
    .sort((a, b) => {
      const scoreDiff = toNumber(b.skor_risiko) - toNumber(a.skor_risiko);
      if (scoreDiff) return scoreDiff;

      const residualDiff = toNumber(b.residual_score) - toNumber(a.residual_score);
      if (residualDiff) return residualDiff;

      return toNumber(a.id) - toNumber(b.id);
    });

  return getRows(dedupeRisikoPrioritas(mappedRows));
};

const getRencanaPengendalian = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const mitigationColumns = await getTableColumns('mr_planning_mitigation');

  return sequelize.query(
    `
    SELECT
      m.id,
      r.kode_risiko,
      r.nama_risiko,
      m.respon_risiko,
      m.unsur_spip,
      m.sub_unsur_spip,
      m.output_rtp,
      m.kegiatan_pengendalian,
      ${selectColumn({
        columns: mitigationColumns,
        alias: 'm',
        column: 'target_waktu',
      })},
      m.target_output,
      m.indikator_keluaran,
      m.target_keluaran,
      m.satuan_keluaran,
      m.penanggung_jawab,
      ${selectColumn({
        columns: mitigationColumns,
        alias: 'm',
        column: 'risk_after_mitigation_likelihood',
      })},
      ${selectColumn({
        columns: mitigationColumns,
        alias: 'm',
        column: 'risk_after_mitigation_impact',
      })},
      m.risk_after_mitigation_score,
      m.risk_after_mitigation_level,
      m.is_above_appetite_after_mitigation,
      m.status_mitigasi,
      m.status_revisi,
      m.versi
    FROM mr_planning_mitigation m
    JOIN mr_planning_risk r
      ON r.id = m.mr_planning_risk_id
    WHERE ${riskScopeWhere}
    ORDER BY m.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getRealisasiPengendalian = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const rows = await sequelize.query(
    `
    SELECT
      mon.id,
      r.kode_risiko,
      r.nama_risiko,
      mon.periode_label,
      ${selectColumn({
        columns: await getTableColumns('mr_planning_monitoring'),
        alias: 'mon',
        column: 'monitoring_date',
      })},
      mon.hasil_monitoring,
      mon.realisasi_mitigasi,
      mon.output_realisasi,
        mon.persentase_realisasi,
        mon.progress_persen,
        mon.efektivitas_pengendalian,
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'target_waktu',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'target_waktu_mulai',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'target_waktu_selesai',
        })},
        mon.actual_score,
      mon.actual_level,
      ${selectColumn({
        columns: await getTableColumns('mr_planning_monitoring'),
        alias: 'mon',
        column: 'actual_likelihood',
      })},
      ${selectColumn({
        columns: await getTableColumns('mr_planning_monitoring'),
        alias: 'mon',
        column: 'actual_impact',
      })},
      mon.level_change,
      mon.risk_trend,
      mon.is_above_appetite_actual,
      mon.kendala,
      mon.tindak_lanjut,
      mon.rekomendasi,
      mon.status_monitoring,
      mon.status_revisi,
      mon.versi
    FROM mr_planning_monitoring mon
    JOIN mr_planning_risk r
      ON r.id = mon.mr_planning_risk_id
    WHERE ${riskScopeWhere}
    ORDER BY mon.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  return getRows(dedupeRealisasiPengendalian(rows));
};

const getKejadianRisiko = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const rows = await sequelize.query(
    `
    SELECT
      mon.id,
      r.kode_risiko,
      r.nama_risiko,
      mon.periode_label,
      ${selectColumn({
        columns: await getTableColumns('mr_planning_monitoring'),
        alias: 'mon',
        column: 'monitoring_date',
      })},
      mon.terjadi_risiko,
      mon.tanggal_kejadian,
      mon.tempat_kejadian,
      mon.uraian_kejadian,
      mon.pemicu_kejadian,
      mon.dampak_kejadian,
      mon.tindak_lanjut_kejadian,
      mon.status_revisi,
      mon.versi
    FROM mr_planning_monitoring mon
    JOIN mr_planning_risk r
      ON r.id = mon.mr_planning_risk_id
    WHERE ${riskScopeWhere}
      AND mon.terjadi_risiko = 1
    ORDER BY mon.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  const dedupedRows = dedupeKejadianRisiko(rows);
  return {
    rows: dedupedRows.display_rows,
    fallback_message: dedupedRows.display_rows.length ? null : NIL_EVENT_MESSAGE,
    field_origin: buildReportFieldOriginMeta({
      userInputFields: [
        'tanggal_kejadian',
        'tempat_kejadian',
        'uraian_kejadian',
        'pemicu_kejadian',
        'dampak_kejadian',
        'tindak_lanjut_kejadian',
      ],
      hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko', 'periode_label'],
      autoCalculatedFields: ['terjadi_risiko'],
      fallbackSections: rows.length ? [] : [NIL_EVENT_MESSAGE],
    }),
  };
};

const getRootCauseAnalysis = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const rootCauseColumns = await getTableColumns('mr_planning_root_cause');

  return sequelize.query(
    `
    SELECT
      rc.id,
      rc.mr_planning_risk_id,
      r.kode_risiko,
      r.nama_risiko,
      m.kegiatan_pengendalian,
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'kode_penyebab',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'uraian_penyebab',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'why_1',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'why_2',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'why_3',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'why_4',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'why_5',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'akar_penyebab',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'kategori_penyebab',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'kategori_penyebab_ref_id',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'status_revisi',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'versi',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'is_active',
      })},
      ${selectColumn({
        columns: rootCauseColumns,
        alias: 'rc',
        column: 'is_latest',
      })}
    FROM mr_planning_root_cause rc
    JOIN mr_planning_risk r
      ON r.id = rc.mr_planning_risk_id
    LEFT JOIN mr_planning_mitigation m
      ON m.root_cause_id = rc.id
      AND m.is_active = 1
    WHERE ${riskScopeWhere}
      AND rc.is_active = 1
      AND rc.is_latest = 1
    ORDER BY rc.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getMonitoringLevelRisiko = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const monitoringColumns = await getTableColumns('mr_planning_monitoring');

  return sequelize.query(
    `
    SELECT
      mon.id,
      r.kode_risiko,
      r.nama_risiko,
      r.kemungkinan AS risiko_direspons_kemungkinan,
      r.dampak AS risiko_direspons_dampak,
      r.skor_risiko AS risiko_direspons_nilai,
      r.level_risiko AS risiko_direspons_level,
      ${selectColumn({
        columns: monitoringColumns,
        alias: 'mon',
        column: 'actual_likelihood',
      })},
      ${selectColumn({
        columns: monitoringColumns,
        alias: 'mon',
        column: 'actual_impact',
      })},
      mon.actual_score,
      mon.actual_level,
      mon.level_change,
      mon.risk_trend,
      mon.rekomendasi,
      mon.status_monitoring,
      mon.status_revisi,
      mon.versi
    FROM mr_planning_monitoring mon
    JOIN mr_planning_risk r
      ON r.id = mon.mr_planning_risk_id
    WHERE ${riskScopeWhere}
    ORDER BY mon.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getPengendalianBelumTerealisasi = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');

  const rows = await sequelize.query(
    `
      SELECT
        mon.id,
        r.kode_risiko,
        r.nama_risiko,
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kegiatan_pengendalian',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'penanggung_jawab',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'monitoring_date',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'realisasi_waktu',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'target_waktu',
        })},
        mon.progress_persen,
      mon.status_monitoring,
      mon.status_realisasi,
      mon.kendala,
      mon.tindak_lanjut,
      mon.rekomendasi,
      mon.status_revisi,
      mon.versi
    FROM mr_planning_monitoring mon
    JOIN mr_planning_risk r
      ON r.id = mon.mr_planning_risk_id
    WHERE ${riskScopeWhere}
      AND (
        mon.progress_persen IS NULL
        OR mon.progress_persen < 100
        OR LOWER(COALESCE(mon.status_monitoring, mon.status_realisasi, '')) NOT IN ('selesai', 'completed', 'complete', 'done', 'tercapai')
        OR COALESCE(NULLIF(TRIM(mon.kendala), ''), NULLIF(TRIM(mon.tindak_lanjut), '')) IS NOT NULL
      )
    ORDER BY mon.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  return {
    rows: rows
      .map((item, index) => {
        const progress = Number(item.progress_persen);
        const statusRaw = String(item.status_realisasi || item.status_monitoring || '')
          .trim()
          .toLowerCase();
        const isNotFinished = !['selesai', 'completed', 'complete', 'done', 'tercapai'].includes(
          statusRaw,
        );
        const hasIssue =
          Boolean(String(item.kendala || '').trim()) ||
          Boolean(String(item.tindak_lanjut || '').trim());
        const isUnrealized =
          !Number.isFinite(progress) || progress < 100 || isNotFinished || hasIssue;

        if (!isUnrealized) return null;

        const kendala = String(item.kendala || '').trim();
        const keterangan_belum_terealisasi =
          kendala ||
          (Number.isFinite(progress) && progress < 100
            ? 'Pengendalian belum terealisasi penuh karena progress belum mencapai 100%.'
            : 'Pengendalian belum terealisasi penuh dan masih memerlukan tindak lanjut.');

        return {
          no: index + 1,
          kode_risiko: item.kode_risiko,
          nama_risiko: item.nama_risiko,
          kegiatan_pengendalian: item.kegiatan_pengendalian,
          penanggung_jawab: item.penanggung_jawab,
          target_waktu: item.target_waktu || item.target_tanggal || 'Belum Tersedia',
          progress_persen: Number.isFinite(progress) ? progress : 0,
          status_realisasi: item.status_realisasi || item.status_monitoring || 'Belum Selesai',
          kendala: kendala || '-',
          keterangan_belum_terealisasi,
          tindak_lanjut: item.tindak_lanjut || '-',
        };
      })
      .filter(Boolean),
    fallback_message: rows.length ? null : NIL_UNREALIZED_CONTROL_MESSAGE,
    field_origin: buildReportFieldOriginMeta({
      userInputFields: [
        'progress_persen',
        'status_monitoring',
        'status_realisasi',
        'kendala',
        'tindak_lanjut',
        'rekomendasi',
      ],
      hiddenSystemMappedFields: [
        'kode_risiko',
        'nama_risiko',
        'monitoring_date',
        'realisasi_waktu',
      ],
      autoCalculatedFields: ['filter progress_persen < 100', 'filter status belum selesai'],
      fallbackSections: rows.length ? [] : [NIL_UNREALIZED_CONTROL_MESSAGE],
    }),
  };
};

const getEfektivitasPengendalian = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const normalize6mCode = (value) => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    const map = {
      man: 'Man',
      manusia: 'Man',
      money: 'Money',
      uang: 'Money',
      method: 'Method',
      metode: 'Method',
      material: 'Material',
      bahan: 'Material',
      machine: 'Machine',
      mesin: 'Machine',
      external: 'External',
      lingkungan: 'External',
    };

    if (map[normalized]) return map[normalized];

    const token = normalized.match(/\b(man|money|method|material|machine|external)\b/i);
    return token ? token[1][0].toUpperCase() + token[1].slice(1).toLowerCase() : 'Belum Tersedia';
  };

  const inferStatusEfektivitas = ({ actualScore, residualScore, raw }) => {
    const rawText = String(raw || '').trim();
    const hasRaw = Boolean(rawText) && rawText !== '-';
    if (hasRaw) return rawText;
    if (!Number.isFinite(actualScore) || !Number.isFinite(residualScore))
      return 'Belum dapat dinilai';
    if (actualScore < residualScore) return 'Efektif';
    if (actualScore > residualScore) return 'Belum Efektif';
    return 'Belum dapat dinilai';
  };

  const inferEfektivitasPengendalian = ({ actualScore, residualScore, raw }) => {
    const rawText = String(raw || '').trim();
    if (rawText && rawText !== '-') return rawText;
    if (!Number.isFinite(actualScore) || !Number.isFinite(residualScore))
      return 'Belum dapat dinilai';
    if (actualScore < residualScore) return 'Efektif';
    if (actualScore > residualScore) return 'Belum Efektif';
    return 'Belum menunjukkan perubahan';
  };

  const inferDeviasiLevel = ({ actualLevel, residualLevel, actualScore, residualScore }) => {
    const actualText = String(actualLevel || '').trim();
    const residualText = String(residualLevel || '').trim();
    if (!actualText || !residualText) return 'Belum Tersedia';
    if (actualText === residualText) return 'Tetap';
    if (!Number.isFinite(actualScore) || !Number.isFinite(residualScore)) return 'Belum Tersedia';
    if (actualScore < residualScore) return 'Membaik';
    if (actualScore > residualScore) return 'Memburuk';
    return 'Tetap';
  };

  const inferKeterangan = ({ statusEfektivitas, actualScore, residualScore }) => {
    if (statusEfektivitas === 'Belum dapat dinilai') {
      return 'Lengkapi data monitoring aktual, bukti realisasi, dan hasil evaluasi pengendalian.';
    }
    if (statusEfektivitas === 'Belum Efektif') {
      return 'Perkuat pelaksanaan pengendalian dan lakukan tindak lanjut atas deviasi risiko aktual.';
    }
    if (statusEfektivitas === 'Efektif') {
      return 'Pertahankan pengendalian dan lanjutkan pemantauan berkala.';
    }
    if (!Number.isFinite(actualScore) || !Number.isFinite(residualScore)) {
      return 'Lengkapi data monitoring aktual, bukti realisasi, dan hasil evaluasi pengendalian.';
    }
    return '-';
  };

  const rows = await sequelize.query(
    `
      SELECT
        mon.id,
        r.kode_risiko,
        r.nama_risiko,
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kegiatan_pengendalian',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'target_output',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'akar_penyebab',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kode_penyebab',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kode_penyebab_6m',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'root_cause_category',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kategori_akar_masalah',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'kategori_penyebab',
        })},
        r.skor_risiko AS risiko_direspons_score,
        r.level_risiko AS risiko_direspons_level,
        r.uraian_risiko,
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'actual_score',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'actual_level',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'actual_likelihood',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'actual_impact',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'residual_score',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'residual_level',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'residual_likelihood',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'residual_impact',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'efektivitas_pengendalian',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'level_change',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'risk_trend',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'rekomendasi',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'hasil_monitoring',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'realisasi_mitigasi',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'progress_persen',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'status_monitoring',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'status_revisi',
        })},
        ${selectColumn({
          columns: await getTableColumns('mr_planning_monitoring'),
          alias: 'mon',
          column: 'versi',
        })}
    FROM mr_planning_monitoring mon
    JOIN mr_planning_risk r
      ON r.id = mon.mr_planning_risk_id
    WHERE ${riskScopeWhere}
    ORDER BY mon.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((item, index) => {
    const residualScore = Number(item.residual_score);
    const actualScore = Number(item.actual_score);
    const hasResidualScore = Number.isFinite(residualScore);
    const hasActualScore = Number.isFinite(actualScore);
    const raw6m =
      item.kode_penyebab_6m ||
      item.root_cause_category ||
      item.kategori_akar_masalah ||
      item.kategori_penyebab ||
      item.kode_penyebab;
    const kodePenyebab6m = normalize6mCode(raw6m);
    const statusEfektivitas = inferStatusEfektivitas({
      actualScore,
      residualScore,
      raw: item.status_efektivitas,
    });
    const efektivitasPengendalian = inferEfektivitasPengendalian({
      actualScore,
      residualScore,
      raw: item.efektivitas_pengendalian,
    });
    const deviasiLevel = inferDeviasiLevel({
      actualLevel: item.actual_level,
      residualLevel: item.residual_level,
      actualScore,
      residualScore,
    });
    const deviasiScore =
      hasActualScore && hasResidualScore ? actualScore - residualScore : 'Belum Tersedia';
    const keterangan =
      item.keterangan ||
      inferKeterangan({
        statusEfektivitas,
        actualScore,
        residualScore,
      });
    const risikoYangDirespons =
      item.risiko_yang_direspons || item.nama_risiko || item.uraian_risiko || 'Belum Tersedia';
    const kegiatanPengendalian =
      item.kegiatan_pengendalian || item.target_output || 'Belum Tersedia';

    return {
      no: index + 1,
      kode_risiko: item.kode_risiko,
      nama_risiko: item.nama_risiko,
      kode_penyebab_6m: kodePenyebab6m,
      akar_penyebab:
        item.akar_penyebab ||
        item.root_cause_description ||
        item.kategori_akar_masalah ||
        item.root_cause_category ||
        'Belum Tersedia',
      risiko_yang_direspons: risikoYangDirespons,
      kegiatan_pengendalian: kegiatanPengendalian,
      residual_likelihood: item.residual_likelihood || 'Belum Tersedia',
      residual_impact: item.residual_impact || 'Belum Tersedia',
      residual_score: hasResidualScore ? residualScore : 'Belum Tersedia',
      residual_level: item.residual_level || 'Belum Tersedia',
      actual_likelihood: item.actual_likelihood || 'Belum Tersedia',
      actual_impact: item.actual_impact || 'Belum Tersedia',
      actual_score: hasActualScore ? actualScore : 'Belum Tersedia',
      actual_level: item.actual_level || 'Belum Tersedia',
      deviasi_score: deviasiScore,
      deviasi_level: deviasiLevel,
      efektivitas_pengendalian: efektivitasPengendalian,
      status_efektivitas: statusEfektivitas,
      rekomendasi:
        item.rekomendasi ||
        (statusEfektivitas === 'Belum dapat dinilai'
          ? 'Lengkapi data monitoring aktual, bukti realisasi, dan hasil evaluasi pengendalian.'
          : statusEfektivitas === 'Belum Efektif'
            ? 'Perkuat pelaksanaan pengendalian dan lakukan tindak lanjut atas deviasi risiko aktual.'
            : statusEfektivitas === 'Efektif'
              ? 'Pertahankan pengendalian dan lanjutkan pemantauan berkala.'
              : 'Belum Tersedia'),
      keterangan,
      field_origin: buildReportFieldOriginMeta({
        userInputFields: [
          'hasil_monitoring',
          'realisasi_mitigasi',
          'progress_persen',
          'efektivitas_pengendalian',
        ],
        hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko'],
        autoCalculatedFields: [
          'risiko_direspons_score',
          'risiko_direspons_level',
          'residual_score',
          'residual_level',
          'actual_score',
          'actual_level',
          'deviasi_score',
          'deviasi_level',
          'level_change',
          'risk_trend',
        ],
        fallbackSections: item.efektivitas_pengendalian ? [] : [UNASSESSED_EFFECTIVENESS_MESSAGE],
      }),
    };
  });
};

const getReviuUsulanRisiko = async (contextId, options = {}) => {
  const id = assertContextId(contextId);
  const reportScope = options.reportScope || { scope_mode: 'context' };
  const riskScopeWhere = buildRiskScopeWhere(reportScope, 'r');
  const riskColumns = await getTableColumns('mr_planning_risk');
  const pickRiskColumnExpr = (column) => (hasColumn(riskColumns, column) ? `r.${column}` : 'NULL');

  return sequelize.query(
    `
    SELECT
      r.id,
      r.kode_risiko,
      r.nama_risiko,
      r.status_risiko,
      r.status_revisi,
      r.versi,
      r.owner_user_id,
      r.owner_division_id,
      r.created_at,
      r.updated_at,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('approved', 'disetujui', 'final', 'selesai') THEN 'Diterima'
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('ditolak', 'rejected') THEN 'Ditolak'
        ELSE 'Masih Dalam Proses'
      END AS keputusan_reviu,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('approved', 'disetujui', 'final', 'selesai') THEN 'Ya'
        ELSE 'Tidak'
      END AS diterima,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('ditolak', 'rejected') THEN 'Ya'
        ELSE 'Tidak'
      END AS ditolak,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('draft', 'verifikasi', 'diajukan', 'diverifikasi')
          OR LOWER(COALESCE(r.status_revisi, '')) NOT IN ('approved', 'disetujui', 'final', 'selesai', 'ditolak', 'rejected')
        THEN 'Ya'
        ELSE 'Tidak'
      END AS masih_proses,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('ditolak', 'rejected') THEN COALESCE(
          NULLIF(TRIM(${pickRiskColumnExpr('alasan_revisi')}), ''),
          NULLIF(TRIM(${pickRiskColumnExpr('catatan_revisi')}), ''),
          NULLIF(TRIM(${pickRiskColumnExpr('rejection_reason')}), ''),
          NULLIF(TRIM(${pickRiskColumnExpr('keterangan')}), ''),
          'Alasan penolakan belum tersedia.'
        )
        ELSE '-'
      END AS alasan_ditolak,
      CASE
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('approved', 'disetujui', 'final', 'selesai')
          THEN 'Usulan risiko telah disetujui/diterima dalam register risiko.'
        WHEN LOWER(COALESCE(r.status_revisi, '')) IN ('ditolak', 'rejected')
          THEN 'Usulan risiko ditolak dan perlu perbaikan sesuai hasil reviu.'
        ELSE 'Usulan risiko masih dalam proses verifikasi/persetujuan dan belum dapat dikategorikan sebagai diterima atau ditolak.'
      END AS keterangan_reviu
    FROM mr_planning_risk r
    WHERE ${riskScopeWhere}
    ORDER BY r.context_id ASC, r.id ASC
    `,
    {
      replacements: buildRiskScopeReplacements(id, reportScope),
      type: QueryTypes.SELECT,
    },
  );
};

const getRiskReferenceParameters = async () => {
  const rows = await sequelize.query(
    `
    SELECT
      g.id AS group_id,
      g.kode_group,
      g.nama_group,
      i.id AS item_id,
      i.kode_item,
      i.nama_item,
      i.nilai_numeric,
      i.nilai_text,
      i.urutan,
      i.is_active
    FROM mr_reference_groups g
    LEFT JOIN mr_reference_items i
      ON i.group_id = g.id
    WHERE g.kode_group IN (:groupCodes)
    ORDER BY g.kode_group ASC, i.urutan ASC, i.id ASC
    `,
    {
      replacements: { groupCodes: REFERENCE_GROUP_CODES },
      type: QueryTypes.SELECT,
    },
  );

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.kode_group]) {
      acc[row.kode_group] = {
        group_id: row.group_id,
        kode_group: row.kode_group,
        nama_group: row.nama_group,
        items: [],
      };
    }

    if (row.item_id) {
      acc[row.kode_group].items.push({
        id: row.item_id,
        kode_item: row.kode_item,
        nama_item: row.nama_item,
        nilai_numeric: row.nilai_numeric,
        nilai_text: row.nilai_text,
        urutan: row.urutan,
        is_active: row.is_active,
      });
    }

    return acc;
  }, {});

  return {
    groups: grouped,
    flat_items: rows.filter((row) => row.item_id),
    field_origin: buildReportFieldOriginMeta({
      referenceFields: REFERENCE_GROUP_CODES,
      autoGeneratedReportSections: ['setting_parameter.reference_parameters'],
    }),
  };
};

const getRiskMatrix = async () =>
  sequelize.query(
    `
    SELECT
      rm.*
    FROM mr_risk_matrix rm
    ORDER BY rm.id ASC
    `,
    {
      type: QueryTypes.SELECT,
    },
  );

const getSettingParameter = async () => {
  const [referenceParameters, riskMatrix] = await Promise.all([
    getRiskReferenceParameters(),
    getRiskMatrix(),
  ]);

  return {
    reference_parameters: referenceParameters,
    risk_matrix: riskMatrix,
    field_origin: buildReportFieldOriginMeta({
      referenceFields: ['mr_reference_groups', 'mr_reference_items', 'mr_risk_matrix'],
      autoGeneratedReportSections: [
        'Pedoman No 2 — Kriteria Kemungkinan dan Dampak',
        'Pedoman No 3 — Matriks Analisis Risiko',
        'Setting Parameter',
      ],
      notes: [
        'Setting Parameter bersumber dari reference table dan risk matrix.',
        'Parameter laporan harus bersumber dari data resmi Manajemen Risiko.',
      ],
    }),
    notes: [
      'Setting Parameter bersumber dari mr_reference_groups dan mr_reference_items.',
      'Risk matrix bersumber dari mr_risk_matrix.',
      'Jika kelompok parameter tertentu belum tersedia, evaluasi kelompok referensi baru melalui pengelolaan data resmi.',
    ],
  };
};

const buildGeneratedSectionPayload = ({
  pedoman,
  title,
  description,
  rows,
  meta,
  fallbackMessage = null,
}) => ({
  pedoman,
  title,
  description,
  rows,
  fallback_message: fallbackMessage,
  meta,
});

const getGeneratedSections = async ({
  context,
  contextItems,
  daftarRisiko,
  analisisRisiko,
  risikoPrioritas,
  rencanaPengendalian,
  realisasiPengendalian,
  kejadianRisikoResult,
  settingParameter,
  contextId,
  reportScope,
}) => {
  const [
    rootCauseAnalysis,
    monitoringLevelRisiko,
    pengendalianBelumTerealisasi,
    efektivitasPengendalian,
    reviuUsulanRisiko,
  ] = await Promise.all([
    getRootCauseAnalysis(contextId, { reportScope }),
    getMonitoringLevelRisiko(contextId, { reportScope }),
    getPengendalianBelumTerealisasi(contextId, { reportScope }),
    getEfektivitasPengendalian(contextId, { reportScope }),
    getReviuUsulanRisiko(contextId, { reportScope }),
  ]);

  const riskMap = buildRiskMap({
    risks: daftarRisiko,
    analyses: analisisRisiko,
    monitoring: monitoringLevelRisiko,
  });

  return {
    pedoman_no_1_penetapan_konteks: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 1',
      title: 'Penetapan Konteks Manajemen Risiko',
      description:
        'Penetapan konteks dihimpun dari data konteks dan objek risiko. Pengelola cukup memilih konteks atau sumber risiko yang tersedia, sedangkan aplikasi memetakan periode, tahun, jenis dokumen, tahapan, referensi, indikator, pemilik, dan sumber data.',
      rows: {
        context,
        context_items: contextItems,
      },
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 1',
        title: 'Penetapan Konteks Manajemen Risiko',
        description:
          'Memisahkan pilihan pengelola terhadap konteks bisnis dan pemetaan data dalam aplikasi.',
        sourceTables: ['mr_planning_context', 'mr_planning_context_item'],
        userInputFields: ['pilihan context', 'pilihan sumber risiko / context item'],
        referenceFields: ['periode_type', 'context_type', 'risk_appetite'],
        hiddenSystemMappedFields: [
          'context_id',
          'context_item_id',
          'periode_id',
          'tahun',
          'jenis_dokumen',
          'renstra_id',
          'opd_id',
          'stage',
          'ref_id',
          'indikator_id',
          'owner_user_id',
          'owner_division_id',
          'source_table',
          'source_id',
          'source_system',
        ],
        autoCalculatedFields: [
          'jenis_konteks',
          'nama_konteks_laporan',
          'indikator_atau_objek_risiko',
          'object_source_type',
        ],
        fallbackSections: [
          'source_system/source_label/nilai_terkait memakai fallback jika kolom belum tersedia',
        ],
      }),
    }),

    pedoman_no_2_kriteria_kemungkinan_dampak: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 2',
      title: 'Kriteria Kemungkinan dan Dampak',
      description: 'Kriteria kemungkinan dan dampak berasal dari Setting Parameter resmi.',
      rows: {
        likelihood: settingParameter?.reference_parameters?.groups?.LIKELIHOOD || null,
        impact: settingParameter?.reference_parameters?.groups?.IMPACT || null,
        impact_area: settingParameter?.reference_parameters?.groups?.IMPACT_AREA || null,
      },
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 2',
        title: 'Kriteria Kemungkinan dan Dampak',
        description:
          'Pengelola hanya memilih nilai dari parameter terkendali; aplikasi memakai parameter ini untuk validasi dan perhitungan.',
        sourceTables: ['mr_reference_groups', 'mr_reference_items'],
        userInputFields: ['pilihan kemungkinan dari dropdown', 'pilihan dampak dari dropdown'],
        referenceFields: ['LIKELIHOOD', 'IMPACT', 'IMPACT_AREA'],
        hiddenSystemMappedFields: ['reference item id'],
        autoCalculatedFields: ['label kemungkinan', 'label dampak', 'nilai numeric parameter'],
        fallbackSections: [
          'Jika parameter belum tersedia, perlu pengelolaan kelompok referensi resmi.',
        ],
      }),
    }),

    pedoman_no_3_matriks_analisis_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 3',
      title: 'Matriks Analisis Risiko',
      description:
        'Matriks analisis risiko berasal dari mr_risk_matrix dan menjadi dasar konsistensi skor/level risiko.',
      rows: settingParameter?.risk_matrix || [],
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 3',
        title: 'Matriks Analisis Risiko',
        description: 'Pengelola tidak mengisi matriks; aplikasi memakai matriks risiko resmi.',
        sourceTables: ['mr_risk_matrix'],
        userInputFields: [],
        referenceFields: ['mr_risk_matrix'],
        hiddenSystemMappedFields: [],
        autoCalculatedFields: ['skor risiko', 'level risiko', 'above appetite'],
        fallbackSections: ['Jika matriks kosong, perbaiki data referensi resmi.'],
      }),
    }),

    pedoman_no_4_identifikasi_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 4',
      title: 'Identifikasi Risiko',
      description:
        'Daftar risiko disusun dari input dasar risiko, parameter referensi, dan pemetaan objek risiko dalam aplikasi. ' +
        'Rows telah dipetakan sesuai kolom Form Coaching Clinic Inspektorat: ' +
        'Jenis Konteks, Nama Konteks, Anggaran, Indikator, Kode Risiko, Pernyataan Risiko, Kategori Risiko, Uraian Dampak, Metode Pencapaian Tujuan SPIP. ' +
        "Placeholder seperti 'isi nama risiko' / 'isi uraian risiko' diganti dengan 'Belum Diisi'. " +
        "Kolom yang belum tersedia di DB menampilkan 'Belum Tersedia' atau 'Belum ditetapkan'.",
      rows: buildPedoman4Rows(daftarRisiko),
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 4',
        title: 'Identifikasi Risiko',
        description:
          'Memisahkan input user, reference/dropdown, mapping teknis, dan hasil hitung risiko.',
        sourceTables: ['mr_planning_risk', 'mr_planning_context_item'],
        userInputFields: ['nama_risiko', 'uraian_risiko', 'penyebab_risiko', 'dampak_risiko'],
        referenceFields: [
          'kategori_risiko',
          'sumber_risiko',
          'kemungkinan',
          'dampak',
          'selera_risiko',
        ],
        hiddenSystemMappedFields: [
          'context_id',
          'context_item_id',
          'periode_id',
          'tahun',
          'renstra_id',
          'opd_id',
          'stage',
          'ref_id',
          'indikator_id',
          'source_table',
          'source_id',
          'nama_konteks',
          'nama_indikator',
        ],
        autoCalculatedFields: [
          'kode_risiko',
          'skor_risiko',
          'level_risiko',
          'anggaran_display',
          'metode_pencapaian_tujuan_spip_display',
          'placeholder_guard',
        ],
        fallbackSections: [
          'anggaran: Belum Tersedia jika nilai anggaran/nilai terkait belum tersedia',
          'metode_pencapaian_tujuan_spip: Belum Tersedia jika belum dapat disimpulkan dari sumber risiko',
          "placeholder seperti 'isi nama risiko' atau 'isi uraian risiko' diganti menjadi 'Belum Diisi'",
        ],
      }),
    }),

    pedoman_no_5_analisis_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 5',
      title: 'Analisis Risiko',
      description:
        'Analisis risiko dibentuk dari risk register, existing control, reference parameter, dan perhitungan backend.',
      rows: analisisRisiko,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 5',
        title: 'Analisis Risiko',
        description:
          'User tidak mengisi skor, level, residual risk, atau rekomendasi secara manual.',
        sourceTables: ['mr_planning_risk', 'mr_planning_risk_analysis'],
        userInputFields: ['existing_control_description'],
        referenceFields: ['existing_control_status', 'control_adequacy_status', 'selera_risiko'],
        hiddenSystemMappedFields: ['mr_planning_risk_id', 'kode_risiko'],
        autoCalculatedFields: [
          'inherent_score',
          'inherent_level',
          'residual_score',
          'residual_level',
          'is_above_appetite',
          'rekomendasi',
        ],
        fallbackSections: [
          'inherent_likelihood/impact jika kolom belum tersedia',
          'residual_likelihood/impact jika kolom belum tersedia',
        ],
      }),
    }),

    pedoman_no_6_risiko_prioritas: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 6',
      title: 'Daftar Risiko Prioritas',
      description:
        'Risiko prioritas ditentukan berdasarkan skor, level, selera risiko, residual, pengendalian, dan kategori sensitif.',
      rows: risikoPrioritas,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 6',
        title: 'Daftar Risiko Prioritas',
        description: 'User tidak memilih risiko prioritas secara manual.',
        sourceTables: ['mr_planning_risk', 'mr_planning_risk_analysis'],
        userInputFields: ['nama_risiko', 'kategori_risiko', 'sumber_risiko'],
        referenceFields: [
          'kategori_risiko',
          'sumber_risiko',
          'selera_risiko',
          'control_adequacy_status',
        ],
        hiddenSystemMappedFields: ['kode_risiko'],
        autoCalculatedFields: [
          'is_priority_candidate',
          'priority_reason',
          'skor_risiko',
          'level_risiko',
          'residual_score',
          'residual_level',
        ],
      }),
    }),

    pedoman_no_7_peta_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 7',
      title: 'Peta Risiko',
      description: 'Peta risiko dibuat otomatis dari likelihood dan impact yang tersedia.',
      rows: riskMap,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 7',
        title: 'Peta Risiko',
        description: 'User tidak menggambar atau memindahkan risiko pada peta risiko.',
        sourceTables: ['mr_planning_risk', 'mr_planning_risk_analysis', 'mr_planning_monitoring'],
        userInputFields: [],
        referenceFields: ['mr_risk_matrix', 'LIKELIHOOD', 'IMPACT'],
        hiddenSystemMappedFields: ['kode_risiko'],
        autoCalculatedFields: ['risk_map.inherent', 'risk_map.residual', 'risk_map.actual'],
        fallbackSections: [
          'Sel peta residual/actual tidak diisi jika likelihood/impact belum tersedia.',
        ],
      }),
    }),

    pedoman_no_8_root_cause_analysis: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 8',
      title: 'Root Cause Analysis',
      description:
        'Root cause dibentuk dari data penyebab yang tersedia. Sistem tidak mengarang akar penyebab.',
      rows: rootCauseAnalysis,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 8',
        title: 'Root Cause Analysis',
        description: 'Why analysis berasal dari input/bahan analisis yang tersedia.',
        sourceTables: ['mr_planning_root_cause', 'mr_planning_risk'],
        userInputFields: [
          'uraian_penyebab',
          'why_1',
          'why_2',
          'why_3',
          'why_4',
          'why_5',
          'akar_penyebab',
        ],
        referenceFields: ['kategori_penyebab_ref_id', 'ROOT_CAUSE_CATEGORY'],
        hiddenSystemMappedFields: ['mr_planning_risk_id', 'kode_risiko'],
        autoCalculatedFields: ['kode_penyebab jika digenerate service'],
        fallbackSections: ['NULL jika field why_4/why_5 belum tersedia'],
      }),
    }),

    pedoman_no_9_rencana_tindak_pengendalian: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 9',
      title: 'Rencana Tindak Pengendalian',
      description:
        'RTP disusun dari rencana mitigasi atau pengendalian yang terhubung dengan risiko. Pengelola dapat mengisi rencana kegiatan dasar, sedangkan aplikasi menghubungkan dengan risiko, respons risiko, SPIP, dan hasil mitigasi.',
      rows: rencanaPengendalian,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 9',
        title: 'Rencana Tindak Pengendalian',
        description:
          'RTP tidak dibuat sebagai domain SPIP baru di e-Pelara; jika terkait e-SIGAP/SPIP, gunakan linkage.',
        sourceTables: ['mr_planning_mitigation', 'mr_planning_risk'],
        userInputFields: [
          'kegiatan_pengendalian',
          'target_output',
          'indikator_keluaran',
          'target_keluaran',
          'satuan_keluaran',
          'penanggung_jawab',
        ],
        referenceFields: [
          'respon_risiko',
          'MITIGATION_RESPONSE',
          'unsur_spip',
          'sub_unsur_spip',
          'output_rtp',
        ],
        hiddenSystemMappedFields: ['mr_planning_risk_id', 'kode_risiko', 'nama_risiko'],
        autoCalculatedFields: [
          'risk_after_mitigation_score',
          'risk_after_mitigation_level',
          'is_above_appetite_after_mitigation',
        ],
        fallbackSections: [
          'kode penyebab/pernyataan penyebab akan diperkuat dari root cause pada step lanjutan jika relasi tersedia.',
        ],
      }),
    }),

    pedoman_no_10_pemantauan_kegiatan_pengendalian: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 10',
      title: 'Pemantauan Kegiatan Pengendalian',
      description:
        'Pemantauan kegiatan pengendalian dibentuk dari monitoring. User cukup mengisi realisasi, progress, kendala, tindak lanjut, dan bukti/realisasi yang memang terjadi.',
      rows: realisasiPengendalian,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 10',
        title: 'Pemantauan Kegiatan Pengendalian',
        description:
          'Sistem menyusun laporan pemantauan dari data monitoring dan tidak membuat daftar manual.',
        sourceTables: ['mr_planning_monitoring', 'mr_planning_risk'],
        userInputFields: [
          'hasil_monitoring',
          'realisasi_mitigasi',
          'output_realisasi',
          'persentase_realisasi',
          'progress_persen',
          'kendala',
          'tindak_lanjut',
          'rekomendasi',
        ],
        referenceFields: ['status_monitoring', 'efektivitas_pengendalian'],
        hiddenSystemMappedFields: [
          'mr_planning_risk_id',
          'kode_risiko',
          'nama_risiko',
          'periode_label',
          'monitoring_date',
        ],
        autoCalculatedFields: [
          'actual_score',
          'actual_level',
          'level_change',
          'risk_trend',
          'is_above_appetite_actual',
        ],
        fallbackSections: [
          'Jika monitoring belum ada, tabel pemantauan dapat tampil nihil/informatif di export.',
        ],
      }),
    }),

    pedoman_no_11_pemantauan_peristiwa_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 11',
      title: 'Pemantauan Peristiwa Risiko',
      description:
        'Kejadian risiko hanya ditampilkan jika benar-benar tercatat. Jika nihil, ditampilkan keterangan resmi sesuai cakupan laporan.',
      rows: kejadianRisikoResult.rows,
      fallbackMessage: kejadianRisikoResult.fallback_message,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 11',
        title: 'Pemantauan Peristiwa Risiko',
        description: 'User hanya mencatat kejadian aktual jika memang terjadi.',
        sourceTables: ['mr_planning_monitoring', 'mr_planning_risk'],
        userInputFields: [
          'tanggal_kejadian',
          'tempat_kejadian',
          'uraian_kejadian',
          'pemicu_kejadian',
          'dampak_kejadian',
          'tindak_lanjut_kejadian',
        ],
        hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko', 'periode_label'],
        autoCalculatedFields: ['terjadi_risiko'],
        fallbackSections: kejadianRisikoResult.fallback_message
          ? [kejadianRisikoResult.fallback_message]
          : [],
      }),
    }),

    pedoman_no_12_monitoring_level_risiko: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 12',
      title: 'Monitoring Level Risiko',
      description:
        'Monitoring level membandingkan risiko yang direspons dengan risiko aktual jika data aktual tersedia.',
      rows: monitoringLevelRisiko,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 12',
        title: 'Monitoring Level Risiko',
        description: 'Sistem membandingkan risiko rencana dan risiko aktual.',
        sourceTables: ['mr_planning_monitoring', 'mr_planning_risk'],
        userInputFields: ['hasil_monitoring', 'realisasi_mitigasi'],
        referenceFields: ['LIKELIHOOD', 'IMPACT', 'RISK_LEVEL'],
        hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko'],
        autoCalculatedFields: [
          'risiko_direspons_nilai',
          'risiko_direspons_level',
          'actual_score',
          'actual_level',
          'level_change',
          'risk_trend',
        ],
        fallbackSections: ['actual_likelihood/impact NULL jika kolom/data belum tersedia'],
      }),
    }),

    pedoman_no_13_reviu_usulan_risiko_baru: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 13',
      title: 'Reviu Usulan Risiko Baru',
      description:
        'Status reviu awal dibentuk dari status_risiko/status_revisi. Detail reviewer dapat diperkuat dari history/workflow pada step lanjutan.',
      rows: reviuUsulanRisiko,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 13',
        title: 'Reviu Usulan Risiko Baru',
        description:
          'Pengelola mengajukan risiko baru melalui alur persetujuan, lalu aplikasi menyusun status reviu.',
        sourceTables: ['mr_planning_risk'],
        userInputFields: ['nama_risiko'],
        hiddenSystemMappedFields: ['owner_user_id', 'owner_division_id', 'status_revisi'],
        autoCalculatedFields: ['status_reviu', 'keputusan_reviu'],
        fallbackSections: ['alasan_jika_ditolak: Belum tersedia', 'reviewer: NULL'],
      }),
    }),

    pedoman_no_14_pengendalian_belum_terealisasi: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 14',
      title: 'Rencana Pengendalian Belum Terealisasi',
      description:
        'Daftar dibentuk otomatis dari monitoring dengan progress < 100 atau status belum selesai.',
      rows: pengendalianBelumTerealisasi.rows,
      fallbackMessage: pengendalianBelumTerealisasi.fallback_message,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 14',
        title: 'Rencana Pengendalian Belum Terealisasi',
        description: 'Pengelola tidak membuat daftar manual; aplikasi memfilter dari monitoring.',
        sourceTables: ['mr_planning_monitoring', 'mr_planning_risk'],
        userInputFields: [
          'progress_persen',
          'status_monitoring',
          'status_realisasi',
          'kendala',
          'tindak_lanjut',
        ],
        hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko'],
        autoCalculatedFields: ['filter progress_persen < 100', 'filter status belum selesai'],
        fallbackSections: pengendalianBelumTerealisasi.fallback_message
          ? [pengendalianBelumTerealisasi.fallback_message]
          : [],
      }),
    }),

    pedoman_no_15_efektivitas_pengendalian: buildGeneratedSectionPayload({
      pedoman: 'Pedoman No 15',
      title: 'Efektivitas Pengendalian',
      description:
        'Efektivitas ditampilkan dari monitoring. Jika belum cukup data, ditampilkan keterangan bahwa penilaian belum dapat dilakukan.',
      rows: efektivitasPengendalian,
      meta: buildSectionMeta({
        pedoman: 'Pedoman No 15',
        title: 'Efektivitas Pengendalian',
        description: 'Sistem tidak menyimpulkan efektif tanpa data monitoring yang cukup.',
        sourceTables: ['mr_planning_monitoring', 'mr_planning_risk'],
        userInputFields: ['hasil_monitoring', 'realisasi_mitigasi', 'progress_persen'],
        hiddenSystemMappedFields: ['kode_risiko', 'nama_risiko'],
        autoCalculatedFields: ['actual_score', 'actual_level', 'level_change', 'risk_trend'],
        fallbackSections: [UNASSESSED_EFFECTIVENESS_MESSAGE],
      }),
    }),

    setting_parameter: buildGeneratedSectionPayload({
      pedoman: 'Setting Parameter',
      title: 'Setting Parameter Manajemen Risiko',
      description:
        'Setting Parameter menjadi sumber kebenaran istilah, pilihan/dropdown, matrix, level, appetite, status, SPIP, RTP, dan efektivitas.',
      rows: settingParameter,
      meta: buildSectionMeta({
        pedoman: 'Setting Parameter',
        title: 'Setting Parameter Manajemen Risiko',
        description: 'Seluruh parameter harus berasal dari tabel referensi dan matriks resmi.',
        sourceTables: ['mr_reference_groups', 'mr_reference_items', 'mr_risk_matrix'],
        userInputFields: [],
        referenceFields: [
          'RISK_CATEGORY',
          'RISK_SOURCE',
          'RISK_APPETITE',
          'LIKELIHOOD',
          'IMPACT',
          'RISK_LEVEL',
          'MITIGATION_RESPONSE',
          'CONTROL_EFFECTIVENESS',
          'ROOT_CAUSE_CATEGORY',
          'SPIP_ELEMENT',
          'SPIP_SUB_ELEMENT',
          'RTP_OUTPUT',
          'PERIODE_TYPE',
          'CONTEXT_TYPE',
          'mr_risk_matrix',
        ],
        hiddenSystemMappedFields: ['reference_group_id', 'reference_item_id', 'matrix_id'],
        autoCalculatedFields: [
          'label parameter',
          'nilai numeric parameter',
          'risk score/level resolver source',
        ],
        fallbackSections: [
          'Jika parameter kosong, lengkapi melalui pengelolaan data referensi resmi.',
        ],
      }),
    }),
  };
};

const PEDOMAN_STATUS = {
  HIJAU: 'hijau',
  KUNING: 'kuning',
  MERAH: 'merah',
};

const REQUIRED_SETTING_PARAMETER_GROUPS = [
  'LIKELIHOOD',
  'IMPACT',
  'IMPACT_AREA',
  'RISK_LEVEL',
  'RISK_CATEGORY',
  'RISK_SOURCE',
  'RISK_APPETITE',
  'RISK_STATUS',
  'MITIGATION_RESPONSE',
  'CONTROL_EFFECTIVENESS',
  'ROOT_CAUSE_CATEGORY',
  'SPIP_ELEMENT',
  'SPIP_SUB_ELEMENT',
  'RTP_OUTPUT',
  'PERIODE_TYPE',
  'CONTEXT_TYPE',
];

const FINAL_REPORT_STATUSES = ['approved', 'final', 'selesai'];

const FALLBACK_VALUE_TEXTS = [
  '',
  '-',
  'belum tersedia',
  'belum diisi',
  'belum ada rekomendasi',
  'belum final',
  'null',
  'undefined',
];

const normalizeString = (value) => String(value ?? '').trim();

const normalizeLower = (value) => normalizeString(value).toLowerCase();

const formatRiskStatusLabel = (value) => {
  const normalized = normalizeLower(value);

  const map = {
    aktif: 'Aktif',
    active: 'Aktif',
    dipantau: 'Dipantau',
    closed: 'Selesai',
    selesai: 'Selesai',
    draft: 'Draft',
    approved: 'Disetujui',
    disetujui: 'Disetujui',
    belum_diisi: 'Belum Diisi',
  };

  return map[normalized] || (value ? String(value).trim() : 'Belum Diisi');
};

const resolveSeleraRisikoLabel = (row = {}) => {
  const candidates = [
    row.selera_risiko,
    row.risk_appetite,
    row.context_selera_risiko,
    row.context_risk_appetite,
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    const lower = text.toLowerCase();

    if (text && !['belum tersedia', 'belum diisi', '-'].includes(lower)) {
      return text;
    }
  }

  return 'Belum Ditetapkan';
};

const isMeaningfulValue = (value) => {
  const normalized = normalizeLower(value);
  return !FALLBACK_VALUE_TEXTS.includes(normalized);
};

const hasAnyMeaningfulValue = (...values) => values.some((value) => isMeaningfulValue(value));

const isFinalReport = (context = {}) =>
  FINAL_REPORT_STATUSES.includes(normalizeLower(context.status_revisi));

const isInterimReport = (context = {}) =>
  ['bulanan', 'triwulan', 'semester'].includes(normalizeLower(context.periode_type));

const getRows = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.display_rows)) return value.display_rows;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
};

const makeKode = (item = {}) => item.kode_risiko || item.kode_penyebab || item.id || 'tanpa-kode';

const makeKodeSet = (rows = []) =>
  new Set(rows.map((item) => item.kode_risiko).filter((value) => isMeaningfulValue(value)));

const makeIdSet = (rows = [], field = 'mr_planning_risk_id') =>
  new Set(
    rows
      .map((item) => Number(item?.[field]))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

const countRiskMapTotalByType = (riskMap = {}, mapType = 'inherent') => {
  const cells = riskMap?.[mapType] || {};

  return Object.values(cells).reduce((total, cell) => total + toNumber(cell?.total), 0);
};

const getReportStatusFromIssues = ({ blockingIssues = [], nonBlockingNotes = [] }) => {
  if (blockingIssues.length) return PEDOMAN_STATUS.MERAH;
  if (nonBlockingNotes.length) return PEDOMAN_STATUS.KUNING;
  return PEDOMAN_STATUS.HIJAU;
};

const getFinalReportStatus = ({
  finalReport = false,
  pedomanOverallStatus = PEDOMAN_STATUS.MERAH,
  globalBlockingIssues = [],
} = {}) => {
  if (
    finalReport &&
    pedomanOverallStatus === PEDOMAN_STATUS.HIJAU &&
    !globalBlockingIssues.length
  ) {
    return 'ready_for_pdf';
  }

  if (!finalReport && pedomanOverallStatus === PEDOMAN_STATUS.HIJAU) {
    return 'draft_not_pdf_ready';
  }

  if (pedomanOverallStatus === PEDOMAN_STATUS.KUNING) {
    return 'pedoman_has_non_blocking_notes';
  }

  return 'pedoman_has_blocking_issues';
};

const buildPedomanGate = ({
  pedoman,
  title,
  blockingIssues = [],
  nonBlockingNotes = [],
  counts = {},
  data = {},
}) => {
  const status = getReportStatusFromIssues({
    blockingIssues,
    nonBlockingNotes,
  });

  return {
    pedoman,
    title,
    status_pedoman: status,
    pdf_ready: status === PEDOMAN_STATUS.HIJAU,
    blocking_issues: blockingIssues,
    non_blocking_notes: nonBlockingNotes,
    counts,
    data,
  };
};

const findRowsWithMissingFields = ({
  rows = [],
  requiredFields = [],
  label = 'Data',
  dedupeField = null,
}) => {
  const seen = new Set();
  const uniqueRows = rows.filter(row => {
    const dedupeValue = dedupeField ? row?.[dedupeField] : null;
    const key = dedupeValue || row?.kode_risiko || row?.id || JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return uniqueRows.flatMap((row, index) => {
    const missingFields = requiredFields.filter((field) => !isMeaningfulValue(row?.[field]));

    if (!missingFields.length) return [];

    return `${label} ${makeKode(row) || index + 1} belum lengkap: ${missingFields.join(', ')}.`;
  });
};

const buildReportQualityGate = ({
  context = {},
  contextItems = [],
  summary = {},
  lampiran = {},
  settingParameter = {},
} = {}) => {
  const daftarRisiko = lampiran.daftar_risiko || [];
  const analisisRisiko = lampiran.analisis_risiko || [];
  const risikoPrioritas = getRows(dedupeRisikoPrioritas(lampiran.risiko_prioritas || []));
  const rencanaPengendalian = getRows(
    dedupeRencanaPengendalian(lampiran.rencana_pengendalian || []),
  );
  const realisasiPengendalian = getRows(
    dedupeRealisasiPengendalian(lampiran.realisasi_pengendalian || []),
  );
  const kejadianRisiko = getRows(dedupeKejadianRisiko(lampiran.kejadian_risiko || []));
  const rootCauseAnalysis = getRows(lampiran.root_cause_analysis || []);
  const rootCauseAnalysisFiltered = rootCauseAnalysis.filter(
    (item) =>
      (item?.is_active === undefined || item?.is_active === null || toBooleanFlag(item.is_active)) &&
      (item?.is_latest === undefined || item?.is_latest === null || toBooleanFlag(item.is_latest)),
  );
  const monitoringLevelRisiko = lampiran.monitoring_level_risiko || [];
  const efektivitasPengendalian = lampiran.efektivitas_pengendalian || [];
  const reviuUsulanRisikoBaru = lampiran.reviu_usulan_risiko_baru || [];
  const riskMap = lampiran.risk_map || {};

  const pengendalianBelumTerealisasi = getRows(lampiran.pengendalian_belum_terealisasi);

  const finalReport = isFinalReport(context);
  const interimReport = isInterimReport(context);

  const analisisByRiskId = makeIdSet(analisisRisiko);
  const rootCauseByRiskId = makeIdSet(rootCauseAnalysisFiltered);
  const prioritasKodeSet = makeKodeSet(risikoPrioritas);
  const rtpKodeSet = makeKodeSet(rencanaPengendalian);
  const monitoringKodeSet = makeKodeSet(realisasiPengendalian);
  const efektivitasKodeSet = makeKodeSet(
    efektivitasPengendalian.filter((item) => isMeaningfulValue(item.efektivitas_pengendalian)),
  );

  const referenceGroups = settingParameter?.reference_parameters?.groups || {};
  const riskMatrixRows = Array.isArray(settingParameter?.risk_matrix)
    ? settingParameter.risk_matrix
    : [];

  const pedomanStatus = {};

  // Pedoman No 1 — Penetapan Konteks
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    if (!context?.id) {
      blockingIssues.push('Context laporan MR tidak ditemukan.');
    }

    if (!contextItems.length) {
      if (daftarRisiko.length > 0) {
        nonBlockingNotes.push('Context item/sumber risiko belum tersedia, namun data risiko sudah ada.');
      } else {
        blockingIssues.push('Context item/sumber risiko belum tersedia.');
      }
    }

    contextItems.forEach((item) => {
      if (!isMeaningfulValue(item.stage)) {
        blockingIssues.push(`Context item ${item.id} belum memiliki stage.`);
      }

      if (!isMeaningfulValue(item.ref_id)) {
        blockingIssues.push(`Context item ${item.id} belum memiliki ref_id.`);
      }

      if (
        !hasAnyMeaningfulValue(
          item.indikator_id,
          item.object_source_type,
          item.source_table,
          item.source_id,
        )
      ) {
        blockingIssues.push(
          `Context item ${item.id} belum dapat ditelusuri ke indikator/objek risiko.`,
        );
      }
    });

    if (!isMeaningfulValue(context.nama_opd)) {
      blockingIssues.push('Nama OPD belum tersedia pada context laporan.');
    }

    if (!isMeaningfulValue(context.periode_label)) {
      blockingIssues.push('Periode laporan belum tersedia pada context.');
    }

    if (!isMeaningfulValue(context.nama_pemilik_risiko)) {
      nonBlockingNotes.push('Nama pemilik risiko belum tersedia.');
    }

    if (!isMeaningfulValue(context.jabatan_pemilik_risiko)) {
      nonBlockingNotes.push('Jabatan pemilik risiko belum tersedia.');
    }

    if (!isMeaningfulValue(context.nama_koordinator)) {
      nonBlockingNotes.push('Nama koordinator risiko belum tersedia.');
    }

    if (!isMeaningfulValue(context.jabatan_koordinator)) {
      nonBlockingNotes.push('Jabatan koordinator risiko belum tersedia.');
    }

    if (finalReport && nonBlockingNotes.length) {
      blockingIssues.push(
        'Identitas pemilik risiko/koordinator/penandatangan masih belum lengkap untuk laporan final/PDF.',
      );
    }

    if (!isMeaningfulValue(context.nama_penandatangan)) {
      nonBlockingNotes.push('Nama penandatangan laporan belum tersedia.');
    }

    if (!isMeaningfulValue(context.jabatan_penandatangan)) {
      nonBlockingNotes.push('Jabatan penandatangan laporan belum tersedia.');
    }

    if (!isMeaningfulValue(context.nip_penandatangan)) {
      nonBlockingNotes.push('NIP penandatangan laporan belum tersedia.');
    }

    pedomanStatus.pedoman_no_1 = buildPedomanGate({
      pedoman: 'Pedoman No 1',
      title: 'Penetapan Konteks',
      blockingIssues,
      nonBlockingNotes: finalReport ? [] : nonBlockingNotes,
      counts: {
        context_items: contextItems.length,
      },
    });
  }

  // Pedoman No 2 — Kriteria Kemungkinan dan Dampak
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const likelihoodCount = referenceGroups.LIKELIHOOD?.items?.length || 0;
    const impactCount = referenceGroups.IMPACT?.items?.length || 0;
    const impactAreaCount = referenceGroups.IMPACT_AREA?.items?.length || 0;

    if (likelihoodCount < 5) {
      blockingIssues.push('Parameter LIKELIHOOD belum lengkap minimal 5 item.');
    }

    if (impactCount < 5) {
      blockingIssues.push('Parameter IMPACT belum lengkap minimal 5 item.');
    }

    if (impactAreaCount < 1) {
      blockingIssues.push('Parameter IMPACT_AREA belum tersedia.');
    }

    pedomanStatus.pedoman_no_2 = buildPedomanGate({
      pedoman: 'Pedoman No 2',
      title: 'Kriteria Kemungkinan dan Dampak',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        likelihood: likelihoodCount,
        impact: impactCount,
        impact_area: impactAreaCount,
      },
    });
  }

  // Pedoman No 3 — Matriks Analisis Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    if (riskMatrixRows.length < 25) {
      blockingIssues.push('Matriks risiko belum lengkap 25 kombinasi likelihood x impact.');
    }

    const matrixWithoutLevel = riskMatrixRows.filter(
      (row) =>
        !hasAnyMeaningfulValue(row.level_risiko, row.risk_level, row.level_name, row.level_code),
    );

    if (matrixWithoutLevel.length) {
      nonBlockingNotes.push(
        `Terdapat ${matrixWithoutLevel.length} baris risk matrix tanpa label level eksplisit.`,
      );
    }

    pedomanStatus.pedoman_no_3 = buildPedomanGate({
      pedoman: 'Pedoman No 3',
      title: 'Matriks Analisis Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        risk_matrix_rows: riskMatrixRows.length,
      },
    });
  }

  // Pedoman No 4 — Identifikasi Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    if (!daftarRisiko.length) {
      blockingIssues.push('Daftar risiko belum tersedia.');
    }

    const missingRiskFields = findRowsWithMissingFields({
      rows: daftarRisiko,
      label: 'Risiko',
      requiredFields: [
        'kode_risiko',
        'nama_risiko',
        'uraian_risiko',
        'penyebab_risiko',
        'dampak_risiko',
        'kategori_risiko',
        'sumber_risiko',
        'kemungkinan',
        'dampak',
        'skor_risiko',
        'level_risiko',
      ],
    });

    if (missingRiskFields.length) {
      const priorityMissing = daftarRisiko.some(
        (risk) =>
          prioritasKodeSet.has(risk.kode_risiko) &&
          findRowsWithMissingFields({
            rows: [risk],
            label: 'Risiko prioritas',
            requiredFields: [
              'kode_risiko',
              'nama_risiko',
              'uraian_risiko',
              'penyebab_risiko',
              'dampak_risiko',
              'kategori_risiko',
              'sumber_risiko',
              'kemungkinan',
              'dampak',
              'skor_risiko',
              'level_risiko',
            ],
          }).length > 0,
      );

      if (priorityMissing || finalReport) {
        blockingIssues.push(...missingRiskFields);
      } else {
        nonBlockingNotes.push(...missingRiskFields);
      }
    }

    const risksWithoutLinkage = daftarRisiko.filter(
      (risk) =>
        !hasAnyMeaningfulValue(
          risk.context_item_id,
          risk.stage,
          risk.ref_id,
          risk.indikator_id,
          risk.object_source_type,
        ),
    );

    if (risksWithoutLinkage.length) {
      blockingIssues.push(
        `Terdapat ${risksWithoutLinkage.length} risiko tanpa linkage konteks/sumber risiko.`,
      );
    }

    pedomanStatus.pedoman_no_4 = buildPedomanGate({
      pedoman: 'Pedoman No 4',
      title: 'Identifikasi Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_risiko: daftarRisiko.length,
        risiko_tanpa_linkage: risksWithoutLinkage.length,
      },
    });
  }

  // Pedoman No 5 — Analisis Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const priorityWithoutAnalysis = risikoPrioritas.filter(
      (risk) => !analisisByRiskId.has(toNumber(risk.id)),
    );

    if (priorityWithoutAnalysis.length) {
      blockingIssues.push(
        `Terdapat ${priorityWithoutAnalysis.length} risiko prioritas yang belum memiliki analisis risiko.`,
      );
    }

    const riskWithoutAnalysis = daftarRisiko.filter(
      (risk) => !analisisByRiskId.has(toNumber(risk.id)),
    );

    if (riskWithoutAnalysis.length) {
      const message = `Terdapat ${riskWithoutAnalysis.length} risiko yang belum memiliki analisis risiko.`;

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    const missingAnalysisFields = findRowsWithMissingFields({
      rows: analisisRisiko,
      label: 'Analisis risiko',
      requiredFields: [
        'existing_control_status',
        'existing_control_description',
        'control_adequacy_status',
        'inherent_score',
        'inherent_level',
        'residual_score',
        'residual_level',
      ],
    });

    if (missingAnalysisFields.length) {
      blockingIssues.push(...missingAnalysisFields);
    }

    pedomanStatus.pedoman_no_5 = buildPedomanGate({
      pedoman: 'Pedoman No 5',
      title: 'Analisis Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_risiko: daftarRisiko.length,
        total_analisis: analisisRisiko.length,
        risiko_prioritas_tanpa_analisis: priorityWithoutAnalysis.length,
        risiko_tanpa_analisis: riskWithoutAnalysis.length,
      },
    });
  }

  // Pedoman No 6 — Risiko Prioritas
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const riskAboveAppetite = daftarRisiko.filter((risk) => toBooleanFlag(risk.is_above_appetite));

    if (!risikoPrioritas.length && riskAboveAppetite.length) {
      blockingIssues.push('Risiko prioritas kosong padahal terdapat risiko di atas selera risiko.');
    }

    const priorityWithoutReason = risikoPrioritas.filter(
      (risk) => !isMeaningfulValue(risk.priority_reason),
    );

    if (priorityWithoutReason.length) {
      nonBlockingNotes.push(
        `Terdapat ${priorityWithoutReason.length} risiko prioritas tanpa alasan prioritas.`,
      );
    }

    pedomanStatus.pedoman_no_6 = buildPedomanGate({
      pedoman: 'Pedoman No 6',
      title: 'Risiko Prioritas',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_risiko_prioritas: risikoPrioritas.length,
        risiko_di_atas_selera: riskAboveAppetite.length,
      },
    });
  }

  // Pedoman No 7 — Peta Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const inherentTotal = countRiskMapTotalByType(riskMap, 'inherent');
    const residualTotal = countRiskMapTotalByType(riskMap, 'residual');
    const actualTotal = countRiskMapTotalByType(riskMap, 'actual');

    if (daftarRisiko.length && !inherentTotal) {
      blockingIssues.push('Peta risiko inherent kosong padahal risiko tersedia.');
    }

    if (analisisRisiko.length && !residualTotal) {
      nonBlockingNotes.push(
        'Peta risiko residual belum terbentuk meskipun data analisis tersedia.',
      );
    }

    if (monitoringLevelRisiko.length && !actualTotal) {
      nonBlockingNotes.push(
        'Peta risiko aktual belum terbentuk meskipun data monitoring tersedia.',
      );
    }

    if (finalReport && analisisRisiko.length && !residualTotal) {
      blockingIssues.push('Peta residual wajib tersedia untuk laporan final.');
    }

    pedomanStatus.pedoman_no_7 = buildPedomanGate({
      pedoman: 'Pedoman No 7',
      title: 'Peta Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        inherent: inherentTotal,
        residual: residualTotal,
        actual: actualTotal,
      },
    });
  }

  // Pedoman No 8 — Analisis Akar Permasalahan
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const priorityWithoutRootCause = risikoPrioritas.filter(
      (risk) => !rootCauseByRiskId.has(toNumber(risk.id)),
    );

    if (priorityWithoutRootCause.length) {
      blockingIssues.push(
        `Terdapat ${priorityWithoutRootCause.length} risiko prioritas yang belum memiliki root cause.`,
      );
    }

    const missingRootCauseFields = findRowsWithMissingFields({
      rows: rootCauseAnalysisFiltered,
      label: 'Root cause',
      requiredFields: ['uraian_penyebab', 'akar_penyebab'],
      dedupeField: 'kode_risiko',
    });

    if (missingRootCauseFields.length) {
      if (finalReport) blockingIssues.push(...missingRootCauseFields);
      else nonBlockingNotes.push(...missingRootCauseFields);
    }

    pedomanStatus.pedoman_no_8 = buildPedomanGate({
      pedoman: 'Pedoman No 8',
      title: 'Analisis Akar Permasalahan',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_root_cause: rootCauseAnalysisFiltered.length,
        risiko_prioritas_tanpa_root_cause: priorityWithoutRootCause.length,
      },
    });
  }

  // Pedoman No 9 — RTP / Mitigasi
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const priorityWithoutRtp = risikoPrioritas.filter((risk) => !rtpKodeSet.has(risk.kode_risiko));

    if (priorityWithoutRtp.length) {
      blockingIssues.push(
        `Terdapat ${priorityWithoutRtp.length} risiko prioritas yang belum memiliki RTP/mitigasi.`,
      );
    }

    const missingRtpFields = findRowsWithMissingFields({
      rows: rencanaPengendalian,
      label: 'RTP',
      requiredFields: [
        'respon_risiko',
        'kegiatan_pengendalian',
        'target_output',
        'indikator_keluaran',
        'penanggung_jawab',
      ],
    });

    if (missingRtpFields.length) {
      if (finalReport) blockingIssues.push(...missingRtpFields);
      else nonBlockingNotes.push(...missingRtpFields);
    }

    pedomanStatus.pedoman_no_9 = buildPedomanGate({
      pedoman: 'Pedoman No 9',
      title: 'Rencana Tindak Pengendalian',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_rtp: rencanaPengendalian.length,
        risiko_prioritas_tanpa_rtp: priorityWithoutRtp.length,
      },
    });
  }

  // Pedoman No 10 — Monitoring Kegiatan Pengendalian
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const rtpWithoutMonitoring = rencanaPengendalian.filter(
      (rtp) => !monitoringKodeSet.has(rtp.kode_risiko),
    );

    const priorityWithoutMonitoring = risikoPrioritas.filter(
      (risk) => rtpKodeSet.has(risk.kode_risiko) && !monitoringKodeSet.has(risk.kode_risiko),
    );

    const interimMonitoringNote =
      interimReport && rtpWithoutMonitoring.length
        ? `Laporan ${context?.periode_label || 'periode berjalan'} bersifat interim; ${rtpWithoutMonitoring.length} RTP masih belum dimonitoring penuh pada periode berjalan dan akan menjadi bahan pemantauan lanjutan.`
        : null;

    if (rtpWithoutMonitoring.length) {
      const message = `Terdapat ${rtpWithoutMonitoring.length} RTP aktif yang belum memiliki monitoring dalam cakupan laporan.`;

      if (finalReport) {
        blockingIssues.push(message);
      } else if (!interimReport) {
        nonBlockingNotes.push(message);
      }
    }

    if (priorityWithoutMonitoring.length) {
      const message = `Terdapat ${priorityWithoutMonitoring.length} risiko prioritas dengan RTP tetapi belum dimonitoring.`;

      if (finalReport) {
        blockingIssues.push(message);
      } else if (!interimReport) {
        nonBlockingNotes.push(message);
      }
    }

    const missingMonitoringFields = findRowsWithMissingFields({
      rows: realisasiPengendalian,
      label: 'Monitoring',
      requiredFields: [
        'monitoring_date',
        'progress_persen',
        'hasil_monitoring',
        'status_monitoring',
      ],
    });

    if (missingMonitoringFields.length) {
      if (finalReport) {
        blockingIssues.push(...missingMonitoringFields);
      } else if (!interimReport) {
        nonBlockingNotes.push(...missingMonitoringFields);
      }
    }

    pedomanStatus.pedoman_no_10 = buildPedomanGate({
      pedoman: 'Pedoman No 10',
      title: 'Pemantauan Kegiatan Pengendalian',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_rtp: rencanaPengendalian.length,
        total_monitoring: realisasiPengendalian.length,
        rtp_tanpa_monitoring: rtpWithoutMonitoring.length,
        risiko_prioritas_tanpa_monitoring: priorityWithoutMonitoring.length,
        is_interim_report: interimReport,
      },
      data: {
        interim_monitoring_note: interimMonitoringNote,
        rule: 'Untuk laporan bulanan/triwulan/semester yang belum final, RTP yang belum dimonitoring penuh dapat dicatat sebagai pemantauan lanjutan periode berjalan. Untuk laporan final/approved, seluruh RTP prioritas wajib memiliki monitoring.',
      },
    });
  }

  // Pedoman No 11 — Pemantauan Peristiwa Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const kejadianTanpaTindakLanjut = kejadianRisiko.filter(
      (item) => !isMeaningfulValue(item.tindak_lanjut_kejadian),
    );

    if (kejadianTanpaTindakLanjut.length) {
      const message = `Terdapat ${kejadianTanpaTindakLanjut.length} kejadian risiko tanpa tindak lanjut.`;

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    pedomanStatus.pedoman_no_11 = buildPedomanGate({
      pedoman: 'Pedoman No 11',
      title: 'Pemantauan Peristiwa Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_kejadian_risiko: kejadianRisiko.length,
      },
      data: {
        fallback_message: kejadianRisiko.length === 0 ? NIL_EVENT_MESSAGE : null,
      },
    });
  }

  // Pedoman No 12 — Monitoring Level Risiko
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const monitoringWithoutActual = monitoringLevelRisiko.filter(
      (item) =>
        !hasAnyMeaningfulValue(item.actual_score, item.actual_level) ||
        !hasAnyMeaningfulValue(item.actual_likelihood, item.actual_impact),
    );

    if (monitoringWithoutActual.length) {
      const message = `Terdapat ${monitoringWithoutActual.length} monitoring yang belum memiliki actual likelihood/impact atau actual level.`;

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    pedomanStatus.pedoman_no_12 = buildPedomanGate({
      pedoman: 'Pedoman No 12',
      title: 'Monitoring Level Risiko',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_monitoring_level: monitoringLevelRisiko.length,
        monitoring_tanpa_actual: monitoringWithoutActual.length,
      },
    });
  }

  // Pedoman No 13 — Reviu Usulan Risiko Baru
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const usulanBelumFinal = reviuUsulanRisikoBaru.filter((item) =>
      ['belum final', 'dalam proses reviu', 'proses'].some((keyword) =>
        normalizeLower(item.keputusan_reviu || item.status_reviu).includes(keyword),
      ),
    );

    const interimReviewNote =
      interimReport && usulanBelumFinal.length
        ? `Laporan ${context?.periode_label || 'periode berjalan'} bersifat interim; usulan risiko baru masih dalam proses reviu periode berjalan.`
        : null;

    if (usulanBelumFinal.length) {
      const message = `Terdapat ${usulanBelumFinal.length} usulan risiko yang belum memiliki keputusan review final.`;

      if (finalReport) {
        blockingIssues.push(message);
      } else if (!interimReport) {
        nonBlockingNotes.push(message);
      }
    }

    pedomanStatus.pedoman_no_13 = buildPedomanGate({
      pedoman: 'Pedoman No 13',
      title: 'Reviu Usulan Risiko Baru',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_usulan: reviuUsulanRisikoBaru.length,
        belum_final: usulanBelumFinal.length,
        is_interim_report: interimReport,
      },
      data: {
        interim_review_note: interimReviewNote,
        rule: 'Untuk laporan bulanan/triwulan/semester yang belum final, usulan risiko baru boleh berstatus dalam proses reviu apabila catatan interim resmi ditampilkan. Untuk laporan final/approved, usulan risiko wajib memiliki keputusan final.',
      },
    });
  }

  // Pedoman No 14 — Pengendalian Belum Terealisasi
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    if (rencanaPengendalian.length && !realisasiPengendalian.length) {
      const message =
        'Belum ada monitoring sehingga belum dapat ditentukan pengendalian terealisasi atau belum terealisasi.';

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    pedomanStatus.pedoman_no_14 = buildPedomanGate({
      pedoman: 'Pedoman No 14',
      title: 'Pengendalian Belum Terealisasi',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_pengendalian_belum_terealisasi: pengendalianBelumTerealisasi.length,
      },
      data: {
        fallback_message:
          pengendalianBelumTerealisasi.length === 0 ? NIL_UNREALIZED_CONTROL_MESSAGE : null,
      },
    });
  }

  // Pedoman No 15 — Efektivitas Pengendalian
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    const priorityWithoutEffectiveness = risikoPrioritas.filter(
      (risk) =>
        monitoringKodeSet.has(risk.kode_risiko) && !efektivitasKodeSet.has(risk.kode_risiko),
    );

    if (priorityWithoutEffectiveness.length) {
      const message = `Terdapat ${priorityWithoutEffectiveness.length} monitoring risiko prioritas yang belum memiliki penilaian efektivitas.`;

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    const unassessedEffectiveness = efektivitasPengendalian.filter((item) =>
      normalizeLower(item.efektivitas_pengendalian).includes('belum'),
    );

    if (unassessedEffectiveness.length) {
      const message = `Terdapat ${unassessedEffectiveness.length} data efektivitas yang masih belum dapat dinilai.`;

      if (finalReport) blockingIssues.push(message);
      else nonBlockingNotes.push(message);
    }

    pedomanStatus.pedoman_no_15 = buildPedomanGate({
      pedoman: 'Pedoman No 15',
      title: 'Efektivitas Pengendalian',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        total_efektivitas: efektivitasPengendalian.length,
        belum_dapat_dinilai: unassessedEffectiveness.length,
      },
    });
  }

  // Setting Parameter
  {
    const blockingIssues = [];
    const nonBlockingNotes = [];

    REQUIRED_SETTING_PARAMETER_GROUPS.forEach((groupCode) => {
      const group = referenceGroups[groupCode];
      const itemCount = group?.items?.length || 0;

      if (!group || itemCount < 1) {
        blockingIssues.push(`Reference group ${groupCode} belum tersedia/aktif.`);
      }
    });

    if (riskMatrixRows.length < 25) {
      blockingIssues.push('Risk matrix belum lengkap 25 baris.');
    }

    pedomanStatus.setting_parameter = buildPedomanGate({
      pedoman: 'Setting Parameter',
      title: 'Setting Parameter',
      blockingIssues,
      nonBlockingNotes,
      counts: {
        required_groups: REQUIRED_SETTING_PARAMETER_GROUPS.length,
        available_groups: REQUIRED_SETTING_PARAMETER_GROUPS.filter(
          (groupCode) => (referenceGroups[groupCode]?.items?.length || 0) > 0,
        ).length,
        risk_matrix_rows: riskMatrixRows.length,
      },
    });
  }

  const allPedoman = Object.values(pedomanStatus);

  const pedomanMerah = allPedoman.filter((item) => item.status_pedoman === PEDOMAN_STATUS.MERAH);

  const pedomanKuning = allPedoman.filter((item) => item.status_pedoman === PEDOMAN_STATUS.KUNING);

  const pedomanBlockingIssues = allPedoman.flatMap((item) =>
    item.blocking_issues.map((issue) => `${item.pedoman}: ${issue}`),
  );

  const pedomanNonBlockingNotes = allPedoman.flatMap((item) =>
    item.non_blocking_notes.map((note) => `${item.pedoman}: ${note}`),
  );

  const pedomanOverallStatus = pedomanBlockingIssues.length
    ? PEDOMAN_STATUS.MERAH
    : pedomanKuning.length
      ? PEDOMAN_STATUS.KUNING
      : PEDOMAN_STATUS.HIJAU;

  const finalReportBlockingIssues = [];
  // Residual Risk Gate — eksplisit mandiri
  const residualRiskEvaluated = risikoPrioritas.every(r => r.residual_score !== null && r.residual_score !== undefined);
  if (finalReport && !residualRiskEvaluated) {
    finalReportBlockingIssues.push('Residual risk belum dievaluasi pada seluruh risiko prioritas. Finalisasi laporan tidak diizinkan.');
  }

  if (!finalReport) {
    finalReportBlockingIssues.push(
      'Status laporan belum approved/final sehingga PDF final belum dapat dibuat.',
    );
  }

  const globalBlockingIssues = [...pedomanBlockingIssues, ...finalReportBlockingIssues];

  const globalNonBlockingNotes = [...pedomanNonBlockingNotes];

  const pdfReady =
    finalReport &&
    pedomanOverallStatus === PEDOMAN_STATUS.HIJAU &&
    !pedomanBlockingIssues.length &&
    !finalReportBlockingIssues.length;

  const finalReportStatus = getFinalReportStatus({
    finalReport,
    pedomanOverallStatus,
    globalBlockingIssues,
  });

  return {
    context_id: context?.id || null,
    periode_label: context?.periode_label || null,
    report_status: context?.status_revisi || null,

    // R16H-0F — status pedoman dipisahkan dari kesiapan PDF final.
    pedoman_overall_status: pedomanOverallStatus,
    final_report_status: finalReportStatus,

    // Backward compatibility: overall_status tetap ada, tetapi sekarang merepresentasikan status pedoman.
    overall_status: pedomanOverallStatus,

    pdf_ready: pdfReady,
    pedoman_summary: {
      total: allPedoman.length,
      hijau: allPedoman.filter((item) => item.status_pedoman === PEDOMAN_STATUS.HIJAU).length,
      kuning: pedomanKuning.length,
      merah: pedomanMerah.length,
    },
    pedoman_status: pedomanStatus,

    // R16H-0F — dipisahkan agar audit tidak membaca draft PDF sebagai kegagalan pedoman.
    pedoman_blocking_issues: pedomanBlockingIssues,
    pedoman_non_blocking_notes: pedomanNonBlockingNotes,
    final_report_blocking_issues: finalReportBlockingIssues,

    // Backward compatibility untuk client lama.
    blocking_issues: globalBlockingIssues,
    non_blocking_notes: globalNonBlockingNotes,

    rules: {
      final_report_statuses: FINAL_REPORT_STATUSES,
      required_setting_parameter_groups: REQUIRED_SETTING_PARAMETER_GROUPS,
      pdf_ready_rule:
        'PDF final hanya true jika laporan approved/final/selesai, seluruh pedoman hijau, tidak ada pedoman blocking issues, dan tidak ada final report blocking issues.',
      status_separation_rule:
        'pedoman_overall_status menunjukkan kelengkapan Pedoman No 1 sampai No 15 dan Setting Parameter. final_report_status menunjukkan kesiapan laporan final/PDF berdasarkan workflow status laporan.',
    },
  };
};

const buildNarasi = ({ context, summary }) => {
  const periodeLabel = context?.periode_label || 'periode laporan';
  const namaOpd = context?.nama_opd || 'Perangkat Daerah';

  return {
    identifikasi_risiko:
      `Jumlah risiko yang telah teridentifikasi dalam cakupan laporan ` +
      `pada ${namaOpd} sebanyak ${summary.total_risiko} risiko.`,

    usulan_risiko:
      `Jumlah usulan risiko dalam cakupan laporan sebanyak ` +
      `${summary.total_usulan_risiko} risiko.`,

    analisis_risiko:
      `Jumlah risiko dengan pengendalian yang belum efektif sebanyak ` +
      `${summary.total_existing_control_tidak_efektif} risiko atau ` +
      `${summary.persen_existing_control_tidak_efektif}% dari populasi risiko. ` +
      `Jumlah risiko dengan kecukupan pengendalian belum memadai sebanyak ` +
      `${summary.total_control_belum_memadai} risiko atau ` +
      `${summary.persen_control_belum_memadai}% dari populasi risiko.`,

    evaluasi_risiko:
      `Jumlah risiko yang berada di atas selera risiko sebanyak ` +
      `${summary.total_risiko_di_atas_selera} risiko atau ` +
      `${summary.persen_risiko_di_atas_selera}% dari total risiko yang telah teridentifikasi.`,

    kegiatan_pengendalian:
      `Jumlah kegiatan pengendalian yang direncanakan dalam cakupan laporan ` +
      `sebanyak ${summary.total_kegiatan_pengendalian} kegiatan pengendalian. ` +
      `Jumlah kegiatan pengendalian yang telah terealisasi sebanyak ` +
      `${summary.total_pengendalian_terealisasi} kegiatan dengan rata-rata progress ` +
      `${summary.rata_rata_progress}%.`,

    kejadian_risiko:
      `Jumlah kejadian risiko yang muncul dalam cakupan laporan sebanyak ` +
      `${summary.total_kejadian_risiko} kejadian.`,
  };
};

const getLampiran = async (contextId, options = {}) => {
  const id = assertContextId(contextId);

  const anchorContext = options.context || (await getContext(id));
  const reportScope =
    options.reportScope ||
    buildReportScope({
      context: anchorContext,
      scopeMode: options.scope_mode,
    });

  const context = enrichContextWithReportScope(anchorContext, reportScope);

  const [
    daftarRisiko,
    analisisRisiko,
    risikoPrioritas,
    rencanaPengendalian,
    realisasiPengendalian,
    kejadianRisikoResult,
    contextItems,
    settingParameter,
  ] = await Promise.all([
    getDaftarRisiko(id, { reportScope }),
    getAnalisisRisiko(id, { reportScope }),
    getRisikoPrioritas(id, { reportScope }),
    getRencanaPengendalian(id, { reportScope }),
    getRealisasiPengendalian(id, { reportScope }),
    getKejadianRisiko(id, { reportScope }),
    getContextItems(id, { reportScope }),
    getSettingParameter(),
  ]);

  const generatedSections = await getGeneratedSections({
    context,
    contextItems,
    daftarRisiko,
    analisisRisiko,
    risikoPrioritas,
    rencanaPengendalian,
    realisasiPengendalian,
    kejadianRisikoResult,
    settingParameter,
    contextId: id,
    reportScope,
  });

  const lampiranPayload = {
    // Backward compatibility untuk Word/Excel lama.
    daftar_risiko: daftarRisiko,
    analisis_risiko: analisisRisiko,
    risiko_prioritas: risikoPrioritas,
    rencana_pengendalian: rencanaPengendalian,
    realisasi_pengendalian: realisasiPengendalian,
    kejadian_risiko: kejadianRisikoResult.rows,

    // Metadata fallback baru.
    kejadian_risiko_meta: {
      fallback_message: kejadianRisikoResult.fallback_message,
      field_origin: kejadianRisikoResult.field_origin,
    },

    // Alias ringkas agar export R16C/R16D bisa membaca tanpa menebak.
    root_cause_analysis: generatedSections.pedoman_no_8_root_cause_analysis.rows,
    monitoring_level_risiko: generatedSections.pedoman_no_12_monitoring_level_risiko.rows,
    pengendalian_belum_terealisasi: generatedSections.pedoman_no_14_pengendalian_belum_terealisasi,
    efektivitas_pengendalian: generatedSections.pedoman_no_15_efektivitas_pengendalian.rows,
    reviu_usulan_risiko_baru: generatedSections.pedoman_no_13_reviu_usulan_risiko_baru.rows,
    risk_map: generatedSections.pedoman_no_7_peta_risiko.rows,

    // Struktur R16B lengkap dengan metadata asal field.
    generated_sections: generatedSections,
  };

  const lampiranDataQualityGate = buildReportDataQualityGate({
    context,
    contextItems,
    lampiran: lampiranPayload,
  });

  lampiranPayload.data_quality_gate = lampiranDataQualityGate;

  lampiranPayload.report_quality_gate = appendDataQualityGateToReportQualityGate(
    buildReportQualityGate({
      context,
      contextItems,
      lampiran: lampiranPayload,
      settingParameter,
    }),
    lampiranDataQualityGate,
  );

  return lampiranPayload;
};

const getFullReport = async (contextId, options = {}) => {
  const id = assertContextId(contextId);

  const anchorContext = await getContext(id);

  const reportScope = buildReportScope({
    context: anchorContext,
    scopeMode: options.scope_mode,
  });

  const context = enrichContextWithReportScope(anchorContext, reportScope);

  const flow = String(options.flow || "report").toLowerCase();
  const mode = String(options.snapshot_mode || "prefer_existing").toLowerCase();
  const snapshotMode =
    mode !== "prefer_existing"
      ? mode
      : ["export_word", "export_pdf", "correction", "addendum", "final_export"].includes(flow)
        ? "final_export"
        : "prefer_existing";

  const [contextItems, summary, lampiran, settingParameter] = await Promise.all([
    getContextItems(id, { reportScope }),
    getSummary(id, { reportScope }),
    getLampiran(id, { context, reportScope }),
    getSettingParameter(),
  ]);

  const reportDataQualityGate = buildReportDataQualityGate({
    context,
    contextItems,
    lampiran,
  });

  const reportQualityGate = appendDataQualityGateToReportQualityGate(
    buildReportQualityGate({
      context,
      contextItems,
      summary,
      lampiran,
      settingParameter,
    }),
    reportDataQualityGate,
  );

  const reportApprovalGate = buildUnifiedReportApprovalGate({
    daftarRisiko: lampiran.daftar_risiko || [],
  });

  const governanceContract = buildReportGovernanceContract({
    context,
    context_items: contextItems,
    summary: {
      ...summary,
      cakupan_laporan: reportScope.cakupan_laporan,
      tipe_periode_laporan: context.periode_type,
      periode_pelaporan: context.periode_label,
      report_scope: reportScope,
    },
    lampiran,
    data_quality_gate: reportDataQualityGate,
    report_quality_gate: reportQualityGate,
    generated_sections: lampiran.generated_sections,
  });

  assertReportReadinessForFinalFlow({
    report: {
      report_quality_gate: reportQualityGate,
      report_approval_gate: reportApprovalGate,
    },
    flow,
  });

  await ensureReportSnapshotForFlow({
    SnapshotModel: MrPlanningSnapshot,
    context,
    report: {
      context,
      summary: {
        ...summary,
        cakupan_laporan: reportScope.cakupan_laporan,
        tipe_periode_laporan: context.periode_type,
        periode_pelaporan: context.periode_label,
        report_scope: reportScope,
      },
      report_quality_gate: reportQualityGate,
      official_report_contract: governanceContract.official_report_contract,
    },
    flow,
    mode: snapshotMode,
    userId: options.user_id || null,
    sourceEndpoint: options.source_endpoint || null,
    idempotencyKey: options.idempotency_key || null,
    requestId: options.request_id || null,
  });

  return {
    context,
    context_items: contextItems,
    summary: {
      ...summary,
      cakupan_laporan: reportScope.cakupan_laporan,
      tipe_periode_laporan: context.periode_type,
      periode_pelaporan: context.periode_label,
      report_scope: reportScope,
    },
    narasi: buildNarasi({ context, summary }),
    // Gunakan lampiran display_rows (deduped) untuk konsumsi UI/export,
    // sementara raw_rows + duplicate_audit tetap tersimpan di governance contract.
    lampiran: governanceContract?.official_report_contract?.lampiran || lampiran,

    report_approval_gate: reportApprovalGate,

    // R17B-2B — metadata scope terpadu agar Excel/Word/PDF membaca cakupan yang sama.
    report_scope: reportScope,

    // R16B — metadata utama agar jelas mana input user dan mana proses sistem.
    field_origin_summary: buildGlobalFieldOriginMeta(),

    // R16B — sumber parameter resmi untuk Pedoman No 2, No 3, dan Setting Parameter.
    setting_parameter: settingParameter,

    // R17C-3C — quality gate khusus placeholder/data tidak layak final.
    data_quality_gate: reportDataQualityGate,

    // R16H-0B + R17C-3C — quality gate per Pedoman Coaching Clinic Inspektorat
    // diperkaya dengan data quality gate agar placeholder menjadi blocker final.
    report_quality_gate: reportQualityGate,

    // Non-breaking additive governance contract output
    governance_contract: governanceContract,
    official_report_contract: governanceContract.official_report_contract,
    audit_report_contract: governanceContract.audit_report_contract,
    report_governance_gate: governanceContract.report_governance_gate,

    // R16B — generated report sections dengan metadata field origin.
    generated_sections: lampiran.generated_sections,
  };
};

module.exports = {
  getContext,
  getContextItems,
  getSummary,
  getLampiran,
  getFullReport,
  buildUnifiedReportApprovalGate,
  buildReportScope,

  // R16B exports untuk kebutuhan test/debug backend.
  getDaftarRisiko,
  getAnalisisRisiko,
  getRisikoPrioritas,
  getRencanaPengendalian,
  getRealisasiPengendalian,
  getKejadianRisiko,
  getRootCauseAnalysis,
  getMonitoringLevelRisiko,
  getPengendalianBelumTerealisasi,
  getEfektivitasPengendalian,
  getReviuUsulanRisiko,
  getSettingParameter,

  // R16H-0B exports untuk kebutuhan test/debug backend quality gate.
  buildReportQualityGate,

  // R17C-2A/R17C-3C: Pedoman No 4 mapper dan placeholder/data quality guard.
  buildPedoman4Rows,
  cleanPlaceholder,
  cleanPlaceholderOrNull,
  isPlaceholderValue,
  buildReportDataQualityGate,
  appendDataQualityGateToReportQualityGate,
  getReportDataQualityGate,
  buildDataQualityWarningNotice,
  resolveSpipMethod,
};

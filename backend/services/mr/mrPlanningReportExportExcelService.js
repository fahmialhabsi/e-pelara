// backend/services/mr/mrPlanningReportExportExcelService.js

const ExcelJS = require('exceljs');
const reportQueryService = require('./mrPlanningReportQueryService');
const { buildReportFilename } = require('../../helpers/mr/mrReportFilenameHelper');

const safeText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const cleanGovernmentExcelValue = (value) => {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value.map(cleanGovernmentExcelValue);
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  const exactMap = {
    proposal_intake: 'Proposal/Usulan Risiko',
    e_pelara: 'e-Pelara',
    indikator_renstra: 'Indikator Renstra',
    objek_risiko_non_renstra: 'Objek Risiko Non-Renstra',
    tindak_lanjut_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    tindak_lanjut_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    pelaksanaan_kegiatan: 'Pelaksanaan Kegiatan',
    pertanggungjawaban_keuangan: 'Pertanggungjawaban Keuangan',
    manual_adhoc: 'Input Manual Pengelola Risiko',
    'manual/adhoc': 'Input Manual Pengelola Risiko',
    pengaduan_masyarakat: 'Pengaduan Masyarakat',
    lainnya: 'Pengaduan Masyarakat',
    likelihood: 'Kemungkinan',
    impact: 'Dampak',
    impact_area: 'Area Dampak',
    risk_appetite: 'Selera Risiko',
    risk_source: 'Sumber Risiko',
    context_type: 'Jenis Konteks Risiko',
    control_effectiveness: 'Efektivitas Pengendalian',
    control_document: 'Dokumen Pengendalian',
    control_environment: 'Lingkungan Pengendalian',
    control_activity: 'Kegiatan Pengendalian',
    general_control: 'Pengendalian Umum',
    application_control: 'Pengendalian Aplikasi',
    spip_internal_control: 'Pengendalian Intern SPIP',
    'data / sistem informasi': 'Data dan Informasi Pendukung',
    data_sistem_informasi: 'data_dan_informasi_pendukung',
    risk_status: 'Status Risiko',
    root_cause_category: 'Kategori Akar Permasalahan',
    spip_sub_element: 'Sub Unsur SPIP',
    rtp_output: 'Output Rencana Tindak Pengendalian',
    periode_type: 'Jenis Cakupan Waktu',
    'existing control': 'Pengendalian yang Ada',
    'deskripsi existing control': 'Deskripsi Pengendalian yang Ada',
    control: 'Pengendalian',
    residual: 'Residu',
    actual: 'Aktual',
    approved: 'Disetujui',
    draft: 'Draft',
    verifikasi: 'Dalam Verifikasi',
    diajukan: 'Dalam Verifikasi',
    diverifikasi: 'Dalam Verifikasi',
    ditolak: 'Ditolak',
    rejected: 'Ditolak',
    'reference parameters': 'Parameter Referensi',
    'risk matrix': 'Matriks Risiko',
  };

  if (exactMap[lower]) return exactMap[lower];

  return normalized
    .replace(/sampai dengan\s+[^.]+/gi, 'dalam cakupan laporan')
    .replace(/\bTINDAK_LANJUT_BPK\b/g, 'Tindak Lanjut Hasil Pemeriksaan BPK')
    .replace(/\bTINDAK_LANJUT_INSPEKTORAT\b/g, 'Tindak Lanjut Hasil Pengawasan Inspektorat')
    .replace(/\bPELAKSANAAN_KEGIATAN\b/g, 'Pelaksanaan Kegiatan')
    .replace(/\bPERTANGGUNGJAWABAN_KEUANGAN\b/g, 'Pertanggungjawaban Keuangan')
    .replace(/\bLAINNYA\b/g, 'Pengaduan Masyarakat');
};

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getReportDisplayStatus = (context = {}) => {
  const status = normalizeStatus(context.status_revisi);

  if (['approved', 'final', 'selesai', 'disetujui'].includes(status)) {
    return 'Disetujui';
  }

  if (['verifikasi', 'diajukan', 'diverifikasi'].includes(status)) {
    return 'Dalam Verifikasi';
  }

  if (['ditolak', 'rejected'].includes(status)) {
    return 'Ditolak';
  }

  return 'Draft';
};

const getReportApprovalGate = (report = {}) =>
  report.report_approval_gate || {
    document_status: 'draft',
    document_status_label: 'Draft - Belum Siap Ditandatangani',
    ready_to_sign: false,
    total_risiko: 0,
    approved_count: 0,
    draft_count: 0,
    verification_count: 0,
    rejected_count: 0,
    not_approved_count: 0,
    blocking_statuses: [],
    cover_note: 'Status dokumen belum dapat dipastikan karena approval gate belum tersedia.',
    closing_note:
      'Laporan ini belum siap ditandatangani karena masih terdapat data risiko yang berstatus Draft, Dalam Verifikasi, atau perlu perbaikan. Pengelola risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan untuk ditandatangani.',
    not_approved_risks: [],
  };

const getDocumentDisplayStatus = (report = {}) =>
  getReportApprovalGate(report).document_status_label || 'Draft - Belum Siap Ditandatangani';

const getRiskSourceRef = (item = {}) => {
  const metadata = item.context_item_metadata_json || item.metadata_json || {};

  return (
    metadata.nomor_temuan ||
    metadata.proposal_source_ref_id ||
    item.kode_konteks ||
    item.source_id ||
    item.ref_id ||
    '-'
  );
};

const getRiskProposalNote = (item = {}) => {
  const metadata = item.context_item_metadata_json || item.metadata_json || {};

  return (
    metadata.status_tindak_lanjut ||
    metadata.tahun_pemeriksaan ||
    metadata.target_waktu ||
    metadata.pic ||
    item.non_renstra_guard_note ||
    '-'
  );
};

const getGovernmentReportTitle = () => 'LAPORAN MANAJEMEN RISIKO TERPADU';

const getGovernmentReportSubtitle = (context = {}) => {
  const namaOpd = safeText(context.nama_opd, 'OPD');
  const tahun = safeText(context.tahun, '');

  return tahun ? `${namaOpd} Tahun ${tahun}` : namaOpd;
};

const getCoverageLabel = (context = {}) =>
  safeText(context.cakupan_laporan, 'Laporan Manajemen Risiko Terpadu');

const getPeriodTypeLabel = (context = {}) => {
  const value = String(context.tipe_periode_laporan || context.periode_type || '-')
    .trim()
    .toLowerCase();

  const map = {
    bulanan: 'Bulanan',
    bulan: 'Bulanan',
    triwulan: 'Triwulan',
    semester: 'Semester',
    semesteran: 'Semester',
    tahunan: 'Tahunan',
    tahun: 'Tahunan',
    adhoc: 'Adhoc',
    'ad-hoc': 'Adhoc',
  };

  return map[value] || safeText(context.tipe_periode_laporan || context.periode_type);
};

const getReportingPeriodLabel = (context = {}) =>
  safeText(context.periode_pelaporan || context.periode_label);

const getAnchorSourceLabel = (context = {}) => safeText(context.jenis_dokumen, 'Tidak tersedia');

const getApprovalCountText = (approvalGate = {}) =>
  `${safeText(approvalGate.approved_count, 0)} disetujui, ${safeText(
    approvalGate.not_approved_count,
    0,
  )} belum disetujui`;

const getGovernmentSummaryNarrative = ({ context = {}, summary = {} } = {}) =>
  cleanGovernmentExcelValue(
    `Laporan ini memuat ${safeText(
      summary.total_risiko,
      0,
    )} risiko dalam cakupan Laporan Manajemen Risiko Terpadu pada ${safeText(
      context.nama_opd,
    )}. Laporan disusun berdasarkan data dan dokumen pendukung yang dihimpun dalam proses Manajemen Risiko perangkat daerah.`,
  );

const getSourceDataRiskLabel = (item = {}) => {
  const rawLabel = safeText(
    item.jenis_konteks || item.sumber_data || item.source_table || item.source_system,
    '-',
  );

  if (rawLabel === 'indikator_renstra') return 'Indikator Renstra';
  if (rawLabel === 'objek_risiko_non_renstra') return 'Objek Risiko Non-Renstra';
  if (rawLabel === 'proposal_intake') return 'Proposal/Usulan Risiko';
  if (rawLabel === 'e_pelara') return 'e-Pelara';
  if (rawLabel === 'Manual/Adhoc' || rawLabel === 'manual/adhoc' || rawLabel === 'manual_adhoc')
    return 'Input Manual Pengelola Risiko';
  if (rawLabel === 'TINDAK_LANJUT_BPK') return 'Tindak Lanjut Hasil Pemeriksaan BPK';
  if (rawLabel === 'TINDAK_LANJUT_INSPEKTORAT') return 'Tindak Lanjut Hasil Pengawasan Inspektorat';
  if (rawLabel === 'PELAKSANAAN_KEGIATAN') return 'Pelaksanaan Kegiatan';
  if (rawLabel === 'PERTANGGUNGJAWABAN_KEUANGAN') return 'Pertanggungjawaban Keuangan';
  if (rawLabel === 'LAINNYA') return 'Pengaduan Masyarakat';

  return formatGovernmentSourceLabel(rawLabel);
};

const getSourceAnchorLabel = (item = {}) => {
  const rawLabel = safeText(item.proposal_source_code || item.jenis_dokumen || '-', '-');
  if (rawLabel === 'proposal_intake') return 'Proposal/Usulan Risiko';
  if (rawLabel === 'e_pelara') return 'e-Pelara';
  if (rawLabel === 'TINDAK_LANJUT_BPK') return 'Tindak Lanjut Hasil Pemeriksaan BPK';
  if (rawLabel === 'TINDAK_LANJUT_INSPEKTORAT') return 'Tindak Lanjut Hasil Pengawasan Inspektorat';
  if (rawLabel === 'PELAKSANAAN_KEGIATAN') return 'Pelaksanaan Kegiatan';
  if (rawLabel === 'PERTANGGUNGJAWABAN_KEUANGAN') return 'Pertanggungjawaban Keuangan';
  if (rawLabel === 'LAINNYA') return 'Pengaduan Masyarakat';
  return formatGovernmentSourceLabel(rawLabel);
};

const getRiskDocumentStatus = (item = {}, report = {}) => {
  if (normalizeStatus(item.status_revisi) === 'approved') {
    return 'Disetujui';
  }

  return getReportApprovalGate(report).document_status_label || 'Draft';
};

const getRiskRevisionLabel = (value) => {
  const status = normalizeStatus(value);

  if (
    status === 'approved' ||
    status === 'final' ||
    status === 'selesai' ||
    status === 'disetujui'
  ) {
    return 'Disetujui';
  }

  if (status === 'draft') {
    return 'Draft';
  }

  if (status === 'verifikasi' || status === 'diajukan' || status === 'diverifikasi') {
    return 'Dalam Verifikasi';
  }

  if (status === 'ditolak' || status === 'rejected') {
    return 'Ditolak';
  }

  return safeText(value);
};

const formatRiskStatusLabel = (value) => {
  const normalized = normalizeStatus(value);
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

  return map[normalized] || safeText(value, 'Belum Diisi');
};

const resolveSeleraRisikoLabel = (item = {}, report = {}) => {
  const candidates = [
    item.selera_risiko_label,
    item.selera_risiko,
    item.risk_appetite,
    report?.summary?.selera_risiko_label,
    report?.summary?.selera_risiko,
    report?.context?.selera_risiko,
    report?.context?.risk_appetite,
  ];

  for (const candidate of candidates) {
    const text = safeText(candidate, '').trim();
    const lower = text.toLowerCase();

    if (text && !['belum tersedia', 'belum diisi', '-'].includes(lower)) {
      return cleanGovernmentExcelValue(text);
    }
  }

  return 'Belum Ditetapkan';
};

const resolveStatusRisikoLabel = (item = {}) => {
  const candidates = [item.status_risiko_label, item.status_risiko];

  for (const candidate of candidates) {
    const text = safeText(candidate, '').trim();
    if (text && text.toLowerCase() !== 'belum tersedia') {
      return formatRiskStatusLabel(text);
    }
  }

  return 'Belum Diisi';
};

const getCakupanWaktuLabel = (context = {}) =>
  safeText(context.tahun || context.periode_label || '-', '-');

const formatGovernmentRiskLabel = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  const map = {
    approved: 'Disetujui',
    final: 'Disetujui',
    selesai: 'Disetujui',
    disetujui: 'Disetujui',
    draft: 'Draft',
    verifikasi: 'Dalam Verifikasi',
    diajukan: 'Dalam Verifikasi',
    diverifikasi: 'Dalam Verifikasi',
    ditolak: 'Ditolak',
    rejected: 'Ditolak',
  };

  return map[normalized] || safeText(value);
};

const formatGovernmentMatrixLabel = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  const map = {
    'matrix code': 'Kode Matriks',
    likelihood: 'Kemungkinan',
    'likelihood label': 'Label Kemungkinan',
    impact: 'Dampak',
    'impact label': 'Label Dampak',
    score: 'Skor',
    appetite: 'Selera Risiko',
    'appetite threshold': 'Ambang Selera Risiko',
    'existing control': 'Pengendalian yang Ada',
    'deskripsi existing control': 'Deskripsi Pengendalian yang Ada',
    control: 'Pengendalian',
    residual: 'Residu',
    actual: 'Aktual',
    'reference parameters': 'Parameter Referensi',
    'risk matrix': 'Matriks Risiko',
  };

  return map[normalized] || safeText(value);
};

const formatGovernmentSourceLabel = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  const map = {
    renstra: 'Renstra',
    indikator_renstra: 'Renstra',
    tindak_lanjut_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    temuan_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    tindak_lanjut_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    temuan_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    pelaksanaan_kegiatan: 'Pelaksanaan Kegiatan',
    pertanggungjawaban_keuangan: 'Pertanggungjawaban Keuangan',
    pengaduan_masyarakat: 'Pengaduan Masyarakat',
    laporan_keuangan: 'Laporan Keuangan',
    lakip: 'LAKIP',
    spip_e_sigap: 'SPIP/e-SIGAP',
    manual_adhoc: 'Input Manual Pengelola Risiko',
    'manual/adhoc': 'Input Manual Pengelola Risiko',
    lainnya: 'Sumber Data Lainnya',
  };

  return map[normalized] || safeText(value);
};

const getReportSourceSummary = (report = {}) => {
  const rows = [...(report.lampiran?.daftar_risiko || []), ...(report.context_items || [])];

  const values = rows
    .map(
      (item) =>
        item.jenis_konteks ||
        item.sumber_data ||
        item.proposal_source_code ||
        item.jenis_dokumen ||
        item.stage,
    )
    .filter(Boolean)
    .map(formatGovernmentSourceLabel);

  const unique = [...new Set(values)].filter(Boolean);

  return cleanGovernmentExcelValue(unique.length ? unique.join(', ') : 'Belum tersedia');
};

const getSubmoduleDisplayStatus = ({ context = {}, fallback = '-' } = {}) => {
  const reportStatus = getReportDisplayStatus(context);

  if (reportStatus === 'Disetujui') {
    return 'Termuat dalam laporan disetujui';
  }

  return fallback;
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
};

const sanitizeFilenamePart = (value, fallback = 'file') =>
  safeText(value, fallback)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildFilename = (context = {}) => {
  const tahun = safeText(context.tahun, 'tahun');
  const periodeLabel = safeText(context.periode_label, 'periode');
  const periode = sanitizeFilenamePart(periodeLabel, 'periode');
  const opd = sanitizeFilenamePart(context.nama_opd, 'OPD');

  const periodeAlreadyContainsYear = periodeLabel.includes(String(tahun));

  return periodeAlreadyContainsYear
    ? `Laporan_MR_${opd}_${periode}.xlsx`
    : `Laporan_MR_${opd}_${periode}_${tahun}.xlsx`;
};

const buildInspektoratFilename = (context = {}) => buildFilename(context);

const setColumnWidths = (worksheet, widths = []) => {
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
};

const styleTitle = (worksheet, rowNumber, lastColumn) => {
  const row = worksheet.getRow(rowNumber);
  row.font = { bold: true, size: 14 };
  row.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
};

const styleSubtitle = (worksheet, rowNumber, lastColumn) => {
  const row = worksheet.getRow(rowNumber);
  row.font = { bold: true, size: 11 };
  row.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
};

const styleHeaderRow = (row) => {
  row.font = { bold: true };
  row.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
};

const styleDataRows = (worksheet, startRow, endRow) => {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    row.alignment = {
      vertical: 'top',
      horizontal: 'left',
      wrapText: true,
    };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }
};

const addTitleBlock = ({ worksheet, title, context, lastColumn }) => {
  worksheet.addRow([title || getGovernmentReportTitle()]);
  styleTitle(worksheet, worksheet.lastRow.number, lastColumn);

  worksheet.addRow([getGovernmentReportSubtitle(context)]);
  styleSubtitle(worksheet, worksheet.lastRow.number, lastColumn);

  worksheet.addRow([]);
};

const addKeyValueRows = ({ worksheet, rows }) => {
  rows.forEach(([label, value]) => {
    worksheet.addRow([cleanGovernmentExcelValue(label), cleanGovernmentExcelValue(value)]);
  });

  worksheet.addRow([]);
};

const addTable = ({ worksheet, headers, rows, mapRow }) => {
  const headerRow = worksheet.addRow(headers.map(cleanGovernmentExcelValue));
  styleHeaderRow(headerRow);

  const startDataRow = worksheet.lastRow.number + 1;

  if (!rows.length) {
    worksheet.addRow(['Nihil / tidak ada data']);
  } else {
    rows.forEach((item, index) => {
      worksheet.addRow(mapRow(item, index).map(cleanGovernmentExcelValue));
    });
  }

  const endDataRow = worksheet.lastRow.number;
  styleDataRows(worksheet, startDataRow, endDataRow);

  worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
};

const getGeneratedSections = (report = {}) =>
  report.generated_sections || report.lampiran?.generated_sections || {};

const getSection = (report = {}, key) => getGeneratedSections(report)?.[key] || {};

const getSectionRows = (report = {}, key, fallbackRows = []) => {
  const section = getSection(report, key);

  if (Array.isArray(section.rows)) return section.rows;
  if (Array.isArray(section)) return section;

  return fallbackRows;
};

const getSectionFallbackMessage = (report = {}, key) => {
  const section = getSection(report, key);
  return section.fallback_message || null;
};

const getSettingParameter = (report = {}) =>
  report.setting_parameter || getSection(report, 'setting_parameter')?.rows || {};

const flattenReferenceParameters = (settingParameter = {}) => {
  const groups = settingParameter.reference_parameters?.groups || {};

  return Object.values(groups).flatMap((group) =>
    (group.items || []).map((item) => ({
      kode_group: group.kode_group,
      nama_group: group.nama_group,
      kode_item: item.kode_item,
      nama_item: item.nama_item,
      nilai_numeric: item.nilai_numeric,
      nilai_text: item.nilai_text,
      urutan: item.urutan,
      is_active: item.is_active,
    })),
  );
};

const flattenRiskMatrix = (settingParameter = {}) => settingParameter.risk_matrix || [];

const flattenRiskMap = (riskMap = {}) => {
  const output = [];

  ['inherent', 'residual', 'actual'].forEach((mapType) => {
    const cells = riskMap[mapType] || {};

    Object.values(cells).forEach((cell) => {
      output.push({
        map_type: mapType,
        likelihood: cell.likelihood,
        impact: cell.impact,
        total: cell.total,
        risks: (cell.risks || [])
          .map((risk) => `${risk.kode_risiko} - ${risk.nama_risiko}`)
          .join('\n'),
      });
    });
  });

  return output;
};

const getFallbackRows = (message) =>
  message
    ? [
        {
          fallback_message: message,
        },
      ]
    : [];

const formatMetaValue = (value) => {
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => safeText(item)).join(', ') : '-';
  }

  return safeText(value, '-');
};

const addSectionMetaRows = ({ worksheet, section }) => {
  worksheet.addRow([]);
  worksheet.addRow(['Keterangan Asal Data']);
  worksheet.lastRow.font = { bold: true };
  worksheet.addRow([
    'Catatan',
    'Data disusun berdasarkan dokumen sumber dan hasil pengelolaan Manajemen Risiko perangkat daerah.',
  ]);
};

const createCoverStatusSheet = ({ workbook, report }) => {
  const { context, summary } = report;
  const approvalGate = getReportApprovalGate(report);

  const worksheet = workbook.addWorksheet('Cover_Status');

  setColumnWidths(worksheet, [34, 90]);

  addTitleBlock({
    worksheet,
    title: 'STATUS DOKUMEN LAPORAN MANAJEMEN RISIKO TERPADU',
    context,
    lastColumn: 2,
  });

  addKeyValueRows({
    worksheet,
    rows: [
      ['Nama Perangkat Daerah', safeText(context.nama_opd)],
      ['Tahun Laporan', safeText(context.tahun)],
      ['Cakupan Waktu', getCakupanWaktuLabel(context)],
      ['Sumber Data', getReportSourceSummary(report)],
      ['Status Dokumen', safeText(approvalGate.document_status_label)],
      ['Siap Ditandatangani', approvalGate.ready_to_sign ? 'Ya' : 'Tidak'],
      ['Mode Export Excel', approvalGate.ready_to_sign ? 'Final-Ready' : 'Draft/Review'],
      ['Total Risiko', safeText(approvalGate.total_risiko)],
      ['Risiko Disetujui', safeText(approvalGate.approved_count)],
      ['Risiko Draft', safeText(approvalGate.draft_count)],
      ['Risiko Dalam Verifikasi', safeText(approvalGate.verification_count)],
      ['Risiko Ditolak/Perlu Perbaikan', safeText(approvalGate.rejected_count)],
      ['Risiko Belum Disetujui', safeText(approvalGate.not_approved_count)],
      [
        'Status yang Masih Memerlukan Tindak Lanjut',
        Array.isArray(approvalGate.blocking_statuses)
          ? approvalGate.blocking_statuses.map(getRiskRevisionLabel).join(', ')
          : getRiskRevisionLabel(safeText(approvalGate.blocking_statuses)),
      ],
      ['Catatan Status Dokumen', safeText(approvalGate.cover_note)],
      ['Arahan Tindak Lanjut Persetujuan', safeText(approvalGate.closing_note)],
      ['Pemilik Risiko', safeText(context.nama_pemilik_risiko, 'Belum diisi')],
      ['Jabatan Pemilik Risiko', safeText(context.jabatan_pemilik_risiko, '-')],
      ['Koordinator Risiko', safeText(context.nama_koordinator, 'Belum diisi')],
      ['Penandatangan Dokumen', safeText(context.nama_penandatangan, 'Belum diisi')],
      ['Jabatan Penandatangan', safeText(context.jabatan_penandatangan, '-')],
    ],
  });

  worksheet.addRow(['Ringkasan Narasi']);
  worksheet.lastRow.font = { bold: true };

  worksheet.addRow(['Ringkasan', getGovernmentSummaryNarrative({ context, summary })]);

  worksheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });
};

const createSummarySheet = ({ workbook, report }) => {
  const { context, summary, narasi } = report;
  const approvalGate = getReportApprovalGate(report);

  const worksheet = workbook.addWorksheet('Summary');

  setColumnWidths(worksheet, [38, 28, 70]);

  addTitleBlock({
    worksheet,
    title: 'RINGKASAN LAPORAN MANAJEMEN RISIKO TERPADU',
    context,
    lastColumn: 3,
  });

  addKeyValueRows({
    worksheet,
    rows: [
      ['Tahun Laporan', summary.tahun],
      ['Cakupan Waktu', getCakupanWaktuLabel(context)],
      ['Sumber Data', getReportSourceSummary(report)],
      ['Nama Perangkat Daerah', summary.nama_opd],
      ['Selera Risiko', summary.selera_risiko_label || summary.selera_risiko],
      ['Status', getReportDisplayStatus(context)],
      ['Status Dokumen', safeText(approvalGate.document_status_label)],
      ['Siap Ditandatangani', approvalGate.ready_to_sign ? 'Ya' : 'Tidak'],
      ['Risiko Disetujui', safeText(approvalGate.approved_count)],
      ['Risiko Belum Disetujui', safeText(approvalGate.not_approved_count)],
      ['Catatan Status Dokumen', safeText(approvalGate.cover_note)],
      ['Catatan Governance Excel', approvalGate.ready_to_sign ? 'Dokumen siap final.' : 'Dokumen ini mode draft/review dan belum boleh diklaim final.'],
    ],
  });

  if (!approvalGate.ready_to_sign) {
    worksheet.addRow([]);
    worksheet.addRow(['WARNING']);
    worksheet.lastRow.font = { bold: true, color: { argb: 'FFFF0000' } };
    worksheet.addRow([
      'Dokumen Excel ini dibuat untuk review internal. Readiness belum lolos, sehingga tidak boleh diklaim sebagai dokumen final resmi.',
    ]);
    worksheet.mergeCells(worksheet.lastRow.number, 1, worksheet.lastRow.number, 3);
    worksheet.lastRow.alignment = { wrapText: true, vertical: 'top' };
  }

  addTable({
    worksheet,
    headers: ['No', 'Uraian', 'Jumlah/Nilai'],
    rows: [
      ['Total Risiko', summary.total_risiko],
      ['Total Usulan Risiko', summary.total_usulan_risiko],
      ['Risiko di Atas Selera Risiko', summary.total_risiko_di_atas_selera],
      ['Total Analisis', summary.total_analisis],
      ['Pengendalian yang Ada Tidak Efektif', summary.total_existing_control_tidak_efektif],
      ['Pengendalian Belum Memadai', summary.total_control_belum_memadai],
      ['Total Analisis Akar Permasalahan', summary.total_root_cause],
      ['Total Kegiatan Pengendalian', summary.total_kegiatan_pengendalian],
      ['Total Monitoring', summary.total_monitoring],
      ['Total Pengendalian Terealisasi', summary.total_pengendalian_terealisasi],
      ['Rata-rata Progress', `${summary.rata_rata_progress}%`],
      ['Total Kejadian Risiko', summary.total_kejadian_risiko],
      ['Persentase Risiko di Atas Selera', `${summary.persen_risiko_di_atas_selera}%`],
      [
        'Persentase Pengendalian yang Ada Tidak Efektif',
        `${summary.persen_existing_control_tidak_efektif}%`,
      ],
      ['Persentase Pengendalian Belum Memadai', `${summary.persen_control_belum_memadai}%`],
      ['Persen Pengendalian Terealisasi', `${summary.persen_pengendalian_terealisasi}%`],
    ],
    mapRow: (item, index) => [index + 1, item[0], item[1]],
  });

  worksheet.addRow([]);
  worksheet.addRow(['Narasi Laporan']);
  worksheet.lastRow.font = { bold: true };

  worksheet.addRow(['ringkasan_umum', getGovernmentSummaryNarrative({ context, summary })]);

  Object.entries(narasi || {}).forEach(([key, value]) => {
    worksheet.addRow([key, value]);
  });

  worksheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });
};

const createDataQualityWarningSheet = ({ workbook, report }) => {
  const notice = reportQueryService.buildDataQualityWarningNotice(report);

  if (!notice) return;

  const worksheet = workbook.addWorksheet('Catatan_Data_Quality');

  worksheet.addRow(['CATATAN DATA QUALITY']);
  styleTitle(worksheet, worksheet.lastRow.number, 5);

  worksheet.addRow([]);
  worksheet.addRow(['Status', String(notice.status || 'merah').toUpperCase()]);
  worksheet.addRow(['Jumlah Placeholder', notice.placeholder_count || 0]);
  worksheet.addRow(['Jumlah Blocking Placeholder', notice.blocking_placeholder_count || 0]);
  worksheet.addRow([]);

  worksheet.addRow(['Catatan']);
  worksheet.addRow([notice.message]);
  worksheet.mergeCells(worksheet.lastRow.number, 1, worksheet.lastRow.number, 5);
  worksheet.lastRow.alignment = { wrapText: true, vertical: 'top' };

  worksheet.addRow([]);
  worksheet.addRow([
    'Keterangan',
    'Catatan ini tidak menghapus, mengganti, atau memanipulasi data sumber. Perbaikan wajib dilakukan melalui modul sumber data risiko/proposal/context item.',
  ]);
  worksheet.mergeCells(worksheet.lastRow.number, 2, worksheet.lastRow.number, 5);
  worksheet.lastRow.alignment = { wrapText: true, vertical: 'top' };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['No', 'Source', 'Field', 'Value', 'Message']);
  styleHeaderRow(headerRow);

  const issues = Array.isArray(notice.issues) ? notice.issues.slice(0, 25) : [];

  if (issues.length) {
    issues.forEach((issue, index) => {
      worksheet.addRow([
        index + 1,
        safeText(issue?.source),
        safeText(issue?.field),
        safeText(issue?.value),
        safeText(issue?.message),
      ]);
    });
  } else {
    worksheet.addRow([
      1,
      '-',
      '-',
      '-',
      'Detail issue placeholder tidak tersedia pada preview, namun data_quality_gate menunjukkan masih terdapat placeholder.',
    ]);
  }

  setColumnWidths(worksheet, [8, 42, 36, 42, 90]);

  worksheet.eachRow((row) => {
    row.alignment = {
      vertical: 'top',
      horizontal: 'left',
      wrapText: true,
    };
  });

  styleDataRows(worksheet, 3, worksheet.lastRow.number);
};

const createApprovalNoteSheet = ({ workbook, report }) => {
  const { context } = report;
  const approvalGate = getReportApprovalGate(report);
  const rows = approvalGate.not_approved_risks || [];

  const worksheet = workbook.addWorksheet('Catatan_Approval');

  setColumnWidths(worksheet, [6, 22, 45, 22, 26, 26, 18, 16, 16, 70]);

  addTitleBlock({
    worksheet,
    title: 'CATATAN PERSETUJUAN DOKUMEN',
    context,
    lastColumn: 10,
  });

  addKeyValueRows({
    worksheet,
    rows: [
      ['Status Dokumen', safeText(approvalGate.document_status_label)],
      ['Siap Ditandatangani', approvalGate.ready_to_sign ? 'Ya' : 'Tidak'],
      ['Total Risiko', safeText(approvalGate.total_risiko)],
      ['Risiko Disetujui', safeText(approvalGate.approved_count)],
      ['Risiko Draft', safeText(approvalGate.draft_count)],
      ['Risiko Dalam Verifikasi', safeText(approvalGate.verification_count)],
      ['Risiko Ditolak/Perlu Perbaikan', safeText(approvalGate.rejected_count)],
      ['Risiko Belum Disetujui', safeText(approvalGate.not_approved_count)],
      ['Arahan Tindak Lanjut Persetujuan', safeText(approvalGate.closing_note)],
    ],
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Status Revisi',
      'Sumber Data Risiko',
      'Detail Sumber Data',
      'Status Dokumen',
      'Tahapan Risiko',
      'Nomor Referensi',
      'Arahan Tindak Lanjut',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      getRiskRevisionLabel(item.status_revisi),
      getSourceDataRiskLabel(item),
      getSourceAnchorLabel(item),
      safeText(getRiskDocumentStatus(item, report)),
      safeText(item.stage),
      safeText(item.ref_id),
      approvalGate.ready_to_sign
        ? 'Risiko telah disetujui dan dapat dimuat dalam dokumen final.'
        : 'Selesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan untuk ditandatangani.',
    ],
  });
};

const createContextItemSheet = ({ workbook, report }) => {
  const { context, context_items: items = [] } = report;

  const worksheet = workbook.addWorksheet('Sumber Data Risiko');

  setColumnWidths(worksheet, [6, 15, 15, 24, 24, 20, 18, 18, 24, 20, 45, 45, 24, 18, 22, 55]);

  addTitleBlock({
    worksheet,
    title: 'SUMBER DATA RISIKO',
    context,
    lastColumn: 16,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'ID Sumber Data',
      'Tahun',
      'Sumber Data Risiko',
      'Sumber Data',
      'Tabel Sumber Data',
      'Tahapan Risiko',
      'Nomor Referensi',
      'Kode Sumber Usulan',
      'Jenis Objek Risiko',
      'Kode Keterkaitan',
      'Indikator / Objek Risiko',
      'Kode Indikator',
      'ID Indikator',
      'Nilai Terkait',
      'Keterangan',
    ],
    rows: items,
    mapRow: (item, index) => [
      index + 1,
      item.id,
      item.tahun,
      safeText(item.jenis_konteks),
      safeText(item.proposal_source_code || item.jenis_dokumen),
      safeText(item.source_table),
      safeText(item.stage),
      safeText(item.ref_id),
      safeText(item.proposal_source_code, '-'),
      safeText(item.object_source_type),
      safeText(item.kode_konteks),
      safeText(item.indikator_atau_objek_risiko || item.nama_indikator),
      safeText(item.kode_indikator),
      safeText(item.indikator_id),
      safeText(item.nilai_terkait, 'Belum tersedia'),
      item.object_source_type === 'objek_risiko_non_renstra'
        ? 'Objek risiko non-Renstra tidak diklaim sebagai indikator Renstra.'
        : '-',
    ],
  });
};

const createDaftarRisikoSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.daftar_risiko || [];

  const worksheet = workbook.addWorksheet('Register Risiko Terpadu');

  setColumnWidths(
    worksheet,
    [6, 22, 45, 26, 32, 26, 28, 26, 34, 55, 55, 18, 18, 55, 55, 12, 12, 12, 16, 16, 18, 18, 10, 60],
  );

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 1 - REGISTER RISIKO TERPADU',
    context,
    lastColumn: 24,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Sumber Data Risiko',
      'Detail Sumber Data',
      'Jenis Objek Risiko',
      'Nomor/Referensi Sumber Data',
      'Kode Konteks',
      'Status Dokumen/Risiko',
      'Uraian Risiko',
      'Indikator / Objek Risiko',
      'Kategori',
      'Sumber',
      'Penyebab Risiko',
      'Dampak Risiko',
      'Kemungkinan',
      'Dampak',
      'Skor',
      'Level',
      'Selera',
      'Status Risiko',
      'Status Revisi',
      'Versi',
      'Catatan Non-Renstra',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      getSourceDataRiskLabel(item),
      getSourceAnchorLabel(item),
      safeText(item.object_source_type),
      safeText(getRiskSourceRef(item)),
      safeText(item.kode_konteks),
      safeText(getDocumentDisplayStatus(report)),
      safeText(item.uraian_risiko),
      safeText(
        item.indikator_atau_objek_risiko || item.nama_konteks_laporan || item.nama_indikator,
      ),
      safeText(item.kategori_risiko, 'Belum diisi'),
      safeText(item.sumber_risiko, 'Belum diisi'),
      safeText(item.penyebab_risiko),
      safeText(item.dampak_risiko),
      safeNumber(item.kemungkinan),
      safeNumber(item.dampak),
      safeNumber(item.skor_risiko),
      safeText(item.level_risiko),
      resolveSeleraRisikoLabel(item, report),
      resolveStatusRisikoLabel(item),
      getRiskRevisionLabel(item.status_revisi),
      safeText(item.versi),
      safeText(item.non_renstra_guard_note || getRiskProposalNote(item)),
    ],
  });
};

const createAnalisisRisikoSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.analisis_risiko || [];

  const worksheet = workbook.addWorksheet('Lampiran 2 Analisis');

  setColumnWidths(worksheet, [6, 22, 45, 20, 55, 20, 55, 14, 16, 14, 16, 16, 16, 60, 60]);

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 2 — DAFTAR ANALISIS RISIKO',
    context,
    lastColumn: 15,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Pengendalian yang Ada',
      'Deskripsi Pengendalian yang Ada',
      'Kecukupan Pengendalian',
      'Catatan Kecukupan',
      'Skor Inheren',
      'Level Inheren',
      'Skor Residu',
      'Level Residu',
      'Selera Risiko',
      'Di Atas Selera',
      'Catatan Analisis',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      item.kode_risiko,
      item.nama_risiko,
      item.existing_control_status,
      item.existing_control_description,
      item.control_adequacy_status,
      item.control_adequacy_note,
      safeNumber(item.inherent_score),
      item.inherent_level,
      safeNumber(item.residual_score),
      item.residual_level,
      resolveSeleraRisikoLabel(item, report),
      item.is_above_appetite ? 'Ya' : 'Tidak',
      item.analysis_note,
      item.rekomendasi,
    ],
  });
};

const createRisikoPrioritasSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.risiko_prioritas || [];

  const worksheet = workbook.addWorksheet('Lampiran 3 Prioritas');

  setColumnWidths(worksheet, [6, 22, 45, 12, 16, 16, 18, 14, 16, 65]);

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 3 — DAFTAR RISIKO PRIORITAS',
    context,
    lastColumn: 10,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Skor Risiko',
      'Level Risiko',
      'Selera Risiko',
      'Di Atas Selera',
      'Skor Residu',
      'Level Residu',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      item.kode_risiko,
      item.nama_risiko,
      safeNumber(item.skor_risiko),
      item.level_risiko,
      resolveSeleraRisikoLabel(item, report),
      item.is_above_appetite ? 'Ya' : 'Tidak',
      safeNumber(item.residual_score),
      item.residual_level,
      item.rekomendasi,
    ],
  });
};

const createRencanaPengendalianSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.rencana_pengendalian || [];

  const worksheet = workbook.addWorksheet('Lampiran 4 RTP');

  setColumnWidths(worksheet, [6, 22, 45, 20, 24, 24, 20, 60, 55, 55, 40, 14, 45, 14, 16, 24]);

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 4 — RENCANA TINDAK PENGENDALIAN',
    context,
    lastColumn: 16,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Respons Risiko',
      'Unsur SPIP',
      'Sub Unsur SPIP',
      'Output RTP',
      'Kegiatan Pengendalian',
      'Target Output',
      'Indikator Keluaran',
      'Target Keluaran',
      'Satuan',
      'Penanggung Jawab',
      'Skor Setelah Mitigasi',
      'Level Setelah Mitigasi',
      'Status Dalam Laporan',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      item.kode_risiko,
      item.nama_risiko,
      item.respon_risiko,
      item.unsur_spip,
      item.sub_unsur_spip,
      item.output_rtp,
      item.kegiatan_pengendalian,
      item.target_output,
      item.indikator_keluaran,
      item.target_keluaran,
      item.satuan_keluaran,
      item.penanggung_jawab,
      safeNumber(item.risk_after_mitigation_score),
      item.risk_after_mitigation_level,
      getSubmoduleDisplayStatus({
        context,
        fallback: safeText(item.status_mitigasi),
      }),
    ],
  });
};

const createRealisasiPengendalianSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.realisasi_pengendalian || [];

  const worksheet = workbook.addWorksheet('Lampiran 5 Realisasi');

  setColumnWidths(
    worksheet,
    [6, 22, 45, 20, 18, 60, 60, 55, 14, 14, 24, 14, 16, 18, 18, 18, 55, 55, 55],
  );

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 5 — REALISASI / PEMANTAUAN PENGENDALIAN',
    context,
    lastColumn: 19,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Periode Monitoring',
      'Tanggal Monitoring',
      'Hasil Monitoring',
      'Realisasi Mitigasi',
      'Output Realisasi',
      'Persentase',
      'Progress',
      'Efektivitas',
      'Skor Aktual',
      'Level Aktual',
      'Perubahan Level',
      'Tren Risiko',
      'Di Atas Selera Aktual',
      'Kendala',
      'Tindak Lanjut',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      item.kode_risiko,
      item.nama_risiko,
      item.periode_label,
      formatDate(item.monitoring_date),
      item.hasil_monitoring,
      item.realisasi_mitigasi,
      item.output_realisasi,
      `${safeNumber(item.persentase_realisasi)}%`,
      `${safeNumber(item.progress_persen)}%`,
      item.efektivitas_pengendalian,
      safeNumber(item.actual_score),
      item.actual_level,
      item.level_change,
      item.risk_trend,
      item.is_above_appetite_actual ? 'Ya' : 'Tidak',
      item.kendala,
      item.tindak_lanjut,
      item.rekomendasi,
    ],
  });
};

const createKejadianRisikoSheet = ({ workbook, report }) => {
  const { context, lampiran } = report;
  const rows = lampiran?.kejadian_risiko || [];

  const worksheet = workbook.addWorksheet('Lampiran 6 Kejadian');

  setColumnWidths(worksheet, [6, 22, 45, 20, 18, 18, 35, 60, 45, 45, 55]);

  addTitleBlock({
    worksheet,
    title: 'LAMPIRAN 6 — DAFTAR KEJADIAN RISIKO',
    context,
    lastColumn: 11,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Periode Monitoring',
      'Tanggal Monitoring',
      'Terjadi Risiko',
      'Tanggal Kejadian',
      'Tempat Kejadian',
      'Uraian Kejadian',
      'Pemicu Kejadian',
      'Tindak Lanjut Kejadian',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      item.kode_risiko,
      item.nama_risiko,
      item.periode_label,
      formatDate(item.monitoring_date),
      item.terjadi_risiko ? 'Ya' : 'Tidak',
      formatDate(item.tanggal_kejadian),
      item.tempat_kejadian,
      item.uraian_kejadian,
      item.pemicu_kejadian,
      item.tindak_lanjut_kejadian,
    ],
  });
};

const addSectionTitle = ({ worksheet, title, lastColumn }) => {
  worksheet.addRow([title]);
  const rowNumber = worksheet.lastRow.number;
  styleTitle(worksheet, rowNumber, lastColumn);
  worksheet.addRow([]);
};

const createPedomanNo1Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_1_penetapan_konteks');
  const items = section.rows?.context_items || report.context_items || [];

  const worksheet = workbook.addWorksheet('Pedoman No 1');

  setColumnWidths(worksheet, [8, 20, 22, 24, 30, 35, 35, 22, 18, 18]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 1 — PENETAPAN KONTEKS MANAJEMEN RISIKO',
    context,
    lastColumn: 10,
  });

  addKeyValueRows({
    worksheet,
    rows: [
      ['Nama OPD', safeText(context.nama_opd)],
      ['Tahun', safeText(context.tahun)],
      ['Tahun Laporan', safeText(context.tahun)],
      ['Cakupan Waktu', getCakupanWaktuLabel(context)],
      ['Sumber Data', getReportSourceSummary(report)],
      ['Selera Risiko', safeText(context.selera_risiko)],
      ['Status Laporan', getReportDisplayStatus(context)],
      ['Pemilik Risiko', safeText(context.nama_pemilik_risiko, 'Belum diisi')],
      ['Koordinator', safeText(context.nama_koordinator, 'Belum diisi')],
    ],
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Sumber Data Risiko',
      'Sumber Data',
      'Tabel Data',
      'Nama Konteks',
      'Indikator / Objek Risiko',
      'Nomor Indikator',
      'Tahapan Risiko',
      'Nomor Referensi',
      'Nilai Terkait',
    ],
    rows: items,
    mapRow: (item, index) => [
      index + 1,
      getSourceDataRiskLabel(item),
      safeText(item.source_system),
      safeText(item.source_table),
      safeText(item.nama_konteks_laporan || item.nama_konteks),
      safeText(item.indikator_atau_objek_risiko || item.nama_indikator),
      safeText(item.kode_indikator),
      safeText(item.stage),
      safeText(item.ref_id),
      safeText(item.nilai_terkait, 'Belum tersedia'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo2Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_2_kriteria_kemungkinan_dampak');
  const settingParameter = getSettingParameter(report);

  const rows = flattenReferenceParameters(settingParameter).filter((item) =>
    ['LIKELIHOOD', 'IMPACT', 'IMPACT_AREA'].includes(item.kode_group),
  );

  const worksheet = workbook.addWorksheet('Pedoman No 2');

  setColumnWidths(worksheet, [8, 22, 30, 18, 35, 18, 22, 12]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 2 — KRITERIA KEMUNGKINAN DAN DAMPAK',
    context,
    lastColumn: 8,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Group',
      'Nama Group',
      'Kode Item',
      'Nama Item',
      'Nilai Numeric',
      'Nilai Text',
      'Aktif',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_group),
      safeText(item.nama_group),
      safeText(item.kode_item),
      safeText(item.nama_item),
      safeText(item.nilai_numeric),
      safeText(item.nilai_text),
      item.is_active ? 'Ya' : 'Tidak',
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo3Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_3_matriks_analisis_risiko');
  const settingParameter = getSettingParameter(report);
  const rows = flattenRiskMatrix(settingParameter);

  const worksheet = workbook.addWorksheet('Pedoman No 3');

  setColumnWidths(worksheet, [8, 22, 18, 24, 18, 24, 14, 18, 20, 18, 18]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 3 — MATRIKS ANALISIS RISIKO',
    context,
    lastColumn: 11,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Matriks',
      'Kemungkinan',
      'Label Kemungkinan',
      'Dampak',
      'Label Dampak',
      'Skor',
      'Level Risiko',
      'Warna Risiko',
      'Ambang Selera Risiko',
      'Di Atas Selera Risiko',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.matrix_code),
      safeText(item.likelihood_value),
      safeText(item.likelihood_label),
      safeText(item.impact_value),
      safeText(item.impact_label),
      safeText(item.score),
      safeText(item.level_risiko),
      safeText(item.warna_risiko),
      safeText(item.appetite_threshold),
      item.is_above_appetite ? 'Ya' : 'Tidak',
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo4Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_4_identifikasi_risiko');
  const rows = getSectionRows(
    report,
    'pedoman_no_4_identifikasi_risiko',
    report.lampiran?.daftar_risiko || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 4');

  setColumnWidths(worksheet, [8, 20, 24, 26, 35, 35, 24, 22, 45, 30, 22, 30]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 4 — IDENTIFIKASI RISIKO',
    context,
    lastColumn: 12,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Sumber Data Risiko',
      'Sumber Data',
      'Sumber Data',
      'Nama Konteks',
      'Indikator / Objek Risiko',
      'Kode Risiko',
      'Kategori Risiko',
      'Pernyataan Risiko',
      'Uraian Dampak',
      'Nilai Terkait',
      'Catatan Non-Renstra',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      getSourceDataRiskLabel(item),
      getSourceAnchorLabel(item),
      safeText(item.source_system),
      safeText(item.nama_konteks_laporan || item.nama_konteks),
      safeText(item.indikator_atau_objek_risiko || item.nama_indikator),
      safeText(item.kode_risiko),
      safeText(item.kategori_risiko, 'Belum diisi'),
      safeText(item.nama_risiko || item.uraian_risiko),
      safeText(item.dampak_risiko),
      safeText(item.anggaran_terkait, 'Belum tersedia'),
      safeText(item.non_renstra_guard_note, '-'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo5Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_5_analisis_risiko');
  const rows = getSectionRows(
    report,
    'pedoman_no_5_analisis_risiko',
    report.lampiran?.analisis_risiko || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 5');

  setColumnWidths(worksheet, [8, 22, 45, 16, 16, 16, 16, 16, 16, 22, 45, 18, 45, 45]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 5 — ANALISIS RISIKO',
    context,
    lastColumn: 24,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Pernyataan Risiko',
      'Kemungkinan Melekat',
      'Dampak Melekat',
      'Skor Melekat',
      'Level Melekat',
      'Kemungkinan Residu',
      'Dampak Residu',
      'Level Residu',
      'Pengendalian yang Ada',
      'Kecukupan',
      'Catatan Analisis',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.inherent_likelihood, 'Belum tersedia'),
      safeText(item.inherent_impact, 'Belum tersedia'),
      safeText(item.inherent_score),
      safeText(item.inherent_level),
      safeText(item.residual_likelihood, 'Belum tersedia'),
      safeText(item.residual_impact, 'Belum tersedia'),
      safeText(item.residual_level),
      safeText(item.existing_control_status),
      safeText(item.control_adequacy_status),
      safeText(item.analysis_note),
      safeText(item.rekomendasi, 'Belum ada rekomendasi'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo6Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_6_risiko_prioritas');
  const rows = getSectionRows(
    report,
    'pedoman_no_6_risiko_prioritas',
    report.lampiran?.risiko_prioritas || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 6');

  setColumnWidths(worksheet, [8, 22, 50, 16, 16, 18, 18, 18, 65]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 6 — DAFTAR RISIKO PRIORITAS',
    context,
    lastColumn: 9,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Pernyataan Risiko',
      'Kemungkinan',
      'Dampak',
      'Skor',
      'Level',
      'Level Residu',
      'Alasan Prioritas / Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.kemungkinan, 'Belum tersedia'),
      safeText(item.dampak, 'Belum tersedia'),
      safeText(item.skor_risiko),
      safeText(item.level_risiko),
      safeText(item.residual_level, 'Belum tersedia'),
      safeText(item.priority_reason || item.rekomendasi, 'Belum ada rekomendasi'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo7Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_7_peta_risiko');
  const riskMap = section.rows || report.lampiran?.risk_map || {};
  const rows = flattenRiskMap(riskMap);

  const worksheet = workbook.addWorksheet('Pedoman No 7');

  setColumnWidths(worksheet, [8, 18, 14, 14, 14, 80]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 7 — PETA RISIKO',
    context,
    lastColumn: 6,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Tipe Peta',
      'Kemungkinan',
      'Dampak',
      'Total Risiko',
      'Register Risiko Terpadu',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.map_type),
      safeText(item.likelihood),
      safeText(item.impact),
      safeText(item.total),
      safeText(item.risks, '-'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo8Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_8_root_cause_analysis');
  const rows = getSectionRows(
    report,
    'pedoman_no_8_root_cause_analysis',
    report.lampiran?.root_cause_analysis || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 8');

  setColumnWidths(worksheet, [8, 22, 45, 22, 45, 45, 45, 45, 45, 45, 45, 22]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 8 - ANALISIS AKAR PERMASALAHAN',
    context,
    lastColumn: 12,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Kode Penyebab',
      'Uraian Penyebab',
      'Why 1',
      'Why 2',
      'Why 3',
      'Why 4',
      'Why 5',
      'Akar Penyebab',
      'Kategori',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.kode_penyebab),
      safeText(item.uraian_penyebab),
      safeText(item.why_1),
      safeText(item.why_2),
      safeText(item.why_3),
      safeText(item.why_4, 'Belum tersedia'),
      safeText(item.why_5, 'Belum tersedia'),
      safeText(item.akar_penyebab),
      safeText(item.kategori_penyebab),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo9Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_9_rencana_tindak_pengendalian');
  const rows = getSectionRows(
    report,
    'pedoman_no_9_rencana_tindak_pengendalian',
    report.lampiran?.rencana_pengendalian || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 9');

  setColumnWidths(worksheet, [8, 22, 45, 22, 24, 24, 24, 60, 55, 45, 18, 18]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 9 — RENCANA TINDAK PENGENDALIAN',
    context,
    lastColumn: 12,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Respons Risiko',
      'Unsur SPIP',
      'Sub Unsur SPIP',
      'Output RTP',
      'Kegiatan Pengendalian',
      'Target Output',
      'Penanggung Jawab',
      'Skor Setelah Mitigasi',
      'Level Setelah Mitigasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.respon_risiko),
      safeText(item.unsur_spip),
      safeText(item.sub_unsur_spip),
      safeText(item.output_rtp),
      safeText(item.kegiatan_pengendalian),
      safeText(item.target_output),
      safeText(item.penanggung_jawab),
      safeText(item.risk_after_mitigation_score),
      safeText(item.risk_after_mitigation_level),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo10Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_10_pemantauan_kegiatan_pengendalian');
  const rows = getSectionRows(
    report,
    'pedoman_no_10_pemantauan_kegiatan_pengendalian',
    report.lampiran?.realisasi_pengendalian || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 10');

  setColumnWidths(worksheet, [8, 22, 45, 18, 60, 60, 16, 16, 45, 45, 45]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 10 — PEMANTAUAN KEGIATAN PENGENDALIAN',
    context,
    lastColumn: 11,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Tanggal Monitoring',
      'Hasil Monitoring',
      'Realisasi Mitigasi',
      'Progress',
      'Efektivitas',
      'Kendala',
      'Tindak Lanjut',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      formatDate(item.monitoring_date),
      safeText(item.hasil_monitoring),
      safeText(item.realisasi_mitigasi),
      `${safeNumber(item.progress_persen)}%`,
      safeText(item.efektivitas_pengendalian, 'Belum dapat dinilai.'),
      safeText(item.kendala),
      safeText(item.tindak_lanjut),
      safeText(item.rekomendasi),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo11Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_11_pemantauan_peristiwa_risiko');
  const fallbackMessage =
    getSectionFallbackMessage(report, 'pedoman_no_11_pemantauan_peristiwa_risiko') ||
    report.lampiran?.kejadian_risiko_meta?.fallback_message;

  const rows = getSectionRows(
    report,
    'pedoman_no_11_pemantauan_peristiwa_risiko',
    report.lampiran?.kejadian_risiko || [],
  );

  const displayRows = rows.length ? rows : getFallbackRows(fallbackMessage);

  const worksheet = workbook.addWorksheet('Pedoman No 11');

  setColumnWidths(worksheet, [8, 22, 45, 18, 22, 35, 60, 45]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 11 — PEMANTAUAN PERISTIWA RISIKO',
    context,
    lastColumn: 8,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Tanggal Kejadian',
      'Tempat Kejadian',
      'Pemicu',
      'Uraian / Keterangan Pengganti',
      'Tindak Lanjut',
    ],
    rows: displayRows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko, '-'),
      safeText(item.nama_risiko, '-'),
      formatDate(item.tanggal_kejadian),
      safeText(item.tempat_kejadian, '-'),
      safeText(item.pemicu_kejadian, '-'),
      safeText(item.uraian_kejadian || item.fallback_message),
      safeText(item.tindak_lanjut_kejadian, '-'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo12Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_12_monitoring_level_risiko');
  const rows = getSectionRows(
    report,
    'pedoman_no_12_monitoring_level_risiko',
    report.lampiran?.monitoring_level_risiko || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 12');

  setColumnWidths(worksheet, [8, 22, 45, 16, 16, 16, 18, 16, 16, 16, 18, 18, 45]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 12 — MONITORING LEVEL RISIKO',
    context,
    lastColumn: 13,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Rencana Kemungkinan',
      'Rencana Dampak',
      'Rencana Nilai',
      'Rencana Level',
      'Aktual Kemungkinan',
      'Aktual Dampak',
      'Aktual Nilai',
      'Aktual Level',
      'Tren',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.risiko_direspons_kemungkinan),
      safeText(item.risiko_direspons_dampak),
      safeText(item.risiko_direspons_nilai),
      safeText(item.risiko_direspons_level),
      safeText(item.actual_likelihood, 'Belum tersedia'),
      safeText(item.actual_impact, 'Belum tersedia'),
      safeText(item.actual_score),
      safeText(item.actual_level),
      safeText(item.risk_trend),
      safeText(item.rekomendasi),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo13Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_13_reviu_usulan_risiko_baru');
  const rows = getSectionRows(
    report,
    'pedoman_no_13_reviu_usulan_risiko_baru',
    report.lampiran?.reviu_usulan_risiko_baru || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 13');

  setColumnWidths(worksheet, [8, 22, 55, 18, 18, 18, 22, 22, 30]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 13 — REVIU USULAN RISIKO BARU',
    context,
    lastColumn: 9,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Usulan Pernyataan Risiko',
      'Status Risiko',
      'Status Revisi',
      'Status Reviu',
      'Keputusan',
      'Reviewer',
      'Alasan Jika Ditolak',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.usulan_pernyataan_risiko),
      safeText(item.status_risiko),
      safeText(item.status_revisi),
      safeText(item.status_reviu),
      safeText(item.keputusan_reviu),
      safeText(item.reviewer, 'Belum tersedia'),
      safeText(item.alasan_jika_ditolak, 'Belum tersedia'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo14Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_14_pengendalian_belum_terealisasi');
  const fallbackMessage = getSectionFallbackMessage(
    report,
    'pedoman_no_14_pengendalian_belum_terealisasi',
  );
  const rows = section.rows || report.lampiran?.pengendalian_belum_terealisasi?.rows || [];
  const displayRows = rows.length ? rows : getFallbackRows(fallbackMessage);

  const worksheet = workbook.addWorksheet('Pedoman No 14');

  setColumnWidths(worksheet, [8, 22, 45, 18, 18, 45, 45, 45]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 14 — RENCANA PENGENDALIAN BELUM TEREALISASI',
    context,
    lastColumn: 8,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Tanggal Monitoring',
      'Progress',
      'Kendala / Keterangan Pengganti',
      'Tindak Lanjut',
      'Rekomendasi',
    ],
    rows: displayRows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko, '-'),
      safeText(item.nama_risiko, '-'),
      formatDate(item.monitoring_date),
      item.progress_persen === undefined ? '-' : `${safeNumber(item.progress_persen)}%`,
      safeText(item.kendala || item.fallback_message),
      safeText(item.tindak_lanjut, '-'),
      safeText(item.rekomendasi, '-'),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createPedomanNo15Sheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'pedoman_no_15_efektivitas_pengendalian');
  const rows = getSectionRows(
    report,
    'pedoman_no_15_efektivitas_pengendalian',
    report.lampiran?.efektivitas_pengendalian || [],
  );

  const worksheet = workbook.addWorksheet('Pedoman No 15');

  setColumnWidths(worksheet, [8, 22, 45, 16, 18, 16, 18, 24, 18, 18, 50]);

  addTitleBlock({
    worksheet,
    title: 'PEDOMAN NO 15 — EFEKTIVITAS PENGENDALIAN',
    context,
    lastColumn: 11,
  });

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Risiko',
      'Nama Risiko',
      'Skor Respon Risiko',
      'Level Respon Risiko',
      'Skor Aktual',
      'Level Aktual',
      'Kecukupan Pengendalian',
      'Perubahan Level',
      'Tren Risiko',
      'Rekomendasi',
    ],
    rows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_risiko),
      safeText(item.nama_risiko),
      safeText(item.risiko_direspons_score),
      safeText(item.risiko_direspons_level),
      safeText(item.actual_score),
      safeText(item.actual_level),
      safeText(item.efektivitas_pengendalian, 'Belum dapat dinilai.'),
      safeText(item.level_change),
      safeText(item.risk_trend),
      safeText(item.rekomendasi),
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createSettingParameterSheet = ({ workbook, report }) => {
  const { context } = report;
  const section = getSection(report, 'setting_parameter');
  const settingParameter = getSettingParameter(report);

  const referenceRows = flattenReferenceParameters(settingParameter);
  const matrixRows = flattenRiskMatrix(settingParameter);

  const worksheet = workbook.addWorksheet('Setting Parameter');

  setColumnWidths(worksheet, [8, 24, 30, 18, 35, 18, 22, 14, 18, 18]);

  addTitleBlock({
    worksheet,
    title: 'SETTING PARAMETER MANAJEMEN RISIKO',
    context,
    lastColumn: 10,
  });

  worksheet.addRow(['A. Parameter Referensi']);
  worksheet.lastRow.font = { bold: true };

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Group',
      'Nama Group',
      'Kode Item',
      'Nama Item',
      'Nilai Angka',
      'Nilai Uraian',
      'Urutan',
      'Aktif',
      'Catatan',
    ],
    rows: referenceRows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.kode_group),
      safeText(item.nama_group),
      safeText(item.kode_item),
      safeText(item.nama_item),
      safeText(item.nilai_numeric),
      safeText(item.nilai_text),
      safeText(item.urutan),
      item.is_active ? 'Ya' : 'Tidak',
      'Sumber: mr_reference_groups + mr_reference_items',
    ],
  });

  worksheet.addRow([]);
  worksheet.addRow(['B. Matriks Risiko']);
  worksheet.lastRow.font = { bold: true };

  addTable({
    worksheet,
    headers: [
      'No',
      'Kode Matriks',
      'Kemungkinan',
      'Label Kemungkinan',
      'Dampak',
      'Label Dampak',
      'Skor',
      'Level Risiko',
      'Ambang Selera Risiko',
      'Di Atas Selera Risiko',
    ],
    rows: matrixRows,
    mapRow: (item, index) => [
      index + 1,
      safeText(item.matrix_code),
      safeText(item.likelihood_value),
      safeText(item.likelihood_label),
      safeText(item.impact_value),
      safeText(item.impact_label),
      safeText(item.score),
      safeText(item.level_risiko),
      safeText(item.appetite_threshold),
      item.is_above_appetite ? 'Ya' : 'Tidak',
    ],
  });

  addSectionMetaRows({ worksheet, section });
};

const createOfficialInspektoratSheets = ({ workbook, report }) => {
  createPedomanNo1Sheet({ workbook, report });
  createPedomanNo2Sheet({ workbook, report });
  createPedomanNo3Sheet({ workbook, report });
  createPedomanNo4Sheet({ workbook, report });
  createPedomanNo5Sheet({ workbook, report });
  createPedomanNo6Sheet({ workbook, report });
  createPedomanNo7Sheet({ workbook, report });
  createPedomanNo8Sheet({ workbook, report });
  createPedomanNo9Sheet({ workbook, report });
  createPedomanNo10Sheet({ workbook, report });
  createPedomanNo11Sheet({ workbook, report });
  createPedomanNo12Sheet({ workbook, report });
  createPedomanNo13Sheet({ workbook, report });
  createPedomanNo14Sheet({ workbook, report });
  createPedomanNo15Sheet({ workbook, report });
  createSettingParameterSheet({ workbook, report });
};

const buildExcelWorkbook = async (contextId) => {
  const report = await reportQueryService.getFullReport(contextId);

  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'e-Pelara';
  workbook.lastModifiedBy = 'e-Pelara';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  // R17B — status dokumen dan approval gate terpadu.
  createCoverStatusSheet({ workbook, report });

  // R17C-3C-D — catatan data quality untuk file review.
  createDataQualityWarningSheet({ workbook, report });

  // Sheet lama tetap dipertahankan agar export lama tidak rusak.
  createSummarySheet({ workbook, report });
  createApprovalNoteSheet({ workbook, report });
  createContextItemSheet({ workbook, report });
  createDaftarRisikoSheet({ workbook, report });
  createAnalisisRisikoSheet({ workbook, report });
  createRisikoPrioritasSheet({ workbook, report });
  createRencanaPengendalianSheet({ workbook, report });
  createRealisasiPengendalianSheet({ workbook, report });
  createKejadianRisikoSheet({ workbook, report });

  // R16C — sheet resmi berbasis generated_sections.
  createOfficialInspektoratSheets({ workbook, report });

  return {
    workbook,
    filename: buildReportFilename(report, 'xlsx'),
    report,
  };
};

const buildExcelWorkbookInspektorat = async (contextId) => {
  // R16C:
  // Endpoint lama export-excel-inspektorat dipertahankan untuk backward compatibility.
  // Namun hasilnya tetap satu file Laporan MR final, bukan workbook terpisah.
  return buildExcelWorkbook(contextId);
};

module.exports = {
  buildExcelWorkbook,
  buildExcelWorkbookInspektorat,
};

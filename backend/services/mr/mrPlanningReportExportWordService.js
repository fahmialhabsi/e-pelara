// backend/services/mr/mrPlanningReportExportWordService.js

const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const reportQueryService = require('./mrPlanningReportQueryService');
const { buildReportFilename } = require('../../helpers/mr/mrReportFilenameHelper');

const safeText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const safeFilledText = (value, fallback = 'Belum Diisi') =>
  cleanGovernmentWordValue(safeText(value, fallback));

const safeRecommendationText = (value) => safeText(value, 'Belum ada rekomendasi');

const safeReportText = (value, fallback = 'Belum Tersedia') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const cleanGovernmentWordValue = (value) => {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value.map(cleanGovernmentWordValue);
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  const exactMap = {
    proposal_intake: 'Usulan Risiko Non-Renstra',
    e_pelara: 'e-Pelara',
    indikator_renstra: 'Indikator Renstra',
    objek_risiko_non_renstra: 'Objek Risiko Non-Renstra',
    tindak_lanjut_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    tindak_lanjut_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    temuan_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    temuan_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    pelaksanaan_kegiatan: 'Pelaksanaan Kegiatan',
    pertanggungjawaban_keuangan: 'Pertanggungjawaban Keuangan',
    manual_adhoc: 'Input Manual Pengelola Risiko',
    'manual/adhoc': 'Input Manual Pengelola Risiko',
    pengaduan_masyarakat: 'Pengaduan Masyarakat',
    lainnya: 'Sumber Data Lainnya',
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
    risk_status: 'Status Risiko',
    root_cause_category: 'Kategori Akar Permasalahan',
    spip_sub_element: 'Sub Unsur SPIP',
    rtp_output: 'Output Rencana Tindak Pengendalian',
    periode_type: 'Jenis Cakupan Waktu',
    'existing control': 'Pengendalian yang Ada',
    'deskripsi existing control': 'Deskripsi Pengendalian yang Ada',
    control: 'Pengendalian',
    residual: 'Risiko Residu',
    actual: 'Aktual',
    approved: 'Disetujui',
    draft: 'Draft',
    verifikasi: 'Dalam Verifikasi',
    diajukan: 'Dalam Verifikasi',
    diverifikasi: 'Dalam Verifikasi',
    ditolak: 'Ditolak/Perlu Perbaikan',
    rejected: 'Ditolak/Perlu Perbaikan',
    'belum diisi': 'Belum Diisi',
    aktif: 'Aktif',
  };

  if (exactMap[lower]) return exactMap[lower];

  const phraseMap = {
    'tindak lanjut bpk': 'Tindak Lanjut Hasil Pemeriksaan BPK',
    'tindak lanjut inspektorat': 'Tindak Lanjut Hasil Pengawasan Inspektorat',
  };

  if (phraseMap[lower]) return phraseMap[lower];

  return normalized
    .replace(/tercatat dalam sistem/gi, 'tersedia dalam cakupan laporan')
    .replace(/sistem\s+(?:mencatat|membaca|membentuk|menghasilkan)/gi, 'data tersedia')
    .replace(/dibentuk oleh sistem/gi, 'disusun berdasarkan data')
    .replace(/otomatis oleh sistem/gi, 'otomatis berdasarkan data')
    .replace(/di sistem/gi, 'dalam laporan')
    .replace(/export/gi, 'ekspor')
    .replace(/frontend/gi, 'antarmuka pengguna')
    .replace(/backend/gi, 'laporan sumber data')
    .replace(/query/gi, 'proses pembacaan data')
    .replace(/metadata_json/gi, 'informasi dokumen')
    .replace(/source_table/gi, 'tabel sumber data')
    .replace(/source_system/gi, 'sistem sumber')
    .replace(/context_id/gi, 'identitas konteks')
    .replace(/mapping teknis/gi, 'keterangan teknis')
    .replace(/hardcode/gi, 'nilai tetap')
    .replace(/fallback/gi, 'keterangan pengganti')
    .replace(/seeder/gi, 'referensi data')
    .replace(/root cause analysis/gi, 'Analisis Akar Permasalahan')
    .replace(/Root Cause Analysis/g, 'Analisis Akar Permasalahan')
    .replace(/blocking status/gi, 'status yang masih memerlukan tindak lanjut')
    .replace(/inherent/gi, 'risiko inheren')
    .replace(/residual/gi, 'resiko residu')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â‰¤/g, '≤')
    .replace(/â‰¥/g, '≥')
    .replace(/â€¦/g, '...')
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€˜/g, "'")
    .replace(/â€™/g, "'")
    .replace(/â€ž/g, '"')
    .replace(/â€¡/g, '‡')
    .replace(/â€¢/g, '•')
    .replace(/â†’/g, '→')
    .replace(/â†”/g, '↔')
    .replace(/âˆ’/g, '−')
    .replace(/Â/g, '')
    .replace(/\bTindak Lanjut BPK\b/g, 'Tindak Lanjut Hasil Pemeriksaan BPK')
    .replace(/\bTindak Lanjut Inspektorat\b/g, 'Tindak Lanjut Hasil Pengawasan Inspektorat')
    .replace(/likelihood\/impact/gi, 'kemungkinan dan dampak');
};

const formatBusinessSourceLabel = (value) => {
  if (value === undefined || value === null) return 'Belum Tersedia';
  const normalized = String(value).trim();
  if (!normalized) return 'Belum Tersedia';
  const lower = normalized.toLowerCase();
  const sourceMap = {
    renstra: 'Renstra',
    lakip: 'LAKIP',
    laporan_keuangan: 'Laporan Keuangan',
    lk: 'Laporan Keuangan',
    temuan_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    tindak_lanjut_bpk: 'Tindak Lanjut Hasil Pemeriksaan BPK',
    'tindak lanjut bpk': 'Tindak Lanjut Hasil Pemeriksaan BPK',
    temuan_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    tindak_lanjut_inspektorat: 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    'tindak lanjut inspektorat': 'Tindak Lanjut Hasil Pengawasan Inspektorat',
    pelaksanaan_kegiatan: 'Pelaksanaan Kegiatan',
    pertanggungjawaban_keuangan: 'Pertanggungjawaban Keuangan',
    pengaduan_masyarakat: 'Pengaduan Masyarakat',
    spip: 'SPIP/e-SIGAP',
    e_sigap: 'SPIP/e-SIGAP',
    manual_adhoc: 'Input Manual Pengelola Risiko',
    'manual/adhoc': 'Input Manual Pengelola Risiko',
    lainnya: 'Sumber Data Lainnya',
    proposal_intake: 'Usulan Risiko Non-Renstra',
    indikator_renstra: 'Indikator Renstra',
    objek_risiko_non_renstra: 'Objek Risiko Non-Renstra',
    e_pelara: 'e-Pelara',
  };
  if (sourceMap[lower]) return sourceMap[lower];
  return cleanGovernmentWordValue(
    normalized
      .replace(/_/g, ' ')
      .replace(/\//g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase()),
  );
};

const formatRiskCodeForWord = (code) => {
  const text = safeText(code, 'Belum Tersedia').trim();
  return text
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatRiskCodeDisplayForWord = (code) => {
  const text = formatRiskCodeForWord(code);

  return text
    .replace(/MR-2026-TEMUAN_BPK-/g, 'MR-2026-BPK-')
    .replace(/MR-2026-TEMUAN_INSPEKTORAT-/g, 'MR-2026-INSP-')
    .replace(/MR-2026-PELAKSANAAN_KEGIATAN-/g, 'MR-2026-KEG-')
    .replace(/MR-2026-PERTANGGUNGJAWABAN_KEUANGAN-/g, 'MR-2026-KEU-')
    .replace(/MR-2026-LAINNYA-/g, 'MR-2026-LAIN-');
};

const formatApprovalStatusLabel = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  const map = {
    draft: 'Draft',
    verifikasi: 'Dalam Verifikasi',
    diajukan: 'Dalam Verifikasi',
    diverifikasi: 'Dalam Verifikasi',
    approved: 'Disetujui',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak/Perlu Perbaikan',
    rejected: 'Ditolak/Perlu Perbaikan',
  };
  return map[normalized] || cleanGovernmentWordValue(value);
};

const formatRiskStatusLabel = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  const map = {
    aktif: 'Aktif',
    active: 'Aktif',
    dipantau: 'Dipantau',
    closed: 'Selesai',
    selesai: 'Selesai',
    draft: 'Draft',
    approved: 'Disetujui',
    belum_diisi: 'Belum Diisi',
  };
  return map[normalized] || cleanGovernmentWordValue(value);
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
      return cleanGovernmentWordValue(text);
    }
  }

  return 'Belum Ditetapkan';
};

const cleanApprovalNoteForWord = (value) => {
  const text = cleanGovernmentWordValue(
    safeReportText(
      value,
      'Dokumen belum dapat dinyatakan final sampai proses verifikasi dan persetujuan diselesaikan.',
    ),
  );

  return text
    .replace(
      /Pengelola risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan\.?/gi,
      'Pemilik Risiko dan Koordinator Manajemen Risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan sebagai naskah final.',
    )
    .replace(
      /Pengelola Risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan\.?/gi,
      'Pemilik Risiko dan Koordinator Manajemen Risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan sebagai naskah final.',
    )
    .replace(/Pengelola risiko/gi, 'Pemilik Risiko dan Koordinator Manajemen Risiko')
    .replace(/Pengelola Risiko/gi, 'Pemilik Risiko dan Koordinator Manajemen Risiko');
};

const STAGE_LABEL_MAP = {
  tujuan: 'Tujuan',
  sasaran: 'Sasaran',
  strategi: 'Strategi',
  kebijakan: 'Arah Kebijakan',
  arah_kebijakan: 'Arah Kebijakan',
  program: 'Program',
  kegiatan: 'Kegiatan',
  sub_kegiatan: 'Sub Kegiatan',
  subkegiatan: 'Sub Kegiatan',
};

const formatStage = (stage) => {
  const normalized = String(stage || '').toLowerCase();
  return STAGE_LABEL_MAP[normalized] || safeText(stage);
};

const safeCategoryText = (value) => cleanGovernmentWordValue(safeText(value, 'Belum Diisi'));

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

const REPORT_TIME_ZONE = 'Asia/Jayapura';

const formatIndonesianReportDate = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: REPORT_TIME_ZONE,
  }).format(date);
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
    ? `Laporan_MR_${opd}_${periode}.docx`
    : `Laporan_MR_${opd}_${periode}_${tahun}.docx`;
};

const spacingAfter = (after = 160) => ({
  after,
});

const PORTRAIT_PAGE = {
  size: {
    orientation: PageOrientation.PORTRAIT,
  },
  margin: {
    top: 1134,
    right: 1134,
    bottom: 1134,
    left: 1134,
  },
};

const LANDSCAPE_PAGE = {
  size: {
    orientation: PageOrientation.LANDSCAPE,
  },
  margin: {
    top: 720,
    right: 720,
    bottom: 720,
    left: 720,
  },
};

const splitLines = (value) => {
  const text = safeText(value, '');
  return text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const makeText = (text, options = {}) =>
  new TextRun({
    text: cleanGovernmentWordValue(safeText(text, '')),
    font: 'Arial',
    size: options.size || 22,
    bold: Boolean(options.bold),
    italics: Boolean(options.italics),
    underline: options.underline,
    break: options.break,
  });

const makeParagraph = (text, options = {}) =>
  new Paragraph({
    children: [
      makeText(text, {
        bold: options.bold,
        italics: options.italics,
        size: options.size || 22,
      }),
    ],
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: spacingAfter(options.after ?? 160),
  });

const makeTitle = (text) =>
  new Paragraph({
    children: [
      makeText(text, {
        bold: true,
        size: 28,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: {
      before: 120,
      after: 120,
    },
  });

const makeSubtitle = (text) =>
  new Paragraph({
    children: [
      makeText(text, {
        bold: true,
        size: 24,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: spacingAfter(180),
  });

const makeHeading1 = (text) =>
  new Paragraph({
    children: [
      makeText(text, {
        bold: true,
        size: 24,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: {
      before: 240,
      after: 120,
    },
  });

const makeHeading2 = (text) =>
  new Paragraph({
    children: [
      makeText(text, {
        bold: true,
        size: 22,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 180,
      after: 100,
    },
  });

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
};

const makeCell = (text, options = {}) => {
  const lines = splitLines(text);
  const paragraphChildren = lines.length
    ? lines.flatMap((line, index) => [
        makeText(line, {
          bold: options.bold,
          size: options.size || 16,
          break: index > 0 ? 1 : undefined,
        }),
      ])
    : [
        makeText(options.fallback || 'Belum Tersedia', {
          bold: options.bold,
          size: options.size || 16,
        }),
      ];

  return new TableCell({
    width: options.width
      ? {
          size: options.width,
          type: WidthType.PERCENTAGE,
        }
      : undefined,
    shading: options.shading
      ? {
          fill: options.shading,
        }
      : undefined,
    borders: cellBorders,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    margins: {
      top: 100,
      bottom: 100,
      left: 120,
      right: 120,
    },
    children: [
      new Paragraph({
        children: paragraphChildren,
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: {
          before: 60,
          after: 60,
        },
      }),
    ],
  });
};

const makeTable = ({ headers = [], rows = [], widths = [], fontSize = 16 }) => {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((header, index) =>
      makeCell(header, {
        bold: true,
        shading: 'D9EAF7',
        alignment: AlignmentType.CENTER,
        width: widths[index],
        size: fontSize,
      }),
    ),
  });

  const dataRows = rows.length
    ? rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, index) =>
              makeCell(cell, {
                width: widths[index],
                size: fontSize,
              }),
            ),
          }),
      )
    : [
        new TableRow({
          children: [
            makeCell('Nihil / belum tersedia dalam cakupan laporan', {
              width: 100,
              italics: true,
              size: fontSize,
            }),
          ],
        }),
      ];

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
};

const makeKeyValueTable = (rows = []) =>
  makeTable({
    headers: ['Uraian', 'Nilai'],
    widths: [35, 65],
    rows: rows.map(([label, value]) => [label, value]),
  });

const makeSpacer = () =>
  new Paragraph({
    children: [makeText('')],
    spacing: spacingAfter(120),
  });

const makeSmallNote = (text) =>
  new Paragraph({
    children: [
      makeText(text, {
        italics: true,
        size: 18,
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      before: 80,
      after: 120,
    },
  });

const makeLampiranIntro = (text) => [
  makeSmallNote(
    text || 'Lampiran ini disajikan dalam format ringkas agar lebih mudah dibaca dan layak cetak.',
  ),
];

const buildDataQualityWarningSection = (report = {}) => {
  const notice = reportQueryService.buildDataQualityWarningNotice(report);

  if (!notice) return [];

  const issueParagraphs = Array.isArray(notice.issues)
    ? notice.issues.slice(0, 10).map((issue, index) => {
        const source = safeText(issue?.source);
        const field = safeText(issue?.field);
        const value = safeText(issue?.value);

        return makeParagraph(`${index + 1}. ${source} → ${field}: ${value}`, {
          size: 18,
          after: 80,
        });
      })
    : [];

  return [
    makeHeading1(notice.title),
    makeParagraph(notice.message, {
      bold: true,
      after: 120,
    }),
    makeKeyValueTable([
      ['Status Data Quality', String(notice.status || 'merah').toUpperCase()],
      ['Jumlah Placeholder', safeText(notice.placeholder_count, 0)],
      ['Jumlah Blocking Placeholder', safeText(notice.blocking_placeholder_count, 0)],
      [
        'Keterangan',
        'Catatan ini tidak menghapus, mengganti, atau memanipulasi data sumber. Perbaikan wajib dilakukan melalui modul sumber data risiko/proposal/context item.',
      ],
    ]),
    makeSpacer(),
    makeHeading2('Daftar Issue Placeholder'),
    ...(issueParagraphs.length
      ? issueParagraphs
      : [
          makeParagraph(
            'Detail issue placeholder tidak tersedia pada preview, namun data_quality_gate menunjukkan masih terdapat placeholder.',
          ),
        ]),
    makeSpacer(),
  ];
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

const getReferenceGroup = (report = {}, groupCode) => {
  const settingParameter = getSettingParameter(report);
  return settingParameter.reference_parameters?.groups?.[groupCode] || null;
};

const getRiskMatrixRows = (report = {}) => {
  const settingParameter = getSettingParameter(report);
  return Array.isArray(settingParameter.risk_matrix) ? settingParameter.risk_matrix : [];
};

const countRows = (value) => (Array.isArray(value) ? value.length : 0);

const countRiskMapTotal = (riskMap = {}, mapType = 'inherent') => {
  const cells = riskMap?.[mapType] || {};

  return Object.values(cells).reduce((total, cell) => total + safeNumber(cell?.total), 0);
};

const getUniqueContextSources = (contextItems = []) => {
  const sources = contextItems
    .map((item) => safeText(item.jenis_konteks || item.source_table, ''))
    .filter(Boolean);

  return [...new Set(sources)];
};

const getGovernmentReportTitle = () => 'LAPORAN MANAJEMEN RISIKO TERPADU';

const getGovernmentReportSubtitle = (context = {}) =>
  safeText(context.nama_opd, 'OPD').toUpperCase();

const getCoverageLabel = (context = {}) =>
  cleanGovernmentWordValue(safeText(context.cakupan_laporan, 'Laporan Manajemen Risiko Terpadu'));

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

const getIntegratedReportCoverageTimeLabel = (context = {}) => {
  return `Tahun ${safeReportText(context.tahun)}`;
};

const getReportingPeriodLabel = (context = {}) =>
  safeText(context.periode_pelaporan || context.periode_label);

const getAnchorSourceLabel = (context = {}) => safeText(context.jenis_dokumen, 'Tidak tersedia');

const getReportApprovalGate = (report = {}) =>
  report.report_approval_gate || {
    document_status_label: 'DRAFT — BELUM SIAP DITANDATANGANI',
    ready_to_sign: false,
    total_risiko: 0,
    approved_count: 0,
    not_approved_count: 0,
    closing_note:
      'Dokumen belum dapat dinyatakan final sampai proses verifikasi dan persetujuan diselesaikan.',
  };

const getGovernmentSummaryText = ({ context = {}, summary = {} } = {}) =>
  `Berdasarkan data dan dokumen pendukung yang dihimpun dalam proses Manajemen Risiko, jumlah risiko dalam cakupan Laporan Manajemen Risiko Terpadu pada ${safeText(
    context.nama_opd,
    'perangkat daerah',
  )} sebanyak ${safeText(
    summary.total_risiko,
    0,
  )} risiko. Informasi cakupan laporan disajikan sebagai keterangan resmi laporan terpadu.`;

const getDocumentStatusNote = (report = {}) => {
  const approvalGate = getReportApprovalGate(report);

  if (approvalGate.ready_to_sign) {
    return 'Seluruh data risiko dalam laporan ini telah melalui proses persetujuan dan dokumen FINAL — SIAP DITANDATANGANI untuk diajukan kepada Kepala Dinas.';
  }

  return (
    'Dokumen ini masih berstatus DRAFT — BELUM SIAP DITANDATANGANI karena masih terdapat risiko yang belum melalui proses persetujuan. ' +
    'Pemilik Risiko dan Koordinator Manajemen Risiko perlu menyelesaikan proses verifikasi dan persetujuan sebelum dokumen diajukan sebagai naskah final.'
  );
};

const getSigningOfficialName = (context = {}) =>
  safeText(context.nama_penandatangan || context.nama_pemilik_risiko, 'Nama Pejabat');

const getSigningOfficialNip = (context = {}) =>
  safeText(context.nip_penandatangan || context.nip_pemilik_risiko, '........................');

const getSigningOfficialTitle = (context = {}) =>
  safeText(context.jabatan_penandatangan || context.jabatan_pemilik_risiko, 'Kepala Dinas');

const buildContextScopeText = ({ context, contextItems = [] }) => {
  const namaOpd = safeText(context?.nama_opd, 'perangkat daerah');
  const sources = getUniqueContextSources(contextItems).map(formatBusinessSourceLabel);
  const sourceText = sources.length
    ? sources.join(', ')
    : 'sumber data risiko yang tersedia dalam laporan';

  return (
    `Ruang lingkup laporan ini mencakup pengelolaan Manajemen Risiko Terpadu pada ${namaOpd} ` +
    `berdasarkan sumber data risiko yang tersedia dalam cakupan laporan. Sumber data risiko dapat berasal dari Renstra, LAKIP, ` +
    `Laporan Keuangan, Tindak Lanjut Hasil Pemeriksaan BPK, Tindak Lanjut Hasil Pengawasan Inspektorat, ` +
    `Pelaksanaan Kegiatan, Pertanggungjawaban Keuangan, SPIP/e-SIGAP, Input Manual Pengelola Risiko, atau sumber lain yang sah. ` +
    `Sumber data risiko yang tersedia dalam laporan ini adalah: ${sourceText}. ` +
    `Objek risiko non-Renstra tidak diklaim sebagai indikator Renstra, melainkan ditampilkan sebagai Indikator / Objek Risiko sesuai sumber datanya.`
  );
};

const countSectionRows = (report = {}, key, fallbackRows = []) =>
  countRows(getSectionRows(report, key, fallbackRows));

const getFallbackOrDefault = (message, defaultText) => message || defaultText;

const getRiskMapSummary = (report = {}) => {
  const riskMap =
    getSection(report, 'pedoman_no_7_peta_risiko')?.rows || report.lampiran?.risk_map || {};

  const inherentTotal = countRiskMapTotal(riskMap, 'inherent');
  const residualTotal = countRiskMapTotal(riskMap, 'residual');
  const actualTotal = countRiskMapTotal(riskMap, 'actual');

  return {
    inherentTotal,
    residualTotal,
    actualTotal,
    text:
      `Peta risiko telah disusun berdasarkan nilai kemungkinan dan dampak yang tersedia dalam cakupan laporan. ` +
      `Jumlah penempatan risiko pada peta risiko inheren sebanyak ${inherentTotal} entri, ` +
      `peta risiko residu sebanyak ${residualTotal} entri, dan peta risiko aktual sebanyak ${actualTotal} entri. ` +
      `Apabila data kemungkinan dan dampak untuk risiko residu atau aktual belum tersedia, posisi risiko tidak ditetapkan secara spekulatif.`,
  };
};

const getSettingParameterSummary = (report = {}) => {
  const likelihood = getReferenceGroup(report, 'LIKELIHOOD');
  const impact = getReferenceGroup(report, 'IMPACT');
  const riskLevel = getReferenceGroup(report, 'RISK_LEVEL');
  const riskMatrixRows = getRiskMatrixRows(report);

  const likelihoodCount = countRows(likelihood?.items);
  const impactCount = countRows(impact?.items);
  const riskLevelCount = countRows(riskLevel?.items);
  const matrixCount = countRows(riskMatrixRows);

  return {
    likelihoodCount,
    impactCount,
    riskLevelCount,
    matrixCount,
    text:
      `Laporan ini menggunakan Setting Parameter yang bersumber dari tabel referensi dan matriks risiko resmi. ` +
      `Parameter kemungkinan yang tersedia sebanyak ${likelihoodCount} item, parameter dampak sebanyak ${impactCount} item, ` +
      `level risiko sebanyak ${riskLevelCount} item, dan matriks risiko sebanyak ${matrixCount} baris. ` +
      `Apabila terdapat parameter yang belum tersedia atau memerlukan penyesuaian, pembaruan dilakukan melalui pengelolaan referensi data Manajemen Risiko agar konsisten dengan ketentuan yang berlaku.`,
  };
};

// â”€â”€â”€ R17C-2B: Tabel Kriteria Kemungkinan & Dampak (Pedoman No 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const buildKriteriaKemungkinanTable = (report = {}) => {
  const likelihood = getReferenceGroup(report, 'LIKELIHOOD');
  const items = Array.isArray(likelihood?.items) ? likelihood.items : [];

  if (!items.length) {
    return [makeParagraph('Data kriteria kemungkinan belum tersedia dalam Setting Parameter.')];
  }

  return [
    makeTable({
      headers: [
        'Level',
        'Label',
        'Persentase dalam 1 Tahun',
        'Frekuensi dalam 1 Tahun',
        'Nilai Numerik',
      ],
      widths: [10, 30, 26, 20, 14],
      fontSize: 12,
      rows: items.map((item) => {
        const nilaiText = item.nilai_text || '';
        // Pisahkan persen dan frekuensi dari nilai_text jika dipisah "|"
        const parts = nilaiText.split('|').map((s) => s.trim());
        const persenLabel = parts[0] || safeFilledText(item.nilai_text, 'Belum Tersedia');
        const frekuensiLabel = parts[1] || 'Lihat kriteria teknis';
        return [
          safeText(item.nilai_numeric ?? item.urutan, '-'),
          safeFilledText(item.nama_item),
          persenLabel,
          frekuensiLabel,
          safeText(item.nilai_numeric, '-'),
        ];
      }),
    }),
  ];
};

const IMPACT_AREA_CRITERIA = [
  {
    area: 'Beban Keuangan Negara',
    l1: '≤ 0,01% dari total anggaran non belanja pegawai',
    l2: '> 0,01% – 0,1% dari total anggaran',
    l3: '> 0,1% – 1% dari total anggaran',
    l4: '> 1% – 5% dari total anggaran',
    l5: '> 5% dari total anggaran',
  },
  {
    area: 'Penurunan Reputasi',
    l1: 'Keluhan pemangku kepentingan ≤ 10',
    l2: 'Keluhan 10 s.d. 20',
    l3: 'Keluhan > 20 / pemberitaan negatif media lokal',
    l4: 'Pemberitaan negatif media massa nasional / sosial sesuai fakta',
    l5: 'Pemberitaan negatif trending nasional/internasional',
  },
  {
    area: 'Kesehatan dan Keselamatan Kerja',
    l1: 'Tidak berbahaya',
    l2: 'Gangguan fisik ringan (mampu bekerja hari yang sama)',
    l3: 'Gangguan sedang (tidak mampu tugas > 1 hari s.d. 3 minggu)',
    l4: 'Gangguan berat / cacat tetap / gangguan jiwa permanen',
    l5: 'Kejadian fatal / kematian',
  },
  {
    area: 'Realisasi Capaian Kinerja',
    l1: 'Capaian IKU > 97%',
    l2: 'Capaian IKU 92% – 97%',
    l3: 'Capaian IKU 87% – 92%',
    l4: 'Capaian IKU 80% – 87%',
    l5: 'Capaian IKU 70% – 80%',
  },
  {
    area: 'Temuan BPK / Inspektorat',
    l1: 'Tidak ada temuan pengembalian / penyimpangan material',
    l2: 'Temuan / penyimpangan s.d. 0,1% dari total anggaran',
    l3: 'Temuan / penyimpangan > 0,1% – 1% dari total anggaran',
    l4: 'Temuan / penyimpangan > 1% – 5% dari total anggaran',
    l5: 'Temuan / penyimpangan > 5% dari total anggaran',
  },
];

const buildKriteriaDampakTable = () => [
  makeTable({
    headers: [
      'No',
      'Area Dampak',
      'Tidak Signifikan (1)',
      'Minor (2)',
      'Moderat (3)',
      'Signifikan (4)',
      'Sangat Signifikan (5)',
    ],
    widths: [6, 18, 15, 15, 15, 15, 16],
    fontSize: 11,
    rows: IMPACT_AREA_CRITERIA.map((row, i) => [
      i + 1,
      row.area,
      row.l1,
      row.l2,
      row.l3,
      row.l4,
      row.l5,
    ]),
  }),
];
// â”€â”€â”€ end R17C-2B â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ R17C-2C: Matriks 5Ã—5 tabel & Peta Risiko grid (Pedoman No 3 & No 7) â”€â”€â”€
const LEVEL_COLOR_MAP = {
  'sangat tinggi': 'ST',
  'very high': 'ST',
  ekstrem: 'ST',
  extreme: 'ST',
  tinggi: 'T',
  high: 'T',
  sedang: 'S',
  medium: 'S',
  rendah: 'R',
  low: 'R',
  'sangat rendah': 'SR',
  'very low': 'SR',
};

const resolveMatrixLevelLabel = (row = {}) => {
  const raw = String(row.level_risiko || row.risk_level || row.level_name || row.level_code || '')
    .toLowerCase()
    .trim();
  return LEVEL_COLOR_MAP[raw] || safeText(row.level_risiko || row.risk_level, '-');
};

/**
 * Susun matriks 5Ã—5 sebagai tabel Word.
 * Baris = tingkat frekuensi (5â†’1), Kolom = tingkat dampak (1â†’5).
 * Setiap sel menampilkan skor + kode level.
 */
const buildMatriks5x5Table = (report = {}) => {
  const matrixRows = getRiskMatrixRows(report);

  if (!matrixRows.length) {
    return [makeParagraph('Data matriks risiko belum tersedia dalam Setting Parameter.')];
  }

  // Index: key = "likelihood_dampak"
  const cellMap = {};
  matrixRows.forEach((row) => {
    const lk = Number(row.likelihood || row.kemungkinan || row.baris || 0);
    const dp = Number(row.impact || row.dampak || row.kolom || 0);
    if (lk >= 1 && lk <= 5 && dp >= 1 && dp <= 5) {
      cellMap[`${lk}_${dp}`] = row;
    }
  });

  const likelihoodLabels = {
    5: '5 — Hampir Pasti Terjadi',
    4: '4 — Sering Terjadi',
    3: '3 — Kadang Terjadi',
    2: '2 — Jarang Terjadi',
    1: '1 — Hampir Tidak Terjadi',
  };

  const impactHeaders = [
    'Frekuensi \\ Dampak',
    '1 Tdk Signifikan',
    '2 Minor',
    '3 Moderat',
    '4 Signifikan',
    '5 Sangat Signifikan',
  ];

  const tableRows = [5, 4, 3, 2, 1].map((lk) => {
    const cells = [likelihoodLabels[lk] || `${lk}`];
    for (let dp = 1; dp <= 5; dp++) {
      const cell = cellMap[`${lk}_${dp}`];
      if (cell) {
        const skor = cell.skor || cell.score || cell.nilai || `${lk * dp}`;
        const lbl = resolveMatrixLevelLabel(cell);
        cells.push(`${skor} [${lbl}]`);
      } else {
        cells.push('-');
      }
    }
    return cells;
  });

  return [
    makeTable({
      headers: impactHeaders,
      widths: [24, 15, 15, 15, 15, 16],
      fontSize: 12,
      rows: tableRows,
    }),
    makeSmallNote(
      'Keterangan level: ST = Sangat Tinggi | T = Tinggi | S = Sedang | R = Rendah | SR = Sangat Rendah. ' +
        'Angka dalam sel adalah skor matriks 5x5 dari Setting Parameter resmi.',
    ),
  ];
};

/**
 * Susun peta risiko (inherent / residu / aktual) sebagai tabel grid 5Ã—5.
 * Setiap sel menampilkan kode risiko yang berada di koordinat tersebut.
 * Jika sel kosong â†’ ditampilkan "-".
 */
const buildPetaRisikoGrid = (riskMap = {}, mapType = 'inherent', label = 'Peta Risiko Inheren') => {
  const cells = riskMap?.[mapType] || {};
  const hasData = Object.values(cells).some((c) => c?.total > 0);

  if (!hasData) {
    return [makeParagraph(`${label}: Data belum tersedia untuk tipe peta ini.`)];
  }

  const likelihoodLabels = {
    5: '5 — Hampir Pasti',
    4: '4 — Sering',
    3: '3 — Kadang',
    2: '2 — Jarang',
    1: '1 — Tdk Terjadi',
  };

  const headers = [
    'Frek \\ Dampak',
    '1 Tdk Sig.',
    '2 Minor',
    '3 Moderat',
    '4 Signifikan',
    '5 Sgt Signifikan',
  ];

  const tableRows = [5, 4, 3, 2, 1].map((lk) => {
    const row = [likelihoodLabels[lk] || `${lk}`];
    for (let dp = 1; dp <= 5; dp++) {
      const key = `${lk}x${dp}`;
      const cell = cells[key];
      if (cell && cell.total > 0) {
        const kodes = (cell.risks || [])
          .map((r) => safeText(r.kode_risiko, `ID:${r.id}`))
          .join(', ');
        row.push(`(${cell.total}) ${kodes}`);
      } else {
        row.push('-');
      }
    }
    return row;
  });

  return [
    makeHeading2(`${label}`),
    makeTable({
      headers,
      widths: [18, 14, 14, 14, 14, 20],
      fontSize: 12,
      rows: tableRows,
    }),
  ];
};
// â”€â”€â”€ end R17C-2C â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getRootCauseSummary = (report = {}) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_8_root_cause_analysis',
    report.lampiran?.root_cause_analysis || [],
  );

  return {
    total: rows.length,
    text:
      rows.length > 0
        ? `Analisis Akar Permasalahan telah tersedia untuk ${rows.length} penyebab risiko. Informasi yang tersedia mencakup uraian penyebab, analisis mengapa, akar penyebab, dan kategori akar permasalahan.`
        : 'Analisis Akar Permasalahan belum tersedia pada cakupan laporan ini.',
  };
};

const getMonitoringLevelSummary = (report = {}) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_12_monitoring_level_risiko',
    report.lampiran?.monitoring_level_risiko || [],
  );

  const membaik = rows.filter((item) =>
    String(item.risk_trend || '')
      .toLowerCase()
      .includes('membaik'),
  ).length;

  const memburuk = rows.filter((item) =>
    String(item.risk_trend || '')
      .toLowerCase()
      .includes('memburuk'),
  ).length;

  const tetap = rows.filter((item) =>
    String(item.risk_trend || '')
      .toLowerCase()
      .includes('tetap'),
  ).length;

  return {
    total: rows.length,
    membaik,
    memburuk,
    tetap,
    text:
      rows.length > 0
        ? `Monitoring level risiko tersedia untuk ${rows.length} data monitoring. Dari data tersebut, tren membaik sebanyak ${membaik}, tren memburuk sebanyak ${memburuk}, dan tren tetap sebanyak ${tetap}.`
        : 'Monitoring level risiko belum tersedia pada cakupan laporan ini.',
  };
};

const getUnrealizedControlSummary = (report = {}) => {
  const section = getSection(report, 'pedoman_no_14_pengendalian_belum_terealisasi');
  const rows = section.rows || report.lampiran?.pengendalian_belum_terealisasi?.rows || [];

  const fallbackMessage =
    section.fallback_message || report.lampiran?.pengendalian_belum_terealisasi?.fallback_message;

  return {
    total: rows.length,
    text:
      rows.length > 0
        ? `Terdapat ${rows.length} rencana pengendalian yang belum terealisasi penuh atau masih memerlukan tindak lanjut, berdasarkan progress/status monitoring.`
        : getFallbackOrDefault(
            fallbackMessage,
            'Tidak terdapat rencana pengendalian yang belum terealisasi dalam cakupan laporan.',
          ),
  };
};

const getEffectivenessSummary = (report = {}) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_15_efektivitas_pengendalian',
    report.lampiran?.efektivitas_pengendalian || [],
  );

  const belumDinilai = rows.filter((item) =>
    String(item.efektivitas_pengendalian || '')
      .toLowerCase()
      .includes('belum'),
  ).length;

  return {
    total: rows.length,
    belumDinilai,
    text:
      rows.length > 0
        ? `Efektivitas pengendalian telah terbaca untuk ${rows.length} data monitoring. Sebanyak ${belumDinilai} data masih berstatus belum dapat dinilai atau belum memiliki data efektivitas yang memadai.`
        : 'Belum dapat dinilai.',
  };
};

const getReviewProposalSummary = (report = {}) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_13_reviu_usulan_risiko_baru',
    report.lampiran?.reviu_usulan_risiko_baru || [],
  );

  const diterima = rows.filter((item) =>
    String(item.keputusan_reviu || '')
      .toLowerCase()
      .includes('diterima'),
  ).length;

  const ditolak = rows.filter((item) =>
    String(item.keputusan_reviu || '')
      .toLowerCase()
      .includes('ditolak'),
  ).length;

  const proses = rows.length - diterima - ditolak;

  return {
    total: rows.length,
    diterima,
    ditolak,
    proses,
    text:
      rows.length > 0
        ? `Reviu usulan risiko baru terbaca sebanyak ${rows.length} usulan. Status diterima sebanyak ${diterima}, ditolak sebanyak ${ditolak}, dan masih dalam proses atau belum final sebanyak ${proses}.`
        : 'Tidak terdapat usulan risiko baru yang perlu direviu pada cakupan laporan ini.',
  };
};

const buildCoverAndIntro = ({ context, contextItems = [] }) => [
  makeTitle(getGovernmentReportTitle()),
  makeSubtitle(`${getGovernmentReportSubtitle(context)} PROVINSI MALUKU UTARA`),
  makeSubtitle(`TAHUN ${safeText(context.tahun)}`),

  makeParagraph(''),

  makeHeading1('1. Dasar Penyusunan'),
  makeParagraph(
    `Dasar penyusunan laporan ini adalah pelaksanaan pengelolaan, pemantauan, dan pelaporan Manajemen Risiko Terpadu pada perangkat daerah. Laporan ini disusun sebagai dokumentasi resmi penerapan Manajemen Risiko pada ${safeText(
      context.nama_opd,
    )} berdasarkan data dan hasil proses identifikasi, analisis, evaluasi, serta pengendalian risiko.`,
  ),

  makeHeading1('2. Maksud dan Tujuan'),
  makeParagraph(
    'Penyusunan laporan ini dimaksudkan untuk menyajikan informasi mengenai identifikasi risiko, analisis risiko, evaluasi risiko, rencana pengendalian, pemantauan tindak lanjut, serta status persetujuan dokumen dalam rangka mendukung pencapaian tujuan perangkat daerah dan penguatan akuntabilitas penyelenggaraan pemerintahan.',
  ),

  makeHeading1('3. Ruang Lingkup'),
  makeParagraph(buildContextScopeText({ context, contextItems })),
];

const buildTargetSummaryForWord = (item = {}) => {
  const baseline = safeReportText(item.baseline);
  const t1 = safeReportText(item.target_tahun_1);
  const t2 = safeReportText(item.target_tahun_2);
  const t3 = safeReportText(item.target_tahun_3);
  const t4 = safeReportText(item.target_tahun_4);
  const t5 = safeReportText(item.target_tahun_5);

  const values = [baseline, t1, t2, t3, t4, t5];

  if (values.every((value) => value === 'Belum Tersedia')) {
    return 'Belum Tersedia';
  }

  return `Baseline: ${baseline}; T1: ${t1}; T2: ${t2}; T3: ${t3}; T4: ${t4}; T5: ${t5}`;
};

const getContextSourceKey = (item = {}) =>
  String(item.jenis_konteks || item.source_table || item.stage || '')
    .trim()
    .toLowerCase();

const isRenstraContextItem = (item = {}) => {
  const sourceKey = getContextSourceKey(item);
  return (
    sourceKey === 'renstra' ||
    [
      'tujuan',
      'sasaran',
      'strategi',
      'kebijakan',
      'arah_kebijakan',
      'program',
      'kegiatan',
      'sub_kegiatan',
      'subkegiatan',
    ].includes(sourceKey)
  );
};

const isNonRenstraContextItem = (item = {}) => !isRenstraContextItem(item);

const getContextObjectText = (item = {}) =>
  cleanGovernmentWordValue(
    safeText(
      item.indikator_atau_objek_risiko ||
        item.nama_indikator ||
        item.nama_konteks_laporan ||
        item.objek_risiko ||
        item.judul_temuan ||
        item.nama_kegiatan ||
        item.uraian ||
        item.description,
      'Belum Tersedia',
    ),
  );

const getContextReferenceText = (item = {}) =>
  safeReportText(
    item.nomor_temuan ||
      item.nomor_dokumen ||
      item.nomor_referensi ||
      item.ref_number ||
      item.ref_id ||
      item.source_id ||
      item.kode_konteks ||
      item.indikator_id,
  );

const getContextSummaryReferenceText = (item = {}) => {
  if (isRenstraContextItem(item)) {
    return safeReportText(item.kode_indikator || item.indikator_id);
  }

  return getContextReferenceText(item);
};

const getNonRenstraContextDescription = (item = {}) => {
  const sourceLabel = formatBusinessSourceLabel(
    item.jenis_konteks || item.source_table || item.stage,
  );

  const statusText = safeReportText(
    item.status_tindak_lanjut || item.status_dokumen || item.status || item.relationship_status,
    '',
  );

  const tahunText = safeReportText(item.tahun_pemeriksaan || item.tahun_dokumen || item.tahun, '');

  const pieces = [
    `Sumber: ${sourceLabel}`,
    statusText && statusText !== 'Belum Tersedia' ? `Status: ${statusText}` : null,
    tahunText && tahunText !== 'Belum Tersedia' ? `Tahun: ${tahunText}` : null,
  ].filter(Boolean);

  return pieces.length
    ? cleanGovernmentWordValue(pieces.join('; '))
    : 'Detail mengikuti dokumen sumber risiko dan data pendukung yang tersedia.';
};

const groupContextItemsBySourceLabel = (items = []) => {
  return items.reduce((groups, item) => {
    const label = formatBusinessSourceLabel(item.jenis_konteks || item.source_table || item.stage);

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);

    return groups;
  }, {});
};

const makeRenstraTable = (contextItems = []) => {
  const border = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  };

  const headerShading = { fill: 'D9EAF7' };
  const cellMargins = { top: 100, bottom: 100, left: 120, right: 120 };
  const headerSpacing = { before: 60, after: 60 };
  const dataSpacing = { before: 60, after: 60 };

  const makeHeaderCell = (text, width, spanOptions = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      shading: headerShading,
      borders: border,
      margins: cellMargins,
      verticalAlign: 'center',
      ...spanOptions,
      children: [
        new Paragraph({
          children: [makeText(text, { bold: true, size: 16 })],
          alignment: AlignmentType.CENTER,
          spacing: headerSpacing,
        }),
      ],
    });

  // Baris header 1: No | Tahapan | Kode | Indikator | Satuan | Baseline | Target Tahun Ke (span 5)
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell('No', 4),
      makeHeaderCell('Tahapan Renstra', 11),
      makeHeaderCell('Kode Indikator', 15),
      makeHeaderCell('Indikator', 28),
      makeHeaderCell('Satuan', 7),
      makeHeaderCell('Baseline', 7),
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        shading: headerShading,
        borders: border,
        margins: cellMargins,
        columnSpan: 5,
        children: [
          new Paragraph({
            children: [makeText('Target Tahun Ke', { bold: true, size: 16 })],
            alignment: AlignmentType.CENTER,
            spacing: headerSpacing,
          }),
        ],
      }),
    ],
  });

  // Baris header 2: kosong x6 | I | II | III | IV | V
  const makeRomanCell = (text) =>
    new TableCell({
      width: { size: 7, type: WidthType.PERCENTAGE },
      shading: headerShading,
      borders: border,
      margins: cellMargins,
      children: [
        new Paragraph({
          children: [makeText(text, { bold: true, size: 16 })],
          alignment: AlignmentType.CENTER,
          spacing: headerSpacing,
        }),
      ],
    });

  const makeEmptyHeaderCell = (width) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      shading: headerShading,
      borders: border,
      margins: cellMargins,
      children: [new Paragraph({ children: [makeText('')], spacing: headerSpacing })],
    });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      makeEmptyHeaderCell(4),
      makeEmptyHeaderCell(11),
      makeEmptyHeaderCell(15),
      makeEmptyHeaderCell(28),
      makeEmptyHeaderCell(7),
      makeEmptyHeaderCell(7),
      makeRomanCell('I'),
      makeRomanCell('II'),
      makeRomanCell('III'),
      makeRomanCell('IV'),
      makeRomanCell('V'),
    ],
  });

  // Baris data
  const dataRows = contextItems.filter(isRenstraContextItem).length
    ? contextItems.filter(isRenstraContextItem).map(
        (item, index) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(String(index + 1), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 11, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [
                      makeText(formatStage(item.stage || item.jenis_konteks || item.source_table), {
                        size: 16,
                      }),
                    ],
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.kode_indikator), { size: 16 })],
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(getContextObjectText(item), { size: 16 })],
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.satuan), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.baseline), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.target_tahun_1), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.target_tahun_2), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.target_tahun_3), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.target_tahun_4), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
              new TableCell({
                width: { size: 7, type: WidthType.PERCENTAGE },
                borders: border,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    children: [makeText(safeReportText(item.target_tahun_5), { size: 16 })],
                    alignment: AlignmentType.CENTER,
                    spacing: dataSpacing,
                  }),
                ],
              }),
            ],
          }),
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 11,
              borders: border,
              margins: cellMargins,
              children: [
                new Paragraph({
                  children: [
                    makeText('Nihil / belum tersedia dalam cakupan laporan', {
                      italics: true,
                      size: 16,
                    }),
                  ],
                  spacing: dataSpacing,
                }),
              ],
            }),
          ],
        }),
      ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow1, headerRow2, ...dataRows],
  });
};

const buildContextSection = ({ context, contextItems = [], report = {} }) => {
  const approvalGate = getReportApprovalGate(report);
  const sumberData = getUniqueContextSources(contextItems).map(formatBusinessSourceLabel);

  return [
    makeHeading1('4. Informasi Umum Laporan'),
    makeKeyValueTable([
      ['Nama Perangkat Daerah', safeReportText(context.nama_opd)],
      ['Tahun Laporan', safeReportText(context.tahun)],
      ['Cakupan Laporan', getCoverageLabel(context)],
      ['Cakupan Waktu', getIntegratedReportCoverageTimeLabel(context)],
      ['Sumber Data Risiko', sumberData.length ? sumberData.join(', ') : 'Belum Tersedia'],
      ['Status Dokumen', safeReportText(approvalGate.document_status_label)],
      ['Siap Ditandatangani', approvalGate.ready_to_sign ? 'Ya' : 'Tidak'],
      ['Total Risiko', safeReportText(approvalGate.total_risiko)],
      ['Risiko Disetujui', safeReportText(approvalGate.approved_count)],
      ['Risiko Belum Disetujui', safeReportText(approvalGate.not_approved_count)],
      [
        'Catatan Status Dokumen',
        cleanApprovalNoteForWord(approvalGate.closing_note || approvalGate.cover_note),
      ],
    ]),
    makeSpacer(),

    makeHeading2('4.1 Sumber Data Risiko'),
    makeSmallNote(
      'Daftar sumber data risiko berikut menunjukkan sumber informasi, objek risiko, dan jejak keterkaitan data yang menjadi dasar penyusunan risiko dalam laporan. Jumlah sumber data risiko dapat berbeda dengan jumlah risiko/usulan risiko.',
    ),

    makeHeading2('4.1A Ringkasan Sumber Data Risiko'),
    makeTable({
      headers: ['No', 'Sumber Data Risiko', 'Referensi Sumber', 'Indikator / Objek Risiko'],
      widths: [6, 20, 18, 56],
      fontSize: 14,
      rows: contextItems.map((item, index) => [
        index + 1,
        formatBusinessSourceLabel(item.jenis_konteks || item.source_table || item.stage),
        getContextSummaryReferenceText(item),
        cleanGovernmentWordValue(
          safeText(
            item.indikator_atau_objek_risiko || item.nama_indikator || item.nama_konteks_laporan,
          ),
        ),
      ]),
    }),

    makeSpacer(),

    makeHeading2('4.1B Jejak Keterkaitan Sumber Data Risiko'),
    makeSmallNote(
      'Jejak keterkaitan sumber data risiko disajikan sesuai karakteristik sumber datanya. Sumber Renstra memuat informasi indikator, satuan, baseline, dan target. Sumber non-Renstra memuat nomor/referensi, objek risiko, dan keterangan dokumen sumber tanpa memaksakan kolom baseline atau target.',
    ),

    makeHeading2('4.1B.1 Detail Sumber Data Renstra'),
    makeRenstraTable(contextItems),

    makeSpacer(),

    ...Object.entries(
      groupContextItemsBySourceLabel(contextItems.filter(isNonRenstraContextItem)),
    ).flatMap(([sourceLabel, items], groupIndex) => [
      makeHeading2(`4.1B.${groupIndex + 2} Detail Sumber Data ${sourceLabel}`),
      makeTable({
        headers: [
          'No',
          'Sumber Data Risiko',
          'Nomor/Referensi Sumber',
          'Objek Risiko / Uraian Sumber',
          'Keterangan',
        ],
        widths: [6, 24, 18, 34, 18],
        fontSize: 13,
        rows: items.map((item, index) => [
          index + 1,
          sourceLabel,
          getContextReferenceText(item),
          getContextObjectText(item),
          getNonRenstraContextDescription(item),
        ]),
      }),
      makeSpacer(),
    ]),
  ];
};

const buildSummarySection = ({ summary, contextItems = [] }) => [
  makeHeading1('5. Ringkasan Hasil Pemantauan'),
  makeSmallNote(
    'Total Sumber Data Risiko menunjukkan jumlah sumber informasi, objek risiko, dan jejak keterkaitan data yang menjadi dasar penyusunan risiko dalam laporan. Total Risiko dan Total Usulan Risiko menunjukkan jumlah register risiko yang tercatat dalam cakupan laporan.',
  ),
  makeKeyValueTable([
    ['Total Sumber Data Risiko', contextItems.length],
    ['Total Risiko', summary.total_risiko],
    ['Total Usulan Risiko', summary.total_usulan_risiko],
    ['Risiko di Atas Selera Risiko', summary.total_risiko_di_atas_selera],
    ['Total Analisis Risiko', summary.total_analisis],
    ['Pengendalian yang Ada Tidak Efektif', summary.total_existing_control_tidak_efektif],
    ['Pengendalian Belum Memadai', summary.total_control_belum_memadai],
    ['Total Analisis Akar Permasalahan', summary.total_root_cause],
    ['Total Kegiatan Pengendalian', summary.total_kegiatan_pengendalian],
    ['Total Pemantauan', summary.total_monitoring],
    ['Pengendalian Terealisasi', summary.total_pengendalian_terealisasi],
    ['Rata-rata Progress', `${summary.rata_rata_progress}%`],
    ['Total Kejadian Risiko', summary.total_kejadian_risiko],
  ]),
];

const buildInlineUsulanRisikoTable = ({ daftarRisiko = [] }) => [
  makeTable({
    headers: ['No', 'Nama Usulan Risiko', 'Usulan Kode Risiko'],
    widths: [8, 62, 30],
    fontSize: 15,
    rows: daftarRisiko.map((item, index) => [
      index + 1,
      safeFilledText(item.nama_risiko),
      formatRiskCodeDisplayForWord(item.kode_risiko),
    ]),
  }),
];

const buildNarrativeSection = ({ narasi, daftarRisiko = [], context, summary }) => [
  makeHeading1('6. Hasil Pengelolaan Manajemen Risiko'),

  makeHeading2('a. Identifikasi Risiko'),
  makeParagraph(
    getGovernmentSummaryText({
      context,
      summary,
    }),
  ),

  makeHeading2('b. Register Risiko dan Usulan Risiko'),
  makeParagraph(
    `Jumlah risiko/usulan risiko yang tercatat dalam register laporan sebanyak ${safeText(
      daftarRisiko.length,
      0,
    )} risiko. Data tersebut mencakup risiko yang telah disetujui maupun risiko yang masih memerlukan proses verifikasi dan persetujuan.`,
  ),
  ...buildInlineUsulanRisikoTable({ daftarRisiko }),

  makeHeading2('c. Analisis Risiko'),
  makeParagraph(cleanGovernmentWordValue(narasi.analisis_risiko)),

  makeHeading2('d. Evaluasi Risiko'),
  makeParagraph(cleanGovernmentWordValue(narasi.evaluasi_risiko)),

  makeHeading2('e. Rencana Pengendalian dan Tindak Lanjut'),
  makeParagraph(
    `Rencana pengendalian dan tindak lanjut disajikan berdasarkan data yang tersedia dalam cakupan laporan. Jumlah kegiatan pengendalian yang tercatat dalam cakupan laporan sebanyak ${safeText(
      summary?.total_kegiatan_pengendalian,
      0,
    )} kegiatan.`,
  ),

  makeHeading2('f. Pemantauan Kejadian Risiko'),
  makeParagraph(
    `Jumlah kejadian risiko yang tercatat dalam cakupan laporan sebanyak ${safeText(
      summary?.total_kejadian_risiko,
      0,
    )} kejadian.`,
  ),
];

const buildFinalPedomanSummarySection = (report = {}) => {
  const settingParameterSummary = getSettingParameterSummary(report);
  const riskMapSummary = getRiskMapSummary(report);
  const rootCauseSummary = getRootCauseSummary(report);
  const monitoringLevelSummary = getMonitoringLevelSummary(report);
  const unrealizedControlSummary = getUnrealizedControlSummary(report);
  const effectivenessSummary = getEffectivenessSummary(report);
  const reviewProposalSummary = getReviewProposalSummary(report);

  return [
    makeHeading1('7. Ringkasan Evaluasi Lanjutan Berdasarkan Pedoman MR'),
    makeSmallNote(
      'Bagian ini menyajikan ringkasan naratif atas data Pedoman Manajemen Risiko yang tersedia dalam cakupan laporan. Rincian tabular pendukung dapat disajikan sebagai lampiran apabila diperlukan, sehingga dokumen utama tetap ringkas, terbaca, dan layak digunakan sebagai bahan pengambilan keputusan.',
    ),

    makeHeading2('7.1 Setting Parameter dan Matriks Risiko'),
    makeParagraph(settingParameterSummary.text),

    makeHeading2('7.1A Kriteria Kemungkinan Terjadinya Risiko'),
    makeSmallNote(
      'Kriteria kemungkinan berikut digunakan sebagai acuan penilaian frekuensi terjadinya risiko ' +
        'sesuai Setting Parameter Manajemen Risiko yang berlaku. ' +
        'Pengelola memilih level kemungkinan dari dropdown yang terkendali; ' +
        'nilai numerik digunakan dalam perhitungan skor risiko secara otomatis.',
    ),
    ...buildKriteriaKemungkinanTable(report),

    makeSpacer(),

    makeHeading2('7.1B Kriteria Dampak Terjadinya Risiko'),
    makeSmallNote(
      'Kriteria dampak mencakup 5 area dampak sesuai Pedoman No 2 Form Coaching Clinic Inspektorat: ' +
        'Beban Keuangan Negara, Penurunan Reputasi, Kesehatan & Keselamatan Kerja, ' +
        'Realisasi Capaian Kinerja, dan Temuan BPK/Inspektorat. ' +
        'Threshold setiap level dampak (1—5) disajikan per area dampak.',
    ),
    ...buildKriteriaDampakTable(),

    makeSpacer(),

    makeHeading2('7.1C Matriks Analisis Risiko 5x5'),
    makeSmallNote(
      'Matriks berikut menampilkan skor hasil perpotongan frekuensi (baris) dan dampak (kolom) ' +
        'sesuai Setting Parameter resmi. Skor dan level risiko dalam register bersumber dari matriks ini. ' +
        'Pengelola tidak mengisi matriks secara manual.',
    ),
    ...buildMatriks5x5Table(report),

    makeSpacer(),

    makeHeading2('7.2 Peta Risiko'),
    makeParagraph(riskMapSummary.text),

    ...buildPetaRisikoGrid(
      getSection(report, 'pedoman_no_7_peta_risiko')?.rows || report.lampiran?.risk_map || {},
      'inherent',
      '7.2A Peta Risiko Inheren',
    ),

    makeSpacer(),

    ...buildPetaRisikoGrid(
      getSection(report, 'pedoman_no_7_peta_risiko')?.rows || report.lampiran?.risk_map || {},
      'residual',
      '7.2B Peta Risiko Residu',
    ),

    makeSpacer(),

    ...buildPetaRisikoGrid(
      getSection(report, 'pedoman_no_7_peta_risiko')?.rows || report.lampiran?.risk_map || {},
      'actual',
      '7.2C Peta Risiko Aktual',
    ),

    makeSpacer(),

    makeHeading2('7.3 Analisis Akar Permasalahan'),
    makeParagraph(rootCauseSummary.text),

    makeHeading2('7.4 Monitoring Level Risiko'),
    makeParagraph(monitoringLevelSummary.text),

    makeHeading2('7.5 Pengendalian Belum Terealisasi'),
    makeParagraph(unrealizedControlSummary.text),

    makeHeading2('7.6 Efektivitas Pengendalian'),
    makeParagraph(effectivenessSummary.text),

    makeHeading2('7.7 Reviu Usulan Risiko Baru'),
    makeParagraph(reviewProposalSummary.text),
  ];
};

const buildLampiranRisiko = ({ daftarRisiko = [], generatedSections = {}, report = {} }) => {
  // R17C-2A: Ambil rows Pedoman No 4 yang sudah di-mapper
  const pedoman4Rows =
    generatedSections?.pedoman_no_4_identifikasi_risiko?.rows ||
    reportQueryService.buildPedoman4Rows(daftarRisiko);

  // Helper format anggaran: tampilkan nominal jika angka, atau teks fallback
  const formatAnggaran = (val) => {
    if (val === null || val === undefined) return 'Belum Tersedia';
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) {
      return `Rp ${num.toLocaleString('id-ID')}`;
    }
    const str = String(val).trim();
    return str || 'Belum Tersedia';
  };

  return [
    makeHeading1('Lampiran 1 â€” Register Risiko Terpadu'),
    ...makeLampiranIntro(
      'Register risiko terpadu disajikan dalam bentuk ringkasan dan uraian agar informasi utama, sumber data risiko, serta status pengendalian tetap terbaca dalam dokumen.',
    ),

    makeHeading2('Lampiran 1A â€” Ringkasan Register Risiko'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Kategori', 'Sumber', 'Skor', 'Level', 'Selera', 'Status'],
      widths: [5, 18, 14, 14, 8, 11, 12, 13],
      fontSize: 13,
      rows: daftarRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        cleanGovernmentWordValue(safeCategoryText(item.kategori_risiko)),
        cleanGovernmentWordValue(safeFilledText(item.sumber_risiko)),
        safeNumber(item.skor_risiko),
        safeFilledText(item.level_risiko),
        resolveSeleraRisikoLabel(item, report),
        formatRiskStatusLabel(item.status_risiko),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 1B â€” Uraian Risiko dan Dampak'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Nama Risiko', 'Uraian Risiko'],
      widths: [5, 14, 30, 51],
      fontSize: 13,
      rows: daftarRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.nama_risiko),
        safeFilledText(item.uraian_risiko),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 1C â€” Penyebab dan Dampak Risiko'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Penyebab Risiko', 'Dampak Risiko'],
      widths: [5, 14, 37, 39],
      fontSize: 13,
      rows: daftarRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.penyebab_risiko),
        safeFilledText(item.dampak_risiko),
      ]),
    }),

    makeSpacer(),

    // â”€â”€â”€ R17C-2A: Lampiran 1D â€” Identifikasi Risiko Sesuai Pedoman No 4 â”€â”€â”€â”€â”€â”€â”€
    makeHeading2('Lampiran 1D â€” Identifikasi Risiko Sesuai Pedoman No 4'),
    ...makeLampiranIntro(
      'Tabel ini menyajikan data identifikasi risiko sesuai kolom Form Coaching Clinic Inspektorat (Lampiran Pedoman Nomor 4): ' +
        'Jenis Konteks, Nama Konteks, Anggaran, Indikator, Kode Risiko, Pernyataan Risiko, Kategori Risiko, Uraian Dampak, ' +
        'dan Metode Pencapaian Tujuan SPIP. ' +
        "Data yang belum tersedia di sistem ditampilkan sebagai 'Belum Diisi' atau 'Belum Tersedia'. " +
        "Nilai placeholder seperti 'isi nama risiko' tidak ditampilkan.",
    ),
    makeSmallNote(
      'Lampiran 1D dipecah menjadi dua tabel agar lebih mudah dibaca: tabel inti menampilkan identitas risiko, ' +
        'sedangkan tabel detail menampilkan uraian dampak dan metode SPIP.',
    ),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Jenis Konteks',
        'Nama Konteks',
        'Anggaran',
        'Indikator',
        'Pernyataan Risiko',
        'Kategori Risiko',
      ],
      widths: [4, 11, 12, 14, 11, 11, 23, 14],
      fontSize: 12,
      rows: pedoman4Rows.map((row) => [
        row.no,
        cleanGovernmentWordValue(safeFilledText(row.kode_risiko, 'Belum ditetapkan')),
        safeFilledText(row.jenis_konteks),
        safeFilledText(row.nama_konteks),
        formatAnggaran(row.anggaran),
        safeFilledText(row.indikator),
        safeFilledText(row.pernyataan_risiko),
        cleanGovernmentWordValue(safeFilledText(row.kategori_risiko)),
      ]),
    }),
    makeSpacer(),
    makeHeading2('Lampiran 1D1 — Detail SPIP dan Dampak'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Uraian Dampak', 'Metode Pencapaian Tujuan SPIP'],
      widths: [4, 12, 46, 38],
      fontSize: 12,
      rows: pedoman4Rows.map((row) => [
        row.no,
        cleanGovernmentWordValue(safeFilledText(row.kode_risiko, 'Belum ditetapkan')),
        safeFilledText(row.uraian_dampak),
        safeFilledText(row.metode_pencapaian_tujuan_spip, 'Belum Tersedia'),
      ]),
    }),
    // â”€â”€â”€ end R17C-2A â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ];
};

// â”€â”€â”€ R17C-2D: buildLampiranAnalisis â€” Pedoman No 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gap yang diselesaikan:
//   1. Risiko yang BELUM dianalisis kini tampil eksplisit di Lampiran 2C
//      dengan keterangan "Belum Ada Analisis" per kolom â€” tidak disembunyikan.
//   2. Kolom Kemungkinan Inheren & Dampak Inheren (angka + label) ditambahkan
//      sesuai Form Coaching Clinic Inspektorat.
//   3. Kolom Residu kini memuat "Belum Tersedia" jika data belum ada,
//      bukan kosong/strip.
//   4. Kolom "Ada/Belum Ada" dan "Memadai/Belum Memadai" dipisah eksplisit
//      sesuai kolom form Pedoman No 5.
const buildLampiranAnalisis = ({ analisisRisiko = [], daftarRisiko = [] }) => {
  // Himpun risk_id yang sudah dianalisis
  const analyzedRiskIds = new Set(
    analisisRisiko.map((a) => Number(a.mr_planning_risk_id)).filter((n) => n > 0),
  );

  // Risiko yang belum punya analisis sama sekali
  const risikoTanpaAnalisis = daftarRisiko.filter((r) => !analyzedRiskIds.has(Number(r.id)));

  const safeInherent = (item) => {
    const skor = safeText(item.inherent_score, 'Belum Tersedia');
    const level = safeText(item.inherent_level, 'Belum Tersedia');
    const lk = safeText(item.inherent_likelihood ?? item.kemungkinan, '-');
    const dp = safeText(item.inherent_impact ?? item.dampak, '-');
    return `K:${lk} D:${dp} â†’ ${skor} / ${level}`;
  };

  const safeResidu = (item) => {
    const skor = item.residual_score;
    const level = item.residual_level;
    if (!skor && !level) return 'Belum Tersedia';
    return `${safeText(skor, '?')} / ${safeText(level, 'Belum Tersedia')}`;
  };

  const safeExistingControl = (item) => {
    // Kolom "Ada / Belum Ada"
    const status = String(item.existing_control_status || '')
      .toLowerCase()
      .trim();
    if (!status || status === 'belum diisi' || status === '-') return 'Belum Ada';
    if (status.includes('tidak ada') || status.includes('belum ada')) return 'Belum Ada';
    return 'Ada';
  };

  const safeAdequacy = (item) => {
    // Kolom "Memadai / Belum Memadai"
    const adequacy = String(item.control_adequacy_status || '')
      .toLowerCase()
      .trim();
    if (!adequacy || adequacy === 'belum diisi' || adequacy === '-') return 'Belum Tersedia';
    if (adequacy.includes('tidak') || adequacy.includes('belum')) return 'Belum Memadai';
    if (adequacy.includes('memadai') || adequacy.includes('efektif')) return 'Memadai';
    return safeFilledText(item.control_adequacy_status);
  };

  return [
    makeHeading1('Lampiran 2 â€” Analisis Risiko'),
    ...makeLampiranIntro(
      'Analisis risiko dipecah menjadi ringkasan penilaian dan catatan analisis sesuai Form Coaching Clinic Inspektorat (Pedoman No 5). ' +
        'Kolom yang tersedia: Kemungkinan Inheren, Dampak Inheren, Level Inheren, Status Pengendalian (Ada/Belum Ada), ' +
        'Uraian Pengendalian, Kecukupan (Memadai/Belum Memadai), serta nilai Residu. ' +
        'Risiko yang belum memiliki analisis ditampilkan eksplisit di Lampiran 2C.',
    ),

    makeHeading2('Lampiran 2A â€” Ringkasan Penilaian Risiko'),
    makeSmallNote(
      `Total risiko teranalisis: ${analisisRisiko.length} dari ${daftarRisiko.length} risiko. ` +
        `Risiko belum dianalisis: ${risikoTanpaAnalisis.length} risiko â€” lihat Lampiran 2C.`,
    ),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Pengendalian Ada?',
        'Memadai?',
        'Inheren (K / D â†’ Skor / Level)',
        'Residu (Skor / Level)',
        'Di Atas Selera',
      ],
      widths: [5, 14, 13, 13, 25, 16, 14],
      fontSize: 12,
      rows: analisisRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeExistingControl(item),
        safeAdequacy(item),
        safeInherent(item),
        safeResidu(item),
        item.is_above_appetite ? 'Ya' : 'Tidak',
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 2B â€” Uraian Pengendalian dan Rekomendasi'),
    makeSmallNote(
      'Tabel ini menyajikan uraian pengendalian yang ada, catatan kecukupan, catatan analisis, ' +
        'dan rekomendasi tindak lanjut per risiko yang telah dianalisis.',
    ),
    makeSmallNote(
      'Untuk memudahkan pembacaan, tabel 2B dipecah menjadi dua bagian: uraian pengendalian dan catatan rekomendasi.',
    ),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Uraian Pengendalian yang Ada',
        'Catatan Kecukupan Pengendalian',
      ],
      widths: [5, 12, 41, 24],
      fontSize: 12,
      rows: analisisRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        cleanGovernmentWordValue(safeFilledText(item.existing_control_description)),
        safeFilledText(item.control_adequacy_note),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 2B1 — Catatan Analisis dan Rekomendasi'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Catatan Analisis', 'Rekomendasi'],
      widths: [5, 12, 34, 34],
      fontSize: 12,
      rows: analisisRisiko.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.analysis_note),
        safeRecommendationText(item.rekomendasi),
      ]),
    }),

    makeSpacer(),

    // â”€â”€ Lampiran 2C: Risiko BELUM dianalisis â€” tampil eksplisit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    makeHeading2('Lampiran 2C — Risiko Belum Memiliki Analisis Risiko'),
    makeSmallNote(
      risikoTanpaAnalisis.length === 0
        ? 'Seluruh risiko dalam cakupan laporan telah memiliki data analisis risiko.'
        : `Terdapat ${risikoTanpaAnalisis.length} risiko yang belum memiliki data analisis risiko. ` +
            'Pemilik Risiko dan Koordinator Manajemen Risiko perlu melengkapi analisis risiko ' +
            'untuk risiko-risiko berikut sebelum laporan dapat dinyatakan final.',
    ),
    ...(risikoTanpaAnalisis.length === 0
      ? []
      : [
          makeTable({
            headers: [
              'No',
              'Kode Risiko',
              'Nama Risiko',
              'Pengendalian Ada?',
              'Memadai?',
              'Inheren (Skor / Level)',
              'Residu (Skor / Level)',
              'Keterangan',
            ],
            widths: [5, 13, 20, 11, 10, 17, 15, 24],
            fontSize: 12,
            rows: risikoTanpaAnalisis.map((item, index) => [
              index + 1,
              formatRiskCodeDisplayForWord(item.kode_risiko),
              safeFilledText(item.nama_risiko),
              'Belum Ada',
              'Belum Tersedia',
              item.skor_risiko
                ? `${safeText(item.skor_risiko)} / ${safeText(item.level_risiko, 'Belum Tersedia')}`
                : 'Belum Tersedia',
              'Belum Tersedia',
              'Analisis risiko belum dilengkapi',
            ]),
          }),
        ]),
  ];
};
// â”€â”€â”€ end R17C-2D â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ R17C-2E: buildLampiranPrioritas â€” Pedoman No 6 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Gap yang diselesaikan:
//   1. Selera risiko "Belum Tersedia" / null diganti dengan fallback
//      dari context.selera_risiko jika tersedia, atau label eksplisit
//      "Belum Ditetapkan" â€” tidak boleh kosong sesuai form.
//   2. Rekomendasi "Belum ada rekomendasi" diberi keterangan tambahan
//      agar auditor tahu ini bukan kosong melainkan belum dilengkapi.
//   3. Tabel dipecah: Lampiran 3A ringkasan urut skor, Lampiran 3B
//      detail rekomendasi dan catatan per risiko prioritas.
//   4. Risiko di atas selera diurutkan descending skor â†’ sesuai form.
const buildLampiranPrioritas = ({ risikoPrioritas = [], contextSeleraRisiko = null }) => {
  // Urutkan descending skor risiko (form mensyaratkan urutan prioritas)
  const sorted = [...risikoPrioritas].sort(
    (a, b) => Number(b.skor_risiko || 0) - Number(a.skor_risiko || 0),
  );

  const resolveSelera = (item) => {
    // Prioritas: field item â†’ fallback context â†’ label eksplisit
    const raw = item.selera_risiko ?? item.risk_appetite ?? null;
    if (raw !== null && raw !== undefined) {
      const str = String(raw).trim().toLowerCase();
      if (str && str !== 'belum tersedia' && str !== 'belum diisi' && str !== '-' && str !== '') {
        return String(raw).trim();
      }
    }
    if (contextSeleraRisiko !== null && contextSeleraRisiko !== undefined) {
      return String(contextSeleraRisiko);
    }
    return 'Belum Ditetapkan';
  };

  const resolveRekomendasi = (item) => {
    const raw = item.rekomendasi;
    if (!raw || String(raw).trim() === '' || String(raw).trim() === '-') {
      return 'Belum ada rekomendasi — perlu dilengkapi oleh Pemilik Risiko';
    }
    const lower = String(raw).toLowerCase().trim();
    if (lower === 'belum ada rekomendasi') {
      return 'Belum ada rekomendasi — perlu dilengkapi oleh Pemilik Risiko';
    }
    return String(raw).trim();
  };

  const risikoTanpaSelera = sorted.filter((item) => {
    const raw = item.selera_risiko ?? item.risk_appetite ?? null;
    if (raw === null || raw === undefined) return true;
    const str = String(raw).trim().toLowerCase();
    return !str || str === 'belum tersedia' || str === 'belum diisi' || str === '-';
  });

  const risikoTanpaRekomendasi = sorted.filter((item) => {
    const raw = item.rekomendasi;
    if (!raw || String(raw).trim() === '' || String(raw).trim() === '-') return true;
    return String(raw).toLowerCase().trim() === 'belum ada rekomendasi';
  });

  return [
    makeHeading1('Lampiran 3 â€” Risiko Prioritas'),
    ...makeLampiranIntro(
      'Risiko prioritas disusun berdasarkan risiko yang berada di atas selera risiko, ' +
        'diurutkan dari skor tertinggi ke terendah sesuai Form Coaching Clinic Inspektorat (Pedoman No 6). ' +
        "Kolom Selera Risiko wajib terisi; nilai yang belum ditetapkan ditampilkan sebagai 'Belum Ditetapkan'. " +
        'Kolom Rekomendasi yang belum dilengkapi ditampilkan dengan catatan eksplisit agar dapat ditindaklanjuti.',
    ),
    makeSmallNote(
      `Total risiko prioritas: ${sorted.length} risiko. ` +
        (risikoTanpaSelera.length
          ? `Risiko dengan selera risiko belum ditetapkan: ${risikoTanpaSelera.length} risiko. `
          : 'Seluruh risiko prioritas telah memiliki selera risiko. ') +
        (risikoTanpaRekomendasi.length
          ? `Risiko tanpa rekomendasi: ${risikoTanpaRekomendasi.length} risiko — perlu dilengkapi.`
          : 'Seluruh risiko prioritas telah memiliki rekomendasi.'),
    ),

    makeHeading2('Lampiran 3A â€” Ringkasan Risiko Prioritas'),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Nama Risiko',
        'Skor Residu',
        'Level',
        'Selera Risiko',
        'Di Atas Selera',
      ],
      widths: [5, 14, 28, 10, 9, 13, 12],
      fontSize: 12,
      rows: sorted.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.nama_risiko),
        safeNumber(item.skor_risiko),
        safeFilledText(item.level_risiko),
        resolveSelera(item),
        item.is_above_appetite ? 'Ya' : 'Tidak',
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 3A1 — Catatan Rekomendasi Risiko Prioritas'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Rekomendasi'],
      widths: [5, 14, 61],
      fontSize: 12,
      rows: sorted.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        resolveRekomendasi(item),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 3B â€” Catatan Selera Risiko Belum Ditetapkan'),
    makeSmallNote(
      risikoTanpaSelera.length === 0
        ? 'Seluruh risiko prioritas telah memiliki selera risiko yang ditetapkan.'
        : `Terdapat ${risikoTanpaSelera.length} risiko prioritas yang selera risikonya belum ditetapkan secara eksplisit. ` +
            'Pemilik Risiko wajib menetapkan selera risiko melalui pengaturan konteks sebelum laporan dinyatakan final. ' +
            'Selera risiko yang tidak terisi tidak sesuai dengan ketentuan Form Coaching Clinic Inspektorat Pedoman No 6.',
    ),
    ...(risikoTanpaSelera.length === 0
      ? []
      : [
          makeTable({
            headers: ['No', 'Kode Risiko', 'Nama Risiko', 'Skor', 'Level', 'Catatan'],
            widths: [5, 16, 28, 10, 10, 46],
            fontSize: 12,
            rows: risikoTanpaSelera.map((item, index) => [
              index + 1,
              formatRiskCodeDisplayForWord(item.kode_risiko),
              safeFilledText(item.nama_risiko),
              safeNumber(item.skor_risiko),
              safeFilledText(item.level_risiko),
              'Selera risiko belum ditetapkan — wajib diisi sebelum laporan final',
            ]),
          }),
        ]),
  ];
};
// â”€â”€â”€ end R17C-2E â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const resolve6mCode = (value) => {
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

const buildLampiranRca = ({ rootCauseAnalysis = [] }) => [
  makeHeading1('Lampiran 3 — Analisis Akar Masalah/RCA'),
  ...makeLampiranIntro(
    'RCA dipisah menjadi tiga tabel agar lebih mudah dibaca: urutan Why, akar penyebab, dan tindak pengendalian.',
  ),
  makeHeading2('Lampiran 3A — Urutan Why'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Kode Penyebab', 'Why 1', 'Why 2', 'Why 3', 'Why 4', 'Why 5'],
    widths: [4, 12, 12, 12, 12, 12, 12, 12],
    fontSize: 11,
    rows: rootCauseAnalysis.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.kode_penyebab, 'Belum Tersedia'),
      safeFilledText(item.why_1),
      safeFilledText(item.why_2),
      safeFilledText(item.why_3),
      safeFilledText(item.why_4),
      safeFilledText(item.why_5),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 3B — Akar Penyebab dan 6M'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Akar Penyebab', 'Kode Penyebab 6M'],
    widths: [4, 12, 52, 16],
    fontSize: 12,
    rows: rootCauseAnalysis.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.akar_penyebab),
      resolve6mCode(item.kategori_penyebab || item.kategori_penyebab_ref_id),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 3C — Kegiatan Pengendalian'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Kegiatan Pengendalian'],
    widths: [4, 12, 68],
    fontSize: 12,
    rows: rootCauseAnalysis.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.kegiatan_pengendalian),
    ]),
  }),
];

const buildLampiranRtp = ({ rencanaPengendalian = [], context = {} }) => [
  makeHeading1('Lampiran 4 — Rencana Tindak Pengendalian'),
  ...makeLampiranIntro(
    'Rencana tindak pengendalian dipecah menjadi ringkasan mitigasi, detail kegiatan pengendalian, dan indikator keluaran sesuai Pedoman No 9.',
  ),

  makeHeading2('Lampiran 4A â€” Ringkasan Mitigasi'),
  makeTable({
    headers: [
      'No',
      'Kode Risiko',
      'Respons',
      'Unsur SPIP',
      'Sub Unsur',
      'Output Rencana Tindak Pengendalian',
      'Setelah Mitigasi',
      'Status Dalam Laporan',
    ],
    widths: [5, 12, 11, 11, 11, 14, 12, 14],
    fontSize: 12,
    rows: rencanaPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      item.respon_risiko,
      item.unsur_spip,
      cleanGovernmentWordValue(safeFilledText(item.sub_unsur_spip)),
      cleanGovernmentWordValue(safeFilledText(item.output_rtp)),
      `${safeNumber(item.risk_after_mitigation_score)} / ${safeText(
        item.risk_after_mitigation_level,
      )}`,
      getSubmoduleDisplayStatus({
        context,
        fallback: safeFilledText(item.status_mitigasi),
      }),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 4B â€” Detail Kegiatan dan Output Pengendalian'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Kegiatan Pengendalian', 'Target Output', 'Target Waktu'],
    widths: [5, 14, 33, 24, 18],
    fontSize: 12,
    rows: rencanaPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.kegiatan_pengendalian),
      safeFilledText(item.target_output),
      safeFilledText(item.target_waktu),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 4C â€” Indikator Keluaran dan Penanggung Jawab'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Indikator Keluaran', 'Penanggung Jawab'],
    widths: [5, 15, 41, 39],
    fontSize: 12,
    rows: rencanaPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.indikator_keluaran),
      safeFilledText(item.penanggung_jawab),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 4D — Risiko Setelah Respons'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Frekuensi', 'Dampak', 'Level'],
    widths: [5, 15, 15, 15, 18],
    fontSize: 12,
    rows: rencanaPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeText(item.risk_after_mitigation_likelihood, safeNumber(item.risk_after_mitigation_score)),
      safeText(item.risk_after_mitigation_impact, '-'),
      safeText(item.risk_after_mitigation_level),
    ]),
  }),
];

const buildLampiranRealisasi = ({ realisasiPengendalian = [], context = {} }) => [
  makeHeading1('Lampiran 5 — Realisasi/Pemantauan Pengendalian'),
  ...makeLampiranIntro(
    'Realisasi pengendalian dipecah menjadi ringkasan progres dan detail hasil pemantauan.',
  ),

  makeHeading2('Lampiran 5A — Ringkasan Progres Pengendalian'),
  makeTable({
    headers: [
      'No',
      'Kode Risiko',
      'Tanggal Monitoring',
      'Realisasi Waktu',
      'Progress',
      'Efektivitas Pengendalian',
      'Aktual',
      'Tren',
      'Status Dalam Laporan',
    ],
    widths: [5, 14, 11, 12, 10, 15, 12, 12, 19],
    fontSize: 15,
    rows: realisasiPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      formatDate(item.monitoring_date),
      formatDate(item.realisasi_waktu),
      `${safeNumber(item.progress_persen)}%`,
      cleanGovernmentWordValue(item.efektivitas_pengendalian),
      `${safeNumber(item.actual_score)} / ${safeText(item.actual_level)}`,
      item.risk_trend,
      getSubmoduleDisplayStatus({
        context,
        fallback: safeFilledText(item.status_monitoring),
      }),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 5B — Hasil Monitoring dan Realisasi Mitigasi'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Hasil Monitoring', 'Realisasi Mitigasi'],
    widths: [5, 17, 39, 39],
    fontSize: 14,
    rows: realisasiPengendalian.map((item, index) => [
      index + 1,
      item.kode_risiko,
      safeFilledText(item.hasil_monitoring),
      safeFilledText(item.realisasi_mitigasi),
    ]),
  }),

  makeSpacer(),

  makeHeading2('Lampiran 5C — Kendala, Tindak Lanjut, dan Rekomendasi'),
  makeTable({
    headers: ['No', 'Kode Risiko', 'Kendala', 'Tindak Lanjut', 'Rekomendasi'],
    widths: [5, 17, 26, 26, 26],
    fontSize: 14,
    rows: realisasiPengendalian.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeFilledText(item.kendala),
      safeFilledText(item.tindak_lanjut),
      safeRecommendationText(item.rekomendasi),
    ]),
  }),
];

const buildLampiranMonitoringLevel = ({ monitoringLevelRisiko = [] }) => [
  makeHeading1('Lampiran 6 — Monitoring Level Risiko'),
  ...makeLampiranIntro(
    'Monitoring level risiko disajikan dalam tabel agar frekuensi kejadian, level aktual, deviasi, dan rekomendasi terbaca eksplisit sesuai Pedoman No 12.',
  ),
  makeTable({
    headers: [
      'No',
      'Kode Risiko',
      'Frekuensi Kejadian',
      'Risiko Direspons',
      'Level Aktual',
      'Deviasi',
      'Rekomendasi',
    ],
    widths: [5, 16, 18, 23, 14, 14, 18],
    fontSize: 13,
    rows: monitoringLevelRisiko.map((item, index) => [
      index + 1,
      formatRiskCodeDisplayForWord(item.kode_risiko),
      safeText(item.actual_likelihood ?? item.frekuensi_kejadian ?? item.risk_trend ?? '-', '-'),
      `${safeText(item.risiko_direspons_nilai, '?')} / ${safeText(item.risiko_direspons_level, '-')}`,
      safeText(item.actual_level, '-'),
      safeText(item.level_change, '-'),
      safeFilledText(item.rekomendasi, 'Belum ada rekomendasi'),
    ]),
  }),
];

const buildLampiranPedoman13ReviuUsulanRisiko = ({ report }) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_13_reviu_usulan_risiko_baru',
    report.lampiran?.reviu_usulan_risiko_baru || [],
  );

  const resolveHasilReviu = (item) => {
    const diterima = String(item.diterima || '')
      .trim()
      .toLowerCase();
    const ditolak = String(item.ditolak || '')
      .trim()
      .toLowerCase();
    const masihProses = String(item.masih_proses || '')
      .trim()
      .toLowerCase();
    if (diterima === 'ya' || diterima === 'true' || diterima === '1') return 'Diterima';
    if (ditolak === 'ya' || ditolak === 'true' || ditolak === '1') return 'Ditolak';
    if (masihProses === 'ya' || masihProses === 'true' || masihProses === '1')
      return 'Masih Dalam Proses';
    return 'Masih Dalam Proses';
  };

  return [
    makeHeading1('Lampiran 8 — Pedoman No 13 Reviu Usulan Risiko Baru'),
    makeSmallNote(
      'Lampiran ini menyajikan hasil reviu usulan risiko baru sesuai Pedoman No 13. ' +
        'Untuk menjaga keterbacaan, lampiran dipecah menjadi dua tabel: ' +
        'Lampiran 8.1 menyajikan ringkasan status dan keputusan reviu, ' +
        'sedangkan Lampiran 8.2 menyajikan alasan penolakan dan keterangan tambahan per risiko.',
    ),

    makeHeading2('Lampiran 8.1 — Ringkasan Status Reviu Usulan Risiko'),
    makeSmallNote(`Total usulan risiko yang direviu: ${rows.length} usulan.`),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Nama Risiko',
        'Status Revisi',
        'Keputusan Reviu',
        'Hasil Reviu',
      ],
      widths: [5, 16, 35, 14, 15, 15],
      fontSize: 12,
      rows: rows.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.nama_risiko),
        safeFilledText(item.status_revisi, 'Masih Dalam Proses'),
        safeFilledText(item.keputusan_reviu, 'Masih Dalam Proses'),
        resolveHasilReviu(item),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 8.2 — Detail Alasan dan Keterangan Reviu'),
    makeSmallNote(
      'Kolom Alasan Ditolak diisi apabila keputusan reviu adalah Ditolak. ' +
        'Kolom Keterangan memuat catatan tambahan dari proses reviu usulan risiko.',
    ),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Nama Risiko', 'Alasan Ditolak', 'Keterangan'],
      widths: [5, 16, 30, 24, 25],
      fontSize: 12,
      rows: rows.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        safeFilledText(item.nama_risiko),
        safeText(item.alasan_ditolak, '-'),
        safeFilledText(item.keterangan_reviu, 'Belum Tersedia'),
      ]),
    }),
  ];
};

const buildLampiranPedoman14PengendalianBelumTerealisasi = ({ report }) => {
  const section = getSection(report, 'pedoman_no_14_pengendalian_belum_terealisasi');
  const rows = section.rows || report.lampiran?.pengendalian_belum_terealisasi?.rows || [];
  const fallbackMessage =
    section.fallback_message ||
    report.lampiran?.pengendalian_belum_terealisasi?.fallback_message ||
    'Tidak terdapat pengendalian yang belum terealisasi dalam cakupan laporan.';

  const formatTargetWaktu = (value) => {
    if (!value) return 'Belum Tersedia';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return safeText(value);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jayapura',
    }).format(date);
  };

  return [
    makeHeading1('Lampiran 9 — Pedoman No 14 Pengendalian Belum Terealisasi'),
    makeSmallNote(
      'Lampiran ini menyajikan pengendalian yang belum terealisasi sesuai Pedoman No 14. ' +
        'Untuk menjaga keterbacaan, lampiran dipecah menjadi dua tabel: ' +
        'Lampiran 9.1 menyajikan ringkasan status pengendalian, ' +
        'sedangkan Lampiran 9.2 menyajikan kendala, keterangan, dan tindak lanjut per kegiatan.',
    ),

    ...(rows.length
      ? [
          makeHeading2('Lampiran 9.1 — Ringkasan Status Pengendalian Belum Terealisasi'),
          makeSmallNote(`Total pengendalian belum terealisasi: ${rows.length} kegiatan.`),
          makeTable({
            headers: [
              'No',
              'Kode Risiko',
              'Nama Risiko',
              'Kegiatan Pengendalian',
              'Penanggung Jawab',
              'Target Waktu',
              'Progress',
              'Status Realisasi',
            ],
            widths: [5, 14, 20, 22, 14, 12, 7, 13],
            fontSize: 12,
            rows: rows.map((item, index) => [
              index + 1,
              formatRiskCodeDisplayForWord(item.kode_risiko),
              safeFilledText(item.nama_risiko),
              safeFilledText(item.kegiatan_pengendalian),
              safeFilledText(item.penanggung_jawab),
              formatTargetWaktu(item.target_waktu),
              `${safeNumber(item.progress_persen)}%`,
              safeFilledText(item.status_realisasi, 'Belum Selesai'),
            ]),
          }),

          makeSpacer(),

          makeHeading2('Lampiran 9.2 — Kendala, Keterangan, dan Tindak Lanjut'),
          makeSmallNote(
            'Kolom Kendala memuat hambatan pelaksanaan pengendalian. ' +
              'Kolom Keterangan Belum Terealisasi memuat penjelasan mengapa kegiatan belum selesai. ' +
              'Kolom Tindak Lanjut memuat rencana atau langkah yang akan dilakukan.',
          ),
          makeTable({
            headers: [
              'No',
              'Kode Risiko',
              'Nama Risiko',
              'Kendala',
              'Keterangan Belum Terealisasi',
              'Tindak Lanjut',
            ],
            widths: [5, 14, 22, 20, 22, 22],
            fontSize: 12,
            rows: rows.map((item, index) => [
              index + 1,
              formatRiskCodeDisplayForWord(item.kode_risiko),
              safeFilledText(item.nama_risiko),
              safeFilledText(item.kendala, '-'),
              safeFilledText(item.keterangan_belum_terealisasi, '-'),
              safeFilledText(item.tindak_lanjut, '-'),
            ]),
          }),
        ]
      : [makeSmallNote(fallbackMessage)]),
  ];
};

const formatPedoman15Cell = (value) => safeText(value, 'Belum Tersedia');

const formatPedoman15ScoreLevel = (score, level) => {
  const scoreText = safeText(score, 'Belum Tersedia');
  const levelText = safeText(level, 'Belum Tersedia');
  return `${scoreText} / ${levelText}`;
};

const buildLampiranPedoman15EfektivitasPengendalian = ({ report }) => {
  const rows = getSectionRows(
    report,
    'pedoman_no_15_efektivitas_pengendalian',
    report.lampiran?.efektivitas_pengendalian || [],
  );

  return [
    makeHeading1('Lampiran 10 — Pedoman No 15 Pemantauan Efektivitas Pengendalian'),
    makeSmallNote(
      'Lampiran ini menyajikan pemantauan efektivitas pengendalian sesuai Pedoman No 15. ' +
        'Untuk menjaga keterbacaan, lampiran dipecah menjadi tiga tabel: ' +
        'Lampiran 10.1 menyajikan identifikasi risiko dan pengendalian, ' +
        'Lampiran 10.2 menyajikan perbandingan nilai residu vs aktual dan deviasi, ' +
        'sedangkan Lampiran 10.3 menyajikan efektivitas, rekomendasi, dan keterangan.',
    ),

    makeHeading2('Lampiran 10.1 — Identifikasi Risiko dan Kegiatan Pengendalian'),
    makeSmallNote(`Total data pemantauan efektivitas: ${rows.length} entri.`),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Risiko yang Direspons',
        'Kode Penyebab 6M',
        'Akar Penyebab',
        'Kegiatan Pengendalian',
      ],
      widths: [5, 14, 24, 12, 22, 23],
      fontSize: 12,
      rows: rows.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        formatPedoman15Cell(item.risiko_yang_direspons),
        formatPedoman15Cell(item.kode_penyebab_6m),
        formatPedoman15Cell(item.akar_penyebab),
        formatPedoman15Cell(item.kegiatan_pengendalian),
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 10.2 — Perbandingan Nilai Residu, Aktual, dan Deviasi'),
    makeSmallNote(
      'Kolom Residu menunjukkan nilai risiko setelah pengendalian direncanakan. ' +
        'Kolom Aktual menunjukkan nilai risiko yang terjadi sesungguhnya. ' +
        'Kolom Deviasi menunjukkan selisih antara residu dan aktual.',
    ),
    makeTable({
      headers: [
        'No',
        'Kode Risiko',
        'Residu (Frek / Dampak / Skor / Level)',
        'Aktual (Frek / Dampak / Skor / Level)',
        'Deviasi (Skor / Level)',
      ],
      widths: [5, 14, 30, 30, 21],
      fontSize: 12,
      rows: rows.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        `${formatPedoman15Cell(item.residual_likelihood)} / ${formatPedoman15Cell(item.residual_impact)} / ${formatPedoman15ScoreLevel(item.residual_score, item.residual_level)}`,
        `${formatPedoman15Cell(item.actual_likelihood)} / ${formatPedoman15Cell(item.actual_impact)} / ${formatPedoman15ScoreLevel(item.actual_score, item.actual_level)}`,
        `${formatPedoman15Cell(item.deviasi_score)} / ${formatPedoman15Cell(item.deviasi_level)}`,
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 10.3 — Efektivitas, Rekomendasi, dan Keterangan'),
    makeSmallNote(
      'Kolom Efektivitas menunjukkan penilaian efektivitas pengendalian berdasarkan perbandingan residu dan aktual. ' +
        'Kolom Rekomendasi memuat saran tindak lanjut. ' +
        'Kolom Keterangan memuat catatan tambahan dari proses pemantauan.',
    ),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Efektivitas Pengendalian', 'Rekomendasi', 'Keterangan'],
      widths: [5, 14, 20, 32, 29],
      fontSize: 12,
      rows: rows.map((item, index) => [
        index + 1,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        formatPedoman15Cell(item.efektivitas_pengendalian),
        formatPedoman15Cell(item.rekomendasi),
        formatPedoman15Cell(item.keterangan),
      ]),
    }),
  ];
};

const buildLampiranKejadian = ({ kejadianRisiko = [] }) => {
  const rows = kejadianRisiko.length
    ? kejadianRisiko.map((item, index) => ({
        no: index + 1,
        kode_risiko: formatRiskCodeDisplayForWord(item.kode_risiko),
        nama_risiko: item.nama_risiko,
        tanggal_monitoring: formatDate(item.monitoring_date),
        terjadi_risiko: item.terjadi_risiko ? 'Ya' : 'Tidak',
        uraian_kejadian: safeFilledText(item.uraian_kejadian),
        tindak_lanjut: safeFilledText(item.tindak_lanjut_kejadian),
      }))
    : [
        {
          no: 1,
          kode_risiko: 'Tidak ada',
          nama_risiko: 'Tidak ada kejadian risiko',
          tanggal_monitoring: 'Tidak ada',
          terjadi_risiko: 'Tidak',
          uraian_kejadian: 'Tidak terdapat kejadian risiko aktual dalam cakupan laporan.',
          tindak_lanjut:
            'Tidak ada tindak lanjut kejadian risiko karena tidak terdapat kejadian risiko aktual.',
        },
      ];

  return [
    makeHeading1('Lampiran 7 — Daftar Kejadian Risiko'),
    ...makeLampiranIntro(
      'Daftar kejadian risiko dipecah menjadi ringkasan kejadian dan uraian tindak lanjut agar kolom tidak terlalu sempit.',
    ),

    makeHeading2('Lampiran 7A — Ringkasan Kejadian Risiko'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Nama Risiko', 'Tanggal Monitoring', 'Terjadi Risiko'],
      widths: [6, 20, 40, 18, 16],
      fontSize: 15,
      rows: rows.map((item) => [
        item.no,
        formatRiskCodeDisplayForWord(item.kode_risiko),
        item.nama_risiko,
        item.tanggal_monitoring,
        item.terjadi_risiko,
      ]),
    }),

    makeSpacer(),

    makeHeading2('Lampiran 7B — Uraian Kejadian dan Tindak Lanjut'),
    makeTable({
      headers: ['No', 'Kode Risiko', 'Uraian Kejadian', 'Tindak Lanjut'],
      widths: [6, 18, 38, 38],
      fontSize: 14,
      rows: rows.map((item) => [
        item.no,
        item.kode_risiko,
        item.uraian_kejadian,
        item.tindak_lanjut,
      ]),
    }),
  ];
};

const buildConclusionSection = ({ summary }) => [
  makeHeading1('8. Kesimpulan'),
  makeParagraph(
    `Berdasarkan hasil pemantauan Manajemen Risiko, telah teridentifikasi ${safeNumber(
      summary.total_risiko,
    )} risiko. Sebanyak ${safeNumber(
      summary.total_risiko_di_atas_selera,
    )} risiko berada di atas selera risiko. Jumlah kegiatan pengendalian yang direncanakan sebanyak ${safeNumber(
      summary.total_kegiatan_pengendalian,
    )} kegiatan, dengan realisasi pengendalian sebanyak ${safeNumber(
      summary.total_pengendalian_terealisasi,
    )} kegiatan dan rata-rata progress ${safeNumber(summary.rata_rata_progress)}%. Jumlah kejadian risiko dalam cakupan laporan sebanyak ${safeNumber(
      summary.total_kejadian_risiko,
    )} kejadian.`,
  ),

  makeHeading1('9. Rekomendasi'),
  makeParagraph(
    'Perangkat daerah perlu melanjutkan pemantauan berkala, memperkuat koordinasi pelaksana, melengkapi bukti pelaksanaan pengendalian, dan memastikan tindak lanjut pengendalian risiko dilaksanakan pada tindak lanjut berikutnya.',
  ),
];

const buildWordDocument = async (contextId) => {
  const report = await reportQueryService.getFullReport(contextId);

  const { context, context_items: contextItems, summary, narasi, lampiran } = report;

    const mainChildren = [
      ...buildCoverAndIntro({ context, contextItems }),
      ...buildContextSection({ context, contextItems, report }),
      ...buildDataQualityWarningSection(report),
      ...buildSummarySection({ summary, contextItems }),
      ...buildNarrativeSection({
        narasi,
        daftarRisiko: lampiran.daftar_risiko || [],
        context,
        summary,
      }),
      ...buildFinalPedomanSummarySection(report),
      ...buildConclusionSection({ summary }),

      makeHeading1('10. Daftar Lampiran'),
      makeParagraph(
        'Lampiran berikut merupakan ringkasan data Manajemen Risiko yang dihasilkan dari proses pengelolaan risiko terpadu. Untuk menjaga keterbacaan dokumen, beberapa lampiran disajikan pada halaman landscape dan tabel yang terlalu lebar dipecah menjadi tabel ringkasan dan tabel detail.',
      ),
    ];

  const lampiranChildren = [
    ...buildLampiranRisiko({
      daftarRisiko: lampiran.daftar_risiko || [],
      generatedSections: lampiran.generated_sections || {},
      report,
    }),
    makeSpacer(),

    ...buildLampiranAnalisis({
      analisisRisiko: lampiran.analisis_risiko || [],
      daftarRisiko: lampiran.daftar_risiko || [],
    }),
    makeSpacer(),

    ...buildLampiranRca({
      rootCauseAnalysis: lampiran.root_cause_analysis || [],
    }),
    makeSpacer(),

    ...buildLampiranPrioritas({
      risikoPrioritas: lampiran.risiko_prioritas || [],
      contextSeleraRisiko: context?.selera_risiko ?? null,
    }),
    makeSpacer(),

    ...buildLampiranRtp({
      rencanaPengendalian: lampiran.rencana_pengendalian || [],
      context,
    }),
    makeSpacer(),

    ...buildLampiranRealisasi({
      realisasiPengendalian: lampiran.realisasi_pengendalian || [],
      context,
    }),
    makeSpacer(),

    ...buildLampiranMonitoringLevel({
      monitoringLevelRisiko: lampiran.monitoring_level_risiko || [],
    }),
    makeSpacer(),

    ...buildLampiranPedoman13ReviuUsulanRisiko({
      report,
    }),
    makeSpacer(),

    ...buildLampiranPedoman14PengendalianBelumTerealisasi({
      report,
    }),
    makeSpacer(),

    ...buildLampiranPedoman15EfektivitasPengendalian({
      report,
    }),
    makeSpacer(),

    ...buildLampiranKejadian({
      kejadianRisiko: lampiran.kejadian_risiko || [],
    }),
  ];

  const approvalGate = getReportApprovalGate(report);

  const closingChildren = [
    makeHeading1('11. Penutup'),
    makeParagraph(
      'Laporan Manajemen Risiko Terpadu ini disusun sebagai dokumentasi hasil pengelolaan risiko, evaluasi, dan tindak lanjut pengendalian risiko pada perangkat daerah. Laporan ini menjadi bahan bagi Pemilik Risiko dan pejabat terkait dalam memperkuat pengendalian, meningkatkan akuntabilitas, serta mendukung pencapaian tujuan perangkat daerah.',
    ),
    makeParagraph(getDocumentStatusNote(report), {
      bold: true,
    }),
    makeKeyValueTable([
      ['Status Dokumen', safeText(approvalGate.document_status_label)],
      ['Risiko Disetujui', safeText(approvalGate.approved_count)],
      ['Risiko Belum Disetujui', safeText(approvalGate.not_approved_count)],
      ['Catatan Persetujuan', cleanApprovalNoteForWord(approvalGate.closing_note)],
    ]),

    makeSpacer(),

    makeParagraph(`Sofifi, ${formatIndonesianReportDate()}`, {
      alignment: AlignmentType.RIGHT,
    }),
    makeParagraph('KEPALA DINAS PANGAN', {
      alignment: AlignmentType.RIGHT,
      bold: true,
    }),
    makeParagraph('PROVINSI MALUKU UTARA', {
      alignment: AlignmentType.RIGHT,
      bold: true,
    }),
    makeParagraph(`\n\n\n${getSigningOfficialName(context)}`, {
      alignment: AlignmentType.RIGHT,
      bold: true,
    }),
    makeParagraph(`NIP. ${getSigningOfficialNip(context)}`, {
      alignment: AlignmentType.RIGHT,
    }),
  ];

  const doc = new Document({
    creator: 'Dinas Pangan Provinsi Maluku Utara',
    title: `Laporan Manajemen Risiko Terpadu ${safeText(context.nama_opd)} Tahun ${safeText(context.tahun)}`,
    description: 'Laporan Manajemen Risiko Terpadu Dinas Pangan Provinsi Maluku Utara.',
    sections: [
      {
        properties: {
          page: PORTRAIT_PAGE,
        },
        children: mainChildren,
      },
      {
        properties: {
          page: LANDSCAPE_PAGE,
        },
        children: lampiranChildren,
      },
      {
        properties: {
          page: PORTRAIT_PAGE,
        },
        children: closingChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return {
    buffer,
    filename: buildReportFilename(report, 'docx'),
    report,
  };
};

module.exports = {
  buildWordDocument,
};

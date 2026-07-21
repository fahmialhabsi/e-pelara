// frontend/src/pages/mr/MrPlanningRiskForm.jsx
/* eslint-disable react/prop-types */

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Modal,
} from 'antd';
import { ArrowLeftOutlined, AuditOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from '@/services/mrPlanningRiskService';

import RenstraSelector from '@/features/mr/components/RenstraSelector';

import api from '@/services/api';

import AuthContext from '@/contexts/authContext';
import useDirtyFormGuard from '@/features/mr/hooks/useDirtyFormGuard';
import { useMrDirtyGuard } from '@/features/mr/hooks/useMrDirtyGuard';
import { MrConfirmSubmitDialog } from '@/features/mr/components/MrConfirmSubmitDialog';
import RiskContextForm from './RiskContextForm';

const { Title, Text } = Typography;
const { TextArea } = Input;

const LIST_PATH = '/mr/planning-risk';

const STATUS_COLOR_MAP = {
  draft: 'default',
  verifikasi: 'processing',
  approved: 'success',
  ditolak: 'error',
};

const STATUS_LABEL_MAP = {
  draft: 'DRAFT',
  verifikasi: 'VERIFIKASI',
  approved: 'APPROVED',
  ditolak: 'DITOLAK',
};

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR']);
const PLACEHOLDER_PATTERNS = [
  /^isi\s+.+$/i,
  /^todo$/i,
  /^tbd$/i,
  /^xxx+$/i,
  /^---+$/i,
  /^\.\.\.*$/,
];

const LEVEL_RISIKO_OPTIONS = [
  { label: 'Rendah', value: 'rendah' },
  { label: 'Sedang', value: 'sedang' },
  { label: 'Tinggi', value: 'tinggi' },
  { label: 'Ekstrem', value: 'ekstrem' },
];

const EDITABLE_STATUSES = new Set(['draft', 'ditolak']);

const PROPOSAL_SOURCE = {
  RENSTRA: 'RENSTRA',
  LAKIP: 'LAKIP',
  LAPORAN_KEUANGAN: 'LAPORAN_KEUANGAN',
  TINDAK_LANJUT_BPK: 'TINDAK_LANJUT_BPK',
  TINDAK_LANJUT_INSPEKTORAT: 'TINDAK_LANJUT_INSPEKTORAT',
  TINDAK_LANJUT_BPKP: 'TINDAK_LANJUT_BPKP',
  PELAKSANAAN_KEGIATAN: 'PELAKSANAAN_KEGIATAN',
  PERTANGGUNGJAWABAN_KEUANGAN: 'PERTANGGUNGJAWABAN_KEUANGAN',
  SPIP_E_SIGAP: 'SPIP_E_SIGAP',
  MANUAL_ADHOC: 'MANUAL_ADHOC',
  LAINNYA: 'LAINNYA',
};

const isRenstraSource = (value) => String(value || '').toUpperCase() === PROPOSAL_SOURCE.RENSTRA;

const isCustomSource = (value) => String(value || '').toUpperCase() === PROPOSAL_SOURCE.LAINNYA;

const isPlaceholderText = (value) => {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
};

const MONTH_OPTIONS = [
  { label: 'Januari', value: 1 },
  { label: 'Februari', value: 2 },
  { label: 'Maret', value: 3 },
  { label: 'April', value: 4 },
  { label: 'Mei', value: 5 },
  { label: 'Juni', value: 6 },
  { label: 'Juli', value: 7 },
  { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 },
  { label: 'Oktober', value: 10 },
  { label: 'November', value: 11 },
  { label: 'Desember', value: 12 },
];

const QUARTER_OPTIONS = [
  { label: 'Triwulan I', value: 1 },
  { label: 'Triwulan II', value: 2 },
  { label: 'Triwulan III', value: 3 },
  { label: 'Triwulan IV', value: 4 },
];

const SEMESTER_OPTIONS = [
  { label: 'Semester I', value: 1 },
  { label: 'Semester II', value: 2 },
];

const STATUS_TINDAK_LANJUT_OPTIONS = [
  { label: 'Belum Ditindaklanjuti', value: 'belum_ditindaklanjuti' },
  { label: 'Proses', value: 'proses' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Dalam Verifikasi', value: 'dalam_verifikasi' },
  { label: 'Tindak Lanjut Sebagian', value: 'tindak_lanjut_sebagian' },
  {
    label: 'Tidak Dapat Ditindaklanjuti',
    value: 'tidak_dapat_ditindaklanjuti',
  },
];

const STATUS_DOKUMEN_OPTIONS = [
  { label: 'Belum Lengkap', value: 'belum_lengkap' },
  { label: 'Proses Verifikasi', value: 'proses_verifikasi' },
  { label: 'Perlu Perbaikan', value: 'perlu_perbaikan' },
  { label: 'Lengkap', value: 'lengkap' },
  { label: 'Disetujui', value: 'disetujui' },
  { label: 'Ditolak', value: 'ditolak' },
];

const getFirstAvailable = (...values) => {
  return values.find((value) => value !== undefined && value !== null && value !== '');
};

const getActiveUserOrganization = (user = {}) => {
  const opdId = getFirstAvailable(
    user.opd_id,
    user.opdId,
    user.opd?.id,
    user.opd?.opd_id,
    user.organization?.opd_id,
    user.organization?.id,
    user.tenant?.opd_id,
  );

  const namaOpd = getFirstAvailable(
    user.nama_opd,
    user.opd_name,
    user.namaOPD,

    typeof user.opd === 'string' ? user.opd : undefined,
    user.opd?.nama_opd,
    user.opd?.nama,
    user.opd?.name,

    user.organization?.nama_opd,
    user.organization?.name,
    user.tenant?.nama_opd,
    user.tenant?.name,
  );

  const unitTerkait = getFirstAvailable(
    user.unit_terkait,
    user.nama_unit_kerja,
    user.unit_name,
    user.division_name,
    user.division?.nama_divisi,
    user.division?.name,
    user.bidang,
    user.jabatan,
  );

  return {
    opd_id: opdId ? Number(opdId) : undefined,
    nama_opd: namaOpd,
    unit_terkait: unitTerkait,
  };
};

const getActiveRenstraOpdOrganization = (renstraOpd = {}) => {
  const opdId = getFirstAvailable(
    renstraOpd.opd_id,
    renstraOpd.id_opd,
    renstraOpd.kode_opd,
    renstraOpd.opd?.id,
    renstraOpd.opd?.opd_id,
    renstraOpd.organization?.opd_id,
    renstraOpd.organization?.id,
  );

  const namaOpd = getFirstAvailable(
    renstraOpd.nama_opd,
    renstraOpd.opd_name,
    renstraOpd.namaOPD,
    renstraOpd.opd?.nama_opd,
    renstraOpd.opd?.nama,
    renstraOpd.opd?.name,
    renstraOpd.organization?.nama_opd,
    renstraOpd.organization?.name,
  );

  const unitTerkait = getFirstAvailable(
    renstraOpd.unit_terkait,
    renstraOpd.bidang_opd,
    renstraOpd.nama_bidang_opd,
    renstraOpd.nama_unit_kerja,
    renstraOpd.unit_name,
    renstraOpd.division_name,
    renstraOpd.division?.nama_divisi,
    renstraOpd.division?.name,
  );

  return {
    opd_id: opdId ? Number(opdId) : undefined,
    nama_opd: namaOpd,
    unit_terkait: unitTerkait,
  };
};

const buildPeriodeLabel = ({ tahun, periodeType, bulan, triwulan, semester }) => {
  const year = Number(tahun || 0);
  const type = String(periodeType || '').toLowerCase();

  if (!year || !type) return undefined;

  if (type === 'bulanan') {
    const month = MONTH_OPTIONS.find((item) => Number(item.value) === Number(bulan));
    return month ? `${month.label} ${year}` : undefined;
  }

  if (type === 'triwulan') {
    const quarter = QUARTER_OPTIONS.find((item) => Number(item.value) === Number(triwulan));
    return quarter ? `${quarter.label} ${year}` : undefined;
  }

  if (type === 'semester') {
    const semesterItem = SEMESTER_OPTIONS.find((item) => Number(item.value) === Number(semester));
    return semesterItem ? `${semesterItem.label} ${year}` : undefined;
  }

  if (type === 'tahunan') return `Tahun ${year}`;

  if (type === 'adhoc') return `Adhoc ${year}`;

  return undefined;
};

const formatDateYmd = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getPeriodEndDate = ({ tahun, periodeType, bulan, triwulan, semester }) => {
  const year = Number(tahun || 0);
  const type = String(periodeType || '').toLowerCase();

  if (!year) return undefined;

  if (type === 'bulanan' && bulan) {
    return formatDateYmd(new Date(Date.UTC(year, Number(bulan), 0)));
  }

  if (type === 'triwulan' && triwulan) {
    const endMonth = Number(triwulan) * 3;
    return formatDateYmd(new Date(Date.UTC(year, endMonth, 0)));
  }

  if (type === 'semester' && semester) {
    const endMonth = Number(semester) === 1 ? 6 : 12;
    return formatDateYmd(new Date(Date.UTC(year, endMonth, 0)));
  }

  if (type === 'tahunan' || type === 'adhoc') {
    return `${year}-12-31`;
  }

  return undefined;
};

const sentenceTrim = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.endsWith('.') ? text.slice(0, -1) : text;
};

const getStatusTindakLanjutLabel = (value) => {
  const selected = STATUS_TINDAK_LANJUT_OPTIONS.find(
    (item) => String(item.value) === String(value),
  );

  return selected?.label || value || '';
};

const normalizeLongText = (value) =>
  String(value || '')
    .replaceAll('\r', '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

const cleanFindingHeading = (value) =>
  sentenceTrim(value)
    .replace(/\bhalaman\s*:.*$/gi, '')
    .replace(/\bparaf\s*:.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractFindingProblemHeadings = (summary = '') => {
  const text = normalizeLongText(summary);

  if (!text) return [];

  const headings = Array.from(text.matchAll(/(?:^|\n)\s*[a-z]\.\s+([^\n]+)/gi))
    .map((match) => cleanFindingHeading(match[1]))
    .filter(Boolean)
    .filter((item) => item.length >= 10)
    .slice(0, 5);

  return [...new Set(headings)];
};

const inferRecommendationActions = ({ title = '', summary = '' }) => {
  const sourceText = `${title}\n${summary}`.toLowerCase();
  const actions = [];

  const addAction = (condition, action) => {
    if (condition && !actions.includes(action)) {
      actions.push(action);
    }
  };

  addAction(
    sourceText.includes('belum ditetapkan') ||
      sourceText.includes('peraturan gubernur') ||
      sourceText.includes('belum diatur') ||
      sourceText.includes('mekanisme') ||
      sourceText.includes('petunjuk teknis'),
    'menetapkan regulasi, mekanisme, atau petunjuk teknis yang menjadi dasar pelaksanaan tindak lanjut',
  );

  addAction(
    sourceText.includes('cadangan minimum') ||
      sourceText.includes('belum memenuhi') ||
      sourceText.includes('selisih') ||
      sourceText.includes('target minimal') ||
      sourceText.includes('kebutuhan minimum'),
    'menyusun pemenuhan target minimum secara bertahap berdasarkan kemampuan anggaran dan prioritas risiko',
  );

  addAction(
    sourceText.includes('pengadaan') ||
      sourceText.includes('apbd') ||
      sourceText.includes('anggaran') ||
      sourceText.includes('mitra') ||
      sourceText.includes('kerja sama'),
    'memperkuat perencanaan pengadaan, dukungan anggaran, dan skema kerja sama yang realistis',
  );

  addAction(
    sourceText.includes('penyaluran') ||
      sourceText.includes('pelepasan') ||
      sourceText.includes('fsva') ||
      sourceText.includes('gejolak harga') ||
      sourceText.includes('bencana'),
    'menyusun mekanisme penyaluran berbasis kebutuhan, indikator kerawanan pangan, kondisi darurat, dan gejolak harga',
  );

  addAction(
    sourceText.includes('dokumen') ||
      sourceText.includes('bukti') ||
      sourceText.includes('administrasi') ||
      sourceText.includes('kelengkapan'),
    'melengkapi dokumen pendukung dan bukti tindak lanjut sesuai ketentuan',
  );

  addAction(
    sourceText.includes('monitoring') ||
      sourceText.includes('pemantauan') ||
      sourceText.includes('belum optimal') ||
      sourceText.includes('tidak optimal'),
    'melakukan monitoring progres secara berkala sampai tindak lanjut dinyatakan selesai',
  );

  if (actions.length === 0) {
    actions.push(
      'menyusun rencana aksi perbaikan yang terukur sesuai pokok kondisi dalam temuan',
      'menetapkan PIC, target waktu, dokumen pendukung, dan mekanisme monitoring penyelesaian',
    );
  }

  return actions.slice(0, 5);
};

const buildProfessionalFindingRecommendation = ({
  findingNo,
  findingTitle,
  findingSummary,
  tindakLanjutStatus,
}) => {
  const problemHeadings = extractFindingProblemHeadings(findingSummary);
  const actions = inferRecommendationActions({
    title: findingTitle,
    summary: findingSummary,
  });

  const problemClause =
    problemHeadings.length > 0
      ? ` dengan memperhatikan pokok masalah: ${problemHeadings.join('; ')}`
      : '';

  const actionClause = actions.join('; ');

  return `Menindaklanjuti ${
    findingNo ? `temuan ${findingNo} terkait ` : ''
  }${findingTitle} dengan status tindak lanjut ${String(
    tindakLanjutStatus || 'berjalan',
  ).toLowerCase()}${problemClause}. Rekomendasi tindak lanjut diarahkan untuk ${actionClause}. Setiap langkah perlu dilengkapi dengan PIC, target waktu, bukti pendukung, dan monitoring progres sampai temuan dinyatakan selesai.`;
};

const getRiskObjectDraft = ({ sourceCode, values }) => {
  if (
    sourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_BPK ||
    sourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT ||
    sourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_BPKP
  ) {
    return (
      values.objek_risiko ||
      values.judul_temuan ||
      values.ringkasan_temuan ||
      'Tindak lanjut hasil pemeriksaan/pengawasan'
    );
  }

  if (sourceCode === PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN) {
    return (
      values.objek_risiko ||
      values.nama_kegiatan ||
      values.output_kegiatan ||
      'Pelaksanaan kegiatan'
    );
  }

  if (sourceCode === PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN) {
    return (
      values.objek_risiko ||
      values.jenis_dokumen_pertanggungjawaban ||
      values.jenis_transaksi ||
      'Pertanggungjawaban keuangan'
    );
  }

  if (sourceCode === PROPOSAL_SOURCE.LAPORAN_KEUANGAN) {
    return (
      values.objek_risiko ||
      values.akun_pos ||
      values.jenis_transaksi ||
      'Penyajian laporan keuangan'
    );
  }

  if (sourceCode === PROPOSAL_SOURCE.LAINNYA) {
    return (
      values.objek_risiko ||
      values.nama_kategori_baru ||
      values.contoh_sumber_risiko ||
      'Objek risiko kategori baru'
    );
  }

  return values.objek_risiko || values.nama_risiko || 'Objek risiko';
};

const getProposalSourceReadableLabel = (sourceCode) => {
  const map = {
    [PROPOSAL_SOURCE.TINDAK_LANJUT_BPK]: 'tindak lanjut BPK',
    [PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT]: 'tindak lanjut Inspektorat',
    [PROPOSAL_SOURCE.TINDAK_LANJUT_BPKP]: 'tindak lanjut BPKP',
    [PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN]: 'pelaksanaan kegiatan',
    [PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN]: 'pertanggungjawaban keuangan',
    [PROPOSAL_SOURCE.LAPORAN_KEUANGAN]: 'laporan keuangan',
    [PROPOSAL_SOURCE.LAKIP]: 'LAKIP',
    [PROPOSAL_SOURCE.SPIP_E_SIGAP]: 'SPIP/e-SIGAP',
    [PROPOSAL_SOURCE.MANUAL_ADHOC]: 'manual/adhoc',
    [PROPOSAL_SOURCE.LAINNYA]: 'kategori baru',
  };

  return map[sourceCode] || 'usulan risiko';
};

const isProposalIntakeDetail = (risk = {}) => {
  const stage = String(risk?.stage || '').toLowerCase();
  const sourceTable = String(risk?.source_table || '').toLowerCase();

  return (
    Boolean(risk?.proposal_source_type) ||
    sourceTable === 'proposal_intake' ||
    [
      'temuan_bpk',
      'temuan_inspektorat',
      'pelaksanaan_kegiatan',
      'pertanggungjawaban_keuangan',
      'laporan_keuangan',
      'lk',
      'lakip',
      'spip_e_sigap',
      'manual_adhoc',
      'lainnya',
    ].includes(stage)
  );
};

const getProposalTraceSourceLabel = (risk = {}) => {
  const sourceCode = String(risk?.proposal_source_type || '').toUpperCase();
  const stage = String(risk?.stage || '').toLowerCase();

  if (sourceCode) {
    return getProposalSourceReadableLabel(sourceCode);
  }

  const stageMap = {
    temuan_bpk: 'tindak lanjut BPK',
    temuan_inspektorat: 'tindak lanjut Inspektorat',
    pelaksanaan_kegiatan: 'pelaksanaan kegiatan',
    pertanggungjawaban_keuangan: 'pertanggungjawaban keuangan',
    laporan_keuangan: 'laporan keuangan',
    lk: 'laporan keuangan',
    lakip: 'LAKIP',
    spip_e_sigap: 'SPIP/e-SIGAP',
    manual_adhoc: 'manual/adhoc',
    lainnya: 'kategori baru',
  };

  return stageMap[stage] || 'proposal intake';
};

const renderReadonlyTraceItem = (label, value, options = {}) => {
  const { multiline = false, maxHeight = 140 } = options;
  const displayValue = value === undefined || value === null || value === '' ? '-' : String(value);

  return (
    <div style={{ padding: '6px 0', minHeight: 44 }}>
      <Text
        type="secondary"
        style={{
          fontSize: 12,
          display: 'block',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>

      <Text
        style={
          multiline
            ? {
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                display: 'block',
                maxHeight,
                overflowY: 'auto',
                paddingRight: 8,
              }
            : {
                lineHeight: 1.5,
                display: 'block',
              }
        }
      >
        {displayValue}
      </Text>
    </div>
  );
};

const NARRATIVE_DRAFT_FIELDS = [
  'rekomendasi',
  'objek_risiko',
  'nama_risiko',
  'uraian_risiko',
  'penyebab_risiko',
  'dampak_risiko',
  'rencana_tindak_lanjut_awal',
  'catatan',
];

const buildFrontendFallbackDraftFields = ({ sourceCode, values }) => {
  if (!sourceCode || sourceCode === PROPOSAL_SOURCE.RENSTRA) return {};

  const unit = values.unit_terkait || values.pic || values.nama_opd || 'unit terkait';

  /*
   * STEP 18C-1N GUARD:
   * Frontend tidak boleh mengarang target_waktu dari periode.
   * target_waktu boleh kosong dan diisi manual oleh user.
   *
   * Frontend hanya boleh memberi fallback non-substantif:
   * - pic
   *
   * Narasi utama wajib berasal dari backend Narrative Drafting Service:
   * POST /api/mr-planning-risk/proposal-narrative/preview
   */
  return cleanObject({
    pic: values.pic || unit,
  });
};

const isNarrativeDraftReadyInput = (values = {}) => {
  const sourceType = String(values.proposal_source_type || '').toUpperCase();

  if (!sourceType || sourceType === PROPOSAL_SOURCE.RENSTRA) {
    return false;
  }

  if (
    sourceType === PROPOSAL_SOURCE.TINDAK_LANJUT_BPK ||
    sourceType === PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT ||
    sourceType === PROPOSAL_SOURCE.TINDAK_LANJUT_BPKP
  ) {
    return Boolean(values.judul_temuan && values.ringkasan_temuan && values.status_tindak_lanjut);
  }

  if (sourceType === PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN) {
    return Boolean(values.nama_kegiatan || values.judul_temuan || values.objek_risiko);
  }

  if (sourceType === PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN) {
    return Boolean(
      values.jenis_dokumen_pertanggungjawaban ||
      values.akun_pos ||
      values.judul_temuan ||
      values.objek_risiko,
    );
  }

  if (sourceType === PROPOSAL_SOURCE.LAPORAN_KEUANGAN) {
    return Boolean(values.akun_pos || values.judul_temuan || values.objek_risiko);
  }

  if (sourceType === PROPOSAL_SOURCE.LAKIP) {
    return Boolean(values.objek_risiko || values.judul_temuan || values.ringkasan_temuan);
  }

  return Boolean(values.objek_risiko || values.judul_temuan || values.ringkasan_temuan);
};

const normalizeStatus = (value) => String(value || 'draft').toLowerCase();

const cleanObject = (payload) =>
  Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    }),
  );

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return 'Terjadi kesalahan saat memproses MR Planning Risk.';
};

const buildBackendDetail = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return null;

  const details = [];

  if (data.code) details.push(`Kode: ${data.code}`);
  if (data.blocked !== undefined) {
    details.push(`Blocked: ${String(data.blocked)}`);
  }
  if (data.audit_mode !== undefined) {
    details.push(`Audit Mode: ${String(data.audit_mode)}`);
  }
  if (Array.isArray(data.missing_fields) && data.missing_fields.length) {
    details.push(`Missing fields: ${data.missing_fields.join(', ')}`);
  }
  if (Array.isArray(data.blocked_fields) && data.blocked_fields.length) {
    details.push(`Blocked fields: ${data.blocked_fields.join(', ')}`);
  }
  if (Array.isArray(data.details) && data.details.length) {
    details.push(`Details: ${data.details.join(', ')}`);
  }

  return details.length ? details.join(' | ') : null;
};

const getNarrativePreviewSafeErrorMessage = (error) => {
  const statusCode = error?.response?.status;
  const data = error?.response?.data;

  if (statusCode === 400 && Array.isArray(data?.missing_fields)) {
    return 'Data dasar belum lengkap. Lengkapi input utama lalu coba buat draft kembali.';
  }

  if (statusCode === 400 && Array.isArray(data?.blocked_fields)) {
    return 'Payload preview tidak sesuai guard sistem. Periksa input dan coba kembali.';
  }

  if (statusCode === 502) {
    return 'Draft narasi belum dapat dibuat oleh sistem. Coba kembali atau lanjutkan pengisian manual.';
  }

  if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
    return 'Pembuatan draft membutuhkan waktu terlalu lama. Coba kembali atau lanjutkan pengisian manual.';
  }

  return 'Draft narasi belum dapat dibuat. Periksa input utama dan coba kembali.';
};

const getNarrativePreviewSuccessMessage = (meta = {}) => {
  if (meta?.fallback_used) {
    return 'Draft dibuat menggunakan mode aman sistem. Mohon review dan sesuaikan sebelum disimpan.';
  }

  return 'Draft narasi otomatis berhasil dibuat. Mohon review dan sesuaikan sebelum disimpan.';
};

const getDuplicateGuardFromResponse = (response) => {
  const data = response?.data || response || null;
  const riskData = data?.data || data || null;

  const duplicateGuard = riskData?.duplicate_guard || null;

  if (!duplicateGuard?.has_duplicate) {
    return null;
  }

  return {
    ...duplicateGuard,
    duplicate_warning:
      riskData?.duplicate_warning ||
      duplicateGuard.message ||
      'Sumber usulan/temuan ini terindikasi sudah pernah dibuat sebagai risiko MR.',
    duplicate_risks: Array.isArray(duplicateGuard.duplicate_risks)
      ? duplicateGuard.duplicate_risks
      : [],
  };
};

const calculateRiskScorePreview = (kemungkinan, dampak) => {
  const k = Number(kemungkinan || 0);
  const d = Number(dampak || 0);

  if (!k || !d) return undefined;

  return k * d;
};

const calculateRiskLevelPreview = (score) => {
  const nilai = Number(score || 0);

  if (!nilai) return undefined;
  if (nilai <= 4) return 'rendah';
  if (nilai <= 9) return 'sedang';
  if (nilai <= 16) return 'tinggi';

  return 'ekstrem';
};

const buildPayload = (values = {}) => {
  // Guard STEP R13A:
  // Frontend hanya boleh mengirim context_item_id sebagai selector sumber
  // perencanaan. Field teknis seperti stage/ref_id/indikator_id tetap
  // dimapping backend dari context item.
  const businessPayload = {
    context_item_id: values.context_item_id,

    nama_risiko: values.nama_risiko,
    uraian_risiko: values.uraian_risiko,
    risk_statement: values.risk_statement,

    kategori_risiko_ref_id: values.kategori_risiko_ref_id,
    sumber_risiko_ref_id: values.sumber_risiko_ref_id,

    penyebab_risiko: values.penyebab_risiko,
    dampak_risiko: values.dampak_risiko,

    kemungkinan_ref_id: values.kemungkinan_ref_id,
    dampak_ref_id: values.dampak_ref_id,

    selera_risiko_ref_id: values.selera_risiko_ref_id,
    status_risiko_ref_id: values.status_risiko_ref_id,

    metode_pencapaian_tujuan_spip: values.metode_pencapaian_tujuan_spip,
    alasan_revisi: values.alasan_revisi,
  };

  return cleanObject(businessPayload);
};

const buildProposalIntakePayload = (values = {}) => {
  const payload = {
    proposal_source_type: values.proposal_source_type,
    proposal_source_ref_id: values.proposal_source_ref_id,

    tahun: values.tahun,
    periode_type: values.periode_type,
    periode_label: values.periode_label,
    opd_id: values.opd_id,
    nama_opd: values.nama_opd,
    unit_terkait: values.unit_terkait,

    nomor_temuan: values.nomor_temuan,
    judul_temuan: values.judul_temuan,
    tahun_pemeriksaan: values.tahun_pemeriksaan,
    tanggal_dokumen: values.tanggal_dokumen,
    ringkasan_temuan: values.ringkasan_temuan,
    rekomendasi: values.rekomendasi,
    status_tindak_lanjut: values.status_tindak_lanjut,
    nilai_temuan: values.nilai_temuan,

    akun_pos: values.akun_pos,
    jenis_transaksi: values.jenis_transaksi,
    nilai_transaksi: values.nilai_transaksi,
    jenis_dokumen_pertanggungjawaban: values.jenis_dokumen_pertanggungjawaban,
    status_dokumen: values.status_dokumen,
    catatan_koreksi: values.catatan_koreksi,

    nama_kegiatan: values.nama_kegiatan,
    tahapan_pelaksanaan: values.tahapan_pelaksanaan,
    lokasi: values.lokasi,
    output_kegiatan: values.output_kegiatan,
    kendala_pelaksanaan: values.kendala_pelaksanaan,
    target_pelaksanaan: values.target_pelaksanaan,

    nama_kategori_baru: values.nama_kategori_baru,
    deskripsi_kategori_baru: values.deskripsi_kategori_baru,
    is_renstra_related: values.is_renstra_related,
    mr_renstra_id: values.mr_renstra_id || null,
    mr_tujuan_id: values.mr_tujuan_id || null,
    mr_sasaran_id: values.mr_sasaran_id || null,
    mr_strategi_id: values.mr_strategi_id || null,
    mr_kebijakan_id: values.mr_kebijakan_id || null,
    mr_program_id: values.mr_program_id || null,
    mr_kegiatan_id: values.mr_kegiatan_id || null,
    mr_subkegiatan_id: values.mr_subkegiatan_id || null,
    mr_target_id: values.mr_target_id || null,
    alasan_pengajuan_kategori: values.alasan_pengajuan_kategori,
    contoh_sumber_risiko: values.contoh_sumber_risiko,

    objek_risiko: values.objek_risiko,
    nama_risiko: values.nama_risiko,
    uraian_risiko: values.uraian_risiko,
    risk_statement: values.risk_statement,
    penyebab_risiko: values.penyebab_risiko,
    dampak_risiko: values.dampak_risiko,

    kategori_risiko_ref_id: values.kategori_risiko_ref_id,
    sumber_risiko_ref_id: values.sumber_risiko_ref_id,
    kemungkinan_ref_id: values.kemungkinan_ref_id,
    dampak_ref_id: values.dampak_ref_id,
    selera_risiko_ref_id: values.selera_risiko_ref_id,
    status_risiko_ref_id: values.status_risiko_ref_id,

    rencana_tindak_lanjut_awal:
      values.rencana_tindak_lanjut_awal || values.metode_pencapaian_tujuan_spip,
    pic: values.pic,
    target_waktu: values.target_waktu,
    catatan: values.catatan,
    alasan_revisi: values.alasan_revisi,
  };

  return cleanObject(payload);
};

const getPrimaryContextItem = (context) => {
  const items = Array.isArray(context?.items) ? context.items : [];
  return items.find((item) => item.is_primary) || items[0] || null;
};

const getContextItemsFromResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const getRiskFormAccessState = ({ detail, isEditMode, isRevisiMode, isDetailMode }) => {
  const status = normalizeStatus(detail?.status_revisi);
  const isApproved = status === 'approved';
  const isEditableStatus = EDITABLE_STATUSES.has(status);

  const editModeBlocked = Boolean(detail) && isEditMode && !isEditableStatus;
  const revisiModeBlocked = Boolean(detail) && isRevisiMode && !isApproved;

  const isReadonly =
    isDetailMode ||
    editModeBlocked ||
    revisiModeBlocked ||
    (Boolean(detail) && isApproved && !isRevisiMode);

  return {
    status,
    isApproved,
    isEditableStatus,
    editModeBlocked,
    revisiModeBlocked,
    isReadonly,
  };
};

const useRiskFormWatchValues = (form) => {
  const selectedProposalSourceType = Form.useWatch('proposal_source_type', form);
  const selectedPeriodeType = Form.useWatch('periode_type', form);
  const selectedTahun = Form.useWatch('tahun', form);
  const selectedBulan = Form.useWatch('periode_bulan', form);
  const selectedTriwulan = Form.useWatch('periode_triwulan', form);
  const selectedSemester = Form.useWatch('periode_semester', form);

  const selectedContextId = Form.useWatch('context_id', form);
  const kemungkinanRefId = Form.useWatch('kemungkinan_ref_id', form);
  const dampakRefId = Form.useWatch('dampak_ref_id', form);
  const watchedObjekRisiko = Form.useWatch('objek_risiko', form);
  const watchedRingkasanTemuan = Form.useWatch('ringkasan_temuan', form);
  const watchedUraianRisiko = Form.useWatch('uraian_risiko', form);

  return {
    selectedProposalSourceType,
    selectedPeriodeType,
    selectedTahun,
    selectedBulan,
    selectedTriwulan,
    selectedSemester,
    selectedContextId,
    kemungkinanRefId,
    dampakRefId,
    watchedObjekRisiko,
    watchedRingkasanTemuan,
    watchedUraianRisiko,
  };
};

const useMrPlanningRiskFormEffects = ({
  form,
  detail,
  isCreateMode,
  isNonRenstraCreateSource,
  selectedSourceCode,
  selectedTahun,
  selectedPeriodeType,
  selectedBulan,
  selectedTriwulan,
  selectedSemester,
  selectedContextId,
  selectedContext,
  selectedContextItem,
  selectedLikelihoodItem,
  selectedImpactItem,
  activeProposalOrg,
  setAdvancedContextOpen,
  lastAutoDraftRef,
}) => {
  useEffect(() => {
    if (!isCreateMode) return;
    setAdvancedContextOpen([]);
  }, [isCreateMode, setAdvancedContextOpen]);

  useEffect(() => {
    if (!isNonRenstraCreateSource) return;

    const label = buildPeriodeLabel({
      tahun: selectedTahun,
      periodeType: selectedPeriodeType,
      bulan: selectedBulan,
      triwulan: selectedTriwulan,
      semester: selectedSemester,
    });

    const currentLabel = form.getFieldValue('periode_label');
    if (label && currentLabel !== label) {
      form.setFieldValue('periode_label', label);
    }
  }, [
    form,
    isNonRenstraCreateSource,
    selectedTahun,
    selectedPeriodeType,
    selectedBulan,
    selectedTriwulan,
    selectedSemester,
  ]);

  useEffect(() => {
    if (!isNonRenstraCreateSource) return;

    const current = form.getFieldsValue(true);
    const fallback = buildFrontendFallbackDraftFields({
      sourceCode: selectedSourceCode,
      values: current,
    });
    const previousFallback = lastAutoDraftRef.current || {};
    const nextValues = getAutoDraftNextValues({ current, fallback, previousFallback });

    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }

    lastAutoDraftRef.current = {
      ...previousFallback,
      ...fallback,
    };
  }, [
    form,
    isNonRenstraCreateSource,
    selectedSourceCode,
    selectedTahun,
    selectedPeriodeType,
    selectedBulan,
    selectedTriwulan,
    selectedSemester,
    selectedContextId,
  ]);

  useEffect(() => {
    if (!isCreateMode || !selectedContextId || !detail) return;

    if (isRenstraCreateSource) return;

    form.setFieldsValue({
      context_id: detail.context_id,
      context_item_id: detail.context_item_id || detail.context_item?.id || null,
      periode_id: detail.periode_id || detail.context_item?.periode_id || null,
      tahun: detail.tahun || detail.context_item?.tahun || null,
      jenis_dokumen: detail.jenis_dokumen || detail.context_item?.jenis_dokumen || null,
      renstra_id: detail.renstra_id || detail.context_item?.renstra_id || null,
      opd_id: detail.opd_id || detail.context_item?.opd_id || null,
      stage: detail.stage || detail.context_item?.stage || null,
      ref_id: detail.ref_id || detail.context_item?.ref_id || null,
      indikator_id: detail.indikator_id || detail.context_item?.indikator_id || null,
      source_table: detail.source_table || detail.context_item?.source_table || null,
      source_id:
        detail.source_id || detail.context_item?.source_id || detail.context_item?.id || null,
      owner_user_id: detail.owner_user_id || null,
      owner_division_id: detail.owner_division_id || null,
    });

    lastAutoDraftRef.current = {};
    setAdvancedContextOpen([]);
  }, [form, isCreateMode, selectedContextId, detail, setAdvancedContextOpen, lastAutoDraftRef]);

  useEffect(() => {
    if (!isNonRenstraCreateSource) return;

    const current = form.getFieldsValue(true);
    const nextValues = {};

    if (activeProposalOrg.opd_id && current.opd_id !== activeProposalOrg.opd_id) {
      nextValues.opd_id = activeProposalOrg.opd_id;
    }
    if (activeProposalOrg.nama_opd && current.nama_opd !== activeProposalOrg.nama_opd) {
      nextValues.nama_opd = activeProposalOrg.nama_opd;
    }
    if (activeProposalOrg.unit_terkait && !current.unit_terkait) {
      nextValues.unit_terkait = activeProposalOrg.unit_terkait;
    }
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [
    form,
    isNonRenstraCreateSource,
    activeProposalOrg.opd_id,
    activeProposalOrg.nama_opd,
    activeProposalOrg.unit_terkait,
  ]);

  useEffect(() => {
    if (!isCreateMode || !selectedContext || !selectedContextItem) return;

    const mappedContext = getContextPayloadFromItem({
      context: selectedContext,
      item: selectedContextItem,
    });

    form.setFieldsValue({
      context_id: mappedContext.context_id,
      context_item_id: mappedContext.context_item_id,
      periode_id: mappedContext.periode_id,
      tahun: mappedContext.tahun,
      jenis_dokumen: mappedContext.jenis_dokumen,
      renstra_id: mappedContext.renstra_id,
      opd_id: mappedContext.opd_id,
      indikator_id: mappedContext.indikator_id,
      stage: mappedContext.stage,
      ref_id: mappedContext.ref_id,
      source_table: mappedContext.source_table,
      source_id: mappedContext.source_id,
      owner_user_id: mappedContext.owner_user_id,
      owner_division_id: mappedContext.owner_division_id,
    });

    setAdvancedContextOpen(['advanced-context']);
  }, [form, isCreateMode, selectedContext, selectedContextItem, setAdvancedContextOpen]);

  useEffect(() => {
    const likelihoodValue = Number(selectedLikelihoodItem?.nilai_numeric || 0);
    const impactValue = Number(selectedImpactItem?.nilai_numeric || 0);
    const score = calculateRiskScorePreview(likelihoodValue, impactValue);
    const level = calculateRiskLevelPreview(score);
    const current = form.getFieldsValue();

    if (
      current.kemungkinan !== likelihoodValue ||
      current.dampak !== impactValue ||
      current.skor_risiko !== score ||
      current.level_risiko !== level
    ) {
      form.setFieldsValue({
        kemungkinan: likelihoodValue || undefined,
        dampak: impactValue || undefined,
        skor_risiko: score,
        level_risiko: level,
      });
    }
  }, [form, selectedLikelihoodItem?.id, selectedImpactItem?.id]);
};

const getAutoDraftNextValues = ({ current, fallback, previousFallback }) => {
  const nextValues = {};

  Object.entries(fallback).forEach(([field, nextValue]) => {
    const currentValue = current[field];
    const previousValue = previousFallback[field];

    const isEmpty =
      currentValue === undefined ||
      currentValue === null ||
      (typeof currentValue === 'string' && currentValue.trim() === '');

    const isStillFrontendFallback = previousValue !== undefined && currentValue === previousValue;

    if (nextValue && (isEmpty || isStillFrontendFallback)) {
      nextValues[field] = nextValue;
    }
  });

  return nextValues;
};

const getResolvedContextItems = ({ selectedContextItemsResponse, selectedContext }) => {
  const itemsFromEndpoint = getContextItemsFromResponse(selectedContextItemsResponse);
  if (itemsFromEndpoint.length) return itemsFromEndpoint;
  return Array.isArray(selectedContext?.items) ? selectedContext.items : [];
};

const useRiskFormReferenceData = ({
  isRenstraCreateSource,
  isCreateMode,
  isEditMode,
  isRevisiMode,
  selectedContextId,
  selectedContextItemId,
  selectedContextItemsResponse,
  selectedContext,
  activeUserOrg,
}) => {
  const { data: contextListResponse, isLoading: isLoadingContexts } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.contexts({ limit: 100 }),
    queryFn: () => mrPlanningRiskService.getContexts({ limit: 100 }),
    enabled: isRenstraCreateSource,
  });

  const contextOptions = useMemo(() => {
    const rows = Array.isArray(contextListResponse?.data) ? contextListResponse.data : [];
    return rows.map((context) => ({
      label: getContextLabel(context),
      value: context.id,
      context,
    }));
  }, [contextListResponse]);

  const selectedContextFromList = useMemo(
    () => contextOptions.find((item) => String(item.value) === String(selectedContextId))?.context,
    [contextOptions, selectedContextId],
  );

  const { data: selectedContextDetailResponse, isLoading: isLoadingSelectedContext } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.contextDetail(selectedContextId),
    queryFn: () => mrPlanningRiskService.getContextById(selectedContextId),
    enabled: isRenstraCreateSource && Boolean(selectedContextId),
  });

  // 1. Kembalikan useQuery ke versi standar (Tanpa onSuccess agar aman di semua versi)
  const {
    data: selectedContextItemsResponseLocal,
    isLoading: isLoadingContextItems,
    refetch: refetchContextItems,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.contextItems(selectedContextId),
    queryFn: () => mrPlanningRiskService.getContextItems(selectedContextId),
    enabled: isRenstraCreateSource && Boolean(selectedContextId),
  });

  // 2. 🌟 SUNTIKKAN FITUR AUTO-INJECTOR MURNI DI BAWAHNYA
  const [isAutoInjecting, setIsAutoInjecting] = useState(false);
  const syncedRef = React.useRef(false);

  useEffect(() => {
    console.log(
      '[AutoSync] isRenstraCreateSource:',
      isRenstraCreateSource,
      'selectedContextId:',
      selectedContextId,
    );
    if (!isRenstraCreateSource || !selectedContextId) return;

    // Ekstrak data array items dari response
    const itemsData = selectedContextItemsResponseLocal?.data || selectedContextItemsResponseLocal;

    // KONDISI KRITIS: Jika data sudah di-load tapi array-nya kosong []
    if (
      itemsData &&
      Array.isArray(itemsData) &&
      itemsData.length === 0 &&
      !isAutoInjecting &&
      !syncedRef.current
    ) {
      const triggerSilentInjector = async () => {
        setIsAutoInjecting(true);
        console.log(
          `%c[React Auto-Injector] Menyinkronkan data Renstra untuk Context ID: ${selectedContextId}...`,
          'color: #1890ff; font-weight: bold;',
        );

        try {
          // Menggunakan native fetch langsung ke backend port 3000 agar bebas eror proxy
          const response = await fetch(
            `http://localhost:3000/api/mr-planning-context/${selectedContextId}/sync-renstra`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                // Otomatis menyertakan token JWT jika sistem Anda menggunakannya
                Authorization: localStorage.getItem('token')
                  ? `Bearer ${localStorage.getItem('token')}`
                  : '',
              },
            },
          );

          const result = await response.json();

          if (response.ok || result.success) {
            syncedRef.current = true; // ← tambah
            if (refetchContextItems) refetchContextItems();
          }
        } catch (err) {
          console.error('[React Auto-Injector] Gagal mengeksekusi sinkronisasi otomatis:', err);
        } finally {
          setIsAutoInjecting(false);
        }
      };

      triggerSilentInjector();
    }
  }, [
    selectedContextId,
    selectedContextItemsResponseLocal,
    isRenstraCreateSource,
    isAutoInjecting,
    refetchContextItems,
  ]);

  const selectedContextResolved =
    selectedContextDetailResponse?.data ||
    selectedContextDetailResponse ||
    selectedContextFromList ||
    null;

  const selectedContextItems = useMemo(
    () =>
      getResolvedContextItems({
        selectedContextItemsResponse: selectedContextItemsResponseLocal,
        selectedContext: selectedContextResolved,
      }),
    [selectedContextItemsResponseLocal, selectedContextResolved],
  );

  const contextItemOptions = useMemo(
    () => buildContextItemOptions(selectedContextItems),
    [selectedContextItems],
  );

  const selectedContextItem = useMemo(
    () =>
      getSelectedContextItem({
        items: selectedContextItems,
        selectedId: selectedContextItemId, // <-- MENGGUNAKAN ID DARI FORM
      }),
    [selectedContextItems, selectedContextItemId], // <-- MENGUPDATE DEPENDENCY
  );

  const { data: likelihoodResponse, isLoading: isLoadingLikelihood } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('LIKELIHOOD'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('LIKELIHOOD'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  const { data: proposalSourceResponse, isLoading: isLoadingProposalSources } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.proposalSources(),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('MR_PROPOSAL_SOURCE'),
    enabled: isCreateMode,
  });

  const { data: renstraOpdResponse, isLoading: isLoadingRenstraOpd } = useQuery({
    queryKey: ['renstra-opd', 'active'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      return rows.find((item) => item.is_aktif) || null;
    },
    enabled: isCreateMode,
  });

  const activeRenstraOpdOrg = useMemo(
    () => getActiveRenstraOpdOrganization(renstraOpdResponse),
    [renstraOpdResponse],
  );

  const activeProposalOrg = useMemo(
    () => ({
      opd_id: activeRenstraOpdOrg.opd_id || activeUserOrg.opd_id,
      nama_opd: activeRenstraOpdOrg.nama_opd || activeUserOrg.nama_opd,
      unit_terkait: activeRenstraOpdOrg.unit_terkait || activeUserOrg.unit_terkait,
    }),
    [activeRenstraOpdOrg, activeUserOrg],
  );

  const { data: impactResponse, isLoading: isLoadingImpact } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('IMPACT'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('IMPACT'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  const { data: riskCategoryResponse, isLoading: isLoadingRiskCategory } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('RISK_CATEGORY'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('RISK_CATEGORY'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  const { data: riskSourceResponse, isLoading: isLoadingRiskSource } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('RISK_SOURCE'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('RISK_SOURCE'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  const { data: riskAppetiteResponse, isLoading: isLoadingRiskAppetite } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('RISK_APPETITE'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('RISK_APPETITE'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  const { data: riskStatusResponse, isLoading: isLoadingRiskStatus } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems('RISK_STATUS'),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup('RISK_STATUS'),
    enabled: isCreateMode || isEditMode || isRevisiMode,
  });

  return {
    contextListResponse,
    isLoadingContexts,
    contextOptions,
    selectedContextFromList,
    selectedContextDetailResponse,
    isLoadingSelectedContext,
    selectedContextItemsResponse: selectedContextItemsResponseLocal,
    isLoadingContextItems,
    selectedContextResolved,
    selectedContextItems,
    contextItemOptions,
    selectedContextItem,
    likelihoodResponse,
    isLoadingLikelihood,
    proposalSourceResponse,
    isLoadingProposalSources,
    renstraOpdResponse,
    isLoadingRenstraOpd,
    activeProposalOrg,
    impactResponse,
    isLoadingImpact,
    riskCategoryResponse,
    isLoadingRiskCategory,
    riskSourceResponse,
    isLoadingRiskSource,
    riskAppetiteResponse,
    isLoadingRiskAppetite,
    riskStatusResponse,
    isLoadingRiskStatus,
  };
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

const getStageLabel = (stage) => {
  const normalized = String(stage || '').toLowerCase();
  return STAGE_LABEL_MAP[normalized] || stage || '-';
};

const getContextItemLabel = (item) => {
  if (!item) return '-';

  const stageLabel = getStageLabel(item.stage);
  const contextName =
    item.nama_konteks || item.uraian_konteks || item.nama_indikator || `Ref ${item.ref_id || '-'}`;

  const indicatorName = item.nama_indikator || '-';

  return `${stageLabel} — ${contextName} — Indikator: ${indicatorName}`;
};

const buildContextItemOptions = (items = []) =>
  items.map((item) => ({
    label: getContextItemLabel(item),
    value: item.id,
    item,
  }));

const getSelectedContextItem = ({ items = [], selectedId }) => {
  if (!Array.isArray(items) || !items.length) return null;

  if (selectedId) {
    return items.find((item) => String(item.id) === String(selectedId)) || null;
  }

  return null;
};

const getContextPayloadFromItem = ({ context, item }) => {
  return cleanObject({
    context_id: context?.id,
    context_item_id: item?.id,

    periode_id: item?.periode_id || context?.periode_id,
    tahun: item?.tahun || context?.tahun,
    jenis_dokumen: item?.jenis_dokumen || context?.jenis_dokumen,
    renstra_id: item?.renstra_id || context?.renstra_id,
    opd_id: item?.opd_id || context?.opd_id,

    indikator_id: item?.indikator_id,
    stage: item?.stage,
    ref_id: item?.ref_id,

    source_table: item?.source_table,
    source_id: item?.source_id,

    owner_user_id: context?.owner_user_id,
    owner_division_id: context?.owner_division_id,
  });
};

const getContextPayload = (context) => {
  const primaryItem = getPrimaryContextItem(context);

  return cleanObject({
    context_id: context?.id,
    periode_id: primaryItem?.periode_id || context?.periode_id,
    tahun: primaryItem?.tahun || context?.tahun,
    jenis_dokumen: primaryItem?.jenis_dokumen || context?.jenis_dokumen,
    renstra_id: primaryItem?.renstra_id || context?.renstra_id,
    opd_id: primaryItem?.opd_id || context?.opd_id,
    indikator_id: primaryItem?.indikator_id,
    stage: primaryItem?.stage,
    ref_id: primaryItem?.ref_id,
    owner_user_id: context?.owner_user_id,
    owner_division_id: context?.owner_division_id,
  });
};

const getContextLabel = (context) => {
  if (!context) return '-';

  return [
    context.periode_label || `Context ${context.id}`,
    context.jenis_dokumen,
    context.nama_opd || (context.opd_id ? `OPD ${context.opd_id}` : null),
  ]
    .filter(Boolean)
    .join(' — ');
};

const normalizeKategoriRisiko = (value) => {
  if (value === undefined || value === null || value === '') return undefined;

  const normalized = String(value).trim().toLowerCase();

  const map = {
    strategis: 'strategis',
    strategic: 'strategis',
    operasional: 'operasional',
    operational: 'operasional',
    keuangan: 'keuangan',
    financial: 'keuangan',
    kepatuhan: 'kepatuhan',
    compliance: 'kepatuhan',
    reputasi: 'reputasi',
    reputation: 'reputasi',
  };

  return map[normalized] || normalized;
};

const getRiskContextDisplayLabel = (risk) => {
  if (!risk) return '-';

  return [
    risk.context?.periode_label ||
      risk.periode_label ||
      (risk.context_id ? `Context ${risk.context_id}` : null),
    risk.jenis_dokumen,
    risk.tahun,
    risk.stage,
    risk.ref_id ? `Ref ${risk.ref_id}` : null,
  ]
    .filter(Boolean)
    .join(' — ');
};

const getReferenceRows = (response) => {
  return getContextItemsFromResponse(response);
};

const buildReferenceOptions = (items = []) =>
  items.map((item) => ({
    label: `${item.kode_item} — ${item.nama_item}`,
    value: item.id,
    item,
  }));

const buildProposalSourceOptions = (items = []) =>
  items.map((item) => ({
    label: item.nama_item || item.kode_item,
    value: item.kode_item,
    item,
  }));

const getProposalSourceRows = (response) => getReferenceRows(response);

const getSubmissionBlockMessage = ({
  isDetailMode,
  isEditMode,
  isEditableStatus,
  isRevisiMode,
  isApproved,
}) => {
  if (isDetailMode) return 'Mode detail hanya untuk melihat data.';
  if (isEditMode && !isEditableStatus) {
    return 'Data tidak boleh diedit langsung. Draft/ditolak boleh edit, approved wajib revisi, dan verifikasi menunggu proses approval.';
  }
  if (isRevisiMode && !isApproved) return 'Mode revisi hanya untuk data yang sudah approved.';
  return '';
};

const getCreateSourceGuard = ({ allValues, setBackendError, message }) => {
  const sourceType = String(allValues.proposal_source_type || '').toUpperCase();

  if (!sourceType) {
    setBackendError({
      response: {
        data: {
          message: 'Pilih sumber usulan risiko terlebih dahulu.',
          code: 'MR_FRONTEND_PROPOSAL_SOURCE_REQUIRED',
          blocked: true,
          audit_mode: false,
          missing_fields: ['proposal_source_type'],
        },
      },
    });
    message.warning('Pilih sumber usulan risiko terlebih dahulu.');
    return null;
  }

  return sourceType;
};

const getRenstraCreateGuard = ({ allValues, setBackendError, message }) => {
  if (allValues.context_id) return true;

  setBackendError({
    response: {
      data: {
        message: 'Pilih Context MR terlebih dahulu untuk sumber Renstra.',
        code: 'MR_FRONTEND_CONTEXT_REQUIRED',
        blocked: true,
        audit_mode: false,
        missing_fields: ['context_id'],
      },
    },
  });
  message.warning('Pilih Context MR terlebih dahulu.');
  return false;
};

const getRenstraItemGuard = ({ allValues, setBackendError, message }) => {
  if (allValues.context_item_id) return true;

  setBackendError({
    response: {
      data: {
        message: 'Pilih Sumber Perencanaan / Indikator Renstra terlebih dahulu.',
        code: 'MR_FRONTEND_CONTEXT_ITEM_REQUIRED',
        blocked: true,
        audit_mode: false,
        missing_fields: ['context_item_id'],
      },
    },
  });
  message.warning('Pilih Sumber Perencanaan / Indikator Renstra terlebih dahulu.');
  return false;
};

const buildCreateProposalPayload = ({ allValues, values, activeProposalOrg }) =>
  buildProposalIntakePayload({
    ...allValues,
    ...values,
    opd_id: allValues.opd_id || values.opd_id || activeProposalOrg.opd_id,
    nama_opd: allValues.nama_opd || values.nama_opd || activeProposalOrg.nama_opd,
    unit_terkait: allValues.unit_terkait || values.unit_terkait || activeProposalOrg.unit_terkait,
  });

const handleCreateSubmission = ({
  allValues,
  values,
  payload,
  activeProposalOrg,
  setBackendError,
  message,
  createMutation,
  createProposalIntakeMutation,
}) => {
  const sourceType = getCreateSourceGuard({
    allValues,
    setBackendError,
    message,
  });

  if (!sourceType) return;

  if (isRenstraSource(sourceType)) {
    if (!getRenstraCreateGuard({ allValues, setBackendError, message })) return;
    if (!getRenstraItemGuard({ allValues, setBackendError, message })) return;

    createMutation.mutate({
      contextId: allValues.context_id,
      payload,
    });
    return;
  }

  const proposalPayload = buildCreateProposalPayload({
    allValues,
    values,
    activeProposalOrg,
  });

  if (!proposalPayload.opd_id) {
    setBackendError({
      response: {
        data: {
          message:
            'OPD ID belum tersedia. Pastikan Renstra OPD aktif memiliki opd_id atau user login membawa opd_id.',
          code: 'MR_FRONTEND_OPD_REQUIRED',
          blocked: true,
          audit_mode: false,
          missing_fields: ['opd_id'],
        },
      },
    });

    message.warning('OPD ID belum tersedia dari Renstra aktif atau user login.');
    return;
  }

  createProposalIntakeMutation.mutate(proposalPayload);
};

const handleRevisionSubmission = ({ payload, message, revisiMutation }) => {
  if (!payload.alasan_revisi) {
    message.warning('Alasan revisi wajib diisi.');
    return;
  }

  revisiMutation.mutate(payload);
};

const MrPlanningRiskFormStatusAlerts = ({
  detailErrorMessage,
  backendMessage,
  backendDetail,
  editModeBlocked,
  revisiModeBlocked,
  editModeDescription,
  isRevisiMode,
  isApproved,
  setBackendError,
}) => {
  return (
    <>
      {detailErrorMessage && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message={detailErrorMessage} />
      )}

      {backendMessage && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={backendMessage}
          description={backendDetail || undefined}
          onClose={() => setBackendError(null)}
        />
      )}

      {editModeBlocked && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Edit langsung tidak diperbolehkan untuk status ini."
          description={editModeDescription}
        />
      )}

      {revisiModeBlocked && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Mode revisi tidak tersedia untuk status ini."
          description="Mode revisi hanya digunakan untuk data yang sudah approved."
        />
      )}

      {isRevisiMode && isApproved && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Mode Revisi"
          description="Perubahan data approved akan dikirim melalui endpoint POST /:id/revisi dan masuk history terlebih dahulu."
        />
      )}
    </>
  );
};

const submitFormByMode = ({
  isCreateMode,
  isRevisiMode,
  allValues,
  values,
  payload,
  activeProposalOrg,
  setBackendError,
  message,
  createMutation,
  createProposalIntakeMutation,
  revisiMutation,
  updateMutation,
}) => {
  if (isCreateMode) {
    handleCreateSubmission({
      allValues,
      values,
      payload,
      activeProposalOrg,
      setBackendError,
      message,
      createMutation,
      createProposalIntakeMutation,
    });
    return;
  }

  if (isRevisiMode) {
    handleRevisionSubmission({ payload, message, revisiMutation });
    return;
  }

  if (!updateMutation) {
    setBackendError({
      response: {
        data: {
          message: 'Mutation update belum siap. Coba muat ulang halaman dan ulangi simpan.',
          code: 'MR_FRONTEND_UPDATE_MUTATION_MISSING',
          blocked: true,
          audit_mode: false,
        },
      },
    });
    message.error('Mutation update belum siap. Coba muat ulang halaman dan ulangi simpan.');
    return;
  }

  updateMutation.mutate(payload);
};

export default function MrPlanningRiskForm({ mode: propMode }) {
  const [form] = Form.useForm();
  const contextOptionsRef = React.useRef([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { user } = useContext(AuthContext);

  const [backendError, setBackendError] = useState(null);
  const [duplicateGuard, setDuplicateGuard] = useState(null);
  const [advancedContextOpen, setAdvancedContextOpen] = useState([]);

  const [narrativePreview, setNarrativePreview] = useState(null);
  const [narrativePreviewLoading, setNarrativePreviewLoading] = useState(false);
  const [narrativePreviewError, setNarrativePreviewError] = useState('');
  const [narrativeDraftApplied, setNarrativeDraftApplied] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  useDirtyFormGuard(isDirty);
  useMrDirtyGuard(isDirty);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);

  const watchRenstraId = Form.useWatch('renstra_id', form);

  const handleIndicatorSelected = (id) => {
    form.setFieldsValue({
      context_item_id: id, // 🌟 DIUBAH: dari indikator_id menjadi context_item_id
    });
    setIsDirty(true);
  };

  const lastAutoDraftRef = useRef(null);

  const activeUserOrg = useMemo(() => getActiveUserOrganization(user), [user]);
  const currentUserRole = String(
    user?.role || user?.role_name || user?.nama_role || user?.kode_role || user?.user_role || '',
  )
    .trim()
    .toUpperCase();
  const canUsePlaceholderRepair = ADMIN_ROLES.has(currentUserRole);
  const {
    selectedProposalSourceType,
    selectedPeriodeType,
    selectedTahun,
    selectedBulan,
    selectedTriwulan,
    selectedSemester,
    selectedContextId,
    kemungkinanRefId,
    dampakRefId,
    watchedObjekRisiko,
    watchedRingkasanTemuan,
    watchedUraianRisiko,
  } = useRiskFormWatchValues(form);

  const mode = propMode || (id ? 'edit' : 'create');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isDetailMode = mode === 'detail';
  const isRevisiMode = mode === 'revisi';
  const selectedSourceCode = String(selectedProposalSourceType || '').toUpperCase();
  const isRenstraCreateSource = isCreateMode && isRenstraSource(selectedSourceCode);
  const isNonRenstraCreateSource =
    isCreateMode && selectedSourceCode && !isRenstraSource(selectedSourceCode);
  const isCustomCreateSource = isCreateMode && isCustomSource(selectedSourceCode);

  useEffect(() => {
    console.log(
      '[AutoSelect] triggered, isRenstraCreateSource:',
      isRenstraCreateSource,
      'opts:',
      contextOptionsRef.current.length,
      'selectedContextId:',
      selectedContextId,
    );
    if (!isRenstraCreateSource) return;
    if (selectedContextId) return;
    const opts = contextOptionsRef.current;
    if (opts.length !== 1) return;
    form.setFieldValue('context_id', opts[0].value);
  }, [isRenstraCreateSource, selectedContextId, form]);

  const shouldShowRiskInput = !isCreateMode || Boolean(selectedSourceCode);

  const {
    data: detailResponse,
    isLoading,
    error: detailError,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(id),
    queryFn: () => mrPlanningRiskService.getById(id, { include_governance: true }),
    enabled: Boolean(id),
  });

  // Backend biasanya mengembalikan { success, message, data }.
  // Form harus memakai object risk asli, bukan wrapper response.
  const detail = detailResponse?.data || detailResponse || null;

  const { status, isApproved, isEditableStatus, editModeBlocked, revisiModeBlocked, isReadonly } =
    getRiskFormAccessState({
      detail,
      isEditMode,
      isRevisiMode,
      isDetailMode,
    });
  const isVerification = status === 'verifikasi';

  const selectedContextItemId = Form.useWatch('context_item_id', form);

  const {
    contextOptions,
    isLoadingContexts,
    selectedContextResolved,
    isLoadingSelectedContext,
    isLoadingContextItems,
    contextItemOptions,
    selectedContextItem,
    likelihoodResponse,
    isLoadingLikelihood,
    proposalSourceResponse,
    isLoadingProposalSources,
    renstraOpdResponse,
    isLoadingRenstraOpd,
    activeProposalOrg,
    impactResponse,
    isLoadingImpact,
    riskCategoryResponse,
    isLoadingRiskCategory,
    riskSourceResponse,
    isLoadingRiskSource,
    riskAppetiteResponse,
    isLoadingRiskAppetite,
    riskStatusResponse,
    isLoadingRiskStatus,
  } = useRiskFormReferenceData({
    isRenstraCreateSource,
    isCreateMode,
    isEditMode,
    isRevisiMode,
    selectedContextId,
    selectedContextItemId,
    selectedContextItemsResponse: null,
    selectedContext: null,
    activeUserOrg,
  });

  useEffect(() => {
    contextOptionsRef.current = contextOptions;
  }, [contextOptions]);
  const likelihoodItems = getReferenceRows(likelihoodResponse);
  const impactItems = getReferenceRows(impactResponse);
  const riskCategoryItems = getReferenceRows(riskCategoryResponse);
  const riskSourceItems = getReferenceRows(riskSourceResponse);
  const riskAppetiteItems = getReferenceRows(riskAppetiteResponse);
  const riskStatusItems = getReferenceRows(riskStatusResponse);

  const proposalSourceItems = getProposalSourceRows(proposalSourceResponse);
  const proposalSourceOptions = buildProposalSourceOptions(proposalSourceItems);

  const likelihoodOptions = buildReferenceOptions(likelihoodItems);
  const impactOptions = buildReferenceOptions(impactItems);
  const riskCategoryOptions = buildReferenceOptions(riskCategoryItems);
  const riskSourceOptions = buildReferenceOptions(riskSourceItems);
  const riskAppetiteOptions = buildReferenceOptions(riskAppetiteItems);
  const riskStatusOptions = buildReferenceOptions(riskStatusItems);

  const selectedLikelihoodItem = likelihoodItems.find(
    (item) => String(item.id) === String(kemungkinanRefId),
  );

  const selectedImpactItem = impactItems.find((item) => String(item.id) === String(dampakRefId));

  const selectedPrimaryItem = getPrimaryContextItem(selectedContextResolved);
  const displayedContext = selectedContextResolved || detail?.context || null;
  const displayedPrimaryItem = isCreateMode
    ? selectedContextItem || selectedPrimaryItem
    : getPrimaryContextItem(displayedContext);

  const contextDisplayLabel = isCreateMode ? undefined : getRiskContextDisplayLabel(detail);

  const pageTitle = useMemo(() => {
    if (isCreateMode) return 'Tambah Usulan Risiko';
    if (isDetailMode) return 'Detail / Audit MR Planning Risk';
    if (isRevisiMode) return 'Revisi MR Planning Risk';
    return 'Edit MR Planning Risk';
  }, [isCreateMode, isDetailMode, isRevisiMode]);

  useMrPlanningRiskFormEffects({
    form,
    detail,
    isCreateMode,
    isNonRenstraCreateSource,
    selectedSourceCode,
    selectedTahun,
    selectedPeriodeType,
    selectedBulan,
    selectedTriwulan,
    selectedSemester,
    selectedContextId,
    selectedContextItem,
    selectedLikelihoodItem,
    selectedImpactItem,
    activeProposalOrg,
    setAdvancedContextOpen,
    lastAutoDraftRef,
  });

  useEffect(() => {
    if (!detail) return;

    form.setFieldsValue({
      context_id: detail.context_id,
      periode_id: detail.periode_id,
      tahun: detail.tahun,
      jenis_dokumen: detail.jenis_dokumen,
      renstra_id: detail.renstra_id,
      opd_id: detail.opd_id,
      stage: detail.stage,
      ref_id: detail.ref_id,
      indikator_id: detail.indikator_id,
      owner_user_id: detail.owner_user_id,
      owner_division_id: detail.owner_division_id,

      kode_risiko: detail.kode_risiko,
      nama_risiko: detail.nama_risiko,
      uraian_risiko: detail.uraian_risiko,
      kategori_risiko_ref_id: detail.kategori_risiko_ref_id,
      kategori_risiko: detail.kategori_risiko,
      penyebab_risiko: detail.penyebab_risiko,
      dampak_risiko: detail.dampak_risiko,

      kemungkinan_ref_id: detail.kemungkinan_ref_id,
      dampak_ref_id: detail.dampak_ref_id,
      kemungkinan: detail.kemungkinan,
      dampak: detail.dampak,
      skor_risiko: detail.skor_risiko,
      level_risiko: String(detail.level_risiko || '').toLowerCase(),

      sumber_risiko_ref_id: detail.sumber_risiko_ref_id,
      sumber_risiko: detail.sumber_risiko,

      selera_risiko_ref_id: detail.selera_risiko_ref_id,
      selera_risiko: detail.selera_risiko,

      status_risiko_ref_id: detail.status_risiko_ref_id,
      status_risiko: detail.status_risiko,

      status_revisi: detail.status_revisi,
      versi: detail.versi,
      alasan_revisi: isRevisiMode ? undefined : detail.alasan_revisi,
      proposal_source_type: detail.proposal_source_type,
      proposal_source_ref_id: detail.proposal_source_ref_id,
      context_item_id: detail.context_item_id || detail.context_item?.id || null,

      objek_risiko: detail.objek_risiko,
      nomor_temuan: detail.nomor_temuan,
      judul_temuan: detail.judul_temuan,
      tahun_pemeriksaan: detail.tahun_pemeriksaan,
      tanggal_dokumen: detail.tanggal_dokumen,
      ringkasan_temuan: detail.ringkasan_temuan,
      rekomendasi: detail.rekomendasi,
      status_tindak_lanjut: detail.status_tindak_lanjut,
      pic: detail.pic,
      target_waktu: detail.target_waktu,
      unit_terkait: detail.unit_terkait,
    });

    setAdvancedContextOpen(['advanced-context']);
  }, [detail?.id, form, isRevisiMode]);

  const resetNarrativePreviewState = () => {
    setNarrativePreview(null);
    setNarrativePreviewError('');
    setNarrativeDraftApplied(false);
  };

  const buildNarrativePreviewPayload = () => {
    const values = form.getFieldsValue(true);

    /*
     * STEP 18C-1E GUARD:
     * Payload preview narasi hanya boleh berisi field bisnis/input dasar.
     * Jangan kirim field teknis:
     * context_id, context_item_id, renstra_id, indikator_id, stage, ref_id,
     * source_table, source_id, kode_risiko, skor_risiko, level_risiko,
     * level_risiko_ref_id, matrix_code, matrix_id, is_above_appetite,
     * owner_user_id, owner_division_id, versi, status_revisi, dan audit fields.
     */

    const ringkasanTemuan =
      values.ringkasan_temuan ||
      values.kendala_pelaksanaan ||
      values.catatan_koreksi ||
      values.deskripsi_kategori_baru ||
      values.contoh_sumber_risiko ||
      values.uraian_risiko ||
      values.objek_risiko ||
      '';

    const judulTemuan =
      values.judul_temuan ||
      values.nama_kegiatan ||
      values.akun_pos ||
      values.jenis_dokumen_pertanggungjawaban ||
      values.objek_risiko ||
      values.nama_kategori_baru ||
      '';

    return cleanObject({
      proposal_source_type: values.proposal_source_type,

      nomor_temuan: values.nomor_temuan,
      judul_temuan: judulTemuan,
      ringkasan_temuan: ringkasanTemuan,
      status_tindak_lanjut: values.status_tindak_lanjut,

      tahun: values.tahun,
      periode_type: values.periode_type,
      periode_label: values.periode_label,
      nama_opd: values.nama_opd,
      unit_terkait: values.unit_terkait,

      tahun_pemeriksaan: values.tahun_pemeriksaan,
      tanggal_dokumen: values.tanggal_dokumen,

      akun_pos: values.akun_pos,
      jenis_transaksi: values.jenis_transaksi,
      jenis_dokumen_pertanggungjawaban: values.jenis_dokumen_pertanggungjawaban,
      status_dokumen: values.status_dokumen,
      catatan_koreksi: values.catatan_koreksi,

      nama_kegiatan: values.nama_kegiatan,
      tahapan_pelaksanaan: values.tahapan_pelaksanaan,
      lokasi: values.lokasi,
      output_kegiatan: values.output_kegiatan,
      kendala_pelaksanaan: values.kendala_pelaksanaan,
      target_pelaksanaan: values.target_pelaksanaan,

      nama_kategori_baru: values.nama_kategori_baru,
      deskripsi_kategori_baru: values.deskripsi_kategori_baru,
      alasan_pengajuan_kategori: values.alasan_pengajuan_kategori,
      contoh_sumber_risiko: values.contoh_sumber_risiko,
    });
  };

  const isNarrativePreviewReady = useMemo(() => {
    if (!isNonRenstraCreateSource) return false;

    const values = form.getFieldsValue(true);
    const sourceType = String(values.proposal_source_type || '').toUpperCase();

    if (!sourceType || sourceType === PROPOSAL_SOURCE.RENSTRA) {
      return false;
    }

    const objekRisiko = watchedObjekRisiko ?? values.objek_risiko;
    const ringkasanTemuan =
      watchedRingkasanTemuan ??
      values.ringkasan_temuan ??
      watchedUraianRisiko ??
      values.uraian_risiko ??
      objekRisiko;

    return isNarrativeDraftReadyInput({
      ...values,
      proposal_source_type: sourceType,
      objek_risiko: objekRisiko,
      judul_temuan: values.judul_temuan || objekRisiko,
      ringkasan_temuan: ringkasanTemuan,
    });
  }, [
    form,
    isNonRenstraCreateSource,
    watchedObjekRisiko,
    watchedRingkasanTemuan,
    watchedUraianRisiko,
  ]);

  const buildNarrativePreviewRequest = () => buildNarrativePreviewPayload();

  const setNarrativePreviewFailure = (text) => {
    setNarrativePreviewError(text);
    message.error(text);
  };

  const applyNarrativePreviewResponse = (result) => {
    if (!result?.success) {
      setNarrativePreviewError(
        'Draft narasi belum dapat dibuat. Periksa input utama dan coba kembali.',
      );
      return false;
    }

    setNarrativePreview({
      ...(result?.data || {}),
      _meta: result?.meta || {},
    });

    message.success(getNarrativePreviewSuccessMessage(result?.meta));
    return true;
  };

  const handlePreviewNarrativeDraft = async () => {
    setNarrativePreviewError('');
    setNarrativePreview(null);
    setNarrativeDraftApplied(false);

    if (!isNarrativePreviewReady) {
      setNarrativePreviewFailure(
        'Data dasar belum lengkap. Isi minimal sumber usulan risiko, judul/objek risiko, dan ringkasan temuan atau uraian sumber risiko terlebih dahulu.',
      );
      return;
    }

    try {
      setNarrativePreviewLoading(true);

      const response = await api.post(
        '/mr-planning-risk/proposal-narrative/preview',
        buildNarrativePreviewRequest(),
      );

      applyNarrativePreviewResponse(response?.data);
    } catch (error) {
      setNarrativePreviewFailure(getNarrativePreviewSafeErrorMessage(error));
    } finally {
      setNarrativePreviewLoading(false);
    }
  };

  const handleApplyNarrativeDraft = () => {
    if (!narrativePreview) return;

    form.setFieldsValue({
      rekomendasi: narrativePreview.rekomendasi,
      objek_risiko: narrativePreview.objek_risiko,
      nama_risiko: narrativePreview.nama_risiko,
      uraian_risiko: narrativePreview.uraian_risiko,
      penyebab_risiko: narrativePreview.penyebab_risiko,
      dampak_risiko: narrativePreview.dampak_risiko,
      rencana_tindak_lanjut_awal: narrativePreview.rencana_tindak_lanjut_awal,
      pic: narrativePreview.pic,
      target_waktu: narrativePreview.target_waktu,
      catatan: narrativePreview.catatan,
    });

    setNarrativeDraftApplied(true);
    message.success(
      'Draft narasi sudah diterapkan ke form. Review dan sesuaikan kembali sebelum disimpan.',
    );
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: MR_PLANNING_RISK_QUERY_KEYS.all,
    });

    if (id) {
      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_RISK_QUERY_KEYS.history(id),
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: ({ contextId, payload }) =>
      mrPlanningRiskService.createFromContext(contextId, payload),
    onSuccess: (response) => {
      message.success(response?.message || 'Draft MR Planning Risk berhasil dibuat.');
      setIsDirty(false);
      invalidateAll();
      navigate(LIST_PATH);
    },
    onError: (error) => {
      setBackendError(error);
      message.error(getBackendErrorMessage(error));
    },
  });

  const createProposalIntakeMutation = useMutation({
    mutationFn: (payload) => mrPlanningRiskService.createProposalIntake(payload),
    onSuccess: (response) => {
      const nextDuplicateGuard = getDuplicateGuardFromResponse(response);

      invalidateAll();

      if (nextDuplicateGuard) {
        setDuplicateGuard(nextDuplicateGuard);

        message.warning(
          'Draft berhasil disimpan, namun sumber/temuan ini terindikasi sudah pernah dibuat sebagai risiko MR.',
        );

        return;
      }

      message.success(response?.message || 'Draft usulan risiko berhasil dibuat.');
      setIsDirty(false);

      navigate(LIST_PATH);
    },
    onError: (error) => {
      setBackendError(error);
      message.error(getBackendErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => mrPlanningRiskService.update(id, payload),
    onSuccess: (response) => {
      message.success(response?.message || 'MR Planning Risk berhasil diperbarui.');
      setIsDirty(false);
      invalidateAll();
      navigate(LIST_PATH);
    },
    onError: (error) => {
      setBackendError(error);
      message.error(getBackendErrorMessage(error));
    },
  });

  const repairPlaceholderMutation = useMutation({
    mutationFn: (payload) => mrPlanningRiskService.repairPlaceholderSources(payload),
    onSuccess: (response) => {
      message.success(response?.message || 'Placeholder sumber risiko berhasil diperbarui.');
      setIsDirty(false);
      invalidateAll();
    },
    onError: (error) => {
      setBackendError(error);
      message.error(getBackendErrorMessage(error));
    },
  });

  const revisiMutation = useMutation({
    mutationFn: (payload) => mrPlanningRiskService.createRevisi(id, payload),
    onSuccess: (response) => {
      message.success(response?.message || 'Revisi MR Planning Risk berhasil disimpan.');
      setIsDirty(false);
      invalidateAll();
      navigate(LIST_PATH);
    },
    onError: (error) => {
      setBackendError(error);
      message.error(getBackendErrorMessage(error));
    },
  });

  const handleFinish = (values) => {
    setBackendError(null);
    setDuplicateGuard(null);

    const blockMessage = getSubmissionBlockMessage({
      isDetailMode,
      isEditMode,
      isEditableStatus,
      isRevisiMode,
      isApproved,
    });

    if (blockMessage) {
      if (isDetailMode) {
        message.info(blockMessage);
      } else {
        message.warning(blockMessage);
      }
      return;
    }

    const allValues = form.getFieldsValue(true);
    const payload = buildPayload({
      ...allValues,
      ...values,
    });

    if (!isEditMode && !isCreateMode && !isRevisiMode) return;

    submitFormByMode({
      isCreateMode,
      isRevisiMode,
      allValues,
      values,
      payload,
      activeProposalOrg,
      setBackendError,
      message,
      createMutation,
      createProposalIntakeMutation,
      revisiMutation,
      updateMutation,
    });
  };

  const handleSubmitRequest = (values) => {
    setPendingSubmitValues(values);
    setShowConfirm(true);
  };

  const handleConfirmed = async () => {
    setShowConfirm(false);
    if (!pendingSubmitValues) return;
    handleFinish(pendingSubmitValues);
    setPendingSubmitValues(null);
  };

  const handleRepairPlaceholderSources = async () => {
    if (!canUsePlaceholderRepair) {
      message.warning('Fitur repair placeholder hanya tersedia untuk admin.');
      return;
    }

    if (!detail?.id) {
      message.warning('Data risk belum siap untuk diperbaiki.');
      return;
    }

    const contextItemId = detail?.context_item_id || detail?.context_item?.id || null;
    const payload = {
      risk_ids: [detail.id],
      context_item_id: contextItemId,
      payload: {
        objek_risiko:
          detail?.objek_risiko ||
          detail?.context_item?.nama_konteks ||
          detail?.context_item?.nama_indikator ||
          detail?.nama_risiko ||
          null,
        judul_temuan: detail?.judul_temuan || detail?.objek_risiko || detail?.nama_risiko || null,
        nomor_temuan:
          detail?.nomor_temuan || detail?.proposal_source_ref_id || detail?.ref_id || null,
        ringkasan_temuan:
          detail?.ringkasan_temuan || detail?.uraian_risiko || detail?.penyebab_risiko || null,
        rekomendasi: detail?.rekomendasi || null,
        rencana_tindak_lanjut_awal: detail?.rencana_tindak_lanjut_awal || null,
      },
    };

    try {
      setRepairLoading(true);
      await repairPlaceholderMutation.mutateAsync(payload);
    } finally {
      setRepairLoading(false);
    }
  };

  const handleRepairPlaceholderPreview = () => {
    if (!canUsePlaceholderRepair) {
      message.warning('Fitur repair placeholder hanya tersedia untuk admin.');
      return;
    }

    if (!detail?.id) {
      message.warning('Data risk belum siap untuk diperbaiki.');
      return;
    }

    const payload = {
      risk_ids: [detail.id],
      context_item_id: detail?.context_item_id || detail?.context_item?.id || null,
      payload: {
        objek_risiko:
          detail?.objek_risiko ||
          detail?.context_item?.nama_konteks ||
          detail?.context_item?.nama_indikator ||
          detail?.nama_risiko ||
          null,
        judul_temuan: detail?.judul_temuan || detail?.objek_risiko || detail?.nama_risiko || null,
        nomor_temuan:
          detail?.nomor_temuan || detail?.proposal_source_ref_id || detail?.ref_id || null,
        ringkasan_temuan:
          detail?.ringkasan_temuan || detail?.uraian_risiko || detail?.penyebab_risiko || null,
        rekomendasi: detail?.rekomendasi || null,
        rencana_tindak_lanjut_awal: detail?.rencana_tindak_lanjut_awal || null,
      },
    };

    Modal.confirm({
      title: 'Repair Placeholder Preview',
      width: 720,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Payload berikut akan dikirim untuk memperbaiki placeholder sumber risiko. Nilai yang
            masih placeholder ditandai merah.
          </p>
          <div
            style={{
              background: '#f6f8fa',
              padding: 12,
              borderRadius: 6,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            {Object.entries(payload.payload || {}).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '4px 0',
                  borderBottom: '1px dashed #e5e7eb',
                }}
              >
                <Text strong style={{ flex: 0.45 }}>
                  {key}
                </Text>
                <div style={{ flex: 0.55, textAlign: 'right' }}>
                  {isPlaceholderText(value) ? (
                    <Tag color="red">{String(value)}</Tag>
                  ) : (
                    String(value || '-')
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      okText: 'Repair',
      cancelText: 'Batal',
      onOk: async () => {
        setRepairLoading(true);
        try {
          await repairPlaceholderMutation.mutateAsync(payload);
        } finally {
          setRepairLoading(false);
        }
      },
    });
  };

  const submitting =
    createMutation.isPending ||
    createProposalIntakeMutation.isPending ||
    updateMutation.isPending ||
    revisiMutation.isPending;

  const backendMessage = backendError ? getBackendErrorMessage(backendError) : null;
  const backendDetail = backendError ? buildBackendDetail(backendError) : null;
  const detailErrorMessage = detailError ? getBackendErrorMessage(detailError) : null;
  let editModeDescription = 'Hanya data draft atau ditolak yang boleh diedit langsung.';

  if (isVerification) {
    editModeDescription =
      'Data sedang dalam proses verifikasi. Gunakan halaman detail atau history.';
  }

  if (isApproved) {
    editModeDescription =
      'Data approved wajib diubah melalui mode revisi agar masuk workflow history.';
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Spin />
          <Text style={{ marginLeft: 12 }}>Memuat data MR Planning Risk...</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space align="start" justify="space-between" style={{ width: '100%' }} wrap>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              {pageTitle}
            </Title>
            <Text type="secondary">
              Form input usulan risiko. User memilih sumber risiko, mengisi data bisnis, lalu
              backend otomatis membuat context, objek risiko, kode, skor, level, dan history.
            </Text>
          </div>

          <Space wrap>
            {detail?.status_revisi && (
              <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
                {STATUS_LABEL_MAP[status] || status.toUpperCase()}
              </Tag>
            )}

            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(LIST_PATH)}>
              Kembali
            </Button>

            {id && (
              <Button
                icon={<AuditOutlined />}
                onClick={() => navigate(`${LIST_PATH}/${id}/history`)}
              >
                History
              </Button>
            )}
          </Space>
        </Space>

        <Divider />
        <MrPlanningRiskFormStatusAlerts
          detailErrorMessage={detailErrorMessage}
          backendMessage={backendMessage}
          backendDetail={backendDetail}
          editModeBlocked={editModeBlocked}
          revisiModeBlocked={revisiModeBlocked}
          editModeDescription={editModeDescription}
          isRevisiMode={isRevisiMode}
          isApproved={isApproved}
          setBackendError={setBackendError}
        />

        {isDetailMode && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Mode Detail / Audit"
            description="Semua field dikunci. Gunakan halaman History untuk melihat before_json, after_json, approval, tolak, dan rebuild."
          />
        )}

        {isDetailMode && isProposalIntakeDetail(detail) && (
          <Card size="small" title="Jejak Proposal Intake" style={{ marginBottom: 16 }}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Jejak sumber usulan risiko"
              description="Panel ini menampilkan jejak asal usulan risiko agar data dapat ditelusuri kembali ke temuan, dokumen, kegiatan, atau sumber non-Renstra lainnya."
            />

            <Row gutter={[16, 12]}>
              <Col xs={24} md={8}>
                {renderReadonlyTraceItem(
                  'Sumber Usulan Risiko',
                  getProposalTraceSourceLabel(detail),
                )}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem(
                  'Nomor Temuan / Source Ref',
                  detail?.nomor_temuan || detail?.proposal_source_ref_id || detail?.ref_id,
                )}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem(
                  'Status Tindak Lanjut',
                  getStatusTindakLanjutLabel(detail?.status_tindak_lanjut),
                )}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem('Tahun Pemeriksaan', detail?.tahun_pemeriksaan)}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem('Tanggal Dokumen', detail?.tanggal_dokumen)}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem('PIC / Unit', detail?.pic || detail?.unit_terkait)}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem('Target Waktu', detail?.target_waktu)}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem(
                  'Context / Stage / Ref',
                  `Context ${detail?.context_id || '-'} — ${detail?.stage || '-'} — Ref ${detail?.ref_id || '-'}`,
                )}
              </Col>

              <Col xs={24} md={8}>
                {renderReadonlyTraceItem(
                  'Context Item ID',
                  detail?.context_item_id || detail?.context_item?.id,
                )}
              </Col>

              <Col xs={24}>
                {renderReadonlyTraceItem(
                  'Judul Temuan / Objek Risiko',
                  detail?.judul_temuan ||
                    detail?.objek_risiko ||
                    detail?.context_item?.nama_konteks,
                  { multiline: true, maxHeight: 90 },
                )}
              </Col>

              <Col xs={24}>
                {renderReadonlyTraceItem(
                  'Ringkasan Temuan / Uraian Konteks',
                  detail?.ringkasan_temuan || detail?.context_item?.uraian_konteks,
                  { multiline: true, maxHeight: 180 },
                )}
              </Col>

              <Col xs={24}>
                {renderReadonlyTraceItem('Rekomendasi', detail?.rekomendasi, {
                  multiline: true,
                  maxHeight: 180,
                })}
              </Col>
            </Row>
          </Card>
        )}

        {duplicateGuard?.has_duplicate && (
          <Alert
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            message="Usulan risiko terindikasi duplikat"
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>
                  {duplicateGuard.duplicate_warning ||
                    duplicateGuard.message ||
                    'Sumber usulan/temuan ini sudah pernah dibuat sebagai risiko MR.'}
                </Text>

                <Text type="secondary">
                  Sistem tetap menyimpan draft karena satu temuan dapat menghasilkan lebih dari satu
                  risiko substantif. Jika risiko ini berbeda secara substansi, data boleh
                  dilanjutkan. Jika sama, silakan cek risiko terkait berikut.
                </Text>

                {duplicateGuard.duplicate_risks?.length > 0 && (
                  <List
                    size="small"
                    bordered
                    dataSource={duplicateGuard.duplicate_risks}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={2}>
                          <Space wrap>
                            <Text strong>{item.kode_risiko || `Risk #${item.id}`}</Text>
                            <Tag
                              color={
                                STATUS_COLOR_MAP[normalizeStatus(item.status_revisi)] || 'default'
                              }
                            >
                              {STATUS_LABEL_MAP[normalizeStatus(item.status_revisi)] ||
                                String(item.status_revisi || 'draft').toUpperCase()}
                            </Tag>
                            <Tag>Versi {item.versi || 1}</Tag>
                          </Space>

                          <Text>{item.nama_risiko || '-'}</Text>

                          <Text type="secondary">
                            Context {item.context_id || '-'} — {getStageLabel(item.stage)} — Ref{' '}
                            {item.ref_id || '-'}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}

                <Space wrap>
                  <Button type="primary" onClick={() => navigate(LIST_PATH)}>
                    Lihat Daftar Risiko
                  </Button>
                  <Button onClick={() => setDuplicateGuard(null)}>Tetap di Form</Button>
                </Space>
              </Space>
            }
            onClose={() => setDuplicateGuard(null)}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={isReadonly || submitting}
          onFinish={handleSubmitRequest}
          onValuesChange={() => setIsDirty(true)}
        >
          {isCreateMode && (
            <>
              <Title level={5}>Langkah 1 — Pilih Sumber Usulan Risiko</Title>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Usulan risiko ini berasal dari mana?"
                description="Pilih sumber risiko terlebih dahulu. Jika Renstra dipilih, sistem memakai jalur Context MR. Jika non-Renstra dipilih, user cukup mengisi data bisnis dan backend otomatis membuat context serta objek risiko."
              />

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Sumber Usulan Risiko"
                    name="proposal_source_type"
                    rules={[
                      {
                        required: true,
                        message: 'Sumber usulan risiko wajib dipilih.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      loading={isLoadingProposalSources}
                      placeholder="Pilih sumber usulan risiko"
                      optionFilterProp="label"
                      options={proposalSourceOptions}
                      onChange={(value) => {
                        form.setFieldsValue({
                          proposal_source_type: value,

                          context_id: undefined,
                          context_item_id: undefined,
                          periode_id: undefined,
                          jenis_dokumen: undefined,
                          renstra_id: undefined,
                          indikator_id: undefined,
                          stage: undefined,
                          ref_id: undefined,
                          source_table: undefined,
                          source_id: undefined,

                          periode_bulan: undefined,
                          periode_triwulan: undefined,
                          periode_semester: undefined,
                          periode_label: undefined,

                          nomor_temuan: undefined,
                          judul_temuan: undefined,
                          tahun_pemeriksaan: undefined,
                          tanggal_dokumen: undefined,
                          ringkasan_temuan: undefined,
                          rekomendasi: undefined,
                          status_tindak_lanjut: undefined,
                          nilai_temuan: undefined,

                          akun_pos: undefined,
                          jenis_transaksi: undefined,
                          nilai_transaksi: undefined,
                          jenis_dokumen_pertanggungjawaban: undefined,
                          status_dokumen: undefined,
                          catatan_koreksi: undefined,

                          nama_kegiatan: undefined,
                          tahapan_pelaksanaan: undefined,
                          lokasi: undefined,
                          output_kegiatan: undefined,
                          kendala_pelaksanaan: undefined,
                          target_pelaksanaan: undefined,

                          nama_kategori_baru: undefined,
                          deskripsi_kategori_baru: undefined,
                          is_renstra_related: undefined,
                          alasan_pengajuan_kategori: undefined,
                          contoh_sumber_risiko: undefined,

                          objek_risiko: undefined,
                          nama_risiko: undefined,
                          uraian_risiko: undefined,
                          penyebab_risiko: undefined,
                          dampak_risiko: undefined,
                          rencana_tindak_lanjut_awal: undefined,
                          pic: undefined,
                          target_waktu: undefined,
                          catatan: undefined,
                        });

                        lastAutoDraftRef.current = {};
                        resetNarrativePreviewState();
                        setDuplicateGuard(null);
                        setAdvancedContextOpen([]);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: '24px' }}>
                <RiskContextForm
                  // 🌟 PATCH CERDAS: Prioritaskan renstra_id murni dari Context yang sedang aktif
                  renstraId={selectedContextResolved?.renstra_id || watchRenstraId || 1}
                  onIndicatorSelected={handleIndicatorSelected}
                />
              </div>

              {!selectedProposalSourceType && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Pilih sumber usulan risiko untuk melanjutkan."
                  description="Form berikutnya akan berubah sesuai sumber yang dipilih."
                />
              )}
            </>
          )}

          {isCreateMode && isRenstraCreateSource && (
            <>
              <Title level={5} style={{ marginTop: 16 }}>
                Mapping Renstra
              </Title>
              <RenstraSelector form={form} disabled={isReadonly || submitting} />
            </>
          )}

          {(!isCreateMode || isRenstraCreateSource) && (
            <>
              <Title level={5}>Konteks Governance</Title>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={isCreateMode ? 'Pilih Context MR' : 'Mapping Context MR'}
                description={
                  isCreateMode
                    ? 'User memilih Context MR yang business-readable. Field teknis seperti periode, renstra, indikator, stage, ref_id, owner user, dan owner division diisi otomatis dari backend response.'
                    : 'Field teknis context ditampilkan sebagai readonly dan tidak dikirim sebagai payload perubahan.'
                }
              />

              <Row gutter={16}>
                <Col xs={24} md={16}>
                  {isCreateMode ? (
                    <Form.Item
                      label="Pilih Context MR"
                      name="context_id"
                      rules={[
                        {
                          required: true,
                          message: 'Context MR wajib dipilih.',
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        allowClear
                        loading={isLoadingContexts}
                        disabled={isReadonly || submitting}
                        placeholder="Pilih context MR"
                        optionFilterProp="label"
                        options={contextOptions}
                      />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item name="context_id" hidden>
                        <Input />
                      </Form.Item>

                      <Form.Item label="Pilih Context MR">
                        <Input disabled value={contextDisplayLabel || '-'} />
                      </Form.Item>
                    </>
                  )}
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label="Status Context">
                    <Input
                      disabled
                      value={
                        isLoadingSelectedContext
                          ? 'Memuat context...'
                          : displayedContext?.status_revisi ||
                            detail?.context?.status_revisi ||
                            detail?.context_status ||
                            detail?.status_context ||
                            detail?.status_revisi_context ||
                            '-'
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* PATCH BARIS 2904 - 2928 */}
              {isCreateMode && selectedContextId && (
                <>
                  <Row gutter={16}>
                    <Col xs={24}>
                      {isRenstraCreateSource ? (
                        /* JALUR RENSTRA: Nilai diatur oleh RiskContextForm, buat hidden item agar tidak tabrakan visual */
                        <Form.Item name="context_item_id" hidden>
                          <Input />
                        </Form.Item>
                      ) : (
                        /* JALUR NON-RENSTRA / DEFAULT: Tampilkan Select asli bawaan sistem */
                        <Form.Item
                          label="Pilih Sumber Perencanaan / Indikator Renstra"
                          name="context_item_id"
                          rules={[
                            {
                              required: true,
                              message: 'Sumber perencanaan wajib dipilih.',
                            },
                          ]}
                        >
                          <Select
                            showSearch
                            allowClear
                            loading={isLoadingContextItems}
                            disabled={isReadonly || submitting || !selectedContextId}
                            placeholder="Pilih sumber perencanaan dari Renstra"
                            optionFilterProp="label"
                            options={contextItemOptions}
                          />
                        </Form.Item>
                      )}
                    </Col>
                  </Row>

                  {!isLoadingContextItems && contextItemOptions.length === 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message="Sumber perencanaan belum tersedia."
                      description="Jalankan endpoint POST /api/mr-planning-context/:contextId/generate-items atau pastikan Context MR sudah memiliki context item."
                    />
                  )}

                  {selectedContextItem && (
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <div>
                          <Text type="secondary">Sumber Terpilih</Text>
                          <div>
                            <b>{getContextItemLabel(selectedContextItem)}</b>
                          </div>
                        </div>

                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Text type="secondary">Stage</Text>
                            <div>
                              <Tag>{getStageLabel(selectedContextItem.stage)}</Tag>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Ref ID</Text>
                            <div>
                              <b>{selectedContextItem.ref_id || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Indikator ID</Text>
                            <div>
                              <b>{selectedContextItem.indikator_id || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Kode Indikator</Text>
                            <div>
                              <b>{selectedContextItem.kode_indikator || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={12}>
                            <Text type="secondary">Nama Indikator</Text>
                            <div>
                              <b>{selectedContextItem.nama_indikator || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Satuan</Text>
                            <div>
                              <b>{selectedContextItem.satuan || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Baseline</Text>
                            <div>
                              <b>{selectedContextItem.baseline || '-'}</b>
                            </div>
                          </Col>

                          <Col xs={24} md={6}>
                            <Text type="secondary">Target Tahun 2</Text>
                            <div>
                              <b>{selectedContextItem.target_tahun_2 || '-'}</b>
                            </div>
                          </Col>
                        </Row>
                      </Space>
                    </Card>
                  )}
                </>
              )}

              {isCreateMode && !isLoadingContexts && contextOptions.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Context MR belum tersedia."
                  description="Buat atau pastikan endpoint GET /api/mr-planning-context mengembalikan data context. Form Risk tidak bisa membuat risiko baru tanpa Context MR."
                />
              )}

              {displayedContext && (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Text type="secondary">Tahun</Text>
                      <div>
                        <b>{displayedContext.tahun || '-'}</b>
                      </div>
                    </Col>

                    <Col xs={24} md={6}>
                      <Text type="secondary">Periode</Text>
                      <div>
                        <b>{displayedContext.periode_label || '-'}</b>
                      </div>
                    </Col>

                    <Col xs={24} md={6}>
                      <Text type="secondary">Dokumen</Text>
                      <div>
                        <b>{displayedContext.jenis_dokumen || '-'}</b>
                      </div>
                    </Col>

                    <Col xs={24} md={6}>
                      <Text type="secondary">OPD</Text>
                      <div>
                        <b>{displayedContext.nama_opd || displayedContext.opd_id || '-'}</b>
                      </div>
                    </Col>
                  </Row>

                  {displayedPrimaryItem && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />

                      <Row gutter={16}>
                        <Col xs={24} md={6}>
                          <Text type="secondary">Stage</Text>
                          <div>
                            <Tag>{displayedPrimaryItem.stage || '-'}</Tag>
                          </div>
                        </Col>

                        <Col xs={24} md={6}>
                          <Text type="secondary">Ref ID</Text>
                          <div>
                            <b>{displayedPrimaryItem.ref_id || '-'}</b>
                          </div>
                        </Col>

                        <Col xs={24} md={6}>
                          <Text type="secondary">Indikator ID</Text>
                          <div>
                            <b>{displayedPrimaryItem.indikator_id || '-'}</b>
                          </div>
                        </Col>

                        <Col xs={24} md={6}>
                          <Text type="secondary">Nama Konteks</Text>
                          <div>
                            <b>{displayedPrimaryItem.nama_konteks || '-'}</b>
                          </div>
                        </Col>
                      </Row>
                    </>
                  )}
                </Card>
              )}

              <Collapse
                activeKey={advancedContextOpen}
                onChange={(keys) =>
                  setAdvancedContextOpen(Array.isArray(keys) ? keys : [keys].filter(Boolean))
                }
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: 'advanced-context',
                    label: 'Lihat mapping teknis otomatis',
                    children: (
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item label="Periode ID" name="periode_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Tahun" name="tahun">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Jenis Dokumen" name="jenis_dokumen">
                            <Input disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Renstra ID" name="renstra_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="OPD ID" name="opd_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Stage" name="stage">
                            <Input disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Ref ID" name="ref_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Indikator ID" name="indikator_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Source Table" name="source_table">
                            <Input disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Source ID" name="source_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Owner User ID" name="owner_user_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item label="Owner Division ID" name="owner_division_id">
                            <InputNumber style={{ width: '100%' }} disabled />
                          </Form.Item>
                        </Col>
                      </Row>
                    ),
                  },
                ]}
              />
            </>
          )}

          {isNonRenstraCreateSource && (
            <>
              <Title level={5}>Langkah 2 — Informasi Periode dan Unit</Title>

              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message="Jalur Non-Renstra"
                description="User cukup mengisi informasi bisnis. Backend otomatis membuat context, objek risiko, kode risiko, skor, level, dan history."
              />

              {!isLoadingRenstraOpd && !renstraOpdResponse && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Renstra OPD aktif belum ditemukan."
                  description="Nama OPD dan Bidang otomatis mengikuti data Renstra aktif dari endpoint /renstra-opd. Jika kosong, pastikan Renstra OPD sudah dibuat dan diaktifkan."
                />
              )}

              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item
                    label="Tahun"
                    name="tahun"
                    rules={[{ required: true, message: 'Tahun wajib diisi.' }]}
                  >
                    <InputNumber style={{ width: '100%' }} placeholder="2026" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item
                    label="Tipe Periode"
                    name="periode_type"
                    rules={[{ required: true, message: 'Tipe periode wajib dipilih.' }]}
                  >
                    <Select
                      placeholder="Pilih tipe periode"
                      options={[
                        { label: 'Bulanan', value: 'bulanan' },
                        { label: 'Triwulan', value: 'triwulan' },
                        { label: 'Semester', value: 'semester' },
                        { label: 'Tahunan', value: 'tahunan' },
                        { label: 'Adhoc', value: 'adhoc' },
                      ]}
                      onChange={() => {
                        form.setFieldsValue({
                          periode_bulan: undefined,
                          periode_triwulan: undefined,
                          periode_semester: undefined,
                          periode_label: undefined,
                        });
                      }}
                    />
                  </Form.Item>
                </Col>

                {selectedPeriodeType === 'bulanan' && (
                  <Col xs={24} md={6}>
                    <Form.Item
                      label="Bulan"
                      name="periode_bulan"
                      rules={[{ required: true, message: 'Bulan wajib dipilih.' }]}
                    >
                      <Select placeholder="Pilih bulan" options={MONTH_OPTIONS} />
                    </Form.Item>
                  </Col>
                )}

                {selectedPeriodeType === 'triwulan' && (
                  <Col xs={24} md={6}>
                    <Form.Item
                      label="Triwulan"
                      name="periode_triwulan"
                      rules={[{ required: true, message: 'Triwulan wajib dipilih.' }]}
                    >
                      <Select placeholder="Pilih triwulan" options={QUARTER_OPTIONS} />
                    </Form.Item>
                  </Col>
                )}

                {selectedPeriodeType === 'semester' && (
                  <Col xs={24} md={6}>
                    <Form.Item
                      label="Semester"
                      name="periode_semester"
                      rules={[{ required: true, message: 'Semester wajib dipilih.' }]}
                    >
                      <Select placeholder="Pilih semester" options={SEMESTER_OPTIONS} />
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Label Periode"
                    name="periode_label"
                    rules={[{ required: true, message: 'Label periode wajib dibuat otomatis.' }]}
                  >
                    <Input disabled placeholder="Otomatis dari tahun dan tipe periode" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="OPD ID"
                    name="opd_id"
                    rules={[
                      {
                        required: true,
                        message: 'OPD ID wajib tersedia dari Renstra aktif atau user login.',
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      disabled
                      placeholder="Otomatis dari Renstra aktif / user login"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Nama OPD"
                    name="nama_opd"
                    rules={[
                      { required: true, message: 'Nama OPD wajib tersedia dari Renstra aktif.' },
                    ]}
                  >
                    <Input disabled placeholder="Otomatis dari Renstra aktif" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label="Unit / Bidang Terkait" name="unit_terkait">
                    <Input placeholder="Contoh: Sekretariat / Bidang terkait" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={5}>Langkah 3 — Informasi Sumber Risiko</Title>

              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Temuan belum terhubung ke master data."
                description="Isian ini juga bisa diisi otomatis lewat tombol &quot;Eskalasi ke Risk Register&quot; pada Modul Pengelolaan Tindak Lanjut Temuan (LHP/Temuan/Rekomendasi) untuk Temuan BPK/BPKP/Inspektorat yang sudah disetujui — nomor temuan, judul temuan, ringkasan, dan rekomendasi akan terisi otomatis dari sana."
              />
              {(selectedSourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_BPK ||
                selectedSourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT ||
                selectedSourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_BPKP) && (
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Nomor Temuan"
                      name="nomor_temuan"
                      rules={[{ required: true, message: 'Nomor temuan wajib diisi.' }]}
                    >
                      <Input placeholder="Contoh: 1.2.14 / INS-001" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={16}>
                    <Form.Item
                      label="Judul Temuan"
                      name="judul_temuan"
                      rules={[{ required: true, message: 'Judul temuan wajib diisi.' }]}
                    >
                      <Input placeholder="Masukkan judul temuan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Tahun Pemeriksaan" name="tahun_pemeriksaan">
                      <InputNumber style={{ width: '100%' }} placeholder="2025" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Tanggal Dokumen" name="tanggal_dokumen">
                      <Input placeholder="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Status Tindak Lanjut" name="status_tindak_lanjut">
                      <Select
                        allowClear
                        placeholder="Pilih status tindak lanjut"
                        options={STATUS_TINDAK_LANJUT_OPTIONS}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Ringkasan Temuan" name="ringkasan_temuan">
                      <TextArea rows={3} placeholder="Ringkas substansi temuan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Rekomendasi" name="rekomendasi">
                      <TextArea rows={3} placeholder="Masukkan rekomendasi pemeriksa" />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {selectedSourceCode === PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Nama Kegiatan"
                      name="nama_kegiatan"
                      rules={[{ required: true, message: 'Nama kegiatan wajib diisi.' }]}
                    >
                      <Input placeholder="Masukkan nama kegiatan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label="Tahapan Pelaksanaan" name="tahapan_pelaksanaan">
                      <Input placeholder="Contoh: persiapan / pelaksanaan / evaluasi" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Lokasi" name="lokasi">
                      <Input placeholder="Lokasi kegiatan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Output Kegiatan" name="output_kegiatan">
                      <Input placeholder="Output yang diharapkan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Target Pelaksanaan" name="target_pelaksanaan">
                      <Input placeholder="Contoh: Triwulan I 2026" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Kendala Pelaksanaan" name="kendala_pelaksanaan">
                      <TextArea rows={3} placeholder="Masukkan kendala pelaksanaan" />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {(selectedSourceCode === PROPOSAL_SOURCE.LAPORAN_KEUANGAN ||
                selectedSourceCode === PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN) && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        selectedSourceCode === PROPOSAL_SOURCE.LAPORAN_KEUANGAN
                          ? 'Akun / Pos Laporan'
                          : 'Jenis Dokumen Pertanggungjawaban'
                      }
                      name={
                        selectedSourceCode === PROPOSAL_SOURCE.LAPORAN_KEUANGAN
                          ? 'akun_pos'
                          : 'jenis_dokumen_pertanggungjawaban'
                      }
                      rules={[{ required: true, message: 'Field ini wajib diisi.' }]}
                    >
                      <Input placeholder="Masukkan akun/pos atau jenis dokumen" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label="Jenis Transaksi" name="jenis_transaksi">
                      <Input placeholder="Contoh: Belanja kegiatan" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Nilai Transaksi" name="nilai_transaksi">
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Status Dokumen" name="status_dokumen">
                      <Select
                        allowClear
                        placeholder="Pilih status dokumen"
                        options={STATUS_DOKUMEN_OPTIONS}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Catatan Koreksi" name="catatan_koreksi">
                      <TextArea rows={3} placeholder="Catatan koreksi jika ada" />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {isCustomCreateSource && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Nama Kategori Baru"
                      name="nama_kategori_baru"
                      rules={[{ required: true, message: 'Nama kategori baru wajib diisi.' }]}
                    >
                      <Input placeholder="Contoh: Pengaduan Masyarakat" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label="Terkait Renstra?" name="is_renstra_related">
                      <Select
                        placeholder="Pilih status keterkaitan"
                        options={[
                          { label: 'Ya', value: true },
                          { label: 'Tidak', value: false },
                          { label: 'Belum diketahui', value: null },
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item
                      label="Deskripsi Kategori Baru"
                      name="deskripsi_kategori_baru"
                      rules={[{ required: true, message: 'Deskripsi kategori wajib diisi.' }]}
                    >
                      <TextArea rows={3} placeholder="Jelaskan kategori baru" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item
                      label="Alasan Pengajuan Kategori"
                      name="alasan_pengajuan_kategori"
                      rules={[{ required: true, message: 'Alasan pengajuan wajib diisi.' }]}
                    >
                      <TextArea rows={3} placeholder="Mengapa kategori ini diperlukan?" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="Contoh Sumber Risiko" name="contoh_sumber_risiko">
                      <TextArea rows={3} placeholder="Berikan contoh sumber risiko" />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message="Kategori baru akan masuk review."
                      description="Kategori baru tidak langsung menjadi kategori resmi. Backend akan menyimpan status custom_category_status = pending_review."
                    />
                  </Col>
                </Row>
              )}

              {(selectedSourceCode === PROPOSAL_SOURCE.LAKIP ||
                selectedSourceCode === PROPOSAL_SOURCE.SPIP_E_SIGAP ||
                selectedSourceCode === PROPOSAL_SOURCE.MANUAL_ADHOC) && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Sumber ini memakai form umum objek risiko."
                  description="Isi objek risiko, uraian risiko, penyebab, dampak, penilaian awal, dan rencana tindak lanjut pada bagian berikutnya."
                />
              )}

              <Divider />

              <Title level={5}>Langkah 4 — Objek Risiko</Title>

              {isNonRenstraCreateSource && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Objek Risiko dapat diisi dari preview draft backend."
                  description="Isi data dasar terlebih dahulu, klik Buat Preview Draft pada bagian Identifikasi Risiko, lalu gunakan draft jika sudah sesuai. User tetap boleh mengedit objek risiko sebelum simpan."
                />
              )}

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    label="Objek Risiko"
                    name="objek_risiko"
                    rules={[{ required: true, message: 'Objek risiko wajib diisi.' }]}
                  >
                    <Input placeholder="Contoh: Penyelenggaraan CPPD / SPJ kegiatan / pengaduan masyarakat" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          {shouldShowRiskInput && (
            <>
              <Divider />

              <Title level={5}>
                {isCreateMode ? 'Langkah 5 — Identifikasi Risiko' : 'Identifikasi Risiko'}
              </Title>

              {isNonRenstraCreateSource && (
                <Card
                  size="small"
                  style={{ marginBottom: 16 }}
                  title="Preview Draft Narasi Risiko"
                  extra={
                    <Button
                      type="primary"
                      size="small"
                      onClick={handlePreviewNarrativeDraft}
                      loading={narrativePreviewLoading}
                      disabled={
                        isReadonly ||
                        submitting ||
                        narrativePreviewLoading ||
                        !isNarrativePreviewReady
                      }
                    >
                      Buat Preview Draft
                    </Button>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Alert
                      type="info"
                      showIcon
                      message="Draft narasi otomatis dibuat oleh sistem."
                      description="Draft ini hanya bantuan awal. Pengguna wajib mereview, menyesuaikan, dan memastikan substansinya benar sebelum disimpan."
                    />

                    {!isNarrativePreviewReady && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Data dasar belum lengkap."
                        description="Isi minimal sumber usulan risiko, judul/objek risiko, dan ringkasan temuan atau uraian sumber risiko untuk membuat preview draft narasi."
                      />
                    )}

                    {narrativePreviewError && (
                      <Alert
                        type="error"
                        showIcon
                        message="Preview draft narasi gagal."
                        description={narrativePreviewError}
                        closable
                        onClose={() => setNarrativePreviewError('')}
                      />
                    )}

                    {narrativePreview && (
                      <Card size="small" type="inner" title="Hasil Draft Narasi Otomatis">
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <Alert
                            type="warning"
                            showIcon
                            message="Draft perlu review pengguna."
                            description={
                              narrativePreview?._meta?.fallback_used
                                ? 'Draft dibuat menggunakan mode aman sistem. Review dan sesuaikan sebelum disimpan.'
                                : 'Draft narasi otomatis berhasil dibuat. Review dan sesuaikan sebelum disimpan.'
                            }
                          />

                          <div>
                            <Text type="secondary">Rekomendasi</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              <b>{narrativePreview.rekomendasi || '-'}</b>
                            </div>
                          </div>

                          <div>
                            <Text type="secondary">Objek Risiko</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {narrativePreview.objek_risiko || '-'}
                            </div>
                          </div>

                          <div>
                            <Text type="secondary">Nama Risiko</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {narrativePreview.nama_risiko || '-'}
                            </div>
                          </div>

                          <div>
                            <Text type="secondary">Uraian Risiko</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {narrativePreview.uraian_risiko || '-'}
                            </div>
                          </div>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Text type="secondary">Penyebab Risiko</Text>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {narrativePreview.penyebab_risiko || '-'}
                              </div>
                            </Col>

                            <Col xs={24} md={12}>
                              <Text type="secondary">Dampak Risiko</Text>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {narrativePreview.dampak_risiko || '-'}
                              </div>
                            </Col>
                          </Row>

                          <div>
                            <Text type="secondary">Rencana Tindak Lanjut Awal</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {narrativePreview.rencana_tindak_lanjut_awal || '-'}
                            </div>
                          </div>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Text type="secondary">PIC</Text>
                              <div>{narrativePreview.pic || '-'}</div>
                            </Col>

                            <Col xs={24} md={12}>
                              <Text type="secondary">Target Waktu</Text>
                              <div>{narrativePreview.target_waktu || '-'}</div>
                            </Col>
                          </Row>

                          <div>
                            <Text type="secondary">Catatan</Text>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {narrativePreview.catatan || '-'}
                            </div>
                          </div>

                          {Array.isArray(narrativePreview.basis_ringkasan) &&
                            narrativePreview.basis_ringkasan.length > 0 && (
                              <div>
                                <Text type="secondary">Basis Ringkasan</Text>
                                <ul style={{ marginBottom: 0 }}>
                                  {narrativePreview.basis_ringkasan.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          <Space wrap>
                            <Button
                              type="primary"
                              onClick={handleApplyNarrativeDraft}
                              disabled={isReadonly || submitting}
                            >
                              Gunakan Draft
                            </Button>

                            {narrativeDraftApplied && (
                              <Tag color="success">Draft sudah diterapkan ke form</Tag>
                            )}

                            <Tag color="warning">Wajib review sebelum simpan</Tag>
                          </Space>
                        </Space>
                      </Card>
                    )}
                  </Space>
                </Card>
              )}

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="Kode Risiko" name="kode_risiko">
                    <Input disabled placeholder="Otomatis dibuat oleh backend" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label="Kategori Risiko" name="kategori_risiko_ref_id">
                    <Select
                      showSearch
                      allowClear
                      loading={isLoadingRiskCategory}
                      placeholder="Pilih kategori risiko"
                      optionFilterProp="label"
                      options={riskCategoryOptions}
                      onChange={(value) => {
                        form.setFieldValue('kategori_risiko_ref_id', value);
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={4}>
                  <Form.Item label="Status Revisi" name="status_revisi">
                    <Input disabled placeholder="Draft otomatis dari backend" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={4}>
                  <Form.Item label="Versi" name="versi">
                    <InputNumber style={{ width: '100%' }} disabled />
                  </Form.Item>
                </Col>

                {isNonRenstraCreateSource && (
                  <Col xs={24}>
                    <Form.Item label="Rekomendasi" name="rekomendasi">
                      <TextArea
                        rows={3}
                        placeholder="Rekomendasi akan diisi dari preview draft backend atau dapat diedit manual oleh user"
                      />
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24}>
                  <Form.Item
                    label="Nama Risiko"
                    name="nama_risiko"
                    rules={[{ required: true, message: 'Nama risiko wajib diisi.' }]}
                  >
                    <Input placeholder="Masukkan nama risiko perencanaan" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item label="Uraian Risiko" name="uraian_risiko">
                    <TextArea rows={3} placeholder="Uraikan risiko secara jelas" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Penyebab Risiko" name="penyebab_risiko">
                    <TextArea rows={3} placeholder="Masukkan penyebab risiko" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Dampak Risiko" name="dampak_risiko">
                    <TextArea rows={3} placeholder="Masukkan dampak risiko" />
                  </Form.Item>
                </Col>
                {isNonRenstraCreateSource && (
                  <>
                    <Col xs={24}>
                      <Form.Item
                        label="Rencana Tindak Lanjut Awal"
                        name="rencana_tindak_lanjut_awal"
                      >
                        <TextArea rows={3} placeholder="Masukkan rencana tindak lanjut awal" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="PIC" name="pic">
                        <Input placeholder="Penanggung jawab tindak lanjut" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Target Waktu" name="target_waktu">
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item label="Catatan" name="catatan">
                        <TextArea rows={2} placeholder="Catatan tambahan jika ada" />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>

              <Divider />

              <Col xs={24} md={8}>
                <Form.Item label="Sumber Risiko" name="sumber_risiko_ref_id">
                  <Select
                    showSearch
                    allowClear
                    loading={isLoadingRiskSource}
                    placeholder="Pilih sumber risiko"
                    optionFilterProp="label"
                    options={riskSourceOptions}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Selera Risiko" name="selera_risiko_ref_id">
                  <Select
                    showSearch
                    allowClear
                    loading={isLoadingRiskAppetite}
                    placeholder="Pilih selera risiko"
                    optionFilterProp="label"
                    options={riskAppetiteOptions}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Status Risiko" name="status_risiko_ref_id">
                  <Select
                    showSearch
                    allowClear
                    loading={isLoadingRiskStatus}
                    placeholder="Pilih status risiko"
                    optionFilterProp="label"
                    options={riskStatusOptions}
                  />
                </Form.Item>
              </Col>

              <Title level={5}>Analisis Risiko</Title>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Analisis Risiko memakai reference backend"
                description="Frontend hanya memilih Kemungkinan dan Dampak dari mr_reference_items. Payload hanya mengirim kemungkinan_ref_id dan dampak_ref_id. Skor, level, matrix, dan appetite final tetap dihitung dan ditentukan backend."
              />

              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item
                    label="Kemungkinan"
                    name="kemungkinan_ref_id"
                    rules={[
                      {
                        required: isCreateMode,
                        message: 'Kemungkinan wajib dipilih.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      loading={isLoadingLikelihood}
                      placeholder="Pilih kemungkinan"
                      optionFilterProp="label"
                      options={likelihoodOptions}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item
                    label="Dampak"
                    name="dampak_ref_id"
                    rules={[
                      {
                        required: isCreateMode,
                        message: 'Dampak wajib dipilih.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      loading={isLoadingImpact}
                      placeholder="Pilih dampak"
                      optionFilterProp="label"
                      options={impactOptions}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item label="Skor Risiko Preview" name="skor_risiko">
                    <InputNumber style={{ width: '100%' }} min={1} disabled placeholder="Preview" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item label="Level Risiko Preview" name="level_risiko">
                    <Select disabled placeholder="Preview" options={LEVEL_RISIKO_OPTIONS} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Alert
                    type="info"
                    showIcon
                    message="Catatan Mitigasi"
                    description="Existing control dan rencana tindak pengendalian tidak disimpan pada form ini. Field tersebut masuk ke modul mitigation/control agar tidak mencampur risk register dengan pengendalian."
                  />
                </Col>
              </Row>

              {(isRevisiMode || isEditMode) && (
                <>
                  <Divider />

                  <Title level={5}>Alasan Perubahan</Title>

                  <Form.Item
                    label="Alasan Revisi"
                    name="alasan_revisi"
                    rules={[
                      {
                        required: isRevisiMode,
                        message: 'Alasan revisi wajib diisi untuk mode revisi.',
                      },
                    ]}
                  >
                    <TextArea rows={3} placeholder="Jelaskan alasan revisi/perubahan data" />
                  </Form.Item>
                </>
              )}

              {!isReadonly && (
                <>
                  <Divider />

                  <Space>
                    <Button onClick={() => navigate(LIST_PATH)}>Batal</Button>

                    {canUsePlaceholderRepair && !isCreateMode && (
                      <Button onClick={handleRepairPlaceholderPreview} loading={repairLoading}>
                        Repair Placeholder
                      </Button>
                    )}

                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={isRevisiMode ? <SendOutlined /> : <SaveOutlined />}
                      loading={submitting}
                    >
                      {isRevisiMode ? 'Simpan Revisi' : 'Simpan'}
                    </Button>
                  </Space>
                </>
              )}
            </>
          )}
        </Form>
      </Card>
      <MrConfirmSubmitDialog
        open={showConfirm}
        title="Konfirmasi Simpan Risiko"
        message="Pastikan data sudah benar sebelum disimpan."
        onConfirm={handleConfirmed}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

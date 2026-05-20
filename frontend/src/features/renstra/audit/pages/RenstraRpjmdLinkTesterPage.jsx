import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Spin,
  Tag,
  Table,
  Typography,
} from 'antd';

import api from '@/services/api';
import { useDokumen } from '@/hooks/useDokumen';
import { useAuth } from '@/hooks/useAuth';
import { usePeriodeAktif } from '@/features/rpjmd/hooks/usePeriodeAktif';
import { normalizeRole } from '@/utils/roleUtils';
import {
  buildGovernanceUiMessage,
  getPreparedRpjmdSource,
  getSubKegiatanTargetProvisionStatus,
  provisionSubKegiatanRenstraTarget,
  resolveRpjmdSourceMap,
  smartSyncRpjmdIndicatorsToRenstra,
} from '@/features/renstra/services/renstraApi';
import {
  buildProvisionPayload,
  canRenderProvisionButton,
  getParentTargetRefId,
  getProvisionAction,
  getProvisionTargetRefId,
  getTargetRefId,
  isMissingTarget,
  normalizeGovernanceResult,
} from '@/features/renstra/audit/utils/governanceFlowAdapter';

const { Title, Text } = Typography;

function rowsOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (d?.success && Array.isArray(d.data)) return d.data;
  return [];
}

function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function toIdNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function compactText(v) {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStructureCode(value) {
  return String(value ?? '')
    .replace(/[\s\u00A0]+/g, '')
    .trim()
    .toUpperCase();
}

function extractLabelName(label, code = '') {
  const text = compactText(label);
  const normalizedCode = compactText(code);
  if (!text) return '';
  if (normalizedCode && text.startsWith(`${normalizedCode} - `)) {
    return compactText(text.slice(normalizedCode.length + 3));
  }
  const parts = text.split(' - ');
  return parts.length > 1 ? compactText(parts.slice(1).join(' - ')) : text;
}

const GOVERNANCE_SOURCE_STAGE_BY_LEVEL = {
  tujuan: 'tujuan',
  sasaran: 'sasaran',
  strategi: 'strategi',
  arah: 'kebijakan',
  program: 'program',
  kegiatan: 'kegiatan',
  subKegiatan: 'sub_kegiatan',
};

const GOVERNANCE_BLOCKING_CODES = new Set([
  'missing_target',
  'chain_mismatch',
  'resolver_conflict',
  'blocked',
]);

function extractPreparedSourceRows(payload) {
  const rows = payload?.rows ?? payload?.data?.rows ?? payload?.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

function join2(a, b) {
  const aa = compactText(a);
  const bb = compactText(b);
  if (!aa && !bb) return '';
  if (!aa) return bb;
  if (!bb) return aa;
  return `${aa} - ${bb}`;
}

const LEVEL_ORDER = [
  'visiId',
  'misiId',
  'tujuanId',
  'sasaranId',
  'strategiId',
  'arahId',
  'programId',
  'kegiatanId',
  'subKegiatanId',
];

const EMPTY_SELECTION = {
  visiId: null,
  misiId: null,
  tujuanId: null,
  sasaranId: null,
  strategiId: null,
  arahId: null,
  programId: null,
  kegiatanId: null,
  subKegiatanId: null,
};

const TABLE_COLUMNS = [
  { title: 'Renstra ID', dataIndex: 'idRenstra', key: 'idRenstra', width: 110 },
  { title: 'Nama Renstra', dataIndex: 'renstra', key: 'renstra', ellipsis: true },
  { title: 'RPJMD ID', dataIndex: 'rpjmdId', key: 'rpjmdId', width: 110 },
  { title: 'Nama RPJMD', dataIndex: 'rpjmd', key: 'rpjmd', ellipsis: true },
];

const APP_THEME = {
  page: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    border: '#e5e7eb',
    borderStrong: '#cbd5e1',
    text: '#111827',
    muted: '#6b7280',
    softText: '#374151',
    primary: '#1d4ed8',
    primaryHover: '#1e40af',
    primarySoft: '#dbeafe',
    success: '#15803d',
    successSoft: '#dcfce7',
    warning: '#b45309',
    warningSoft: '#fef3c7',
    danger: '#b91c1c',
    dangerSoft: '#fee2e2',
    info: '#0f766e',
    infoSoft: '#ccfbf1',
    focus: '#60a5fa',
  },
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
  radiusLg: 14,
  radiusXl: 18,
};

const PAGE_STYLE = {
  minHeight: '100vh',
  padding: 16,
  background:
    'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 14%, rgba(248,250,252,1) 100%)',
};

const HERO_STYLE = {
  background: APP_THEME.page.surface,
  border: `1px solid ${APP_THEME.page.border}`,
  borderRadius: APP_THEME.radiusXl,
  boxShadow: APP_THEME.shadowSm,
  padding: 16,
  marginBottom: 12,
};

const PANEL_STYLE = {
  background: APP_THEME.page.surface,
  border: `1px solid ${APP_THEME.page.border}`,
  borderRadius: APP_THEME.radiusXl,
  boxShadow: APP_THEME.shadowSm,
};

const INNER_CARD_STYLE = {
  borderRadius: APP_THEME.radiusLg,
  border: `1px solid ${APP_THEME.page.border}`,
  boxShadow: 'none',
};

const FIELD_WRAPPER_STYLE = {
  background: APP_THEME.page.surface,
  border: `1px solid ${APP_THEME.page.border}`,
  borderRadius: APP_THEME.radiusLg,
  padding: 12,
};

const FIELD_HELPER_STYLE = {
  color: APP_THEME.page.muted,
  fontSize: 12,
  lineHeight: 1.55,
};

const STATUS_TAG_STYLE = {
  marginInlineStart: 8,
  borderRadius: 999,
  fontWeight: 600,
};

const INDICATOR_STAGE_BY_LEVEL = {
  tujuan: 'tujuan',
  sasaran: 'sasaran',
  strategi: 'strategi',
  arah: 'kebijakan',
  program: 'program',
  kegiatan: 'kegiatan',
  subKegiatan: 'sub_kegiatan',
};

const INDICATOR_LEVEL_LABEL = {
  tujuan: 'Tujuan',
  sasaran: 'Sasaran',
  strategi: 'Strategi',
  arah: 'Arah Kebijakan',
  program: 'Program',
  kegiatan: 'Kegiatan',
  subKegiatan: 'Sub Kegiatan',
};

function getIndicatorName(row) {
  return (
    compactText(
      firstDefined(
        row?.nama_indikator,
        row?.indikator?.nama_indikator,
        row?.indikator?.nama,
        row?.nama,
        row?.nama_indikator_renstra,
      ),
    ) || `Indikator ${row?.id ?? '-'}`
  );
}

function isSuperAdminSyncRoleError(error) {
  const response = error?.response?.data || error?.data || null;
  const code = String(response?.code || error?.code || '').trim();
  const status = Number(error?.response?.status || error?.status || 0);
  const roleErrorMessage = Array.isArray(response?.errors)
    ? response.errors.some((item) => String(item?.field || '').trim() === 'actor_role')
    : false;

  return (
    status === 403 ||
    code === 'MR_ROLE_FORBIDDEN' ||
    code === 'MR_USER_ROLE_MISSING' ||
    code === 'MR_USER_NOT_AUTHENTICATED' ||
    (code === 'RPJMD_INDICATOR_SYNC_VALIDATION_ERROR' && roleErrorMessage)
  );
}

function getFieldStatusTone(value, disabled, loading) {
  if (loading) return { color: 'blue', label: 'Memuat' };
  if (value !== null && value !== undefined && value !== '')
    return { color: 'success', label: 'Valid' };
  if (disabled) return { color: 'default', label: 'Menunggu' };
  return { color: 'warning', label: 'Belum dipilih' };
}

function renderFieldSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled,
  loading,
  helper,
}) {
  const tone = getFieldStatusTone(value, disabled, loading);

  return (
    <div style={FIELD_WRAPPER_STYLE}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Text strong style={{ color: APP_THEME.page.text }}>
          {label}
        </Text>
        <Tag color={tone.color} style={STATUS_TAG_STYLE}>
          {tone.label}
        </Tag>
      </div>
      {helper ? <div style={FIELD_HELPER_STYLE}>{helper}</div> : null}
      <div style={{ marginTop: 8 }}>
        <Select
          style={{ width: '100%' }}
          value={value ?? undefined}
          onChange={onChange}
          placeholder={placeholder}
          options={options}
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={disabled}
          loading={loading}
        />
      </div>
    </div>
  );
}

function IndicatorPanel({
  levelKey,
  renstraId,
  renstraDocId,
  targetRow,
  targetRefIdOverride,
  sourceRefIdOverride,
}) {
  const { message: messageApi } = App.useApp();
  const stage = INDICATOR_STAGE_BY_LEVEL[levelKey] || null;
  const levelLabel = INDICATOR_LEVEL_LABEL[levelKey] || levelKey;
  const sourceDocId = toIdNumber(firstDefined(renstraDocId, targetRow?.rpjmdDocId));
  const targetRefId = toIdNumber(firstDefined(targetRefIdOverride, targetRow?.idRenstra));
  const sourceRefId = toIdNumber(firstDefined(sourceRefIdOverride, targetRow?.rpjmdId));
  const targetLabel = compactText(targetRow?.renstra);
  const queryEnabled = !!toIdNumber(renstraId) && !!stage && !!targetRefId;
  const canSync = Boolean(renstraId && stage && targetRefId && sourceRefId && sourceDocId);
  const [lastSyncSummary, setLastSyncSummary] = useState({
    attempted: false,
    sourceCount: null,
  });
  const [lastSmartSync, setLastSmartSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const {
    data: indicatorRows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['indikator-renstra', renstraId, stage, targetRefId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage,
          ref_id: targetRefId,
        },
      });
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: queryEnabled,
    retry: 1,
  });

  const handleSyncIndicators = useCallback(async () => {
    if (!canSync || syncing) return;

    setSyncing(true);
    setLastSmartSync(null);
    try {
      const result = await smartSyncRpjmdIndicatorsToRenstra({
        rpjmd_id: sourceDocId,
        renstra_id: renstraId,
        target_module: 'RENSTRA',
        source_stage: stage,
        source_ref_id: sourceRefId,
        target_ref_id: targetRefId,
        auto_repair: true,
        repair_mode: 'safe_only',
        reason: 'Smart auto-healing indikator berdasarkan hirarki kode.',
      });

      const diagnosisStatus = String(result?.data?.diagnosis?.status || result?.code || '').trim();
      const created = Number(result?.data?.sync?.created ?? result?.data?.created ?? 0);
      const updated = Number(result?.data?.sync?.updated ?? result?.data?.updated ?? 0);
      const sourceCount = Number(
        result?.data?.sync?.source_count ?? result?.data?.source_count ?? 0,
      );
      setLastSmartSync(result?.data || null);
      setLastSyncSummary({
        attempted: true,
        sourceCount: Number.isFinite(sourceCount) ? sourceCount : null,
      });
      if (diagnosisStatus === 'SYNCED_VERIFIED') {
        messageApi?.success?.(
          result?.message ||
            'Indikator berhasil diperiksa, diperbaiki, disinkronkan, dan diverifikasi.',
        );
      } else if (
        diagnosisStatus === 'SOURCE_FK_NULL_BUT_CODE_MATCH_FOUND' ||
        diagnosisStatus === 'SOURCE_FK_WRONG_BUT_CODE_MATCH_FOUND'
      ) {
        messageApi?.success?.(
          'Indikator sumber ditemukan berdasarkan kode hirarki, FK sumber diperbaiki otomatis, dan indikator berhasil diturunkan.',
        );
      } else if (diagnosisStatus === 'AMBIGUOUS_HIERARCHY_MATCH') {
        messageApi?.warning?.(
          'Sistem menemukan lebih dari satu kandidat relasi. Perlu konfirmasi Super Admin.',
        );
      } else if (diagnosisStatus === 'NO_SOURCE_INDICATOR') {
        messageApi?.info?.('Tidak ada indikator RPJMD sumber yang dapat dikenali untuk level ini.');
      } else if (created > 0 || updated > 0) {
        messageApi?.success?.(result?.message || 'Indikator berhasil diturunkan ke Renstra.');
      } else {
        messageApi?.info?.(result?.message || 'Tidak ada perubahan indikator.');
      }

      await refetch();
    } catch (error) {
      const fallbackMessage = isSuperAdminSyncRoleError(error)
        ? 'Sinkronisasi indikator hanya dapat dijalankan oleh Super Admin.'
        : 'Gagal menurunkan indikator ke Renstra.';
      messageApi?.error?.(buildGovernanceUiMessage(error, fallbackMessage));
    } finally {
      setLastSmartSync(null);
      setSyncing(false);
    }
  }, [
    canSync,
    renstraId,
    refetch,
    sourceDocId,
    sourceRefId,
    stage,
    syncing,
    messageApi,
    targetRefId,
  ]);

  const indicatorColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
      {
        title: 'Nama Indikator',
        key: 'nama_indikator',
        ellipsis: true,
        render: (_, row) => getIndicatorName(row),
      },
    ],
    [],
  );

  const indicatorData = useMemo(
    () => (Array.isArray(indicatorRows) ? indicatorRows : []),
    [indicatorRows],
  );

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: APP_THEME.radiusLg,
        border: `1px solid ${APP_THEME.page.border}`,
        background: APP_THEME.page.surfaceAlt,
      }}
    >
      <Space wrap size={[8, 8]} style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: APP_THEME.page.text, fontSize: 13 }}>
            Indikator {levelLabel}
          </Text>
          <Text style={{ color: APP_THEME.page.muted, fontSize: 12 }}>
            Ditampilkan per level agar target, stage, dan ref_id tetap terlihat jelas.
          </Text>
        </Space>
        <Space wrap size={[6, 6]}>
          <Tag color={targetRefId ? 'green' : 'default'} style={STATUS_TAG_STYLE}>
            target_ref_id={targetRefId ?? '-'}
          </Tag>
          <Tag color={stage ? 'blue' : 'default'} style={STATUS_TAG_STYLE}>
            stage={stage || '-'}
          </Tag>
          <Tag color={renstraId ? 'cyan' : 'default'} style={STATUS_TAG_STYLE}>
            renstra_id={renstraId ?? '-'}
          </Tag>
          <Tag color={sourceDocId ? 'purple' : 'default'} style={STATUS_TAG_STYLE}>
            rpjmd_id={sourceDocId ?? '-'}
          </Tag>
        </Space>
      </Space>

      {!targetRefId ? (
        <Alert
          type="info"
          showIcon
          message="Indikator menunggu target Renstra yang valid"
          description="Panel ini tidak menggunakan ID RPJMD sebagai ref_id. Indikator baru ditarik setelah mapping Renstra ditemukan."
          style={{ marginTop: 10, borderRadius: APP_THEME.radiusLg }}
        />
      ) : isLoading ? (
        <Space style={{ marginTop: 10 }}>
          <Spin size="small" />
          <Text style={{ color: APP_THEME.page.muted }}>Memuat indikator Renstra...</Text>
        </Space>
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat indikator Renstra"
          description={buildGovernanceUiMessage(
            error,
            'Indikator tidak dapat dimuat untuk target Renstra ini.',
          )}
          style={{ marginTop: 10, borderRadius: APP_THEME.radiusLg }}
        />
      ) : indicatorData.length > 0 ? (
        <Table
          size="small"
          rowKey={(row) => String(row?.id ?? `${stage}-${targetRefId}`)}
          columns={indicatorColumns}
          dataSource={indicatorData}
          pagination={{ pageSize: 3, showSizeChanger: false }}
          style={{ marginTop: 10 }}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message={
            lastSyncSummary.attempted && lastSyncSummary.sourceCount === 0
              ? `Belum ada indikator RPJMD sumber untuk ${levelLabel} ini`
              : 'Indikator sumber RPJMD tersedia, tetapi belum diturunkan ke Renstra'
          }
          description={
            lastSyncSummary.attempted && lastSyncSummary.sourceCount === 0
              ? `Target Renstra ${targetLabel || '-'} pada stage ${stage || '-'} belum memiliki indikator RPJMD sumber yang dapat disinkronkan. Tambahkan indikator sumber RPJMD untuk level ${levelLabel} ini terlebih dahulu.`
              : `Target Renstra ${targetLabel || '-'} pada stage ${stage || '-'} belum memiliki indikator yang dapat ditampilkan. Jalankan sinkronisasi resmi agar indikator tampil tanpa cek database manual.`
          }
          action={
            <Button
              type="primary"
              onClick={handleSyncIndicators}
              loading={syncing}
              disabled={!canSync || isLoading || isError}
            >
              Periksa & Turunkan Indikator ke Renstra
            </Button>
          }
          style={{ marginTop: 10, borderRadius: APP_THEME.radiusLg }}
        />
      )}

      {lastSmartSync ? (
        <Alert
          type="success"
          showIcon
          message={`Smart sync indikator: ${String(lastSmartSync?.diagnosis?.status || '-')}`}
          description={
            <Space direction="vertical" size={0}>
              <Text style={{ color: APP_THEME.page.softText }}>
                source_count={String(lastSmartSync?.sync?.source_count ?? 0)} | created_count=
                {String(lastSmartSync?.sync?.created ?? 0)} | updated_count=
                {String(lastSmartSync?.sync?.updated ?? 0)} | skipped_count=
                {String(lastSmartSync?.sync?.skipped ?? 0)} | blocked_count=
                {String(lastSmartSync?.sync?.blocked ?? 0)}
              </Text>
              <Text style={{ color: APP_THEME.page.softText }}>
                renstra_id={String(lastSmartSync?.verify?.renstra_id ?? renstraId ?? '-')} | stage=
                {String(lastSmartSync?.verify?.stage ?? stage ?? '-')} | ref_id=
                {String(lastSmartSync?.verify?.ref_id ?? targetRefId ?? '-')}
              </Text>
            </Space>
          }
          style={{ marginTop: 10, borderRadius: APP_THEME.radiusLg }}
        />
      ) : null}
    </div>
  );
}

function mapRenstraRow(levelKey, r) {
  switch (levelKey) {
    case 'tujuan': {
      const rpjmdId = firstDefined(r?.rpjmd_tujuan_id, r?.tujuan_rpjmd_id);
      return {
        key: `tujuan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.no_tujuan, r?.isi_tujuan),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.no_rpjmd, r?.isi_tujuan_rpjmd),
      };
    }
    case 'sasaran': {
      const rpjmdId = firstDefined(r?.rpjmd_sasaran_id, r?.sasaran_rpjmd_id);
      return {
        key: `sasaran-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.nomor, r?.isi_sasaran),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.no_rpjmd, r?.isi_sasaran_rpjmd),
      };
    }
    case 'strategi': {
      const rpjmdId = firstDefined(r?.rpjmd_strategi_id, r?.strategi_rpjmd_id);
      return {
        key: `strategi-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_strategi, r?.deskripsi),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.no_rpjmd, r?.isi_strategi_rpjmd),
      };
    }
    case 'arah': {
      const rpjmdId = firstDefined(r?.rpjmd_arah_id, r?.rpjmd_arah_kebijakan_id);
      return {
        key: `arah-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_kebjkn, r?.deskripsi),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.no_arah_rpjmd, r?.isi_arah_rpjmd),
      };
    }
    case 'program': {
      const rpjmdId = firstDefined(r?.rpjmd_program_id, r?.program_rpjmd_id);
      return {
        key: `program-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_program, r?.nama_program),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.kode_program, r?.nama_program),
      };
    }
    case 'kegiatan': {
      const rpjmdId = firstDefined(r?.rpjmd_kegiatan_id, r?.kegiatan_rpjmd_id);
      return {
        key: `kegiatan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_kegiatan, r?.nama_kegiatan),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.kode_kegiatan_rpjmd, r?.nama_kegiatan_rpjmd),
      };
    }
    case 'subKegiatan': {
      const rpjmdId = firstDefined(r?.subkegiatan_id, r?.sub_kegiatan_id, r?.sub_kegiatan?.id);
      return {
        key: `subkegiatan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_sub_kegiatan, r?.nama_sub_kegiatan),
        rpjmdId,
        rpjmdDocId: toIdNumber(
          firstDefined(r?.renstra?.rpjmd_id, r?.renstra?.rpjmdId, r?.rpjmd_id),
        ),
        rpjmd: join2(r?.kode_sub_kegiatan_rpjmd, r?.nama_sub_kegiatan_rpjmd),
      };
    }
    default:
      return {
        key: `row-${r?.id}`,
        idRenstra: r?.id,
        renstra: String(r?.id ?? ''),
        rpjmdId: null,
        rpjmd: '',
      };
  }
}

function filterByRenstraIdIfPossible(rows, renstraId) {
  if (!renstraId) return rows;
  const hasRenstraId = rows.some((r) => r?.renstra_id !== null && r?.renstra_id !== undefined);
  if (hasRenstraId) {
    return rows.filter((r) => Number(r.renstra_id) === Number(renstraId));
  }
  const hasRenstraNested = rows.some(
    (r) => r?.renstra?.id !== null && r?.renstra?.id !== undefined,
  );
  if (hasRenstraNested) {
    return rows.filter((r) => Number(r.renstra?.id) === Number(renstraId));
  }
  return rows;
}

function MatchSection({
  title,
  selectedId,
  selectedLabel,
  selectedCode,
  selectedParentId,
  resolverStatusCode,
  canProvisionTarget,
  provisionTargetReady,
  onProvisionTarget,
  provisioning,
  levelKey,
  renstraId,
  renstraDocId,
  matchedRows,
  allRows,
  onUseRpjmdId,
  using,
  onApplyToDb,
  applying,
  governanceResult,
  currentUserRole,
  provisionContext,
  targetRowOverride,
  indicatorTargetRefId,
  targetRefIdOverride,
  sourceRefIdOverride,
}) {
  const hasSelection = !!selectedId;
  const normalizedGovernanceResult = useMemo(
    () => normalizeGovernanceResult(governanceResult),
    [governanceResult],
  );
  const missingTarget = isMissingTarget(normalizedGovernanceResult);
  const provisionAction = getProvisionAction(normalizedGovernanceResult);
  const canRenderProvisionAction =
    canProvisionTarget &&
    canRenderProvisionButton(normalizedGovernanceResult, currentUserRole, provisionContext || {});
  const effectiveProvisionTargetReady = Boolean(
    provisionContext?.parent_target_ref_id || provisionTargetReady,
  );
  const provisionPayload = useMemo(
    () => buildProvisionPayload(normalizedGovernanceResult, provisionContext || {}),
    [normalizedGovernanceResult, provisionContext],
  );
  const matchData = useMemo(() => {
    const rows = matchedRows.map((r) => mapRenstraRow(levelKey, r));
    if (!selectedId) return rows;
    const label = selectedLabel || String(selectedId);
    return rows.map((row) => ({ ...row, rpjmdId: selectedId, rpjmd: label }));
  }, [matchedRows, levelKey, selectedId, selectedLabel]);
  const overrideMatchData = useMemo(() => {
    if (!targetRowOverride) return null;
    return mapRenstraRow(levelKey, targetRowOverride);
  }, [levelKey, targetRowOverride]);
  const effectiveMatchData = useMemo(() => {
    if (!matchData.length) {
      return overrideMatchData ? [overrideMatchData] : [];
    }

    if (!overrideMatchData) {
      return matchData;
    }

    return matchData.map((row, index) =>
      index === 0
        ? {
            ...row,
            ...overrideMatchData,
            idRenstra: overrideMatchData.idRenstra ?? row.idRenstra,
          }
        : row,
    );
  }, [matchData, overrideMatchData]);
  const effectiveTargetRefId = toIdNumber(
    firstDefined(targetRefIdOverride, indicatorTargetRefId, effectiveMatchData[0]?.idRenstra),
  );
  const effectiveSourceRefId = toIdNumber(
    firstDefined(sourceRefIdOverride, effectiveMatchData[0]?.rpjmdId, selectedId),
  );
  const allData = useMemo(
    () => allRows.map((r) => mapRenstraRow(levelKey, r)),
    [allRows, levelKey],
  );

  const columns = useMemo(() => {
    if (!onUseRpjmdId) return TABLE_COLUMNS;
    return [
      ...TABLE_COLUMNS,
      {
        title: 'Aksi',
        key: 'aksi',
        width: 360,
        render: (_, row) => {
          const id = toIdNumber(row?.rpjmdId);
          const renstraRowId = toIdNumber(row?.idRenstra);
          const targetId = toIdNumber(selectedId);
          const expectedCode = normalizeStructureCode(selectedCode);
          const expectedParentId = toIdNumber(selectedParentId);
          const candidateCode =
            levelKey === 'tujuan'
              ? normalizeStructureCode(row?.no_tujuan)
              : levelKey === 'sasaran'
                ? normalizeStructureCode(firstDefined(row?.nomor, row?.kode_sasaran))
                : levelKey === 'strategi'
                  ? normalizeStructureCode(row?.kode_strategi)
                  : levelKey === 'arah'
                    ? normalizeStructureCode(firstDefined(row?.kode_kebjkn, row?.kode_arah))
                    : levelKey === 'program'
                      ? normalizeStructureCode(row?.kode_program)
                      : levelKey === 'kegiatan'
                        ? normalizeStructureCode(row?.kode_kegiatan)
                        : levelKey === 'subKegiatan'
                          ? normalizeStructureCode(row?.kode_sub_kegiatan)
                          : '';
          const candidateParentId =
            levelKey === 'tujuan'
              ? toIdNumber(firstDefined(row?.misi_id, row?.misi?.id))
              : levelKey === 'sasaran'
                ? toIdNumber(firstDefined(row?.tujuan_id, row?.tujuan?.id))
                : levelKey === 'strategi'
                  ? toIdNumber(firstDefined(row?.sasaran_id, row?.sasaran?.id))
                  : levelKey === 'arah'
                    ? toIdNumber(firstDefined(row?.strategi_id, row?.strategi?.id))
                    : levelKey === 'program'
                      ? toIdNumber(row?.sasaran_id)
                      : levelKey === 'kegiatan'
                        ? toIdNumber(row?.program_id)
                        : levelKey === 'subKegiatan'
                          ? toIdNumber(row?.kegiatan_id)
                          : null;
          const isStrictCandidate =
            !expectedCode ||
            (candidateCode &&
              candidateCode === expectedCode &&
              (expectedParentId === null || candidateParentId === expectedParentId));
          const isTargetSame = targetId && id && Number(id) === Number(targetId);
          const isLoading =
            !!using?.loading &&
            using?.levelKey === levelKey &&
            Number(using?.rpjmdId) === Number(id);

          const isApplying =
            !!applying?.loading &&
            applying?.levelKey === levelKey &&
            Number(applying?.renstraRecordId) === Number(renstraRowId);

          return (
            <Space size="small" wrap>
              <Button
                size="small"
                type="primary"
                disabled={!id || !isStrictCandidate}
                loading={isLoading}
                onClick={() => onUseRpjmdId(levelKey, id)}
                title={
                  !id
                    ? 'Record ini belum punya RPJMD ID'
                    : !isStrictCandidate
                      ? 'Kandidat ini ditolak karena kode atau parent tidak cocok'
                      : 'Pakai RPJMD ID pada record Renstra ini'
                }
              >
                Gunakan mapping ini
              </Button>
              <Button
                size="small"
                type="default"
                disabled={
                  !onApplyToDb || !targetId || !renstraRowId || isTargetSame || !isStrictCandidate
                }
                loading={isApplying}
                onClick={() => onApplyToDb(levelKey, row, targetId, selectedLabel)}
                title={
                  !targetId
                    ? 'Pilih RPJMD di sisi kiri terlebih dahulu'
                    : isTargetSame
                      ? 'Sudah cocok (tidak perlu diterapkan)'
                      : !isStrictCandidate
                        ? 'Kandidat ini ditolak karena kode atau parent tidak cocok'
                        : 'Terapkan mapping ke database untuk record Renstra ini'
                }
              >
                Simpan ke basis data
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [
    onUseRpjmdId,
    onApplyToDb,
    applying?.loading,
    applying?.levelKey,
    applying?.renstraRecordId,
    using?.loading,
    using?.levelKey,
    using?.rpjmdId,
    levelKey,
    selectedId,
    selectedLabel,
    selectedCode,
    selectedParentId,
  ]);

  const header = (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      <Space wrap size={[8, 8]} style={{ justifyContent: 'space-between', width: '100%' }}>
        <Text strong style={{ color: APP_THEME.page.text, fontSize: 13 }}>
          {title}
        </Text>
        <Space wrap size={[8, 8]}>
          <Tag
            color={hasSelection ? (effectiveMatchData.length ? 'green' : 'gold') : 'default'}
            style={STATUS_TAG_STYLE}
          >
            {hasSelection ? `match=${effectiveMatchData.length}` : 'belum dipilih'}
          </Tag>
          {hasSelection ? (
            <Tag color="blue" style={STATUS_TAG_STYLE}>
              {selectedLabel ? selectedLabel : `RPJMD_ID=${selectedId}`}
            </Tag>
          ) : null}
        </Space>
      </Space>
      {hasSelection ? (
        <Text style={{ color: APP_THEME.page.muted, fontSize: 12, lineHeight: 1.4 }}>
          {selectedLabel ? selectedLabel : `RPJMD_ID=${selectedId}`}
        </Text>
      ) : null}
    </Space>
  );

  return (
    <Card
      size="small"
      bordered
      style={{ ...INNER_CARD_STYLE, marginBottom: 8 }}
      styles={{
        body: { padding: 10 },
      }}
    >
      {header}

      {!selectedId ? (
        <Alert
          type="info"
          showIcon
          message="Pilih level RPJMD terlebih dahulu"
          description="Setelah ada pilihan, sistem akan menampilkan hasil validasi dan target Renstra yang cocok."
          style={{ marginTop: 8, marginBottom: 8 }}
        />
      ) : null}

      {selectedId && effectiveMatchData.length ? (
        <Collapse
          bordered={false}
          defaultActiveKey={['match-table']}
          ghost
          style={{
            background: APP_THEME.page.surfaceAlt,
            borderRadius: APP_THEME.radiusLg,
            border: `1px solid ${APP_THEME.page.border}`,
            marginTop: 6,
          }}
          items={[
            {
              key: 'match-table',
              label: `Rincian hasil (${effectiveMatchData.length})`,
              children: (
                <Table
                  size="small"
                  columns={columns}
                  dataSource={effectiveMatchData}
                  pagination={{ pageSize: 3, showSizeChanger: false }}
                  scroll={{ x: 760 }}
                />
              ),
            },
          ]}
        />
      ) : null}

      {selectedId && !effectiveMatchData.length ? (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Alert
            type="warning"
            showIcon
            message="Mapping belum ditemukan untuk level ini"
            description={
              levelKey === 'subKegiatan'
                ? `Target Renstra Sub Kegiatan dengan kode ${selectedLabel || selectedId} belum ditemukan dalam parent Kegiatan Renstra yang valid. Tambahkan atau sinkronkan struktur Sub Kegiatan Renstra melalui alur resmi, lalu ulangi uji keterhubungan.`
                : 'Artinya, data Renstra belum menunjuk ke item RPJMD ini atau mapping masih mengarah ke sumber yang berbeda.'
            }
            style={{ marginTop: 6 }}
          />
          {levelKey === 'subKegiatan' &&
          (resolverStatusCode === 'TARGET_SUB_KEGIATAN_NOT_FOUND' || missingTarget) ? (
            <Alert
              type="info"
              showIcon
              message="Target Renstra Sub Kegiatan belum ada"
              description={
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text style={{ color: APP_THEME.page.softText, fontSize: 12, lineHeight: 1.4 }}>
                    Sistem sudah memverifikasi bahwa target dengan kode yang sama belum tersedia
                    pada parent Kegiatan Renstra yang valid.
                  </Text>
                  <Space wrap size={[6, 6]}>
                    <Tag
                      color={
                        provisionAction === 'sub_kegiatan_target_provision' ? 'gold' : 'default'
                      }
                      style={STATUS_TAG_STYLE}
                    >
                      {provisionAction || 'tanpa aksi resmi'}
                    </Tag>
                    <Tag
                      color={effectiveProvisionTargetReady ? 'blue' : 'orange'}
                      style={STATUS_TAG_STYLE}
                    >
                      parent_target_ref_id={String(provisionContext?.parent_target_ref_id ?? '-')}
                    </Tag>
                    <Tag
                      color={canRenderProvisionAction ? 'green' : 'red'}
                      style={STATUS_TAG_STYLE}
                    >
                      {canRenderProvisionAction ? 'provisionable' : 'belum siap provision'}
                    </Tag>
                  </Space>
                  {canRenderProvisionAction ? (
                    <Button
                      type="primary"
                      loading={provisioning?.loading}
                      disabled={!onProvisionTarget || !effectiveProvisionTargetReady}
                      onClick={() => onProvisionTarget(provisionPayload)}
                    >
                      Sinkronkan Sub Kegiatan Renstra dari RPJMD
                    </Button>
                  ) : canProvisionTarget ? (
                    <Text style={{ color: APP_THEME.page.muted, fontSize: 12 }}>
                      {effectiveProvisionTargetReady
                        ? 'Target resmi masih belum siap untuk provisioning.'
                        : 'Sinkronkan Kegiatan terlebih dahulu.'}
                    </Text>
                  ) : (
                    <Text style={{ color: APP_THEME.page.muted, fontSize: 12 }}>
                      Aksi provisioning hanya tersedia untuk Super Admin.
                    </Text>
                  )}
                </Space>
              }
              style={{ marginTop: 6 }}
            />
          ) : null}
          <Collapse
            bordered={false}
            defaultActiveKey={['fallback-table']}
            ghost
            style={{
              background: APP_THEME.page.surfaceAlt,
              borderRadius: APP_THEME.radiusLg,
              border: `1px solid ${APP_THEME.page.border}`,
              marginTop: 6,
            }}
            items={[
              {
                key: 'fallback-table',
                label: 'Lihat daftar data Renstra',
                children: (
                  <Table
                    size="small"
                    columns={columns}
                    dataSource={allData}
                    pagination={{ pageSize: 3, showSizeChanger: false }}
                    scroll={{ x: 760 }}
                  />
                ),
              },
            ]}
          />
        </Space>
      ) : null}

      <IndicatorPanel
        levelKey={levelKey}
        renstraId={renstraId}
        renstraDocId={renstraDocId}
        targetRow={effectiveMatchData[0] ?? null}
        targetRefIdOverride={effectiveTargetRefId || indicatorTargetRefId}
        sourceRefIdOverride={effectiveSourceRefId}
      />
    </Card>
  );
}

export default function RenstraRpjmdLinkTesterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen, tahun } = useDokumen();
  const { periode_id } = usePeriodeAktif();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const currentUserRole = normalizeRole(user?.role);
  const canProvisionSubKegiatan = currentUserRole === 'SUPER_ADMIN';

  const [sel, setSel] = useState(EMPTY_SELECTION);
  const [usingRpjmd, setUsingRpjmd] = useState({
    loading: false,
    levelKey: null,
    rpjmdId: null,
    error: '',
  });
  const [applying, setApplying] = useState({
    loading: false,
    levelKey: null,
    renstraRecordId: null,
  });
  const [applyModal, setApplyModal] = useState({
    open: false,
    levelKey: null,
    renstraRow: null,
    targetId: null,
    targetLabel: '',
  });
  const [applyReason, setApplyReason] = useState('');
  const [subKegiatanProvisioning, setSubKegiatanProvisioning] = useState({
    loading: false,
    sourceRefId: null,
    message: '',
  });
  const [subKegiatanProvisionedTargetRefId, setSubKegiatanProvisionedTargetRefId] = useState(null);

  const setLevel = useCallback((key, value) => {
    setSel((prev) => {
      const next = { ...prev, [key]: toIdNumber(value) };
      const idx = LEVEL_ORDER.indexOf(key);
      if (idx >= 0) {
        for (let i = idx + 1; i < LEVEL_ORDER.length; i += 1) {
          next[LEVEL_ORDER[i]] = null;
        }
      }
      return next;
    });
    setSubKegiatanProvisionedTargetRefId(null);
  }, []);

  const resetAll = useCallback(() => {
    setSel(EMPTY_SELECTION);
    setUsingRpjmd({ loading: false, levelKey: null, rpjmdId: null, error: '' });
    setApplying({ loading: false, levelKey: null, renstraRecordId: null });
    setApplyModal({
      open: false,
      levelKey: null,
      renstraRow: null,
      targetId: null,
      targetLabel: '',
    });
    setApplyReason('');
    setSubKegiatanProvisioning({ loading: false, sourceRefId: null, message: '' });
    setSubKegiatanProvisionedTargetRefId(null);
  }, []);

  const {
    data: renstraAktif,
    isLoading: loadingRenstraAktif,
    isError: isErrorRenstraAktif,
    error: errorRenstraAktif,
  } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      try {
        const res = await api.get('/renstra-opd/aktif');
        const d = res.data?.data ?? res.data;
        if (Array.isArray(d)) return d.find((x) => x?.is_aktif) ?? d[0] ?? null;
        return d ?? null;
      } catch (error) {
        try {
          const res = await api.get('/renstra-opd');
          const list = Array.isArray(res.data?.data) ? res.data.data : [];
          return list.find((x) => x?.is_aktif) ?? null;
        } catch (fallbackError) {
          throw new Error(
            buildGovernanceUiMessage(fallbackError || error, 'Gagal memuat Renstra OPD aktif.'),
          );
        }
      }
    },
    retry: 1,
  });

  const rpjmdTahun = useMemo(() => {
    const y = firstDefined(renstraAktif?.tahun_mulai, tahun);
    const n = Number(y);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [renstraAktif?.tahun_mulai, tahun]);

  const baseRpjmdParams = useMemo(() => {
    const params = { jenis_dokumen: 'rpjmd' };
    if (rpjmdTahun) params.tahun = rpjmdTahun;
    return params;
  }, [rpjmdTahun]);

  const { data: governancePreparedSource = null } = useQuery({
    queryKey: ['renstra-link-tester-prepared-source', renstraAktif?.id],
    queryFn: async () =>
      getPreparedRpjmdSource({
        target_module: 'RENSTRA',
        renstra_id: renstraAktif?.id,
        scope: 'all',
        include_indicators: true,
        include_pagu: false,
        include_unmapped: true,
        include_blocked: true,
      }),
    enabled: !!renstraAktif?.id,
    retry: 1,
  });

  const governancePreparedRows = useMemo(
    () => extractPreparedSourceRows(governancePreparedSource?.data),
    [governancePreparedSource],
  );

  const { data: subKegiatanResolverState = null, refetch: refetchSubKegiatanResolverState } =
    useQuery({
      queryKey: ['renstra-link-tester-subkegiatan-resolver', renstraAktif?.id, sel.subKegiatanId],
      queryFn: async () => {
        if (!renstraAktif?.id || !sel.subKegiatanId) {
          return null;
        }

        return normalizeGovernanceResult(
          await resolveRpjmdSourceMap({
            target_module: 'RENSTRA',
            renstra_id: renstraAktif.id,
            source_stage: 'sub_kegiatan',
            source_ref_id: sel.subKegiatanId,
            include_parent: true,
            include_chain: true,
          }),
        );
      },
      enabled: !!renstraAktif?.id && !!sel.subKegiatanId,
      retry: 1,
    });

  const normalizedSubKegiatanResolverState = useMemo(
    () => normalizeGovernanceResult(subKegiatanResolverState),
    [subKegiatanResolverState],
  );
  const subKegiatanProvisionStatus = getSubKegiatanTargetProvisionStatus(
    normalizedSubKegiatanResolverState,
  );
  const subKegiatanResolverCode = String(
    subKegiatanProvisionStatus?.status ||
      normalizedSubKegiatanResolverState?.code ||
      normalizedSubKegiatanResolverState?.data?.diagnosis_status ||
      '',
  )
    .trim()
    .toUpperCase();
  const subKegiatanParentTargetRefId = toIdNumber(
    getParentTargetRefId(normalizedSubKegiatanResolverState),
  );
  const subKegiatanProvisionContext = useMemo(
    () => ({
      rpjmd_id: toIdNumber(renstraAktif?.rpjmd_id),
      renstra_id: toIdNumber(renstraAktif?.id),
      target_module: 'RENSTRA',
      source_stage: 'sub_kegiatan',
      source_ref_id: toIdNumber(sel.subKegiatanId),
      parent_source_stage: 'kegiatan',
      parent_source_ref_id: toIdNumber(sel.kegiatanId),
      parent_target_ref_id: subKegiatanParentTargetRefId,
      selectedKegiatanTargetId: subKegiatanParentTargetRefId,
      run_smart_sync: true,
      reason: 'Provision target Renstra Sub Kegiatan dari RPJMD source melalui alur resmi.',
    }),
    [
      renstraAktif?.id,
      renstraAktif?.rpjmd_id,
      sel.kegiatanId,
      sel.subKegiatanId,
      subKegiatanParentTargetRefId,
    ],
  );

  const applySelectionFromRenstraRow = useCallback(
    async (levelKey, rawId) => {
      const targetId = toIdNumber(rawId);
      if (!targetId) return;

      const renstraId = toIdNumber(renstraAktif?.id);
      const sourceStage = GOVERNANCE_SOURCE_STAGE_BY_LEVEL[levelKey] || null;

      if (!renstraId || !sourceStage) {
        setUsingRpjmd({
          loading: false,
          levelKey,
          rpjmdId: targetId,
          error: 'Kontrak Governance Hub belum siap untuk level ini.',
        });
        return;
      }

      let governanceSourceMap = null;
      try {
        governanceSourceMap = await resolveRpjmdSourceMap({
          target_module: 'RENSTRA',
          renstra_id: renstraId,
          source_stage: sourceStage,
          source_ref_id: targetId,
          include_parent: true,
          include_chain: true,
        });
      } catch (error) {
        setUsingRpjmd({
          loading: false,
          levelKey,
          rpjmdId: targetId,
          error: buildGovernanceUiMessage(error, 'Gagal memuat resolver Governance Hub.'),
        });
        return;
      }

      const governanceData = governanceSourceMap?.data ?? null;
      const resolverCode = String(governanceSourceMap?.code || '')
        .trim()
        .toUpperCase();
      const diagnosisStatus = String(governanceData?.diagnosis_status || '')
        .trim()
        .toLowerCase();
      const mappingStatus = String(governanceData?.mapping_status || '')
        .trim()
        .toLowerCase();
      const chainStatus = String(governanceData?.chain_status || '')
        .trim()
        .toLowerCase();
      const preparedMatch =
        governancePreparedRows.find(
          (row) =>
            String(row?.source_stage ?? '').trim() === sourceStage &&
            Number(row?.source_ref_id) === Number(targetId),
        ) || null;

      const isBlocked =
        governanceSourceMap?.success === false ||
        GOVERNANCE_BLOCKING_CODES.has(diagnosisStatus) ||
        GOVERNANCE_BLOCKING_CODES.has(mappingStatus) ||
        GOVERNANCE_BLOCKING_CODES.has(chainStatus) ||
        ['RPJMD_SOURCE_MAP_MISSING_TARGET', 'RPJMD_SOURCE_MAP_CHAIN_MISMATCH'].includes(
          resolverCode,
        ) ||
        resolverCode === 'RPJMD_SOURCE_MAP_RESOLVER_CONFLICT' ||
        resolverCode === 'RPJMD_SOURCE_MAP_BLOCKED' ||
        (preparedMatch &&
          (preparedMatch.dropdown_safe === false || preparedMatch.can_use_for_indicator === false));

      if (isBlocked) {
        setUsingRpjmd({
          loading: false,
          levelKey,
          rpjmdId: targetId,
          error: buildGovernanceUiMessage(
            governanceSourceMap?.data ?? preparedMatch ?? governanceSourceMap,
            'Mapping target Renstra untuk data RPJMD ini belum tersedia atau belum valid.',
          ),
        });
        return;
      }

      const empty = { ...EMPTY_SELECTION };

      const unwrapSingle = (res) => {
        const d = res?.data?.data ?? res?.data;
        if (Array.isArray(d)) return d[0] ?? null;
        return d ?? null;
      };

      const getById = async (path, id) => {
        if (!id) return null;
        const res = await api.get(`${path}/${encodeURIComponent(String(id))}`, {
          params: baseRpjmdParams,
        });
        return unwrapSingle(res);
      };

      const resolveTujuanChain = async (tujuanId) => {
        const tujuan = await getById('/tujuan', tujuanId);
        const misiId = toIdNumber(
          firstDefined(tujuan?.misi_id, tujuan?.misiId, tujuan?.misi?.id, tujuan?.Misi?.id),
        );
        const misi = misiId ? await getById('/misi', misiId) : null;
        const visiId = toIdNumber(
          firstDefined(misi?.visi_id, misi?.visiId, misi?.visi?.id, misi?.Visi?.id),
        );
        return { visiId, misiId, tujuanId: toIdNumber(tujuanId) };
      };

      const resolveSasaranChain = async (sasaranId) => {
        const sasaran = await getById('/sasaran', sasaranId);
        const tujuanId = toIdNumber(
          firstDefined(
            sasaran?.tujuan_id,
            sasaran?.tujuanId,
            sasaran?.tujuan?.id,
            sasaran?.Tujuan?.id,
          ),
        );
        const chain = tujuanId ? await resolveTujuanChain(tujuanId) : {};
        return { ...chain, sasaranId: toIdNumber(sasaranId) };
      };

      const resolveStrategiChain = async (strategiId) => {
        const strategi = await getById('/strategi', strategiId);
        const sasaranId = toIdNumber(
          firstDefined(
            strategi?.sasaran_id,
            strategi?.sasaranId,
            strategi?.sasaran?.id,
            strategi?.Sasaran?.id,
          ),
        );
        const chain = sasaranId ? await resolveSasaranChain(sasaranId) : {};
        return { ...chain, sasaranId, strategiId: toIdNumber(strategiId) };
      };

      const resolveArahChain = async (arahId) => {
        const arah = await getById('/arah-kebijakan', arahId);
        const strategiId = toIdNumber(
          firstDefined(arah?.strategi_id, arah?.strategiId, arah?.strategi?.id, arah?.Strategi?.id),
        );
        const chain = strategiId ? await resolveStrategiChain(strategiId) : {};
        return { ...chain, strategiId, arahId: toIdNumber(arahId) };
      };

      const resolveProgramChain = async (programId) => {
        const program = await getById('/programs', programId);
        const sasaranId = toIdNumber(
          firstDefined(
            program?.sasaran_id,
            program?.sasaranId,
            program?.sasaran?.id,
            program?.Sasaran?.id,
          ),
        );
        const chain = sasaranId ? await resolveSasaranChain(sasaranId) : {};
        return { ...chain, sasaranId, programId: toIdNumber(programId) };
      };

      const resolveKegiatanChain = async (kegiatanId) => {
        const kegiatan = await getById('/kegiatan', kegiatanId);
        const programId = toIdNumber(
          firstDefined(
            kegiatan?.program_id,
            kegiatan?.programId,
            kegiatan?.program?.id,
            kegiatan?.Program?.id,
          ),
        );
        const chain = programId ? await resolveProgramChain(programId) : {};
        return { ...chain, programId, kegiatanId: toIdNumber(kegiatanId) };
      };

      const resolveSubKegiatanChain = async (subKegiatanId) => {
        const sub = await getById('/sub-kegiatan', subKegiatanId);
        const kegiatanId = toIdNumber(
          firstDefined(sub?.kegiatan_id, sub?.kegiatanId, sub?.kegiatan?.id, sub?.Kegiatan?.id),
        );
        const chain = kegiatanId ? await resolveKegiatanChain(kegiatanId) : {};
        return { ...chain, kegiatanId, subKegiatanId: toIdNumber(subKegiatanId) };
      };

      setUsingRpjmd({ loading: true, levelKey, rpjmdId: targetId, error: '' });

      try {
        let next = { ...empty };
        if (levelKey === 'tujuan') {
          next = { ...empty, ...(await resolveTujuanChain(targetId)) };
        } else if (levelKey === 'sasaran') {
          next = { ...empty, ...(await resolveSasaranChain(targetId)) };
        } else if (levelKey === 'strategi') {
          next = { ...empty, ...(await resolveStrategiChain(targetId)) };
        } else if (levelKey === 'arah') {
          // cabang strategi
          next = { ...empty, ...(await resolveArahChain(targetId)) };
        } else if (levelKey === 'program') {
          // cabang program; strategi/arah tetap null agar tidak misleading
          next = { ...empty, ...(await resolveProgramChain(targetId)) };
        } else if (levelKey === 'kegiatan') {
          next = { ...empty, ...(await resolveKegiatanChain(targetId)) };
        } else if (levelKey === 'subKegiatan') {
          next = { ...empty, ...(await resolveSubKegiatanChain(targetId)) };
        } else {
          next = { ...empty };
        }

        setSel(next);
        setSubKegiatanProvisionedTargetRefId(null);
      } catch (e) {
        const msg = buildGovernanceUiMessage(e, 'Gagal memuat hierarchy RPJMD.');
        setUsingRpjmd({ loading: false, levelKey, rpjmdId: targetId, error: msg });
        return;
      }

      setUsingRpjmd({ loading: false, levelKey, rpjmdId: targetId, error: '' });
    },
    [baseRpjmdParams, governancePreparedRows, renstraAktif?.id],
  );

  const openApplyToDb = useCallback((levelKey, row, targetId, targetLabel) => {
    setApplyReason('');
    setApplyModal({
      open: true,
      levelKey,
      renstraRow: row,
      targetId: toIdNumber(targetId),
      targetLabel: targetLabel || '',
    });
  }, []);

  const openProgramAddForm = useCallback(() => {
    const arahId = toIdNumber(sel.arahId);
    if (!arahId) {
      message.warning('Pilih Arah Kebijakan terlebih dahulu.');
      return;
    }

    navigate(`/renstra/tabel/program/add?arah_kebijakan_id=${encodeURIComponent(String(arahId))}`);
  }, [message, navigate, sel.arahId]);

  const closeApplyModal = useCallback(() => {
    setApplyModal({
      open: false,
      levelKey: null,
      renstraRow: null,
      targetId: null,
      targetLabel: '',
    });
    setApplyReason('');
  }, []);

  const submitApplyToDb = useCallback(async () => {
    const levelKey = applyModal.levelKey;
    const targetId = toIdNumber(applyModal.targetId);
    const renstraRecordId = toIdNumber(applyModal.renstraRow?.idRenstra);
    const renstraId = toIdNumber(renstraAktif?.id);

    if (!levelKey || !targetId || !renstraRecordId || !renstraId) return;

    const reason = String(applyReason || '').trim();
    if (!reason) {
      message.error('Alasan perubahan wajib diisi.');
      return;
    }

    setApplying({ loading: true, levelKey, renstraRecordId });

    try {
      await api.post('/renstra-rpjmd-mapping/apply', {
        level: levelKey,
        renstra_id: renstraId,
        renstra_record_id: renstraRecordId,
        target_rpjmd_id: targetId,
        context: {
          jenis_dokumen: 'rpjmd',
          tahun: rpjmdTahun ?? undefined,
          periode_id: periode_id ?? undefined,
          misi_id: sel.misiId ?? undefined,
          tujuan_id: sel.tujuanId ?? undefined,
          sasaran_id: sel.sasaranId ?? undefined,
          strategi_id: sel.strategiId ?? undefined,
          program_id: sel.programId ?? undefined,
          kegiatan_id: sel.kegiatanId ?? undefined,
        },
        change_reason_text: reason,
      });

      message.success('Berhasil menerapkan mapping ke database.');
      closeApplyModal();
      await queryClient.invalidateQueries({ queryKey: ['renstra-link-tester-rows', renstraId] });
    } catch (e) {
      const resp = e?.response?.data || {};
      const code = resp?.code;
      const details = resp?.details || null;
      const msg = resp?.message || e?.message || 'Gagal menerapkan mapping ke database.';

      // Jika ada mismatch/parent-mapping-required, tawarkan untuk menerapkan parent terlebih dahulu.
      const parentLevel = details?.required_parent_level || details?.parent_level || null;
      const parentRenstraRecordId = toIdNumber(
        details?.required_renstra_record_id || details?.renstra_parent_id,
      );
      const suggestedTargetParentId = toIdNumber(
        details?.suggested_target_rpjmd_id || details?.target_parent_rpjmd_id,
      );

      if (
        (code === 'PARENT_MAPPING_REQUIRED' || code === 'CHAIN_MISMATCH') &&
        parentLevel &&
        parentRenstraRecordId &&
        suggestedTargetParentId
      ) {
        modal.confirm({
          title: 'Perlu mapping parent terlebih dahulu',
          content: (
            <div>
              <div style={{ marginBottom: 8 }}>{msg}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Saran: terapkan mapping level <b>{parentLevel}</b> (Renstra ID{' '}
                {parentRenstraRecordId}) ke RPJMD ID {suggestedTargetParentId} terlebih dahulu, lalu
                ulangi apply level <b>{String(levelKey)}</b>.
              </div>
            </div>
          ),
          okText: `Terapkan ${parentLevel} dulu`,
          cancelText: 'Tutup',
          onOk: async () => {
            try {
              closeApplyModal();
              setApplyReason(reason);
              await applySelectionFromRenstraRow(parentLevel, suggestedTargetParentId);
              setApplyModal({
                open: true,
                levelKey: parentLevel,
                renstraRow: { idRenstra: parentRenstraRecordId, renstra: '' },
                targetId: suggestedTargetParentId,
                targetLabel: '',
              });
            } catch (error) {
              message.warning(
                buildGovernanceUiMessage(
                  error,
                  'Gagal memuat parent mapping Governance Hub. Modal parent tetap dibuka.',
                ),
              );
              closeApplyModal();
              setApplyReason(reason);
              setApplyModal({
                open: true,
                levelKey: parentLevel,
                renstraRow: { idRenstra: parentRenstraRecordId, renstra: '' },
                targetId: suggestedTargetParentId,
                targetLabel: '',
              });
            }
          },
        });
      } else {
        message.error(buildGovernanceUiMessage(resp, msg));
      }
    } finally {
      setApplying({ loading: false, levelKey: null, renstraRecordId: null });
    }
  }, [
    applyModal.levelKey,
    applyModal.targetId,
    applyModal.renstraRow,
    renstraAktif?.id,
    applyReason,
    rpjmdTahun,
    periode_id,
    sel,
    closeApplyModal,
    queryClient,
    message,
    modal,
    applySelectionFromRenstraRow,
  ]);

  const { data: visiList = [], isLoading: loadingVisi } = useQuery({
    queryKey: ['rpjmd-visi', baseRpjmdParams.jenis_dokumen, baseRpjmdParams.tahun],
    queryFn: async () => rowsOf(await api.get('/visi', { params: baseRpjmdParams })),
    enabled: !!baseRpjmdParams.tahun,
    retry: 1,
  });

  const { data: misiListRaw = [], isLoading: loadingMisiRaw } = useQuery({
    queryKey: ['rpjmd-misi', baseRpjmdParams.jenis_dokumen, baseRpjmdParams.tahun],
    queryFn: async () => rowsOf(await api.get('/misi', { params: baseRpjmdParams })),
    enabled: !!baseRpjmdParams.tahun,
    retry: 1,
  });

  const misiList = useMemo(() => {
    if (!sel.visiId) return misiListRaw;
    return misiListRaw.filter((m) => Number(m?.visi_id) === Number(sel.visiId));
  }, [misiListRaw, sel.visiId]);

  const { data: tujuanList = [], isLoading: loadingTujuan } = useQuery({
    queryKey: ['rpjmd-tujuan', baseRpjmdParams.tahun, sel.misiId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, limit: 1000, offset: 0 };
      if (sel.misiId) params.misi_id = String(sel.misiId);
      return rowsOf(await api.get('/tujuan', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.misiId,
    retry: 1,
  });

  const { data: sasaranList = [], isLoading: loadingSasaran } = useQuery({
    queryKey: ['rpjmd-sasaran-by-tujuan', baseRpjmdParams.tahun, sel.tujuanId, periode_id],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, limit: 1000, offset: 0 };
      const pid = Number(periode_id);
      if (Number.isFinite(pid) && pid > 0) params.periode_id = pid;
      return rowsOf(
        await api.get(`/sasaran/by-tujuan/${encodeURIComponent(String(sel.tujuanId))}`, { params }),
      );
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.tujuanId,
    retry: 1,
  });

  const { data: strategiList = [], isLoading: loadingStrategi } = useQuery({
    queryKey: ['rpjmd-strategi', baseRpjmdParams.tahun, sel.sasaranId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.sasaranId) params.sasaran_id = String(sel.sasaranId);
      return rowsOf(await api.get('/strategi', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.sasaranId,
    retry: 1,
  });

  const { data: arahList = [], isLoading: loadingArah } = useQuery({
    queryKey: ['rpjmd-arah-kebijakan', baseRpjmdParams.tahun, sel.strategiId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.strategiId) params.strategi_id = String(sel.strategiId);
      return rowsOf(await api.get('/arah-kebijakan', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.strategiId,
    retry: 1,
  });

  const { data: programList = [], isLoading: loadingProgram } = useQuery({
    queryKey: ['rpjmd-program', baseRpjmdParams.tahun, sel.sasaranId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.sasaranId) params.sasaran_id = String(sel.sasaranId);
      return rowsOf(await api.get('/programs', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.sasaranId,
    retry: 1,
  });

  const { data: kegiatanList = [], isLoading: loadingKegiatan } = useQuery({
    queryKey: ['rpjmd-kegiatan', baseRpjmdParams.tahun, sel.programId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.programId) params.program_id = String(sel.programId);
      return rowsOf(await api.get('/kegiatan', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.programId,
    retry: 1,
  });

  const { data: subKegiatanList = [], isLoading: loadingSubKegiatan } = useQuery({
    queryKey: ['rpjmd-sub-kegiatan', baseRpjmdParams.tahun, sel.kegiatanId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.kegiatanId) params.kegiatan_id = String(sel.kegiatanId);
      return rowsOf(await api.get('/sub-kegiatan', { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.kegiatanId,
    retry: 1,
  });

  const {
    data: renstraRows,
    isLoading: loadingRenstraRows,
    isError: isErrorRenstraRows,
    error: errorRenstraRows,
  } = useQuery({
    queryKey: ['renstra-link-tester-rows', renstraAktif?.id],
    queryFn: async () => {
      const renstraId = renstraAktif?.id;
      const qp = renstraId ? { renstra_id: renstraId } : {};

      const safeGet = async (path, params) => {
        try {
          const res = await api.get(path, { params });
          return rowsOf(res);
        } catch (error) {
          try {
            const res = await api.get(path);
            return rowsOf(res);
          } catch (fallbackError) {
            throw new Error(
              buildGovernanceUiMessage(
                fallbackError || error,
                `Gagal memuat data ${String(path).replace(/^\//, '')}.`,
              ),
            );
          }
        }
      };

      const [
        tujuanRenstraRaw,
        sasaranRenstraRaw,
        strategiRenstraRaw,
        kebijakanRenstraRaw,
        programRenstraRaw,
        kegiatanRenstraRaw,
        subKegiatanRenstraRaw,
      ] = await Promise.all([
        safeGet('/renstra-tujuan', qp),
        safeGet('/renstra-sasaran', qp),
        safeGet('/renstra-strategi', qp),
        safeGet('/renstra-kebijakan', qp),
        safeGet('/renstra-program', qp),
        safeGet('/renstra-kegiatan', qp),
        safeGet('/renstra-subkegiatan', qp),
      ]);

      return {
        tujuanRenstra: filterByRenstraIdIfPossible(tujuanRenstraRaw, renstraId),
        sasaranRenstra: filterByRenstraIdIfPossible(sasaranRenstraRaw, renstraId),
        strategiRenstra: filterByRenstraIdIfPossible(strategiRenstraRaw, renstraId),
        kebijakanRenstra: filterByRenstraIdIfPossible(kebijakanRenstraRaw, renstraId),
        programRenstra: filterByRenstraIdIfPossible(programRenstraRaw, renstraId),
        kegiatanRenstra: filterByRenstraIdIfPossible(kegiatanRenstraRaw, renstraId),
        subKegiatanRenstra: filterByRenstraIdIfPossible(subKegiatanRenstraRaw, renstraId),
      };
    },
    enabled: !!renstraAktif?.id,
    retry: 1,
  });

  const matches = useMemo(() => {
    const empty = {
      tujuan: [],
      sasaran: [],
      strategi: [],
      arah: [],
      program: [],
      kegiatan: [],
      subKegiatan: [],
    };
    if (!renstraRows) return empty;

    const selectedSubKegiatanCode = normalizeStructureCode(
      firstDefined(
        (subKegiatanList || []).find((x) => Number(x?.id) === Number(sel.subKegiatanId))
          ?.kode_sub_kegiatan,
        (subKegiatanList || []).find((x) => Number(x?.id) === Number(sel.subKegiatanId))
          ?.kode_sub_kegiatan_rpjmd,
      ),
    );
    const selectedKegiatanId = toIdNumber(sel.kegiatanId);

    return {
      tujuan: sel.tujuanId
        ? (renstraRows.tujuanRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_tujuan_id, r?.tujuan_rpjmd_id)) === Number(sel.tujuanId),
          )
        : [],
      sasaran: sel.sasaranId
        ? (renstraRows.sasaranRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_sasaran_id, r?.sasaran_rpjmd_id)) ===
              Number(sel.sasaranId),
          )
        : [],
      strategi: sel.strategiId
        ? (renstraRows.strategiRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_strategi_id, r?.strategi_rpjmd_id)) ===
              Number(sel.strategiId),
          )
        : [],
      arah: sel.arahId
        ? (renstraRows.kebijakanRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_arah_id, r?.rpjmd_arah_kebijakan_id)) ===
              Number(sel.arahId),
          )
        : [],
      program: sel.programId
        ? (renstraRows.programRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_program_id, r?.program_rpjmd_id)) ===
              Number(sel.programId),
          )
        : [],
      kegiatan: sel.kegiatanId
        ? (renstraRows.kegiatanRenstra || []).filter(
            (r) =>
              Number(firstDefined(r?.rpjmd_kegiatan_id, r?.kegiatan_rpjmd_id)) ===
              Number(sel.kegiatanId),
          )
        : [],
      subKegiatan: sel.subKegiatanId
        ? (renstraRows.subKegiatanRenstra || []).filter((r) => {
            const id = firstDefined(r?.subkegiatan_id, r?.sub_kegiatan_id, r?.sub_kegiatan?.id);
            const code = normalizeStructureCode(
              firstDefined(r?.kode_sub_kegiatan, r?.sub_kegiatan?.kode_sub_kegiatan),
            );
            const parentId = toIdNumber(
              firstDefined(r?.kegiatan_id, r?.kegiatan?.id, r?.parent_kegiatan_id),
            );
            return (
              Number(id) === Number(sel.subKegiatanId) &&
              (!selectedSubKegiatanCode || code === selectedSubKegiatanCode) &&
              (selectedSubKegiatanCode ? parentId === selectedKegiatanId : true)
            );
          })
        : [],
    };
  }, [renstraRows, sel, subKegiatanList]);

  const selectedKegiatanTargetId = toIdNumber(
    firstDefined(
      matches?.kegiatan?.[0]?.idRenstra,
      matches?.kegiatan?.[0]?.id,
      matches?.kegiatan?.[0]?.kegiatan_id,
      matches?.kegiatan?.[0]?.renstra_kegiatan_id,
    ),
  );
  const subKegiatanProvisionTargetRefId = toIdNumber(
    subKegiatanParentTargetRefId ?? selectedKegiatanTargetId,
  );
  const subKegiatanProvisionContextEffective = useMemo(
    () => ({
      ...subKegiatanProvisionContext,
      parent_target_ref_id: subKegiatanProvisionTargetRefId,
      selectedKegiatanTargetId: subKegiatanProvisionTargetRefId,
    }),
    [subKegiatanProvisionContext, subKegiatanProvisionTargetRefId],
  );

  const handleProvisionSubKegiatanTarget = useCallback(
    async (provisionInput) => {
      const payloadFromInput =
        provisionInput && typeof provisionInput === 'object' && !Array.isArray(provisionInput)
          ? provisionInput
          : null;
      const sourceId = toIdNumber(
        payloadFromInput?.source_ref_id ?? payloadFromInput?.sourceRefId ?? provisionInput,
      );
      const renstraId = toIdNumber(
        payloadFromInput?.renstra_id ?? payloadFromInput?.renstraId ?? renstraAktif?.id,
      );
      const parentSourceRefId = toIdNumber(
        payloadFromInput?.parent_source_ref_id ??
          payloadFromInput?.parentSourceRefId ??
          sel.kegiatanId,
      );
      const parentTargetRefId = toIdNumber(
        payloadFromInput?.parent_target_ref_id ??
          payloadFromInput?.selectedKegiatanTargetId ??
          getParentTargetRefId(normalizedSubKegiatanResolverState) ??
          selectedKegiatanTargetId,
      );
      const rpjmdId = toIdNumber(
        payloadFromInput?.rpjmd_id ?? payloadFromInput?.rpjmdId ?? renstraAktif?.rpjmd_id,
      );
      const requestPayload = buildProvisionPayload(normalizedSubKegiatanResolverState, {
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        target_module: 'RENSTRA',
        source_stage: 'sub_kegiatan',
        source_ref_id: sourceId,
        parent_source_stage: 'kegiatan',
        parent_source_ref_id: parentSourceRefId,
        parent_target_ref_id: parentTargetRefId,
        selectedKegiatanTargetId: parentTargetRefId,
        run_smart_sync: true,
        reason:
          payloadFromInput?.reason ||
          'Provision target Renstra Sub Kegiatan dari RPJMD source melalui alur resmi.',
      });

      if (!canProvisionSubKegiatan) {
        message.error('Aksi provisioning hanya tersedia untuk Super Admin.');
        return;
      }

      if (!sourceId || !renstraId || !parentTargetRefId || !parentSourceRefId || !rpjmdId) {
        message.error('Konteks provisioning Sub Kegiatan belum lengkap.');
        return;
      }

      setSubKegiatanProvisioning({
        loading: true,
        sourceRefId: sourceId,
        message: '',
      });

      try {
        const result = await provisionSubKegiatanRenstraTarget(requestPayload);

        const provisionTargetRefId = getProvisionTargetRefId(result);
        const provisionStatus = String(
          result?.data?.provision?.status || result?.code || '',
        ).trim();
        const smartSyncPayload = result?.data?.smart_sync ?? null;
        const smartSyncResult = normalizeGovernanceResult(smartSyncPayload);
        const smartSyncStatus = String(
          smartSyncResult?.data?.verify?.status ||
            smartSyncResult?.data?.diagnosis?.status ||
            smartSyncResult?.code ||
            '',
        )
          .trim()
          .toUpperCase();
        const smartSyncVerified =
          Boolean(smartSyncResult?.success) && smartSyncStatus === 'SYNCED_VERIFIED';
        const smartSyncHasPayload = Boolean(smartSyncPayload);
        const smartSyncNeedsRetry =
          Boolean(provisionTargetRefId) &&
          smartSyncHasPayload &&
          (result?.data?.smart_sync_success === false ||
            smartSyncResult?.success === false ||
            smartSyncStatus === 'SOURCE_MAP_INVALID' ||
            smartSyncStatus === 'SYNC_FAILED') &&
          smartSyncStatus !== 'NO_SOURCE_INDICATOR';
        const smartSyncRetryPayload = smartSyncNeedsRetry
          ? {
              rpjmd_id: rpjmdId,
              renstra_id: renstraId,
              target_module: 'RENSTRA',
              source_stage: 'sub_kegiatan',
              source_ref_id: sourceId,
              target_ref_id: provisionTargetRefId,
              auto_repair: true,
              repair_mode: 'safe_only',
              reason:
                payloadFromInput?.reason ||
                'Re-run smart sync after provisioning target Sub Kegiatan.',
            }
          : null;
        const messageText = String(result?.message || '').trim();

        if (result?.success) {
          if (provisionTargetRefId) {
            setSubKegiatanProvisionedTargetRefId(provisionTargetRefId);
          }

          let finalSmartSyncStatus = smartSyncStatus;
          let finalSmartSyncVerified = smartSyncVerified;

          if (smartSyncRetryPayload) {
            const retryResult = await smartSyncRpjmdIndicatorsToRenstra(smartSyncRetryPayload);
            const finalSmartSyncResult = normalizeGovernanceResult(retryResult);
            finalSmartSyncStatus = String(
              finalSmartSyncResult?.data?.verify?.status ||
                finalSmartSyncResult?.data?.diagnosis?.status ||
                finalSmartSyncResult?.code ||
                '',
            )
              .trim()
              .toUpperCase();
            finalSmartSyncVerified =
              Boolean(finalSmartSyncResult?.success) && finalSmartSyncStatus === 'SYNCED_VERIFIED';
          }

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ['renstra-link-tester-rows', renstraAktif?.id],
            }),
            queryClient.invalidateQueries({
              queryKey: ['renstra-link-tester-prepared-source', renstraAktif?.id],
            }),
            queryClient.invalidateQueries({ queryKey: ['indikator-renstra'] }),
            refetchSubKegiatanResolverState(),
          ]);

          if (finalSmartSyncVerified) {
            message.success(
              messageText ||
                'Sub Kegiatan Renstra berhasil disediakan dan indikator berhasil disinkronkan.',
            );
          } else if (finalSmartSyncStatus === 'NO_SOURCE_INDICATOR') {
            message.info(
              messageText ||
                'Target Renstra Sub Kegiatan berhasil dibuat, tetapi belum ada indikator RPJMD sumber untuk disinkronkan.',
            );
          } else if (smartSyncRetryPayload) {
            message.warning(
              messageText ||
                'Target Renstra Sub Kegiatan berhasil dibuat, tetapi indikator belum tersinkron. Jalankan ulang Periksa & Turunkan Indikator.',
            );
          } else if (provisionStatus === 'TARGET_SUB_KEGIATAN_REUSED') {
            message.success(
              messageText ||
                'Target Renstra Sub Kegiatan sudah tersedia, source-map diperbarui, dan indikator diproses.',
            );
          } else {
            message.success(messageText || 'Target Renstra Sub Kegiatan berhasil disediakan.');
          }
        } else {
          message.error(
            buildGovernanceUiMessage(result, 'Gagal menyediakan target Sub Kegiatan Renstra.'),
          );
        }
      } catch (error) {
        const fallback = 'Gagal menyediakan target Sub Kegiatan Renstra.';
        message.error(buildGovernanceUiMessage(error, fallback));
      } finally {
        setSubKegiatanProvisioning({
          loading: false,
          sourceRefId: null,
          message: '',
        });
      }
    },
    [
      canProvisionSubKegiatan,
      message,
      queryClient,
      refetchSubKegiatanResolverState,
      normalizedSubKegiatanResolverState,
      renstraAktif,
      selectedKegiatanTargetId,
      sel.kegiatanId,
    ],
  );

  const selectedLabels = useMemo(() => {
    const findLabel = (list, id, toLabel) => {
      if (!id) return '';
      const row = (list || []).find((x) => Number(x?.id) === Number(id));
      return row ? toLabel(row) : '';
    };

    return {
      tujuan: findLabel(tujuanList, sel.tujuanId, (t) => join2(t.no_tujuan, t.isi_tujuan)),
      sasaran: findLabel(sasaranList, sel.sasaranId, (s) =>
        join2(s.nomor ?? s.kode_sasaran, s.isi_sasaran ?? s.nama_sasaran),
      ),
      strategi: findLabel(strategiList, sel.strategiId, (s) => join2(s.kode_strategi, s.deskripsi)),
      arah: findLabel(arahList, sel.arahId, (a) => join2(a.kode_arah, a.deskripsi ?? a.nama_arah)),
      program: findLabel(programList, sel.programId, (p) => join2(p.kode_program, p.nama_program)),
      kegiatan: findLabel(kegiatanList, sel.kegiatanId, (k) =>
        join2(k.kode_kegiatan, k.nama_kegiatan),
      ),
      subKegiatan: findLabel(subKegiatanList, sel.subKegiatanId, (sk) =>
        join2(sk.kode_sub_kegiatan, sk.nama_sub_kegiatan),
      ),
    };
  }, [
    tujuanList,
    sasaranList,
    strategiList,
    arahList,
    programList,
    kegiatanList,
    subKegiatanList,
    sel.tujuanId,
    sel.sasaranId,
    sel.strategiId,
    sel.arahId,
    sel.programId,
    sel.kegiatanId,
    sel.subKegiatanId,
  ]);

  const selectedCodes = useMemo(() => {
    const findCode = (list, id, toCode) => {
      if (!id) return '';
      const row = (list || []).find((x) => Number(x?.id) === Number(id));
      return row ? normalizeStructureCode(toCode(row)) : '';
    };

    return {
      tujuan: findCode(tujuanList, sel.tujuanId, (t) => t.no_tujuan),
      sasaran: findCode(sasaranList, sel.sasaranId, (s) => firstDefined(s.nomor, s.kode_sasaran)),
      strategi: findCode(strategiList, sel.strategiId, (s) => s.kode_strategi),
      arah: findCode(arahList, sel.arahId, (a) => firstDefined(a.kode_kebjkn, a.kode_arah)),
      program: findCode(programList, sel.programId, (p) => p.kode_program),
      kegiatan: findCode(kegiatanList, sel.kegiatanId, (k) => k.kode_kegiatan),
      subKegiatan: findCode(subKegiatanList, sel.subKegiatanId, (sk) => sk.kode_sub_kegiatan),
    };
  }, [
    tujuanList,
    sasaranList,
    strategiList,
    arahList,
    programList,
    kegiatanList,
    subKegiatanList,
    sel.tujuanId,
    sel.sasaranId,
    sel.strategiId,
    sel.arahId,
    sel.programId,
    sel.kegiatanId,
    sel.subKegiatanId,
  ]);
  const selectedSubKegiatanSourceRow = useMemo(
    () => (subKegiatanList || []).find((x) => Number(x?.id) === Number(sel.subKegiatanId)) || null,
    [subKegiatanList, sel.subKegiatanId],
  );
  const subKegiatanResolverPayload = normalizedSubKegiatanResolverState?.data || null;
  const subKegiatanSourceMapTargetRefId = toIdNumber(
    firstDefined(
      getTargetRefId(normalizedSubKegiatanResolverState),
      getProvisionTargetRefId(normalizedSubKegiatanResolverState),
    ),
  );
  const subKegiatanResolverMapped =
    String(subKegiatanResolverPayload?.mapping_status || '')
      .trim()
      .toLowerCase() === 'mapped';
  const subKegiatanResolverChainValid =
    String(subKegiatanResolverPayload?.chain_status || '')
      .trim()
      .toLowerCase() === 'valid';
  const subKegiatanSourceMapReady =
    subKegiatanResolverMapped && subKegiatanResolverChainValid && !!subKegiatanSourceMapTargetRefId;
  const activeSubKegiatanTargetRefId = toIdNumber(
    firstDefined(
      subKegiatanSourceMapReady ? subKegiatanSourceMapTargetRefId : null,
      subKegiatanProvisionedTargetRefId,
      toIdNumber(matches?.subKegiatan?.[0]?.idRenstra),
      toIdNumber(matches?.subKegiatan?.[0]?.id),
    ),
  );
  const activeSubKegiatanTargetRow = useMemo(() => {
    if (!activeSubKegiatanTargetRefId || !sel.subKegiatanId) return null;

    const sourceCode = normalizeStructureCode(
      firstDefined(
        selectedSubKegiatanSourceRow?.kode_sub_kegiatan,
        selectedCodes.subKegiatan,
        selectedLabels.subKegiatan,
      ),
    );
    const sourceName = compactText(
      firstDefined(
        selectedSubKegiatanSourceRow?.nama_sub_kegiatan,
        selectedSubKegiatanSourceRow?.nama_sub_kegiatan_rpjmd,
        extractLabelName(selectedLabels.subKegiatan, sourceCode),
        sourceCode,
      ),
    );
    const targetCode = normalizeStructureCode(
      firstDefined(
        subKegiatanResolverPayload?.target_code,
        selectedSubKegiatanSourceRow?.kode_sub_kegiatan,
        selectedCodes.subKegiatan,
        sourceCode,
      ),
    );
    const targetName = compactText(
      firstDefined(
        subKegiatanResolverPayload?.target_name,
        selectedSubKegiatanSourceRow?.nama_sub_kegiatan,
        selectedSubKegiatanSourceRow?.nama_sub_kegiatan_rpjmd,
        sourceName,
        extractLabelName(selectedLabels.subKegiatan, targetCode),
        targetCode,
      ),
    );
    const renstraId = toIdNumber(renstraAktif?.id);
    const rpjmdDocId = toIdNumber(renstraAktif?.rpjmd_id);

    return {
      id: activeSubKegiatanTargetRefId,
      idRenstra: activeSubKegiatanTargetRefId,
      subkegiatan_id: toIdNumber(sel.subKegiatanId),
      sub_kegiatan_id: toIdNumber(sel.subKegiatanId),
      kode_sub_kegiatan: targetCode || sourceCode,
      nama_sub_kegiatan: targetName || sourceName || targetCode || sourceCode,
      kode_sub_kegiatan_rpjmd: sourceCode || targetCode,
      nama_sub_kegiatan_rpjmd: sourceName || targetName || sourceCode || targetCode,
      kegiatan_id: toIdNumber(sel.kegiatanId),
      parent_kegiatan_id: toIdNumber(sel.kegiatanId),
      renstra_id: renstraId,
      rpjmd_id: rpjmdDocId,
      renstra: renstraId ? { id: renstraId, rpjmd_id: rpjmdDocId } : null,
      source_stage: 'sub_kegiatan',
      target_stage: 'sub_kegiatan',
      mapping_status: subKegiatanResolverPayload?.mapping_status || null,
      chain_status: subKegiatanResolverPayload?.chain_status || null,
      target_ref_id: activeSubKegiatanTargetRefId,
      source_ref_id: toIdNumber(sel.subKegiatanId),
      source_map: subKegiatanResolverPayload?.source_map || null,
    };
  }, [
    activeSubKegiatanTargetRefId,
    renstraAktif?.id,
    renstraAktif?.rpjmd_id,
    selectedCodes.subKegiatan,
    selectedLabels.subKegiatan,
    selectedSubKegiatanSourceRow,
    sel.kegiatanId,
    sel.subKegiatanId,
    subKegiatanResolverPayload,
  ]);
  const anyLoading =
    loadingRenstraAktif ||
    loadingRenstraRows ||
    loadingVisi ||
    loadingMisiRaw ||
    loadingTujuan ||
    loadingSasaran ||
    loadingStrategi ||
    loadingArah ||
    loadingProgram ||
    loadingKegiatan ||
    loadingSubKegiatan;

  const selectedDepth = LEVEL_ORDER.reduce((count, key) => (sel[key] ? count + 1 : count), 0);
  const flowStep = sel.subKegiatanId ? 2 : selectedDepth > 0 ? 1 : 0;

  return (
    <div style={PAGE_STYLE}>
      <Card style={HERO_STYLE} styles={{ body: { padding: 0 } }}>
        <Space
          wrap
          style={{ width: '100%', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}
        >
          <Space wrap size={[8, 8]}>
            <Button type="primary" onClick={() => navigate('/dashboard-renstra')}>
              Kembali ke Dashboard Renstra
            </Button>
            <Button onClick={resetAll}>Reset Pilihan</Button>
            <Button type="default" onClick={openProgramAddForm} disabled={!sel.arahId}>
              Buka Form Tambah Program
            </Button>
            <Button type="link" onClick={() => window.open('/api/audit/cascading-gap', '_blank')}>
              Buka audit `/api/audit/cascading-gap`
            </Button>
          </Space>

          <Space wrap size={[8, 8]} style={{ justifyContent: 'flex-end' }}>
            <Tag color="blue" style={STATUS_TAG_STYLE}>
              Konteks Dokumen Aktif: {dokumen || '-'}
            </Tag>
            <Tag color="default" style={STATUS_TAG_STYLE}>
              Tahun Konteks: {tahun ?? '-'}
            </Tag>
            <Tag color={rpjmdTahun ? 'cyan' : 'default'} style={STATUS_TAG_STYLE}>
              Tahun RPJMD master: {rpjmdTahun ?? '-'}
            </Tag>
            {loadingRenstraAktif ? (
              <Tag color="geekblue" style={STATUS_TAG_STYLE}>
                Memuat Renstra OPD aktif
              </Tag>
            ) : renstraAktif ? (
              <Tag color="green" style={STATUS_TAG_STYLE}>
                Renstra OPD Aktif: {renstraAktif.nama_opd || 'OPD'} ({renstraAktif.tahun_mulai} -{' '}
                {renstraAktif.tahun_akhir})
              </Tag>
            ) : (
              <Tag color="red" style={STATUS_TAG_STYLE}>
                Tidak ada Renstra aktif
              </Tag>
            )}
          </Space>
        </Space>

        <div style={{ marginTop: 18 }}>
          <Title level={3} style={{ marginTop: 0, marginBottom: 4, color: APP_THEME.page.primary }}>
            Uji Keterhubungan Renstra terhadap RPJMD
          </Title>
          <Text style={{ color: APP_THEME.page.muted }}>
            Pilih jalur RPJMD untuk meninjau mapping, target Renstra, dan status validasi secara
            bertahap.
          </Text>
        </div>
      </Card>

      <Card style={{ ...PANEL_STYLE, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Steps
          current={flowStep}
          items={[
            { title: 'Pilih Jalur RPJMD', description: 'Lengkapi hierarchy sumber' },
            { title: 'Review Hasil Mapping', description: 'Cek match dan chain' },
            { title: 'Terapkan / Reset', description: 'Simpan bila sudah valid' },
          ]}
        />
      </Card>

      {isErrorRenstraAktif && (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat Renstra OPD aktif"
          description={buildGovernanceUiMessage(
            errorRenstraAktif,
            'Terjadi kesalahan saat memuat Renstra OPD aktif.',
          )}
          style={{ marginBottom: 16, borderRadius: APP_THEME.radiusLg }}
        />
      )}

      {!renstraAktif && !loadingRenstraAktif && (
        <Alert
          type="warning"
          showIcon
          message="Tidak ada Renstra OPD yang aktif"
          description="Aktifkan Renstra OPD terlebih dahulu, lalu buka halaman ini lagi."
          style={{ marginBottom: 16, borderRadius: APP_THEME.radiusLg }}
        />
      )}

      {isErrorRenstraRows && (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat data Renstra untuk uji keterhubungan"
          description={buildGovernanceUiMessage(
            errorRenstraRows,
            'Terjadi kesalahan saat memuat data Renstra.',
          )}
          style={{ marginBottom: 16, borderRadius: APP_THEME.radiusLg }}
        />
      )}

      {anyLoading ? (
        <Card style={{ ...PANEL_STYLE, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Space>
            <Spin />
            <Text style={{ color: APP_THEME.page.muted }}>
              Memuat opsi cascading dan state mapping...
            </Text>
          </Space>
        </Card>
      ) : null}

      {usingRpjmd.error ? (
        <Alert
          type="error"
          showIcon
          message="Mapping ditahan aman oleh Governance Hub"
          description={buildGovernanceUiMessage(usingRpjmd.error, usingRpjmd.error)}
          style={{ marginBottom: 16, borderRadius: APP_THEME.radiusLg }}
        />
      ) : null}

      <Card
        title="1. Pilih Jalur RPJMD dan Hasil Validasi"
        bordered={false}
        style={PANEL_STYLE}
        styles={{ body: { padding: 14 } }}
      >
        <Text style={{ color: APP_THEME.page.muted, display: 'block', marginBottom: 12 }}>
          Pilih jalur RPJMD secara berurutan. Setiap level langsung diikuti hasil validasi dan
          mapping di bawahnya, sehingga alurnya tetap satu halaman yang runut.
        </Text>

        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            <Text strong style={{ color: APP_THEME.page.text, display: 'block', marginBottom: 10 }}>
              Fondasi RPJMD
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {renderFieldSelect({
                label: 'Visi RPJMD',
                value: sel.visiId,
                onChange: (v) => setLevel('visiId', v),
                placeholder: 'Pilih Visi',
                options: visiList.map((v) => ({
                  value: toIdNumber(v.id),
                  label: String(v.isi_visi || v.nama_visi || v.id),
                })),
                disabled: !visiList.length,
                loading: loadingVisi,
                helper: 'Pilih visi untuk membuka daftar misi yang relevan.',
              })}
              {renderFieldSelect({
                label: 'Misi RPJMD',
                value: sel.misiId,
                onChange: (v) => setLevel('misiId', v),
                placeholder: 'Pilih Misi',
                options: misiList.map((m) => ({
                  value: toIdNumber(m.id),
                  label: join2(m.no_misi, m.isi_misi) || String(m.id),
                })),
                disabled: !sel.visiId,
                loading: loadingMisiRaw,
                helper: 'Misi dipakai sebagai pengunci awal untuk tujuan RPJMD.',
              })}
            </Space>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Tujuan RPJMD',
              value: sel.tujuanId,
              onChange: (v) => setLevel('tujuanId', v),
              placeholder: 'Pilih Tujuan',
              options: tujuanList.map((t) => ({
                value: toIdNumber(t.id),
                label: join2(t.no_tujuan, t.isi_tujuan) || String(t.id),
              })),
              disabled: !sel.misiId,
              loading: loadingTujuan,
              helper: 'Tujuan menentukan relasi ke sasaran dan indikator yang sesuai.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Tujuan Renstra -> Tujuan RPJMD"
                selectedId={sel.tujuanId}
                selectedLabel={selectedLabels.tujuan}
                selectedCode={selectedCodes.tujuan}
                selectedParentId={sel.misiId}
                levelKey="tujuan"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.tujuan}
                allRows={renstraRows?.tujuanRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Sasaran RPJMD',
              value: sel.sasaranId,
              onChange: (v) => setLevel('sasaranId', v),
              placeholder: 'Pilih Sasaran',
              options: sasaranList.map((s) => ({
                value: toIdNumber(s.id),
                label:
                  join2(s.nomor ?? s.kode_sasaran, s.isi_sasaran ?? s.nama_sasaran) || String(s.id),
              })),
              disabled: !sel.tujuanId,
              loading: loadingSasaran,
              helper: 'Sasaran dipakai untuk menurunkan strategi dan program yang cocok.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Sasaran Renstra -> Sasaran RPJMD"
                selectedId={sel.sasaranId}
                selectedLabel={selectedLabels.sasaran}
                selectedCode={selectedCodes.sasaran}
                selectedParentId={sel.tujuanId}
                levelKey="sasaran"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.sasaran}
                allRows={renstraRows?.sasaranRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Strategi RPJMD',
              value: sel.strategiId,
              onChange: (v) => setLevel('strategiId', v),
              placeholder: 'Pilih Strategi',
              options: strategiList.map((s) => ({
                value: toIdNumber(s.id),
                label: join2(s.kode_strategi, s.deskripsi) || String(s.id),
              })),
              disabled: !sel.sasaranId,
              loading: loadingStrategi,
              helper: 'Strategi menjadi sumber validasi untuk arah kebijakan.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Strategi Renstra -> Strategi RPJMD"
                selectedId={sel.strategiId}
                selectedLabel={selectedLabels.strategi}
                selectedCode={selectedCodes.strategi}
                selectedParentId={sel.sasaranId}
                levelKey="strategi"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.strategi}
                allRows={renstraRows?.strategiRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Arah Kebijakan RPJMD',
              value: sel.arahId,
              onChange: (v) => setLevel('arahId', v),
              placeholder: 'Pilih Arah Kebijakan',
              options: arahList.map((a) => ({
                value: toIdNumber(a.id),
                label: join2(a.kode_arah, a.deskripsi ?? a.nama_arah) || String(a.id),
              })),
              disabled: !sel.strategiId,
              loading: loadingArah,
              helper: 'Arah kebijakan ditampilkan untuk peninjauan level lanjutan.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Kebijakan Renstra -> Arah Kebijakan RPJMD"
                selectedId={sel.arahId}
                selectedLabel={selectedLabels.arah}
                selectedCode={selectedCodes.arah}
                selectedParentId={sel.strategiId}
                levelKey="arah"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.arah}
                allRows={renstraRows?.kebijakanRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Program RPJMD',
              value: sel.programId,
              onChange: (v) => setLevel('programId', v),
              placeholder: 'Pilih Program',
              options: programList.map((p) => ({
                value: toIdNumber(p.id),
                label: join2(p.kode_program, p.nama_program) || String(p.id),
              })),
              disabled: !sel.sasaranId,
              loading: loadingProgram,
              helper: 'Program digunakan untuk membuka pilihan kegiatan yang terkait.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Program Renstra -> Program RPJMD"
                selectedId={sel.programId}
                selectedLabel={selectedLabels.program}
                selectedCode={selectedCodes.program}
                selectedParentId={sel.sasaranId}
                levelKey="program"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.program}
                allRows={renstraRows?.programRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Kegiatan RPJMD',
              value: sel.kegiatanId,
              onChange: (v) => setLevel('kegiatanId', v),
              placeholder: 'Pilih Kegiatan',
              options: kegiatanList.map((k) => ({
                value: toIdNumber(k.id),
                label: join2(k.kode_kegiatan, k.nama_kegiatan) || String(k.id),
              })),
              disabled: !sel.programId,
              loading: loadingKegiatan,
              helper: 'Kegiatan mengikuti target Renstra dari program yang dipilih.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Kegiatan Renstra -> Kegiatan RPJMD"
                selectedId={sel.kegiatanId}
                selectedLabel={selectedLabels.kegiatan}
                selectedCode={selectedCodes.kegiatan}
                selectedParentId={sel.programId}
                levelKey="kegiatan"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.kegiatan}
                allRows={renstraRows?.kegiatanRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${APP_THEME.page.border}`,
              borderRadius: APP_THEME.radiusLg,
              padding: 10,
            }}
          >
            {renderFieldSelect({
              label: 'Sub Kegiatan RPJMD',
              value: sel.subKegiatanId,
              onChange: (v) => setLevel('subKegiatanId', v),
              placeholder: 'Pilih Sub Kegiatan',
              options: subKegiatanList.map((sk) => ({
                value: toIdNumber(sk.id),
                label: join2(sk.kode_sub_kegiatan, sk.nama_sub_kegiatan) || String(sk.id),
              })),
              disabled: !sel.kegiatanId,
              loading: loadingSubKegiatan,
              helper: 'Sub kegiatan dipakai untuk pemeriksaan mapping paling rinci.',
            })}
            <div style={{ marginTop: 8 }}>
              <MatchSection
                title="Sub Kegiatan Renstra -> Sub Kegiatan RPJMD"
                selectedId={sel.subKegiatanId}
                selectedLabel={selectedLabels.subKegiatan}
                selectedCode={selectedCodes.subKegiatan}
                selectedParentId={sel.kegiatanId}
                resolverStatusCode={subKegiatanResolverCode}
                canProvisionTarget={canProvisionSubKegiatan}
                provisionTargetReady={Boolean(subKegiatanProvisionTargetRefId)}
                onProvisionTarget={handleProvisionSubKegiatanTarget}
                provisioning={subKegiatanProvisioning}
                levelKey="subKegiatan"
                renstraId={renstraAktif?.id}
                renstraDocId={renstraAktif?.rpjmd_id}
                matchedRows={matches.subKegiatan}
                allRows={renstraRows?.subKegiatanRenstra || []}
                onUseRpjmdId={applySelectionFromRenstraRow}
                using={usingRpjmd}
                onApplyToDb={openApplyToDb}
                applying={applying}
                governanceResult={normalizedSubKegiatanResolverState}
                currentUserRole={currentUserRole}
                provisionContext={subKegiatanProvisionContextEffective}
                targetRowOverride={activeSubKegiatanTargetRow}
                indicatorTargetRefId={activeSubKegiatanTargetRefId}
                targetRefIdOverride={activeSubKegiatanTargetRefId}
                sourceRefIdOverride={sel.subKegiatanId}
              />
            </div>
          </div>
        </Space>
      </Card>

      <Card
        title="Ringkasan Audit dan Catatan"
        bordered={false}
        style={{ ...PANEL_STYLE, marginTop: 12 }}
        styles={{ body: { padding: 14 } }}
      >
        <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
          <Tag color="blue" style={STATUS_TAG_STYLE}>
            Resolver/source-map aktif
          </Tag>
          <Tag color="cyan" style={STATUS_TAG_STYLE}>
            Prepared-source sebagai guard tambahan
          </Tag>
          <Tag color="green" style={STATUS_TAG_STYLE}>
            Dropdown child memakai target Renstra
          </Tag>
          <Tag color="gold" style={STATUS_TAG_STYLE}>
            Indikator memakai renstra_id + stage + ref_id
          </Tag>
        </Space>
        <Alert
          type="info"
          showIcon
          message="Gunakan detail panel di atas untuk audit manual."
          description="Tampilan ini dibuat lebih bersih dan lebih mudah dipindai, dengan detail teknis tetap tersedia saat Anda membutuhkannya."
          style={{ borderRadius: APP_THEME.radiusLg }}
        />
      </Card>

      <Modal
        open={applyModal.open}
        title="Konfirmasi: Terapkan mapping ke database"
        okText="Terapkan"
        cancelText="Batal"
        onCancel={closeApplyModal}
        onOk={submitApplyToDb}
        okButtonProps={{
          disabled: !String(applyReason || '').trim(),
          loading: !!applying.loading,
        }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text>
            Level: <Text strong>{String(applyModal.levelKey || '-')}</Text>
          </Text>
          <Text>
            Record Renstra: <Text strong>{String(applyModal.renstraRow?.idRenstra ?? '-')}</Text>{' '}
            {applyModal.renstraRow?.renstra ? (
              <Text type="secondary">({applyModal.renstraRow.renstra})</Text>
            ) : null}
          </Text>
          <Text>
            Target RPJMD ID: <Text strong>{String(applyModal.targetId ?? '-')}</Text>{' '}
            {applyModal.targetLabel ? (
              <Text type="secondary">({applyModal.targetLabel})</Text>
            ) : null}
          </Text>

          <Divider style={{ margin: '8px 0' }} />

          <Text strong>Alasan perubahan (wajib)</Text>
          <Input.TextArea
            value={applyReason}
            onChange={(e) => setApplyReason(e.target.value)}
            placeholder="Contoh: perbaikan mapping agar chain Renstra sesuai RPJMD"
            rows={3}
          />
          <Text type="secondary">
            Catatan: backend akan menolak jika chain parent-child tidak cocok (mis. Sasaran bukan
            anak dari Tujuan pada Renstra).
          </Text>
        </Space>
      </Modal>
    </div>
  );
}

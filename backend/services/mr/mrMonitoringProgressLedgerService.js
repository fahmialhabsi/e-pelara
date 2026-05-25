'use strict';

const db = require('../../models');
const {
  buildMonitoringProgressLedger,
  resolveProgressAsOf: resolveProgressAsOfHelper,
  buildCutOffSnapshotPayload,
  buildCarryOverCandidates,
  buildProgressLedgerReadiness,
  normalizeMonitoringRows,
  normalizeProgressMode,
  calculateProgressDelta,
  buildEvidenceStatusForProgress,
  buildProgressLedgerExceptionRegister,
  EXCEPTIONS,
} = require('../../helpers/mr/mrMonitoringProgressLedgerHelper');

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};
const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const SERVICE_ERROR = Object.freeze({
  VALIDATION: 'MR_PROGRESS_LEDGER_VALIDATION_ERROR',
  IDEMPOTENCY_REUSED: 'MR_PROGRESS_LEDGER_IDEMPOTENCY_REUSED',
  CREATE_FAILED: 'MR_PROGRESS_LEDGER_CREATE_FAILED',
  QUERY_FAILED: 'MR_PROGRESS_LEDGER_QUERY_FAILED',
});

const getModel = () => {
  const model = db.MrPlanningMonitoringProgressLedger;
  if (!model) {
    const error = new Error('Model MrPlanningMonitoringProgressLedger tidak terdaftar.');
    error.code = SERVICE_ERROR.QUERY_FAILED;
    error.status = 500;
    throw error;
  }
  return model;
};

const getSnapshotModel = () => db.MrPlanningSnapshot || null;
const DEFAULT_TIMEZONE = 'Asia/Jayapura';
const { EXCEPTIONS } = require('../../constants/mrExceptionCodes');
const EXCEPTION_PROGRESS_DATE_MISSING = EXCEPTIONS.EXCEPTION_PROGRESS_DATE_MISSING;

const resolveCutoffBoundary = (cutoffDate, timezone) => {
  const tz = safeText(timezone, DEFAULT_TIMEZONE);
  if (!cutoffDate) {
    return {
      timezone: tz,
      cutoff_start_at: null,
      cutoff_end_at: null,
      cutoff_end_key: null,
    };
  }
  const date = safeText(cutoffDate);
  return {
    timezone: tz,
    cutoff_start_at: `${date}T00:00:00`,
    cutoff_end_at: `${date}T23:59:59`,
    cutoff_end_key: `${date}T23:59:59`,
  };
};

const toDateKey = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const validateCreatePayload = (payload = {}) => {
  const gaps = [];
  if (!payload.context_id) gaps.push('context_id_required');
  if (!payload.mr_planning_risk_id) gaps.push('mr_planning_risk_id_required');

  if (
    payload.progress_delta !== undefined &&
    payload.progress_delta !== null &&
    (safeNumber(payload.progress_delta, -1) < 0 || safeNumber(payload.progress_delta, 0) > 100)
  ) {
    gaps.push('progress_delta_invalid_range');
  }

  if (
    payload.progress_cumulative !== undefined &&
    payload.progress_cumulative !== null &&
    (safeNumber(payload.progress_cumulative, -1) < 0 ||
      safeNumber(payload.progress_cumulative, 0) > 100)
  ) {
    gaps.push('progress_cumulative_invalid_range');
  }

  return gaps;
};

const findExistingLedgerByIdempotency = async (
  { context_id, idempotency_key, request_id } = {},
  options = {},
) => {
  try {
    const Model = getModel();
    if (!context_id) return null;

    const where = { context_id };

    if (idempotency_key) {
      const row = await Model.findOne({
        where: { ...where, idempotency_key },
        transaction: options.transaction,
      });
      if (row) return row;
    }

    if (request_id) {
      const row = await Model.findOne({
        where: { ...where, request_id },
        transaction: options.transaction,
      });
      if (row) return row;
    }

    return null;
  } catch (error) {
    const wrapped = new Error('Gagal memeriksa idempotency progress ledger.');
    wrapped.code = SERVICE_ERROR.QUERY_FAILED;
    wrapped.status = 500;
    throw wrapped;
  }
};

const mapLedgerRow = (row) => {
  const data = row?.toJSON ? row.toJSON() : row;
  return data || null;
};

const getLatestProgressLedgerRow = async (
  { context_id, mr_planning_risk_id, mr_planning_mitigation_id, before_date } = {},
  options = {},
) => {
  const Model = getModel();
  const where = {
    context_id: safeNumber(context_id, 0),
    mr_planning_risk_id: safeNumber(mr_planning_risk_id, 0),
  };

  if (mr_planning_mitigation_id) {
    where.mr_planning_mitigation_id = safeNumber(mr_planning_mitigation_id, 0);
  }

  where.status_progress = { [db.Sequelize.Op.ne]: 'cancelled' };

  if (before_date) {
    where.monitoring_date = { [db.Sequelize.Op.lte]: before_date };
  }

  const row = await Model.findOne({
    where,
    order: [
      ['monitoring_date', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction: options.transaction,
  });

  return mapLedgerRow(row);
};

const createProgressLedgerEntry = async (payload = {}, options = {}) => {
  const input = safeObject(payload);
  const gaps = validateCreatePayload(input);

  if (gaps.length) {
    const error = new Error('Payload progress ledger tidak valid.');
    error.code = SERVICE_ERROR.VALIDATION;
    error.status = 400;
    error.gaps = gaps;
    throw error;
  }

  const Model = getModel();
  const existing = await findExistingLedgerByIdempotency(
    {
      context_id: input.context_id,
      idempotency_key: input.idempotency_key,
      request_id: input.request_id,
    },
    options,
  );

  if (existing) {
    return {
      success: true,
      idempotent_reused: true,
      data: mapLedgerRow(existing),
      message: 'Progress ledger request sudah pernah diproses.',
      code: SERVICE_ERROR.IDEMPOTENCY_REUSED,
    };
  }

  const mode = normalizeProgressMode(input.progress_mode || 'cumulative');
  let previousCumulative = safeNumber(input.previous_cumulative, NaN);
  if (!Number.isFinite(previousCumulative)) {
    const latestRow = await getLatestProgressLedgerRow(
      {
        context_id: input.context_id,
        mr_planning_risk_id: input.mr_planning_risk_id,
        mr_planning_mitigation_id: input.mr_planning_mitigation_id,
        before_date: input.monitoring_date || null,
      },
      options,
    );
    previousCumulative = safeNumber(latestRow?.progress_cumulative, 0);
  }

  const inputProgress =
    mode === 'delta'
      ? safeNumber(input.progress_delta, 0)
      : safeNumber(input.progress_cumulative, 0);

  const calculated = calculateProgressDelta({
    mode,
    input_progress: inputProgress,
    previous_cumulative: previousCumulative,
  });

  if (calculated.progress_delta < 0 && safeText(input.status_progress, 'active') !== 'cancelled') {
    const error = new Error('Progress cumulative menurun tanpa status koreksi/cancelled.');
    error.code = SERVICE_ERROR.VALIDATION;
    error.status = 400;
    throw error;
  }

  const evidenceGate = buildEvidenceStatusForProgress({
    progress_delta: calculated.progress_delta,
    evidence_status: input.evidence_status,
    evidence_verified_by: input.diverifikasi_oleh,
    evidence_verified_at: input.diverifikasi_pada,
  });

  const exceptionRegister = buildProgressLedgerExceptionRegister({
    request_id: input.request_id,
    idempotency_key: input.idempotency_key,
    snapshot_id: input.snapshot_id,
    base_exceptions: evidenceGate.exceptions,
  });

  const createPayload = {
    mr_planning_risk_id: input.mr_planning_risk_id,
    mr_planning_mitigation_id: input.mr_planning_mitigation_id || null,
    context_id: input.context_id,
    periode_id: input.periode_id || null,
    tahun: input.tahun || null,
    periode_label: input.periode_label || null,
    monitoring_date: input.monitoring_date || null,
    cutoff_date: input.cutoff_date || null,
    progress_mode: mode,
    progress_delta: calculated.progress_delta,
    progress_cumulative: calculated.progress_cumulative,
    progress_remaining: calculated.progress_remaining,
    evidence_status: evidenceGate.status,
    evidence_count: safeNumber(input.evidence_count, 0),
    evidence_linkage_json: input.evidence_linkage_json || null,
    source_monitoring_id: input.source_monitoring_id || null,
    is_snapshot_locked: !!input.is_snapshot_locked,
    snapshot_id: input.snapshot_id || null,
    carry_over_from_id: input.carry_over_from_id || null,
    carry_over_to_year: input.carry_over_to_year || null,
    status_progress: input.status_progress || 'active',
    created_by: input.created_by || null,
    idempotency_key: input.idempotency_key || null,
    request_id: input.request_id || null,
    timezone: input.timezone || null,
  };

  const externalTransaction = options.transaction;
  const transaction = externalTransaction || (await db.sequelize.transaction());

  try {
    const row = await Model.create(createPayload, { transaction });

    if (!externalTransaction) await transaction.commit();

    const contract = buildMonitoringProgressLedger({
      risk_id: row.mr_planning_risk_id,
      mitigation_id: row.mr_planning_mitigation_id,
      cutoff_date: row.cutoff_date,
      timezone: row.timezone,
      monitoring_rows: [
        {
          id: row.id,
          progress_mode: row.progress_mode,
          progress_persen:
            row.progress_mode === 'delta' ? row.progress_delta : row.progress_cumulative,
          monitoring_date: row.monitoring_date,
          evidence_status: row.evidence_status,
          snapshot_id: row.snapshot_id,
        },
      ],
      snapshot_id: row.snapshot_id,
      year: row.tahun,
      request_id: row.request_id,
      idempotency_key: row.idempotency_key,
    });

    return {
      success: true,
      idempotent_reused: false,
      data: mapLedgerRow(row),
      progress_ledger_contract: contract.progress_ledger_contract,
      exceptions: exceptionRegister,
      gaps: [...calculated.gaps, ...evidenceGate.gaps],
    };
  } catch (error) {
    if (!externalTransaction) await transaction.rollback();

    const wrapped = new Error('Gagal membuat progress ledger entry.');
    wrapped.code = SERVICE_ERROR.CREATE_FAILED;
    wrapped.status = 500;
    wrapped.details = {
      original_message: error.message,
    };
    throw wrapped;
  }
};

const normalizeListFilters = (filters = {}) => ({
  tahun: filters.tahun ? safeNumber(filters.tahun, null) : null,
  cutoff_date: filters.cutoff_date || null,
  snapshot_id: filters.snapshot_id ? safeNumber(filters.snapshot_id, null) : null,
  status_progress: filters.status_progress || null,
  limit: Math.min(Math.max(safeNumber(filters.limit, 100), 1), 500),
});

const buildWhereFromFilters = (baseWhere = {}, filters = {}) => {
  const where = { ...baseWhere };
  const normalized = normalizeListFilters(filters);
  if (normalized.tahun) where.tahun = normalized.tahun;
  if (normalized.cutoff_date) where.cutoff_date = normalized.cutoff_date;
  if (normalized.snapshot_id) where.snapshot_id = normalized.snapshot_id;
  if (normalized.status_progress) where.status_progress = normalized.status_progress;
  return { where, limit: normalized.limit };
};

const queryRows = async (where = {}, filters = {}) => {
  try {
    const Model = getModel();
    const prepared = buildWhereFromFilters(where, filters);

    const rows = await Model.findAll({
      where: prepared.where,
      order: [
        ['monitoring_date', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: prepared.limit,
    });

    return rows.map(mapLedgerRow);
  } catch (error) {
    const wrapped = new Error('Gagal membaca progress ledger.');
    wrapped.code = SERVICE_ERROR.QUERY_FAILED;
    wrapped.status = 500;
    throw wrapped;
  }
};

const listProgressLedgerByContext = async (contextId, filters = {}) =>
  queryRows({ context_id: safeNumber(contextId, 0) }, filters);

const listProgressLedgerByRisk = async (riskId, filters = {}) =>
  queryRows({ mr_planning_risk_id: safeNumber(riskId, 0) }, filters);

const listProgressLedgerByMitigation = async (mitigationId, filters = {}) =>
  queryRows({ mr_planning_mitigation_id: safeNumber(mitigationId, 0) }, filters);

const resolvePersistedProgressAsOf = async ({
  context_id,
  risk_id,
  mitigation_id,
  cutoff_date,
  timezone,
} = {}) => {
  const where = { context_id: safeNumber(context_id, 0) };
  if (risk_id) where.mr_planning_risk_id = safeNumber(risk_id, 0);
  if (mitigation_id) where.mr_planning_mitigation_id = safeNumber(mitigation_id, 0);

  const rows = await queryRows(where, { limit: 1000 });

  const mappedRows = rows.map((row) => ({
    id: row.id,
    risk_id: row.mr_planning_risk_id,
    mitigation_id: row.mr_planning_mitigation_id,
    monitoring_date: row.monitoring_date,
    progress_mode: row.progress_mode,
    progress_persen: row.progress_mode === 'delta' ? row.progress_delta : row.progress_cumulative,
    evidence_status: row.evidence_status,
    snapshot_id: row.snapshot_id,
  }));

  return resolveProgressAsOfHelper({
    risk_id: risk_id || null,
    mitigation_id: mitigation_id || null,
    cutoff_date,
    timezone,
    monitoring_rows: normalizeMonitoringRows(mappedRows),
  });
};

const buildPersistedCutOffSnapshotPreview = async ({ context_id, cutoff_date, timezone } = {}) => {
  const rows = await listProgressLedgerByContext(context_id, { limit: 2000 });
  const progress_as_of_rows = [];
  const included_monitoring_ids = [];
  const excluded_after_cutoff_ids = [];
  const exceptions = [];

  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.mr_planning_risk_id || 'na'}|${row.mr_planning_mitigation_id || 'na'}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  });

  for (const items of grouped.values()) {
    const asOf = resolveProgressAsOfHelper({
      risk_id: items[0].mr_planning_risk_id,
      mitigation_id: items[0].mr_planning_mitigation_id,
      cutoff_date,
      timezone,
      monitoring_rows: normalizeMonitoringRows(
        items.map((row) => ({
          id: row.id,
          monitoring_date: row.monitoring_date,
          progress_mode: row.progress_mode,
          progress_persen:
            row.progress_mode === 'delta' ? row.progress_delta : row.progress_cumulative,
          evidence_status: row.evidence_status,
        })),
      ),
    });

    progress_as_of_rows.push(asOf);
    included_monitoring_ids.push(...safeArray(asOf.included_monitoring_ids));
    excluded_after_cutoff_ids.push(...safeArray(asOf.excluded_after_cutoff_ids));
    exceptions.push(...safeArray(asOf.exceptions));
  }

  return {
    cutoff_date: cutoff_date || null,
    timezone: timezone || null,
    progress_as_of_rows,
    included_monitoring_ids: [...new Set(included_monitoring_ids)],
    excluded_after_cutoff_ids: [...new Set(excluded_after_cutoff_ids)],
    snapshot_ready: !!cutoff_date && !!timezone && progress_as_of_rows.length > 0,
    gaps: [],
    exceptions: [...new Set(exceptions)],
  };
};

const buildPersistedCarryOverCandidatePreview = async ({
  context_id,
  year,
  cutoff_date,
  timezone,
} = {}) => {
  const exceptions = [];
  if (!timezone) exceptions.push(EXCEPTIONS.CUTOFF_TIMEZONE_UNDEFINED);

  const rows = await listProgressLedgerByContext(context_id, {
    tahun: year,
    limit: 2000,
  });

  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.mr_planning_risk_id || 'na'}|${row.mr_planning_mitigation_id || 'na'}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  });

  const asOfRows = [];
  for (const items of grouped.values()) {
    const asOf = resolveProgressAsOfHelper({
      risk_id: items[0].mr_planning_risk_id,
      mitigation_id: items[0].mr_planning_mitigation_id,
      cutoff_date,
      timezone,
      monitoring_rows: normalizeMonitoringRows(
        items.map((row) => ({
          id: row.id,
          monitoring_date: row.monitoring_date,
          progress_mode: row.progress_mode,
          progress_persen:
            row.progress_mode === 'delta' ? row.progress_delta : row.progress_cumulative,
          evidence_status: row.evidence_status,
          snapshot_id: row.snapshot_id,
        })),
      ),
    });

    asOfRows.push({
      ...asOf,
      snapshot_id: items[items.length - 1]?.snapshot_id || null,
    });
  }

  if (!rows.length) {
    return [];
  }

  return buildCarryOverCandidates({
    year,
    cutoff_date,
    progress_rows: asOfRows,
  }).map((item) => ({
    mr_planning_risk_id: item.risk_id,
    mr_planning_mitigation_id: item.mitigation_id,
    progress_cumulative: item.progress_cumulative,
    progress_remaining: item.progress_remaining,
    carry_over_required: item.carry_over_required,
    carry_over_to_year: item.carry_over_to_year,
    previous_snapshot_id: item.previous_snapshot_id,
    reason: item.reason,
    exceptions: [...new Set([...(item.exceptions || []), ...exceptions])],
  }));
};

const buildSnapshotIdForProgressLedger = ({ context_id, cutoff_date, tahun, timezone } = {}) => {
  const ctx = safeNumber(context_id, 0) || 'NA';
  const year = safeNumber(tahun, 0) || 'NA';
  const cutoff = safeText(cutoff_date, 'NO-CUTOFF').replace(/[^0-9-]/g, '');
  const tz = safeText(timezone, 'NO-TZ').replace(/[^A-Za-z0-9/_-]/g, '');
  return `MR-SNAPSHOT-CTX-${ctx}-${year}-${cutoff}-${tz}`;
};

const resolveOrCreateProgressSnapshot = async (
  { context_id, cutoff_date, timezone, tahun, created_by } = {},
  options = {},
) => {
  const SnapshotModel = getSnapshotModel();
  const snapshotCode = buildSnapshotIdForProgressLedger({
    context_id,
    cutoff_date,
    tahun,
    timezone,
  });
  if (!SnapshotModel) {
    return { snapshot_id: null, snapshot_code: snapshotCode };
  }

  const existing = await SnapshotModel.findOne({
    where: { context_id, snapshot_code: snapshotCode, snapshot_type: 'monitoring' },
    transaction: options.transaction,
  });
  if (existing) {
    return { snapshot_id: existing.id, snapshot_code: snapshotCode };
  }

  const created = await SnapshotModel.create(
    {
      context_id,
      snapshot_type: 'monitoring',
      snapshot_code: snapshotCode,
      snapshot_date: cutoff_date || null,
      periode_type: 'adhoc',
      periode_label: `CUT-OFF ${cutoff_date || 'NA'}`,
      periode_awal: null,
      periode_akhir: cutoff_date || null,
      tahun: safeNumber(tahun, null),
      generated_by: created_by || null,
      generated_at: new Date(),
      is_locked: true,
      locked_by: created_by || null,
      locked_at: new Date(),
      created_by: created_by || null,
      updated_by: created_by || null,
    },
    { transaction: options.transaction },
  );

  return { snapshot_id: created.id, snapshot_code: snapshotCode };
};

const lockProgressLedgerSnapshot = async (
  { context_id, cutoff_date, timezone, request_id, idempotency_key, created_by } = {},
  options = {},
) => {
  const Model = getModel();
  const ctx = safeNumber(context_id, 0);
  if (!ctx || !cutoff_date) {
    const error = new Error('context_id dan cutoff_date wajib untuk snapshot lock.');
    error.code = SERVICE_ERROR.VALIDATION;
    error.status = 400;
    throw error;
  }

  const tx = options.transaction || (await db.sequelize.transaction());
  const externalTx = !!options.transaction;

  try {
    const boundary = resolveCutoffBoundary(cutoff_date, timezone);
    const tz = boundary.timezone || DEFAULT_TIMEZONE;
    const allRows = await Model.findAll({
      where: { context_id: ctx, status_progress: { [db.Sequelize.Op.ne]: 'cancelled' } },
      order: [
        ['monitoring_date', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction: tx,
    });

    const included = [];
    const excluded = [];
    const exceptions = [];
    for (const row of allRows) {
      if (!row.monitoring_date) {
        excluded.push(row);
        exceptions.push(EXCEPTIONS.EXCEPTION_PROGRESS_DATE_MISSING);
        continue;
      }
      const rowKey = toDateKey(row.monitoring_date);
      const cutoffKey = toDateKey(cutoff_date);
      if (rowKey && cutoffKey && rowKey <= cutoffKey) included.push(row);
      else excluded.push(row);
    }

    const snapshot = await resolveOrCreateProgressSnapshot(
      {
        context_id: ctx,
        cutoff_date,
        timezone: tz,
        tahun: included[0]?.tahun || null,
        created_by,
      },
      { transaction: tx },
    );

    const existingLockedCount = await Model.count({
      where: {
        context_id: ctx,
        snapshot_id: snapshot.snapshot_id,
        is_snapshot_locked: true,
      },
      transaction: tx,
    });

    if (existingLockedCount > 0) {
      if (!externalTx) await tx.commit();
      return {
        success: true,
        idempotent_reused: true,
        snapshot_id: snapshot.snapshot_id,
        snapshot_code: snapshot.snapshot_code,
        cutoff_date,
        timezone: tz,
        cutoff_start_at: boundary.cutoff_start_at,
        cutoff_end_at: boundary.cutoff_end_at,
        locked_rows_count: existingLockedCount,
        included_monitoring_ids: included.map((row) => row.id),
        excluded_after_cutoff_ids: excluded.map((row) => row.id),
        excluded_after_cutoff_count: excluded.length,
        exceptions: [...new Set(exceptions)],
        status: 'ready',
      };
    }

    if (included.length) {
      await Model.update(
        {
          is_snapshot_locked: true,
          snapshot_id: snapshot.snapshot_id,
          cutoff_date,
          timezone: tz,
          status_progress: 'snapshot_locked',
        },
        { where: { id: included.map((row) => row.id) }, transaction: tx },
      );
    }

    if (!externalTx) await tx.commit();
    return {
      success: true,
      idempotent_reused: false,
      snapshot_id: snapshot.snapshot_id,
      snapshot_code: snapshot.snapshot_code,
      cutoff_date,
      timezone: tz,
      cutoff_start_at: boundary.cutoff_start_at,
      cutoff_end_at: boundary.cutoff_end_at,
      locked_rows_count: included.length,
      included_monitoring_ids: included.map((row) => row.id),
      excluded_after_cutoff_ids: excluded.map((row) => row.id),
      excluded_after_cutoff_count: excluded.length,
      exceptions: [...new Set(exceptions)],
      status: included.length ? 'ready' : 'missing',
    };
  } catch (error) {
    if (!externalTx) await tx.rollback();
    const wrapped = new Error('Gagal lock snapshot progress ledger.');
    wrapped.code = SERVICE_ERROR.CREATE_FAILED;
    wrapped.status = 500;
    throw wrapped;
  }
};

const getLockedProgressSnapshot = async ({ context_id, snapshot_id } = {}) => {
  const rows = await queryRows(
    { context_id: safeNumber(context_id, 0), snapshot_id, is_snapshot_locked: true },
    { limit: 5000 },
  );
  const progressAsOf = rows.length ? rows[rows.length - 1].progress_cumulative : null;
  return {
    snapshot_id: snapshot_id || null,
    context_id: safeNumber(context_id, 0) || null,
    cutoff_date: rows[0]?.cutoff_date || null,
    timezone: rows[0]?.timezone || null,
    locked_rows_count: rows.length,
    progress_as_of: progressAsOf,
    carry_over_status:
      progressAsOf !== null && safeNumber(progressAsOf, 0) < 100 ? 'required' : 'not_required',
    exception_register: rows.length ? [] : [EXCEPTIONS.PROGRESS_LEDGER_MISSING],
  };
};

const buildSnapshotLockReadinessForReport = async ({ context_id, cutoff_date, timezone } = {}) => {
  const rows = await listProgressLedgerByContext(context_id, { limit: 2000 });
  const boundary = resolveCutoffBoundary(cutoff_date, timezone);
  const tz = boundary.timezone || DEFAULT_TIMEZONE;
  const hasRows = rows.length > 0;
  const hasCutoff = !!cutoff_date;
  const hasTimezone = !!tz;
  const exceptions = [];
  if (!hasRows) exceptions.push(EXCEPTIONS.PROGRESS_LEDGER_MISSING);
  if (!timezone) exceptions.push(EXCEPTIONS.CUTOFF_TIMEZONE_UNDEFINED);

  const includedRows = [];
  const excludedRows = [];
  rows.forEach((row) => {
    if (!row.monitoring_date) {
      excludedRows.push(row);
      exceptions.push(EXCEPTIONS.EXCEPTION_PROGRESS_DATE_MISSING);
      return;
    }
    const rowKey = toDateKey(row.monitoring_date);
    const cutoffKey = toDateKey(cutoff_date);
    if (rowKey && cutoffKey && rowKey <= cutoffKey) includedRows.push(row);
    else excludedRows.push(row);
  });

  const lockedForCutoff = includedRows.filter(
    (row) => row.is_snapshot_locked && toDateKey(row.cutoff_date) === toDateKey(cutoff_date),
  );
  const snapshotId = lockedForCutoff[0]?.snapshot_id || null;
  if (lockedForCutoff.length && !snapshotId) exceptions.push(EXCEPTIONS.SNAPSHOT_ID_MISSING);
  if (excludedRows.length) exceptions.push(EXCEPTIONS.PROGRESS_AFTER_CUTOFF_EXCLUDED);

  return {
    status: !hasRows
      ? 'missing'
      : !hasCutoff || !hasTimezone
        ? 'partial'
        : !includedRows.length
          ? 'partial'
          : !lockedForCutoff.length
            ? 'partial'
            : 'ready',
    snapshot_id: snapshotId,
    is_locked: lockedForCutoff.length > 0,
    locked_rows_count: lockedForCutoff.length,
    cutoff_date: cutoff_date || null,
    cutoff_start_at: boundary.cutoff_start_at,
    cutoff_end_at: boundary.cutoff_end_at,
    timezone: tz,
    included_monitoring_ids: includedRows.map((row) => row.id),
    excluded_after_cutoff_ids: excludedRows.map((row) => row.id),
    generated_at: new Date().toISOString(),
    exceptions: [...new Set(exceptions)],
    recommendations: hasRows ? [] : ['Input atau generate progress ledger untuk konteks laporan.'],
  };
};

const buildProgressLedgerPreview = (payload = {}) => {
  const input = safeObject(payload);
  return buildMonitoringProgressLedger(input);
};

const resolveProgressAsOf = (payload = {}) => {
  const input = safeObject(payload);
  return resolveProgressAsOfHelper({
    risk_id: input.risk_id,
    mitigation_id: input.mitigation_id,
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    monitoring_rows: normalizeMonitoringRows(input.monitoring_rows),
  });
};

const buildCutOffSnapshotPreview = (payload = {}) => {
  const input = safeObject(payload);
  const asOf = resolveProgressAsOf(input);

  return buildCutOffSnapshotPayload({
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    progress_as_of: asOf,
    snapshot_id: input.snapshot_id,
  });
};

const buildCarryOverCandidatePreview = (payload = {}) => {
  const input = safeObject(payload);
  const asOfRows = safeArray(input.progress_rows).length
    ? input.progress_rows
    : [resolveProgressAsOf(input)];

  return buildCarryOverCandidates({
    year: input.year,
    cutoff_date: input.cutoff_date,
    progress_rows: asOfRows,
  });
};

const buildProgressLedgerReadinessForReport = async (payload = {}) => {
  const input = safeObject(payload);
  let contract = null;

  if (input.context_id) {
    const persisted = await resolvePersistedProgressAsOf({
      context_id: input.context_id,
      risk_id: input.risk_id,
      mitigation_id: input.mitigation_id,
      cutoff_date: input.cutoff_date,
      timezone: input.timezone,
    });

    contract = {
      progress_as_of: persisted,
      carry_over: {
        carry_over_required: persisted.carry_over_required,
      },
      evidence_progress_gate: {
        status: persisted.evidence_status,
      },
      exceptions: persisted.exceptions,
    };
  } else {
    const preview = buildProgressLedgerPreview(input);
    contract = preview.progress_ledger_contract || {};
  }

  const readiness = buildProgressLedgerReadiness({
    progress_delta: input.progress_delta,
    progress_cumulative: contract.progress_as_of?.progress_cumulative,
    progress_remaining: contract.progress_as_of?.progress_remaining,
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    evidence_status: contract.evidence_progress_gate?.status,
    snapshot_id: input.snapshot_id,
    carry_over_status: contract.carry_over?.carry_over_required ? 'required' : 'not_required',
    idempotency_key: input.idempotency_key,
    request_id: input.request_id,
  });

  const recommendations = [];
  if (readiness.status !== 'ready') {
    recommendations.push(
      'Lanjutkan hardening persistence progress ledger/snapshot/carry-over pada step berikutnya.',
    );
  }

  return {
    status: readiness.status,
    readiness,
    exceptions: contract.exceptions || [EXCEPTIONS.PROGRESS_LEDGER_MISSING],
    recommendations,
  };
};

const findExistingCarryOverEntry = async (
  { carry_over_from_id, carry_over_to_year } = {},
  options = {},
) => {
  const Model = getModel();
  if (!carry_over_from_id || !carry_over_to_year) return null;
  const row = await Model.findOne({
    where: {
      carry_over_from_id: safeNumber(carry_over_from_id, 0),
      carry_over_to_year: safeNumber(carry_over_to_year, 0),
      status_progress: 'carried_over',
    },
    order: [['id', 'DESC']],
    transaction: options.transaction,
  });
  return mapLedgerRow(row);
};

const createCarryOverLedgerEntry = async (
  {
    context_id,
    cutoff_date,
    carry_over_to_year,
    timezone,
    request_id,
    idempotency_key,
    created_by,
  } = {},
  options = {},
) => {
  const Model = getModel();
  const ctx = safeNumber(context_id, 0);
  const targetYear = safeNumber(carry_over_to_year, 0);
  const tz = safeText(timezone, DEFAULT_TIMEZONE);
  if (!ctx || !cutoff_date || !targetYear) {
    const error = new Error('context_id, cutoff_date, carry_over_to_year wajib.');
    error.code = SERVICE_ERROR.VALIDATION;
    error.status = 400;
    throw error;
  }

  const externalTx = !!options.transaction;
  const tx = options.transaction || (await db.sequelize.transaction());
  try {
    const candidates = await buildPersistedCarryOverCandidatePreview({
      context_id: ctx,
      year: targetYear - 1,
      cutoff_date,
      timezone: tz,
    });

    const sourceRows = await Model.findAll({
      where: {
        context_id: ctx,
        monitoring_date: { [db.Sequelize.Op.lte]: cutoff_date },
        status_progress: { [db.Sequelize.Op.ne]: 'cancelled' },
      },
      order: [
        ['monitoring_date', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction: tx,
    });

    const sourceByPair = new Map();
    sourceRows.forEach((row) => {
      const key = `${row.mr_planning_risk_id || 'na'}|${row.mr_planning_mitigation_id || 'na'}`;
      if (!sourceByPair.has(key)) sourceByPair.set(key, row);
    });

    const created_rows = [];
    const existing_rows = [];
    let skipped_count = 0;
    for (const candidate of candidates) {
      if (!candidate.carry_over_required) {
        skipped_count += 1;
        continue;
      }
      const key = `${candidate.mr_planning_risk_id || 'na'}|${candidate.mr_planning_mitigation_id || 'na'}`;
      const source = sourceByPair.get(key);
      if (!source) {
        skipped_count += 1;
        continue;
      }
      const existing = await findExistingCarryOverEntry(
        {
          carry_over_from_id: source.id,
          carry_over_to_year: targetYear,
        },
        { transaction: tx },
      );
      if (existing) {
        existing_rows.push(existing);
        continue;
      }

      const baseIdempotency = safeText(idempotency_key, 'carry-over');
      const baseRequest = safeText(request_id, 'carry-over-request');
      const carryIdempotencyKey = `${baseIdempotency}:${ctx}:${source.id}:${targetYear}:${safeText(cutoff_date)}`;
      const carryRequestId = `${baseRequest}:${ctx}:${source.id}:${targetYear}:${safeText(cutoff_date)}`;

      const created = await Model.create(
        {
          mr_planning_risk_id: source.mr_planning_risk_id,
          mr_planning_mitigation_id: source.mr_planning_mitigation_id,
          context_id: source.context_id,
          periode_id: source.periode_id,
          tahun: targetYear,
          periode_label: `Carry Over ${targetYear}`,
          monitoring_date: null,
          cutoff_date,
          progress_mode: 'cumulative',
          progress_delta: 0,
          progress_cumulative: source.progress_cumulative,
          progress_remaining: source.progress_remaining,
          evidence_status: source.evidence_status || 'not_required',
          evidence_count: 0,
          evidence_linkage_json: null,
          source_monitoring_id: source.source_monitoring_id || null,
          is_snapshot_locked: false,
          snapshot_id: source.snapshot_id || null,
          carry_over_from_id: source.id,
          carry_over_to_year: targetYear,
          status_progress: 'carried_over',
          created_by: created_by || null,
          idempotency_key: carryIdempotencyKey,
          request_id: carryRequestId,
          timezone: tz,
        },
        { transaction: tx },
      );
      created_rows.push(mapLedgerRow(created));
    }

    if (!externalTx) await tx.commit();
    return {
      status: created_rows.length || existing_rows.length ? 'ready' : 'partial',
      source_year: targetYear - 1,
      carry_over_to_year: targetYear,
      carry_over_required_count: candidates.length,
      created_count: created_rows.length,
      existing_count: existing_rows.length,
      skipped_count,
      candidates,
      created_rows,
      existing_rows,
      exceptions: [],
      recommendations: [],
    };
  } catch (error) {
    if (!externalTx) await tx.rollback();
    const wrapped = new Error('Gagal create carry-over progress ledger.');
    wrapped.code = SERVICE_ERROR.CREATE_FAILED;
    wrapped.status = 500;
    throw wrapped;
  }
};

const buildPersistedCarryOverLifecycle = async ({ context_id, cutoff_date, year, timezone } = {}) =>
  createCarryOverLedgerEntry({
    context_id,
    cutoff_date,
    carry_over_to_year: safeNumber(year, 0) + 1,
    timezone,
  });

const buildCarryOverPersistenceReadinessForReport = async ({
  context_id,
  cutoff_date,
  year,
  timezone,
  request_id,
  idempotency_key,
} = {}) => {
  const rows = await listProgressLedgerByContext(context_id, { limit: 2000 });
  const candidates = await buildPersistedCarryOverCandidatePreview({
    context_id,
    year,
    cutoff_date,
    timezone,
  });
  const exceptions = [];
  if (!rows.length) exceptions.push(EXCEPTIONS.PROGRESS_LEDGER_MISSING);
  if (!request_id) exceptions.push(EXCEPTIONS.REQUEST_ID_MISSING);
  if (!idempotency_key) exceptions.push(EXCEPTIONS.IDEMPOTENCY_KEY_MISSING);
  const requiredCount = candidates.filter((c) => c.carry_over_required).length;
  return {
    status: !rows.length ? 'missing' : requiredCount > 0 ? 'partial' : 'ready',
    carry_over_required_count: requiredCount,
    created_count: 0,
    existing_count: 0,
    skipped_count: 0,
    exceptions: [...new Set(exceptions)],
    recommendations:
      requiredCount > 0 ? ['Jalankan createCarryOverLedgerEntry untuk persist carry-over.'] : [],
  };
};

module.exports = {
  createProgressLedgerEntry,
  findExistingLedgerByIdempotency,
  getLatestProgressLedgerRow,
  listProgressLedgerByContext,
  listProgressLedgerByRisk,
  listProgressLedgerByMitigation,
  resolvePersistedProgressAsOf,
  buildPersistedCutOffSnapshotPreview,
  buildPersistedCarryOverCandidatePreview,
  buildProgressLedgerReadinessForReport,
  buildSnapshotIdForProgressLedger,
  lockProgressLedgerSnapshot,
  getLockedProgressSnapshot,
  buildSnapshotLockReadinessForReport,
  createCarryOverLedgerEntry,
  findExistingCarryOverEntry,
  buildPersistedCarryOverLifecycle,
  buildCarryOverPersistenceReadinessForReport,

  buildProgressLedgerPreview,
  resolveProgressAsOf,
  buildCutOffSnapshotPreview,
  buildCarryOverCandidatePreview,
};

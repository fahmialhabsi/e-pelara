'use strict';

const { EXCEPTIONS: _EX } = require('../../constants/mrExceptionCodes');
const EXCEPTIONS = _EX; // re-use central
const _FREEZE_COMPAT = Object.freeze({
  PROGRESS_LEDGER_MISSING: 'EXCEPTION_PROGRESS_LEDGER_MISSING',
  PROGRESS_AFTER_CUTOFF_EXCLUDED: 'EXCEPTION_PROGRESS_AFTER_CUTOFF_EXCLUDED',
  PROGRESS_EVIDENCE_MISSING: 'EXCEPTION_PROGRESS_EVIDENCE_MISSING',
  PROGRESS_CARRY_OVER: 'EXCEPTION_PROGRESS_CARRY_OVER',
  CUTOFF_TIMEZONE_UNDEFINED: 'EXCEPTION_CUTOFF_TIMEZONE_UNDEFINED',
  CARRY_OVER_LINK_MISSING: 'EXCEPTION_CARRY_OVER_LINK_MISSING',
  IDEMPOTENCY_KEY_MISSING: 'EXCEPTION_IDEMPOTENCY_KEY_MISSING',
  REQUEST_ID_MISSING: 'EXCEPTION_REQUEST_ID_MISSING',
  SNAPSHOT_ID_MISSING: 'EXCEPTION_SNAPSHOT_ID_MISSING',
});


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

const normalizeProgressMode = (value = 'delta') => {
  const mode = safeText(value, 'delta').toLowerCase();
  if (mode === 'cumulative') return 'cumulative';
  return 'delta';
};

const resolveCutoffBoundary = ({ cutoff_date, timezone } = {}) => {
  const date = safeText(cutoff_date, '');
  const tz = safeText(timezone, '');
  return {
    cutoff_date: date || null,
    timezone: tz || null,
    cutoff_start_at: date ? `${date}T00:00:00` : null,
    cutoff_end_at: date ? `${date}T23:59:59` : null,
  };
};

const normalizeMonitoringRows = (rows = []) =>
  safeArray(rows).map((item) => {
    const row = safeObject(item);
    return {
      id: row.id ?? null,
      risk_id: row.risk_id ?? null,
      mitigation_id: row.mitigation_id ?? null,
      monitoring_date: row.monitoring_date || row.tanggal_monitoring || row.created_at || null,
      progress_persen: safeNumber(row.progress_persen, 0),
      progress_mode: normalizeProgressMode(row.progress_mode || row.mode_progress),
      evidence_status: safeText(row.evidence_status || row.status_evidence || 'missing', 'missing'),
      evidence_verified_by: row.diverifikasi_oleh || row.verified_by || null,
      evidence_verified_at: row.diverifikasi_pada || row.verified_at || null,
      snapshot_id: row.snapshot_id ?? null,
      created_at: row.created_at || null,
    };
  });

const calculateProgressDelta = ({
  mode = 'delta',
  input_progress = 0,
  previous_cumulative = 0,
} = {}) => {
  const normalizedMode = normalizeProgressMode(mode);
  const prev = safeNumber(previous_cumulative, 0);
  const value = safeNumber(input_progress, 0);
  const gaps = [];

  let progress_delta = 0;
  let progress_cumulative = 0;

  if (normalizedMode === 'delta') {
    progress_delta = value;
    progress_cumulative = prev + value;
  } else {
    progress_cumulative = value;
    progress_delta = value - prev;
  }

  if (progress_delta < 0) gaps.push('progress_delta_negative');
  if (progress_cumulative < 0) gaps.push('progress_cumulative_negative');
  if (progress_cumulative > 100) gaps.push('progress_cumulative_over_100');

  const normalizedCumulative = Math.max(0, Math.min(100, progress_cumulative));
  const progress_remaining = Math.max(0, 100 - normalizedCumulative);

  return {
    mode: normalizedMode,
    progress_delta,
    progress_cumulative: normalizedCumulative,
    progress_remaining,
    status: gaps.length ? 'partial' : 'ready',
    gaps,
  };
};

const calculateProgressCumulative = (payload = {}) =>
  calculateProgressDelta(payload).progress_cumulative;
const calculateProgressRemaining = (payload = {}) =>
  calculateProgressDelta(payload).progress_remaining;

const buildEvidenceStatusForProgress = ({
  progress_delta = 0,
  evidence_status,
  evidence_verified_by,
  evidence_verified_at,
} = {}) => {
  const status = safeText(evidence_status, 'missing').toLowerCase();
  const allowed = ['not_required', 'missing', 'partial', 'adequate', 'verified'];
  const normalized = allowed.includes(status) ? status : 'missing';
  const gaps = [];
  const exceptions = [];

  if (safeNumber(progress_delta, 0) > 0 && ['missing', 'partial'].includes(normalized)) {
    gaps.push('evidence_for_progress_increase_missing');
    exceptions.push(EXCEPTIONS.PROGRESS_EVIDENCE_MISSING);
  }

  if (normalized === 'verified' && (!evidence_verified_by || !evidence_verified_at)) {
    gaps.push('verified_without_actor_or_time');
  }

  return { status: normalized, gaps, exceptions };
};

const resolveProgressAsOf = ({
  risk_id = null,
  mitigation_id = null,
  cutoff_date = null,
  timezone = null,
  monitoring_rows = [],
} = {}) => {
  const boundary = resolveCutoffBoundary({ cutoff_date, timezone });
  const rows = normalizeMonitoringRows(monitoring_rows).sort(
    (a, b) => new Date(a.monitoring_date || 0) - new Date(b.monitoring_date || 0),
  );

  const included = [];
  const excluded = [];
  const gaps = [];
  const exceptions = [];

  if (!boundary.timezone) exceptions.push(EXCEPTIONS.CUTOFF_TIMEZONE_UNDEFINED);

  let cumulative = 0;
  let latestEvidence = 'not_required';

  rows.forEach((row) => {
    const rowDate = row.monitoring_date ? new Date(row.monitoring_date) : null;
    const cutoffEnd = boundary.cutoff_end_at ? new Date(boundary.cutoff_end_at) : null;
    const include = !cutoffEnd || !rowDate || rowDate <= cutoffEnd;

    if (!include) {
      excluded.push(row.id);
      return;
    }

    included.push(row.id);
    const calc = calculateProgressDelta({
      mode: row.progress_mode,
      input_progress: row.progress_persen,
      previous_cumulative: cumulative,
    });
    cumulative = calc.progress_cumulative;
    gaps.push(...calc.gaps);

    const evidence = buildEvidenceStatusForProgress({
      progress_delta: calc.progress_delta,
      evidence_status: row.evidence_status,
      evidence_verified_by: row.evidence_verified_by,
      evidence_verified_at: row.evidence_verified_at,
    });
    latestEvidence = evidence.status;
    gaps.push(...evidence.gaps);
    exceptions.push(...evidence.exceptions);
  });

  if (excluded.length) exceptions.push(EXCEPTIONS.PROGRESS_AFTER_CUTOFF_EXCLUDED);

  const progress_remaining = Math.max(0, 100 - cumulative);
  const carry_over_required = progress_remaining > 0;
  if (carry_over_required) exceptions.push(EXCEPTIONS.PROGRESS_CARRY_OVER);

  return {
    risk_id,
    mitigation_id,
    cutoff_date: boundary.cutoff_date,
    timezone: boundary.timezone,
    progress_cumulative: cumulative,
    progress_remaining,
    evidence_status: latestEvidence,
    included_monitoring_ids: included,
    excluded_after_cutoff_ids: excluded,
    carry_over_required,
    status: gaps.length ? 'partial' : 'ready',
    gaps: [...new Set(gaps)],
    exceptions: [...new Set(exceptions)],
  };
};

const buildCutOffSnapshotPayload = ({
  cutoff_date = null,
  timezone = null,
  progress_as_of = {},
  snapshot_id = null,
} = {}) => {
  const boundary = resolveCutoffBoundary({ cutoff_date, timezone });
  const asOf = safeObject(progress_as_of);
  const exceptions = [];

  if (!snapshot_id) exceptions.push(EXCEPTIONS.SNAPSHOT_ID_MISSING);

  return {
    cutoff_date: boundary.cutoff_date,
    cutoff_start_at: boundary.cutoff_start_at,
    cutoff_end_at: boundary.cutoff_end_at,
    timezone: boundary.timezone,
    progress_as_of: asOf,
    included_monitoring_ids: safeArray(asOf.included_monitoring_ids),
    excluded_after_cutoff_ids: safeArray(asOf.excluded_after_cutoff_ids),
    snapshot_ready: !!snapshot_id && !!boundary.cutoff_date && !!boundary.timezone,
    snapshot_id: snapshot_id || null,
    gaps: [],
    exceptions,
  };
};

const buildCarryOverCandidates = ({ year = null, cutoff_date = null, progress_rows = [] } = {}) => {
  const nextYear = safeNumber(year, 0) > 0 ? safeNumber(year, 0) + 1 : null;

  return safeArray(progress_rows)
    .filter((row) => safeNumber(row.progress_cumulative, 0) < 100)
    .map((row) => ({
      risk_id: row.risk_id ?? null,
      mitigation_id: row.mitigation_id ?? null,
      progress_cumulative: safeNumber(row.progress_cumulative, 0),
      progress_remaining: Math.max(0, 100 - safeNumber(row.progress_cumulative, 0)),
      carry_over_required: true,
      carry_over_to_year: nextYear,
      reason: `Progress belum 100% pada cut-off ${safeText(cutoff_date, '-')}`,
      previous_snapshot_id: row.snapshot_id || null,
      exceptions: row.snapshot_id ? [] : [EXCEPTIONS.CARRY_OVER_LINK_MISSING],
    }));
};

const buildCarryOverLifecycle = ({
  carry_over_required = false,
  carry_over_to_year = null,
} = {}) => ({
  carry_over_required: !!carry_over_required,
  carry_over_to_year: carry_over_to_year || null,
  carry_over_status: carry_over_required ? 'required' : 'not_required',
});

const buildProgressLedgerExceptionRegister = ({
  request_id = null,
  idempotency_key = null,
  snapshot_id = null,
  base_exceptions = [],
} = {}) => {
  const list = [...safeArray(base_exceptions)];
  if (!request_id) list.push(EXCEPTIONS.REQUEST_ID_MISSING);
  if (!idempotency_key) list.push(EXCEPTIONS.IDEMPOTENCY_KEY_MISSING);
  if (!snapshot_id) list.push(EXCEPTIONS.SNAPSHOT_ID_MISSING);
  return [...new Set(list)];
};

const buildProgressLedgerReadiness = ({
  progress_delta,
  progress_cumulative,
  progress_remaining,
  cutoff_date,
  timezone,
  evidence_status,
  snapshot_id,
  carry_over_status,
  idempotency_key,
  request_id,
} = {}) => {
  const gate = {
    status: 'ready',
    has_progress_delta: progress_delta !== undefined && progress_delta !== null,
    has_progress_cumulative: progress_cumulative !== undefined && progress_cumulative !== null,
    has_progress_remaining: progress_remaining !== undefined && progress_remaining !== null,
    has_cutoff_date: !!cutoff_date,
    has_timezone: !!timezone,
    has_evidence_status: !!evidence_status,
    has_snapshot_id: !!snapshot_id,
    has_carry_over_status: !!carry_over_status,
    has_idempotency_key: !!idempotency_key,
    has_request_id: !!request_id,
    gaps: [],
    recommendations: [],
  };

  Object.entries(gate).forEach(([key, value]) => {
    if (key.startsWith('has_') && !value) gate.gaps.push(key);
  });

  if (gate.gaps.length) {
    gate.status = gate.gaps.length > 4 ? 'missing' : 'partial';
    gate.recommendations.push(
      'Lengkapi field readiness progress ledger sebelum finalisasi continuity.',
    );
  }

  if (!gate.has_cutoff_date || !gate.has_timezone) {
    gate.status = 'blocked';
  }

  return gate;
};

const buildMonitoringProgressLedger = (payload = {}) => {
  const input = safeObject(payload);
  const rows = normalizeMonitoringRows(input.monitoring_rows);
  const asOf = resolveProgressAsOf({
    risk_id: input.risk_id,
    mitigation_id: input.mitigation_id,
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    monitoring_rows: rows,
  });

  const cutOffSnapshot = buildCutOffSnapshotPayload({
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    progress_as_of: asOf,
    snapshot_id: input.snapshot_id,
  });

  const carryCandidates = buildCarryOverCandidates({
    year: input.year,
    cutoff_date: input.cutoff_date,
    progress_rows: [asOf],
  });

  const carryLife = buildCarryOverLifecycle({
    carry_over_required: asOf.carry_over_required,
    carry_over_to_year: carryCandidates[0]?.carry_over_to_year || null,
  });

  const exceptions = buildProgressLedgerExceptionRegister({
    request_id: input.request_id,
    idempotency_key: input.idempotency_key,
    snapshot_id: input.snapshot_id,
    base_exceptions: [...asOf.exceptions, ...cutOffSnapshot.exceptions],
  });

  const readiness = buildProgressLedgerReadiness({
    progress_delta: rows.length ? rows[rows.length - 1].progress_persen : null,
    progress_cumulative: asOf.progress_cumulative,
    progress_remaining: asOf.progress_remaining,
    cutoff_date: input.cutoff_date,
    timezone: input.timezone,
    evidence_status: asOf.evidence_status,
    snapshot_id: input.snapshot_id,
    carry_over_status: carryLife.carry_over_status,
    idempotency_key: input.idempotency_key,
    request_id: input.request_id,
  });

  if (!rows.length) exceptions.push(EXCEPTIONS.PROGRESS_LEDGER_MISSING);

  return {
    progress_ledger_contract: {
      status: readiness.status,
      progress_as_of: {
        cutoff_date: input.cutoff_date || null,
        timezone: input.timezone || null,
        progress_cumulative: asOf.progress_cumulative,
        progress_remaining: asOf.progress_remaining,
        included_monitoring_ids: asOf.included_monitoring_ids,
        excluded_after_cutoff_ids: asOf.excluded_after_cutoff_ids,
      },
      cut_off_snapshot: {
        snapshot_ready: cutOffSnapshot.snapshot_ready,
        snapshot_id: cutOffSnapshot.snapshot_id,
        cutoff_start_at: cutOffSnapshot.cutoff_start_at,
        cutoff_end_at: cutOffSnapshot.cutoff_end_at,
      },
      carry_over: {
        carry_over_required: carryLife.carry_over_required,
        candidates: carryCandidates,
      },
      evidence_progress_gate: {
        status: asOf.evidence_status || 'missing',
      },
      idempotency_readiness: {
        has_request_id: !!input.request_id,
        has_idempotency_key: !!input.idempotency_key,
        status:
          !input.request_id && !input.idempotency_key
            ? 'missing'
            : !input.request_id || !input.idempotency_key
              ? 'partial'
              : 'ready',
      },
      gaps: [...new Set([...asOf.gaps, ...readiness.gaps])],
      exceptions: [...new Set(exceptions)],
      recommendations: readiness.recommendations,
    },
  };
};

module.exports = {
  buildMonitoringProgressLedger,
  resolveProgressAsOf,
  calculateProgressDelta,
  calculateProgressCumulative,
  calculateProgressRemaining,
  buildCutOffSnapshotPayload,
  buildCarryOverCandidates,
  buildEvidenceStatusForProgress,
  buildCarryOverLifecycle,
  buildProgressLedgerReadiness,
  buildProgressLedgerExceptionRegister,
  normalizeMonitoringRows,
  normalizeProgressMode,
  resolveCutoffBoundary,
  EXCEPTIONS,
};

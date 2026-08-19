'use strict';

/**
 * MR Planning Risk Analysis Service
 *
 * Guard:
 * - Service ini adalah fondasi backend untuk existing control, inherent risk,
 *   residual risk, dan appetite analysis.
 * - Frontend hanya boleh mengirim field bisnis/reference id.
 * - Field teknis, score, level, color, context, owner, workflow, dan audit
 *   wajib diisi backend.
 * - Lookup reference wajib memakai mr_reference_items.
 * - Lookup matrix wajib memakai mr_risk_matrix.
 * - Jangan hardcode ID angka reference item.
 */

const {
  MrPlanningRisk,
  MrPlanningRiskAnalysis,
  MrPlanningContext,
  MrReferenceGroup,
  MrReferenceItem,
  MrRiskMatrix,
} = require('../../models');

// Sprint 13 -- MR RiskAnalysis OPD Boundary Hardening: RiskAnalysis has no
// opd_id of its own; ownership derives via mr_planning_risk_id -> MrPlanningRisk.opd_id
// (OpdPenanggungJawab.id namespace). Reuses the accepted, unmodified Risk-family
// boundary helper -- same pattern as Deviation/Context/Mitigation/Monitoring.
const {
  resolveMrPlanningRiskOpdBoundary,
  throwMrPlanningRiskOpdBoundaryError,
} = require('./mrPlanningRiskService');

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  'existing_control_status_ref_id',
  'existing_control_description',
  'control_adequacy_ref_id',
  'control_adequacy_note',
  'inherent_likelihood_ref_id',
  'inherent_impact_ref_id',
  'residual_likelihood_ref_id',
  'residual_impact_ref_id',
  'dampak_area_ref_id',
  'selera_risiko_ref_id',
  'analysis_note',
  'rekomendasi',
  'alasan_revisi',
]);

const BLOCKED_TECHNICAL_FIELDS = new Set([
  'id',
  'mr_planning_risk_id',
  'mr_planning_context_id',
  'periode_id',
  'tahun',
  'periode_type',
  'periode_label',
  'periode_awal',
  'periode_akhir',

  'existing_control_status',
  'control_adequacy_status',

  'inherent_likelihood',
  'inherent_impact',
  'inherent_score',
  'inherent_level_ref_id',
  'inherent_level',
  'inherent_color',

  'residual_likelihood',
  'residual_impact',
  'residual_score',
  'residual_level_ref_id',
  'residual_level',
  'residual_color',

  'dampak_area',

  'selera_risiko',
  'appetite_threshold',
  'is_above_appetite',
  'matrix_code',
  'metadata_json',

  'owner_user_id',
  'owner_division_id',

  'status_revisi',
  'versi',
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
  'is_active',
  'is_latest',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
]);

class MrPlanningRiskAnalysisServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'MrPlanningRiskAnalysisServiceError';
    this.statusCode = options.statusCode || 400;
    this.code = options.code || 'MR_ANALYSIS_VALIDATION_ERROR';
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}) => {
  throw new MrPlanningRiskAnalysisServiceError(message, {
    statusCode: 400,
    code: 'MR_ANALYSIS_VALIDATION_ERROR',
    blocked: true,
    details,
  });
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const pickAllowedFields = (body = {}) => {
  const payload = {};
  const blocked = [];

  Object.keys(body || {}).forEach((key) => {
    if (ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      payload[key] = body[key];
      return;
    }

    if (BLOCKED_TECHNICAL_FIELDS.has(key) || !ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      blocked.push(key);
    }
  });

  if (blocked.length > 0) {
    throwValidation('Field tidak diperbolehkan.', {
      fields: blocked,
    });
  }

  return payload;
};

const getReferenceItem = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, options);

  if (!item) {
    throwValidation('Reference item tidak ditemukan.', {
      reference_id: id,
    });
  }

  return item;
};

const resolveReferenceLabel = async (id, options = {}) => {
  const item = await MrReferenceItem.findByPk(id, {
    include: [
      {
        model: MrReferenceGroup,
        as: 'group',
        required: false,
      },
    ],
    ...options,
  });

  if (!item) {
    throwValidation('Reference item tidak ditemukan.', {
      reference_id: id,
    });
  }

  return {
    id: item.id,
    group_id: item.group_id,
    kode_group: item.group?.kode_group || null,
    nama_group: item.group?.nama_group || null,
    parent_item_id: item.parent_item_id || null,
    kode_item: item.kode_item,
    label: item.nama_item || item.nilai_text || item.kode_item,
    deskripsi: item.deskripsi || null,
    nilai: toNumber(item.nilai_numeric, null),
    nilai_text: item.nilai_text || null,
    warna: item.warna || null,
    is_active: Boolean(item.is_active),
  };
};

const ensureReferenceGroup = (ref, expectedGroups = [], fieldName = 'reference') => {
  const groups = Array.isArray(expectedGroups) ? expectedGroups : [expectedGroups];

  if (!ref) {
    throwValidation('Reference item wajib diisi.', {
      field: fieldName,
    });
  }

  if (!ref.is_active) {
    throwValidation('Reference item tidak aktif.', {
      field: fieldName,
      reference_id: ref.id,
      kode_item: ref.kode_item,
    });
  }

  if (!groups.includes(ref.kode_group)) {
    throwValidation('Reference item tidak sesuai group yang diizinkan.', {
      field: fieldName,
      reference_id: ref.id,
      kode_group: ref.kode_group,
      expected_groups: groups,
    });
  }

  return ref;
};

const findRiskMatrix = async ({ likelihoodRefId, impactRefId }, options = {}) => {
  if (!likelihoodRefId || !impactRefId) return null;

  const matrix = await MrRiskMatrix.findOne({
    where: {
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
      matrix_code: 'MR_5X5_DEFAULT',
    },
    ...options,
  });

  if (!matrix) {
    throwValidation('Risk matrix tidak ditemukan untuk kombinasi likelihood dan impact.', {
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
      matrix_code: 'MR_5X5_DEFAULT',
    });
  }

  return matrix;
};

const buildMatrixPayload = async ({ prefix, likelihoodRefId, impactRefId }, options = {}) => {
  if (!likelihoodRefId || !impactRefId) {
    return {};
  }

  const likelihoodRef = await resolveReferenceLabel(likelihoodRefId, options);
  const impactRef = await resolveReferenceLabel(impactRefId, options);

  ensureReferenceGroup(likelihoodRef, 'LIKELIHOOD', `${prefix}_likelihood_ref_id`);

  ensureReferenceGroup(impactRef, 'IMPACT', `${prefix}_impact_ref_id`);

  const matrix = await findRiskMatrix(
    {
      likelihoodRefId,
      impactRefId,
    },
    options,
  );

  return {
    [`${prefix}_likelihood`]: toNumber(likelihoodRef.nilai, 0),
    [`${prefix}_impact`]: toNumber(impactRef.nilai, 0),
    [`${prefix}_score`]: toNumber(matrix?.score, 0),
    [`${prefix}_level_ref_id`]: matrix?.level_risiko_ref_id || null,
    [`${prefix}_level`]: matrix?.level_risiko || null,
    [`${prefix}_color`]: matrix?.warna || null,
  };
};

const resolveLabelsForPayload = async (payload = {}, options = {}) => {
  const resolved = { ...payload };

  if (payload.existing_control_status_ref_id) {
    const ref = await resolveReferenceLabel(payload.existing_control_status_ref_id, options);

    ensureReferenceGroup(ref, 'CONTROL_EFFECTIVENESS', 'existing_control_status_ref_id');

    resolved.existing_control_status = ref.label || null;
  }

  if (payload.control_adequacy_ref_id) {
    const ref = await resolveReferenceLabel(payload.control_adequacy_ref_id, options);

    ensureReferenceGroup(ref, 'CONTROL_EFFECTIVENESS', 'control_adequacy_ref_id');

    resolved.control_adequacy_status = ref.label || null;
  }

  if (payload.selera_risiko_ref_id) {
    const ref = await resolveReferenceLabel(payload.selera_risiko_ref_id, options);

    ensureReferenceGroup(ref, 'RISK_APPETITE', 'selera_risiko_ref_id');

    resolved.selera_risiko = ref.label || null;
    resolved.appetite_threshold = toNumber(ref.nilai, 9);
  }

  if (payload.dampak_area_ref_id) {
    const ref = await resolveReferenceLabel(payload.dampak_area_ref_id, options);

    ensureReferenceGroup(ref, 'IMPACT_AREA', 'dampak_area_ref_id');

    resolved.dampak_area = ref.label || null;
  }

  return resolved;
};

const applyRiskMatrixCalculation = async (payload = {}, options = {}) => {
  const calculated = { ...payload };

  if (payload.inherent_likelihood_ref_id && payload.inherent_impact_ref_id) {
    Object.assign(
      calculated,
      await buildMatrixPayload(
        {
          prefix: 'inherent',
          likelihoodRefId: payload.inherent_likelihood_ref_id,
          impactRefId: payload.inherent_impact_ref_id,
        },
        options,
      ),
    );
  }

  if (payload.residual_likelihood_ref_id && payload.residual_impact_ref_id) {
    Object.assign(
      calculated,
      await buildMatrixPayload(
        {
          prefix: 'residual',
          likelihoodRefId: payload.residual_likelihood_ref_id,
          impactRefId: payload.residual_impact_ref_id,
        },
        options,
      ),
    );
  }

  const residualScore = toNumber(calculated.residual_score, 0);
  const appetiteThreshold = toNumber(calculated.appetite_threshold, 9);

  calculated.appetite_threshold = appetiteThreshold;
  calculated.is_above_appetite = residualScore > appetiteThreshold;
  calculated.matrix_code = 'MR_5X5_DEFAULT';

  return calculated;
};

const CONTROL_EFFECTIVENESS_GROUP = 'CONTROL_EFFECTIVENESS';
const DEFAULT_EXISTING_CONTROL_DESCRIPTION =
  'Belum ada dokumentasi rinci pengendalian existing; perlu ditinjau dan dilengkapi lebih lanjut oleh pemilik risiko.';

/**
 * Pedoman No 5 (backend/services/mr/mrPlanningReportQueryService.js) selalu
 * blocking kalau existing_control_status/inherent_score/residual_score kosong.
 * createAnalysisFromRisk/updateDraftAnalysis dulu dipanggil dengan body kosong
 * (dari wizard maupun repair-draft), sehingga field turunan ini selalu null
 * meski risk sudah punya kemungkinan_ref_id/dampak_ref_id. Fungsi di bawah
 * mengisi celah tsb dari data risk + default group CONTROL_EFFECTIVENESS,
 * tanpa menimpa nilai yang memang sudah dikirim eksplisit oleh caller.
 */
const getDefaultControlEffectivenessRefId = async (options = {}) => {
  const group = await MrReferenceGroup.findOne({
    where: { kode_group: CONTROL_EFFECTIVENESS_GROUP, is_active: true },
    ...options,
  });

  if (!group) return null;

  const defaultItem =
    (await MrReferenceItem.findOne({
      where: { group_id: group.id, is_active: true, is_default: true },
      ...options,
    })) ||
    (await MrReferenceItem.findOne({
      where: { group_id: group.id, is_active: true },
      order: [
        ['urutan', 'ASC'],
        ['id', 'ASC'],
      ],
      ...options,
    }));

  return defaultItem?.id || null;
};

const applyAnalysisDefaultsFromRisk = async (payload = {}, risk = {}, options = {}) => {
  const result = { ...payload };

  if (!result.inherent_likelihood_ref_id && risk.kemungkinan_ref_id) {
    result.inherent_likelihood_ref_id = risk.kemungkinan_ref_id;
  }

  if (!result.inherent_impact_ref_id && risk.dampak_ref_id) {
    result.inherent_impact_ref_id = risk.dampak_ref_id;
  }

  if (!result.residual_likelihood_ref_id && result.inherent_likelihood_ref_id) {
    result.residual_likelihood_ref_id = result.inherent_likelihood_ref_id;
  }

  if (!result.residual_impact_ref_id && result.inherent_impact_ref_id) {
    result.residual_impact_ref_id = result.inherent_impact_ref_id;
  }

  if (!result.existing_control_status_ref_id || !result.control_adequacy_ref_id) {
    const defaultControlRefId = await getDefaultControlEffectivenessRefId(options);

    if (defaultControlRefId) {
      result.existing_control_status_ref_id =
        result.existing_control_status_ref_id || defaultControlRefId;
      result.control_adequacy_ref_id = result.control_adequacy_ref_id || defaultControlRefId;
    }
  }

  if (!result.existing_control_description) {
    result.existing_control_description = DEFAULT_EXISTING_CONTROL_DESCRIPTION;
  }

  return result;
};

const getRiskWithContext = async (riskId, options = {}) => {
  const risk = await MrPlanningRisk.findByPk(riskId, {
    include: [
      {
        model: MrPlanningContext,
        as: 'context',
        required: false,
      },
    ],
    ...options,
  });

  if (!risk) {
    throwValidation('MR Planning Risk tidak ditemukan.', {
      mr_planning_risk_id: riskId,
    });
  }

  return risk;
};

const buildSystemFieldsFromRisk = (risk, userId) => {
  const context = risk.context || null;

  return {
    mr_planning_risk_id: risk.id,
    mr_planning_context_id: risk.context_id || context?.id || null,

    periode_id: risk.periode_id || context?.periode_id || null,
    tahun: risk.tahun || context?.tahun || null,
    periode_type: context?.periode_type || 'tahunan',
    periode_label: context?.periode_label || null,
    periode_awal: context?.periode_awal || null,
    periode_akhir: context?.periode_akhir || null,

    owner_user_id: risk.owner_user_id || context?.owner_user_id || userId || null,
    owner_division_id: risk.owner_division_id || context?.owner_division_id || null,

    status_revisi: 'draft',
    versi: 1,
    dibuat_oleh: userId || null,
    dibuat_pada: new Date(),
    created_by: userId || null,
    updated_by: userId || null,
    is_active: true,
    is_latest: true,
  };
};

const ensureDraftAnalysis = (analysis) => {
  if (!analysis) return;

  if (analysis.status_revisi !== 'draft') {
    throwValidation('Risk Analysis hanya bisa diubah saat status draft.', {
      current_status: analysis.status_revisi,
    });
  }
};

const createAnalysisFromRisk = async ({ riskId, body = {}, userId, user, transaction } = {}) => {
  if (!riskId) {
    throwValidation('riskId wajib diisi.');
  }

  const allowedPayload = pickAllowedFields(body);
  const risk = await getRiskWithContext(riskId, { transaction });

  // Sprint 13 fail-closed contract: ownership resolution failure (Risk
  // induk found but without a resolvable opd_id) must DENY, never silently
  // fall through to resolveMrPlanningRiskOpdBoundary's own "null = defer"
  // semantics -- that behavior exists for its original call sites where null
  // legitimately means "not found yet, let normal validation handle it", not
  // applicable to an authorization decision here.
  const createTargetOpdId = risk?.opd_id ?? null;
  if (createTargetOpdId === null && user?.role !== 'SUPER_ADMIN') {
    throwMrPlanningRiskOpdBoundaryError({
      ok: false,
      status: 403,
      error: {
        message:
          'Kepemilikan OPD untuk MR Planning Risk Analysis ini tidak dapat diverifikasi. Aksi ditolak demi keamanan data.',
        code: 'MR_RISK_ANALYSIS_OPD_BOUNDARY_UNRESOLVED',
      },
    });
  }

  const createBoundary = await resolveMrPlanningRiskOpdBoundary({
    user,
    targetOpdId: createTargetOpdId,
  });
  if (!createBoundary.ok) {
    throwMrPlanningRiskOpdBoundaryError(createBoundary);
  }

  const payloadWithDefaults = await applyAnalysisDefaultsFromRisk(allowedPayload, risk, {
    transaction,
  });

  const systemPayload = buildSystemFieldsFromRisk(risk, userId);

  const payloadWithAppetiteRef = {
    ...payloadWithDefaults,
    selera_risiko_ref_id:
      payloadWithDefaults.selera_risiko_ref_id || risk.selera_risiko_ref_id || null,
  };

  const labelPayload = await resolveLabelsForPayload(payloadWithAppetiteRef, {
    transaction,
  });

  const appetitePayload = {
    ...labelPayload,
    selera_risiko: labelPayload.selera_risiko || risk.selera_risiko || null,
    appetite_threshold: labelPayload.appetite_threshold || 9,
  };

  const calculatedPayload = await applyRiskMatrixCalculation(appetitePayload, {
    transaction,
  });

  await MrPlanningRiskAnalysis.update(
    { is_latest: false },
    { where: { mr_planning_risk_id: risk.id }, transaction },
  );

  return MrPlanningRiskAnalysis.create(
    {
      ...systemPayload,
      ...calculatedPayload,
    },
    { transaction },
  );
};

const updateDraftAnalysis = async ({ analysisId, body = {}, userId, user, transaction } = {}) => {
  if (!analysisId) {
    throwValidation('analysisId wajib diisi.');
  }

  const analysis = await MrPlanningRiskAnalysis.findByPk(analysisId, {
    transaction,
  });

  if (!analysis) {
    throwValidation('MR Planning Risk Analysis tidak ditemukan.', {
      id: analysisId,
    });
  }

  ensureDraftAnalysis(analysis);

  const risk = analysis.mr_planning_risk_id
    ? await MrPlanningRisk.findByPk(analysis.mr_planning_risk_id, { transaction })
    : null;

  // Sprint 13 fail-closed contract: ownership resolution failure (missing
  // mr_planning_risk_id, or parent Risk not found) must DENY, never silently
  // fall through to resolveMrPlanningRiskOpdBoundary's own "null = defer"
  // semantics -- that behavior exists for its original call sites where null
  // legitimately means "not found yet, let normal validation handle it", not
  // applicable to an authorization decision here.
  const updateTargetOpdId = risk?.opd_id ?? null;
  if (updateTargetOpdId === null && user?.role !== 'SUPER_ADMIN') {
    throwMrPlanningRiskOpdBoundaryError({
      ok: false,
      status: 403,
      error: {
        message:
          'Kepemilikan OPD untuk MR Planning Risk Analysis ini tidak dapat diverifikasi. Aksi ditolak demi keamanan data.',
        code: 'MR_RISK_ANALYSIS_OPD_BOUNDARY_UNRESOLVED',
      },
    });
  }

  const updateBoundary = await resolveMrPlanningRiskOpdBoundary({
    user,
    targetOpdId: updateTargetOpdId,
  });
  if (!updateBoundary.ok) {
    throwMrPlanningRiskOpdBoundaryError(updateBoundary);
  }

  const allowedPayload = pickAllowedFields(body);

  const mergedPayload = {
    ...analysis.get({ plain: true }),
    ...allowedPayload,
  };

  const payloadWithDefaults = risk
    ? await applyAnalysisDefaultsFromRisk(mergedPayload, risk, { transaction })
    : mergedPayload;

  const labelPayload = await resolveLabelsForPayload(payloadWithDefaults, {
    transaction,
  });

  const calculatedPayload = await applyRiskMatrixCalculation(labelPayload, {
    transaction,
  });

  await analysis.update(
    {
      ...calculatedPayload,
      alasan_revisi: allowedPayload.alasan_revisi || analysis.alasan_revisi,
      last_revised_at: new Date(),
      last_revised_by: userId || null,
      updated_by: userId || null,
    },
    { transaction },
  );

  return getAnalysisDetail(analysis.id, { transaction, user });
};

const getAnalysisDetail = async (analysisId, { user, ...options } = {}) => {
  if (!analysisId) {
    throwValidation('analysisId wajib diisi.');
  }

  const analysis = await MrPlanningRiskAnalysis.findByPk(analysisId, {
    include: [
      {
        model: MrPlanningRisk,
        as: 'risk',
        required: false,
      },
      {
        model: MrPlanningContext,
        as: 'context',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'existing_control_status_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'control_adequacy_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'inherent_likelihood_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'inherent_impact_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'inherent_level_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'residual_likelihood_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'residual_impact_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'residual_level_ref',
        required: false,
      },
      {
        model: MrReferenceItem,
        as: 'selera_risiko_ref',
        required: false,
      },
    ],
    ...options,
  });

  if (!analysis) {
    throwValidation('MR Planning Risk Analysis tidak ditemukan.', {
      id: analysisId,
    });
  }

  // Sprint 13 CORRECTIVE (CEA finding): authorize AFTER the minimum record
  // fetch (required to resolve ownership) but BEFORE returning any
  // protected detail to the caller. Foreign ordinary OPD receives NO
  // DISCLOSURE. Missing/undefined/malformed `user` is NOT a trusted
  // internal-call signal -- it fails closed like any other caller, exactly
  // like every other Sprint 13 boundary check. Legitimate internal callers
  // (e.g. updateDraftAnalysis's post-update return) MUST explicitly
  // propagate their own already-authenticated `user` -- see the call site
  // above, which now passes { transaction, user }.
  const detailTargetOpdId = analysis?.risk?.opd_id ?? null;
  if (detailTargetOpdId === null && user?.role !== 'SUPER_ADMIN') {
    throwMrPlanningRiskOpdBoundaryError({
      ok: false,
      status: 403,
      error: {
        message:
          'Kepemilikan OPD untuk MR Planning Risk Analysis ini tidak dapat diverifikasi. Aksi ditolak demi keamanan data.',
        code: 'MR_RISK_ANALYSIS_OPD_BOUNDARY_UNRESOLVED',
      },
    });
  }

  const detailBoundary = await resolveMrPlanningRiskOpdBoundary({
    user,
    targetOpdId: detailTargetOpdId,
  });
  if (!detailBoundary.ok) {
    throwMrPlanningRiskOpdBoundaryError(detailBoundary);
  }

  return analysis;
};

const getAnalysesByRisk = async (riskId, { user, ...options } = {}) => {
  if (!riskId) {
    throwValidation('riskId wajib diisi.');
  }

  // Sprint 13 CORRECTIVE (CEA finding): resolve the target Risk's OPD
  // ownership and authorize BEFORE executing/returning the protected list,
  // avoiding disclosure of a foreign-OPD list. Missing/undefined/malformed
  // `user` fails closed like any other caller -- no internal-call bypass.
  const risk = await MrPlanningRisk.findByPk(riskId, {
    transaction: options.transaction,
  });

  const listTargetOpdId = risk?.opd_id ?? null;
  if (listTargetOpdId === null && user?.role !== 'SUPER_ADMIN') {
    throwMrPlanningRiskOpdBoundaryError({
      ok: false,
      status: 403,
      error: {
        message:
          'Kepemilikan OPD untuk MR Planning Risk Analysis ini tidak dapat diverifikasi. Aksi ditolak demi keamanan data.',
        code: 'MR_RISK_ANALYSIS_OPD_BOUNDARY_UNRESOLVED',
      },
    });
  }

  const listBoundary = await resolveMrPlanningRiskOpdBoundary({
    user,
    targetOpdId: listTargetOpdId,
  });
  if (!listBoundary.ok) {
    throwMrPlanningRiskOpdBoundaryError(listBoundary);
  }

  return MrPlanningRiskAnalysis.findAll({
    where: {
      mr_planning_risk_id: riskId,
      is_active: true,
    },
    order: [
      ['is_latest', 'DESC'],
      ['id', 'DESC'],
    ],
    ...options,
  });
};

module.exports = {
  MrPlanningRiskAnalysisServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  BLOCKED_TECHNICAL_FIELDS,
  createAnalysisFromRisk,
  updateDraftAnalysis,
  getAnalysisDetail,
  getAnalysesByRisk,
};

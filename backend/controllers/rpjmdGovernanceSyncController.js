'use strict';

const previewService = require('../services/rpjmd/rpjmdSyncPreviewService');
const executeService = require('../services/rpjmd/rpjmdSyncExecuteService');
const codeFirstGovernanceFlowService = require('../services/rpjmd/rpjmdCodeFirstGovernanceFlowService');
const preparedSourceService = require('../services/rpjmd/rpjmdPreparedSourceService');
const indicatorSyncService = require('../services/rpjmd/rpjmdIndicatorSyncService');
const indicatorRepairService = require('../services/rpjmd/rpjmdIndicatorAutoRepairService');
const indicatorSmartSyncService = require('../services/rpjmd/rpjmdIndicatorSmartSyncService');
const subKegiatanTargetProvisioningService = require('../services/rpjmd/rpjmdSubKegiatanTargetProvisioningService');
const monitoringService = require('../services/rpjmd/rpjmdGovernanceJobMonitoringService');

const PREVIEW_VALIDATION_CODES = new Set([
  'RPJMD_PREVIEW_VALIDATION_ERROR',
  'RPJMD_PREVIEW_DIFF_FAILED',
  'CHANGE_REASON_REQUIRED',
]);

const EXECUTE_VALIDATION_CODES = new Set([
  'RPJMD_EXECUTE_VALIDATION_ERROR',
  'RPJMD_EXECUTE_CONFIRM_REQUIRED',
  'RPJMD_EXECUTE_REASON_REQUIRED',
  'RPJMD_EXECUTE_PREVIEW_REQUIRED',
  'RPJMD_EXECUTE_PREFLIGHT_FAILED',
  'RPJMD_EXECUTE_DIFF_FAILED',
  'RPJMD_EXECUTE_BLOCKED',
]);

const RESOLVER_FAILURE_CODES = new Set([
  'RPJMD_SOURCE_MAP_NOT_FOUND',
  'RPJMD_SOURCE_MAP_MISSING_TARGET',
  'RPJMD_SOURCE_MAP_CHAIN_MISMATCH',
  'RPJMD_SOURCE_MAP_RESOLVER_CONFLICT',
]);

const INDICATOR_SYNC_FAILURE_CODES = new Set([
  'RPJMD_INDICATOR_SYNC_VALIDATION_ERROR',
  'RPJMD_INDICATOR_SYNC_BLOCKED',
  'RPJMD_INDICATOR_SYNC_DUPLICATE',
  'RPJMD_INDICATOR_SYNC_FAILED',
  'RPJMD_INDICATOR_SYNC_NO_SOURCE',
]);

const PREPARED_SOURCE_CODES = new Set([
  'RPJMD_PREPARED_SOURCE_VALIDATION_ERROR',
  'RPJMD_PREPARED_SOURCE_BUILD_FAILED',
  'RPJMD_PREPARED_SOURCE_SCOPE_INVALID',
]);

const MONITORING_VALIDATION_CODES = new Set([
  'RPJMD_JOB_MONITORING_VALIDATION_ERROR',
]);

const MONITORING_NOT_FOUND_CODES = new Set([
  'RPJMD_JOB_NOT_FOUND',
]);

function buildErrorStatusCode(code) {
  if (
    PREVIEW_VALIDATION_CODES.has(code) ||
    EXECUTE_VALIDATION_CODES.has(code) ||
    RESOLVER_FAILURE_CODES.has(code) ||
    INDICATOR_SYNC_FAILURE_CODES.has(code) ||
    PREPARED_SOURCE_CODES.has(code) ||
    MONITORING_VALIDATION_CODES.has(code)
  ) {
    return 400;
  }

  if (MONITORING_NOT_FOUND_CODES.has(code)) {
    return 404;
  }

  return 500;
}

function buildFallbackErrorResponse(code, message, fallbackCode, fallbackMessage) {
  return {
    success: false,
    code: code || fallbackCode,
    message: message || fallbackMessage,
  };
}

function extractActorRole(reqUser = null) {
  const source = reqUser && typeof reqUser === 'object' ? reqUser : {};
  const roleCandidates = [
    source.role,
    source.role_name,
    source.roleName,
    source.role_code,
    source.roleCode,
    source.role_label,
    source.roleLabel,
    source?.Role?.nama_role,
    source?.Role?.namaRole,
    source?.Role?.name,
  ];

  for (const candidate of roleCandidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
      return candidate;
    }
  }

  return null;
}

async function preview(req, res) {
  try {
    const result = await previewService.runRpjmdGovernancePreview({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: req.user?.role ?? null,
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_PREVIEW_FAILED',
        message: result.message || 'Preview Governance Hub gagal.',
        errors: result.errors || [],
      });
    }

    const isBlocked = Boolean(result.data?.is_blocked);
    const message = isBlocked
      ? 'Preview berhasil dibuat, tetapi masih memiliki isu blocking.'
      : 'Preview Governance Hub berhasil dibuat.';

    return res.json({
      success: true,
      message,
      data: {
        job: result.data.job,
        summary: result.data.summary,
        is_blocked: isBlocked,
        items: result.data.items,
      },
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.preview]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_PREVIEW_FAILED',
      message: error?.message || 'Preview Governance Hub gagal.',
    });
  }
}

async function execute(req, res) {
  try {
    const result = await executeService.runRpjmdGovernanceExecute({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: req.user?.role ?? null,
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_EXECUTE_FAILED',
        message: result.message || 'Execute Governance Hub gagal.',
        errors: result.errors || [],
      });
    }

    const isBlocked = Boolean(result.data?.is_blocked);
    const message = isBlocked
      ? 'Execute diblokir karena masih ada isu blocking.'
      : 'Execute Governance Hub berhasil.';

    return res.json({
      success: true,
      message,
      data: {
        job: result.data.job,
        summary: result.data.summary,
        apply_result: result.data.apply_result,
        is_blocked: isBlocked,
        issues: result.data.issues || [],
      },
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.execute]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_EXECUTE_FAILED',
      message: error?.message || 'Execute Governance Hub gagal.',
    });
  }
}

async function resolveSourceMap(req, res) {
  try {
    const result = await codeFirstGovernanceFlowService.resolveGovernanceFlow(req.query);

    if (!result.success) {
      return res.status(result.status || 400).json({
        success: false,
        code: result.code || 'RPJMD_SOURCE_MAP_FAILED',
        message: result.message || 'Resolver source map gagal.',
        data: result.data || null,
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Source map berhasil di-resolve.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.resolveSourceMap]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_SOURCE_MAP_FAILED',
      message: error?.message || 'Resolver source map gagal.',
    });
  }
}

async function preparedSource(req, res) {
  try {
    const result = await preparedSourceService.getPreparedSourceList(req.query);

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_PREPARED_SOURCE_FAILED',
        message: result.message || 'Prepared source gagal diambil.',
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Prepared source berhasil diambil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.preparedSource]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_PREPARED_SOURCE_FAILED',
      message: error?.message || 'Prepared source gagal diambil.',
    });
  }
}

async function syncIndicators(req, res) {
  try {
    const result = await indicatorSyncService.syncRpjmdIndicatorsToRenstra({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: extractActorRole(req.user),
      actor_user: req.user ?? null,
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(result.status || buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_INDICATOR_SYNC_FAILED',
        message: result.message || 'Sinkronisasi indikator gagal.',
        errors: result.errors || [],
        data: result.data || null,
      });
    }

    return res.status(result.status || (result.data?.created > 0 ? 201 : 200)).json({
      success: true,
      message: result.message || 'Sinkronisasi indikator berhasil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.syncIndicators]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_INDICATOR_SYNC_FAILED',
      message: error?.message || 'Sinkronisasi indikator gagal.',
    });
  }
}

async function indicatorHealth(req, res) {
  try {
    const result = await indicatorSmartSyncService.getIndicatorHealth({
      ...req.query,
      actor_user_id: req.user?.id ?? null,
      actor_role: extractActorRole(req.user),
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(result.status || buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_INDICATOR_HEALTH_FAILED',
        message: result.message || 'Health scan indikator gagal.',
        errors: result.errors || [],
        data: result.data || null,
      });
    }

    return res.json({
      success: true,
      message: result.message || 'Health scan indikator berhasil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.indicatorHealth]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_INDICATOR_HEALTH_FAILED',
      message: error?.message || 'Health scan indikator gagal.',
    });
  }
}

async function indicatorRepairPreview(req, res) {
  try {
    const result = await indicatorRepairService.previewIndicatorRepair({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: extractActorRole(req.user),
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(result.status || buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_INDICATOR_REPAIR_PREVIEW_FAILED',
        message: result.message || 'Preview repair indikator gagal.',
        errors: result.errors || [],
        data: result.data || null,
      });
    }

    return res.json({
      success: true,
      message: result.message || 'Preview repair indikator berhasil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.indicatorRepairPreview]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_INDICATOR_REPAIR_PREVIEW_FAILED',
      message: error?.message || 'Preview repair indikator gagal.',
    });
  }
}

async function indicatorRepairExecute(req, res) {
  try {
    const result = await indicatorRepairService.executeIndicatorRepair({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: extractActorRole(req.user),
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(result.status || buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_INDICATOR_REPAIR_FAILED',
        message: result.message || 'Repair indikator gagal.',
        errors: result.errors || [],
        data: result.data || null,
      });
    }

    return res.json({
      success: true,
      message: result.message || 'Repair indikator berhasil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.indicatorRepairExecute]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_INDICATOR_REPAIR_FAILED',
      message: error?.message || 'Repair indikator gagal.',
    });
  }
}

async function smartSyncIndicators(req, res) {
  try {
    const result = await indicatorSmartSyncService.runSmartIndicatorSync({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: extractActorRole(req.user),
      actor_user: req.user ?? null,
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(result.status || buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_INDICATOR_SMART_SYNC_FAILED',
        message: result.message || 'Smart sync indikator gagal.',
        errors: result.errors || [],
        data: result.data || null,
      });
    }

    return res.status(result.status || 200).json({
      success: true,
      message: result.message || 'Smart sync indikator berhasil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.smartSyncIndicators]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'RPJMD_INDICATOR_SMART_SYNC_FAILED',
      message: error?.message || 'Smart sync indikator gagal.',
    });
  }
}

async function provisionSubKegiatanTarget(req, res) {
  try {
    const result = await subKegiatanTargetProvisioningService.provisionSubKegiatanTarget({
      ...req.body,
      actor_user_id: req.user?.id ?? null,
      actor_role: req.user?.role ?? null,
      reqMeta: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    if (!result.success) {
      return res.status(Number(result.status || 400)).json({
        success: false,
        code: result.code || 'SUB_KEGIATAN_TARGET_PROVISION_FAILED',
        message: result.message || 'Provision target Sub Kegiatan gagal.',
        data: result.data || null,
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: result.message || 'Target Renstra Sub Kegiatan berhasil disediakan.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.provisionSubKegiatanTarget]', error?.message);
    return res.status(500).json({
      success: false,
      code: 'SUB_KEGIATAN_TARGET_PROVISION_FAILED',
      message: error?.message || 'Provision target Sub Kegiatan gagal.',
    });
  }
}

async function listJobs(req, res) {
  try {
    const result = await monitoringService.listGovernanceJobs(req.query);

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_JOB_MONITORING_FAILED',
        message: result.message || 'Daftar job Governance Hub gagal diambil.',
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Daftar job Governance Hub berhasil diambil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.listJobs]', error?.message);
    return res.status(500).json(
      buildFallbackErrorResponse(
        'RPJMD_JOB_MONITORING_FAILED',
        error?.message,
        'RPJMD_JOB_MONITORING_FAILED',
        'Daftar job Governance Hub gagal diambil.'
      )
    );
  }
}

async function getJobDetail(req, res) {
  try {
    const result = await monitoringService.getGovernanceJobDetail({
      ...req.query,
      jobId: req.params?.jobId,
    });

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_JOB_MONITORING_FAILED',
        message: result.message || 'Detail job Governance Hub gagal diambil.',
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Detail job Governance Hub berhasil diambil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.getJobDetail]', error?.message);
    return res.status(500).json(
      buildFallbackErrorResponse(
        'RPJMD_JOB_MONITORING_FAILED',
        error?.message,
        'RPJMD_JOB_MONITORING_FAILED',
        'Detail job Governance Hub gagal diambil.'
      )
    );
  }
}

async function listJobItems(req, res) {
  try {
    const result = await monitoringService.listGovernanceJobItems({
      ...req.query,
      jobId: req.params?.jobId,
    });

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_JOB_ITEMS_FAILED',
        message: result.message || 'Job items Governance Hub gagal diambil.',
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Job items Governance Hub berhasil diambil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.listJobItems]', error?.message);
    return res.status(500).json(
      buildFallbackErrorResponse(
        'RPJMD_JOB_ITEMS_FAILED',
        error?.message,
        'RPJMD_JOB_ITEMS_FAILED',
        'Job items Governance Hub gagal diambil.'
      )
    );
  }
}

async function listJobAuditLogs(req, res) {
  try {
    const result = await monitoringService.listGovernanceJobAuditLogs({
      ...req.query,
      jobId: req.params?.jobId,
    });

    if (!result.success) {
      return res.status(buildErrorStatusCode(result.code)).json({
        success: false,
        code: result.code || 'RPJMD_JOB_AUDIT_LOGS_FAILED',
        message: result.message || 'Audit logs Governance Hub gagal diambil.',
        errors: result.errors || [],
      });
    }

    return res.json({
      success: true,
      message: 'Audit logs Governance Hub berhasil diambil.',
      data: result.data,
    });
  } catch (error) {
    console.error('[rpjmdGovernanceSyncController.listJobAuditLogs]', error?.message);
    return res.status(500).json(
      buildFallbackErrorResponse(
        'RPJMD_JOB_AUDIT_LOGS_FAILED',
        error?.message,
        'RPJMD_JOB_AUDIT_LOGS_FAILED',
        'Audit logs Governance Hub gagal diambil.'
      )
    );
  }
}

module.exports = {
  preview,
  execute,
  resolveSourceMap,
  preparedSource,
  syncIndicators,
  indicatorHealth,
  indicatorRepairPreview,
  indicatorRepairExecute,
  smartSyncIndicators,
  provisionSubKegiatanTarget,
  listJobs,
  getJobDetail,
  listJobItems,
  listJobAuditLogs,
};

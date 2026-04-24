"use strict";

const { structuredErrorResponse } = require("../utils/responseHelper");
const {
  getOperationalMode,
  getEffectiveOperationalModeForSubKegiatan,
} = require("../services/appPolicyService");
const {
  isMasterPayload,
  isCompleteMasterPayload,
} = require("../helpers/subKegiatanMasterWrite");

function requiresMasterByMode(mode) {
  return String(mode || "").toUpperCase() === "MASTER";
}

/** Mode global (policy `operational_mode`) — untuk route non-sub_kegiatan kelak. */
async function loadOperationalMode(req, res, next) {
  try {
    req.operationalMode = await getOperationalMode();
    next();
  } catch (err) {
    next(err);
  }
}

/** Mode efektif untuk create/update SubKegiatan (override sub + env staging). */
async function loadOperationalModeSubKegiatan(req, res, next) {
  try {
    req.operationalMode = await getEffectiveOperationalModeForSubKegiatan();
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guard awal untuk POST/PUT sub_kegiatan. Validasi penuh ada di controller + prepareSubKegiatanMasterWrite.
 * Mode MASTER + POST: wajib body lengkap master (create).
 * Mode TRANSITION: partial master di body ditolak.
 */
function enforceMasterForSubKegiatan(req, res, next) {
  const mode = String(req.operationalMode || "LEGACY").toUpperCase();
  if (mode === "LEGACY") {
    return next();
  }
  if (
    mode === "TRANSITION" &&
    isMasterPayload(req.body) &&
    !isCompleteMasterPayload(req.body)
  ) {
    return structuredErrorResponse(res, 400, {
      code: "MASTER_FIELDS_REQUIRED",
      message:
        "Field master tidak lengkap: kirim master_sub_kegiatan_id dan regulasi_versi_id bersamaan.",
      field: null,
    });
  }
  if (mode === "MASTER" && req.method === "POST" && !isCompleteMasterPayload(req.body)) {
    return structuredErrorResponse(res, 400, {
      code: "MASTER_FIELDS_REQUIRED",
      message:
        "Mode MASTER: pembuatan sub_kegiatan wajib menyertakan master_sub_kegiatan_id dan regulasi_versi_id.",
      field: null,
    });
  }
  return next();
}

module.exports = {
  loadOperationalMode,
  loadOperationalModeSubKegiatan,
  enforceMasterForSubKegiatan,
  requiresMasterByMode,
  isMasterPayload,
  isCompleteMasterPayload,
};

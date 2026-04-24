"use strict";

const {
  getOperationalMode,
  getEffectiveOperationalModeForSubKegiatan,
  getPolicy,
  setPolicy,
  deletePolicyKey,
  isValidOperationalMode,
  normalizeOperationalModeValue,
  getSubKegiatanComplianceSnapshot,
  recordComplianceSnapshotHistory,
  OPERATIONAL_MODE_KEY,
  OPERATIONAL_MODE_SUB_KEGIATAN_KEY,
} = require("../services/appPolicyService");
const {
  successResponse,
  structuredErrorResponse,
} = require("../utils/responseHelper");

function hasBodyProp(body, snake, camel) {
  if (!body || typeof body !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(body, snake)) return true;
  if (camel && Object.prototype.hasOwnProperty.call(body, camel)) return true;
  return false;
}

const appPolicyController = {
  async getOperationalMode(req, res) {
    try {
      const mode = await getOperationalMode();
      const effective_sub_kegiatan =
        await getEffectiveOperationalModeForSubKegiatan();
      const policySubRaw = await getPolicy(OPERATIONAL_MODE_SUB_KEGIATAN_KEY);
      const envSubRaw = process.env.EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN;

      return res.status(200).json({
        mode,
        effective_sub_kegiatan,
        sources: {
          global_policy: mode,
          sub_policy: normalizeOperationalModeValue(policySubRaw),
          env_sub_kegiatan: envSubRaw
            ? String(envSubRaw).trim()
            : null,
        },
        hints: {
          transition_testing:
            "Set mode TRANSITION lalu POST/PUT sub_kegiatan tanpa master → meta.enforcementWarning; dengan master → input_mode MASTER.",
          soft_launch:
            "Tanpa mengubah mode global: PUT { sub_kegiatan_mode } atau env EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN untuk pilot sub_kegiatan saja.",
          data_cleaning:
            "Kurangi LEGACY via /api/v1/migration (apply, resolve-split, split-coverage) sesuai kebijakan DPA Anda.",
          compliance_snapshot:
            "GET /api/v1/app-policy/compliance-snapshot — agregat input_mode + cek integritas MASTER; ?trendHours=168 untuk deret dari histori.",
          compliance_snapshot_record:
            "POST /api/v1/app-policy/compliance-snapshot/record (admin) — simpan titik histori; jadwalkan cron + opsional webhook env EPELARA_COMPLIANCE_ALERT_WEBHOOK_URL.",
        },
      });
    } catch (err) {
      console.error("[appPolicyController.getOperationalMode]", err);
      return structuredErrorResponse(res, 500, {
        code: "INTERNAL_ERROR",
        message: err.message || "Gagal membaca mode operasional",
        field: null,
      });
    }
  },

  async getComplianceSnapshot(req, res) {
    try {
      const q = req.query || {};
      const raw = q.trend_hours ?? q.trendHours;
      const trendHours =
        raw !== undefined && raw !== null && String(raw).trim() !== ""
          ? Number(raw)
          : 0;
      const data = await getSubKegiatanComplianceSnapshot({
        trendHours: Number.isFinite(trendHours) ? trendHours : 0,
      });
      return successResponse(res, 200, "Snapshot compliance SubKegiatan", data);
    } catch (err) {
      console.error("[appPolicyController.getComplianceSnapshot]", err);
      return structuredErrorResponse(res, 500, {
        code: "INTERNAL_ERROR",
        message: err.message || "Gagal membaca snapshot compliance",
        field: null,
      });
    }
  },

  async postComplianceSnapshotRecord(req, res) {
    try {
      const data = await recordComplianceSnapshotHistory(req.user?.id ?? null);
      return successResponse(res, 201, "Titik histori snapshot compliance disimpan", data);
    } catch (err) {
      console.error("[appPolicyController.postComplianceSnapshotRecord]", err);
      return structuredErrorResponse(res, 500, {
        code: "INTERNAL_ERROR",
        message: err.message || "Gagal menyimpan histori snapshot",
        field: null,
      });
    }
  },

  async putOperationalMode(req, res) {
    try {
      const body = req.body || {};
      const rawMode = body.mode ?? body.operational_mode;
      const rawSub = body.sub_kegiatan_mode ?? body.subKegiatanMode;

      const wantsGlobal =
        rawMode !== undefined && rawMode !== null && String(rawMode).trim() !== "";
      const wantsSub = hasBodyProp(body, "sub_kegiatan_mode", "subKegiatanMode");

      if (!wantsGlobal && !wantsSub) {
        return structuredErrorResponse(res, 400, {
          code: "VALIDATION_ERROR",
          message:
            "Kirim minimal salah satu: mode (global) atau sub_kegiatan_mode (pilot sub_kegiatan). Kosongkan sub dengan null.",
          field: "mode",
        });
      }

      if (wantsGlobal) {
        if (!isValidOperationalMode(rawMode)) {
          return structuredErrorResponse(res, 400, {
            code: "INVALID_OPERATIONAL_MODE",
            message: "Nilai mode harus LEGACY, TRANSITION, atau MASTER.",
            field: "mode",
          });
        }
        const mode = normalizeOperationalModeValue(rawMode);
        await setPolicy(OPERATIONAL_MODE_KEY, mode, req.user?.id ?? null);
      }

      if (wantsSub) {
        if (rawSub === null || rawSub === "") {
          await deletePolicyKey(OPERATIONAL_MODE_SUB_KEGIATAN_KEY);
        } else if (!isValidOperationalMode(rawSub)) {
          return structuredErrorResponse(res, 400, {
            code: "INVALID_OPERATIONAL_MODE",
            message:
              "sub_kegiatan_mode harus LEGACY, TRANSITION, atau MASTER (atau null untuk inherit global).",
            field: "sub_kegiatan_mode",
          });
        } else {
          await setPolicy(
            OPERATIONAL_MODE_SUB_KEGIATAN_KEY,
            normalizeOperationalModeValue(rawSub),
            req.user?.id ?? null,
          );
        }
      }

      const mode = await getOperationalMode();
      const effective_sub_kegiatan =
        await getEffectiveOperationalModeForSubKegiatan();
      return successResponse(res, 200, "Kebijakan mode diperbarui", {
        mode,
        effective_sub_kegiatan,
      });
    } catch (err) {
      console.error("[appPolicyController.putOperationalMode]", err);
      return structuredErrorResponse(res, 500, {
        code: "INTERNAL_ERROR",
        message: err.message || "Gagal menyimpan mode",
        field: null,
      });
    }
  },
};

module.exports = appPolicyController;

"use strict";

const { getMergedFeaturesForTenant } = require("../helpers/subscriptionPlanFeatures");

/**
 * Feature gate berdasarkan subscription aktif tenant + Plan.features.
 * Pasang setelah verifyToken (butuh req.tenantId).
 */
function requireFeature(featureKey) {
  return async function requireFeatureMiddleware(req, res, next) {
    try {
      const tenantId =
        req.tenantId != null && Number.isFinite(Number(req.tenantId))
          ? Number(req.tenantId)
          : 1;
      const features = await getMergedFeaturesForTenant(tenantId);
      if (!features[featureKey]) {
        return res.status(403).json({
          message:
            "Fitur tidak tersedia pada paket langganan Anda. Upgrade ke PRO.",
          code: "FEATURE_NOT_AVAILABLE",
          feature: featureKey,
        });
      }
      return next();
    } catch (err) {
      console.error("[requireFeature]", featureKey, err);
      return res
        .status(500)
        .json({ message: "Gagal memverifikasi paket langganan." });
    }
  };
}

module.exports = requireFeature;

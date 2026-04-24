/** Rute halaman harga / paket (relative ke root app) */
export const PRICING_PATH = "/pricing";

/**
 * Cek fitur dari konteks user (login / JWT / refresh): user.plan_features
 */
export function hasPlanFeature(user, featureKey) {
  const f = user?.plan_features;
  if (!f || typeof f !== "object") return false;
  return Boolean(f[featureKey]);
}

export const PLAN_FEATURE_KEYS = Object.freeze({
  heatmap: "heatmap",
  early_warning: "early_warning",
  export: "export",
  monitoring_opd: "monitoring_opd",
});

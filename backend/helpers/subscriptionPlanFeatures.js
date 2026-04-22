"use strict";

const { Subscription, Plan } = require("../models");

const DEFAULT_FEATURE_KEYS = Object.freeze([
  "heatmap",
  "early_warning",
  "export",
  "monitoring_opd",
]);

const DEFAULT_FEATURES = Object.freeze({
  heatmap: false,
  early_warning: false,
  export: false,
  monitoring_opd: false,
});

function mergeFeaturesFromPlan(planRow) {
  const out = { ...DEFAULT_FEATURES };
  const raw = planRow?.features;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of DEFAULT_FEATURE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) {
        out[k] = !!raw[k];
      }
    }
  }
  return out;
}

async function getActiveSubscriptionWithPlan(tenantId, options = {}) {
  const tid =
    tenantId != null &&
    Number.isFinite(Number(tenantId)) &&
    Number(tenantId) > 0
      ? Number(tenantId)
      : 1;
  return Subscription.findOne({
    where: { tenant_id: tid, status: "active" },
    include: [{ model: Plan, as: "plan", required: true }],
    order: [["id", "DESC"]],
    transaction: options.transaction,
  });
}

async function getMergedFeaturesForTenant(tenantId, options = {}) {
  const sub = await getActiveSubscriptionWithPlan(tenantId, options);
  if (!sub?.plan) {
    return { ...DEFAULT_FEATURES };
  }
  return mergeFeaturesFromPlan(sub.plan);
}

async function getPlanContextForTenant(tenantId, options = {}) {
  const sub = await getActiveSubscriptionWithPlan(tenantId, options);
  if (!sub?.plan) {
    return {
      plan_code: null,
      plan_nama: null,
      plan_features: { ...DEFAULT_FEATURES },
    };
  }
  return {
    plan_code: sub.plan.code,
    plan_nama: sub.plan.nama,
    plan_features: mergeFeaturesFromPlan(sub.plan),
  };
}

function planFieldsForJwt(planCtx) {
  return {
    plan_code: planCtx.plan_code,
    plan_nama: planCtx.plan_nama,
    plan_features: planCtx.plan_features,
  };
}

module.exports = {
  DEFAULT_FEATURES,
  DEFAULT_FEATURE_KEYS,
  mergeFeaturesFromPlan,
  getMergedFeaturesForTenant,
  getPlanContextForTenant,
  planFieldsForJwt,
};

"use strict";

const { Plan, Subscription } = require("../models");

/**
 * Hook provisioning pasca-pembuatan tenant — siap dikembangkan per sprint.
 * Jangan membangun flow besar di sini; panggil modul terpisah nanti.
 */
async function ensureDefaultOpdPlaceholder(_opts) {
  /* TODO: seed OPD default per tenant */
}

async function ensureTenantAdminPlaceholder(_opts) {
  /* TODO: undang / buat admin tenant */
}

async function ensureInitialSettingsPlaceholder(_opts) {
  /* TODO: defaults policy / feature flags per tenant */
}

/**
 * @param {object} opts
 * @param {object} opts.tenant — plain { id, nama, domain }
 * @param {object} opts.periode — plain periode default
 * @param {import('sequelize').Transaction} opts.transaction
 */
async function provisionAfterTenantCreate({ tenant, periode, transaction }) {
  await ensureDefaultOpdPlaceholder({ tenant, periode, transaction });
  await ensureTenantAdminPlaceholder({ tenant, periode, transaction });
  await ensureInitialSettingsPlaceholder({ tenant, periode, transaction });

  const freePlan = await Plan.findOne({
    where: { code: "free" },
    transaction,
  });
  if (!freePlan) return;

  const existing = await Subscription.findOne({
    where: { tenant_id: tenant.id, status: "active" },
    transaction,
  });
  if (existing) return;

  await Subscription.create(
    {
      tenant_id: tenant.id,
      plan_id: freePlan.id,
      status: "active",
      started_at: new Date(),
    },
    { transaction },
  );
}

module.exports = {
  provisionAfterTenantCreate,
  ensureDefaultOpdPlaceholder,
  ensureTenantAdminPlaceholder,
  ensureInitialSettingsPlaceholder,
};

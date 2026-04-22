"use strict";

const { Op } = require("sequelize");
const { Tenant, PeriodeRpjmd, Subscription, Plan } = require("../models");
const sequelize = require("../models").sequelize;
const { writeTenantAudit } = require("../services/tenantAuditService");
const { provisionAfterTenantCreate } = require("../services/tenantProvisioning");

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function normalizeDomain(domain) {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

exports.listTenants = async (req, res) => {
  try {
    const rows = await Tenant.findAll({
      attributes: ["id", "nama", "domain", "is_active", "created_at"],
      order: [["id", "ASC"]],
      raw: true,
    });
    return ok(res, rows);
  } catch (e) {
    console.error("[tenantController.listTenants]", e);
    return fail(res, 500, e.message || "Gagal memuat daftar tenant.");
  }
};

exports.createTenant = async (req, res) => {
  const nama = String(req.body?.nama || "").trim();
  let domain = normalizeDomain(req.body?.domain);
  if (!nama) return fail(res, 400, "Nama tenant wajib diisi.");
  if (!domain) return fail(res, 400, "Domain wajib diisi (huruf/angka, titik, strip).");

  const tahun_awal = parseInt(String(req.body?.tahun_awal ?? ""), 10);
  const tahun_akhir = parseInt(String(req.body?.tahun_akhir ?? ""), 10);
  const y0 = new Date().getFullYear();
  const ta = Number.isFinite(tahun_awal) ? tahun_awal : y0;
  const tb = Number.isFinite(tahun_akhir) ? tahun_akhir : ta + 4;
  if (ta > tb) return fail(res, 400, "tahun_awal tidak boleh lebih besar dari tahun_akhir.");

  const is_active = req.body?.is_active === false ? false : true;

  const t = await sequelize.transaction();
  try {
    const tenant = await Tenant.create({ nama, domain, is_active }, { transaction: t });
    const periode = await PeriodeRpjmd.create(
      {
        nama: `RPJMD — ${nama}`,
        tahun_awal: ta,
        tahun_akhir: tb,
      },
      { transaction: t },
    );
    await provisionAfterTenantCreate({
      tenant: tenant.get({ plain: true }),
      periode: periode.get({ plain: true }),
      transaction: t,
    });
    await t.commit();

    void writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "CREATE_TENANT",
      tenant_id_asal: req.jwtTenantId != null ? req.jwtTenantId : null,
      tenant_id_tujuan: tenant.id,
      payload: { nama, domain, is_active, periode_id: periode.id },
    });

    return ok(res, { tenant, default_periode: periode }, 201);
  } catch (e) {
    await t.rollback();
    if (e.name === "SequelizeUniqueConstraintError") {
      return fail(res, 409, "Domain sudah digunakan.");
    }
    console.error("[tenantController.createTenant]", e);
    return fail(res, 500, e.message || "Gagal membuat tenant.");
  }
};

exports.updateTenant = async (req, res) => {
  const id = parseInt(String(req.params.id || ""), 10);
  if (!Number.isFinite(id) || id < 1) return fail(res, 400, "ID tenant tidak valid.");

  const nama = req.body?.nama != null ? String(req.body.nama).trim() : null;
  const domainRaw = req.body?.domain;
  const domain = domainRaw != null ? normalizeDomain(domainRaw) : null;
  const is_active =
    req.body?.is_active === undefined ? undefined : Boolean(req.body.is_active);

  try {
    const row = await Tenant.findByPk(id);
    if (!row) return fail(res, 404, "Tenant tidak ditemukan.");

    const before = {
      nama: row.nama,
      domain: row.domain,
      is_active: row.is_active,
    };

    const patch = {};
    if (nama !== null && nama !== "") patch.nama = nama;
    if (domain !== null && domain !== "") {
      const dup = await Tenant.findOne({ where: { domain, id: { [Op.ne]: id } } });
      if (dup) return fail(res, 409, "Domain sudah digunakan tenant lain.");
      patch.domain = domain;
    }
    if (is_active !== undefined) patch.is_active = is_active;

    if (Object.keys(patch).length === 0) {
      return fail(res, 400, "Tidak ada field yang diubah.");
    }

    await row.update(patch);
    const after = row.get({ plain: true });

    void writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "UPDATE_TENANT",
      tenant_id_asal: id,
      tenant_id_tujuan: id,
      payload: { before, after: { nama: after.nama, domain: after.domain, is_active: after.is_active } },
    });

    return ok(res, after);
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") {
      return fail(res, 409, "Domain sudah digunakan.");
    }
    console.error("[tenantController.updateTenant]", e);
    return fail(res, 500, e.message || "Gagal memperbarui tenant.");
  }
};

exports.listTenantsSubscriptionsOverview = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      attributes: ["id", "nama", "domain", "is_active", "created_at"],
      order: [["id", "ASC"]],
    });
    const ids = tenants.map((t) => t.id);
    if (!ids.length) return ok(res, []);

    const subs = await Subscription.findAll({
      where: { tenant_id: { [Op.in]: ids }, status: "active" },
      include: [{ model: Plan, as: "plan", required: false }],
      order: [
        ["tenant_id", "ASC"],
        ["id", "DESC"],
      ],
    });
    const byTenant = new Map();
    for (const s of subs) {
      if (!byTenant.has(s.tenant_id)) byTenant.set(s.tenant_id, s);
    }

    const data = tenants.map((t) => {
      const plain = t.get({ plain: true });
      const sub = byTenant.get(t.id);
      return {
        ...plain,
        active_subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              started_at: sub.started_at,
              plan: sub.plan
                ? {
                    id: sub.plan.id,
                    code: sub.plan.code,
                    nama: sub.plan.nama,
                    features: sub.plan.features,
                  }
                : null,
            }
          : null,
      };
    });
    return ok(res, data);
  } catch (e) {
    console.error("[tenantController.listTenantsSubscriptionsOverview]", e);
    return fail(res, 500, e.message || "Gagal memuat langganan tenant.");
  }
};

exports.updateTenantSubscription = async (req, res) => {
  const tenantId = parseInt(String(req.params.id || ""), 10);
  const plan_code = String(req.body?.plan_code || "").trim().toLowerCase();
  if (!Number.isFinite(tenantId) || tenantId < 1) {
    return fail(res, 400, "ID tenant tidak valid.");
  }
  const allowed = ["free", "pro", "enterprise"];
  if (!allowed.includes(plan_code)) {
    return fail(res, 400, "plan_code harus free, pro, atau enterprise.");
  }

  const trx = await sequelize.transaction();
  try {
    const tenant = await Tenant.findByPk(tenantId, { transaction: trx });
    if (!tenant) {
      await trx.rollback();
      return fail(res, 404, "Tenant tidak ditemukan.");
    }
    const plan = await Plan.findOne({
      where: { code: plan_code },
      transaction: trx,
    });
    if (!plan) {
      await trx.rollback();
      return fail(res, 404, "Plan tidak ditemukan.");
    }
    const sub = await Subscription.findOne({
      where: { tenant_id: tenantId, status: "active" },
      order: [["id", "DESC"]],
      transaction: trx,
    });
    if (sub) {
      await sub.update({ plan_id: plan.id }, { transaction: trx });
    } else {
      await Subscription.create(
        {
          tenant_id: tenantId,
          plan_id: plan.id,
          status: "active",
          started_at: new Date(),
        },
        { transaction: trx },
      );
    }
    await trx.commit();

    void writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "UPDATE_TENANT_SUBSCRIPTION",
      tenant_id_asal: tenantId,
      tenant_id_tujuan: tenantId,
      payload: { plan_code },
    });

    return ok(res, { tenant_id: tenantId, plan_code });
  } catch (e) {
    await trx.rollback();
    console.error("[tenantController.updateTenantSubscription]", e);
    return fail(res, 500, e.message || "Gagal memperbarui paket tenant.");
  }
};

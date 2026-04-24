"use strict";

const { Op } = require("sequelize");
const tenantContext = require("./tenantContext");

/** Model Sequelize yang memiliki kolom tenant_id (isolasi SaaS). */
const TENANTED_MODEL_NAMES = [
  "Indikator",
  "IndikatorTujuan",
  "IndikatorSasaran",
  "IndikatorProgram",
  "IndikatorKegiatan",
  "IndikatorSubKegiatan",
  "IndikatorArahKebijakan",
  "IndikatorStrategi",
  "IndikatorMisi",
  "IndikatorDetail",
  "Tujuan",
  "Sasaran",
  "ImportLog",
  "OpdPenanggungJawab",
];

function mergeTenantWhere(where, tenantId) {
  const clause = { tenant_id: tenantId };
  if (where == null || (typeof where === "object" && Object.keys(where).length === 0)) {
    return clause;
  }
  return { [Op.and]: [where, clause] };
}

let tenantIsolationInstalled = false;

function installTenantIsolation(sequelize, db) {
  if (tenantIsolationInstalled) return;
  tenantIsolationInstalled = true;

  const isTenantedModel = (model) => model && TENANTED_MODEL_NAMES.includes(model.name);

  sequelize.addHook("beforeFind", (options) => {
    const tenantId = tenantContext.getTenantId();
    if (tenantId == null || !isTenantedModel(options.model)) return;
    options.where = mergeTenantWhere(options.where, tenantId);
  });

  sequelize.addHook("beforeCount", (options) => {
    const tenantId = tenantContext.getTenantId();
    if (tenantId == null || !isTenantedModel(options.model)) return;
    options.where = mergeTenantWhere(options.where, tenantId);
  });

  sequelize.addHook("beforeBulkUpdate", (options) => {
    const tenantId = tenantContext.getTenantId();
    if (tenantId == null || !isTenantedModel(options.model)) return;
    options.where = mergeTenantWhere(options.where, tenantId);
  });

  sequelize.addHook("beforeBulkDestroy", (options) => {
    const tenantId = tenantContext.getTenantId();
    if (tenantId == null || !isTenantedModel(options.model)) return;
    options.where = mergeTenantWhere(options.where, tenantId);
  });

  TENANTED_MODEL_NAMES.forEach((name) => {
    const Model = db[name];
    if (!Model || typeof Model.addHook !== "function") return;

    Model.addHook("beforeValidate", (instance) => {
      const tenantId = tenantContext.getTenantId();
      if (tenantId == null) return;
      if (instance.getDataValue("tenant_id") == null) {
        instance.setDataValue("tenant_id", tenantId);
      }
    });

    Model.addHook("beforeUpdate", (instance, options) => {
      const tenantId = tenantContext.getTenantId();
      if (tenantId == null) return;
      options.where = mergeTenantWhere(options.where, tenantId);
    });

    Model.addHook("beforeDestroy", (instance, options) => {
      const tenantId = tenantContext.getTenantId();
      if (tenantId == null) return;
      options.where = mergeTenantWhere(options.where, tenantId);
    });
  });
}

module.exports = {
  installTenantIsolation,
  TENANTED_MODEL_NAMES,
};

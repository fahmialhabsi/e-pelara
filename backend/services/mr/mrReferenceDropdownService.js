"use strict";

/**
 * MR Reference Dropdown Service
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 18B-0
 * Read-only bridge untuk dropdown frontend MR.
 *
 * Fokus:
 * - Membaca mr_reference_groups dan mr_reference_items.
 * - Tidak membuat create/update/delete reference.
 * - Tidak membuat migration.
 * - Tidak membuat seeder.
 * - Tidak hardcode ID reference.
 */

const db = require("../../models");

const { MrReferenceGroup, MrReferenceItem } = db;

const normalizeKodeGroup = (value) => String(value || "").trim().toUpperCase();

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.name = "MR_REFERENCE_VALIDATION_ERROR";
  error.code = "MR_REFERENCE_VALIDATION_ERROR";
  error.blocked = true;
  error.audit_mode = false;
  error.details = details;
  return error;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.name = "MR_REFERENCE_NOT_FOUND";
  error.code = "MR_REFERENCE_NOT_FOUND";
  error.blocked = true;
  error.audit_mode = false;
  error.details = details;
  return error;
};

const getItemsByGroup = async (kodeGroup) => {
  const normalizedKodeGroup = normalizeKodeGroup(kodeGroup);

  if (!normalizedKodeGroup) {
    throw createValidationError("Kode group reference wajib diisi.", {
      field: "kode_group",
    });
  }

  const group = await MrReferenceGroup.findOne({
    where: {
      kode_group: normalizedKodeGroup,
      is_active: true,
    },
  });

  if (!group) {
    throw createNotFoundError("Reference group tidak ditemukan.", {
      kode_group: normalizedKodeGroup,
    });
  }

  const items = await MrReferenceItem.findAll({
    where: {
      group_id: group.id,
      is_active: true,
    },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });

  return {
    group,
    items,
    meta: {
      kode_group: group.kode_group,
      group_id: group.id,
      total: items.length,
    },
  };
};

module.exports = {
  getItemsByGroup,
};
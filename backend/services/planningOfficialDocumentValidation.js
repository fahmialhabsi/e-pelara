"use strict";

const { Op } = require("sequelize");

/**
 * Validasi wajib sebelum ekspor dokumen resmi (Renja / RKPD).
 * Mengembalikan { ok, errors: [{ code, message }], warnings: [] }
 */

async function validateRenjaOfficial(db, dokumenId) {
  const { RenjaDokumen, RenjaItem, RenstraPdDokumen } = db;
  const errors = [];

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [{ model: RenstraPdDokumen, as: "renstraPdDokumen", required: false }],
  });
  if (!dok) {
    errors.push({ code: "NOT_FOUND", message: "Dokumen Renja tidak ditemukan." });
    return { ok: false, errors, warnings: [] };
  }

  const items = await RenjaItem.findAll({ where: { renja_dokumen_id: dokumenId } });
  if (!items.length) {
    errors.push({
      code: "NO_LINE_ITEMS",
      message: "Dokumen resmi memerlukan minimal satu baris renja_item.",
    });
  }

  const hasBab2 =
    (dok.text_bab2 && String(dok.text_bab2).trim().length > 0) ||
    (await RenjaDokumen.findOne({
      where: {
        perangkat_daerah_id: dok.perangkat_daerah_id,
        periode_id: dok.periode_id,
        tahun: dok.tahun - 1,
        id: { [Op.ne]: dok.id },
      },
    }));

  if (!hasBab2) {
    errors.push({
      code: "BAB_II_INCOMPLETE",
      message:
        "BAB II wajib: isi kolom text_bab2 pada dokumen atau sediakan dokumen Renja tahun sebelumnya (tahun yang sama PD & periode).",
    });
  }

  const renstra = dok.renstraPdDokumen;
  if (!renstra || !renstra.renstra_opd_id) {
    errors.push({
      code: "BAB_III_NO_RENSTRA_LINK",
      message:
        "BAB III wajib: hubungkan Renstra PD ke Renstra OPD (isi renstra_opd_id pada dokumen Renstra PD).",
    });
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}

async function validateRkpdOfficial(db, dokumenId) {
  const { RkpdDokumen, RkpdItem } = db;
  const errors = [];

  const dok = await RkpdDokumen.findByPk(dokumenId);
  if (!dok) {
    errors.push({ code: "NOT_FOUND", message: "Dokumen RKPD tidak ditemukan." });
    return { ok: false, errors, warnings: [] };
  }

  const items = await RkpdItem.findAll({ where: { rkpd_dokumen_id: dokumenId } });
  if (!items.length) {
    errors.push({
      code: "NO_LINE_ITEMS",
      message: "Dokumen resmi memerlukan minimal satu baris rkpd_item.",
    });
  }

  for (const it of items) {
    const p = it.prioritas_daerah;
    if (p == null || String(p).trim() === "") {
      errors.push({
        code: "PRIORITAS_MISSING",
        message: `Baris rkpd_item #${it.id}: prioritas_daerah wajib diisi.`,
      });
      break;
    }
  }

  if (!dok.text_bab2 || String(dok.text_bab2).trim().length < 20) {
    errors.push({
      code: "BAB_II_TEXT_SHORT",
      message:
        "BAB II wajib: isi text_bab2 (analisis kondisi) pada dokumen RKPD — minimal 20 karakter narasi resmi.",
    });
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}

module.exports = {
  validateRenjaOfficial,
  validateRkpdOfficial,
};

"use strict";

const { Plan } = require("../models");

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/** Katalog paket untuk halaman pricing (tanpa data sensitif). */
exports.catalog = async (_req, res) => {
  try {
    const rows = await Plan.findAll({
      attributes: ["id", "code", "nama", "deskripsi", "features"],
      order: [
        ["id", "ASC"],
      ],
      raw: false,
    });
    const data = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        id: plain.id,
        code: plain.code,
        nama: plain.nama,
        deskripsi: plain.deskripsi,
        features: plain.features || {},
      };
    });
    return ok(res, data);
  } catch (e) {
    console.error("[planController.catalog]", e);
    return fail(res, 500, e.message || "Gagal memuat katalog paket.");
  }
};

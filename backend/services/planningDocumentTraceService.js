"use strict";

const {
  RPJMD,
  Renstra,
  Renja,
  Rkpd,
  Rka,
  Dpa,
} = require("../models");

/**
 * Jejak dokumen induk/turunan untuk baseline RPJMD & rantai perencanaan.
 */
async function getPlanningDocumentTrace(documentType, documentId) {
  const type = String(documentType || "").toLowerCase();
  const id = Number(documentId);
  if (!Number.isFinite(id)) {
    const err = new Error("document_id tidak valid");
    err.statusCode = 400;
    throw err;
  }

  const out = {
    document_type: type,
    document_id: id,
    parents: [],
    children: {},
    baseline_rpjmd: null,
  };

  if (type === "rpjmd") {
    const row = await RPJMD.findByPk(id, {
      attributes: ["id", "nama_rpjmd", "periode_awal", "periode_akhir", "version"],
    });
    if (!row) {
      const err = new Error("RPJMD tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    out.baseline_rpjmd = row;
    const [renstraList, renjaList, rkpdList, rkaList, dpaList] = await Promise.all([
      Renstra.findAll({
        where: { rpjmd_id: id },
        attributes: ["id", "judul", "periode_awal", "periode_akhir", "status", "version"],
        limit: 500,
      }),
      Renja.findAll({
        where: { rpjmd_id: id },
        attributes: ["id", "tahun", "judul", "status", "renstra_id", "version"],
        limit: 500,
      }),
      Rkpd.findAll({
        where: { rpjmd_id: id },
        attributes: ["id", "tahun", "nama_sub_kegiatan", "status", "renja_id", "version"],
        limit: 500,
      }),
      Rka.findAll({
        where: { rpjmd_id: id },
        attributes: ["id", "tahun", "program", "kegiatan", "renja_id", "version"],
        limit: 500,
      }),
      Dpa.findAll({
        where: { rpjmd_id: id },
        attributes: ["id", "tahun", "program", "kegiatan", "rka_id", "version"],
        limit: 500,
      }),
    ]);
    out.children = {
      renstra: renstraList,
      renja: renjaList,
      rkpd: rkpdList,
      rka: rkaList,
      dpa: dpaList,
    };
    return out;
  }

  if (type === "renstra") {
    const row = await Renstra.findByPk(id, {
      attributes: [
        "id",
        "judul",
        "rpjmd_id",
        "periode_awal",
        "periode_akhir",
        "status",
        "version",
      ],
    });
    if (!row) {
      const err = new Error("Renstra tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (row.rpjmd_id) {
      out.parents.push({
        type: "rpjmd",
        id: row.rpjmd_id,
        row: await RPJMD.findByPk(row.rpjmd_id, {
          attributes: ["id", "nama_rpjmd", "version"],
        }),
      });
      out.baseline_rpjmd = out.parents[0].row;
    }
    out.children = {
      renja: await Renja.findAll({
        where: { renstra_id: id },
        attributes: ["id", "tahun", "judul", "status", "rpjmd_id", "version"],
        limit: 500,
      }),
    };
    return out;
  }

  if (type === "renja") {
    const row = await Renja.findByPk(id, {
      attributes: [
        "id",
        "tahun",
        "judul",
        "renstra_id",
        "rpjmd_id",
        "status",
        "version",
      ],
    });
    if (!row) {
      const err = new Error("Renja tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (row.rpjmd_id) {
      const rp = await RPJMD.findByPk(row.rpjmd_id, {
        attributes: ["id", "nama_rpjmd", "version"],
      });
      out.parents.push({ type: "rpjmd", id: row.rpjmd_id, row: rp });
      out.baseline_rpjmd = rp;
    }
    if (row.renstra_id) {
      out.parents.push({
        type: "renstra",
        id: row.renstra_id,
        row: await Renstra.findByPk(row.renstra_id, {
          attributes: ["id", "judul", "rpjmd_id", "version"],
        }),
      });
    }
    out.children.rkpd = await Rkpd.findAll({
      where: { renja_id: id },
      attributes: ["id", "tahun", "nama_sub_kegiatan", "status", "version"],
      limit: 500,
    });
    out.children.rka = await Rka.findAll({
      where: { renja_id: id },
      attributes: ["id", "tahun", "program", "kegiatan", "version"],
      limit: 500,
    });
    return out;
  }

  if (type === "rkpd") {
    const row = await Rkpd.findByPk(id, {
      attributes: ["id", "tahun", "renja_id", "rpjmd_id", "status", "version"],
    });
    if (!row) {
      const err = new Error("RKPD tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (row.rpjmd_id) {
      const rp = await RPJMD.findByPk(row.rpjmd_id, {
        attributes: ["id", "nama_rpjmd", "version"],
      });
      out.parents.push({ type: "rpjmd", id: row.rpjmd_id, row: rp });
      out.baseline_rpjmd = rp;
    }
    if (row.renja_id) {
      out.parents.push({
        type: "renja",
        id: row.renja_id,
        row: await Renja.findByPk(row.renja_id, {
          attributes: ["id", "tahun", "judul", "renstra_id", "version"],
        }),
      });
    }
    return out;
  }

  if (type === "rka") {
    const row = await Rka.findByPk(id, {
      attributes: ["id", "tahun", "renja_id", "rpjmd_id", "version"],
    });
    if (!row) {
      const err = new Error("RKA tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (row.rpjmd_id) {
      const rp = await RPJMD.findByPk(row.rpjmd_id, {
        attributes: ["id", "nama_rpjmd", "version"],
      });
      out.parents.push({ type: "rpjmd", id: row.rpjmd_id, row: rp });
      out.baseline_rpjmd = rp;
    }
    if (row.renja_id) {
      out.parents.push({
        type: "renja",
        id: row.renja_id,
        row: await Renja.findByPk(row.renja_id, {
          attributes: ["id", "tahun", "judul", "renstra_id", "version"],
        }),
      });
    }
    out.children.dpa = await Dpa.findAll({
      where: { rka_id: id },
      attributes: ["id", "tahun", "program", "kegiatan", "version"],
      limit: 200,
    });
    return out;
  }

  if (type === "dpa") {
    const row = await Dpa.findByPk(id, {
      attributes: ["id", "tahun", "rka_id", "rpjmd_id", "version"],
    });
    if (!row) {
      const err = new Error("DPA tidak ditemukan");
      err.statusCode = 404;
      throw err;
    }
    if (row.rpjmd_id) {
      const rp = await RPJMD.findByPk(row.rpjmd_id, {
        attributes: ["id", "nama_rpjmd", "version"],
      });
      out.parents.push({ type: "rpjmd", id: row.rpjmd_id, row: rp });
      out.baseline_rpjmd = rp;
    }
    if (row.rka_id) {
      const rka = await Rka.findByPk(row.rka_id, {
        attributes: ["id", "tahun", "renja_id", "rpjmd_id", "version"],
      });
      out.parents.push({ type: "rka", id: row.rka_id, row: rka });
    }
    return out;
  }

  const err = new Error(`document_type tidak didukung: ${type}`);
  err.statusCode = 400;
  throw err;
}

module.exports = { getPlanningDocumentTrace };

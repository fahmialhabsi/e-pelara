"use strict";

/**
 * Agregasi dashboard perencanaan v2 saja (rkpd_dokumen / renja_dokumen).
 * Tidak mencampur metrik legacy renja/rka/dpa.
 */

const db = require("../models");

const {
  RkpdDokumen,
  RkpdItem,
  RenjaDokumen,
  RenjaItem,
  RenjaRkpdItemMap,
  PeriodeRpjmd,
  PerangkatDaerah,
  RenstraPdDokumen,
} = db;

async function rkpdDashboardV2(req, res) {
  try {
    const where = {};
    if (req.query.tahun != null && req.query.tahun !== "") {
      where.tahun = Number(req.query.tahun);
    }
    if (req.query.periode_id != null && req.query.periode_id !== "") {
      where.periode_id = Number(req.query.periode_id);
    }

    const docs = await RkpdDokumen.findAll({
      where,
      order: [
        ["tahun", "DESC"],
        ["id", "DESC"],
      ],
      include: [{ model: PeriodeRpjmd, as: "periode", required: false }],
    });

    const byStatus = { draft: 0, review: 0, final: 0 };
    let totalItems = 0;
    let totalPagu = 0;
    let itemsMappedToRenja = 0;
    const dokumen = [];

    for (const d of docs) {
      if (d.status && byStatus[d.status] != null) {
        byStatus[d.status] += 1;
      }

      const items = await RkpdItem.findAll({
        where: { rkpd_dokumen_id: d.id },
        attributes: ["id", "pagu"],
      });

      const n = items.length;
      totalItems += n;
      let paguDoc = 0;
      let mappedDoc = 0;

      for (const it of items) {
        paguDoc += Number(it.pagu) || 0;
        const cnt = await RenjaRkpdItemMap.count({
          where: { rkpd_item_id: it.id },
        });
        if (cnt > 0) mappedDoc += 1;
      }
      totalPagu += paguDoc;
      itemsMappedToRenja += mappedDoc;

      const renjaTurunan = await RenjaDokumen.count({
        where: { rkpd_dokumen_id: d.id },
      });

      dokumen.push({
        id: d.id,
        tahun: d.tahun,
        periode_id: d.periode_id,
        judul: d.judul,
        status: d.status,
        is_final_active: d.is_final_active,
        derivation_key: d.derivation_key,
        item_count: n,
        item_mapped_count: mappedDoc,
        item_unmapped_count: Math.max(0, n - mappedDoc),
        pagu_sum: paguDoc,
        renja_dokumen_count: renjaTurunan,
      });
    }

    const itemsUnmapped = Math.max(0, totalItems - itemsMappedToRenja);
    const rkpdWithRenja = dokumen.filter((x) => x.renja_dokumen_count > 0).length;

    return res.json({
      success: true,
      data: {
        domain: "planning_v2",
        filters: {
          tahun: where.tahun ?? null,
          periode_id: where.periode_id ?? null,
        },
        summary: {
          total_dokumen: docs.length,
          by_status: byStatus,
          total_item: totalItems,
          total_pagu: totalPagu,
          item_mapped_to_renja: itemsMappedToRenja,
          item_belum_mapped: itemsUnmapped,
          dokumen_with_renja_turunan: rkpdWithRenja,
        },
        dokumen,
        meta: {
          catatan:
            "Pagu dan item dari rkpd_item (teks perencanaan). Bukan angka APBD resmi tanpa validasi lanjut.",
        },
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function renjaDashboardV2(req, res) {
  try {
    const where = {};
    if (req.query.tahun != null && req.query.tahun !== "") {
      where.tahun = Number(req.query.tahun);
    }
    if (req.query.periode_id != null && req.query.periode_id !== "") {
      where.periode_id = Number(req.query.periode_id);
    }
    if (req.query.perangkat_daerah_id != null && req.query.perangkat_daerah_id !== "") {
      where.perangkat_daerah_id = Number(req.query.perangkat_daerah_id);
    }

    const docs = await RenjaDokumen.findAll({
      where,
      order: [
        ["tahun", "DESC"],
        ["id", "DESC"],
      ],
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: PerangkatDaerah, as: "perangkatDaerah", required: false },
        { model: RkpdDokumen, as: "rkpdDokumen", required: false },
        { model: RenstraPdDokumen, as: "renstraPdDokumen", required: false },
      ],
    });

    const byStatus = { draft: 0, review: 0, final: 0 };
    let totalItems = 0;
    let totalPagu = 0;
    let itemsMapped = 0;
    const dokumen = [];

    for (const d of docs) {
      if (d.status && byStatus[d.status] != null) byStatus[d.status] += 1;

      const items = await RenjaItem.findAll({
        where: { renja_dokumen_id: d.id },
        attributes: ["id", "pagu"],
      });
      const n = items.length;
      totalItems += n;
      let paguDoc = 0;
      let mappedDoc = 0;

      for (const it of items) {
        paguDoc += Number(it.pagu) || 0;
        const m = await RenjaRkpdItemMap.findOne({
          where: { renja_item_id: it.id },
        });
        if (m) mappedDoc += 1;
      }
      totalPagu += paguDoc;
      itemsMapped += mappedDoc;

      const pd = d.perangkatDaerah;
      dokumen.push({
        id: d.id,
        tahun: d.tahun,
        periode_id: d.periode_id,
        perangkat_daerah_id: d.perangkat_daerah_id,
        perangkat_daerah_nama: pd?.nama || null,
        judul: d.judul,
        status: d.status,
        is_final_active: d.is_final_active,
        derivation_key: d.derivation_key,
        rkpd_dokumen_id: d.rkpd_dokumen_id,
        rkpd_judul: d.rkpdDokumen?.judul || null,
        rkpd_tahun: d.rkpdDokumen?.tahun ?? null,
        renstra_pd_dokumen_id: d.renstra_pd_dokumen_id,
        renstra_pd_judul: d.renstraPdDokumen?.judul || null,
        legacy_renja_id: d.legacy_renja_id,
        item_count: n,
        item_mapped_count: mappedDoc,
        item_unmapped_count: Math.max(0, n - mappedDoc),
        pagu_sum: paguDoc,
      });
    }

    const itemsUnmapped = Math.max(0, totalItems - itemsMapped);

    return res.json({
      success: true,
      data: {
        domain: "planning_v2",
        filters: {
          tahun: where.tahun ?? null,
          periode_id: where.periode_id ?? null,
          perangkat_daerah_id: where.perangkat_daerah_id ?? null,
        },
        summary: {
          total_dokumen: docs.length,
          by_status: byStatus,
          total_item: totalItems,
          total_pagu: totalPagu,
          item_ada_mapping_rkpd: itemsMapped,
          item_belum_mapping_rkpd: itemsUnmapped,
        },
        dokumen,
        legacy_bridge: {
          catatan:
            "legacy_renja_id hanya jembatan ke modul RKA/DPA. Jangan menjumlahkan dengan pagu Renja v2 tanpa konteks.",
        },
        meta: {
          catatan:
            "Pagu renja_item adalah perencanaan v2, bukan realisasi keuangan.",
        },
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  rkpdDashboardV2,
  renjaDashboardV2,
};

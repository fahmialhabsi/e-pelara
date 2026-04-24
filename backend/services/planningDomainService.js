"use strict";

const { Op } = require("sequelize");

function tahunDalamPeriode(tahun, periode) {
  if (!periode) return false;
  const t = Number(tahun);
  return t >= Number(periode.tahun_awal) && t <= Number(periode.tahun_akhir);
}

async function loadPeriode(models, periodeId) {
  return models.PeriodeRpjmd.findByPk(periodeId);
}

/**
 * Saat men-set final aktif: nonaktifkan final lain pada kombinasi domain yang sama.
 */
async function deactivateOtherRkpdFinalActive(
  sequelize,
  RkpdDokumen,
  { tahun, excludeId },
  transaction,
) {
  await RkpdDokumen.update(
    { is_final_active: false },
    {
      where: {
        tahun,
        status: "final",
        is_final_active: true,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
      transaction,
    },
  );
}

async function deactivateOtherRenjaFinalActive(
  sequelize,
  RenjaDokumen,
  { tahun, perangkat_daerah_id, excludeId },
  transaction,
) {
  await RenjaDokumen.update(
    { is_final_active: false },
    {
      where: {
        tahun,
        perangkat_daerah_id,
        status: "final",
        is_final_active: true,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
      transaction,
    },
  );
}

function indikatorOk(v) {
  return v != null && String(v).trim().length > 0;
}

function paguOk(v) {
  if (v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/**
 * Validasi transisi status dokumen Renja + konsistensi FK.
 */
async function assertRenjaDokumenConsistency(models, doc, { rkpdDokumen, renstraPd }) {
  const errors = [];
  const status = doc.status;

  if (status === "review" || status === "final") {
    if (!doc.rkpd_dokumen_id) {
      errors.push("rkpd_dokumen_id wajib diisi untuk status review atau final.");
    }
  }

  if (doc.rkpd_dokumen_id && rkpdDokumen) {
    if (Number(doc.tahun) !== Number(rkpdDokumen.tahun)) {
      errors.push("tahun Renja harus sama dengan tahun dokumen RKPD acuan.");
    }
  }

  if (renstraPd) {
    if (Number(doc.perangkat_daerah_id) !== Number(renstraPd.perangkat_daerah_id)) {
      errors.push(
        "perangkat_daerah_id Renja harus sama dengan dokumen Renstra PD yang dirujuk.",
      );
    }
    if (Number(doc.periode_id) !== Number(renstraPd.periode_id)) {
      errors.push("periode_id harus konsisten dengan renstra_pd_dokumen.");
    }
  }

  return errors;
}

/**
 * Item Renja untuk dokumen final: wajib indikator, pagu, dan tepat satu mapping ke rkpd_item.
 */
async function validateRenjaItemsForFinal(models, renjaDokumenId, transaction) {
  const items = await models.RenjaItem.findAll({
    where: { renja_dokumen_id: renjaDokumenId },
    transaction,
  });
  const errors = [];
  const warnings = [];

  if (items.length === 0) {
    errors.push("Dokumen final harus memiliki minimal satu item Renja.");
    return { errors, warnings };
  }

  for (const it of items) {
    if (!indikatorOk(it.indikator)) {
      errors.push(`Item Renja id=${it.id}: indikator wajib diisi untuk final.`);
    }
    if (!paguOk(it.pagu)) {
      errors.push(`Item Renja id=${it.id}: pagu wajib diisi (≥ 0) untuk final.`);
    }
    const map = await models.RenjaRkpdItemMap.findOne({
      where: { renja_item_id: it.id },
      transaction,
    });
    if (!map) {
      errors.push(
        `Item Renja id=${it.id}: wajib punya mapping ke rkpd_item (tahap 1: tepat satu).`,
      );
    }
  }

  return { errors, warnings };
}

/**
 * Validasi link: rkpd_item pada rkpd_dokumen yang sama dengan renja_dokumen; tahun cocok; perangkat jika diisi.
 */
async function assertRkpdItemLinkAllowed(models, renjaItem, rkpdItemId, transaction) {
  const ri = await models.RkpdItem.findByPk(rkpdItemId, { transaction });
  if (!ri) return ["rkpd_item tidak ditemukan."];

  const rd = await models.RenjaDokumen.findByPk(renjaItem.renja_dokumen_id, {
    transaction,
  });
  if (!rd) return ["renja_dokumen tidak ditemukan."];

  if (!rd.rkpd_dokumen_id) {
    return ["Set rkpd_dokumen_id pada dokumen Renja sebelum mapping item."];
  }
  if (Number(ri.rkpd_dokumen_id) !== Number(rd.rkpd_dokumen_id)) {
    return ["rkpd_item harus berasal dari rkpd_dokumen yang sama dengan dokumen Renja."];
  }

  const rkpdDoc = await models.RkpdDokumen.findByPk(ri.rkpd_dokumen_id, { transaction });
  if (!rkpdDoc) return ["rkpd_dokumen untuk item tidak ditemukan."];
  if (Number(rkpdDoc.tahun) !== Number(rd.tahun)) {
    return ["Tahun rkpd_dokumen tidak konsisten dengan Renja."];
  }
  if (
    ri.perangkat_daerah_id != null &&
    Number(ri.perangkat_daerah_id) !== Number(rd.perangkat_daerah_id)
  ) {
    return [
      "perangkat_daerah pada rkpd_item (jika diisi) harus sama dengan dokumen Renja.",
    ];
  }
  return [];
}

async function validateRkpdItemsForFinal(models, rkpdDokumenId, transaction) {
  const items = await models.RkpdItem.findAll({
    where: { rkpd_dokumen_id: rkpdDokumenId },
    transaction,
  });
  const errors = [];
  if (items.length === 0) {
    errors.push("Dokumen RKPD final harus memiliki minimal satu item.");
    return { errors };
  }
  for (const it of items) {
    if (!indikatorOk(it.indikator)) {
      errors.push(`Item RKPD id=${it.id}: indikator wajib untuk final.`);
    }
    if (!paguOk(it.pagu)) {
      errors.push(`Item RKPD id=${it.id}: pagu wajib (≥ 0) untuk final.`);
    }
  }
  return { errors };
}

module.exports = {
  tahunDalamPeriode,
  loadPeriode,
  deactivateOtherRkpdFinalActive,
  deactivateOtherRenjaFinalActive,
  assertRenjaDokumenConsistency,
  validateRenjaItemsForFinal,
  validateRkpdItemsForFinal,
  assertRkpdItemLinkAllowed,
  indikatorOk,
  paguOk,
};

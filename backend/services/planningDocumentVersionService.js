"use strict";

/**
 * Versi dokumen: nomor urut ekspor resmi + snapshot JSON + sinkron ke kolom versi pada dokumen.
 */

async function getNextRenjaVersionNumber(db, renjaDokumenId) {
  const { RenjaDokumenVersion } = db;
  const max = await RenjaDokumenVersion.max("version_number", {
    where: { renja_dokumen_id: renjaDokumenId },
  });
  return (max || 0) + 1;
}

async function getNextRkpdVersionNumber(db, rkpdDokumenId) {
  const { RkpdDokumenVersion } = db;
  const max = await RkpdDokumenVersion.max("version_number", {
    where: { rkpd_dokumen_id: rkpdDokumenId },
  });
  return (max || 0) + 1;
}

async function commitRenjaVersionAfterExport(db, renjaDokumenId, userId, versionNumber) {
  const { RenjaDokumen, RenjaItem, RenjaDokumenVersion, sequelize } = db;
  const t = await sequelize.transaction();
  try {
    const dok = await RenjaDokumen.findByPk(renjaDokumenId, {
      transaction: t,
      include: [{ model: RenjaItem, as: "items", required: false }],
    });
    if (!dok) throw new Error("Renja tidak ditemukan");

    await RenjaDokumenVersion.update(
      { is_current: false },
      { where: { renja_dokumen_id: renjaDokumenId }, transaction: t },
    );

    await RenjaDokumenVersion.create(
      {
        renja_dokumen_id: renjaDokumenId,
        version_number: versionNumber,
        snapshot_data: {
          dokumen: dok.get({ plain: true }),
          exported_at: new Date().toISOString(),
        },
        created_at: new Date(),
        created_by: userId || null,
        is_current: true,
        status: dok.status,
      },
      { transaction: t },
    );

    await dok.update({ versi: versionNumber }, { transaction: t });
    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function commitRkpdVersionAfterExport(db, rkpdDokumenId, userId, versionNumber) {
  const { RkpdDokumen, RkpdItem, RkpdDokumenVersion, sequelize } = db;
  const t = await sequelize.transaction();
  try {
    const dok = await RkpdDokumen.findByPk(rkpdDokumenId, {
      transaction: t,
      include: [{ model: RkpdItem, as: "items", required: false }],
    });
    if (!dok) throw new Error("RKPD tidak ditemukan");

    await RkpdDokumenVersion.update(
      { is_current: false },
      { where: { rkpd_dokumen_id: rkpdDokumenId }, transaction: t },
    );

    await RkpdDokumenVersion.create(
      {
        rkpd_dokumen_id: rkpdDokumenId,
        version_number: versionNumber,
        snapshot_data: {
          dokumen: dok.get({ plain: true }),
          exported_at: new Date().toISOString(),
        },
        created_at: new Date(),
        created_by: userId || null,
        is_current: true,
        status: dok.status,
      },
      { transaction: t },
    );

    await dok.update({ versi: versionNumber }, { transaction: t });
    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  getNextRenjaVersionNumber,
  getNextRkpdVersionNumber,
  commitRenjaVersionAfterExport,
  commitRkpdVersionAfterExport,
};

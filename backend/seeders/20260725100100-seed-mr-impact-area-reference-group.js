"use strict";

/**
 * Reference group Area Dampak (Pedoman No 2 Form Coaching Clinic Inspektorat)
 * — dipakai dropdown "Area Dampak" di wizard MR (StepRiskAnalysis.jsx) supaya
 * penilaian Dampak yang dipilih user bisa ditelusuri dasarnya ke salah satu
 * dari 5 area resmi, bukan cuma angka 1-5 generik tanpa konteks.
 *
 * Kriteria ambang per level (1-5) untuk tiap area TETAP di kode (bukan di
 * reference item) — lihat IMPACT_AREA_CRITERIA di
 * mrPlanningReportExportWordService.js (Lampiran 7.1B) dan salinannya di
 * frontend/src/pages/mr/unified/steps/StepRiskAnalysis.jsx (panduan saat
 * memilih Dampak) — teksnya kutipan resmi Pedoman No 2, bukan data yang perlu
 * diedit user, jadi disimpan sebagai konstanta bukan seed data.
 *
 * Guard: idempotent, aman dijalankan ulang (upsert by kode_group/kode_item).
 */

const GROUP = {
  kode_group: "IMPACT_AREA",
  nama_group: "Area Dampak",
  deskripsi:
    "5 area dampak sesuai Pedoman No 2 Form Coaching Clinic Inspektorat — dasar penilaian Dampak per Analisis Risiko.",
  domain: "analysis",
  items: [
    { kode_item: "BEBAN_KEUANGAN", nama_item: "Beban Keuangan Negara", urutan: 1 },
    { kode_item: "REPUTASI", nama_item: "Penurunan Reputasi", urutan: 2 },
    { kode_item: "K3", nama_item: "Kesehatan dan Keselamatan Kerja", urutan: 3 },
    { kode_item: "KINERJA", nama_item: "Realisasi Capaian Kinerja", urutan: 4 },
    { kode_item: "TEMUAN_PEMERIKSAAN", nama_item: "Temuan BPK/Inspektorat", urutan: 5 },
  ],
};

const getFirstRow = (rows) => {
  if (Array.isArray(rows) && Array.isArray(rows[0])) return rows[0][0] || null;
  if (Array.isArray(rows)) return rows[0] || null;
  return null;
};

const hasColumn = (tableDefinition, columnName) =>
  Boolean(tableDefinition && tableDefinition[columnName]);

const withOptionalTimestamps = (payload, tableDefinition, now) => {
  const nextPayload = { ...payload };

  if (hasColumn(tableDefinition, "created_at")) nextPayload.created_at = now;
  if (hasColumn(tableDefinition, "updated_at")) nextPayload.updated_at = now;
  if (hasColumn(tableDefinition, "createdAt")) nextPayload.createdAt = now;
  if (hasColumn(tableDefinition, "updatedAt")) nextPayload.updatedAt = now;

  return nextPayload;
};

const upsertGroup = async ({ queryInterface, group, groupTableDefinition, now, transaction }) => {
  const [existingRows] = await queryInterface.sequelize.query(
    `SELECT id FROM mr_reference_groups WHERE kode_group = :kode_group LIMIT 1`,
    { replacements: { kode_group: group.kode_group }, transaction }
  );

  let row = getFirstRow(existingRows);

  const groupPayload = {
    kode_group: group.kode_group,
    nama_group: group.nama_group,
    deskripsi: group.deskripsi,
    domain: group.domain,
    is_system: true,
    is_active: true,
  };

  if (!row) {
    await queryInterface.bulkInsert(
      "mr_reference_groups",
      [withOptionalTimestamps(groupPayload, groupTableDefinition, now)],
      { transaction }
    );

    const [createdRows] = await queryInterface.sequelize.query(
      `SELECT id FROM mr_reference_groups WHERE kode_group = :kode_group LIMIT 1`,
      { replacements: { kode_group: group.kode_group }, transaction }
    );

    row = getFirstRow(createdRows);
  } else {
    await queryInterface.bulkUpdate(
      "mr_reference_groups",
      withOptionalTimestamps(
        {
          nama_group: groupPayload.nama_group,
          deskripsi: groupPayload.deskripsi,
          domain: groupPayload.domain,
          is_system: true,
          is_active: true,
        },
        groupTableDefinition,
        now
      ),
      { kode_group: group.kode_group },
      { transaction }
    );
  }

  if (!row?.id) {
    throw new Error(`Gagal membuat atau membaca group ${group.kode_group}.`);
  }

  return row.id;
};

const upsertItem = async ({ queryInterface, groupId, item, itemTableDefinition, now, transaction }) => {
  const [existingRows] = await queryInterface.sequelize.query(
    `SELECT id FROM mr_reference_items WHERE group_id = :group_id AND kode_item = :kode_item LIMIT 1`,
    { replacements: { group_id: groupId, kode_item: item.kode_item }, transaction }
  );

  const existing = getFirstRow(existingRows);

  const itemPayload = {
    group_id: groupId,
    kode_item: item.kode_item,
    nama_item: item.nama_item,
    nilai_numeric: item.nilai_numeric ?? null,
    nilai_text: item.nilai_text ?? null,
    warna: item.warna ?? null,
    urutan: item.urutan ?? 0,
    is_default: Boolean(item.is_default),
    is_active: true,
  };

  if (existing?.id) {
    await queryInterface.bulkUpdate(
      "mr_reference_items",
      withOptionalTimestamps(itemPayload, itemTableDefinition, now),
      { id: existing.id },
      { transaction }
    );
  } else {
    await queryInterface.bulkInsert(
      "mr_reference_items",
      [withOptionalTimestamps(itemPayload, itemTableDefinition, now)],
      { transaction }
    );
  }
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();
      const groupTableDefinition = await queryInterface.describeTable("mr_reference_groups");
      const itemTableDefinition = await queryInterface.describeTable("mr_reference_items");

      const groupId = await upsertGroup({
        queryInterface,
        group: GROUP,
        groupTableDefinition,
        now,
        transaction,
      });

      for (const item of GROUP.items) {
        await upsertItem({
          queryInterface,
          groupId,
          item,
          itemTableDefinition,
          now,
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [groupRows] = await queryInterface.sequelize.query(
        `SELECT id FROM mr_reference_groups WHERE kode_group = :kode_group LIMIT 1`,
        { replacements: { kode_group: GROUP.kode_group }, transaction }
      );

      const row = getFirstRow(groupRows);

      if (row?.id) {
        await queryInterface.bulkDelete("mr_reference_items", { group_id: row.id }, { transaction });
        await queryInterface.bulkDelete("mr_reference_groups", { id: row.id }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

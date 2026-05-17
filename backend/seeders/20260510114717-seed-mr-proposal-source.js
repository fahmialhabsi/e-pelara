"use strict";

/**
 * PHASE REPORT 2026 — STEP R17A-1
 * Backend Reference Source Foundation
 *
 * Tujuan:
 * Menyiapkan reference group MR_PROPOSAL_SOURCE sebagai sumber pilihan awal
 * user pada form Tambah Usulan Risiko.
 *
 * Guard:
 * - Tidak menyentuh report/export R16H.
 * - Tidak mengubah flow Renstra lama.
 * - Tidak hardcode source proposal di frontend.
 * - Tidak hardcode group_id / reference item id.
 * - Seeder dibuat idempotent agar aman dijalankan ulang.
 */

const GROUP_CODE = "MR_PROPOSAL_SOURCE";

const GROUP_PAYLOAD = {
  kode_group: GROUP_CODE,
  nama_group: "Sumber Usulan Risiko MR",
  deskripsi:
    "Referensi sumber/kategori awal usulan risiko seperti Renstra, LAKIP, Laporan Keuangan, Tindak Lanjut BPK, Tindak Lanjut Inspektorat, Pelaksanaan Kegiatan, Pertanggungjawaban Keuangan, SPIP/e-SIGAP, Manual/Adhoc, dan Lainnya.",
  is_active: true,
};

const SOURCE_ITEMS = [
  {
    kode_item: "RENSTRA",
    nama_item: "Renstra",
    nilai_text: "renstra",
    urutan: 1,
  },
  {
    kode_item: "LAKIP",
    nama_item: "LAKIP",
    nilai_text: "lakip",
    urutan: 2,
  },
  {
    kode_item: "LAPORAN_KEUANGAN",
    nama_item: "Laporan Keuangan",
    nilai_text: "laporan_keuangan",
    urutan: 3,
  },
  {
    kode_item: "TINDAK_LANJUT_BPK",
    nama_item: "Tindak Lanjut BPK",
    nilai_text: "tindak_lanjut_bpk",
    urutan: 4,
  },
  {
    kode_item: "TINDAK_LANJUT_INSPEKTORAT",
    nama_item: "Tindak Lanjut Inspektorat",
    nilai_text: "tindak_lanjut_inspektorat",
    urutan: 5,
  },
  {
    kode_item: "PELAKSANAAN_KEGIATAN",
    nama_item: "Pelaksanaan Kegiatan",
    nilai_text: "pelaksanaan_kegiatan",
    urutan: 6,
  },
  {
    kode_item: "PERTANGGUNGJAWABAN_KEUANGAN",
    nama_item: "Pertanggungjawaban Keuangan",
    nilai_text: "pertanggungjawaban_keuangan",
    urutan: 7,
  },
  {
    kode_item: "SPIP_E_SIGAP",
    nama_item: "SPIP / e-SIGAP",
    nilai_text: "spip_e_sigap",
    urutan: 8,
  },
  {
    kode_item: "MANUAL_ADHOC",
    nama_item: "Manual / Adhoc",
    nilai_text: "manual_adhoc",
    urutan: 9,
  },
  {
    kode_item: "LAINNYA",
    nama_item: "Lainnya / Buat Kategori Baru",
    nilai_text: "lainnya",
    urutan: 10,
  },
];

const hasColumn = (tableDefinition, columnName) =>
  Boolean(tableDefinition && tableDefinition[columnName]);

const withOptionalTimestamps = (payload, tableDefinition, now) => {
  const nextPayload = { ...payload };

  if (hasColumn(tableDefinition, "created_at")) {
    nextPayload.created_at = now;
  }

  if (hasColumn(tableDefinition, "updated_at")) {
    nextPayload.updated_at = now;
  }

  if (hasColumn(tableDefinition, "createdAt")) {
    nextPayload.createdAt = now;
  }

  if (hasColumn(tableDefinition, "updatedAt")) {
    nextPayload.updatedAt = now;
  }

  return nextPayload;
};

const getFirstRow = (rows) => {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0][0] || null;
  }

  if (Array.isArray(rows)) {
    return rows[0] || null;
  }

  return null;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();

      const groupTableDefinition = await queryInterface.describeTable(
        "mr_reference_groups"
      );

      const itemTableDefinition = await queryInterface.describeTable(
        "mr_reference_items"
      );

      const [existingGroupRows] = await queryInterface.sequelize.query(
        `
          SELECT id
          FROM mr_reference_groups
          WHERE kode_group = :kode_group
          LIMIT 1
        `,
        {
          replacements: { kode_group: GROUP_CODE },
          transaction,
        }
      );

      let group = getFirstRow(existingGroupRows);

      if (!group) {
        await queryInterface.bulkInsert(
          "mr_reference_groups",
          [
            withOptionalTimestamps(
              GROUP_PAYLOAD,
              groupTableDefinition,
              now
            ),
          ],
          { transaction }
        );

        const [createdGroupRows] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM mr_reference_groups
            WHERE kode_group = :kode_group
            LIMIT 1
          `,
          {
            replacements: { kode_group: GROUP_CODE },
            transaction,
          }
        );

        group = getFirstRow(createdGroupRows);
      } else {
        await queryInterface.bulkUpdate(
          "mr_reference_groups",
          withOptionalTimestamps(
            {
              nama_group: GROUP_PAYLOAD.nama_group,
              deskripsi: GROUP_PAYLOAD.deskripsi,
              is_active: true,
            },
            groupTableDefinition,
            now
          ),
          { kode_group: GROUP_CODE },
          { transaction }
        );
      }

      if (!group?.id) {
        throw new Error("Gagal membuat atau membaca group MR_PROPOSAL_SOURCE.");
      }

      for (const item of SOURCE_ITEMS) {
        const [existingItemRows] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM mr_reference_items
            WHERE group_id = :group_id
              AND kode_item = :kode_item
            LIMIT 1
          `,
          {
            replacements: {
              group_id: group.id,
              kode_item: item.kode_item,
            },
            transaction,
          }
        );

        const existingItem = getFirstRow(existingItemRows);

        const itemPayload = {
          group_id: group.id,
          kode_item: item.kode_item,
          nama_item: item.nama_item,
          nilai_numeric: null,
          nilai_text: item.nilai_text,
          urutan: item.urutan,
          is_active: true,
        };

        if (existingItem?.id) {
          await queryInterface.bulkUpdate(
            "mr_reference_items",
            withOptionalTimestamps(itemPayload, itemTableDefinition, now),
            { id: existingItem.id },
            { transaction }
          );
        } else {
          await queryInterface.bulkInsert(
            "mr_reference_items",
            [
              withOptionalTimestamps(
                itemPayload,
                itemTableDefinition,
                now
              ),
            ],
            { transaction }
          );
        }
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
        `
          SELECT id
          FROM mr_reference_groups
          WHERE kode_group = :kode_group
          LIMIT 1
        `,
        {
          replacements: { kode_group: GROUP_CODE },
          transaction,
        }
      );

      const group = getFirstRow(groupRows);

      if (group?.id) {
        await queryInterface.bulkDelete(
          "mr_reference_items",
          {
            group_id: group.id,
            kode_item: SOURCE_ITEMS.map((item) => item.kode_item),
          },
          { transaction }
        );

        await queryInterface.bulkDelete(
          "mr_reference_groups",
          {
            id: group.id,
            kode_group: GROUP_CODE,
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
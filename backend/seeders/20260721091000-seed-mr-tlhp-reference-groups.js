"use strict";

/**
 * Modul TLHP — Reference data seeder
 *
 * Menyiapkan reference group/items untuk modul Pengelolaan Tindak Lanjut
 * Temuan Inspektorat/BPK/BPKP:
 * - MR_TLHP_ENTITAS_PEMERIKSA
 * - MR_TLHP_JENIS_PEMERIKSAAN
 * - MR_TLHP_KATEGORI_TEMUAN
 * - MR_TLHP_STATUS_TINDAK_LANJUT (taksonomi status SIPTL BPK yang sebenarnya)
 *
 * Juga menambah TINDAK_LANJUT_BPKP ke group MR_PROPOSAL_SOURCE yang sudah ada
 * (lihat Judgment Call #1 di rencana implementasi — BPKP belum pernah
 * diselesaikan wiring-nya di proposal intake risk register).
 *
 * Guard:
 * - Idempotent, aman dijalankan ulang (upsert by kode_group/kode_item).
 * - Tidak menyentuh group/items existing selain menambah item baru.
 */

const GROUPS = [
  {
    kode_group: "MR_TLHP_ENTITAS_PEMERIKSA",
    nama_group: "Entitas Pemeriksa TLHP",
    deskripsi: "Lembaga pemeriksa/pengawas eksternal & internal pemerintah daerah.",
    domain: "audit",
    items: [
      { kode_item: "BPK", nama_item: "Badan Pemeriksa Keuangan", urutan: 1 },
      { kode_item: "BPKP", nama_item: "Badan Pengawasan Keuangan dan Pembangunan", urutan: 2 },
      { kode_item: "INSPEKTORAT", nama_item: "Inspektorat Provinsi/Daerah", urutan: 3 },
    ],
  },
  {
    kode_group: "MR_TLHP_JENIS_PEMERIKSAAN",
    nama_group: "Jenis Pemeriksaan/Pengawasan TLHP",
    deskripsi: "Jenis pemeriksaan/pengawasan sesuai LHP.",
    domain: "audit",
    items: [
      { kode_item: "PEMERIKSAAN_KEUANGAN", nama_item: "Pemeriksaan Keuangan", urutan: 1 },
      { kode_item: "PEMERIKSAAN_KINERJA", nama_item: "Pemeriksaan Kinerja", urutan: 2 },
      { kode_item: "PDTT", nama_item: "Pemeriksaan Dengan Tujuan Tertentu (PDTT)", urutan: 3 },
      { kode_item: "REVIU", nama_item: "Reviu", urutan: 4 },
      { kode_item: "EVALUASI", nama_item: "Evaluasi", urutan: 5 },
      { kode_item: "PEMANTAUAN", nama_item: "Pemantauan", urutan: 6 },
      { kode_item: "AUDIT_KHUSUS", nama_item: "Audit Khusus", urutan: 7 },
    ],
  },
  {
    kode_group: "MR_TLHP_KATEGORI_TEMUAN",
    nama_group: "Kategori Temuan TLHP",
    deskripsi: "Kategori temuan hasil pemeriksaan/pengawasan.",
    domain: "audit",
    items: [
      { kode_item: "KERUGIAN_NEGARA", nama_item: "Kerugian Negara/Daerah", urutan: 1 },
      { kode_item: "KEKURANGAN_PENERIMAAN", nama_item: "Kekurangan Penerimaan", urutan: 2 },
      { kode_item: "ADMINISTRASI", nama_item: "Kelemahan Administrasi", urutan: 3 },
      {
        kode_item: "KETIDAKHEMATAN_EFISIENSI_EFEKTIVITAS",
        nama_item: "Ketidakhematan/Ketidakefisienan/Ketidakefektifan (3E)",
        urutan: 4,
      },
      { kode_item: "KELEMAHAN_SPI", nama_item: "Kelemahan Sistem Pengendalian Intern", urutan: 5 },
    ],
  },
  {
    kode_group: "MR_TLHP_STATUS_TINDAK_LANJUT",
    nama_group: "Status Tindak Lanjut TLHP",
    deskripsi: "Taksonomi status pemantauan tindak lanjut sesuai standar SIPTL BPK.",
    domain: "audit",
    items: [
      {
        kode_item: "SESUAI_SELESAI",
        nama_item: "Sesuai/Selesai",
        nilai_numeric: 100,
        warna: "green",
        urutan: 1,
      },
      {
        kode_item: "DALAM_PROSES",
        nama_item: "Dalam Proses Sesuai Rekomendasi",
        nilai_numeric: 50,
        warna: "gold",
        urutan: 2,
      },
      {
        kode_item: "BELUM_DITINDAKLANJUTI",
        nama_item: "Belum Ditindaklanjuti",
        nilai_numeric: 0,
        warna: "red",
        urutan: 3,
      },
      {
        kode_item: "TIDAK_DAPAT_DITINDAKLANJUTI",
        nama_item: "Tidak Dapat Ditindaklanjuti Sesuai Rekomendasi",
        nilai_numeric: 0,
        warna: "default",
        urutan: 4,
      },
    ],
  },
];

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

const getFirstRow = (rows) => {
  if (Array.isArray(rows) && Array.isArray(rows[0])) return rows[0][0] || null;
  if (Array.isArray(rows)) return rows[0] || null;
  return null;
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

const upsertBpkpProposalSource = async ({ queryInterface, itemTableDefinition, now, transaction }) => {
  const [groupRows] = await queryInterface.sequelize.query(
    `SELECT id FROM mr_reference_groups WHERE kode_group = 'MR_PROPOSAL_SOURCE' LIMIT 1`,
    { transaction }
  );

  const group = getFirstRow(groupRows);

  if (!group?.id) {
    // Group belum ada (urutan seeder berbeda) — lewati, bukan error fatal.
    return;
  }

  await upsertItem({
    queryInterface,
    groupId: group.id,
    item: {
      kode_item: "TINDAK_LANJUT_BPKP",
      nama_item: "Tindak Lanjut BPKP",
      nilai_text: "tindak_lanjut_bpkp",
      urutan: 11,
    },
    itemTableDefinition,
    now,
    transaction,
  });
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();
      const groupTableDefinition = await queryInterface.describeTable("mr_reference_groups");
      const itemTableDefinition = await queryInterface.describeTable("mr_reference_items");

      for (const group of GROUPS) {
        const groupId = await upsertGroup({
          queryInterface,
          group,
          groupTableDefinition,
          now,
          transaction,
        });

        for (const item of group.items) {
          await upsertItem({
            queryInterface,
            groupId,
            item,
            itemTableDefinition,
            now,
            transaction,
          });
        }
      }

      await upsertBpkpProposalSource({ queryInterface, itemTableDefinition, now, transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const group of GROUPS) {
        const [groupRows] = await queryInterface.sequelize.query(
          `SELECT id FROM mr_reference_groups WHERE kode_group = :kode_group LIMIT 1`,
          { replacements: { kode_group: group.kode_group }, transaction }
        );

        const row = getFirstRow(groupRows);

        if (row?.id) {
          await queryInterface.bulkDelete(
            "mr_reference_items",
            { group_id: row.id },
            { transaction }
          );

          await queryInterface.bulkDelete(
            "mr_reference_groups",
            { id: row.id },
            { transaction }
          );
        }
      }

      const [proposalGroupRows] = await queryInterface.sequelize.query(
        `SELECT id FROM mr_reference_groups WHERE kode_group = 'MR_PROPOSAL_SOURCE' LIMIT 1`,
        { transaction }
      );

      const proposalGroup = getFirstRow(proposalGroupRows);

      if (proposalGroup?.id) {
        await queryInterface.bulkDelete(
          "mr_reference_items",
          { group_id: proposalGroup.id, kode_item: "TINDAK_LANJUT_BPKP" },
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

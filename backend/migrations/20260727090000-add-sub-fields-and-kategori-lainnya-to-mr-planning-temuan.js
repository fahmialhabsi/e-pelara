"use strict";

/**
 * Form Tambah/Ubah Temuan — rincian bertingkat untuk Kondisi/Kriteria/Sebab/
 * Akibat (mis. "a. Pemerintah Daerah Belum Memaksimalkan..." + tabel bebas
 * kolom/baris, dicontohkan user dari dokumen BPK asli), dan opsi "Lainnya"
 * pada dropdown Kategori Temuan.
 *
 * sub_kondisi/sub_kriteria/sub_sebab/sub_akibat disimpan sbg JSON (array
 * item: {letter, judul, uraian, table:{title,columns[],rows[][]}|null})
 * KARENA jumlah kolom/baris tabel per item genuinely bebas (user bisa
 * tambah/hapus kolom kapan saja) — tidak mungkin dipetakan ke kolom
 * relasional tanpa kehilangan fleksibilitas yang sudah dikonfirmasi user
 * lewat simulasi mockup (2026-07-27).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_temuan", "sub_kondisi", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_temuan", "sub_kriteria", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_temuan", "sub_sebab", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_temuan", "sub_akibat", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_temuan", "kategori_temuan_lainnya", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [groupRows] = await queryInterface.sequelize.query(
        `SELECT id FROM mr_reference_groups WHERE kode_group = 'MR_TLHP_KATEGORI_TEMUAN' LIMIT 1`,
        { transaction },
      );
      const group = Array.isArray(groupRows) ? groupRows[0] : null;

      if (group?.id) {
        const [existingRows] = await queryInterface.sequelize.query(
          `SELECT id FROM mr_reference_items WHERE group_id = :group_id AND kode_item = 'LAINNYA' LIMIT 1`,
          { replacements: { group_id: group.id }, transaction },
        );
        const existing = Array.isArray(existingRows) ? existingRows[0] : null;

        if (!existing?.id) {
          const itemTableDefinition = await queryInterface.describeTable("mr_reference_items");
          const now = new Date();
          const payload = {
            group_id: group.id,
            kode_item: "LAINNYA",
            nama_item: "Lainnya",
            nilai_numeric: null,
            nilai_text: null,
            warna: null,
            urutan: 99,
            is_default: false,
            is_active: true,
          };
          if (itemTableDefinition.created_at) payload.created_at = now;
          if (itemTableDefinition.updated_at) payload.updated_at = now;
          if (itemTableDefinition.createdAt) payload.createdAt = now;
          if (itemTableDefinition.updatedAt) payload.updatedAt = now;

          await queryInterface.bulkInsert("mr_reference_items", [payload], { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE i FROM mr_reference_items i
       JOIN mr_reference_groups g ON g.id = i.group_id
       WHERE g.kode_group = 'MR_TLHP_KATEGORI_TEMUAN' AND i.kode_item = 'LAINNYA'`,
    );

    await queryInterface.removeColumn("mr_planning_temuan", "kategori_temuan_lainnya");
    await queryInterface.removeColumn("mr_planning_temuan", "sub_akibat");
    await queryInterface.removeColumn("mr_planning_temuan", "sub_sebab");
    await queryInterface.removeColumn("mr_planning_temuan", "sub_kriteria");
    await queryInterface.removeColumn("mr_planning_temuan", "sub_kondisi");
  },
};

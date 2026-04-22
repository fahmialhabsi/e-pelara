"use strict";

const TENANT_TABLES = [
  ["tujuan", "idx_mt_tujuan_tid"],
  ["sasaran", "idx_mt_sasaran_tid"],
  ["indikator", "idx_mt_indikator_tid"],
  ["indikatortujuans", "idx_mt_ind_tujuan_tid"],
  ["indikatorsasarans", "idx_mt_ind_sasaran_tid"],
  ["indikatorprograms", "idx_mt_ind_prog_tid"],
  ["indikatorkegiatans", "idx_mt_ind_keg_tid"],
  ["indikatorsubkegiatans", "idx_mt_ind_sub_tid"],
  ["indikatorarahkebijakans", "idx_mt_ind_arah_tid"],
  ["indikatorstrategis", "idx_mt_ind_str_tid"],
  ["indikatormisis", "idx_mt_ind_misi_tid"],
  ["indikator_detail", "idx_mt_ind_det_tid"],
  ["import_logs", "idx_mt_import_log_tid"],
  ["opd_penanggung_jawab", "idx_mt_opd_pj_tid"],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tenants", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      domain: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.bulkInsert("tenants", [
      {
        id: 1,
        nama: "Default",
        domain: "default",
        created_at: new Date(),
      },
    ]);

    await queryInterface.addColumn("users", "tenant_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addIndex("users", ["tenant_id"], { name: "idx_users_tenant_id" });

    for (const [table, idxName] of TENANT_TABLES) {
      await queryInterface.addColumn(table, "tenant_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
      await queryInterface.addIndex(table, ["tenant_id"], { name: idxName });
    }
  },

  async down(queryInterface) {
    for (const [table, idxName] of TENANT_TABLES) {
      await queryInterface.removeIndex(table, idxName);
      await queryInterface.removeColumn(table, "tenant_id");
    }
    await queryInterface.removeIndex("users", "idx_users_tenant_id");
    await queryInterface.removeColumn("users", "tenant_id");
    await queryInterface.dropTable("tenants");
  },
};

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_kegiatan", "rpjmd_kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // atau false, tergantung kebutuhan validasi
    });

    // (Opsional) Tambah foreign key ke tabel kegiatan jika perlu
    // await queryInterface.addConstraint('renstra_kegiatan', {
    //   fields: ['rpjmd_kegiatan_id'],
    //   type: 'foreign key',
    //   name: 'fk_renstra_kegiatan_rpjmd_kegiatan',
    //   references: {
    //     table: 'kegiatan',
    //     field: 'id',
    //   },
    //   onUpdate: 'CASCADE',
    //   onDelete: 'SET NULL',
    // });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_kegiatan", "rpjmd_kegiatan_id");
  },
};

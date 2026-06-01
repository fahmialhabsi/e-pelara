'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rka_rincian_belanja', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      rka_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rka',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      kode_rekening: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      nama_rekening: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      uraian: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      volume: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      satuan: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      harga_satuan: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      jumlah: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      sumber_dana: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      lokasi: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rka_rincian_belanja');
  },
};

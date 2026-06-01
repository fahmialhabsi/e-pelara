'use strict';

module.exports = (sequelize, DataTypes) => {
  const RkaRincianBelanja = sequelize.define(
    'RkaRincianBelanja',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      rka_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      urutan: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      kode_rekening: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      nama_rekening: {
        type: DataTypes.STRING(255),
      },

      uraian: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      volume: {
        type: DataTypes.DECIMAL(20, 2),
      },

      satuan: {
        type: DataTypes.STRING(100),
      },

      harga_satuan: {
        type: DataTypes.DECIMAL(20, 2),
      },

      jumlah: {
        type: DataTypes.DECIMAL(20, 2),
      },

      sumber_dana: {
        type: DataTypes.STRING(255),
      },

      lokasi: {
        type: DataTypes.STRING(255),
      },

      keterangan: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'rka_rincian_belanja',
      underscored: true,
      timestamps: true,
    },
  );

  RkaRincianBelanja.associate = (models) => {
    RkaRincianBelanja.belongsTo(models.Rka, {
      foreignKey: 'rka_id',
      as: 'rka',
    });
  };

  return RkaRincianBelanja;
};

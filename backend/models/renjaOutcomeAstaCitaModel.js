'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RenjaOutcomeAstaCita extends Model {
    static associate(models) {
      RenjaOutcomeAstaCita.belongsTo(models.PerangkatDaerah, {
        foreignKey: 'perangkat_daerah_id',
        as: 'perangkatDaerah',
      });
    }
  }

  RenjaOutcomeAstaCita.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Null untuk baris referensi Rakortekbang 2026 — daftar nasional itu
      // tidak terikat tahun maupun perangkat daerah.
      tahun: { type: DataTypes.STRING(4), allowNull: true },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: true },
      sumber: {
        type: DataTypes.ENUM('rakortekbang_2026', 'opd'),
        allowNull: false,
        defaultValue: 'rakortekbang_2026',
      },
      // Nomor pada kolom NO Tabel C-6 — nomor urut BARIS tabel (1..33+),
      // bukan nomor Asta Cita. Identitas Asta Cita ada di kolom `asta_cita`.
      no_baris_c6: { type: DataTypes.INTEGER, allowNull: true },
      asta_cita: { type: DataTypes.TEXT, allowNull: false },
      bidang_urusan: { type: DataTypes.STRING(150), allowNull: true },
      outcome_prioritas: { type: DataTypes.TEXT, allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: true },
      satuan: { type: DataTypes.STRING(50), allowNull: true },
      program: { type: DataTypes.STRING(255), allowNull: true },
      kode_subkegiatan: { type: DataTypes.STRING(100), allowNull: true },
      // Awalan kode subkegiatan (mis. "2.09") — kunci penyaring per bidang urusan.
      kode_bidang_urusan: { type: DataTypes.STRING(10), allowNull: true },
      subkegiatan: { type: DataTypes.TEXT, allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RenjaOutcomeAstaCita',
      tableName: 'renja_outcome_asta_cita',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RenjaOutcomeAstaCita;
};

// File: models/indikatorsasaran.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorSasaran extends Model {
    static associate(models) {
      this.belongsTo(models.IndikatorTujuan, {
        foreignKey: "tujuan_id",
        as: "indikatorTujuan",
      });
      this.hasMany(models.IndikatorProgram, {
        foreignKey: "sasaran_id",
        as: "programs",
      });
      this.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "penanggung_jawab",
        as: "opdPenanggungJawab",
      });
      this.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });
      this.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      this.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
    }
  }

  IndikatorSasaran.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      indikator_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
          model: "indikators",
          key: "id",
        },
      },
      periode_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
      },
      tujuan_id: DataTypes.INTEGER.UNSIGNED,
      sasaran_id: DataTypes.INTEGER.UNSIGNED,
      kode_indikator: { type: DataTypes.STRING(100), allowNull: false },
      nama_indikator: { type: DataTypes.TEXT, allowNull: false },
      tipe_indikator: { type: DataTypes.ENUM("Outcome"), allowNull: false },
      jenis: DataTypes.STRING(100),
      tolok_ukur_kinerja: DataTypes.TEXT,
      target_kinerja: DataTypes.TEXT,
      jenis_indikator: {
        type: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      kriteria_kuantitatif: DataTypes.TEXT,
      kriteria_kualitatif: DataTypes.TEXT,
      satuan: DataTypes.STRING(50),
      definisi_operasional: DataTypes.TEXT,
      metode_penghitungan: DataTypes.TEXT,
      baseline: DataTypes.TEXT,
      capaian_tahun_1: DataTypes.STRING(100),
      capaian_tahun_2: DataTypes.STRING(100),
      capaian_tahun_3: DataTypes.STRING(100),
      capaian_tahun_4: DataTypes.STRING(100),
      capaian_tahun_5: DataTypes.STRING(100),
      target_tahun_1: DataTypes.STRING(100),
      target_tahun_2: DataTypes.STRING(100),
      target_tahun_3: DataTypes.STRING(100),
      target_tahun_4: DataTypes.STRING(100),
      target_tahun_5: DataTypes.STRING(100),
      sumber_data: DataTypes.TEXT,
      penanggung_jawab: {
        type: DataTypes.INTEGER,
        references: {
          model: "opd_penanggung_jawab",
          key: "id",
        },
      },
      keterangan: DataTypes.TEXT,
      rekomendasi_ai: DataTypes.TEXT,
      rkpd_id: DataTypes.INTEGER.UNSIGNED,
      jenis_dokumen: { type: DataTypes.STRING, allowNull: false },
      tahun: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "IndikatorSasaran",
      tableName: "indikatorsasarans",
      underscored: true,
      timestamps: false,
      indexes: [
        {
          unique: true,
          name: "unique_indikatorsasarans_combination",
          fields: ["indikator_id", "kode_indikator", "jenis_dokumen", "tahun"],
        },
      ],
    }
  );

  // Hooks — sertakan transaction agar cek duplikat sejalan dengan transaksi (impor Excel apply)
  IndikatorSasaran.addHook("beforeCreate", async (instance, options) => {
    const tx = options?.transaction;
    const exists = await IndikatorSasaran.findOne({
      where: {
        indikator_id: instance.indikator_id,
        kode_indikator: instance.kode_indikator,
        jenis_dokumen: instance.jenis_dokumen,
        tahun: instance.tahun,
      },
      transaction: tx,
    });
    if (exists) {
      throw new Error(
        "Data dengan kombinasi indikator_id, kode_indikator, jenis_dokumen, dan tahun sudah ada."
      );
    }
  });

  IndikatorSasaran.addHook("beforeBulkCreate", async (instances, options) => {
    const tx = options?.transaction;
    for (const instance of instances) {
      const exists = await IndikatorSasaran.findOne({
        where: {
          indikator_id: instance.indikator_id,
          kode_indikator: instance.kode_indikator,
          jenis_dokumen: instance.jenis_dokumen,
          tahun: instance.tahun,
        },
        transaction: tx,
      });
      if (exists) {
        throw new Error(
          `Data duplikat ditemukan: indikator_id=${instance.indikator_id}, kode_indikator=${instance.kode_indikator}`
        );
      }
    }
  });

  return IndikatorSasaran;
};

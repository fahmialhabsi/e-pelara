// models/IndikatorTujuan.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorTujuan extends Model {
    static associate(models) {
      // Relasi ke IndikatorMisi
      this.belongsTo(models.IndikatorMisi, {
        foreignKey: "misi_id",
        as: "indikatorMisi",
      });
      // Relasi ke Tujuan
      this.belongsTo(models.Tujuan, {
        foreignKey: "tujuan_id",
        as: "Tujuan",
      });

      // Relasi ke IndikatorSasaran
      this.hasMany(models.IndikatorSasaran, {
        foreignKey: "tujuan_id",
        as: "sasarans",
      });

      // Relasi ke OPD Penanggung Jawab
      this.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "penanggung_jawab",
        as: "opdPenanggungJawab",
      });
      // Relasi ke RKPD
      this.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });
      // Relasi ke Periode RPJMD
      this.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periodeRpjmd",
      });
    }
  }

  IndikatorTujuan.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      misi_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "misis",
          key: "id",
        },
      },
      tujuan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "tujuan",
          key: "id",
        },
      },
      rkpd_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      periode_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: "periode_rpjmds", // refer ke nama tabel DB
          key: "id",
        },
      },
      kode_indikator: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      nama_indikator: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tipe_indikator: {
        type: DataTypes.ENUM("Impact"),
        allowNull: false,
      },
      jenis: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tolok_ukur_kinerja: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_kinerja: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jenis_indikator: {
        type: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      kriteria_kuantitatif: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      kriteria_kualitatif: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      satuan: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      definisi_operasional: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metode_penghitungan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      baseline: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      capaian_tahun_1: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_2: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_3: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_4: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_5: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      target_tahun_1: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_tahun_2: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_tahun_3: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_tahun_4: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_tahun_5: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      sumber_data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      penanggung_jawab: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rekomendasi_ai: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "IndikatorTujuan",
      tableName: "indikatortujuans",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          name: "unique_indikatortujuans_combination",
          fields: ["kode_indikator", "tujuan_id", "jenis_dokumen", "tahun"],
        },
      ],
    }
  );

  // Hooks
  IndikatorTujuan.addHook("beforeCreate", async (instance) => {
    const exists = await IndikatorTujuan.findOne({
      where: {
        kode_indikator: instance.kode_indikator,
        jenis_dokumen: instance.jenis_dokumen,
        tahun: instance.tahun,
        periode_id: instance.periode_id,
      },
    });
    if (exists) {
      throw new Error(
        "Data dengan kombinasi kode_indikator, jenis_dokumen, tahun, dan periode_id sudah ada. Silahkan periksa kembali."
      );
    }
  });

  IndikatorTujuan.addHook("beforeBulkCreate", async (instances) => {
    for (const instance of instances) {
      const exists = await IndikatorTujuan.findOne({
        where: {
          kode_indikator: instance.kode_indikator,
          jenis_dokumen: instance.jenis_dokumen,
          tahun: instance.tahun,
          periode_id: instance.periode_id,
        },
      });
      if (exists) {
        throw new Error(
          `Data duplikat ditemukan: kode_indikator=${instance.kode_indikator}, tahun=${instance.tahun}, periode_id=${instance.periode_id}`
        );
      }
    }
  });

  return IndikatorTujuan;
};

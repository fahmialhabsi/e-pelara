// backend/models/renstra_tabelArahKebijakanModel.js
module.exports = (sequelize, DataTypes) => {
  const RenstraTabelArahKebijakan = sequelize.define(
    "RenstraTabelArahKebijakan",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      kebijakan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      kode_kebijakan: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      deskripsi_kebijakan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      indikator: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      baseline: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },

      satuan_target: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      lokasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      opd_penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      target_tahun_1: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_2: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_3: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_4: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_5: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_6: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_tahun_1: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_2: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_3: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_4: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_5: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_6: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },

      target_akhir_renstra: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_akhir_renstra: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_rpjmd_acuan: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },

      versi: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
        defaultValue: "draft",
      },

      last_revised_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      last_revised_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "renstra_tabel_arah_kebijakan",
      underscored: false,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          unique: true,
          fields: ["renstra_id", "kebijakan_id", "indikator_id"],
          name: "uniq_renstra_tabel_arah_kebijakan",
        },
        {
          fields: ["status_revisi"],
          name: "idx_status_revisi_arah_kebijakan",
        },
      ],
      
    }
  );

  RenstraTabelArahKebijakan.associate = (models) => {
  RenstraTabelArahKebijakan.belongsTo(models.IndikatorRenstra, {
    foreignKey: "indikator_id",
    as: "indikator_detail",
  });

  RenstraTabelArahKebijakan.belongsTo(models.RenstraKebijakan, {
    foreignKey: "kebijakan_id",
    as: "kebijakan",
  });

  RenstraTabelArahKebijakan.belongsTo(models.RenstraOPD, {
    foreignKey: "renstra_id",
    as: "renstra",
  });
};

  return RenstraTabelArahKebijakan;
};
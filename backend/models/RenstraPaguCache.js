module.exports = (sequelize, DataTypes) => {
  const RenstraPaguCache = sequelize.define(
    "RenstraPaguCache",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      renstra_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      stage: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      ref_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      pagu_tahun_1: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_2: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_3: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_4: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_5: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_6: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },

      pagu_akhir_renstra: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },

      realisasi_tahun_1: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_tahun_2: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_tahun_3: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_tahun_4: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_tahun_5: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_tahun_6: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      realisasi_akhir_renstra: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
      },

      cached_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "renstra_pagu_cache",
      underscored: true,
    }
  );

  return RenstraPaguCache;
};
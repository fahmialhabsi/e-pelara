// rpjmd-backend/models/monev/evaluasiModel.js
module.exports = (sequelize, DataTypes) => {
  const Evaluasi = sequelize.define("Evaluasi", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "Program",
        key: "id",
      },
    },
    sasaran_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "Sasaran",
        key: "id",
      },
    },
    indikator_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "Indikator",
        key: "id",
      },
    },
    hasil_evaluasi: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
  });

  Evaluasi.associate = (models) => {
    // Relasi ke Program
    Evaluasi.belongsTo(models.Program, {
      foreignKey: "program_id",
      as: "program",
    });
    // Relasi ke Sasaran
    Evaluasi.belongsTo(models.Sasaran, {
      foreignKey: "sasaran_id",
      as: "sasaran",
    });
    // Relasi ke Indikator
    Evaluasi.belongsTo(models.Indikator, {
      foreignKey: "indikator_id",
      as: "indikator",
    });
  };

  return Evaluasi;
};

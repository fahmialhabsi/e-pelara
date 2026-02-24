// rpjmd-backend/models/monev/indikatorModel.js
module.exports = (sequelize, DataTypes) => {
  const Indikator = sequelize.define("Indikator", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sasaran_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "Sasaran",
        key: "id",
      },
    },
    nama_indikator: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  Indikator.associate = (models) => {
    // Relasi ke Sasaran
    Indikator.belongsTo(models.Sasaran, {
      foreignKey: "sasaran_id",
      as: "sasaran",
    });
  };

  return Indikator;
};

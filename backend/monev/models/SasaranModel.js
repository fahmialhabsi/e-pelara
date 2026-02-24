// rpjmd-backend/models/monev/sasaranModel.js
module.exports = (sequelize, DataTypes) => {
  const Sasaran = sequelize.define("Sasaran", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tujuan_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "Tujuan",
        key: "id",
      },
    },
    nama_sasaran: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  Sasaran.associate = (models) => {
    // Relasi ke Tujuan
    Sasaran.belongsTo(models.Tujuan, {
      foreignKey: "tujuan_id",
      as: "tujuan",
    });
  };

  return Sasaran;
};

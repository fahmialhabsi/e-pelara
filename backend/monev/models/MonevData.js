// rpjmd-backend/monev/models/MonevData.js

module.exports = (sequelize, DataTypes) => {
  const MonevData = sequelize.define("MonevData", {
    indikator: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    realisasi: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  return MonevData;
};

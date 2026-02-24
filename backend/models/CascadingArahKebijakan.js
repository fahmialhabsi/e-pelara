module.exports = (sequelize, DataTypes) => {
  const CascadingArahKebijakan = sequelize.define(
    "CascadingArahKebijakan",
    {
      cascading_id: { type: DataTypes.INTEGER, allowNull: false },
      arah_kebijakan_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: "cascading_arah_kebijakan", timestamps: false }
  );
  CascadingArahKebijakan.associate = (models) => {
    CascadingArahKebijakan.belongsTo(models.Cascading, {
      foreignKey: "cascading_id",
    });
    CascadingArahKebijakan.belongsTo(models.ArahKebijakan, {
      foreignKey: "arah_kebijakan_id",
    });
  };

  return CascadingArahKebijakan;
};

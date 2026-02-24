module.exports = (sequelize, DataTypes) => {
  const CascadingStrategi = sequelize.define(
    "CascadingStrategi",
    {
      cascading_id: { type: DataTypes.INTEGER, allowNull: false },
      strategi_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: "cascading_strategi", timestamps: false }
  );
  CascadingStrategi.associate = (models) => {
    CascadingStrategi.belongsTo(models.Cascading, {
      foreignKey: "cascading_id",
    });
    CascadingStrategi.belongsTo(models.Strategi, {
      foreignKey: "strategi_id",
    });
  };

  return CascadingStrategi;
};

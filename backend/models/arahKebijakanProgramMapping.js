"use strict";

module.exports = (sequelize, DataTypes) => {
  const ArahKebijakanProgramMapping = sequelize.define(
    "ArahKebijakanProgramMapping",
    {
      arah_kebijakan_id: DataTypes.INTEGER,
      master_program_id: DataTypes.INTEGER,
      periode_id: DataTypes.INTEGER,
      jenis_dokumen: DataTypes.STRING,
      dataset_key: DataTypes.STRING,
      is_active: DataTypes.BOOLEAN,
    },
    {
      tableName: "arah_kebijakan_program_mapping",
      underscored: true,
    }
  );

  return ArahKebijakanProgramMapping;
};
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class program_strategi extends Model {
  }

  program_strategi.init(
    {
      // Tidak perlu mendefinisikan kolom, Sequelize akan
      // otomatis menyesuaikan dengan struktur tabel
    },
    {
      sequelize,
      modelName: "program_strategi",
      
      tableName: "program_strategi",
      timestamps: false, // **Matikan timestamps di pivot**
      underscored: true, // Jika kolom Anda pakai snake_case
    
    }
  );

  return program_strategi;
};

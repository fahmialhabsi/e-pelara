'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MasterSubBidangOpd extends Model {
    static associate(models) {
      // Tidak ada relasi FK eksplisit — pencocokan dilakukan by nama (nama_opd, nama_bidang_opd)
    }
  }

  MasterSubBidangOpd.init(
    {
      nama_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_sub_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'MasterSubBidangOpd',
      tableName: 'master_sub_bidang_opd',
      underscored: true,
      timestamps: true,
    },
  );

  return MasterSubBidangOpd;
};

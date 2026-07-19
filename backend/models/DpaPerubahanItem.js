module.exports = (sequelize, DataTypes) => {
  const DpaPerubahanItem = sequelize.define(
    'DpaPerubahanItem',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      perubahan_id: { type: DataTypes.INTEGER, allowNull: false },
      kode_rekening: { type: DataTypes.STRING(50), allowNull: false },
      nama_rekening: DataTypes.STRING(255),
      uraian: DataTypes.STRING(255),
      jumlah_sebelum: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      volume_sebelum: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      satuan_sebelum: DataTypes.STRING(50),
      harga_satuan_sebelum: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      jumlah_sesudah: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      volume_sesudah: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      satuan_sesudah: DataTypes.STRING(50),
      harga_satuan_sesudah: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
    },
    {
      tableName: 'dpa_perubahan_item',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return DpaPerubahanItem;
};

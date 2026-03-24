"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DokumenPendukung extends Model {}

  DokumenPendukung.init(
    {
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment:
          "Jenis entitas: misi, visi, program, kegiatan, sub_kegiatan, dll",
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "ID dari entitas terkait",
      },
      judul: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Judul/label dokumen (contoh: SK Penetapan Misi)",
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Nama file asli saat diupload",
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Nama file tersimpan di server (unik)",
      },
      filepath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment:
          "Path relatif dari folder uploads, contoh: dokumen/misi/file.pdf",
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Ukuran file dalam bytes",
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "MIME type: application/pdf, image/jpeg, dll",
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Keterangan tambahan tentang dokumen",
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "user_id yang mengupload",
      },
    },
    {
      sequelize,
      modelName: "DokumenPendukung",
      tableName: "dokumen_pendukung",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  DokumenPendukung.associate = (db) => {
    DokumenPendukung.belongsTo(db.User, {
      foreignKey: "uploaded_by",
      as: "uploader",
    });
  };

  return DokumenPendukung;
};

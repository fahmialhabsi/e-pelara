// controllers/dokumenController.js
// CRUD dokumen pendukung per entitas (misi, program, kegiatan, dll)

const path = require("path");
const fs = require("fs");
const { DokumenPendukung } = require("../models");

// GET /api/dokumen?entity_type=misi&entity_id=5
const getByEntity = async (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) {
    return res
      .status(400)
      .json({ message: "entity_type dan entity_id wajib diisi" });
  }
  try {
    const docs = await DokumenPendukung.findAll({
      where: { entity_type, entity_id: parseInt(entity_id) },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "entity_type",
        "entity_id",
        "judul",
        "original_name",
        "filename",
        "filepath",
        "file_size",
        "mime_type",
        "keterangan",
        "uploaded_by",
        "created_at",
      ],
    });
    return res.json(docs);
  } catch (err) {
    console.error("dokumenController.getByEntity:", err);
    return res.status(500).json({ message: "Gagal mengambil data dokumen" });
  }
};

// POST /api/dokumen  (multipart/form-data — field: file, entity_type, entity_id, judul, keterangan)
const upload = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "File tidak ditemukan dalam request" });
  }
  const { entity_type, entity_id, judul, keterangan } = req.body;
  if (!entity_type || !entity_id || !judul) {
    // Hapus file yang sudah ter-upload jika validasi gagal
    fs.unlink(req.file.path, () => {});
    return res
      .status(400)
      .json({ message: "entity_type, entity_id, dan judul wajib diisi" });
  }

  // filepath relatif dari folder uploads: dokumen/{entity_type}/{filename}
  const safe = entity_type.replace(/[^a-zA-Z0-9_-]/g, "");
  const relPath = path
    .join("dokumen", safe, req.file.filename)
    .replace(/\\/g, "/");

  try {
    const doc = await DokumenPendukung.create({
      entity_type,
      entity_id: parseInt(entity_id),
      judul,
      original_name: req.file.originalname,
      filename: req.file.filename,
      filepath: relPath,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      keterangan: keterangan || null,
      uploaded_by: req.user?.id || null,
    });
    return res
      .status(201)
      .json({ message: "Dokumen berhasil diupload", data: doc });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error("dokumenController.upload:", err);
    return res.status(500).json({ message: "Gagal menyimpan data dokumen" });
  }
};

// GET /api/dokumen/:id/download
const download = async (req, res) => {
  try {
    const doc = await DokumenPendukung.findByPk(req.params.id);
    if (!doc)
      return res.status(404).json({ message: "Dokumen tidak ditemukan" });

    const filePath = path.join(__dirname, "..", "uploads", doc.filepath);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "File tidak ditemukan di server" });
    }
    return res.download(filePath, doc.original_name);
  } catch (err) {
    console.error("dokumenController.download:", err);
    return res.status(500).json({ message: "Gagal mengunduh dokumen" });
  }
};

// DELETE /api/dokumen/:id
const remove = async (req, res) => {
  try {
    const doc = await DokumenPendukung.findByPk(req.params.id);
    if (!doc)
      return res.status(404).json({ message: "Dokumen tidak ditemukan" });

    // Cek kepemilikan: user biasa hanya bisa hapus miliknya sendiri
    const userRole = req.user?.role;
    const isAdmin = ["SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole);
    if (!isAdmin && doc.uploaded_by !== req.user?.id) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    const filePath = path.join(__dirname, "..", "uploads", doc.filepath);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Gagal hapus file fisik:", filePath, err.message);
      });
    }
    await doc.destroy();
    return res.json({ message: "Dokumen berhasil dihapus" });
  } catch (err) {
    console.error("dokumenController.remove:", err);
    return res.status(500).json({ message: "Gagal menghapus dokumen" });
  }
};

module.exports = { getByEntity, upload, download, remove };

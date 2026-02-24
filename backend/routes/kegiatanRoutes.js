// routes/kegiatanRoutes.js
const express = require("express");
const router = express.Router();
const kegiatanController = require("../controllers/kegiatanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { validateKegiatan } = require("../utils/entityValidator");
const { Kegiatan } = require("../models");
const { Op } = require("sequelize");

// Role yang dapat melakukan semua operasi
const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];
// Role yang hanya dapat membaca
const readOnly = [...adminOnly, "PENGAWAS", "PELAKSANA"];

// GET list kegiatan dengan paginasi dan search
router.get("/", verifyToken, allowRoles(readOnly), kegiatanController.list);

// GET kegiatan berdasarkan program ID numerik
router.get(
  "/by-program/:id",
  verifyToken,
  allowRoles(readOnly),
  kegiatanController.getByProgramId
);

// GET kegiatan berdasarkan kode program (untuk dropdown Renstra)
router.get(
  "/by-program-kode/:kode",
  verifyToken,
  allowRoles(readOnly),
  async (req, res) => {
    try {
      let { kode } = req.params;

      // Bersihkan kode dari titik di akhir atau spasi
      kode = kode.replace(/\.$/, "").trim();

      const rows = await Kegiatan.findAll({
        where: {
          kode_kegiatan: {
            [Op.like]: `${kode}%`, // ambil semua kegiatan yang kode_kegiatannya diawali kode program
          },
        },
        attributes: ["id", "kode_kegiatan", "nama_kegiatan", "program_id"],
        order: [["kode_kegiatan", "ASC"]],
      });

      res.json(rows);
    } catch (err) {
      console.error("Error get by-program-kode:", err);
      res
        .status(500)
        .json({ message: "Gagal mengambil kegiatan", error: err.message });
    }
  }
);

// GET daftar kegiatan sederhana (untuk dropdown)
router.get("/simple", verifyToken, allowRoles(readOnly), async (req, res) => {
  try {
    const rows = await Kegiatan.findAll({
      attributes: ["id", "kode_kegiatan", "nama_kegiatan", "program_id"],
      order: [["kode_kegiatan", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error("Error get simple kegiatan:", err);
    res
      .status(500)
      .json({ message: "Gagal mengambil kegiatan", error: err.message });
  }
});

// GET kegiatan berdasarkan ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(readOnly),
  kegiatanController.getById
);

// POST buat kegiatan baru
router.post(
  "/",
  verifyToken,
  allowRoles(adminOnly),
  validateKegiatan,
  kegiatanController.create
);

// PUT update kegiatan
router.put(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  validateKegiatan,
  kegiatanController.update
);

// DELETE hapus kegiatan
router.delete(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  kegiatanController.destroy
);

module.exports = router;

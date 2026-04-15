// src/routes/rpjmdRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const requireChangeReason = require("../middlewares/requireChangeReason");
const rpjmdController = require("../controllers/rpjmdController");

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

// Gunakan nama berbeda agar tidak bentrok
const uploadMulter = multer({ storage });

function parseMultipartForRpjmdUpdate(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return uploadMulter.fields([
      { name: "foto_kepala_daerah", maxCount: 1 },
      { name: "foto_wakil_kepala_daerah", maxCount: 1 },
    ])(req, res, next);
  }
  next();
}

// create → hanya SUPER_ADMIN, ADMINISTRATOR
router.post(
  "/create",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  uploadMulter.fields([
    { name: "foto_kepala_daerah", maxCount: 1 },
    { name: "foto_wakil_kepala_daerah", maxCount: 1 },
  ]),
  requireChangeReason,
  rpjmdController.createRPJMD,
);

// get → terbuka untuk semua role aktif
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  rpjmdController.getRPJMD
);

// get by id → terbuka untuk semua role aktif
router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  rpjmdController.getRpjmdAudit,
);
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  rpjmdController.getRPJMDById,
);

// update → hanya SUPER_ADMIN, ADMINISTRATOR
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  parseMultipartForRpjmdUpdate,
  requireChangeReason,
  rpjmdController.updateRPJMD,
);

// delete → hanya SUPER_ADMIN
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  requireChangeReason,
  rpjmdController.deleteRPJMD,
);

module.exports = router;

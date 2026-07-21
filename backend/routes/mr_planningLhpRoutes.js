// backend/routes/mr_planningLhpRoutes.js
"use strict";

/**
 * MR Planning LHP Routes — Modul TLHP
 * Mounted at /api/mr-planning-lhp
 */

const express = require("express");

const controller = require("../controllers/mrPlanningLhpController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { uploadDokumen } = require("../middlewares/uploadDokumen");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const DELETE = ["SUPER_ADMIN"];

const uploadSingleDocument = (req, res, next) => {
  const handler = uploadDokumen.any();

  handler(req, res, (error) => {
    if (error) {
      let message = "Berkas LHP belum dapat diunggah.";

      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Ukuran berkas melebihi batas maksimal 10 MB.";
      } else if (error.message) {
        message = error.message;
      }

      return res.status(400).json({
        success: false,
        message,
        code: error.code || "MR_LHP_UPLOAD_ERROR",
      });
    }

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Berkas LHP wajib diunggah.",
        code: "MR_LHP_FILE_REQUIRED",
      });
    }

    req.file = req.files.find((item) => item.fieldname === "file") || req.files[0];
    return next();
  });
};

router.get("/", verifyToken, allowRoles(READ), controller.findAll);
router.get("/:id", verifyToken, allowRoles(READ), controller.findById);

router.post("/", verifyToken, allowRoles(WRITE), controller.create);
router.put("/:id", verifyToken, allowRoles(WRITE), controller.update);
router.post("/:id/activate", verifyToken, allowRoles(WRITE), controller.activate);
router.post("/:id/archive", verifyToken, allowRoles(WRITE), controller.archive);
router.post("/:id/document", verifyToken, allowRoles(WRITE), uploadSingleDocument, controller.uploadDocument);

router.delete("/:id", verifyToken, allowRoles(DELETE), controller.destroy);

module.exports = router;

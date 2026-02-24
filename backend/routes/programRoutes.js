// routes/programRoutes.js
const express = require("express");
const router = express.Router();
const programController = require("../controllers/programController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { validateProgram } = require("../utils/entityValidator");

// Role yang bisa CRUD
const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];
// Role yang hanya bisa read
const readOnly = [...adminOnly, "PENGAWAS", "PELAKSANA"];

// GET list programs dengan paginasi dan search
router.get("/", verifyToken, allowRoles(readOnly), programController.list);

// GET all programs tanpa pagination (khusus dropdown)
router.get(
  "/all",
  verifyToken,
  allowRoles(readOnly),
  programController.listAll // bikin method baru di controller
);

// GET program by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(readOnly),
  programController.getById
);

// POST buat program baru
router.post(
  "/",
  verifyToken,
  allowRoles(adminOnly),
  validateProgram,
  programController.create
);

// PUT update program
router.put(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  validateProgram,
  programController.update
);

// DELETE hapus program
router.delete(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  programController.destroy
);

module.exports = router;

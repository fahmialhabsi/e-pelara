// routes/strategiRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const strategiController = require("../controllers/strategiController");
const {
  validateStrategi,
  handleValidationErrors,
} = require("../utils/entityValidator");

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  validateStrategi,
  handleValidationErrors,
  strategiController.create,
);

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.getAll,
);

router.get(
  "/preview-kode",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.previewKode,
);

router.get(
  "/by-sasaran/:sasaranId",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.bySasaran,
);

router.get(
  "/by-kode-prefix",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.byKodePrefix,
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.getById,
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  strategiController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  strategiController.delete,
);

router.get(
  "/tujuan/list",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiController.tujuanList,
);

module.exports = router;

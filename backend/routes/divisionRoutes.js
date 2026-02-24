const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const divisionController = require("../controllers/divisionController");

router.post(
  "/divisions",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  divisionController.createDivision
);
router.get(
  "/divisions",
  verifyToken,
  allowRoles("SUPER_ADMIN", "ADMINISTRATOR"),
  divisionController.getDivisions
);
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  divisionController.getDivisions
);
router.get(
  "/divisions/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "ADMINISTRATOR"),
  divisionController.getDivisionById
);
router.put(
  "/divisions/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  divisionController.updateDivision
);
router.delete(
  "/divisions/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  divisionController.deleteDivision
);

module.exports = router;

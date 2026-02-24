// routes/opdPenanggungJawabRoutes.js
const express = require("express");
const router = express.Router();
const { Op, OpdPenanggungJawab } = require("../models");
const opdPenanggungJawabController = require("../controllers/opdPenanggungJawabController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.get(
  "/dropdown",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  opdPenanggungJawabController.getDropdownOPD
);

router.get(
  "/search",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  async (req, res) => {
    try {
      const { opd, divisions_id } = req.query;
      const where = {};
      if (opd) where.opd = opd;
      if (divisions_id) where.divisions_id = divisions_id;

      const list = await OpdPenanggungJawab.findAll({ where });
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error searching OPD-PJ" });
    }
  }
);

// Create
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  opdPenanggungJawabController.createOpdPenanggungJawab
);

// Read All
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  opdPenanggungJawabController.getOpdPenanggungJawabs
);

// Read by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  opdPenanggungJawabController.getOpdPenanggungJawabById
);

// Update
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  opdPenanggungJawabController.updateOpdPenanggungJawab
);

// Delete
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  opdPenanggungJawabController.deleteOpdPenanggungJawab
);

// Search / Filter
router.get(
  "/search",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  async (req, res) => {
    const { rpjmd_id, opd, divisions_id, nama } = req.query;
    try {
      const filters = {};
      if (rpjmd_id) filters.rpjmd_id = rpjmd_id;
      if (opd) filters.opd = { [Op.like]: `%${opd}%` };
      if (divisions_id) filters.divisions_id = divisions_id;
      if (nama) filters.nama = { [Op.like]: `%${nama}%` };

      const results = await OpdPenanggungJawab.findAll({ where: filters });
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error searching OpdPenanggungJawab" });
    }
  }
);

module.exports = router;

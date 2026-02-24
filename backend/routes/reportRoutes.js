const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { generateReport } = require("../controllers/reportController");

router.post(
  "/generate",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  generateReport
); // POST: terima filter
router.get(
  "/download/:filename",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  (req, res) => {
    const file = `${__dirname}/../reports/${req.params.filename}`;
    res.download(file);
  }
);

module.exports = router;

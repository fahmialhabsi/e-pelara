// rpjmd-backend/monev/index.js
const express = require("express");
const router = express.Router();

const evaluasiRoutes = require("./routes/evaluasiRoutes");

// Gabungkan semua routes di sini
router.use("/evaluasi", evaluasiRoutes);

module.exports = router;

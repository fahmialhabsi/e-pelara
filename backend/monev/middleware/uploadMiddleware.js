// rpjmd-backend/monev/middleware/uploadMiddleware.js
const multer = require("multer");

// Set up multer storage and file filter
const storage = multer.memoryStorage(); // Simpan file di memory sementara
const upload = multer({ storage: storage }).single("file");

module.exports = upload;

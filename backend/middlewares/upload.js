// middlewares/upload.js
const multer = require("multer");
const path = require("path");

// Menyimpan file dengan nama yang unik
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tentukan folder penyimpanan file
    const uploadPath = path.join(__dirname, "..", "uploads");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Menyusun nama file yang unik
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

module.exports = upload;

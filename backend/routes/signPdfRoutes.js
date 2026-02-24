const express = require("express");
const multer = require("multer");
const router = express.Router();
const { signDocument } = require("../controllers/signPdfController");

const upload = multer({ storage: multer.memoryStorage() }); // simpan di memori

router.post("/signpdf", upload.single("pdf"), signDocument);

module.exports = router;

const fs = require("fs");
const path = require("path");
const { signPdf } = require("../utils/pdfSigner");

exports.signDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF belum diunggah." });
    }

    const pdfBuffer = req.file.buffer;
    const signedPdf = signPdf(pdfBuffer);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="signed-document.pdf"',
    });
    res.send(signedPdf);
  } catch (error) {
    console.error("Signing error:", error);
    res.status(500).json({ error: "Gagal menandatangani PDF" });
  }
};

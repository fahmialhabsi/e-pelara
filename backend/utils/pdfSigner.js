const fs = require("fs");
const path = require("path");
const { SignPdf } = require("@signpdf/signpdf");
const { P12Signer } = require("@signpdf/signer-p12");
const { plainAddPlaceholder } = require("@signpdf/placeholder-plain"); // helper ganti

// Path ke sertifikat .p12
const certPath = path.join(__dirname, "../certs/cert.p12");
const p12Buffer = fs.readFileSync(certPath);

// Tambahkan placeholder ke PDF
function addPlaceholderToPdf(pdfBuffer) {
  return plainAddPlaceholder({
    pdfBuffer,
    reason: "Dokumen resmi RENSTRA",
    signatureLength: 8192, // lebih aman
  });
}

// Tanda tangan PDF
function signPdf(pdfBuffer) {
  const pdfWithPlaceholder = addPlaceholderToPdf(pdfBuffer);

  const signer = new SignPdf();
  const signedPdf = signer.sign(
    pdfWithPlaceholder,
    new P12Signer(p12Buffer, { passphrase: "Renstra@2025!" })
  );

  return signedPdf;
}

module.exports = { signPdf };

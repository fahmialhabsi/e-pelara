/* One-off: dump PDF text for marker search */
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const pdfPath = path.join(
  __dirname,
  "../../dokumenEPelara/Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf",
);
const outPath = path.join(__dirname, "rpjmd_malut_pdf_dump.txt");

(async () => {
  const buf = fs.readFileSync(pdfPath);
  const data = await pdf(buf);
  fs.writeFileSync(outPath, data.text, "utf8");
  console.log("pages", data.numpages, "chars", data.text.length, "->", outPath);
})();

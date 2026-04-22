"use strict";

/**
 * Impor baris indikator RPJMD dari Excel (template) ke DB.
 * Pemakaian: node backend/scripts/importRpjmdIndikatorFromExcel.js <path.xlsx> <periode_rpjmd_id>
 *
 * Sheet name = nama tabel (mis. indikatortujuans). Header baris pertama = nama kolom DB.
 * Kolom yang tidak dipakai layanan diabaikan. Default jenis_dokumen = RPJMD, tahun = 2025.
 */

const path = require("path");
const XLSX = require("xlsx");
const svc = require("../services/rpjmdImportIndikatorService");

function normKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function rowToObj(header, row) {
  const o = {};
  for (let i = 0; i < header.length; i++) {
    const key = normKey(header[i]);
    if (!key) continue;
    const v = row[i];
    o[key] = v === undefined || v === null ? "" : v;
  }
  return o;
}

function num(v) {
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const file = process.argv[2];
  const periodeId = num(process.argv[3]);
  if (!file || !periodeId) {
    console.error("Gunakan: node importRpjmdIndikatorFromExcel.js <file.xlsx> <periode_rpjmd_id>");
    process.exit(1);
  }
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const wb = XLSX.readFile(abs);

  const handlers = {
    indikatortujuans: svc.createIndikatorTujuan,
    indikatorsasarans: svc.createIndikatorSasaran,
    indikatorstrategis: svc.createIndikatorStrategi,
    indikatorarahkebijakans: svc.createIndikatorArahKebijakan,
    indikatorprograms: svc.createIndikatorProgram,
    indikatorkegiatans: svc.createIndikatorKegiatan,
    indikatorsubkegiatans: svc.createIndikatorSubKegiatan,
  };

  let totalOk = 0;
  let totalFail = 0;

  for (const sheetName of wb.SheetNames) {
    const table = normKey(sheetName).replace(/-/g, "_");
    const createFn = handlers[table];
    if (!createFn) {
      console.warn(`Lewati sheet "${sheetName}" (bukan tabel indikator dikenal).`);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    if (!matrix.length) continue;
    const header = matrix[0];
    const dataRows = matrix.slice(1).filter((r) => r && r.some((c) => c !== "" && c != null));
    const objs = dataRows.map((r) => rowToObj(header, r));

    for (const body of objs) {
      const b = { ...body };
      if (!b.jenis_dokumen) b.jenis_dokumen = "RPJMD";
      if (!b.tahun) b.tahun = "2025";
      if (table === "indikatorprograms" && (b.indikator_sasaran_id == null || b.indikator_sasaran_id === "") && b.sasaran_id) {
        b.indikator_sasaran_id = b.sasaran_id;
      }
      try {
        await createFn(periodeId, b);
        totalOk++;
      } catch (e) {
        totalFail++;
        console.error(`Gagal [${sheetName}]:`, e.message);
      }
    }
  }
  console.log(`Selesai. Berhasil: ${totalOk}, gagal: ${totalFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

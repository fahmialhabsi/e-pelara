// src/features/renstra/utils/exportRenstra.js

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Flatten langsung dari tabel renstra_target (flat data)
 */
const flattenRenstraFlat = (data) => {
  return data.map((t) => ({
    ID: t.id,
    Indikator: t.indikator?.nama_indikator || "-", // kalau ada relasi indikator
    "Acuan periode (data)": t.tahun,
    Target: t.target_value,
    Satuan: t.satuan,
    Pagu: t.pagu_anggaran,
    Lokasi: t.lokasi,
  }));
};

/**
 * Export ke Excel (flat data)
 */
export const exportRenstraToExcel = (data) => {
  const rows = flattenRenstraFlat(data);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  // Tambahkan sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, "RenstraTarget");

  // Tambahkan header manual agar urut
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [["ID", "Indikator", "Acuan periode (data)", "Target", "Satuan", "Pagu", "Lokasi"]],
    { origin: "A1" }
  );

  XLSX.writeFile(workbook, "Renstra_Targets.xlsx");
};

/**
 * Export ke PDF (flat data)
 */
export const exportRenstraToPDF = (data) => {
  const rows = flattenRenstraFlat(data);
  const doc = new jsPDF("l", "mm", "a4"); // landscape

  doc.setFontSize(12);
  doc.text("Laporan Renstra Target", 14, 15);

  const tableColumn = [
    "ID",
    "Indikator",
    "Acuan periode (data)",
    "Target",
    "Satuan",
    "Pagu",
    "Lokasi",
  ];

  const tableRows = rows.map((r) => [
    r.ID,
    r.Indikator,
    r["Acuan periode (data)"],
    r.Target,
    r.Satuan,
    r.Pagu,
    r.Lokasi,
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: { fontSize: 8, cellWidth: "wrap" },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save("Renstra_Targets.pdf");
};

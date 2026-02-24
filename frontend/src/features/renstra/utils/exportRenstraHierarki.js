// src/features/renstra/utils/exportRenstraHierarki.js
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ Export Excel
export const exportRenstraHierarkiToExcel = (
  data,
  fileName = "renstra_hierarki.xlsx"
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Renstra");
  XLSX.writeFile(wb, fileName);
};

// ✅ Export PDF
export const exportRenstraHierarkiToPDF = (
  data,
  fileName = "renstra_hierarki.pdf"
) => {
  const doc = new jsPDF();
  doc.text("Hierarki Renstra", 14, 10);

  autoTable(doc, {
    head: [["Level", "Nama", "Indikator"]],
    body: data.map((item) => [item.level, item.nama, item.indikator || "-"]),
  });

  doc.save(fileName);
};

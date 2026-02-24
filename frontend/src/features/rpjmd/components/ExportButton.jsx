import React from "react";
import { Button } from "react-bootstrap";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

const ExportButton = ({ data }) => {
  // Export to Excel
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Program Prioritas");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const excelFile = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(excelFile, "Program_Prioritas.xlsx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;

    // Add headers
    doc.text("Daftar Program Prioritas", 10, y);
    y += 10;

    // Add table headers
    doc.text("No.", 10, y);
    doc.text("Kode Program", 30, y);
    doc.text("Nama Program", 80, y);
    doc.text("Sasaran", 140, y);
    doc.text("Prioritas", 180, y);
    y += 10;

    // Add table rows
    data.forEach((program, index) => {
      doc.text((index + 1).toString(), 10, y);
      doc.text(program.kode_program, 30, y);
      doc.text(program.nama_program, 80, y);
      doc.text(program.sasaran || "-", 140, y);
      doc.text(program.prioritas || "-", 180, y);
      y += 10;
    });

    doc.save("Program_Prioritas.pdf");
  };

  return (
    <div className="mt-3">
      <Button variant="success" onClick={exportToExcel} className="me-2">
        Ekspor ke Excel
      </Button>
      <Button variant="primary" onClick={exportToPDF}>
        Ekspor ke PDF
      </Button>
    </div>
  );
};

export default ExportButton;

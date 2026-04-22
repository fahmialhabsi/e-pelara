// src/shared/components/ExportDropdown.jsx
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  groupDataForCSV,
  generateExportDataFromGroupedList,
  generateExportDataForCSV,
} from "@/shared/components/utils/exportHelpers";

const ExportDropdown = ({
  rawData = [],
  extractors = {},
  judul = "",
  subjudul = "",
  pembuat = "",
  filename = "export",
  /** Jika diisi, dipanggil saat ekspor untuk mengambil seluruh baris (bukan hanya halaman aktif). */
  getFullDataset,
}) => {
  const [busy, setBusy] = useState(false);

  const handleExport = async (type) => {
    if (busy) return;
    const fileBase = filename.replace(/\.\w+$/, "");

    const commonParams = {
      judul,
      subjudul,
      pembuat,
    };

    setBusy(true);
    try {
      let dataset = rawData;
      if (typeof getFullDataset === "function") {
        dataset = await getFullDataset();
      }
      if (!Array.isArray(dataset)) dataset = [];

      const grouped = groupDataForCSV(dataset, extractors);
      const excelOrPDFData = generateExportDataFromGroupedList(
        dataset,
        extractors,
      );
      const csvData = generateExportDataForCSV(grouped);

      switch (type) {
        case "excel":
          exportToExcel({
            data: excelOrPDFData,
            filename: `${fileBase}.xlsx`,
            ...commonParams,
          });
          break;
        case "pdf":
          exportToPDF({
            data: excelOrPDFData,
            filename: `${fileBase}.pdf`,
            ...commonParams,
          });
          break;
        case "csv":
          exportToCSV({
            data: csvData,
            filename: `${fileBase}.csv`,
            ...commonParams,
          });
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("ExportDropdown:", e);
      window.alert?.(
        e?.response?.data?.message ||
          e?.message ||
          "Gagal menyiapkan data untuk ekspor.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          style={{ cursor: busy ? "wait" : "default" }}
          disabled={busy}
        >
          <FileDown size={16} />
          {busy ? "Menyiapkan…" : "Ekspor"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          style={{ cursor: busy ? "wait" : "default" }}
          disabled={busy}
        >
          Ekspor ke Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          style={{ cursor: busy ? "wait" : "default" }}
          disabled={busy}
        >
          Ekspor ke PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          style={{ cursor: busy ? "wait" : "default" }}
          disabled={busy}
        >
          Ekspor ke CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;

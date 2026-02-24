// src/shared/components/ExportDropdown.jsx
import React from "react";
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
}) => {
  const grouped = groupDataForCSV(rawData, extractors);
  const excelOrPDFData = generateExportDataFromGroupedList(rawData, extractors);
  const csvData = generateExportDataForCSV(grouped);

  const handleExport = (type) => {
    const fileBase = filename.replace(/\.\w+$/, "");

    const commonParams = {
      judul,
      subjudul,
      pembuat,
    };

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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          style={{ cursor: "default" }}
        >
          <FileDown size={16} />
          Ekspor
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          style={{ cursor: "default" }}
        >
          Ekspor ke Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          style={{ cursor: "default" }}
        >
          Ekspor ke PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          style={{ cursor: "default" }}
        >
          Ekspor ke CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;

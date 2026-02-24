// src/shared/components/utils/exportHelpers.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Mengubah data terstruktur (grouped) atau mentah menjadi array datar untuk ekspor.
 */
export function generateExportDataFromGroupedList(
  input,
  extractors = null,
  options = {}
) {
  const {
    keyField = "kode",
    valueField = "isi",
    boldField = "isBold",
  } = options;

  let groupedData;

  // Jika sudah grouped
  if (
    Array.isArray(input) &&
    input.length > 0 &&
    input[0].items &&
    input[0][keyField] !== undefined &&
    input[0][valueField] !== undefined
  ) {
    groupedData = input;
  }

  // Jika data mentah + extractor
  else if (
    Array.isArray(input) &&
    extractors &&
    typeof extractors.groupKey === "function" &&
    typeof extractors.groupValue === "function" &&
    typeof extractors.itemValue === "function"
  ) {
    groupedData = groupDataForCSV(input, extractors, keyField, valueField);
  }

  // Tidak valid
  else {
    console.error("❌ Input atau extractor tidak valid:", input, extractors);
    return [];
  }

  const flatData = [];

  groupedData.forEach((group) => {
    flatData.push({
      [keyField]: group[keyField] ?? `NO_${keyField.toUpperCase()}`,
      [valueField]: group[valueField] ?? `NO_${valueField.toUpperCase()}`,
      [boldField]: true,
    });

    group.items.forEach((item) => {
      flatData.push({
        [keyField]: item[keyField] ?? `NO_${keyField.toUpperCase()}`,
        [valueField]: item[valueField] ?? `NO_${valueField.toUpperCase()}`,
      });
    });
  });

  return flatData;
}

/**
 * Grouping data mentah menjadi struktur { kode, isi, items[] }
 */
export function groupDataForCSV(
  data,
  extractors,
  keyField = "kode",
  valueField = "isi"
) {
  const grouped = {};

  data.forEach((item) => {
    const key = extractors.groupKey(item);
    if (!grouped[key]) {
      const parent = extractors.groupValue(item);
      grouped[key] = {
        [keyField]: parent[keyField],
        [valueField]: parent[valueField],
        items: [],
      };
    }
    grouped[key].items.push(extractors.itemValue(item));
  });

  return Object.values(grouped);
}

/**
 * Ekspor ke Excel (XLSX).
 */
export function exportToExcel({
  data,
  filename,
  judul,
  subjudul,
  pembuat,
  keyField = "kode",
  valueField = "isi",
}) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const worksheetData = [
    [judul || ""],
    [subjudul || ""],
    [pembuat ? `Dibuat oleh: ${pembuat}` : ""],
    [],
    ["Kode", "Uraian Misi/Tujuan/Sasaran"],
    ...data.map((row) => [row[keyField], row[valueField]]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, filename);
}

/**
 * Ekspor ke PDF (dengan baris tebal untuk parent).
 */
export function exportToPDF({
  data,
  filename,
  judul,
  subjudul,
  pembuat,
  keyField = "kode",
  valueField = "isi",
  boldField = "isBold",
}) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(12);
  if (judul) {
    doc.text(judul, 14, y);
    y += 7;
  }
  if (subjudul) {
    doc.text(subjudul, 14, y);
    y += 7;
  }
  if (pembuat) {
    doc.text(`Dibuat oleh: ${pembuat}`, 14, y);
    y += 10;
  }

  const rows = data.map((row) =>
    row[boldField]
      ? [
          { content: row[keyField], styles: { fontStyle: "bold" } },
          { content: row[valueField], styles: { fontStyle: "bold" } },
        ]
      : [row[keyField], row[valueField]]
  );

  autoTable(doc, {
    startY: y,
    head: [["Kode", "Uraian Misi/Tujuan/Sasaran"]],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [22, 160, 133] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

/**
 * Ekspor ke CSV datar (tanpa group visual), digunakan jika sudah flattened.
 */
export function exportToCSV({
  data,
  filename,
  judul,
  subjudul,
  pembuat,
  keyField = "grup_kode",
  valueField = "grup_isi",
  itemKeyField = "item_kode",
  itemValueField = "item_isi",
}) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const headerLines = [];
  if (judul) headerLines.push(`"${judul}"`);
  if (subjudul) headerLines.push(`"${subjudul}"`);
  if (pembuat) headerLines.push(`"Dibuat oleh: ${pembuat}"`);
  headerLines.push("");

  const columnHeader = `"Grup Kode","Grup Isi","Item Kode","Item Isi"`;
  const rows = data.map(
    (row) =>
      `"${row[keyField]}","${row[valueField]}","${row[itemKeyField]}","${row[itemValueField]}"`
  );

  const csvContent = [...headerLines, columnHeader, ...rows].join("\r\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  saveAs(blob, filename);
}

/**
 * Untuk generate CSV datar dari groupedData (group.items[]).
 */
export function generateExportDataForCSV(groupedData) {
  return groupedData.flatMap((group) =>
    group.items.map((item) => ({
      grup_kode: group.kode,
      grup_isi: group.isi,
      item_kode: item.kode,
      item_isi: item.isi,
    }))
  );
}

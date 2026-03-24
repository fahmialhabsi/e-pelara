// services/exportService.js
const ExcelJS = require("exceljs");

/**
 * Generate dan kirim file Excel sebagai HTTP response.
 *
 * @param {object}   res        - Express response
 * @param {string}   filename   - Nama file tanpa ekstensi
 * @param {string}   sheetName  - Nama worksheet
 * @param {Array}    columns    - Array of { header, key, width? }
 * @param {Array}    data       - Array of row objects (key sesuai columns[].key)
 * @param {string}   [title]    - Judul laporan (opsional, ditampilkan di baris pertama)
 */
async function exportExcel(res, filename, sheetName, columns, data, title) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "e-PeLARA";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // Judul laporan (merged cell)
  if (title) {
    sheet.addRow([title]);
    const titleCell = sheet.getCell("A1");
    titleCell.font = { bold: true, size: 13, color: { argb: "FF1F4E79" } };
    titleCell.alignment = { horizontal: "left" };
    sheet.mergeCells(1, 1, 1, columns.length);
    sheet.addRow([]); // spacer
  }

  // Setup kolom
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 22,
  }));

  // Style header row
  const headerRowIndex = title ? 3 : 1;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 32;

  // Isi data
  data.forEach((row, index) => {
    const excelRow = sheet.addRow(row);
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }
    });
    excelRow.height = 22;
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(filename)}-${Date.now()}.xlsx"`,
  );

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { exportExcel };

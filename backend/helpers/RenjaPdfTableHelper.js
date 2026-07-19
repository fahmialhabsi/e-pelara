'use strict';
const {
  usableWidth,
  leftMargin,
  moveBelow,
  computeProportionalColWidths,
} = require('./RenjaPdfLayoutHelper');
const { PDF_THEME } = require('./RenjaPdfThemeHelper');

/**
 * ==========================================================
 * RenjaPdfTableHelper
 * ----------------------------------------------------------
 * Helper rendering tabel PDF untuk seluruh dokumen resmi.
 *
 * Digunakan oleh:
 * - planningOfficialDocumentEngine.js
 *
 * Tanggung jawab:
 * - Hitung tinggi baris
 * - Render grid table
 * - Parsing markdown table
 * - Render markdown → PDF
 *
 * Tidak mengandung business logic Renja/RKPD.
 * ==========================================================
 */

function computePdfRowHeight(
  pdf,
  cells,
  cols,
  fontSize,
  padding = PDF_THEME.CELL_PADDING_Y,
  minH = PDF_THEME.MIN_ROW_HEIGHT,
) {
  pdf.fontSize(fontSize);

  let maxH = minH;

  cells.forEach((cell, i) => {
    const h =
      pdf.heightOfString(String(cell), {
        width: cols[i] - PDF_THEME.CELL_PADDING_X * 2,
      }) +
      padding * 2;

    if (h > maxH) maxH = h;
  });

  return maxH;
}

function drawHorizontalLines(pdf, left, width, yStart, rowHeights, spans = []) {
  let y = yStart;

  // garis paling atas selalu penuh
  pdf
    .moveTo(left, y)
    .lineTo(left + width, y)
    .stroke();

  rowHeights.forEach((h) => {
    y += h;

    let segments = [[left, left + width]];

    spans.forEach((span) => {
      if (span.rowSpan > 1 && y > span.y1 && y < span.y2) {
        let x1 = left;

        for (let i = 0; i < span.col; i++) {
          x1 += span.cols[i];
        }

        let x2 = x1;

        for (let i = 0; i < span.colSpan; i++) {
          x2 += span.cols[span.col + i];
        }

        segments = segments.flatMap(([from, to]) => {
          if (x2 <= from || x1 >= to) {
            return [[from, to]];
          }

          const out = [];

          if (from < x1) out.push([from, x1]);

          if (x2 < to) out.push([x2, to]);

          return out;
        });
      }
    });

    segments.forEach(([from, to]) => {
      pdf.moveTo(from, y).lineTo(to, y).stroke();
    });
  });
}

function normalizeHeaderCell(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return {
      text: cell.text ?? '',
      align: cell.align ?? 'left',
      colSpan: cell.colSpan ?? 1,
      rowSpan: cell.rowSpan ?? 1,
    };
  }

  return {
    text: String(cell ?? ''),
    align: Array.isArray(opts?.aligns) ? opts.aligns[i] : 'left',
    colSpan: 1,
    rowSpan: 1,
  };
}

function normalizeHeaderCell(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return {
      text: cell.text ?? '',
      align: cell.align ?? 'left',
      colSpan: cell.colSpan ?? 1,
      rowSpan: cell.rowSpan ?? 1,
    };
  }

  return {
    text: String(cell ?? ''),
    align: 'left',
    colSpan: 1,
    rowSpan: 1,
  };
}

function normalizeBodyCell(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return {
      text: String(cell.text ?? ''),
      align: cell.align ?? 'left',
      colSpan: cell.colSpan ?? 1,
      rowSpan: cell.rowSpan ?? 1,
    };
  }

  return {
    text: String(cell ?? ''),
    align: 'left',
    colSpan: 1,
    rowSpan: 1,
  };
}

function computeHeaderTextY(pdf, cell, rowHeight, width, fontSize) {
  pdf.font(PDF_THEME.HEADER_FONT).fontSize(fontSize);

  const textHeight = pdf.heightOfString(cell.text, {
    width,
    align: cell.align,
  });

  return (rowHeight - textHeight) / 2 + PDF_THEME.CELL_PADDING_Y;
}

function computeBodyTextY(pdf, text, width, rowHeight, fontSize) {
  pdf.font(PDF_THEME.BODY_FONT).fontSize(fontSize);

  const h = pdf.heightOfString(String(text), {
    width,
  });

  return (rowHeight - h) / 2 + PDF_THEME.CELL_PADDING_Y;
}

function drawTableHeader(pdf, left, y, cols, headers, rowHeight, fontSize) {
  // Header background
  pdf
    .save()
    .rect(
      left,
      y,
      cols.reduce((a, b) => a + b, 0),
      rowHeight,
    )
    .fill(PDF_THEME.HEADER_FILL)
    .restore();

  let x = left;

  pdf.font(PDF_THEME.HEADER_FONT).fontSize(fontSize).fillColor(PDF_THEME.HEADER_TEXT);

  let colIndex = 0;

  headers.forEach((headerCell) => {
    if (headerCell == null) {
      // Sel ini ditutupi header rowSpan=2 dari baris sebelumnya — tetap harus
      // menggeser x & colIndex sebesar 1 kolom, jangan di-skip total, atau
      // header baris ke-2 (mis. "Lokasi", "Target Capaian Kinerja") akan
      // menumpuk di kiri alih-alih sejajar di bawah grup colSpan-nya.
      x += cols[colIndex] || 0;
      colIndex += 1;
      return;
    }

    const cell = normalizeHeaderCell(headerCell);

    let cellWidth = 0;

    for (let i = 0; i < cell.colSpan; i++) {
      cellWidth += cols[colIndex + i] || 0;
    }

    const textWidth = cellWidth - PDF_THEME.CELL_PADDING_X * 2;

    const textY = computeHeaderTextY(pdf, cell, rowHeight, textWidth, fontSize);

    pdf.text(cell.text, x + PDF_THEME.CELL_PADDING_X, y + textY, {
      width: cellWidth - PDF_THEME.CELL_PADDING_X * 2,
      align: cell.align,
    });

    x += cellWidth;
    colIndex += cell.colSpan;
  });

  // Kembalikan font default untuk isi tabel
  pdf.font(PDF_THEME.BODY_FONT);

  return y + rowHeight;
}

function drawTableRow(pdf, left, y, cols, row, rowHeight, fontSize) {
  let x = left;

  pdf.font(PDF_THEME.BODY_FONT).fontSize(fontSize).fillColor(PDF_THEME.BODY_TEXT);

  row.forEach((rawCell, i) => {
    const cell = normalizeBodyCell(rawCell);

    const value = cell.text.slice(0, 250);

    const textWidth = cols[i] - PDF_THEME.CELL_PADDING_X * 2;

    const textY = computeBodyTextY(pdf, value, textWidth, rowHeight, fontSize);

    pdf.text(value, x + PDF_THEME.CELL_PADDING_X, y + textY, {
      width: textWidth,
      align: cell.align,
    });

    x += cols[i];
  });

  return y + rowHeight;
}

function drawVerticalLines(pdf, left, yStart, cols, totalHeight, spans = []) {
  const xPositions = [left];

  let x = left;

  cols.forEach((w) => {
    x += w;
    xPositions.push(x);
  });

  const bottom = yStart + totalHeight;

  xPositions.forEach((lineX, index) => {
    // border kiri & kanan selalu penuh
    if (index === 0 || index === xPositions.length - 1) {
      pdf.moveTo(lineX, yStart).lineTo(lineX, bottom).stroke();
      return;
    }

    let segments = [[yStart, bottom]];

    spans.forEach((span) => {
      if (span.colSpan > 1 && index > span.col && index < span.col + span.colSpan) {
        segments = segments.flatMap(([from, to]) => {
          if (span.y2 <= from || span.y1 >= to) {
            return [[from, to]];
          }

          const out = [];

          if (from < span.y1) out.push([from, span.y1]);

          if (span.y2 < to) out.push([span.y2, to]);

          return out;
        });
      }
    });

    segments.forEach(([from, to]) => {
      pdf.moveTo(lineX, from).lineTo(lineX, to).stroke();
    });
  });
}

function normalizeHeaders(headers) {
  if (!Array.isArray(headers)) return [];

  if (!Array.isArray(headers[0])) {
    return [
      headers.map((h) =>
        typeof h === 'object'
          ? h
          : {
              text: String(h),
              colSpan: 1,
              rowSpan: 1,
            },
      ),
    ];
  }

  return headers.map((row) =>
    row.map((h) => {
      if (h == null) return null;

      if (typeof h === 'object') return h;

      return {
        text: String(h),
        colSpan: 1,
        rowSpan: 1,
      };
    }),
  );
}

function drawPdfGridTable(pdf, opts) {
  const { left, yStart, cols, headers, rows, fontSize = PDF_THEME.TABLE_FONT_SIZE } = opts;

  const pageBottom = pdf.page.height - pdf.page.margins.bottom;

  const tableWidth = cols.reduce((a, b) => a + b, 0);

  const headerRows = normalizeHeaders(headers);

  const headerHeights = headerRows.map((row) => {
    const normalized = row.filter(Boolean).map(normalizeHeaderCell);

    pdf.fontSize(fontSize);

    let maxH = PDF_THEME.MIN_ROW_HEIGHT;

    let colIndex = 0;

    normalized.forEach((cell) => {
      let width = 0;

      for (let i = 0; i < cell.colSpan; i++) {
        width += cols[colIndex + i] || 0;
      }

      const h =
        pdf.heightOfString(cell.text, {
          width: width - PDF_THEME.CELL_PADDING_X * 2,
        }) +
        PDF_THEME.CELL_PADDING_Y * 2;

      if (h > maxH) {
        maxH = h;
      }

      colIndex += cell.colSpan;
    });

    return maxH;
  });

  // -----------------------------------------------------
  // Bangun area merge header
  // Dipakai hanya untuk memutus garis vertikal
  // -----------------------------------------------------
  const spans = [];

  let headerY = yStart;

  headerRows.forEach((row, rowIndex) => {
    let col = 0;

    row.forEach((cell) => {
      if (cell == null) return;

      const h = normalizeHeaderCell(cell);

      if (h.colSpan > 1) {
        spans.push({
          row: rowIndex,
          col,
          colSpan: h.colSpan,
          rowSpan: h.rowSpan,
          cols,
          y1: headerY,
          y2: headerY + headerHeights[rowIndex],
        });
      }

      col += h.colSpan;
    });

    headerY += headerHeights[rowIndex];
  });

  let y = yStart;

  pdf.save();
  pdf.lineWidth(PDF_THEME.BORDER_WIDTH).strokeColor(PDF_THEME.BORDER);

  const totalHeaderHeight = headerHeights.reduce((a, b) => a + b, 0);

  const drawHeader = (startY = y) => {
    let currentY = startY;

    drawVerticalLines(pdf, left, startY, cols, totalHeaderHeight, spans);

    headerRows.forEach((headerRow, index) => {
      const rowHeight = headerHeights[index];

      drawHorizontalLines(pdf, left, tableWidth, currentY, [rowHeight], spans);

      drawTableHeader(pdf, left, currentY, cols, headerRow, rowHeight, fontSize);

      currentY += rowHeight;
    });

    return currentY;
  };

  y = drawHeader(y);

  rows.forEach((row) => {
    const rowHeight = computePdfRowHeight(pdf, row, cols, fontSize);

    if (y + rowHeight > pageBottom) {
      pdf.restore();

      pdf.addPage({
        layout: pdf.page.layout,
        size: 'A4',
        margin: PDF_THEME.PAGE_MARGIN,
      });

      pdf.save();
      pdf.lineWidth(PDF_THEME.BORDER_WIDTH);
      pdf.strokeColor(PDF_THEME.BORDER);

      y = drawHeader(pdf.page.margins.top);
    }

    drawHorizontalLines(pdf, left, tableWidth, y, [rowHeight]);

    drawVerticalLines(pdf, left, y, cols, rowHeight);

    drawTableRow(pdf, left, y, cols, row, rowHeight, fontSize);

    y += rowHeight;
  });

  pdf.restore();

  moveBelow(pdf, y + PDF_THEME.TABLE_SPACING);

  return y;
}

function parseMarkdownTablePdf(lines) {
  const tableLines = lines.filter(
    (l) => l.trim().startsWith('|') && !l.trim().match(/^\|[-| ]+\|$/),
  );

  if (tableLines.length < 2) return null;

  const parseRow = (line) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());

  return {
    headers: parseRow(tableLines[0]),
    rows: tableLines.slice(1).map(parseRow),
  };
}

function renderMarkdownToPdf(pdf, text) {
  const lines = String(text || '').split('\n');

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // -------------------------
    // TABLE
    // -------------------------
    if (line.trim().startsWith('|')) {
      const tableLines = [];

      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      const table = parseMarkdownTablePdf(tableLines);

      if (table) {
        const width = usableWidth(pdf);
        const left = leftMargin(pdf);

        const colWidths = computeProportionalColWidths(table.headers, table.rows, width);

        drawPdfGridTable(pdf, {
          left,
          yStart: pdf.y,
          cols: colWidths,
          headers: table.headers,
          rows: table.rows,
        });

        moveBelow(pdf, pdf.y + PDF_THEME.TABLE_SPACING);
      }

      continue;
    }

    // -------------------------
    // Blank line
    // -------------------------
    if (!line.trim()) {
      pdf.moveDown(0.4);
      i++;
      continue;
    }

    // -------------------------
    // Normal paragraph
    // -------------------------
    pdf
      .font(PDF_THEME.BODY_FONT)
      .fontSize(PDF_THEME.BODY_FONT_SIZE)
      .fillColor(PDF_THEME.BODY_TEXT)
      .text(line, {
        align: 'justify',
      });

    pdf.moveDown(0.2);

    i++;
  }
}

module.exports = {
  computePdfRowHeight,
  drawPdfGridTable,
  parseMarkdownTablePdf,
  renderMarkdownToPdf,
};

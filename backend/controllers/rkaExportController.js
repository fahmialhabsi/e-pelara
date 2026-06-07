const { Rka, RkaRincianBelanja } = require('../models');
const rkaEngine = require('../services/rkaEngine');
const ExcelJS = require('exceljs');
const docx = require('docx');
const puppeteer = require('puppeteer');

const {
  Document,
  Paragraph,
  TextRun,
  Table: WordTable,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  PageBreak,
  HeadingLevel,
} = docx;

// Helper: Format Rupiah untuk Logika Teks/HTML
const formatRupiah = (val) => {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('id-ID');
};

const getExportTotals = (engineResult) => ({
  totalBelanja: Number(engineResult?.totalsByLevel?.['5'] || 0),
  totalBelanjaOperasi: Number(engineResult?.totalsByLevel?.['5.1'] || 0),
  totalBelanjaModal: Number(engineResult?.totalsByLevel?.['5.2'] || 0),
  totalBelanjaTidakTerduga: Number(engineResult?.totalsByLevel?.['5.3'] || 0),
  totalBelanjaTransfer: Number(engineResult?.totalsByLevel?.['5.4'] || 0),
  total: Number(engineResult?.total || 0),
});

// Helper: Penarik data utama dari Database
async function fetchExportData(id) {
  const rka = await Rka.findByPk(id);
  if (!rka) throw new Error('Data RKA tidak ditemukan');

  const rincian = await RkaRincianBelanja.findAll({
    where: { rka_id: id },
    order: [['urutan', 'ASC']],
  });

  return { rka, rincian };
}

module.exports = {
  // ==========================================
  // 1. EXPORT EXCEL (USING EXCELJS)
  // ==========================================
  async exportExcel(req, res) {
    try {
      const { id } = req.params;
      const { rka } = await fetchExportData(id);
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const {
        totalBelanja,
        totalBelanjaOperasi,
        totalBelanjaModal,
        totalBelanjaTidakTerduga,
        totalBelanjaTransfer,
      } = getExportTotals(engineResult);
      const detailRows = engineResult.rows;
      const workbook = new ExcelJS.Workbook();

      const fontArial = { name: 'Arial', size: 10 };
      const fontArialBold = { name: 'Arial', size: 10, bold: true };
      const fontArialTitle = { name: 'Arial', size: 11, bold: true };
      const borderAll = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
      const defaultMargins = {
        top: 0.39,
        bottom: 0.39,
        left: 0.59,
        right: 0.39,
        header: 0.2,
        footer: 0.2,
      };
      const currencyFormat = '#,##0';
      const withSheetSetup = (ws, landscape = false) => {
        ws.pageSetup = {
          paperSize: 9,
          orientation: landscape ? 'landscape' : 'portrait',
          margins: defaultMargins,
        };
        ws.properties.defaultRowHeight = 18;
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
          if (!ws.getColumn(col).width)
            ws.getColumn(col).width = {
              A: 15,
              B: 45,
              C: 12,
              D: 12,
              E: 18,
              F: 18,
            }[col];
        });
      };

      const opdName = rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI';

      // --- SHEET 1: COVER ---
      const wsCover = workbook.addWorksheet('COVER');
      withSheetSetup(wsCover);
      wsCover.views = [{ showGridLines: false }];

      wsCover.mergeCells('A1:F1');
      wsCover.getCell('A1').value = 'RENCANA KERJA DAN ANGGARAN';
      wsCover.getCell('A1').font = fontArialTitle;
      wsCover.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCover.mergeCells('A2:F2');
      wsCover.getCell('A2').value = 'SATUAN KERJA PERANGKAT DAERAH';
      wsCover.getCell('A2').font = fontArialBold;
      wsCover.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCover.mergeCells('A3:F3');
      wsCover.getCell('A3').value = 'PEMERINTAH PROVINSI MALUKU UTARA';
      wsCover.getCell('A3').font = fontArialBold;
      wsCover.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCover.mergeCells('A4:F4');
      wsCover.getCell('A4').value = `TAHUN ANGGARAN ${rka.tahun}`;
      wsCover.getCell('A4').font = fontArialBold;
      wsCover.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCover.getCell('A6').value = 'URUSAN PEMERINTAHAN :';
      wsCover.getCell('B6').value = rka.urusan || '-';
      wsCover.getCell('A7').value = 'ORGANISASI :';
      wsCover.getCell('B7').value = opdName;
      ['A6', 'A7'].forEach((cell) => {
        wsCover.getCell(cell).font = fontArialBold;
        wsCover.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });
      ['B6', 'B7'].forEach((cell) => {
        wsCover.getCell(cell).font = fontArial;
        wsCover.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });

      wsCover.getCell('A9').value = 'Pengguna Anggaran :';
      wsCover.getCell('A9').font = fontArialBold;
      wsCover.getCell('A10').value = 'a. Nama';
      wsCover.getCell('B10').value = ': [Nama Pengguna Anggaran]';
      wsCover.getCell('A11').value = 'b. NIP';
      wsCover.getCell('B11').value = ': [NIP Pengguna Anggaran]';
      wsCover.getCell('A12').value = 'c. Jabatan';
      wsCover.getCell('B12').value = ': [Jabatan Pengguna Anggaran]';
      ['A10', 'A11', 'A12'].forEach((cell) => {
        wsCover.getCell(cell).font = fontArial;
        wsCover.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });
      ['B10', 'B11', 'B12'].forEach((cell) => {
        wsCover.getCell(cell).font = fontArial;
        wsCover.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });

      const coverTableRow = 15;
      wsCover.getCell(`A${coverTableRow}`).value = 'KODE';
      wsCover.getCell(`B${coverTableRow}`).value = 'NAMA FORMULIR';
      ['A', 'B'].forEach((col) => {
        const cell = wsCover.getCell(`${col}${coverTableRow}`);
        cell.font = fontArialBold;
        cell.fill = headerFill;
        cell.border = borderAll;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const matriksForm = [
        {
          kode: 'RKA-SKPD',
          nama: 'Ringkasan Anggaran Pendapatan, Belanja dan Pembiayaan Satuan Kerja Perangkat Daerah',
        },
        { kode: 'RKA-SKPD 1', nama: 'Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah' },
        {
          kode: 'RKA-SKPD 2.1',
          nama: 'Rincian Anggaran Belanja Operasi, Belanja Modal, Belanja Tidak Terduga, dan Belanja Transfer Satuan Kerja Perangkat Daerah',
        },
        {
          kode: 'RKA-SKPD 2.2',
          nama: 'Rekapitulasi Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        {
          kode: 'RKA-SKPD 2.2.1',
          nama: 'Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        { kode: 'RKA-SKPD 3.1', nama: 'Rincian Penerimaan Pembiayaan Daerah' },
        { kode: 'RKA-SKPD 3.2', nama: 'Rincian Pengeluaran Pembiayaan Daerah' },
      ];

      matriksForm.forEach((f, idx) => {
        const rowNum = coverTableRow + 1 + idx;
        wsCover.getCell(`A${rowNum}`).value = f.kode;
        wsCover.getCell(`B${rowNum}`).value = f.nama;
        wsCover.getCell(`A${rowNum}`).font = fontArial;
        wsCover.getCell(`B${rowNum}`).font = fontArial;
        wsCover.getCell(`A${rowNum}`).border = borderAll;
        wsCover.getCell(`B${rowNum}`).border = borderAll;
        wsCover.getCell(`A${rowNum}`).alignment = { horizontal: 'left', vertical: 'middle' };
        wsCover.getCell(`B${rowNum}`).alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true,
        };
      });

      // --- SHEET 2: RKA-SKPD (RINGKASAN REGULASI BARU) ---
      const wsRingkasan = workbook.addWorksheet('RKA-SKPD');
      withSheetSetup(wsRingkasan);
      wsRingkasan.views = [{ showGridLines: true }];

      wsRingkasan.mergeCells('D1:F1');
      wsRingkasan.getCell('D1').value = 'Formulir RKA-SKPD';
      wsRingkasan.getCell('D1').font = fontArialBold;
      wsRingkasan.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };

      wsRingkasan.mergeCells('A2:F2');
      wsRingkasan.getCell('A2').value = 'RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH';
      wsRingkasan.getCell('A2').font = fontArialTitle;
      wsRingkasan.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      wsRingkasan.getCell('A4').value = 'Urusan Pemerintahan :';
      wsRingkasan.getCell('B4').value = rka.urusan || '-';
      wsRingkasan.getCell('A5').value = 'Organisasi :';
      wsRingkasan.getCell('B5').value = opdName;
      ['A4', 'A5'].forEach((cell) => {
        wsRingkasan.getCell(cell).font = fontArialBold;
        wsRingkasan.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });
      ['B4', 'B5'].forEach((cell) => {
        wsRingkasan.getCell(cell).font = fontArial;
        wsRingkasan.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
      });

      const tableTitleRow = 7;
      wsRingkasan.mergeCells(`A${tableTitleRow}:F${tableTitleRow}`);
      wsRingkasan.getCell(`A${tableTitleRow}`).value =
        'Ringkasan Anggaran Pendapatan, Belanja dan Pembiayaan';
      wsRingkasan.getCell(`A${tableTitleRow}`).font = fontArialBold;
      wsRingkasan.getCell(`A${tableTitleRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      const headerRow = tableTitleRow + 1;
      wsRingkasan.getRow(headerRow).values = ['Kode Rekening', 'Uraian', 'Jumlah (Rp)'];
      wsRingkasan.getRow(headerRow).font = fontArialBold;
      wsRingkasan.getRow(headerRow).eachCell((c) => {
        c.fill = headerFill;
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      const numberRow = headerRow + 1;
      wsRingkasan.getRow(numberRow).values = ['1', '2', '3'];
      wsRingkasan.getRow(numberRow).font = fontArialBold;
      wsRingkasan.getRow(numberRow).eachCell((c) => {
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const ringkasanRows = [
        ['4', 'PENDAPATAN DAERAH', 0],
        ['5', 'BELANJA DAERAH', totalBelanja],
        ['5.1', '  BELANJA OPERASI', totalBelanjaOperasi],
        ['5.2', '  BELANJA MODAL', totalBelanjaModal],
        ['5.3', '  BELANJA TIDAK TERDUGA', totalBelanjaTidakTerduga],
        ['5.4', '  BELANJA TRANSFER', totalBelanjaTransfer],
      ];

      ringkasanRows.forEach((row, idx) => {
        const rNum = numberRow + 1 + idx;
        wsRingkasan.getRow(rNum).values = row;
        wsRingkasan.getRow(rNum).getCell(3).numFormat = currencyFormat;
        const isSub = row[0].includes('.') || row[1].startsWith('  ');
        wsRingkasan.getRow(rNum).font = isSub ? fontArial : fontArialBold;
        wsRingkasan.getRow(rNum).eachCell((c) => {
          const colLetter = c.address.replace(/[0-9]/g, '');
          c.border = borderAll;
          c.alignment = { horizontal: colLetter === 'C' ? 'right' : 'left', vertical: 'middle' };
        });
      });

      const footerStart = numberRow + 1 + ringkasanRows.length;
      const footers = [
        ['', 'SURPLUS/(DEFISIT)', -totalBelanja],
        ['', 'Pembiayaan Neto', 0],
        ['', 'SILPA', 0],
      ];

      footers.forEach((row, idx) => {
        const rNum = footerStart + idx;
        wsRingkasan.getRow(rNum).values = row;
        wsRingkasan.getRow(rNum).getCell(3).numFormat = currencyFormat;
        wsRingkasan.getRow(rNum).font = fontArialBold;
        wsRingkasan.getRow(rNum).eachCell((c) => {
          const colLetter = c.address.replace(/[0-9]/g, '');
          c.border = borderAll;
          c.alignment = { horizontal: colLetter === 'C' ? 'right' : 'left', vertical: 'middle' };
        });
      });

      const signStart = footerStart + footers.length + 2;
      wsRingkasan.getCell(`D${signStart}`).value = 'Ternate, 02 Juni 2026';
      wsRingkasan.getCell(`D${signStart + 1}`).value = 'Mengesahkan';
      wsRingkasan.getCell(`D${signStart + 2}`).value = 'Pejabat Pengelola Keuangan Daerah';
      wsRingkasan.getCell(`D${signStart + 5}`).value = '( ___________________________ )';
      ['D', 'E', 'F'].forEach((col) => {
        [signStart, signStart + 1, signStart + 2, signStart + 5].forEach((row) => {
          const cell = wsRingkasan.getCell(`${col}${row}`);
          cell.font = fontArialBold;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // --- SHEET 3: RKA-SKPD 1 (RINCIAN PENDAPATAN REGULASI BARU) ---
      const ws1 = workbook.addWorksheet('RKA-SKPD 1');
      ws1.views = [{ showGridLines: true }];

      ws1.getRow(1).values = [
        'Kode Rekening',
        'Uraian',
        'Rincian Perhitungan',
        '',
        '',
        'Jumlah (Rp)',
      ];
      ws1.getRow(2).values = ['', '', 'Volume', 'Satuan', 'Tarif', ''];

      ws1.mergeCells('A1:A2');
      ws1.mergeCells('B1:B2');
      ws1.mergeCells('C1:E1');
      ws1.mergeCells('F1:F2');

      [1, 2].forEach((rNum) => {
        ws1.getRow(rNum).font = fontArialBold;
        ws1.getRow(rNum).eachCell((c) => {
          c.fill = headerFill;
          c.border = borderAll;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const pendapatanRows = [
        ['4', 'PENDAPATAN DAERAH', '', '', '', 0],
        ['4.1', '  PENDAPATAN ASLI DAERAH (PAD)', '', '', '', 0],
        ['4.2', '  PENDAPATAN TRANSFER', '', '', '', 0],
        ['4.3', '  LAIN-LAIN PENDAPATAN DAERAH YANG SAH', '', '', '', 0],
        ['', 'JUMLAH TOTAL PENDAPATAN', '', '', '', 0],
      ];

      pendapatanRows.forEach((row, idx) => {
        const rNum = 3 + idx;
        ws1.getRow(rNum).values = row;
        ws1.getRow(rNum).getCell(6).numFormat = '#,##0';

        const isSub = row[0].includes('.') || row[1].startsWith('  ');
        ws1.getRow(rNum).font = isSub ? fontArial : fontArialBold;
        ws1.getRow(rNum).eachCell((c) => (c.border = borderAll));
      });

      // --- SHEET 4: RKA-SKPD 2.1 (RINCIAN STRUKTUR BELANJA PERMENDAGRI 77) ---
      const ws21 = workbook.addWorksheet('RKA-SKPD 2.1');
      ws21.views = [{ showGridLines: true }];

      ws21.getRow(1).values = [
        'Kode Rekening',
        'Uraian',
        'Rincian Perhitungan',
        '',
        '',
        'Jumlah (Rp)',
        'Tahun N+1',
      ];
      ws21.getRow(2).values = ['', '', 'Volume', 'Satuan', 'Harga Satuan', '', ''];

      ws21.mergeCells('A1:A2');
      ws21.mergeCells('B1:B2');
      ws21.mergeCells('C1:E1');
      ws21.mergeCells('F1:F2');
      ws21.mergeCells('G1:G2');

      [1, 2].forEach((rNum) => {
        ws21.getRow(rNum).font = fontArialBold;
        ws21.getRow(rNum).eachCell((c) => {
          c.fill = headerFill;
          c.border = borderAll;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const belanjaStrukturRows = [
        ['5', 'BELANJA DAERAH', '', '', '', totalBelanja, 0],
        ['5.1', '  BELANJA OPERASI', '', '', '', totalBelanjaOperasi, 0],
        ['5.2', '  BELANJA MODAL', '', '', '', totalBelanjaModal, 0],
        ['5.3', '  BELANJA TIDAK TERDUGA', '', '', '', totalBelanjaTidakTerduga, 0],
        ['5.4', '  BELANJA TRANSFER', '', '', '', totalBelanjaTransfer, 0],
        ['', 'JUMLAH TOTAL BELANJA', '', '', '', totalBelanja, 0],
      ];

      belanjaStrukturRows.forEach((row, idx) => {
        const rNum = 3 + idx;
        ws21.getRow(rNum).values = row;
        ws21.getRow(rNum).getCell(6).numFormat = '#,##0';
        ws21.getRow(rNum).getCell(7).numFormat = '#,##0';

        const isSub = row[0].includes('.') || row[1].startsWith('  ');
        ws21.getRow(rNum).font = isSub ? fontArial : fontArialBold;
        ws21.getRow(rNum).eachCell((c) => (c.border = borderAll));
      });

      // --- SHEET 5: RKA-SKPD 2.2 (REKAPITULASI PROGRAM, KEGIATAN & SUB-KEGIATAN) ---
      const ws22 = workbook.addWorksheet('RKA-SKPD 2.2');
      ws22.views = [{ showGridLines: true }];

      ws22.getRow(1).values = [
        'Kode',
        'Uraian',
        'Lokasi',
        'Target Kinerja',
        'Alokasi Anggaran (Rp)',
        '',
        'Prakiraan Maju',
      ];
      ws22.getRow(2).values = [
        '',
        '',
        'Kegiatan',
        'Kuantitatif',
        'Tahun N-1',
        'Tahun N',
        'Tahun N+1',
      ];

      ws22.mergeCells('A1:A2');
      ws22.mergeCells('B1:B2');
      ws22.mergeCells('C1:C2');
      ws22.mergeCells('D1:D2');
      ws22.mergeCells('E1:F1');
      ws22.mergeCells('G1:G2');

      [1, 2].forEach((rNum) => {
        ws22.getRow(rNum).font = fontArialBold;
        ws22.getRow(rNum).eachCell((c) => {
          c.fill = headerFill;
          c.border = borderAll;
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
      });

      const rekapRows = [
        [
          '1.01',
          'PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH',
          'Kota Sofifi',
          '100%',
          0,
          totalBelanja,
          0,
        ],
        [
          '1.01.01',
          '  Kegiatan Administrasi Keuangan Perangkat Daerah',
          'Kota Sofifi',
          '1 Layanan',
          0,
          totalBelanja,
          0,
        ],
        [
          '1.01.01.2.02',
          '    Sub-Kegiatan Penyediaan Gaji dan Tunjangan ASN',
          'Kota Sofifi',
          '12 Bulan',
          0,
          totalBelanja,
          0,
        ],
        ['', 'JUMLAH TOTAL', '', '', 0, totalBelanja, 0],
      ];

      rekapRows.forEach((row, idx) => {
        const rNum = 3 + idx;
        ws22.getRow(rNum).values = row;
        ws22.getRow(rNum).getCell(5).numFormat = '#,##0';
        ws22.getRow(rNum).getCell(6).numFormat = '#,##0';
        ws22.getRow(rNum).getCell(7).numFormat = '#,##0';

        if (row[0] === '' || !row[0].includes('.')) {
          ws22.getRow(rNum).font = fontArialBold;
        } else {
          const dots = row[0].split('.').length - 1;
          ws22.getRow(rNum).font = dots === 1 ? fontArialBold : fontArial;
        }
        ws22.getRow(rNum).eachCell((c) => (c.border = borderAll));
      });

      // --- SHEET 6: RKA-SKPD 2.2.1 (RINCIAN BELANJA SUB-KEGIATAN - KODE BARU 7 KOLOM) ---
      const ws221 = workbook.addWorksheet('RKA-SKPD 2.2.1');
      ws221.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        margins: defaultMargins,
      };
      ws221.properties.defaultRowHeight = 18;

      // Definisikan lebar eksplisit untuk 7 kolom (A-G)
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
        ws221.getColumn(col).width = {
          A: 15, // Kode Rekening
          B: 35, // Uraian
          C: 12, // Koefisien / Volume
          D: 10, // Satuan
          E: 15, // Harga Satuan
          F: 8, // PPN
          G: 18, // Jumlah Rp
        }[col];
      });
      ws221.views = [{ showGridLines: true }];

      ws221.mergeCells('E1:G1');
      ws221.getCell('E1').value = 'Formulir RKA-SKPD 2.2.1';
      ws221.getCell('E1').font = fontArialBold;
      ws221.getCell('E1').alignment = { horizontal: 'right', vertical: 'middle' };

      ws221.mergeCells('A2:G2');
      ws221.getCell('A2').value = 'RINCIAN BELANJA SUB-KEGIATAN';
      ws221.getCell('A2').font = fontArialTitle;
      ws221.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      const belanja221 = totalBelanja;
      const lokasiKegiatan = detailRows && detailRows[0] ? detailRows[0].lokasi || '-' : '-';
      const metaRows = [
        ['Urusan Pemerintahan', rka.urusan || '-'],
        ['Organisasi', opdName],
        ['Program', rka.program || '-'],
        ['Kegiatan', rka.kegiatan || '-'],
        ['Lokasi Kegiatan', lokasiKegiatan],
        ['Sub-Kegiatan', rka.sub_kegiatan || '-'],
      ];

      metaRows.forEach((item, idx) => {
        const row = 3 + idx;
        ws221.getCell(`A${row}`).value = `${item[0]} :`;
        ws221.getCell(`B${row}`).value = item[1];
        ws221.getCell(`A${row}`).font = fontArialBold;
        ws221.getCell(`B${row}`).font = fontArial;
        ws221.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
        ws221.getCell(`B${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
      });

      const yearRowStart = 3 + metaRows.length;
      ws221.getCell(`A${yearRowStart}`).value = 'Jumlah Tahun N-1 :';
      ws221.getCell(`B${yearRowStart}`).value = 0; // Bersih dari error
      ws221.getCell(`A${yearRowStart + 1}`).value = 'Jumlah Tahun N :';
      ws221.getCell(`B${yearRowStart + 1}`).value = belanja221;
      ws221.getCell(`A${yearRowStart + 2}`).value = 'Jumlah Tahun N+1 :';
      ws221.getCell(`B${yearRowStart + 2}`).value = 0;
      [yearRowStart, yearRowStart + 1, yearRowStart + 2].forEach((row) => {
        ws221.getCell(`A${row}`).font = fontArialBold;
        ws221.getCell(`B${row}`).font = fontArial;
        ws221.getCell(`B${row}`).numFormat = currencyFormat;
      });

      const indikatorStart = yearRowStart + 4;
      ws221.getCell(`A${indikatorStart}`).value = 'INDIKATOR & TOLOK UKUR KINERJA BELANJA LANGSUNG';
      ws221.getCell(`A${indikatorStart}`).font = fontArialBold;

      const indikatorHeader = indikatorStart + 1;
      ws221.mergeCells(`A${indikatorHeader}:B${indikatorHeader}`);
      ws221.mergeCells(`C${indikatorHeader}:E${indikatorHeader}`);
      ws221.mergeCells(`F${indikatorHeader}:G${indikatorHeader}`);

      ws221.getCell(`A${indikatorHeader}`).value = 'Jenis Indikator';
      ws221.getCell(`C${indikatorHeader}`).value = 'Tolok Ukur Kinerja';
      ws221.getCell(`F${indikatorHeader}`).value = 'Target Kinerja';
      ws221.getRow(indikatorHeader).font = fontArialBold;
      ws221.getRow(indikatorHeader).eachCell((c) => {
        c.fill = headerFill;
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const indikatorRows = [
        ['Capaian Program', '[Kriteria Capaian Program]', '[Target Capaian]'],
        ['Masukan', 'Dana yang dibutuhkan', `Rp ${Number(totalBelanja).toLocaleString('id-ID')}`],
        ['Keluaran', '[Output yang Diharapkan]', '[Target Volume]'],
        ['Hasil', '[Outcome/Manfaat]', '[Target Hasil %]'],
      ];

      indikatorRows.forEach((rowData, idx) => {
        const rowNumber = indikatorHeader + 1 + idx;
        ws221.mergeCells(`A${rowNumber}:B${rowNumber}`);
        ws221.mergeCells(`C${rowNumber}:E${rowNumber}`);
        ws221.mergeCells(`F${rowNumber}:G${rowNumber}`);

        ws221.getCell(`A${rowNumber}`).value = rowData[0];
        ws221.getCell(`C${rowNumber}`).value = rowData[1];
        ws221.getCell(`F${rowNumber}`).value = rowData[2];

        ws221.getRow(rowNumber).font = fontArial;
        ws221.getRow(rowNumber).eachCell((c) => {
          c.border = borderAll;
          c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        });
      });

      const sasaranRow = indikatorHeader + indikatorRows.length + 2;
      ws221.getCell(`A${sasaranRow}`).value =
        'Kelompok Sasaran Kegiatan : Masyarakat / Internal Perangkat Daerah';
      ws221.getCell(`A${sasaranRow}`).font = fontArialBold;

      const detailTableTitleRow = sasaranRow + 2;
      ws221.getCell(`A${detailTableTitleRow}`).value = 'Tabel Rincian Anggaran Belanja';
      ws221.getCell(`A${detailTableTitleRow}`).font = fontArialBold;

      const detailTableHeaderRow = detailTableTitleRow + 1;
      ws221.getRow(detailTableHeaderRow).values = [
        'Kode Rekening',
        'Uraian',
        'Koefisien / Volume',
        'Satuan',
        'Harga Satuan',
        'PPN',
        'Jumlah (Rp)',
      ];
      ws221.getRow(detailTableHeaderRow).font = fontArialBold;
      ws221.getRow(detailTableHeaderRow).eachCell((c) => {
        c.fill = headerFill;
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      const detailTableNumberRow = detailTableHeaderRow + 1;
      ws221.getRow(detailTableNumberRow).values = ['1', '2', '3', '4', '5', '6', '7'];
      ws221.getRow(detailTableNumberRow).font = fontArialBold;
      ws221.getRow(detailTableNumberRow).eachCell((c) => {
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const detailStart = detailTableNumberRow + 1;
      if (!detailRows || detailRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada data rincian belanja dari engine calculation',
        });
      }

      detailRows.forEach((item, idx) => {
        const rowNum = detailStart + idx;
        ws221.getRow(rowNum).values = [
          item.kode_rekening || '-',
          item.uraian || item.nama_rekening || '-',
          item.volume !== null && item.volume !== undefined ? Number(item.volume) : 0,
          item.satuan || '-',
          item.harga_satuan ? Number(item.harga_satuan) : 0,
          item.ppn ? `${item.ppn}%` : '0%',
          item.jumlah ? Number(item.jumlah) : 0,
        ];
        ws221.getRow(rowNum).font = fontArial;
        ws221.getRow(rowNum).eachCell((c) => {
          c.border = borderAll;
          const colLetter = c.address.replace(/[0-9]/g, '');
          c.alignment = {
            horizontal: ['C', 'E', 'G'].includes(colLetter)
              ? 'right'
              : colLetter === 'D' || colLetter === 'F'
                ? 'center'
                : 'left',
            vertical: 'middle',
            wrapText: true,
          };
        });
        ws221.getRow(rowNum).getCell(3).numFormat = '#,##0';
        ws221.getRow(rowNum).getCell(5).numFormat = currencyFormat;
        ws221.getRow(rowNum).getCell(7).numFormat = currencyFormat;
      });

      const totalRow = detailStart + detailRows.length;
      // Memperbaiki variable totalRincian menjadi totalBelanja hasil destructuring aman
      ws221.getRow(totalRow).values = ['', 'JUMLAH TOTAL', '', '', '', '', totalBelanja];
      ws221.getRow(totalRow).font = fontArialBold;
      ws221.getRow(totalRow).eachCell((c) => {
        c.border = borderAll;
        const colLetter = c.address.replace(/[0-9]/g, '');
        c.alignment = { horizontal: colLetter === 'G' ? 'right' : 'left', vertical: 'middle' };
      });
      ws221.getRow(totalRow).getCell(7).numFormat = currencyFormat;

      const signRow = totalRow + 3;
      ws221.getCell(`E${signRow}`).value = 'Ternate, 02 Juni 2026';
      ws221.getCell(`E${signRow + 1}`).value = 'Mengesahkan';
      ws221.getCell(`E${signRow + 2}`).value = 'Pejabat Pengelola Keuangan Daerah';
      ws221.getCell(`E${signRow + 5}`).value = '( ___________________________ )';
      ['E', 'F', 'G'].forEach((col) => {
        [signRow, signRow + 1, signRow + 2, signRow + 5].forEach((row) => {
          const cell = ws221.getCell(`${col}${row}`);
          cell.font = fontArialBold;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const keteranganRow = signRow + 7;
      ws221.getCell(`A${keteranganRow}`).value = 'Keterangan :';
      ws221.getCell(`A${keteranganRow + 1}`).value = 'Tanggal Pembahasan :';
      ws221.getCell(`A${keteranganRow + 2}`).value = 'Catatan :';
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
        [keteranganRow, keteranganRow + 1, keteranganRow + 2].forEach((row) => {
          const cell = ws221.getCell(`${col}${row}`);
          if (col === 'A') {
            cell.font = fontArialBold;
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.font = fontArial;
          }
          cell.border = borderAll;
        });
      });

      const timHeaderRow = keteranganRow + 4;
      ws221.getRow(timHeaderRow).values = ['No', 'Nama', 'NIP', 'Jabatan', 'Tandatangan', '', ''];
      ws221.mergeCells(`E${timHeaderRow}:G${timHeaderRow}`);
      ws221.getRow(timHeaderRow).font = fontArialBold;
      ws221.getRow(timHeaderRow).eachCell((c) => {
        c.fill = headerFill;
        c.border = borderAll;
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      for (let i = 1; i <= 3; i += 1) {
        const rowIndex = timHeaderRow + i;
        ws221.getRow(rowIndex).values = [i, '', '', '', '', '', ''];
        ws221.mergeCells(`E${rowIndex}:G${rowIndex}`);
        ws221.getRow(rowIndex).eachCell((c) => {
          c.border = borderAll;
          c.font = fontArial;
          c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
      }

      // --- SHEET 7: RKA-SKPD 3.1 (PENERIMAAN PEMBIAYAAN PERMENDAGRI 77) ---
      const ws31 = workbook.addWorksheet('RKA-SKPD 3.1');
      ws31.views = [{ showGridLines: true }];

      ws31.getCell('A1').value =
        `Urusan Pemerintahan : ${rka.urusan || '1.07 Urusan Pemerintahan Bidang Perhubungan'}`;
      ws31.getCell('A2').value =
        `Bidang Urusan       : ${rka.bidang_urusan || '1.07.01 Bidang Urusan Perhubungan'}`;
      ws31.getCell('A3').value = `Program             : ${rka.program}`;
      ws31.getCell('A4').value = `Kegiatan            : ${rka.kegiatan}`;
      ws31.getCell('A5').value = `Sub-Kegiatan        : ${rka.sub_kegiatan}`;
      ws31.getCell('A6').value = `Organisasi          : ${opdName}`;

      ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach((c) => (ws31.getCell(c).font = fontArialBold));

      ws31.getCell('A8').value = 'RINCIAN PENERIMAAN PEMBIAYAAN';
      ws31.getCell('A8').font = fontArialBold;

      ws31.getRow(9).values = ['Kode Rekening', 'Uraian', 'Jumlah (Rp)'];
      ws31.getRow(10).values = ['1', '2', '3'];

      [9, 10].forEach((rNum) => {
        ws31.getRow(rNum).font = fontArialBold;
        ws31.getRow(rNum).eachCell((c) => {
          c.fill = headerFill;
          c.border = borderAll;
          c.alignment = { horizontal: 'center' };
        });
      });

      const pembiayaanRows31 = [
        ['6', 'PENERIMAAN PEMBIAYAAN', 0],
        ['6.1', '  SISA LEBIH PERHITUNGAN ANGGARAN TAHUN SEBELUMNYA (SiLPA)', 0],
        ['', 'JUMLAH PENERIMAAN PEMBIAYAAN', 0],
      ];

      pembiayaanRows31.forEach((row, idx) => {
        const rNum = 11 + idx;
        ws31.getRow(rNum).values = row;
        ws31.getRow(rNum).getCell(3).numFormat = '#,##0';
        const isSub = row[0].includes('.') || row[1].startsWith('  ');
        ws31.getRow(rNum).font = isSub ? fontArial : fontArialBold;
        ws31.getRow(rNum).eachCell((c) => (c.border = borderAll));
      });

      // --- SHEET 8: RKA-SKPD 3.2 (PENGELUARAN PEMBIAYAAN PERMENDAGRI 77) ---
      const ws32 = workbook.addWorksheet('RKA-SKPD 3.2');
      ws32.views = [{ showGridLines: true }];

      ws32.getCell('A1').value =
        `Urusan Pemerintahan : ${rka.urusan || '1.07 Urusan Pemerintahan Bidang Perhubungan'}`;
      ws32.getCell('A2').value =
        `Bidang Urusan       : ${rka.bidang_urusan || '1.07.01 Bidang Urusan Perhubungan'}`;
      ws32.getCell('A3').value = `Program             : ${rka.program}`;
      ws32.getCell('A4').value = `Kegiatan            : ${rka.kegiatan}`;
      ws32.getCell('A5').value = `Sub-Kegiatan        : ${rka.sub_kegiatan}`;
      ws32.getCell('A6').value = `Organisasi          : ${opdName}`;

      ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach((c) => (ws32.getCell(c).font = fontArialBold));

      ws32.getCell('A8').value = 'RINCIAN PENGELUARAN PEMBIAYAAN DAERAH';
      ws32.getCell('A8').font = fontArialBold;

      ws32.getRow(9).values = ['Kode Rekening', 'Uraian', 'Jumlah (Rp)'];
      ws32.getRow(10).values = ['1', '2', '3'];

      [9, 10].forEach((rNum) => {
        ws32.getRow(rNum).font = fontArialBold;
        ws32.getRow(rNum).eachCell((c) => {
          c.fill = headerFill;
          c.border = borderAll;
          c.alignment = { horizontal: 'center' };
        });
      });

      const pembiayaanRows32 = [
        ['6.2', 'PENGELUARAN PEMBIAYAAN', 0],
        ['6.2.1', '  Pembentukan Dana Cadangan', 0],
        ['6.2.2', '  Penyertaan Modal Daerah', 0],
        ['6.2.3', '  Pembayaran Cicilan Pokok Utang yang Jatuh Tempo', 0],
        ['6.2.4', '  Pemberian Pinjaman Daerah', 0],
        ['', 'JUMLAH PENGELUARAN PEMBIAYAAN', 0],
      ];

      pembiayaanRows32.forEach((row, idx) => {
        const rNum = 11 + idx;
        ws32.getRow(rNum).values = row;
        ws32.getRow(rNum).getCell(3).numFormat = '#,##0';
        const isSub =
          (row[0].includes('.') && row[0].split('.').length > 2) || row[1].startsWith('  ');
        ws32.getRow(rNum).font = isSub ? fontArial : fontArialBold;
        ws32.getRow(rNum).eachCell((c) => (c.border = borderAll));
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=RKA_${id}_${rka.tahun}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // 2. EXPORT WORD (USING DOCX LIBRARY)
  // ==========================================
  async exportWord(req, res) {
    try {
      const { id } = req.params;
      const { rka } = await fetchExportData(id);
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const {
        totalBelanja,
        totalBelanjaOperasi,
        totalBelanjaModal,
        totalBelanjaTidakTerduga,
        totalBelanjaTransfer,
        total,
      } = getExportTotals(engineResult);
      const detailRows = engineResult.rows;
      const sections = [];

      const textPara = (text, isBold = false, heading = undefined) =>
        new Paragraph({
          children: [new TextRun({ text, bold: isBold, font: 'Times New Roman', size: 22 })],
          heading: heading,
          alignment: AlignmentType.CENTER,
        });

      const cellPara = (text, isBold = false, align = AlignmentType.LEFT) =>
        new Paragraph({
          children: [
            new TextRun({
              text: String(text || ''),
              bold: isBold,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
          alignment: align,
        });

      const wordBorder = {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      };

      // --- SECTION 1: COVER ---
      const coverTableRows = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('KODE', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('NAMA FORMULIR', true, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      const listFormulir = [
        {
          k: 'RKA-SKPD',
          n: 'Ringkasan Anggaran Pendapatan, Belanja dan Pembiayaan Satuan Kerja Perangkat Daerah',
        },
        { k: 'RKA-SKPD 1', n: 'Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah' },
        {
          k: 'RKA-SKPD 2.1',
          n: 'Rincian Anggaran Belanja Operasi, Belanja Modal, Belanja Tidak Terduga, dan Belanja Transfer Satuan Kerja Perangkat Daerah',
        },
        {
          k: 'RKA-SKPD 2.2',
          n: 'Rekapitulasi Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        {
          k: 'RKA-SKPD 2.2.1',
          n: 'Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        { k: 'RKA-SKPD 3.1', n: 'Rincian Penerimaan Pembiayaan Daerah' },
        { k: 'RKA-SKPD 3.2', n: 'Rincian Pengeluaran Pembiayaan Daerah' },
      ];

      listFormulir.forEach((item) => {
        coverTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.k, false, AlignmentType.CENTER)],
              }),
              new TableCell({ borders: wordBorder, children: [cellPara(item.n)] }),
            ],
          }),
        );
      });

      sections.push({
        properties: {},
        children: [
          textPara('PEMERINTAH PROVINSI MALUKU UTARA', true),
          textPara('RENCANA ANGGARAN DAERAH', true),
          textPara('SATUAN KERJA PERANGKAT DAERAH', true),
          textPara('(RKA-SKPD)', true),
          textPara(`TAHUN ANGGARAN ${rka.tahun}`, true),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `URUSAN PEMERINTAHAN\t: ${rka.program}`,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `ORGANISASI\t\t\t: ${rka.opd_penanggung_jawab || 'DINAS PANGAN'}`,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Pengguna Anggaran :', bold: true, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'a. Nama\t: [Nama Pengguna Anggaran]', font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'b. NIP\t\t: [NIP Pengguna Anggaran]', font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'c. Jabatan\t: [Jabatan Pengguna Anggaran]',
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new WordTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: coverTableRows }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 2: RKA-SKPD (RINGKASAN REGULASI BARU) ---
      const ringkasanData = [
        { k: '4', u: 'PENDAPATAN DAERAH', j: '0', b: true },
        { k: '5', u: 'BELANJA DAERAH', j: formatRupiah(totalBelanja), b: true },
        { k: '5.1', u: '  BELANJA OPERASI', j: formatRupiah(totalBelanjaOperasi), b: false },
        { k: '5.2', u: '  BELANJA MODAL', j: formatRupiah(totalBelanjaModal), b: false },
        {
          k: '5.3',
          u: '  BELANJA TIDAK TERDUGA',
          j: formatRupiah(totalBelanjaTidakTerduga),
          b: false,
        },
        { k: '5.4', u: '  BELANJA TRANSFER', j: formatRupiah(totalBelanjaTransfer), b: false },
        { k: '', u: 'SURPLUS / (DEFISIT)', j: `-${formatRupiah(totalBelanja)}`, b: true },
        { k: '6', u: 'PEMBIAYAAN DAERAH', j: '0', b: true },
        { k: '6.1', u: '  PENERIMAAN PEMBIAYAAN', j: '0', b: false },
        { k: '6.2', u: '  PENGELUARAN PEMBIAYAAN', j: '0', b: false },
        { k: '', u: 'PEMBIAYAAN NETTO', j: '0', b: true },
        { k: '', u: 'SISA LEBIH PEMBIAYAAN ANGGARAN TAHUN BERJALAN (SILPA)', j: '0', b: true },
      ];

      const ringkasanRowsList = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Kode Rekening', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Uraian', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Jumlah (Rp)', true, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      ringkasanData.forEach((row) => {
        ringkasanRowsList.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.k, row.b, AlignmentType.CENTER)],
              }),
              new TableCell({ borders: wordBorder, children: [cellPara(row.u, row.b)] }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.j, row.b, AlignmentType.RIGHT)],
              }),
            ],
          }),
        );
      });

      const tableRingkasan = new WordTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: ringkasanRowsList,
      });

      sections.push({
        children: [
          textPara('RINGKASAN ANGGARAN PENDAPATAN, BELANJA DAN PEMBIAYAAN', true),
          textPara('SATUAN KERJA PERANGKAT DAERAH (RKA-SKPD)', true),
          new Paragraph({ text: '' }),
          tableRingkasan,
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Ternate, 02 Juni 2026', font: 'Times New Roman', bold: true }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Kepala SKPD / Pengguna Anggaran\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 2A: RKA-SKPD 1 (RINCIAN PENDAPATAN DAERAH REGULASI BARU) ---
      const pendapatanData = [
        { k: '4', u: 'PENDAPATAN DAERAH', v: '', s: '', t: '', j: '0', b: true },
        { k: '4.1', u: '  PENDAPATAN ASLI DAERAH (PAD)', v: '', s: '', t: '', j: '0', b: true },
        { k: '4.2', u: '  PENDAPATAN TRANSFER', v: '', s: '', t: '', j: '0', b: true },
        {
          k: '4.3',
          u: '  LAIN-LAIN PENDAPATAN DAERAH YANG SAH',
          v: '',
          s: '',
          t: '',
          j: '0',
          b: true,
        },
        { k: '', u: 'JUMLAH TOTAL PENDAPATAN', v: '', s: '', t: '', j: '0', b: true },
      ];

      const pendapatanRowsList = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Kode Rekening', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Uraian', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Volume', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Satuan', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Tarif', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Jumlah (Rp)', true, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      pendapatanData.forEach((row) => {
        pendapatanRowsList.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.k, row.b, AlignmentType.CENTER)],
              }),
              new TableCell({ borders: wordBorder, children: [cellPara(row.u, row.b)] }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.v, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.s, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.t, false, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.j, row.b, AlignmentType.RIGHT)],
              }),
            ],
          }),
        );
      });

      sections.push({
        children: [
          textPara('RINCIAN ANGGARAN PENDAPATAN SATUAN KERJA PERANGKAT DAERAH', true),
          textPara('FORMULIR RKA-SKPD 1', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: pendapatanRowsList,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 2B: RKA-SKPD 2.1 (RINCIAN ANGGARAN BELANJA STRUKTUR BARU) ---
      const belanjaData21 = [
        {
          k: '5',
          u: 'BELANJA DAERAH',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanja),
          n1: '0',
          b: true,
        },
        {
          k: '5.1',
          u: '  BELANJA OPERASI',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanjaOperasi),
          n1: '0',
          b: false,
        },
        {
          k: '5.2',
          u: '  BELANJA MODAL',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanjaModal),
          n1: '0',
          b: false,
        },
        {
          k: '5.3',
          u: '  BELANJA TIDAK TERDUGA',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanjaTidakTerduga),
          n1: '0',
          b: false,
        },
        {
          k: '5.4',
          u: '  BELANJA TRANSFER',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanjaTransfer),
          n1: '0',
          b: false,
        },
        {
          k: '',
          u: 'JUMLAH TOTAL BELANJA',
          v: '',
          s: '',
          h: '',
          n: formatRupiah(totalBelanja),
          n1: '0',
          b: true,
        },
      ];

      const belanjaRowsList21 = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Kode Rekening', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Uraian', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Volume', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Satuan', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Harga Satuan', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Jumlah (Rp)', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Tahun N+1', true, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      belanjaData21.forEach((row) => {
        belanjaRowsList21.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.k, row.b, AlignmentType.CENTER)],
              }),
              new TableCell({ borders: wordBorder, children: [cellPara(row.u, row.b)] }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.v, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.s, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.h, false, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.n, row.b, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.n1, row.b, AlignmentType.RIGHT)],
              }),
            ],
          }),
        );
      });

      sections.push({
        children: [
          textPara(
            'RINCIAN ANGGARAN BELANJA OPERASI, BELANJA MODAL, BELANJA TIDAK TERDUGA, DAN BELANJA TRANSFER',
            true,
          ),
          textPara('SATUAN KERJA PERANGKAT DAERAH (FORMULIR RKA-SKPD 2.1)', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: belanjaRowsList21,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 2C: RKA-SKPD 2.2 (REKAPITULASI PROGRAM DAN KEGIATAN) ---
      const rekapData22 = [
        {
          k: '1.01',
          u: 'PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH',
          l: 'Kota Sofifi',
          t: '100%',
          n1: '0',
          n: formatRupiah(totalBelanja),
          nmju: '0',
          b: true,
        },
        {
          k: '1.01.01',
          u: '  Kegiatan Administrasi Keuangan Perangkat Daerah',
          l: 'Kota Sofifi',
          t: '1 Layanan',
          n1: '0',
          n: formatRupiah(totalBelanja),
          nmju: '0',
          b: false,
        },
        {
          k: '1.01.01.2.02',
          u: '    Sub-Kegiatan Penyediaan Gaji dan Tunjangan ASN',
          l: 'Kota Sofifi',
          t: '12 Bulan',
          n1: '0',
          n: formatRupiah(totalBelanja),
          nmju: '0',
          b: false,
        },
        {
          k: '',
          u: 'JUMLAH TOTAL',
          l: '',
          t: '',
          n1: '0',
          n: formatRupiah(totalBelanja),
          nmju: '0',
          b: true,
        },
      ];

      const rekapRowsList22 = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Kode', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Uraian', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Lokasi', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Target Kinerja', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Tahun N-1', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Tahun N', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: wordBorder,
              children: [cellPara('Tahun N+1', true, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      rekapData22.forEach((row) => {
        rekapRowsList22.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.k, row.b, AlignmentType.CENTER)],
              }),
              new TableCell({ borders: wordBorder, children: [cellPara(row.u, row.b)] }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.l, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.t, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.n1, false, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.n, row.b, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(row.nmju, row.b, AlignmentType.RIGHT)],
              }),
            ],
          }),
        );
      });

      sections.push({
        children: [
          textPara(
            'REKAPITULASI ANGGARAN BELANJA BERDASARKAN PROGRAM, KEGIATAN, DAN SUB-KEGIATAN',
            true,
          ),
          textPara('SATUAN KERJA PERANGKAT DAERAH (FORMULIR RKA-SKPD 2.2)', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rekapRowsList22,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 3: RKA-SKPD 2.2.1 (RINCIAN 7 KOLOM SINKRON) ---
      const rincianRows = [
        new TableRow({
          children: [
            'Kode Rekening',
            'Uraian',
            'Koefisien',
            'Satuan',
            'Harga',
            'PPN',
            'Jumlah (Rp)',
          ].map(
            (h) =>
              new TableCell({
                borders: wordBorder,
                shading: { fill: 'F2F2F2' },
                children: [cellPara(h, true, AlignmentType.CENTER)],
              }),
          ),
        }),
      ];

      detailRows.forEach((item) => {
        rincianRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.kode_rekening, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.uraian || item.nama_rekening)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.volume || 0, false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.satuan || '-', false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(formatRupiah(item.harga_satuan), false, AlignmentType.RIGHT)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(item.ppn ? `${item.ppn}%` : '0%', false, AlignmentType.CENTER)],
              }),
              new TableCell({
                borders: wordBorder,
                children: [cellPara(formatRupiah(item.jumlah), false, AlignmentType.RIGHT)],
              }),
            ],
          }),
        );
      });

      // Baris Total Anggaran Belanja (Menggunakan pola ColSpan agar rapi)
      rincianRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: wordBorder,
              columnSpan: 6,
              children: [cellPara('JUMLAH TOTAL', true, AlignmentType.CENTER)],
            }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara(formatRupiah(total), true, AlignmentType.RIGHT)],
            }),
          ],
        }),
      );

      // Tabel Indikator Kinerja Sub-Kegiatan
      const indikatorRowsWord = [
        new TableRow({
          children: ['Indikator', 'Tolok Ukur Kinerja', 'Target Kinerja'].map(
            (h) =>
              new TableCell({
                borders: wordBorder,
                shading: { fill: 'F2F2F2' },
                children: [cellPara(h, true, AlignmentType.CENTER)],
              }),
          ),
        }),
        new TableRow({
          children: [
            new TableCell({ borders: wordBorder, children: [cellPara('Masukan (Input)')] }),
            new TableCell({ borders: wordBorder, children: [cellPara('Dana yang dibutuhkan')] }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara(`Rp ${formatRupiah(totalBelanja)}`, false, AlignmentType.RIGHT)],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: wordBorder, children: [cellPara('Keluaran (Output)')] }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara('[Output Target Sub-Kegiatan]')],
            }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara('[Volume]', false, AlignmentType.CENTER)],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: wordBorder, children: [cellPara('Hasil (Outcome)')] }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara('[Dampak/Manfaat Sub-Kegiatan]')],
            }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara('[Target %]', false, AlignmentType.CENTER)],
            }),
          ],
        }),
      ];

      sections.push({
        children: [
          textPara('RINCIAN RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH', true),
          textPara('(FORMULIR RKA-SKPD 2.2.1)', true),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({ text: `Urusan Pemerintahan : `, bold: true }),
              new TextRun({ text: `${rka.urusan || '-'}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Bidang Urusan        : `, bold: true }),
              new TextRun({ text: `${rka.bidang_urusan || '-'}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Program              : `, bold: true }),
              new TextRun({ text: `${rka.program || '-'}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Kegiatan             : `, bold: true }),
              new TextRun({ text: `${rka.kegiatan || '-'}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Sub-Kegiatan         : `, bold: true }),
              new TextRun({ text: `${rka.sub_kegiatan || '-'}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Organisasi           : `, bold: true }),
              new TextRun({ text: `${opdName}` }),
            ],
          }),
          new Paragraph({ text: '' }),

          textPara('Indikator & Tolok Ukur Kinerja Sub-Kegiatan', true),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: indikatorRowsWord }),
          new Paragraph({ text: '' }),

          textPara('Rincian Anggaran Belanja Berdasarkan Kelompok Belanja Sub-Kegiatan', true),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rincianRows }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: 'Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      const doc = new Document({ sections });
      const b64string = await docx.Packer.toBase64String(doc);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', `attachment; filename=RKA_${id}_${rka.tahun}.docx`);
      res.send(Buffer.from(b64string, 'base64'));
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // 3. EXPORT PDF (MURNI MENGGUNAKAN PUPPETEER)
  // ==========================================
  async exportPdf(req, res) {
    let browser;
    try {
      const { id } = req.params;
      const { rka } = await fetchExportData(id);
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const {
        totalBelanja,
        totalBelanjaOperasi,
        totalBelanjaModal,
        totalBelanjaTidakTerduga,
        totalBelanjaTransfer,
        total,
      } = getExportTotals(engineResult);
      const totalRincian = total;
      const detailRows = engineResult.rows;

      const opdName = rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI';

      let rincianHtmlRows = detailRows
        .map((item) => {
          return `
          <tr>
            <td class="center">${item.kode_rekening || '-'}</td>
            <td>${item.uraian || item.nama_rekening || '-'}</td>
            <td class="center">${item.volume || 0}</td>
            <td class="center">${item.satuan || '-'}</td>
            <td class="right">${formatRupiah(item.harga_satuan)}</td>
            <td class="center">${item.ppn ? item.ppn + '%' : '0%'}</td>
            <td class="right">${formatRupiah(item.jumlah)}</td>
          </tr>
        `;
        })
        .join('');

      // Validate detailRows exists
      if (!detailRows || detailRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada data rincian belanja dari engine calculation',
        });
      }

      // Desain Template Gabungan 8 Formulir Terintegrasi
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
            .cover-title { text-align: center; font-size: 16px; font-weight: bold; margin-top: 50px; line-height: 1.6; }
            .cover-meta { margin-top: 40px; font-size: 13px; line-height: 1.8; }
            .header-form { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background-color: #BDD7EE; text-align: center; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .footer-sign { float: right; margin-top: 30px; text-align: center; width: 250px; font-weight: bold; }
            .clear { clear: both; }
          </style>
        </head>
        <body>
          <div class="page" style="padding: 10px;">
            <div class="cover-title" style="margin-top: 10px;">
              PEMERINTAH PROVINSI MALUKU UTARA<br>
              RENCANA ANGGARAN DAERAH<br>
              SATUAN KERJA PERANGKAT DAERAH<br>
              (RKA-SKPD)<br>
              TAHUN ANGGARAN ${rka.tahun}
            </div>

            <div class="cover-meta" style="margin-top: 30px; font-size: 12px;">
              <table style="border: none; width: auto; margin-top: 0;">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 150px; font-weight: bold;">URUSAN PEMERINTAHAN</td><td style="border: none; padding: 2px;">: ${rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px; font-weight: bold;">ORGANISASI</td><td style="border: none; padding: 2px;">: ${opdName}</td></tr>
              </table>
            </div>

            <div style="margin-top: 20px; font-size: 12px;">
              <p class="bold" style="margin-bottom: 5px;">Pengguna Anggaran :</p>
              <table style="border: none; width: auto; margin-top: 0; margin-left: 10px;">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 80px;">a. Nama</td><td style="border: none; padding: 2px;">: [Nama Pengguna Anggaran]</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">b. NIP</td><td style="border: none; padding: 2px;">: [NIP Pengguna Anggaran]</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">c. Jabatan</td><td style="border: none; padding: 2px;">: [Jabatan Pengguna Anggaran]</td></tr>
              </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
              <thead>
                <tr>
                  <th style="width: 20%; background-color: #BDD7EE; border: 1px solid #000; text-align: center;">KODE</th>
                  <th style="width: 80%; background-color: #BDD7EE; border: 1px solid #000; text-align: center;">NAMA FORMULIR</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD</td><td style="border: 1px solid #000;">Ringkasan Anggaran Pendapatan, Belanja dan Pembiayaan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 1</td><td style="border: 1px solid #000;">Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 2.1</td><td style="border: 1px solid #000;">Rincian Anggaran Belanja Operasi, Belanja Modal, Belanja Tidak Terduga, dan Belanja Transfer Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 2.2</td><td style="border: 1px solid #000;">Rekapitulasi Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 2.2.1</td><td style="border: 1px solid #000;">Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 3.1</td><td style="border: 1px solid #000;">Rincian Penerimaan Pembiayaan Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-SKPD 3.2</td><td style="border: 1px solid #000;">Rincian Pengeluaran Pembiayaan Daerah</td></tr>
              </tbody>
            </table>
          </div>

          <div class="page">
            <div class="header-form">RINGKASAN ANGGARAN PENDAPATAN, BELANJA DAN PEMBIAYAAN<br>SATUAN KERJA PERANGKAT DAERAH (RKA-SKPD)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Kode Rekening</th>
                  <th style="width: 60%;">Uraian</th>
                  <th style="width: 25%;">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold"><td>4</td><td>PENDAPATAN DAERAH</td><td class="right">0</td></tr>
                <tr class="bold"><td>5</td><td>BELANJA DAERAH</td><td class="right">${formatRupiah(totalBelanja)}</td></tr>
                <tr><td>5.1</td><td style="padding-left: 20px;">BELANJA OPERASI</td><td class="right">${formatRupiah(totalBelanjaOperasi)}</td></tr>
                <tr><td>5.2</td><td style="padding-left: 20px;">BELANJA MODAL</td><td class="right">${formatRupiah(totalBelanjaModal)}</td></tr>
                <tr><td>5.3</td><td style="padding-left: 20px;">BELANJA TIDAK TERDUGA</td><td class="right">${formatRupiah(totalBelanjaTidakTerduga)}</td></tr>
                <tr><td>5.4</td><td style="padding-left: 20px;">BELANJA TRANSFER</td><td class="right">${formatRupiah(totalBelanjaTransfer)}</td></tr>
                <tr class="bold"><td></td><td>SURPLUS / (DEFISIT)</td><td class="right">-${formatRupiah(totalBelanja)}</td></tr>
                <tr class="bold"><td>6</td><td>PEMBIAYAAN DAERAH</td><td class="right">0</td></tr>
                <tr><td>6.1</td><td style="padding-left: 20px;">PENERIMAAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr><td>6.2</td><td style="padding-left: 20px;">PENGELUARAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr class="bold"><td></td><td>PEMBIAYAAN NETTO</td><td class="right">0</td></tr>
                <tr class="bold"><td></td><td>SISA LEBIH PEMBIAYAAN ANGGARAN TAHUN BERJALAN (SILPA)</td><td class="right">0</td></tr>
              </tbody>
            </table>
            <div class="footer-sign">Ternate, 02 Juni 2026<br>Pejabat Pengelola Keuangan Daerah<br><br><br><br>( _______________________ )</div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN PENDAPATAN SATUAN KERJA PERANGKAT DAERAH (Formulir RKA-SKPD 1)</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 15%; vertical-align: middle;">Kode Rekening</th>
                  <th rowspan="2" style="width: 45%; vertical-align: middle;">Uraian</th>
                  <th colspan="3" style="width: 25%;">Rincian Perhitungan</th>
                  <th rowspan="2" style="width: 15%; vertical-align: middle;">Jumlah (Rp)</th>
                </tr>
                <tr>
                  <th>Volume</th>
                  <th>Satuan</th>
                  <th>Tarif</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold" style="background-color: #f5f5f5;">
                  <td class="center">4</td><td>PENDAPATAN DAERAH</td><td></td><td></td><td></td><td class="right">0</td>
                </tr>
                <tr class="bold">
                  <td>4.1</td><td style="padding-left: 15px;">PENDAPATAN ASLI DAERAH (PAD)</td><td></td><td></td><td></td><td class="right">0</td>
                </tr>
                <tr class="bold">
                  <td>4.2</td><td style="padding-left: 15px;">PENDAPATAN TRANSFER</td><td></td><td></td><td></td><td class="right">0</td>
                </tr>
                <tr class="bold">
                  <td>4.3</td><td style="padding-left: 15px;">LAIN-LAIN PENDAPATAN DAERAH YANG SAH</td><td></td><td></td><td></td><td class="right">0</td>
                </tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td class="center"></td><td>JUMLAH TOTAL PENDAPATAN</td><td></td><td></td><td></td><td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 20px; font-size: 10px;">
              <table style="width: 100%; border: 1px solid #000;">
                <thead>
                  <tr style="background-color: #f2f2f2;"><th colspan="5" style="text-align: left; background-color: #f2f2f2;">Tim Anggaran Pemerintah Daerah (TAPD):</th></tr>
                  <tr><th style="width: 5%;">No</th><th style="width: 35%;">Nama</th><th style="width: 20%;">NIP</th><th style="width: 25%;">Jabatan</th><th style="width: 15%;">Tanda Tangan</th></tr>
                </thead>
                <tbody>
                  <tr><td class="center">1</td><td>[Nama Ketua TAPD]</td><td>[NIP]</td><td>Ketua TAPD</td><td>1.</td></tr>
                  <tr><td class="center">2</td><td>[Nama Sekretaris TAPD]</td><td>[NIP]</td><td>Anggota</td><td>2.</td></tr>
                </tbody>
              </table>
            </div>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>( _______________________ )</div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">REKAPITULASI ANGGARAN BELANJA BERDASARKAN PROGRAM, KEGIATAN, DAN SUB-KEGIATAN<br>SATUAN KERJA PERANGKAT DAERAH (Formulir RKA-SKPD 2.2)</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 12%; vertical-align: middle;">Kode</th>
                  <th rowspan="2" style="width: 33%; vertical-align: middle;">Uraian</th>
                  <th rowspan="2" style="width: 12%; vertical-align: middle;">Lokasi</th>
                  <th rowspan="2" style="width: 13%; vertical-align: middle;">Target Kinerja</th>
                  <th colspan="2" style="width: 20%;">Alokasi Anggaran (Rp)</th>
                  <th rowspan="2" style="width: 10%; vertical-align: middle;">Prakiraan Maju (Rp)</th>
                </tr>
                <tr>
                  <th>Tahun N-1</th>
                  <th>Tahun N</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold" style="background-color: #f9f9f9;">
                  <td class="center">1.01</td><td>PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH</td><td>Kota Sofifi</td><td class="center">100%</td><td class="right">0</td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">1.01.01</td><td style="padding-left: 10px; font-weight: bold;">Kegiatan Administrasi Keuangan Perangkat Daerah</td><td>Kota Sofifi</td><td class="center">1 Layanan</td><td class="right">0</td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td>1.01.01.2.02</td><td style="padding-left: 20px; font-style: italic;">Sub-Kegiatan Penyediaan Gaji dan Tunjangan ASN</td><td>Kota Sofifi</td><td class="center">12 Bulan</td><td class="right">0</td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td class="center"></td><td>JUMLAH TOTAL REKAPITULASI</td><td></td><td></td><td class="right">0</td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>( _______________________ )</div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN BELANJA OPERASI, BELANJA MODAL, BELANJA TIDAK TERDUGA, DAN BELANJA TRANSFER<br>SATUAN KERJA PERANGKAT DAERAH (Formulir RKA-SKPD 2.1)</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 12%; vertical-align: middle;">Kode Rekening</th>
                  <th rowspan="2" style="width: 38%; vertical-align: middle;">Uraian</th>
                  <th colspan="3" style="width: 26%;">Rincian Perhitungan</th>
                  <th rowspan="2" style="width: 12%; vertical-align: middle;">Jumlah (Rp)</th>
                  <th rowspan="2" style="width: 12%; vertical-align: middle;">Tahun N+1</th>
                </tr>
                <tr>
                  <th>Volume</th>
                  <th>Satuan</th>
                  <th>Harga Satuan</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold" style="background-color: #f5f5f5;">
                  <td class="center">5</td><td>BELANJA DAERAH</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.1</td><td style="padding-left: 15px;">BELANJA OPERASI</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanjaOperasi)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.2</td><td style="padding-left: 15px;">BELANJA MODAL</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanjaModal)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.3</td><td style="padding-left: 15px;">BELANJA TIDAK TERDUGA</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanjaTidakTerduga)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.4</td><td style="padding-left: 15px;">BELANJA TRANSFER</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanjaTransfer)}</td><td class="right">0</td>
                </tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td class="center"></td><td>JUMLAH TOTAL BELANJA</td><td></td><td></td><td></td><td class="right">${formatRupiah(totalBelanja)}</td><td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 15px; font-size: 9px; border: 1px solid #000; padding: 6px;">
              <strong>Tanggal Pembahasan:</strong> 02 Juni 2026<br>
              <strong>Catatan Hasil Pembahasan:</strong> Alokasi Rincian Belanja Daerah disesuaikan dengan target batas anggaran belanja sub-kegiatan organisasi terkait.
            </div>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>( _______________________ )</div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">REKAPITULASI RINCIAN ANGGARAN BELANJA MENURUT PROGRAM, KEGIATAN DAN SUB KEGIATAN (RKA-SKPD 2.2)</div>
            <table>
              <thead>
                <tr>
                  <th>Kode Prog / Keg / Sub</th>
                  <th>Uraian</th>
                  <th>Lokasi</th>
                  <th>Target Kinerja</th>
                  <th>Belanja Operasi</th>
                  <th>Belanja Modal</th>
                  <th>Belanja BTT</th>
                  <th>Belanja Transfer</th>
                  <th>Jumlah Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PROG-01</td>
                  <td>${rka.program} / ${rka.kegiatan} / ${rka.sub_kegiatan}</td>
                  <td>${rincian[0]?.lokasi || 'Daerah'}</td>
                  <td>${rka.target || '-'}</td>
                  <td class="right">${formatRupiah(totalBelanja)}</td>
                  <td class="right">0</td>
                  <td class="right">0</td>
                  <td class="right">0</td>
                  <td class="right bold">${formatRupiah(totalBelanja)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (FORMULIR RKA-SKPD 2.2.1)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${rka.urusan || '-'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${rka.bidang_urusan || '-'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Program</td><td style="border: none; padding:2px;">: ${rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Kegiatan</td><td style="border: none; padding:2px;">: ${rka.kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Sub-Kegiatan</td><td style="border: none; padding:2px;">: ${rka.sub_kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Organisasi</td><td style="border: none; padding:2px;">: ${opdName}</td></tr>
              </table>
            </div>

            <p class="bold" style="margin-top: 10px; margin-bottom: 3px; font-size: 11px;">Indikator & Tolok Ukur Kinerja Sub-Kegiatan</p>
            <table style="margin-bottom: 15px;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="width: 25%;">Indikator</th>
                  <th style="width: 55%;">Tolok Ukur Kinerja</th>
                  <th style="width: 20%;">Target Kinerja</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="bold">Masukan (Input)</td><td>Dana yang dibutuhkan</td><td class="right">Rp ${formatRupiah(totalBelanja)}</td></tr>
                <tr><td class="bold">Keluaran (Output)</td><td>[Output Target Sub-Kegiatan]</td><td class="center">[Volume]</td></tr>
                <tr><td class="bold">Hasil (Outcome)</td><td>[Dampak/Manfaat Sub-Kegiatan]</td><td class="center">[Target %]</td></tr>
              </tbody>
            </table>

            <p class="bold" style="margin-top: 10px; margin-bottom: 3px; font-size: 11px;">Rincian Anggaran Belanja Sub-Kegiatan</p>
            <table>
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="width: 15%;">Kode Rekening</th>
                  <th style="width: 35%;">Uraian</th>
                  <th style="width: 12%;">Koefisien</th>
                  <th style="width: 10%;">Satuan</th>
                  <th style="width: 12%;">Harga</th>
                  <th style="width: 6%;">PPN</th>
                  <th style="width: 10%;">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${rincianHtmlRows}
                <tr class="bold" style="background-color: #e2efda;">
                  <td colspan="6" class="center">JUMLAH TOTAL</td>
                  <td class="right">${formatRupiah(totalRincian)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sign" style="margin-top: 20px;">
              Ternate, 02 Juni 2026<br>
              Kepala SKPD / Pengguna Anggaran<br><br><br><br>
              ( _______________________ )
            </div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (FORMULIR RKA-SKPD 3.1)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${rka.urusan || '1.07 Urusan Pemerintahan Bidang Perhubungan'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${rka.bidang_urusan || '1.07.01 Bidang Urusan Perhubungan'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Program</td><td style="border: none; padding:2px;">: ${rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Kegiatan</td><td style="border: none; padding:2px;">: ${rka.kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Sub-Kegiatan</td><td style="border: none; padding:2px;">: ${rka.sub_kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Organisasi</td><td style="border: none; padding:2px;">: ${opdName}</td></tr>
              </table>
            </div>

            <p class="bold" style="margin-top: 10px; margin-bottom: 3px; font-size: 11px;">Rincian Rencana Anggaran Penerimaan Pembiayaan</p>
            <table>
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="width: 25%;">Kode Rekening</th>
                  <th style="width: 55%;">Uraian</th>
                  <th style="width: 20%;">Jumlah (Rp)</th>
                </tr>
                <tr style="background-color: #f9f9f9; font-size: 10px;">
                  <th class="center">1</th><th class="center">2</th><th class="center">3</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold"><td>6</td><td>PENERIMAAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr><td>6.1</td><td style="padding-left: 15px;">SISA LEBIH PERHITUNGAN ANGGARAN TAHUN SEBELUMNYA (SiLPA)</td><td class="right">0</td></tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td colspan="2" class="center">JUMLAH PENERIMAAN PEMBIAYAAN</td>
                  <td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sign" style="margin-top: 30px;">
              Sofifi, _________ 2026<br>
              Mengesahkan,<br>
              Pejabat Pengelola Keuangan Daerah<br><br><br><br>
              ( _______________________ )
            </div>
            <div class="clear"></div>
          </div>

          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (FORMULIR RKA-SKPD 3.2)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${rka.urusan || '1.07 Urusan Pemerintahan Bidang Perhubungan'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${rka.bidang_urusan || '1.07.01 Bidang Urusan Perhubungan'}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Program</td><td style="border: none; padding:2px;">: ${rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; padding:2px;">Kegiatan</td><td style="border: none; padding:2px;">: ${rka.kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Sub-Kegiatan</td><td style="border: none; padding:2px;">: ${rka.sub_kegiatan}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Organisasi</td><td style="border: none; padding:2px;">: ${opdName}</td></tr>
              </table>
            </div>

            <p class="bold" style="margin-top: 10px; margin-bottom: 3px; font-size: 11px;">Rincian Rencana Anggaran Pengeluaran Pembiayaan</p>
            <table>
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="width: 25%;">Kode Rekening</th>
                  <th style="width: 55%;">Uraian</th>
                  <th style="width: 20%;">Jumlah (Rp)</th>
                </tr>
                <tr style="background-color: #f9f9f9; font-size: 10px;">
                  <th class="center">1</th><th class="center">2</th><th class="center">3</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bold"><td>6.2</td><td>PENGELUARAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr><td>6.2.1</td><td style="padding-left: 15px;">Pembentukan Dana Cadangan</td><td class="right">0</td></tr>
                <tr><td>6.2.2</td><td style="padding-left: 15px;">Penyertaan Modal Daerah</td><td class="right">0</td></tr>
                <tr><td>6.2.3</td><td style="padding-left: 15px;">Pembayaran Cicilan Pokok Utang yang Jatuh Tempo</td><td class="right">0</td></tr>
                <tr><td>6.2.4</td><td style="padding-left: 15px;">Pemberian Pinjaman Daerah</td><td class="right">0</td></tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td colspan="2" class="center">JUMLAH PENGELUARAN PEMBIAYAAN</td>
                  <td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sign" style="margin-top: 30px;">
              Sofifi, _________ 2026<br>
              Mengesahkan,<br>
              Pejabat Pengelola Keuangan Daerah<br><br><br><br>
              ( _______________________ )
            </div>
            <div class="clear"></div>
          </div>
        </body>
        </html>
      `;

      // Eksekusi Render PDF Menggunakan Puppeteer Tanpa Library Pihak Ketiga
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=RKA_${id}_${rka.tahun}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

const { Rka, RkaRincianBelanja, Tapd, PejabatPenandatangan, MasterKodeRekeningBelanja } = require('../models');
const rkaEngine = require('../services/rkaEngine');
const { compareTahapanHistory } = require('../services/rkaRevisiService');
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

// Helper: Kolom "Koefisien" harus menampilkan ekspresi lengkap (mis. "4 Orang / Jam",
// "4 Orang x 1 Jam") — bukan cuma angka hasil kali (mis. "4") — supaya jelas asal
// angkanya bagi pemeriksa (Inspektorat/BPK). Format: "vol1 satuan1 x vol2 satuan2 ...".
const formatKoefisienDisplay = (koefisienArrayRaw, fallbackVolume) => {
  let arr = [];
  try {
    arr = typeof koefisienArrayRaw === 'string' ? JSON.parse(koefisienArrayRaw) : koefisienArrayRaw;
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return Number(fallbackVolume || 0).toLocaleString('id-ID');
  }
  return arr
    .map((k) => `${Number(k.volume || 0).toLocaleString('id-ID')} ${k.satuan || ''}`.trim())
    .join(' x ');
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

// Pejabat Penandatangan RKA (diisi lewat menu Setting Pejabat Penandatangan) — dipakai
// mengganti placeholder "[Nama Pengguna Anggaran]" / nama hardcode di seluruh formulir cetak.
// Return objek per-role dengan fallback teks "belum diisi" (bukan nama orang sungguhan)
// supaya jelas kalau datanya memang belum di-setting, bukan seolah-olah data asli.
async function fetchPejabatByTahun(tahun) {
  const rows = await PejabatPenandatangan.findAll({ where: { tahun: Number(tahun) } });
  const byRole = {};
  for (const row of rows) {
    byRole[row.role] = { nama: row.nama || '', nip: row.nip || '', jabatan: row.jabatan || '' };
  }
  const EMPTY = { nama: '[Belum diisi — lengkapi di menu Setting Pejabat Penandatangan]', nip: '', jabatan: '' };
  return {
    penggunaAnggaran: byRole.PENGGUNA_ANGGARAN || EMPTY,
    kuasaPenggunaAnggaran: byRole.KUASA_PENGGUNA_ANGGARAN || EMPTY,
    kepalaDinas: byRole.KEPALA_DINAS || EMPTY,
    sekretaris: byRole.SEKRETARIS || EMPTY,
  };
}

// Formulir RKA-BELANJA SKPD (Rincian Anggaran Belanja Menurut Program, Kegiatan dan Sub
// Kegiatan — Permendagri 77/2020) dengan kolom Sebelum/Sesudah/Bertambah-(Berkurang) +
// TAPD. Dipakai oleh DUA endpoint (exportPdfBelanja yg berdiri sendiri, dan exportPdf saat
// user memilih formulir ini dari dropdown Cetak) — disatukan di sini supaya keduanya selalu
// menampilkan formulir yang identik, tidak ada versi "lama" yang belum sinkron.
// Terima data yang SUDAH di-fetch oleh pemanggil (bukan fetch ulang) supaya exportPdf tidak
// query database dua kali untuk hal yang sama.
async function buildFormulirBelanjaBodyHtml({ rka, rincian, comparison, tapdList, opdName, pejabat }) {
  const formatRp = (val) => `Rp. ${Number(val).toLocaleString('id-ID')},00`;
  const formatDelta = (val) => {
    const n = Number(val) || 0;
    return `${n < 0 ? '-' : ''}Rp. ${Math.abs(n).toLocaleString('id-ID')},00`;
  };

  const subtotalsSebelum = {};
  const subtotalsSesudah = {};
  comparison.items.forEach((item) => {
    const segments = String(item.kode_rekening).split('.');
    for (let i = 1; i <= segments.length; i++) {
      const prefix = segments.slice(0, i).join('.');
      subtotalsSebelum[prefix] = (subtotalsSebelum[prefix] || 0) + Number(item.jumlah_sebelum || 0);
      subtotalsSesudah[prefix] = (subtotalsSesudah[prefix] || 0) + Number(item.jumlah_sesudah || 0);
    }
  });

  const grouped = {};
  const kodeOrder = [];
  comparison.items.forEach((item) => {
    const kode = item.kode_rekening;
    if (!grouped[kode]) {
      grouped[kode] = [];
      kodeOrder.push(kode);
    }
    grouped[kode].push(item);
  });

  // Nama akun untuk setiap level kode rekening (BELANJA DAERAH s.d. kelompok/jenis/objek)
  // diambil dari tabel referensi master_kode_rekening_belanja, bukan daftar hardcode —
  // di tabel itu kode NON-LEAF disimpan dengan titik di akhir (mis. "5.1.02.02."),
  // sedangkan kode LEAF tidak pakai titik (mis. "5.1.02.02.01.0003").
  const allPrefixes = new Set();
  kodeOrder.forEach((kode) => {
    const segments = kode.split('.');
    for (let i = 1; i <= segments.length; i++) {
      allPrefixes.add(segments.slice(0, i).join('.'));
    }
  });
  const lookupCodes = [...allPrefixes].flatMap((p) => [p, `${p}.`]);
  const masterRows = lookupCodes.length
    ? await MasterKodeRekeningBelanja.findAll({
        where: { kode_rekening: lookupCodes },
        attributes: ['kode_rekening', 'uraian'],
      })
    : [];
  const labelMap = new Map();
  masterRows.forEach((r) => {
    const bare = r.kode_rekening.endsWith('.') ? r.kode_rekening.slice(0, -1) : r.kode_rekening;
    if (!labelMap.has(bare)) labelMap.set(bare, r.uraian);
  });

  const renderedPrefixes = new Set();
  let rincianHtml = '';
  const B = 'border:1px solid #000;padding:4px;'; // singkatan style sel tabel

  kodeOrder.forEach((kode) => {
    const items = grouped[kode];
    const segments = kode.split('.');

    for (let i = 1; i <= segments.length; i++) {
      const prefix = segments.slice(0, i).join('.');
      if (renderedPrefixes.has(prefix)) continue;
      renderedPrefixes.add(prefix);
      const isLeaf = i === segments.length;
      const isTopLevel = i <= 2;
      const deltaPrefix = (subtotalsSesudah[prefix] || 0) - (subtotalsSebelum[prefix] || 0);

      if (!isLeaf) {
        const label = labelMap.get(prefix) || prefix;
        const bg = isTopLevel ? '#f2f2f2' : '#fff';
        const fw = isTopLevel ? 'bold' : 'normal';
        rincianHtml += `<tr style="background-color:${bg};">
          <td style="${B}font-weight:${fw};">${prefix}</td>
          <td colspan="5" style="${B}font-weight:${fw};">${label}</td>
          <td style="${B}text-align:right;font-weight:${fw};">${formatRp(subtotalsSebelum[prefix] || 0)}</td>
          <td colspan="4" style="${B}"></td>
          <td style="${B}text-align:right;font-weight:${fw};">${formatRp(subtotalsSesudah[prefix] || 0)}</td>
          <td style="${B}text-align:right;font-weight:${fw};">${formatDelta(deltaPrefix)}</td>
        </tr>`;
      } else {
        const namaLeaf = items[0].nama_rekening || items[0].uraian || prefix;
        rincianHtml += `<tr>
          <td style="${B}font-weight:bold;">${prefix}</td>
          <td colspan="5" style="${B}font-weight:bold;">${namaLeaf}</td>
          <td style="${B}text-align:right;font-weight:bold;">${formatRp(subtotalsSebelum[prefix] || 0)}</td>
          <td colspan="4" style="${B}"></td>
          <td style="${B}text-align:right;font-weight:bold;">${formatRp(subtotalsSesudah[prefix] || 0)}</td>
          <td style="${B}text-align:right;font-weight:bold;">${formatDelta(deltaPrefix)}</td>
        </tr>`;

        const grupSumber = {};
        const sumberOrder = [];
        items.forEach((it) => {
          const sd = it.sumber_dana || 'PAD';
          if (!grupSumber[sd]) {
            grupSumber[sd] = [];
            sumberOrder.push(sd);
          }
          grupSumber[sd].push(it);
        });

        sumberOrder.forEach((sd) => {
          const grupItems = grupSumber[sd];
          const grupSebelum = grupItems.reduce((s, it) => s + Number(it.jumlah_sebelum || 0), 0);
          const grupSesudah = grupItems.reduce((s, it) => s + Number(it.jumlah_sesudah || 0), 0);
          const grupDelta = grupSesudah - grupSebelum;
          rincianHtml += `<tr>
            <td style="${B}"></td>
            <td colspan="5" style="${B}"><strong>[ # ] ${namaLeaf}</strong><br><span style="padding-left:12px;">Sumber Dana : ${sd}</span></td>
            <td style="${B}text-align:right;">${formatRp(grupSebelum)}</td>
            <td colspan="4" style="${B}"></td>
            <td style="${B}text-align:right;">${formatRp(grupSesudah)}</td>
            <td style="${B}text-align:right;">${formatDelta(grupDelta)}</td>
          </tr>`;

          const namaGrup = grupItems[0].nama_rekening || namaLeaf;
          rincianHtml += `<tr>
            <td style="${B}"></td>
            <td colspan="5" style="${B}">[ - ] ${namaGrup}</td>
            <td style="${B}text-align:right;">${formatRp(grupSebelum)}</td>
            <td colspan="4" style="${B}"></td>
            <td style="${B}text-align:right;">${formatRp(grupSesudah)}</td>
            <td style="${B}text-align:right;">${formatDelta(grupDelta)}</td>
          </tr>`;

          grupItems.forEach((it) => {
            rincianHtml += `<tr>
              <td style="${B}"></td>
              <td style="${B}color:#c00000;padding-left:24px;">${it.uraian || '-'}<br><span style="color:#555;font-size:10px;">Spesifikasi : ${it.spesifikasi || '-'}</span></td>
              <td style="${B}text-align:center;">${formatKoefisienDisplay(it.koefisien_array_sebelum, null)}</td>
              <td style="${B}text-align:center;">${it.satuan_sebelum || '-'}</td>
              <td style="${B}text-align:right;">${Number(it.harga_satuan_sebelum || 0).toLocaleString('id-ID')},00</td>
              <td style="${B}text-align:center;">-</td>
              <td style="${B}text-align:right;">${formatRp(it.jumlah_sebelum || 0)}</td>
              <td style="${B}text-align:center;">${formatKoefisienDisplay(it.koefisien_array_sesudah, null)}</td>
              <td style="${B}text-align:center;">${it.satuan_sesudah || '-'}</td>
              <td style="${B}text-align:right;">${Number(it.harga_satuan_sesudah || 0).toLocaleString('id-ID')},00</td>
              <td style="${B}text-align:center;">-</td>
              <td style="${B}text-align:right;">${formatRp(it.jumlah_sesudah || 0)}</td>
              <td style="${B}text-align:right;">${formatDelta(it.bertambah_berkurang)}</td>
            </tr>`;
          });
        });
      }
    }
  });

  const tapdRows =
    tapdList.length > 0
      ? tapdList
          .map(
            (t, i) => `<tr>
        <td style="border:1px solid #000;padding:4px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px;">${t.nama || ''}</td>
        <td style="border:1px solid #000;padding:4px;">${t.nip || ''}</td>
        <td style="border:1px solid #000;padding:4px;">${t.jabatan || ''}</td>
        <td style="border:1px solid #000;padding:4px;text-align:center;"></td>
      </tr>`,
          )
          .join('')
      : `<tr><td colspan="5" style="border:1px solid #000;padding:4px;text-align:center;color:#999;">— Belum diisi —</td></tr>`;

  return `
    <div style="text-align:right;font-weight:bold;margin-bottom:4px;">
      Formulir RKA-BELANJA SKPD
    </div>
    <div class="header-form">
      RENCANA KERJA DAN ANGGARAN<br>SATUAN KERJA PERANGKAT DAERAH<br>
      Rincian Anggaran Belanja Menurut Program, Kegiatan dan Sub Kegiatan
    </div>
    <table class="meta" style="border:none;margin-bottom:8px;">
      <tr><td style="width:22%;font-weight:bold;">Urusan Pemerintahan</td><td>: ${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '-')} ${rka.urusan || ''}</td></tr>
      <tr><td style="font-weight:bold;">Bidang Urusan</td><td>: ${rka.kode_bidang_urusan || rka.kode_program || '-'} ${rka.bidang_urusan || ''}</td></tr>
      <tr><td style="font-weight:bold;">Unit Organisasi</td><td>: ${opdName}</td></tr>
      <tr><td style="font-weight:bold;">Sub Unit Organisasi</td><td>: -</td></tr>
      <tr><td style="font-weight:bold;">Program</td><td>: ${rka.kode_program || ''} ${rka.program || '-'}</td></tr>
      <tr><td style="font-weight:bold;">Kegiatan</td><td>: ${rka.kode_kegiatan || ''} ${rka.kegiatan || '-'}</td></tr>
      <tr><td style="font-weight:bold;">Sub Kegiatan</td><td>: ${rka.kode_sub_kegiatan || ''} ${rka.sub_kegiatan || '-'}</td></tr>
      <tr><td style="font-weight:bold;">SPM</td><td>: -</td></tr>
      <tr><td style="font-weight:bold;">Jenis Layanan</td><td>: -</td></tr>
      <tr><td style="font-weight:bold;">Sumber Pendanaan</td><td>: ${rincian[0]?.sumber_dana || 'PAD'}</td></tr>
      <tr><td style="font-weight:bold;">Lokasi</td><td>: ${rka.lokasi || '-'}</td></tr>
      <tr><td style="font-weight:bold;">Waktu Pelaksanaan</td><td>: ${rka.waktu_mulai || 'Januari'} s.d ${rka.waktu_selesai || 'Desember'}</td></tr>
      <tr><td style="font-weight:bold;">Kelompok Sasaran</td><td>: Provinsi Maluku Utara</td></tr>
      <tr><td style="font-weight:bold;">Alokasi ${Number(rka.tahun) - 1}</td><td>: Rp. 0,00</td></tr>
      <tr><td style="font-weight:bold;">Alokasi ${rka.tahun}</td><td>: ${formatRp(comparison.totalSesudah)}</td></tr>
      <tr><td style="font-weight:bold;">Alokasi ${Number(rka.tahun) + 1}</td><td>: Rp. 0,00</td></tr>
    </table>

    <div class="bold" style="margin:8px 0 4px;">Indikator dan Tolak Ukur Kinerja Kegiatan</div>
    <table style="margin-bottom:12px;">
      <thead>
        <tr>
          <th colspan="3" style="width:50%;">Sebelum</th>
          <th colspan="3" style="width:50%;">Sesudah</th>
        </tr>
        <tr>
          <th style="width:14%;">Indikator</th><th style="width:22%;">Tolok Ukur Kinerja</th><th style="width:14%;">Target Kinerja</th>
          <th style="width:14%;">Indikator</th><th style="width:22%;">Tolok Ukur Kinerja</th><th style="width:14%;">Target Kinerja</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="bold">Capaian Program</td><td>${comparison.priorHeader.capaian_program || '-'}</td><td class="center">${comparison.priorHeader.target_capaian || '-'} ${comparison.priorHeader.satuan_capaian || '%'}</td>
          <td class="bold">Capaian Program</td><td>${rka.capaian_program || '-'}</td><td class="center">${rka.target_capaian || '-'} ${rka.satuan_capaian || '%'}</td>
        </tr>
        <tr>
          <td class="bold">Masukan</td><td>${comparison.priorHeader.masukan || 'Dana yang dibutuhkan'}</td><td class="right">${formatRp(comparison.totalSebelum)}</td>
          <td class="bold">Masukan</td><td>${rka.masukan || 'Dana yang dibutuhkan'}</td><td class="right">${formatRp(comparison.totalSesudah)}</td>
        </tr>
        <tr>
          <td class="bold">Keluaran</td><td>${comparison.priorHeader.keluaran || rka.indikator || '-'}</td><td class="center">${comparison.priorHeader.target_keluaran || rka.target || '-'} ${comparison.priorHeader.satuan_keluaran || ''}</td>
          <td class="bold">Keluaran</td><td>${rka.keluaran || rka.indikator || '-'}</td><td class="center">${rka.target_keluaran || rka.target || '-'} ${rka.satuan_keluaran || ''}</td>
        </tr>
        <tr>
          <td class="bold">Hasil</td><td>${comparison.priorHeader.hasil || '-'}</td><td class="center">${comparison.priorHeader.target_hasil || '-'} ${comparison.priorHeader.satuan_hasil || '%'}</td>
          <td class="bold">Hasil</td><td>${rka.hasil || '-'}</td><td class="center">${rka.target_hasil || '-'} ${rka.satuan_hasil || '%'}</td>
        </tr>
      </tbody>
    </table>

    <div class="bold" style="margin:8px 0 4px;">Rincian Anggaran Belanja Kegiatan Satuan Kerja Perangkat Daerah</div>
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:11%;">Kode Rekening</th>
          <th rowspan="2" style="width:20%;">Uraian</th>
          <th colspan="5" style="width:28%;">Rincian Perhitungan Sebelum</th>
          <th colspan="5" style="width:28%;">Rincian Perhitungan Sesudah</th>
          <th rowspan="2" style="width:13%;">Bertambah / (Berkurang) (Rp)</th>
        </tr>
        <tr>
          <th style="width:5%;">Koefisien</th><th style="width:5%;">Satuan</th><th style="width:6%;">Harga (Rp)</th><th style="width:3%;">PPN</th><th style="width:9%;">Jumlah (Rp)</th>
          <th style="width:5%;">Koefisien</th><th style="width:5%;">Satuan</th><th style="width:6%;">Harga (Rp)</th><th style="width:3%;">PPN</th><th style="width:9%;">Jumlah (Rp)</th>
        </tr>
      </thead>
      <tbody>
        ${rincianHtml}
        <tr class="bold" style="background-color:#e2efda;">
          <td colspan="6" class="center">JUMLAH TOTAL SEBELUM</td>
          <td class="right">${formatRp(comparison.totalSebelum)}</td>
          <td colspan="4" class="center">JUMLAH TOTAL SESUDAH</td>
          <td class="right">${formatRp(comparison.totalSesudah)}</td>
          <td class="right">${formatDelta(comparison.bertambahBerkurang)}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:20px;display:table;width:100%;table-layout:fixed;">
      <div style="display:table-row;">

        <!-- Kiri: Pembahasan + TAPD -->
        <div style="display:table-cell;width:65%;vertical-align:top;padding-right:8px;">
          <div style="margin-bottom:8px;">
            <div class="bold" style="margin-bottom:4px;">Pembahasan :</div>
            <div>Tanggal : ${tapdList[0]?.tanggal_pembahasan || '________________________'}</div>
            <div style="margin-top:6px;">Catatan :</div>
            <div style="border:1px solid #ccc;min-height:30px;padding:4px;margin-top:4px;font-size:10px;">
              ${tapdList[0]?.catatan || '&nbsp;'}
            </div>
          </div>
          <div class="bold" style="margin:10px 0 4px;">Tim Anggaran Pemerintahan Daerah</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;box-sizing:border-box;">
            <thead>
              <tr>
                <th style="border:1px solid #000;padding:3px;width:5%;text-align:center;">No</th>
                <th style="border:1px solid #000;padding:3px;width:35%;">Nama</th>
                <th style="border:1px solid #000;padding:3px;width:25%;">NIP</th>
                <th style="border:1px solid #000;padding:3px;width:20%;">Jabatan</th>
                <th style="border:1px solid #000;padding:3px;width:15%;text-align:center;">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>${tapdRows}</tbody>
          </table>
        </div>

        <!-- Kanan: TTD Kepala -->
        <div style="display:table-cell;width:35%;vertical-align:top;text-align:center;font-weight:bold;padding-left:12px;">
          Sofifi, _________ ${rka.tahun}<br>
          Kepala ${opdName}<br><br><br><br><br>
          ${pejabat.kepalaDinas.nama}<br>
          NIP. ${pejabat.kepalaDinas.nip}
        </div>

      </div>
    </div>`;
}

module.exports = {
  // ==========================================
  // 1. EXPORT EXCEL (USING EXCELJS)
  // ==========================================
  async exportExcel(req, res) {
    try {
      const { id } = req.params;
      const { rka, rincian } = await fetchExportData(id);
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const {
        totalBelanja,
        totalBelanjaOperasi,
        totalBelanjaModal,
        totalBelanjaTidakTerduga,
        totalBelanjaTransfer,
      } = getExportTotals(engineResult);
      const detailRows = engineResult.rows;
      const pejabat = await fetchPejabatByTahun(rka.tahun);
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
      wsCover.getCell('B10').value = `: ${pejabat.penggunaAnggaran.nama}`;
      wsCover.getCell('A11').value = 'b. NIP';
      wsCover.getCell('B11').value = `: ${pejabat.penggunaAnggaran.nip}`;
      wsCover.getCell('A12').value = 'c. Jabatan';
      wsCover.getCell('B12').value = `: ${pejabat.penggunaAnggaran.jabatan}`;
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
        { kode: 'RKA-PENDAPATAN SKPD', nama: 'Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah' },
        {
          kode: 'REKAPITULASI RKA-BELANJA SKPD',
          nama: 'Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan Satuan Kerja Perangkat Daerah',
        },
        {
          kode: 'RKA-BELANJA SKPD',
          nama: 'Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        { kode: 'RKA-PEMBIAYAAN SKPD', nama: 'Rincian Anggaran Pembiayaan Satuan Kerja Perangkat Daerah (jika ada)' },
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
      wsRingkasan.getCell('B4').value = `${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '')} ${rka.urusan || '-'}`.trim();
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
      ws221.getCell('E1').value = 'Formulir RKA-BELANJA SKPD';
      ws221.getCell('E1').font = fontArialBold;
      ws221.getCell('E1').alignment = { horizontal: 'right', vertical: 'middle' };

      ws221.mergeCells('A2:G2');
      ws221.getCell('A2').value = 'RINCIAN BELANJA SUB-KEGIATAN';
      ws221.getCell('A2').font = fontArialTitle;
      ws221.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      const belanja221 = totalBelanja;
      const lokasiKegiatan = detailRows && detailRows[0] ? detailRows[0].lokasi || '-' : '-';
      const metaRows = [
        ['Urusan Pemerintahan', `${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '')} ${rka.urusan || '-'}`.trim()],
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
          formatKoefisienDisplay(item.koefisien_array, item.volume),
          item.satuan || '-',
          item.harga_satuan ? Number(item.harga_satuan) : 0,
          item.ppn ? `${item.ppn}%` : '0%',
          {
            richText: [
              {
                text: `Subtotal : ${formatRupiah(Number(item.jumlah || 0))}\n`,
              },
              {
                text: `PPN ${Number(item.ppn || 0)}% : ${formatRupiah(Number(item.nilai_ppn || 0))}\n`,
              },
              {
                text: `TOTAL : ${formatRupiah(Number(item.total_setelah_ppn || item.jumlah || 0))}`,
                font: {
                  bold: true,
                },
              },
            ],
          },
        ];
        ws221.getRow(rowNum).font = fontArial;
        ws221.getCell(`G${rowNum}`).alignment = {
          vertical: 'top',
          horizontal: 'right',
          wrapText: true,
        };
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

      ws31.getCell('A1').value = `Urusan Pemerintahan : ${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '')} ${rka.urusan || ''}`;
      ws31.getCell('A2').value = `Bidang Urusan       : ${rka.kode_bidang_urusan || rka.kode_program || ''} ${rka.bidang_urusan || ''}`;
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

      ws32.getCell('A1').value = `Urusan Pemerintahan : ${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '')} ${rka.urusan || ''}`;
      ws32.getCell('A2').value = `Bidang Urusan       : ${rka.kode_bidang_urusan || rka.kode_program || ''} ${rka.bidang_urusan || ''}`;
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
      const opdName = rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI';
      const pejabat = await fetchPejabatByTahun(rka.tahun);
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

      // Penamaan resmi sesuai Permendagri 77/2020 & cetakan SIPD (bukan lagi kode SIPD lama
      // "RKA-SKPD 1/2.1/2.2/2.2.1/3.1/3.2").
      const listFormulir = [
        {
          k: 'RKA-SKPD',
          n: 'Ringkasan Anggaran Pendapatan, Belanja dan Pembiayaan Satuan Kerja Perangkat Daerah',
        },
        { k: 'RKA-PENDAPATAN SKPD', n: 'Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah' },
        {
          k: 'REKAPITULASI RKA-BELANJA SKPD',
          n: 'Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan Satuan Kerja Perangkat Daerah',
        },
        {
          k: 'RKA-BELANJA SKPD',
          n: 'Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah',
        },
        { k: 'RKA-PEMBIAYAAN SKPD', n: 'Rincian Anggaran Pembiayaan Satuan Kerja Perangkat Daerah (jika ada)' },
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
              new TextRun({ text: `a. Nama\t: ${pejabat.penggunaAnggaran.nama}`, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `b. NIP\t\t: ${pejabat.penggunaAnggaran.nip}`, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `c. Jabatan\t: ${pejabat.penggunaAnggaran.jabatan}`,
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
                text: `Kepala SKPD / Pengguna Anggaran\n\n\n\n${pejabat.kepalaDinas.nama}\nNIP. ${pejabat.kepalaDinas.nip}`,
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
          textPara('FORMULIR RKA-PENDAPATAN SKPD', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: pendapatanRowsList,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n${pejabat.kepalaDinas.nama}\nNIP. ${pejabat.kepalaDinas.nip}`,
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
          textPara('SATUAN KERJA PERANGKAT DAERAH', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: belanjaRowsList21,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n${pejabat.kepalaDinas.nama}\nNIP. ${pejabat.kepalaDinas.nip}`,
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
          k: rka.kode_program || '-',
          u: `${rka.program || '-'} / ${rka.kegiatan || '-'} / ${rka.sub_kegiatan || '-'}`,
          l: rka.lokasi || 'Daerah',
          t: rka.target || '-',
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
            'REKAPITULASI ANGGARAN BELANJA BERDASARKAN PROGRAM DAN KEGIATAN',
            true,
          ),
          textPara('SATUAN KERJA PERANGKAT DAERAH (REKAPITULASI RKA-BELANJA SKPD)', true),
          new Paragraph({ text: '' }),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rekapRowsList22,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n${pejabat.kepalaDinas.nama}\nNIP. ${pejabat.kepalaDinas.nip}`,
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
                children: [cellPara(formatKoefisienDisplay(item.koefisien_array, item.volume), false, AlignmentType.CENTER)],
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
                children: [
                  cellPara(
                    [
                      `Subtotal : ${formatRupiah(item.jumlah || 0)}`,
                      `PPN ${item.ppn || 0}% : ${formatRupiah(item.nilai_ppn || 0)}`,
                      `TOTAL : ${formatRupiah(item.total_setelah_ppn || item.jumlah || 0)}`,
                    ].join('\n'),
                    false,
                    AlignmentType.RIGHT,
                  ),
                ],
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
          textPara('(FORMULIR RKA-BELANJA SKPD)', true),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({ text: `Urusan Pemerintahan : `, bold: true }),
              new TextRun({ text: `${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '-')} ${rka.urusan || ''}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Bidang Urusan        : `, bold: true }),
              new TextRun({ text: `${rka.kode_bidang_urusan || rka.kode_program || '-'} ${rka.bidang_urusan || ''}` }),
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
          new WordTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: indikatorRowsWord }),
          new Paragraph({ text: '' }),

          textPara('Rincian Anggaran Belanja Berdasarkan Kelompok Belanja Sub-Kegiatan', true),
          new WordTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rincianRows }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Ternate, 02 Juni 2026\nKepala SKPD / Pengguna Anggaran\n\n\n\n${pejabat.kepalaDinas.nama}\nNIP. ${pejabat.kepalaDinas.nip}`,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      });

      // --- SECTION 4: RKA-SKPD 3.1 (RINCIAN PENERIMAAN PEMBIAYAAN) ---
      const pembiayaanHeaderRows = () => [
        new Paragraph({
          children: [
            new TextRun({ text: `Urusan Pemerintahan : `, bold: true }),
            new TextRun({ text: `${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '-')} ${rka.urusan || ''}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Bidang Urusan        : `, bold: true }),
            new TextRun({ text: `${rka.kode_bidang_urusan || rka.kode_program || '-'} ${rka.bidang_urusan || ''}` }),
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
      ];

      const penerimaanRowsList31 = [
        new TableRow({
          children: ['Kode Rekening', 'Uraian', 'Jumlah (Rp)'].map(
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
            new TableCell({ borders: wordBorder, children: [cellPara('6', true, AlignmentType.CENTER)] }),
            new TableCell({ borders: wordBorder, children: [cellPara('PENERIMAAN PEMBIAYAAN', true)] }),
            new TableCell({ borders: wordBorder, children: [cellPara('0', true, AlignmentType.RIGHT)] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: wordBorder, children: [cellPara('6.1', false, AlignmentType.CENTER)] }),
            new TableCell({
              borders: wordBorder,
              children: [cellPara('  SISA LEBIH PERHITUNGAN ANGGARAN TAHUN SEBELUMNYA (SiLPA)')],
            }),
            new TableCell({ borders: wordBorder, children: [cellPara('0', false, AlignmentType.RIGHT)] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: wordBorder,
              columnSpan: 2,
              children: [cellPara('JUMLAH PENERIMAAN PEMBIAYAAN', true, AlignmentType.CENTER)],
            }),
            new TableCell({ borders: wordBorder, children: [cellPara('0', true, AlignmentType.RIGHT)] }),
          ],
        }),
      ];

      const sectionPembiayaan31 = {
        children: [
          textPara('RENCANA KERJA DAN ANGGARAN', true),
          textPara('SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Penerimaan Pembiayaan)', true),
          new Paragraph({ text: '' }),
          ...pembiayaanHeaderRows(),
          textPara('Rincian Rencana Anggaran Penerimaan Pembiayaan', true),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: penerimaanRowsList31,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sofifi, _________ 2026\nMengesahkan,\nPejabat Pengelola Keuangan Daerah\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      };

      // --- SECTION 5: RKA-SKPD 3.2 (RINCIAN PENGELUARAN PEMBIAYAAN) ---
      const pengeluaranRowsList32 = [
        new TableRow({
          children: ['Kode Rekening', 'Uraian', 'Jumlah (Rp)'].map(
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
            new TableCell({ borders: wordBorder, children: [cellPara('6.2', true, AlignmentType.CENTER)] }),
            new TableCell({ borders: wordBorder, children: [cellPara('PENGELUARAN PEMBIAYAAN', true)] }),
            new TableCell({ borders: wordBorder, children: [cellPara('0', true, AlignmentType.RIGHT)] }),
          ],
        }),
        ...[
          ['6.2.1', '  Pembentukan Dana Cadangan'],
          ['6.2.2', '  Penyertaan Modal Daerah'],
          ['6.2.3', '  Pembayaran Cicilan Pokok Utang yang Jatuh Tempo'],
          ['6.2.4', '  Pemberian Pinjaman Daerah'],
        ].map(
          ([k, u]) =>
            new TableRow({
              children: [
                new TableCell({ borders: wordBorder, children: [cellPara(k, false, AlignmentType.CENTER)] }),
                new TableCell({ borders: wordBorder, children: [cellPara(u)] }),
                new TableCell({ borders: wordBorder, children: [cellPara('0', false, AlignmentType.RIGHT)] }),
              ],
            }),
        ),
        new TableRow({
          children: [
            new TableCell({
              borders: wordBorder,
              columnSpan: 2,
              children: [cellPara('JUMLAH PENGELUARAN PEMBIAYAAN', true, AlignmentType.CENTER)],
            }),
            new TableCell({ borders: wordBorder, children: [cellPara('0', true, AlignmentType.RIGHT)] }),
          ],
        }),
      ];

      const sectionPembiayaan32 = {
        children: [
          textPara('RENCANA KERJA DAN ANGGARAN', true),
          textPara('SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Pengeluaran Pembiayaan)', true),
          new Paragraph({ text: '' }),
          ...pembiayaanHeaderRows(),
          textPara('Rincian Rencana Anggaran Pengeluaran Pembiayaan', true),
          new WordTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: pengeluaranRowsList32,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sofifi, _________ 2026\nMengesahkan,\nPejabat Pengelola Keuangan Daerah\n\n\n\n( _______________________ )',
                font: 'Times New Roman',
                bold: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      };

      sections.push(sectionPembiayaan31, sectionPembiayaan32);

      // sections[0] = cover, [1]=RKA-SKPD, [2]=RKA-PENDAPATAN SKPD, [3]=RKA-SKPD 2.1 (bukan
      // formulir resmi tersendiri, hanya bagian dokumen lengkap), [4]=REKAPITULASI RKA-BELANJA
      // SKPD, [5]=RKA-BELANJA SKPD, [6]+[7]=RKA-PEMBIAYAAN SKPD (penerimaan+pengeluaran
      // digabung, sesuai satu formulir resmi di lampiran Permendagri 77/2020, bukan 3.1/3.2
      // terpisah seperti versi lama) — dipisah agar bisa dicetak satu-satu.
      const formulirSectionsMap = {
        'RKA-SKPD': sections[1],
        'RKA-PENDAPATAN SKPD': sections[2],
        'REKAPITULASI RKA-BELANJA SKPD': sections[4],
        'RKA-BELANJA SKPD': sections[5],
        'RKA-PEMBIAYAAN SKPD': { children: [...sections[6].children, ...sections[7].children] },
      };
      const formulirRequestedWord = req.query.formulir;
      const singleFormulirWord = formulirRequestedWord && formulirSectionsMap[formulirRequestedWord];
      const finalSections = singleFormulirWord
        ? [{ children: formulirSectionsMap[formulirRequestedWord].children }]
        : sections;

      const doc = new Document({ sections: finalSections });
      const b64string = await docx.Packer.toBase64String(doc);

      const formulirSlugWord = singleFormulirWord
        ? `_${formulirRequestedWord.replace(/[.\s]/g, '')}`
        : '';
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=RKA_${id}_${rka.tahun}${formulirSlugWord}.docx`,
      );
      res.send(Buffer.from(b64string, 'base64'));
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // 3B. EXPORT PDF BELANJA SKPD (FORMULIR RKA-BELANJA SKPD SAJA)
  // ==========================================
  async exportPdfBelanja(req, res) {
    let browser;
    try {
      const { id } = req.params;
      // Ambil data TAPD dari query string (JSON encoded)
      const { rka, rincian } = await fetchExportData(id);

      const tapdData = await Tapd.findAll({
        where: { tahun: Number(rka.tahun) },
        order: [['urutan', 'ASC']],
      });
      const tapdList = tapdData.map((t) => ({
        nama: t.nama,
        nip: t.nip,
        jabatan: t.jabatan,
        tanggal_pembahasan: t.tanggal_pembahasan || '',
        catatan: t.catatan || '',
      }));
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const detailRows = engineResult.rows;
      const opdName = rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI';

      if (!detailRows || detailRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data rincian belanja' });
      }

      // Perbandingan Sebelum/Sesudah/Bertambah-(Berkurang) terhadap tahapan sebelumnya
      // (kosong/nol kalau RKA masih di APBD_INDUK — belum pernah digeser/diubah)
      const comparison = await compareTahapanHistory(Number(id));
      const pejabat = await fetchPejabatByTahun(rka.tahun);

      const bodyHtml = await buildFormulirBelanjaBodyHtml({ rka, rincian, comparison, tapdList, opdName, pejabat });
      const htmlBelanja = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#333;}
          table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;}
          th,td{border:1px solid #000;padding:5px;text-align:left;}
          th{background-color:#BDD7EE;text-align:center;font-weight:bold;}
          .right{text-align:right;} .center{text-align:center;} .bold{font-weight:bold;}
          .header-form{text-align:center;font-size:13px;font-weight:bold;margin-bottom:10px;}
          .meta td{border:none;padding:2px;}
          .footer-sign{float:right;margin-top:30px;text-align:center;width:260px;font-weight:bold;}
          .clear{clear:both;}
        </style></head><body>${bodyHtml}</body></html>`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(htmlBelanja, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=RKA_BELANJA_${id}_${rka.tahun}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
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
      const { rka, rincian } = await fetchExportData(id);
      const engineResult = await rkaEngine.recalculateWithValidation(id);
      const {
        totalBelanja,
        totalBelanjaOperasi,
        totalBelanjaModal,
        totalBelanjaTidakTerduga,
        totalBelanjaTransfer,
      } = getExportTotals(engineResult);
      const detailRows = engineResult.rows;

      const opdName = rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI';

      // Perbandingan Sebelum/Sesudah/Bertambah-(Berkurang) terhadap tahapan sebelumnya
      // (kosong/nol kalau RKA masih di APBD_INDUK — belum pernah digeser/diubah)
      const comparison = await compareTahapanHistory(Number(id));
      const pejabat = await fetchPejabatByTahun(rka.tahun);
      const belanjaTypeOf = (kodeRekening) => {
        const s = String(kodeRekening || '');
        if (s.startsWith('5.1')) return 'operasi';
        if (s.startsWith('5.2')) return 'modal';
        if (s.startsWith('5.3')) return 'btt';
        if (s.startsWith('5.4')) return 'transfer';
        return null;
      };
      const belanjaTypeTotals = { sebelum: { operasi: 0, modal: 0, btt: 0, transfer: 0 }, sesudah: { operasi: 0, modal: 0, btt: 0, transfer: 0 } };
      comparison.items.forEach((it) => {
        const type = belanjaTypeOf(it.kode_rekening);
        if (!type) return;
        belanjaTypeTotals.sebelum[type] += Number(it.jumlah_sebelum || 0);
        belanjaTypeTotals.sesudah[type] += Number(it.jumlah_sesudah || 0);
      });

      // Data TAPD asli dari database (tersimpan lewat menu Setting TAPD), otomatis mengikuti tahun RKA
      const tapdData = await Tapd.findAll({
        where: { tahun: Number(rka.tahun) },
        order: [['urutan', 'ASC']],
      });
      const tapdRowsFull =
        tapdData.length > 0
          ? tapdData
              .map(
                (t, i) => `<tr><td class="center">${i + 1}</td><td>${t.nama || ''}</td><td>${t.nip || ''}</td><td>${t.jabatan || ''}</td><td class="center">${i + 1}.</td></tr>`,
              )
              .join('')
          : `<tr><td colspan="5" class="center" style="color:#999;">— Data TAPD belum diisi, lengkapi di menu Setting TAPD —</td></tr>`;
      const tapdList = tapdData.map((t) => ({
        nama: t.nama,
        nip: t.nip,
        jabatan: t.jabatan,
        tanggal_pembahasan: t.tanggal_pembahasan || '',
        catatan: t.catatan || '',
      }));


      // Validate detailRows exists
      if (!detailRows || detailRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada data rincian belanja dari engine calculation',
        });
      }

      // Desain 7 Formulir SIPD — dipecah per formulir agar bisa dicetak satu-satu (?formulir=RKA-SKPD dst)
      // atau digabung penuh (tanpa query formulir) untuk kompatibilitas lama.
      const pageStyle = `
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
            .meta td { border: none; padding: 2px; }
          </style>`;

      const pageCover = `
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
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 80px;">a. Nama</td><td style="border: none; padding: 2px;">: ${pejabat.penggunaAnggaran.nama}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">b. NIP</td><td style="border: none; padding: 2px;">: ${pejabat.penggunaAnggaran.nip}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">c. Jabatan</td><td style="border: none; padding: 2px;">: ${pejabat.penggunaAnggaran.jabatan}</td></tr>
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
                <tr><td class="center" style="border: 1px solid #000;">RKA-PENDAPATAN SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">REKAPITULASI RKA-BELANJA SKPD</td><td style="border: 1px solid #000;">Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-BELANJA SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-PEMBIAYAAN SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Pembiayaan Satuan Kerja Perangkat Daerah (jika ada)</td></tr>
              </tbody>
            </table>
          </div>`;

      const pageRingkasan = `
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
          </div>`;

      const pagePendapatan1 = `
          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN PENDAPATAN SATUAN KERJA PERANGKAT DAERAH (Formulir RKA-PENDAPATAN SKPD)</div>
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
                  ${tapdRowsFull}
                </tbody>
              </table>
            </div>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>${pejabat.kepalaDinas.nama}<br>NIP. ${pejabat.kepalaDinas.nip}</div>
            <div class="clear"></div>
          </div>`;

      const pageBelanja21 = `
          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN BELANJA OPERASI, BELANJA MODAL, BELANJA TIDAK TERDUGA, DAN BELANJA TRANSFER<br>SATUAN KERJA PERANGKAT DAERAH</div>
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

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>${pejabat.kepalaDinas.nama}<br>NIP. ${pejabat.kepalaDinas.nip}</div>
            <div class="clear"></div>
          </div>`;

      const pageRekap22 = `
          <div class="page">
            <div class="header-form">RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan (REKAPITULASI RKA-BELANJA SKPD)</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="3" style="width:10%;">Kode</th>
                  <th rowspan="3" style="width:16%;">Uraian</th>
                  <th rowspan="3" style="width:9%;">Sumber Dana</th>
                  <th rowspan="3" style="width:7%;">Lokasi</th>
                  <th rowspan="3" style="width:7%;">Jumlah Tahun ${Number(rka.tahun) - 1}</th>
                  <th colspan="10">Jumlah Tahun ${rka.tahun}</th>
                  <th rowspan="3" style="width:7%;">Jumlah Tahun ${Number(rka.tahun) + 1}</th>
                </tr>
                <tr>
                  <th colspan="5">Sebelum</th>
                  <th colspan="5">Sesudah</th>
                </tr>
                <tr>
                  <th style="width:5%;">Belanja Operasi</th><th style="width:5%;">Belanja Modal</th><th style="width:5%;">Belanja BTT</th><th style="width:5%;">Belanja Transfer</th><th style="width:5%;">Jumlah</th>
                  <th style="width:5%;">Belanja Operasi</th><th style="width:5%;">Belanja Modal</th><th style="width:5%;">Belanja BTT</th><th style="width:5%;">Belanja Transfer</th><th style="width:5%;">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${rka.kode_program || '-'}</td>
                  <td>${rka.program} / ${rka.kegiatan} / ${rka.sub_kegiatan}</td>
                  <td>${rincian[0]?.sumber_dana || 'PAD'}</td>
                  <td>${rincian[0]?.lokasi || rka.lokasi || 'Daerah'}</td>
                  <td class="right">Rp. 0,00</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sebelum.operasi)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sebelum.modal)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sebelum.btt)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sebelum.transfer)}</td>
                  <td class="right bold">${formatRupiah(comparison.totalSebelum)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sesudah.operasi)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sesudah.modal)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sesudah.btt)}</td>
                  <td class="right">${formatRupiah(belanjaTypeTotals.sesudah.transfer)}</td>
                  <td class="right bold">${formatRupiah(comparison.totalSesudah)}</td>
                  <td class="right">Rp. 0,00</td>
                </tr>
                <tr class="bold" style="background-color:#e2efda;">
                  <td colspan="15" class="center">JUMLAH BERTAMBAH / (BERKURANG)</td>
                  <td class="right">${formatRupiah(comparison.bertambahBerkurang)}</td>
                </tr>
              </tbody>
            </table>
          </div>`;

      // Formulir RKA-BELANJA SKPD — pakai builder yang sama dengan endpoint export-pdf-belanja
      // (Sebelum/Sesudah/Bertambah-Berkurang + TAPD), supaya user yang memilih formulir ini
      // dari dropdown Cetak PDF selalu dapat versi yang identik dengan cetakan mandirinya.
      const formulirBelanjaBodyHtml = await buildFormulirBelanjaBodyHtml({
        rka,
        rincian,
        comparison,
        tapdList,
        opdName,
        pejabat,
      });
      const pageDetail221 = `<div class="page">${formulirBelanjaBodyHtml}</div>`;

      const pagePembiayaan31 = `
          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Penerimaan Pembiayaan)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '-')} ${rka.urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${rka.kode_bidang_urusan || rka.kode_program || '-'} ${rka.bidang_urusan || ''}</td></tr>
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
          </div>`;

      const pagePembiayaan32 = `
          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Pengeluaran Pembiayaan)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${rka.kode_urusan || (rka.kode_program ? rka.kode_program.split('.')[0] : '-')} ${rka.urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${rka.kode_bidang_urusan || rka.kode_program || '-'} ${rka.bidang_urusan || ''}</td></tr>
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
          </div>`;

      // Katalog formulir sesuai penamaan resmi Permendagri 77/2020 & cetakan SIPD (bukan lagi
      // kode SIPD lama "RKA-SKPD 1/2.1/2.2/2.2.1/3.1/3.2"). "RKA-SKPD 2.1" (rincian belanja
      // per jenis Operasi/Modal/BTT/Transfer) bukan formulir resmi tersendiri di lampiran —
      // tetap disertakan di dokumen lengkap, tapi tidak jadi pilihan cetak satuan.
      const formulirPages = {
        'RKA-SKPD': pageRingkasan,
        'RKA-PENDAPATAN SKPD': pagePendapatan1,
        'REKAPITULASI RKA-BELANJA SKPD': pageRekap22,
        'RKA-BELANJA SKPD': pageDetail221,
        'RKA-PEMBIAYAAN SKPD': pagePembiayaan31 + pagePembiayaan32,
      };

      const formulirRequested = req.query.formulir;
      const singleFormulir = formulirRequested && formulirPages[formulirRequested];
      const bodyContent = singleFormulir
        ? formulirPages[formulirRequested]
        : [
            pageCover,
            pageRingkasan,
            pagePendapatan1,
            pageBelanja21,
            pageRekap22,
            pageDetail221,
            pagePembiayaan31,
            pagePembiayaan32,
          ].join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          ${pageStyle}
        </head>
        <body>
          ${bodyContent}
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

      const formulirSlug = singleFormulir ? `_${formulirRequested.replace(/[.\s]/g, '')}` : '';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=RKA_${id}_${rka.tahun}${formulirSlug}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ==========================================
  // 3C. EXPORT PDF GABUNGAN — MULTI RKA (dicentang lebih dari satu di Dashboard RKA)
  // GET /api/rka/export-pdf-batch?ids=34,37&formulir=... (formulir opsional, sama
  // seperti exportPdf — kalau kosong berarti "Dokumen Lengkap" per RKA)
  // ==========================================
  async exportPdfBatch(req, res) {
    let browser;
    try {
      const ids = String(req.query.ids || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: 'Parameter ids wajib diisi (contoh: ?ids=34,37).' });
      }

      // Cuma 1 RKA — tidak perlu agregasi apa pun, pakai jalur cetak biasa apa adanya.
      if (ids.length === 1) {
        req.params = { id: ids[0] };
        return module.exports.exportPdf(req, res);
      }

      const formulirRequested = req.query.formulir;

      const belanjaTypeOf = (kodeRekening) => {
        const s = String(kodeRekening || '');
        if (s.startsWith('5.1')) return 'operasi';
        if (s.startsWith('5.2')) return 'modal';
        if (s.startsWith('5.3')) return 'btt';
        if (s.startsWith('5.4')) return 'transfer';
        return null;
      };

      // Ambil data lengkap TIAP RKA yang dicentang — dipakai bareng untuk menyusun bagian
      // formulir yang tampil sekali (diagregasi) maupun yang berulang per sub kegiatan.
      const dataset = [];
      for (const id of ids) {
        const { rka, rincian } = await fetchExportData(id);
        const engineResult = await rkaEngine.recalculateWithValidation(id);
        const totals = getExportTotals(engineResult);
        const comparison = await compareTahapanHistory(Number(id));
        const pejabat = await fetchPejabatByTahun(rka.tahun);
        const belanjaTypeTotals = {
          sebelum: { operasi: 0, modal: 0, btt: 0, transfer: 0 },
          sesudah: { operasi: 0, modal: 0, btt: 0, transfer: 0 },
        };
        comparison.items.forEach((it) => {
          const type = belanjaTypeOf(it.kode_rekening);
          if (!type) return;
          belanjaTypeTotals.sebelum[type] += Number(it.jumlah_sebelum || 0);
          belanjaTypeTotals.sesudah[type] += Number(it.jumlah_sesudah || 0);
        });
        const tapdData = await Tapd.findAll({
          where: { tahun: Number(rka.tahun) },
          order: [['urutan', 'ASC']],
        });
        const tapdList = tapdData.map((t) => ({
          nama: t.nama,
          nip: t.nip,
          jabatan: t.jabatan,
          tanggal_pembahasan: t.tanggal_pembahasan || '',
          catatan: t.catatan || '',
        }));
        dataset.push({
          id,
          rka,
          rincian,
          totals,
          comparison,
          pejabat,
          belanjaTypeTotals,
          tapdList,
          opdName: rka.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI',
        });
      }

      const first = dataset[0];
      const tapdRowsFull =
        first.tapdList.length > 0
          ? first.tapdList
              .map(
                (t, i) => `<tr><td class="center">${i + 1}</td><td>${t.nama || ''}</td><td>${t.nip || ''}</td><td>${t.jabatan || ''}</td><td class="center">${i + 1}.</td></tr>`,
              )
              .join('')
          : `<tr><td colspan="5" class="center" style="color:#999;">— Data TAPD belum diisi, lengkapi di menu Setting TAPD —</td></tr>`;

      // Total gabungan seluruh RKA yang dicentang — dipakai di RKA-SKPD (ringkasan) &
      // REKAPITULASI RKA-BELANJA SKPD (baris JUMLAH TOTAL), bukan cuma RKA pertama.
      const grand = dataset.reduce(
        (acc, d) => ({
          totalBelanja: acc.totalBelanja + d.totals.totalBelanja,
          totalBelanjaOperasi: acc.totalBelanjaOperasi + d.totals.totalBelanjaOperasi,
          totalBelanjaModal: acc.totalBelanjaModal + d.totals.totalBelanjaModal,
          totalBelanjaTidakTerduga: acc.totalBelanjaTidakTerduga + d.totals.totalBelanjaTidakTerduga,
          totalBelanjaTransfer: acc.totalBelanjaTransfer + d.totals.totalBelanjaTransfer,
          sebelumOperasi: acc.sebelumOperasi + d.belanjaTypeTotals.sebelum.operasi,
          sebelumModal: acc.sebelumModal + d.belanjaTypeTotals.sebelum.modal,
          sebelumBtt: acc.sebelumBtt + d.belanjaTypeTotals.sebelum.btt,
          sebelumTransfer: acc.sebelumTransfer + d.belanjaTypeTotals.sebelum.transfer,
          sesudahOperasi: acc.sesudahOperasi + d.belanjaTypeTotals.sesudah.operasi,
          sesudahModal: acc.sesudahModal + d.belanjaTypeTotals.sesudah.modal,
          sesudahBtt: acc.sesudahBtt + d.belanjaTypeTotals.sesudah.btt,
          sesudahTransfer: acc.sesudahTransfer + d.belanjaTypeTotals.sesudah.transfer,
          totalSebelum: acc.totalSebelum + d.comparison.totalSebelum,
          totalSesudah: acc.totalSesudah + d.comparison.totalSesudah,
        }),
        {
          totalBelanja: 0,
          totalBelanjaOperasi: 0,
          totalBelanjaModal: 0,
          totalBelanjaTidakTerduga: 0,
          totalBelanjaTransfer: 0,
          sebelumOperasi: 0,
          sebelumModal: 0,
          sebelumBtt: 0,
          sebelumTransfer: 0,
          sesudahOperasi: 0,
          sesudahModal: 0,
          sesudahBtt: 0,
          sesudahTransfer: 0,
          totalSebelum: 0,
          totalSesudah: 0,
        },
      );

      const pageStyle = `
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
            .meta td { border: none; padding: 2px; }
          </style>`;

      const pageCover = `
          <div class="page" style="padding: 10px;">
            <div class="cover-title" style="margin-top: 10px;">
              PEMERINTAH PROVINSI MALUKU UTARA<br>
              RENCANA ANGGARAN DAERAH<br>
              SATUAN KERJA PERANGKAT DAERAH<br>
              (RKA-SKPD)<br>
              TAHUN ANGGARAN ${first.rka.tahun}
            </div>

            <div class="cover-meta" style="margin-top: 30px; font-size: 12px;">
              <table style="border: none; width: auto; margin-top: 0;">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 150px; font-weight: bold;">URUSAN PEMERINTAHAN</td><td style="border: none; padding: 2px;">: ${first.rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px; font-weight: bold;">ORGANISASI</td><td style="border: none; padding: 2px;">: ${first.opdName}</td></tr>
              </table>
            </div>

            <div style="margin-top: 20px; font-size: 12px;">
              <p class="bold" style="margin-bottom: 5px;">Pengguna Anggaran :</p>
              <table style="border: none; width: auto; margin-top: 0; margin-left: 10px;">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 80px;">a. Nama</td><td style="border: none; padding: 2px;">: ${first.pejabat.penggunaAnggaran.nama}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">b. NIP</td><td style="border: none; padding: 2px;">: ${first.pejabat.penggunaAnggaran.nip}</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">c. Jabatan</td><td style="border: none; padding: 2px;">: ${first.pejabat.penggunaAnggaran.jabatan}</td></tr>
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
                <tr><td class="center" style="border: 1px solid #000;">RKA-PENDAPATAN SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Pendapatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">REKAPITULASI RKA-BELANJA SKPD</td><td style="border: 1px solid #000;">Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-BELANJA SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Belanja menurut Program, Kegiatan dan Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr>
                <tr><td class="center" style="border: 1px solid #000;">RKA-PEMBIAYAAN SKPD</td><td style="border: 1px solid #000;">Rincian Anggaran Pembiayaan Satuan Kerja Perangkat Daerah (jika ada)</td></tr>
              </tbody>
            </table>
          </div>`;

      const pageRingkasan = `
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
                <tr class="bold"><td>5</td><td>BELANJA DAERAH</td><td class="right">${formatRupiah(grand.totalBelanja)}</td></tr>
                <tr><td>5.1</td><td style="padding-left: 20px;">BELANJA OPERASI</td><td class="right">${formatRupiah(grand.totalBelanjaOperasi)}</td></tr>
                <tr><td>5.2</td><td style="padding-left: 20px;">BELANJA MODAL</td><td class="right">${formatRupiah(grand.totalBelanjaModal)}</td></tr>
                <tr><td>5.3</td><td style="padding-left: 20px;">BELANJA TIDAK TERDUGA</td><td class="right">${formatRupiah(grand.totalBelanjaTidakTerduga)}</td></tr>
                <tr><td>5.4</td><td style="padding-left: 20px;">BELANJA TRANSFER</td><td class="right">${formatRupiah(grand.totalBelanjaTransfer)}</td></tr>
                <tr class="bold"><td></td><td>SURPLUS / (DEFISIT)</td><td class="right">-${formatRupiah(grand.totalBelanja)}</td></tr>
                <tr class="bold"><td>6</td><td>PEMBIAYAAN DAERAH</td><td class="right">0</td></tr>
                <tr><td>6.1</td><td style="padding-left: 20px;">PENERIMAAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr><td>6.2</td><td style="padding-left: 20px;">PENGELUARAN PEMBIAYAAN</td><td class="right">0</td></tr>
                <tr class="bold"><td></td><td>PEMBIAYAAN NETTO</td><td class="right">0</td></tr>
                <tr class="bold"><td></td><td>SISA LEBIH PEMBIAYAAN ANGGARAN TAHUN BERJALAN (SILPA)</td><td class="right">0</td></tr>
              </tbody>
            </table>
            <div class="footer-sign">Ternate, 02 Juni 2026<br>Pejabat Pengelola Keuangan Daerah<br><br><br><br>( _______________________ )</div>
            <div class="clear"></div>
          </div>`;

      const pagePendapatan1 = `
          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN PENDAPATAN SATUAN KERJA PERANGKAT DAERAH (Formulir RKA-PENDAPATAN SKPD)</div>
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
                  ${tapdRowsFull}
                </tbody>
              </table>
            </div>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>${first.pejabat.kepalaDinas.nama}<br>NIP. ${first.pejabat.kepalaDinas.nip}</div>
            <div class="clear"></div>
          </div>`;

      const pageBelanja21 = `
          <div class="page">
            <div class="header-form">RINCIAN ANGGARAN BELANJA OPERASI, BELANJA MODAL, BELANJA TIDAK TERDUGA, DAN BELANJA TRANSFER<br>SATUAN KERJA PERANGKAT DAERAH</div>
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
                  <td class="center">5</td><td>BELANJA DAERAH</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanja)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.1</td><td style="padding-left: 15px;">BELANJA OPERASI</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanjaOperasi)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.2</td><td style="padding-left: 15px;">BELANJA MODAL</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanjaModal)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.3</td><td style="padding-left: 15px;">BELANJA TIDAK TERDUGA</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanjaTidakTerduga)}</td><td class="right">0</td>
                </tr>
                <tr>
                  <td class="bold">5.4</td><td style="padding-left: 15px;">BELANJA TRANSFER</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanjaTransfer)}</td><td class="right">0</td>
                </tr>
                <tr class="bold" style="background-color: #e2efda;">
                  <td class="center"></td><td>JUMLAH TOTAL BELANJA</td><td></td><td></td><td></td><td class="right">${formatRupiah(grand.totalBelanja)}</td><td class="right">0</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 15px; font-size: 9px; border: 1px solid #000; padding: 6px;">
              <strong>Tanggal Pembahasan:</strong> 02 Juni 2026<br>
              <strong>Catatan Hasil Pembahasan:</strong> Alokasi Rincian Belanja Daerah disesuaikan dengan target batas anggaran belanja sub-kegiatan organisasi terkait.
            </div>

            <div class="footer-sign">Ternate, 02 Juni 2026<br>Kepala SKPD / Pengguna Anggaran<br><br><br><br>${first.pejabat.kepalaDinas.nama}<br>NIP. ${first.pejabat.kepalaDinas.nip}</div>
            <div class="clear"></div>
          </div>`;

      // REKAPITULASI RKA-BELANJA SKPD — SATU baris per sub kegiatan yang dicentang, ditutup
      // dengan baris JUMLAH TOTAL yang menjumlahkan seluruh baris (bukan cuma RKA pertama).
      const rekapRows = dataset
        .map(
          (d) => `<tr>
                  <td>${d.rka.kode_program || '-'}</td>
                  <td>${d.rka.program} / ${d.rka.kegiatan} / ${d.rka.sub_kegiatan}</td>
                  <td>${d.rincian[0]?.sumber_dana || 'PAD'}</td>
                  <td>${d.rincian[0]?.lokasi || d.rka.lokasi || 'Daerah'}</td>
                  <td class="right">Rp. 0,00</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sebelum.operasi)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sebelum.modal)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sebelum.btt)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sebelum.transfer)}</td>
                  <td class="right bold">${formatRupiah(d.comparison.totalSebelum)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sesudah.operasi)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sesudah.modal)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sesudah.btt)}</td>
                  <td class="right">${formatRupiah(d.belanjaTypeTotals.sesudah.transfer)}</td>
                  <td class="right bold">${formatRupiah(d.comparison.totalSesudah)}</td>
                  <td class="right">Rp. 0,00</td>
                </tr>`,
        )
        .join('');

      const pageRekap22 = `
          <div class="page">
            <div class="header-form">RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>Rekapitulasi Anggaran Belanja Berdasarkan Program dan Kegiatan (REKAPITULASI RKA-BELANJA SKPD)</div>
            <table>
              <thead>
                <tr>
                  <th rowspan="3" style="width:10%;">Kode</th>
                  <th rowspan="3" style="width:16%;">Uraian</th>
                  <th rowspan="3" style="width:9%;">Sumber Dana</th>
                  <th rowspan="3" style="width:7%;">Lokasi</th>
                  <th rowspan="3" style="width:7%;">Jumlah Tahun ${Number(first.rka.tahun) - 1}</th>
                  <th colspan="10">Jumlah Tahun ${first.rka.tahun}</th>
                  <th rowspan="3" style="width:7%;">Jumlah Tahun ${Number(first.rka.tahun) + 1}</th>
                </tr>
                <tr>
                  <th colspan="5">Sebelum</th>
                  <th colspan="5">Sesudah</th>
                </tr>
                <tr>
                  <th style="width:5%;">Belanja Operasi</th><th style="width:5%;">Belanja Modal</th><th style="width:5%;">Belanja BTT</th><th style="width:5%;">Belanja Transfer</th><th style="width:5%;">Jumlah</th>
                  <th style="width:5%;">Belanja Operasi</th><th style="width:5%;">Belanja Modal</th><th style="width:5%;">Belanja BTT</th><th style="width:5%;">Belanja Transfer</th><th style="width:5%;">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                ${rekapRows}
                <tr class="bold" style="background-color:#e2efda;">
                  <td colspan="4" class="center">JUMLAH TOTAL</td>
                  <td class="right">Rp. 0,00</td>
                  <td class="right">${formatRupiah(grand.sebelumOperasi)}</td>
                  <td class="right">${formatRupiah(grand.sebelumModal)}</td>
                  <td class="right">${formatRupiah(grand.sebelumBtt)}</td>
                  <td class="right">${formatRupiah(grand.sebelumTransfer)}</td>
                  <td class="right">${formatRupiah(grand.totalSebelum)}</td>
                  <td class="right">${formatRupiah(grand.sesudahOperasi)}</td>
                  <td class="right">${formatRupiah(grand.sesudahModal)}</td>
                  <td class="right">${formatRupiah(grand.sesudahBtt)}</td>
                  <td class="right">${formatRupiah(grand.sesudahTransfer)}</td>
                  <td class="right">${formatRupiah(grand.totalSesudah)}</td>
                  <td class="right">Rp. 0,00</td>
                </tr>
                <tr class="bold" style="background-color:#e2efda;">
                  <td colspan="15" class="center">JUMLAH BERTAMBAH / (BERKURANG)</td>
                  <td class="right">${formatRupiah(grand.totalSesudah - grand.totalSebelum)}</td>
                </tr>
              </tbody>
            </table>
          </div>`;

      // RKA-BELANJA SKPD — TETAP berulang satu formulir per sub kegiatan yang dicentang
      // (bukan diagregasi), karena masing-masing punya rincian belanja sendiri-sendiri.
      const detailPagesList = [];
      for (const d of dataset) {
        const bodyHtml = await buildFormulirBelanjaBodyHtml({
          rka: d.rka,
          rincian: d.rincian,
          comparison: d.comparison,
          tapdList: d.tapdList,
          opdName: d.opdName,
          pejabat: d.pejabat,
        });
        detailPagesList.push(`<div class="page">${bodyHtml}</div>`);
      }
      const pageDetailAll = detailPagesList.join('');

      const pagePembiayaan31 = `
          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Penerimaan Pembiayaan)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${first.rka.kode_urusan || (first.rka.kode_program ? first.rka.kode_program.split('.')[0] : '-')} ${first.rka.urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${first.rka.kode_bidang_urusan || first.rka.kode_program || '-'} ${first.rka.bidang_urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Program</td><td style="border: none; padding:2px;">: ${first.rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Organisasi</td><td style="border: none; padding:2px;">: ${first.opdName}</td></tr>
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
          </div>`;

      const pagePembiayaan32 = `
          <div class="page">
            <div class="header-form">
              RENCANA KERJA DAN ANGGARAN<br>
              SATUAN KERJA PERANGKAT DAERAH (RKA-PEMBIAYAAN SKPD — Pengeluaran Pembiayaan)
            </div>

            <div style="line-height: 1.5; margin-bottom: 15px; font-size: 11px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;"><td style="width: 18%; border: none; font-weight: bold; padding:2px;">Urusan Pemerintahan</td><td style="border: none; padding:2px;">: ${first.rka.kode_urusan || (first.rka.kode_program ? first.rka.kode_program.split('.')[0] : '-')} ${first.rka.urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Bidang Urusan</td><td style="border: none; padding:2px;">: ${first.rka.kode_bidang_urusan || first.rka.kode_program || '-'} ${first.rka.bidang_urusan || ''}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Program</td><td style="border: none; padding:2px;">: ${first.rka.program}</td></tr>
                <tr style="border: none;"><td style="border: none; font-weight: bold; padding:2px;">Organisasi</td><td style="border: none; padding:2px;">: ${first.opdName}</td></tr>
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
          </div>`;

      const formulirPages = {
        'RKA-SKPD': pageRingkasan,
        'RKA-PENDAPATAN SKPD': pagePendapatan1,
        'REKAPITULASI RKA-BELANJA SKPD': pageRekap22,
        'RKA-BELANJA SKPD': pageDetailAll,
        'RKA-PEMBIAYAAN SKPD': pagePembiayaan31 + pagePembiayaan32,
      };

      const singleFormulir = formulirRequested && formulirPages[formulirRequested];
      const bodyContent = singleFormulir
        ? formulirPages[formulirRequested]
        : [
            pageCover,
            pageRingkasan,
            pagePendapatan1,
            pageBelanja21,
            pageRekap22,
            pageDetailAll,
            pagePembiayaan31,
            pagePembiayaan32,
          ].join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          ${pageStyle}
        </head>
        <body>
          ${bodyContent}
        </body>
        </html>
      `;

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

      const formulirSlug = singleFormulir ? `_${formulirRequested.replace(/[.\s]/g, '')}` : '';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=RKA_Gabungan_${ids.length}dok_${first.rka.tahun}${formulirSlug}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

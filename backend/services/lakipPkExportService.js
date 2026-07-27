'use strict';

const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'branding', 'logo-maluku-utara.jpeg');
let LOGO_BASE64 = null;
try {
  LOGO_BASE64 = fs.readFileSync(LOGO_PATH).toString('base64');
} catch (e) {
  LOGO_BASE64 = null;
}

const escH = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtPct = (v, satuan) =>
  v === null || v === undefined || v === '' ? '-' : `${Number(v).toFixed(2)} ${satuan || ''}`.trim();

const fmtTanggalIndo = (dateStr) => {
  if (!dateStr) return '............................';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '............................';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const nl2br = (text) => escH(text).replace(/\n/g, '<br/>');

const letterFor = (idx) => String.fromCharCode(65 + idx);

const TD = 'border:1px solid #333;padding:6px 8px;vertical-align:top;text-align:left;';
const TD_C = 'border:1px solid #333;padding:6px 8px;vertical-align:top;text-align:center;';
const TH =
  'border:1px solid #333;padding:6px 8px;background:#f0f0f0;font-weight:bold;text-align:left;';
const NOBORDER_C = 'border:none;padding:6px 8px;vertical-align:top;text-align:center;';
const LABEL_SPAN = 'display:inline-block;width:80px;';

const jabatanKepalaDinas = (detail) => {
  const nama = String(detail.nama_opd || '').trim();
  if (!nama) return 'Kepala Dinas';
  return /^dinas\b/i.test(nama) ? `Kepala ${nama}` : `Kepala Dinas ${nama}`;
};

function buildPkHtml(detail, tahun) {
  const sasaranTeknis = detail.sasaran_teknis || [];
  const pihakKedua = detail.pihak_kedua || {};
  const serapan = detail.tata_kelola?.serapan_anggaran || {};
  const tlBpk = detail.tata_kelola?.tl_bpk || {};
  const ikm = detail.tata_kelola?.ikm || {};
  const jabatanKedua = pihakKedua.jabatan || jabatanKepalaDinas(detail);
  const tataKelolaLetter = letterFor(sasaranTeknis.length);
  const namaTataKelolaSasaran = `Meningkatnya tata kelola pemerintahan ${detail.nama_opd || ''}`.trim();

  const sasaranRows = sasaranTeknis
    .map(
      (s, idx) => `
      <tr>
        <td style="${TD_C}">${idx + 1}</td>
        <td style="${TD}">${escH(s.isi_sasaran)}</td>
        <td style="${TD}">${escH(s.nama_indikator)}</td>
        <td style="${TD_C}">${fmtPct(s.target_tahun_ini, s.satuan)}</td>
      </tr>`,
    )
    .join('');

  const tataKelolaRows = `
    <tr>
      <td style="${TD_C}">${sasaranTeknis.length + 1}</td>
      <td style="${TD}" rowspan="3">${escH(namaTataKelolaSasaran)}</td>
      <td style="${TD}">Serapan Anggaran</td>
      <td style="${TD_C}">${escH(detail.target_serapan_anggaran || '-')}</td>
    </tr>
    <tr>
      <td style="${TD_C}">${sasaranTeknis.length + 2}</td>
      <td style="${TD}">Tindak Lanjut Temuan BPK</td>
      <td style="${TD_C}">${escH(detail.target_tl_bpk || '-')}</td>
    </tr>
    <tr>
      <td style="${TD_C}">${sasaranTeknis.length + 3}</td>
      <td style="${TD}">Indeks Kepuasan Masyarakat</td>
      <td style="${TD_C}">${escH(detail.target_ikm || '-')}</td>
    </tr>`;

  const outputSasaranSections = sasaranTeknis
    .map((s, idx) => {
      const letter = letterFor(idx);
      return `
      <p style="margin:10px 0 4px;"><strong>${letter}. Sasaran Strategis ${escH(s.isi_sasaran)}</strong></p>
      <p style="margin:2px 0 6px;">1. ${escH(s.nama_indikator)}</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 12px;">
        <tr>
          <td style="${TD}width:20%;"><strong>Output</strong></td>
          <td style="${TD}">${nl2br(s.output || '-')}</td>
        </tr>
        <tr>
          <td style="${TD}"><strong>Realisasi ${escH(s.tahun_realisasi || '')}</strong></td>
          <td style="${TD}">${fmtPct(s.realisasi_tahun_lalu, s.satuan)}</td>
        </tr>
        <tr>
          <td style="${TD}"><strong>Target ${escH(tahun)}</strong></td>
          <td style="${TD}">${fmtPct(s.target_tahun_ini, s.satuan)}</td>
        </tr>
        <tr>
          <td style="${TD}"><strong>Bukti Ukur</strong></td>
          <td style="${TD}">${nl2br(s.bukti_ukur || '-')}</td>
        </tr>
      </table>`;
    })
    .join('');

  const tahunRealisasiTk = Number(tahun) - 1;
  const tataKelolaSection = `
    <p style="margin:10px 0 4px;"><strong>${tataKelolaLetter}. Tata Kelola &amp; Akuntabilitas</strong></p>
    <p style="margin:2px 0;">1. Serapan Anggaran<br/>
      Realisasi ${escH(tahunRealisasiTk)}: ${typeof serapan.persen === 'number' ? serapan.persen + '%' : 'Belum tersedia'}<br/>
      Target ${escH(tahun)}: ${escH(detail.target_serapan_anggaran || '-')}</p>
    <p style="margin:2px 0;">2. Tindak Lanjut Temuan BPK<br/>
      Realisasi ${escH(tahunRealisasiTk)}: ${typeof tlBpk.persen === 'number' ? tlBpk.persen + '%' : 'Belum tersedia'}<br/>
      Target ${escH(tahun)}: ${escH(detail.target_tl_bpk || '-')}</p>
    <p style="margin:2px 0;">3. Indeks Kepuasan Masyarakat Layanan<br/>
      Realisasi ${escH(tahunRealisasiTk)}: ${ikm?.skor != null ? escH(ikm.skor) : '-'}<br/>
      Target ${escH(tahun)}: ${escH(detail.target_ikm || '-')}</p>`;

  const programRows = (detail.program_anggaran || [])
    .map(
      (p, idx) => `
      <tr>
        <td style="${TD_C}">${idx + 1}.</td>
        <td style="${TD}">${escH(p.nama_program)}</td>
        <td style="${TD_C}">${fmtRp(p.jumlah_anggaran)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Perjanjian Kinerja ${escH(detail.nama_opd)} ${escH(tahun)}</title></head>
<body style="font-family:'Times New Roman', Times, serif;font-size:12pt;color:#111;">
  ${
    LOGO_BASE64
      ? `<div style="text-align:center;margin-bottom:8px;"><img src="data:image/jpeg;base64,${LOGO_BASE64}" style="width:80px;height:auto;"/></div>`
      : ''
  }
  <h1 style="text-align:center;margin:4px 0;font-size:16pt;">PERJANJIAN KINERJA</h1>
  <h2 style="text-align:center;margin:4px 0;font-size:14pt;">KEPALA DINAS PANGAN</h2>
  <h2 style="text-align:center;margin:4px 0;font-size:14pt;">PROVINSI MALUKU UTARA</h2>
  <h2 style="text-align:center;margin:4px 0;font-size:14pt;">TAHUN ANGGARAN ${escH(tahun)}</h2>

  <p>Dalam rangka mewujudkan akuntabilitas kinerja instansi pemerintah, kami yang bertanda tangan dibawah ini:</p>

  <p><strong>PIHAK PERTAMA</strong></p>
  <p style="margin:2px 0;"><span style="${LABEL_SPAN}">Nama</span> : ${escH(detail.pihak_pertama_nama)}</p>
  <p style="margin:2px 0 10px;"><span style="${LABEL_SPAN}">Jabatan</span> : ${escH(detail.pihak_pertama_jabatan)}</p>

  <p><strong>PIHAK KEDUA</strong></p>
  <p style="margin:2px 0;"><span style="${LABEL_SPAN}">Nama</span> : ${escH(pihakKedua.nama || 'Belum diisi — lengkapi di menu Setting Pejabat Penandatangan')}</p>
  <p style="margin:2px 0 10px;"><span style="${LABEL_SPAN}">Jabatan</span> : ${escH(jabatanKedua)}</p>

  <p>Menyatakan sepakat untuk mengikatkan diri dalam Perjanjian Kinerja Tahun Anggaran ${escH(tahun)} dengan ketentuan sebagai berikut:</p>

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 1</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Tujuan Perjanjian Kinerja</h3>
  <p>${nl2br(detail.pasal1_tujuan)}</p>

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 2</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Sasaran Kinerja dan Output Terukur</h3>
  <p>PIHAK KEDUA WAJIB mencapai target berikut:</p>
  ${outputSasaranSections}
  ${tataKelolaSection}

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 3</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Evaluasi Berkala</h3>
  <p>${nl2br(detail.pasal3_evaluasi)}</p>

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 4</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Konsekuensi Kinerja</h3>
  <p>${nl2br(detail.pasal4_konsekuensi)}</p>

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 5</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Larangan dan Etika Kinerja</h3>
  <p>${nl2br(detail.pasal5_larangan)}</p>
  <p>${nl2br(detail.pasal5_etika)}</p>

  <h2 style="text-align:center;margin:12px 0 2px;font-size:13pt;">Pasal 6</h2>
  <h3 style="text-align:center;margin:2px 0 6px;font-size:12pt;">Penutup</h3>
  <p>${nl2br(detail.pasal6_penutup)}</p>

  <p style="text-align:right;">Sofifi, ${fmtTanggalIndo(detail.tanggal_ttd)}</p>

  <table style="width:100%;border-collapse:collapse;margin:10px 0;">
    <tr>
      <td width="50%" style="${NOBORDER_C}"><strong>PIHAK PERTAMA</strong><br/>${escH(String(detail.pihak_pertama_jabatan || '').toUpperCase())}</td>
      <td width="50%" style="${NOBORDER_C}"><strong>PIHAK KEDUA</strong><br/>${escH(jabatanKedua.toUpperCase())}</td>
    </tr>
    <tr>
      <td width="50%" style="${NOBORDER_C}padding-top:50px;"><strong>${escH(detail.pihak_pertama_nama)}</strong></td>
      <td width="50%" style="${NOBORDER_C}padding-top:50px;"><strong>${escH(pihakKedua.nama || '..............................')}</strong><br/>NIP. ${escH(pihakKedua.nip || '-')}</td>
    </tr>
  </table>

  <h2 style="text-align:center;margin:20px 0 8px;font-size:13pt;">LAMPIRAN: INDIKATOR KINERJA UTAMA TAHUN ${escH(tahun)}</h2>
  <table style="width:100%;border-collapse:collapse;margin:10px 0;">
    <thead>
      <tr><th style="${TH}">No.</th><th style="${TH}">Sasaran Strategis</th><th style="${TH}">Indikator Kinerja</th><th style="${TH}">Target</th></tr>
    </thead>
    <tbody>
      ${sasaranRows}
      ${tataKelolaRows}
    </tbody>
  </table>

  <h3 style="margin:16px 0 6px;font-size:12pt;">Program &amp; Anggaran</h3>
  <table style="width:100%;border-collapse:collapse;margin:10px 0;">
    <thead>
      <tr><th style="${TH}">No.</th><th style="${TH}">Program</th><th style="${TH}">Jumlah Anggaran</th></tr>
    </thead>
    <tbody>
      ${programRows || `<tr><td style="${TD_C}" colspan="3">Belum ada data program</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = { buildPkHtml };

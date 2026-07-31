'use strict';

const puppeteer = require('puppeteer');
const HTMLtoDOCX = require('html-to-docx');
const { Pengkeg } = require('../models');
const {
  buildRealisasiIndikatorHierarchy,
} = require('../services/realisasiIndikatorRenstraHierarchyService');
const { attachRealisasiKeuangan, includeAssoc } = require('./pengkegController');

const s = (v, fallback = '-') => (v ? String(v).trim() : fallback);
const fmtNum = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));
const fmtRp = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

// Sama seperti buildHistoryTree di frontend (LpkDispangHistoryTree.jsx) — kelompokkan
// baris Pengkeg ke tree Tujuan->Sasaran->Program->Kegiatan lewat kode_kegiatan, supaya
// tampilan cetak identik dengan tabel "Riwayat Realisasi Sub Kegiatan" di dashboard.
function buildHistoryTree(tree, historyRows) {
  const rowsByKegiatan = new Map();
  historyRows.forEach((r) => {
    const kode = r.dpa?.kode_kegiatan;
    if (!kode) return;
    if (!rowsByKegiatan.has(kode)) rowsByKegiatan.set(kode, []);
    rowsByKegiatan.get(kode).push(r);
  });

  return tree
    .map((t) => {
      const sasaran = (t.sasaran || [])
        .map((sas) => {
          const program = (sas.program || [])
            .map((p) => {
              const kegiatan = (p.kegiatan || [])
                .map((k) => ({ ...k, rows: rowsByKegiatan.get(k.kode_kegiatan) || [] }))
                .filter((k) => k.rows.length > 0);
              const count = kegiatan.reduce((sum, k) => sum + k.rows.length, 0);
              return { ...p, kegiatan, count };
            })
            .filter((p) => p.count > 0);
          const count = program.reduce((sum, p) => sum + p.count, 0);
          return { ...sas, program, count };
        })
        .filter((sas) => sas.count > 0);
      const count = sasaran.reduce((sum, sas) => sum + sas.count, 0);
      return { ...t, sasaran, count };
    })
    .filter((t) => t.count > 0);
}

async function gatherData(renstraId, tahun) {
  const { renstra, tree, iku, ikk } = await buildRealisasiIndikatorHierarchy({
    renstra_id: renstraId,
    tahun,
  });

  const pengkegRows = await Pengkeg.findAll({
    where: { tahun: String(tahun) },
    include: includeAssoc,
    order: [[{ model: includeAssoc[1].model, as: 'dpa' }, 'kode_sub_kegiatan', 'ASC']],
  });
  const historyRows = await attachRealisasiKeuangan(pengkegRows);
  const historyTree = buildHistoryTree(tree, historyRows);

  return { renstra, tree, iku, ikk, historyTree, tahun };
}

// Tabel generik untuk daftar indikator + target + realisasi (dipakai untuk IKU, IKK,
// dan indikator per level Tujuan/Sasaran/Program/Kegiatan — semua punya bentuk yang sama:
// { nama_indikator, satuan, target, nilai_realisasi }).
function indikatorTableHtml(items, tahun) {
  if (!items || !items.length) {
    return `<p class="empty">Belum ada data indikator.</p>`;
  }
  const rows = items
    .map((ind, i) => {
      const target = Number(ind.target);
      const realisasi = Number(ind.nilai_realisasi);
      const capaian =
        Number.isFinite(target) && target !== 0 && Number.isFinite(realisasi)
          ? `${((realisasi / target) * 100).toFixed(1)}%`
          : '-';
      return `<tr>
        <td>${i + 1}</td>
        <td>${s(ind.nama_indikator)}</td>
        <td>${s(ind.satuan)}</td>
        <td style="text-align:center">${fmtNum(ind.target)}</td>
        <td style="text-align:center">${fmtNum(ind.nilai_realisasi)}</td>
        <td style="text-align:center">${capaian}</td>
      </tr>`;
    })
    .join('');
  return `<table>
    <thead>
      <tr>
        <th style="width:32px">No</th>
        <th>Indikator</th>
        <th style="width:80px">Satuan</th>
        <th style="width:90px">Target ${s(tahun)}</th>
        <th style="width:90px">Realisasi</th>
        <th style="width:80px">Capaian</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function subKegiatanTableHtml(rows) {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${s(r.dpa?.kode_sub_kegiatan)}</td>
        <td>${s(r.nama_kegiatan)}</td>
        <td style="text-align:center">${fmtNum(r.realisasi_fisik)}</td>
        <td style="text-align:right">${fmtRp(r.realisasi_keuangan)}</td>
        <td>${s(r.keterangan, '')}</td>
      </tr>`,
    )
    .join('');
  return `<table>
    <thead>
      <tr>
        <th style="width:110px">Sub Kegiatan (Kode)</th>
        <th>Nama Kegiatan</th>
        <th style="width:90px">Realisasi Fisik</th>
        <th style="width:130px">Realisasi Keuangan</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildHtml(data) {
  const { renstra, tree, iku, ikk, historyTree, tahun } = data;
  const namaOpd = s(renstra?.nama_opd, 'Perangkat Daerah');
  const tglGen = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const levelSection = tree
    .map((t) => {
      const sasaranHtml = (t.sasaran || [])
        .map((sas) => {
          const programHtml = (sas.program || [])
            .map((p) => {
              const kegiatanHtml = (p.kegiatan || [])
                .map(
                  (k) => `
              <h5>Kegiatan: ${s(k.kode_kegiatan)} — ${s(k.nama_kegiatan)}</h5>
              ${indikatorTableHtml(k.indikator, tahun)}`,
                )
                .join('');
              return `
            <h4>Program: ${s(p.kode_program)} — ${s(p.nama_program)}</h4>
            ${indikatorTableHtml(p.indikator, tahun)}
            ${kegiatanHtml}`;
            })
            .join('');
          return `
          <h3>Sasaran: ${s(sas.nomor)} — ${s(sas.isi_sasaran)}</h3>
          ${indikatorTableHtml(sas.indikator, tahun)}
          ${programHtml}`;
        })
        .join('');
      return `
      <h2 class="tujuan-title">Tujuan: ${s(t.no_tujuan)} — ${s(t.isi_tujuan)}</h2>
      ${indikatorTableHtml(t.indikator, tahun)}
      ${sasaranHtml}`;
    })
    .join('');

  const historySection = historyTree.length
    ? historyTree
        .map(
          (t) => `
      <h3>${s(t.no_tujuan)} — ${s(t.isi_tujuan)}</h3>
      ${t.sasaran
        .map(
          (sas) => `
      <h4>${s(sas.nomor)} — ${s(sas.isi_sasaran)}</h4>
      ${sas.program
        .map(
          (p) => `
      <h5>${s(p.kode_program)} — ${s(p.nama_program)}</h5>
      ${p.kegiatan
        .map(
          (k) => `
      <h6>${s(k.kode_kegiatan)} — ${s(k.nama_kegiatan)}</h6>
      ${subKegiatanTableHtml(k.rows)}`,
        )
        .join('')}`,
        )
        .join('')}`,
        )
        .join('')}`,
        )
        .join('')
    : `<p class="empty">Belum ada data realisasi Sub Kegiatan untuk tahun ${s(tahun)}.</p>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Pengelolaan Kegiatan ${namaOpd} ${s(tahun)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.5; margin: 0; padding: 24px 32px; color: #000; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a5276; padding-bottom: 12px; }
  .header h1 { font-size: 15pt; margin: 0 0 4px; color: #1a5276; text-transform: uppercase; }
  .header h2 { font-size: 13pt; margin: 0 0 2px; }
  .header p { margin: 2px 0; color: #333; }
  h2.tujuan-title { font-size: 12.5pt; background: #1a5276; color: #fff; padding: 6px 10px; margin-top: 22px; }
  h3 { font-size: 11.5pt; color: #1a5276; margin-top: 14px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  h4 { font-size: 11pt; margin-top: 10px; margin-left: 4px; }
  h5 { font-size: 10.5pt; margin-top: 8px; margin-left: 10px; font-style: italic; }
  h6 { font-size: 10.5pt; margin-top: 6px; margin-left: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0 12px; font-size: 9.5pt; }
  table th { background: #d6e4ef; color: #1a5276; padding: 5px 6px; text-align: center; border: 1px solid #9db8c9; }
  table td { padding: 4px 6px; vertical-align: top; border: 1px solid #ccc; }
  table tr:nth-child(even) { background: #f7f9fb; }
  .empty { font-style: italic; color: #888; margin: 6px 0 14px; }
  .section-title { font-size: 13pt; text-transform: uppercase; color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 4px; margin-top: 26px; }
  .pagebreak { page-break-before: always; }
  .footer-note { margin-top: 24px; font-size: 9pt; color: #666; text-align: right; }
</style>
</head>
<body>

<div class="header">
  <h1>Laporan Pengelolaan Kegiatan</h1>
  <h2>${namaOpd}</h2>
  <p>Tahun ${s(tahun)}</p>
</div>

<div class="section-title">A. Indikator Kinerja Utama (IKU)</div>
${indikatorTableHtml(iku, tahun)}

<div class="section-title">B. Indikator Kinerja Kunci (IKK)</div>
${indikatorTableHtml(ikk, tahun)}

<div class="section-title pagebreak">C. Realisasi Capaian Indikator per Level Tujuan–Kegiatan</div>
${levelSection || `<p class="empty">Belum ada data Tujuan untuk Renstra OPD ini.</p>`}

<div class="section-title pagebreak">D. Riwayat Realisasi Sub Kegiatan</div>
${historySection}

<p class="footer-note">Digenerate otomatis pada ${tglGen}</p>

</body>
</html>`;
}

exports.previewHtml = async (req, res) => {
  try {
    const { renstra_id, tahun } = req.query;
    if (!renstra_id || !tahun) {
      return res.status(400).json({ error: 'renstra_id dan tahun wajib diisi' });
    }
    const data = await gatherData(renstra_id, tahun);
    const html = buildHtml(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('❌ [lpkDispangPrint] previewHtml error:', err);
    return res.status(500).json({ error: 'Gagal membuat preview', detail: err.message });
  }
};

exports.generatePdf = async (req, res) => {
  let browser;
  try {
    const { renstra_id, tahun } = req.query;
    if (!renstra_id || !tahun) {
      return res.status(400).json({ error: 'renstra_id dan tahun wajib diisi' });
    }
    const data = await gatherData(renstra_id, tahun);
    const html = buildHtml(data);
    const namaOpd = s(data.renstra?.nama_opd, 'OPD').replace(/\s+/g, '_');
    const filename = `LPK_Dispang_${namaOpd}_${tahun}.pdf`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('❌ [lpkDispangPrint] generatePdf error:', err);
    return res.status(500).json({ error: 'Gagal generate PDF', detail: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

exports.generateDocx = async (req, res) => {
  try {
    const { renstra_id, tahun } = req.query;
    if (!renstra_id || !tahun) {
      return res.status(400).json({ error: 'renstra_id dan tahun wajib diisi' });
    }
    const data = await gatherData(renstra_id, tahun);
    let html = buildHtml(data);
    // Strip emoji & non-latin chars serta tag <style> — html-to-docx tidak mendukungnya.
    html = html.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
    html = html.replace(
      /[^\t\n\r -~À-ɏḀ-ỿ–—‘’“”…]/gu,
      '',
    );
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Strip width:% dari style atribut — menyebabkan Invalid XML di html-to-docx.
    html = html.replace(/style="([^"]*)width:\s*\d+%?px?([^"]*)"/g, (m, pre, post) => {
      const cleaned = (pre + post).replace(/;+/g, ';').replace(/^;|;$/g, '').trim();
      return cleaned ? `style="${cleaned}"` : '';
    });

    const namaOpd = s(data.renstra?.nama_opd, 'OPD').replace(/\s+/g, '_');
    const filename = `LPK_Dispang_${namaOpd}_${tahun}.docx`;

    const docxBuffer = await HTMLtoDOCX(html, null, {
      font: 'Arial',
      fontSize: 21,
      orientation: 'portrait',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    return res.end(docxBuffer);
  } catch (err) {
    console.error('❌ [lpkDispangPrint] generateDocx error:', err);
    return res.status(500).json({ error: 'Gagal generate DOCX', detail: err.message });
  }
};

/**
 * lakipGeneratorController.js
 * Generator dokumen LAKIP/LKj untuk ePeLARA.
 *
 * Endpoint:
 *   GET /api/lakip-generator/data?tahun=2025&periode_id=1
 *   GET /api/lakip-generator/preview?tahun=2025&periode_id=1   → HTML print-ready
 *   GET /api/lakip-generator/export-pdf?tahun=2025&periode_id=1 → PDF (Tahap 2)
 */

const { sequelize } = require("../models");

// ── Nama OPD dinas ──────────────────────────────────────────────────────────
const OPD_CONFIG = {
  nama_opd:     "Dinas Ketahanan Pangan",
  nama_provinsi: "Maluku Utara",
  kepala_opd:   "Kepala Dinas Ketahanan Pangan",
  nip_kepala:   "NIP. —",
  tahun_anggaran: new Date().getFullYear(),
};

// ── Ambil semua data sumber LAKIP ─────────────────────────────────────────────
async function collectLakipData(tahun, periode_id) {
  // 1. Identitas periode RPJMD
  const [[periode]] = await sequelize.query(
    `SELECT id, nama, tahun_awal, tahun_akhir FROM periode_rpjmds WHERE id = :id LIMIT 1`,
    { replacements: { id: periode_id || 1 } }
  );

  // 2. Visi
  const [[visi]] = await sequelize.query(
    `SELECT v.isi_visi FROM visi v
     LEFT JOIN periode_rpjmds p ON v.rpjmd_id = p.id
     LIMIT 1`
  );

  // 3. Misi
  const [misiList] = await sequelize.query(
    `SELECT id, no_misi, isi_misi FROM misi ORDER BY no_misi ASC LIMIT 10`
  );

  // 4. Tujuan
  const [tujuanList] = await sequelize.query(
    `SELECT id, misi_id, no_tujuan, isi_tujuan, indikator FROM tujuan ORDER BY id ASC`
  );

  // 5. Sasaran
  const [sasaranList] = await sequelize.query(
    `SELECT id, tujuan_id, nomor, isi_sasaran FROM sasaran ORDER BY nomor ASC`
  );

  // 6. Indikator — filter by tahun jika ada
  const tahunFilter = tahun ? ` AND tahun = :tahun` : "";
  const [indikatorList] = await sequelize.query(
    `SELECT id, sasaran_id, nama_indikator, satuan, jenis_indikator,
            target_tahun_1 as target, capaian_tahun_1 as capaian,
            kode_indikator, penanggung_jawab, tahun
     FROM indikator
     WHERE stage IN ('sasaran','program','kegiatan') ${tahunFilter}
     ORDER BY id ASC`,
    tahun ? { replacements: { tahun } } : undefined
  );

  // 7. Realisasi terbaru per indikator
  const indikatorIds = indikatorList.map((i) => i.id);
  let realisasiMap = {};
  if (indikatorIds.length > 0) {
    const [realisasiRows] = await sequelize.query(
      `SELECT r1.indikator_id, r1.nilai_realisasi, r1.periode
       FROM realisasi_indikator r1
       INNER JOIN (
         SELECT indikator_id, MAX(created_at) as max_created
         FROM realisasi_indikator
         WHERE indikator_id IN (:ids)
         GROUP BY indikator_id
       ) r2 ON r1.indikator_id = r2.indikator_id AND r1.created_at = r2.max_created`,
      { replacements: { ids: indikatorIds } }
    );
    for (const r of realisasiRows) {
      realisasiMap[r.indikator_id] = r;
    }
  }

  // 8. Data lakip entries (program/kegiatan dengan target-realisasi langsung)
  const [lakipEntries] = await sequelize.query(
    `SELECT id, tahun, program, kegiatan, indikator_kinerja, target, realisasi,
            evaluasi, rekomendasi, jenis_dokumen, approval_status
     FROM lakip
     ${tahun ? "WHERE tahun = :tahun" : ""}
     ORDER BY tahun DESC, program ASC`,
    tahun ? { replacements: { tahun } } : undefined
  );

  // 9. Agregasi anggaran dari DPA (kolom sesuai skema aktual: 'anggaran')
  const [anggaranRows] = await sequelize.query(
    `SELECT
       SUM(anggaran) as total_pagu,
       0             as total_realisasi
     FROM dpa
     ${tahun ? "WHERE tahun = :tahun" : ""}`,
    tahun ? { replacements: { tahun } } : undefined
  );

  return {
    meta: {
      opd: OPD_CONFIG,
      tahun: tahun || String(new Date().getFullYear()),
      periode,
      generated_at: new Date().toISOString(),
    },
    visi: visi?.isi_visi || "Visi Dinas Ketahanan Pangan Maluku Utara",
    misi: misiList,
    tujuan: tujuanList,
    sasaran: sasaranList,
    indikator: indikatorList.map((ind) => {
      const real = realisasiMap[ind.id];
      const target = parseFloat(ind.target) || 0;
      const realisasi = real ? parseFloat(real.nilai_realisasi) : 0;
      const capaian = real ? parseFloat(real.capaian) : 0;
      const pct = target > 0 ? Math.round((realisasi / target) * 100) : (capaian || 0);
      const statusCapaian = pct >= 100 ? "Tercapai" : pct >= 75 ? "Hampir Tercapai" : "Belum Tercapai";
      return {
        ...ind,
        target,
        realisasi,
        pct_capaian: pct,
        status_capaian: statusCapaian,
        narasi: generateNarasi(ind.nama_indikator, target, realisasi, pct, ind.satuan),
      };
    }),
    lakipEntries,
    anggaran: {
      total_pagu:      parseFloat(anggaranRows[0]?.total_pagu) || 0,
      total_realisasi: parseFloat(anggaranRows[0]?.total_realisasi) || 0,
      pct:
        anggaranRows[0]?.total_pagu > 0
          ? Math.round((anggaranRows[0]?.total_realisasi / anggaranRows[0]?.total_pagu) * 100)
          : 0,
    },
  };
}

// ── Auto-generate narasi analisis capaian ──────────────────────────────────
function generateNarasi(namaIndikator, target, realisasi, pct, satuan) {
  const sat = satuan || "";
  if (pct === 0 && realisasi === 0 && target === 0) {
    return `Indikator "${namaIndikator}" belum memiliki data target dan realisasi. Pengisian data realisasi diperlukan untuk evaluasi kinerja.`;
  }
  if (pct >= 100) {
    return `Indikator "${namaIndikator}" berhasil mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Kinerja dinyatakan sangat baik dan sesuai perencanaan.`;
  }
  if (pct >= 75) {
    const selisih = (target - realisasi).toFixed(2);
    return `Indikator "${namaIndikator}" hampir mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Terdapat kekurangan sebesar ${selisih} ${sat}. Diperlukan upaya lebih intensif pada periode berikutnya.`;
  }
  return `Indikator "${namaIndikator}" belum mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Perlu evaluasi mendalam terhadap faktor penghambat dan penyesuaian strategi pelaksanaan.`;
}

// ── Rupiah formatter ──────────────────────────────────────────────────────
function formatRp(n) {
  if (!n || isNaN(n)) return "Rp 0";
  return "Rp " + parseFloat(n).toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

// ── HTML Template Generator ───────────────────────────────────────────────
function buildHtml(data) {
  const { meta, visi, misi, tujuan, sasaran, indikator, lakipEntries, anggaran } = data;
  const tahun = meta.tahun;
  const opd   = meta.opd;

  // Header warna sesuai status capaian
  const pctColor = (pct) => pct >= 100 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626";

  // Baris indikator
  const indRows = indikator.length
    ? indikator.map((ind, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escH(ind.nama_indikator)}</td>
          <td class="center">${escH(ind.satuan || "-")}</td>
          <td class="center">${ind.target || "-"}</td>
          <td class="center">${ind.realisasi || "-"}</td>
          <td class="center" style="color:${pctColor(ind.pct_capaian)}; font-weight:bold">${ind.pct_capaian}%</td>
          <td class="center"><span class="badge badge-${ind.pct_capaian >= 100 ? "green" : ind.pct_capaian >= 75 ? "yellow" : "red"}">${ind.status_capaian}</span></td>
        </tr>
        <tr class="narasi-row">
          <td colspan="7"><em>Analisis: ${escH(ind.narasi)}</em></td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="center text-muted">Belum ada data indikator untuk tahun ${tahun}</td></tr>`;

  // Baris LAKIP entries (program/kegiatan)
  const lakipRows = lakipEntries.length
    ? lakipEntries.map((l, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escH(l.program || "-")}</td>
          <td>${escH(l.kegiatan || "-")}</td>
          <td>${escH(l.indikator_kinerja || "-")}</td>
          <td class="center">${escH(l.target || "-")}</td>
          <td class="center">${escH(l.realisasi || "-")}</td>
          <td>${escH(l.evaluasi || "—")}</td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="center text-muted">Belum ada entri program/kegiatan LAKIP untuk tahun ${tahun}</td></tr>`;

  // Misi list
  const misiHtml = misi.length
    ? misi.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join("")
    : "<li>Belum ada data misi</li>";

  // Sasaran grouped
  const sasaranHtml = sasaran.length
    ? sasaran.map((s) => `
        <div class="sasaran-item">
          <strong>Sasaran ${escH(s.nomor || "")}</strong>: ${escH(s.isi_sasaran)}
          ${tujuan.find((t) => t.id === s.tujuan_id)
            ? `<div class="text-muted small">Tujuan: ${escH(tujuan.find((t) => t.id === s.tujuan_id)?.isi_tujuan || "")}</div>`
            : ""}
        </div>`).join("")
    : "<p class='text-muted'>Belum ada data sasaran strategis</p>";

  const pctRealisasiAnggaranColor = pctColor(anggaran.pct);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>LAKIP ${tahun} — ${opd.nama_opd}</title>
  <style>
    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    a { color: inherit; text-decoration: none; }

    /* ── Halaman ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm;
    }

    /* ── Cover ── */
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 297mm;
      text-align: center;
      border: 3px double #1e40af;
      padding: 40px;
    }
    .cover .logo-area {
      width: 100px; height: 100px;
      border: 2px solid #1e40af;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36pt;
      margin-bottom: 24px;
      background: #eff6ff;
      color: #1e40af;
    }
    .cover h1 {
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 2px;
      color: #1e3a8a;
      margin: 16px 0 8px;
    }
    .cover h2 {
      font-size: 16pt;
      font-weight: normal;
      color: #374151;
      margin: 0 0 24px;
    }
    .cover .instansi-box {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      padding: 16px 32px;
      margin: 16px 0;
    }
    .cover .instansi-box p { margin: 4px 0; }
    .cover .tahun-badge {
      font-size: 20pt;
      font-weight: bold;
      color: #fff;
      background: #1e40af;
      padding: 8px 32px;
      border-radius: 6px;
      margin-top: 24px;
    }

    /* ── Section titles ── */
    h2.section-title {
      font-size: 14pt;
      color: #1e3a8a;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 6px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3.sub-title {
      font-size: 12pt;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    /* ── Tabel ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    th {
      background: #1e40af;
      color: #fff;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid #93c5fd;
    }
    td {
      padding: 6px;
      border: 1px solid #d1d5db;
      vertical-align: top;
    }
    tr:nth-child(4n+1) td { background: #f8faff; }
    .narasi-row td {
      background: #f0f9ff !important;
      font-size: 9pt;
      color: #374151;
      padding: 4px 8px;
      border-top: none;
    }
    td.center, th.center { text-align: center; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: bold;
    }
    .badge-green  { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .badge-red    { background: #fee2e2; color: #b91c1c; }

    /* ── KPI boxes ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-box {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background: #eff6ff;
    }
    .kpi-box .kpi-val {
      font-size: 20pt;
      font-weight: bold;
    }
    .kpi-box .kpi-lbl {
      font-size: 9pt;
      color: #374151;
      margin-top: 4px;
    }

    /* ── Anggaran bar ── */
    .budget-bar-wrap {
      background: #e5e7eb;
      border-radius: 6px;
      height: 20px;
      margin: 6px 0;
      overflow: hidden;
    }
    .budget-bar-fill {
      height: 100%;
      border-radius: 6px;
      background: linear-gradient(90deg, #1d4ed8, #3b82f6);
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px;
      color: #fff;
      font-size: 8pt;
      font-weight: bold;
    }

    /* ── Misc ── */
    .text-muted { color: #6b7280; }
    .small { font-size: 9pt; }
    .sasaran-item {
      padding: 8px;
      border-left: 3px solid #1e40af;
      margin-bottom: 8px;
      background: #f0f9ff;
    }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .exec-summary {
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      font-size: 11pt;
      line-height: 1.7;
    }
    .ttd-area {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .ttd-box {
      text-align: center;
      width: 220px;
    }
    .ttd-box .ttd-name {
      font-weight: bold;
      text-decoration: underline;
      margin-top: 60px;
    }

    /* ── Print ── */
    @media print {
      body { font-size: 11pt; }
      .no-print { display: none !important; }
      .page { padding: 15mm 15mm 15mm 20mm; }
      .page-break { page-break-before: always; }
    }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1e40af;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .toolbar .doc-title { flex: 1; font-size: 11pt; font-weight: bold; }
    .toolbar button {
      background: #fff;
      color: #1e40af;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 10pt;
    }
    .toolbar button:hover { background: #dbeafe; }
    .content-wrapper { margin-top: 48px; }
  </style>
</head>
<body>
  <!-- Toolbar print/export -->
  <div class="toolbar no-print">
    <span class="doc-title">📄 LAKIP/LKj ${tahun} — ${opd.nama_opd}</span>
    <button onclick="window.print()">🖨️ Cetak / Print</button>
    <button onclick="window.close()">✕ Tutup</button>
  </div>

  <div class="content-wrapper">

    <!-- ═══════════════ COVER ═══════════════ -->
    <div class="page page-break">
      <div class="cover">
        <div class="logo-area">🌾</div>
        <h1>LAPORAN AKUNTABILITAS KINERJA<br>INSTANSI PEMERINTAH</h1>
        <h2>(LAKIP / LKj)</h2>
        <div class="instansi-box">
          <p><strong>${escH(opd.nama_opd)}</strong></p>
          <p>Provinsi ${escH(opd.nama_provinsi)}</p>
        </div>
        <div class="tahun-badge">TAHUN ${escH(tahun)}</div>
        <p class="text-muted" style="margin-top:24px; font-size:10pt">
          Diterbitkan: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>

    <!-- ═══════════════ RINGKASAN EKSEKUTIF ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">RINGKASAN EKSEKUTIF</h2>
      <div class="exec-summary">
        <p>
          ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} menyusun Laporan Akuntabilitas
          Kinerja Instansi Pemerintah (LAKIP) Tahun ${escH(tahun)} sebagai bentuk pertanggungjawaban
          atas pelaksanaan program dan kegiatan dalam rangka pencapaian tujuan dan sasaran yang telah
          ditetapkan dalam Rencana Strategis.
        </p>
        <p>
          Laporan ini disusun berdasarkan Peraturan Menteri Pendayagunaan Aparatur Negara dan
          Reformasi Birokrasi Nomor 53 Tahun 2014 tentang Petunjuk Teknis Penyusunan Perjanjian
          Kinerja, Pelaporan Kinerja, dan Tata Cara Reviu atas Laporan Kinerja Instansi Pemerintah.
        </p>
        ${anggaran.total_pagu > 0 ? `
        <p>
          Pada Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} mendapatkan alokasi anggaran sebesar
          <strong>${formatRp(anggaran.total_pagu)}</strong> dengan realisasi anggaran sebesar
          <strong>${formatRp(anggaran.total_realisasi)}</strong>
          atau <strong style="color:${pctRealisasiAnggaranColor}">${anggaran.pct}%</strong>
          dari total pagu anggaran.
        </p>` : ""}
      </div>

      <!-- KPI Boxes -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-val" style="color:#1e40af">${indikator.length}</div>
          <div class="kpi-lbl">Indikator Kinerja</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#15803d">${indikator.filter(i => i.pct_capaian >= 100).length}</div>
          <div class="kpi-lbl">Indikator Tercapai</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#b91c1c">${indikator.filter(i => i.pct_capaian < 100).length}</div>
          <div class="kpi-lbl">Perlu Perhatian</div>
        </div>
      </div>

      ${anggaran.total_pagu > 0 ? `
      <h3 class="sub-title">Realisasi Anggaran</h3>
      <table>
        <thead><tr>
          <th>Uraian</th><th>Pagu (Rp)</th><th>Realisasi (Rp)</th><th>%</th>
        </tr></thead>
        <tbody><tr>
          <td>${escH(opd.nama_opd)}</td>
          <td class="center">${formatRp(anggaran.total_pagu)}</td>
          <td class="center">${formatRp(anggaran.total_realisasi)}</td>
          <td class="center" style="color:${pctRealisasiAnggaranColor}; font-weight:bold">${anggaran.pct}%</td>
        </tr></tbody>
      </table>
      <div class="budget-bar-wrap">
        <div class="budget-bar-fill" style="width:${Math.min(anggaran.pct, 100)}%">
          ${anggaran.pct}%
        </div>
      </div>` : ""}

      <h3 class="sub-title">Visi</h3>
      <p><em>"${escH(visi)}"</em></p>

      <h3 class="sub-title">Misi</h3>
      <ul>${misiHtml}</ul>
    </div>

    <!-- ═══════════════ SASARAN STRATEGIS ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB I — SASARAN STRATEGIS & INDIKATOR KINERJA</h2>
      <h3 class="sub-title">Sasaran Strategis</h3>
      ${sasaranHtml}

      <h3 class="sub-title">Capaian Indikator Kinerja Tahun ${escH(tahun)}</h3>
      <table>
        <thead>
          <tr>
            <th style="width:4%">No</th>
            <th style="width:28%">Indikator Kinerja</th>
            <th style="width:8%">Satuan</th>
            <th style="width:10%">Target</th>
            <th style="width:10%">Realisasi</th>
            <th style="width:10%">Capaian</th>
            <th style="width:14%">Status</th>
          </tr>
        </thead>
        <tbody>${indRows}</tbody>
      </table>
    </div>

    <!-- ═══════════════ PROGRAM / KEGIATAN ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB II — AKUNTABILITAS PROGRAM & KEGIATAN</h2>
      <p class="text-muted small">
        Data program dan kegiatan bersumber dari entri LAKIP Tahun ${escH(tahun)}.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:4%">No</th>
            <th style="width:18%">Program</th>
            <th style="width:18%">Kegiatan</th>
            <th style="width:18%">Indikator</th>
            <th style="width:8%">Target</th>
            <th style="width:8%">Realisasi</th>
            <th style="width:26%">Evaluasi</th>
          </tr>
        </thead>
        <tbody>${lakipRows}</tbody>
      </table>
    </div>

    <!-- ═══════════════ PENUTUP + TTD ═══════════════ -->
    <div class="page">
      <h2 class="section-title">BAB III — PENUTUP & REKOMENDASI</h2>
      <div class="exec-summary">
        <p>
          Berdasarkan hasil evaluasi kinerja Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} telah
          melaksanakan program dan kegiatan sesuai dengan tugas pokok dan fungsinya dalam mendukung
          ketahanan pangan Provinsi ${escH(opd.nama_provinsi)}.
        </p>
        <p>
          Meski demikian, terdapat beberapa indikator yang belum mencapai target yang ditetapkan.
          Hal ini disebabkan oleh berbagai faktor baik internal maupun eksternal yang memerlukan
          perhatian dan tindak lanjut pada periode berikutnya.
        </p>
        <p><strong>Rekomendasi:</strong></p>
        <ul>
          <li>Peningkatan koordinasi lintas bidang dalam pelaksanaan program ketahanan pangan.</li>
          <li>Optimalisasi anggaran yang tersedia untuk mencapai target indikator kinerja.</li>
          <li>Penguatan monitoring dan evaluasi berkala terhadap capaian indikator kinerja.</li>
          <li>Pengembangan kapasitas SDM dalam pengelolaan program ketahanan pangan.</li>
        </ul>
      </div>

      <div class="ttd-area">
        <div class="ttd-box">
          <p>${escH(meta.opd.nama_provinsi)},
          ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>${escH(opd.kepala_opd)}</p>
          <div class="ttd-name">
            (......................................)
          </div>
          <p class="text-muted small">${escH(opd.nip_kepala)}</p>
        </div>
      </div>
    </div>

  </div><!-- end content-wrapper -->
</body>
</html>`;
}

// ── HTML escape helper ─────────────────────────────────────────────────────
function escH(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════ CONTROLLER EXPORTS ═══════════════════════════════════════

/**
 * GET /api/lakip-generator/data
 * JSON data untuk LAKIP (dipakai frontend atau PDF generator)
 */
exports.getData = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[lakipGenerator] getData:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil data LAKIP: " + err.message });
  }
};

/**
 * GET /api/lakip-generator/preview
 * HTML print-ready — buka langsung di browser
 */
exports.preview = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    const html = buildHtml(data);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (err) {
    console.error("[lakipGenerator] preview:", err);
    return res.status(500).send(`<h2>Gagal generate preview LAKIP</h2><pre>${err.message}</pre>`);
  }
};

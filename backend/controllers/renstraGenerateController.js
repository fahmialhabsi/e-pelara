/**
 * renstraGenerateController.js
 * Auto-generate Dokumen Renstra OPD (Permendagri 86/2017)
 * Output: DOCX (html-to-docx) dan PDF (puppeteer)
 */

'use strict';

const HTMLtoDOCX = require('html-to-docx');
const puppeteer = require('puppeteer');

const {
  RenstraOPD,
  RenstraTujuan,
  RenstraSasaran,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  RenstraStrategi,
  RenstraKebijakan,
  IndikatorRenstra,
  OpdPenanggungJawab,
  RenstraBab,
  RenstraTabelPrioritas,
  RenstraTabelStrategi,
  RenstraTabelArahKebijakan,
  Lakip,
  LkDispang,
} = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safe string
// ─────────────────────────────────────────────────────────────────────────────
const s = (v, fallback = '-') => (v ? String(v).trim() : fallback);
const n = (v, fallback = '0') => (v !== null && v !== undefined ? String(v) : fallback);
const fmt = (v) =>
  v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v).toLocaleString('id-ID') : '-';

// ─────────────────────────────────────────────────────────────────────────────
// Gather all Renstra data for a given renstra_id
// ─────────────────────────────────────────────────────────────────────────────
async function gatherData(renstraId) {
  const renstra = await RenstraOPD.findByPk(renstraId, {
    include: [{ model: OpdPenanggungJawab, as: 'opd', required: false }],
  });
  if (!renstra) throw new Error(`Renstra OPD id=${renstraId} tidak ditemukan`);

  // Tujuan → Sasaran (flat, indikator di-fetch terpisah)
  const tujuans = await RenstraTujuan.findAll({
    where: { renstra_id: renstraId },
    order: [['no_tujuan', 'ASC']],
  });

  const sasarans = await RenstraSasaran.findAll({
    where: { renstra_id: renstraId },
    order: [['nomor', 'ASC']],
  });

  // Program
  const programs = await RenstraProgram.findAll({
    where: { renstra_id: renstraId },
    order: [['kode_program', 'ASC']],
  });

  // Kegiatan
  const kegiatans = await RenstraKegiatan.findAll({
    where: { renstra_id: renstraId },
    order: [['kode_kegiatan', 'ASC']],
  }).catch(() => []);

  // Sub-Kegiatan: filter by renstra_program_id (tidak ada renstra_id di tabel ini)
  const programIds = programs.map((p) => p.id);
  const subkegiatans =
    programIds.length > 0
      ? await RenstraSubkegiatan.findAll({
          where: { renstra_program_id: programIds },
          order: [['kode_sub_kegiatan', 'ASC']],
        }).catch(() => [])
      : [];

  // Strategi
  const strategis = await RenstraStrategi.findAll({
    where: { renstra_id: renstraId },
  }).catch(() => []);

  // Kebijakan: filter by strategi_ids yang ada di renstra ini
  const strategiIds = strategis.map((st) => st.id);
  const kebijakans =
    strategiIds.length > 0
      ? await RenstraKebijakan.findAll({
          where: { strategi_id: strategiIds },
        }).catch(() => [])
      : await RenstraKebijakan.findAll({
          where: { renstra_id: renstraId },
        }).catch(() => []);

  // Indikator (semua stage sekaligus)
  const indikators = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraId },
  }).catch(() => []);

  // Fetch BAB content (I-VIII) dari tabel renstra_bab, di-key-kan oleh tahun_mulai Renstra
  const tahunRenstra = renstra.tahun_mulai;
  const babNomors = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const babEntries = await RenstraBab.findAll({
    where: { tahun: tahunRenstra, bab: babNomors },
  }).catch(() => []);
  const babs = {};
  babEntries.forEach((b) => {
    const rec = b.toJSON();
    babs[rec.bab] = rec;
  });

  // Tabel Strategi
  const tabelStrategis = RenstraTabelStrategi
    ? await RenstraTabelStrategi.findAll({
        where: { renstra_id: renstraId },
        order: [['id', 'ASC']],
      }).catch(() => [])
    : [];

  // Tabel Arah Kebijakan
  const tabelArahKebijakans = RenstraTabelArahKebijakan
    ? await RenstraTabelArahKebijakan.findAll({
        where: { renstra_id: renstraId },
        order: [['id', 'ASC']],
      }).catch(() => [])
    : [];

  // Tabel Prioritas (Nasional, Daerah, Gubernur)
  const tabelPrioritas = RenstraTabelPrioritas
    ? await RenstraTabelPrioritas.findAll({
        where: { renstra_id: renstraId },
        order: [
          ['jenis_prioritas', 'ASC'],
          ['id', 'ASC'],
        ],
      }).catch(() => [])
    : [];

  // T-C.23: LAKIP periode sebelumnya (tahun_mulai-5 s.d. tahun_mulai-1)
  const tahunAwalLakip = Number(tahunRenstra) - 5;
  const tahunAkhirLakip = Number(tahunRenstra) - 1;
  const { Op } = require('sequelize');
  const lakipData = Lakip
    ? await Lakip.findAll({
        where: { tahun: { [Op.between]: [String(tahunAwalLakip), String(tahunAkhirLakip)] } },
        order: [
          ['tahun', 'ASC'],
          ['program', 'ASC'],
        ],
      }).catch(() => [])
    : [];
  // T-C.24: LK Dispang periode sebelumnya
  const lkDispangData = LkDispang
    ? await LkDispang.findAll({
        where: { tahun: { [Op.between]: [String(tahunAwalLakip), String(tahunAkhirLakip)] } },
        order: [
          ['tahun', 'ASC'],
          ['program', 'ASC'],
        ],
      }).catch(() => [])
    : [];

  return {
    renstra: renstra.toJSON(),
    tujuans: tujuans.map((t) => t.toJSON()),
    sasarans: sasarans.map((s) => s.toJSON()),
    programs: programs.map((p) => p.toJSON()),
    kegiatans: kegiatans.map((k) => k.toJSON()),
    subkegiatans: subkegiatans.map((sk) => sk.toJSON()),
    strategis: strategis.map((st) => st.toJSON()),
    kebijakans: kebijakans.map((kb) => kb.toJSON()),
    indikators: indikators.map((i) => i.toJSON()),
    tabelStrategis: tabelStrategis.map((r) => r.toJSON()),
    tabelArahKebijakans: tabelArahKebijakans.map((r) => r.toJSON()),
    tabelPrioritas: tabelPrioritas.map((r) => r.toJSON()),
    babs,
    lakipData: lakipData.map((r) => r.toJSON()),
    lkDispangData: lkDispangData.map((r) => r.toJSON()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build target columns header + cells from IndikatorRenstra
// ─────────────────────────────────────────────────────────────────────────────
function buildTargetRow(ind, tahunMulai) {
  const start = tahunMulai ? Number(tahunMulai) : 0;
  return [1, 2, 3, 4, 5]
    .map((i) => {
      const yr = start ? start + i - 1 : `T${i}`;
      const val = ind ? s(ind[`target_tahun_${i}`], '-') : '-';
      return `<td style="text-align:center">${val}<br/><small style="color:#555">${yr}</small></td>`;
    })
    .join('');
}

function targetHeaderCols(tahunMulai) {
  const start = tahunMulai ? Number(tahunMulai) : 0;
  return [1, 2, 3, 4, 5]
    .map((i) => {
      const yr = start ? start + i - 1 : `T${i}`;
      return `<th style="text-align:center">Target<br/>${yr}</th>`;
    })
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// T-C.23: Pencapaian Kinerja Pelayanan Perangkat Daerah
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelTC23(data) {
  const { lakipData, renstra } = data;
  if (!lakipData || lakipData.length === 0) {
    return `<p><em style="color:#888">Data T-C.23 belum tersedia. Isi melalui modul LAKIP lalu generate ulang.</em></p>`;
  }
  const tahuns = [...new Set(lakipData.map((r) => r.tahun))].sort();
  const tahunHeaders = tahuns.map((t) => `<th>${t}</th>`).join('');
  const grouped = {};
  lakipData.forEach((r) => {
    const key = `${r.program}||${r.indikator_kinerja}`;
    if (!grouped[key])
      grouped[key] = { program: r.program, indikator: r.indikator_kinerja, data: {} };
    grouped[key].data[r.tahun] = { target: r.target, realisasi: r.realisasi };
  });
  let rows = '';
  let no = 1;
  Object.values(grouped).forEach((item) => {
    const targetCols = tahuns
      .map((t) => `<td style="text-align:center">${item.data[t]?.target || '-'}</td>`)
      .join('');
    const realisasiCols = tahuns
      .map((t) => `<td style="text-align:center">${item.data[t]?.realisasi || '-'}</td>`)
      .join('');
    const rasio = tahuns
      .map((t) => {
        const tgt = parseFloat(item.data[t]?.target);
        const rel = parseFloat(item.data[t]?.realisasi);
        if (!isNaN(tgt) && !isNaN(rel) && tgt > 0)
          return `<td style="text-align:center">${((rel / tgt) * 100).toFixed(1)}%</td>`;
        return `<td>-</td>`;
      })
      .join('');
    rows += `<tr><td style="text-align:center">${no++}</td><td>${s(item.program)}</td><td>${s(item.indikator)}</td>${targetCols}${realisasiCols}${rasio}</tr>`;
  });
  return `
<p><strong>Tabel T-C.23 — Pencapaian Kinerja Pelayanan ${s(renstra.nama_opd)}</strong></p>
<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Program</th>
      <th rowspan="2">Indikator Kinerja</th>
      <th colspan="${tahuns.length}">Target</th>
      <th colspan="${tahuns.length}">Realisasi</th>
      <th colspan="${tahuns.length}">Rasio Capaian (%)</th>
    </tr>
    <tr>${tahunHeaders}${tahunHeaders}${tahunHeaders}</tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// T-C.24: Anggaran dan Realisasi Pendanaan Pelayanan Perangkat Daerah
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelTC24(data) {
  const { lkDispangData, renstra } = data;
  if (!lkDispangData || lkDispangData.length === 0) {
    return `<p><em style="color:#888">Data T-C.24 belum tersedia. Isi melalui modul LK Dispang lalu generate ulang.</em></p>`;
  }
  const tahuns = [...new Set(lkDispangData.map((r) => r.tahun))].sort();
  const tahunHeaders = tahuns.map((t) => `<th>${t}</th>`).join('');
  const grouped = {};
  lkDispangData.forEach((r) => {
    const key = `${r.program}||${r.kegiatan}`;
    if (!grouped[key]) grouped[key] = { program: r.program, kegiatan: r.kegiatan, data: {} };
    if (!grouped[key].data[r.tahun]) grouped[key].data[r.tahun] = { anggaran: 0, realisasi: 0 };
    grouped[key].data[r.tahun].anggaran += Number(r.anggaran) || 0;
    grouped[key].data[r.tahun].realisasi += Number(r.realisasi) || 0;
  });
  let rows = '';
  let no = 1;
  Object.values(grouped).forEach((item) => {
    const anggaranCols = tahuns
      .map(
        (t) =>
          `<td style="text-align:right">${item.data[t] ? fmt(item.data[t].anggaran) : '-'}</td>`,
      )
      .join('');
    const realisasiCols = tahuns
      .map(
        (t) =>
          `<td style="text-align:right">${item.data[t] ? fmt(item.data[t].realisasi) : '-'}</td>`,
      )
      .join('');
    const rasio = tahuns
      .map((t) => {
        if (!item.data[t]) return `<td>-</td>`;
        const pct =
          item.data[t].anggaran > 0
            ? ((item.data[t].realisasi / item.data[t].anggaran) * 100).toFixed(1)
            : '-';
        return `<td style="text-align:center">${pct}%</td>`;
      })
      .join('');
    rows += `<tr><td style="text-align:center">${no++}</td><td>${s(item.program)}</td><td>${s(item.kegiatan)}</td>${anggaranCols}${realisasiCols}${rasio}</tr>`;
  });
  return `
<p><strong>Tabel T-C.24 — Anggaran dan Realisasi Pendanaan Pelayanan ${s(renstra.nama_opd)}</strong></p>
<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Program</th>
      <th rowspan="2">Kegiatan</th>
      <th colspan="${tahuns.length}">Anggaran (Rp)</th>
      <th colspan="${tahuns.length}">Realisasi (Rp)</th>
      <th colspan="${tahuns.length}">Rasio (%)</th>
    </tr>
    <tr>${tahunHeaders}${tahunHeaders}${tahunHeaders}</tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// BAB IV: Tujuan & Sasaran table — 2 tabel terpisah
// ─────────────────────────────────────────────────────────────────────────────
function buildBab4(data) {
  const { tujuans, sasarans, indikators, renstra } = data;
  const indByRefStage = {};
  indikators.forEach((ind) => {
    const key = `${ind.stage}_${ind.ref_id}`;
    if (!indByRefStage[key]) indByRefStage[key] = [];
    indByRefStage[key].push(ind);
  });
  const tahunMulai = renstra.tahun_mulai;
  const yr = (i) => Number(tahunMulai) + i - 1;

  // — Tabel Tujuan —
  let rowsTujuan = '';
  let no = 1;
  tujuans.forEach((t) => {
    const inds = indByRefStage[`tujuan_${t.id}`] || [null];
    inds.forEach((ind, i) => {
      rowsTujuan += `<tr>
        ${i === 0 ? `<td rowspan="${inds.length}">${no++}</td><td rowspan="${inds.length}">${s(t.no_tujuan)} ${s(t.isi_tujuan)}</td>` : ''}
        <td>${ind ? s(ind.nama_indikator) : '-'}</td>
        <td>${ind ? s(ind.satuan) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_1) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_2) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_3) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_4) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_5) : '-'}</td>
      </tr>`;
    });
  });
  if (!rowsTujuan)
    rowsTujuan = `<tr><td colspan="9" style="text-align:center;color:#888;font-style:italic">Belum ada data Tujuan</td></tr>`;

  // — Tabel Sasaran —
  let rowsSasaran = '';
  no = 1;
  sasarans.forEach((sas) => {
    const inds = indByRefStage[`sasaran_${sas.id}`] || [null];
    inds.forEach((ind, i) => {
      rowsSasaran += `<tr>
        ${i === 0 ? `<td rowspan="${inds.length}">${no++}</td><td rowspan="${inds.length}">${s(sas.nomor)} ${s(sas.isi_sasaran)}</td>` : ''}
        <td>${ind ? s(ind.nama_indikator) : '-'}</td>
        <td>${ind ? s(ind.satuan) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_1) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_2) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_3) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_4) : '-'}</td>
        <td style="text-align:center">${ind ? s(ind.target_tahun_5) : '-'}</td>
      </tr>`;
    });
  });
  if (!rowsSasaran)
    rowsSasaran = `<tr><td colspan="9" style="text-align:center;color:#888;font-style:italic">Belum ada data Sasaran</td></tr>`;

  return `
<h2>BAB IV<br/>TUJUAN DAN SASARAN</h2>
<h3>4.1 Tujuan dan Sasaran Jangka Menengah Perangkat Daerah</h3>
<p>Tujuan dan sasaran jangka menengah Perangkat Daerah adalah kondisi yang ingin diwujudkan selama lima tahun ke depan.</p>
<p><strong>Tabel T-C.25 — Tujuan dan Sasaran Jangka Menengah Pelayanan ${s(data.renstra.nama_opd)}</strong></p>
<h3>A. Tujuan Jangka Menengah</h3>
<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:10px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Tujuan</th>
      <th>Indikator Tujuan</th>
      <th>Satuan</th>
      <th>T1 (${yr(1)})</th>
      <th>T2 (${yr(2)})</th>
      <th>T3 (${yr(3)})</th>
      <th>T4 (${yr(4)})</th>
      <th>T5 (${yr(5)})</th>
    </tr>
  </thead>
  <tbody>${rowsTujuan}</tbody>
</table>
<h3 style="margin-top:16px">B. Sasaran Jangka Menengah</h3>
<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:10px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Sasaran</th>
      <th>Indikator Sasaran</th>
      <th>Satuan</th>
      <th>T1 (${yr(1)})</th>
      <th>T2 (${yr(2)})</th>
      <th>T3 (${yr(3)})</th>
      <th>T4 (${yr(4)})</th>
      <th>T5 (${yr(5)})</th>
    </tr>
  </thead>
  <tbody>${rowsSasaran}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB V: Strategi & Arah Kebijakan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab5(data) {
  const { tujuans, sasarans, strategis, kebijakans } = data;

  let rows = '';
  if (strategis.length === 0 && kebijakans.length === 0) {
    rows = `<tr><td colspan="5" style="text-align:center;color:#888;font-style:italic">Belum ada data Strategi dan Arah Kebijakan</td></tr>`;
  } else {
    const stByTujuan = {};
    strategis.forEach((st) => {
      const key = st.tujuan_id || st.sasaran_id || 'umum';
      if (!stByTujuan[key]) stByTujuan[key] = [];
      stByTujuan[key].push(st);
    });
    const kbBySasaran = {};
    kebijakans.forEach((kb) => {
      const key = kb.sasaran_id || kb.strategi_id || 'umum';
      if (!kbBySasaran[key]) kbBySasaran[key] = [];
      kbBySasaran[key].push(kb);
    });

    let no = 1;
    if (strategis.length > 0) {
      strategis.forEach((st) => {
        const sasaran = sasarans.find((s) => s.id === st.sasaran_id);
        const tujuan = tujuans.find((t) => t.id === sasaran?.tujuan_id);
        const relKbs = kebijakans.filter((kb) => kb.strategi_id === st.id);
        rows += `<tr>
          <td>${no++}</td>
          <td>${tujuan ? `${s(tujuan.no_tujuan)} ${s(tujuan.isi_tujuan)}` : '-'}</td>
          <td>${sasaran ? `${s(sasaran.nomor)} ${s(sasaran.isi_sasaran)}` : '-'}</td>
          <td>${s(st.kode_strategi, '')} ${s(st.deskripsi)}</td>
          <td>${relKbs.length > 0 ? relKbs.map((kb) => `${s(kb.kode_kebjkn, '')} - ${s(kb.deskripsi || kb.isi_arah_rpjmd)}`).join('<br/><br/>') : '-'}</td>
        </tr>`;
      });
    } else {
      kebijakans.forEach((kb) => {
        rows += `<tr>
          <td>${no++}</td>
          <td>-</td><td>-</td><td>-</td>
          <td>${s(kb.kode_kebjkn, '')} - ${s(kb.deskripsi || kb.isi_kebijakan || kb.isi_arah_rpjmd)}</td>
        </tr>`;
      });
    }
  }

  return `
<h2>BAB V<br/>STRATEGI DAN ARAH KEBIJAKAN</h2>
<p>Strategi dan arah kebijakan merupakan cara untuk mencapai tujuan dan sasaran yang ditetapkan. Berikut adalah strategi dan arah kebijakan ${s(data.renstra.nama_opd)} periode ${s(data.renstra.tahun_mulai)}–${s(data.renstra.tahun_akhir)}.</p>
<p><strong>Tabel T-C.26 — Tujuan, Sasaran, Strategi, dan Kebijakan ${s(data.renstra.nama_opd)}</strong></p>
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Tujuan</th>
      <th>Sasaran</th>
      <th>Strategi</th>
      <th>Arah Kebijakan</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB VI: Rencana Program dan Kegiatan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab6(data) {
  const { tujuans, sasarans, strategis, kebijakans, programs, kegiatans, subkegiatans, indikators } = data;

  const indByRefStage = {};
  indikators.forEach((ind) => {
    const key = `${ind.stage}_${ind.ref_id}`;
    if (!indByRefStage[key]) indByRefStage[key] = [];
    indByRefStage[key].push(ind);
  });

  const fmtRp = (v) =>
    v === null || v === undefined || v === '' ? '-' : Number(v).toLocaleString('id-ID');
  const targetCells = (ind) =>
    [1, 2, 3, 4, 5].map((i) => `<td>${ind ? s(ind[`target_tahun_${i}`]) : '-'}</td>`).join('');
  const paguCells = (ind) =>
    [1, 2, 3, 4, 5].map((i) => `<td>${ind ? fmtRp(ind[`pagu_tahun_${i}`]) : '-'}</td>`).join('');
  const kondisiAkhir = (ind) =>
    ind ? `${s(ind.target_tahun_5)} / Rp ${fmtRp(ind.pagu_tahun_5)}` : '-';

  // Agregasi Pendanaan Rp bottom-up: Sub Kegiatan -> Kegiatan -> Program -> Kebijakan -> Strategi -> Sasaran -> Tujuan
  const paguOf = (ind, i) => Number(ind?.[`pagu_tahun_${i}`]) || 0;
  const sumPaguForKegiatan = (kegId) => {
    const subs = subkegiatans.filter((sk) => sk.kegiatan_id === kegId);
    const sums = [0, 0, 0, 0, 0];
    subs.forEach((sub) => {
      const subInd = (indByRefStage[`sub_kegiatan_${sub.id}`] || [])[0];
      [1, 2, 3, 4, 5].forEach((i, idx) => {
        sums[idx] += paguOf(subInd, i);
      });
    });
    return sums;
  };
  const sumPaguForProgram = (progId) => {
    const kegs = kegiatans.filter((k) => k.program_id === progId);
    const sums = [0, 0, 0, 0, 0];
    kegs.forEach((keg) => {
      sumPaguForKegiatan(keg.id).forEach((v, idx) => {
        sums[idx] += v;
      });
    });
    return sums;
  };
  const sumPaguForKebijakan = (kebId) => {
    const progs = programs.filter((p) => p.kebijakan_id === kebId);
    const sums = [0, 0, 0, 0, 0];
    progs.forEach((prog) => {
      sumPaguForProgram(prog.id).forEach((v, idx) => {
        sums[idx] += v;
      });
    });
    return sums;
  };
  const sumPaguForStrategi = (stratId) => {
    const kebs = kebijakans.filter((k) => k.strategi_id === stratId);
    const sums = [0, 0, 0, 0, 0];
    kebs.forEach((keb) => {
      sumPaguForKebijakan(keb.id).forEach((v, idx) => {
        sums[idx] += v;
      });
    });
    return sums;
  };
  const sumPaguForSasaran = (sasId) => {
    const strats = strategis.filter((st) => st.sasaran_id === sasId);
    const sums = [0, 0, 0, 0, 0];
    strats.forEach((strat) => {
      sumPaguForStrategi(strat.id).forEach((v, idx) => {
        sums[idx] += v;
      });
    });
    return sums;
  };
  const sumPaguForTujuan = (tujId) => {
    const sass = sasarans.filter((sas) => sas.tujuan_id === tujId);
    const sums = [0, 0, 0, 0, 0];
    sass.forEach((sas) => {
      sumPaguForSasaran(sas.id).forEach((v, idx) => {
        sums[idx] += v;
      });
    });
    return sums;
  };
  const paguCellsFromArray = (arr) => arr.map((v) => `<td>${fmtRp(v)}</td>`).join('');
  const kondisiAkhirMixed = (targetVal, rpVal) => `${s(targetVal)} / Rp ${fmtRp(rpVal)}`;

  let rows = '';
  if (tujuans.length === 0) {
    rows = `<tr><td colspan="18" style="text-align:center;color:#888;font-style:italic">Belum ada data Tujuan/Sasaran/Strategi/Kebijakan/Program/Kegiatan</td></tr>`;
  } else {
    let no = 1;
    tujuans.forEach((tuj) => {
      const tujInd = (indByRefStage[`tujuan_${tuj.id}`] || [])[0];
      const tujPaguSums = sumPaguForTujuan(tuj.id);
      rows += `<tr style="background:#1a5276;color:#fff;font-weight:bold">
        <td>${no++}</td>
        <td>${s(tuj.no_tujuan)}</td>
        <td>Tujuan: ${s(tuj.isi_tujuan)}</td>
        <td>${tujInd ? s(tujInd.nama_indikator) : '-'}</td>
        <td>${tujInd ? s(tujInd.satuan) : '-'}</td>
        <td>${tujInd ? s(tujInd.baseline) : '-'}</td>
        ${targetCells(tujInd)}
        ${paguCellsFromArray(tujPaguSums)}
        <td>${kondisiAkhirMixed(tujInd?.target_tahun_5, tujPaguSums[4])}</td>
        <td>-</td>
      </tr>`;

      const tujSasaran = sasarans.filter((sas) => sas.tujuan_id === tuj.id);
      tujSasaran.forEach((sas) => {
        const sasInd = (indByRefStage[`sasaran_${sas.id}`] || [])[0];
        const sasPaguSums = sumPaguForSasaran(sas.id);
        rows += `<tr style="background:#2e86c1;color:#fff;font-weight:bold">
          <td></td>
          <td>${s(sas.nomor)}</td>
          <td>Sasaran: ${s(sas.isi_sasaran)}</td>
          <td>${sasInd ? s(sasInd.nama_indikator) : '-'}</td>
          <td>${sasInd ? s(sasInd.satuan) : '-'}</td>
          <td>${sasInd ? s(sasInd.baseline) : '-'}</td>
          ${targetCells(sasInd)}
          ${paguCellsFromArray(sasPaguSums)}
          <td>${kondisiAkhirMixed(sasInd?.target_tahun_5, sasPaguSums[4])}</td>
          <td>-</td>
        </tr>`;

        const sasStrategi = strategis.filter((st) => st.sasaran_id === sas.id);
        sasStrategi.forEach((strat) => {
          const stratInd = (indByRefStage[`strategi_${strat.id}`] || [])[0];
          const stratPaguSums = sumPaguForStrategi(strat.id);
          rows += `<tr style="background:#85c1e9;font-weight:bold">
            <td></td>
            <td>${s(strat.kode_strategi)}</td>
            <td>Strategi: ${s(strat.deskripsi)}</td>
            <td>${stratInd ? s(stratInd.nama_indikator) : '-'}</td>
            <td>${stratInd ? s(stratInd.satuan) : '-'}</td>
            <td>${stratInd ? s(stratInd.baseline) : '-'}</td>
            ${targetCells(stratInd)}
            ${paguCellsFromArray(stratPaguSums)}
            <td>${kondisiAkhirMixed(stratInd?.target_tahun_5, stratPaguSums[4])}</td>
            <td>-</td>
          </tr>`;

          const stratKebijakan = kebijakans.filter((keb) => keb.strategi_id === strat.id);
          stratKebijakan.forEach((keb) => {
            const kebInd = (indByRefStage[`kebijakan_${keb.id}`] || [])[0];
            const kebPaguSums = sumPaguForKebijakan(keb.id);
            rows += `<tr style="background:#d6eaf8;font-weight:bold">
              <td></td>
              <td>${s(keb.kode_kebjkn)}</td>
              <td>Arah Kebijakan: ${s(keb.deskripsi)}</td>
              <td>${kebInd ? s(kebInd.nama_indikator) : '-'}</td>
              <td>${kebInd ? s(kebInd.satuan) : '-'}</td>
              <td>${kebInd ? s(kebInd.baseline) : '-'}</td>
              ${targetCells(kebInd)}
              ${paguCellsFromArray(kebPaguSums)}
              <td>${kondisiAkhirMixed(kebInd?.target_tahun_5, kebPaguSums[4])}</td>
              <td>-</td>
            </tr>`;

            const kebProgram = programs.filter((p) => p.kebijakan_id === keb.id);
            kebProgram.forEach((prog) => {
              const progInd = (indByRefStage[`program_${prog.id}`] || [])[0];
              const progPaguSums = sumPaguForProgram(prog.id);
              rows += `<tr style="background:#eaf4fb">
                <td></td>
                <td>${s(prog.kode_program)}</td>
                <td>${s(prog.nama_program)}</td>
                <td>${progInd ? s(progInd.nama_indikator) : '-'}</td>
                <td>${progInd ? s(progInd.satuan) : '-'}</td>
                <td>${progInd ? s(progInd.baseline) : '-'}</td>
                ${targetCells(progInd)}
                ${paguCellsFromArray(progPaguSums)}
                <td>${kondisiAkhirMixed(progInd?.target_tahun_5, progPaguSums[4])}</td>
                <td>${s(prog.opd_penanggung_jawab)}</td>
              </tr>`;

              const progKegiatan = kegiatans.filter((k) => k.program_id === prog.id);
              progKegiatan.forEach((keg) => {
                const kegInd = (indByRefStage[`kegiatan_${keg.id}`] || [])[0];
                const kegPaguSums = sumPaguForKegiatan(keg.id);
                rows += `<tr>
                  <td></td>
                  <td>${s(keg.kode_kegiatan)}</td>
                  <td>${s(keg.nama_kegiatan)}</td>
                  <td>${kegInd ? s(kegInd.nama_indikator) : '-'}</td>
                  <td>${kegInd ? s(kegInd.satuan) : '-'}</td>
                  <td>${kegInd ? s(kegInd.baseline) : '-'}</td>
                  ${targetCells(kegInd)}
                  ${paguCellsFromArray(kegPaguSums)}
                  <td>${kondisiAkhirMixed(kegInd?.target_tahun_5, kegPaguSums[4])}</td>
                  <td>${s(keg.bidang_opd)}</td>
                </tr>`;

                // RenstraSubkegiatan uses renstra_program_id + kegiatan_id
                const kegSub = subkegiatans.filter((sk) => sk.kegiatan_id === keg.id);
                kegSub.forEach((sub) => {
                  const subInd = (indByRefStage[`sub_kegiatan_${sub.id}`] || [])[0];
                  rows += `<tr>
                    <td></td>
                    <td>${s(sub.kode_sub_kegiatan || sub.kode_subkegiatan)}</td>
                    <td>${s(sub.nama_sub_kegiatan || sub.nama_subkegiatan)}</td>
                    <td>${subInd ? s(subInd.nama_indikator) : '-'}</td>
                    <td>${subInd ? s(subInd.satuan) : '-'}</td>
                    <td>${subInd ? s(subInd.baseline) : '-'}</td>
                    ${targetCells(subInd)}
                    ${paguCells(subInd)}
                    <td>${kondisiAkhir(subInd)}</td>
                    <td>${s(sub.sub_bidang_opd, '-')}</td>
                  </tr>`;
                });
              });
            });
          });
        });
      });
    });
  }

  const tahunMulai = data.renstra.tahun_mulai;
  const tahunAkhir = data.renstra.tahun_akhir;

  return `
<h2>BAB VI<br/>RENCANA PROGRAM DAN KEGIATAN SERTA PENDANAAN</h2>
<p>Rencana program dan kegiatan berikut merupakan penjabaran dari strategi dan arah kebijakan ${s(data.renstra.nama_opd)} dalam rangka pencapaian tujuan dan sasaran Renstra Periode ${s(tahunMulai)}–${s(tahunAkhir)}.</p>
<p><strong>Tabel T-C.27 — Rencana Program, Kegiatan, dan Pendanaan ${s(data.renstra.nama_opd)}</strong></p>
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed">
  <colgroup>
    <col style="width:2%"><col style="width:8%"><col style="width:9%"><col style="width:8%">
    <col style="width:6%"><col style="width:4%">
    <col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%">
    <col style="width:6%"><col style="width:6%"><col style="width:6%"><col style="width:6%"><col style="width:6%">
    <col style="width:6%"><col style="width:7%">
  </colgroup>
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Kode</th>
      <th rowspan="2">Tujuan / Sasaran / Strategi / Kebijakan / Program / Kegiatan / Sub-Kegiatan</th>
      <th rowspan="2">Indikator Kinerja</th>
      <th rowspan="2">Satuan</th>
      <th rowspan="2">Kondisi Awal</th>
      <th colspan="5">Target</th>
      <th colspan="5">Pendanaan (Rp)</th>
      <th rowspan="2">Kondisi Akhir<br/>(Target/Rp)</th>
      <th rowspan="2">OPD PJ / Bidang / Sub Bagian-Seksi</th>
    </tr>
    <tr>
      <th>I</th><th>II</th><th>III</th><th>IV</th><th>V</th>
      <th>I</th><th>II</th><th>III</th><th>IV</th><th>V</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB VII: Kinerja Penyelenggaraan Bidang Urusan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab7(data) {
  const { indikators, tujuans, sasarans, renstra } = data;

  const kinerjaInds = indikators.filter((i) => ['tujuan', 'sasaran'].includes(i.stage));
  let rows = '';
  if (kinerjaInds.length === 0) {
    rows = `<tr><td colspan="8" style="text-align:center;color:#888;font-style:italic">Belum ada data Indikator Kinerja</td></tr>`;
  } else {
    kinerjaInds.forEach((ind, idx) => {
      const tujuan = tujuans.find((t) => t.id === ind.ref_id && ind.stage === 'tujuan');
      const sasaran = sasarans.find((s) => s.id === ind.ref_id && ind.stage === 'sasaran');
      rows += `<tr>
        <td>${idx + 1}</td>
        <td>${s(ind.kode_indikator)}</td>
        <td>${s(ind.nama_indikator)}</td>
        <td>${s(ind.satuan)}</td>
        <td style="text-align:center">${s(ind.baseline)}</td>
        <td style="text-align:center">${s(ind.target_tahun_1)} / ${s(ind.target_tahun_2)} / ${s(ind.target_tahun_3)} / ${s(ind.target_tahun_4)} / ${s(ind.target_tahun_5)}</td>
        <td>${tujuan ? `Tujuan: ${s(tujuan.no_tujuan)}` : sasaran ? `Sasaran: ${s(sasaran.nomor)}` : '-'}</td>
        <td>${s(ind.penanggung_jawab)}</td>
      </tr>`;
    });
  }

  return `
<h2>BAB VII<br/>KINERJA PENYELENGGARAAN BIDANG URUSAN</h2>
<p>Indikator kinerja perangkat daerah yang mengacu pada tujuan dan sasaran RPJMD, sebagai dasar evaluasi dan pelaporan kinerja ${s(data.renstra.nama_opd)} periode ${s(data.renstra.tahun_mulai)}–${s(data.renstra.tahun_akhir)}.</p>
<p><strong>Tabel T-C.28 — Indikator Kinerja ${s(data.renstra.nama_opd)} yang Mengacu pada Tujuan dan Sasaran RPJMD</strong></p>
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Kode</th>
      <th>Indikator Kinerja</th>
      <th>Satuan</th>
      <th>Kondisi Awal (Baseline)</th>
      <th>Target T1/T2/T3/T4/T5</th>
      <th>Referensi RPJMD</th>
      <th>Penanggung Jawab</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tabel Strategi & Kebijakan (untuk BAB V tambahan)
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelStrategiKebijakan(data) {
  const strategiRows = data.tabelStrategis || [];
  const kebijakanRows = data.tabelArahKebijakans || [];

  if (strategiRows.length === 0 && kebijakanRows.length === 0) return '';

  const tahunMulai = Number(data.renstra.tahun_mulai) || 0;
  const years = [1, 2, 3, 4, 5, 6].map((i) => (tahunMulai ? tahunMulai + i - 1 : `T${i}`));

  const strategiHtml = strategiRows.length
    ? `
<h3>Tabel Strategi</h3>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Strategi</th>
      <th rowspan="2">Indikator</th>
      <th rowspan="2">Baseline</th>
      <th colspan="6">Target Tahun Ke-</th>
      <th rowspan="2">Pagu Akhir (Rp)</th>
    </tr>
    <tr>${years.map((yr) => `<th>${yr}</th>`).join('')}</tr>
  </thead>
  <tbody>
    ${strategiRows
      .map(
        (r, idx) => `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${s(r.kode_strategi)}<br/><small>${s(r.deskripsi_strategi)}</small></td>
          <td>${s(r.indikator)}</td>
          <td style="text-align:center">${s(r.baseline, '0')}</td>
          ${[1, 2, 3, 4, 5, 6]
            .map((i) => `<td style="text-align:center">${s(r[`target_tahun_${i}`], '0')}</td>`)
            .join('')}
          <td style="text-align:right">${fmt(r.pagu_akhir_renstra)}</td>
        </tr>`,
      )
      .join('')}
  </tbody>
</table>`
    : '';

  const kebijakanHtml = kebijakanRows.length
    ? `
<h3>Tabel Arah Kebijakan</h3>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Arah Kebijakan</th>
      <th rowspan="2">Indikator</th>
      <th rowspan="2">Baseline</th>
      <th colspan="6">Target Tahun Ke-</th>
      <th rowspan="2">Pagu Akhir (Rp)</th>
    </tr>
    <tr>${years.map((yr) => `<th>${yr}</th>`).join('')}</tr>
  </thead>
  <tbody>
    ${kebijakanRows
      .map(
        (r, idx) => `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${s(r.kode_kebijakan)}<br/><small>${s(r.deskripsi_kebijakan)}</small></td>
          <td>${s(r.indikator)}</td>
          <td style="text-align:center">${s(r.baseline, '0')}</td>
          ${[1, 2, 3, 4, 5, 6]
            .map((i) => `<td style="text-align:center">${s(r[`target_tahun_${i}`], '0')}</td>`)
            .join('')}
          <td style="text-align:right">${fmt(r.pagu_akhir_renstra)}</td>
        </tr>`,
      )
      .join('')}
  </tbody>
</table>`
    : '';

  return `${strategiHtml}${kebijakanHtml}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tabel Prioritas (Nasional / Daerah / Gubernur) untuk BAB VI tambahan
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelPrioritas(data) {
  const rows = data.tabelPrioritas;
  if (!rows || rows.length === 0) return '';

  const grouped = { nasional: [], daerah: [], gubernur: [] };
  rows.forEach((r) => {
    if (grouped[r.jenis_prioritas]) grouped[r.jenis_prioritas].push(r);
  });

  const LABEL = {
    nasional: 'Prioritas Nasional',
    daerah: 'Prioritas Daerah',
    gubernur: 'Prioritas Gubernur',
  };
  const tahunMulai = Number(data.renstra.tahun_mulai) || 0;
  const years = [1, 2, 3, 4, 5, 6].map((i) => (tahunMulai ? tahunMulai + i - 1 : `T${i}`));

  let html = '';
  ['nasional', 'daerah', 'gubernur'].forEach((jenis) => {
    const jRows = grouped[jenis];
    if (!jRows || jRows.length === 0) return;

    const tableRows = jRows
      .map(
        (r, idx) => `<tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${s(r.kode_prioritas, '-')}</td>
      <td>${s(r.nama_prioritas)}</td>
      <td>${s(r.indikator)}</td>
      <td style="text-align:center">${s(r.baseline, '0')}</td>
      ${[1, 2, 3, 4, 5, 6].map((i) => `<td style="text-align:center">${s(r[`target_tahun_${i}`], '0')}</td>`).join('')}
      <td style="text-align:right">${fmt(r.pagu_akhir_renstra)}</td>
      <td>${s(r.program_terkait, '-')}</td>
    </tr>`,
      )
      .join('');

    html += `
<h3>Tabel ${LABEL[jenis]}</h3>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Kode</th>
      <th rowspan="2">Nama ${LABEL[jenis]}</th>
      <th rowspan="2">Indikator</th>
      <th rowspan="2">Baseline</th>
      <th colspan="6">Target Tahun Ke-</th>
      <th rowspan="2">Pagu Akhir (Rp)</th>
      <th rowspan="2">Program Terkait</th>
    </tr>
    <tr>
      ${years.map((yr) => `<th>${yr}</th>`).join('')}
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>`;
  });

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Render subbab list from renstra_bab.isi into HTML
// ─────────────────────────────────────────────────────────────────────────────
function renderSubbabsFromDB(babEntry) {
  let subbabList = babEntry?.isi;
  if (typeof subbabList === 'string') {
    try {
      subbabList = JSON.parse(subbabList);
    } catch (e) {
      return null;
    }
  }
  if (!subbabList || !Array.isArray(subbabList) || subbabList.length === 0) return null;

  return subbabList
    .map((sub) => {
      let html = '';
      const nomor = sub.nomor ? String(sub.nomor).trim() : '';
      const judul = sub.judul ? String(sub.judul).trim() : '';
      if (judul) {
        // Jika judul sudah diawali nomor sub-bab (misal "2.1", "3.2"), jangan tampilkan nomor lagi
        const judulHasNomor = /^\d+\.\d+/.test(judul);
        html += `<h3>${!judulHasNomor && nomor ? nomor + ' ' : ''}${judul}</h3>`;
      }
      if (sub.isi && String(sub.isi).trim()) {
        const rawIsi = String(sub.isi).trim();
        // Deteksi tabel: baris mengandung separator | atau Tab
        const lines = rawIsi.split('\n');
        const isTable = lines.filter((l) => l.includes('|') || l.includes('\t')).length >= 2;
        if (isTable) {
          const tableLines = lines.filter((l) => l.trim());
          let tableHtml =
            '<table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10pt;margin:12px 0">';
          tableLines.forEach((line, idx) => {
            const sep = line.includes('|') ? '|' : '\t';
            const cells = line
              .split(sep)
              .map((c) => c.trim())
              .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
            if (cells.length < 2) {
              // Baris narasi biasa di dalam blok tabel
              tableHtml += `</table><p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p><table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10pt;margin:12px 0">`;
              return;
            }
            const tag = idx === 0 ? 'th' : 'td';
            const bg = idx === 0 ? 'style="background:#1a5276;color:white;font-weight:bold"' : '';
            tableHtml += `<tr ${bg}>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
          });
          tableHtml += '</table>';
          html += tableHtml;
        } else {
          const isiText = rawIsi
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>');
          html += `<p>${isiText}</p>`;
        }
      } else if (judul) {
        html += `<div class="placeholder">📝 <strong>[Belum diisi]</strong> ${nomor ? nomor + ' ' : ''}${judul}</div>`;
      }
      // Render tables if any
      if (sub.tables && Array.isArray(sub.tables)) {
        sub.tables.forEach((tbl) => {
          if (tbl && Array.isArray(tbl.headers) && Array.isArray(tbl.rows)) {
            const headerRow = tbl.headers.map((h) => `<th>${s(h)}</th>`).join('');
            const bodyRows = tbl.rows
              .map((row) => {
                const cells = Array.isArray(row) ? row : Object.values(row);
                return `<tr>${cells.map((c) => `<td>${s(c)}</td>`).join('')}</tr>`;
              })
              .join('');
            html += `<table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10pt;margin:12px 0">
              <thead style="background:#1a5276;color:white"><tr>${headerRow}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>`;
          }
        });
      }
      return html;
    })
    .join('\n');
}

/**
 * Mengembalikan konten BAB dari DB jika tersedia,
 * jika tidak, mengembalikan fallbackHtml (template statis dengan placeholder).
 */
function babSection(babEntry, fallbackHtml) {
  const fromDB = renderSubbabsFromDB(babEntry);
  return fromDB || fallbackHtml;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full HTML Document generator
// ─────────────────────────────────────────────────────────────────────────────
function generateHTML(data) {
  const { renstra } = data;
  const namaOpd = s(renstra.nama_opd, 'OPD');
  const bidang = s(renstra.bidang_opd, '');
  const subBidang = s(renstra.sub_bidang_opd, '');
  const periode = `${s(renstra.tahun_mulai)} – ${s(renstra.tahun_akhir)}`;
  const tglGen = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const bab4 = buildBab4(data);
  // BAB V: strategi+kebijakan + tabel strategi kebijakan (jika ada)
  const bab5 = buildBab5(data) + buildTabelStrategiKebijakan(data);
  // BAB VI: program+kegiatan + tabel prioritas (jika ada)
  const bab6 = buildBab6(data) + buildTabelPrioritas(data);
  const bab7 = buildBab7(data);

  // BAB I-III & VIII: gunakan konten dari DB jika sudah diisi, fallback ke template statis
  const bab1Content = babSection(
    data.babs?.['I'],
    `
<h3>1.1 Latar Belakang</h3>
<p>Rencana Strategis (Renstra) ${namaOpd} Periode ${periode} merupakan dokumen perencanaan pembangunan jangka menengah yang disusun berdasarkan Undang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional dan Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah.</p>
<p>Renstra ini merupakan penjabaran dari visi, misi, dan program Kepala Daerah yang memuat tujuan, sasaran, strategi, kebijakan, dan program, serta kegiatan pembangunan dalam rangka pelaksanaan tugas pokok dan fungsi ${namaOpd}.</p>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Tambahkan narasi latar belakang yang mencakup kondisi daerah, kebijakan nasional/daerah yang mempengaruhi bidang urusan ini, dan konteks penyusunan Renstra OPD. — <em>Atau isi melalui menu <strong>Renstra → BAB I</strong> pada aplikasi, lalu generate ulang.</em></div>

<h3>1.2 Landasan Hukum</h3>
<p>Landasan hukum penyusunan Renstra ${namaOpd} Periode ${periode} antara lain:</p>
<ol>
  <li>Undang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional</li>
  <li>Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah</li>
  <li>Peraturan Pemerintah Nomor 18 Tahun 2016 tentang Perangkat Daerah</li>
  <li>Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah</li>
  <li>Peraturan Daerah Provinsi Maluku Utara Nomor 6 Tahun 2025 tentang Rencana Pembangunan Jangka Menengah Daerah (RPJMD) Provinsi Maluku Utara Tahun 2025–2029</li>
  <li>Peraturan Gubernur Maluku Utara Nomor 56 Tahun 2021 tentang Organisasi dan Tata Kerja Dinas Pangan Provinsi Maluku Utara</li>
  <li>Peraturan Gubernur Maluku Utara Nomor 72 Tahun 2023 tentang Susunan Organisasi, Tugas Pokok dan Fungsi UPTD Balai Pengawasan Mutu dan Keamanan Pangan pada Dinas Pangan Provinsi Maluku Utara</li>
</ol>

<h3>1.3 Maksud dan Tujuan</h3>
<p>Renstra ${namaOpd} disusun dengan maksud untuk:</p>
<ol>
  <li>Memberikan arah dan pedoman bagi seluruh aparatur ${namaOpd} dalam melaksanakan tugas pokok dan fungsinya.</li>
  <li>Menjadi acuan dalam penyusunan Rencana Kerja (Renja) tahunan ${namaOpd}.</li>
  <li>Menjadi tolok ukur evaluasi kinerja ${namaOpd} dalam periode ${periode}.</li>
</ol>
<p>Tujuan penyusunan Renstra ini adalah tersedianya dokumen perencanaan strategis ${namaOpd} yang terintegrasi dengan RPJMD Daerah periode ${periode}.</p>

<h3>1.4 Sistematika Penulisan</h3>
<p>Renstra ${namaOpd} Periode ${periode} disusun dengan sistematika sebagai berikut:</p>
<ul>
  <li><strong>BAB I: Pendahuluan</strong> — latar belakang, landasan hukum, maksud dan tujuan, serta sistematika penulisan.</li>
  <li><strong>BAB II: Gambaran Pelayanan Perangkat Daerah</strong> — tugas, fungsi, struktur organisasi, sumber daya, dan kinerja pelayanan.</li>
  <li><strong>BAB III: Permasalahan dan Isu-isu Strategis</strong> — identifikasi permasalahan dan isu strategis.</li>
  <li><strong>BAB IV: Tujuan dan Sasaran</strong> — tujuan dan sasaran jangka menengah beserta indikator kinerja.</li>
  <li><strong>BAB V: Strategi dan Arah Kebijakan</strong> — strategi dan arah kebijakan dalam mencapai tujuan dan sasaran.</li>
  <li><strong>BAB VI: Rencana Program dan Kegiatan</strong> — program, kegiatan, dan sub-kegiatan beserta pendanaan indikatif.</li>
  <li><strong>BAB VII: Kinerja Penyelenggaraan Bidang Urusan</strong> — indikator kinerja yang mengacu pada tujuan dan sasaran RPJMD.</li>
  <li><strong>BAB VIII: Penutup</strong> — kesimpulan dan harapan.</li>
</ul>
`,
  );

  const tc23 = buildTabelTC23(data);
  const tc24 = buildTabelTC24(data);
  const bab2Content = babSection(
    data.babs?.['II'],
    `
<h3>2.1 Tugas, Fungsi, dan Struktur Organisasi</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan tugas pokok dan fungsi ${namaOpd} berdasarkan Peraturan Daerah/Peraturan Kepala Daerah tentang pembentukan dan susunan perangkat daerah. Sertakan bagan struktur organisasi. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.2 Sumber Daya ${namaOpd}</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Deskripsikan sumber daya manusia (jumlah, kualifikasi, dan distribusi pegawai), serta sumber daya aset/anggaran yang dimiliki ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.3 Kinerja Pelayanan ${namaOpd}</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Sajikan data capaian kinerja pelayanan ${namaOpd} pada periode Renstra sebelumnya menggunakan tabel capaian indikator kinerja dan analisis pencapaiannya. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.4 Tantangan dan Peluang Pengembangan Pelayanan</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Identifikasi tantangan dan peluang berdasarkan analisis SWOT (kekuatan, kelemahan, peluang, ancaman). — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>
`,
  );

  const bab3Content = babSection(
    data.babs?.['III'],
    `
<h3>3.1 Identifikasi Permasalahan Berdasarkan Tugas dan Fungsi Pelayanan</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Identifikasi permasalahan utama yang dihadapi ${namaOpd} dalam melaksanakan tugas dan fungsinya. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.2 Telaahan Visi, Misi, dan Program Kepala Daerah</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan keterkaitan visi dan misi Kepala Daerah dengan tugas dan fungsi ${namaOpd}, beserta faktor pendorong dan penghambat. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.3 Telaahan Renstra K/L dan Renstra Provinsi/Kabupaten/Kota</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Telaah sasaran jangka menengah Renstra K/L dan Renstra OPD yang terkait dengan tugas dan fungsi ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.4 Telaahan Rencana Tata Ruang Wilayah dan KLHS</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan implikasi RTRW dan KLHS terhadap tugas dan fungsi pelayanan ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.5 Penentuan Isu-isu Strategis</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Berdasarkan telaahan di atas, tentukan isu-isu strategis yang menjadi dasar penentuan tujuan, sasaran, strategi, dan kebijakan Renstra ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>
`,
  );

  const bab8Content = babSection(
    data.babs?.['VIII'],
    `
<p>Rencana Strategis ${namaOpd} Periode ${periode} merupakan dokumen perencanaan yang menjadi acuan dalam pelaksanaan tugas pokok dan fungsi ${namaOpd} selama lima tahun ke depan. Dokumen ini disusun dengan mengacu pada RPJMD Daerah dan peraturan perundang-undangan yang berlaku.</p>
<p>Keberhasilan pelaksanaan Renstra ini sangat ditentukan oleh komitmen seluruh aparatur ${namaOpd}, dukungan pemangku kepentingan (stakeholders), serta konsistensi dalam mengimplementasikan program dan kegiatan yang telah direncanakan.</p>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Tambahkan narasi penutup yang mencakup: harapan capaian, mekanisme pemantauan dan evaluasi, serta pernyataan komitmen. — <em>Isi melalui menu <strong>Renstra → BAB VIII</strong> lalu generate ulang.</em></div>
`,
  );

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Renstra ${namaOpd} ${periode}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 0; color: #000; }
  .cover { text-align: center; padding: 60px 40px; page-break-after: always; }
  .cover h1 { font-size: 18pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .cover h2 { font-size: 15pt; margin-bottom: 4px; }
  .cover .subtitle { font-size: 13pt; color: #333; margin: 4px 0; }
  .cover .logo-area { font-size: 60px; margin: 32px 0; }
  .cover .footer-info { margin-top: 40px; font-size: 12pt; }
  .toc { page-break-after: always; padding: 32px; }
  .toc h2 { text-align: center; text-transform: uppercase; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 4px 0; border-bottom: 1px dotted #aaa; display: flex; justify-content: space-between; }
  .section { padding: 24px 32px; }
  h1, h2, h3, h4 { font-family: 'Times New Roman', serif; }
  h2 { text-transform: uppercase; text-align: center; font-size: 14pt; margin-top: 24px; margin-bottom: 16px; }
  h3 { font-size: 12pt; margin-top: 16px; }
  p { text-align: justify; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 10pt; }
  table th { background: #1a5276; color: white; padding: 6px 8px; text-align: center; }
  table td { padding: 5px 8px; vertical-align: top; border: 1px solid #bbb; }
  table tr:nth-child(even) { background: #f5f5f5; }
  .placeholder { background: #fffbcc; border: 1px dashed #ccaa00; padding: 12px 16px; border-radius: 4px; margin: 12px 0; font-style: italic; color: #665500; }
  .pagebreak { page-break-before: always; }
  .signed { margin-top: 48px; text-align: right; padding-right: 60px; }
  .signed-left { margin-top: 48px; display: flex; justify-content: space-between; }
  .signed-block { text-align: center; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="logo-area">🏛️</div>
  <h1>Rencana Strategis (Renstra)</h1>
  <h2>${namaOpd}</h2>
  ${bidang ? `<p class="subtitle">${bidang}${subBidang ? ' / ' + subBidang : ''}</p>` : ''}
  <p class="subtitle" style="font-size:16pt;font-weight:bold">Periode ${periode}</p>
  <div class="footer-info">
    <p>Dokumen ini dibuat sesuai<br/>Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017</p>
    <p style="color:#666;font-size:10pt">Digenerate otomatis pada ${tglGen}</p>
  </div>
</div>

<!-- DAFTAR ISI -->
<div class="toc pagebreak">
  <h2>Daftar Isi</h2>
  <ul>
    <li><span>BAB I &nbsp; PENDAHULUAN</span><span>3</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.1 Latar Belakang</span><span>3</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.2 Landasan Hukum</span><span>4</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.3 Maksud dan Tujuan</span><span>5</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.4 Sistematika Penulisan</span><span>5</span></li>
    <li><span>BAB II &nbsp; GAMBARAN PELAYANAN PERANGKAT DAERAH</span><span>6</span></li>
    <li><span>BAB III &nbsp; PERMASALAHAN DAN ISU-ISU STRATEGIS</span><span>10</span></li>
    <li><span>BAB IV &nbsp; TUJUAN DAN SASARAN</span><span>15</span></li>
    <li><span>BAB V &nbsp; STRATEGI DAN ARAH KEBIJAKAN</span><span>18</span></li>
    <li><span>BAB VI &nbsp; RENCANA PROGRAM DAN KEGIATAN</span><span>20</span></li>
    <li><span>BAB VII &nbsp; KINERJA PENYELENGGARAAN BIDANG URUSAN</span><span>25</span></li>
    <li><span>BAB VIII &nbsp; PENUTUP</span><span>28</span></li>
  </ul>
</div>

<!-- BAB I: PENDAHULUAN -->
<div class="section pagebreak">
<h2>BAB I<br/>PENDAHULUAN</h2>
${bab1Content}
</div>

<!-- BAB II: GAMBARAN PELAYANAN -->
<div class="section pagebreak">
<h2>BAB II<br/>GAMBARAN PELAYANAN PERANGKAT DAERAH</h2>
${bab2Content}
${tc23}
${tc24}
</div>

<!-- BAB III: PERMASALAHAN DAN ISU STRATEGIS -->
<div class="section pagebreak">
<h2>BAB III<br/>PERMASALAHAN DAN ISU-ISU STRATEGIS PERANGKAT DAERAH</h2>
${bab3Content}
</div>

<!-- BAB IV: TUJUAN DAN SASARAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab4}
</div>

<!-- BAB V: STRATEGI DAN ARAH KEBIJAKAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab5}
</div>

<!-- BAB VI: PROGRAM DAN KEGIATAN (AUTO-POPULATED) -->
<div class="section pagebreak" style="padding:6px 8px">
${bab6}
</div>

<!-- BAB VII: KINERJA BIDANG URUSAN (AUTO-POPULATED) -->
<div class="section pagebreak" style="padding:6px 8px">
${bab7}
</div>

<!-- BAB VIII: PENUTUP -->
<div class="section pagebreak">
<h2>BAB VIII<br/>PENUTUP</h2>
${bab8Content}

<div class="signed">
  <p>${s(renstra.kota_penetapan, 'Sofifi')}, ${tglGen}</p>
  <br/><br/>
  <p><strong>Kepala Dinas Pangan Provinsi Maluku Utara</strong></p>
  <br/><br/><br/>
  <p>_________________________________</p>
  <p><strong>Dheny Tjan, SH., M.Si</strong></p>
  <p>NIP. 197507302001121001</p>
</div>
</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pisahkan dokumen HTML utuh menjadi 3 bagian berdasarkan marker komentar yang
// sudah ada, agar Bab VI-VII bisa dirender landscape terpisah dari sisanya (portrait).
// ─────────────────────────────────────────────────────────────────────────────
function splitHtmlForPrint(fullHtml) {
  const markerVI = '<!-- BAB VI: PROGRAM DAN KEGIATAN (AUTO-POPULATED) -->';
  const markerVIII = '<!-- BAB VIII: PENUTUP -->';

  const idxVI = fullHtml.indexOf(markerVI);
  const idxVIII = fullHtml.indexOf(markerVIII);

  if (idxVI === -1 || idxVIII === -1) {
    return { part1: fullHtml, part2: null, part3: null };
  }

  const bodyOpenIdx = fullHtml.indexOf('<body>') + '<body>'.length;
  const headHtml = fullHtml.slice(0, bodyOpenIdx);

  const part1 = `${headHtml}${fullHtml.slice(bodyOpenIdx, idxVI)}</body></html>`;
  const part2 = `${headHtml}${fullHtml.slice(idxVI, idxVIII)}</body></html>`;
  const part3 = `${headHtml}${fullHtml.slice(idxVIII)}`;

  return { part1, part2, part3 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Generate DOCX
// ─────────────────────────────────────────────────────────────────────────────
exports.generateDocx = async (req, res) => {
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: 'renstra_id diperlukan' });

    const data = await gatherData(renstraId);
    let html = generateHTML(data);
    // Strip semua karakter non-ASCII kecuali Latin Extended dan tanda baca umum
    html = html.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
    html = html.replace(
      /[^\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/gu,
      '',
    );
    // Strip tag <style> karena html-to-docx tidak support semua CSS
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Strip width:% dari style atribut — menyebabkan Invalid XML di html-to-docx
    html = html.replace(/style="([^"]*)width:\s*\d+%([^"]*)"/g, (m, pre, post) => {
      const cleaned = (pre + post).replace(/;+/g, ';').replace(/^;|;$/g, '').trim();
      return cleaned ? `style="${cleaned}"` : '';
    });

    const namaOpd = s(data.renstra.nama_opd, 'OPD').replace(/\s+/g, '_');
    const periode = `${s(data.renstra.tahun_mulai)}-${s(data.renstra.tahun_akhir)}`;
    const filename = `Renstra_${namaOpd}_${periode}.docx`;

    const docxBuffer = await HTMLtoDOCX(html, null, {
      font: 'Times New Roman',
      fontSize: 24,
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
    console.error('❌ generateDocx error:', err);
    return res.status(500).json({ error: 'Gagal generate dokumen DOCX', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Generate PDF (via Puppeteer)
// ─────────────────────────────────────────────────────────────────────────────
exports.generatePdf = async (req, res) => {
  let browser;
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: 'renstra_id diperlukan' });

    const data = await gatherData(renstraId);
    const html = generateHTML(data);

    const namaOpd = s(data.renstra.nama_opd, 'OPD').replace(/\s+/g, '_');
    const periode = `${s(data.renstra.tahun_mulai)}-${s(data.renstra.tahun_akhir)}`;
    const filename = `Renstra_${namaOpd}_${periode}.pdf`;

    const { part1, part2, part3 } = splitHtmlForPrint(html);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const renderPart = async (htmlContent, landscape) => {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape,
        margin: landscape
          ? { top: '1.2cm', right: '0.6cm', bottom: '1.2cm', left: '0.6cm' }
          : { top: '2.5cm', right: '2cm', bottom: '2.5cm', left: '3cm' },
      });
      await page.close();
      return buffer;
    };

    let pdfBuffer;
    if (!part2 || !part3) {
      // Fallback: marker tidak ditemukan, render seperti biasa (satu dokumen portrait)
      pdfBuffer = await renderPart(html, false);
    } else {
      const { PDFDocument } = require('pdf-lib');
      const [buf1, buf2, buf3] = await Promise.all([
        renderPart(part1, false),
        renderPart(part2, true),
        renderPart(part3, false),
      ]);

      const mergedPdf = await PDFDocument.create();
      for (const buf of [buf1, buf2, buf3]) {
        const doc = await PDFDocument.load(buf);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      pdfBuffer = Buffer.from(await mergedPdf.save());
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('❌ generatePdf error:', err);
    return res.status(500).json({ error: 'Gagal generate dokumen PDF', detail: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Preview HTML (for debugging/preview in browser)
// ─────────────────────────────────────────────────────────────────────────────
exports.previewHtml = async (req, res) => {
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: 'renstra_id diperlukan' });
    const data = await gatherData(renstraId);
    const html = generateHTML(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('❌ previewHtml error:', err);
    return res.status(500).json({ error: 'Gagal generate preview HTML', detail: err.message });
  }
};
exports._generateHTMLForTest = async (renstraId) => {
  const data = await gatherData(renstraId);
  return generateHTML(data);
};

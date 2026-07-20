/**
 * dpaController.js — FINAL LOCKED SMART CHAIN (UI SAFE)
 * RKA → RPJMD → PREVIEW GUARANTEED (NO EMPTY UI)
 */

const { Dpa, PeriodeRpjmd, PlanningAuditEvent } = require('../models');
const Joi = require('joi');
const { splitPlanningBody } = require('../helpers/planningDocumentMutation');

const {
  writePlanningAudit,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require('../services/planningDocumentAuditService');

const { validateMultiYearPaguAgainstTotal } = require('../helpers/planningPaguConsistency');
const { resolveRpjmdByContext } = require('../helpers/rpjmdResolver');
const { resolveRkaSmart } = require('../helpers/rkaSmartResolver');

/* =========================
   SCHEMA
========================= */
const dpaCreateSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),

  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),

  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null),
  anggaran: Joi.number().allow(null),

  kode_rekening: Joi.string().max(30).allow(null, ''),
  nama_rekening: Joi.string().max(255).allow(null, ''),

  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),

  jenis_dokumen: Joi.string().allow(null, ''),
  rka_id: Joi.number().allow(null),
  rpjmd_id: Joi.number().allow(null),

  rincian_belanja: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),

  opd_id: Joi.number().allow(null),
});

const dpaUpdateSchema = Joi.object({
  tahun: Joi.string(),
  periode_id: Joi.number(),

  program: Joi.string(),
  kegiatan: Joi.string(),
  sub_kegiatan: Joi.string(),

  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null),
  anggaran: Joi.number().allow(null),

  kode_rekening: Joi.string().max(30).allow(null, ''),
  nama_rekening: Joi.string().max(255).allow(null, ''),

  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),

  jenis_dokumen: Joi.string().allow(null, ''),
  rka_id: Joi.number().allow(null),
  rpjmd_id: Joi.number().allow(null),

  rincian_belanja: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),

  opd_id: Joi.number().allow(null),

  change_reason_text: Joi.string().allow(null, ''),
}).min(1);

/* =========================
   SAFE NORMALIZER (ANTI EMPTY UI)
========================= */
function normalizeRkaContext(ctx = {}) {
  return {
    program: ctx.program || '',
    kegiatan: ctx.kegiatan || '',
    sub_kegiatan: ctx.sub_kegiatan || '',
    indikator: ctx.indikator || '',
    target: ctx.target || '',
    pagu: ctx.pagu || ctx.anggaran || 0,
    id: ctx.id || null,
  };
}

/* =========================
   PREVIEW GUARANTEE (NO EMPTY UI)
========================= */
function buildSmartPreview(rkaContext, rpjmdId) {
  const ctx = normalizeRkaContext(rkaContext);

  return {
    program: ctx.program || 'BELUM TERISI',
    kegiatan: ctx.kegiatan || 'BELUM TERISI',
    sub_kegiatan: ctx.sub_kegiatan || 'BELUM TERISI',
    indikator: ctx.indikator || 'BELUM TERISI',
    target: ctx.target || 'BELUM TERISI',
    anggaran: ctx.pagu ?? 0,
    rka_id: ctx.id,
    rpjmd_id: rpjmdId || null,
  };
}

/* =========================
   RKA RESOLVER WRAPPER (STRICT)
========================= */
async function resolveRkaSmartStrict(input) {
  const rkaResolved = await resolveRkaSmart(input);

  if (!rkaResolved?.ok) {
    return {
      ok: false,
      msg: rkaResolved?.msg || 'RKA gagal resolve',
      context: normalizeRkaContext({}),
    };
  }

  return {
    ok: true,
    rka_id: rkaResolved.rka_id,
    context: normalizeRkaContext(rkaResolved.context),
  };
}

/* =========================
   SMART CHAIN CORE (LOCKED)
========================= */
async function resolveSmartChain(payload) {
  const rkaResolved = await resolveRkaSmartStrict(payload);

  if (!rkaResolved.ok) {
    return {
      ok: false,
      msg: rkaResolved.msg,
      preview: buildSmartPreview({}, null),
    };
  }

  const rp = await resolveRpjmdByContext({
    tahun: payload.tahun,
    periode_id: payload.periode_id,
    rka: rkaResolved.context,
  });

  const rpjmd_id = rp?.ok ? rp.id : null;

  return {
    ok: true,
    rka: rkaResolved,
    rpjmd_id,
    preview: buildSmartPreview(rkaResolved.context, rpjmd_id),
  };
}

/* =========================
   CONTROLLER
========================= */
module.exports = {
  // GET /api/dpa/:id/rincian-detail-perubahan — rincian per kode_rekening+uraian (state terkini) untuk form Perubahan
  async getRincianDetailPerubahan(req, res) {
    try {
      const { getRincianDetailUntukPerubahan } = require('../services/dpaPerubahanExportService');
      const data = await getRincianDetailUntukPerubahan(Number(req.params.id));
      if (!data) return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async getRealisasiBulanan(req, res) {
    try {
      const { DpaRealisasiBulanan } = require('../models');
      const data = await DpaRealisasiBulanan.findAll({
        where: { dpa_id: Number(req.params.id) },
        order: [['bulan', 'ASC']],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async saveRealisasiBulanan(req, res) {
    try {
      const { DpaRealisasiBulanan } = require('../models');
      const dpa_id = Number(req.params.id);
      const { items } = req.body; // [{ bulan: 1, jumlah: 500000 }, ...]
      if (!Array.isArray(items))
        return res.status(400).json({ success: false, message: 'items harus array' });
      await DpaRealisasiBulanan.destroy({ where: { dpa_id } });
      const rows = items
        .filter((i) => Number(i.jumlah) > 0)
        .map((i) => ({
          dpa_id,
          bulan: Number(i.bulan),
          jumlah: Number(i.jumlah),
        }));
      if (rows.length > 0) await DpaRealisasiBulanan.bulkCreate(rows);
      res.json({ success: true, message: 'Rencana realisasi bulanan berhasil disimpan' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async exportPdf(req, res) {
    let browser;
    try {
      const { id } = req.params;
      const { Dpa, Rka, RkaRincianBelanja, Tapd } = require('../models');
      const puppeteer = require('puppeteer');
      const dpa = await Dpa.findByPk(id);
      if (!dpa) return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });
      const rka = await Rka.findByPk(dpa.rka_id);
      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: dpa.rka_id },
        order: [['urutan', 'ASC']],
      });
      const { DpaRealisasiBulanan } = require('../models');
      const realisasiBulanan = await DpaRealisasiBulanan.findAll({
        where: { dpa_id: Number(id) },
        order: [['bulan', 'ASC']],
      });
      const realisasiMap = {};
      realisasiBulanan.forEach((r) => {
        realisasiMap[r.bulan] = Number(r.jumlah || 0);
      });
      const tapdList = await Tapd.findAll({
        where: { tahun: Number(dpa.tahun) },
        order: [['urutan', 'ASC']],
      });
      const opdName =
        rka?.opd_penanggung_jawab ||
        dpa.opd_penanggung_jawab ||
        'DINAS PANGAN PROVINSI MALUKU UTARA';
      const formatRp = (val) => `Rp${Number(val || 0).toLocaleString('id-ID')},00`;
      const totalAnggaran = rincian.reduce((s, r) => s + Number(r.jumlah || 0), 0);
      const noDpa = `DPA/A.1/${dpa.kode_program || '2.09.01'}.0.00.0.00.01.0000/001/${dpa.tahun}`;
      const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const subtotals = {};
      rincian.forEach((item) => {
        item.kode_rekening.split('.').forEach((_, idx, arr) => {
          const prefix = arr.slice(0, idx + 1).join('.');
          subtotals[prefix] = (subtotals[prefix] || 0) + Number(item.jumlah || 0);
        });
      });
      // Nama akun tiap level kode rekening diambil dari tabel referensi
      // master_kode_rekening_belanja (bukan daftar hardcode) — lihat komentar sama di
      // rkaExportController.js & dpaPergeseranController.js. Kode NON-LEAF di tabel itu
      // disimpan dgn titik di akhir (mis. "5.1.02.02."), kode LEAF tidak pakai titik.
      const { MasterKodeRekeningBelanja } = require('../models');
      const allPrefixesDpa = new Set();
      rincian.forEach((item) => {
        const segments = String(item.kode_rekening || '').split('.');
        for (let i = 1; i <= segments.length; i++) {
          allPrefixesDpa.add(segments.slice(0, i).join('.'));
        }
      });
      const lookupCodesDpa = [...allPrefixesDpa].flatMap((p) => [p, `${p}.`]);
      const masterRowsDpa = lookupCodesDpa.length
        ? await MasterKodeRekeningBelanja.findAll({
            where: { kode_rekening: lookupCodesDpa },
            attributes: ['kode_rekening', 'uraian'],
          })
        : [];
      const labelStatis = new Map();
      masterRowsDpa.forEach((r) => {
        const bare = r.kode_rekening.endsWith('.') ? r.kode_rekening.slice(0, -1) : r.kode_rekening;
        if (!labelStatis.has(bare)) labelStatis.set(bare, r.uraian);
      });
      const grouped = {};
      const kodeOrder = [];
      rincian.forEach((item) => {
        const k = item.kode_rekening;
        if (!grouped[k]) {
          grouped[k] = [];
          kodeOrder.push(k);
        }
        grouped[k].push(item);
      });
      const renderedPrefixes = new Set();
      let rincianHtml = '';
      kodeOrder.forEach((kode) => {
        const items = grouped[kode];
        const segs = kode.split('.');
        for (let i = 1; i <= segs.length; i++) {
          const prefix = segs.slice(0, i).join('.');
          if (renderedPrefixes.has(prefix)) continue;
          renderedPrefixes.add(prefix);
          const isLeaf = i === segs.length,
            isTop = i <= 2;
          if (!isLeaf) {
            rincianHtml += `<tr style="background:${isTop ? '#f2f2f2' : '#fff'}"><td style="border:1px solid #000;padding:3px;font-weight:${isTop ? 'bold' : 'normal'}">${prefix}</td><td colspan="7" style="border:1px solid #000;padding:3px;padding-left:${(i - 1) * 10 + 3}px;font-weight:${isTop ? 'bold' : 'normal'}">${labelStatis.get(prefix) || prefix}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:${isTop ? 'bold' : 'normal'}">${formatRp(subtotals[prefix] || 0)}</td></tr>`;
          } else {
            const namaLeaf = items[0].nama_rekening || kode;
            rincianHtml += `<tr><td style="border:1px solid #000;padding:3px;font-weight:bold">${kode}</td><td colspan="7" style="border:1px solid #000;padding:3px;font-weight:bold">${namaLeaf}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:bold">${formatRp(subtotals[kode] || 0)}</td></tr>`;
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
              const gItems = grupSumber[sd],
                subTotal = gItems.reduce((s, it) => s + Number(it.jumlah || 0), 0);
              rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td colspan="7" style="border:1px solid #000;padding:3px"><strong>[ # ] ${namaLeaf}</strong><br><span style="padding-left:10px">Sumber Dana : ${sd}</span></td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(subTotal)}</td></tr>`;
              rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td colspan="7" style="border:1px solid #000;padding:3px">[ - ] ${namaLeaf}</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(subTotal)}</td></tr>`;
              gItems.forEach((it) => {
                rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td style="border:1px solid #000;padding:3px;color:#c00000;padding-left:20px">${it.uraian || '-'}<br><span style="color:#555;font-size:9px">Spesifikasi : ${it.keterangan || '-'}</span></td><td style="border:1px solid #000;padding:3px;text-align:center">${Number(it.volume || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:center">${it.satuan || '-'}</td><td style="border:1px solid #000;padding:3px;text-align:right;color:#c00000">${Number(it.harga_satuan || 0).toLocaleString('id-ID')},00</td><td style="border:1px solid #000;padding:3px;text-align:center">0 %</td><td style="border:1px solid #000;padding:3px;text-align:center">-</td><td style="border:1px solid #000;padding:3px;text-align:center">-</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(it.jumlah || 0)}</td></tr>`;
              });
            });
          }
        }
      });
      const tapdRows = tapdList
        .map(
          (t, i) =>
            `<tr><td style="border:1px solid #000;padding:3px;text-align:center">${i + 1}</td><td style="border:1px solid #000;padding:3px">${t.nama || ''}</td><td style="border:1px solid #000;padding:3px">${t.nip || ''}</td><td style="border:1px solid #000;padding:3px">${t.jabatan || ''}</td><td style="border:1px solid #000;padding:3px"></td></tr>`,
        )
        .join('');
      const css = `body{font-family:Arial,sans-serif;font-size:10px;margin:15px;color:#000}.page{page-break-after:always}.page:last-child{page-break-after:avoid}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#BDD7EE;border:1px solid #000;padding:4px;text-align:center;font-weight:bold}.right{text-align:right}.center{text-align:center}.bold{font-weight:bold}.h1{text-align:center;font-size:12px;font-weight:bold;margin:6px 0}.meta td{border:none;padding:1px 4px}.green{background:#e2efda}`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN<br>SATUAN KERJA PERANGKAT DAERAH<br>(DPA-SKPD) TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:10px 0"><tr><td style="width:22%;font-weight:bold">URUSAN PEMERINTAHAN</td><td>: ${dpa.kode_program || ''} - URUSAN PEMERINTAHAN WAJIB</td></tr><tr><td style="font-weight:bold">BIDANG URUSAN</td><td>: ${dpa.kode_program || ''} - URUSAN PEMERINTAHAN BIDANG PANGAN</td></tr><tr><td style="font-weight:bold">ORGANISASI</td><td>: ${opdName}</td></tr></table>
        <table style="margin-top:20px"><thead><tr><th style="width:20%">KODE</th><th>NAMA FORMULIR</th></tr></thead><tbody><tr><td class="center">DPA-REKAPITULASI SKPD</td><td>Ringkasan Dokumen Pelaksanaan Anggaran Pendapatan dan Belanja Satuan Kerja Perangkat Daerah</td></tr><tr><td class="center">DPA-BELANJA SKPD</td><td>Rekapitulasi Dokumen Pelaksanaan Belanja Berdasarkan Program, Kegiatan, dan Sub Kegiatan</td></tr><tr><td class="center">DPA RINCIAN BELANJA SKPD</td><td>Rincian Anggaran Belanja Menurut Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr></tbody></table>
        <div style="margin-top:30px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:60px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Disahkan oleh, PPKD</div><div style="margin-top:60px">( _______________________ )</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-REKAPITULASI SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:20%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr></table>
        <table><thead><tr><th colspan="2">Kode Rekening</th><th>Uraian</th><th>Jumlah (Rp)</th></tr></thead><tbody>
          <tr class="bold" style="background:#f2f2f2"><td colspan="2">4</td><td>Jumlah Pendapatan</td><td class="right">Rp0,00</td></tr>
          <tr class="bold"><td colspan="2">5</td><td>BELANJA DAERAH</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.1</td><td style="padding-left:15px">Belanja Operasi</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.1.02</td><td style="padding-left:20px">Belanja Barang dan Jasa</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.2</td><td style="padding-left:15px">Belanja Modal</td><td class="right">Rp0,00</td></tr>
          <tr class="bold green"><td colspan="3" class="center">Jumlah Belanja</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr class="bold"><td colspan="3" class="center">Total Surplus/(Defisit)</td><td class="right">(${formatRp(totalAnggaran)})</td></tr>
          <tr class="bold green"><td colspan="3" class="center">Pembiayaan Neto</td><td class="right">Rp0,00</td></tr>
        </tbody></table>
        <div style="margin-top:20px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:50px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Kepala ${opdName}</div><div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-BELANJA SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:20%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr></table>
        <table><thead><tr><th rowspan="2" style="width:5%">Urusan</th><th rowspan="2" style="width:5%">Bidang</th><th rowspan="2" style="width:5%">Program</th><th rowspan="2" style="width:5%">Kegiatan</th><th rowspan="2" style="width:5%">Sub Keg</th><th rowspan="2" style="width:25%">Uraian</th><th rowspan="2" style="width:8%">Sumber Dana</th><th rowspan="2" style="width:8%">Lokasi</th><th colspan="2" style="width:16%">Jumlah (Rp)</th><th rowspan="2" style="width:8%">T+1</th></tr><tr><th>T-1</th><th>Tahun N</th></tr></thead>
        <tbody>
          <tr class="bold" style="background:#f0f0f0"><td class="center">2</td><td class="center">09</td><td class="center">01</td><td></td><td></td><td>${dpa.program}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr><td></td><td></td><td></td><td class="center">1.01</td><td></td><td style="padding-left:10px">${dpa.kegiatan}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr><td></td><td></td><td></td><td></td><td class="center">0001</td><td style="padding-left:20px">${dpa.sub_kegiatan}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr class="bold green"><td colspan="8" class="center">JUMLAH TOTAL BELANJA</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
        </tbody></table>
        <div style="margin-top:20px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:50px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Kepala ${opdName}</div><div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA RINCIAN BELANJA SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:22%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">Urusan Pemerintahan</td><td>: ${dpa.kode_program || ''} URUSAN PEMERINTAHAN WAJIB</td></tr><tr><td style="font-weight:bold">Unit Organisasi</td><td>: ${opdName}</td></tr><tr><td style="font-weight:bold">Program</td><td>: ${dpa.kode_program || ''} ${dpa.program}</td></tr><tr><td style="font-weight:bold">Kegiatan</td><td>: ${dpa.kode_kegiatan || ''} ${dpa.kegiatan}</td></tr><tr><td style="font-weight:bold">Sub Kegiatan</td><td>: ${dpa.kode_sub_kegiatan || ''} ${dpa.sub_kegiatan}</td></tr><tr><td style="font-weight:bold">Sumber Pendanaan</td><td>: ${rincian[0]?.sumber_dana || 'PAD'}</td></tr><tr><td style="font-weight:bold">Alokasi ${Number(dpa.tahun) - 1}</td><td>: Rp0,00</td></tr><tr><td style="font-weight:bold">Alokasi ${dpa.tahun}</td><td>: ${formatRp(totalAnggaran)}</td></tr><tr><td style="font-weight:bold">Alokasi ${Number(dpa.tahun) + 1}</td><td>: Rp0,00</td></tr></table>
        <table><thead><tr><th style="width:13%">Kode Rekening</th><th style="width:28%">Uraian</th><th style="width:10%">Koefisien</th><th style="width:8%">Satuan</th><th style="width:10%">Harga</th><th style="width:5%">PPN</th><th style="width:8%">Sumber Dana</th><th style="width:8%">Lokasi</th><th style="width:10%">Jumlah (Rp)</th></tr></thead>
        <tbody>${rincianHtml}<tr class="bold green"><td colspan="8" class="center">JUMLAH TOTAL</td><td class="right">${formatRp(totalAnggaran)}</td></tr></tbody></table>
        <div class="bold" style="margin:8px 0 4px">Rencana Realisasi Belanja per Bulan (Rp)</div>
        <table><thead><tr>${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m) => `<th>${m}</th>`).join('')}<th>Jumlah</th></tr></thead><tbody><tr>${Array.from({ length: 12 }, (_, i) => `<td class="right">${realisasiMap[i + 1] ? formatRp(realisasiMap[i + 1]) : '-'}</td>`).join('')}<td class="right bold">${formatRp(totalAnggaran)}</td></tr></tbody></table>
        <div style="margin-top:15px;display:table;width:100%">
          <div style="display:table-cell;width:55%;vertical-align:top"><div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div><table style="page-break-inside:avoid"><thead><tr><th style="width:5%">No</th><th style="width:35%">Nama</th><th style="width:25%">NIP</th><th style="width:20%">Jabatan</th><th style="width:15%">Tanda Tangan</th></tr></thead><tbody>${tapdRows}</tbody></table></div>
          <div style="display:table-cell;width:45%;text-align:center;vertical-align:top;padding-left:10px"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Mengesahkan, PPKD</div><div style="margin-top:40px">( _______________________ )</div><div style="margin-top:15px">Kepala ${opdName}</div><div style="margin-top:40px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div>
        </div>
      </div>
      </body></html>`;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();
      const namaFile = `DPA_${(dpa.sub_kegiatan || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${dpa.tahun}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportPdfSebelumPerubahan(req, res) {
    let browser;
    try {
      const { id } = req.params;
      const { Dpa, Rka, RkaRincianBelanja, Tapd } = require('../models');
      const puppeteer = require('puppeteer');
      const dpa = await Dpa.findByPk(id);
      if (!dpa) return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });
      const rka = await Rka.findByPk(dpa.rka_id);
      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: dpa.rka_id },
        order: [['urutan', 'ASC']],
      });
      const { DpaRealisasiBulanan } = require('../models');
      const realisasiBulanan = await DpaRealisasiBulanan.findAll({
        where: { dpa_id: Number(id) },
        order: [['bulan', 'ASC']],
      });
      const realisasiMap = {};
      realisasiBulanan.forEach((r) => {
        realisasiMap[r.bulan] = Number(r.jumlah || 0);
      });
      const tapdList = await Tapd.findAll({
        where: { tahun: Number(dpa.tahun) },
        order: [['urutan', 'ASC']],
      });
      const opdName =
        rka?.opd_penanggung_jawab ||
        dpa.opd_penanggung_jawab ||
        'DINAS PANGAN PROVINSI MALUKU UTARA';
      const formatRp = (val) => `Rp${Number(val || 0).toLocaleString('id-ID')},00`;
      const totalAnggaran = rincian.reduce((s, r) => s + Number(r.jumlah || 0), 0);
      const noDpa = `DPA/A.1/${dpa.kode_program || '2.09.01'}.0.00.0.00.01.0000/001/${dpa.tahun}`;
      const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const subtotals = {};
      rincian.forEach((item) => {
        item.kode_rekening.split('.').forEach((_, idx, arr) => {
          const prefix = arr.slice(0, idx + 1).join('.');
          subtotals[prefix] = (subtotals[prefix] || 0) + Number(item.jumlah || 0);
        });
      });
      // Nama akun tiap level kode rekening diambil dari tabel referensi
      // master_kode_rekening_belanja (bukan daftar hardcode) — lihat komentar sama di
      // rkaExportController.js & dpaPergeseranController.js. Kode NON-LEAF di tabel itu
      // disimpan dgn titik di akhir (mis. "5.1.02.02."), kode LEAF tidak pakai titik.
      const { MasterKodeRekeningBelanja } = require('../models');
      const allPrefixesDpaSebelum = new Set();
      rincian.forEach((item) => {
        const segments = String(item.kode_rekening || '').split('.');
        for (let i = 1; i <= segments.length; i++) {
          allPrefixesDpaSebelum.add(segments.slice(0, i).join('.'));
        }
      });
      const lookupCodesDpaSebelum = [...allPrefixesDpaSebelum].flatMap((p) => [p, `${p}.`]);
      const masterRowsDpaSebelum = lookupCodesDpaSebelum.length
        ? await MasterKodeRekeningBelanja.findAll({
            where: { kode_rekening: lookupCodesDpaSebelum },
            attributes: ['kode_rekening', 'uraian'],
          })
        : [];
      const labelStatis = new Map();
      masterRowsDpaSebelum.forEach((r) => {
        const bare = r.kode_rekening.endsWith('.') ? r.kode_rekening.slice(0, -1) : r.kode_rekening;
        if (!labelStatis.has(bare)) labelStatis.set(bare, r.uraian);
      });
      const grouped = {};
      const kodeOrder = [];
      rincian.forEach((item) => {
        const k = item.kode_rekening;
        if (!grouped[k]) {
          grouped[k] = [];
          kodeOrder.push(k);
        }
        grouped[k].push(item);
      });
      const renderedPrefixes = new Set();
      let rincianHtml = '';
      kodeOrder.forEach((kode) => {
        const items = grouped[kode];
        const segs = kode.split('.');
        for (let i = 1; i <= segs.length; i++) {
          const prefix = segs.slice(0, i).join('.');
          if (renderedPrefixes.has(prefix)) continue;
          renderedPrefixes.add(prefix);
          const isLeaf = i === segs.length,
            isTop = i <= 2;
          if (!isLeaf) {
            rincianHtml += `<tr style="background:${isTop ? '#f2f2f2' : '#fff'}"><td style="border:1px solid #000;padding:3px;font-weight:${isTop ? 'bold' : 'normal'}">${prefix}</td><td colspan="7" style="border:1px solid #000;padding:3px;padding-left:${(i - 1) * 10 + 3}px;font-weight:${isTop ? 'bold' : 'normal'}">${labelStatis.get(prefix) || prefix}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:${isTop ? 'bold' : 'normal'}">${formatRp(subtotals[prefix] || 0)}</td></tr>`;
          } else {
            const namaLeaf = items[0].nama_rekening || kode;
            rincianHtml += `<tr><td style="border:1px solid #000;padding:3px;font-weight:bold">${kode}</td><td colspan="7" style="border:1px solid #000;padding:3px;font-weight:bold">${namaLeaf}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:bold">${formatRp(subtotals[kode] || 0)}</td></tr>`;
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
              const gItems = grupSumber[sd],
                subTotal = gItems.reduce((s, it) => s + Number(it.jumlah || 0), 0);
              rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td colspan="7" style="border:1px solid #000;padding:3px"><strong>[ # ] ${namaLeaf}</strong><br><span style="padding-left:10px">Sumber Dana : ${sd}</span></td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(subTotal)}</td></tr>`;
              rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td colspan="7" style="border:1px solid #000;padding:3px">[ - ] ${namaLeaf}</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(subTotal)}</td></tr>`;
              gItems.forEach((it) => {
                rincianHtml += `<tr><td style="border:1px solid #000;padding:3px"></td><td style="border:1px solid #000;padding:3px;color:#c00000;padding-left:20px">${it.uraian || '-'}<br><span style="color:#555;font-size:9px">Spesifikasi : ${it.keterangan || '-'}</span></td><td style="border:1px solid #000;padding:3px;text-align:center">${Number(it.volume || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:center">${it.satuan || '-'}</td><td style="border:1px solid #000;padding:3px;text-align:right;color:#c00000">${Number(it.harga_satuan || 0).toLocaleString('id-ID')},00</td><td style="border:1px solid #000;padding:3px;text-align:center">0 %</td><td style="border:1px solid #000;padding:3px;text-align:center">-</td><td style="border:1px solid #000;padding:3px;text-align:center">-</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(it.jumlah || 0)}</td></tr>`;
              });
            });
          }
        }
      });
      const tapdRows = tapdList
        .map(
          (t, i) =>
            `<tr><td style="border:1px solid #000;padding:3px;text-align:center">${i + 1}</td><td style="border:1px solid #000;padding:3px">${t.nama || ''}</td><td style="border:1px solid #000;padding:3px">${t.nip || ''}</td><td style="border:1px solid #000;padding:3px">${t.jabatan || ''}</td><td style="border:1px solid #000;padding:3px"></td></tr>`,
        )
        .join('');
      const css = `body{font-family:Arial,sans-serif;font-size:10px;margin:15px;color:#000}.page{page-break-after:always}.page:last-child{page-break-after:avoid}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#BDD7EE;border:1px solid #000;padding:4px;text-align:center;font-weight:bold}.right{text-align:right}.center{text-align:center}.bold{font-weight:bold}.h1{text-align:center;font-size:12px;font-weight:bold;margin:6px 0}.meta td{border:none;padding:1px 4px}.green{background:#e2efda}.watermark{text-align:center;font-size:11px;font-weight:bold;color:#c00000;border:1px solid #c00000;display:inline-block;padding:2px 10px;margin-bottom:4px}`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-SKPD</div>
        <div style="text-align:center"><span class="watermark">SEBELUM PERUBAHAN</span></div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN<br>SATUAN KERJA PERANGKAT DAERAH<br>(DPA-SKPD) TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:10px 0"><tr><td style="width:22%;font-weight:bold">URUSAN PEMERINTAHAN</td><td>: ${dpa.kode_program || ''} - URUSAN PEMERINTAHAN WAJIB</td></tr><tr><td style="font-weight:bold">BIDANG URUSAN</td><td>: ${dpa.kode_program || ''} - URUSAN PEMERINTAHAN BIDANG PANGAN</td></tr><tr><td style="font-weight:bold">ORGANISASI</td><td>: ${opdName}</td></tr></table>
        <table style="margin-top:20px"><thead><tr><th style="width:20%">KODE</th><th>NAMA FORMULIR</th></tr></thead><tbody><tr><td class="center">DPA-REKAPITULASI SKPD</td><td>Ringkasan Dokumen Pelaksanaan Anggaran Pendapatan dan Belanja Satuan Kerja Perangkat Daerah</td></tr><tr><td class="center">DPA-BELANJA SKPD</td><td>Rekapitulasi Dokumen Pelaksanaan Belanja Berdasarkan Program, Kegiatan, dan Sub Kegiatan</td></tr><tr><td class="center">DPA RINCIAN BELANJA SKPD</td><td>Rincian Anggaran Belanja Menurut Sub Kegiatan Satuan Kerja Perangkat Daerah</td></tr></tbody></table>
        <div style="margin-top:30px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:60px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Disahkan oleh, PPKD</div><div style="margin-top:60px">( _______________________ )</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-REKAPITULASI SKPD</div>
        <div style="text-align:center"><span class="watermark">SEBELUM PERUBAHAN</span></div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:20%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr></table>
        <table><thead><tr><th colspan="2">Kode Rekening</th><th>Uraian</th><th>Jumlah (Rp)</th></tr></thead><tbody>
          <tr class="bold" style="background:#f2f2f2"><td colspan="2">4</td><td>Jumlah Pendapatan</td><td class="right">Rp0,00</td></tr>
          <tr class="bold"><td colspan="2">5</td><td>BELANJA DAERAH</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.1</td><td style="padding-left:15px">Belanja Operasi</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.1.02</td><td style="padding-left:20px">Belanja Barang dan Jasa</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr><td colspan="2">5.2</td><td style="padding-left:15px">Belanja Modal</td><td class="right">Rp0,00</td></tr>
          <tr class="bold green"><td colspan="3" class="center">Jumlah Belanja</td><td class="right">${formatRp(totalAnggaran)}</td></tr>
          <tr class="bold"><td colspan="3" class="center">Total Surplus/(Defisit)</td><td class="right">(${formatRp(totalAnggaran)})</td></tr>
          <tr class="bold green"><td colspan="3" class="center">Pembiayaan Neto</td><td class="right">Rp0,00</td></tr>
        </tbody></table>
        <div style="margin-top:20px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:50px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Kepala ${opdName}</div><div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA-BELANJA SKPD</div>
        <div style="text-align:center"><span class="watermark">SEBELUM PERUBAHAN</span></div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH<br>PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:20%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr></table>
        <table><thead><tr><th rowspan="2" style="width:5%">Urusan</th><th rowspan="2" style="width:5%">Bidang</th><th rowspan="2" style="width:5%">Program</th><th rowspan="2" style="width:5%">Kegiatan</th><th rowspan="2" style="width:5%">Sub Keg</th><th rowspan="2" style="width:25%">Uraian</th><th rowspan="2" style="width:8%">Sumber Dana</th><th rowspan="2" style="width:8%">Lokasi</th><th colspan="2" style="width:16%">Jumlah (Rp)</th><th rowspan="2" style="width:8%">T+1</th></tr><tr><th>T-1</th><th>Tahun N</th></tr></thead>
        <tbody>
          <tr class="bold" style="background:#f0f0f0"><td class="center">2</td><td class="center">09</td><td class="center">01</td><td></td><td></td><td>${dpa.program}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr><td></td><td></td><td></td><td class="center">1.01</td><td></td><td style="padding-left:10px">${dpa.kegiatan}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr><td></td><td></td><td></td><td></td><td class="center">0001</td><td style="padding-left:20px">${dpa.sub_kegiatan}</td><td class="center">PAD</td><td>Sofifi</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
          <tr class="bold green"><td colspan="8" class="center">JUMLAH TOTAL BELANJA</td><td class="right">0</td><td class="right">${formatRp(totalAnggaran)}</td><td class="right">0</td></tr>
        </tbody></table>
        <div style="margin-top:20px;display:table;width:100%"><div style="display:table-cell;width:50%;vertical-align:top"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:50px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right;vertical-align:top"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Kepala ${opdName}</div><div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPA RINCIAN BELANJA SKPD</div>
        <div style="text-align:center"><span class="watermark">SEBELUM PERUBAHAN</span></div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:22%;font-weight:bold">Nomor DPA</td><td>: ${noDpa}</td></tr><tr><td style="font-weight:bold">Urusan Pemerintahan</td><td>: ${dpa.kode_program || ''} URUSAN PEMERINTAHAN WAJIB</td></tr><tr><td style="font-weight:bold">Unit Organisasi</td><td>: ${opdName}</td></tr><tr><td style="font-weight:bold">Program</td><td>: ${dpa.kode_program || ''} ${dpa.program}</td></tr><tr><td style="font-weight:bold">Kegiatan</td><td>: ${dpa.kode_kegiatan || ''} ${dpa.kegiatan}</td></tr><tr><td style="font-weight:bold">Sub Kegiatan</td><td>: ${dpa.kode_sub_kegiatan || ''} ${dpa.sub_kegiatan}</td></tr><tr><td style="font-weight:bold">Sumber Pendanaan</td><td>: ${rincian[0]?.sumber_dana || 'PAD'}</td></tr><tr><td style="font-weight:bold">Alokasi ${Number(dpa.tahun) - 1}</td><td>: Rp0,00</td></tr><tr><td style="font-weight:bold">Alokasi ${dpa.tahun}</td><td>: ${formatRp(totalAnggaran)}</td></tr><tr><td style="font-weight:bold">Alokasi ${Number(dpa.tahun) + 1}</td><td>: Rp0,00</td></tr></table>
        <table><thead><tr><th style="width:13%">Kode Rekening</th><th style="width:28%">Uraian</th><th style="width:10%">Koefisien</th><th style="width:8%">Satuan</th><th style="width:10%">Harga</th><th style="width:5%">PPN</th><th style="width:8%">Sumber Dana</th><th style="width:8%">Lokasi</th><th style="width:10%">Jumlah (Rp)</th></tr></thead>
        <tbody>${rincianHtml}<tr class="bold green"><td colspan="8" class="center">JUMLAH TOTAL</td><td class="right">${formatRp(totalAnggaran)}</td></tr></tbody></table>
        <div class="bold" style="margin:8px 0 4px">Rencana Realisasi Belanja per Bulan (Rp)</div>
        <table><thead><tr>${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m) => `<th>${m}</th>`).join('')}<th>Jumlah</th></tr></thead><tbody><tr>${Array.from({ length: 12 }, (_, i) => `<td class="right">${realisasiMap[i + 1] ? formatRp(realisasiMap[i + 1]) : '-'}</td>`).join('')}<td class="right bold">${formatRp(totalAnggaran)}</td></tr></tbody></table>
        <div style="margin-top:15px;display:table;width:100%">
          <div style="display:table-cell;width:55%;vertical-align:top"><div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div><table style="page-break-inside:avoid"><thead><tr><th style="width:5%">No</th><th style="width:35%">Nama</th><th style="width:25%">NIP</th><th style="width:20%">Jabatan</th><th style="width:15%">Tanda Tangan</th></tr></thead><tbody>${tapdRows}</tbody></table></div>
          <div style="display:table-cell;width:45%;text-align:center;vertical-align:top;padding-left:10px"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Mengesahkan, PPKD</div><div style="margin-top:40px">( _______________________ )</div><div style="margin-top:15px">Kepala ${opdName}</div><div style="margin-top:40px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div></div>
        </div>
      </div>
      </body></html>`;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();
      const namaFile = `DPA_SebelumPerubahan_${(dpa.sub_kegiatan || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${dpa.tahun}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async generateFromRka(req, res) {
    try {
      const { rka_id } = req.params;
      const { Rka, RkaRincianBelanja, Dpa } = require('../models');
      const rka = await Rka.findByPk(rka_id);
      if (!rka) return res.status(404).json({ success: false, message: 'RKA tidak ditemukan' });
      const existing = await Dpa.findOne({
        where: { rka_id: Number(rka_id), is_active_version: true },
      });
      if (existing)
        return res.status(409).json({
          success: false,
          message: `DPA dari RKA #${rka_id} sudah ada (DPA #${existing.id}).`,
        });
      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: Number(rka_id) },
        order: [['urutan', 'ASC']],
      });
      const totalAnggaran = rincian.reduce((s, r) => s + Number(r.jumlah || 0), 0);
      const dpa = await Dpa.create({
        tahun: String(rka.tahun),
        periode_id: rka.periode_id,
        opd_id: rka.opd_id,
        opd_penanggung_jawab: rka.opd_penanggung_jawab,
        program: rka.program,
        kegiatan: rka.kegiatan,
        sub_kegiatan: rka.sub_kegiatan,
        kode_program: rka.kode_program,
        kode_kegiatan: rka.kode_kegiatan,
        kode_sub_kegiatan: rka.kode_sub_kegiatan,
        indikator: rka.indikator,
        target: rka.target,
        anggaran: totalAnggaran,
        jenis_dokumen: 'DPA',
        rka_id: Number(rka_id),
        rpjmd_id: rka.rpjmd_id,
        pagu_total: totalAnggaran,
        approval_status: 'DRAFT',
        is_active_version: true,
        version: 1,
        derivation_key: `rka_${rka_id}_dpa_${Date.now()}`,
      });
      res.json({
        success: true,
        message: `DPA berhasil digenerate dari RKA #${rka_id}`,
        data: {
          dpa_id: dpa.id,
          rka_id: Number(rka_id),
          program: dpa.program,
          anggaran: totalAnggaran,
          jumlah_rincian: rincian.length,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAudit(req, res) {
    try {
      const rows = await PlanningAuditEvent.findAll({
        where: { table_name: 'dpa', record_id: Number(req.params.id) },
        order: [['changed_at', 'DESC']],
        limit: 100,
      });

      res.json({ success: true, data: enrichPlanningAuditRows(rows) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Dpa.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
        order: [['tahun', 'DESC']],
      });

      res.json(data);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const data = await Dpa.findByPk(req.params.id, {
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
      });

      if (!data) {
        return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
      }

      res.json(data);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  /* =========================
     CREATE (LOCKED PIPELINE)
  ========================= */
  async create(req, res) {
    try {
      const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { error, value } = dpaCreateSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
          preview: buildSmartPreview({}, null),
        });
      }

      const chain = await resolveSmartChain(value);

      if (!chain.ok) {
        return res.status(400).json({
          success: false,
          error: chain.msg,
          preview: chain.preview,
        });
      }

      const paguChk = validateMultiYearPaguAgainstTotal(value);
      if (!paguChk.ok) {
        return res.status(400).json({
          success: false,
          error: paguChk.message,
          preview: chain.preview,
        });
      }

      const created = await Dpa.create({
        ...value,
        version: 1,
        is_active_version: true,
        rpjmd_id: chain.rpjmd_id,
        rka_id: chain.rka.rka_id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      });

      const { old_value, new_value } = auditValuesFromRows(null, created);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: created.id,
        action_type: 'CREATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before: null,
        version_after: 1,
      });

      res.status(201).json({
        success: true,
        data: created,
        preview: chain.preview,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  /* =========================
     UPDATE (LOCKED PIPELINE)
  ========================= */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { error, value } = dpaUpdateSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
          preview: buildSmartPreview({}, null),
        });
      }

      const oldRow = await Dpa.findByPk(id);
      if (!oldRow) {
        return res.status(404).json({
          success: false,
          error: 'Data tidak ditemukan',
        });
      }

      const mergedPayload = {
        tahun: value.tahun ?? oldRow.tahun,
        periode_id: value.periode_id ?? oldRow.periode_id,

        program: value.program ?? oldRow.program,
        kegiatan: value.kegiatan ?? oldRow.kegiatan,
        sub_kegiatan: value.sub_kegiatan ?? oldRow.sub_kegiatan,

        indikator: value.indikator ?? oldRow.indikator,
        target: value.target ?? oldRow.target,
        anggaran: value.anggaran ?? oldRow.anggaran,

        kode_rekening: value.kode_rekening ?? oldRow.kode_rekening,
        nama_rekening: value.nama_rekening ?? oldRow.nama_rekening,

        pagu_year_1: value.pagu_year_1 ?? oldRow.pagu_year_1,
        pagu_year_2: value.pagu_year_2 ?? oldRow.pagu_year_2,
        pagu_year_3: value.pagu_year_3 ?? oldRow.pagu_year_3,
        pagu_year_4: value.pagu_year_4 ?? oldRow.pagu_year_4,
        pagu_year_5: value.pagu_year_5 ?? oldRow.pagu_year_5,
        pagu_total: value.pagu_total ?? oldRow.pagu_total,

        jenis_dokumen: value.jenis_dokumen ?? oldRow.jenis_dokumen,
        rka_id: value.rka_id ?? oldRow.rka_id,
        rpjmd_id: value.rpjmd_id ?? oldRow.rpjmd_id,
      };

      const chain = await resolveSmartChain(mergedPayload);

      if (!chain.ok) {
        return res.status(400).json({
          success: false,
          error: chain.msg,
          preview: chain.preview,
        });
      }

      const version_before = Number(oldRow.version) || 1;
      const version_after = version_before + 1;

      const patch = {
        ...mergedPayload,
        version: version_after,
        is_active_version: true,
        rpjmd_id: chain.rpjmd_id,
        rka_id: chain.rka.rka_id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      };

      await Dpa.update(patch, { where: { id } });

      const result = await Dpa.findByPk(id);
      const { old_value, new_value } = auditValuesFromRows(oldRow, result);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: Number(id),
        action_type: 'UPDATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before,
        version_after,
      });

      res.json({
        success: true,
        data: result,
        preview: chain.preview,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async destroy(req, res) {
    try {
      const oldRow = await Dpa.findByPk(req.params.id);
      if (!oldRow) {
        return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
      }

      const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { old_value, new_value } = auditValuesFromRows(oldRow, null);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: Number(req.params.id),
        action_type: 'DELETE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before: Number(oldRow.version) || 1,
        version_after: null,
      });

      await Dpa.destroy({ where: { id: req.params.id } });

      res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
};

'use strict';

/**
 * bpsScraperService.js
 * Mengambil data statistik Maluku Utara dari WebAPI BPS resmi.
 * Domain Maluku Utara: 8200
 */

const axios = require('axios');

const BPS_API_KEY = process.env.BPS_API_KEY;
const BPS_BASE = 'https://webapi.bps.go.id/v1/api';
const DOMAIN = '8200';

// VAR_ID terverifikasi dari domain 8200
const VAR = {
  kemiskinan: 285, // Persentase Penduduk Miskin Maluku Utara
  pdrb: 270, // Laju Pertumbuhan PDRB Menurut Lapangan Usaha (Harga Konstan 2010)
  ipm: 366, // IPM Metode Baru (UHH Long Form SP2020)
  inflasi: 378, // Inflasi Provinsi Maluku Utara (2022=100)
};

// vervar Maluku Utara = 1 (dari response: { val: 1, label: "Maluku Utara" })
const VERVAR_MALUT = 1;

// ── Helper: ambil th_id terbaru untuk suatu var ──────────────────────────────
async function getLatestThId(varId) {
  const url = `${BPS_BASE}/list/model/th/lang/ind/domain/${DOMAIN}/var/${varId}/key/${BPS_API_KEY}/`;
  const res = await axios.get(url, { timeout: 10000 });
  const list = res.data?.data?.[1] ?? [];
  // list diurutkan descending (terbaru di index 0)
  return list[0] ?? null;
}

// ── Helper: fetch datacontent & ekstrak nilai Maluku Utara ───────────────────
async function fetchVarData(varId, thId, turthId = 0) {
  const url = `${BPS_BASE}/list/model/data/lang/ind/domain/${DOMAIN}/var/${varId}/th/${thId}/key/${BPS_API_KEY}/`;
  const res = await axios.get(url, { timeout: 10000 });
  const dc = res.data?.datacontent ?? {};

  // Coba beberapa kombinasi key datacontent
  // Format: {vervar}{var}{turvar}{th}{turtahun}
  const candidates = Object.entries(dc);
  if (candidates.length === 0) return null;

  // Ambil nilai pertama yang ada (biasanya hanya 1 entry untuk Maluku Utara)
  const [key, value] = candidates[0];
  return { key, value, raw: res.data };
}

// ── Helper: ambil turtahun terbaru (tahunan/semester) ───────────────────────
function pickBestTurtahun(turtahunList) {
  if (!turtahunList || turtahunList.length === 0) return 0;
  // Prioritas: Tahunan > Semester 2 > Semester 1
  const tahunan = turtahunList.find((t) => t.label?.toLowerCase().includes('tahunan'));
  if (tahunan) return tahunan.val;
  const sem2 = turtahunList.find((t) => t.label?.toLowerCase().includes('semester 2'));
  if (sem2) return sem2.val;
  return turtahunList[0].val;
}

// ────────────────────────────────────────────────────────────────────────────
// FUNGSI PUBLIK
// ────────────────────────────────────────────────────────────────────────────

async function getKemiskinan() {
  const th = await getLatestThId(VAR.kemiskinan);
  const res = await fetchVarData(VAR.kemiskinan, th.th_id);
  return {
    indikator: 'Persentase Penduduk Miskin Maluku Utara',
    tahun: th.th,
    nilai: res?.value ?? '-',
    satuan: 'persen',
    sumber: 'BPS Maluku Utara',
  };
}

async function getPdrb() {
  const th = await getLatestThId(VAR.pdrb);
  const res = await fetchVarData(VAR.pdrb, th.th_id);
  return {
    indikator: 'Laju Pertumbuhan PDRB Maluku Utara (Harga Konstan 2010)',
    tahun: th.th,
    nilai: res?.value ?? '-',
    satuan: 'persen',
    sumber: 'BPS Maluku Utara',
  };
}

async function getIpm() {
  const th = await getLatestThId(VAR.ipm);
  const res = await fetchVarData(VAR.ipm, th.th_id);
  return {
    indikator: 'Indeks Pembangunan Manusia (IPM) Maluku Utara',
    tahun: th.th,
    nilai: res?.value ?? '-',
    satuan: 'indeks',
    sumber: 'BPS Maluku Utara',
  };
}

async function getInflasi() {
  const th = await getLatestThId(VAR.inflasi);
  const res = await fetchVarData(VAR.inflasi, th.th_id);
  // Inflasi punya turtahun (bulanan) — ambil nilai dari raw
  const raw = res?.raw ?? {};
  const dc = raw.datacontent ?? {};
  // Ambil entri terakhir (bulan terbaru)
  const entries = Object.entries(dc);
  const last = entries[entries.length - 1];
  return {
    indikator: 'Inflasi Year-on-Year Maluku Utara',
    tahun: th.th,
    nilai: last?.[1] ?? res?.value ?? '-',
    satuan: 'persen',
    sumber: 'BPS Maluku Utara',
  };
}

async function getStunting() {
  // Stunting tidak ada di var list domain 8200 → ambil dari pressrelease
  const url = `${BPS_BASE}/list/model/pressrelease/lang/ind/domain/${DOMAIN}/key/${BPS_API_KEY}/`;
  const res = await axios.get(url, { timeout: 10000 });
  const list = res.data?.data?.[1] ?? [];
  const found = list.find(
    (p) => p.title?.toLowerCase().includes('stunting') || p.title?.toLowerCase().includes('gizi'),
  );
  return {
    indikator: 'Prevalensi Stunting/Gizi Maluku Utara',
    judul: found?.title ?? 'Data tidak tersedia di BPS domain 8200',
    tanggal: found?.release_date ?? '-',
    sumber: 'BPS Maluku Utara',
  };
}

// ── MAIN: ambil semua paralel, toleran gagal ─────────────────────────────────
async function getAllBpsData() {
  const [pdrb, kemiskinan, ipm, inflasi, stunting] = await Promise.allSettled([
    getPdrb(),
    getKemiskinan(),
    getIpm(),
    getInflasi(),
    getStunting(),
  ]);

  return {
    pdrb: pdrb.status === 'fulfilled' ? pdrb.value : { error: pdrb.reason?.message },
    kemiskinan:
      kemiskinan.status === 'fulfilled' ? kemiskinan.value : { error: kemiskinan.reason?.message },
    ipm: ipm.status === 'fulfilled' ? ipm.value : { error: ipm.reason?.message },
    inflasi: inflasi.status === 'fulfilled' ? inflasi.value : { error: inflasi.reason?.message },
    stunting:
      stunting.status === 'fulfilled' ? stunting.value : { error: stunting.reason?.message },
  };
}

module.exports = { getAllBpsData, getPdrb, getKemiskinan, getIpm, getInflasi, getStunting };

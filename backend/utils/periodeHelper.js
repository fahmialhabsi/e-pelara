// utils/periodeHelper.js
const { PeriodeRpjmd } = require("../models");
const { Op } = require("sequelize");

// Cache settings
const CACHE_TTL = 60 * 1000; // 60 detik
const periodeByTahunCache = new Map();
let aktifPeriodeCache = null;
let lastAktifCacheTime = 0;

// Internal DB fetch (non-cache)
async function fetchPeriodeFromTahun(tahun) {
  const tahunNum = parseInt(tahun, 10); // Pastikan angka
  return await PeriodeRpjmd.findOne({
    where: {
      tahun_awal: { [Op.lte]: tahunNum },
      tahun_akhir: { [Op.gte]: tahunNum },
    },
  });
}

// Public functions with caching
async function getPeriodeFromTahun(tahun) {
  const cached = periodeByTahunCache.get(tahun);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchPeriodeFromTahun(tahun);
  if (data) {
    periodeByTahunCache.set(tahun, { data, timestamp: Date.now() });
  }
  return data;
}

async function getPeriodeAktif() {
  if (aktifPeriodeCache && Date.now() - lastAktifCacheTime < CACHE_TTL) {
    return aktifPeriodeCache;
  }

  const tahun = new Date().getFullYear();
  aktifPeriodeCache = await getPeriodeFromTahun(tahun);
  lastAktifCacheTime = Date.now();
  return aktifPeriodeCache;
}

function clearPeriodeCache(tahun = null) {
  if (tahun) periodeByTahunCache.delete(tahun);
  else periodeByTahunCache.clear();

  aktifPeriodeCache = null;
  lastAktifCacheTime = 0;
}

module.exports = {
  getPeriodeFromTahun,
  getPeriodeAktif,
  clearPeriodeCache,
};

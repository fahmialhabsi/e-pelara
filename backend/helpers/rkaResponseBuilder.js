'use strict';
const { buildHierarchy, buildTree } = require('./rkaHierarchyBuilder');

/**
 * Mengubah data RKA beserta rincian belanja menjadi response standar
 * yang digunakan seluruh endpoint (GET, POST, PUT, Restore, dsb).
 *
 * Seluruh parsing JSON dilakukan di sini sehingga controller tetap bersih.
 */

function parseKoefisien(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function buildRincian(item) {
  const data = item.dataValues || item;

  return {
    ...data,

    harga_satuan: Number(data.harga_satuan || 0),

    volume: Number(data.volume || 0),

    volume_hasil: Number(data.volume_hasil || 0),

    jumlah: Number(data.jumlah || 0),

    ppn: Number(data.ppn || 0),

    nilai_ppn: Number(data.nilai_ppn || 0),

    total_setelah_ppn: Number(data.total_setelah_ppn || 0),

    koefisien_array: parseKoefisien(data.koefisien_array),
  };
}

function buildRkaResponse(rka) {
  if (!rka) return null;

  const data = rka.toJSON ? rka.toJSON() : rka;

  const rincian = data.rincianBelanja || data.rincian_belanja || [];

  const hierarchy = buildHierarchy(rincian.map(buildRincian));

  const tree = buildTree(hierarchy);

  return {
    ...data,

    // Frontend Sprint 10+ membangun hierarchy sendiri
    rincian_belanja: rincian.map(buildRincian),

    // Tree tetap disediakan bila endpoint lain membutuhkannya
    rincian_tree: tree,
  };
}

module.exports = {
  buildRkaResponse,
};

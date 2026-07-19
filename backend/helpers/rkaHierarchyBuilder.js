'use strict';

/**
 * Helper hierarchy backend RKA.
 *
 * Tujuan:
 * - Menyamakan struktur data backend dengan frontend.
 * - Menyiapkan pondasi untuk tree SIPD.
 * - Tidak menghitung total ataupun grouping (itu PATCH berikutnya).
 */

function getParentKode(kode = '') {
  const parts = String(kode).trim().split('.').filter(Boolean);

  if (parts.length <= 1) {
    return null;
  }

  parts.pop();

  return parts.join('.');
}

function getLevel(kode = '') {
  return String(kode).trim().split('.').filter(Boolean).length;
}

function isItemRekening(kode = '') {
  const level = getLevel(kode);

  // Struktur SIPD:
  // Level 1  : AKUN
  // Level 2  : KELOMPOK
  // Level 3  : JENIS
  // Level 4  : OBJEK
  // Level 5  : RINCIAN
  // Level 6  : ITEM

  return level >= 6;
}

function getNodeAmount(item = {}) {
  const totalPpn = Number(item.total_setelah_ppn || 0);

  if (totalPpn > 0) {
    return totalPpn;
  }

  return Number(item.jumlah || 0);
}

function ensureKoefisienArray(item = {}) {
  if (Array.isArray(item.koefisien_array)) {
    return item.koefisien_array;
  }

  try {
    const parsed = JSON.parse(item.koefisien_array || '[]');

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildHierarchy(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const hierarchyMap = new Map();

  // Simpan node existing
  rows.forEach((rawItem) => {
    const item = normalizeHierarchyItem(rawItem);

    const kode = String(item.kode_rekening || '').trim();

    const parentKode = item.parent_kode ?? getParentKode(kode);

    const level = item.level_rekening ?? getLevel(kode);

    hierarchyMap.set(kode, {
      ...item,

      parent_kode: parentKode,

      level_rekening: level,

      // PATCH 13E-3B-01
      // status group ditentukan ulang setelah hierarchy terbentuk
      is_group: !isItemRekening(kode),

      expanded: item.expanded !== undefined ? Boolean(item.expanded) : true,

      has_children: false,

      children_count: 0,
    });
  });

  // Generate parent node otomatis
  [...hierarchyMap.values()].forEach((item) => {
    let parentKode = item.parent_kode;

    while (parentKode) {
      if (!hierarchyMap.has(parentKode)) {
        hierarchyMap.set(parentKode, {
          id: null,

          kode_rekening: parentKode,

          nama_rekening: '',

          uraian: '',

          spesifikasi: '',

          koefisien_array: [],

          volume: 0,

          volume_hasil: 0,

          satuan: '',

          harga_satuan: 0,

          jumlah: 0,

          ppn: 0,

          nilai_ppn: 0,

          total_setelah_ppn: 0,

          sumber_dana: null,

          lokasi: null,

          keterangan: null,

          parent_kode: getParentKode(parentKode),

          level_rekening: getLevel(parentKode),

          is_group: true,

          expanded: true,

          has_children: false,

          children_count: 0,
        });
      }

      parentKode = getParentKode(parentKode);
    }
  });

  // Update metadata child
  [...hierarchyMap.values()].forEach((item) => {
    if (!item.parent_kode) {
      return;
    }

    const parent = hierarchyMap.get(item.parent_kode);

    if (!parent) {
      return;
    }

    parent.is_group = true;

    parent.has_children = true;

    parent.children_count += 1;
  });

  // Calculate parent subtotal
  const nodes = [...hierarchyMap.values()];

  nodes
    .sort((a, b) => {
      return getLevel(b.kode_rekening) - getLevel(a.kode_rekening);
    })
    .forEach((item) => {
      if (!item.parent_kode) {
        return;
      }

      const parent = hierarchyMap.get(item.parent_kode);

      if (!parent) {
        return;
      }

      const amount = Number(item.subtotal || getNodeAmount(item));

      parent.subtotal = Number(parent.subtotal || 0) + amount;

      parent.jumlah = parent.subtotal;

      parent.total_setelah_ppn = parent.subtotal;
    });

  return [...hierarchyMap.values()];
}

function buildTree(nodes = []) {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const map = new Map();

  nodes.forEach((node) => {
    map.set(node.kode_rekening, {
      ...node,

      children: [],
    });
  });

  const roots = [];

  map.forEach((node) => {
    if (!node.parent_kode) {
      roots.push(node);

      return;
    }

    const parent = map.get(node.parent_kode);

    if (!parent) {
      roots.push(node);

      return;
    }

    parent.children.push(node);
  });

  return roots;
}

function normalizeHierarchyItem(item = {}) {
  return {
    ...item,

    koefisien_array: ensureKoefisienArray(item),

    volume: Number(item.volume || 0),

    volume_hasil: Number(item.volume_hasil || 0),

    harga_satuan: Number(item.harga_satuan || 0),

    jumlah: Number(item.jumlah || 0),

    ppn: Number(item.ppn || 0),

    nilai_ppn: Number(item.nilai_ppn || 0),

    total_setelah_ppn: Number(item.total_setelah_ppn || 0),
  };
}

module.exports = {
  buildHierarchy,
  buildTree,
  getParentKode,
  getLevel,
  getNodeAmount,
  isItemRekening,
};

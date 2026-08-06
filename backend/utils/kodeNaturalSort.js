'use strict';

/**
 * Urutkan baris berkode nomenklatur ("2.09.04.1.02.0006") secara numerik per
 * segmen, bukan string murni — perlu karena kode di beberapa tabel transaksi
 * bercampur format leading-zero (mis. "02.09.01.1.01" vs "2.09.01.1.01", lihat
 * variantsKodeKegiatan di renstra_subkegiatanController.js), sehingga ORDER BY
 * SQL biasa atau order by id insert bisa menghasilkan urutan yang salah.
 */

function splitKodeSegments(kode) {
  return String(kode ?? '')
    .trim()
    .split('.')
    .filter((s) => s !== '');
}

function compareKodeNatural(a, b) {
  const segA = splitKodeSegments(a);
  const segB = splitKodeSegments(b);
  const len = Math.max(segA.length, segB.length);
  for (let i = 0; i < len; i++) {
    const sa = segA[i];
    const sb = segB[i];
    if (sa === undefined) return -1;
    if (sb === undefined) return 1;
    const bothNumeric = /^\d+$/.test(sa) && /^\d+$/.test(sb);
    if (bothNumeric) {
      const na = Number(sa);
      const nb = Number(sb);
      if (na !== nb) return na - nb;
    } else {
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * @param {any[]} rows
 * @param {string|((row: any) => string)} kodeAccessor - nama kolom kode, atau fungsi ekstraksi
 */
function sortByKodeNatural(rows, kodeAccessor) {
  const getKode =
    typeof kodeAccessor === 'function' ? kodeAccessor : (row) => row?.[kodeAccessor];
  return [...rows].sort((a, b) => compareKodeNatural(getKode(a), getKode(b)));
}

module.exports = { compareKodeNatural, sortByKodeNatural };

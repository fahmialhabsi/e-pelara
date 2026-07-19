'use strict';

/**
 * ==========================================================
 * RenjaPdfDataHelper
 * ----------------------------------------------------------
 * Helper transformasi data sebelum dirender ke PDF.
 * Tidak melakukan rendering PDF.
 * ==========================================================
 */

function numId(v) {
  return Number(v || 0).toLocaleString('id-ID');
}

function plain(s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim();
}

function renjaTableData(items) {
  return items.map((it, i) => ({
    no: String(i + 1),
    program: plain(it.program),
    kegiatan: plain(it.kegiatan),
    subKegiatan: plain(it.sub_kegiatan),
    indikator: plain(it.indikator),
    target: numId(it.target),
    satuan: plain(it.satuan || ''),
    pagu: numId(it.pagu),
  }));
}

function itemRowsForPdf(items) {
  const rows = [];
  const split = (s) => {
    const p = plain(s).split(' - ');
    return { kode: p[0] || '', nama: p.slice(1).join(' - ') || plain(s) };
  };
  items.forEach((it, i) => {
    const prog = split(it.program);
    const keg = split(it.kegiatan);
    const sub = split(it.sub_kegiatan);
    // Baris Program
    rows.push([
      String(i + 1),
      prog.kode,
      prog.nama.slice(0, 120),
      '',
      '',
      '',
      '',
      '',
      'Dinas Pangan',
    ]);
    // Baris Kegiatan
    rows.push(['', keg.kode, `  ${keg.nama.slice(0, 120)}`, '', '', '', '', '', '']);
    // Baris Sub Kegiatan
    rows.push(['', sub.kode, `    ${sub.nama.slice(0, 100)}`, '', '', '', '', '', '']);
    // Baris Indikator + Target + Pagu
    rows.push([
      '',
      '',
      `      ${plain(it.indikator).slice(0, 100)}`,
      numId(it.target),
      plain(it.satuan || '').slice(0, 20),
      numId(it.pagu),
      plain(it.lokasi || 'Maluku Utara').slice(0, 30),
      'APBD',
      '',
    ]);
  });
  return rows;
}

function renjaTableData(items) {
  return items.map((it, i) => ({
    no: String(i + 1),
    program: plain(it.program),
    kegiatan: plain(it.kegiatan),
    subKegiatan: plain(it.sub_kegiatan),
    indikator: plain(it.indikator),
    target: numId(it.target),
    satuan: plain(it.satuan || ''),
    pagu: numId(it.pagu),
  }));
}

function itemRowsForRenjaPdf(items) {
  return renjaTableData(items).map((r) => [
    r.no,
    r.program,
    r.kegiatan,
    r.subKegiatan,
    r.indikator,
    r.target,
    r.satuan,
    r.pagu,
  ]);
}

module.exports = {
  itemRowsForPdf,
  renjaTableData,
  itemRowsForRenjaPdf,
};

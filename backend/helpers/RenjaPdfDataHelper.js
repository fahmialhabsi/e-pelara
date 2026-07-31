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

function splitKodeNamaLocal(text) {
  const s = plain(text);
  const p = s.split(' - ');
  return { kode: p[0] || '', nama: p.length > 1 ? p.slice(1).join(' - ') : s };
}

function pilihNilaiTahun(row, field, tahunTarget, tahunAwalRenstra) {
  const offset = Number(tahunTarget) - Number(tahunAwalRenstra) + 1;
  const kolom = Math.min(Math.max(offset, 1), 6);
  const v = row[`${field}_tahun_${kolom}`];
  return v === null || v === undefined ? null : v;
}

async function renjaTableData(items, opts = {}) {
  const { db, renstraOpdId, tahunAwalRenstra, tahunMaju } = opts;
  const kosong = '......';

  // Kelompokkan item per Program, urutan sesuai kemunculan pertama
  const programMap = new Map();
  for (const it of items) {
    const progSplit = splitKodeNamaLocal(it.program);
    const progKode = progSplit.kode || plain(it.program);
    if (!programMap.has(progKode)) {
      programMap.set(progKode, { nama: progSplit.nama || plain(it.program) || kosong, items: [] });
    }
    programMap.get(progKode).items.push(it);
  }

  const rows = [];
  let no = 1;

  for (const [progKode, prog] of programMap.entries()) {
    // Baris header Program — sel lain kosong, hanya kode+nama program terisi
    rows.push({
      no: '',
      kode: progKode,
      urusanProgram: prog.nama,
      program: prog.nama,
      kegiatan: '',
      subKegiatan: '',
      indikator: '',
      target: '',
      satuan: '',
      pagu: '',
      lokasi: '',
      sumberDana: '',
      catatan: '',
      targetMaju: '',
      paguMaju: '',
      isProgramRow: true,
    });

    for (const it of prog.items) {
      const sub = splitKodeNamaLocal(it.sub_kegiatan);
      const keg = splitKodeNamaLocal(it.kegiatan);
      const kode = sub.kode || keg.kode || '';
      const urusanProgram = sub.nama || keg.nama || kosong;

      let targetMaju = kosong;
      let paguMaju = kosong;

      if (
        db?.RenstraKegiatan &&
        db?.IndikatorRenstra &&
        renstraOpdId &&
        keg.kode &&
        tahunAwalRenstra &&
        tahunMaju
      ) {
        try {
          const rk = await db.RenstraKegiatan.findOne({
            where: { renstra_id: renstraOpdId, kode_kegiatan: keg.kode },
          });
          if (rk) {
            const ir = await db.IndikatorRenstra.findOne({
              where: { renstra_id: renstraOpdId, stage: 'kegiatan', ref_id: rk.id },
            });
            if (ir) {
              const t = pilihNilaiTahun(ir, 'target', tahunMaju, tahunAwalRenstra);
              const p = pilihNilaiTahun(ir, 'pagu', tahunMaju, tahunAwalRenstra);
              if (t !== null) targetMaju = numId(t);
              if (p !== null) paguMaju = numId(p);
            }
          }
        } catch {
          // biarkan kosong ('......') kalau query gagal
        }
      }

      rows.push({
        no: String(no++),
        kode,
        urusanProgram,
        program: plain(it.program),
        kegiatan: plain(it.kegiatan),
        subKegiatan: plain(it.sub_kegiatan),
        indikator: plain(it.indikator),
        target: numId(it.target),
        satuan: plain(it.satuan || ''),
        pagu: numId(it.pagu),
        lokasi: plain(it.lokasi || 'Provinsi Maluku Utara'),
        sumberDana: plain(it.sumber_dana || 'APBD'),
        catatan: '......',
        targetMaju,
        paguMaju,
        isProgramRow: false,
      });
    }
  }

  return rows;
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

async function itemRowsForRenjaPdf(items, opts) {
  const data = await renjaTableData(items, opts);
  return data.map((r) => [
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

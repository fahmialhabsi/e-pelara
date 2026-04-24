"use strict";

const { Op, QueryTypes } = require("sequelize");

function num(v) {
  return Number(v) || 0;
}

async function loadDpaAgg(sequelize, tahunAnggaran) {
  const tstr = String(tahunAnggaran);
  const rows = await sequelize.query(
    `SELECT kode_rekening AS kr,
            COALESCE(SUM(anggaran), 0) AS anggaran,
            COALESCE(SUM(realisasi), 0) AS realisasi_dpa
     FROM dpa
     WHERE tahun = :tstr AND kode_rekening IS NOT NULL AND kode_rekening != ''
     GROUP BY kode_rekening`,
    { replacements: { tstr }, type: QueryTypes.SELECT },
  );
  const map = {};
  for (const r of rows) {
    map[r.kr] = { anggaran: num(r.anggaran), realisasi_dpa: num(r.realisasi_dpa) };
  }
  return map;
}

async function loadBkuAgg(sequelize, tahunAnggaran) {
  const baseWhere = `tahun_anggaran = :th AND status_validasi IN ('VALID','BELUM')`;
  const pengeluar = await sequelize.query(
    `SELECT kode_akun AS kode, COALESCE(SUM(pengeluaran), 0) AS r
     FROM bku WHERE ${baseWhere} AND kode_akun IS NOT NULL AND kode_akun != ''
     GROUP BY kode_akun`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const penerima = await sequelize.query(
    `SELECT kode_akun AS kode, COALESCE(SUM(penerimaan), 0) AS r
     FROM bku WHERE ${baseWhere} AND kode_akun IS NOT NULL AND kode_akun != ''
     GROUP BY kode_akun`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const out = { pengeluar: {}, penerima: {} };
  for (const r of pengeluar) out.pengeluar[r.kode] = num(r.r);
  for (const r of penerima) out.penerima[r.kode] = num(r.r);
  return out;
}

function realisasiUntukAkun(kab, bkuAgg) {
  if (kab.jenis === "BELANJA") return bkuAgg.pengeluar[kab.kode] || 0;
  if (kab.jenis === "PENDAPATAN") return bkuAgg.penerima[kab.kode] || 0;
  if (kab.jenis === "PEMBIAYAAN") {
    const pi = bkuAgg.penerima[kab.kode] || 0;
    const pg = bkuAgg.pengeluar[kab.kode] || 0;
    return pi - pg;
  }
  return 0;
}

/**
 * Generate / refresh lra_snapshot.
 */
async function generateLra(sequelize, models, tahunAnggaran) {
  const { LraSnapshot, KodeAkunBas } = models;

  const locked = await LraSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, dikunci: true },
  });
  if (locked) {
    const err = new Error("LRA tahun ini terkunci — generate ditolak");
    err.statusCode = 403;
    throw err;
  }

  const dpaMap = await loadDpaAgg(sequelize, tahunAnggaran);
  const bkuAgg = await loadBkuAgg(sequelize, tahunAnggaran);
  const kabRows = await KodeAkunBas.findAll({
    where: {
      jenis: { [Op.in]: ["BELANJA", "PENDAPATAN", "PEMBIAYAAN"] },
      aktif: true,
    },
    order: [
      ["jenis", "ASC"],
      ["kode", "ASC"],
    ],
  });

  const cross_check_warnings = [];
  const tahunLalu = tahunAnggaran - 1;

  let urutan = 0;
  for (const kab of kabRows) {
    const ref = kab.kode_rekening_ref;
    let anggaranMurni = 0;
    let anggaranPerubahan = 0;
    let realisasiDpa = 0;
    if (ref && dpaMap[ref]) {
      anggaranMurni = dpaMap[ref].anggaran;
      anggaranPerubahan = 0;
      realisasiDpa = dpaMap[ref].realisasi_dpa;
    }

    const anggaranFinal = anggaranPerubahan > 0 ? anggaranPerubahan : anggaranMurni;
    const realisasi = realisasiUntukAkun(kab, bkuAgg);
    const sisa = anggaranFinal - realisasi;
    const persen =
      anggaranFinal > 0 ? Number(((realisasi / anggaranFinal) * 100).toFixed(4)) : 0;

    if (ref && dpaMap[ref]) {
      const selisih = Math.abs(realisasi - realisasiDpa);
      if (selisih > 0.01) {
        cross_check_warnings.push({
          kode_akun: kab.kode,
          kode_rekening: ref,
          realisasi_bku: realisasi,
          realisasi_dpa: realisasiDpa,
          selisih,
        });
        console.warn(
          `[LRA CROSSCHECK] ${kab.kode}: BKU=${realisasi}, DPA=${realisasiDpa}, selisih=${selisih}`,
        );
      }
    }

    const prev = await LraSnapshot.findOne({
      where: { tahun_anggaran: tahunLalu, kode_akun: kab.kode },
    });

    const payload = {
      tahun_anggaran: tahunAnggaran,
      kode_akun: kab.kode,
      nama_akun: kab.nama,
      urutan: urutan++,
      anggaran_murni: anggaranMurni,
      anggaran_perubahan: anggaranPerubahan,
      realisasi,
      sisa,
      persen,
      realisasi_tahun_lalu: prev ? num(prev.realisasi) : 0,
      dikunci: false,
    };

    const [snap, created] = await LraSnapshot.findOrCreate({
      where: { tahun_anggaran: tahunAnggaran, kode_akun: kab.kode },
      defaults: payload,
    });
    if (!created) {
      await snap.update({ ...payload, dikunci: snap.dikunci });
    }
  }

  const [totBkuRow] = await sequelize.query(
    `SELECT COALESCE(SUM(pengeluaran),0) AS t FROM bku
     WHERE tahun_anggaran = :th AND status_validasi IN ('VALID','BELUM')`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBkuPengeluaran = num(totBkuRow?.t);

  const belanjaSnap = await sequelize.query(
    `SELECT COALESCE(SUM(ls.realisasi),0) AS s
     FROM lra_snapshot ls
     INNER JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun
     WHERE ls.tahun_anggaran = :th AND kab.jenis = 'BELANJA'`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBelanja = num(belanjaSnap[0]?.s);

  const [totBkuBelanjaRow] = await sequelize.query(
    `SELECT COALESCE(SUM(b.pengeluaran),0) AS t
     FROM bku b
     INNER JOIN kode_akun_bas kab ON kab.kode = b.kode_akun AND kab.jenis = 'BELANJA'
     WHERE b.tahun_anggaran = :th AND b.status_validasi IN ('VALID','BELUM')`,
    { replacements: { th: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  const totalBkuPengeluaranBelanja = num(totBkuBelanjaRow?.t);

  const selisihTotalBelanjaBku = Math.abs(totalBelanja - totalBkuPengeluaranBelanja);

  return {
    total_akun: kabRows.length,
    cross_check_warnings,
    total_belanja_lra: totalBelanja,
    total_bku_pengeluaran: totalBkuPengeluaran,
    total_bku_pengeluaran_belanja: totalBkuPengeluaranBelanja,
    selisih_total_belanja_vs_bku: selisihTotalBelanjaBku,
  };
}

async function kunciLra(models, tahunAnggaran) {
  const { LraSnapshot } = models;
  const [n] = await LraSnapshot.update(
    { dikunci: true },
    { where: { tahun_anggaran: tahunAnggaran, dikunci: false } },
  );
  return { updated: n };
}

async function crosscheckReport(sequelize, models, tahunAnggaran) {
  const warnings = [];
  const dpaMap = await loadDpaAgg(sequelize, tahunAnggaran);
  const bkuAgg = await loadBkuAgg(sequelize, tahunAnggaran);
  const { KodeAkunBas } = models;
  const kabs = await KodeAkunBas.findAll({
    where: { kode_rekening_ref: { [Op.ne]: null } },
  });
  for (const kab of kabs) {
    const ref = kab.kode_rekening_ref;
    if (!ref || !dpaMap[ref]) continue;
    const rBku = realisasiUntukAkun(kab, bkuAgg);
    const rDpa = dpaMap[ref].realisasi_dpa;
    const selisih = Math.abs(rBku - rDpa);
    if (selisih > 0.01) {
      warnings.push({
        kode_akun: kab.kode,
        kode_rekening: ref,
        realisasi_bku: rBku,
        realisasi_dpa: rDpa,
        selisih,
      });
    }
  }
  return { tahun_anggaran: tahunAnggaran, warnings, jumlah_selisih: warnings.length };
}

module.exports = {
  generateLra,
  kunciLra,
  crosscheckReport,
  loadDpaAgg,
  loadBkuAgg,
};

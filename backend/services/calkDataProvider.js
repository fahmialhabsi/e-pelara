"use strict";

const { QueryTypes } = require("sequelize");

async function getLraRingkasan(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT kab.jenis,
            COALESCE(SUM(ls.anggaran_murni),0) AS anggaran_murni,
            COALESCE(SUM(ls.anggaran_perubahan),0) AS anggaran_perubahan,
            COALESCE(SUM(ls.realisasi),0) AS realisasi,
            COALESCE(SUM(ls.sisa),0) AS sisa
     FROM lra_snapshot ls
     INNER JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun
     WHERE ls.tahun_anggaran = :t
     GROUP BY kab.jenis`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { ringkasan_per_jenis: rows };
}

async function getLraPendapatan(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT ls.kode_akun, ls.nama_akun, ls.anggaran_murni, ls.anggaran_perubahan,
            ls.realisasi, ls.sisa, ls.persen
     FROM lra_snapshot ls
     INNER JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun AND kab.jenis = 'PENDAPATAN'
     WHERE ls.tahun_anggaran = :t
     ORDER BY ls.kode_akun`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function getLraBelanja(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT ls.kode_akun, ls.nama_akun, ls.anggaran_murni, ls.anggaran_perubahan,
            ls.realisasi, ls.sisa, ls.persen
     FROM lra_snapshot ls
     INNER JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun AND kab.jenis = 'BELANJA'
     WHERE ls.tahun_anggaran = :t
     ORDER BY ls.kode_akun`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function getNeracaAset(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT kode_akun, nama_akun, nilai_tahun_ini, nilai_tahun_lalu
     FROM neraca_snapshot
     WHERE tahun_anggaran = :t AND kelompok = 'ASET'
     ORDER BY urutan, kode_akun`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function getNeracaKewajiban(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT kode_akun, nama_akun, nilai_tahun_ini, nilai_tahun_lalu
     FROM neraca_snapshot
     WHERE tahun_anggaran = :t AND kelompok = 'KEWAJIBAN'
     ORDER BY urutan, kode_akun`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function getLpeEkuitas(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT komponen, nilai_tahun_ini, nilai_tahun_lalu, urutan
     FROM lpe_snapshot
     WHERE tahun_anggaran = :t
     ORDER BY urutan`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function getLoRingkasan(sequelize, tahunAnggaran) {
  const rows = await sequelize.query(
    `SELECT kode_akun, nama_akun, kelompok, nilai_tahun_ini
     FROM lo_snapshot
     WHERE tahun_anggaran = :t
     ORDER BY kelompok, urutan`,
    { replacements: { t: tahunAnggaran }, type: QueryTypes.SELECT },
  );
  return { baris: rows };
}

async function populateDataOtomatis(sequelize, models, sumberData, tahunAnggaran) {
  if (!sumberData) return null;
  switch (sumberData) {
    case "lraService.getLraRingkasan":
      return getLraRingkasan(sequelize, tahunAnggaran);
    case "lraService.getPendapatan":
      return getLraPendapatan(sequelize, tahunAnggaran);
    case "lraService.getBelanja":
      return getLraBelanja(sequelize, tahunAnggaran);
    case "neracaService.getAset":
      return getNeracaAset(sequelize, tahunAnggaran);
    case "neracaService.getKewajiban":
      return getNeracaKewajiban(sequelize, tahunAnggaran);
    case "lpeService.getEkuitas":
      return getLpeEkuitas(sequelize, tahunAnggaran);
    case "loService.getLo":
      return getLoRingkasan(sequelize, tahunAnggaran);
    case "lpeService.getLpe":
      return getLpeEkuitas(sequelize, tahunAnggaran);
    default:
      return { peringatan: `Sumber tidak dikenal: ${sumberData}` };
  }
}

module.exports = {
  populateDataOtomatis,
  getLraRingkasan,
  getLraPendapatan,
  getLraBelanja,
};

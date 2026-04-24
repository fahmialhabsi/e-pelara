"use strict";

const { QueryTypes } = require("sequelize");

function num(v) {
  return Number(v) || 0;
}

const KODE_AKUN_KATEGORI = {
  TANAH: "1.3.01",
  PERALATAN_MESIN: "1.3.02",
  GEDUNG_BANGUNAN: "1.3.03",
  JALAN_IRIGASI_INSTALASI: "1.3.04",
  ASET_TETAP_LAINNYA: "1.3.05",
  KDP: "1.3.06",
};

const NAMA_KATEGORI = {
  TANAH: "Tanah",
  PERALATAN_MESIN: "Peralatan dan Mesin",
  GEDUNG_BANGUNAN: "Gedung dan Bangunan",
  JALAN_IRIGASI_INSTALASI: "Jalan, Irigasi dan Instalasi",
  ASET_TETAP_LAINNYA: "Aset Tetap Lainnya",
  KDP: "Konstruksi Dalam Pengerjaan",
};

async function nilaiTahunLalu(NeracaSnapshot, tahunAnggaran, kodeAkun) {
  const prev = await NeracaSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran - 1, kode_akun: kodeAkun },
  });
  return prev ? num(prev.nilai_tahun_ini) : 0;
}

/**
 * Generate / refresh neraca_snapshot.
 */
async function generateNeraca(sequelize, models, tahunAnggaran) {
  const {
    NeracaSnapshot,
    SaldoAkun,
    Piutang,
    Persediaan,
    KewajibanJangkaPendek,
  } = models;

  const locked = await NeracaSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, dikunci: true },
  });
  if (locked) {
    const err = new Error("Neraca tahun ini terkunci — generate ditolak");
    err.statusCode = 403;
    throw err;
  }

  const rows = [];

  const kas = await SaldoAkun.findOne({
    where: {
      kode_akun: "1.1.01.02",
      tahun_anggaran: tahunAnggaran,
      bulan: 12,
    },
  });
  rows.push({
    kode_akun: "1.1.01.02",
    nama_akun: "Kas di Bendahara Pengeluaran",
    kelompok: "ASET",
    nilai_tahun_ini: num(kas?.saldo_akhir),
    urutan: 10,
  });

  const sumPiutang = await Piutang.sum("nilai", {
    where: { tahun_anggaran: tahunAnggaran, status: "BELUM_LUNAS" },
  });
  rows.push({
    kode_akun: "1.1.06",
    nama_akun: "Piutang",
    kelompok: "ASET",
    nilai_tahun_ini: num(sumPiutang),
    urutan: 20,
  });

  const sumPersediaan = await Persediaan.sum("nilai", {
    where: { tahun_anggaran: tahunAnggaran },
  });
  rows.push({
    kode_akun: "1.1.09",
    nama_akun: "Persediaan",
    kelompok: "ASET",
    nilai_tahun_ini: num(sumPersediaan),
    urutan: 30,
  });

  const asetGroups = await sequelize.query(
    `SELECT kategori,
            COALESCE(SUM(harga_perolehan),0) AS total_perolehan,
            COALESCE(SUM(akumulasi_penyusutan),0) AS total_penyusutan
     FROM aset_tetap WHERE status = 'AKTIF' GROUP BY kategori`,
    { type: QueryTypes.SELECT },
  );

  let urutanAset = 100;
  for (const g of asetGroups) {
    const kat = g.kategori;
    const bruto = num(g.total_perolehan);
    const susut = num(g.total_penyusutan);
    const net = bruto - susut;
    const kode = KODE_AKUN_KATEGORI[kat] || "1.3.05";
    rows.push({
      kode_akun: kode,
      nama_akun: NAMA_KATEGORI[kat] || String(kat).replace(/_/g, " "),
      kelompok: "ASET",
      nilai_tahun_ini: net,
      urutan: urutanAset++,
    });
  }

  const totalKewajiban = await KewajibanJangkaPendek.sum("nilai", {
    where: { tahun_anggaran: tahunAnggaran, status: "OUTSTANDING" },
  });
  rows.push({
    kode_akun: "2.1",
    nama_akun: "Kewajiban Jangka Pendek",
    kelompok: "KEWAJIBAN",
    nilai_tahun_ini: num(totalKewajiban),
    urutan: 200,
  });

  const totalAset = rows
    .filter((r) => r.kelompok === "ASET")
    .reduce((s, r) => s + r.nilai_tahun_ini, 0);
  const totalKwj = rows
    .filter((r) => r.kelompok === "KEWAJIBAN")
    .reduce((s, r) => s + r.nilai_tahun_ini, 0);
  const ekuitas = totalAset - totalKwj;

  rows.push({
    kode_akun: "3.1",
    nama_akun: "Ekuitas",
    kelompok: "EKUITAS",
    nilai_tahun_ini: ekuitas,
    urutan: 300,
  });

  const rhs = totalKwj + ekuitas;
  const balance = Math.abs(totalAset - rhs) < 0.01;

  for (const row of rows) {
    const nilaiLalu = await nilaiTahunLalu(NeracaSnapshot, tahunAnggaran, row.kode_akun);
    const payload = {
      tahun_anggaran: tahunAnggaran,
      kode_akun: row.kode_akun,
      nama_akun: row.nama_akun,
      kelompok: row.kelompok,
      nilai_tahun_ini: row.nilai_tahun_ini,
      nilai_tahun_lalu: nilaiLalu,
      urutan: row.urutan,
      dikunci: false,
    };
    const [snap, created] = await NeracaSnapshot.findOrCreate({
      where: { tahun_anggaran: tahunAnggaran, kode_akun: row.kode_akun },
      defaults: payload,
    });
    if (!created) {
      await snap.update({ ...payload, dikunci: snap.dikunci });
    }
  }

  return {
    total_aset: totalAset,
    total_kewajiban: totalKwj,
    ekuitas,
    balance,
    selisih_neraca: Math.abs(totalAset - rhs),
  };
}

async function kunciNeraca(models, tahunAnggaran) {
  const { NeracaSnapshot } = models;
  const [n] = await NeracaSnapshot.update(
    { dikunci: true },
    { where: { tahun_anggaran: tahunAnggaran, dikunci: false } },
  );
  return { updated: n };
}

module.exports = {
  generateNeraca,
  kunciNeraca,
  KODE_AKUN_KATEGORI,
};

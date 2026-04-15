"use strict";

const { Op } = require("sequelize");

function num(v) {
  return Number(v) || 0;
}

const BKU_OK = { [Op.in]: ["VALID", "BELUM"] };

async function sumBku(Bku, where) {
  const v = await Bku.sum("penerimaan", {
    where: { ...where, status_validasi: BKU_OK },
  });
  return num(v);
}

async function sumBkuKeluar(Bku, where) {
  const v = await Bku.sum("pengeluaran", {
    where: { ...where, status_validasi: BKU_OK },
  });
  return num(v);
}

async function nilaiLalu(LakSnapshot, tahun, kelompok, komponen) {
  const prev = await LakSnapshot.findOne({
    where: {
      tahun_anggaran: tahun - 1,
      kelompok,
      komponen,
    },
  });
  return prev ? num(prev.nilai_tahun_ini) : 0;
}

async function saldoKasAwalDariNeraca(NeracaSnapshot, tahun) {
  const prev = await NeracaSnapshot.findOne({
    where: { tahun_anggaran: tahun - 1, kode_akun: "1.1.01.02" },
  });
  return prev ? num(prev.nilai_tahun_ini) : 0;
}

/**
 * Generate LAK dari BKU + saldo kas awal dari neraca tahun lalu (1.1.01.02).
 */
async function generateLak(sequelize, models, tahunAnggaran) {
  const { LakSnapshot, Bku, NeracaSnapshot } = models;

  const locked = await LakSnapshot.findOne({
    where: { tahun_anggaran: tahunAnggaran, dikunci: true },
  });
  if (locked) {
    const err = new Error("LAK tahun ini terkunci — generate ditolak");
    err.statusCode = 403;
    throw err;
  }

  const base = { tahun_anggaran: tahunAnggaran };

  const penerimaanOperasi = await sumBku(Bku, {
    ...base,
    jenis_transaksi: "PENERIMAAN_LAIN",
  });

  const pengeluaranGaji = await sumBkuKeluar(Bku, {
    ...base,
    jenis_transaksi: "LS_GAJI",
  });

  const pengeluaranBarang = await sumBkuKeluar(Bku, {
    ...base,
    jenis_transaksi: { [Op.in]: ["LS_BARANG", "PENGELUARAN_LAIN"] },
    kode_akun: { [Op.like]: "5.2%" },
  });

  const pengeluaranModal = await sumBkuKeluar(Bku, {
    ...base,
    kode_akun: { [Op.like]: "5.3%" },
  });

  const penerimaanUp = await sumBku(Bku, {
    ...base,
    jenis_transaksi: { [Op.in]: ["UP", "GU", "TUP"] },
  });

  const setoran = await sumBkuKeluar(Bku, {
    ...base,
    jenis_transaksi: "SETORAN_SISA_UP",
  });

  const saldoAwal = await saldoKasAwalDariNeraca(NeracaSnapshot, tahunAnggaran);

  const arusDefs = [
    {
      kelompok: "AKTIVITAS_OPERASI",
      komponen: "penerimaan_operasi",
      uraian: "Penerimaan dari aktivitas operasi",
      nilai: penerimaanOperasi,
      urutan: 10,
    },
    {
      kelompok: "AKTIVITAS_OPERASI",
      komponen: "pengeluaran_gaji",
      uraian: "Pengeluaran Belanja Pegawai",
      nilai: -pengeluaranGaji,
      urutan: 20,
    },
    {
      kelompok: "AKTIVITAS_OPERASI",
      komponen: "pengeluaran_barang",
      uraian: "Pengeluaran Belanja Barang dan Jasa",
      nilai: -pengeluaranBarang,
      urutan: 30,
    },
    {
      kelompok: "AKTIVITAS_INVESTASI",
      komponen: "pengeluaran_modal",
      uraian: "Pengeluaran Belanja Modal (pembelian aset tetap)",
      nilai: -pengeluaranModal,
      urutan: 100,
    },
    {
      kelompok: "AKTIVITAS_PENDANAAN",
      komponen: "penerimaan_up",
      uraian: "Penerimaan Uang Persediaan dari Kas Daerah (UP/GU/TUP)",
      nilai: penerimaanUp,
      urutan: 200,
    },
    {
      kelompok: "AKTIVITAS_PENDANAAN",
      komponen: "setoran_sisa_up",
      uraian: "Setoran Sisa UP ke Kas Daerah",
      nilai: -setoran,
      urutan: 210,
    },
  ];

  const kenaikanKas = arusDefs.reduce((s, r) => s + r.nilai, 0);
  const saldoAkhir = saldoAwal + kenaikanKas;

  const saldoDefs = [
    {
      kelompok: "SALDO_KAS",
      komponen: "saldo_kas_awal",
      uraian: "Saldo Kas Awal (1 Januari)",
      nilai: saldoAwal,
      urutan: 300,
    },
    {
      kelompok: "SALDO_KAS",
      komponen: "kenaikan_penurunan_kas",
      uraian: "Kenaikan/(Penurunan) Kas",
      nilai: kenaikanKas,
      urutan: 310,
    },
    {
      kelompok: "SALDO_KAS",
      komponen: "saldo_kas_akhir",
      uraian: "Saldo Kas Akhir (31 Desember)",
      nilai: saldoAkhir,
      urutan: 320,
    },
  ];

  const allRows = [...arusDefs, ...saldoDefs];

  for (const row of allRows) {
    const nilaiL = await nilaiLalu(
      LakSnapshot,
      tahunAnggaran,
      row.kelompok,
      row.komponen,
    );
    const payload = {
      tahun_anggaran: tahunAnggaran,
      kelompok: row.kelompok,
      komponen: row.komponen,
      uraian: row.uraian,
      nilai_tahun_ini: row.nilai,
      nilai_tahun_lalu: nilaiL,
      urutan: row.urutan,
      dikunci: false,
    };
    const [snap, created] = await LakSnapshot.findOrCreate({
      where: {
        tahun_anggaran: tahunAnggaran,
        kelompok: row.kelompok,
        komponen: row.komponen,
      },
      defaults: payload,
    });
    if (!created) {
      await snap.update({ ...payload, dikunci: snap.dikunci });
    }
  }

  const lastDes = await Bku.findOne({
    where: { tahun_anggaran: tahunAnggaran, bulan: 12, status_validasi: BKU_OK },
    order: [
      ["tanggal", "DESC"],
      ["id", "DESC"],
    ],
  });
  const saldoBkuAkhir = lastDes ? num(lastDes.saldo) : 0;
  const selisih = Math.abs(saldoAkhir - saldoBkuAkhir);

  return {
    saldo_akhir_lak: saldoAkhir,
    saldo_bku_akhir: saldoBkuAkhir,
    balance: selisih < 1,
    selisih,
    saldo_kas_awal: saldoAwal,
    kenaikan_kas: kenaikanKas,
  };
}

async function validasiLak(models, tahunAnggaran) {
  const { LakSnapshot, Bku } = models;
  const akhir = await LakSnapshot.findOne({
    where: {
      tahun_anggaran: tahunAnggaran,
      kelompok: "SALDO_KAS",
      komponen: "saldo_kas_akhir",
    },
  });
  const saldoLak = akhir ? num(akhir.nilai_tahun_ini) : 0;
  const lastDes = await Bku.findOne({
    where: {
      tahun_anggaran: tahunAnggaran,
      bulan: 12,
      status_validasi: BKU_OK,
    },
    order: [
      ["tanggal", "DESC"],
      ["id", "DESC"],
    ],
  });
  const saldoBku = lastDes ? num(lastDes.saldo) : 0;
  const selisih = Math.abs(saldoLak - saldoBku);
  return {
    tahun_anggaran: tahunAnggaran,
    saldo_akhir_lak: saldoLak,
    saldo_bku_akhir: saldoBku,
    balance: selisih < 1,
    selisih,
  };
}

async function kunciLak(models, tahunAnggaran) {
  const { LakSnapshot } = models;
  const [n] = await LakSnapshot.update(
    { dikunci: true },
    { where: { tahun_anggaran: tahunAnggaran, dikunci: false } },
  );
  return { updated: n };
}

module.exports = {
  generateLak,
  validasiLak,
  kunciLak,
};

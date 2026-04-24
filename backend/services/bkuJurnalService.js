"use strict";

const { Op } = require("sequelize");
const { applyJournalPostingWithTransaction } = require("./lkSaldoService");

const AKUN_KAS = "1.1.01.02";
const AKUN_EKUITAS = "3.1.01";

/**
 * Mapping jenis_transaksi BKU → pasangan debit/kredit (ilustrasi SAP PP 71).
 * DARI_BKU = ganti dengan kolom kode_akun baris BKU.
 */
const MAPPING_JURNAL = {
  UP: {
    baris: [
      { akun: AKUN_KAS, posisi: "DEBIT" },
      { akun: AKUN_EKUITAS, posisi: "KREDIT" },
    ],
  },
  GU: {
    baris: [
      { akun: AKUN_KAS, posisi: "DEBIT" },
      { akun: AKUN_EKUITAS, posisi: "KREDIT" },
    ],
  },
  TUP: {
    baris: [
      { akun: AKUN_KAS, posisi: "DEBIT" },
      { akun: AKUN_EKUITAS, posisi: "KREDIT" },
    ],
  },
  LS_GAJI: {
    baris: [
      { akun: "DARI_BKU", posisi: "DEBIT" },
      { akun: AKUN_KAS, posisi: "KREDIT" },
    ],
  },
  LS_BARANG: {
    baris: [
      { akun: "DARI_BKU", posisi: "DEBIT" },
      { akun: AKUN_KAS, posisi: "KREDIT" },
    ],
  },
  PENGELUARAN_LAIN: {
    baris: [
      { akun: "DARI_BKU", posisi: "DEBIT" },
      { akun: AKUN_KAS, posisi: "KREDIT" },
    ],
  },
  PENERIMAAN_LAIN: {
    baris: [
      { akun: AKUN_KAS, posisi: "DEBIT" },
      { akun: AKUN_EKUITAS, posisi: "KREDIT" },
    ],
  },
  SETORAN_SISA_UP: {
    baris: [
      { akun: AKUN_EKUITAS, posisi: "DEBIT" },
      { akun: AKUN_KAS, posisi: "KREDIT" },
    ],
  },
};

function num(v) {
  return Number(v) || 0;
}

function nominalJurnal(bku) {
  const p = num(bku.penerimaan);
  const g = num(bku.pengeluaran);
  const j = bku.jenis_transaksi;
  if (
    j === "UP" ||
    j === "GU" ||
    j === "TUP" ||
    j === "PENERIMAAN_LAIN"
  ) {
    return p;
  }
  return g;
}

async function generateNomorJurnal(JurnalUmum, tahun) {
  const prefix = `JU-${tahun}-`;
  const last = await JurnalUmum.findOne({
    where: { nomor_jurnal: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
  });
  let next = 1;
  if (last && last.nomor_jurnal) {
    const part = last.nomor_jurnal.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

async function buildBarisJurnal(bku, models, t) {
  const cfg = MAPPING_JURNAL[bku.jenis_transaksi];
  if (!cfg) throw new Error(`Jenis transaksi tidak dipetakan: ${bku.jenis_transaksi}`);
  const amount = nominalJurnal(bku);
  if (amount <= 0.0001) throw new Error("Nominal penerimaan/pengeluaran harus > 0");

  const lines = [];
  let order = 0;
  for (const row of cfg.baris) {
    let akun = row.akun;
    if (akun === "DARI_BKU") {
      akun = bku.kode_akun;
      if (!akun) throw new Error("kode_akun wajib diisi untuk jenis pengeluaran ini");
    }
    const kab = await models.KodeAkunBas.findOne({
      where: { kode: akun, aktif: true },
      transaction: t,
    });
    if (!kab) throw new Error(`Kode akun BAS tidak ditemukan: ${akun}`);
    const base = {
      kode_akun: akun,
      nama_akun: kab.nama,
      urutan: order++,
    };
    if (row.posisi === "DEBIT") {
      lines.push({ ...base, debit: amount, kredit: 0 });
    } else {
      lines.push({ ...base, debit: 0, kredit: amount });
    }
  }
  return lines;
}

/**
 * Buat jurnal POSTED + update saldo_akun dalam satu transaksi DB.
 */
async function buatJurnalDariBku(sequelize, models, bku, t) {
  const { JurnalUmum, JurnalDetail } = models;
  const baris = await buildBarisJurnal(bku, models, t);
  const td = baris.reduce((s, x) => s + num(x.debit), 0);
  const tk = baris.reduce((s, x) => s + num(x.kredit), 0);
  if (Math.abs(td - tk) > 0.01) throw new Error("Jurnal internal tidak balance");

  const nomor = await generateNomorJurnal(JurnalUmum, bku.tahun_anggaran);
  const header = await JurnalUmum.create(
    {
      nomor_jurnal: nomor,
      tanggal: bku.tanggal,
      tahun_anggaran: bku.tahun_anggaran,
      keterangan: `Auto BKU #${bku.id}: ${String(bku.uraian || "").slice(0, 200)}`,
      referensi: `BKU:${bku.id}`,
      nomor_sp2d: bku.nomor_sp2d || null,
      jenis_jurnal: "UMUM",
      sumber: "AUTO_BKU",
      status: "POSTED",
      tanggal_disetujui: new Date(),
    },
    { transaction: t },
  );

  for (const b of baris) {
    await JurnalDetail.create(
      {
        jurnal_id: header.id,
        kode_akun: b.kode_akun,
        nama_akun: b.nama_akun,
        debit: b.debit,
        kredit: b.kredit,
        urutan: b.urutan,
      },
      { transaction: t },
    );
  }

  const full = await JurnalUmum.findByPk(header.id, {
    include: [{ model: JurnalDetail, as: "details" }],
    transaction: t,
  });
  await applyJournalPostingWithTransaction(models, full, +1, t);
  return full;
}

/**
 * Hitung ulang kolom saldo (running) untuk semua baris BKU pada tahun+bulan.
 */
async function hitungUlangSaldoBku(models, tahunAnggaran, bulan, t) {
  const { Bku } = models;
  let saldoLanjut = 0;
  if (bulan > 1) {
    const prevLast = await Bku.findOne({
      where: { tahun_anggaran: tahunAnggaran, bulan: bulan - 1 },
      order: [
        ["tanggal", "DESC"],
        ["id", "DESC"],
      ],
      transaction: t,
    });
    saldoLanjut = prevLast ? num(prevLast.saldo) : 0;
  }

  const records = await Bku.findAll({
    where: { tahun_anggaran: tahunAnggaran, bulan },
    order: [
      ["tanggal", "ASC"],
      ["id", "ASC"],
    ],
    transaction: t,
  });

  let saldo = saldoLanjut;
  for (const r of records) {
    saldo = saldo + num(r.penerimaan) - num(r.pengeluaran);
    await r.update({ saldo }, { transaction: t });
  }
}

/** Rekalkulasi saldo running dari bulanMulai sampai Desember (rantai antar-bulan). */
async function hitungUlangSaldoBkuDari(models, tahunAnggaran, bulanMulai, t) {
  const start = Math.max(1, Math.min(12, bulanMulai));
  for (let b = start; b <= 12; b++) {
    await hitungUlangSaldoBku(models, tahunAnggaran, b, t);
  }
}

module.exports = {
  MAPPING_JURNAL,
  nominalJurnal,
  buatJurnalDariBku,
  hitungUlangSaldoBku,
  hitungUlangSaldoBkuDari,
  buildBarisJurnal,
};

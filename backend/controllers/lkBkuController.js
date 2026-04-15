"use strict";

const db = require("../models");
const { Op } = require("sequelize");
const {
  Bku,
  BkuObjek,
  BkuUp,
  SaldoAkun,
  sequelize,
} = db;
const {
  buatJurnalDariBku,
  hitungUlangSaldoBkuDari,
  buildBarisJurnal,
  nominalJurnal,
} = require("../services/bkuJurnalService");
const { syncSpjDariSigap } = require("../services/sigapSpjSyncService");

function bulanDariTanggal(tanggal) {
  return parseInt(String(tanggal).slice(5, 7), 10) || 1;
}

exports.list = async (req, res) => {
  try {
    const { tahun_anggaran, bulan, jenis_transaksi } = req.query;
    const where = {};
    if (tahun_anggaran) where.tahun_anggaran = Number(tahun_anggaran);
    if (bulan) where.bulan = Number(bulan);
    if (jenis_transaksi) where.jenis_transaksi = jenis_transaksi;
    const rows = await Bku.findAll({
      where,
      order: [
        ["tanggal", "DESC"],
        ["id", "DESC"],
      ],
      limit: req.query.limit ? Number(req.query.limit) : 500,
      include: [{ model: BkuObjek, as: "objek_rows", required: false }],
    });
    res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat BKU" });
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await Bku.findByPk(req.params.id, {
      include: [{ model: BkuObjek, as: "objek_rows" }],
    });
    if (!row) return res.status(404).json({ message: "BKU tidak ditemukan" });
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.ringkasan = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const sumTerima = await Bku.sum("penerimaan", {
      where: { tahun_anggaran: tahun, bulan },
    });
    const sumKeluar = await Bku.sum("pengeluaran", {
      where: { tahun_anggaran: tahun, bulan },
    });
    const last = await Bku.findOne({
      where: { tahun_anggaran: tahun, bulan },
      order: [
        ["tanggal", "DESC"],
        ["id", "DESC"],
      ],
    });
    res.json({
      tahun_anggaran: tahun,
      bulan,
      total_penerimaan: Number(sumTerima) || 0,
      total_pengeluaran: Number(sumKeluar) || 0,
      saldo_akhir_bulan: last ? Number(last.saldo) : 0,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.saldoAkhir = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const last = await Bku.findOne({
      where: { tahun_anggaran: tahun, bulan },
      order: [
        ["tanggal", "DESC"],
        ["id", "DESC"],
      ],
    });
    res.json({
      tahun_anggaran: tahun,
      bulan,
      saldo_akhir: last ? Number(last.saldo) : 0,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.cetak = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const rows = await Bku.findAll({
      where: { tahun_anggaran: tahun, bulan },
      order: [
        ["tanggal", "ASC"],
        ["id", "ASC"],
      ],
    });
    res.json({
      judul: `Buku Kas Umum — ${tahun} bulan ${bulan}`,
      tahun_anggaran: tahun,
      bulan,
      baris: rows.map((r) => ({
        tanggal: r.tanggal,
        nomor_bukti: r.nomor_bukti,
        uraian: r.uraian,
        jenis_transaksi: r.jenis_transaksi,
        penerimaan: Number(r.penerimaan),
        pengeluaran: Number(r.pengeluaran),
        saldo: Number(r.saldo),
        kode_akun: r.kode_akun,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Preview baris jurnal tanpa simpan */
exports.previewJurnal = async (req, res) => {
  try {
    const body = req.body;
    const fake = {
      jenis_transaksi: body.jenis_transaksi,
      penerimaan: body.penerimaan || 0,
      pengeluaran: body.pengeluaran || 0,
      kode_akun: body.kode_akun,
      tanggal: body.tanggal || new Date().toISOString().slice(0, 10),
      tahun_anggaran: body.tahun_anggaran || new Date().getFullYear(),
      uraian: body.uraian || "",
      id: 0,
    };
    const t = await sequelize.transaction();
    try {
      const baris = await buildBarisJurnal(fake, db, t);
      await t.rollback();
      res.json({
        nominal: nominalJurnal(fake),
        baris,
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  const {
    skip_jurnal,
    objek,
    ...rest
  } = req.body;

  if (!rest.tanggal || !rest.tahun_anggaran || !rest.jenis_transaksi || !rest.uraian) {
    return res.status(400).json({ message: "tanggal, tahun_anggaran, jenis_transaksi, uraian wajib" });
  }

  const bulan = bulanDariTanggal(rest.tanggal);
  const t = await sequelize.transaction();
  try {
    const row = await Bku.create(
      {
        ...rest,
        bulan,
        penerimaan: rest.penerimaan ?? 0,
        pengeluaran: rest.pengeluaran ?? 0,
        saldo: 0,
        bendahara_id: req.user?.id || null,
      },
      { transaction: t },
    );

    if (Array.isArray(objek) && objek.length) {
      for (const o of objek) {
        await BkuObjek.create(
          {
            bku_id: row.id,
            kode_akun: o.kode_akun,
            nama_akun: o.nama_akun || null,
            jumlah: o.jumlah ?? 0,
            keterangan: o.keterangan || null,
          },
          { transaction: t },
        );
      }
    }

    if (!skip_jurnal) {
      const jurnal = await buatJurnalDariBku(sequelize, db, row, t);
      await row.update({ jurnal_id: jurnal.id }, { transaction: t });
    }

    await hitungUlangSaldoBkuDari(db, row.tahun_anggaran, bulan, t);
    await t.commit();

    const out = await Bku.findByPk(row.id, {
      include: [{ model: BkuObjek, as: "objek_rows" }],
    });
    res.status(201).json({ data: out });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal menyimpan BKU" });
  }
};

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const row = await Bku.findByPk(req.params.id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: "BKU tidak ditemukan" });
    }
    if (row.status_validasi !== "BELUM") {
      await t.rollback();
      return res.status(400).json({ message: "Hanya BKU status BELUM yang bisa diubah" });
    }
    const { objek, ...rest } = req.body;
    if (rest.tanggal) {
      rest.bulan = bulanDariTanggal(rest.tanggal);
    }
    await row.update(rest, { transaction: t });
    if (Array.isArray(objek)) {
      await BkuObjek.destroy({ where: { bku_id: row.id }, transaction: t });
      for (const o of objek) {
        await BkuObjek.create(
          {
            bku_id: row.id,
            kode_akun: o.kode_akun,
            nama_akun: o.nama_akun,
            jumlah: o.jumlah ?? 0,
            keterangan: o.keterangan,
          },
          { transaction: t },
        );
      }
    }
    await row.reload({ transaction: t });
    await hitungUlangSaldoBkuDari(db, row.tahun_anggaran, 1, t);
    await t.commit();
    const out = await Bku.findByPk(row.id, {
      include: [{ model: BkuObjek, as: "objek_rows" }],
    });
    res.json({ data: out });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ message: e.message });
  }
};

exports.syncSigap = async (req, res) => {
  try {
    const tahun = Number(req.body.tahun_anggaran || req.query.tahun_anggaran);
    if (!tahun) return res.status(400).json({ message: "tahun_anggaran wajib" });
    const hasil = await syncSpjDariSigap(sequelize, db, tahun);
    res.json({ data: hasil });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listUp = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await BkuUp.findAll({
      where: { tahun_anggaran: tahun },
      order: [["tanggal", "DESC"]],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createUp = async (req, res) => {
  try {
    const row = await BkuUp.create(req.body);
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Bandingkan saldo akhir BKU bulan terakhir vs saldo_akun 1.1.01.02 */
exports.rekonsiliasiKas = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const lastBku = await Bku.findOne({
      where: { tahun_anggaran: tahun, bulan },
      order: [
        ["tanggal", "DESC"],
        ["id", "DESC"],
      ],
    });
    const saldoBku = lastBku ? Number(lastBku.saldo) : 0;
    const rowSaldo = await SaldoAkun.findOne({
      where: { kode_akun: "1.1.01.02", tahun_anggaran: tahun, bulan },
    });
    const saldoGl = rowSaldo ? Number(rowSaldo.saldo_akhir) : 0;
    const selisih = Math.abs(saldoBku - saldoGl);
    res.json({
      tahun_anggaran: tahun,
      bulan,
      saldo_akhir_bku: saldoBku,
      saldo_akhir_buku_besar_1_1_01_02: saldoGl,
      selisih,
      cocok: selisih < 0.01,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

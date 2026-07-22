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
const { applyJournalPostingWithTransaction } = require("../services/lkSaldoService");
const { syncSpjDariSigap } = require("../services/sigapSpjSyncService");
const { recalcDpaRealisasi } = require("../services/dpaRealisasiRollupService");
const { recalcLkDispang } = require("../services/lkDispangRollupService");
const {
  assertBulanTerbuka,
  getStatusBulan,
  tutupBulan,
  setujuiBulan,
  tolakBulan,
} = require("../services/bkuTutupBukuService");

function bulanDariTanggal(tanggal) {
  return parseInt(String(tanggal).slice(5, 7), 10) || 1;
}

/** Error dari assertBulanTerbuka adalah kesalahan input (400), bukan error server (500). */
function statusForError(e) {
  return /sudah ditutup|sudah disetujui/i.test(e.message || "") ? 400 : 500;
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
    await assertBulanTerbuka(db, rest.tahun_anggaran, bulan, t);
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
    res.status(statusForError(e)).json({ message: e.message || "Gagal menyimpan BKU" });
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
    await assertBulanTerbuka(db, row.tahun_anggaran, row.bulan, t);
    const { objek, ...rest } = req.body;
    if (rest.tanggal) {
      rest.bulan = bulanDariTanggal(rest.tanggal);
      await assertBulanTerbuka(db, row.tahun_anggaran, rest.bulan, t);
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
    res.status(statusForError(e)).json({ message: e.message });
  }
};

/**
 * Hapus baris BKU (hanya status BELUM & bulan belum ditutup) — jurnal
 * terkait (kalau POSTED) di-void supaya saldo_akun ikut terbalik, lalu
 * saldo berjalan BKU direkalkulasi. Sebelumnya tidak ada fungsi hapus
 * sama sekali (koreksi hanya lewat update, tanpa jejak audit).
 */
exports.destroy = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const row = await Bku.findByPk(req.params.id, {
      include: [{ model: db.JurnalUmum, as: "jurnal", include: [{ model: db.JurnalDetail, as: "details" }] }],
      transaction: t,
    });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: "BKU tidak ditemukan" });
    }
    if (row.status_validasi !== "BELUM") {
      await t.rollback();
      return res.status(400).json({ message: "Hanya BKU status BELUM yang bisa dihapus" });
    }
    await assertBulanTerbuka(db, row.tahun_anggaran, row.bulan, t);

    if (row.jurnal && row.jurnal.status === "POSTED") {
      await applyJournalPostingWithTransaction(db, row.jurnal, -1, t);
      await row.jurnal.update({ status: "VOID" }, { transaction: t });
    }
    await BkuObjek.destroy({ where: { bku_id: row.id }, transaction: t });
    const { tahun_anggaran, bulan } = row;
    await row.destroy({ transaction: t });
    await hitungUlangSaldoBkuDari(db, tahun_anggaran, bulan, t);

    await t.commit();
    res.json({ message: "BKU dihapus, jurnal terkait di-void, saldo direkalkulasi" });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(statusForError(e)).json({ message: e.message || "Gagal menghapus BKU" });
  }
};

exports.syncSigap = async (req, res) => {
  try {
    const tahun = Number(req.body.tahun_anggaran || req.query.tahun_anggaran);
    if (!tahun) return res.status(400).json({ message: "tahun_anggaran wajib" });
    const hasil = await syncSpjDariSigap(sequelize, db, tahun);
    const rollupDpa = await recalcDpaRealisasi(db, tahun);
    const rollupLkDispang = await recalcLkDispang(db, tahun);
    res.json({ data: hasil, rollup_dpa: rollupDpa, rollup_lk_dispang: rollupLkDispang });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.recalcRollup = async (req, res) => {
  try {
    const tahun = Number(req.body.tahun_anggaran || req.query.tahun_anggaran);
    if (!tahun) return res.status(400).json({ message: "tahun_anggaran wajib" });
    const rollupDpa = await recalcDpaRealisasi(db, tahun);
    const rollupLkDispang = await recalcLkDispang(db, tahun);
    res.json({ rollup_dpa: rollupDpa, rollup_lk_dispang: rollupLkDispang });
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
      include: [
        { model: Bku, as: "bku_pencairan", required: false },
        { model: Bku, as: "bku_setoran", required: false },
      ],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * Catat pencairan UP/GU/TUP — WAJIB langsung membuat baris `bku` (penerimaan)
 * yang di-jurnal & masuk saldo berjalan, supaya kas yang benar-benar diterima
 * bendahara tidak pernah hilang dari ledger (sebelumnya `bku_up` berdiri
 * sendiri, tidak pernah tercermin sebagai penerimaan BKU).
 */
exports.createUp = async (req, res) => {
  const { tahun_anggaran, jenis, tanggal, nominal, nomor_bukti, nomor_sp2d, keterangan } = req.body;
  const jenisKas = req.body.jenis_kas === "TUNAI" ? "TUNAI" : "BANK"; // SP2D selalu cair ke rekening bank bendahara
  if (!tahun_anggaran || !jenis || !tanggal || !(Number(nominal) > 0)) {
    return res.status(400).json({ message: "tahun_anggaran, jenis, tanggal, nominal (>0) wajib" });
  }
  const bulan = bulanDariTanggal(tanggal);
  const t = await sequelize.transaction();
  try {
    await assertBulanTerbuka(db, tahun_anggaran, bulan, t);
    const up = await BkuUp.create(
      {
        tahun_anggaran,
        jenis,
        tanggal,
        nominal,
        sisa_up: nominal,
        status: "AKTIF",
        nomor_bukti: nomor_bukti || null,
        nomor_sp2d: nomor_sp2d || null,
        keterangan: keterangan || null,
      },
      { transaction: t },
    );

    const uraian = `Pencairan ${jenis}${nomor_sp2d ? ` — SP2D No. ${nomor_sp2d}` : ""}${keterangan ? `: ${keterangan}` : ""}`;
    const bkuRow = await Bku.create(
      {
        tahun_anggaran,
        bulan,
        tanggal,
        nomor_bukti: nomor_bukti || null,
        nomor_sp2d: nomor_sp2d || null,
        uraian,
        jenis_transaksi: jenis,
        jenis_kas: jenisKas,
        penerimaan: nominal,
        pengeluaran: 0,
        saldo: 0,
        bendahara_id: req.user?.id || null,
      },
      { transaction: t },
    );

    const jurnal = await buatJurnalDariBku(sequelize, db, bkuRow, t);
    await bkuRow.update({ jurnal_id: jurnal.id }, { transaction: t });
    await hitungUlangSaldoBkuDari(db, tahun_anggaran, bulan, t);
    await up.update({ bku_id: bkuRow.id }, { transaction: t });

    await t.commit();
    const out = await BkuUp.findByPk(up.id, {
      include: [
        { model: Bku, as: "bku_pencairan", required: false },
        { model: Bku, as: "bku_setoran", required: false },
      ],
    });
    res.status(201).json({ data: out });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(statusForError(e)).json({ message: e.message || "Gagal mencatat pencairan UP/GU/TUP" });
  }
};

/**
 * Setor sisa UP/TUP yang tidak terpakai kembali ke kas daerah — menutup
 * siklus UP dengan baris `bku` pengeluaran (SETORAN_SISA_UP) yang di-jurnal
 * & masuk saldo berjalan, konsisten dengan penerimaannya di atas.
 */
exports.setorSisaUp = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const up = await BkuUp.findByPk(req.params.id, { transaction: t });
    if (!up) {
      await t.rollback();
      return res.status(404).json({ message: "Data UP/GU/TUP tidak ditemukan" });
    }
    if (up.status === "SETOR_KEMBALI" || up.setoran_bku_id) {
      await t.rollback();
      return res.status(400).json({ message: "UP/GU/TUP ini sudah disetor kembali" });
    }
    const sisa = Number(up.sisa_up) || 0;
    if (sisa <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Sisa UP/GU/TUP sudah 0, tidak ada yang perlu disetor" });
    }

    const tanggal = req.body.tanggal || new Date().toISOString().slice(0, 10);
    const bulan = bulanDariTanggal(tanggal);
    await assertBulanTerbuka(db, up.tahun_anggaran, bulan, t);
    const nomorBukti = req.body.nomor_bukti || null;
    const jenisKas = req.body.jenis_kas === "TUNAI" ? "TUNAI" : "BANK"; // setoran ke kasda selalu via transfer bank
    const uraian = `Setoran sisa ${up.jenis} ke kas daerah${nomorBukti ? ` — Bukti Setor No. ${nomorBukti}` : ""}`;

    const bkuRow = await Bku.create(
      {
        tahun_anggaran: up.tahun_anggaran,
        bulan,
        tanggal,
        nomor_bukti: nomorBukti,
        uraian,
        jenis_transaksi: "SETORAN_SISA_UP",
        jenis_kas: jenisKas,
        penerimaan: 0,
        pengeluaran: sisa,
        saldo: 0,
        bendahara_id: req.user?.id || null,
      },
      { transaction: t },
    );

    const jurnal = await buatJurnalDariBku(sequelize, db, bkuRow, t);
    await bkuRow.update({ jurnal_id: jurnal.id }, { transaction: t });
    await hitungUlangSaldoBkuDari(db, up.tahun_anggaran, bulan, t);
    await up.update(
      { status: "SETOR_KEMBALI", sisa_up: 0, setoran_bku_id: bkuRow.id },
      { transaction: t },
    );

    await t.commit();
    const out = await BkuUp.findByPk(up.id, {
      include: [
        { model: Bku, as: "bku_pencairan", required: false },
        { model: Bku, as: "bku_setoran", required: false },
      ],
    });
    res.json({ data: out });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(statusForError(e)).json({ message: e.message || "Gagal mencatat setoran sisa UP/GU/TUP" });
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

/**
 * Rincian kas TUNAI vs BANK (Buku Pembantu) — kumulatif Jan..bulan target,
 * murni pelaporan (tidak menyentuh akun GL 1.1.01.02 yang tetap tunggal).
 * Total kedua sub-ledger ini harus sama dengan `saldo` baris BKU terakhir
 * bulan tsb (kombinasi) — dipakai sebagai cross-check.
 */
exports.ringkasanTunaiBank = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const rows = await Bku.findAll({
      where: { tahun_anggaran: tahun, bulan: { [Op.lte]: bulan } },
      attributes: ["jenis_kas", "penerimaan", "pengeluaran"],
      raw: true,
    });
    const hasil = {
      TUNAI: { penerimaan: 0, pengeluaran: 0, saldo: 0 },
      BANK: { penerimaan: 0, pengeluaran: 0, saldo: 0 },
    };
    for (const r of rows) {
      const k = hasil[r.jenis_kas] || hasil.BANK;
      k.penerimaan += Number(r.penerimaan) || 0;
      k.pengeluaran += Number(r.pengeluaran) || 0;
    }
    hasil.TUNAI.saldo = hasil.TUNAI.penerimaan - hasil.TUNAI.pengeluaran;
    hasil.BANK.saldo = hasil.BANK.penerimaan - hasil.BANK.pengeluaran;
    res.json({
      tahun_anggaran: tahun,
      bulan,
      tunai: hasil.TUNAI,
      bank: hasil.BANK,
      total_gabungan: hasil.TUNAI.saldo + hasil.BANK.saldo,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * Pemindahan kas internal Bank<->Tunai (mis. Bendahara tarik tunai dari
 * rekening bank untuk keperluan operasional kecil). Dicatat sebagai 2 baris
 * BKU (keluar dari sumber, masuk ke tujuan) TANPA jurnal GL — akun kas GL
 * tetap satu (1.1.01.02), jadi net effect-nya nol di buku besar, hanya
 * memindah proporsi tunai/bank di sub-ledger.
 */
exports.pindahKas = async (req, res) => {
  const { tahun_anggaran, tanggal, nominal, arah, keterangan } = req.body;
  if (!tahun_anggaran || !tanggal || !(Number(nominal) > 0) || !["BANK_KE_TUNAI", "TUNAI_KE_BANK"].includes(arah)) {
    return res.status(400).json({ message: "tahun_anggaran, tanggal, nominal (>0), arah (BANK_KE_TUNAI/TUNAI_KE_BANK) wajib" });
  }
  const bulan = bulanDariTanggal(tanggal);
  const dari = arah === "BANK_KE_TUNAI" ? "BANK" : "TUNAI";
  const ke = arah === "BANK_KE_TUNAI" ? "TUNAI" : "BANK";
  const t = await sequelize.transaction();
  try {
    await assertBulanTerbuka(db, tahun_anggaran, bulan, t);
    const uraianBase = `Pemindahan kas ${dari} → ${ke}${keterangan ? `: ${keterangan}` : ""}`;

    await Bku.create(
      {
        tahun_anggaran,
        bulan,
        tanggal,
        uraian: uraianBase,
        jenis_transaksi: "PEMINDAHAN_KAS",
        jenis_kas: dari,
        penerimaan: 0,
        pengeluaran: nominal,
        saldo: 0,
        bendahara_id: req.user?.id || null,
      },
      { transaction: t },
    );
    await Bku.create(
      {
        tahun_anggaran,
        bulan,
        tanggal,
        uraian: uraianBase,
        jenis_transaksi: "PEMINDAHAN_KAS",
        jenis_kas: ke,
        penerimaan: nominal,
        pengeluaran: 0,
        saldo: 0,
        bendahara_id: req.user?.id || null,
      },
      { transaction: t },
    );

    await hitungUlangSaldoBkuDari(db, tahun_anggaran, bulan, t);
    await t.commit();
    res.status(201).json({ message: "Pemindahan kas dicatat" });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(statusForError(e)).json({ message: e.message || "Gagal mencatat pemindahan kas" });
  }
};

exports.statusTutupBuku = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const row = await getStatusBulan(db, tahun, bulan);
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Bendahara menutup BKU bulan berjalan — snapshot total & kunci dari perubahan lebih lanjut. */
exports.tutupBuku = async (req, res) => {
  const tahun = Number(req.params.tahun);
  const bulan = Number(req.params.bulan);
  const t = await sequelize.transaction();
  try {
    const row = await tutupBulan(db, tahun, bulan, req.user?.id, t);
    await t.commit();
    res.json({ data: row });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ message: e.message });
  }
};

/** PPK-SKPD/PA menyetujui tutup buku — mengunci bulan tsb secara final. */
exports.setujuiTutupBuku = async (req, res) => {
  const tahun = Number(req.params.tahun);
  const bulan = Number(req.params.bulan);
  const t = await sequelize.transaction();
  try {
    const row = await setujuiBulan(db, tahun, bulan, req.user?.id, t);
    await t.commit();
    res.json({ data: row });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ message: e.message });
  }
};

/** PPK-SKPD/PA menolak tutup buku — dibuka lagi untuk dikoreksi Bendahara. */
exports.tolakTutupBuku = async (req, res) => {
  const tahun = Number(req.params.tahun);
  const bulan = Number(req.params.bulan);
  const t = await sequelize.transaction();
  try {
    const row = await tolakBulan(db, tahun, bulan, req.body?.catatan, t);
    await t.commit();
    res.json({ data: row });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ message: e.message });
  }
};

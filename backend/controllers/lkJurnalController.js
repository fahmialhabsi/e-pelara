"use strict";

const db = require("../models");
const { Op } = require("sequelize");
const {
  JurnalUmum,
  JurnalDetail,
  KodeAkunBas,
  sequelize,
} = db;
const {
  applyJournalPosting,
} = require("../services/lkSaldoService");

const TOL = 0.01;

function sumDetails(details) {
  let td = 0;
  let tk = 0;
  for (const d of details) {
    td += Number(d.debit) || 0;
    tk += Number(d.kredit) || 0;
  }
  return { totalDebit: td, totalKredit: tk };
}

async function generateNomorJurnal(tahun) {
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

async function validateDetailAccounts(details) {
  for (const d of details) {
    const exists = await KodeAkunBas.findOne({ where: { kode: d.kode_akun, aktif: true } });
    if (!exists) {
      throw new Error(`Kode akun tidak valid atau nonaktif: ${d.kode_akun}`);
    }
  }
}

exports.list = async (req, res) => {
  try {
    const { tahun_anggaran, bulan, status, jenis_jurnal } = req.query;
    const where = {};
    if (tahun_anggaran) where.tahun_anggaran = Number(tahun_anggaran);
    if (status) where.status = status;
    if (jenis_jurnal) where.jenis_jurnal = jenis_jurnal;
    if (bulan) {
      const b = Number(bulan);
      where[Op.and] = [
        ...(where[Op.and] || []),
        sequelize.literal(`MONTH(tanggal) = ${b}`),
      ];
    }
    const rows = await JurnalUmum.findAll({
      where,
      order: [["tanggal", "DESC"], ["id", "DESC"]],
      limit: req.query.limit ? Number(req.query.limit) : 200,
    });
    res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat jurnal." });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await JurnalUmum.findByPk(id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });
    if (!row) return res.status(404).json({ message: "Jurnal tidak ditemukan." });
    res.json({ data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat jurnal." });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  let committed = false;
  try {
    const {
      tanggal,
      tahun_anggaran,
      keterangan,
      referensi,
      nomor_sp2d,
      jenis_jurnal = "UMUM",
      sumber = "MANUAL",
      detail = [],
      post_now = false,
    } = req.body;

    if (!tanggal || !tahun_anggaran || !keterangan) {
      await t.rollback();
      return res.status(400).json({ message: "tanggal, tahun_anggaran, keterangan wajib." });
    }
    if (!Array.isArray(detail) || detail.length < 2) {
      await t.rollback();
      return res.status(400).json({ message: "Minimal dua baris detail jurnal." });
    }

    await validateDetailAccounts(detail);
    const { totalDebit, totalKredit } = sumDetails(detail);
    if (Math.abs(totalDebit - totalKredit) > TOL) {
      await t.rollback();
      return res.status(400).json({
        error: "Jurnal tidak balance",
        detail: `Total debit Rp ${totalDebit.toLocaleString("id-ID")} ≠ Total kredit Rp ${totalKredit.toLocaleString("id-ID")}`,
      });
    }

    const nomor_jurnal = await generateNomorJurnal(Number(tahun_anggaran));
    const userId = req.user?.id || req.user?.userId || null;

    const header = await JurnalUmum.create(
      {
        nomor_jurnal,
        tanggal,
        tahun_anggaran: Number(tahun_anggaran),
        keterangan,
        referensi: referensi || null,
        nomor_sp2d: nomor_sp2d || null,
        jenis_jurnal,
        sumber,
        status: post_now ? "POSTED" : "DRAFT",
        dibuat_oleh: userId,
        disetujui_oleh: post_now ? userId : null,
        tanggal_disetujui: post_now ? new Date() : null,
      },
      { transaction: t },
    );

    let order = 0;
    for (const d of detail) {
      const akun = await KodeAkunBas.findOne({ where: { kode: d.kode_akun } });
      await JurnalDetail.create(
        {
          jurnal_id: header.id,
          kode_akun: d.kode_akun,
          nama_akun: d.nama_akun || akun?.nama || null,
          uraian: d.uraian || null,
          debit: d.debit || 0,
          kredit: d.kredit || 0,
          urutan: order++,
        },
        { transaction: t },
      );
    }

    await t.commit();
    committed = true;

    let full = await JurnalUmum.findByPk(header.id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });

    if (post_now) {
      try {
        await applyJournalPosting(sequelize, db, full, +1);
      } catch (err) {
        await header.update({
          status: "DRAFT",
          disetujui_oleh: null,
          tanggal_disetujui: null,
        });
        throw err;
      }
      full = await JurnalUmum.findByPk(header.id, {
        include: [{ model: JurnalDetail, as: "details" }],
      });
    }

    res.status(201).json({ data: full });
  } catch (e) {
    if (!committed) await t.rollback().catch(() => {});
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal membuat jurnal." });
  }
};

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const row = await JurnalUmum.findByPk(id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: "Jurnal tidak ditemukan." });
    }
    if (row.status !== "DRAFT") {
      await t.rollback();
      return res.status(400).json({ message: "Hanya jurnal DRAFT yang bisa diubah." });
    }

    const {
      tanggal,
      tahun_anggaran,
      keterangan,
      referensi,
      nomor_sp2d,
      jenis_jurnal,
      detail,
    } = req.body;

    if (tanggal) row.tanggal = tanggal;
    if (tahun_anggaran) row.tahun_anggaran = Number(tahun_anggaran);
    if (keterangan) row.keterangan = keterangan;
    if (referensi !== undefined) row.referensi = referensi;
    if (nomor_sp2d !== undefined) row.nomor_sp2d = nomor_sp2d;
    if (jenis_jurnal) row.jenis_jurnal = jenis_jurnal;

    if (Array.isArray(detail)) {
      const { totalDebit, totalKredit } = sumDetails(detail);
      if (Math.abs(totalDebit - totalKredit) > TOL) {
        await t.rollback();
        return res.status(400).json({
          error: "Jurnal tidak balance",
          detail: `Total debit Rp ${totalDebit.toLocaleString("id-ID")} ≠ Total kredit Rp ${totalKredit.toLocaleString("id-ID")}`,
        });
      }
      await validateDetailAccounts(detail);
      await JurnalDetail.destroy({ where: { jurnal_id: id }, transaction: t });
      let order = 0;
      for (const d of detail) {
        const akun = await KodeAkunBas.findOne({ where: { kode: d.kode_akun } });
        await JurnalDetail.create(
          {
            jurnal_id: id,
            kode_akun: d.kode_akun,
            nama_akun: d.nama_akun || akun?.nama || null,
            uraian: d.uraian || null,
            debit: d.debit || 0,
            kredit: d.kredit || 0,
            urutan: order++,
          },
          { transaction: t },
        );
      }
    }

    await row.save({ transaction: t });
    await t.commit();

    const full = await JurnalUmum.findByPk(id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });
    res.json({ data: full });
  } catch (e) {
    await t.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal update jurnal." });
  }
};

exports.post = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await JurnalUmum.findByPk(id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });
    if (!row) return res.status(404).json({ message: "Jurnal tidak ditemukan." });
    if (row.status !== "DRAFT") {
      return res.status(400).json({ message: "Hanya jurnal DRAFT yang bisa diposting." });
    }
    const { totalDebit, totalKredit } = sumDetails(row.details || []);
    if (Math.abs(totalDebit - totalKredit) > TOL) {
      return res.status(400).json({
        error: "Jurnal tidak balance",
        detail: `Total debit Rp ${totalDebit.toLocaleString("id-ID")} ≠ Total kredit Rp ${totalKredit.toLocaleString("id-ID")}`,
      });
    }

    const userId = req.user?.id || req.user?.userId || null;
    await row.update({
      status: "POSTED",
      disetujui_oleh: userId,
      tanggal_disetujui: new Date(),
    });

    const full = await JurnalUmum.findByPk(id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });
    await applyJournalPosting(sequelize, db, full, +1);
    res.json({ data: full, message: "Jurnal berhasil diposting." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal posting jurnal." });
  }
};

exports.void = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await JurnalUmum.findByPk(id, {
      include: [{ model: JurnalDetail, as: "details" }],
    });
    if (!row) return res.status(404).json({ message: "Jurnal tidak ditemukan." });
    if (row.status !== "POSTED") {
      return res.status(400).json({ message: "Hanya jurnal POSTED yang bisa di-void." });
    }

    await applyJournalPosting(sequelize, db, row, -1);
    await row.update({ status: "VOID" });
    res.json({ data: row, message: "Jurnal dibatalkan (VOID); saldo dibalik." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal void jurnal." });
  }
};

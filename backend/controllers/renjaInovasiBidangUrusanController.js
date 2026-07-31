'use strict';

/**
 * Inovasi bidang urusan — data pendukung subbab Bab II Renja
 * (Permendagri 14/2026, Lampiran angka II.A.3 poin 5).
 *
 * Sama seperti Pokir DPRD, data ini tahunan per perangkat daerah dan tidak
 * terikat dokumen Renja tertentu. Inovasi yang masih berjalan diturunkan ke
 * tahun berikutnya lewat endpoint recall, sehingga tidak diketik ulang.
 */

const db = require('../models');
const layanan = require('../services/renjaDataPendukungService');

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const URUTAN_BAKU = [
  ['urutan', 'ASC'],
  ['id', 'ASC'],
];

const susunWhere = (query) => {
  const where = {};
  if (query.tahun) where.tahun = String(query.tahun);
  const pdId = toInt(query.perangkat_daerah_id);
  if (pdId) where.perangkat_daerah_id = pdId;
  if (query.bentuk_inovasi) where.bentuk_inovasi = query.bentuk_inovasi;
  if (query.q) {
    const { Op } = db.Sequelize;
    where[Op.or] = [
      { nama_inovasi: { [Op.like]: `%${query.q}%` } },
      { deskripsi: { [Op.like]: `%${query.q}%` } },
      { manfaat: { [Op.like]: `%${query.q}%` } },
    ];
  }
  return where;
};

const bersihkanPayload = (body) => {
  const p = { ...body };
  delete p.id;
  delete p.created_at;
  delete p.updated_at;
  if (p.tahun !== null && p.tahun !== undefined) p.tahun = String(p.tahun);
  if (p.tahun_mulai !== null && p.tahun_mulai !== undefined) {
    p.tahun_mulai = p.tahun_mulai ? String(p.tahun_mulai) : null;
  }
  if ('jumlah' in p) p.jumlah = toInt(p.jumlah);
  return p;
};

const gagal = (res, e, status = 500) => {
  console.error('[renjaInovasiBidangUrusan]', e);
  return res.status(status).json({ success: false, message: e.message || 'Terjadi kesalahan.' });
};

async function findAll(req, res) {
  try {
    const rows = await db.RenjaInovasiBidangUrusan.findAll({
      where: susunWhere(req.query),
      order: URUTAN_BAKU,
      include: [{ model: db.PerangkatDaerah, as: 'perangkatDaerah', required: false }],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return gagal(res, e);
  }
}

async function findOne(req, res) {
  try {
    const row = await db.RenjaInovasiBidangUrusan.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    return res.json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function create(req, res) {
  try {
    const payload = bersihkanPayload(req.body);
    if (!payload.tahun || !toInt(payload.perangkat_daerah_id)) {
      return res
        .status(400)
        .json({ success: false, message: 'tahun dan perangkat_daerah_id wajib diisi.' });
    }
    if (!String(payload.nama_inovasi ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Nama inovasi wajib diisi.' });
    }
    if (payload.urutan === null || payload.urutan === undefined) {
      const terakhir = await db.RenjaInovasiBidangUrusan.max('urutan', {
        where: {
          tahun: payload.tahun,
          perangkat_daerah_id: toInt(payload.perangkat_daerah_id),
        },
      });
      payload.urutan = (Number(terakhir) || 0) + 1;
    }
    const row = await db.RenjaInovasiBidangUrusan.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function update(req, res) {
  try {
    const row = await db.RenjaInovasiBidangUrusan.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    await row.update(bersihkanPayload(req.body));
    return res.json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function destroy(req, res) {
  try {
    const n = await db.RenjaInovasiBidangUrusan.destroy({ where: { id: toInt(req.params.id) } });
    if (!n) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    return res.json({ success: true, message: 'Data dihapus.' });
  } catch (e) {
    return gagal(res, e);
  }
}

/** Lihat inovasi tahun sebelumnya yang belum ada di tahun berkenaan. */
async function previewRecall(req, res) {
  try {
    const data = await layanan.previewRecallInovasi(db, {
      tahun: req.query.tahun,
      perangkat_daerah_id: req.query.perangkat_daerah_id,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

/** Turunkan inovasi tahun sebelumnya ke tahun berkenaan. */
async function terapkanRecall(req, res) {
  try {
    const data = await layanan.terapkanRecallInovasi(db, {
      tahun: req.body?.tahun,
      perangkat_daerah_id: req.body?.perangkat_daerah_id,
      kandidat: req.body?.kandidat,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

async function rekap(req, res) {
  try {
    const data = await layanan.rekapInovasi(db, {
      tahun: req.query.tahun,
      perangkat_daerah_id: req.query.perangkat_daerah_id,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

module.exports = {
  findAll,
  findOne,
  create,
  update,
  delete: destroy,
  previewRecall,
  terapkanRecall,
  rekap,
};

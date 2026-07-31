'use strict';

/**
 * Pokok-pokok pikiran DPRD — data pendukung subbab Bab II Renja
 * (Permendagri 14/2026, Lampiran angka II.A.3 poin 4).
 *
 * Data bersifat tahunan per perangkat daerah, tidak terikat ke satu dokumen
 * Renja, sehingga dapat di-recall berulang oleh revisi Renja mana pun tanpa
 * penginputan ulang.
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
  if (query.q) {
    const { Op } = db.Sequelize;
    where[Op.or] = [
      { usulan: { [Op.like]: `%${query.q}%` } },
      { nama_anggota_dprd: { [Op.like]: `%${query.q}%` } },
      { dapil: { [Op.like]: `%${query.q}%` } },
      { lokasi: { [Op.like]: `%${query.q}%` } },
    ];
  }
  return where;
};

const bersihkanPayload = (body) => {
  const p = { ...body };
  delete p.id;
  delete p.created_at;
  delete p.updated_at;
  if ('nilai_usulan_anggaran' in p) {
    p.nilai_usulan_anggaran = layanan.parseRupiah(p.nilai_usulan_anggaran);
  }
  if (p.tahun !== null && p.tahun !== undefined) p.tahun = String(p.tahun);
  return p;
};

const gagal = (res, e, status = 500) => {
  console.error('[renjaPokirDprd]', e);
  return res.status(status).json({ success: false, message: e.message || 'Terjadi kesalahan.' });
};

async function findAll(req, res) {
  try {
    const rows = await db.RenjaPokirDprd.findAll({
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
    const row = await db.RenjaPokirDprd.findByPk(toInt(req.params.id));
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
    if (!String(payload.usulan ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Kolom usulan wajib diisi.' });
    }
    if (payload.urutan === null || payload.urutan === undefined) {
      const terakhir = await db.RenjaPokirDprd.max('urutan', {
        where: {
          tahun: payload.tahun,
          perangkat_daerah_id: toInt(payload.perangkat_daerah_id),
        },
      });
      payload.urutan = (Number(terakhir) || 0) + 1;
    }
    const row = await db.RenjaPokirDprd.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function update(req, res) {
  try {
    const row = await db.RenjaPokirDprd.findByPk(toInt(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    await row.update(bersihkanPayload(req.body));
    return res.json({ success: true, data: row });
  } catch (e) {
    return gagal(res, e);
  }
}

async function destroy(req, res) {
  try {
    const n = await db.RenjaPokirDprd.destroy({ where: { id: toInt(req.params.id) } });
    if (!n) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    return res.json({ success: true, message: 'Data dihapus.' });
  } catch (e) {
    return gagal(res, e);
  }
}

/** Impor massal — hasil reses DPRD biasanya diterima sebagai daftar, bukan satuan. */
async function importMassal(req, res) {
  try {
    const hasil = await layanan.importPokir(db, {
      tahun: req.body?.tahun,
      perangkat_daerah_id: req.body?.perangkat_daerah_id,
      rows: req.body?.rows,
    });
    return res.json({ success: true, data: hasil });
  } catch (e) {
    return gagal(res, e, 400);
  }
}

async function previewAutofill(req, res) {
  try {
    const data = await layanan.previewAutofillPokir(db, {
      tahun: req.query.tahun,
      perangkat_daerah_id: req.query.perangkat_daerah_id,
      ambang: req.query.ambang ? Number(req.query.ambang) : undefined,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

async function terapkanAutofill(req, res) {
  try {
    const data = await layanan.terapkanAutofillPokir(db, req.body?.perubahan);
    return res.json({ success: true, data });
  } catch (e) {
    return gagal(res, e);
  }
}

/** Saran nomenklatur untuk satu teks usulan — dipakai form saat mengetik. */
async function sugesti(req, res) {
  try {
    const bidangUrusan =
      req.query.bidang_urusan ||
      (await layanan.resolveBidangUrusan(db, req.query.perangkat_daerah_id));
    const data = await layanan.sugestiNomenklatur(db, {
      teks: req.query.teks || '',
      bidangUrusan,
      batas: req.query.batas ? Number(req.query.batas) : 5,
    });
    return res.json({ success: true, data: { bidang_urusan: bidangUrusan, saran: data } });
  } catch (e) {
    return gagal(res, e);
  }
}

async function rekap(req, res) {
  try {
    const data = await layanan.rekapPokir(db, {
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
  importMassal,
  previewAutofill,
  terapkanAutofill,
  sugesti,
  rekap,
};

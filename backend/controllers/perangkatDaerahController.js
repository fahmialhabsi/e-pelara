const { PerangkatDaerah } = require('../models');

async function getAll(req, res) {
  try {
    const where = { is_test: false };
    if (req.query.aktif !== undefined) where.aktif = req.query.aktif === 'true';
    const rows = await PerangkatDaerah.findAll({ where, order: [['nama', 'ASC']] });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getById(req, res) {
  try {
    const row = await PerangkatDaerah.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function create(req, res) {
  try {
    const { kode, nama, aktif } = req.body;
    if (!nama?.trim())
      return res.status(400).json({ success: false, message: 'Nama wajib diisi.' });
    const row = await PerangkatDaerah.create({
      kode: kode?.trim() || null,
      nama: `${nama.trim()} ${process.env.NAMA_PROVINSI || ''}`.trim(),
      aktif: aktif !== false,
      is_test: false,
    });
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function update(req, res) {
  try {
    const row = await PerangkatDaerah.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    const { kode, nama, aktif } = req.body;
    await row.update({
      kode: kode?.trim() || null,
      nama: nama?.trim() || row.nama,
      aktif: aktif !== undefined ? aktif : row.aktif,
    });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function remove(req, res) {
  try {
    const row = await PerangkatDaerah.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    await row.destroy();
    return res.json({ success: true, message: 'Dihapus.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getAll, getById, create, update, remove };

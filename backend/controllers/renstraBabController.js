// File: controllers/renstraBabController.js
const { RenstraBab } = require('../models');

exports.getBab = async (req, res) => {
  try {
    const { tahun, bab } = req.params;
    let row = await RenstraBab.findOne({ where: { tahun, bab } });
    if (!row) return res.json({ subbabList: [] });

    let isiParsed = [];
    try {
      isiParsed = typeof row.isi === 'string' ? JSON.parse(row.isi) : row.isi;
    } catch (e) {
      console.error('Gagal parse isi:', e);
    }

    res.json({ subbabList: Array.isArray(isiParsed) ? isiParsed : [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateBab = async (req, res) => {
  try {
    const { tahun, bab } = req.params;
    const { subbabList, judul_bab } = req.body;

    await RenstraBab.upsert({
      tahun,
      bab,
      judul_bab: judul_bab || '',
      subbab: null,
      isi: subbabList,
      updated_at: new Date(),
      updated_by: req.user?.nama || 'admin',
      created_at: new Date(),
    });

    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getKinerja = async (req, res) => {
  try {
    const { Lakip, LkDispang, RenstraOPD } = require('../models');
    const { id } = req.params;
    const renstra = await RenstraOPD.findByPk(id);
    if (!renstra) return res.status(404).json({ error: 'Renstra tidak ditemukan' });
    const tahunMulai = renstra.tahun_mulai;
    const tahunAkhir = renstra.tahun_akhir;
    const { Op } = require('sequelize');
    const lakipData = await Lakip.findAll({
      where: { tahun: { [Op.between]: [tahunMulai - 5, tahunMulai - 1] } },
      order: [['tahun', 'ASC']],
    }).catch(() => []);
    const lkData = await LkDispang.findAll({
      where: { tahun: { [Op.between]: [tahunMulai - 5, tahunMulai - 1] } },
      order: [['tahun', 'ASC']],
    }).catch(() => []);
    res.json({
      lakip: lakipData.map((d) => d.toJSON()),
      lk_dispang: lkData.map((d) => d.toJSON()),
      periode: { dari: tahunMulai - 5, sampai: tahunMulai - 1 },
      is_empty: lakipData.length === 0 && lkData.length === 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

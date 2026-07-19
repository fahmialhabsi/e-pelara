const { MasterSubBidangOpd } = require('../models');

// GET /api/master-sub-bidang-opd?nama_opd=...&nama_bidang_opd=...
exports.findAll = async (req, res) => {
  try {
    const { nama_opd, nama_bidang_opd } = req.query;
    const where = {};
    if (nama_opd) where.nama_opd = nama_opd;
    if (nama_bidang_opd) where.nama_bidang_opd = nama_bidang_opd;

    const rows = await MasterSubBidangOpd.findAll({
      where,
      order: [['nama_sub_bidang_opd', 'ASC']],
    });

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

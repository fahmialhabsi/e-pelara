const { Tapd } = require('../models');

module.exports = {
  // GET /api/tapd?tahun=2026
  async getByTahun(req, res) {
    try {
      const { tahun } = req.query;
      if (!tahun)
        return res.status(400).json({ success: false, message: 'Parameter tahun wajib diisi' });
      const data = await Tapd.findAll({
        where: { tahun: Number(tahun) },
        order: [['urutan', 'ASC']],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /api/tapd/bulk — simpan semua TAPD sekaligus (replace per tahun)
  async saveBulk(req, res) {
    try {
      const { tahun, items } = req.body;
      if (!tahun || !Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'tahun dan items wajib diisi' });
      }
      await Tapd.destroy({ where: { tahun: Number(tahun) } });
      const rows = items.map((item, i) => ({
        tahun: Number(tahun),
        urutan: i + 1,
        nama: item.nama || '',
        nip: item.nip || '',
        jabatan: item.jabatan || '',
        tanggal_pembahasan: item.tanggal_pembahasan || null,
        catatan: item.catatan || null,
      }));
      await Tapd.bulkCreate(rows);
      const data = await Tapd.findAll({
        where: { tahun: Number(tahun) },
        order: [['urutan', 'ASC']],
      });
      res.json({ success: true, message: 'Data TAPD berhasil disimpan', data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
};

const { PejabatPenandatangan } = require('../models');

const ROLES = ['PENGGUNA_ANGGARAN', 'KUASA_PENGGUNA_ANGGARAN', 'KEPALA_DINAS', 'SEKRETARIS'];

module.exports = {
  // GET /api/pejabat-penandatangan?tahun=2025
  async getByTahun(req, res) {
    try {
      const { tahun } = req.query;
      if (!tahun)
        return res.status(400).json({ success: false, message: 'Parameter tahun wajib diisi' });
      const data = await PejabatPenandatangan.findAll({
        where: { tahun: Number(tahun) },
        order: [['role', 'ASC']],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /api/pejabat-penandatangan/bulk — simpan ke-4 peran sekaligus (replace per tahun)
  async saveBulk(req, res) {
    try {
      const { tahun, items } = req.body;
      if (!tahun || !Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'tahun dan items wajib diisi' });
      }
      const invalidRole = items.find((item) => !ROLES.includes(item.role));
      if (invalidRole) {
        return res.status(400).json({
          success: false,
          message: `Role tidak valid: ${invalidRole.role}. Gunakan: ${ROLES.join(', ')}`,
        });
      }
      await PejabatPenandatangan.destroy({ where: { tahun: Number(tahun) } });
      const rows = items.map((item) => ({
        tahun: Number(tahun),
        role: item.role,
        nama: item.nama || '',
        nip: item.nip || '',
        jabatan: item.jabatan || '',
      }));
      await PejabatPenandatangan.bulkCreate(rows);
      const data = await PejabatPenandatangan.findAll({
        where: { tahun: Number(tahun) },
        order: [['role', 'ASC']],
      });
      res.json({ success: true, message: 'Data Pejabat Penandatangan berhasil disimpan', data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
};

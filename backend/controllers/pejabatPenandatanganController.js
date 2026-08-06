const { PejabatPenandatangan } = require('../models');

const ROLES = ['PENGGUNA_ANGGARAN', 'KUASA_PENGGUNA_ANGGARAN', 'KEPALA_DINAS', 'SEKRETARIS'];

/** Kolom gambar yang WAJIB melewati gerbang persetujuan_pemilik — tanda
 * tangan/cap adalah identitas pejabat sendiri, jadi tidak boleh tersimpan
 * tanpa persetujuan eksplisit dari pejabat ybs (lihat migrasi
 * 20260801190000). Ditegakkan di sini (bukan cuma UI) supaya panggilan API
 * langsung pun tetap kena aturan yang sama. */
const KOLOM_GAMBAR = ['tanda_tangan_url', 'cap_dinas_url'];

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
      // Gerbang persetujuan: baris yang membawa tanda_tangan_url/cap_dinas_url
      // WAJIB persetujuan_pemilik=true. Ini menegakkan aturan yang sama yang
      // dijelaskan ke user (2026-08-01) — gambar TTD/cap tidak boleh tersimpan
      // tanpa persetujuan eksplisit dari pejabat pemilik tanda tangan tsb.
      const tanpaPersetujuan = items.find(
        (item) => KOLOM_GAMBAR.some((k) => item[k]) && !item.persetujuan_pemilik,
      );
      if (tanpaPersetujuan) {
        return res.status(400).json({
          success: false,
          message: `Gambar tanda tangan/cap untuk peran ${tanpaPersetujuan.role} tidak dapat disimpan tanpa persetujuan_pemilik = true. Pastikan pejabat ybs telah menyetujui penyimpanan tanda tangan/cap elektroniknya.`,
        });
      }
      await PejabatPenandatangan.destroy({ where: { tahun: Number(tahun) } });
      const rows = items.map((item) => ({
        tahun: Number(tahun),
        role: item.role,
        nama: item.nama || '',
        nip: item.nip || '',
        jabatan: item.jabatan || '',
        tanda_tangan_url: item.tanda_tangan_url || null,
        cap_dinas_url: item.cap_dinas_url || null,
        persetujuan_pemilik: !!item.persetujuan_pemilik,
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

  // POST /api/pejabat-penandatangan/upload-gambar — unggah 1 file gambar (tanda
  // tangan atau cap dinas), kembalikan URL relatif untuk dipakai di saveBulk.
  // Tidak menyentuh tabel langsung — hanya menyimpan file & mengembalikan path,
  // supaya frontend tetap perlu menekan Simpan (dengan persetujuan_pemilik
  // tercentang) agar URL-nya benar-benar tertaut ke baris pejabat.
  async uploadGambar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File gambar wajib diunggah' });
      }
      const url = `/uploads/${req.file.filename}`;
      res.json({ success: true, url });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
};

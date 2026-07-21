"use strict";

const { syncRealisasiAnggaranTahun } = require("../services/renstraRealisasiAnggaranSyncService");

exports.sync = async (req, res) => {
  try {
    const tahun = req.body?.tahun || req.query?.tahun;

    if (!tahun) {
      return res.status(400).json({ message: "tahun wajib diisi" });
    }

    const hasil = await syncRealisasiAnggaranTahun(tahun);

    return res.json({
      message: `Realisasi anggaran tahun ${hasil.tahun} berhasil disinkronkan dari Penatausahaan`,
      ...hasil,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

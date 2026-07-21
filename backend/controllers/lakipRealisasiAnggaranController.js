"use strict";

const { syncRealisasiAnggaranLakipTahun } = require("../services/lakipRealisasiAnggaranSyncService");

exports.sync = async (req, res) => {
  try {
    const tahun = req.body?.tahun || req.query?.tahun;

    if (!tahun) {
      return res.status(400).json({ message: "tahun wajib diisi" });
    }

    const hasil = await syncRealisasiAnggaranLakipTahun(tahun);

    return res.json({
      message: `Realisasi anggaran LAKIP tahun ${hasil.tahun} berhasil disinkronkan dari Renstra`,
      ...hasil,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

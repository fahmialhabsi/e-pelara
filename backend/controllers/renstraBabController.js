// File: controllers/renstraBabController.js
const { RenstraBab } = require("../models");

exports.getBab = async (req, res) => {
  try {
    const { tahun, bab } = req.params;
    let row = await RenstraBab.findOne({ where: { tahun, bab } });
    if (!row) return res.json({ subbabList: [] });

    let isiParsed = [];
    try {
      isiParsed = typeof row.isi === "string" ? JSON.parse(row.isi) : row.isi;
    } catch (e) {
      console.error("Gagal parse isi:", e);
    }

    res.json({ subbabList: Array.isArray(isiParsed) ? isiParsed : [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateBab = async (req, res) => {
  try {
    const { tahun, bab } = req.params;
    const { subbabList, judul_bab } = req.body;

    await RenstraBab.upsert({
      tahun,
      bab,
      judul_bab: judul_bab || "",
      subbab: JSON.stringify(subbabList),
      isi: subbabList,
      updated_at: new Date(),
      updated_by: req.user?.nama || "admin",
      created_at: new Date(),
    });

    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

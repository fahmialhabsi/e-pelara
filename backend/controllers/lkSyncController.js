"use strict";

const db = require("../models");
const { syncDataKinerjaDariSigap } = require("../services/sigapKinerjaSyncService");

exports.syncKinerja = async (req, res) => {
  try {
    const tahun = Number(req.body?.tahun ?? req.query?.tahun);
    if (!tahun) return res.status(400).json({ message: "tahun wajib" });
    const out = await syncDataKinerjaDariSigap(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

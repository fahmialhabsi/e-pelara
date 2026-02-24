// controllers/targetsController.js
const { Sasaran } = require("../models");

exports.getAllTargets = async (req, res) => {
  try {
    const data = await Sasaran.findAll(); // atau pakai order jika perlu
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data sasaran", error });
  }
};

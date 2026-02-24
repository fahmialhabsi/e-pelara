// controllers/opdPenanggungJawabController.js
"use strict";
const { OpdPenanggungJawab } = require("../models");
const { sequelize } = require("../models");

// Create new OpdPenanggungJawab
exports.createOpdPenanggungJawab = async (req, res) => {
  try {
    const { nama_opd, nama_bidang_opd, nama, nip, jabatan } = req.body;

    const newEntry = await OpdPenanggungJawab.create({
      nama_opd,
      nama_bidang_opd,
      nama,
      nip,
      jabatan,
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating OpdPenanggungJawab" });
  }
};

// Get all OpdPenanggungJawab (tanpa pagination)
// Get all OpdPenanggungJawab dengan pagination opsional
exports.getOpdPenanggungJawabs = async (req, res) => {
  try {
    // Gunakan nilai default untuk pagination agar selalu konsisten
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit);

    if (!limit) {
      // Jika tidak ada limit, ambil semua data
      const result = await OpdPenanggungJawab.findAll({
        attributes: [
          "id",
          "nama_opd",
          "nama_bidang_opd",
          "nama",
          "nip",
          "jabatan",
        ],
        order: [["nama_opd", "ASC"]],
      });

      return res.status(200).json({
        totalData: result.length,
        data: result,
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await OpdPenanggungJawab.findAndCountAll({
      attributes: [
        "id",
        "nama_opd",
        "nama_bidang_opd",
        "nama",
        "nip",
        "jabatan",
      ],
      order: [["nama_opd", "ASC"]],
      limit,
      offset,
    });

    res.status(200).json({
      totalData: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data OPD Penanggung Jawab" });
  }
};

// Get OpdPenanggungJawab by ID
exports.getOpdPenanggungJawabById = async (req, res) => {
  try {
    const entry = await OpdPenanggungJawab.findByPk(req.params.id, {
      attributes: [
        "id",
        "nama_opd",
        "nama_bidang_opd",
        "nama",
        "nip",
        "jabatan",
      ],
    });

    if (entry) {
      res.status(200).json(entry);
    } else {
      res.status(404).json({ message: "OpdPenanggungJawab not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving OpdPenanggungJawab" });
  }
};

// Ambil distinct nama_opd & nama_bidang_opd
exports.getDropdownOPD = async (req, res) => {
  try {
    const data = await OpdPenanggungJawab.findAll({
      attributes: [
        [sequelize.fn("MIN", sequelize.col("id")), "id"], // ambil ID terkecil per grup
        "nama_opd",
        "nama_bidang_opd",
      ],
      group: ["nama_opd", "nama_bidang_opd"],
      order: [
        ["nama_opd", "ASC"],
        ["nama_bidang_opd", "ASC"],
      ],
    });

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data dropdown OPD" });
  }
};

// Update OpdPenanggungJawab
exports.updateOpdPenanggungJawab = async (req, res) => {
  try {
    const { nama_opd, nama_bidang_opd, nama, nip, jabatan } = req.body;

    const entry = await OpdPenanggungJawab.findByPk(req.params.id);

    if (entry) {
      await entry.update({
        nama_opd,
        nama_bidang_opd,
        nama,
        nip,
        jabatan,
      });

      res.status(200).json(entry);
    } else {
      res.status(404).json({ message: "OpdPenanggungJawab not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating OpdPenanggungJawab" });
  }
};

// Delete OpdPenanggungJawab
exports.deleteOpdPenanggungJawab = async (req, res) => {
  try {
    const entry = await OpdPenanggungJawab.findByPk(req.params.id);

    if (entry) {
      await entry.destroy();
      res.status(200).json({ message: "OpdPenanggungJawab deleted" });
    } else {
      res.status(404).json({ message: "OpdPenanggungJawab not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting OpdPenanggungJawab" });
  }
};

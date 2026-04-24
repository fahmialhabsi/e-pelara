// controllers/opdPenanggungJawabController.js
"use strict";
const { OpdPenanggungJawab } = require("../models");
const { sequelize } = require("../models");
const { listResponse } = require("../utils/responseHelper");

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

      return listResponse(
        res,
        200,
        "Daftar OPD penanggung jawab berhasil diambil",
        result,
        {
          totalItems: result.length,
          currentPage: 1,
          totalPages: 1,
        },
      );
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

    return listResponse(
      res,
      200,
      "Daftar OPD penanggung jawab berhasil diambil",
      rows,
      {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      },
    );
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

// Ambil dropdown OPD unik, dengan opsi sertakan bidang jika dibutuhkan.
// Strategi fallback bertahap agar hasil tidak pernah kosong akibat filter terlalu ketat:
//   1. Filter tahun (integer) + jenis_dokumen (case-insensitive via LOWER)
//   2. Jika kosong → hanya filter tahun
//   3. Jika masih kosong → hanya filter jenis_dokumen (case-insensitive)
//   4. Jika masih kosong → semua OPD tanpa filter (sumber data definitif)
exports.getDropdownOPD = async (req, res) => {
  try {
    const { tahun, jenis_dokumen, include_bidang } = req.query;

    const withBidang = include_bidang === "true";
    const attributes = [
      [sequelize.fn("MIN", sequelize.col("id")), "id"],
      // Daftar seluruh id opd_penanggung_jawab yang tergabung pada entri dropdown ini.
      // Dibutuhkan oleh UI untuk memetakan pilihan OPD (grouped) ke id yang dipakai di transaksi,
      // misalnya program.opd_penanggung_jawab.
      [sequelize.fn("GROUP_CONCAT", sequelize.col("id")), "opd_penanggung_jawab_ids"],
      "nama_opd",
    ];
    const group = ["nama_opd"];
    const order = [["nama_opd", "ASC"]];

    if (withBidang) {
      attributes.push("nama_bidang_opd");
      group.push("nama_bidang_opd");
      order.push(["nama_bidang_opd", "ASC"]);
    }

    const queryOpts = { attributes, group, order };

    // Bangun where-clause untuk setiap fallback tier.
    // tahun: cast ke Integer agar tidak ada mismatch tipe string vs INTEGER di kolom.
    // jenis_dokumen: LOWER() di sisi DB + toLowerCase() di sisi app → case-insensitive.
    const whereFull = {};
    const whereTahunOnly = {};
    const whereJenisOnly = {};

    if (tahun) {
      whereFull.tahun = parseInt(tahun, 10);
      whereTahunOnly.tahun = parseInt(tahun, 10);
    }
    if (jenis_dokumen) {
      whereFull.jenis_dokumen = sequelize.where(
        sequelize.fn("LOWER", sequelize.col("jenis_dokumen")),
        jenis_dokumen.toLowerCase()
      );
      whereJenisOnly.jenis_dokumen = sequelize.where(
        sequelize.fn("LOWER", sequelize.col("jenis_dokumen")),
        jenis_dokumen.toLowerCase()
      );
    }

    // Tier 1: filter penuh
    let data = await OpdPenanggungJawab.findAll({ where: whereFull, ...queryOpts });

    // Tier 2: hanya tahun (jika jenis_dokumen tidak cocok / case mismatch)
    if (data.length === 0 && tahun) {
      data = await OpdPenanggungJawab.findAll({ where: whereTahunOnly, ...queryOpts });
    }

    // Tier 3: hanya jenis_dokumen (jika tahun di tabel berbeda)
    if (data.length === 0 && jenis_dokumen) {
      data = await OpdPenanggungJawab.findAll({ where: whereJenisOnly, ...queryOpts });
    }

    // Tier 4: semua OPD tanpa filter — fallback definitif
    if (data.length === 0) {
      data = await OpdPenanggungJawab.findAll({ ...queryOpts });
    }

    return listResponse(res, 200, "Dropdown OPD berhasil diambil", data);
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

// controllers/rpjmdController.js
const { RPJMD } = require("../models"); // sesuaikan path sesuai struktur project

// Create new RPJMD entry
exports.createRPJMD = async (req, res) => {
  try {
    const {
      nama_rpjmd,
      kepala_daerah,
      wakil_kepala_daerah,
      periode_awal,
      periode_akhir,
      tahun_penetapan,
      akronim,
    } = req.body;

    let foto_kepala_daerah = null;
    let foto_wakil_kepala_daerah = null;

    if (req.files) {
      if (req.files.foto_kepala_daerah) {
        foto_kepala_daerah = req.files.foto_kepala_daerah[0].filename;
      }
      if (req.files.foto_wakil_kepala_daerah) {
        foto_wakil_kepala_daerah =
          req.files.foto_wakil_kepala_daerah[0].filename;
      }
    }

    const rpjmd = await RPJMD.create({
      nama_rpjmd,
      kepala_daerah,
      wakil_kepala_daerah,
      periode_awal,
      periode_akhir,
      tahun_penetapan,
      akronim,
      foto_kepala_daerah,
      foto_wakil_kepala_daerah,
    });

    res.status(201).json({ message: "RPJMD created successfully", rpjmd });
  } catch (err) {
    console.error("Error creating RPJMD:", err);
    res
      .status(500)
      .json({ message: "Error creating RPJMD", error: err.message });
  }
};

// Retrieve all RPJMD entries
exports.getRPJMD = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findAll();
    res.status(200).json(rpjmd);
  } catch (err) {
    console.error("Error fetching RPJMD:", err);
    res
      .status(500)
      .json({ message: "Error fetching RPJMD data", error: err.message });
  }
};

// Retrieve single RPJMD by ID
exports.getRPJMDById = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findByPk(req.params.id);
    if (!rpjmd) return res.status(404).json({ message: "RPJMD not found" });
    res.status(200).json(rpjmd);
  } catch (err) {
    console.error("Error fetching RPJMD by ID:", err);
    res
      .status(500)
      .json({ message: "Error fetching RPJMD", error: err.message });
  }
};

// Update existing RPJMD entry
exports.updateRPJMD = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findByPk(req.params.id);
    if (!rpjmd) return res.status(404).json({ message: "RPJMD not found" });

    if (req.files) {
      if (req.files.foto_kepala_daerah) {
        rpjmd.foto_kepala_daerah = req.files.foto_kepala_daerah[0].filename;
      }
      if (req.files.foto_wakil_kepala_daerah) {
        rpjmd.foto_wakil_kepala_daerah =
          req.files.foto_wakil_kepala_daerah[0].filename;
      }
    }

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && key in rpjmd) {
        rpjmd[key] = value;
      }
    });

    await rpjmd.save();
    res.json({ message: "RPJMD updated successfully", rpjmd });
  } catch (err) {
    console.error("Error updating RPJMD:", err);
    res
      .status(500)
      .json({ message: "Error updating RPJMD", error: err.message });
  }
};

// Delete RPJMD entry
exports.deleteRPJMD = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findByPk(req.params.id);
    if (!rpjmd) return res.status(404).json({ message: "RPJMD not found" });

    await rpjmd.destroy();
    res.json({ message: "RPJMD deleted successfully" });
  } catch (err) {
    console.error("Error deleting RPJMD:", err);
    res
      .status(500)
      .json({ message: "Error deleting RPJMD", error: err.message });
  }
};

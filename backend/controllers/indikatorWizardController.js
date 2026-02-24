// controllers/indikatorWizardController.js

const { Indikator, IndikatorDetail } = require("../models");

const stageConfig = {
  misi: {
    required: ["misi_id"],
    defaults: { stage: "misi" },
  },
  tujuan: {
    required: [
      "tujuan_id",
      "kode_indikator",
      "nama_indikator",
      "satuan",
      "tipe_indikator",
    ],
    defaults: { stage: "tujuan" },
  },
  sasaran: {
    required: ["sasaran_id", "kode_sasaran"],
    defaults: { stage: "sasaran" },
  },
  program: {
    required: ["program_id"],
    defaults: { stage: "program" },
  },
  kegiatan: {
    required: ["kegiatan_id"],
    defaults: { stage: "kegiatan" },
  },
};

async function countIndikatorWizard(req, res, next) {
  try {
    const total = await Indikator.count();
    res.json({
      data: [],
      meta: { total },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  countIndikatorWizard,
  // ============================
  // Step 1: Buat draft dengan misi_id
  // ============================
  async createDraft(req, res, next) {
    try {
      console.log("Payload Diterima:", req.body);
      const { misi_id, jenis_dokumen, tahun } = req.body;
      if (!misi_id) {
        return res
          .status(400)
          .json({ status: "error", message: "misi_id wajib diisi" });
      }

      const draft = await Indikator.create({
        misi_id,
        stage: "misi",
        jenis_dokumen,
        tahun,
      });
      return res.status(201).json({
        status: "success",
        data: { id: draft.id, stage: draft.stage, misi_id: draft.misi_id },
      });
    } catch (e) {
      console.error("Error saat membuat draft.", e);
      next(e);
    }
  },

  // ============================
  // Steps 2–5: Update berdasarkan stage
  // ============================
  async updateStep(req, res, next) {
    try {
      const { id } = req.params;
      const { stage, ...fields } = req.body;
      const config = stageConfig[stage];

      if (!config) {
        return res.status(400).json({
          status: "error",
          message: `Stage tidak valid: ${stage}`,
        });
      }

      // Validasi field wajib
      const missing = config.required.filter(
        (f) => fields[f] === undefined || fields[f] === ""
      );
      if (missing.length) {
        return res.status(400).json({
          status: "error",
          message: `Field berikut wajib diisi pada stage '${stage}': ${missing.join(
            ", "
          )}`,
        });
      }

      // Lakukan update
      const [updatedCount] = await Indikator.update(
        { ...fields, stage: config.defaults.stage },
        { where: { id } }
      );

      if (!updatedCount) {
        return res.status(404).json({
          status: "error",
          message: "Indikator tidak ditemukan",
        });
      }

      return res.json({
        status: "success",
        data: { id, stage: config.defaults.stage },
        message: `Stage '${stage}' berhasil disimpan`,
      });
    } catch (error) {
      next(error);
    }
  },

  // ============================
  // Step final: Simpan detail kinerjaRows
  // ============================
  async addDetail(req, res, next) {
    try {
      const { id } = req.params;
      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

      if (!rows.length) {
        return res.status(400).json({
          status: "error",
          message: "Tidak ada data rows yang dikirim",
        });
      }

      const created = await Promise.all(
        rows.map((r) =>
          IndikatorDetail.create({
            indikator_id: id,
            jenis: r.jenis,
            tolok_ukur: r.tolok_ukur,
            target_kinerja: r.target_kinerja,
          })
        )
      );

      return res.status(201).json({
        status: "success",
        data: created,
      });
    } catch (error) {
      console.error("Error detail:", error);
      next(error);
    }
  },

  // ============================
  // Utility: Ambil by stage
  // ============================
  async getByStage(req, res, next) {
    try {
      const { stage } = req.query;
      if (!stageConfig[stage]) {
        return res.status(400).json({
          status: "error",
          message: `Stage tidak valid: ${stage}`,
        });
      }

      const list = await Indikator.findAll({
        where: { stage },
        include: [
          {
            model: IndikatorDetail,
            as: "details",
          },
        ],
      });

      return res.json({
        status: "success",
        data: list,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteIndikator(req, res, next) {
    try {
      const { id } = req.params;

      // Hapus detail terkait dulu
      await IndikatorDetail.destroy({ where: { indikator_id: id } });

      // Lalu hapus indikator utama
      const deleted = await Indikator.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({
          status: "error",
          message: "Indikator tidak ditemukan",
        });
      }

      return res.json({
        status: "success",
        message: "Indikator dan detail berhasil dihapus",
      });
    } catch (error) {
      next(error);
    }
  },
};

const {
  IndikatorMisi,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorProgram,
  IndikatorKegiatan,
  PrioritasNasional,
  PrioritasDaerah,
  PrioritasGubernur,
  Realisasi,
  Capaian,
} = require("../models");

module.exports = {
  async getIndikatorPerencanaan(req, res) {
    try {
      const { tahun } = req.query;

      const data = await IndikatorMisi.findAll({
        include: [
          {
            model: IndikatorTujuan,
            as: "IndikatorTujuans",
            include: [
              {
                model: IndikatorSasaran,
                as: "IndikatorSasarans",
                include: [
                  {
                    model: IndikatorProgram,
                    as: "IndikatorPrograms",
                    include: [
                      {
                        model: IndikatorKegiatan,
                        as: "IndikatorKegiatans",
                        where: {
                          ...(tahun && { tahun }),
                          tahap: "perencanaan",
                        },
                        include: [
                          { model: PrioritasNasional, as: "PrioritasNasional" },
                          { model: PrioritasDaerah, as: "PrioritasDaerah" },
                          { model: PrioritasGubernur, as: "PrioritasGubernur" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data indikator perencanaan",
        error: err.message,
      });
    }
  },

  async getIndikatorPelaksanaan(req, res) {
    try {
      const { tahun } = req.query;

      const data = await IndikatorKegiatan.findAll({
        where: {
          ...(tahun && { tahun }),
          tahap: "pelaksanaan",
        },
        include: [
          { model: IndikatorProgram, as: "IndikatorProgram" },
          { model: PrioritasNasional, as: "PrioritasNasional" },
          { model: PrioritasDaerah, as: "PrioritasDaerah" },
          { model: PrioritasGubernur, as: "PrioritasGubernur" },
          { model: Realisasi, as: "Realisasis" },
        ],
      });

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data indikator pelaksanaan",
        error: err.message,
      });
    }
  },

  async getIndikatorEvaluasi(req, res) {
    try {
      const { tahun } = req.query;

      const data = await IndikatorKegiatan.findAll({
        where: {
          ...(tahun && { tahun }),
          tahap: "evaluasi",
        },
        include: [
          { model: IndikatorProgram, as: "IndikatorProgram" },
          { model: PrioritasNasional, as: "PrioritasNasional" },
          { model: PrioritasDaerah, as: "PrioritasDaerah" },
          { model: PrioritasGubernur, as: "PrioritasGubernur" },
          { model: Capaian, as: "Capaians" },
        ],
      });

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data indikator evaluasi",
        error: err.message,
      });
    }
  },
};

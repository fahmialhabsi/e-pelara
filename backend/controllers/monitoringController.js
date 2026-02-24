// controllers/monitoringController.js

const {
  Misi,
  Tujuan,
  Sasaran,
  Program,
  Kegiatan,
  IndikatorMisi,
  IndikatorTujuan,
  IndikatorSasaran,
} = require("../models");

module.exports = {
  // Menampilkan semua Misi dengan Tujuan, Sasaran, Program, dan Kegiatan yang terkait
  async getMonitoring(req, res) {
    try {
      const misiData = await Misi.findAll({
        include: [
          {
            model: Tujuan,
            as: "tujuan",
            include: [
              {
                model: Sasaran,
                as: "sasaran",
                include: [
                  {
                    model: Program,
                    as: "program",
                    include: [
                      {
                        model: Kegiatan,
                        as: "kegiatan",
                      },
                    ],
                  },
                ],
              },
              {
                model: IndikatorTujuan,
                as: "indikatorTujuan",
              },
            ],
          },
          {
            model: IndikatorMisi,
            as: "indikatormisi",
          },
        ],
      });

      return res.status(200).json({
        status: "success",
        data: misiData,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },

  // Monitoring Kegiatan berdasarkan ID Misi dan ID Program
  async getKegiatanByMisi(req, res) {
    const { misiId, programId } = req.params;

    try {
      const kegiatanData = await Kegiatan.findAll({
        where: { program_id: programId, rpjmd_id: misiId },
        include: [
          {
            model: Program,
            as: "program",
            where: { id: programId },
          },
        ],
      });

      return res.status(200).json({
        status: "success",
        data: kegiatanData,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },

  // Menampilkan Indikator untuk Sasaran
  async getIndikatorBySasaran(req, res) {
    const { sasaranId } = req.params;

    try {
      const indikatorSasaran = await IndikatorSasaran.findAll({
        where: { sasaran_id: sasaranId },
        include: [
          {
            model: IndikatorTujuan,
            as: "tujuan",
            include: [
              {
                model: IndikatorMisi,
                as: "misi",
              },
            ],
          },
        ],
      });

      return res.status(200).json({
        status: "success",
        data: indikatorSasaran,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },
};

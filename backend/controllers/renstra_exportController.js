const {
  RenstraTujuan,
  RenstraSasaran,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  IndikatorRenstra,
  RenstraTarget,
} = require("../models");

class RenstraExportController {
  // ✅ Ambil data full hierarki sesuai format Excel Renstra
  static async getAll(req, res) {
    try {
      const data = await RenstraTujuan.findAll({
        include: [
          {
            model: RenstraSasaran,
            as: "sasarans",
            include: [
              {
                model: RenstraProgram,
                as: "programs",
                include: [
                  {
                    model: RenstraKegiatan,
                    as: "kegiatans",
                    include: [
                      {
                        model: RenstraSubkegiatan,
                        as: "subkegiatans",
                        include: [
                          {
                            model: IndikatorRenstra,
                            as: "indikators",
                            include: [
                              {
                                model: RenstraTarget,
                                as: "targets",
                                order: [["tahun", "ASC"]],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        order: [["id", "ASC"]],
      });

      return res.status(200).json({
        message: "Data Renstra berhasil diambil",
        data,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Gagal mengambil data Renstra untuk export",
        error: error.message,
      });
    }
  }
}

module.exports = RenstraExportController;

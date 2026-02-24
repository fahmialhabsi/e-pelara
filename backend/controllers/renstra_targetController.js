const {
  RenstraTarget,
  IndikatorRenstra,
  RenstraTargetDetail,
  sequelize,
} = require("../models");

class RenstraTargetController {
  // ✅ Create atau Update target multi-tahun
  static async create(req, res) {
    try {
      const {
        indikator_id,
        lokasi,
        capaian_program,
        capaian_kegiatan,
        capaian_subkegiatan,
        satuan_program,
        pagu_program,
        satuan_kegiatan,
        pagu_kegiatan,
        satuan_subkegiatan,
        pagu_subkegiatan,
        details,
      } = req.body;

      const target = await RenstraTarget.create({
        indikator_id,
        lokasi,
        capaian_program,
        capaian_kegiatan,
        capaian_subkegiatan,
        satuan_program,
        pagu_program,
        satuan_kegiatan,
        pagu_kegiatan,
        satuan_subkegiatan,
        pagu_subkegiatan,
      });

      if (Array.isArray(details)) {
        await RenstraTargetDetail.bulkCreate(
          details.map((d) => ({
            renstra_target_id: target.id,
            level: d.level,
            tahun: d.tahun,
            target_value: d.target_value,
          })),
          { updateOnDuplicate: ["target_value", "level"] }
        );
      }

      res.status(201).json({ message: "Target berhasil dibuat", data: target });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal membuat target", error: err.message });
    }
  }

  // ✅ Get semua target lengkap dengan detail multi-tahun
  static async getAll(req, res) {
    try {
      const data = await RenstraTarget.findAll({
        include: [
          { model: RenstraTargetDetail, as: "details" },
          { model: IndikatorRenstra, as: "indikator" },
        ],
        order: [["id", "ASC"]],
      });
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal mengambil data", error: err.message });
    }
  }

  // ✅ Get target by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await RenstraTarget.findByPk(id, {
        include: [{ model: RenstraTargetDetail, as: "details" }],
      });
      if (!data)
        return res.status(404).json({ message: "Target tidak ditemukan" });
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal mengambil data", error: err.message });
    }
  }

  // ✅ Update target multi-tahun
  static async update(req, res) {
    try {
      const { id } = req.params;
      const target = await RenstraTarget.findByPk(id);
      if (!target)
        return res.status(404).json({ message: "Target tidak ditemukan" });

      const { details, ...mainData } = req.body;
      await target.update(mainData);

      if (Array.isArray(details)) {
        await RenstraTargetDetail.destroy({ where: { renstra_target_id: id } });
        for (const d of details) {
          await RenstraTargetDetail.create({
            renstra_target_id: id,
            level: d.level,
            tahun: d.tahun,
            target_value: d.target_value,
          });
        }
      }

      res
        .status(200)
        .json({ message: "Target berhasil diperbarui", data: target });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal memperbarui target", error: err.message });
    }
  }

  // ✅ Delete target
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const target = await RenstraTarget.findByPk(id);
      if (!target)
        return res.status(404).json({ message: "Target tidak ditemukan" });

      await target.destroy();
      res.status(200).json({ message: "Target berhasil dihapus" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal menghapus target", error: err.message });
    }
  }

  // ✅ Get daftar tahun (untuk frontend TargetRenstra.jsx)
  static async getYears(req, res) {
    try {
      // Hardcoded, bisa diganti query dari database jika tersedia
      const years = await RenstraTargetDetail.findAll({
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("tahun")), "tahun"],
        ],
        raw: true,
      });
      res.json(years.map((y) => y.tahun).sort());
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Gagal mengambil daftar tahun", error: err.message });
    }
  }
}

module.exports = RenstraTargetController;

const {
  RenstraTarget,
  IndikatorRenstra,
  RenstraTargetDetail,
  RenstraOPD,
  sequelize,
} = require("../models");

function toInt(v) {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function uniq(arr) {
  return [...new Set(arr)];
}

async function expectedYearsForIndikator(indikator_id) {
  const id = toInt(indikator_id);
  if (!id) return { ok: false, message: "indikator_id tidak valid." };

  const indikator = await IndikatorRenstra.findByPk(id, {
    attributes: ["id", "renstra_id"],
  });
  if (!indikator) return { ok: false, message: "Indikator Renstra tidak ditemukan." };

  const rid = toInt(indikator.renstra_id);
  if (!rid) {
    return {
      ok: false,
      message: "Indikator Renstra tidak terhubung ke renstra_id yang valid.",
    };
  }

  const renstra = await RenstraOPD.findByPk(rid, {
    attributes: ["id", "tahun_mulai", "tahun_akhir"],
  });
  if (!renstra) return { ok: false, message: "Renstra OPD tidak ditemukan untuk indikator ini." };

  const start = toInt(renstra.tahun_mulai);
  const end = toInt(renstra.tahun_akhir);
  if (!start || !end || start > end || end - start > 10) {
    return {
      ok: false,
      message: "Rentang tahun Renstra OPD tidak valid untuk validasi target tahunan.",
    };
  }

  const years = [];
  for (let y = start; y <= end; y += 1) years.push(y);
  return { ok: true, years, renstra_id: rid };
}

function validateDetailsShape(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return { ok: false, message: "details wajib diisi (array) dan tidak boleh kosong." };
  }
  for (const d of details) {
    const tahun = Number.parseInt(String(d?.tahun ?? "").trim(), 10);
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
      return { ok: false, message: "details.tahun harus angka valid (2000-2100)." };
    }
    if (d?.target_value === undefined || d?.target_value === null || String(d.target_value).trim() === "") {
      return { ok: false, message: "details.target_value wajib diisi." };
    }
    if (!/^-?\d+(\.\d+)?$/.test(String(d.target_value).trim())) {
      return { ok: false, message: "details.target_value harus angka desimal." };
    }
    if (d?.level !== undefined && d?.level !== null && typeof d.level !== "string") {
      return { ok: false, message: "details.level harus string bila diisi." };
    }
  }
  return { ok: true };
}

function validateDetailsComplete({ details, expectedYears }) {
  const years = uniq(details.map((d) => Number.parseInt(String(d.tahun), 10)));
  const missing = expectedYears.filter((y) => !years.includes(y));
  if (missing.length) {
    return {
      ok: false,
      message: `Target tahunan belum lengkap. Tahun yang hilang: ${missing.join(", ")}.`,
    };
  }
  // duplikat tahun+level dalam payload
  const seen = new Set();
  for (const d of details) {
    const key = `${d.level ?? ""}::${Number.parseInt(String(d.tahun), 10)}`;
    if (seen.has(key)) {
      return {
        ok: false,
        message: "details mengandung duplikasi (tahun + level) pada payload.",
      };
    }
    seen.add(key);
  }
  return { ok: true };
}

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

      const shape = validateDetailsShape(details);
      if (!shape.ok) {
        return res.status(400).json({ message: shape.message });
      }

      const exp = await expectedYearsForIndikator(indikator_id);
      if (!exp.ok) {
        return res.status(400).json({ message: exp.message });
      }

      const complete = validateDetailsComplete({ details, expectedYears: exp.years });
      if (!complete.ok) {
        return res.status(400).json({ message: complete.message });
      }

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

      // Safe enforcement untuk data existing:
      // - Jika client mengirim details, wajib lengkap.
      // - Jika tidak mengirim details, tidak memaksa agar edit field lain tidak memblok data lama.
      if (details !== undefined) {
        const shape = validateDetailsShape(details);
        if (!shape.ok) {
          return res.status(400).json({ message: shape.message });
        }
        const exp = await expectedYearsForIndikator(target.indikator_id);
        if (!exp.ok) {
          return res.status(400).json({ message: exp.message });
        }
        const complete = validateDetailsComplete({ details, expectedYears: exp.years });
        if (!complete.ok) {
          return res.status(400).json({ message: complete.message });
        }

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

// backend/controllers/arahKebijakanController.js

const {
  ArahKebijakan,
  Strategi,
  Sasaran,
  Tujuan,
  Program,
} = require("../models");
const { Op } = require("sequelize");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { listResponse } = require("../utils/responseHelper");

/**
 * Samakan awalan kode SST strategi dengan nomor sasaran (ST… → SST…).
 * Menangani kode_strategi di DB yang tidak selaras (mis. SST1-01-02.1 untuk sasaran ST3-01-02).
 */
function canonicalSstKodeForArah(strategi) {
  const raw = String(strategi?.kode_strategi || "").trim();
  const nom = strategi?.Sasaran?.nomor;
  if (!nom) return raw || "";
  const sasSst = String(nom).replace(/^ST/, "SST");
  if (!raw) return `${sasSst}.1`;
  if (raw.startsWith(sasSst)) return raw;
  const m = raw.match(/\.(\d+)$/);
  const suffix = m ? `.${m[1]}` : ".1";
  return `${sasSst}${suffix}`;
}

function arahKodePrefixFromStrategi(strategi) {
  return canonicalSstKodeForArah(strategi).replace(/^SST/, "ASST");
}

module.exports = {
  async create(req, res) {
    try {
      const {
        strategi_id: sidRaw,
        deskripsi,
        jenis_dokumen,
        tahun,
      } = req.body;
      const strategi_id = parseInt(String(sidRaw), 10);

      if (
        !Number.isFinite(strategi_id) ||
        strategi_id < 1 ||
        !deskripsi ||
        !jenis_dokumen ||
        !tahun
      ) {
        return res.status(400).json({
          message:
            "Field strategi_id (angka valid), deskripsi, jenis_dokumen, dan tahun wajib diisi.",
        });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res
          .status(400)
          .json({ message: "Periode tidak ditemukan untuk tahun tersebut." });
      }
      const periode_id = periode.id;

      const strategi = await Strategi.findByPk(strategi_id, {
        include: [
          { model: Sasaran, as: "Sasaran", attributes: ["id", "nomor"] },
        ],
      });
      if (!strategi) {
        return res.status(404).json({ message: "Strategi tidak ditemukan." });
      }

      // Samakan awalan ASST dengan nomor sasaran (ST→SST) bila kode_strategi di DB tidak selaras.
      const prefix = arahKodePrefixFromStrategi(strategi);

      // Cari semua kode_arah yang dimulai dengan prefix + '.'
      const existing = await ArahKebijakan.findAll({
        where: {
          strategi_id,
          jenis_dokumen,
          tahun,
          periode_id,
          kode_arah: { [Op.like]: `${prefix}.%` },
        },
        attributes: ["kode_arah"],
      });

      // Ambil angka setelah prefix (setelah titik terakhir)
      const usedNumbers = existing
        .map((s) => {
          const kode = s.kode_arah;
          if (kode.startsWith(prefix + ".")) {
            // Ambil bagian setelah prefix + '.'
            const suffix = kode.slice(prefix.length + 1);
            const number = parseInt(suffix, 10);
            return isNaN(number) ? null : number;
          }
          return null;
        })
        .filter((n) => n !== null);

      const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;

      const kode_arah = `${prefix}.${nextNumber}`;

      // Validasi kombinasi unik sebelum create
      const duplicate = await ArahKebijakan.findOne({
        where: {
          strategi_id,
          kode_arah,
          deskripsi: { [Op.like]: deskripsi.trim().slice(0, 100) },
          jenis_dokumen: { [Op.like]: jenis_dokumen.trim().slice(0, 100) },
          tahun,
          periode_id,
        },
      });
      if (duplicate) {
        return res.status(409).json({
          message: "Data arah kebijakan sudah ada (duplikat kombinasi unik).",
        });
      }

      const arah = await ArahKebijakan.create({
        strategi_id,
        kode_arah,
        deskripsi,
        jenis_dokumen,
        tahun,
        periode_id,
      });

      return res.status(201).json(arah);
    } catch (err) {
      console.error("Gagal membuat arah kebijakan:", err);
      return res.status(400).json({
        error:
          err.name === "SequelizeUniqueConstraintError"
            ? err.errors?.[0]?.message || "Data duplikat."
            : err.message,
      });
    }
  },

  async getAll(req, res) {
    try {
      const jenis_dokumen = (req.query.jenis_dokumen || "").toLowerCase();
      const { tahun, search, strategi_id } = req.query;

      if (!jenis_dokumen || !tahun) {
        return res
          .status(400)
          .json({ message: "jenis_dokumen dan tahun wajib diisi." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
      const offset = (page - 1) * limit;

      const where = { jenis_dokumen, tahun, periode_id };

      if (search) {
        where.deskripsi = { [Op.like]: `%${search}%` };
      }

      if (strategi_id) {
        const ids = strategi_id
          .split(",")
          .map((id) => parseInt(id, 10))
          .filter(Boolean);
        if (ids.length === 1) where.strategi_id = ids[0];
        else if (ids.length > 1) where.strategi_id = { [Op.in]: ids };
      }

      const { count, rows } = await ArahKebijakan.findAndCountAll({
        where,
        limit,
        offset,
        subQuery: false,
        distinct: true,
        include: [
          {
            model: Strategi,
            as: "Strategi",
            attributes: [
              "id",
              "kode_strategi",
              "deskripsi",
              "periode_id",
              "tahun",
            ],
            include: [
              {
                model: Sasaran,
                as: "Sasaran",
                attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
                include: [
                  {
                    model: Tujuan,
                    as: "Tujuan",
                    attributes: ["id", "no_tujuan", "isi_tujuan"],
                  },
                ],
              },
            ],
          },
        ],
        order: [["kode_arah", "ASC"]],
      });

      let finalRows = rows;
      let finalCount = count;

      if (finalCount === 0 && strategi_id && jenis_dokumen !== "rpjmd") {
        const selectedIds = strategi_id
          .split(",")
          .map((id) => parseInt(id, 10))
          .filter(Boolean);

        const selectedStrategi = selectedIds.length
          ? await Strategi.findByPk(selectedIds[0], {
              attributes: ["id", "kode_strategi", "jenis_dokumen"],
            })
          : null;

        let fallbackStrategiId = null;
        if (selectedStrategi?.jenis_dokumen === "rpjmd") {
          fallbackStrategiId = selectedStrategi.id;
        } else if (selectedStrategi?.kode_strategi) {
          const sourceStrategi = await Strategi.findOne({
            where: {
              kode_strategi: selectedStrategi.kode_strategi,
              jenis_dokumen: "rpjmd",
              tahun,
            },
            attributes: ["id"],
          });
          fallbackStrategiId = sourceStrategi?.id || null;
        }

        if (fallbackStrategiId) {
          const fallbackWhere = { jenis_dokumen: "rpjmd", tahun, strategi_id: fallbackStrategiId };
          if (search) {
            fallbackWhere.deskripsi = { [Op.like]: `%${search}%` };
          }

          const fallback = await ArahKebijakan.findAndCountAll({
            where: fallbackWhere,
            limit,
            offset,
            subQuery: false,
            distinct: true,
            include: [
              {
                model: Strategi,
                as: "Strategi",
                attributes: [
                  "id",
                  "kode_strategi",
                  "deskripsi",
                  "periode_id",
                  "tahun",
                ],
                include: [
                  {
                    model: Sasaran,
                    as: "Sasaran",
                    attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
                    include: [
                      {
                        model: Tujuan,
                        as: "Tujuan",
                        attributes: ["id", "no_tujuan", "isi_tujuan"],
                      },
                    ],
                  },
                ],
              },
            ],
            order: [["kode_arah", "ASC"]],
          });

          finalRows = fallback.rows;
          finalCount = fallback.count;
        }
      }

      return listResponse(
        res,
        200,
        "Daftar arah kebijakan berhasil diambil",
        finalRows.map((arah) => ({
          ...arah.toJSON(),
          strategi_id: Number(arah.strategi_id),
          id: Number(arah.id),
        })),
        {
          totalItems: finalCount,
          totalPages: Math.ceil(finalCount / limit),
          currentPage: page,
          ...(finalCount === 0 && search
            ? { message: "Tidak ada yang cocok dengan pencarian." }
            : {}),
        }
      );
    } catch (err) {
      console.error("Gagal mengambil data arah kebijakan:", err);
      return res.status(500).json({
        message: "Terjadi kesalahan saat mengambil arah kebijakan.",
        error: err.message,
      });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;

      const arah = await ArahKebijakan.findByPk(id, {
        include: [
          {
            model: Strategi,
            as: "Strategi",
            attributes: ["id", "kode_strategi", "deskripsi", "sasaran_id"],
            include: [
              {
                model: Sasaran,
                as: "Sasaran",
                attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
                include: [
                  {
                    model: Tujuan,
                    as: "Tujuan",
                    attributes: ["id", "no_tujuan", "isi_tujuan"],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!arah) {
        return res
          .status(404)
          .json({ error: "ArahKebijakan tidak ditemukan." });
      }

      return res.status(200).json(arah);
    } catch (err) {
      console.error("Gagal mengambil arah kebijakan:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  async nextKode(req, res) {
    try {
      const { strategi_id, jenis_dokumen, tahun } = req.query;

      if (!strategi_id || !jenis_dokumen || !tahun) {
        return res.status(400).json({
          message: "strategi_id, jenis_dokumen, dan tahun wajib diisi.",
        });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      const strategi = await Strategi.findByPk(strategi_id, {
        include: [
          { model: Sasaran, as: "Sasaran", attributes: ["id", "nomor"] },
        ],
      });
      if (!strategi) {
        return res.status(404).json({ message: "Strategi tidak ditemukan." });
      }

      const prefix = arahKodePrefixFromStrategi(strategi);

      // Ambil semua kode yang sama dengan prefix atau mulai dengan prefix + '.'
      const existing = await ArahKebijakan.findAll({
        where: {
          strategi_id,
          jenis_dokumen,
          tahun,
          periode_id,
          kode_arah: {
            [Op.or]: [prefix, { [Op.like]: `${prefix}.%` }],
          },
        },
        attributes: ["kode_arah"],
      });

      // Ambil nomor urut paling akhir
      const nomorList = existing
        .map((a) => {
          const parts = a.kode_arah.split(".");
          return parts.length > 0 ? Number(parts[parts.length - 1]) : 0;
        })
        .filter((n) => !isNaN(n));

      const nextNumber = nomorList.length ? Math.max(...nomorList) + 1 : 1;
      const kode_arah = `${prefix}.${nextNumber}`;

      return res.status(200).json({ kode_arah });
    } catch (err) {
      console.error("Gagal menghasilkan kode arah:", err);
      return res.status(500).json({
        message: "Gagal menghasilkan kode.",
        error: err.message,
      });
    }
  },

  async byProgram(req, res) {
    try {
      const { programId } = req.params;
      const list = await ArahKebijakan.findAll({
        include: [
          {
            model: Program,
            as: "Program",
            where: { id: programId },
            attributes: [],
          },
        ],
        group: ["ArahKebijakan.id"],
      });

      return listResponse(
        res,
        200,
        "Daftar arah kebijakan berdasarkan program berhasil diambil",
        list
      );
    } catch (err) {
      console.error("Gagal memuat arah kebijakan:", err);
      return res.status(500).json({ message: "Gagal memuat arah kebijakan." });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { strategi_id, kode_arah, deskripsi, jenis_dokumen, tahun } =
        req.body;

      if (
        !strategi_id ||
        !kode_arah ||
        !deskripsi ||
        !jenis_dokumen ||
        !tahun
      ) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res
          .status(400)
          .json({ message: "Periode tidak ditemukan untuk tahun tersebut." });
      }

      const periode_id = periode.id;

      const arah = await ArahKebijakan.findByPk(id);
      if (!arah) {
        return res
          .status(404)
          .json({ error: "ArahKebijakan tidak ditemukan." });
      }

      // ✅ Validasi kombinasi unik selain dirinya
      const duplicate = await ArahKebijakan.findOne({
        where: {
          strategi_id,
          kode_arah,
          deskripsi: { [Op.like]: deskripsi.trim().slice(0, 100) },
          jenis_dokumen: { [Op.like]: jenis_dokumen.trim().slice(0, 100) },
          tahun,
          periode_id,
          id: { [Op.ne]: id },
        },
      });
      if (duplicate) {
        return res.status(409).json({
          message: "Data arah kebijakan sudah ada (duplikat kombinasi unik).",
        });
      }

      await arah.update({
        strategi_id,
        kode_arah,
        deskripsi,
        jenis_dokumen,
        tahun,
        periode_id,
      });

      return res.status(200).json(arah);
    } catch (err) {
      console.error("Gagal memperbarui arah kebijakan:", err);
      return res.status(400).json({
        error:
          err.name === "SequelizeUniqueConstraintError"
            ? err.errors?.[0]?.message || "Data duplikat."
            : err.message,
      });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ArahKebijakan.destroy({ where: { id } });

      if (!deleted) {
        return res
          .status(404)
          .json({ error: "ArahKebijakan tidak ditemukan." });
      }

      return res.status(204).send();
    } catch (err) {
      console.error("Gagal menghapus arah kebijakan:", err);
      return res.status(500).json({ error: err.message });
    }
  },
};

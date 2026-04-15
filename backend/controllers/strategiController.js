const { Strategi, Sasaran, Tujuan, Misi, ArahKebijakan } = require("../models");
const { Op, Sequelize } = require("sequelize");
const {
  getPeriodeFromTahun,
  getPeriodeIdFromTahun,
} = require("../utils/periodeHelper");
const {
  autoCloneStrategiIfNeeded,
} = require("../utils/autoCloneStrategiIfNeeded");
const { listResponse } = require("../utils/responseHelper");

const redisClient = require("../utils/redisClient");

const strategiController = {
  async getAll(req, res) {
    try {
      const { sasaran_id, tahun, jenis_dokumen, search } = req.query;

      if (!tahun || !jenis_dokumen) {
        return res.status(400).json({
          error: "Parameter 'tahun' dan 'jenis_dokumen' wajib diisi.",
        });
      }

      // Ambil periode
      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ error: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      // Key cache untuk cloning strategi
      const cacheKey = `strategi:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
      const cacheExists = await redisClient.exists(cacheKey);

      // Clone strategi hanya sekali per kombinasi periode_id, jenis_dokumen, tahun
      if (!cacheExists) {
        await autoCloneStrategiIfNeeded({
          jenis_dokumen,
          tahun: String(tahun),
          sasaran_id: sasaran_id ? Number(sasaran_id) : undefined,
          periode_id,
        });
        await redisClient.set(cacheKey, "1");
      } else {
        console.log(
          "\x1b[33m⏩ Skip cloning — sudah pernah diclone sebelumnya.\x1b[0m"
        );
      }

      // Build kondisi pencarian
      const where = {
        jenis_dokumen,
        tahun: String(tahun),
        periode_id,
        ...(sasaran_id && { sasaran_id }),
      };

      if (search) {
        const esc = search.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`);
        where[Op.or] = [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Strategi.kode_strategi")),
            { [Op.like]: `%${esc}%` }
          ),
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Strategi.deskripsi")),
            { [Op.like]: `%${esc}%` }
          ),
        ];
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const offset = (page - 1) * limit;

      const { count, rows } = await Strategi.findAndCountAll({
        where,
        limit,
        offset,
        distinct: true,
        attributes: [
          "id",
          "kode_strategi",
          "deskripsi",
          "sasaran_id",
          "periode_id",
          "jenis_dokumen",
          "tahun",
        ],
        include: [
          {
            model: Sasaran,
            as: "Sasaran",
            attributes: ["id", "nomor", "isi_sasaran"],
            include: [
              {
                model: Tujuan,
                as: "Tujuan",
                attributes: ["id", "no_tujuan", "isi_tujuan", "misi_id"],
                include: [
                  {
                    model: Misi,
                    as: "Misi",
                    attributes: ["id", "no_misi", "isi_misi"],
                  },
                ],
              },
            ],
          },
        ],
        order: [["kode_strategi", "ASC"]],
      });

      let finalRows = rows;
      let finalCount = count;

      if (sasaran_id) {
        const currentSasaran = await Sasaran.findByPk(sasaran_id, {
          attributes: ["id", "nomor", "rpjmd_id", "jenis_dokumen"],
        });
        const expectedPrefix = currentSasaran?.nomor?.replace(/^ST/, "SST");

        if (expectedPrefix) {
          finalRows = rows.filter((item) =>
            String(item.kode_strategi || "").startsWith(expectedPrefix)
          );
          finalCount = finalRows.length;
        }

        if (
          finalCount === 0 &&
          jenis_dokumen !== "rpjmd" &&
          currentSasaran
        ) {
          let fallbackSasaranId = null;
          if (currentSasaran.jenis_dokumen === "rpjmd") {
            fallbackSasaranId = currentSasaran.id;
          } else if (currentSasaran.rpjmd_id) {
            fallbackSasaranId = currentSasaran.rpjmd_id;
          } else if (currentSasaran.nomor) {
            const mappedSasaran = await Sasaran.findOne({
              where: {
                nomor: currentSasaran.nomor,
                jenis_dokumen: "rpjmd",
                tahun: String(tahun),
              },
              attributes: ["id"],
            });
            fallbackSasaranId = mappedSasaran?.id || null;
          }

          if (!fallbackSasaranId) {
            return listResponse(
              res,
              200,
              "Daftar strategi berhasil diambil",
              finalRows,
              {
                totalItems: finalCount,
                totalPages: Math.ceil(finalCount / limit),
                currentPage: page,
              }
            );
          }

          const fallbackWhere = {
            sasaran_id: fallbackSasaranId,
            jenis_dokumen: "rpjmd",
            tahun: String(tahun),
          };

          if (search) {
            const esc = search
              .toLowerCase()
              .replace(/[%_\\]/g, (char) => `\\${char}`);
            fallbackWhere[Op.or] = [
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("Strategi.kode_strategi")),
                { [Op.like]: `%${esc}%` }
              ),
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("Strategi.deskripsi")),
                { [Op.like]: `%${esc}%` }
              ),
            ];
          }

          const fallback = await Strategi.findAndCountAll({
            where: fallbackWhere,
            limit,
            offset,
            distinct: true,
            attributes: [
              "id",
              "kode_strategi",
              "deskripsi",
              "sasaran_id",
              "periode_id",
              "jenis_dokumen",
              "tahun",
            ],
            include: [
              {
                model: Sasaran,
                as: "Sasaran",
                attributes: ["id", "nomor", "isi_sasaran"],
                include: [
                  {
                    model: Tujuan,
                    as: "Tujuan",
                    attributes: ["id", "no_tujuan", "isi_tujuan", "misi_id"],
                    include: [
                      {
                        model: Misi,
                        as: "Misi",
                        attributes: ["id", "no_misi", "isi_misi"],
                      },
                    ],
                  },
                ],
              },
            ],
            order: [["kode_strategi", "ASC"]],
          });

          finalRows = fallback.rows;
          finalCount = fallback.count;
        }
      }

      return listResponse(
        res,
        200,
        "Daftar strategi berhasil diambil",
        finalRows,
        {
          totalItems: finalCount,
          totalPages: Math.ceil(finalCount / limit),
          currentPage: page,
        }
      );
    } catch (err) {
      console.error("\x1b[41m%s\x1b[0m", "❌ Error getAll Strategi:", err);
      return res.status(500).json({
        error: err.message || "Terjadi kesalahan pada server.",
      });
    }
  },

  async getById(req, res) {
    try {
      const strategi = await Strategi.findByPk(req.params.id, {
        include: [
          {
            model: Sasaran,
            as: "Sasaran",
            include: [
              {
                model: Tujuan,
                as: "Tujuan",
                include: [{ model: Misi, as: "Misi" }],
              },
            ],
          },
          { model: ArahKebijakan, as: "ArahKebijakan" },
        ],
      });

      if (!strategi) {
        return res.status(404).json({ message: "Strategi tidak ditemukan." });
      }

      return res.status(200).json(strategi);
    } catch (err) {
      console.error("Error getById:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async previewKode(req, res) {
    try {
      const { sasaran_id, jenis_dokumen, tahun } = req.query;
      if (!sasaran_id || !jenis_dokumen || !tahun) {
        return res.status(400).json({
          error: "Parameter sasaran_id, jenis_dokumen, dan tahun wajib diisi.",
        });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return res.status(400).json({ error: "Periode tidak ditemukan." });
      const periode_id = periode.id;

      const kode = await strategiController._getNextKodeStrategi(
        sasaran_id,
        jenis_dokumen,
        tahun,
        periode_id
      );
      return res.json({ kode_strategi: kode });
    } catch (err) {
      console.error("Error in previewKode:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  async bySasaran(req, res) {
    try {
      const { sasaranId } = req.params;
      const { jenis_dokumen, tahun } = req.query;

      if (!jenis_dokumen || !tahun) {
        return res
          .status(400)
          .json({ message: "jenis_dokumen dan tahun wajib diisi." });
      }

      const periode_id = await getPeriodeIdFromTahun(tahun);
      if (!periode_id)
        return res.status(400).json({ message: "Periode tidak ditemukan." });

      const strategiList = await Strategi.findAll({
        where: {
          sasaran_id: sasaranId,
          jenis_dokumen,
          tahun,
          periode_id,
        },
        attributes: ["id", "kode_strategi", "deskripsi"],
        order: [["kode_strategi", "ASC"]],
      });

      return listResponse(
        res,
        200,
        "Daftar strategi berdasarkan sasaran berhasil diambil",
        strategiList
      );
    } catch (err) {
      console.error("Error bySasaran:", err);
      res.status(500).json({
        message: "Gagal mengambil data strategi",
        error: err.message,
      });
    }
  },

  async byKodePrefix(req, res) {
    try {
      let { prefix, jenis_dokumen, tahun } = req.query;

      if (!prefix || !jenis_dokumen || !tahun) {
        return res.status(400).json({
          message: "Parameter prefix, jenis_dokumen, dan tahun wajib diisi.",
        });
      }

      // Pastikan tipe tahun string untuk konsistensi query
      tahun = String(tahun).trim();
      prefix = String(prefix).trim();

      // Ambil periode ID dari tahun
      const periodeObj = await getPeriodeFromTahun(tahun);
      if (!periodeObj) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periodeObj.id;

      // Buat variasi prefix ST <-> SST
      const altPrefix = prefix.startsWith("SST")
        ? prefix.replace(/^SST/, "ST")
        : prefix.startsWith("ST")
        ? prefix.replace(/^ST/, "SST")
        : prefix;

      // Query data strategi
      const strategiList = await Strategi.findAll({
        where: {
          jenis_dokumen,
          tahun,
          periode_id,
          [Op.or]: [
            { kode_strategi: { [Op.like]: `${prefix}.%` } },
            { kode_strategi: { [Op.like]: `${altPrefix}.%` } },
          ],
        },
        attributes: ["id", "kode_strategi", "deskripsi"],
        order: [["kode_strategi", "ASC"]],
      });

      return listResponse(
        res,
        200,
        "Daftar strategi berdasarkan prefix berhasil diambil",
        strategiList
      );
    } catch (err) {
      console.error("Error byKodePrefix:", err);
      return res.status(500).json({
        message: "Gagal mengambil strategi berdasarkan prefix kode",
        error: err.message,
      });
    }
  },

  async create(req, res) {
    try {
      const { sasaran_id, deskripsi, jenis_dokumen, tahun } = req.body;
      if (!sasaran_id || !deskripsi || !jenis_dokumen || !tahun)
        return res.status(400).json({ message: "Data tidak lengkap." });

      const periodeObj = await getPeriodeFromTahun(tahun);
      if (!periodeObj)
        return res.status(400).json({ message: "Periode tidak ditemukan." });

      const periode_id = periodeObj.id; // ambil id-nya untuk query dan validasi

      const existing = await Strategi.findOne({
        where: {
          sasaran_id,
          deskripsi: deskripsi.trim(),
          jenis_dokumen,
          tahun,
          periode_id,
        },
      });
      if (existing) {
        return res.status(409).json({
          message:
            "Strategi dengan deskripsi tersebut sudah ada dalam kombinasi yang sama.",
        });
      }

      const kode_strategi = await strategiController._getNextKodeStrategi(
        sasaran_id,
        jenis_dokumen,
        tahun,
        periode_id
      );

      const strategi = await Strategi.create({
        sasaran_id,
        deskripsi: deskripsi.trim(),
        jenis_dokumen,
        tahun,
        periode_id,
        kode_strategi,
      });

      return res.status(201).json(strategi);
    } catch (err) {
      console.error("Create error:", err);
      return res
        .status(500)
        .json({ message: "Gagal membuat strategi", error: err.message });
    }
  },

  async update(req, res) {
    try {
      const id = req.params.id;
      const { deskripsi } = req.body;

      const strategi = await Strategi.findByPk(id);
      if (!strategi)
        return res.status(404).json({ message: "Strategi tidak ditemukan." });

      const conflict = await Strategi.findOne({
        where: {
          id: { [Op.ne]: strategi.id },
          sasaran_id: strategi.sasaran_id,
          deskripsi: deskripsi.trim(),
          jenis_dokumen: strategi.jenis_dokumen,
          tahun: strategi.tahun,
          periode_id: strategi.periode_id,
        },
      });
      if (conflict) {
        return res.status(409).json({
          message:
            "Deskripsi strategi sudah digunakan dalam kombinasi yang sama.",
        });
      }

      strategi.deskripsi = deskripsi.trim();
      await strategi.save();

      return res.status(200).json(strategi);
    } catch (err) {
      console.error("Update error:", err);
      return res
        .status(500)
        .json({ message: "Gagal update strategi", error: err.message });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Strategi.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ error: "Strategi tidak ditemukan." });
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting strategi:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  async _getNextKodeStrategi(sasaran_id, jenis_dokumen, tahun, periode_id) {
    if (!sasaran_id || !jenis_dokumen || !tahun || !periode_id) {
      throw new Error("Parameter tidak lengkap untuk kode strategi.");
    }

    const sas = await Sasaran.findByPk(sasaran_id);
    console.log("periode_id from tahun:", periode_id);
    console.log("sasaran periode_id:", sas.periode_id);
    if (!sas) throw new Error("Sasaran tidak ditemukan.");
    if (sas.periode_id !== periode_id)
      throw new Error("Periode sasaran tidak sesuai.");
    if (sas.jenis_dokumen !== jenis_dokumen)
      throw new Error("Jenis dokumen sasaran tidak sesuai.");
    if (String(sas.tahun) !== String(tahun))
      throw new Error("Tahun sasaran tidak sesuai.");

    const prefix = sas.nomor.replace(/^ST/, "SST");
    const existing = await Strategi.findAll({
      where: {
        sasaran_id,
        jenis_dokumen,
        tahun,
        periode_id,
        kode_strategi: { [Op.like]: `${prefix}.%` },
      },
      attributes: ["kode_strategi"],
    });

    const nomorList = existing
      .map((s) => s.kode_strategi.split(".").pop())
      .filter((n) => /^\d+$/.test(n))
      .map((n) => parseInt(n, 10));
    const nextNum = nomorList.length ? Math.max(...nomorList) + 1 : 1;

    return `${prefix}.${nextNum}`;
  },
  async tujuanList(req, res) {
    try {
      const { tahun, jenis_dokumen } = req.query;

      if (!tahun || !jenis_dokumen) {
        return res
          .status(400)
          .json({ message: "Parameter tahun dan jenis_dokumen wajib diisi." });
      }

      const periode_id = await getPeriodeIdFromTahun(tahun);
      if (!periode_id) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }

      const tujuanList = await Tujuan.findAll({
        where: { tahun, jenis_dokumen, periode_id },
        attributes: ["id", "no_tujuan", "isi_tujuan", "misi_id"],
        include: [
          {
            model: Misi,
            as: "Misi",
            attributes: ["id", "no_misi", "isi_misi"],
          },
        ],
        order: [["no_tujuan", "ASC"]],
      });

      return listResponse(
        res,
        200,
        "Daftar tujuan untuk strategi berhasil diambil",
        tujuanList
      );
    } catch (err) {
      console.error("Error tujuanList:", err);
      res.status(500).json({
        message: "Gagal mengambil daftar tujuan",
        error: err.message,
      });
    }
  },
};

module.exports = strategiController;

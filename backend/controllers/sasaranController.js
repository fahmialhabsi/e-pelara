const { Sasaran, Tujuan, Misi, Indikator } = require("../models");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { Op } = require("sequelize");

const sasaranController = {
  async create(req, res) {
    try {
      let { nomor, isi_sasaran, tujuan_id, rpjmd_id, jenis_dokumen, tahun } =
        req.body;
      if (!tahun) tahun = new Date().getFullYear();

      // Set default rpjmd_id jika tidak ada (bisa sesuaikan dengan data aktif)
      if (!rpjmd_id) {
        // Contoh ambil rpjmd_id aktif dari DB (buat helper kalau perlu)
        const aktifRpjmd = await Rpjmd.findOne({ where: { aktif: true } });
        if (!aktifRpjmd) {
          return res
            .status(400)
            .json({ message: "RPJMD aktif tidak ditemukan." });
        }
        rpjmd_id = aktifRpjmd.id;
      }

      // Set default jenis_dokumen jika tidak ada, misal 'rpjmd'
      if (!jenis_dokumen) {
        jenis_dokumen = "rpjmd";
      }

      if (!nomor || !isi_sasaran || !tujuan_id) {
        return res.status(400).json({
          message: "Field nomor, isi_sasaran, dan tujuan_id wajib diisi.",
        });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res
          .status(400)
          .json({ message: `Periode tidak ditemukan untuk tahun ${tahun}.` });
      }
      const periode_id = periode.id;

      // Validasi tujuan terkait periode
      const tujuan = await Tujuan.findByPk(tujuan_id);
      if (!tujuan)
        return res.status(404).json({ message: "Tujuan tidak ditemukan." });
      if (tujuan.periode_id !== periode_id) {
        return res
          .status(400)
          .json({ message: "Periode tujuan tidak sesuai dengan tahun aktif." });
      }

      const exists = await Sasaran.findOne({
        where: { nomor, tujuan_id, jenis_dokumen, tahun, periode_id },
      });
      if (exists) {
        return res.status(400).json({
          message: "Nomor sudah digunakan untuk tujuan dan periode ini.",
        });
      }

      const newSasaran = await Sasaran.create({
        nomor,
        isi_sasaran,
        tujuan_id,
        rpjmd_id,
        periode_id,
        jenis_dokumen,
        tahun,
      });

      return res
        .status(201)
        .json({ message: "Sasaran berhasil ditambahkan", data: newSasaran });
    } catch (err) {
      console.error("Error creating sasaran:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async getAll(req, res) {
    try {
      let { tujuan_id, jenis_dokumen, tahun, limit, offset } = req.query;
      if (!tahun) tahun = new Date().getFullYear();

      if (!jenis_dokumen) {
        return res.status(400).json({ message: "jenis_dokumen wajib diisi." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      const periode_id = periode.id;

      const where = { periode_id, jenis_dokumen, tahun };
      if (tujuan_id) where.tujuan_id = tujuan_id;

      const pageSize = Math.min(parseInt(limit) || 100, 200);
      const pageOffset = parseInt(offset) || 0;

      const data = await Sasaran.findAll({
        where,
        attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
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
          {
            model: Indikator,
            as: "Indikator",
            where: { jenis_dokumen, tahun },
            required: false,
            attributes: ["id", "kode_indikator", "nama_indikator"],
          },
        ],
        order: [["nomor", "ASC"]],
        limit: pageSize,
        offset: pageOffset,
      });

      return res
        .status(200)
        .json({ message: "Data sasaran berhasil diambil.", data });
    } catch (err) {
      console.error("Error fetching sasaran:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const sasaran = await Sasaran.findByPk(req.params.id, {
        include: [
          { model: Tujuan, as: "Tujuan" },
          { model: Indikator, as: "Indikator" },
        ],
      });

      if (!sasaran)
        return res.status(404).json({ message: "Sasaran tidak ditemukan." });
      return res.status(200).json(sasaran);
    } catch (err) {
      console.error("Error fetching sasaran by id:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async getByTujuan(req, res) {
    try {
      const { tujuan_id } = req.params;
      let { tahun, jenis_dokumen } = req.query;
      if (!tahun) tahun = new Date().getFullYear();

      if (!tujuan_id) {
        return res
          .status(400)
          .json({ message: "Parameter tujuan_id wajib diisi." });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      const periode_id = periode.id;

      // Log yang benar: semua variabel sudah terdefinisi
      console.log({ tujuan_id, tahun, jenis_dokumen, periode_id });

      const where = { tujuan_id, periode_id };
      if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;

      const sasarans = await Sasaran.findAll({
        where,
        attributes: [
          "id",
          "tujuan_id",
          "isi_sasaran",
          "created_at",
          "updated_at",
          "rpjmd_id",
          "nomor",
          "periode_id",
          "jenis_dokumen",
          "tahun",
        ],
        order: [["nomor", "ASC"]],
      });

      return res.status(200).json(sasarans);
    } catch (err) {
      console.error("Error getByTujuan:", err);
      return res
        .status(500)
        .json({ message: "Gagal mengambil Sasaran", error: err.message });
    }
  },

  async update(req, res) {
    try {
      let { nomor, isi_sasaran, jenis_dokumen, tahun } = req.body;
      if (!tahun) tahun = new Date().getFullYear();

      if (!jenis_dokumen) {
        return res.status(400).json({ message: "jenis_dokumen wajib diisi." });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      const periode_id = periode.id;

      const sasaran = await Sasaran.findByPk(req.params.id);
      if (!sasaran)
        return res.status(404).json({ message: "Sasaran tidak ditemukan." });

      const tujuan = await Tujuan.findByPk(sasaran.tujuan_id);
      if (!tujuan || tujuan.periode_id !== periode_id) {
        return res.status(400).json({
          message: "Periode tujuan tidak sesuai dengan periode dari tahun.",
        });
      }

      if (nomor !== undefined && nomor !== sasaran.nomor) {
        const exists = await Sasaran.findOne({
          where: {
            nomor,
            tujuan_id: sasaran.tujuan_id,
            jenis_dokumen,
            tahun,
            periode_id,
            id: { [Op.ne]: sasaran.id },
          },
        });

        if (exists) {
          return res.status(400).json({
            message: "Nomor sudah digunakan untuk tujuan dan periode ini.",
          });
        }
      }

      const updates = {};
      if (nomor !== undefined) updates.nomor = nomor;
      if (isi_sasaran !== undefined) updates.isi_sasaran = isi_sasaran;

      if (Object.keys(updates).length === 0) {
        return res
          .status(200)
          .json({ message: "Tidak ada perubahan", data: sasaran });
      }

      await sasaran.update(updates);
      return res
        .status(200)
        .json({ message: "Sasaran berhasil diperbarui", data: sasaran });
    } catch (err) {
      console.error("Error updating sasaran:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async delete(req, res) {
    try {
      const sasaran = await Sasaran.findByPk(req.params.id);
      if (!sasaran)
        return res.status(404).json({ message: "Sasaran tidak ditemukan." });

      await sasaran.destroy();
      return res.status(200).json({ message: "Sasaran berhasil dihapus" });
    } catch (err) {
      console.error("Error deleting sasaran:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },

  async getNextNomor(req, res) {
    try {
      let { tujuan_id, jenis_dokumen, tahun } = req.query;
      if (!tahun) tahun = new Date().getFullYear();

      if (!tujuan_id || !jenis_dokumen) {
        return res
          .status(400)
          .json({ message: "tujuan_id dan jenis_dokumen wajib diisi." });
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      const periode_id = periode.id;

      const maxNomor = await Sasaran.max("nomor", {
        where: { tujuan_id, jenis_dokumen, tahun, periode_id },
      });

      const nextNomor = maxNomor ? maxNomor + 1 : 1;
      return res.status(200).json({ nextNomor });
    } catch (err) {
      console.error("Error fetching next nomor:", err);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server", error: err.message });
    }
  },
};

module.exports = sasaranController;

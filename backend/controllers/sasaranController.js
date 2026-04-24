const { Sasaran, Tujuan, Misi, Indikator, Strategi } = require("../models");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { Op } = require("sequelize");
const { listResponse } = require("../utils/responseHelper");

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Untuk regex prefix nomor sasaran (S{no_tujuan}-NN). */
const escapeRegExp = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyTujuanFilter = (where, tujuanIds = []) => {
  if (!Array.isArray(tujuanIds) || !tujuanIds.length) return;
  where.tujuan_id = tujuanIds.length === 1 ? tujuanIds[0] : { [Op.in]: tujuanIds };
};

const resolveTujuanIdsForDokumen = async ({
  tujuanId,
  jenisDokumen,
  tahun,
  periodeId,
}) => {
  const parsedTujuanId = parseId(tujuanId);
  if (!parsedTujuanId) return [];

  const sourceTujuan = await Tujuan.findByPk(parsedTujuanId, {
    attributes: [
      "id",
      "no_tujuan",
      "isi_tujuan",
      "jenis_dokumen",
      "tahun",
      "periode_id",
    ],
  });

  if (!sourceTujuan) {
    return [parsedTujuanId];
  }

  const isSameScope =
    String(sourceTujuan.jenis_dokumen || "").toLowerCase() ===
      String(jenisDokumen || "").toLowerCase() &&
    String(sourceTujuan.tahun || "") === String(tahun) &&
    Number(sourceTujuan.periode_id || 0) === Number(periodeId || 0);

  if (isSameScope) {
    return [sourceTujuan.id];
  }

  const usePeriodeFilter = String(jenisDokumen || "").toLowerCase() !== "rpjmd";
  const byNoTujuan = await Tujuan.findAll({
    where: {
      no_tujuan: sourceTujuan.no_tujuan,
      jenis_dokumen: jenisDokumen,
      tahun: String(tahun),
      ...(usePeriodeFilter ? { periode_id: periodeId } : {}),
    },
    attributes: ["id"],
    order: [["id", "ASC"]],
  });

  if (byNoTujuan.length) {
    return byNoTujuan.map((item) => item.id);
  }

  const isiTujuan = String(sourceTujuan.isi_tujuan || "").trim();
  if (isiTujuan) {
    const byIsiTujuan = await Tujuan.findAll({
      where: {
        isi_tujuan: isiTujuan,
        jenis_dokumen: jenisDokumen,
        tahun: String(tahun),
        ...(usePeriodeFilter ? { periode_id: periodeId } : {}),
      },
      attributes: ["id"],
      order: [["id", "ASC"]],
    });

    if (byIsiTujuan.length) {
      return byIsiTujuan.map((item) => item.id);
    }
  }

  return [sourceTujuan.id];
};

const fetchSasaranRows = async ({
  where,
  pageSize,
  pageOffset,
  jenisDokumen,
  tahun,
}) => {
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
        where: { jenis_dokumen: jenisDokumen, tahun: String(tahun) },
        required: false,
        attributes: ["id", "kode_indikator", "nama_indikator"],
      },
    ],
    order: [["nomor", "ASC"]],
    limit: pageSize,
    offset: pageOffset,
  });

  const totalItems = await Sasaran.count({ where });
  return { data, totalItems };
};

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

      const normalizedDokumen = String(jenis_dokumen).toLowerCase();
      const where = {
        jenis_dokumen: normalizedDokumen,
        tahun: String(tahun),
        ...(normalizedDokumen === "rpjmd" ? {} : { periode_id }),
      };
      const hasTujuanFilter =
        tujuan_id !== undefined &&
        tujuan_id !== null &&
        String(tujuan_id).trim() !== "";

      if (hasTujuanFilter) {
        const tujuanIds = await resolveTujuanIdsForDokumen({
          tujuanId: tujuan_id,
          jenisDokumen: jenis_dokumen,
          tahun: String(tahun),
          periodeId: periode_id,
        });
        applyTujuanFilter(where, tujuanIds);
      }

      const pageSize = Math.min(parseInt(limit) || 100, 200);
      const pageOffset = parseInt(offset) || 0;

      let resolvedDokumen = normalizedDokumen;
      let { data, totalItems } = await fetchSasaranRows({
        where,
        pageSize,
        pageOffset,
        jenisDokumen: resolvedDokumen,
        tahun: String(tahun),
      });

      if (!data.length && hasTujuanFilter && resolvedDokumen !== "rpjmd") {
        const fallbackWhere = {
          jenis_dokumen: "rpjmd",
          tahun: String(tahun),
        };

        const fallbackTujuanIds = await resolveTujuanIdsForDokumen({
          tujuanId: tujuan_id,
          jenisDokumen: "rpjmd",
          tahun: String(tahun),
          periodeId: periode_id,
        });
        applyTujuanFilter(fallbackWhere, fallbackTujuanIds);

        const fallbackResult = await fetchSasaranRows({
          where: fallbackWhere,
          pageSize,
          pageOffset,
          jenisDokumen: "rpjmd",
          tahun: String(tahun),
        });

        if (fallbackResult.data.length) {
          data = fallbackResult.data;
          totalItems = fallbackResult.totalItems;
          resolvedDokumen = "rpjmd";
        }
      }

      return listResponse(
        res,
        200,
        "Data sasaran berhasil diambil.",
        data,
        {
          totalItems,
          limit: pageSize,
          offset: pageOffset,
          resolvedDokumen,
        }
      );
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
      let { tahun, jenis_dokumen, periode_id: periodeQuery } = req.query;
      if (!tahun) tahun = new Date().getFullYear();

      if (!tujuan_id) {
        return res
          .status(400)
          .json({ message: "Parameter tujuan_id wajib diisi." });
      }

      /**
       * Normalisasi tahun agar konsisten dengan cara penyimpanan di DB.
       * Beberapa controller menyimpan tahun sebagai integer, sebagian sebagai string.
       * Kita coba keduanya saat filtering.
       */
      const tahunNum = parseInt(String(tahun), 10);
      const tahunNorm = Number.isFinite(tahunNum) ? tahunNum : tahun;

      const qPid = Number(periodeQuery);
      let periode_id = null;
      if (
        periodeQuery !== undefined &&
        periodeQuery !== "" &&
        Number.isFinite(qPid)
      ) {
        periode_id = qPid;
      } else {
        // Coba resolve periode dari tahun, tapi jangan hard-fail — lihat fallback di bawah
        try {
          const periode = await getPeriodeFromTahun(tahun);
          if (periode) periode_id = periode.id;
        } catch (_) {
          // abaikan — akan coba tanpa filter periode_id
        }
      }

      const commonAttrs = [
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
      ];

      // Coba query dengan semua filter (termasuk periode_id dan tahun)
      const where = { tujuan_id };
      if (periode_id !== null) where.periode_id = periode_id;
      if (jenis_dokumen) where.jenis_dokumen = String(jenis_dokumen).toLowerCase();
      if (tahun !== undefined && tahun !== null && String(tahun).trim() !== "") {
        // Gunakan nilai integer jika tersedia, fallback ke string
        where.tahun = tahunNorm;
      }

      let sasarans = await Sasaran.findAll({
        where,
        attributes: commonAttrs,
        order: [["nomor", "ASC"]],
      });

      /**
       * Fallback 1: Jika hasil kosong dan kita memakai filter tahun integer,
       * coba ulang dengan tahun sebagai string (perbedaan tipe kolom antar tabel).
       */
      if (sasarans.length === 0 && Number.isFinite(tahunNum)) {
        const whereStr = { ...where, tahun: String(tahun) };
        sasarans = await Sasaran.findAll({
          where: whereStr,
          attributes: commonAttrs,
          order: [["nomor", "ASC"]],
        });
      }

      /**
       * Fallback 2: Jika masih kosong dan ada filter periode_id,
       * coba tanpa periode_id — data lama mungkin belum diisi periode.
       */
      if (sasarans.length === 0 && periode_id !== null) {
        const whereNoPeriode = { tujuan_id };
        if (jenis_dokumen) whereNoPeriode.jenis_dokumen = String(jenis_dokumen).toLowerCase();
        sasarans = await Sasaran.findAll({
          where: whereNoPeriode,
          attributes: commonAttrs,
          order: [["nomor", "ASC"]],
        });
      }

      return listResponse(
        res,
        200,
        "Daftar sasaran berdasarkan tujuan berhasil diambil",
        sasarans
      );
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

      const hasStrategi = await Strategi.findOne({
        where: { sasaran_id: sasaran.id },
        attributes: ["id"],
      });
      if (hasStrategi) {
        return res.status(400).json({
          message:
            "Tidak bisa menghapus Sasaran yang masih memiliki Strategi. Hapus/relokasi Strategi terlebih dahulu.",
        });
      }

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

      const tujuan = await Tujuan.findByPk(tujuan_id, {
        attributes: ["no_tujuan"],
      });
      if (!tujuan) {
        return res.status(404).json({ message: "Tujuan tidak ditemukan." });
      }
      const noTujuan = String(tujuan.no_tujuan ?? "").trim();
      if (!noTujuan) {
        return res
          .status(400)
          .json({ message: "Tujuan tidak memiliki no_tujuan untuk penomoran." });
      }
      const prefix = `S${noTujuan}`;

      const rows = await Sasaran.findAll({
        where: { tujuan_id, jenis_dokumen, tahun, periode_id },
        attributes: ["nomor"],
        raw: true,
      });

      let maxSeq = 0;
      const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
      for (const row of rows) {
        const nom = row.nomor != null ? String(row.nomor).trim() : "";
        const m = nom.match(re);
        if (m) {
          const n = Number.parseInt(m[1], 10);
          if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
        }
      }

      const nextNomor = maxSeq + 1;
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

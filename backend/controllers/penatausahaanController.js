const { Penatausahaan, PeriodeRpjmd, Dpa } = require("../models");
const Joi = require("joi");

// Skema untuk menambahkan satu baris transaksi/item belanja secara manual
// (mis. item yang terlewat saat OCR import PDF SIPD gagal mendeteksi baris
// tsb sebagai anchor). periode_id diresolusi otomatis dari tahun di server,
// sama seperti alur import PDF (lihat resolvePeriodeId di
// realisasiImportController.js) supaya pengguna tidak perlu tahu id periode.
const penatausahaanManualCreateSchema = Joi.object({
  dpa_id: Joi.number().required(),
  tahun: Joi.string().required(),
  kode_rekening: Joi.string().required(),
  nama_rekening: Joi.string().required(),
  jumlah: Joi.number().required(),
  jenis_transaksi: Joi.string().valid("KKPD", "UP_GU", "TU", "LS").allow(null, ""),
  tanggal_transaksi: Joi.date(),
});

// Skema khusus untuk edit baris transaksi (mis. hasil import realisasi PDF
// SIPD) — skema di atas mengharuskan program/kegiatan/sub_kegiatan yang
// SUDAH TIDAK ADA di kolom model Penatausahaan sejak model ini dihubungkan ke
// Dpa (lihat dpa_id). Skema ini hanya memvalidasi kolom yang benar-benar ada
// dan boleh diedit lewat tombol Aksi di Buku Kas Umum.
const penatausahaanUpdateSchema = Joi.object({
  jumlah: Joi.number().required(),
  jenis_transaksi: Joi.string().allow(null, ""),
  uraian: Joi.string(),
  tanggal_transaksi: Joi.date(),
  kode_akun: Joi.string().allow(null, ""),
  bukti: Joi.string().allow(null, ""),
  sumber_dana: Joi.string().allow(null, ""),
}).min(1);

module.exports = {
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Penatausahaan.findAll({
        where,
        include: [
          { model: PeriodeRpjmd, as: "periode" },
          {
            model: Dpa,
            as: "dpa",
            attributes: [
              "id",
              "program",
              "kegiatan",
              "sub_kegiatan",
              "kode_program",
              "kode_kegiatan",
              "kode_sub_kegiatan",
              "anggaran",
            ],
          },
        ],
        order: [["tahun", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Penatausahaan.findByPk(id, {
        include: [{ model: PeriodeRpjmd, as: "periode" }],
      });

      if (!data) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { error, value } = penatausahaanManualCreateSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const { dpa_id, tahun, kode_rekening, nama_rekening, jumlah, jenis_transaksi, tanggal_transaksi } = value;

      const dpa = await Dpa.findByPk(dpa_id);
      if (!dpa) return res.status(404).json({ error: "DPA tidak ditemukan." });

      const periodeRows = await PeriodeRpjmd.findAll();
      const periode = periodeRows.find(
        (p) => Number(p.tahun_awal) <= Number(tahun) && Number(tahun) <= Number(p.tahun_akhir)
      );
      if (!periode)
        return res.status(400).json({ error: `Tidak ditemukan Periode RPJMD yang mencakup tahun ${tahun}.` });

      const created = await Penatausahaan.create({
        tahun,
        periode_id: periode.id,
        tanggal_transaksi: tanggal_transaksi || `${tahun}-12-31`,
        uraian: `${kode_rekening} - ${nama_rekening}`,
        jumlah,
        jenis_transaksi: jenis_transaksi || null,
        bukti: `MANUAL-${kode_rekening}-${tahun}`,
        sumber_dana: null,
        jenis_dokumen: "Input Manual",
        dpa_id,
        kode_akun: "5.1.02",
      });

      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = penatausahaanUpdateSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const [updated] = await Penatausahaan.update(value, { where: { id } });
      if (!updated)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      const result = await Penatausahaan.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Penatausahaan.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

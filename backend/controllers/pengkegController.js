const {
  Pengkeg,
  PeriodeRpjmd,
  Dpa,
  RenstraTabelSubkegiatan,
  SubKegiatan,
  sequelize,
} = require('../models');
const Joi = require('joi');
const { syncPengkegRealisasiIndikator } = require('../services/pengkegRealisasiSyncService');

// Validasi input — disesuaikan dengan kolom asli model Pengkeg
// (skema lama memvalidasi program/kegiatan/sub_kegiatan/indikator/target/realisasi
// yang TIDAK ADA sebagai kolom di model, jadi diam-diam diabaikan Sequelize).
const pengkegSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  nama_kegiatan: Joi.string().required(),
  dpa_id: Joi.number().required(),
  // Nilai mentah sesuai satuan indikator (mis. "2" untuk 2 Dokumen), bukan persentase.
  realisasi_fisik: Joi.number().min(0).allow(null),
  // Diterima tapi TIDAK disimpan — realisasi keuangan selalu dihitung live dari
  // Penatausahaan (lihat attachRealisasiKeuangan), supaya tidak ada 2 sumber kebenaran.
  realisasi_keuangan: Joi.number().allow(null),
  keterangan: Joi.string().allow(null, ''),
  jenis_dokumen: Joi.string().allow(null, ''),
});

// Hitung realisasi keuangan live dari Penatausahaan per dpa_id (bukan dari kolom
// tersimpan) — supaya LPK Dispang & Penatausahaan selalu tampil sinkron otomatis.
async function attachRealisasiKeuangan(rows) {
  const dpaIds = [...new Set(rows.map((r) => r.dpa_id).filter(Boolean))];
  if (dpaIds.length === 0) return rows.map((r) => ({ ...r.toJSON(), realisasi_keuangan: 0 }));

  const sums = await sequelize.query(
    `SELECT dpa_id, SUM(jumlah) as total FROM penatausahaan WHERE dpa_id IN (:ids) GROUP BY dpa_id`,
    { replacements: { ids: dpaIds }, type: sequelize.QueryTypes.SELECT },
  );
  const sumByDpa = new Map(sums.map((s) => [s.dpa_id, Number(s.total) || 0]));

  return rows.map((r) => ({ ...r.toJSON(), realisasi_keuangan: sumByDpa.get(r.dpa_id) || 0 }));
}

const includeAssoc = [
  { model: PeriodeRpjmd, as: 'periode' },
  {
    model: Dpa,
    as: 'dpa',
    attributes: ['id', 'kode_sub_kegiatan', 'kode_kegiatan', 'kode_program', 'tahun'],
  },
];

module.exports = {
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, dpa_id } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (dpa_id) where.dpa_id = dpa_id;

      const rows = await Pengkeg.findAll({
        where,
        include: includeAssoc,
        order: [
          ['tahun', 'DESC'],
          [{ model: Dpa, as: 'dpa' }, 'kode_sub_kegiatan', 'ASC'],
        ],
      });

      res.json(await attachRealisasiKeuangan(rows));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const row = await Pengkeg.findByPk(id, { include: includeAssoc });

      if (!row) return res.status(404).json({ error: 'Data tidak ditemukan' });
      const [data] = await attachRealisasiKeuangan([row]);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { error, value } = pengkegSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const { realisasi_keuangan, ...payload } = value; // tidak disimpan, selalu dihitung live
      const created = await Pengkeg.create(payload);
      await syncPengkegRealisasiIndikator(created.id).catch(() => null);

      const row = await Pengkeg.findByPk(created.id, { include: includeAssoc });
      const [result] = await attachRealisasiKeuangan([row]);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = pengkegSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const existing = await Pengkeg.findByPk(id);
      if (!existing) return res.status(404).json({ error: 'Data tidak ditemukan' });

      const { realisasi_keuangan, ...payload } = value; // tidak disimpan, selalu dihitung live
      await Pengkeg.update(payload, { where: { id } });
      await syncPengkegRealisasiIndikator(id).catch(() => null);

      const row = await Pengkeg.findByPk(id, { include: includeAssoc });
      const [result] = await attachRealisasiKeuangan([row]);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Pengkeg.destroy({ where: { id } });
      if (!deleted) return res.status(404).json({ error: 'Data tidak ditemukan' });

      res.json({ message: 'Data berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Realisasi keuangan live dari Penatausahaan untuk 1 DPA — dipanggil form saat
  // user memilih Sub Kegiatan, sebelum baris Pengkeg-nya sendiri disimpan.
  async dpaRealisasiKeuangan(req, res) {
    try {
      const { dpaId } = req.params;
      const [row] = await sequelize.query(
        `SELECT SUM(jumlah) as total FROM penatausahaan WHERE dpa_id = :dpaId`,
        { replacements: { dpaId }, type: sequelize.QueryTypes.SELECT },
      );
      res.json({ dpa_id: Number(dpaId), realisasi_keuangan: Number(row?.total) || 0 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Dropdown "Pilih Sub Kegiatan (DPA)" di form Pengkeg — label gabungan
  // kode_sub_kegiatan + nama_subkegiatan (dari RenstraTabelSubkegiatan).
  async dpaOptions(req, res) {
    try {
      const { tahun, kode_kegiatan } = req.query;
      const where = { is_active_version: true };
      if (tahun) where.tahun = tahun;
      if (kode_kegiatan) where.kode_kegiatan = kode_kegiatan;

      const data = await Dpa.findAll({
        where,
        attributes: ['id', 'kode_sub_kegiatan', 'kode_kegiatan', 'kode_program', 'tahun'],
        order: [['kode_sub_kegiatan', 'ASC']],
      });

      const kodeList = data.map((d) => d.kode_sub_kegiatan).filter(Boolean);

      // Utama: renstra_tabel_subkegiatan (per-OPD, dipakai juga oleh sync realisasi
      // indikator). Fallback: sub_kegiatan (master RPJMD) kalau belum diisi lewat
      // wizard Tabel Sub Kegiatan Renstra — supaya dropdown tetap punya nama.
      const [subsRenstra, subsMaster] = kodeList.length
        ? await Promise.all([
            RenstraTabelSubkegiatan.findAll({
              where: { kode_subkegiatan: kodeList },
              attributes: ['kode_subkegiatan', 'nama_subkegiatan'],
            }),
            SubKegiatan.findAll({
              where: { kode_sub_kegiatan: kodeList },
              attributes: ['kode_sub_kegiatan', 'nama_sub_kegiatan'],
            }),
          ])
        : [[], []];

      const namaByKode = new Map(subsMaster.map((s) => [s.kode_sub_kegiatan, s.nama_sub_kegiatan]));
      subsRenstra.forEach((s) => {
        if (s.nama_subkegiatan) namaByKode.set(s.kode_subkegiatan, s.nama_subkegiatan);
      });

      const options = data.map((d) => ({
        id: d.id,
        kode_sub_kegiatan: d.kode_sub_kegiatan,
        nama_sub_kegiatan: namaByKode.get(d.kode_sub_kegiatan) || null,
        kode_kegiatan: d.kode_kegiatan,
        kode_program: d.kode_program,
        tahun: d.tahun,
        label: `${d.kode_sub_kegiatan || '-'} — ${namaByKode.get(d.kode_sub_kegiatan) || '(nama tidak ditemukan)'}`,
      }));

      res.json(options);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

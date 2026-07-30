// backend/controllers/sdiDaftarDataController.js
'use strict';

const { SdiDaftarData, RenstraOPD } = require('../models');
const harvest = require('../services/sdiDaftarDataHarvestService');
const autofill = require('../services/sdiDaftarDataAutofillService');
const { exportDaftarData } = require('../services/sdiDaftarDataExportExcelService');
const { exportDaftarDataPdf } = require('../services/sdiDaftarDataExportPdfService');
const sinkron = require('../services/sdiDaftarDataSyncService');

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const terisi = (v) => v != null && String(v).trim() !== '';

/**
 * Kolom yang menurut catatan akhir Lampiran menjadi basis verifikasi indikator
 * penilaian Satu Data. Bobot mengikuti jumlah indikator yang diverifikasi tiap
 * kolom, sehingga skor kelengkapan mencerminkan dampak penilaian — bukan
 * sekadar jumlah sel yang terisi.
 */
const KOLOM_VERIFIKASI = [
  // ID DDP boleh kosong bila data memang tidak mengacu Data Pusat, sehingga
  // yang dinilai adalah sudah/belum diperiksa — bukan sekadar terisi.
  {
    key: 'id_ddp',
    label: 'ID DDP',
    indikator: [8],
    bobot: 1,
    tuntas: (r) => terisi(r.id_ddp) || r.id_ddp_status === 'tidak_mengacu',
  },
  { key: 'kode_standar_data', label: 'Kode Standar Data', indikator: [10, 11], bobot: 2 },
  { key: 'kode_metadata', label: 'Kode Metadata', indikator: [12, 13], bobot: 2 },
  { key: 'link_portal_daerah', label: 'Link Portal Daerah', indikator: [9, 14], bobot: 2 },
  { key: 'link_portal_sdi', label: 'Link Portal SDI', indikator: [19], bobot: 1 },
];

/**
 * Sepuluh unsur metadata minimal sesuai ketentuan angka 4 surat
 * 000.7/4486/SETDA. "Klasifikasi" dipenuhi kolom klasifikasi_risiko dan
 * "frekuensi" oleh jadwal_pemutakhiran.
 */
const METADATA_WAJIB = [
  { key: 'nama_data', label: 'Nama data' },
  { key: 'definisi', label: 'Definisi operasional' },
  { key: 'satuan', label: 'Satuan' },
  { key: 'klasifikasi_risiko', label: 'Klasifikasi' },
  { key: 'jadwal_pemutakhiran', label: 'Frekuensi' },
  { key: 'periode_data', label: 'Periode data' },
  { key: 'metode_pengumpulan', label: 'Metode pengumpulan' },
  { key: 'sumber_referensi', label: 'Sumber data' },
  { key: 'produsen_data', label: 'Produsen data' },
  { key: 'penanggung_jawab', label: 'Penanggung jawab data' },
];

/** Buang kolom yang tidak boleh ditulis lewat form biasa. */
const bersihkanPayload = (body) => {
  const payload = { ...body };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  return payload;
};

const susunWhere = (query) => {
  const where = {};
  if (query.renstra_id) where.renstra_id = toInt(query.renstra_id);
  if (query.tahun) where.tahun = String(query.tahun);
  if (query.status) where.status = query.status;
  if (query.jenis_data) where.jenis_data = query.jenis_data;
  return where;
};

const URUTAN_BAKU = [
  ['urutan', 'ASC'],
  ['id', 'ASC'],
];

exports.findAll = async (req, res) => {
  try {
    const data = await SdiDaftarData.findAll({
      where: susunWhere(req.query),
      order: URUTAN_BAKU,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await SdiDaftarData.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = bersihkanPayload(req.body);
    if (!terisi(payload.nama_data)) {
      return res.status(400).json({ error: 'Nama Data wajib diisi' });
    }
    if (!terisi(payload.tahun)) {
      return res.status(400).json({ error: 'Tahun Daftar Data wajib diisi' });
    }

    payload.renstra_id = toInt(payload.renstra_id);
    payload.indikator_renstra_id = toInt(payload.indikator_renstra_id);

    // Nomor urut melanjutkan baris terakhir pada tahun yang sama agar urutan
    // sheet Excel stabil tanpa perlu diatur manual.
    if (!toInt(payload.urutan)) {
      const terakhir =
        (await SdiDaftarData.max('urutan', {
          where: { renstra_id: payload.renstra_id, tahun: payload.tahun },
        })) || 0;
      payload.urutan = Number(terakhir) + 1;
    }

    const data = await SdiDaftarData.create(payload);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await SdiDaftarData.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const payload = bersihkanPayload(req.body);
    if (payload.nama_data !== undefined && !terisi(payload.nama_data)) {
      return res.status(400).json({ error: 'Nama Data wajib diisi' });
    }
    if (payload.renstra_id !== undefined) payload.renstra_id = toInt(payload.renstra_id);

    await SdiDaftarData.update(payload, { where: { id: req.params.id } });
    res.json(await SdiDaftarData.findByPk(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const jumlah = await SdiDaftarData.destroy({ where: { id: req.params.id } });
    if (!jumlah) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json({ message: 'Baris Daftar Data berhasil dihapus' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Pratinjau hasil tarikan tanpa menyimpan, agar bisa diperiksa lebih dulu. */
exports.previewTarikRenstra = async (req, res) => {
  try {
    const renstraId = toInt(req.query.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });

    const stages = req.query.stages ? String(req.query.stages).split(',') : undefined;
    const { draft } = await harvest.susunDraft(renstraId, {
      stages,
      tahun: req.query.tahun,
      hanyaBaru: req.query.hanya_baru !== 'false',
    });
    res.json({ jumlah: draft.length, data: draft });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

exports.tarikRenstra = async (req, res) => {
  try {
    const renstraId = toInt(req.body.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });

    const hasil = await harvest.tarikDanSimpan(renstraId, {
      stages: req.body.stages,
      tahun: req.body.tahun,
      hanyaBaru: req.body.hanya_baru !== false,
    });

    res.json({
      message: hasil.tersimpan
        ? `${hasil.tersimpan} baris Daftar Data berhasil ditarik dari indikator Renstra. ` +
          'Lengkapi kolom ID DDP, Kode Standar Data, Kategori RAD, Kode Metadata, dan kedua kolom link portal secara manual.'
        : 'Tidak ada indikator baru untuk ditarik. Seluruh indikator pada level terpilih sudah masuk Daftar Data tahun ini.',
      tersimpan: hasil.tersimpan,
      data: hasil.data,
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

/**
 * Pratinjau pengisian otomatis. Tidak menyimpan apa pun — hasilnya ditampilkan
 * lebih dulu agar pengguna dapat menyetujui atau menyesuaikan tiap usulan.
 */
exports.previewAutofill = async (req, res) => {
  try {
    const renstraId = toInt(req.query.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });

    const hasil = await autofill.pratinjau(
      { renstra_id: renstraId, tahun: String(req.query.tahun || new Date().getFullYear()) },
      {
        kolom: req.query.kolom ? String(req.query.kolom).split(',') : undefined,
        hanyaKosong: req.query.hanya_kosong !== 'false',
        portalDaerah: req.query.portal_daerah,
        usulkanPortalSdi: req.query.portal_sdi === 'true',
      },
    );
    res.json(hasil);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

/** Terapkan usulan yang sudah disetujui (dan mungkin disunting) pengguna. */
exports.terapkanAutofill = async (req, res) => {
  try {
    const perubahan = req.body?.perubahan;
    if (!Array.isArray(perubahan) || !perubahan.length) {
      return res.status(400).json({ error: 'Tidak ada usulan yang dipilih untuk diterapkan' });
    }
    const hasil = await autofill.terapkan(perubahan);
    res.json({
      message: `${hasil.diperbarui} baris diperbarui dari pengisian otomatis.`,
      ...hasil,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Periksa baris yang isinya sudah tertinggal dari indikator Renstra sumbernya. */
exports.periksaSinkron = async (req, res) => {
  try {
    const renstraId = toInt(req.query.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });

    const hasil = await sinkron.periksaSinkron({
      renstra_id: renstraId,
      tahun: String(req.query.tahun || new Date().getFullYear()),
    });
    res.json(hasil);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

/** Selaraskan baris terpilih dengan nilai terkini dari Renstra. */
exports.segarkanSinkron = async (req, res) => {
  try {
    const renstraId = toInt(req.body.renstra_id);
    if (!renstraId) return res.status(400).json({ error: 'renstra_id wajib diisi' });

    const hasil = await sinkron.segarkan(
      { renstra_id: renstraId, tahun: String(req.body.tahun || new Date().getFullYear()) },
      { ids: req.body.ids, kolom: req.body.kolom },
    );
    res.json({
      message: hasil.diperbarui
        ? `${hasil.diperbarui} baris diselaraskan dengan indikator Renstra terkini.`
        : 'Tidak ada baris yang perlu diselaraskan.',
      ...hasil,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Rapor kelengkapan: memperlihatkan kolom mana yang masih menghambat penilaian
 * Forum Satu Data, beserta baris yang metadatanya belum genap 10 unsur.
 */
exports.kelengkapan = async (req, res) => {
  try {
    const rows = await SdiDaftarData.findAll({ where: susunWhere(req.query), order: URUTAN_BAKU });
    const total = rows.length;

    const tuntas = (kolom, row) =>
      kolom.tuntas ? kolom.tuntas(row) : terisi(row[kolom.key]);

    const perKolom = KOLOM_VERIFIKASI.map(({ tuntas: _fn, ...k }) => {
      const kolom = KOLOM_VERIFIKASI.find((x) => x.key === k.key);
      const jumlahTerisi = rows.filter((r) => tuntas(kolom, r)).length;
      return {
        ...k,
        terisi: jumlahTerisi,
        kosong: total - jumlahTerisi,
        persen: total ? Math.round((jumlahTerisi / total) * 100) : 0,
      };
    });

    const totalBobot = KOLOM_VERIFIKASI.reduce((a, k) => a + k.bobot, 0) * total;
    const bobotTercapai = rows.reduce(
      (a, r) => a + KOLOM_VERIFIKASI.reduce((b, k) => b + (tuntas(k, r) ? k.bobot : 0), 0),
      0,
    );

    const metadataKurang = rows
      .map((r) => ({
        id: r.id,
        nama_data: r.nama_data,
        kurang: METADATA_WAJIB.filter((m) => !terisi(r[m.key])).map((m) => m.label),
      }))
      .filter((r) => r.kurang.length);

    res.json({
      total,
      skor_verifikasi: totalBobot ? Math.round((bobotTercapai / totalBobot) * 100) : 0,
      per_kolom: perKolom,
      metadata_kurang: metadataKurang,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Kumpulkan baris beserta identitas OPD — dipakai kedua jalur export. */
async function siapkanBahanExport(query) {
  const where = susunWhere(query);
  const rows = await SdiDaftarData.findAll({ where, order: URUTAN_BAKU });

  let namaOpd = rows.find((r) => terisi(r.nama_opd))?.nama_opd;
  if (!namaOpd && where.renstra_id) {
    namaOpd = (await RenstraOPD.findByPk(where.renstra_id))?.nama_opd;
  }

  return {
    rows,
    meta: {
      namaOpd: namaOpd || '-',
      tahun: where.tahun || String(new Date().getFullYear()),
    },
  };
}

exports.exportExcel = async (req, res) => {
  try {
    const { rows, meta } = await siapkanBahanExport(req.query);
    await exportDaftarData(res, rows, meta);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

exports.exportPdf = async (req, res) => {
  try {
    const { rows, meta } = await siapkanBahanExport(req.query);
    await exportDaftarDataPdf(res, rows, meta);
  } catch (err) {
    console.error('[sdiDaftarData] exportPdf:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal membuat PDF: ' + err.message });
  }
};

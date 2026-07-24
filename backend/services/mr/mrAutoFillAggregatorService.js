'use strict';

/**
 * MR Auto-Fill Aggregator Service
 * ---------------------------------------------------------------------------
 * Read-only aggregator: mengumpulkan data usulan (suggested values) untuk
 * pengisian otomatis MR Planning Context dari modul lain (Renstra, LPK
 * Dispang, LAKIP). Tidak menulis ke tabel manapun — hanya mengembalikan
 * data mentah agar frontend/service pemanggil yang memutuskan field mana
 * yang akan diisi otomatis (dan tetap bisa di-override manual oleh user).
 */

const db = require('../../models');
const realisasiIndikatorRenstraController = require('../../controllers/realisasiIndikatorRenstraController');

/**
 * realisasiIndikatorRenstraController.getHierarchy adalah Express handler
 * (req, res) => res.json(...), bukan fungsi murni. Supaya bisa dipakai ulang
 * tanpa menduplikasi logic tree Tujuan->Sasaran->Program->Kegiatan di dalamnya,
 * dipanggil langsung dengan req/res tiruan yang menangkap payload res.json().
 */
const callHierarchyController = (query) =>
  new Promise((resolve, reject) => {
    const req = { query };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          reject(
            new Error(payload?.error || 'Gagal memuat hierarchy realisasi indikator renstra.'),
          );
        } else {
          resolve(payload);
        }
      },
    };

    Promise.resolve(realisasiIndikatorRenstraController.getHierarchy(req, res)).catch(reject);
  });

const getRenstraSuggestion = async (context) => {
  if (!context.renstra_id) {
    return null;
  }

  const renstraOpd = await db.RenstraOPD.findByPk(context.renstra_id);

  if (!renstraOpd) {
    return null;
  }

  const indikatorWhere = { renstra_id: context.renstra_id };

  if (context.tahun) {
    indikatorWhere.tahun = String(context.tahun);
  }

  const indikators = await db.IndikatorRenstra.findAll({
    where: indikatorWhere,
    limit: 50,
    order: [['id', 'ASC']],
  });

  return {
    renstra: {
      id: renstraOpd.id,
      opd_id: renstraOpd.opd_id,
      nama_opd: renstraOpd.nama_opd,
      tahun_mulai: renstraOpd.tahun_mulai,
      tahun_akhir: renstraOpd.tahun_akhir,
    },
    indikators: indikators.map((row) => ({
      id: row.id,
      stage: row.stage,
      kode_indikator: row.kode_indikator,
      nama_indikator: row.nama_indikator,
      satuan: row.satuan,
      tipe_indikator: row.tipe_indikator,
      tahun: row.tahun,
    })),
  };
};

/**
 * Tabel lpk_dispang terbukti kosong & sudah tidak jadi sumber data live —
 * fitur "Realisasi Kinerja Terpadu" (frontend: RealisasiKinerjaTerpadu.jsx)
 * sekarang menariknya lewat GET /api/realisasi-indikator-renstra/hierarchy
 * (realisasiIndikatorRenstraController.getHierarchy), yang butuh renstra_id
 * (+ tahun opsional untuk kolom target per-tahun). Parameter itu tersedia
 * langsung di MrPlanningContext (renstra_id, tahun), jadi dipetakan 1:1 —
 * tidak butuh pengkeg_id/dpa_id spesifik yang memang tidak ada di context.
 */
const getLpkSuggestion = async (context) => {
  if (!context.renstra_id) {
    return {
      data: null,
      warning:
        'context.renstra_id kosong sehingga hierarchy realisasi kinerja (pengganti lpk_dispang, ' +
        'endpoint /realisasi-indikator-renstra/hierarchy) tidak dapat dimuat — endpoint ini wajib renstra_id.',
    };
  }

  try {
    const tree = await callHierarchyController({
      renstra_id: context.renstra_id,
      tahun: context.tahun,
    });

    if (!Array.isArray(tree) || !tree.length) {
      return { data: null, warning: null };
    }

    return { data: tree, warning: null };
  } catch (error) {
    return {
      data: null,
      warning: `Gagal memuat hierarchy realisasi kinerja (pengganti lpk_dispang): ${error.message}`,
    };
  }
};

/**
 * Lakip (tabel lakip) tidak punya kolom opd_id, dan asosiasi Sequelize-nya
 * (Lakip.belongsTo(RenstraProgram, { foreignKey: 'renstra_id' })) TIDAK
 * cocok dengan data nyata: nilai Lakip.renstra_id yang ada ternyata merujuk
 * langsung ke RenstraOPD.id (pola yang sama dipakai MrPlanningContext.renstra_id
 * & IndikatorRenstra.renstra_id), bukan ke RenstraProgram.id.
 *
 * context.opd_id TIDAK dipakai sebagai filter karena tabel master
 * OpdPenanggungJawab punya banyak baris duplikat untuk OPD yang sama dengan
 * id berbeda-beda (mis. "Dinas Pangan" = id 107/109/110/111/112/348/349/350),
 * dan tiap modul menyimpan id duplikat yang berbeda — filter equality by
 * opd_id akan salah (false negative) walau OPD-nya sama.
 *
 * Filter aman yang dipakai: Lakip.renstra_id = context.renstra_id (terbukti
 * valid karena context.renstra_id sudah dipakai untuk RenstraOPD.findByPk
 * di getRenstraSuggestion di atas).
 */
const getLakipSuggestion = async (context) => {
  if (!context.renstra_id) {
    return {
      data: null,
      warning:
        'context.renstra_id kosong sehingga LAKIP tidak dapat difilter per-OPD dengan aman ' +
        '(context.opd_id tidak dipakai karena tidak andal — lihat catatan kode).',
    };
  }

  const where = { renstra_id: context.renstra_id };

  if (context.tahun) {
    where.tahun = String(context.tahun);
  }

  if (context.periode_id) {
    where.periode_id = context.periode_id;
  }

  const rows = await db.Lakip.findAll({
    where,
    limit: 50,
    order: [['id', 'ASC']],
  });

  if (!rows.length) {
    return { data: null, warning: null };
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      tahun: row.tahun,
      program: row.program,
      kegiatan: row.kegiatan,
      indikator_kinerja: row.indikator_kinerja,
      target: row.target,
      realisasi: row.realisasi,
      pagu_anggaran: row.pagu_anggaran,
      realisasi_anggaran: row.realisasi_anggaran,
      evaluasi: row.evaluasi,
      rekomendasi: row.rekomendasi,
    })),
    warning: null,
  };
};

const getAutoFillData = async (contextId) => {
  const context = await db.MrPlanningContext.findByPk(contextId);

  if (!context) {
    const error = new Error('MR planning context tidak ditemukan.');
    error.statusCode = 404;
    error.code = 'MR_CONTEXT_NOT_FOUND';
    throw error;
  }

  const [renstraSuggestion, lpkSuggestion, lakipSuggestion] = await Promise.all([
    getRenstraSuggestion(context),
    getLpkSuggestion(context),
    getLakipSuggestion(context),
  ]);

  return {
    context: {
      id: context.id,
      tahun: context.tahun,
      periode_id: context.periode_id,
      renstra_id: context.renstra_id,
      opd_id: context.opd_id,
      owner_division_id: context.owner_division_id,
      nama_opd: context.nama_opd,
    },
    renstra_suggestion: renstraSuggestion,
    lpk_suggestion: lpkSuggestion.data,
    lakip_suggestion: lakipSuggestion.data,
    sumber_data: {
      renstra: Boolean(renstraSuggestion),
      lpk: Boolean(lpkSuggestion.data),
      lakip: Boolean(lakipSuggestion.data),
    },
    warnings: {
      lpk: lpkSuggestion.warning,
      lakip: lakipSuggestion.warning,
    },
  };
};

/**
 * Opsi indikator stage 'sasaran' untuk sebuah Renstra — dipakai dropdown
 * pemilihan sasaran+indikator di StepRiskAnalysis. Join indikator_renstra
 * (stage='sasaran') ke renstra_sasaran lewat ref_id dilakukan di JS (bukan
 * raw SQL) karena IndikatorRenstra tidak punya asosiasi Sequelize langsung
 * ke RenstraSasaran untuk ref_id — pola yang sama dipakai
 * realisasiIndikatorRenstraController.getHierarchy.
 */
const getSasaranIndikatorOptions = async (renstraId) => {
  if (!renstraId) {
    const error = new Error('renstraId wajib diisi.');
    error.statusCode = 400;
    error.code = 'MR_AUTOFILL_RENSTRA_ID_REQUIRED';
    throw error;
  }

  const [sasarans, indikators] = await Promise.all([
    db.RenstraSasaran.findAll({ where: { renstra_id: renstraId } }),
    db.IndikatorRenstra.findAll({
      where: { renstra_id: renstraId, stage: 'sasaran' },
      order: [['id', 'ASC']],
    }),
  ]);

  const sasaranById = new Map(sasarans.map((row) => [row.id, row]));

  return indikators
    .map((ind) => {
      const sasaran = sasaranById.get(ind.ref_id);

      if (!sasaran) {
        return null;
      }

      return {
        sasaran_id: sasaran.id,
        isi_sasaran: sasaran.isi_sasaran,
        indikator_id: ind.id,
        kode_indikator: ind.kode_indikator,
        nama_indikator: ind.nama_indikator,
        satuan: ind.satuan,
        target_tahun_1: ind.target_tahun_1,
      };
    })
    .filter(Boolean);
};

/**
 * Opsi data LAKIP (program/kegiatan/indikator) untuk sebuah Renstra — dipakai
 * dropdown "Pilih Data LAKIP" di StepContext. Reuse getLakipSuggestion (filter
 * renstra_id, bukan opd_id — lihat catatan di getLakipSuggestion di atas)
 * supaya logic filter tidak terduplikasi.
 *
 * tahun bersifat opsional: jika diisi, hanya baris LAKIP tahun tsb yang
 * dikembalikan (selaras dengan field "Tahun" aktif di form Step 1). Jika
 * tahun aktif belum punya data LAKIP, dropdown akan tampil kosong — user
 * perlu memilih tahun yang sesuai data (bukan berarti fitur ini rusak).
 */
const getLakipOptions = async (renstraId, tahun) => {
  if (!renstraId) {
    const error = new Error('renstraId wajib diisi.');
    error.statusCode = 400;
    error.code = 'MR_AUTOFILL_RENSTRA_ID_REQUIRED';
    throw error;
  }

  const { data } = await getLakipSuggestion({ renstra_id: renstraId, tahun });

  return (data || []).map((row) => ({
    lakip_id: row.id,
    tahun: row.tahun,
    program: row.program,
    kegiatan: row.kegiatan,
    indikator_kinerja: row.indikator_kinerja,
    target: row.target,
    realisasi: row.realisasi,
    pagu_anggaran: row.pagu_anggaran,
    realisasi_anggaran: row.realisasi_anggaran,
    evaluasi: row.evaluasi,
    rekomendasi: row.rekomendasi,
  }));
};

module.exports = {
  getAutoFillData,
  getSasaranIndikatorOptions,
  getLakipOptions,
};

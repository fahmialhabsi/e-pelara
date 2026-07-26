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
const { Op } = db.Sequelize;
const realisasiIndikatorRenstraController = require('../../controllers/realisasiIndikatorRenstraController');

/**
 * Resolusi label nama OPD dari RenstraOPD.id — dipakai untuk memfilter tabel
 * modul lain (Dpa, MrPlanningTemuan) yang TIDAK berbagi ruang id yang sama
 * dengan RenstraOPD/OpdPenanggungJawab (lihat catatan di getLakipSuggestion:
 * OpdPenanggungJawab punya banyak baris duplikat per OPD, jadi filter by id
 * antar modul tidak andal). Cocok dengan pola nama-based matching yang sudah
 * dipakai renstraOpdProgramFilter.js & migrationService.js.
 */
const resolveRenstraOpdNamaOpd = async (renstraId) => {
  const renstraOpd = await db.RenstraOPD.findByPk(renstraId, {
    include: [
      { model: db.OpdPenanggungJawab, as: 'opd', attributes: ['nama_opd'], required: false },
    ],
  });

  if (!renstraOpd) return null;

  return (
    (renstraOpd.nama_opd && String(renstraOpd.nama_opd).trim()) ||
    (renstraOpd.opd?.nama_opd && String(renstraOpd.opd.nama_opd).trim()) ||
    null
  );
};

/**
 * Resolusi seluruh OpdPenanggungJawab.id yang berbagi nama OPD yang sama
 * dengan RenstraOPD.id tertentu — dipakai untuk memfilter Dpa.opd_id, yang
 * hidup di ruang id OpdPenanggungJawab (BUKAN RenstraOPD.id). Mengembalikan
 * semua id yang cocok (bukan cuma renstraOpd.opd_id tunggal) karena
 * OpdPenanggungJawab TERBUKTI punya banyak baris duplikat untuk OPD yang sama
 * (mis. "Dinas Pangan" = id 107/109/110/111/112/348/349/350 — dicek langsung
 * ke DB 2026-07-25) — pola sibling-id yang sama dipakai renstraOpdProgramFilter.js.
 *
 * CATATAN: awalnya fungsi ini (getPenatausahaanAkunOptions) memfilter Dpa
 * lewat kolom string `opd_penanggung_jawab`, tapi dicek langsung ke DB kolom
 * itu SELALU NULL di semua baris Dpa (tidak pernah diisi) — itu sebabnya
 * dropdown "Pilih Data Laporan Keuangan" selalu kosong. Diganti filter by
 * opd_id numerik (yang terbukti terisi & datanya ada).
 */
const resolveOpdPenanggungJawabIds = async (renstraId) => {
  const renstraOpd = await db.RenstraOPD.findByPk(renstraId, {
    include: [
      { model: db.OpdPenanggungJawab, as: 'opd', attributes: ['id', 'nama_opd'], required: false },
    ],
  });

  if (!renstraOpd) return [];

  const idSet = new Set();

  if (renstraOpd.opd_id != null) {
    idSet.add(renstraOpd.opd_id);
  }

  const label =
    (renstraOpd.nama_opd && String(renstraOpd.nama_opd).trim()) ||
    (renstraOpd.opd?.nama_opd && String(renstraOpd.opd.nama_opd).trim()) ||
    null;

  if (label) {
    const siblings = await db.OpdPenanggungJawab.findAll({
      where: { nama_opd: label },
      attributes: ['id'],
      raw: true,
    });
    siblings.forEach((row) => idSet.add(row.id));
  }

  return [...idSet];
};

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

/**
 * Pisahkan "5.1.02.01.01.0039 - Belanja Barang untuk Dijual..." (format yang
 * dipakai saat import realisasi PDF SIPD, lihat realisasiImportController.js)
 * jadi kode rekening & nama rekening terpisah. Duplikasi persis dari
 * `pisahKodeUraian` di frontend/src/features/penatausahaan/components/
 * BukuKasUmum.jsx — HARUS tetap sinkron kalau salah satu diubah.
 */
const pisahKodeUraian = (uraian) => {
  const raw = String(uraian || '');
  const match = raw.match(/^([\d.]{9,})\s*-\s*(.*)$/);
  if (match) return { kode_rekening: match[1], nama_rekening: match[2] };
  return { kode_rekening: null, nama_rekening: raw };
};

/**
 * Opsi akun/pos laporan keuangan (dari Penatausahaan, hasil OCR SIPD — lihat
 * project_penatausahaan_realisasi_import) untuk sebuah Renstra, dipakai
 * dropdown "Pilih Data Laporan Keuangan" di StepContext. Dpa difilter lewat
 * opd_id numerik (lihat resolveOpdPenanggungJawabIds) — BUKAN kolom string
 * `opd_penanggung_jawab` (dicek langsung ke DB: kolom itu selalu NULL).
 *
 * Dikelompokkan per KODE REKENING rinci (diambil dari prefix kolom `uraian`,
 * lihat pisahKodeUraian) — BUKAN per kolom `kode_akun`. `kode_akun` sengaja
 * di-hardcode sama ("5.1.02") untuk SEMUA baris oleh `realisasiImportController.js`
 * (satu-satunya kode induk level-3 yang ada di KodeAkunBas saat itu), jadi
 * mengelompokkan per kode_akun selalu menghasilkan 1 opsi saja walau ada
 * puluhan rincian belanja berbeda — dicek langsung ke DB 2026-07-25 (213 baris
 * Penatausahaan, semua kode_akun='5.1.02', tapi uraian-nya beda-beda).
 *
 * tahun bersifat opsional (selaras field "Tahun" di form Step 1); jika kosong
 * seluruh baris Penatausahaan lintas tahun untuk OPD tsb digabung.
 */
const getPenatausahaanAkunOptions = async (renstraId, tahun) => {
  if (!renstraId) {
    const error = new Error('renstraId wajib diisi.');
    error.statusCode = 400;
    error.code = 'MR_AUTOFILL_RENSTRA_ID_REQUIRED';
    throw error;
  }

  const opdIds = await resolveOpdPenanggungJawabIds(renstraId);

  if (!opdIds.length) {
    return [];
  }

  const dpaWhere = {
    is_active_version: true,
    opd_id: { [Op.in]: opdIds },
  };

  if (tahun) {
    dpaWhere.tahun = String(tahun);
  }

  const dpaRows = await db.Dpa.findAll({ where: dpaWhere, attributes: ['id'] });
  const dpaIds = dpaRows.map((row) => row.id);

  if (!dpaIds.length) {
    return [];
  }

  const penatausahaanRows = await db.Penatausahaan.findAll({
    where: { dpa_id: { [Op.in]: dpaIds } },
    attributes: ['uraian', 'jumlah', 'kode_akun', 'tahun'],
    raw: true,
  });

  if (!penatausahaanRows.length) {
    return [];
  }

  const grouped = new Map();

  penatausahaanRows.forEach((row) => {
    const { kode_rekening, nama_rekening } = pisahKodeUraian(row.uraian);
    const key = kode_rekening || nama_rekening || `row-${row.kode_akun}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        kode_rekening,
        nama_rekening,
        kode_akun: row.kode_akun,
        total_jumlah: 0,
        tahun: row.tahun,
      });
    }

    grouped.get(key).total_jumlah += Number(row.jumlah) || 0;
  });

  return [...grouped.values()].sort((a, b) =>
    String(a.kode_rekening || a.nama_rekening).localeCompare(
      String(b.kode_rekening || b.nama_rekening),
    ),
  );
};

/**
 * Opsi temuan tindak lanjut (BPK/BPKP/Inspektorat) untuk sebuah Renstra,
 * dipakai dropdown "Pilih Data Temuan" di StepContext. MrPlanningTemuan sudah
 * punya kolom nama_opd sendiri (didenormalisasi dari MrPlanningLhp saat
 * dibuat), jadi difilter langsung lewat label nama OPD yang sama seperti
 * getPenatausahaanAkunOptions (bukan opd_id — sama alasannya).
 *
 * entitasPemeriksa wajib salah satu dari 'BPK' | 'BPKP' | 'INSPEKTORAT'
 * (kode_item grup referensi MR_TLHP_ENTITAS_PEMERIKSA).
 */
const getTemuanOptions = async (renstraId, entitasPemeriksa, tahun) => {
  if (!renstraId) {
    const error = new Error('renstraId wajib diisi.');
    error.statusCode = 400;
    error.code = 'MR_AUTOFILL_RENSTRA_ID_REQUIRED';
    throw error;
  }

  if (!entitasPemeriksa) {
    const error = new Error('entitasPemeriksa wajib diisi.');
    error.statusCode = 400;
    error.code = 'MR_AUTOFILL_ENTITAS_PEMERIKSA_REQUIRED';
    throw error;
  }

  const namaOpd = await resolveRenstraOpdNamaOpd(renstraId);

  if (!namaOpd) {
    return [];
  }

  const temuanWhere = {
    [Op.and]: [
      db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.fn('TRIM', db.sequelize.col('MrPlanningTemuan.nama_opd'))),
        namaOpd.toLowerCase(),
      ),
    ],
  };

  const lhpInclude = {
    model: db.MrPlanningLhp,
    as: 'lhp',
    attributes: ['id', 'tahun', 'tahun_lhp'],
    required: Boolean(tahun),
    ...(tahun ? { where: { tahun: String(tahun) } } : {}),
  };

  // entitas_pemeriksa (kolom denormalisasi di MrPlanningTemuan) menyimpan LABEL
  // penuh ("Badan Pemeriksa Keuangan"), BUKAN kode singkat ("BPK") — dicek
  // langsung ke DB 2026-07-25 (resolveLabelsForPayload di
  // mrPlanningLhpService.js mengisi `entitas_pemeriksa` dari `nama_item`
  // reference, bukan `kode_item`). Jadi filter WAJIB lewat join
  // entitas_pemeriksa_ref_id -> kode_item, bukan bandingkan teks kolom
  // entitas_pemeriksa langsung dengan 'BPK'/'BPKP'/'INSPEKTORAT'.
  const entitasInclude = {
    model: db.MrReferenceItem,
    as: 'entitas_pemeriksa_ref',
    attributes: [],
    required: true,
    where: db.sequelize.where(
      db.sequelize.fn('UPPER', db.sequelize.col('entitas_pemeriksa_ref.kode_item')),
      String(entitasPemeriksa).toUpperCase(),
    ),
  };

  const rows = await db.MrPlanningTemuan.findAll({
    where: temuanWhere,
    include: [lhpInclude, entitasInclude],
    limit: 100,
    order: [['id', 'DESC']],
  });

  const temuanIds = rows.map((row) => row.id);

  // PENTING: sebelumnya wizard MR hanya tahu nilai_temuan_rupiah (nilai
  // temuan kotor) — anggaran risiko yang diusulkan dari Temuan BPK selalu
  // memakai angka penuh walau sebagian/seluruhnya sudah disetor lewat
  // MrPlanningTindakLanjut (modul TLHP). Sisa = eksposur yang genuinely
  // masih perlu dikelola sebagai risiko, jadi disertakan sebagai opsi kedua
  // di samping nilai_temuan_rupiah (frontend yang memutuskan mana dipakai).
  const setoranByTemuan = temuanIds.length
    ? await db.MrPlanningTindakLanjut.findAll({
        where: {
          mr_planning_temuan_id: { [Op.in]: temuanIds },
          is_active: true,
          is_latest: true,
        },
        attributes: [
          'mr_planning_temuan_id',
          [db.sequelize.fn('SUM', db.sequelize.col('nilai_setoran_rupiah')), 'total_setoran'],
        ],
        group: ['mr_planning_temuan_id'],
        raw: true,
      })
    : [];

  const totalSetoranByTemuanId = setoranByTemuan.reduce((acc, row) => {
    acc[row.mr_planning_temuan_id] = Number(row.total_setoran) || 0;
    return acc;
  }, {});

  return rows.map((row) => {
    const nilaiTemuan = Number(row.nilai_temuan_rupiah) || 0;
    const totalSetoran = totalSetoranByTemuanId[row.id] || 0;

    return {
      temuan_id: row.id,
      nomor_temuan: row.nomor_temuan,
      kode_temuan: row.kode_temuan,
      judul_temuan: row.judul_temuan,
      uraian_temuan: row.uraian_temuan,
      kondisi: row.kondisi,
      sebab: row.sebab,
      akibat: row.akibat,
      status_rollup: row.status_rollup,
      entitas_pemeriksa: row.entitas_pemeriksa,
      nilai_temuan_rupiah: row.nilai_temuan_rupiah,
      nilai_sisa_rupiah: row.nilai_temuan_rupiah ? Math.max(0, nilaiTemuan - totalSetoran) : null,
      tahun: row.lhp?.tahun || row.lhp?.tahun_lhp || tahun || null,
    };
  });
};

module.exports = {
  getAutoFillData,
  getSasaranIndikatorOptions,
  getLakipOptions,
  getPenatausahaanAkunOptions,
  getTemuanOptions,
};

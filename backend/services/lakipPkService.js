'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  LakipPk,
  LakipPkOutputSasaran,
  LakipPkProgramAnggaran,
  IkmPenilaian,
  IndikatorRenstra,
  RenstraSasaran,
  RenstraOPD,
  Dpa,
  Penatausahaan,
  MrPlanningTemuan,
  MrPlanningLhp,
  MrReferenceItem,
  PejabatPenandatangan,
  RealisasiIndikatorRenstra,
} = require('../models');
const {
  resolveOpdPenanggungJawabIds,
  resolveRenstraOpdNamaOpd,
} = require('./mr/mrAutoFillAggregatorService');

const DEFAULT_PASAL = {
  pasal1_tujuan:
    'Perjanjian Kinerja ini bertujuan untuk mewujudkan tingkat kecukupan Pangan, terutama Pangan Pokok dengan harga yang wajar dan terjangkau sesuai dengan kebutuhan masyarakat; Peningkatan akses Pangan bagi masyarakat, terutama masyarakat rawan Pangan dan Gizi; Penyediaan Pangan yang beraneka ragam dan memenuhi persyaratan keamanan, mutu, dan Gizi bagi konsumsi masyarakat; Peningkatan pengetahuan dan kesadaran masyarakat tentang Pangan yang aman, bermutu, dan bergizi bagi konsumsi serta memastikan akuntabilitas kinerja Kepala Dinas Pangan.',
  pasal3_evaluasi:
    '1. Evaluasi kinerja dilakukan 2 (dua) kali dalam setahun\nSemester I (bulan Juni)\nSemester II (bulan Desember)\n2. Evaluasi mencakup\nCapaian output\nValidasi bukti ukur\nDampak nyata di lapangan\n3. Hasil evaluasi dituangkan dalam Berita Acara Evaluasi Kinerja',
  pasal4_konsekuensi:
    '1. Capaian < 80% pada Semester I \u2192 Teguran tertulis dan rencana perbaikan wajib.\n2. Capaian < 80% pada Semester II tanpa alasan objektif \u2192 Evaluasi jabatan / pencabutan kewenangan / penggantian pejabat sesuai ketentuan peraturan perundang-undangan\n3. Capaian \u2265 100% dan berkualitas \u2192 Dasar pemberian penghargaan, insentif kinerja, dan promosi.',
  pasal5_larangan:
    '1. Larangan\nPIHAK KEDUA DILARANG:\n1) Dilarang Membiarkan tidak tersedianya data Neraca Pangan Wilayah\n2) Dilarang tidak menyalurkan Cadangan Beras Pemerintah Daerah\n3) Dilarang tidak melakukan pengawasan PSAT\n4) Mengabaikan kesulitan akses pangan oleh masyarakat\n5) Menyalahgunakan kewenangan.',
  pasal5_etika:
    '2. Etika Kinerja\nPIHAK KEDUA WAJIB:\n1) Berorientasi pelayanan, yaitu komitmen memberikan pelayanan prima demi kepentingan dan kepuasan masyarakat, meliputi:\nMemahami dan memenuhi kebutuhan masyarakat\nRamah, cekatan, solutif dan dapat diandalkan\nMelakukan perbaikan tiada henti\n2) Akuntabel, yaitu bertanggung jawab atas kepercayaan yang diberikan, meliputi:\nMelaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin dan berintegritas tinggi\nMenggunakan kekayaan dan barang milik negara secara bertanggung jawab, efektif dan efisien\nTidak menyalahgunakan kewenangan jabatan\n3) Kompeten, yaitu terus belajar dan mengembangkan kapabilitas\n4) Harmonis, yaitu peduli dan menghargai perbedaan sehingga dapat membangun lingkungan kerja yang kondusif\n5) Loyal, yaitu berdedikasi dan mengutamakan kepentingan bangsa dan negara\n6) Adaptif, yaitu terus berinovasi dan antusias dalam menggerakkan serta menghadapi perubahan\n7) Kolaboratif, yaitu membangun kerja sama yang sinergis',
  pasal6_penutup:
    'a. Perjanjian ini dibuat untuk dilaksanakan dengan integritas, profesionalisme, dan tanggung jawab penuh demi meningkatnya akuntabilitas kinerja Pemerintah Provinsi Maluku Utara dan kesejahteraan masyarakat.\nb. Perjanjian ini dibuat dan dilaksanakan sesuai dengan peraturan Perundang-Undangan yang berlaku serta Peraturan terkait sebagaimana dimaksud Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 53 Tahun 2014 tentang Petunjuk Teknis Perjanjian Kinerja, Pelaporan Kinerja, dan Tata Cara Reviu atas Laporan Kinerja Instansi Pemerintah yang telah disusun sebagaimana terlampir dan merupakan satu kesatuan dan bagian tidak terpisahkan dari Perjanjian Kinerja ini.\n\nPerjanjian ini mulai berlaku sejak tanggal ditandatangani.',
};

const createPkError = (message, statusCode = 400, code = 'LAKIP_PK_ERROR') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

// ---- Sasaran Teknis: SATU SUMBER dengan BAB II (Renstra Sasaran) ----
const getSasaranTeknis = async (renstraId, tahun) => {
  const [sasaranList, renstra] = await Promise.all([
    RenstraSasaran.findAll({ where: { renstra_id: renstraId }, raw: true }),
    RenstraOPD.findByPk(renstraId, { raw: true }),
  ]);
  const bySasaranId = new Map(sasaranList.map((s) => [s.id, s]));
  if (!sasaranList.length) return [];

  const indikators = await IndikatorRenstra.findAll({
    where: {
      renstra_id: renstraId,
      stage: 'sasaran',
      source_indikator_id: null,
      is_iku_pk: true,
      ref_id: { [Op.in]: sasaranList.map((s) => s.id) },
    },
    raw: true,
  });

  let offset = 1;
  if (renstra?.tahun_mulai && tahun) {
    offset = Number(tahun) - Number(renstra.tahun_mulai) + 1;
    if (offset < 1) offset = 1;
    if (offset > 6) offset = 6;
  }

  const tahunSebelumnya = tahun ? String(Number(tahun) - 1) : null;
  const realisasiRows = tahunSebelumnya
    ? await RealisasiIndikatorRenstra.findAll({
        where: {
          indikator_renstra_id: { [Op.in]: indikators.map((i) => i.id) },
          tahun: tahunSebelumnya,
        },
        raw: true,
      })
    : [];
  const realisasiByIndikatorId = new Map(
    realisasiRows.map((r) => [r.indikator_renstra_id, r.nilai_realisasi]),
  );

  return indikators.map((ind) => ({
    indikator_renstra_id: ind.id,
    sasaran_id: ind.ref_id,
    isi_sasaran: bySasaranId.get(ind.ref_id)?.isi_sasaran || '-',
    nama_indikator: ind.nama_indikator,
    satuan: ind.satuan,
    target_tahun_ini: ind[`target_tahun_${offset}`],
    realisasi_tahun_lalu: realisasiByIndikatorId.get(ind.id) ?? null,
    tahun_realisasi: tahunSebelumnya,
    sumber_data: ind.sumber_data || null,
    target_tahun_1: ind.target_tahun_1,
    target_tahun_2: ind.target_tahun_2,
    target_tahun_3: ind.target_tahun_3,
    target_tahun_4: ind.target_tahun_4,
    target_tahun_5: ind.target_tahun_5,
    target_tahun_6: ind.target_tahun_6,
  }));
};

// ---- Serapan Anggaran (live, dari DPA + Penatausahaan) ----
const getSerapanAnggaranLive = async (renstraId, tahun) => {
  const opdIds = await resolveOpdPenanggungJawabIds(renstraId);
  if (!opdIds.length) return { pagu: 0, realisasi: 0, persen: null };

  const dpaRows = await Dpa.findAll({
    where: { opd_id: { [Op.in]: opdIds }, tahun: Number(tahun), is_active_version: true },
    attributes: ['id', 'pagu_total'],
    raw: true,
  });

  const pagu = dpaRows.reduce((sum, r) => sum + (Number(r.pagu_total) || 0), 0);
  const dpaIds = dpaRows.map((r) => r.id);

  const realisasi = dpaIds.length
    ? Number((await Penatausahaan.sum('jumlah', { where: { dpa_id: { [Op.in]: dpaIds } } })) || 0)
    : 0;

  const persen = pagu > 0 ? Math.round((realisasi / pagu) * 10000) / 100 : null;
  return { pagu, realisasi, persen };
};

// ---- Tindak Lanjut Temuan BPK (live, dari modul TLHP) ----
const getTlBpkLive = async (renstraId, tahun) => {
  const namaOpd = await resolveRenstraOpdNamaOpd(renstraId);
  if (!namaOpd) return { total: 0, selesai: 0, persen: null };

  const rows = await MrPlanningTemuan.findAll({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('MrPlanningTemuan.nama_opd'))),
      namaOpd.toLowerCase(),
    ),
    include: [
      {
        model: MrPlanningLhp,
        as: 'lhp',
        attributes: [],
        required: Boolean(tahun),
        ...(tahun ? { where: { tahun: String(tahun) } } : {}),
      },
      {
        model: MrReferenceItem,
        as: 'entitas_pemeriksa_ref',
        attributes: [],
        required: true,
        where: sequelize.where(
          sequelize.fn('UPPER', sequelize.col('entitas_pemeriksa_ref.kode_item')),
          'BPK',
        ),
      },
    ],
    attributes: ['id', 'status_rollup'],
  });

  const total = rows.length;
  const selesai = rows.filter((r) => r.status_rollup === 'Selesai').length;
  const persen = total > 0 ? Math.round((selesai / total) * 10000) / 100 : null;
  return { total, selesai, persen };
};

// ---- IKM (skor terakhir per tahun) ----
const getIkmTerakhir = async (renstraId, tahun) => {
  const row = await IkmPenilaian.findOne({
    where: { renstra_id: renstraId, tahun: Number(tahun) },
    order: [['id', 'DESC']],
    raw: true,
  });
  return row || null;
};

const upsertIkm = async (renstraId, tahun, payload = {}) => {
  const skor =
    payload.skor === '' || payload.skor === undefined || payload.skor === null
      ? null
      : Number(payload.skor);

  const [row] = await IkmPenilaian.findOrCreate({
    where: { renstra_id: renstraId, tahun: Number(tahun), periode: payload.periode || 'tahunan' },
    defaults: {
      skor,
      keterangan: payload.keterangan || null,
      sumber_survei: payload.sumber_survei || null,
    },
  });
  await row.update({
    skor,
    keterangan: payload.keterangan || null,
    sumber_survei: payload.sumber_survei || null,
  });
  return row;
};

// ---- CRUD dokumen PK ----
const getPkDetail = async (renstraId, tahun) => {
  const renstra = await RenstraOPD.findByPk(renstraId, { raw: true });
  if (!renstra) {
    throw createPkError('Renstra OPD tidak ditemukan.', 404, 'LAKIP_PK_RENSTRA_NOT_FOUND');
  }

  const pk = await LakipPk.findOne({
    where: { renstra_id: renstraId, tahun: Number(tahun) },
    include: [
      { model: LakipPkOutputSasaran, as: 'output_sasaran' },
      { model: LakipPkProgramAnggaran, as: 'program_anggaran' },
    ],
  });

  // Konvensi dokumen PK: "Realisasi" yang disandingkan dengan "Target {tahun}"
  // selalu merujuk ke tahun SEBELUMNYA (PK disusun di awal tahun, sebelum
  // tahun berjalan itu sendiri punya data realisasi) — sama seperti
  // realisasi_tahun_lalu di getSasaranTeknis.
  const tahunRealisasi = Number(tahun) - 1;

  const [sasaranTeknis, serapanAnggaran, tlBpk, ikm, pihakKedua] = await Promise.all([
    getSasaranTeknis(renstraId, tahun),
    getSerapanAnggaranLive(renstraId, tahunRealisasi),
    getTlBpkLive(renstraId, tahunRealisasi),
    getIkmTerakhir(renstraId, tahunRealisasi),
    PejabatPenandatangan.findOne({
      where: { tahun: Number(tahun), role: 'KEPALA_DINAS' },
      raw: true,
    }),
  ]);

  const pkJson = pk
    ? pk.toJSON()
    : {
        ...DEFAULT_PASAL,
        tahun: Number(tahun),
        renstra_id: renstraId,
        output_sasaran: [],
        program_anggaran: [],
      };

  const outputByIndikatorId = new Map(
    (pkJson.output_sasaran || []).map((o) => [String(o.indikator_renstra_id), o]),
  );
  const sasaranTeknisWithOutput = sasaranTeknis.map((s) => {
    const existing = outputByIndikatorId.get(String(s.indikator_renstra_id));
    return {
      ...s,
      output: existing?.output || '',
      bukti_ukur: existing?.bukti_ukur || '',
    };
  });

  return {
    ...pkJson,
    nama_opd: renstra.nama_opd,
    sasaran_teknis: sasaranTeknisWithOutput,
    tata_kelola: {
      serapan_anggaran: serapanAnggaran,
      tl_bpk: tlBpk,
      ikm,
    },
    pihak_kedua: pihakKedua
      ? { nama: pihakKedua.nama, nip: pihakKedua.nip, jabatan: pihakKedua.jabatan }
      : null,
  };
};

const savePk = async (renstraId, tahun, payload = {}) => {
  const t = await sequelize.transaction();
  try {
    const [pk] = await LakipPk.findOrCreate({
      where: { renstra_id: renstraId, tahun: Number(tahun) },
      defaults: { ...DEFAULT_PASAL },
      transaction: t,
    });

    await pk.update(
      {
        tanggal_ttd: payload.tanggal_ttd || null,
        pihak_pertama_nama: payload.pihak_pertama_nama ?? pk.pihak_pertama_nama,
        pihak_pertama_jabatan: payload.pihak_pertama_jabatan ?? pk.pihak_pertama_jabatan,
        pasal1_tujuan: payload.pasal1_tujuan ?? pk.pasal1_tujuan,
        pasal3_evaluasi: payload.pasal3_evaluasi ?? pk.pasal3_evaluasi,
        pasal4_konsekuensi: payload.pasal4_konsekuensi ?? pk.pasal4_konsekuensi,
        pasal5_larangan: payload.pasal5_larangan ?? pk.pasal5_larangan,
        pasal5_etika: payload.pasal5_etika ?? pk.pasal5_etika,
        pasal6_penutup: payload.pasal6_penutup ?? pk.pasal6_penutup,
        target_serapan_anggaran: payload.target_serapan_anggaran ?? pk.target_serapan_anggaran,
        target_tl_bpk: payload.target_tl_bpk ?? pk.target_tl_bpk,
        target_ikm: payload.target_ikm ?? pk.target_ikm,
      },
      { transaction: t },
    );

    if (Array.isArray(payload.output_sasaran)) {
      await LakipPkOutputSasaran.destroy({ where: { lakip_pk_id: pk.id }, transaction: t });
      if (payload.output_sasaran.length) {
        await LakipPkOutputSasaran.bulkCreate(
          payload.output_sasaran.map((item, idx) => ({
            lakip_pk_id: pk.id,
            indikator_renstra_id: item.indikator_renstra_id,
            output: item.output || null,
            bukti_ukur: item.bukti_ukur || null,
            urutan: idx,
          })),
          { transaction: t },
        );
      }
    }

    if (Array.isArray(payload.program_anggaran)) {
      await LakipPkProgramAnggaran.destroy({ where: { lakip_pk_id: pk.id }, transaction: t });
      if (payload.program_anggaran.length) {
        await LakipPkProgramAnggaran.bulkCreate(
          payload.program_anggaran.map((item, idx) => ({
            lakip_pk_id: pk.id,
            nama_program: item.nama_program,
            jumlah_anggaran: item.jumlah_anggaran || null,
            urutan: idx,
          })),
          { transaction: t },
        );
      }
    }

    await t.commit();
    return getPkDetail(renstraId, tahun);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getSasaranOptions = async (renstraId) => {
  const sasaranList = await RenstraSasaran.findAll({ where: { renstra_id: renstraId }, raw: true });
  const bySasaranId = new Map(sasaranList.map((s) => [s.id, s]));
  if (!sasaranList.length) return [];

  const indikators = await IndikatorRenstra.findAll({
    where: {
      renstra_id: renstraId,
      stage: 'sasaran',
      source_indikator_id: null,
      ref_id: { [Op.in]: sasaranList.map((s) => s.id) },
    },
    order: [
      ['ref_id', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
  });

  return indikators.map((ind) => ({
    indikator_renstra_id: ind.id,
    sasaran_id: ind.ref_id,
    isi_sasaran: bySasaranId.get(ind.ref_id)?.isi_sasaran || '-',
    nama_indikator: ind.nama_indikator,
    satuan: ind.satuan,
    sumber_data: ind.sumber_data || null,
    is_iku_pk: ind.is_iku_pk,
  }));
};

const setIsIkuPk = async (indikatorRenstraId, isIkuPk) => {
  const ind = await IndikatorRenstra.findByPk(indikatorRenstraId);
  if (!ind) throw createPkError('Indikator tidak ditemukan.', 404, 'LAKIP_PK_INDIKATOR_NOT_FOUND');
  await ind.update({ is_iku_pk: Boolean(isIkuPk) });
  return ind;
};

const getProgramAnggaranLive = async (renstraId, tahun) => {
  const opdIds = await resolveOpdPenanggungJawabIds(renstraId);
  if (!opdIds.length) return [];

  const dpaRows = await Dpa.findAll({
    where: { opd_id: { [Op.in]: opdIds }, tahun: String(tahun), is_active_version: true },
    attributes: ['id', 'program', 'kode_program', 'pagu_total'],
    raw: true,
  });
  if (!dpaRows.length) return [];

  const dpaIds = dpaRows.map((r) => r.id);
  const realisasiRows = dpaIds.length
    ? await Penatausahaan.findAll({
        where: { dpa_id: { [Op.in]: dpaIds } },
        attributes: ['dpa_id', [sequelize.fn('SUM', sequelize.col('jumlah')), 'total']],
        group: ['dpa_id'],
        raw: true,
      })
    : [];
  const realisasiByDpaId = new Map(realisasiRows.map((r) => [r.dpa_id, Number(r.total) || 0]));

  const byProgram = new Map();
  dpaRows.forEach((row) => {
    const key = row.kode_program || row.program;
    if (!byProgram.has(key)) {
      byProgram.set(key, { nama_program: row.program, pagu: 0, realisasi: 0 });
    }
    const entry = byProgram.get(key);
    entry.pagu += Number(row.pagu_total) || 0;
    entry.realisasi += realisasiByDpaId.get(row.id) || 0;
  });

  return Array.from(byProgram.values());
};

// ---- Output Kegiatan/Sub Kegiatan di bawah 1 Sasaran (Permenpan 53/2014:
// Sasaran = outcome, Kegiatan = output — Output PK ditarik dari sini,
// bukan diketik bebas) ----
const getKegiatanOutputUntukSasaran = async (renstraId, sasaranId, tahun) => {
  const [strategiRows] = await sequelize.query(
    `SELECT id FROM renstra_strategi WHERE renstra_id = :renstraId AND sasaran_id = :sasaranId`,
    { replacements: { renstraId, sasaranId } },
  );
  const strategiIds = strategiRows.map((r) => r.id);
  if (!strategiIds.length) return [];

  const [kebijakanRows] = await sequelize.query(
    `SELECT id FROM renstra_kebijakan WHERE renstra_id = :renstraId AND strategi_id IN (:strategiIds)`,
    { replacements: { renstraId, strategiIds } },
  );
  const kebijakanIds = kebijakanRows.map((r) => r.id);
  if (!kebijakanIds.length) return [];

  const [programRows] = await sequelize.query(
    `SELECT id, nama_program FROM renstra_program WHERE renstra_id = :renstraId AND kebijakan_id IN (:kebijakanIds)`,
    { replacements: { renstraId, kebijakanIds } },
  );
  const programIds = programRows.map((r) => r.id);
  const programById = new Map(programRows.map((r) => [r.id, r]));
  if (!programIds.length) return [];

  const [kegiatanRows] = await sequelize.query(
    `SELECT id, program_id, nama_kegiatan FROM renstra_kegiatan WHERE renstra_id = :renstraId AND program_id IN (:programIds)`,
    { replacements: { renstraId, programIds } },
  );
  const kegiatanIds = kegiatanRows.map((r) => r.id);
  const kegiatanById = new Map(kegiatanRows.map((r) => [r.id, r]));
  if (!kegiatanIds.length) return [];

  const [indikatorRows] = await sequelize.query(
    `SELECT id, ref_id, nama_indikator, satuan,
            target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5, target_tahun_6
     FROM indikator_renstra
     WHERE renstra_id = :renstraId AND stage = 'kegiatan' AND ref_id IN (:kegiatanIds)
     ORDER BY ref_id ASC, id ASC`,
    { replacements: { renstraId, kegiatanIds } },
  );

  const renstra = await RenstraOPD.findByPk(renstraId, { raw: true });
  let offset = 1;
  if (renstra?.tahun_mulai && tahun) {
    offset = Number(tahun) - Number(renstra.tahun_mulai) + 1;
    if (offset < 1) offset = 1;
    if (offset > 6) offset = 6;
  }

  return indikatorRows.map((ind) => {
    const kegiatan = kegiatanById.get(ind.ref_id);
    const program = kegiatan ? programById.get(kegiatan.program_id) : null;
    return {
      indikator_kegiatan_id: ind.id,
      kegiatan_id: ind.ref_id,
      nama_kegiatan: kegiatan?.nama_kegiatan || '-',
      nama_program: program?.nama_program || '-',
      nama_indikator: ind.nama_indikator,
      satuan: ind.satuan,
      target_tahun_ini: ind[`target_tahun_${offset}`],
    };
  });
};

module.exports = {
  getPkDetail,
  savePk,
  upsertIkm,
  getSasaranTeknis,
  getSasaranOptions,
  setIsIkuPk,
  getSerapanAnggaranLive,
  getTlBpkLive,
  getKegiatanOutputUntukSasaran,
  getProgramAnggaranLive,
};

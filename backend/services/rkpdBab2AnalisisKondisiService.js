'use strict';

/**
 * Auto-generate narasi BAB II — Analisis Kondisi untuk dokumen RKPD (per OPD).
 *
 * Sumber data (disepakati dengan user, 2026-07-30):
 *  1. Renstra OPD — capaian indikator sasaran & isu strategis (diturunkan dari
 *     kesenjangan target vs realisasi, pola sama seperti Bab II Renja).
 *  2. Tabel C-6 Permendagri 14/2026 — posisi OPD terhadap outcome prioritas
 *     Asta Cita hasil Kesepakatan Rakortekbang Tahun 2026.
 *
 * rkpd_dokumen tidak menyimpan renstra_pd_dokumen_id secara eksplisit,
 * sehingga Renstra OPD dicari lewat perangkat_daerah_id (dokumen Renstra
 * terbaru untuk OPD tsb), dan bidang urusan diturunkan dari kode_program
 * Renstra tersebut — bukan diinput ulang.
 */

const { pilihTargetTahun } = require('./lakipBridgeService');

const sanitize = (v) =>
  String(v ?? '......')
    .replace(/\r?\n/g, ' ')
    .trim();

const angkaId = (v) =>
  v === null || v === undefined || v === '' ? '......' : String(v).replace('.', ',');

async function generateRkpdBab2AnalisisKondisi(db, rkpdDokumenId) {
  const {
    RkpdDokumen,
    RenstraPdDokumen,
    PeriodeRpjmd,
    PerangkatDaerah,
    IndikatorRenstra,
    RealisasiIndikatorRenstra,
  } = db;

  const dok = await RkpdDokumen.findByPk(rkpdDokumenId);
  if (!dok) throw new Error('Dokumen RKPD tidak ditemukan.');

  const namaOpd = dok.nama_opd || 'Perangkat Daerah';
  const tahun = Number(dok.tahun);
  const tahunEvaluasi = tahun - 2;

  // rkpd_dokumen tidak selalu memiliki perangkat_daerah_id terisi (form
  // pembuatan RKPD hanya mengirim nama_opd sebagai teks bebas), sehingga
  // OPD-nya dicari ulang lewat kecocokan nama bila kolom itu kosong.
  let perangkatDaerahId = dok.perangkat_daerah_id || null;
  if (!perangkatDaerahId && namaOpd && PerangkatDaerah) {
    const kandidat = await PerangkatDaerah.findOne({
      where: { nama: { [db.Sequelize.Op.like]: `%${namaOpd.trim()}%` } },
    }).catch(() => null);
    perangkatDaerahId = kandidat?.id || null;
  }

  const renstra = perangkatDaerahId
    ? await RenstraPdDokumen.findOne({
        where: { perangkat_daerah_id: perangkatDaerahId },
        order: [['id', 'DESC']],
      }).catch(() => null)
    : null;
  const renstraOpdId = renstra?.renstra_opd_id || null;
  const periodeRenstra = renstra?.periode_id
    ? await PeriodeRpjmd.findByPk(renstra.periode_id).catch(() => null)
    : null;
  const tahunAwalRenstra = periodeRenstra?.tahun_awal || tahun;

  // Bidang urusan diturunkan dari kode program Renstra OPD, bukan diinput ulang.
  let kodeBidangUrusan = null;
  if (renstraOpdId) {
    const [prog] = await db.sequelize
      .query(
        `SELECT kode_program FROM renstra_program WHERE renstra_id = :rid LIMIT 1`,
        { replacements: { rid: renstraOpdId }, type: db.Sequelize.QueryTypes.SELECT },
      )
      .catch(() => [null]);
    if (prog?.kode_program) kodeBidangUrusan = String(prog.kode_program).slice(0, 4);
  }

  // --- 1. Capaian indikator sasaran Renstra + kesenjangan (dasar isu strategis) ---
  const indikatorSasaran =
    IndikatorRenstra && renstraOpdId
      ? await IndikatorRenstra.findAll({
          where: { renstra_id: renstraOpdId, stage: 'sasaran' },
        }).catch(() => [])
      : [];

  const capaian = [];
  for (const ir of indikatorSasaran) {
    const target = pilihTargetTahun(ir, tahunEvaluasi, tahunAwalRenstra);
    let realisasi = null;
    if (RealisasiIndikatorRenstra) {
      const r = await RealisasiIndikatorRenstra.findOne({
        where: { indikator_renstra_id: ir.id, tahun: String(tahunEvaluasi) },
      }).catch(() => null);
      if (r) realisasi = r.nilai_realisasi;
    }
    let persen = null;
    if (target !== null && target !== undefined && realisasi !== null && Number(target) !== 0) {
      persen = (Number(realisasi) / Number(target)) * 100;
    }
    capaian.push({ nama: ir.nama_indikator, satuan: ir.satuan, target, realisasi, persen });
  }

  const gagal = capaian.filter((c) => c.persen !== null && c.persen < 100);
  const lampaui = capaian.filter((c) => c.persen !== null && c.persen > 100);

  // --- 2. Tabel C-6 — outcome prioritas Asta Cita untuk bidang urusan ini ---
  const outcomeAstaCita = kodeBidangUrusan
    ? await db.sequelize
        .query(
          `SELECT DISTINCT asta_cita, outcome_prioritas, indikator, satuan
             FROM renja_outcome_asta_cita
            WHERE kode_bidang_urusan = :bu AND sumber = 'rakortekbang_2026'`,
          { replacements: { bu: kodeBidangUrusan }, type: db.Sequelize.QueryTypes.SELECT },
        )
        .catch(() => [])
    : [];

  // --- Rakit narasi ---
  let teks = `Kondisi ${namaOpd} pada penyusunan RKPD Tahun ${tahun} dianalisis berdasarkan capaian pelaksanaan Renstra ${namaOpd}`;
  teks += periodeRenstra ? ` Tahun ${periodeRenstra.tahun_awal}-${periodeRenstra.tahun_akhir}` : '';
  teks += ` serta keselarasan terhadap kesepakatan Rakortekbang Tahun 2026.\n\n`;

  if (capaian.length > 0) {
    teks += `Berdasarkan evaluasi capaian indikator sasaran Renstra Tahun ${tahunEvaluasi}, dari ${capaian.length} indikator yang diukur, `;
    teks += `${lampaui.length} indikator melampaui target dan ${gagal.length} indikator belum mencapai target. `;
    if (gagal.length > 0) {
      teks += `Kondisi yang masih menjadi tantangan yaitu ${gagal
        .map(
          (c) =>
            `${sanitize(c.nama)} (realisasi ${angkaId(c.realisasi)} dari target ${angkaId(c.target)}${c.persen !== null ? `, capaian ${c.persen.toFixed(2)} persen` : ''})`,
        )
        .join('; ')}. `;
    }
    if (lampaui.length > 0) {
      teks += `Sementara itu, capaian yang telah melampaui target yaitu ${lampaui
        .map((c) => sanitize(c.nama))
        .join(', ')}, menjadi modal untuk mempertahankan kinerja pada Tahun ${tahun}.`;
    }
    teks += `\n\n`;
  } else {
    teks += `Data capaian indikator sasaran Renstra untuk Tahun ${tahunEvaluasi} belum tersedia; bagian ini perlu dilengkapi setelah data Renstra dan realisasi tersedia.\n\n`;
  }

  if (outcomeAstaCita.length > 0) {
    const daftarOutcome = [...new Set(outcomeAstaCita.map((o) => o.outcome_prioritas).filter(Boolean))];
    const daftarIndikator = [...new Set(outcomeAstaCita.map((o) => o.indikator).filter(Boolean))];
    teks += `Dari sisi keselarasan nasional, bidang urusan yang menjadi kewenangan ${namaOpd} tercatat sebagai pengampu outcome prioritas dalam mendukung Asta Cita hasil kesepakatan Rakortekbang Tahun 2026, yaitu ${daftarOutcome.join('; ')}, dengan indikator ${daftarIndikator.join('; ')}. Kondisi ini menjadi salah satu dasar perumusan arah kebijakan RKPD Tahun ${tahun}.\n\n`;
  } else if (kodeBidangUrusan) {
    teks += `Berdasarkan penelusuran Tabel C-6 Lampiran Permendagri Nomor 14 Tahun 2026, tidak terdapat outcome prioritas Asta Cita yang secara eksplisit menjadi kewenangan bidang urusan ${kodeBidangUrusan}.\n\n`;
  }

  teks += `Analisis kondisi ini menjadi dasar perumusan prioritas dan sasaran pembangunan ${namaOpd} pada RKPD Tahun ${tahun}.`;

  return teks.trim();
}

module.exports = { generateRkpdBab2AnalisisKondisi };

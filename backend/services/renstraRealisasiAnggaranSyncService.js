"use strict";

/**
 * Sync realisasi anggaran (Rp) dari Penatausahaan -> Renstra.
 *
 * Sumber: Penatausahaan.jumlah, dijumlahkan per dpa_id lalu diatribusikan ke
 * Dpa.kode_sub_kegiatan (mirror agregasi frontend BukuKasUmum.jsx). Kunci join
 * ke Renstra adalah kode_subkegiatan pada renstra_tabel_subkegiatan.
 *
 * Slot tahun (realisasi_tahun_1..6) ditentukan dari offset
 * (tahun - RenstraOPD.tahun_mulai + 1), sama seperti pagu_tahun_1..6.
 * Hanya offset 1..5 yang ditulis (tahun_6 selalu 0, mengikuti pola pagu
 * yang sudah ada di renstra_tabelSubKegiatanController.js).
 *
 * Rollup Kegiatan/Program/Kebijakan/Strategi/Sasaran/Tujuan memakai cache
 * renstra_pagu_cache, mirror penuh chain renstraPaguCachedIncrementalSyncService.js
 * tapi menjumlah kolom realisasi_tahun_N alih-alih pagu_tahun_N.
 */

const {
  sequelize,
  RenstraTabelSubkegiatan,
  RenstraTabelKegiatan,
  RenstraTabelProgram,
  RenstraTabelArahKebijakan,
  RenstraTabelStrategi,
  RenstraTabelSasaran,
  RenstraTabelTujuan,
  RenstraPaguCache,
  RenstraOPD,
} = require("../models");

const REALISASI_FIELDS = [
  "realisasi_tahun_1",
  "realisasi_tahun_2",
  "realisasi_tahun_3",
  "realisasi_tahun_4",
  "realisasi_tahun_5",
  "realisasi_tahun_6",
];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolveOffsetTahun = (tahunTarget, tahunMulai) => {
  const offset = Number(tahunTarget) - Number(tahunMulai) + 1;
  return offset;
};

async function hitungTotalRealisasiPerKodeSubKegiatan(tahun, transaction) {
  const rows = await sequelize.query(
    `
    SELECT dpa.kode_sub_kegiatan AS kode_sub_kegiatan, SUM(p.jumlah) AS total
    FROM penatausahaan p
    INNER JOIN dpa ON dpa.id = p.dpa_id
    WHERE dpa.tahun = :tahun
      AND dpa.kode_sub_kegiatan IS NOT NULL
      AND dpa.is_active_version = 1
    GROUP BY dpa.kode_sub_kegiatan
    `,
    {
      replacements: { tahun: String(tahun) },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    },
  );

  return new Map(rows.map((r) => [r.kode_sub_kegiatan, Number(r.total) || 0]));
}

function sumRealisasi(rows = []) {
  const result = {};
  for (const field of REALISASI_FIELDS) result[field] = 0;

  for (const row of rows) {
    for (const field of REALISASI_FIELDS) {
      result[field] += Number(row?.[field] || 0);
    }
  }

  result.realisasi_akhir_renstra = REALISASI_FIELDS.slice(0, 5).reduce(
    (sum, field) => sum + Number(result[field] || 0),
    0,
  );

  return result;
}

async function upsertRealisasiCache({ renstra_id, stage, ref_id, realisasi, transaction }) {
  if (!renstra_id || !stage || !ref_id) return null;

  await RenstraPaguCache.upsert(
    {
      renstra_id,
      stage,
      ref_id,
      ...realisasi,
      cached_at: new Date(),
    },
    { transaction },
  );
}

async function syncKegiatanRealisasi({ kegiatan_id, transaction }) {
  const kegiatan = await RenstraTabelKegiatan.findOne({ where: { kegiatan_id }, transaction });
  if (!kegiatan) return null;

  const subs = await RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id }, transaction });
  const realisasi = sumRealisasi(subs);
  const renstra_id = kegiatan.renstra_id || kegiatan.renstra_opd_id;

  await upsertRealisasiCache({ renstra_id, stage: "kegiatan", ref_id: kegiatan.id, realisasi, transaction });

  return { renstra_id, kegiatan_row_id: kegiatan.id, program_id: kegiatan.program_id };
}

async function syncProgramRealisasi({ renstra_id, program_id, transaction }) {
  if (!renstra_id || !program_id) return null;

  const program = await RenstraTabelProgram.findOne({ where: { program_id }, transaction });
  if (!program) return null;

  const kegiatanList = await RenstraTabelKegiatan.findAll({ where: { program_id }, transaction });
  const kegiatanRowIds = kegiatanList.map((k) => k.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: { renstra_id, stage: "kegiatan", ref_id: kegiatanRowIds },
    transaction,
  });

  const realisasi = sumRealisasi(cacheRows);

  await upsertRealisasiCache({ renstra_id, stage: "program", ref_id: program.id, realisasi, transaction });

  return { renstra_id, program_row_id: program.id, kebijakan_id: program.kebijakan_id || null };
}

async function syncKebijakanRealisasi({ renstra_id, kebijakan_id, transaction }) {
  if (!renstra_id || !kebijakan_id) return null;

  const kebijakan = await RenstraTabelArahKebijakan.findOne({ where: { kebijakan_id }, transaction });
  if (!kebijakan) return null;

  const programs = await RenstraTabelProgram.findAll({ where: { kebijakan_id }, transaction });
  const programRowIds = programs.map((p) => p.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: { renstra_id, stage: "program", ref_id: programRowIds },
    transaction,
  });

  const realisasi = sumRealisasi(cacheRows);

  await upsertRealisasiCache({ renstra_id, stage: "kebijakan", ref_id: kebijakan.id, realisasi, transaction });

  return { renstra_id, kebijakan_row_id: kebijakan.id, strategi_id: kebijakan.strategi_id || null };
}

async function syncStrategiRealisasi({ renstra_id, strategi_id, transaction }) {
  if (!renstra_id || !strategi_id) return null;

  const strategi = await RenstraTabelStrategi.findOne({ where: { strategi_id }, transaction });
  if (!strategi) return null;

  const kebijakanList = await RenstraTabelArahKebijakan.findAll({ where: { strategi_id }, transaction });
  const kebijakanRowIds = kebijakanList.map((k) => k.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: { renstra_id, stage: "kebijakan", ref_id: kebijakanRowIds },
    transaction,
  });

  const realisasi = sumRealisasi(cacheRows);

  await upsertRealisasiCache({ renstra_id, stage: "strategi", ref_id: strategi.id, realisasi, transaction });

  return { renstra_id, strategi_row_id: strategi.id, sasaran_id: strategi.sasaran_id || null };
}

async function syncSasaranRealisasi({ renstra_id, sasaran_id, transaction }) {
  if (!renstra_id || !sasaran_id) return null;

  const sasaran = await RenstraTabelSasaran.findOne({ where: { sasaran_id }, transaction });
  if (!sasaran) return null;

  const strategiList = await RenstraTabelStrategi.findAll({ where: { sasaran_id }, transaction });
  const strategiRowIds = strategiList.map((s) => s.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: { renstra_id, stage: "strategi", ref_id: strategiRowIds },
    transaction,
  });

  const realisasi = sumRealisasi(cacheRows);

  await upsertRealisasiCache({ renstra_id, stage: "sasaran", ref_id: sasaran.id, realisasi, transaction });

  return { renstra_id, sasaran_row_id: sasaran.id, tujuan_id: sasaran.tujuan_id || null };
}

async function syncTujuanRealisasi({ renstra_id, tujuan_id, transaction }) {
  if (!renstra_id || !tujuan_id) return null;

  const tujuan = await RenstraTabelTujuan.findOne({ where: { tujuan_id }, transaction });
  if (!tujuan) return null;

  const sasaranList = await RenstraTabelSasaran.findAll({ where: { tujuan_id }, transaction });
  const sasaranRowIds = sasaranList.map((s) => s.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: { renstra_id, stage: "sasaran", ref_id: sasaranRowIds },
    transaction,
  });

  const realisasi = sumRealisasi(cacheRows);

  await upsertRealisasiCache({ renstra_id, stage: "tujuan", ref_id: tujuan.id, realisasi, transaction });

  return { renstra_id, tujuan_row_id: tujuan.id };
}

async function rollupFromKegiatan({ kegiatan_id, transaction }) {
  const kegiatan = await syncKegiatanRealisasi({ kegiatan_id, transaction });
  if (!kegiatan) return;

  const program = await syncProgramRealisasi({
    renstra_id: kegiatan.renstra_id,
    program_id: kegiatan.program_id,
    transaction,
  });
  if (!program) return;

  const kebijakan = await syncKebijakanRealisasi({
    renstra_id: program.renstra_id,
    kebijakan_id: program.kebijakan_id,
    transaction,
  });
  if (!kebijakan) return;

  const strategi = await syncStrategiRealisasi({
    renstra_id: kebijakan.renstra_id,
    strategi_id: kebijakan.strategi_id,
    transaction,
  });
  if (!strategi) return;

  const sasaran = await syncSasaranRealisasi({
    renstra_id: strategi.renstra_id,
    sasaran_id: strategi.sasaran_id,
    transaction,
  });
  if (!sasaran) return;

  await syncTujuanRealisasi({
    renstra_id: sasaran.renstra_id,
    tujuan_id: sasaran.tujuan_id,
    transaction,
  });
}

/**
 * Entry point utama: sync realisasi anggaran tahun tertentu (mis. "2025")
 * ke seluruh baris renstra_tabel_subkegiatan + rollup cache di atasnya.
 */
async function syncRealisasiAnggaranTahun(tahun) {
  const t = await sequelize.transaction();

  try {
    const totalByKode = await hitungTotalRealisasiPerKodeSubKegiatan(tahun, t);

    const subRows = await RenstraTabelSubkegiatan.findAll({
      include: [{ model: RenstraOPD, as: "renstra", attributes: ["id", "tahun_mulai"] }],
      transaction: t,
    });

    let updated = 0;
    let skipped = 0;
    const kegiatanIds = new Set();

    for (const row of subRows) {
      const tahunMulai = row.renstra?.tahun_mulai;
      const kode = row.kode_subkegiatan;

      if (!tahunMulai || !kode) {
        skipped++;
        continue;
      }

      const offset = resolveOffsetTahun(tahun, tahunMulai);
      if (offset < 1 || offset > 5) {
        skipped++;
        continue;
      }

      const total = totalByKode.get(kode) || 0;
      const fieldName = `realisasi_tahun_${offset}`;

      const nextValues = {
        realisasi_tahun_1: Number(row.realisasi_tahun_1) || 0,
        realisasi_tahun_2: Number(row.realisasi_tahun_2) || 0,
        realisasi_tahun_3: Number(row.realisasi_tahun_3) || 0,
        realisasi_tahun_4: Number(row.realisasi_tahun_4) || 0,
        realisasi_tahun_5: Number(row.realisasi_tahun_5) || 0,
      };
      nextValues[fieldName] = round2(total);

      const realisasi_akhir_renstra = round2(
        nextValues.realisasi_tahun_1 +
          nextValues.realisasi_tahun_2 +
          nextValues.realisasi_tahun_3 +
          nextValues.realisasi_tahun_4 +
          nextValues.realisasi_tahun_5,
      );

      await row.update(
        {
          ...nextValues,
          realisasi_tahun_6: 0,
          realisasi_akhir_renstra,
          realisasi_synced_at: new Date(),
        },
        { transaction: t },
      );

      updated++;
      if (row.kegiatan_id) kegiatanIds.add(row.kegiatan_id);
    }

    for (const kegiatan_id of kegiatanIds) {
      await rollupFromKegiatan({ kegiatan_id, transaction: t });
    }

    await t.commit();

    return { tahun: String(tahun), updated, skipped, kegiatan_di_rollup: kegiatanIds.size };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  syncRealisasiAnggaranTahun,
  hitungTotalRealisasiPerKodeSubKegiatan,
  resolveOffsetTahun,
};

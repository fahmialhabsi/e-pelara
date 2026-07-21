"use strict";

/**
 * Sync realisasi anggaran (Rp) dari Renstra -> Lakip.
 *
 * Lakip tidak punya kode_sub_kegiatan/renstra_tabel_subkegiatan_id langsung
 * (lihat lakipBridgeService.js) — relasinya cuma renstra_id (= RenstraOPD.id)
 * + kecocokan teks indikator_kinerja. Untuk sampai ke angka Rp, ikuti jalur
 * yang sama: renstra_id + indikator_kinerja -> IndikatorRenstra
 * (stage='sub_kegiatan', nama_indikator cocok) -> RenstraTabelSubkegiatan
 * (indikator_id), yang kolom pagu_tahun_N/realisasi_tahun_N-nya SUDAH
 * tersinkron dari Penatausahaan oleh renstraRealisasiAnggaranSyncService.js.
 * Jadi di sini tidak perlu join ulang ke Penatausahaan — cukup baca ulang
 * slot tahun yang sudah dihitung di sana.
 */

const {
  sequelize,
  Lakip,
  IndikatorRenstra,
  RenstraTabelSubkegiatan,
  RenstraOPD,
} = require("../models");

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolveOffsetTahun = (tahunTarget, tahunMulai) => {
  return Number(tahunTarget) - Number(tahunMulai) + 1;
};

async function syncRealisasiAnggaranLakipTahun(tahun) {
  const t = await sequelize.transaction();

  try {
    const lakipRows = await Lakip.findAll({ where: { tahun: String(tahun) }, transaction: t });

    let updated = 0;
    let skipped = 0;
    const indikatorCacheByRenstraId = new Map();

    for (const row of lakipRows) {
      const key = String(row.indikator_kinerja || "").trim();
      if (!row.renstra_id || !key) {
        skipped++;
        continue;
      }

      let byNama = indikatorCacheByRenstraId.get(row.renstra_id);
      if (!byNama) {
        const indikatorRows = await IndikatorRenstra.findAll({
          where: { renstra_id: row.renstra_id, stage: "sub_kegiatan" },
          transaction: t,
        });
        byNama = new Map(indikatorRows.map((r) => [String(r.nama_indikator || "").trim(), r]));
        indikatorCacheByRenstraId.set(row.renstra_id, byNama);
      }

      const ir = byNama.get(key);
      if (!ir) {
        skipped++;
        continue;
      }

      const sub = await RenstraTabelSubkegiatan.findOne({
        where: { indikator_id: ir.id },
        include: [{ model: RenstraOPD, as: "renstra", attributes: ["id", "tahun_mulai"] }],
        transaction: t,
      });

      const tahunMulai = sub?.renstra?.tahun_mulai;
      if (!sub || !tahunMulai) {
        skipped++;
        continue;
      }

      const offset = resolveOffsetTahun(tahun, tahunMulai);
      if (offset < 1 || offset > 6) {
        skipped++;
        continue;
      }

      const pagu = round2(sub[`pagu_tahun_${offset}`]);
      const realisasi = round2(sub[`realisasi_tahun_${offset}`]);

      await row.update(
        {
          pagu_anggaran: pagu,
          realisasi_anggaran: realisasi,
          realisasi_anggaran_synced_at: new Date(),
        },
        { transaction: t },
      );

      updated++;
    }

    await t.commit();

    return { tahun: String(tahun), updated, skipped, total: lakipRows.length };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  syncRealisasiAnggaranLakipTahun,
  resolveOffsetTahun,
};

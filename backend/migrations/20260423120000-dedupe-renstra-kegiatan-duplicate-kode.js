"use strict";

/**
 * Menggabungkan baris duplikat di renstra_kegiatan (mis. 02.09.01.1.01 vs 2.09.01.1.01
 * pada program_id yang sama). Baris kanonik: prioritas rpjmd_kegiatan_id terisi,
 * lalu id terkecil. FK ke id duplikat dialihkan ke kanonik lalu duplikat dihapus.
 */
function kodeNormKey(k) {
  const s = k == null ? "" : String(k).trim();
  if (!s) return "";
  const stripped = s.replace(/^0+/, "");
  return stripped || s;
}

async function tableExists(qi, Sequelize, table) {
  const rows = await qi.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t LIMIT 1`,
    { replacements: { t: table }, type: Sequelize.QueryTypes.SELECT }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function safeUpdate(qi, sql, replacements) {
  try {
    await qi.query(sql, { replacements });
  } catch (e) {
    console.warn(`[dedupe-renstra-kegiatan] skip: ${e.message}`);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;

    const rows = await qi.query(
      `SELECT id, program_id, renstra_id, rpjmd_kegiatan_id, kode_kegiatan, nama_kegiatan
       FROM renstra_kegiatan
       ORDER BY program_id, id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const hasTabelSub = await tableExists(qi, Sequelize, "renstra_tabel_subkegiatan");

    const groups = new Map();
    for (const r of rows) {
      if (r.program_id == null) continue;
      const key = `${r.program_id}|${kodeNormKey(r.kode_kegiatan)}`;
      if (!kodeNormKey(r.kode_kegiatan)) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    for (const [, list] of groups) {
      if (list.length < 2) continue;

      list.sort((a, b) => {
        const ah = a.rpjmd_kegiatan_id != null ? 1 : 0;
        const bh = b.rpjmd_kegiatan_id != null ? 1 : 0;
        if (bh !== ah) return bh - ah;
        return a.id - b.id;
      });

      const keeper = list[0];
      const losers = list.slice(1);

      for (const L of losers) {
        const k = keeper.id;
        const l = L.id;
        if (k === l) continue;

        await safeUpdate(
          qi,
          `UPDATE renstra_subkegiatan SET kegiatan_id = :k WHERE kegiatan_id = :l`,
          { k, l }
        );
        await safeUpdate(
          qi,
          `UPDATE renstra_tabel_kegiatan SET kegiatan_id = :k WHERE kegiatan_id = :l`,
          { k, l }
        );
        if (hasTabelSub) {
          await safeUpdate(
            qi,
            `UPDATE renstra_tabel_subkegiatan SET kegiatan_id = :k WHERE kegiatan_id = :l`,
            { k, l }
          );
        }
        await safeUpdate(
          qi,
          `UPDATE indikator_renstra SET ref_id = :k WHERE stage = 'kegiatan' AND ref_id = :l`,
          { k, l }
        );

        await safeUpdate(
          qi,
          `DELETE FROM renstra_kegiatan WHERE id = :l`,
          { l }
        );
      }

      // Hapus baris renstra_subkegiatan duplikat untuk kegiatan kanonik (setelah semua merge).
      await safeUpdate(
        qi,
        `DELETE rs1 FROM renstra_subkegiatan rs1
         INNER JOIN renstra_subkegiatan rs2
           ON rs1.kegiatan_id = rs2.kegiatan_id
           AND rs1.sub_kegiatan_id = rs2.sub_kegiatan_id
           AND (rs1.renstra_program_id <=> rs2.renstra_program_id)
           AND rs1.id > rs2.id
         WHERE rs1.kegiatan_id = :kid`,
        { kid: keeper.id }
      );

      // Samakan kode/nama dengan master RPJMD bila tautan ada.
      const [keeperFresh] = await qi.query(
        `SELECT id, rpjmd_kegiatan_id FROM renstra_kegiatan WHERE id = :id LIMIT 1`,
        { replacements: { id: keeper.id }, type: Sequelize.QueryTypes.SELECT }
      );
      const rpjmdId = keeperFresh?.rpjmd_kegiatan_id ?? keeper.rpjmd_kegiatan_id;
      if (rpjmdId) {
        await safeUpdate(
          qi,
          `UPDATE renstra_kegiatan rk
           INNER JOIN kegiatan k ON k.id = rk.rpjmd_kegiatan_id
           SET rk.kode_kegiatan = k.kode_kegiatan,
               rk.nama_kegiatan = k.nama_kegiatan
           WHERE rk.id = :kid`,
          { kid: keeper.id }
        );
      }
    }
  },

  async down() {
    // Tidak dapat mengembalikan baris yang dihapus secara aman.
  },
};

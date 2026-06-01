/**
 * rkaSmartResolver.js — FINAL LOCKED CONSISTENT RKA RESOLVER
 * RKA → CONTEXT GUARANTEE (NO UI EMPTY FIELD)
 */

const { Rka } = require('../models');

/* =========================
   CONTEXT NORMALIZER
========================= */
function normalizeContext(row = {}) {
  return {
    id: row.id || null,
    program: row.program || row.program_nama || '',
    kegiatan: row.kegiatan || row.kegiatan_nama || '',
    sub_kegiatan: row.sub_kegiatan || row.sub_kegiatan_nama || '',
    indikator: row.indikator || '',
    target: row.target || '',
    pagu: row.pagu || 0,
  };
}

/* =========================
   MAIN RESOLVER
========================= */
async function resolveRkaSmart(input = {}) {
  try {
    /* =========================
       PRIORITY 1: BY ID
    ========================= */
    if (input?.rka_id) {
      const row = await Rka.findByPk(input.rka_id);

      if (!row) {
        return { ok: false, msg: 'RKA tidak ditemukan' };
      }

      return {
        ok: true,
        rka_id: row.id,
        context: normalizeContext(row),
      };
    }

    /* =========================
       PRIORITY 2: BY STRUCTURE
    ========================= */
    if (input?.program && input?.kegiatan && input?.sub_kegiatan) {
      const row = await Rka.findOne({
        where: {
          program: input.program,
          kegiatan: input.kegiatan,
          sub_kegiatan: input.sub_kegiatan,
        },
      });

      if (!row) {
        return { ok: false, msg: 'RKA tidak ditemukan dari struktur' };
      }

      return {
        ok: true,
        rka_id: row.id,
        context: normalizeContext(row),
      };
    }

    /* =========================
       FALLBACK
    ========================= */
    return {
      ok: false,
      msg: 'RKA tidak dapat di-resolve',
    };
  } catch (err) {
    return {
      ok: false,
      msg: err.message || 'RKA resolver error',
    };
  }
}

module.exports = { resolveRkaSmart };

"use strict";

const { kunciLra } = require("./lraService");
const { kunciNeraca } = require("./neracaService");
const { kunciLo } = require("./loService");
const { kunciLpe } = require("./lpeService");
const { kunciLak } = require("./lakService");

/**
 * Kunci snapshot LRA, Neraca, LO, LPE, LAK untuk tahun anggaran (setara "finalisasi" laporan).
 */
async function finalisasiSemuaLk(db, tahunAnggaran) {
  const out = {};
  out.lra = await kunciLra(db, tahunAnggaran);
  out.neraca = await kunciNeraca(db, tahunAnggaran);
  out.lo = await kunciLo(db, tahunAnggaran);
  out.lpe = await kunciLpe(db, tahunAnggaran);
  out.lak = await kunciLak(db, tahunAnggaran);
  return out;
}

module.exports = { finalisasiSemuaLk };

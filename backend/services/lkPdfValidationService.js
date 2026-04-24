"use strict";

const { validasiKeseimbangan } = require("./lpeService");
const { validasiLak } = require("./lakService");

/**
 * Validasi wajib sebelum generate PDF LK lengkap.
 * Memakai neraca balance, LPE vs neraca, LRA belanja vs BKU belanja, LAK vs BKU, CALK wajib FINAL.
 */
async function validasiSebelumGenerate(sequelize, db, tahunAnggaran) {
  const errors = [];
  const checks = [];

  const v = await validasiKeseimbangan(sequelize, db, tahunAnggaran);

  if (!v.neraca.balance) {
    const msg = `Neraca tidak balance: selisih Rp ${v.neraca.selisih?.toFixed?.(2) ?? v.neraca.selisih}`;
    errors.push(msg);
    checks.push({ id: "neraca_balance", ok: false, detail: v.neraca });
  } else {
    checks.push({ id: "neraca_balance", ok: true, detail: v.neraca });
  }

  if (v.lpe_neraca.cocok === false) {
    const msg = `Ekuitas LPE ≠ Neraca: selisih Rp ${v.lpe_neraca.selisih?.toFixed?.(2) ?? v.lpe_neraca.selisih}`;
    errors.push(msg);
    checks.push({ id: "lpe_neraca", ok: false, detail: v.lpe_neraca });
  } else if (v.lpe_neraca.cocok === null) {
    checks.push({
      id: "lpe_neraca",
      ok: false,
      detail: v.lpe_neraca,
      message: "Data LPE/Neraca belum lengkap",
    });
    errors.push("Data LPE atau Neraca belum ada — generate LPE/Neraca terlebih dahulu");
  } else {
    checks.push({ id: "lpe_neraca", ok: true, detail: v.lpe_neraca });
  }

  if (!v.lra_bku_belanja.cocok) {
    const msg = `Total realisasi belanja LRA ≠ pengeluaran belanja BKU: selisih Rp ${v.lra_bku_belanja.selisih?.toFixed?.(2) ?? v.lra_bku_belanja.selisih}`;
    errors.push(msg);
    checks.push({ id: "lra_bku_belanja", ok: false, detail: v.lra_bku_belanja });
  } else {
    checks.push({ id: "lra_bku_belanja", ok: true, detail: v.lra_bku_belanja });
  }

  const lakV = await validasiLak(db, tahunAnggaran);
  if (!lakV.balance) {
    const msg = `Saldo LAK ≠ Saldo BKU: selisih Rp ${lakV.selisih?.toFixed?.(2) ?? lakV.selisih}`;
    errors.push(msg);
    checks.push({ id: "lak_bku", ok: false, detail: lakV });
  } else {
    checks.push({ id: "lak_bku", ok: true, detail: lakV });
  }

  const { CalkTemplate, CalkKonten } = db;
  const templates = await CalkTemplate.findAll({
    where: { wajib: true },
    order: [["urutan", "ASC"]],
  });
  const konten = await CalkKonten.findAll({
    where: { tahun_anggaran: tahunAnggaran },
  });
  const map = new Map(konten.map((k) => [k.template_id, k]));
  if (templates.length === 0) {
    checks.push({
      id: "calk_wajib_final",
      ok: true,
      note: "Belum ada template CALK wajib di database (seed calk_template)",
    });
  } else {
  const babBelumFinal = templates.filter((t) => {
    const k = map.get(t.id);
    return !k || k.status !== "FINAL";
  });
  if (babBelumFinal.length > 0) {
    const judul = babBelumFinal.map((b) => b.judul).join("; ");
    errors.push(`${babBelumFinal.length} bab CALK wajib belum FINAL: ${judul}`);
    checks.push({
      id: "calk_wajib_final",
      ok: false,
      belum_final: babBelumFinal.map((b) => ({ id: b.id, judul: b.judul })),
    });
  } else {
    checks.push({ id: "calk_wajib_final", ok: true, total_wajib: templates.length });
  }
  }

  return {
    valid: errors.length === 0,
    errors,
    checks,
    tahun_anggaran: tahunAnggaran,
  };
}

module.exports = { validasiSebelumGenerate };

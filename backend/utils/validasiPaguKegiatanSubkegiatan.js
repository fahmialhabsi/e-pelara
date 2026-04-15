// utils/validasiPaguKegiatanSubkegiatan.js
const { Op } = require("sequelize");
const Decimal = require("decimal.js");
const {
  RenstraTabelKegiatan,
  RenstraTabelSubkegiatan,
  RenstraTabelProgram,
  RenstraKegiatan,
} = require("../models");

/**
 * Hitung total pagu kegiatan per program
 * excludeId -> untuk update agar kegiatan yang sedang diedit tidak dihitung
 */
async function validasiPaguKegiatan(programId, excludeId = null) {
  const where = { program_id: programId };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  // Ambil semua kegiatan (kecuali excludeId)
  const kegiatan = await RenstraTabelKegiatan.findAll({ where });

  // Hitung total pagu per tahun
  const totalPagu = {};
  for (let i = 1; i <= 6; i++) {
    const field = `pagu_tahun_${i}`;
    totalPagu[field] = kegiatan.reduce(
      (acc, k) => acc.plus(new Decimal(k[field] || 0)),
      new Decimal(0)
    );
  }

  // Ambil pagu program dari RenstraTabelProgram
  const program = await RenstraTabelProgram.findOne({
    where: { program_id: programId },
  });

  return { program, totalPagu };
}

/**
 * Hitung total pagu subkegiatan per kegiatan.
 * `kegiatanId` = FK ke `renstra_kegiatan.id` (sama di `renstra_tabel_subkegiatan.kegiatan_id`).
 * Batas pagu per tahun ada di `renstra_tabel_kegiatan`, bukan di `renstra_kegiatan`.
 */
async function validasiPaguSubkegiatan(
  kegiatanId,
  excludeId = null,
  programId = null
) {
  const where = { kegiatan_id: kegiatanId };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (programId != null && String(programId).trim() !== "") {
    where.program_id = programId;
  }

  const subkegiatan = await RenstraTabelSubkegiatan.findAll({ where });
  const totalPagu = {};

  for (let i = 1; i <= 6; i++) {
    const field = `pagu_tahun_${i}`;
    totalPagu[field] = subkegiatan.reduce(
      (acc, sk) => acc.plus(new Decimal(sk[field] || 0)),
      new Decimal(0)
    );
  }

  const tkWhere = { kegiatan_id: kegiatanId };
  if (programId != null && String(programId).trim() !== "") {
    tkWhere.program_id = programId;
  }
  let tabelKegiatan = await RenstraTabelKegiatan.findOne({ where: tkWhere });
  if (!tabelKegiatan && tkWhere.program_id != null) {
    tabelKegiatan = await RenstraTabelKegiatan.findOne({
      where: { kegiatan_id: kegiatanId },
    });
  }

  const kegiatan = tabelKegiatan
    ? tabelKegiatan.toJSON()
    : (await RenstraKegiatan.findByPk(kegiatanId))?.toJSON?.() ?? null;

  return { kegiatan, totalPagu };
}

/**
 * Generate warning per tahun untuk create/update kegiatan
 */
function generateWarningsUpdate(reqBody, totalPaguLain, program) {
  const warnings = {};
  let adaMelebihi = false;
  let adaKurang = false;

  // Belum ada baris renstra_tabel_program untuk program ini → tidak ada cap pagu dari tabel
  if (!program) {
    return { warnings, adaMelebihi: false, adaKurang: false };
  }

  for (let i = 1; i <= 6; i++) {
    const field = `pagu_tahun_${i}`;
    const paguInput = new Decimal(reqBody[field] || 0);
    const total = new Decimal(totalPaguLain[field] || 0).plus(paguInput);
    const paguProgram = new Decimal(program[field] || 0);
    const diff = total.minus(paguProgram);

    if (diff.gt(0)) {
      warnings[
        field
      ] = `❌ Tahun ${i}: Pagu melebihi program sebesar ${diff.toFixed(2)}`;
      adaMelebihi = true;
    } else if (diff.lt(0)) {
      warnings[field] = `⚠️ Tahun ${i}: Pagu masih kurang sebesar ${diff
        .abs()
        .toFixed(2)}`;
      adaKurang = true;
    } else {
      warnings[field] = `✅ Tahun ${i}: Pagu sudah sesuai program`;
    }
  }

  return { warnings, adaMelebihi, adaKurang };
}

module.exports = {
  validasiPaguKegiatan,
  validasiPaguSubkegiatan,
  generateWarningsUpdate,
};

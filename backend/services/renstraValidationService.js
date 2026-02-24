// services/renstraValidationService.js
const Decimal = require("decimal.js");
const {
  validasiPaguKegiatan,
  validasiPaguSubkegiatan,
  generateWarningsUpdate,
} = require("../utils/validasiPaguKegiatanSubkegiatan");
const groupWarnings = require("../utils/groupWarnings");

/**
 * Validasi Kegiatan terhadap Program
 */
async function validateKegiatanAgainstProgram(
  reqBody,
  program_id,
  excludeId = null
) {
  const { program, totalPagu } = await validasiPaguKegiatan(
    program_id,
    excludeId
  );
  const { warnings, adaMelebihi, adaKurang } = generateWarningsUpdate(
    reqBody,
    totalPagu,
    program
  );

  return {
    blocked: adaMelebihi,
    warnings: groupWarnings(warnings),
    adaKurang,
  };
}

/**
 * Validasi Subkegiatan terhadap Kegiatan
 */
async function validateSubAgainstKegiatan(data, kegiatan_id, excludeId = null) {
  const { kegiatan, totalPagu } = await validasiPaguSubkegiatan(
    kegiatan_id,
    excludeId
  );

  let warnings = [];
  let blocked = false;
  let adaKurang = false;

  for (let i = 1; i <= 6; i++) {
    const paguBaru = new Decimal(data[`pagu_tahun_${i}`] || 0);
    const paguKegiatan = new Decimal(kegiatan[`pagu_tahun_${i}`] || 0);
    const totalSub = new Decimal(totalPagu[`pagu_tahun_${i}`] || 0).plus(
      paguBaru
    );

    if (totalSub.gt(paguKegiatan)) {
      blocked = true;
      warnings.push(`❌ Pagu Subkegiatan melebihi pagu Kegiatan di tahun ${i}`);
    } else if (totalSub.lt(paguKegiatan)) {
      adaKurang = true;
      warnings.push(`⚠️ Pagu Subkegiatan masih kurang di tahun ${i}`);
    }
  }

  return { blocked, warnings, adaKurang };
}

module.exports = { validateKegiatanAgainstProgram, validateSubAgainstKegiatan };

// helpers/computeFinalRenstra.js

/**
 * Hitung target & pagu akhir dari SubKegiatan
 * @param {Array} subKegiatans - list subkegiatan
 */
function hitungAkhirSubKegiatan(subKegiatans = []) {
  return subKegiatans.reduce(
    (acc, sub) => {
      const hasPerTahun = [1, 2, 3, 4, 5, 6].some(
        (i) =>
          sub[`target_tahun_${i}`] != null ||
          sub[`pagu_tahun_${i}`] != null
      );

      if (hasPerTahun) {
        let totalTarget = 0;
        let totalPagu = 0;

        for (let i = 1; i <= 6; i++) {
          totalTarget += parseFloat(sub[`target_tahun_${i}`] || 0);
          totalPagu += parseFloat(sub[`pagu_tahun_${i}`] || 0);
        }

        acc.target += totalTarget / 6;
        acc.pagu += totalPagu;
      } else {
        acc.target += parseFloat(sub.target || sub.target_akhir_renstra || 0);
        acc.pagu += parseFloat(sub.pagu || sub.pagu_akhir_renstra || 0);
      }

      return acc;
    },
    { target: 0, pagu: 0 }
  );
}

/**
 * Hitung target & pagu akhir dari Kegiatan
 * Sumber utama: semua SubKegiatan di bawah kegiatan tersebut.
 * Menghasilkan:
 * - target_akhir_renstra
 * - pagu_akhir_renstra
 * - pagu_tahun_1 s/d pagu_tahun_6
 *
 * @param {Object} kegiatan - kegiatan object
 */
function hitungAkhirKegiatan(kegiatan) {
  const emptyResult = {
    target_akhir_renstra: 0,
    pagu_akhir_renstra: 0,
    pagu_tahun_1: 0,
    pagu_tahun_2: 0,
    pagu_tahun_3: 0,
    pagu_tahun_4: 0,
    pagu_tahun_5: 0,
    pagu_tahun_6: 0,
  };

  if (!kegiatan) return emptyResult;

  const result = { ...emptyResult };

  // Alias Sequelize: hasMany as "subkegiatans" atau "subKegiatans"
  const subs = kegiatan.subKegiatans || kegiatan.subkegiatans || [];

  // Jika ada subkegiatan, pagu kegiatan dihitung dari total semua subkegiatan
  if (Array.isArray(subs) && subs.length > 0) {
    subs.forEach((sub) => {
      let totalTargetSub = 0;

      for (let i = 1; i <= 6; i++) {
        const target = parseFloat(sub[`target_tahun_${i}`] || 0);
        const pagu = parseFloat(sub[`pagu_tahun_${i}`] || 0);

        totalTargetSub += target;
        result[`pagu_tahun_${i}`] += pagu;
        result.pagu_akhir_renstra += pagu;
      }

      result.target_akhir_renstra += totalTargetSub / 6;
    });

    return result;
  }

  // Fallback jika tidak ada relasi subkegiatan
  let totalTarget = 0;

  for (let i = 1; i <= 6; i++) {
    const target = parseFloat(kegiatan[`target_tahun_${i}`] || 0);
    const pagu = parseFloat(kegiatan[`pagu_tahun_${i}`] || 0);

    totalTarget += target;
    result[`pagu_tahun_${i}`] = pagu;
    result.pagu_akhir_renstra += pagu;
  }

  result.target_akhir_renstra = totalTarget / 6;

  return result;
}

/**
 * Hitung target & pagu akhir dari Program
 * @param {Object} program - program object
 */
function hitungAkhirProgram(program) {
  if (!program) {
    return {
      target_akhir_renstra: 0,
      pagu_akhir_renstra: 0,
    };
  }

  let totalTarget = 0;
  let totalPagu = 0;

  if (Array.isArray(program.kegiatans) && program.kegiatans.length > 0) {
    program.kegiatans.forEach((keg) => {
      const hasil = hitungAkhirKegiatan(keg);

      totalTarget += hasil.target_akhir_renstra;
      totalPagu += hasil.pagu_akhir_renstra;
    });
  }

  return {
    target_akhir_renstra: totalTarget,
    pagu_akhir_renstra: totalPagu,
  };
}

module.exports = {
  hitungAkhirSubKegiatan,
  hitungAkhirKegiatan,
  hitungAkhirProgram,
};
// helpers/computeFinalRenstra.js

/**
 * Hitung target & pagu akhir dari SubKegiatan
 * @param {Array} subKegiatans - list subkegiatan
 */
function hitungAkhirSubKegiatan(subKegiatans = []) {
  return subKegiatans.reduce(
    (acc, sub) => {
      acc.target += parseFloat(sub.target || sub.target_akhir_renstra || 0);
      acc.pagu += parseFloat(sub.pagu || sub.pagu_akhir_renstra || 0);
      return acc;
    },
    { target: 0, pagu: 0 }
  );
}

/**
 * Hitung target & pagu akhir dari Kegiatan
 * @param {Object} kegiatan - kegiatan object
 */
function hitungAkhirKegiatan(kegiatan) {
  if (!kegiatan) return { target: 0, pagu: 0 };

  let target = 0;
  let pagu = 0;

  // Jika ada subKegiatans, hitung dari subKegiatans
  if (
    Array.isArray(kegiatan.subKegiatans) &&
    kegiatan.subKegiatans.length > 0
  ) {
    const hasilSub = hitungAkhirSubKegiatan(kegiatan.subKegiatans);
    target = hasilSub.target;
    pagu = hasilSub.pagu;
  } else {
    // Jika tidak ada subKegiatans, gunakan field target_tahun_X dan pagu_tahun_X
    for (let i = 1; i <= 6; i++) {
      target += parseFloat(kegiatan[`target_tahun_${i}`] || 0);
      pagu += parseFloat(kegiatan[`pagu_tahun_${i}`] || 0);
    }
    target = target / 6; // rata-rata target
  }

  return { target_akhir_renstra: target, pagu_akhir_renstra: pagu };
}

/**
 * Hitung target & pagu akhir dari Program
 * @param {Object} program - program object
 */
function hitungAkhirProgram(program) {
  if (!program) return { target_akhir_renstra: 0, pagu_akhir_renstra: 0 };

  let totalTarget = 0;
  let totalPagu = 0;

  if (Array.isArray(program.kegiatans) && program.kegiatans.length > 0) {
    program.kegiatans.forEach((keg) => {
      const hasil = hitungAkhirKegiatan(keg);
      totalTarget += hasil.target_akhir_renstra;
      totalPagu += hasil.pagu_akhir_renstra;
    });
  }

  return { target_akhir_renstra: totalTarget, pagu_akhir_renstra: totalPagu };
}

module.exports = {
  hitungAkhirSubKegiatan,
  hitungAkhirKegiatan,
  hitungAkhirProgram,
};

// src/shared/components/utils/periodeUtils.js
export const getPeriodeIdFromTahun = (tahun, periodeList) => {
  return periodeList.find(
    (periode) =>
      Number(tahun) >= Number(periode.tahun_awal) &&
      Number(tahun) <= Number(periode.tahun_akhir)
  )?.id;
};

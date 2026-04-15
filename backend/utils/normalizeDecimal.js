// utils/normalizeDecimal.js

/** Kolom DECIMAL di MySQL tidak boleh diisi string kosong `''` — harus NULL atau angka valid. */
function coerceEmptyToNull(v) {
  if (v === "" || v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function normalizeDecimalFields(data, fieldNames = null) {
  const defaultFields = [
    "baseline",
    "target_awal",
    "target_akhir",
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
    "capaian_tahun_1",
    "capaian_tahun_2",
    "capaian_tahun_3",
    "capaian_tahun_4",
    "capaian_tahun_5",
    "realisasi",
    "anggaran",
  ];

  // ✅ Validasi eksplisit: pastikan selalu array
  const fieldsToNormalize = Array.isArray(fieldNames)
    ? fieldNames
    : defaultFields;

  const normalize = (entry) => {
    fieldsToNormalize.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) return;
      const coerced = coerceEmptyToNull(entry[field]);
      if (coerced === null) {
        entry[field] = null;
        return;
      }
      if (typeof coerced === "string") {
        entry[field] = coerced.trim().replace(",", ".");
      }
    });
  };

  if (Array.isArray(data)) {
    data.forEach(normalize);
  } else if (typeof data === "object" && data !== null) {
    normalize(data);
  }

  return data;
}

module.exports = {
  normalizeDecimalFields,
};

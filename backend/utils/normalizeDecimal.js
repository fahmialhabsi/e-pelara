// utils/normalizeDecimal.js

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
  ];

  // ✅ Validasi eksplisit: pastikan selalu array
  const fieldsToNormalize = Array.isArray(fieldNames)
    ? fieldNames
    : defaultFields;

  const normalize = (entry) => {
    fieldsToNormalize.forEach((field) => {
      if (typeof entry[field] === "string") {
        entry[field] = entry[field].replace(",", ".");
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

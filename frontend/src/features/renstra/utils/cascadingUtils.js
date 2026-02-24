// src/features/renstra/utils/cascadingUtils.js

export const cascadingLabels = {
  tujuan_id: "Tujuan",
  sasaran_id: "Sasaran",
  strategi_id: "Strategi",
  arah_kebijakan_id: "Arah Kebijakan",
  program_id: "Program",
  kegiatan_id: "Kegiatan",
  sub_kegiatan_id: "Sub Kegiatan",
};

export const formatCascadingWithLabels = (cascading, options = {}) => {
  return Object.entries(cascadingLabels).map(([key, label]) => {
    const val = cascading?.[key];
    const opt = options[key]?.find((o) => o.id === val);
    return `${label}: ${opt?.nama || val || "-"}`;
  });
};

export const isCascadingComplete = (cascading = {}) => {
  return Object.keys(cascadingLabels).every((key) => !!cascading[key]);
};

export const validateCascadingCompletion = (cascading = {}) => {
  const missingFields = Object.keys(cascadingLabels).filter(
    (key) => !cascading[key]
  );
  return missingFields;
};

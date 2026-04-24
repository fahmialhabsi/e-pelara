// === src/utils/roleUtils.js ===
export const normalizeRole = (role) => {
  if (role == null) return "";
  return String(role).toUpperCase().replace(/\s+/g, "_"); // tetap jaga replace spasi jika perlu
};

const ROLE_COMPATIBILITY_MAP = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMINISTRATOR",
  KEPALA_DINAS: "ADMINISTRATOR",
  SEKRETARIS: "ADMINISTRATOR",
  KEPALA_BIDANG: "PENGAWAS",
  KEPALA_BIDANG_KETERSEDIAAN: "PENGAWAS",
  KEPALA_BIDANG_DISTRIBUSI: "PENGAWAS",
  KEPALA_BIDANG_KONSUMSI: "PENGAWAS",
  KEPALA_UPTD: "PENGAWAS",
  FUNGSIONAL: "PELAKSANA",
  FUNGSIONAL_PERENCANA: "PELAKSANA",
  FUNGSIONAL_ANALIS: "PELAKSANA",
  PELAKSANA: "PELAKSANA",
  KASUBBAG: "PELAKSANA",
  KASI_UPTD: "PELAKSANA",
  VIEWER: "PELAKSANA",
  GUBERNUR: "PENGAWAS",
});

export const mapRoleToEpelara = (role) => {
  const normalized = normalizeRole(role);
  return ROLE_COMPATIBILITY_MAP[normalized] || normalized;
};

export const canManagePlanningWorkflow = (role) => {
  const mapped = mapRoleToEpelara(role);
  /** Selaras backend planning v2 (WRITE_ROLES termasuk PELAKSANA untuk draft dokumen). */
  return ["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"].includes(mapped);
};

/** Restore versi global: backend /api/planning/... hanya SUPER_ADMIN & ADMINISTRATOR. */
export const canRestorePlanningDocumentVersion = (role) => {
  const mapped = mapRoleToEpelara(role);
  return ["SUPER_ADMIN", "ADMINISTRATOR"].includes(mapped);
};

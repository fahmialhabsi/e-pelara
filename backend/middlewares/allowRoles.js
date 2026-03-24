const normalizeRole = (role) =>
  typeof role === "string"
    ? role.trim().toUpperCase().replace(/\s+/g, "_")
    : "";

// Mapping role SIGAP → role e-Pelara untuk SSO.
// SIGAP role (uppercase) → e-Pelara equivalent.
const SIGAP_TO_EPELARA = {
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
};

const allowRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!Array.isArray(allowedRoles)) {
        throw new Error("allowedRoles must be an array");
      }

      // req.user sudah di-set oleh verifyToken — tidak perlu re-verify JWT lagi.
      // Re-verifikasi independen akan selalu gagal untuk SSO token (beda secret).
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Token tidak ditemukan atau salah format." });
      }

      const rawRole = normalizeRole(req.user.role);
      // Terjemahkan role SIGAP ke role e-Pelara jika perlu.
      const userRole = SIGAP_TO_EPELARA[rawRole] || rawRole;
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

      if (!normalizedAllowedRoles.includes(userRole)) {
        return res
          .status(403)
          .json({ message: "Akses ditolak. Role tidak diizinkan." });
      }

      next();
    } catch (error) {
      console.error("[allowRoles]", error.message);
      return res
        .status(401)
        .json({ message: "Token tidak valid atau telah kadaluarsa." });
    }
  };
};

module.exports = allowRoles;

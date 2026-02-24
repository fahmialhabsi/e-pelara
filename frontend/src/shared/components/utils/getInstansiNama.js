// src/shared/components/utils/getInstansiNama.js

/**
 * Mengembalikan nama instansi dari user.opd jika tersedia.
 * Jika tidak ada, fallback ke user.username untuk SUPER_ADMIN atau ADMIN.
 * Jika semua tidak tersedia, kembalikan "-"
 *
 * @param {Object} user - Objek user dari auth store atau session
 * @returns {string}
 */
export function getInstansiNama(user) {
  if (!user) return "-";

  // Gunakan properti yang benar dari token/login response
  if (user.opd_penanggung_jawab) {
    return user.opd_penanggung_jawab;
  }

  console.log("🕵️ user debug:", {
    role: user?.role,
    opd_penanggung_jawab: user?.opd_penanggung_jawab,
    bidang_opd_penanggung_jawab: user?.bidang_opd_penanggung_jawab,
    username: user?.username,
  });

  // Fallback jika tidak ada
  if (user.username) {
    return user.username.toUpperCase();
  }

  return "-";
}

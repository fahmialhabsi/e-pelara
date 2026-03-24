// services/auditService.js
const { ActivityLog } = require("../models");

/**
 * Catat aktivitas pengguna ke tabel activity_logs.
 * Fungsi ini TIDAK pernah melempar error agar tidak mengganggu request utama.
 *
 * @param {object} req        - Express request (menyediakan req.user, req.ip, req.headers)
 * @param {string} action     - Aksi yang dilakukan, misal: 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE'
 * @param {string} entityType - Nama model/entitas, misal: 'Misi', 'Program', 'Indikator'
 * @param {number|null} entityId  - ID record yang terpengaruh
 * @param {object|null} oldData   - Data sebelum perubahan (untuk UPDATE/DELETE)
 * @param {object|null} newData   - Data setelah perubahan (untuk CREATE/UPDATE)
 */
async function logActivity(
  req,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
) {
  try {
    await ActivityLog.create({
      user_id: req.user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        null,
      user_agent: req.headers?.["user-agent"] || null,
    });
  } catch (err) {
    // Audit failure tidak boleh menghentikan request utama
    console.error("[AuditService] Gagal mencatat aktivitas:", err.message);
  }
}

module.exports = { logActivity };

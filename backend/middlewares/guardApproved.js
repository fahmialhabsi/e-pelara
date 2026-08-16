/**
 * guardApproved — middleware yang memblok PUT/DELETE pada dokumen berstatus APPROVED.
 *
 * Strategi dual-check:
 *   1. Cek kolom approval_status di tabel dokumen (cepat, indexed)
 *   2. Fallback ke approval_logs (untuk entitas tanpa kolom approval_status)
 *
 * Admin bisa bypass dengan header: X-Approval-Override: true
 */
const { ApprovalLog } = require("../models");
const { sequelize } = require("../models");
const { isWorkflowAdminRole } = require("../services/planningWorkflowService");

// Tabel yang punya kolom approval_status (primary check)
const TABLE_STATUS_MAP = {
  dpa:   "dpa",
  rka:   "rka",
  lakip: "lakip",
  renja: "renja",
  rkpd:  "rkpd",
  renstra: "renstra",
};

function guardApproved(entityType) {
  const etype = String(entityType).toLowerCase();

  return async (req, res, next) => {
    // Admin dengan override header bisa lewat
    if (
      isWorkflowAdminRole(req.user?.role) &&
      req.headers["x-approval-override"] === "true"
    ) {
      return next();
    }

    const entityId = parseInt(req.params.id);
    if (!entityId || isNaN(entityId)) return next();

    try {
      let status = "DRAFT";

      const tableName = TABLE_STATUS_MAP[etype];
      if (tableName) {
        // Primary: cek langsung dari kolom tabel (lebih cepat)
        const [[row]] = await sequelize.query(
          `SELECT approval_status FROM \`${tableName}\` WHERE id = :id LIMIT 1`,
          { replacements: { id: entityId } }
        );
        if (row?.approval_status) {
          status = row.approval_status;
        }
      } else {
        // Fallback: cek approval_logs
        const latest = await ApprovalLog.findOne({
          where: { entity_type: etype, entity_id: entityId },
          order: [["created_at", "DESC"]],
        });
        status = latest?.to_status || "DRAFT";
      }

      if (status === "APPROVED") {
        return res.status(403).json({
          success: false,
          code: "DOCUMENT_APPROVED",
          message: `Dokumen ${etype.toUpperCase()} #${entityId} sudah DISETUJUI dan tidak dapat diubah. Hubungi Admin untuk membuka revisi.`,
          current_status: status,
        });
      }

      next();
    } catch (err) {
      // Sprint 3 — S3-06: sebelumnya fail-open (next() dipanggil begitu
      // saja saat guard sendiri gagal mengevaluasi approval_status), yang
      // berarti error internal/DB transient bisa membuat mutation pada
      // dokumen APPROVED lolos tanpa terverifikasi. Prinsip fail-closed:
      // kegagalan MENGEVALUASI guard otorisasi tidak boleh menjadi
      // otorisasi itu sendiri. Tidak membocorkan detail error internal ke
      // client (hanya log server-side via console.warn, sudah ada).
      console.warn("[guardApproved] Error:", err.message);
      return res.status(503).json({
        success: false,
        code: "APPROVAL_GUARD_UNAVAILABLE",
        message:
          `Status persetujuan dokumen ${etype.toUpperCase()} tidak dapat diverifikasi saat ini. ` +
          "Perubahan ditolak sementara demi keamanan data — silakan coba lagi.",
      });
    }
  };
}

module.exports = guardApproved;

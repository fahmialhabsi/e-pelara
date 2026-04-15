// controllers/approvalController.js
// Workflow persetujuan bertahap: DRAFT → SUBMITTED → APPROVED / REJECTED
// User biasa bisa SUBMIT; Admin (SUPER_ADMIN, ADMINISTRATOR) bisa APPROVE/REJECT/REVISE

const { ApprovalLog, sequelize: db } = require("../models");
const { sendNotification, broadcastToRole } = require("../services/notificationService");

// Mapping entity_type → nama tabel DB (tabel yang punya kolom approval_status)
const ENTITY_TABLE_MAP = {
  dpa:   "dpa",
  rka:   "rka",
  lakip: "lakip",
  renja: "renja",
  rkpd:  "rkpd",
  renstra: "renstra",
};

// Sync approval_status kolom di tabel dokumen yang bersangkutan
async function syncStatusToTable(entity_type, entity_id, new_status) {
  const table = ENTITY_TABLE_MAP[entity_type];
  if (!table) return; // entity tidak punya kolom approval_status
  try {
    await ApprovalLog.sequelize.query(
      `UPDATE \`${table}\` SET approval_status = :status WHERE id = :id`,
      { replacements: { status: new_status, id: parseInt(entity_id) } }
    );
  } catch (e) {
    console.warn(`[approval] Gagal sync status ke ${table}:`, e.message);
  }
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];

// Tipe entitas yang valid
const VALID_ENTITY_TYPES = ["dpa", "rka", "lakip", "renja", "rkpd", "rpjmd", "renstra"];

// Transisi status yang diizinkan per aksi
const TRANSITIONS = {
  SUBMIT:  { from: ["DRAFT", "REJECTED"], to: "SUBMITTED" },
  APPROVE: { from: ["SUBMITTED"],         to: "APPROVED"  },
  REJECT:  { from: ["SUBMITTED"],         to: "REJECTED"  },
  REVISE:  { from: ["APPROVED", "REJECTED", "SUBMITTED"], to: "DRAFT" },
};

// Helper: validasi entity_type + entity_id
function validateEntity(entity_type, entity_id) {
  if (!entity_type || !VALID_ENTITY_TYPES.includes(String(entity_type).toLowerCase())) {
    return { ok: false, msg: `entity_type tidak valid. Gunakan: ${VALID_ENTITY_TYPES.join(", ")}` };
  }
  const id = parseInt(entity_id);
  if (!id || isNaN(id) || id <= 0) {
    return { ok: false, msg: "entity_id harus berupa angka positif" };
  }
  return { ok: true, id };
}

// ────────────────────────────────────────────────
// Helper: ambil status terkini entitas
// ────────────────────────────────────────────────
async function getCurrentStatus(entity_type, entity_id) {
  const latest = await ApprovalLog.findOne({
    where: { entity_type, entity_id: parseInt(entity_id) },
    order: [["created_at", "DESC"]],
  });
  return latest ? latest.to_status : "DRAFT";
}

// ────────────────────────────────────────────────
// GET /api/approval/status?entity_type=X&entity_id=Y
// ────────────────────────────────────────────────
const getStatus = async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

  try {
    const latest = await ApprovalLog.findOne({
      where: { entity_type: String(entity_type).toLowerCase(), entity_id: v.id },
      order: [["created_at", "DESC"]],
    });
    return res.json({
      success: true,
      data: {
        entity_type: entity_type.toLowerCase(),
        entity_id: v.id,
        status: latest ? latest.to_status : "DRAFT",
        updated_by: latest?.username || null,
        updated_at: latest?.created_at || null,
      },
    });
  } catch (err) {
    console.error("approvalController.getStatus:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil status persetujuan" });
  }
};

// ────────────────────────────────────────────────
// GET /api/approval/history?entity_type=X&entity_id=Y
// ────────────────────────────────────────────────
const getHistory = async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

  try {
    const logs = await ApprovalLog.findAll({
      where: { entity_type: String(entity_type).toLowerCase(), entity_id: v.id },
      order: [["created_at", "ASC"]],
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("approvalController.getHistory:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat persetujuan" });
  }
};

// ────────────────────────────────────────────────
// POST /api/approval/submit
// Body: { entity_type, entity_id, catatan? }
// ────────────────────────────────────────────────
const submit = async (req, res) => {
  const { entity_type, entity_id, catatan } = req.body;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

  try {
    const currentStatus = await getCurrentStatus(entity_type, entity_id);
    const transition = TRANSITIONS.SUBMIT;

    if (!transition.from.includes(currentStatus)) {
      return res.status(422).json({
        message: `Tidak dapat submit dari status ${currentStatus}. Status harus DRAFT atau REJECTED.`,
      });
    }

    const log = await ApprovalLog.create({
      entity_type,
      entity_id: parseInt(entity_id),
      action: "SUBMIT",
      from_status: currentStatus,
      to_status: transition.to,
      user_id: req.user?.id || null,
      username: req.user?.username || null,
      catatan: catatan || null,
    });

    await syncStatusToTable(entity_type, entity_id, transition.to);

    // Notifikasi real-time ke semua admin
    broadcastToRole(req.app, "SUPER_ADMIN", "approval_submitted", {
      entity_type, entity_id, submitted_by: req.user?.username,
    });
    broadcastToRole(req.app, "ADMINISTRATOR", "approval_submitted", {
      entity_type, entity_id, submitted_by: req.user?.username,
    });

    return res.status(201).json({ message: "Berhasil diajukan untuk persetujuan", data: log });
  } catch (err) {
    console.error("approvalController.submit:", err);
    return res.status(500).json({ message: "Gagal submit persetujuan" });
  }
};

// ────────────────────────────────────────────────
// POST /api/approval/approve   — Admin only
// Body: { entity_type, entity_id, catatan? }
// ────────────────────────────────────────────────
const approve = async (req, res) => {
  const { entity_type, entity_id, catatan } = req.body;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

  try {
    const currentStatus = await getCurrentStatus(entity_type, entity_id);
    const transition = TRANSITIONS.APPROVE;

    if (!transition.from.includes(currentStatus)) {
      return res.status(422).json({
        message: `Tidak dapat approve dari status ${currentStatus}. Status harus SUBMITTED.`,
      });
    }

    const log = await ApprovalLog.create({
      entity_type,
      entity_id: parseInt(entity_id),
      action: "APPROVE",
      from_status: currentStatus,
      to_status: transition.to,
      user_id: req.user?.id || null,
      username: req.user?.username || null,
      catatan: catatan || null,
    });

    // Cari siapa yang submit, kirim notifikasi balik
    const submitLog = await ApprovalLog.findOne({
      where: { entity_type, entity_id: parseInt(entity_id), action: "SUBMIT" },
      order: [["created_at", "DESC"]],
    });
    await syncStatusToTable(entity_type, entity_id, transition.to);

    if (submitLog?.user_id) {
      await sendNotification(
        req.app,
        submitLog.user_id,
        "Dokumen Disetujui",
        `${entity_type} #${entity_id} telah disetujui oleh ${req.user?.username}.`,
        "success",
        entity_type,
        parseInt(entity_id),
        null
      );
    }

    return res.json({ message: "Berhasil disetujui", data: log });
  } catch (err) {
    console.error("approvalController.approve:", err);
    return res.status(500).json({ message: "Gagal approve" });
  }
};

// ────────────────────────────────────────────────
// POST /api/approval/reject   — Admin only
// Body: { entity_type, entity_id, catatan (wajib) }
// ────────────────────────────────────────────────
const reject = async (req, res) => {
  const { entity_type, entity_id, catatan } = req.body;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });
  if (!catatan || String(catatan).trim() === "")
    return res.status(400).json({ success: false, message: "Alasan penolakan (catatan) wajib diisi" });

  try {
    const currentStatus = await getCurrentStatus(entity_type, entity_id);
    const transition = TRANSITIONS.REJECT;

    if (!transition.from.includes(currentStatus)) {
      return res.status(422).json({
        message: `Tidak dapat menolak dari status ${currentStatus}. Status harus SUBMITTED.`,
      });
    }

    const log = await ApprovalLog.create({
      entity_type,
      entity_id: parseInt(entity_id),
      action: "REJECT",
      from_status: currentStatus,
      to_status: transition.to,
      user_id: req.user?.id || null,
      username: req.user?.username || null,
      catatan,
    });

    // Notifikasi ke submitter
    const submitLog = await ApprovalLog.findOne({
      where: { entity_type, entity_id: parseInt(entity_id), action: "SUBMIT" },
      order: [["created_at", "DESC"]],
    });
    await syncStatusToTable(entity_type, entity_id, transition.to);

    if (submitLog?.user_id) {
      await sendNotification(
        req.app,
        submitLog.user_id,
        "Dokumen Ditolak",
        `${entity_type} #${entity_id} ditolak oleh ${req.user?.username}. Alasan: ${catatan}`,
        "error",
        entity_type,
        parseInt(entity_id),
        null
      );
    }

    return res.json({ message: "Berhasil ditolak", data: log });
  } catch (err) {
    console.error("approvalController.reject:", err);
    return res.status(500).json({ message: "Gagal reject" });
  }
};

// ────────────────────────────────────────────────
// POST /api/approval/revise   — Admin only
// Kembalikan ke DRAFT (buka kembali untuk revisi)
// Body: { entity_type, entity_id, catatan? }
// ────────────────────────────────────────────────
const revise = async (req, res) => {
  const { entity_type, entity_id, catatan } = req.body;
  const v = validateEntity(entity_type, entity_id);
  if (!v.ok) return res.status(400).json({ success: false, message: v.msg });

  try {
    const currentStatus = await getCurrentStatus(entity_type, entity_id);
    const transition = TRANSITIONS.REVISE;

    if (!transition.from.includes(currentStatus)) {
      return res.status(422).json({
        message: `Tidak dapat revisi dari status ${currentStatus}.`,
      });
    }

    const log = await ApprovalLog.create({
      entity_type,
      entity_id: parseInt(entity_id),
      action: "REVISE",
      from_status: currentStatus,
      to_status: transition.to,
      user_id: req.user?.id || null,
      username: req.user?.username || null,
      catatan: catatan || null,
    });

    // Notifikasi ke submitter agar revisi
    const submitLog = await ApprovalLog.findOne({
      where: { entity_type, entity_id: parseInt(entity_id), action: "SUBMIT" },
      order: [["created_at", "DESC"]],
    });
    await syncStatusToTable(entity_type, entity_id, transition.to);

    if (submitLog?.user_id) {
      await sendNotification(
        req.app,
        submitLog.user_id,
        "Dokumen Perlu Direvisi",
        `${entity_type} #${entity_id} dikembalikan untuk revisi oleh ${req.user?.username}.`,
        "warning",
        entity_type,
        parseInt(entity_id),
        null
      );
    }

    return res.json({ message: "Dikembalikan untuk revisi", data: log });
  } catch (err) {
    console.error("approvalController.revise:", err);
    return res.status(500).json({ message: "Gagal revisi" });
  }
};

// ────────────────────────────────────────────────
// GET /api/approval/pending   — Admin only
// Daftar semua entitas yang menunggu persetujuan
// ────────────────────────────────────────────────
const getPending = async (req, res) => {
  try {
    // Ambil semua entitas yang to_status terakhirnya = SUBMITTED
    const [rows] = await ApprovalLog.sequelize.query(`
      SELECT al.*
      FROM approval_logs al
      INNER JOIN (
        SELECT entity_type, entity_id, MAX(created_at) AS max_created
        FROM approval_logs
        GROUP BY entity_type, entity_id
      ) latest ON al.entity_type = latest.entity_type
              AND al.entity_id = latest.entity_id
              AND al.created_at = latest.max_created
      WHERE al.to_status = 'SUBMITTED'
      ORDER BY al.created_at ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error("approvalController.getPending:", err);
    return res.status(500).json({ message: "Gagal mengambil daftar pending" });
  }
};

module.exports = { getStatus, getHistory, submit, approve, reject, revise, getPending };

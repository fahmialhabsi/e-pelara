// controllers/activityLogController.js
const { ActivityLog } = require("../models");
const { Op } = require("sequelize");

// GET /api/activity-logs
// Admin: lihat semua log; filter by action, entity_type, user_id, tanggal
exports.getAll = async (req, res) => {
  try {
    const {
      action,
      entity_type,
      user_id,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};
    if (action) where.action = action.toUpperCase();
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = parseInt(user_id);
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: rows,
    });
  } catch (err) {
    console.error("[ActivityLog] getAll error:", err);
    res.status(500).json({ message: "Gagal mengambil activity log" });
  }
};

// GET /api/activity-logs/entity/:type/:id
// Lihat histori perubahan satu entitas tertentu
exports.getByEntity = async (req, res) => {
  try {
    const { type, id } = req.params;

    const logs = await ActivityLog.findAll({
      where: {
        entity_type: type,
        entity_id: parseInt(id),
      },
      order: [["created_at", "DESC"]],
    });

    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil log entitas" });
  }
};

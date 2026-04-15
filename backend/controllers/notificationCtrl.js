// controllers/notificationCtrl.js
const { Notification } = require("../models");
const { Op } = require("sequelize");

// GET /api/notifications - ambil notifikasi milik user yang login
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      // Kolom di DB: createdAt (camelCase), bukan created_at
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    res.json({ data: notifications, unread_count: unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil notifikasi" });
  }
};

// GET /api/notifications/count - jumlah notifikasi belum dibaca
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const count = await Notification.count({
      where: { user_id: userId, is_read: false },
    });
    res.json({ unread_count: count });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghitung notifikasi" });
  }
};

// PATCH /api/notifications/mark-read - tandai notifikasi sebagai dibaca
exports.markRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { ids } = req.body; // array ID notifikasi

    const where = { user_id: userId };
    if (Array.isArray(ids) && ids.length > 0) {
      where.id = { [Op.in]: ids };
    }

    await Notification.update({ is_read: true }, { where });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menandai notifikasi" });
  }
};

// DELETE /api/notifications/:id - hapus satu notifikasi milik user
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const deleted = await Notification.destroy({
      where: { id, user_id: userId },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus notifikasi" });
  }
};

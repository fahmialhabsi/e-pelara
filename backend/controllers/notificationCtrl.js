// controllers/notificationCtrl.js
const { Notification } = require("../models");

exports.getNotifications = async (req, res) => {
  try {
    // Jika pakai JWT, userId bisa diambil dari req.user
    const userId = req.user?.id;
    const where = userId ? { userId } : {};
    const notes = await Notification.findAll({
      where,
      order: [["timestamp", "DESC"]],
    });
    res.json({ data: notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { ids } = req.body; // array of notification IDs
    await Notification.update({ read: true }, { where: { id: ids } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark notifications read" });
  }
};

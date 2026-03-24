// services/notificationService.js
const { Notification } = require("../models");

/**
 * Kirim notifikasi ke user — simpan ke DB dan emit via Socket.IO secara real-time.
 *
 * @param {object}      app        - Express app instance (untuk mengakses Socket.IO via app.get("io"))
 * @param {number}      userId     - ID user penerima notifikasi
 * @param {string}      title      - Judul notifikasi
 * @param {string}      message    - Isi pesan notifikasi
 * @param {string}      type       - Tipe: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'APPROVAL'
 * @param {string|null} entityType - Nama entitas terkait, misal 'Misi', 'Program'
 * @param {number|null} entityId   - ID entitas terkait
 * @param {string|null} link       - URL deep link (opsional)
 * @returns {Promise<Notification|null>}
 */
async function sendNotification(
  app,
  userId,
  title,
  message,
  type = "INFO",
  entityType = null,
  entityId = null,
  link = null,
) {
  try {
    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      entity_type: entityType,
      entity_id: entityId,
      link,
      is_read: false,
    });

    const io = app?.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("new-notification", {
        id: notification.id,
        title,
        message,
        type,
        entity_type: entityType,
        entity_id: entityId,
        link,
        created_at: notification.created_at,
      });
    }

    return notification;
  } catch (err) {
    console.error(
      "[NotificationService] Gagal mengirim notifikasi:",
      err.message,
    );
    return null;
  }
}

/**
 * Kirim notifikasi ke semua user dalam role tertentu via Socket.IO room.
 * TIDAK menyimpan ke DB — hanya broadcast ke room role.
 *
 * @param {object} app   - Express app instance
 * @param {string} role  - Nama role: 'SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'
 * @param {string} event - Nama event Socket.IO
 * @param {object} data  - Data yang dikirim
 */
function broadcastToRole(app, role, event, data) {
  const io = app?.get("io");
  if (io) {
    io.to(role).emit(event, data);
  }
}

module.exports = { sendNotification, broadcastToRole };

// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const {
  getNotifications,
  getUnreadCount,
  markRead,
  deleteNotification,
} = require("../controllers/notificationCtrl");

const allRoles = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get("/", verifyToken, allowRoles(allRoles), getNotifications);
router.get("/count", verifyToken, allowRoles(allRoles), getUnreadCount);
router.patch("/mark-read", verifyToken, allowRoles(allRoles), markRead);
router.delete("/:id", verifyToken, allowRoles(allRoles), deleteNotification);

module.exports = router;

// routes/notificationRoutes.js
const express = require("express");
const router = express.Router(); // <-- ini Express Router
const authenticate = require("../middlewares/authenticate");
const {
  getNotifications,
  markRead,
} = require("../controllers/notificationCtrl");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.use(authenticate);

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  getNotifications
);
router.post(
  "/mark-read",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  markRead
);

module.exports = router;

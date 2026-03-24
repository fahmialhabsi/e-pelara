// routes/activityLogRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { getAll, getByEntity } = require("../controllers/activityLogController");

const adminRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];

// GET /api/activity-logs?action=&entity_type=&user_id=&from=&to=&page=&limit=
router.get("/", verifyToken, allowRoles(adminRoles), getAll);

// GET /api/activity-logs/entity/:type/:id
router.get(
  "/entity/:type/:id",
  verifyToken,
  allowRoles(adminRoles),
  getByEntity,
);

module.exports = router;

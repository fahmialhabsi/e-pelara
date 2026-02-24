const { ActivityLog } = require("../models");

// GET /api/activities?role=&periodType=&period=
exports.getActivities = async (req, res) => {
  const { role, periodType, period } = req.query;
  // TODO: transform period -> date range
  const logs = await ActivityLog.findAll({
    where: { role /* , timestamp range */ },
  });
  res.json({
    data: logs.map((l) => ({
      ...l.toJSON(),
      isOverdue: new Date() > l.deadline,
    })),
  });
};

// POST /api/activities
exports.postActivity = async (req, res) => {
  const activity = await ActivityLog.create(req.body);
  // Emit real-time
  req.app.get("io").to(activity.role).emit("new-activity", activity);
  res.json({ data: activity });
};

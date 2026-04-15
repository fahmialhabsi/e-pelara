"use strict";

const { logActivity } = require("./auditService");

function toPlain(value) {
  if (!value) return null;
  if (typeof value.get === "function") {
    return value.get({ plain: true });
  }
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return value;
    }
  }
  return value;
}

function logPlanning(req, { action, entityType, entityId, before = null, after = null }) {
  logActivity(
    req,
    action,
    entityType,
    entityId,
    toPlain(before),
    toPlain(after),
  );
}

function logStatusChange(
  req,
  {
    entityType,
    entityId,
    fromStatus,
    toStatus,
    workflowAction = null,
    note = null,
    before = null,
    after = null,
  },
) {
  const enrichedAfter = {
    ...(toPlain(after) || {}),
    _workflow: {
      action: workflowAction,
      from: fromStatus,
      to: toStatus,
      note,
      actor: {
        id: req.user?.id || null,
        username: req.user?.username || null,
        role: req.user?.role || null,
      },
      at: new Date().toISOString(),
    },
  };

  logPlanning(req, {
    action: "STATUS_CHANGE",
    entityType,
    entityId,
    before,
    after: enrichedAfter,
  });
}

module.exports = {
  toPlain,
  logPlanning,
  logStatusChange,
};

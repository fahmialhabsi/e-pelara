"use strict";

const STRICT_TRANSITIONS = {
  draft: ["submitted", "rejected"],
  submitted: ["reviewed", "rejected"],
  reviewed: ["approved", "rejected"],
  approved: ["published"],
  rejected: ["draft", "submitted"],
  published: ["archived"],
  archived: [],
};

const EDITABLE_STATUS = new Set(["draft", "submitted", "reviewed", "rejected"]);

function assertStrictTransition(fromStatus, toStatus) {
  const from = String(fromStatus || "draft");
  const to = String(toStatus || "");
  const allowed = STRICT_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Forbidden transition: ${from} -> ${to}`);
  }
}

function assertEditableWorkflow(status) {
  if (!EDITABLE_STATUS.has(String(status || ""))) {
    throw new Error("Dokumen final/published/archived tidak boleh diedit langsung.");
  }
}

module.exports = {
  STRICT_TRANSITIONS,
  EDITABLE_STATUS,
  assertStrictTransition,
  assertEditableWorkflow,
};

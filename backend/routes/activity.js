const express = require("express");
const router = express.Router();
const { getActivities, postActivity } = require("../controllers/activityCtrl");
router.get("/", getActivities);
router.post("/", postActivity);
module.exports = router;

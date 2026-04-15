"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/derivationController");
const schemas = require("../middlewares/derivationSchemas");

const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post(
  "/derivation/pd-opd-mapping",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.pdOpdMapping),
  ctrl.pdOpdMapping,
);

router.post(
  "/renstra/generate-from-rpjmd",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.renstraFromRpjmd),
  ctrl.renstraFromRpjmd,
);

router.post(
  "/rkpd/generate-from-renstra",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.rkpdFromRenstra),
  ctrl.rkpdFromRenstra,
);

router.post(
  "/renja/generate-from-rkpd",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.renjaFromRkpd),
  ctrl.renjaFromRkpd,
);

router.post(
  "/rka/generate-from-renja",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.rkaFromRenja),
  ctrl.rkaFromRenja,
);

router.post(
  "/dpa/generate-from-rka",
  verifyToken,
  allowRoles(WRITE),
  schemas.validate(schemas.dpaFromRka),
  ctrl.dpaFromRka,
);

module.exports = router;

"use strict";

const db = require("../models");
const engine = require("../services/derivationEngineService");

function conflictOr400(e, res) {
  if (e && e.name === "DerivationConflictError") {
    return res.status(409).json({
      success: false,
      message: e.message,
      payload: e.payload,
    });
  }
  return res.status(400).json({ success: false, message: e.message });
}

async function pdOpdMapping(req, res) {
  try {
    const row = await engine.upsertPdOpdMapping(db, db.sequelize, req.body);
    return res.status(200).json({ success: true, data: row });
  } catch (e) {
    console.error("[derivation] pd-opd-mapping", e);
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function renstraFromRpjmd(req, res) {
  try {
    const out = await engine.generateRenstraPdFromRpjmd(
      db,
      db.sequelize,
      req.body,
    );
    return res.status(201).json({ success: true, data: out });
  } catch (e) {
    console.error("[derivation] renstra-from-rpjmd", e);
    return conflictOr400(e, res);
  }
}

async function rkpdFromRenstra(req, res) {
  try {
    const out = await engine.generateRkpdFromRenstra(
      db,
      db.sequelize,
      req.body,
    );
    return res.status(201).json({ success: true, data: out });
  } catch (e) {
    console.error("[derivation] rkpd-from-renstra", e);
    return conflictOr400(e, res);
  }
}

async function renjaFromRkpd(req, res) {
  try {
    const out = await engine.generateRenjaFromRkpd(db, db.sequelize, req.body);
    return res.status(201).json({ success: true, data: out });
  } catch (e) {
    console.error("[derivation] renja-from-rkpd", e);
    return conflictOr400(e, res);
  }
}

async function rkaFromRenja(req, res) {
  try {
    const out = await engine.generateRkaFromRenja(db, db.sequelize, req.body);
    return res.status(201).json({ success: true, data: out });
  } catch (e) {
    console.error("[derivation] rka-from-renja", e);
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function dpaFromRka(req, res) {
  try {
    const out = await engine.generateDpaFromRka(db, db.sequelize, req.body);
    return res.status(201).json({ success: true, data: out });
  } catch (e) {
    console.error("[derivation] dpa-from-rka", e);
    return conflictOr400(e, res);
  }
}

module.exports = {
  pdOpdMapping,
  renstraFromRpjmd,
  rkpdFromRenstra,
  renjaFromRkpd,
  rkaFromRenja,
  dpaFromRka,
};

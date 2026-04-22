"use strict";
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

const MODEL_ALIASES = Object.freeze({
  // Canonical: PeriodeRpjmd (periodeModel.js)
  RpjmdPeriode: "PeriodeRpjmd",
});

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Load all model files automatically
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      !file.endsWith(".test.js")
    );
  })
  .forEach((file) => {
    const mod = require(path.join(__dirname, file));
    const candidate = mod && mod.default ? mod.default : mod;

    // Case 1: sudah berupa instance model
    if (candidate && candidate instanceof Sequelize.Model) {
      db[candidate.name] = candidate;
      return;
    }

    // Case 2: sudah berupa kelas Model yang telah di-init (punya sequelize/rawAttributes)
    if (
      candidate &&
      candidate.prototype instanceof Sequelize.Model &&
      (candidate.sequelize || candidate.rawAttributes)
    ) {
      db[candidate.name] = candidate;
      return;
    }

    // Case 3: factory function klasik (sequelize, DataTypes) => model
    if (typeof candidate === "function") {
      // Jangan panggil jika itu class Model (akan throw "Class constructor ... cannot be invoked without 'new'")
      const isClassLike = /^\s*class\s/.test(candidate.toString());
      if (isClassLike) {
        console.warn(
          `[models/index] Lewati file ${file} karena export adalah class tanpa factory wrapper`
        );
        return;
      }
      const model = candidate(sequelize, Sequelize.DataTypes);
      if (model && model.name) {
        db[model.name] = model;
      }
      return;
    }

    console.warn(
      `[models/index] Lewati file ${file} karena export bukan function/model`
    );
  });

console.log("Registered models:", Object.keys(db));

// Normalisasi alias model agar tidak ada registry planning ganda/ambigu.
Object.entries(MODEL_ALIASES).forEach(([aliasName, canonicalName]) => {
  if (db[canonicalName]) {
    if (db[aliasName] && db[aliasName] !== db[canonicalName]) {
      console.warn(
        `[models/index] Konsolidasi alias ${aliasName} -> ${canonicalName}; model duplikat dinonaktifkan dari registry utama`,
      );
    }
    db[aliasName] = db[canonicalName];
  }
});

// Run associations
const uniqueModels = [...new Set(Object.values(db))];
uniqueModels.forEach((model) => {
  if (model.associate) model.associate(db);
});

console.log("Available models:", Object.keys(db));

const { installTenantIsolation } = require("../lib/tenantSequelizeHooks");
installTenantIsolation(sequelize, db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

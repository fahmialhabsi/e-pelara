"use strict";

const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function run(store, fn) {
  return storage.run(store, fn);
}

function getStore() {
  return storage.getStore();
}

/** Nilai tenant aktif untuk request terautentikasi; null di luar konteks (login, skrip). */
function getTenantId() {
  const s = getStore();
  if (!s) return null;
  const t = s.tenantId;
  if (t == null) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = {
  run,
  getStore,
  getTenantId,
};

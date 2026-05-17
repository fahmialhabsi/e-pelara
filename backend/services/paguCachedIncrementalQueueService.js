const {
  syncPaguCachedByIskPrefix,
  syncPaguCachedBySubKegiatanId,
} = require("./paguCachedIncrementalSyncService");

const pendingPrefixes = new Set();
const pendingSubKegiatanIds = new Set();

let timer = null;
let running = false;

const DEBOUNCE_MS = 500;

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function scheduleFlush() {
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    flushPaguCachedIncrementalQueue().catch((err) => {
      console.error("[PAGU_INCREMENTAL_QUEUE_ERROR]", err);
    });
  }, DEBOUNCE_MS);
}

function queuePaguPrefix(prefix) {
  const kode = normalize(prefix);
  if (!kode) return;

  pendingPrefixes.add(kode);
  scheduleFlush();
}

function queuePaguPrefixes(prefixes = []) {
  for (const prefix of prefixes) {
    queuePaguPrefix(prefix);
  }
}

function queuePaguSubKegiatanId(subKegiatanId) {
  if (!subKegiatanId) return;

  pendingSubKegiatanIds.add(Number(subKegiatanId));
  scheduleFlush();
}

async function flushPaguCachedIncrementalQueue() {
  if (running) {
    scheduleFlush();
    return;
  }

  running = true;

  try {
    const prefixes = [...pendingPrefixes];
    const subKegiatanIds = [...pendingSubKegiatanIds];

    pendingPrefixes.clear();
    pendingSubKegiatanIds.clear();

    for (const subKegiatanId of subKegiatanIds) {
      await syncPaguCachedBySubKegiatanId(subKegiatanId);
    }

    for (const prefix of prefixes) {
      await syncPaguCachedByIskPrefix(prefix);
    }
  } finally {
    running = false;

    if (pendingPrefixes.size || pendingSubKegiatanIds.size) {
      scheduleFlush();
    }
  }
}

module.exports = {
  queuePaguPrefix,
  queuePaguPrefixes,
  queuePaguSubKegiatanId,
  flushPaguCachedIncrementalQueue,
};
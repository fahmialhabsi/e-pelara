const {
  syncAllPaguCached,
} = require("./paguCachedSyncService");

let syncTimer = null;
let isSyncRunning = false;
let pendingSync = false;

function schedulePaguCachedSync(delayMs = 1500) {
  pendingSync = true;

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(async () => {
    if (isSyncRunning) return;

    isSyncRunning = true;
    pendingSync = false;

    try {
      console.log("[PAGU CACHE] Auto sync started...");
      const result = await syncAllPaguCached();
      console.log("[PAGU CACHE] Auto sync done:", result);
    } catch (error) {
      console.error("[PAGU CACHE] Auto sync failed:", error);
    } finally {
      isSyncRunning = false;

      if (pendingSync) {
        schedulePaguCachedSync(delayMs);
      }
    }
  }, delayMs);
}

module.exports = {
  schedulePaguCachedSync,
};
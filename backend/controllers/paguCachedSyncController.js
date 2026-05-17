const {
  syncAllPaguCached,
} = require("../services/paguCachedSyncService");

exports.syncAll = async (req, res) => {
  try {
    const result = await syncAllPaguCached();

    return res.json({
      success: true,
      message: "Berhasil sync pagu_cached",
      data: result,
    });
  } catch (error) {
    console.error("Sync pagu_cached error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal sync pagu_cached",
      error: error.message,
    });
  }
};
// backend/utils/hapusSemuaCacheClone.js
const redisClient = require("./redisClient");

(async () => {
  try {
    const pattern = "cloned:*";
    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      console.log(`❌ Tidak ada key yang cocok dengan pola "${pattern}"`);
    } else {
      console.log(`🗑 Menghapus ${keys.length} key:`);
      console.log(keys);

      const result = await redisClient.del(keys);
      console.log(`✅ ${result} key berhasil dihapus.`);
    }
  } catch (err) {
    console.error("Gagal hapus cache:", err);
  } finally {
    await redisClient.quit();
  }
})();

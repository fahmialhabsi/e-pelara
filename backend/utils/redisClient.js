// backend/utils/redisClient.js
const { createClient } = require("redis");

const isProduction = process.env.NODE_ENV === "production";
// Di Docker (production): gunakan hostname service redis; di lokal (development): localhost
const REDIS_URL =
  process.env.REDIS_URL ||
  (isProduction ? "redis://redis:6379" : "redis://localhost:6379");
const MAX_RETRIES =
  parseInt(process.env.REDIS_MAX_RETRIES, 10) || (isProduction ? 10 : 3);
const RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY_MS, 10) || 3000;

/**
 * Menghubungkan ke Redis.
 * - Production: wajib connect, process.exit(1) jika gagal.
 * - Development: opsional, kembalikan null jika gagal (server tetap berjalan).
 *
 * PENTING: socket.reconnectStrategy = false agar redis v5 TIDAK auto-reconnect
 * sendiri (mencegah error event loop tak berujung). Retry dikelola manual di sini.
 */
async function connectRedis(
  url = REDIS_URL,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY,
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    // Buat client baru setiap attempt agar state bersih
    const client = createClient({
      url,
      socket: {
        reconnectStrategy: false, // Nonaktifkan auto-reconnect internal redis v5
        connectTimeout: 5000,
      },
    });

    // Tangkap error event agar tidak jadi UnhandledPromiseRejection (silent)
    client.on("error", () => {});

    try {
      await client.connect();
      console.log(`✅ Redis connected on attempt ${attempt}`);
      return client;
    } catch (err) {
      // Matikan client agar tidak ada listener/socket yang tersisa
      try {
        await client.destroy();
      } catch (_) {
        /* abaikan */
      }

      // AggregateError (Redis v5): unwrap untuk tampilkan pesan asli
      const errMsg =
        err instanceof AggregateError
          ? err.errors?.[0]?.message || err.message || "connection refused"
          : err.message || String(err);

      console.error(`❌ Redis attempt ${attempt}/${retries} failed: ${errMsg}`);

      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        if (isProduction) {
          console.error("❌ Max Redis connection attempts reached. Exiting...");
          process.exit(1);
        } else {
          console.warn(
            "⚠️  Redis tidak tersedia (development). Server tetap berjalan tanpa Redis.",
          );
          return null;
        }
      }
    }
  }
}

module.exports = connectRedis;

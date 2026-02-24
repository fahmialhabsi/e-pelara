// backend/utils/redisClient.js
const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES, 10) || 10;
const RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY_MS, 10) || 3000;

async function connectRedis(
  url = REDIS_URL,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
) {
  const client = createClient({ url });

  client.on("connect", () => console.log("✅ Redis connected"));
  client.on("error", (err) => console.error("❌ Redis error:", err.message));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.connect();
      console.log(`✅ Redis successfully connected on attempt ${attempt}`);
      return client;
    } catch (err) {
      console.error(
        `❌ Redis connection attempt ${attempt} failed: ${err.message}`
      );
      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("❌ Max Redis connection attempts reached. Exiting...");
        process.exit(1); // hentikan server jika Redis tidak connect
      }
    }
  }
}

module.exports = connectRedis;

// backend/utils/redisClient.js
const { createClient } = require("redis");

const isProduction = process.env.NODE_ENV === "production";
const REDIS_URL =
  process.env.REDIS_URL ||
  (isProduction ? "redis://redis:6379" : "redis://localhost:6379");
const MAX_RETRIES =
  parseInt(process.env.REDIS_MAX_RETRIES, 10) || (isProduction ? 10 : 3);
const RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY_MS, 10) || 3000;

let sharedClient = null;

async function connectRedis(
  url = REDIS_URL,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
) {
  if (sharedClient?.isOpen) {
    return sharedClient;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = createClient({
      url,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 5000,
      },
    });

    client.on("error", () => {});

    try {
      await client.connect();
      sharedClient = client;
      console.log(`Redis connected on attempt ${attempt}`);
      return client;
    } catch (err) {
      try {
        await client.destroy();
      } catch (_) {
        // abaikan
      }

      const errMsg =
        err instanceof AggregateError
          ? err.errors?.[0]?.message || err.message || "connection refused"
          : err.message || String(err);

      console.error(`Redis attempt ${attempt}/${retries} failed: ${errMsg}`);

      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        if (isProduction) {
          console.error("Max Redis connection attempts reached. Exiting...");
          process.exit(1);
        } else {
          console.warn(
            "Redis tidak tersedia (development). Server tetap berjalan tanpa Redis."
          );
          sharedClient = null;
          return null;
        }
      }
    }
  }
}

function withClient(fn, fallback = null) {
  return async (...args) => {
    if (!sharedClient?.isOpen) {
      return fallback;
    }

    return fn(sharedClient, ...args);
  };
}

connectRedis.getClient = () => sharedClient;
connectRedis.get = withClient((client, key) => client.get(key), null);
connectRedis.set = withClient((client, key, value, options) =>
  client.set(key, value, options)
);
connectRedis.setEx = withClient((client, key, ttlSeconds, value) =>
  client.setEx(key, ttlSeconds, value)
);
connectRedis.del = withClient((client, ...keys) => client.del(keys.flat()), 0);
connectRedis.exists = withClient((client, key) => client.exists(key), 0);
connectRedis.keys = withClient((client, pattern) => client.keys(pattern), []);
connectRedis.quit = withClient((client) => client.quit(), null);

module.exports = connectRedis;

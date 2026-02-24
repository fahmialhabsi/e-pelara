// backend/utils/safeRedis.js

function logError(op, key, err) {
  console.warn(`⚠️ Redis ${op} error (${key}): ${err.message}`);
}

async function safeGet(client, key, fallback = null) {
  try {
    return await client.get(key);
  } catch (err) {
    logError("GET", key, err);
    return fallback;
  }
}

async function safeSet(client, key, value, options = {}) {
  try {
    await client.set(key, value, options);
  } catch (err) {
    logError("SET", key, err);
  }
}

async function safeSetEx(client, key, ttlSeconds, value) {
  try {
    await client.setEx(key, ttlSeconds, value);
  } catch (err) {
    logError("SETEX", key, err);
  }
}

module.exports = {
  safeGet,
  safeSet,
  safeSetEx,
};

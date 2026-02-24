// backend/utils/logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ level, message, timestamp }) =>
        `[${timestamp}] ${level.toUpperCase()}: ${message}`
    )
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }), // 🔴 error only
    new winston.transports.File({ filename: "combined.log" }), // 🔵 semua level
  ],
});

// ✅ Log juga ke console saat development
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console());
}

module.exports = logger;

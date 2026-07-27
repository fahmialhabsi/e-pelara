// backend/utils/logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const text = typeof message === "object" ? JSON.stringify(message) : message;
      const metaKeys = Object.keys(meta);
      const metaText = metaKeys.length ? ` ${JSON.stringify(meta)}` : "";
      return `[${timestamp}] ${level.toUpperCase()}: ${text}${metaText}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: "error.log",
      level: "error",
      maxsize: 20 * 1024 * 1024, // 20MB per file agar tidak tumbuh tak terbatas
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: "combined.log",
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// ✅ Log juga ke console saat development
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console());
}

module.exports = logger;

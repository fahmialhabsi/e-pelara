"use strict";

const crypto = require("node:crypto");

const [, , ...args] = process.argv;
const rawKey = args.join(" ");

if (!rawKey || !rawKey.trim()) {
  console.error("ERROR: Unlock key kosong.");
  console.error('Contoh: node scripts/hash-final-lock-key.js "password-rahasia-anda"');
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");

console.log(`EPELARA_FINAL_LOCK_HASH=${hash}`);
console.log("");
console.log("Simpan hash ini di environment lokal/CI secret, bukan di repository.");
console.log("Password asli jangan ditulis di file project dan jangan dicommit.");

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, ".governance", "final-lock.json");

const normalizePath = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error("EPELARA FINAL CODE LOCK ERROR");
    console.error(`Gagal membaca manifest: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
};

const runGit = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
  } catch {
    return [];
  }
};

const unique = (items) => Array.from(new Set(items));

const getChangedFiles = () => {
  const staged = runGit(["diff", "--cached", "--name-only"]);
  const unstaged = runGit(["diff", "--name-only"]);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]);

  return unique([...staged, ...unstaged, ...untracked]);
};

const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

const startsWithPath = (filePath, rootPath) => {
  const file = normalizePath(filePath);
  const root = normalizePath(rootPath);
  if (!root) return false;
  return file === root.replace(/\/$/, "") || file.startsWith(root.endsWith("/") ? root : `${root}/`);
};

const isInList = (filePath, entries) => {
  return entries.some((entry) => {
    const entryPath = normalizePath(entry.path);
    return entryPath.endsWith("/") ? startsWithPath(filePath, entryPath) : normalizePath(filePath) === entryPath;
  });
};

const getLockReason = (filePath, manifest) => {
  const normalizedFile = normalizePath(filePath);
  const excluded = manifest.excluded_paths || [];
  const allowed = manifest.always_allowed_paths || [];

  if (isInList(normalizedFile, excluded)) {
    return null;
  }

  if (isInList(normalizedFile, allowed)) {
    return null;
  }

  const lockedFiles = manifest.locked_files || [];
  const exactLock = lockedFiles.find((item) => normalizePath(item.path) === normalizedFile);
  if (exactLock) {
    return {
      type: "file",
      lock: exactLock,
    };
  }

  const lockedRoots = manifest.locked_roots || [];
  const rootLock = lockedRoots.find((item) => startsWithPath(normalizedFile, item.path));
  if (rootLock) {
    return {
      type: "root",
      lock: rootLock,
    };
  }

  return null;
};

const manifest = readJson(MANIFEST_PATH);
const changedFiles = getChangedFiles();

const changedLockedFiles = changedFiles
  .map((filePath) => ({ filePath, lockReason: getLockReason(filePath, manifest) }))
  .filter((item) => item.lockReason);

if (changedLockedFiles.length === 0) {
  console.log("EPELARA FINAL CODE LOCK: OK");
  console.log("Tidak ada file frontend/backend/dokumen locked yang berubah.");
  process.exit(0);
}

const keyEnvName = manifest.unlock_env_name || "EPELARA_FINAL_LOCK_KEY";
const hashEnvName = manifest.unlock_hash_env_name || "EPELARA_FINAL_LOCK_HASH";
const unlockKey = process.env[keyEnvName] || "";
const expectedHash = process.env[hashEnvName] || "";

const actualHash = unlockKey ? sha256(unlockKey) : "";
const unlocked = Boolean(unlockKey && expectedHash && actualHash === expectedHash);

if (unlocked) {
  console.log("EPELARA FINAL CODE LOCK: UNLOCKED BY OWNER KEY");
  console.log("Ada file frontend/backend/dokumen locked yang berubah, tetapi unlock key valid.");
  changedLockedFiles.forEach(({ filePath, lockReason }) => {
    const lock = lockReason.lock || {};
    console.log(`- ${filePath} (${lock.step || lock.status || lockReason.type || "LOCKED"})`);
  });
  process.exit(0);
}

console.error("");
console.error("EPELARA FINAL CODE LOCK BLOCKED");
console.error("");
console.error("Perubahan pada file frontend/backend/dokumen source-of-truth diblokir.");
console.error("File berikut tidak boleh diubah tanpa unlock key owner:");
console.error("");

changedLockedFiles.forEach(({ filePath, lockReason }) => {
  const lock = lockReason.lock || {};
  console.error(`- ${filePath}`);
  console.error(`  Lock   : ${lockReason.type}`);
  console.error(`  Status : ${lock.status || "-"}`);
  console.error(`  Step   : ${lock.step || "-"}`);
  console.error(`  Reason : ${lock.reason || "-"}`);
  console.error("");
});

console.error("Untuk membuka sementara, owner harus menjalankan guard dengan key dan hash yang benar.");
console.error("");
console.error("PowerShell:");
console.error(`$env:${keyEnvName}="PASSWORD_RAHASIA_OWNER"`);
console.error(`$env:${hashEnvName}="HASH_SHA256_OWNER"`);
console.error("npm run guard:final-lock");
console.error("");
console.error("Git Bash:");
console.error(`${keyEnvName}="PASSWORD_RAHASIA_OWNER" ${hashEnvName}="HASH_SHA256_OWNER" npm run guard:final-lock`);
console.error("");
console.error("Cara membuat hash:");
console.error('node scripts/hash-final-lock-key.js "PASSWORD_RAHASIA_OWNER"');
console.error("");
console.error("PERINGATAN:");
console.error("- Password asli jangan ditulis di source code.");
console.error("- Password asli jangan dicommit.");
console.error("- Perubahan frontend/backend yang sudah stabil wajib pakai step baru dan approval owner.");
console.error("");

process.exit(1);

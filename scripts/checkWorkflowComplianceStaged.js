"use strict";

/**
 * Wrapper Tahap 3, Opsi C (pre-commit hook, spec 32a §6.2/§6.3, §7.2) —
 * dipanggil oleh lint-staged (lihat root package.json, key "lint-staged":
 * { "backend/models/*.js": "npm run check:workflow-compliance-staged --" })
 * pada setiap `git commit` yang menyentuh file di backend/models/.
 *
 * lint-staged memanggil script ini dengan daftar file yang STAGED (relative
 * ke repo root) sebagai argumen CLI. Tugas wrapper ini:
 *   1. Persempit daftar file staged ke yang benar-benar BARU (belum pernah
 *      ada di HEAD) — logika sama persis dengan filter di
 *      scripts/check-final-locked-files.js (Opsi A), demi konsistensi
 *      lintas mekanisme enforcement dan sejalan non-retroaktif ADR-0005 §3.6.
 *   2. Jika ada model baru, jalankan Tahap 1
 *      (backend/scripts/workflowComplianceValidationSelfTest.js) dalam mode
 *      --enforce — BLOCKING pada modul baru MEMBATALKAN commit (exit code
 *      non-zero diteruskan apa adanya ke lint-staged/husky).
 *   3. Jika tidak ada model baru di antara file staged, exit 0 tanpa
 *      menjalankan apa pun (model existing yang sekadar dimodifikasi tidak
 *      diperiksa otomatis di sini — di luar cakupan Tahap 1 by design).
 *
 * Beda dengan wiring Opsi A (check-final-locked-files.js): Opsi A berjalan
 * --report-only (informatif, tidak memblokir guard manual). Wrapper ini
 * berjalan --enforce karena tujuannya memang memblokir commit — itulah yang
 * membedakan Opsi C sebagai enforcement yang tidak bergantung pada manusia
 * mengingat menjalankan pemeriksaan secara manual (lihat spec 32a §7.2).
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = process.cwd();

const normalizePath = (value) =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();

const existsInHead = (filePath) => {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${filePath}`], {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
};

function main() {
  const stagedArgs = process.argv.slice(2).map(normalizePath).filter(Boolean);

  const stagedModelFiles = stagedArgs.filter(
    (f) => f.startsWith("backend/models/") && f.endsWith(".js"),
  );

  if (stagedModelFiles.length === 0) {
    // lint-staged mengonfigurasi glob "backend/models/*.js", jadi ini
    // seharusnya jarang terjadi, tapi tetap aman: tidak ada yang diperiksa.
    process.exit(0);
  }

  // Persempit ke file yang BELUM ada di HEAD (benar-benar baru, belum pernah
  // di-commit) — model existing yang sekadar dimodifikasi tidak ikut
  // diperiksa Tahap 1 lewat wiring otomatis ini (non-retroaktif ADR-0005).
  const newModelFiles = stagedModelFiles.filter((f) => !existsInHead(f));

  if (newModelFiles.length === 0) {
    process.exit(0);
  }

  const scriptPath = path.join(
    ROOT,
    "backend",
    "scripts",
    "workflowComplianceValidationSelfTest.js",
  );

  if (!fs.existsSync(scriptPath)) {
    console.error(
      `check:workflow-compliance-staged: script Tahap 1 tidak ditemukan di ${scriptPath} — commit dibatalkan agar tidak melewatkan pemeriksaan diam-diam.`,
    );
    process.exit(1);
  }

  const modelBasenames = newModelFiles.map((f) => path.basename(f));

  console.log("");
  console.log(
    "--- Workflow Compliance Check (Tahap 1, mode --enforce, pre-commit) ---",
  );
  console.log(`Model baru terdeteksi (belum ada di HEAD): ${modelBasenames.join(", ")}`);

  try {
    execFileSync(
      "node",
      [scriptPath, ...modelBasenames, "--enforce"],
      { cwd: path.join(ROOT, "backend"), stdio: "inherit" },
    );
  } catch (error) {
    console.log("--- Workflow Compliance Check GAGAL — commit dibatalkan ---");
    console.log("");
    // Teruskan exit code non-zero dari Tahap 1 (BLOCKING finding) atau dari
    // error operasional script (argumen/file tidak valid) apa adanya.
    process.exit(typeof error.status === "number" ? error.status : 1);
  }

  console.log("--- Workflow Compliance Check lolos, lanjut commit ---");
  console.log("");
  process.exit(0);
}

main();

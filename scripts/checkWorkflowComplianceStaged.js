"use strict";

/**
 * Wrapper pre-commit (Opsi C, spec 32a §6.2/§6.3) — dipanggil oleh lint-staged
 * lewat .husky/pre-commit, menerima daftar file model backend/models/*.js
 * yang ADA DI STAGING AREA git commit ini (bukan full scan repo).
 *
 * Tujuan: menjalankan Tahap 1 (workflowComplianceValidationSelfTest.js) dalam
 * mode --enforce HANYA terhadap file model yang benar-benar BARU (belum
 * pernah ada di HEAD) di antara file yang di-stage. Model existing yang
 * di-stage untuk perubahan lain (bugfix, refactor, dst.) TIDAK diperiksa di
 * sini — konsisten dengan batas non-retroaktif ADR-0005 §3.6 dan filter yang
 * sama dipakai di scripts/check-final-locked-files.js (Tahap 3, Opsi A).
 *
 * lint-staged memanggil script ini dengan argumen = daftar path absolut file
 * yang di-stage dan cocok pola "backend/models/*.js" (lihat konfigurasi
 * "lint-staged" di package.json root).
 *
 * Exit code:
 *   0 — tidak ada file baru di antara yang di-stage, ATAU semua file baru
 *       lolos Tahap 1 tanpa BLOCKING finding. Commit boleh lanjut.
 *   1 — ada file model baru dengan BLOCKING finding. Commit diblokir oleh
 *       husky (lint-staged menghentikan commit bila script exit non-zero).
 *
 * Catatan: script ini TIDAK memblokir commit karena WARNING (kriteria 2
 * STRING bebas, kriteria 4 audit trail) — hanya BLOCKING (kriteria 1: tidak
 * ada kolom status; kriteria 2 ENUM salah; kriteria 3: kolom status paralel
 * tak terdokumentasi). Ini mengikuti definisi severity yang sama dengan
 * Tahap 1 sendiri (spec 32a §4.2), bukan aturan baru.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const VALIDATION_SCRIPT = path.join(BACKEND_DIR, "scripts", "workflowComplianceValidationSelfTest.js");

const existsInHead = (absFilePath) => {
  const relFromRepoRoot = path.relative(REPO_ROOT, absFilePath).replace(/\\/g, "/");
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${relFromRepoRoot}`], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
};

function main() {
  const stagedFiles = process.argv.slice(2);

  if (stagedFiles.length === 0) {
    // lint-staged tidak akan memanggil script ini tanpa file yang cocok
    // pola, tapi tetap ditangani agar script aman dipanggil manual juga.
    process.exit(0);
  }

  const newModelFiles = stagedFiles.filter((f) => !existsInHead(f));

  if (newModelFiles.length === 0) {
    console.log(
      "[pre-commit] Semua file model yang di-stage sudah ada di HEAD (bukan modul baru) — Tahap 1 dilewati sesuai batas non-retroaktif ADR-0005.",
    );
    process.exit(0);
  }

  if (!fs.existsSync(VALIDATION_SCRIPT)) {
    console.error("[pre-commit] workflowComplianceValidationSelfTest.js tidak ditemukan — enforcement tidak bisa jalan, commit diblokir demi keamanan.");
    process.exit(1);
  }

  const basenames = newModelFiles.map((f) => path.basename(f));
  console.log(`[pre-commit] Ditemukan ${basenames.length} model baru di staging: ${basenames.join(", ")}`);
  console.log("[pre-commit] Menjalankan Workflow Compliance Check (Tahap 1, mode --enforce)...");

  try {
    execFileSync("node", [VALIDATION_SCRIPT, ...basenames, "--enforce"], {
      cwd: BACKEND_DIR,
      stdio: "inherit",
    });
    // exit 0 dari validation script -> lolos, tidak ada BLOCKING.
    process.exit(0);
  } catch (error) {
    const exitCode = error.status;
    if (exitCode === 1) {
      console.error("");
      console.error("[pre-commit] COMMIT DIBLOKIR: ada BLOCKING finding pada modul baru (lihat detail di atas).");
      console.error("[pre-commit] Perbaiki pola status modul, atau jika memang pengecualian sah, daftarkan ke");
      console.error("[pre-commit] backend/scripts/workflowComplianceExceptions.json dengan alasan tertulis (lihat entri ProSN-P sebagai contoh).");
      process.exit(1);
    }
    // exit code 2 = error operasional (argumen/file), atau error tak terduga
    // lain. Diblokir juga (fail-safe), tapi dengan pesan berbeda agar developer
    // tahu ini bukan pelanggaran pola, melainkan masalah menjalankan check-nya.
    console.error(`[pre-commit] Workflow compliance check gagal dijalankan (exit ${exitCode}): ${error.message}`);
    console.error("[pre-commit] Commit diblokir sebagai fail-safe. Laporkan ke tim jika ini berulang.");
    process.exit(1);
  }
}

main();

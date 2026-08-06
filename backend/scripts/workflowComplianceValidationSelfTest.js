"use strict";

/**
 * Static check / lint rule untuk kepatuhan modul baru terhadap pola generik
 * 4-state (DRAFT/SUBMITTED/APPROVED/REJECTED), sesuai:
 *   - ADR-0005 (00-governance/adr/ADR-0005-Mandatory-Generic-Workflow-Compliance-Decision.md)
 *   - Spec 32a (04-application-architecture/32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md), §4
 *
 * PENTING (selaras §4.3 spec 32a): script ini TIDAK melakukan full repository
 * scan otomatis. Daftar modul yang diperiksa harus diberikan eksplisit lewat
 * argumen CLI (nama file model relatif ke backend/models/) atau lewat
 * modules.txt yang direferensikan dengan --file. Ini disengaja — memindai
 * seluruh models/ akan menandai puluhan modul existing (RPJMD, Renja, dll.)
 * yang statusnya sudah didisposisikan terpisah oleh ADR-0002/ADR-0005 §3.6,
 * dan yang belum diinventarisasi di whitelist (lihat §9 Evidence Pending
 * Register spec 32a — daftar whitelist belum ada).
 *
 * Cara pakai:
 *   node scripts/workflowComplianceValidationSelfTest.js <modelFile...> [--report-only|--enforce] [--json]
 *   npm run check:workflow-compliance -- ModelBaru.js --report-only
 *
 * Mode:
 *   --report-only (default)  : mencetak temuan, TIDAK exit 1 walau ada BLOCKING.
 *   --enforce                 : exit 1 bila ada finding BLOCKING.
 *
 * Exit code:
 *   0 selalu di --report-only (kecuali error internal script, exit 2).
 *   0/1 di --enforce sesuai temuan BLOCKING.
 *   2 jika argumen tidak valid / file tidak ditemukan (error operasional).
 *
 * Kriteria pemeriksaan (spec 32a §4.2):
 *   1. Model memiliki satu kolom status resmi (STRING/ENUM, nama mengandung
 *      "status" atau "approval_status").
 *   2. Jika ENUM, nilai domain harus persis {DRAFT,SUBMITTED,APPROVED,REJECTED}.
 *      Jika STRING bebas tanpa whitelist -> WARNING (bukan BLOCKING otomatis).
 *   3. Tidak ada kolom status paralel tak terdokumentasi (pola *_submitted,
 *      *_state, workflow_status di luar kolom utama) kecuali whitelisted.
 *   4. Ada model/tabel log terkait (pola *_logs, *_history) -> WARNING jika
 *      tidak ditemukan (bukan BLOCKING).
 *
 * Whitelist: backend/scripts/workflowComplianceExceptions.json (§4.4 spec 32a).
 */

const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "..", "models");
const EXCEPTIONS_FILE = path.join(__dirname, "workflowComplianceExceptions.json");

const GENERIC_STATUS_VALUES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_FILE)) {
    return { modules: {} };
  }
  try {
    const raw = fs.readFileSync(EXCEPTIONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Gagal membaca whitelist ${EXCEPTIONS_FILE}: ${e.message}`);
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const files = [];
  let mode = "report-only";
  let json = false;

  for (const arg of args) {
    if (arg === "--enforce") mode = "enforce";
    else if (arg === "--report-only") mode = "report-only";
    else if (arg === "--json") json = true;
    else if (arg.startsWith("--")) {
      throw new Error(`Argumen tidak dikenal: ${arg}`);
    } else {
      files.push(arg);
    }
  }

  if (files.length === 0) {
    throw new Error(
      "Tidak ada modul yang ditentukan. Sesuai spec 32a §4.3, daftar modul harus " +
        "eksplisit, bukan full scan. Contoh: node workflowComplianceValidationSelfTest.js NamaModelBaru.js",
    );
  }

  return { files, mode, json };
}

/**
 * Ekstraksi kolom-kolom model secara statis dari source (bukan require()),
 * agar script tidak butuh koneksi database dan tidak mengeksekusi side-effect
 * apa pun dari file model (sesuai batas "static check" §4 spec 32a).
 */
function extractColumnsFromSource(source) {
  const columns = [];
  // Cocokkan blok `nama_kolom: { ... type: DataTypes.XXXX(...) ... }`
  // Pendekatan regex sederhana per-kolom top-level di dalam init({ ... }).
  const columnBlockRegex = /(\w+)\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;
  while ((match = columnBlockRegex.exec(source)) !== null) {
    const [, name, body] = match;
    const typeMatch = body.match(/type\s*:\s*DataTypes\.(\w+)(\(([^)]*)\))?/);
    if (!typeMatch) continue;
    const dataType = typeMatch[1];
    const enumArgs = typeMatch[3];
    let enumValues = null;
    if (dataType === "ENUM" && enumArgs) {
      enumValues = enumArgs
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
    columns.push({ name, dataType, enumValues });
  }
  return columns;
}

function checkCriteria1to4(moduleName, source, exceptions) {
  const findings = [];
  const whitelist = (exceptions.modules && exceptions.modules[moduleName]) || null;
  const columns = extractColumnsFromSource(source);

  const statusCols = columns.filter((c) => /(^|_)status$/i.test(c.name) || c.name === "approval_status");

  // Kriteria 1: harus ada minimal satu kolom status
  if (statusCols.length === 0) {
    findings.push({
      module: moduleName,
      criterion: 1,
      severity: "BLOCKING",
      message: "Tidak ditemukan kolom status resmi (pola *status / approval_status).",
      location: `models/${moduleName}`,
    });
    // Tidak lanjut ke kriteria 2 karena tidak ada kolom untuk diperiksa.
  } else {
    // Kriteria 2: domain nilai harus generik 4-state
    for (const col of statusCols) {
      if (col.dataType === "ENUM") {
        const sortedActual = [...col.enumValues].sort();
        const sortedExpected = [...GENERIC_STATUS_VALUES].sort();
        const matches =
          sortedActual.length === sortedExpected.length &&
          sortedActual.every((v, i) => v === sortedExpected[i]);
        if (!matches) {
          if (whitelist && whitelist.criterion2) {
            // whitelisted, skip
          } else {
            findings.push({
              module: moduleName,
              criterion: 2,
              severity: "BLOCKING",
              message: `Kolom "${col.name}" adalah ENUM tapi nilainya [${col.enumValues.join(", ")}] tidak cocok dengan generik [${GENERIC_STATUS_VALUES.join(", ")}].`,
              location: `models/${moduleName}`,
            });
          }
        }
      } else if (col.dataType === "STRING" || col.dataType === "TEXT") {
        if (whitelist && whitelist.criterion2) {
          // sudah terdokumentasi sebagai pengecualian, skip
        } else {
          findings.push({
            module: moduleName,
            criterion: 2,
            severity: "WARNING",
            message: `Kolom "${col.name}" bertipe ${col.dataType} bebas, bukan ENUM generik. Tidak otomatis gagal, tapi perlu direview/didaftarkan ke whitelist jika disengaja.`,
            location: `models/${moduleName}`,
          });
        }
      }
    }
  }

  // Kriteria 3: kolom status paralel tak terdokumentasi
  const parallelPattern = /(_submitted|_state|workflow_status)$/i;
  const parallelCols = columns.filter(
    (c) => parallelPattern.test(c.name) && !statusCols.includes(c),
  );
  for (const col of parallelCols) {
    if (whitelist && Array.isArray(whitelist.allowedParallelColumns) && whitelist.allowedParallelColumns.includes(col.name)) {
      continue;
    }
    findings.push({
      module: moduleName,
      criterion: 3,
      severity: "BLOCKING",
      message: `Kolom "${col.name}" menyerupai status/lifecycle paralel di luar kolom status utama, dan tidak ada di whitelist.`,
      location: `models/${moduleName}`,
    });
  }

  // Kriteria 4: audit trail log terkait (WARNING only)
  const hasLogHint = /_logs?\b|_history\b/i.test(source);
  if (!hasLogHint) {
    findings.push({
      module: moduleName,
      criterion: 4,
      severity: "WARNING",
      message: "Tidak ditemukan referensi ke model/tabel log terkait (pola *_logs / *_history) di file model ini. Cek asosiasi secara manual sebelum menyimpulkan.",
      location: `models/${moduleName}`,
    });
  }

  return findings;
}

function printHumanReport(report) {
  console.log(`\nWorkflow Compliance Check — ${report.checkedAt}`);
  console.log(`Modul diperiksa: ${report.modulesChecked.join(", ")}`);
  console.log("");

  if (report.findings.length === 0) {
    console.log("Tidak ada temuan. Semua modul yang diperiksa sesuai kriteria §4.2.");
  } else {
    for (const f of report.findings) {
      console.log(`[${f.severity}] ${f.module} (kriteria ${f.criterion}): ${f.message}`);
      console.log(`  lokasi: ${f.location}`);
    }
  }

  console.log("");
  console.log(
    `Ringkasan: ${report.summary.blockingCount} BLOCKING, ${report.summary.warningCount} WARNING.`,
  );
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (e) {
    console.error(`Error argumen: ${e.message}`);
    process.exit(2);
  }

  const { files, mode, json } = parsed;

  let exceptions;
  try {
    exceptions = loadExceptions();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const findings = [];
  const modulesChecked = [];

  for (const file of files) {
    // Bare filename (no path separators) resolves against backend/models/,
    // matching the CLI convention documented in the header comment.
    // A path containing separators (relative or absolute) is used as-is,
    // resolved from the current working directory / filesystem root.
    let fullPath;
    if (path.isAbsolute(file)) {
      fullPath = file;
    } else if (file.includes("/") || file.includes(path.sep)) {
      fullPath = path.resolve(process.cwd(), file);
    } else {
      fullPath = path.join(MODELS_DIR, file);
    }
    if (!fs.existsSync(fullPath)) {
      console.error(`File model tidak ditemukan: ${fullPath}`);
      process.exit(2);
    }
    const moduleName = path.basename(fullPath);
    modulesChecked.push(moduleName);
    const source = fs.readFileSync(fullPath, "utf8");
    const moduleFindings = checkCriteria1to4(moduleName, source, exceptions);
    findings.push(...moduleFindings);
  }

  const blockingCount = findings.filter((f) => f.severity === "BLOCKING").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;

  const report = {
    checkedAt: new Date().toISOString(),
    modulesChecked,
    findings,
    summary: { blockingCount, warningCount },
    exitCode: mode === "enforce" && blockingCount > 0 ? 1 : 0,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  process.exit(report.exitCode);
}

main();

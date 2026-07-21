// backend/services/mr/mrHeavyExportGuardService.js

"use strict";

/**
 * Semaphore in-memory bersama untuk membatasi jumlah export "berat"
 * (Word/PDF) yang berjalan bersamaan lintas seluruh modul laporan MR
 * (Laporan MR maupun Laporan Pemantauan TLHP) — supaya satu proses Node
 * tidak kebanjiran generate dokumen sekaligus (docx build + konversi
 * LibreOffice cukup berat).
 *
 * Diekstrak dari mr_planningReportController.js supaya counter-nya benar-benar
 * dipakai bersama oleh controller report MR lain (bukan masing-masing punya
 * counter lokal sendiri yang tidak saling melihat).
 */

const MAX_CONCURRENT_HEAVY_EXPORT = 2;
let heavyExportInFlight = 0;

const runWithHeavyExportGuard = async (fn) => {
  if (heavyExportInFlight >= MAX_CONCURRENT_HEAVY_EXPORT) {
    const error = new Error("Antrian export sedang penuh. Coba beberapa saat lagi.");
    error.status = 429;
    error.statusCode = 429;
    error.code = "MR_EXPORT_QUEUE_BUSY";
    throw error;
  }

  heavyExportInFlight += 1;
  try {
    return await fn();
  } finally {
    heavyExportInFlight = Math.max(0, heavyExportInFlight - 1);
  }
};

module.exports = {
  MAX_CONCURRENT_HEAVY_EXPORT,
  runWithHeavyExportGuard,
};

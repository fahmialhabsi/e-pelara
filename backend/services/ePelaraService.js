// Stub ePelara service untuk lingkungan lokal ePeLARA yang belum terhubung API eksternal.
// Semua fungsi sengaja aman (tidak melempar) agar modul tetap bisa diuji end-to-end lokal.

function nowIso() {
  return new Date().toISOString();
}

async function getRenja(_token, _params = {}) {
  return [];
}

async function getRenstraOpd(_token, _params = {}) {
  return [];
}

async function getTargetRenstra(_token, _params = {}) {
  return [];
}

/**
 * Placeholder sinkronisasi RKPD.
 * Response dibuat terstruktur agar frontend sudah bisa menampilkan state integrasi.
 */
async function syncRkpd(_token, params = {}) {
  return {
    status: "stub",
    code: "INTEGRATION_NOT_READY",
    message:
      "Integrasi sinkronisasi RKPD ke e-Pelara belum aktif di environment lokal.",
    integration: "e-pelara",
    ready: false,
    mode: "local_stub",
    phase: "incomplete_integration",
    requested_at: nowIso(),
    request_params: params || {},
    synced: 0,
    skipped: 0,
    failed: 0,
    todos: [
      "Implementasi endpoint upstream e-Pelara untuk RKPD.",
      "Tambahkan mapper field RKPD <-> e-Pelara (kode program/kegiatan/sub-kegiatan).",
      "Tambahkan retry policy + idempotency key untuk batch sync.",
      "Tambahkan penyimpanan last_cursor/last_sync_at per tahun agar incremental sync bisa diuji.",
    ],
  };
}

module.exports = {
  getRenja,
  getRenstraOpd,
  getTargetRenstra,
  syncRkpd,
};

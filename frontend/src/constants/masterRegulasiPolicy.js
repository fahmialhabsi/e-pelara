/**
 * Kebijakan integrasi master ↔ regulasi (tanpa migrasi DB di tahap ini).
 *
 * Non-destructive: transaksi menyimpan snapshot kode + nama + master_*_id; master boleh diperbarui tanpa mengubah baris historis.
 * Versioning: sementara gunakan query datasetKey; ke depan mapping ke regulasi_versi_id di backend.
 * Mapping: siapkan tabel / layanan old_kode → new_kode (manual/otomatis) tanpa menghapus master lama.
 * UI: tampilkan label snapshot saat membuka data lama; fallback jika baris tidak ada di master terbaru (frozenLabels + graceful API).
 */
export const MASTER_DATASET_KEY_DEFAULT = "sekretariat_bidang_sheet2";

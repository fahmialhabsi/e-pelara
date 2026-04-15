# UAT Checklist - Renstra, Renja, RKPD

Checklist ini ditujukan untuk tester/non-developer.

## UAT Renstra
- [ ] List Renstra tampil, bisa filter/search.
- [ ] Create Renstra draft berhasil.
- [ ] Update Renstra draft berhasil.
- [ ] Delete Renstra draft berhasil.
- [ ] Status badge menampilkan `draft/submitted/approved/rejected` dengan benar.
- [ ] Badge sinkronisasi menampilkan `belum_sinkron/sinkron/gagal_sinkron`.
- [ ] Tombol workflow (submit/approve/reject/revisi) muncul sesuai status.
- [ ] User non-admin tidak bisa approve/reject.

## UAT Renja
- [ ] List Renja tampil, kolom utama (tahun, judul, program, anggaran, status, sinkronisasi) benar.
- [ ] Create Renja dengan `periode_id` valid berhasil.
- [ ] Create/Update Renja dengan `anggaran` negatif ditolak.
- [ ] Relasi `renstra_id` valid (tahun Renja berada dalam periode Renstra).
- [ ] Update dan delete Renja draft berhasil.
- [ ] Workflow submit -> approve/reject -> revise berjalan sesuai aturan transisi.

## UAT RKPD
- [ ] List RKPD tampil dengan kolom sinkronisasi.
- [ ] Create RKPD membutuhkan periode (`periode_id`/`periode_rpjmd_id`) dan identitas program/kegiatan/sub-kegiatan.
- [ ] `target`, `pagu_anggaran`, `anggaran` negatif ditolak.
- [ ] Update RKPD draft berhasil.
- [ ] Delete RKPD draft berhasil.
- [ ] Workflow submit/approve/reject/revise berjalan sesuai transisi valid.

## UAT Workflow Approval
- [ ] Transisi `draft -> submitted` berhasil.
- [ ] Transisi `submitted -> approved` hanya admin.
- [ ] Transisi `submitted -> rejected` hanya admin.
- [ ] Transisi `approved/rejected -> draft` via `revise/reset` berhasil.
- [ ] Transisi invalid (misalnya `approved -> approved`) ditolak HTTP 422.
- [ ] `status` dan `approval_status` selalu sinkron.
- [ ] `disetujui_oleh` dan `disetujui_at` hanya terisi saat approved.

## UAT Validasi Data
- [ ] Tahun wajib integer dan dalam rentang logis.
- [ ] Renstra: `periode_awal <= periode_akhir`.
- [ ] Renja: tahun harus dalam rentang periode dan (jika ada) rentang Renstra.
- [ ] RKPD: tahun harus dalam rentang periode RPJMD.
- [ ] Error message backend terbaca jelas dan konsisten.

## UAT Sinkronisasi / Stub Integration
- [ ] Renstra sync endpoint merespons sukses dan tidak crash pada data kosong.
- [ ] Renja sync endpoint merespons sukses dan tidak crash pada data kosong.
- [ ] RKPD sync endpoint mengembalikan status stub terstruktur (`status`, `code`, `mode`, `todos`).
- [ ] UI RKPD menampilkan notifikasi mode stub dengan jelas.
- [ ] Hasil sync tidak merusak status workflow dokumen existing.

## UAT Audit Trail
- [ ] Create/Update/Delete tercatat di `activity_logs`.
- [ ] Submit/Approve/Reject/Revise/Reset tercatat sebagai `STATUS_CHANGE`.
- [ ] Field `_workflow.action/from/to/note/actor/at` tersedia di payload log.

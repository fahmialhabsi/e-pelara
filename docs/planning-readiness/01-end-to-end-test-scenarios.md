# UAT E2E Scenarios - Renstra, Renja, RKPD

Dokumen ini adalah paket skenario uji end-to-end berbasis implementasi saat ini.

## Global precondition
- User tester tersedia:
  - `SUPER_ADMIN` atau `ADMINISTRATOR` (untuk action approve/reject)
  - `PELAKSANA/PENGAWAS` (untuk uji akses read-only)
- Migration dan seeder planning sudah dijalankan.
- Minimal 1 periode RPJMD aktif tersedia (contoh: 2025-2029).
- Endpoint backend aktif di prefix `/api`.
- Tabel audit `activity_logs` tersedia.

## A. Renstra (`renstra` / `api/renstra-docs`)

### RS-01 Create Renstra
- Precondition: login role `ADMINISTRATOR`.
- Langkah uji:
  1. POST `/api/renstra-docs`
  2. kirim payload create
- Payload inti:
```json
{
  "periode_awal": 2025,
  "periode_akhir": 2029,
  "judul": "Renstra Dinas Pangan 2025-2029",
  "status": "draft",
  "dokumen_url": "https://example.local/renstra-2025-2029.pdf"
}
```
- Hasil diharapkan: HTTP 201, `success=true`, data tersimpan.
- Status DB diharapkan:
  - `renstra.status = draft`
  - `renstra.approval_status = DRAFT`
  - `renstra.disetujui_oleh = null`, `renstra.disetujui_at = null`
  - ada log `activity_logs.action = CREATE`, `entity_type = RENSTRA`
- Catatan risiko: `periode_awal > periode_akhir` harus ditolak.

### RS-02 Update Renstra
- Precondition: data RS-01 sudah ada dan status `draft`.
- Langkah uji:
  1. PUT `/api/renstra-docs/:id`
  2. ubah judul/dokumen_url
- Payload inti:
```json
{
  "periode_awal": 2025,
  "periode_akhir": 2029,
  "judul": "Renstra Dinas Pangan 2025-2029 (Revisi 1)",
  "status": "draft"
}
```
- Hasil diharapkan: HTTP 200, field berubah.
- Status DB diharapkan:
  - `status` tetap `draft`, `approval_status` tetap `DRAFT`
  - log `UPDATE` tercatat.
- Catatan risiko: update dokumen `approved` harus terblokir middleware guard (kecuali override admin).

### RS-03 Submit Renstra
- Precondition: Renstra `draft`.
- Langkah uji:
  1. POST `/api/renstra-docs/:id/actions/submit`
- Payload inti:
```json
{
  "catatan": "Siap diajukan untuk review"
}
```
- Hasil diharapkan: HTTP 200, message status berubah ke `submitted`.
- Status DB diharapkan:
  - `status = submitted`, `approval_status = SUBMITTED`
  - `disetujui_oleh = null`, `disetujui_at = null`
  - log `STATUS_CHANGE` dengan `_workflow.action = submit`
- Catatan risiko: submit kedua kali dari `submitted` harus ditolak (422 transition invalid).

### RS-04 Approve Renstra
- Precondition: Renstra `submitted`, login `ADMINISTRATOR/SUPER_ADMIN`.
- Langkah uji:
  1. POST `/api/renstra-docs/:id/actions/approve`
- Payload inti:
```json
{
  "catatan": "Disetujui"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan:
  - `status = approved`, `approval_status = APPROVED`
  - `disetujui_oleh` terisi user approver
  - `disetujui_at` terisi timestamp
  - log `STATUS_CHANGE` action `approve`
- Catatan risiko: role non-admin harus menerima HTTP 403.

### RS-05 Reject Renstra
- Precondition: Renstra `submitted`, login admin.
- Langkah uji:
  1. POST `/api/renstra-docs/:id/actions/reject`
- Payload inti:
```json
{
  "catatan": "Perlu perbaikan indikator output"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan:
  - `status = rejected`, `approval_status = REJECTED`
  - `disetujui_oleh = null`, `disetujui_at = null`
  - log `STATUS_CHANGE` action `reject`
- Catatan risiko: jika UI tidak refresh, badge status bisa stale.

### RS-06 Revise/Reset Renstra
- Precondition: status `approved` atau `rejected`.
- Langkah uji:
  1. POST `/api/renstra-docs/:id/actions/revise`
  2. ulangi dengan `/actions/reset` pada skenario terpisah
- Payload inti:
```json
{
  "catatan": "Kembali ke draft untuk revisi"
}
```
- Hasil diharapkan: HTTP 200, status kembali `draft`.
- Status DB diharapkan:
  - `status = draft`, `approval_status = DRAFT`
  - `disetujui_oleh = null`, `disetujui_at = null`
  - log `STATUS_CHANGE` action `revise` atau `reset`
- Catatan risiko: data approved history ada di audit log, bukan di row utama.

## B. Renja (`renja` / `api/renja`)

### RJ-01 Create Renja
- Precondition: periode RPJMD aktif tersedia; Renstra referensi tersedia untuk tahun yang sama.
- Langkah uji: POST `/api/renja`.
- Payload inti:
```json
{
  "tahun": 2026,
  "periode_id": 1,
  "renstra_id": 1,
  "judul": "Renja Dinas Pangan 2026",
  "program": "Program Ketahanan Pangan",
  "kegiatan": "Peningkatan Produksi Lokal",
  "sub_kegiatan": "Pendampingan Petani",
  "target": "120",
  "anggaran": 250000000,
  "status": "draft",
  "jenis_dokumen": "renja"
}
```
- Hasil diharapkan: HTTP 201.
- Status DB diharapkan:
  - `renja.status = draft`, `approval_status = DRAFT`
  - `anggaran >= 0`
  - log `CREATE` entity `RENJA`
- Catatan risiko: `tahun` di luar rentang Renstra/Periode harus ditolak (400).

### RJ-02 Update Renja
- Precondition: Renja draft ada.
- Langkah uji: PUT `/api/renja/:id`.
- Payload inti:
```json
{
  "tahun": 2026,
  "periode_id": 1,
  "renstra_id": 1,
  "judul": "Renja Dinas Pangan 2026 - Revisi",
  "anggaran": 275000000,
  "status": "draft"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: row ter-update, log `UPDATE` ada.
- Catatan risiko: nilai negatif `anggaran` harus ditolak.

### RJ-03 Submit Renja
- Precondition: status `draft`.
- Langkah uji: POST `/api/renja/:id/actions/submit`.
- Payload inti:
```json
{
  "catatan": "Siap review renja"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: `status=submitted`, `approval_status=SUBMITTED`, log status change.
- Catatan risiko: submit dari state invalid harus 422.

### RJ-04 Approve Renja
- Precondition: status `submitted`, login admin.
- Langkah uji: POST `/api/renja/:id/actions/approve`.
- Payload inti:
```json
{
  "catatan": "Disetujui untuk tahun berjalan"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan:
  - `status=approved`, `approval_status=APPROVED`
  - `disetujui_oleh/disetujui_at` terisi
  - log action `approve`
- Catatan risiko: non-admin harus 403.

### RJ-05 Reject Renja
- Precondition: status `submitted`, login admin.
- Langkah uji: POST `/api/renja/:id/actions/reject`.
- Payload inti:
```json
{
  "catatan": "Rincian kegiatan belum lengkap"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: `status=rejected`, `approval_status=REJECTED`, log status change.
- Catatan risiko: catatan reject wajib dipastikan tampil di log untuk debugging.

### RJ-06 Revise/Reset Renja
- Precondition: status `approved` atau `rejected`.
- Langkah uji: POST `/api/renja/:id/actions/revise` (atau `/reset`).
- Payload inti:
```json
{
  "catatan": "Kembali ke draft"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: kembali `draft/DRAFT`, log `STATUS_CHANGE`.
- Catatan risiko: proses edit lanjut setelah revise harus diuji lagi sampai submit.

## C. RKPD (`rkpd` / `api/rkpd`)

### RK-01 Create RKPD
- Precondition: periode RPJMD tersedia.
- Langkah uji: POST `/api/rkpd`.
- Payload inti:
```json
{
  "tahun": 2026,
  "periode_rpjmd_id": 1,
  "periode_id": 1,
  "kode_program": "3.01.01",
  "nama_program": "Program Ketahanan Pangan",
  "kode_kegiatan": "3.01.01.2.01",
  "nama_kegiatan": "Peningkatan Ketersediaan Pangan",
  "kode_sub_kegiatan": "3.01.01.2.01.001",
  "nama_sub_kegiatan": "Pendampingan Produksi",
  "target": 100,
  "pagu_anggaran": 500000000,
  "sumber_dana": "APBD",
  "opd_penanggung_jawab": "Dinas Pangan",
  "status": "draft"
}
```
- Hasil diharapkan: HTTP 201.
- Status DB diharapkan: `status=draft`, `approval_status=DRAFT`, log `CREATE`.
- Catatan risiko: wajib ada minimal identitas program/kegiatan/sub-kegiatan.

### RK-02 Update RKPD
- Precondition: RKPD draft tersedia.
- Langkah uji: PUT `/api/rkpd/:id`.
- Payload inti:
```json
{
  "tahun": 2026,
  "periode_rpjmd_id": 1,
  "periode_id": 1,
  "nama_sub_kegiatan": "Pendampingan Produksi - Revisi",
  "target": 110,
  "pagu_anggaran": 520000000,
  "status": "draft"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: nilai berubah, log `UPDATE` ada.
- Catatan risiko: `target/pagu/anggaran` negatif harus ditolak.

### RK-03 Submit RKPD
- Precondition: status `draft`.
- Langkah uji: POST `/api/rkpd/:id/actions/submit`.
- Payload inti:
```json
{
  "catatan": "Siap review RKPD"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: `submitted/SUBMITTED`, log status change.
- Catatan risiko: submit tanpa data inti yang valid harus sudah tertangkap sejak create/update.

### RK-04 Approve RKPD
- Precondition: status `submitted`, login admin.
- Langkah uji: POST `/api/rkpd/:id/actions/approve`.
- Payload inti:
```json
{
  "catatan": "Disetujui"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan:
  - `approved/APPROVED`
  - `disetujui_oleh/disetujui_at` terisi
  - audit `STATUS_CHANGE` action `approve`
- Catatan risiko: validasi role harus konsisten dengan mapping role SSO.

### RK-05 Reject RKPD
- Precondition: status `submitted`, login admin.
- Langkah uji: POST `/api/rkpd/:id/actions/reject`.
- Payload inti:
```json
{
  "catatan": "Perbaiki pagu dan target"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: `rejected/REJECTED`, log status change.
- Catatan risiko: UI harus menampilkan status baru tanpa reload cache lama.

### RK-06 Revise/Reset RKPD
- Precondition: status `approved` atau `rejected`.
- Langkah uji:
  1. POST `/api/rkpd/:id/actions/revise`
  2. uji juga endpoint alias `/api/rkpd/:id/reset`
- Payload inti:
```json
{
  "catatan": "Kembali ke draft untuk perbaikan"
}
```
- Hasil diharapkan: HTTP 200.
- Status DB diharapkan: `draft/DRAFT`, log status change tercatat.
- Catatan risiko: endpoint alias dan endpoint generic action harus hasilnya identik.

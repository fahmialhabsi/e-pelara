# Roadmap fase 2 — compliance, alert, rollout per OPD

Dokumen ini melanjutkan runbook [`rollout-checklist-sub-kegiatan.md`](./rollout-checklist-sub-kegiatan.md) (v1.7+) ke **peningkatan operasional** berikut. Tidak mengganti runbook; hanya arah kerja.

**Panduan operasional terpadu (Task Scheduler, cron, `trendHours`, webhook):** [`compliance-snapshot-operations.md`](./compliance-snapshot-operations.md).

---

## 1. Compliance dashboard (UI + data)

**Sudah ada (API backend):**

- `GET /api/v1/app-policy/compliance-snapshot` — agregat `sub_kegiatan` per `input_mode`, total baris, persen kira-kira MASTER, jumlah baris **MASTER** tanpa FK lengkap, `healthFlags`, plus mode global / efektif sub.
- `GET /api/v1/app-policy/compliance-snapshot?trendHours=168` — sama seperti di atas, plus array `trend` dari tabel `compliance_snapshot_history` (butuh migrasi + data histori).
- `POST /api/v1/app-policy/compliance-snapshot/record` — **admin** menyimpan satu titik histori; jadwal: `npm run job:compliance-record` (skrip `scripts/recordComplianceSnapshotJob.js` + env `EPELARA_COMPLIANCE_RECORD_JWT`). Opsional **webhook** setelah record jika `invalidMasterRowsMissingFk` melewati ambang (`EPELARA_COMPLIANCE_ALERT_WEBHOOK_URL`).

**Lanjutan disarankan:**

| Langkah          | Tujuan                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------- |
| Widget frontend  | Grafik LEGACY vs MASTER dari `trend` + angka live `current`                             |
| Job terjadwal    | Cron / Task Scheduler memanggil `POST …/record` tiap jam atau sekali sehari               |
| Split / migrasi  | Gabungkan angka dari `split-coverage` / unresolved mapping ke dashboard yang sama      |

---

## 2. Alert otomatis

**Opsi arsitektur (pilih satu atau kombinasi):**

| Pendekatan                                                                                     | Kelebihan                                                 | Catatan                              |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| **Webhook** (`POST` ke Slack/Teams) saat `invalidMasterRowsMissingFk > 0` atau error rate naik | Cepat diimplementasi dari worker/cron                     | Perlu secret URL, rate limit         |
| **Threshold pada polling**                                                                     | Frontend atau n8n/Airflow memanggil `compliance-snapshot` | Tidak ubah backend                   |
| **APM / log-based** (Grafana, CloudWatch alerts)                                               | Pola `[ENFORCEMENT]` / `MASTER_FIELDS_REQUIRED`           | Sudah selaras dengan runbook bagian 10–11 |
| **Sentry / error tracker**                                                                     | Untuk 5xx                                                 | Terpisah dari bisnis compliance      |

**Rekomendasi:** jadwalkan **POST …/compliance-snapshot/record** (satu jam sekali); aktifkan **webhook** untuk notifikasi otomatis saat data MASTER tidak konsisten. Polling `GET` saja tetap valid untuk dashboard tanpa menyimpan histori.

---

## 3. Rollout per OPD

**Kendala hari ini:** policy hanya **global** + **override sub_kegiatan** + **env**; filter OPD di transaksi banyak yang **string-based** (`opd_penanggung_jawab`).

**Opsi desain (butuh keputusan produk + migrasi ringan):**

1. **Policy JSON** — kunci baru `operational_mode_sub_kegiatan_by_opd` berisi map `{ "opdKey": "TRANSITION" }` (opdKey = id numerik string atau normalisasi nama); parsing di `getEffectiveOperationalModeForSubKegiatan` dengan konteks request (butuh `opd_id` atau string di header/body — hati-hati konsistensi).
2. **Tabel `app_policy_scope`** — kolom `scope_type`, `scope_key`, `policy_key`, `policy_value` untuk banyak entri tanpa JSON besar.
3. **Tunda** sampai **`kegiatan.opd_id`** (integer) stabil di semua transaksi — enforcement per OPD jadi query jelas.

**Runbook:** setelah fitur ini ada, perbarui bagian Known limitations dan Quick start dengan “mode efektif per konteks OPD”.

---

## 4. Urutan implementasi yang masuk akal

1. Pakai **`compliance-snapshot`** di staging + isi baris **SSOT** di runbook.
2. Dashboard minimal (baca API saja).
3. Alert: webhook setelah `POST …/record` (sudah didukung) atau polling threshold di luar backend.
4. Desain per-OPD + migrasi schema jika perlu.

---

_Versi: 1.1 — histori + trend + webhook pasca-record; rollout per-OPD tetap fase desain._

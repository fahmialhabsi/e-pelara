# Change tracking production-grade — RKPD & Renja (temporal + UI-ready)

Dokumen ini mendesain ulang lapisan temporal di atas **Sprint 4** (`planning_line_item_change_log` + cascade service) tanpa merusak **`rkpd_dokumen` / `renja_dokumen`** atau **derivation engine**. Pola: **tabel versi + jejak cascade + denormalisasi state di baris** untuk dashboard.

---

## 1. Desain schema final

### 1.1 Upgrade `planning_line_item_change_log` → **event queryable**

Tetap satu tabel (tidak memecah tanpa alasan), diperkaya agar UI/API bisa filter, join, dan diff tanpa parsing string liar.

| Kolom | Tipe | Keterangan |
|--------|------|------------|
| `id` | BIGINT PK | |
| `entity_type` | VARCHAR(32) | `rkpd_item` \| `renja_item` |
| `entity_id` | INT UNSIGNED | ID baris induk |
| `field_key` | VARCHAR(64) | `pagu`, `target`, `program`, … |
| `old_value` | TEXT | |
| `new_value` | TEXT | |
| **`change_type`** | VARCHAR(32) | `manual` \| `cascade_rkpd` \| `system` (menggantikan semantik `source` lama) |
| `source` | VARCHAR(32) | **deprecated** — mirror `change_type` untuk backward compat |
| **`version_before`** | INT UNSIGNED NULL | Nomor urut versi baris **sebelum** event (lihat §1.4) |
| **`version_after`** | INT UNSIGNED NULL | Nomor urut versi baris **sesudah** event |
| **`entity_version_id`** | BIGINT UNSIGNED NULL | FK logis ke `rkpd_item_version.id` atau `renja_item_version.id` (beda tipe entity → disambig lewat `entity_type`) |
| **`is_active_version`** | BOOLEAN NULL | Apakah revisi ini menjadi versi aktif baris (biasanya true untuk event terakhir) |
| `change_batch_id` | CHAR(40) | Korelasi batch / cascade |
| `user_id` | INT NULL | Actor (null untuk system/cascade otomatis) |
| `created_at` | DATETIME | |

**Index disarankan:** `(entity_type, entity_id, created_at)`, `(change_type, created_at)`, `(change_batch_id)`, `(entity_version_id)`.

---

### 1.2 `rkpd_dokumen_version` / `renja_dokumen_version`

Snapshot dokumen untuk regenerasi dokumen, audit, dan “versi resmi” tanpa mengganti baris induk.

| Kolom | Tipe | Keterangan |
|--------|------|------------|
| `id` | BIGINT PK | |
| `rkpd_dokumen_id` / `renja_dokumen_id` | INT | FK ke dokumen induk |
| `version_number` | INT | Monoton per dokumen (1,2,3,…) |
| `snapshot_data` | JSON | Salinan aman header + metadata (judul, status, tahun, FK, dll.) |
| `created_at` | DATETIME | |
| `created_by` | INT NULL | |
| **`is_current`** | TINYINT(1) | Satu baris `true` per dokumen (constraint aplikasi + unique partial jika DB mendukung; else enforced di service) |

---

### 1.3 `rkpd_item_version` / `renja_item_version`

**Versi baris** = sumber kebenaran untuk **before/after** tanpa agregasi log kompleks.

| Kolom | Tipe | Keterangan |
|--------|------|------------|
| `id` | BIGINT PK | |
| `rkpd_item_id` / `renja_item_id` | INT | FK baris induk |
| **`version_seq`** | INT UNSIGNED | Per `*_item_id`, naik 1 per revisi |
| `dokumen_version_id` | BIGINT NULL | Opsional: taut ke snapshot dokumen saat versi dibuat |
| **`snapshot_data`** | JSON | Salinan penuh baris (program, kegiatan, sub, indikator, target, pagu, satuan, …) |
| **`pagu_value`** | DECIMAL(20,2) NULL | Denormalisasi pagu untuk query cepat |
| **`pagu_context_version_id`** | BIGINT NULL | Versi dokumen/induk yang menjadi konteks angka (opsional) |
| **`pagu_source`** | VARCHAR(32) | `rkpd` \| `renja` \| `override` — konteks regulasi/alur |
| `change_state` | VARCHAR(32) | Snapshot state saat commit: `original` \| `updated` \| `cascaded` \| `overridden` |
| `created_at` | DATETIME | |
| `created_by` | INT NULL | |
| **`is_current`** | TINYINT(1) | Satu current per `*_item_id` |

**Catatan:** `snapshot_data` memungkinkan diff field-level di API tanpa menggali log baris-per-baris.

---

### 1.4 `rkpd_renja_cascade_trace`

Menutup gap **“tidak ada trace RKPD → Renja”**.

| Kolom | Tipe |
|--------|------|
| `id` | BIGINT PK |
| `rkpd_item_id` | INT NOT NULL |
| `renja_item_id` | INT NOT NULL |
| `change_batch_id` | CHAR(40) NOT NULL |
| **`cascade_type`** | VARCHAR(32) | `field_sync` \| `manual_link` \| `reconcile` |
| `created_at` | DATETIME |

Index: `(rkpd_item_id)`, `(renja_item_id)`, `(change_batch_id)`.

---

### 1.5 Kolom denormalisasi di `rkpd_item` & `renja_item` (UI + query cepat)

| Kolom | Tipe | Keterangan |
|--------|------|------------|
| **`change_state`** | VARCHAR(32) | `original` \| `updated` \| `cascaded` \| `overridden` |
| **`current_rkpd_item_version_id`** / **`current_renja_item_version_id`** | BIGINT NULL | FK ke `rkpd_item_version.id` / `renja_item_version.id` versi aktif |
| **`pagu_source`** | VARCHAR(32) NULL | `rkpd` \| `renja` \| `override` |
| **`pagu_line_version_id`** | BIGINT NULL | Opsional: menunjuk versi baris tempat pagu diambil (bisa sama dengan `current_item_version_id`) |

**Backward compatibility:** semua nullable/default aman; baris lama = `change_state = 'original'` atau NULL diisi migrasi.

---

## 2. ERD sederhana

```mermaid
erDiagram
  rkpd_dokumen ||--o{ rkpd_dokumen_version : has
  renja_dokumen ||--o{ renja_dokumen_version : has

  rkpd_item ||--o{ rkpd_item_version : versions
  renja_item ||--o{ renja_item_version : versions

  rkpd_item ||--o{ planning_line_item_change_log : events
  renja_item ||--o{ planning_line_item_change_log : events

  rkpd_item ||--o{ rkpd_renja_cascade_trace : from
  renja_item ||--o{ rkpd_renja_cascade_trace : to

  rkpd_item_version ||--o| planning_line_item_change_log : entity_version
  renja_item_version ||--o| planning_line_item_change_log : entity_version
```

---

## 3. Perubahan dari schema lama (Sprint 4)

| Sebelum | Sesudah |
|---------|---------|
| Hanya `planning_line_item_change_log` (field-level) | + versi dokumen & versi baris + cascade trace |
| `source` string bebas | `change_type` formal + `source` dipertahankan mirror |
| Tidak ada nomor versi baris | `version_seq` + `version_before` / `version_after` di log |
| Tidak ada snapshot | `snapshot_data` JSON di versi dokumen & baris |
| Cascade tak terlihat di DB | `rkpd_renja_cascade_trace` |
| UI tidak punya state | `change_state` + `pagu_source` di item |

---

## 4. Strategi migrasi

**Fase A (additive, zero downtime intent):**

1. `CREATE` tabel versi + `rkpd_renja_cascade_trace`.
2. `ALTER planning_line_item_change_log` tambah kolom nullable.
3. `ALTER rkpd_item` / `renja_item` tambah kolom nullable + default `change_state='original'` jika perlu.

**Fase B (backfill, bisa script terpisah):**

- Untiap dokumen v2: buat `*_dokumen_version` v1 dari `snapshot_data` JSON sekarang + `is_current=1`.
- Untiap baris: buat `*_item_version` v1 dari baris aktif + set `current_rkpd_item_version_id` / `current_renja_item_version_id`.
- Migrasi log lama: isi `change_type` dari `source` (`user`→`manual`, `cascade_rkpd`→`cascade_rkpd`).

**Fase C (service):**

- Tulis ulang `updateItem` RKPD: buat versi baru + append log + cascade + insert `rkpd_renja_cascade_trace`.
- Export DOCX: baca `*_item_version` / dokumen_version daripada hanya log.

**Derivation engine:** tidak diubah; versi hanya untuk dokumen hasil derivasi setelahnya.

---

## 5. Contoh query

### 5.1 Versi terbaru baris RKPD

```sql
SELECT v.*
FROM rkpd_item_version v
INNER JOIN rkpd_item i ON i.id = v.rkpd_item_id
WHERE v.rkpd_item_id = :itemId AND v.is_current = 1;
```

### 5.2 Riwayat perubahan (event)

```sql
SELECT *
FROM planning_line_item_change_log
WHERE entity_type = 'rkpd_item' AND entity_id = :itemId
ORDER BY created_at DESC;
```

### 5.3 Diff dua versi baris (tanpa log kompleks)

```sql
-- Ambil seq N dan N-1 dari rkpd_item_version untuk item yang sama
SELECT v1.version_seq, v1.snapshot_data AS after_json, v2.snapshot_data AS before_json
FROM rkpd_item_version v1
LEFT JOIN rkpd_item_version v2
  ON v2.rkpd_item_id = v1.rkpd_item_id AND v2.version_seq = v1.version_seq - 1
WHERE v1.id = :versionId;
```

### 5.4 Trace cascade satu batch

```sql
SELECT * FROM rkpd_renja_cascade_trace
WHERE change_batch_id = :batch;
```

---

## 6. Dampak ke API

| Endpoint baru / diperkaya | Perilaku |
|----------------------------|----------|
| `GET /api/rkpd/dokumen/:id/diff` | Query param `since_version`, `compare_to` — bandingkan `rkpd_item_version` / dokumen_version |
| `GET /api/renja/dokumen/:id/diff` | Sama |
| `PUT /api/rkpd/item/:id` | Wajib menulis versi + log + cascade trace (bukan hanya update flat) |
| `GET /api/rkpd/dokumen/:id/versions` | List `rkpd_dokumen_version` |
| Export DOCX/PDF | Prefer baca `is_current` snapshot + optional diff columns dari versi |

**Path:** tetap gunakan prefix `/dokumen/...` untuk v2 agar tidak bentrok legacy.

---

## 7. Dampak ke dashboard

| Kebutuhan UI | Pendukung schema |
|--------------|------------------|
| Highlight item berubah | `change_state != 'original'` atau `updated_at` versi > dokumen_version |
| Badge “cascaded from RKPD” | `change_state='cascaded'` + join `rkpd_renja_cascade_trace` |
| Badge “manual” | `change_type=manual` pada event terakhir atau `change_state=updated` |
| Toggle diff mode | API `.../diff` + flag `include_diff` pada dashboard data |
| Pagu dengan konteks | `pagu_value` + `pagu_source` + `pagu_line_version_id` di response agregat |

**Yang tidak diubah:** layout v2, mapping progress, audit consistency endpoint, pemisahan legacy — hanya **sumber field** response yang diperkaya.

---

## 8. Batas desain (tidak over-engineer)

- Satu tabel event (`planning_line_item_change_log`) tetap — cukup untuk audit queryable jika di-index benar.
- Versi baris menyimpan JSON snapshot — trade-off storage vs kecepatan diff; bisa dikompresi field-only nanti.
- **Tidak** memakai event sourcing penuh untuk seluruh domain — hanya RKPD/Renja perencanaan v2.

---

*Desain ini siap diimplementasikan bertahap bersama migrasi `20260415110000-production-change-tracking-v2.js`.*

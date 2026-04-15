# Sprint 2.7 — Stabilisasi data untuk dashboard (tanpa UI)

Dokumen ini mengikat **sumber data**, **risiko**, dan **kontrak API** sebelum Sprint 3 (frontend dashboard).

---

## 1. Idempotency DPA (implementasi)

- **Kunci**: `derivation_key` = `SHA-256` terpotong 48 hex dari `["dpa", rka_id, jenis_dokumen]` (`keyDpaFromRka`).
- **Kolom DB**: `dpa.derivation_key` (nullable untuk baris lama), **unique index** `dpa_derivation_key_unique`.
- **Mode `reuse` (default)**: jika DPA dengan `derivation_key` sama sudah ada, atau baris lama `(rka_id, jenis_dokumen)` cocok → **isi ulang `derivation_key` jika null**, lalu **reuse**; tidak membuat baris baru.
- **Mode `error`**: jika DPA sudah ada → **`DerivationConflictError`** → HTTP **409** (via `derivationController`).
- **Create baru**: hanya jika belum ada pasangan unik untuk derivasi tersebut.
- **Respons**: `idempotent_hit`, `created`, `reused`, `meta.rows_created`, `meta.rows_reused`.

---

## 2. Kontrak sumber data — Dashboard RKPD

| Aspek | Ketetapan |
|--------|-----------|
| **Sumber utama dokumen** | `rkpd_dokumen` (+ join `periode_rpjmds`). |
| **Sumber utama baris / pagu** | `rkpd_item` (FK `rkpd_dokumen_id`). |
| **Field relatif stabil** | `periode_id`, `tahun`, `judul`, `versi`, `status` (`draft`/`review`/`final`), `is_final_active`, `tanggal_pengesahan`, `derivation_key` (jika dari derivasi). |
| **Field semi-otomatis** | Teks `program` / `kegiatan` / `sub_kegiatan` / `indikator` pada item (salinan dari cascading/derivasi, bukan master SIPD resmi). |
| **Tidak layak sebagai metrik resmi tanpa validasi** | Agregasi `pagu` jika sebagian baris masih `draft` atau PD tidak terisi konsisten; `prioritas_daerah` opsional. |
| **Legacy** | Tabel `rkpd` (model lama) mungkin masih ada di basis data untuk data historis — **dashboard v2 harus memakai `rkpd_dokumen` / `rkpd_item`**, bukan mencampur tanpa label. |

**Menghindari pencampuran v2 vs legacy**: query dashboard RKPD **hanya** `rkpd_dokumen` + `rkpd_item`. Jika perlu data tahun lama dari `rkpd` legacy, endpoint terpisah dengan prefix/judul respons `legacy: true`.

---

## 3. Kontrak sumber data — Dashboard Renja

| Aspek | Ketetapan |
|--------|-----------|
| **Sumber utama dokumen** | `renja_dokumen` (+ `periode_rpjmds`, `perangkat_daerah`). |
| **Sumber utama baris** | `renja_item` (FK `renja_dokumen_id`). |
| **Penurunan RKPD → Renja** | `renja_dokumen.rkpd_dokumen_id`, `renstra_pd_dokumen_id`; pemetaan baris: `renja_rkpd_item_map` (`renja_item_id` unik ↔ `rkpd_item_id`). |
| **Field relatif stabil** | `periode_id`, `tahun`, `perangkat_daerah_id`, `status`, `is_final_active`, `derivation_key`. |
| **Field semi-otomatis** | Teks hierarki pada item (sama seperti RKPD); `legacy_renja_id` hanya untuk **jembatan ke RKA/DPA**. |
| **Tidak layak metrik resmi tanpa QA** | Persentase “selesai” jika `rkpd_dokumen_id` null atau map tidak lengkap. |
| **Legacy** | Tabel `renja` (legacy) + `rka` + `dpa` untuk eksekusi anggaran; **Renja perencanaan v2** = `renja_dokumen` / `renja_item`. |

**Menghindari pencampuran**: visualisasi “perencanaan” gunakan `renja_dokumen`; “anggaran/RKA/DPA” gunakan `legacy_renja_id` → `renja` → `rka`/`dpa`. Jangan menjumlahkan pagu Renja item dengan RKA tanpa aturan eksplisit.

---

## 4. Rancangan endpoint dashboard (final — spesifikasi, belum wajib diimplementasi semua)

Base disarankan: `/api/dashboard/planning/v1/...` (memisahkan dari dashboard RPJMD umum).

### 4.1 `GET .../rkpd/summary`

| Item | Detail |
|------|--------|
| **Sumber** | `rkpd_dokumen`, agregasi `rkpd_item` |
| **Query utama** | Filter `periode_id`, `tahun` (opsional PD); `SUM(pagu)`, `COUNT(*)`, grup `status` |
| **Output** | `{ total_dokumen, by_status, total_pagu, total_baris, periode_id, tahun }` |
| **Risiko** | Pagu dari teks derivasi; double-count jika beberapa dokumen overlap (seharusnya 1 dokumen aktif per kunci derivasi) |

### 4.2 `GET .../rkpd/renja-progress`

| Item | Detail |
|------|--------|
| **Sumber** | `rkpd_dokumen` LEFT JOIN `renja_dokumen` ON `renja_dokumen.rkpd_dokumen_id` + `renstra_pd_dokumen` |
| **Query utama** | Hitung dokumen RKPD yang punya Renja turunan; bandingkan jumlah item RKPD vs item Renja ter-map |
| **Output** | `{ rkpd_dokumen_id, has_renja, renja_dokumen_id, rkpd_item_count, renja_item_count, mapped_count }` (bisa paginated) |
| **Risiko** | `rkpd_dokumen_id` nullable di Renja; definisi “selesai” harus disepakati |

### 4.3 `GET .../rkpd/consistency-warnings`

| Item | Detail |
|------|--------|
| **Sumber** | `rkpd_item`, `renja_rkpd_item_map`, `renja_item` |
| **Query utama** | Item RKPD tanpa map Renja; map yang merujuk item hilang; pagu 0/null |
| **Output** | `{ warnings: [{ type, rkpd_item_id, message }] }` |
| **Risiko** | False positive jika Renja sengaja tidak 1:1 semua baris |

### 4.4 `GET .../renja/summary`

| Item | Detail |
|------|--------|
| **Sumber** | `renja_dokumen`, agregasi `renja_item` |
| **Query utama** | Sama pola RKPD; filter `perangkat_daerah_id` |
| **Output** | `{ total_dokumen, by_status, total_pagu, total_baris, tahun, periode_id }` |
| **Risiko** | Sama seperti RKPD |

### 4.5 `GET .../renja/rkpd-mapping-status`

| Item | Detail |
|------|--------|
| **Sumber** | `renja_dokumen` JOIN `rkpd_dokumen` |
| **Query utama** | List Renja dengan `rkpd_dokumen_id`, `derivation_key`, konsistensi `tahun`/`periode_id` |
| **Output** | `{ renja_dokumen_id, rkpd_dokumen_id, rkpd_tahun_match, periode_match }` |
| **Risiko** | Renja manual tanpa RKPD |

### 4.6 `GET .../renja/consistency-warnings`

| Item | Detail |
|------|--------|
| **Sumber** | `renja_item`, `renja_rkpd_item_map`, `rkpd_item` |
| **Query utama** | Item Renja tanpa map; map orphan; beda pagu RKPD vs Renja |
| **Output** | `{ warnings: [...] }` |
| **Risiko** | Perbedaan pagu karena pembulatan/teks |

### 4.7 `GET .../pagu-distribution`

| Item | Detail |
|------|--------|
| **Sumber** | `rkpd_item` atau `renja_item` (parameter `context=rkpd|renja`) |
| **Query utama** | `SUM(pagu)` GROUP BY `perangkat_daerah_id` atau label program |
| **Output** | `{ buckets: [{ key, label, total_pagu }] }` |
| **Risiko** | PD null pada item; agregasi lintas dokumen |

### 4.8 `GET .../review-progress`

| Item | Detail |
|------|--------|
| **Sumber** | `rkpd_dokumen` / `renja_dokumen` — `status`, `is_final_active`, `tanggal_pengesahan` |
| **Query utama** | Hitung per tahap `draft` / `review` / `final` |
| **Output** | `{ rkpd: { draft, review, final }, renja: { ... } }` |
| **Risiko** | Workflow approval multi-role bisa tidak tercermin hanya dari field ini |

---

## 5. Batas aman Sprint 3 — RKPD

**Aman (dengan label sumber):** jumlah dokumen, distribusi `status`, total baris, daftar dokumen per periode/tahun.

**Tunda / hati-hati:** KPI kinerja program, perbandingan pagu lintas PD tanpa mapping resmi, “tingkat penyerapan” jika belum ada sumber realisasi yang sama dengan pagu RKPD.

**Menyesatkan jika divisualisasikan sekarang:** chart akurasi realisasi anggaran memakai `rkpd_item.pagu` sebagai “anggaran final” tanpa jembatan ke DPA/BKU.

---

## 6. Batas aman Sprint 3 — Renja

**Aman:** status dokumen Renja v2, jumlah item, keberadaan `rkpd_dokumen_id`, jumlah baris ter-map di `renja_rkpd_item_map`.

**Tunda:** metrik “sinkron SIPD”, evaluasi capaian kinerja, perbandingan otomatis Renja vs realisasi fisik.

**Menyesatkan:** dashboard yang menggabungkan `renja_item.pagu` dengan `dpa.anggaran` dalam satu graf tanpa menjelaskan rantai `renja_dokumen` → `legacy_renja_id` → `rka` → `dpa`.

---

## 7. Risiko jika Sprint 3 dimulai sekarang

- **Data derivasi** masih bergantung pada kelengkapan cascading dan mapping PD↔OPD.
- **Dua jalur Renja** (v2 vs legacy) membuat interpretasi “pagu” ambigu tanpa filter sumber.
- **RKPD/Renja** memakai teks hierarki — risiko duplikasi label dan pagu tidak selaras dengan master.
- **Realisasi** di `dpa.realisasi` adalah cross-check, bukan sumber utama (komentar model) — tidak cocok untuk KPI keuangan resmi tanpa BKU.

---

*Diperbarui bersama implementasi idempotency DPA (Sprint 2.7).*

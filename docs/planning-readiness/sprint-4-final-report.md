# Sprint 4 — Laporan akhir: verifikasi, dokumen regulasi, perubahan, cascading

## 1. Root repo aktif

Branch **`main`**, working tree mengikuti kondisi pengembangan terakhir (banyak perubahan paralel).

---

## 2. Verifikasi dashboard RKPD

| Aspek | Hasil |
|--------|--------|
| Endpoint utama | `GET /api/rkpd/dashboard-v2` (+ query `tahun`, `periode_id`) |
| Kontrak data | Respons memuat `domain: planning_v2`, `summary`, `dokumen[]`, `meta.catatan` |
| Filter | Query string diteruskan dari UI (tahun & periode dari picker / `usePeriodeAktif`) |
| Panel tidak misleading | Disclaimer rantai penuh; accordion **legacy** terpisah & berlabel |
| v2 vs legacy | Kartu atas = `rkpd_dokumen`/`rkpd_item`; tabel lama = modul legacy di accordion |

---

## 3. Verifikasi dashboard Renja

| Aspek | Hasil |
|--------|--------|
| Endpoint | `GET /api/renja/dashboard-v2` |
| Kontrak | `domain: planning_v2`, `summary`, `dokumen[]`, `legacy_bridge.catatan` |
| Filter | `tahun`, `periode_id` (opsional `perangkat_daerah_id` di backend; UI belum ekspos) |
| Tidak misleading | Disclaimer di card atas; **`legacy_renja_id`** sebagai badge terpisah |
| Legacy | Accordion `ListRenjaOPD` jelas bertanda tabel lama |

---

## 4. Struktur dokumen RKPD (regulasi / kebutuhan)

| Bagian | Keterangan |
|--------|------------|
| Identitas | Judul dokumen, versi, status (`draft`/`review`/`final`), tanggal pengesahan (opsional) |
| Periode / tahun | `periode_id` → `periode_rpjmds`; `tahun` dokumen |
| Hierarki per baris | Program, kegiatan, sub kegiatan, indikator, target, satuan |
| Pagu | `rkpd_item.pagu` (perencanaan; bukan APBD final tanpa validasi) |
| Tujuan/sasaran RPJMD | Bisa di-link ke domain RPJMD via cascading/derivasi; **baris RKPD v2** saat ini menyimpan teks pada item |

---

## 5. Struktur dokumen Renja

| Bagian | Keterangan |
|--------|------------|
| Identitas | Judul, versi, status, PD (`perangkat_daerah_id` + nama) |
| Periode / tahun | `periode_id`, `tahun` |
| Referensi | `rkpd_dokumen_id`, `renstra_pd_dokumen_id` |
| Hierarki per baris | Program, kegiatan, sub kegiatan, indikator, target, pagu |
| Legacy | `legacy_renja_id` — jembatan RKA/DPA, **bukan** sumber pagu Renja v2 |

---

## 6. Mapping tabel → dokumen RKPD

| Bagian dokumen | Tabel | Field utama |
|----------------|--------|-------------|
| Header | `rkpd_dokumen` | `judul`, `tahun`, `periode_id`, `status`, `versi`, `tanggal_pengesahan` |
| Periode teks | `periode_rpjmds` | `nama`, `tahun_awal`, `tahun_akhir` |
| Baris | `rkpd_item` | `program`, `kegiatan`, `sub_kegiatan`, `indikator`, `target`, `satuan`, `pagu`, `urutan` |
| Derivasi | `derivation_key` pada dokumen jika dari mesin derivasi | |

---

## 7. Mapping tabel → dokumen Renja

| Bagian dokumen | Tabel | Field utama |
|----------------|--------|-------------|
| Header | `renja_dokumen` | `judul`, `tahun`, `periode_id`, `status`, `perangkat_daerah_id`, `rkpd_dokumen_id`, `renstra_pd_dokumen_id`, `legacy_renja_id` |
| PD | `perangkat_daerah` | `nama` |
| Baris | `renja_item` | sama seperti RKPD per baris |
| Mapping RKPD | `renja_rkpd_item_map` | `renja_item_id` ↔ `rkpd_item_id` |

---

## 8. Desain API generate RKPD (implementasi)

| Endpoint | Metode | Perilaku |
|----------|--------|----------|
| `/api/rkpd/dokumen/:id/generate-docx` | POST | `id` = **`rkpd_dokumen.id`** (bukan baris legacy). Query `include_diff=1` → baca `planning_line_item_change_log` untuk `rkpd_item` → kolom lama/baru jika ada log |
| `/api/rkpd/dokumen/:id/generate-pdf` | POST | PDF ringkas (pdfkit), teks per baris |

**Catatan path:** `POST /api/rkpd/:id/generate-docx` **tidak** dipakai agar tidak bentrok dengan `GET /api/rkpd/:id` (legacy). Gunakan **`/dokumen/:id/...`**.

**Sumber data:** `rkpd_dokumen` + join `periode` + `rkpd_item`.  
**Template:** HTML string → **`html-to-docx`** (dinamis per field; bisa diganti template Word resmi).  
**Render:** `buildRkpdHtml` → DOCX; PDF dari `PDFDocument` (pdfkit).

---

## 9. Desain API generate Renja (implementasi)

| Endpoint | Metode |
|----------|--------|
| `/api/renja/dokumen/:id/generate-docx` | POST |
| `/api/renja/dokumen/:id/generate-pdf` | POST |

`id` = **`renja_dokumen.id`**. Menyertakan `legacy_renja_id` sebagai **label** di header DOCX, bukan metrik pagu.

---

## 10. Desain skema perubahan RKPD

| Mekanisme | Penjelasan |
|------------|------------|
| **Tabel** | `planning_line_item_change_log` |
| **Kolom** | `entity_type` (`rkpd_item`), `entity_id`, `field_key`, `old_value`, `new_value`, `source` (`user`), `change_batch_id`, `user_id`, `created_at` |
| **Versi dokumen** | `rkpd_dokumen.versi` — bisa dinaikkan manual/aturan bisnis (belum otomatis di Sprint 4) |
| **Audit global** | `activity_logs` (sudah ada) untuk operasi umum |

**Trigger:** pada `PUT /api/rkpd/item/:id`, transaksi DB mencatat perubahan field ter-track (`rkpdRenjaCascadeService.logRkpdItemFieldChanges`).

---

## 11. Desain skema perubahan Renja

| Mekanisme | Penjelasan |
|------------|------------|
| **Tabel sama** | `planning_line_item_change_log` dengan `entity_type = renja_item` |
| **Sumber cascade** | `source = cascade_rkpd` saat Renja diperbarui dari RKPD |

**Edit langsung Renja** (PUT item Renja) belum ditambahkan log field-level di Sprint 4 — bisa mengikuti pola yang sama dengan RKPD.

---

## 12. Desain before vs after

| Aturan | Implementasi |
|--------|--------------|
| Ada riwayat | `include_diff=1` → baca log terbaru per `(entity_id, field_key)` → tabel DOCX dengan kolom Target/Pagu lama & baru |
| Tidak ada | Tanpa `include_diff` atau tanpa baris log → **tabel normal** (7 kolom) |

---

## 13. Desain cascading RKPD → Renja (kritis)

| Aspek | Keputusan |
|--------|-----------|
| **Mekanisme** | **Service** (`rkpdRenjaCascadeService.cascadeRkpdItemToLinkedRenja`) dipanggil dari **`planningRkpdDokumenController.updateItem`** dalam **satu transaksi** dengan update RKPD |
| **Bukan** trigger DB | Portabilitas & kontrol aplikasi |
| **Bukan** job async | Konsistensi langsung; job bisa ditambah untuk beban besar |
| **Mapping** | `renja_rkpd_item_map` → `rkpd_item_id` → update `renja_item` (program, kegiatan, sub_kegiatan, indikator, target, pagu) |
| **Override** | **Langsung** dalam transaksi yang sama (tanpa konfirmasi terpisah). Konfirmasi bisa ditambah di layer UI/API jika kebijakan menghendaki |
| **Konsistensi** | Satu transaksi: log RKPD → cascade Renja → log Renja (`cascade_rkpd`) → commit; rollback jika gagal |

---

## 14. Contoh alur perubahan RKPD → Renja → dokumen

1. User mengubah `PUT /api/rkpd/item/:id` (mis. `pagu`, `target`).  
2. Sistem menyimpan `rkpd_item`, menulis log **user** pada `planning_line_item_change_log`.  
3. Service mencari `renja_rkpd_item_map` untuk `rkpd_item_id`, memperbarui `renja_item` yang terhubung, menulis log `source=cascade_rkpd`.  
4. `POST /api/rkpd/dokumen/:rkpdId/generate-docx?include_diff=1` menghasilkan DOCX dengan kolom lama/baru jika log ada.  
5. `POST /api/renja/dokumen/:renjaId/generate-docx` memuat baris Renja yang sudah sinkron (cascade).

---

## 15. Gap sistem yang masih ada

- **Konfirmasi** sebelum cascade (policy gate).  
- **Versi dokumen** otomatis naik saat perubahan material.  
- **Log Renja** untuk edit manual `PUT /renja/item/:id` (struktur siap).  
- **Template Word** resmi pemda (Permendagri / PERKADA) — saat ini HTML generik.  
- **Renja DOCX** mode before/after penuh (saat ini tabel normal; log cascade sudah tersimpan untuk audit).  
- **Beban performa** N+1 pada dashboard agregasi (bisa dioptimasi query).

---

## 16. Rekomendasi pengembangan berikutnya

1. **Gate approval** untuk perubahan pagu besar sebelum cascade.  
2. **Webhook / notifikasi** ke penyusun Renja saat RKPD berubah.  
3. **Template DOCX** berasal file `.docx` dengan placeholder (docxtemplater).  
4. **Endpoint** `GET /api/rkpd/dokumen/:id/change-log` untuk UI diff.  
5. **Uji beban** transaksi cascade dengan banyak map.

---

## Ringkasan file implementasi Sprint 4

- Migrasi: `backend/migrations/20260412120000-planning-line-item-change-log.js`  
- Model: `backend/models/planningLineItemChangeLogModel.js`  
- Service: `backend/services/rkpdRenjaCascadeService.js`, `backend/services/planningDocumentExportService.js`  
- Controller: `backend/controllers/planningDocumentExportController.js`  
- Ubah: `backend/controllers/planningRkpdDokumenController.js` (`updateItem` transaksi + cascade + log)  
- Rute: `planningRkpdDokumenRoutes.js`, `planningRenjaDokumenRoutes.js` (generate docx/pdf)

---

*Dokumen ini melengkapi output Sprint 4 yang disetujui.*

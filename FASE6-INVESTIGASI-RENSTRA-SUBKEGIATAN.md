# Fase 6 — Investigasi `renstra_tabel_subkegiatan` Kosong (lanjutan temuan Fase 4)

**Sifat:** Investigasi murni. **Tidak ada data/kode yang diubah.**
**Kesimpulan singkat (detail di §5-6):** **Bukan salah satu dari dua pilihan di pertanyaan Anda secara murni** — form input **SUDAH ADA dan LIVE** (bukan dead code, bukan "belum pernah dibuat"), jadi bagian "isi data" itu benar. Tapi ditemukan **bug kode terpisah** di `lakipRealisasiAnggaranSyncService.js` yang membuat sync akan **tetap gagal 100%** meski tabelnya diisi penuh — jadi ini "isi data" **DITAMBAH** "perbaiki 1 bug kode", bukan isi data saja.

---

## 1. Struktur tabel `renstra_tabel_subkegiatan`

Model: `backend/models/renstra_tabelSubKegiatanModel.js`. Migrasi terakhir: `20250905094909-create-renstra-tabel-subkegiatan.js` (ada beberapa migrasi lama di `migrations/backup/` — tabel ini sempat di-drop & dibuat ulang sekali sebelumnya, riwayat cukup panjang tapi bukan tanda dead code, cuma iterasi normal khas repo ini per `CLAUDE.md`).

**Relasi (FK, via `associate()`):**
| Kolom | FK ke | Keterangan |
|---|---|---|
| `program_id` | `RenstraProgram.id` | wajib (`allowNull: false`) |
| `kegiatan_id` | `RenstraKegiatan.id` | wajib (`allowNull: false`) |
| `sub_kegiatan_id` / `subkegiatan_id` | `RenstraSubkegiatan.id` (master referensi) | `subkegiatan_id` wajib, `sub_kegiatan_id` opsional (2 kolom mirip — kemungkinan sisa evolusi skema, bukan disengaja) |
| `renstra_id` / `renstra_opd_id` | `RenstraOPD.id` | 2 kolom yang merujuk entitas sama (opsional keduanya) |
| `indikator_id` | `IndikatorRenstra.id` | opsional secara skema, tapi **divalidasi wajib oleh controller** (lihat §2) |
| `kebijakan_id`, `strategi_id` | (tidak ada `belongsTo` eksplisit di model, kolom ada tapi tidak dipakai relasi) | opsional |

**Kolom data (per baris = 1 Sub Kegiatan Renstra):**
- Metadata: `kode_subkegiatan`, `nama_subkegiatan`, `sub_bidang_penanggung_jawab`, `lokasi`, `indikator_manual`, `baseline`, `satuan_target`.
- **Rencana (manual)**: `target_tahun_1..6` (FLOAT), `pagu_tahun_1..6` (DECIMAL 20,2), `target_akhir_renstra`, `pagu_akhir_renstra`.
- **Realisasi (auto)**: `realisasi_tahun_1..6`, `realisasi_akhir_renstra`, `realisasi_synced_at` — **komentar eksplisit di kode model (baris 76)**: *"Realisasi anggaran (Rp) — hasil sync dari Penatausahaan, bukan diisi manual."*
- Workflow: `versi`, `status_revisi` (enum `draft/verifikasi/approved/ditolak`), `last_revised_at/by`.

Ini adalah tabel matriks target+pagu multi-tahun per Sub Kegiatan — mirip format cascading T-C.27 khas Permendagri 86/2017, level paling rinci di hierarki Renstra (Tujuan→Sasaran→Program→Kegiatan→**Sub Kegiatan**).

---

## 2. Cara pengisian — form ADA dan LIVE (bukan dead code)

Ditemukan set lengkap CRUD di frontend, **dirouting aktif**:

| File | Fungsi |
|---|---|
| `frontend/src/features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanListPage.jsx` | List + Export |
| `.../RenstraTabelSubKegiatanAddPage.jsx` | Tambah baru |
| `.../RenstraTabelSubKegiatanEditPage.jsx` | Edit |
| `.../RenstraTabelSubKegiatanHistoryPage.jsx` | Riwayat revisi |
| `.../components/RenstraTabelSubKegiatanForm.jsx` | Form-nya sendiri |

**Dikonfirmasi live** (bukan seperti `LakipListPage.jsx` di Fase 4 yang dead): terdaftar di `frontend/src/routes/renstraRoutes.jsx` (baris 398-414, komentar `// Input Tabel Renstra Sub Kegiatan`) dengan path `renstra/tabel/subkegiatan` (+ `/add`, `/edit/:id`, `/history/:id`), dan `renstraRoutes` **di-spread langsung** ke `<Routes>` `App.jsx` (baris 647: `...renstraRoutes`) — sama seperti pola live route lain yang sudah diverifikasi di Fase 2-3 (mis. `dashboard-lakip`).

**Form-nya lengkap** — dicek field-nya (bukan cuma judul halaman): `target_tahun_1..6`, `pagu_tahun_1..6`, `kode_subkegiatan`, `nama_subkegiatan`, dan **dropdown `indikator_id`** (wajib, tervalidasi Yup + validasi ulang server-side di `renstra_tabelSubKegiatanController.js`: *"indikator_id tidak valid. Harus ID indikator_renstra stage sub_kegiatan"*, dicek di 3 titik: create/update/lainnya).

**Prasyarat data untuk form ini juga sudah ada** (dicek, bukan diasumsikan): tabel master `renstra_subkegiatan` (referensi nama sub kegiatan) berisi 83 baris, `renstra_kegiatan`/`renstra_program` untuk `renstra_id=1` (Renstra aktif OPD ini) masing-masing 16 dan 17 baris. **Tidak ada blocker struktural** — dropdown-dropdown di form akan terisi normal kalau dibuka.

**Export Excel** ada tombolnya di UI tapi endpoint backend-nya (`exports.exportExcel`) mengembalikan pesan *"Export Excel Sub Kegiatan belum diimplementasikan"* — stub, di luar topik utama, tidak menghalangi pengisian data (Add/Edit tetap berfungsi). Tidak ditemukan fitur **import** (dari Excel/SIPD/e-planning) sama sekali untuk tabel ini — satu-satunya jalur masuk data adalah form manual per baris.

**Kesimpulan Q2: form SUDAH ADA, LIVE, lengkap fungsional (bukan dead code, bukan belum-pernah-dibuat).** Kosongnya tabel = murni belum ada yang mengisi datanya untuk Renstra OPD ini, bukan karena fitur input-nya tidak tersedia.

---

## 3. Sumber data — manual, dikonfirmasi dari 3 sisi berbeda

Tidak ambigu — tiga bukti independen semuanya konsisten:
1. **Komentar di model** (§1): realisasi = auto-sync, **implikasinya pagu/target BUKAN auto-sync** (kalau semua kolom auto, komentar tidak perlu membedakan).
2. **Bentuk form**: input angka manual per tahun (`target_tahun_1..6`, `pagu_tahun_1..6`), bukan file uploader/importer.
3. **Tidak ada endpoint import** ditemukan di controller manapun untuk tabel ini.

`target_tahun_N`/`pagu_tahun_N` **seharusnya diinput manual oleh admin/operator Renstra**, disalin dari dokumen Renstra resmi OPD (rincian rencana per Sub Kegiatan 5-6 tahun ke depan) — bukan diimpor dari sistem lain.

---

## 4. Dampak kalau tabel ini diisi — TIDAK CUKUP, ada bug kode terpisah

Ditelusuri ulang rantai `lakipRealisasiAnggaranSyncService.js` sampai akar-akarnya (bukan cuma baca kode, tapi dicek nyata ke data):

```
Lakip.indikator_kinerja (teks)
  → cari di IndikatorRenstra WHERE stage = 'sub_kegiatan', cocokkan nama_indikator
  → RenstraTabelSubkegiatan.findOne({ where: { indikator_id } })
  → baca pagu_tahun_N / realisasi_tahun_N
```

**Ditemukan: `lakip.indikator_kinerja` TIDAK PERNAH bisa cocok dengan `IndikatorRenstra` stage `sub_kegiatan`**, karena sumbernya beda level hierarki sama sekali. Dicek `services/lakipAutoGenerateService.js` (fungsi `generateLakipDariRenstraTahun`, yang mengisi tabel `lakip`, dipanggil dari tombol "Sinkron BAB II dari Renstra" yang sama seperti di Fase 4):

```js
// lakipAutoGenerateService.js baris 44
where: { renstra_id: renstraAktif.id, stage: 'kegiatan' },   // <-- level KEGIATAN
```

Jadi `lakip.indikator_kinerja` selalu berisi nama indikator level **Kegiatan**, sedangkan `lakipRealisasiAnggaranSyncService.js` mencarinya di daftar indikator level **Sub Kegiatan**. Dibuktikan empiris, bukan cuma baca kode — dicek overlap nama antara kedua level untuk `renstra_id=1`:
```sql
SELECT COUNT(*) FROM indikator_renstra a
  INNER JOIN indikator_renstra b ON a.nama_indikator = b.nama_indikator
  WHERE a.renstra_id=1 AND a.stage='kegiatan' AND b.renstra_id=1 AND b.stage='sub_kegiatan';
-- hasil: 0
```
**Nol.** Contoh konkret (renstra_id=1): stage `kegiatan` berisi nama seperti *"Persentase Implementasi Perencanaan Dan Evaluasi Kinerja Perangkat Daerah"*; stage `sub_kegiatan` berisi nama seperti *"Jumlah Dokumen Perencanaan Perangkat Daerah"* — dua level penamaan yang gaya & isinya memang berbeda total, bukan cuma variasi kecil. **Text-matching di titik ini dijamin gagal, terlepas dari isi `renstra_tabel_subkegiatan`.**

**Jawaban Q4: TIDAK, mengisi tabel saja TIDAK CUKUP.** Ada bug independen di `lakipRealisasiAnggaranSyncService.js` (atau bisa dibilang: desainnya salah asumsi soal level granularitas) yang harus diperbaiki juga, terpisah dari soal isi-data.

### Petunjuk arah perbaikan yang benar (ditemukan, bukan cuma dugaan)

Ditemukan bahwa pola yang BENAR untuk kasus ini **sudah ada dan sudah dipakai** di service lain dalam commit yang sama (`7cc31216`, temuan Fase 4): `renstraRealisasiAnggaranSyncService.js`, fungsi `syncKegiatanRealisasi({ kegiatan_id })` (baris 103-114):
```js
const subs = await RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id }, transaction });
const realisasi = sumRealisasi(subs);   // AGREGAT (SUM) semua Sub Kegiatan di bawah 1 Kegiatan
await upsertRealisasiCache({ renstra_id, stage: "kegiatan", ref_id: kegiatan.id, realisasi, transaction });
```
Fungsi ini **sudah** menangani soal "1 Kegiatan bisa punya banyak Sub Kegiatan" dengan benar: cari langsung via `kegiatan_id` (bukan lewat teks nama indikator sub-kegiatan), lalu **jumlahkan (SUM)** semua Sub Kegiatan di bawahnya, hasilnya disimpan ke tabel `renstra_pagu_cache` dengan `stage: "kegiatan"` — persis level granularitas yang dibutuhkan `lakip` (yang juga per-Kegiatan, bukan per-Sub-Kegiatan). **Tabel `renstra_pagu_cache` ini sendiri juga 0 baris saat ini** (dicek — konsisten, sama-sama menunggu `renstra_tabel_subkegiatan` diisi & `renstraRealisasiAnggaranSyncService.js` dijalankan), tapi strukturnya **sudah benar secara desain** — beda dengan `lakipRealisasiAnggaranSyncService.js` yang levelnya salah dari awal.

Implikasinya: perbaikan yang tepat untuk `lakipRealisasiAnggaranSyncService.js` kemungkinan besar **bukan** "ganti `stage: 'sub_kegiatan'` jadi `stage: 'kegiatan'` di query `IndikatorRenstra`" (itu cuma menggeser masalah — `RenstraTabelSubkegiatan.findOne({where:{indikator_id}})` tetap butuh `indikator_id` di grain Sub Kegiatan, bukan Kegiatan), melainkan **rombak alur pencariannya**: `lakip.indikator_kinerja` → cocokkan ke `IndikatorRenstra` stage `kegiatan` → dapat `ref_id` (= `RenstraKegiatan.id`) → baca `renstra_pagu_cache` stage `kegiatan` (hasil `renstraRealisasiAnggaranSyncService.js`, sudah teragregasi dengan benar) — bukan baca `RenstraTabelSubkegiatan` langsung sama sekali. Ini **investigasi tambahan yang saya temukan di luar 5 pertanyaan Anda**, dicatat di sini karena relevan menjawab Q4 secara jujur — bukan rekomendasi implementasi (di luar scope Fase 6, murni investigasi).

---

## 5. Effort — bukan "bangun fitur baru" untuk form-nya

Karena form CRUD **sudah ada dan live** (§2), pertanyaan "berapa besar effort bikin form baru" **tidak relevan** — tidak perlu dibangun dari nol. Yang tersisa 2 pekerjaan terpisah, kalau nanti diputuskan untuk benar-benar dikerjakan:

| Pekerjaan | Sifat | Estimasi | Bagian dari scope apa |
|---|---|---|---|
| **Isi data `renstra_tabel_subkegiatan`** (83 Sub Kegiatan × 6 tahun target+pagu, untuk Renstra 2025-2029 OPD aktif) | Data entry manual, bukan development | 🟡 Effort **operasional**, bukan effort coding — jumlahnya besar (83 baris × banyak field), tapi ini pekerjaan admin/operator Renstra, bukan tugas development. Sudah **bagian dari scope modul Renstra yang sudah ada** (form-nya sudah dibangun & dirouting, bukan proyek baru) | Modul Renstra (existing), bukan LAKIP |
| **Perbaiki bug grain-mismatch di `lakipRealisasiAnggaranSyncService.js`** (§4) | Perbaikan kode | 🟢 **Kecil-sedang** — scope-nya sempit (1 file, fungsi tunggal `syncRealisasiAnggaranLakipTahun`), tapi butuh keputusan desain dulu (baca dari `renstra_pagu_cache` stage kegiatan vs pendekatan lain) sebelum nulis kode, dan wajib re-test dengan data nyata setelah `renstra_tabel_subkegiatan`+`renstraRealisasiAnggaranSyncService.js` juga sudah berjalan (butuh 2 sync berantai untuk bisa diuji end-to-end) | Modul LAKIP — tapi **di luar scope proyek audit sistematika dokumen** (Fase 1-5) karena ini soal kualitas data di jalur yang sudah dikonfirmasi Fase 4 **TIDAK dipakai render dokumen resmi** |

**Tidak ada proyek baru yang perlu dibuat.** Semua infrastruktur (form, model, migrasi, service pola yang benar sebagai referensi) sudah ada di dalam scope modul Renstra yang sudah dibangun sebelumnya.

---

## 6. Kesimpulan akhir — jawaban langsung ke pertanyaan Anda

**Bukan "isi data sederhana" murni, dan bukan "bangun fitur baru" sama sekali.** Klasifikasi paling akurat: **"isi data" (form sudah ada, live, siap pakai) + "perbaiki 1 bug kode independen"** (grain mismatch di `lakipRealisasiAnggaranSyncService.js`, ditemukan lewat investigasi ini, bukan cuma dugaan). Mengisi data saja, tanpa perbaikan kode itu, **tidak akan membuat `lakipRealisasiAnggaranSyncService.js` mulai berhasil** — sync-nya akan tetap 100% `skipped` sampai bug grain-mismatch itu diperbaiki juga.

Ini konsisten dengan rekomendasi Fase 4b: kolom `lakip.pagu_anggaran`/`realisasi_anggaran` tetap **tidak direkomendasikan** jadi sumber render dokumen resmi (jalur `dpa`+`penatausahaan` langsung yang sudah dipakai `buildHtml()` sekarang tetap yang paling akurat & teruji) — investigasi Fase 6 ini murni untuk melengkapi pemahaman "kalau suatu saat mau diperbaiki juga", sesuai rekomendasi poin 1-3 di `FASE4B-DOKUMENTASI-KNOWN-ISSUE.md`.

---

## File yang dibaca (investigasi murni, tidak ada yang diubah)

- `backend/models/renstra_tabelSubKegiatanModel.js`, `backend/migrations/20250905094909-create-renstra-tabel-subkegiatan.js`
- `backend/controllers/renstra_tabelSubKegiatanController.js`
- `backend/services/lakipRealisasiAnggaranSyncService.js`, `backend/services/renstraRealisasiAnggaranSyncService.js`
- `backend/services/lakipAutoGenerateService.js`
- `frontend/src/features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm.jsx` + 4 halaman terkait
- `frontend/src/routes/renstraRoutes.jsx`, `frontend/src/App.jsx` (verifikasi routing live)
- Query read-only ke `renstra_subkegiatan`, `renstra_kegiatan`, `renstra_program`, `indikator_renstra`, `renstra_pagu_cache` (tidak ada `UPDATE`/`INSERT`, tidak ada fungsi sync yang benar-benar dijalankan)

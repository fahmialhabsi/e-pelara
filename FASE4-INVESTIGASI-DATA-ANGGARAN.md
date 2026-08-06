# Fase 4 — Investigasi Temuan #9: `lakip.pagu_anggaran`/`realisasi_anggaran`

**Sifat:** Investigasi murni, **tidak ada kode yang diubah**.
**Ringkasan kesimpulan (lihat §5 untuk detail):** **(c)** — kolom sync ini berisiko jadi sumber kebingungan/bug di masa depan. Bukan (a) murni aman diabaikan (ada 1 konsumen live di modul MR yang membacanya), dan jelas bukan (b) — datanya justru SELALU KOSONG (Rp 0) untuk seluruh data yang dipakai verifikasi Fase 1-3, sementara query langsung `dpa`+`penatausahaan` yang sudah dipakai `buildHtml()` sekarang jauh lebih akurat & lengkap.

---

## 1. Kapan `lakipRealisasiAnggaranSyncService.js` dijalankan? Siapa yang memanggilnya?

**Tidak ada cron/scheduled job.** `node-cron` memang dependency di `package.json` tapi tidak dipakai di mana pun (konsisten dengan catatan `CLAUDE.md`) — dicek langsung, tidak ada referensi `syncRealisasiAnggaranLakipTahun` di scheduler/cron manapun.

Dua jalur HTTP manual-trigger ditemukan:

| # | Endpoint | Controller | Trigger UI | Status UI |
|---|---|---|---|---|
| 1 | `POST /api/lakip/sync-renstra/:tahun` | `lakipController.syncFromRenstra` (memanggil `syncRealisasiAnggaranLakipTahun` DAN `generateLakipDariRenstraTahun` sekaligus) | Tombol **"Sinkron BAB II dari Renstra"** di `LakipGeneratorPanel.jsx` | ✅ **LIVE** — halaman ini dirender via route `/dashboard-lakip` di `App.jsx` (baris 565-573), tombol ada persis di sebelah "Load Data"/"Preview LAKIP" yang sudah dipakai sepanjang Fase 1-3 |
| 2 | `POST /api/lakip-realisasi-anggaran/sync` | `lakipRealisasiAnggaranController.sync` | Tombol di `LakipListPage.jsx` (via `lakipApi.js` → `syncRealisasiAnggaranLakip`) | ❌ **DEAD** — `LakipListPage` tidak ditemukan sama sekali di `App.jsx` (dicek grep menyeluruh), konsisten dengan temuan `AUDIT-LAKIP-SISTEMATIKA.md` Tahap 1 yang sudah menandainya "legacy/kode mati" |

**Bukti langsung bahwa fungsi ini efektif TIDAK PERNAH berhasil mengisi data untuk tahun 2025** (dataset yang sama dipakai verifikasi Fase 1-3): kolom `realisasi_anggaran_synced_at` — yang HANYA diisi `row.update(...)` di dalam fungsi sync kalau baris berhasil dicocokkan — **`NULL` di ke-97 baris `lakip` tahun 2025, tanpa kecuali.** Baik lewat jalur 1 (live tapi mungkin belum pernah diklik untuk data ini) maupun jalur 2 (dead), efeknya sama: tidak ada baris yang pernah berhasil ter-update.

---

## 2. Perbandingan nilai: kolom sync vs agregat langsung `dpa`+`penatausahaan`

**Data DB yang sama dipakai verifikasi Fase 1-3 (tahun=2025, periode_id=2, Dinas Ketahanan Pangan, renstra_id=1).**

### Kolom sync (`lakip.pagu_anggaran`/`realisasi_anggaran`)
```sql
SELECT COUNT(*) total, SUM(pagu_anggaran IS NOT NULL) has_pagu,
       SUM(realisasi_anggaran_synced_at IS NOT NULL) has_synced_at
FROM lakip WHERE tahun='2025';
-- total: 97, has_pagu: 97 (tapi SEMUA bernilai "0.00"), has_synced_at: 0
```
**Semua 97 baris `pagu_anggaran` = `0.00` dan `realisasi_anggaran` = `0.00`** — bukan `NULL`, tapi literal nol. Ini bukan hasil perhitungan sync yang kebetulan nol; ini `defaultValue: 0` dari definisi kolom di `lakipModel.js` (baris 55-56), yang otomatis terisi saat baris `lakip` dibuat oleh `generateLakipDariRenstraTahun`, dan **tidak pernah ditimpa** karena sync-nya tidak pernah berhasil jalan (lihat §1 dan akar masalah di bawah).

### Agregat langsung `dpa`+`penatausahaan` (yang dipakai `buildHtml()` sekarang, Bab III & Lampiran 2)

Level OPD (dipakai Bab III bagian C, Ringkasan Eksekutif): **Pagu Rp 24.999.760.561, Realisasi Rp 24.300.904.925,96 (97%)**.

Level per-Kegiatan (dipakai Analisis Efisiensi Bab III bagian D, query `anggaranPerKegiatanRows` dari Fase 2) — 3 contoh konkret:

| Kegiatan | `lakip.pagu_anggaran` / `realisasi_anggaran` (sync) | Agregat langsung `dpa`+`penatausahaan` | Selisih |
|---|---|---|---|
| Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah | Rp 0 / Rp 0 | Rp 392.651.500 / Rp 392.239.750 (99,9%) | **100% — seluruh Rp 392,6 juta pagu tidak tercermin** |
| Administrasi Keuangan Perangkat Daerah | Rp 0 / Rp 0 | Rp 8.629.144.795 / Rp 8.480.885.447 (98,3%) | **100% — seluruh Rp 8,6 miliar pagu tidak tercermin** |
| Penyediaan Infrastruktur dan Seluruh Pendukung Kemandirian Pangan... | Rp 0 / Rp 0 | Rp 3.357.808.000 / Rp 3.340.533.410,35 (99,5%) | **100% — seluruh Rp 3,36 miliar pagu tidak tercermin** |

**Kesimpulan: BEDA TOTAL, bukan beda kecil/rounding.** Kolom sync 0% terisi (semua nol), agregat langsung 100% terisi dengan angka riil miliaran Rupiah.

### Kenapa bisa beda — akar masalah, bukan cuma "belum sempat sync"

Ditelusuri rantai `syncRealisasiAnggaranLakipTahun()`: `Lakip.indikator_kinerja` (cocok teks) → `IndikatorRenstra` (`stage='sub_kegiatan'`) → **`RenstraTabelSubkegiatan.findOne({ where: { indikator_id: ir.id } })`** → baca `pagu_tahun_N`/`realisasi_tahun_N` dari situ.

Dicek langsung: **tabel `renstra_tabel_subkegiatan` berisi 0 (NOL) baris di seluruh database ini**, untuk `renstra_id` mana pun, bukan cuma untuk OPD ini. Artinya `RenstraTabelSubkegiatan.findOne(...)` **selalu** mengembalikan `null` untuk baris `lakip` mana pun, membuat kode masuk cabang `skipped++` tanpa kecuali. Ini BUKAN "belum sempat dijalankan sejak update terakhir" — **secara struktural, sync ini dijamin menghasilkan 0 baris ter-update selama `renstra_tabel_subkegiatan` kosong**, terlepas berapa kali atau kapan pun fungsinya dipanggil.

`renstra_tabel_subkegiatan` sendiri adalah tabel entri manual milik modul Renstra (CRUD lengkap di `renstra_tabelSubKegiatanController.js`, ~1500 baris, dipakai juga oleh modul MR & Pengkeg) — untuk Renstra 2025-2029 OPD ini, tabel target/pagu per Sub Kegiatan itu memang belum pernah diisi. Jadi ini juga soal **granularitas & ketergantungan data**: rantai sync butuh 3 lapis (Penatausahaan → `RenstraTabelSubkegiatan` via `renstraRealisasiAnggaranSyncService.js` yang TERPISAH → `Lakip` via service yang sedang diinvestigasi ini), dengan lapisan tengah bergantung pada entri manual yang belum terjadi. Sedangkan agregat langsung `buildHtml()` cuma 1 lapis: `dpa`+`penatausahaan` langsung, tanpa data antara yang bisa "belum diisi".

---

## 3. Riwayat git — dibangun sengaja untuk tujuan lain, atau sisa refactor?

**Jawaban: keduanya sekaligus — dibangun sengaja, TAPI untuk 2 tujuan paralel yang tidak pernah disatukan.**

File **tercatat di git** (bukan uncommitted, beda dari beberapa file lain yang saya temukan di sesi-sesi sebelumnya) — 1 commit, `7cc31216`, `2026-07-22`, oleh `fahmialhabsi` (Co-Authored-By Claude):

```
feat(realisasi-anggaran): alirkan realisasi anggaran Penatausahaan ke Renstra & LAKIP

Renstra: sync realisasi_tahun_1..6 per sub kegiatan dari Penatausahaan (via
kode_sub_kegiatan), rollup berjenjang ke seluruh hierarki lewat renstra_pagu_cache.

LAKIP: tambah kolom pagu_anggaran/realisasi_anggaran, sync dari data Renstra yang
sudah tersinkron; generator LAKIP (BAB I) kini hanya menampilkan Tujuan/Sasaran/
Program/Kegiatan/Indikator milik OPD aktif (bukan seluruh OPD), disusun nested
Tujuan->Sasaran->Program->Kegiatan, dan realisasi anggaran diambil dari
Penatausahaan (bukan BKU yang belum terisi). ...
```

Commit yang SAMA mengubah **22 file sekaligus**, termasuk 2 hal yang berjalan paralel tanpa pernah disatukan:

1. **Jalur sync-ke-kolom** (yang sedang diinvestigasi): `lakipRealisasiAnggaranSyncService.js` (baru, 109 baris) + `renstraRealisasiAnggaranSyncService.js` (baru, 345 baris) + 2 migrasi kolom + `lakipRealisasiAnggaranController.js`/`renstra_realisasiAnggaranController.js` (baru) + **`frontend/.../lakip/components/LakipTable.jsx` (+19 baris) dan `LakipListPage.jsx` (+30 baris)** — kolom `pagu_anggaran`/`realisasi_anggaran` ditambahkan sebagai KOLOM TABEL di `LakipTable.jsx` (dicek langsung: `dataIndex: "pagu_anggaran"`/`"realisasi_anggaran"` ada di definisi kolomnya). **Ini konsumen yang dituju dari awal** — bukan render dokumen, tapi tampilan tabel/list LAKIP.
2. **Jalur query langsung**: `lakipGeneratorController.js` (366 baris berubah, di commit YANG SAMA) — inilah titik di mana `buildHtml()`/`collectLakipData()` untuk render dokumen ditulis ulang untuk agregasi langsung `dpa`+`penatausahaan`, TIDAK membaca kolom sync yang baru ditambahkan di commit yang sama itu.

**Kesimpulan:** bukan "nama mirip tapi tujuan beda total" (tidak ada kesalahpahaman penamaan), dan bukan murni "sisa refactor lama yang lupa dihubungkan" — **dua pendekatan dibangun bersamaan, dalam commit yang sama, oleh orang (dan sesi Claude) yang sama, untuk masalah yang secara konsep sama ("realisasi anggaran di LAKIP")**, tapi keduanya sengaja/tidak sengaja dibiarkan berjalan sendiri-sendiri: satu untuk `LakipTable.jsx` (list view), satu untuk `buildHtml()` (dokumen render). Tidak pernah direkonsiliasi setelahnya. Konsumen #1 (`LakipListPage.jsx`) kemudian ternyata tidak pernah di-routing ke `App.jsx` — jadi jalur itu jadi mati di sisi frontend, sementara backend sync-nya (dan endpoint manualnya) tetap ada.

---

## 4. Konsumen lain kolom `lakip.pagu_anggaran`/`realisasi_anggaran` (di luar render PDF/DOCX)?

Dicek menyeluruh (`grep` lintas backend+frontend, disaring dari nama kolom generik yang dipakai modul lain seperti `Kegiatan`/`Program`/`Dpa`):

| Konsumen | Status | Detail |
|---|---|---|
| `LakipTable.jsx` (via `LakipListPage.jsx`) | ❌ Dead (tidak dirouting) | Kolom tabel "Pagu Anggaran"/"Realisasi Anggaran" — kalau halaman ini pernah dirouting, akan menampilkan Rp 0 untuk semua baris (lihat §2) |
| **`backend/services/mr/mrAutoFillAggregatorService.js`** (`getLakipSuggestion`/`getLakipOptions`) | ✅ **LIVE** | Dibaca langsung dari tabel `lakip` (query `db.Lakip.findAll`), diekspos lewat endpoint `GET /mr-autofill/options/lakip`, dikonsumsi dropdown **"Pilih Data LAKIP"** di `frontend/src/pages/mr/unified/steps/StepContext.jsx` (baris 604-845) — bagian dari wizard MR unified 5-step yang **live/routed** (`src/pages/mr/unified/`, dikonfirmasi via `CLAUDE.md` & memori proyek "Modul Terpadu Pengelolaan Manajemen Risiko — SELESAI TOTAL & terverifikasi") |

**Tapi ditelusuri lebih lanjut — nilai `pagu_anggaran`/`realisasi_anggaran` dari LAKIP ini efektif TIDAK DIPAKAI setelah dipilih:**
- Di `StepContext.jsx` sendiri: hanya disimpan ke state (`selectedLakipItem`) lalu di-spread ke `contextForNextStep` (baris 713) untuk diteruskan ke step berikutnya — **tidak pernah ditampilkan langsung ke user** di step ini.
- Di `StepRiskAnalysis.jsx` (step berikutnya, penerima `contextData`): field yang secara eksplisit membaca nilai anggaran/nilai terkait (`nilai_temuan`, baris 284-286) **hanya aktif untuk `jenis_sumber` yang ada di `PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER`** — yang cuma berisi `'Tindak Lanjut BPK/BPKP/Inspektorat'`. **`'Lakip'` TIDAK ada di mapping itu**, jadi untuk sumber LAKIP, ekspresi itu selalu `undefined`. Tidak ada tempat lain di kedua file yang membaca `pagu_anggaran`/`realisasi_anggaran` dengan nama field itu.

**Jadi:** konsumen live-nya ADA (fetch dari DB terjadi sungguhan, lewat endpoint yang benar-benar dipanggil user), tapi nilainya **saat ini inert** — ikut terbawa dalam data plumbing tapi tidak dirender atau dipakai hitung apa pun di titik manapun yang saya temukan. Belum ada gejala bug yang KELIHATAN oleh user hari ini, tapi datanya sudah salah/kosong menunggu di sana kalau suatu saat ada fitur baru yang mulai membacanya dengan nama field itu (polanya sudah ada, cuma belum "disambungkan" ke tampilan/kalkulasi).

---

## 5. Kesimpulan: (a), (b), atau (c)?

### Bukan (a) — bukan murni "aman diabaikan"
Ada konsumen live (§4, modul MR) yang benar-benar mem-fetch kolom ini dari DB lewat endpoint yang bisa dipanggil user. "Aman diabaikan" akan lebih akurat kalau ke-2 jalur konsumsinya sama-sama dead — kenyataannya cuma 1 dari 2 yang dead.

### Bukan (b) — jelas TIDAK "harus dipakai untuk render karena lebih akurat"
Kebalikannya: untuk seluruh data yang dipakai verifikasi Fase 1-3, kolom sync ini **selalu nol** (§2) — jauh LEBIH TIDAK akurat/lengkap dibanding agregat langsung `dpa`+`penatausahaan` yang sudah dipakai `buildHtml()` sekarang. Rekomendasi saya: **jangan pernah dipakai untuk render dokumen** dalam kondisi sekarang — kalaupun `renstra_tabel_subkegiatan` suatu saat diisi lengkap, jalur sync 3-lapis ini tetap punya risiko lebih tinggi (nama indikator harus cocok persis teks, bergantung entri manual Renstra yang terpisah dari siklus DPA/Penatausahaan) dibanding query langsung yang sudah terbukti akurat & sudah diverifikasi menyeluruh di Fase 1-3.

### **(c) — berisiko jadi sumber kebingungan/bug di masa depan**
Alasan konkret:
1. **Infrastruktur besar untuk hasil nol**: 2 service sync (109+345 baris), 2 migrasi kolom, 2 controller+route dedicated, semuanya berjalan (bisa dipanggil, tidak error) tapi **dijamin struktural menghasilkan 0 baris ter-update** selama `renstra_tabel_subkegiatan` kosong — kalau suatu saat tabel itu mulai diisi (untuk keperluan modul Renstra/MR/Pengkeg lain yang memang memakainya), sync LAKIP ini akan "tiba-tiba hidup" dan mulai mengisi kolom `lakip.pagu_anggaran` dengan data yang **granularitasnya beda** dari yang dipakai render dokumen (per Sub Kegiatan Renstra vs per Kegiatan DPA) — berpotensi dua "sumber kebenaran" anggaran LAKIP yang beda angka, membingungkan siapa pun yang membandingkan tabel `lakip` dengan dokumen PDF/DOCX yang sudah jalan.
2. **Konsumen live tapi inert** (modul MR, §4): kode sudah menyiapkan jalur "LAKIP → anggaran → MR" tapi belum benar-benar dipakai — risiko nyata kalau developer lain (atau sesi Claude berikutnya) menyambungkan `nilai_temuan`/tampilan baru ke `pagu_anggaran` dari sini tanpa tahu bahwa nilainya selalu nol untuk kondisi data saat ini.
3. **Dua "sumber kebenaran" paralel sejak commit yang sama** (§3) — bukan cacat desain yang jelas-jelas salah, tapi keputusan arsitektur yang tidak pernah didokumentasikan/direkonsiliasi, sehingga siapa pun yang baru membaca kode (termasuk saya di Fase 1) awalnya mengira ini "dead code sisa refactor" padahal sebagian jalurnya (endpoint manual + tombol UI + konsumen MR) masih hidup.

**Rekomendasi arah (bukan keputusan — saya serahkan ke Anda):** kolom `lakip.pagu_anggaran`/`realisasi_anggaran` dan servis sync-nya sebaiknya **didokumentasikan eksplisit** (komentar kode + memori proyek) sebagai "jalur terpisah untuk `LakipTable.jsx` (list view, saat ini dead) dan auto-fill MR (saat ini inert), BUKAN sumber data render dokumen LAKIP — render dokumen selalu pakai agregat langsung `dpa`+`penatausahaan`". Kalau ke depannya tidak ada rencana menghidupkan `LakipListPage.jsx` atau menyambungkan nilainya di MR, opsi lain yang lebih tegas: hapus infrastrukturnya (2 service, 2 kolom, 2 controller/route, referensi di `mrAutoFillAggregatorService.js`) — tapi itu keputusan produk yang saya tidak ambil di fase investigasi ini.

---

## File yang dibaca (investigasi murni, tidak ada yang diubah)

- `backend/services/lakipRealisasiAnggaranSyncService.js`, `backend/services/renstraRealisasiAnggaranSyncService.js`
- `backend/controllers/lakipController.js`, `lakipRealisasiAnggaranController.js`, `renstra_tabelSubKegiatanController.js`
- `backend/routes/lakipRealisasiAnggaranRoutes.js`, `server.js`
- `backend/models/lakipModel.js`
- `backend/services/mr/mrAutoFillAggregatorService.js`
- `frontend/src/features/lakip/components/LakipGeneratorPanel.jsx`, `LakipTable.jsx`, `pages/LakipListPage.jsx`, `services/lakipApi.js`
- `frontend/src/pages/mr/unified/steps/StepContext.jsx`, `StepRiskAnalysis.jsx`
- `frontend/src/App.jsx` (verifikasi routing)
- Query langsung ke tabel `lakip`, `renstra_tabel_subkegiatan`, `indikator_renstra`, `dpa`, `penatausahaan` (read-only `SELECT`, tidak ada `UPDATE`/`INSERT`/fungsi sync yang benar-benar dijalankan)
- `git log`/`git show` pada `lakipRealisasiAnggaranSyncService.js` dan commit `7cc31216`

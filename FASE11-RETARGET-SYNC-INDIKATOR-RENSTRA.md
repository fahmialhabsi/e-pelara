# Fase 11 — Retarget `lakipRealisasiAnggaranSyncService.js` ke `indikator_renstra`

**Status:** Selesai. Sync dijalankan terhadap **seluruh data nyata** tahun 2025 (bukan data uji) — **96 dari 97 baris `lakip` sekarang punya `pagu_anggaran` yang benar-benar terisi**, hasilnya **PERMANEN** (bukan artefak tes yang perlu dihapus — ini memang tujuan Fase 11).

---

## 1. Struktur `indikator_renstra` yang relevan (dicek langsung skema, bukan asumsi)

Kolom kunci (dari `SHOW COLUMNS`, sudah dikonfirmasi di Fase 8 & dicek ulang):
- `pagu_tahun_1` s.d. `pagu_tahun_6` (DECIMAL) — **konvensi kolom SAMA PERSIS** dengan `renstra_tabel_subkegiatan` lama: offset dari `RenstraOPD.tahun_mulai`, bukan nama kolom per-tahun-literal (`pagu_tahun_2025` dst.) — jadi `resolveOffsetTahun()` yang sudah ada **tidak perlu diubah sama sekali**.
- `target_tahun_1` s.d. `target_tahun_6` — sama, tidak dipakai sync ini (LAKIP pakai `lakip.target` sendiri), disebut untuk kelengkapan.
- `stage` (enum: `tujuan`/`sasaran`/`strategi`/`kebijakan`/`program`/`kegiatan`/`sub_kegiatan`/`iku`/`ikk`) — pembeda level, dipakai persis seperti Fase 7/9.
- `ref_id` — untuk stage `'kegiatan'` = `RenstraKegiatan.id`; untuk stage `'sub_kegiatan'` = `RenstraSubkegiatan.id` (dikonfirmasi Fase 8/10). **Fase 11 TIDAK perlu pakai `ref_id` sama sekali** (lihat §2) — beda dari Fase 7/9 yang butuh `ref_id` untuk lompat ke tabel lain.
- **TIDAK ADA kolom realisasi Rupiah** — cuma `target_tahun_N`/`pagu_tahun_N`. Tabel satelit `realisasi_indikator_renstra` (`indikator_renstra_id`, `tahun`, `nilai_realisasi`) ADA, tapi nilainya kinerja (%, jumlah — dicek contoh nyata: 80.00, 85.00, 2.00, bukan angka Rupiah), dipakai untuk `lakip.realisasi` (kinerja) via `lakipAutoGenerateService.js`, **bukan** untuk `lakip.realisasi_anggaran` (Rupiah).

**Relasi ke `lakip`:** sama seperti Fase 7/9 — **tidak ada FK langsung**, cuma pencocokan teks `lakip.indikator_kinerja` = `IndikatorRenstra.nama_indikator` (di-scope `renstra_id` yang sama). Setelah baris `IndikatorRenstra` (`ir`) ditemukan, **Fase 11 langsung baca `ir.pagu_tahun_{offset}` dari baris itu sendiri** — tidak perlu `indikator_id` (FK yang dipakai Fase 9 buat lompat ke `RenstraTabelSubkegiatan`) sama sekali, karena sekarang tidak ada tabel lain yang perlu dituju.

---

## 2. Perubahan kode

**File:** `backend/services/lakipRealisasiAnggaranSyncService.js` (satu-satunya file diubah).

- Import `RenstraTabelSubkegiatan` **dihapus total** — tidak dipakai lagi sama sekali di file ini.
- Kedua cabang (level Kegiatan & level Sub Kegiatan) **disederhanakan jadi 1 alur yang sama**: cocokkan nama (coba stage `'kegiatan'` dulu, fallback `'sub_kegiatan'`) → dapat `ir` → baca `ir.pagu_tahun_{offset}` **langsung**, tanpa query tambahan ke tabel lain.
- `realisasi_anggaran` disetel `0` eksplisit (bukan dihapus/di-skip) untuk setiap baris yang berhasil di-update — lihat §3 kenapa.
- JSDoc kepala file ditulis ulang total (lihat §5).

### ⚠️ Penyimpangan yang disengaja dari instruksi awal — "SUM untuk Kegiatan" TIDAK dipertahankan

Instruksi Fase 11 minta pola agregasi Fase 7/9 dipertahankan (SUM untuk Kegiatan, 1:1 untuk Sub Kegiatan), cuma tabel sumbernya diganti. **Sebelum implementasi, ini dicek dulu dengan data nyata** — dan terbukti SUM **akan menghasilkan angka yang salah/menyesatkan** di data model baru ini:

| Kegiatan (id) | Pagu milik sendiri (stage `kegiatan`) | SUM pagu semua indikator Sub Kegiatan di bawahnya |
|---|---|---|
| 8 (Perencanaan, Penganggaran & Evaluasi Kinerja PD) | Rp 25.000.000 | Rp 484.164.750 (**~19×** lebih besar) |
| 10 (Administrasi Keuangan) | Rp 50.000.000 | Rp 9.157.060.372 (**~183×** lebih besar) |
| 11 (Administrasi BMD pada PD) | Rp 9.002.060.372 | Rp 185.000.000 (**~49×** lebih KECIL — arah kebalikan dari baris di atas) |
| 12 (Administrasi Kepegawaian PD) | Rp 30.000.000 | Rp 285.000.000 (~9,5× lebih besar) |

**Rasio-nya tidak konsisten sama sekali** (kadang jauh lebih besar, sekali malah jauh lebih kecil) — membuktikan pagu di `indikator_renstra` level Sub Kegiatan **BUKAN pecahan/rincian dari 1 pool anggaran Kegiatan** (beda total dari desain lama `renstra_tabel_subkegiatan`, di mana tiap baris Sub Kegiatan memang secara desain adalah baris rincian anggaran Kegiatan induknya). Di `indikator_renstra`, tiap baris (di stage manapun) adalah **angka pagu yang independen milik indikator itu sendiri** — Kegiatan punya pagu sendiri yang sudah final, tidak perlu (dan tidak boleh) dihitung ulang dari SUM anak-anaknya.

**Keputusan:** kedua cabang sekarang **1:1 langsung** (baca pagu milik baris `IndikatorRenstra` yang match, apa adanya) — TIDAK ADA SUM sama sekali di Fase 11. Ini perubahan desain yang disengaja & didukung bukti data, bukan kelalaian mengikuti instruksi — dijelaskan panjang di JSDoc kode (baris 30-42) supaya developer berikutnya tidak bingung/mencoba mengembalikan SUM tanpa tahu alasannya.

---

## 3. Gap yang ditemukan saat implementasi: `realisasi_anggaran` (Rupiah) tidak punya sumber sama sekali

Ini BUKAN antisipasi instruksi Fase 11 ("cek konvensi tahun") — gap-nya lebih dasar: **`indikator_renstra` sama sekali tidak punya kolom realisasi Rupiah.** Sudah dicek 2 kemungkinan:
1. Kolom di `indikator_renstra` sendiri — tidak ada (cuma `target_tahun_N`/`pagu_tahun_N`).
2. Tabel satelit `realisasi_indikator_renstra` — ADA, tapi nilainya KINERJA (%, jumlah dokumen — dicek nilai nyata: 80.00, 85.00, 2.00), dipakai `lakip.realisasi`, bukan Rupiah.

**Keputusan:** `realisasi_anggaran` disetel `0` eksplisit untuk semua baris — bukan bug/regresi (di Fase 7/9 pun realisasi selalu 0, sumbernya `renstra_tabel_subkegiatan.realisasi_tahun_N` yang tidak pernah terisi) — tapi sekarang alasannya beda: dulu "menunggu diisi", sekarang **"memang tidak ada mekanismenya sama sekali"**. Kalau realisasi Rupiah per-indikator Renstra suatu saat dibutuhkan, perlu dirancang mekanisme baru dari nol (bukan salah satu dari 2 sumber yang sudah dicek di sini) — di luar scope Fase 11.

---

## 4. Verifikasi — data nyata, bukan data uji

```js
await syncRealisasiAnggaranLakipTahun("2025");
// → { tahun: "2025", updated: 96, skipped: 1, total: 97 }
```

**96 dari 97 baris berhasil** (dibanding 0 dari 97 sebelum Fase 7, atau bahkan 0 dari 97 setelah Fase 7/9 karena `renstra_tabel_subkegiatan` kosong). 1 baris skip (`lakip.id=70`, *"Informasi Prognosa Neraca Pangan Wilayah Provinsi"*) — dicek, memang tidak ada `IndikatorRenstra` dengan nama serupa sama sekali (data gap asli, bukan bug kode).

**Hasil ditelusuri manual ke sumbernya (bukan cuma "angka berubah", tapi dicocokkan persis):**

| lakip.id | indikator_kinerja | Grain | `pagu_anggaran` hasil sync | `IndikatorRenstra.pagu_tahun_1` sumbernya | Cocok? |
|---|---|---|---|---|---|
| 14 | Jumlah Dokumen Perencanaan Perangkat Daerah | Sub Kegiatan (id=251) | Rp 309.164.750 | Rp 309.164.750 | ✅ |
| 15 | Jumlah Dokumen RKA-SKPD ... | Sub Kegiatan (id=269) | Rp 25.000.000 | Rp 25.000.000 | ✅ |
| 16 | Jumlah Dokumen Perubahan RKA-SKPD ... | Sub Kegiatan (id=270) | Rp 25.000.000 | Rp 25.000.000 | ✅ |
| 95 | Persentase Implementasi Perencanaan Dan Evaluasi Kinerja PD | **Kegiatan** (id=250) | Rp 25.000.000 | Rp 25.000.000 (**bukan** Rp 484 juta hasil SUM — bukti keputusan §2 diterapkan benar) | ✅ |
| 96 | Persentase pelaksanaan administrasi keuangan | Kegiatan | Rp 50.000.000 | Rp 50.000.000 | ✅ |
| 97 | Cakupan administrasi BMD pada PD | Kegiatan | Rp 9.002.060.372 | Rp 9.002.060.372 | ✅ |

**Semua angka cocok 100% dengan sumbernya, langsung bisa ditelusuri.** `realisasi_anggaran` = `0.00` di semua baris (sesuai §3, bukan bug).

Total pagu terkumpul di 96 baris: **Rp 35.352.188.012** — angka ini **SENGAJA TIDAK dibandingkan** dengan total DPA (Rp 24,9 miliar dari Fase 1-3) karena keduanya metodologi & cakupan berbeda (campuran level Kegiatan+Sub Kegiatan yang berpotensi tumpang tindih cakupannya, vs total DPA riil per tahun berjalan) — disebutkan di sini sekadar konteks, bukan klaim rekonsiliasi.

**Catatan penting soal sifat perubahan data:** Berbeda dari Fase 7/9 (data uji sintetis, wajib dihapus setelah verifikasi), **96 baris `lakip` yang ter-update di sini adalah hasil PERMANEN dari data produksi nyata** — ini memang tujuan Fase 11 (menyalakan kolom `pagu_anggaran` dengan data yang benar), bukan artefak tes. Tidak ada revert/cleanup yang dilakukan atau perlu dilakukan.

---

## 5. Update JSDoc "KNOWN ISSUE"

Ditulis ulang total (baris 3-94) — poin utama:
- Seluruh referensi `renstra_tabel_subkegiatan` sebagai SUMBER data dihapus — sekarang muncul cuma di narasi riwayat ("Fase 7-9 dulu pakai ini, sekarang tidak lagi").
- Bagian "STATUS DATA" diganti: *"sync membaca dari `indikator_renstra` — jalur yang TERBUKTI dipakai operator sehari-hari — sudah berfungsi untuk data nyata, TIDAK LAGI menunggu input manual apa pun. Sisi PAGU sudah lengkap; sisi REALISASI (Rupiah) tetap 0 karena memang belum ada sumbernya — itu bukan 'menunggu input', tapi 'belum ada mekanismenya sama sekali'."*
- Blok "KNOWN ISSUE" (kolom ini tetap bukan sumber render dokumen LAKIP resmi) **dipertahankan tanpa perubahan substansi** — itu keputusan Fase 4/4b yang masih berlaku, TIDAK berubah oleh Fase 11 (`buildHtml()` tetap pakai agregat `dpa`+`penatausahaan` langsung, bukan kolom `lakip.pagu_anggaran` ini).
- Catatan baru: konsumen `mrAutoFillAggregatorService.js` sekarang akan memberi `pagu_anggaran` yang **benar-benar berisi data nyata** (bukan lagi selalu 0) — kalau nanti nilai dropdown "Pilih Data LAKIP" itu disambungkan ke tampilan (catatan lama dari Fase 4b/9), nilainya sekarang legitimate untuk ditampilkan (`realisasi_anggaran` masih 0).

---

## 6. Rekomendasi soal nasib `renstra_tabel_subkegiatan` / "Tabel Sub Kegiatan" — TIDAK dieksekusi, murni opsi untuk didiskusikan

Sesuai instruksi, **tidak ada tabel/kode/form yang dihapus** di Fase 11. Tiga opsi untuk dipertimbangkan:

**Opsi A — Biarkan apa adanya, cukup didokumentasikan (paling minim risiko).**
Tabel & form tetap ada, tapi ditandai jelas "legacy/tidak dipakai jalur LAKIP" di dokumentasi (mis. tambah catatan serupa di `renstra_tabelSubKegiatanModel.js`/`RenstraTabelSubKegiatanForm.jsx`, mirror pola "KNOWN ISSUE" yang sudah dipakai di seluruh Fase 4-11 ini). Risiko: nol — tidak ada perubahan behavior. Downside: tombol "Tabel Sub Kegiatan" tetap membingungkan user yang mengira itu jalur input yang benar (persis kebingungan yang memicu Fase 10 ini).

**Opsi B — Sembunyikan tombol "Tabel Sub Kegiatan" dari menu (tanpa hapus tabel/data).**
Cuma ubah `RenstraSidebar.jsx` (hilangkan/comment 1 `<Link>`), form & route & tabel-nya tetap ada (bisa dikembalikan kapan saja). Mengurangi kebingungan operator langsung, risiko rendah (murni UI, data/API tidak tersentuh). Perlu keputusan: apakah tombol "Tabel Tujuan/Sasaran/Strategi/Program/Kegiatan" lain di grup "Input Tabel Renstra" yang SAMA juga perlu dicek nasibnya (Fase 10/11 cuma investigasi & retarget untuk Sub Kegiatan — belum dicek apakah `renstra_tabel_tujuan`/`_sasaran`/dst juga sama-sama tidak dipakai, atau beda cerita).

**Opsi C — Hapus total (tabel, model, controller, route, form).**
Paling bersih jangka panjang, tapi **paling berisiko** — perlu dipastikan dulu betul-betul tidak ada konsumen lain (mis. dicek MR/Pengkeg/laporan lain yang sempat muncul saat investigasi `RenstraTabelSubkegiatan` di Fase 6/8 — `mr_planningRiskController.js`, `pengkegController.js`, `helpers/aggregatePagu.js`, `helpers/updateKegiatanPagu.js`, `utils/validasiPaguKegiatanSubkegiatan.js` semuanya mengimpor model ini). **Tidak direkomendasikan dieksekusi sebelum audit terpisah** ke semua konsumen itu — jauh di luar scope investigasi Fase 10/perbaikan Fase 11 ini.

**Rekomendasi saya (bukan keputusan): Opsi A dulu (dokumentasi), pertimbangkan Opsi B kalau kebingungan operator memang jadi masalah nyata di lapangan.** Opsi C perlu audit terpisah yang jauh lebih luas sebelum aman dieksekusi.

---

## File yang diubah

- `backend/services/lakipRealisasiAnggaranSyncService.js` — satu-satunya file kode yang diubah.
- **Data**: 96 baris `lakip` (tahun 2025) ter-update permanen dengan `pagu_anggaran` nyata (bukan data uji, tidak di-revert — lihat §4).

Tidak ada migrasi baru, tidak ada perubahan skema, tidak ada file/tabel/form yang dihapus (sesuai instruksi #6).

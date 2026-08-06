# Fase 4b — Dokumentasi Known Issue: `lakip.pagu_anggaran`/`realisasi_anggaran`

**Sifat:** Dokumentasi murni (komentar kode + catatan ini). **Tidak ada perubahan logika/behavior.** Tidak ada kode/kolom yang dihapus.
**Rujukan penuh:** `FASE4-INVESTIGASI-DATA-ANGGARAN.md` (investigasi lengkap, semua bukti/query). Dokumen ini adalah versi ringkas untuk jadi catatan permanen tim.

---

## Ringkasan temuan (Fase 4, per Agustus 2026)

Kolom `lakip.pagu_anggaran` dan `lakip.realisasi_anggaran` — hasil sinkronisasi `lakipRealisasiAnggaranSyncService.js` dari data Renstra — **tidak pernah dipakai untuk merender dokumen LAKIP resmi (PDF/DOCX)**. `buildHtml()`/`collectLakipData()` di `lakipGeneratorController.js` mengambil angka anggaran lewat agregasi **langsung** dari `dpa`+`penatausahaan`, sepenuhnya independen dari kolom sync ini.

**Kolom sync ini saat ini SELALU Rp 0** (dicek: 97/97 baris `lakip` tahun 2025, semua nol, `realisasi_anggaran_synced_at` NULL di semuanya) — bukan "belum sempat sync", tapi **struktural**: rantai sync-nya (`Lakip` → `IndikatorRenstra` stage `sub_kegiatan` → `RenstraTabelSubkegiatan.pagu_tahun_N`) bergantung pada tabel `renstra_tabel_subkegiatan`, yang **berisi 0 baris di seluruh database** — jadi dijamin gagal cocok berapa kali pun sync dijalankan, sampai tabel itu diisi.

Dibangun sengaja (bukan sisa refactor tak disadari) dalam commit `7cc31216` (22 Jul 2026) — bersamaan dengan jalur query-langsung yang dipakai `buildHtml()` sekarang. Dua pendekatan paralel untuk masalah konsep yang sama, tidak pernah direkonsiliasi.

**Konsumen kolom ini saat ini:**
1. `LakipTable.jsx`/`LakipListPage.jsx` (list view) — **dead code**, tidak dirouting di `App.jsx`.
2. `mrAutoFillAggregatorService.js` → dropdown "Pilih Data LAKIP" di wizard MR (`StepContext.jsx`) — **live** (endpoint benar-benar dipanggil), tapi nilainya ditelusuri **tidak pernah benar-benar ditampilkan/dipakai hitung apa pun** di step berikutnya (`StepRiskAnalysis.jsx`) — inert untuk saat ini.

**Vonis:** bukan "aman diabaikan total" (ada konsumen live), bukan "harus dipakai untuk render" (kebalikannya — datanya kosong & kurang akurat dibanding jalur yang sudah ada) — **berisiko jadi sumber kebingungan/bug di masa depan** kalau tidak didokumentasikan.

---

## Dokumentasi yang ditambahkan (Fase 4b)

| File | Apa yang ditambahkan |
|---|---|
| `backend/services/lakipRealisasiAnggaranSyncService.js` | Blok JSDoc "KNOWN ISSUE" di kepala file — sumber sync tidak dipakai render dokumen, daftar konsumen, penjelasan kenapa selalu Rp 0 |
| `backend/controllers/lakipGeneratorController.js` | Catatan ringkas di `collectLakipData()`, tepat di atas query agregasi `dpa`+`penatausahaan` — penjelasan singkat kenapa TIDAK baca kolom sync |
| `backend/services/mr/mrAutoFillAggregatorService.js` | Catatan di `getLakipSuggestion()` — peringatan bahwa nilai `pagu_anggaran`/`realisasi_anggaran` beda sumber dari dokumen resmi, wajib diganti sumbernya dulu kalau mau benar-benar disambungkan ke tampilan |

Semua murni komentar — tidak ada baris logika yang berubah, dicek `require()` ketiga file tetap sukses dan lint tidak menambah error baru.

---

## Rekomendasi kalau suatu saat mau benar-benar diperbaiki (bukan dikerjakan sekarang)

1. **Isi `renstra_tabel_subkegiatan`** dulu (di luar scope proyek audit LAKIP ini — itu tugas modul Renstra: entri manual target/pagu per Sub Kegiatan untuk Renstra OPD aktif, lewat `renstra_tabelSubKegiatanController.js`/UI-nya).
2. **Jalankan `renstraRealisasiAnggaranSyncService.js`** (sync Penatausahaan → `renstra_tabel_subkegiatan`) supaya kolom `pagu_tahun_N`/`realisasi_tahun_N` di sana benar-benar terisi dari data riil.
3. **Baru** `lakipRealisasiAnggaranSyncService.js` bisa dipercaya hasilnya — verifikasi ulang beberapa baris `lakip.pagu_anggaran`/`realisasi_anggaran` vs agregat `dpa`+`penatausahaan` langsung untuk memastikan angkanya masuk akal (matching nama indikator teks-ke-teks berisiko meleset kalau ada perbedaan penulisan, seperti temuan Fase 1-3 di sisi lain sistem ini).
4. **Baru setelah itu** layak dipertimbangkan apakah kolom `lakip.pagu_anggaran`/`realisasi_anggaran` dipindah jadi sumber render dokumen (menggantikan agregasi `dpa`+`penatausahaan` langsung) — **berpotensi lebih presisi** karena granularitasnya per-baris `lakip` (per indikator/Kegiatan spesifik) dibanding agregat DPA yang sekarang dikelompokkan per teks `dpa.kegiatan` global. Tapi ini keputusan produk yang butuh data poin 1-3 selesai dulu, dan tetap perlu perbandingan langsung dengan jalur yang sudah terverifikasi sekarang sebelum menggantikannya — jangan migrasi "karena granularitasnya lebih bagus di atas kertas" tanpa verifikasi data nyata seperti yang sudah dilakukan berulang kali di Fase 1-4.

Sampai poin 1-2 selesai, kondisi sekarang (dokumentasi + kolom tetap ada tapi tidak dipakai render) adalah keadaan yang aman dan sudah terverifikasi jelas alasannya.

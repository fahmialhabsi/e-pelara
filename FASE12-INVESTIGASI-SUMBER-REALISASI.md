# Fase 12 — Investigasi Sumber Realisasi Anggaran (Rupiah) untuk `lakip.realisasi_anggaran`

**Sifat:** Investigasi murni. **Tidak ada kode/data yang diubah.**

**Kesimpulan langsung (detail §1-3):** `dpa`+`penatausahaan` **TERBUKTI BISA** jadi sumber realisasi Rupiah yang benar & granular (sampai level Sub Kegiatan, lewat kode terstruktur — bukan cuma level Kegiatan seperti dugaan minimal di pertanyaan). **TAPI** — dicek ulang konsumen nyata `lakip.realisasi_anggaran` setelah Fase 11 — **tidak ada satupun yang benar-benar menampilkan/memakai nilainya ke pengguna**. Jadi jawabannya **bukan salah satu dari 2 pilihan di pertanyaan Anda secara mutlak**: kolom ini SECARA TEKNIS bisa diisi benar (jawaban Q1/Q2: bisa), tapi SECARA PRAKTIS belum ada yang butuh (jawaban Q3: konsumen nyata nihil) — persis situasi `pagu_anggaran` **sebelum** Fase 11 (bisa diisi, tapi baru berguna kalau ada yang benar-benar memakainya).

---

## 1. Sumber realisasi Rupiah yang benar — `dpa`+`penatausahaan` terbukti, bukan cuma dugaan

### Struktur `dpa` — granular sampai Sub Kegiatan, BUKAN cuma level Kegiatan

Dicek langsung isi baris `dpa` untuk 1 Kegiatan yang sama dipakai verifikasi Fase 11 (kegiatan_id=8, "Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah"):

```
7 baris dpa, masing-masing punya sub_kegiatan sendiri:
  "Penyusunan Dokumen Perencanaan Perangkat Daerah" (kode_sub_kegiatan 2.09.01.1.01.0001)
    anggaran=309.164.750  realisasi=311.264.750
  "Koordinasi dan Penyusunan Dokumen RKA-SKPD" (...0002)
    anggaran=12.604.000   realisasi=12.604.000
  ...5 baris lain, masing-masing kode_sub_kegiatan berbeda
```

**`dpa` sudah granular per Sub Kegiatan sejak baris awal** (kolom `sub_kegiatan`, `kode_sub_kegiatan` terisi per baris) — bukan cuma per Kegiatan seperti agregasi yang dipakai Fase 2 (`anggaranPerKegiatanRows`, `GROUP BY d.kegiatan`). Dan **`dpa` punya kolom `realisasi` LANGSUNG di baris itu sendiri** (bukan cuma bisa didapat lewat join `penatausahaan` — lihat catatan penting di §1b).

### Bukti silang kuat: `dpa` dan `indikator_renstra`/`renstra_subkegiatan` merujuk entitas yang SAMA PERSIS

Dicek baris DPA "Penyusunan Dokumen Perencanaan Perangkat Daerah" (`kode_sub_kegiatan = "2.09.01.1.01.0001"`, `anggaran = Rp 309.164.750`) dibandingkan dengan:
- `renstra_subkegiatan.id=4` → `kode_sub_kegiatan = "2.09.01.1.01.0001"` — **KODE SAMA PERSIS**.
- `indikator_renstra.id=251` (indikator utk Sub Kegiatan ini, dipakai sync Fase 11) → `pagu_tahun_1 = Rp 309.164.750` — **ANGKA SAMA PERSIS** dengan `dpa.anggaran`.

Ini bukan kebetulan — membuktikan `dpa`, `renstra_subkegiatan`, dan `indikator_renstra` ketiganya sudah konsisten merujuk Sub Kegiatan yang sama, dengan angka pagu yang sama, tinggal `dpa` yang punya **realisasi Rupiah** (yang tidak ada di `indikator_renstra`, temuan Fase 11).

**Jawaban Q1: YA, `dpa`+`penatausahaan` adalah sumber realisasi Rupiah yang benar** — bukan cuma di level agregat OPD/Kegiatan yang sudah dipakai `buildHtml()` sejak Fase 1-3, tapi granular sampai Sub Kegiatan lewat kode `kode_sub_kegiatan`.

### 1b. Catatan penting: ADA 2 angka "realisasi" berbeda di sekitar `dpa` — bukan cuma 1 sumber tunggal

Ditemukan (bukan diasumsikan) bahwa `dpa.realisasi` (kolom langsung) **TIDAK SELALU SAMA** dengan `SUM(penatausahaan.jumlah)` yang di-join lewat `dpa_id` — dicek untuk baris DPA yang sama:

| Sumber | Nilai |
|---|---|
| `dpa.realisasi` (kolom langsung) | Rp 311.264.750 |
| `SUM(penatausahaan.jumlah)` per `dpa_id` (agregat transaksi BKU) | Rp 308.764.750 |
| **Selisih** | **Rp 2.500.000** |

**`buildHtml()` (Bab III, Fase 1-3, sudah diverifikasi ketat berkali-kali) memakai jalur KEDUA** — `SUM(penatausahaan.jumlah) INNER JOIN dpa ON dpa.id = penatausahaan.dpa_id` — bukan kolom `dpa.realisasi` langsung. Kalau suatu saat sync realisasi ke `lakip` dibangun, **harus ikut pola yang sama** (penatausahaan-SUM, bukan `dpa.realisasi`) supaya konsisten dengan angka yang sudah tampil di dokumen resmi — kalau pakai `dpa.realisasi` langsung, akan menghasilkan angka yang BEDA (walau selisihnya kecil di contoh ini) dari yang sudah dipercaya di render dokumen.

---

## 2. Granularitas — bisa sampai level Sub Kegiatan, lewat KODE (bukan teks)

Dicek 2 level sekaligus dengan kode terstruktur (bukan pencocokan nama bebas yang rapuh seperti dipakai `lakip.indikator_kinerja` selama ini):

| Level | Kunci join | Contoh dibuktikan |
|---|---|---|
| **Sub Kegiatan** | `dpa.kode_sub_kegiatan` = `RenstraSubkegiatan.kode_sub_kegiatan` | `"2.09.01.1.01.0001"` cocok persis di kedua tabel (§1) |
| **Kegiatan** | `dpa.kode_kegiatan` = `RenstraKegiatan.kode_kegiatan` | `"2.09.01.1.01"` cocok persis; agregat `SUM(dpa.anggaran/realisasi) WHERE kode_kegiatan=...` = Rp 392.651.500 pagu / Rp 394.739.750 realisasi (7 baris) — angka pagu ini PERSIS sama dengan yang sudah tampil di Analisis Efisiensi Bab III (Fase 2), yang saat itu masih pakai `GROUP BY d.kegiatan` (teks) — kode dan teks kebetulan konsisten utk data ini, tapi kode jelas lebih andal jangka panjang |

**Jawaban Q2: YA, bisa diagregasi sampai level yang PERSIS SAMA dengan kebutuhan sync** (baik level Kegiatan maupun Sub Kegiatan, sesuai grain masing-masing baris `lakip` hasil Fase 7-9) — dan lewat kode terstruktur, granularitasnya sebenarnya LEBIH BAIK/ANDAL dibanding pendekatan pencocokan nama teks yang dipakai sepanjang Fase 7-11 untuk mencocokkan `lakip.indikator_kinerja` ke `indikator_renstra`.

---

## 3. Konsumen nyata `lakip.realisasi_anggaran` — dicek ulang setelah Fase 11, hasilnya NIHIL

Dicek 3 kandidat konsumen (sama seperti disurvei Fase 4/9/11, di-verifikasi ulang statusnya sekarang, bukan diasumsikan tidak berubah):

| Konsumen | Status sekarang | Baca `realisasi_anggaran`? |
|---|---|---|
| `buildHtml()`/`collectLakipData()` (render dokumen LAKIP resmi) | Live, sudah diverifikasi ketat Fase 1-3 | **TIDAK** — cuma 1 baris komentar (dari Fase 4b) yang menyebut nama kolom ini, bukan kode yang benar-benar membacanya. Realisasi Bab III tetap dari agregat `dpa`+`penatausahaan` langsung |
| `LakipTable.jsx` / `LakipListPage.jsx` (list view kolom Pagu/Realisasi Anggaran) | **Masih dead** — dicek ulang, `LakipListPage` tetap tidak muncul di `App.jsx` | Kalau pernah live, iya — tapi tidak pernah dirender ke pengguna manapun saat ini |
| `mrAutoFillAggregatorService.js` → dropdown "Pilih Data LAKIP" (`StepContext.jsx`, wizard MR) | Live (endpoint benar-benar dipanggil) | Fetch YA, tapi (dikonfirmasi ulang di Fase 4, tidak berubah) nilainya **tidak pernah ditampilkan/dipakai** di `StepContext.jsx` maupun step berikutnya (`StepRiskAnalysis.jsx` — `'Lakip'` tidak ada di `PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER` yang jadi syarat field anggaran terisi) |

Dicek juga tidak ada konsumen BARU yang muncul sejak Fase 4 (grep ulang seluruh `frontend/src`+`backend` untuk `realisasi_anggaran` — hasil lain yang match ternyata field berbeda: `persen_realisasi_anggaran` di halaman "Tabel Sub Kegiatan" sendiri, dan komentar kode Fase 4b/11 — bukan pembacaan nyata `lakip.realisasi_anggaran`).

**Jawaban Q3: kolom `lakip.realisasi_anggaran` TIDAK PUNYA konsumen nyata yang benar-benar menampilkan nilainya ke pengguna, di manapun, saat ini** — persis seperti `lakip.pagu_anggaran` sebelum Fase 11 (satu-satunya "pemakai" cuma fetch tak-terpakai di wizard MR).

---

## Kesimpulan akhir

**Bukan salah satu dari 2 opsi ekstrem di pertanyaan** ("harus diisi karena ada yang butuh" vs "tidak pernah terpakai sama sekali, catat saja") — melainkan **di tengah, dengan implikasi berbeda dari `pagu_anggaran`**:

- **Secara teknis**, `dpa`+`penatausahaan` **terbukti** cukup — bisa diagregasi sampai grain yang tepat (Kegiatan & Sub Kegiatan, lewat kode terstruktur `kode_kegiatan`/`kode_sub_kegiatan`, bukan nama bebas), dan sudah ada 1 preseden nyata yang perlu diikuti kalau dibangun (pakai `SUM(penatausahaan.jumlah)`, BUKAN `dpa.realisasi` langsung, supaya konsisten dengan `buildHtml()` yang sudah diverifikasi).
- **Secara kebutuhan nyata**, TIDAK ADA konsumen yang menampilkan kolom ini ke pengguna — beda dari `pagu_anggaran` yang setidaknya punya 1 konsumen live meski nilainya belum ditampilkan (dropdown MR) — situasinya untuk `realisasi_anggaran` **identik** dengan `pagu_anggaran` (sama-sama cuma di-fetch, tidak pernah ditampilkan).

**Rekomendasi:** **jangan dibangun sync realisasi sekarang.** "Realisasi selalu 0" bukan gap yang mendesak untuk ditambal — sesuai kesimpulan Fase 4/4b yang sudah menyatakan `pagu_anggaran`/`realisasi_anggaran` (sebagai satu kesatuan kolom) bukan sumber render dokumen resmi & belum punya konsumen nyata. Fase 11 sudah menaikkan nilai kolom `pagu_anggaran` jadi berguna secara potensial (data-nya benar, tinggal menunggu ada fitur yang menampilkannya) — kalau/ketika ada kebutuhan nyata muncul (mis. dropdown MR benar-benar disambungkan ke tampilan, atau `LakipListPage.jsx` dihidupkan lagi), **baru** bangun sync realisasi memakai pola yang sudah dibuktikan di sini (§1-2): `dpa.kode_kegiatan`/`kode_sub_kegiatan` sebagai kunci join, `SUM(penatausahaan.jumlah)` sebagai sumber angka, konsisten dengan `buildHtml()`.

Ini juga konsisten dengan rekomendasi Fase 4b yang lebih luas: kolom `lakip.pagu_anggaran`/`realisasi_anggaran` sebaiknya tetap didokumentasikan sebagai "bukan sumber render dokumen, isinya sekarang [sebagian] akurat tapi belum ada yang memakainya secara visible" — bukan dianggap "harus selalu sempurna diisi" tanpa ada yang membutuhkannya.

---

## File yang dibaca / query yang dijalankan (investigasi murni, tidak ada yang diubah)

- `backend/controllers/lakipGeneratorController.js` (`collectLakipData()`, konfirmasi ulang tidak baca kolom sync)
- `backend/controllers/renstra_tabelSubKegiatanController.js`, `frontend/src/features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanListPage.jsx`, `frontend/src/features/renstra/shared/components/RenstraTabelListCommon.jsx` (verifikasi `persen_realisasi_anggaran` adalah field lain, tidak terkait)
- `frontend/src/App.jsx` (verifikasi ulang `LakipListPage` tetap tidak dirouting)
- Query read-only ke `dpa`, `penatausahaan`, `renstra_subkegiatan`, `renstra_kegiatan`, `indikator_renstra` (tidak ada `INSERT`/`UPDATE`)

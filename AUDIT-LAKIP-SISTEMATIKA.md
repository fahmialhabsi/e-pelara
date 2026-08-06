# Audit Sistematika Dokumen LAKIP — ePeLARA

**Ruang lingkup:** modul LAKIP (Laporan Akuntabilitas Kinerja Instansi Pemerintah / LKj) pada aplikasi ePeLARA, khusus dokumen **PDF** dan **Word (.docx)** yang benar-benar di-generate ke pengguna.
**Metode:** pembacaan penuh source code backend & frontend (bukan sekadar grep), dibandingkan dengan sistematika baku Lampiran Permenpan RB Nomor 12 Tahun 2015 tentang Pedoman Evaluasi Atas Implementasi SAKIP.
**Catatan penting:** folder `.claude\worktrees\*` diabaikan sepenuhnya (bukan kode aktif). Tidak ada perubahan kode dilakukan — audit ini murni read-only.

---

## TAHAP 1 — Inventarisasi File

### (a) Endpoint / generator PDF
| File | Fungsi | Endpoint |
|---|---|---|
| `backend\controllers\lakipExportController.js` | `exportPdf` (baris 57–113) — pakai Puppeteer, render ulang HTML dari `lakipGeneratorController.preview` | `GET /api/lakip-generator/export/pdf` |
| `backend\controllers\lakipGeneratorController.js` | `preview` (baris 1183–1195) — sumber HTML yang dipakai `exportPdf` di atas | `GET /api/lakip-generator/preview` |
| `backend\controllers\lakipPkExportController.js` | `exportPdf` (baris 34–73) — dokumen **Perjanjian Kinerja** terpisah, bukan LAKIP penuh | `GET /api/lakip-pk/export/pdf` |

### (b) Endpoint / generator Word (.docx)
| File | Fungsi | Endpoint |
|---|---|---|
| `backend\controllers\lakipExportController.js` | `exportDocx` (baris 250–289) — pakai library `html-to-docx`, membangun HTML **terpisah** lewat `buildDocxHtml` (BUKAN reuse dari `buildHtml` PDF) | `GET /api/lakip-generator/export/docx` |
| `backend\controllers\lakipPkExportController.js` | `exportDocx` (baris 75–96) — dokumen Perjanjian Kinerja, pakai `lakipPkDocxService.buildPkDocxBuffer` (library `docx` native, bukan html-to-docx) | `GET /api/lakip-pk/export/docx` |

### (c) Template HTML/DOCX yang membentuk struktur dokumen
| File | Fungsi | Dipakai untuk |
|---|---|---|
| `backend\controllers\lakipGeneratorController.js` | `buildHtml()` baris 392–1093 | Struktur dokumen LAKIP utama — **PDF & Preview HTML** |
| `backend\controllers\lakipExportController.js` | `buildDocxHtml()` baris 116–246 | Struktur dokumen LAKIP utama — **Word**, template TERPISAH & lebih sederhana dari PDF |
| `backend\services\lakipPkExportService.js` | `buildPkHtml()` baris 50–229 | Struktur dokumen Perjanjian Kinerja — PDF/Preview PK |
| `backend\services\lakipPkDocxService.js` | `buildPkDocxBuffer()` baris 194–442 | Struktur dokumen Perjanjian Kinerja — Word PK |

### (d) Model/skema data pengisi konten laporan
| File | Isi |
|---|---|
| `backend\models\lakipModel.js` | Tabel `lakip`: baris per Program/Kegiatan/Indikator dengan `target`, `realisasi`, `evaluasi`, `rekomendasi`, plus `pagu_anggaran`/`realisasi_anggaran` (lihat catatan gap di Tahap 4) |
| `backend\models\lakipPkModel.js`, `lakipPkOutputSasaranModel.js`, `lakipPkProgramAnggaranModel.js` | Dokumen Perjanjian Kinerja (Pasal 1–6, sasaran teknis, program & anggaran) |
| `backend\controllers\lakipGeneratorController.js` fungsi `collectLakipData()` (baris 24–367) | Agregator utama: `periode_rpjmds`, `renstra_opd`, `visi`, `misi`, `renstra_tujuan`, `renstra_sasaran`, `renstra_strategi/kebijakan/program/kegiatan`, `indikator_renstra`, `realisasi_indikator_renstra`, tabel `lakip`, agregasi `dpa`+`penatausahaan` (anggaran), dan `renstra_bab` (Gambaran Umum & Isu Strategis) |
| `backend\services\lakipAnalisaService.js` | Fungsi `analisaOtomatis()` — narasi analisis capaian per indikator berbasis data nyata |
| `backend\services\lakipAutoGenerateService.js`, `lakipBridgeService.js`, `lakipRealisasiAnggaranSyncService.js` | Sinkronisasi data sumber (Renstra→Lakip, Renja→Lakip, anggaran Rp) — TIDAK terlibat langsung dalam render dokumen |

### File lain yang ditemukan (di luar daftar awal, hasil Glob)
- `backend\controllers\lakipPkController.js`, `backend\routes\lakipPkRoutes.js`, `backend\services\lakipPkService.js` — CRUD & data-live untuk dokumen Perjanjian Kinerja.
- `frontend\src\features\lakip\pages\LakipPkFormPage.jsx` (827 baris) — form input Perjanjian Kinerja.
- `frontend\src\features\lakip\pages\LakipListPage.jsx`, `components\LakipTable.jsx`, `components\LakipForm.jsx` — **terkonfirmasi tidak pernah di-import/routing di `App.jsx`** (dicek dengan grep menyeluruh) → kode legacy/mati, tidak relevan untuk sistematika dokumen final.
- `frontend\src\features\lakip\pages\LakipPrintView.jsx` — stub 11 baris berisi teks placeholder statis ("Isi laporan yang siap dicetak..."), **tidak pernah dirouting**, dan bukan sumber preview aktual (preview aktual dibuka lewat URL server-side `/api/lakip-generator/preview` di tab baru, lihat `LakipGeneratorPanel.jsx` baris 81-84).
- Pencarian `docs\` dan `dokumenEPelara\` untuk kata kunci "sistematika", "ikhtisar", "akuntabilitas kinerja", "perjanjian kinerja", "SAKIP", "PERMENPAN": **tidak ditemukan dokumen referensi regulasi SAKIP/Permenpan RB khusus LAKIP** di kedua folder tersebut (hasil hits di `dokumenEPelara` semuanya untuk modul MR/RPJMD, bukan LAKIP).
- Migrasi backup lama `backend\migrations\backup\20250616130931-create-lakip.js` — hanya migration schema awal, tidak relevan untuk sistematika output.

---

## TAHAP 2 — Sistematika Dokumen yang Dihasilkan Saat Ini

### 2.A — Output PDF (sumber: `lakipGeneratorController.js` fungsi `buildHtml`, dirender lewat `lakipExportController.exportPdf`)

Urutan render sesuai urutan blok `<div class="page ...">` di kode:

| # | Bagian | Sub-bagian | Sumber (file:baris) |
|---|---|---|---|
| 1 | **Cover / Halaman Sampul** | Judul "LAPORAN AKUNTABILITAS KINERJA INSTANSI PEMERINTAH", nama OPD, tahun | `lakipGeneratorController.js:868-882` |
| 2 | **BAB I — PENDAHULUAN** | A. Dasar Hukum (paragraf hardcode, mengacu Perpres 29/2014 & Permenpan RB 53/2014) | `:887-894` |
| | | B. Maksud dan Tujuan (paragraf hardcode) | `:895-900` |
| | | C. Gambaran Umum Organisasi (teks dinamis, ditarik dari `renstra_bab` Bab II butir 2.1) | `:902-910` |
| | | D. Isu Strategis (teks dinamis, ditarik dari `renstra_bab` Bab III butir 3.5) | `:912-920` |
| 3 | **RINGKASAN EKSEKUTIF** | Paragraf pertanggungjawaban + ringkasan anggaran | `:924-945` |
| | | KPI box (jumlah indikator/tercapai/perlu perhatian) | `:948-961` |
| | | Tabel & bar Realisasi Anggaran (kondisional, hanya jika `total_pagu>0`) | `:966-984` |
| | | Visi | `:986-987` |
| | | Misi | `:989-990` |
| 4 | **BAB II — PERENCANAAN KINERJA** | Tabel "Perjanjian Kinerja Tahun ..." (Sasaran, Indikator, Satuan, Target) | `:1000-1012` |
| 5 | **BAB III — AKUNTABILITAS KINERJA** | A. Capaian Kinerja Organisasi → Sasaran Strategis (daftar) | `:1018-1020` |
| | | Capaian Indikator Kinerja: tabel IKU, tabel IKK | `:1022-1024` |
| | | Hierarki indikator Tujuan→Sasaran→Program→Kegiatan (tabel bertingkat) + indikator "orphan" | `:1026-1029` |
| | | B. Rincian Realisasi Program dan Kegiatan (tabel dari tabel `lakip`) | `:1034-1051` |
| 6 | **BAB IV — PENUTUP** | Narasi evaluasi + daftar 4 Rekomendasi | `:1056-1075` |
| | | Blok tanda tangan Kepala OPD (placeholder titik-titik, bukan nama nyata) | `:1077-1087` |

**Total halaman berbasis `page-break`: 7** (Cover, Bab I, Ringkasan Eksekutif, Bab II, Bab III bagian A, Bab III bagian B, Bab IV).

Elemen wajib (cek eksplisit):
| Elemen | Ada/Tidak | Keterangan |
|---|---|---|
| Ikhtisar/Ringkasan Eksekutif | **ADA**, tapi **salah urutan** — muncul setelah Bab I (`:924`), bukan sebelum Bab I |
| Kata Pengantar | **TIDAK ADA** — tidak ada string/heading terkait di seluruh `buildHtml()` |
| Daftar Isi | **TIDAK ADA** |
| Pernyataan Telah Direviu (Inspektorat) | **TIDAK ADA** — kata "Reviu" hanya muncul sebagai bagian judul regulasi dalam paragraf Dasar Hukum (`:893`), bukan pernyataan/lembar reviu tersendiri |
| Bab I Pendahuluan | **ADA**, subbagian: Dasar Hukum, Maksud dan Tujuan, Gambaran Umum Organisasi, Isu Strategis. **Tidak ada** subbagian eksplisit "Latar Belakang", "Tugas dan Fungsi", atau "Struktur Organisasi" — hanya tersirat di teks bebas "Gambaran Umum Organisasi" yang ditarik dinamis dari Renstra Bab II (kontennya tidak dijamin memuat tusi/struktur organisasi, tergantung isi Renstra) |
| Bab II Perencanaan Kinerja | **ADA**, tapi hanya tabel Perjanjian Kinerja. **Tidak ada** subbagian "Rencana Strategis" ringkas (Visi/Misi/Tujuan/Sasaran malah ditaruh di Ringkasan Eksekutif, bukan di Bab II) |
| Bab III Akuntabilitas Kinerja | **ADA** — capaian per sasaran/indikator ADA, perbandingan target vs realisasi ADA (kolom tabel), analisis capaian ADA (narasi otomatis per indikator). **Realisasi Anggaran TIDAK ADA di dalam Bab III** (hanya muncul di Ringkasan Eksekutif sebelum Bab II). **Analisis efisiensi TIDAK ADA sama sekali** (dicek — tidak ada string "efisiensi" di seluruh kode LAKIP) |
| Bab IV Penutup | **ADA** |
| Lampiran (Perjanjian Kinerja, Pengukuran Kinerja) | **TIDAK ADA di dalam PDF LAKIP ini.** Dokumen Perjanjian Kinerja memang ADA di sistem, tapi sebagai **file terpisah** (`/api/lakip-pk/export/pdf`) yang harus diunduh sendiri, tidak digabung/di-embed sebagai halaman Lampiran pada PDF LAKIP utama. Tidak ada tabel "Pengukuran Kinerja" formal (Target/Realisasi/Capaian per indikator per Permenpan 53/2014) sebagai Lampiran — data serupa hanya muncul sebagai badan tabel Bab III |

### 2.B — Output Word/.docx (sumber: `lakipExportController.js` fungsi `buildDocxHtml`)

**Temuan kritis:** template DOCX **bukan reuse** dari template PDF — dibangun ulang dari nol dengan struktur berbeda total (nomor Bab, jumlah Bab, dan kontennya berbeda).

| # | Bagian | Sub-bagian | Sumber (file:baris) |
|---|---|---|---|
| 1 | Judul dokumen (h1 "LAPORAN AKUNTABILITAS KINERJA INSTANSI PEMERINTAH", h2 nama OPD, h2 Tahun) | — | `lakipExportController.js:170-172` |
| 2 | **RINGKASAN EKSEKUTIF** | Paragraf pertanggungjawaban + anggaran (kondisional) | `:176-182` |
| | | Jumlah Indikator / Tercapai / Belum Tercapai (teks, bukan tabel/KPI box) | `:183-185` |
| | | Visi | `:187-188` |
| | | Misi | `:190-191` |
| 3 | **BAB I — SASARAN STRATEGIS & INDIKATOR KINERJA** | Sasaran Strategis (daftar) | `:194-195` |
| | | Tabel IKU (kondisional) | `:197-202` |
| | | Tabel IKK (kondisional) | `:204-209` |
| | | Tabel Capaian Indikator Kinerja Tahun ... (flat, TANPA hierarki Tujuan→Sasaran→Program→Kegiatan seperti versi PDF) | `:211-215` |
| 4 | **BAB II — AKUNTABILITAS PROGRAM & KEGIATAN** | Tabel Program/Kegiatan/Indikator/Target/Realisasi/Evaluasi | `:217-226` |
| 5 | **BAB III — PENUTUP** | Narasi evaluasi + 3 Rekomendasi (PDF punya 4 — item "Pengembangan kapasitas SDM..." tidak ada di DOCX) | `:228-236` |
| | | Blok tanda tangan Kepala OPD | `:238-243` |

Elemen wajib (cek eksplisit — DOCX):
| Elemen | Ada/Tidak | Keterangan |
|---|---|---|
| Ikhtisar/Ringkasan Eksekutif | **ADA**, dan posisinya **benar** (sebelum semua Bab) |
| Kata Pengantar | **TIDAK ADA** |
| Daftar Isi | **TIDAK ADA** |
| Pernyataan Telah Direviu | **TIDAK ADA** |
| Bab I Pendahuluan (Dasar Hukum, Maksud Tujuan, Gambaran Umum Organisasi, Isu Strategis) | **TIDAK ADA SAMA SEKALI.** "BAB I" di DOCX berjudul "Sasaran Strategis & Indikator Kinerja" — ini konten yang di versi PDF ada di Bab III, bukan Bab I. Seluruh isi Pendahuluan (Dasar Hukum, Maksud Tujuan, Gambaran Umum Organisasi, Isu Strategis) yang ada di PDF **hilang total** di DOCX |
| Bab II Perencanaan Kinerja (tabel Perjanjian Kinerja) | **TIDAK ADA.** Tidak ada tabel Perjanjian Kinerja Tahun berjalan sama sekali di DOCX |
| Bab III Akuntabilitas Kinerja | Konten setara ada tapi diberi label **"BAB II"** (bukan Bab III) — capaian indikator ADA (flat, tanpa hierarki), realisasi program/kegiatan ADA (tabel). Realisasi Anggaran hanya narasi 1 kalimat di Ringkasan Eksekutif, **tidak ada tabel**. Analisis efisiensi **TIDAK ADA** |
| Bab IV Penutup | Ada tapi diberi label **"BAB III"** (nomor bab bergeser -1 dibanding PDF) |
| Lampiran | **TIDAK ADA** (sama seperti PDF — dokumen PK terpisah, tidak di-embed) |
| Cover/Halaman Sampul terpisah | **TIDAK ADA** (PDF punya halaman cover penuh dengan page-break; DOCX cuma 3 baris judul di atas tanpa page break/halaman terpisah) |

---

## TAHAP 3 — Perbandingan dengan Regulasi

**Regulasi acuan:** Permenpan RB Nomor 12 Tahun 2015 tentang Pedoman Evaluasi Atas Implementasi SAKIP (Lampiran sistematika Laporan Kinerja).

**Referensi regulasi lain yang DITEMUKAN di dalam repo** (bukan Permenpan 12/2015 itu sendiri, tapi disebut sebagai dasar hukum di kode/UI):
- Peraturan Presiden Nomor 29 Tahun 2014 tentang SAKIP — disebut di `lakipGeneratorController.js:890-891` dan `LAKIPDashboard.jsx:50`
- Permenpan RB Nomor 53 Tahun 2014 tentang Juknis Perjanjian Kinerja, Pelaporan Kinerja, dan Tata Cara Reviu — disebut di `lakipGeneratorController.js:891-893`, `LAKIPDashboard.jsx:51`, dan jadi acuan Pasal 6 dokumen PK (`lakipPkService.js:38`)
- Permenpan RB Nomor 88 Tahun 2021 tentang Evaluasi AKIP — disebut **hanya di UI** `LAKIPDashboard.jsx:52`, tidak dipakai di logika generator manapun

**Permenpan RB Nomor 12 Tahun 2015 sendiri (regulasi acuan sistematika yang diminta) TIDAK PERNAH disebut di manapun dalam repo** (dicek dengan grep "12 Tahun 2015" ke seluruh backend/frontend di luar worktrees — nihil). Tidak ditemukan pula ketentuan turunan khusus Pemerintah Provinsi Maluku Utara terkait sistematika LAKIP (di `docs/`, `.governance/`, atau komentar kode) — **tidak ditemukan referensi regulasi tambahan di repo** untuk poin ini.

### Tabel Perbandingan

| Sistematika Wajib (Permenpan RB 12/2015) | Ada di PDF? | Ada di Word? | Catatan Gap |
|---|---|---|---|
| 1. Ikhtisar Eksekutif | ADA (salah urutan — setelah Bab I) | ADA (urutan benar) | PDF: `lakipGeneratorController.js:924` seharusnya dipindah ke sebelum blok Bab I (`:885`) |
| 2. Bab I Pendahuluan — Latar Belakang | Sebagian (implisit via Dasar Hukum/Maksud Tujuan, tanpa heading "Latar Belakang") | **TIDAK ADA** | PDF `:887-900`; DOCX Bab I sudah diganti isinya jadi konten Bab III |
| 2. Bab I Pendahuluan — Maksud dan Tujuan | ADA | **TIDAK ADA** | PDF `:895-900` |
| 2. Bab I Pendahuluan — Tugas dan Fungsi | **TIDAK ADA** (tidak ada heading terpisah) | **TIDAK ADA** | Tidak ditemukan string "Tugas dan Fungsi"/"Tusi" di `buildHtml()`/`buildDocxHtml()` |
| 2. Bab I Pendahuluan — Struktur Organisasi | **TIDAK ADA** (tidak ada heading/bagan terpisah) | **TIDAK ADA** | Sama sekali tidak ada representasi struktur organisasi (bagan/daftar jabatan) di kedua output |
| 2. Bab I Pendahuluan — Isu Strategis | ADA (dari Renstra Bab III) | **TIDAK ADA** | PDF `:912-920` |
| 3. Bab II Perencanaan Kinerja — Rencana Strategis (ringkas) | Sebagian (Visi/Misi ada tapi ditaruh di Ringkasan Eksekutif, bukan Bab II; Tujuan/Sasaran Renstra tidak diringkas ulang di Bab II) | **TIDAK ADA** | PDF `:986-990` (salah tempat); DOCX tidak ada Bab II sama sekali |
| 3. Bab II Perencanaan Kinerja — Perjanjian Kinerja | ADA (tabel Sasaran/Indikator/Satuan/Target) | **TIDAK ADA** | PDF `:1000-1012` |
| 4. Bab III Akuntabilitas Kinerja — Capaian Kinerja per Sasaran/Indikator | ADA | ADA (label "Bab II", flat tanpa hierarki) | PDF `:1018-1029`; DOCX `:193-215` |
| 4. Bab III Akuntabilitas Kinerja — Realisasi Anggaran | Sebagian (tabel ada, tapi salah tempat: di Ringkasan Eksekutif sebelum Bab II, bukan di dalam Bab III) | Sebagian (hanya 1 kalimat narasi, tanpa tabel) | PDF `:966-984`; DOCX `:181-182` |
| 4. Bab III Akuntabilitas Kinerja — Analisis Efisiensi | **TIDAK ADA** | **TIDAK ADA** | Tidak ditemukan logika/narasi efisiensi di `lakipAnalisaService.js` maupun template manapun |
| 5. Bab IV Penutup | ADA | ADA (label "Bab III") | PDF `:1056-1088`; DOCX `:228-243` |
| 6. Lampiran — Perjanjian Kinerja | **TIDAK ADA sebagai Lampiran** (ada sebagai dokumen terpisah, lihat `lakipPkExportController.js`) | **TIDAK ADA** | Tidak di-embed ke PDF/DOCX LAKIP utama |
| 6. Lampiran — Pengukuran Kinerja | **TIDAK ADA** (tidak ada tabel format baku Pengukuran Kinerja terpisah sebagai lampiran) | **TIDAK ADA** | — |
| 6. Lampiran — pendukung lain | **TIDAK ADA** | **TIDAK ADA** | — |
| *(tambahan, bukan wajib di 12/2015 tapi lazim & disyaratkan Permenpan 53/2014)* Kata Pengantar | **TIDAK ADA** | **TIDAK ADA** | — |
| *(tambahan)* Daftar Isi | **TIDAK ADA** | **TIDAK ADA** | — |
| *(tambahan)* Pernyataan Telah Direviu Inspektorat | **TIDAK ADA** | **TIDAK ADA** | — |

---

## TAHAP 4 — Kesimpulan

### Vonis kepatuhan terhadap Permenpan RB 12/2015

- **Output PDF: BELUM SESUAI.** Kerangka 4 Bab + Ikhtisar Eksekutif secara garis besar hadir, tapi: urutan Ikhtisar Eksekutif salah (ditaruh setelah Bab I, bukan sebelum), Bab I kehilangan 3 dari 5 subbagian baku (Latar Belakang, Tugas dan Fungsi, Struktur Organisasi eksplisit), Realisasi Anggaran salah ditempatkan (di luar Bab III), tidak ada Analisis Efisiensi, tidak ada Kata Pengantar/Daftar Isi/Pernyataan Telah Direviu, dan Lampiran Perjanjian Kinerja/Pengukuran Kinerja tidak digabung ke dokumen.
- **Output Word (.docx): BELUM SESUAI, dan levelnya JAUH LEBIH RENDAH dari PDF.** Bukan hanya kekurangan elemen tambahan (Kata Pengantar dll.) seperti PDF, tapi **kehilangan seluruh Bab I Pendahuluan dan seluruh Bab II Perencanaan Kinerja** — dua dari empat Bab wajib regulasi. Nomor Bab yang tersisa pun bergeser (Bab III Akuntabilitas Kinerja versi PDF menjadi "Bab I" di DOCX, Bab IV Penutup menjadi "Bab III"), sehingga jika dicetak langsung, dokumen DOCX secara sepintas terlihat seperti laporan kinerja versi ringkas/summary, bukan LKj lengkap sesuai format baku.

### Bagian yang hilang / salah urutan / tidak lengkap (ringkasan)

1. Ikhtisar Eksekutif salah urutan di PDF (setelah Bab I, seharusnya sebelum).
2. Bab I Pendahuluan tidak lengkap di PDF (tanpa Latar Belakang/Tugas Fungsi/Struktur Organisasi sebagai subbagian eksplisit) — dan hilang **total** di DOCX.
3. Bab II Perencanaan Kinerja tidak menyertakan ringkasan Renstra (Tujuan/Sasaran) di PDF, dan hilang **total** di DOCX.
4. Realisasi Anggaran tidak berada di dalam Bab III (baik PDF maupun DOCX) — saat ini muncul sebagai bagian Ringkasan Eksekutif/narasi, bukan subbagian Bab III Akuntabilitas Kinerja seperti dituntut regulasi.
5. Analisis Efisiensi tidak ada sama sekali, di kedua format.
6. Kata Pengantar, Daftar Isi, dan Pernyataan Telah Direviu tidak ada sama sekali, di kedua format.
7. Lampiran (Perjanjian Kinerja & Pengukuran Kinerja) tidak digabung ke dokumen LAKIP — dokumen PK memang sudah ada dan lengkap di sistem, tapi sebagai file terpisah yang harus diunduh manual dari halaman lain, bukan sebagai bagian akhir PDF/DOCX LAKIP.
8. Nomor & label Bab pada DOCX tidak konsisten dengan PDF (III→I, IV→III) — berisiko membingungkan pengguna yang membandingkan kedua format keluaran untuk dokumen resmi yang sama.
9. Data kolom `pagu_anggaran`/`realisasi_anggaran` pada tabel `lakip` (hasil sinkron `lakipRealisasiAnggaranSyncService.js`) **tidak pernah dirender** ke PDF maupun DOCX — baik `buildHtml()` maupun `buildDocxHtml()` mengambil ulang agregat anggaran dari query `dpa`+`penatausahaan` langsung (`lakipGeneratorController.js:192-203`), bukan dari kolom yang sudah disinkron per baris tersebut. Ini bukan gap sistematika Permenpan, tapi indikasi ada jalur sinkronisasi data yang hasilnya jadi *dead data* — perlu dicek apakah memang disengaja atau sisa refactor yang belum tuntas.

### Rekomendasi Perbaikan Konkret per File

**`backend\controllers\lakipGeneratorController.js`** (template PDF/preview, fungsi `buildHtml`, baris 392–1093):
- Pindahkan blok `<!-- RINGKASAN EKSEKUTIF -->` (saat ini baris 923-991) ke posisi **sebelum** blok `<!-- BAB I — PENDAHULUAN -->` (saat ini baris 884), tepat setelah Cover.
- Di dalam blok Bab I (`:885-921`), tambahkan subbagian baru sebelum "A. Dasar Hukum": heading "A. Latar Belakang" (bisa pakai teks sama dengan Maksud dan Tujuan sebagai starting point, lalu geser huruf subbagian lain jadi B/C/D/E/F), tambahkan heading "Tugas dan Fungsi" dan "Struktur Organisasi" — kalau datanya belum ada sumbernya di Renstra, tambah query serupa `gambaranUmumItem`/`isuStrategisItem` (pola sudah ada di `collectLakipData()` baris 205-230) yang menarik subbab Renstra Bab II lain (mis. butir 2.2/2.3 kalau memang berisi tusi/struktur organisasi), atau field baru di `OPD_CONFIG`.
- Di blok "BAB II — PERENCANAAN KINERJA" (`:993-1013`), tambahkan subbagian "Rencana Strategis" berisi ringkasan Tujuan+Sasaran (data `tujuan`/`sasaran` sudah tersedia di `data`, tinggal render sebelum tabel Perjanjian Kinerja).
- Pindahkan tabel & bar "Realisasi Anggaran" (saat ini `:966-984`, di dalam blok Ringkasan Eksekutif) ke dalam blok "BAB III — AKUNTABILITAS KINERJA" (`:1015-1052`), sebagai subbagian baru misalnya "C. Realisasi Anggaran" setelah "B. Rincian Realisasi Program dan Kegiatan".
- Tambahkan subbagian baru "D. Analisis Efisiensi" di Bab III — bisa memakai logika sederhana (mis. bandingkan % capaian kinerja vs % serapan anggaran per indikator/program, konsisten dengan pola non-template di `lakipAnalisaService.js`).
- Tambahkan halaman baru "Kata Pengantar" (setelah Cover) dan "Daftar Isi" (setelah Kata Pengantar, sebelum Ringkasan Eksekutif) sebagai blok `<div class="page page-break">` baru mengikuti pola cover yang sudah ada.
- Tambahkan halaman "Pernyataan Telah Direviu" — perlu keputusan produk apakah field ini diisi manual (field baru di form) atau tetap kosong/placeholder untuk ditandatangani manual di luar sistem.
- Tambahkan halaman Lampiran di akhir dokumen (setelah blok Bab IV, `:1088`) yang merender ulang isi Perjanjian Kinerja (bisa import fungsi `buildPkHtml` dari `lakipPkExportService.js` dan sisipkan sebagai halaman tambahan, atau minimal tabel "Pengukuran Kinerja" ringkas dari data `indikator`/`indikatorTree` yang sudah tersedia di `data`).

**`backend\controllers\lakipExportController.js`** (template DOCX, fungsi `buildDocxHtml`, baris 116–246):
- Ini gap paling besar. Pertimbangkan mengganti pendekatan: alih-alih membangun ulang HTML sederhana dari nol, **reuse langsung `buildHtml()` dari `lakipGeneratorController.js`** (sama seperti `exportPdf` melakukannya via `getHtml()`, baris 17-29) lalu jalankan lewat `html-to-docx`, supaya sistematika PDF dan DOCX otomatis konsisten dan tidak perlu dipelihara dua kali. Jika reuse penuh tidak memungkinkan secara teknis (mis. CSS grid/flexbox `buildHtml()` tidak didukung `html-to-docx`), minimal tambahkan ke `buildDocxHtml()`:
  - Blok "BAB I — PENDAHULUAN" (Dasar Hukum, Maksud Tujuan, Gambaran Umum Organisasi, Isu Strategis) sebelum blok "BAB I — SASARAN STRATEGIS..." saat ini (`:193`), lalu naikkan penomoran bab-bab berikutnya (Sasaran Strategis jadi Bab II bagian dari Bab III Akuntabilitas Kinerja, dst. — samakan penomoran dengan PDF).
  - Blok "BAB II — PERENCANAAN KINERJA" berisi tabel Perjanjian Kinerja (ambil dari `data.indikatorTree`, pola sama seperti `perjanjianKinerjaRows()` di `lakipGeneratorController.js:437-459`).
  - Perbaiki penomoran Bab agar sama persis dengan PDF (saat ini "BAB I"→harusnya "BAB III", "BAB II"→harusnya "BAB III lanjutan", "BAB III"→harusnya "BAB IV").
  - Tambahkan tabel Realisasi Anggaran (bukan cuma narasi) ke dalam bagian Akuntabilitas Kinerja.

**`backend\services\lakipAnalisaService.js`**:
- Tambahkan fungsi baru (mis. `analisaEfisiensi()`) yang membandingkan rasio capaian kinerja terhadap rasio serapan anggaran, dipanggil dari `lakipGeneratorController.js` saat membangun data Bab III.

**`backend\services\lakipRealisasiAnggaranSyncService.js`** dan **`lakipGeneratorController.js`**:
- Selaraskan: baik pakai kolom `lakip.pagu_anggaran`/`realisasi_anggaran` yang sudah disinkron per baris (lebih presisi per indikator/kegiatan), baik untuk render tabel per-baris di Bab III bagian B "Rincian Realisasi Program dan Kegiatan", atau secara sadar dokumentasikan bahwa kolom tersebut memang tidak dipakai untuk render (kalau begitu, agregat `dpa`+`penatausahaan` langsung sudah cukup dan kolom sync bisa dipertimbangkan untuk dihapus/didokumentasikan sebagai data internal saja).

**Umum (kedua template)**:
- Pertimbangkan menambah rujukan eksplisit ke Permenpan RB Nomor 12 Tahun 2015 di paragraf "Dasar Hukum" (`lakipGeneratorController.js:887-894`), karena saat ini hanya Perpres 29/2014 dan Permenpan 53/2014 yang disebut — regulasi acuan sistematika laporan (12/2015) sendiri tidak pernah dikutip di dokumen yang dihasilkan.

---

## Ringkasan File Kode yang Relevan (path lengkap)

- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipGeneratorController.js`
- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipExportController.js`
- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipController.js`
- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipPkController.js`
- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipPkExportController.js`
- `e:\1-MyApp\React\ePeLARA\backend\controllers\lakipRealisasiAnggaranController.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipAnalisaService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipAutoGenerateService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipBridgeService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipPkService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipPkExportService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipPkDocxService.js`
- `e:\1-MyApp\React\ePeLARA\backend\services\lakipRealisasiAnggaranSyncService.js`
- `e:\1-MyApp\React\ePeLARA\backend\models\lakipModel.js`
- `e:\1-MyApp\React\ePeLARA\backend\models\lakipPkModel.js`
- `e:\1-MyApp\React\ePeLARA\backend\models\lakipPkOutputSasaranModel.js`
- `e:\1-MyApp\React\ePeLARA\backend\models\lakipPkProgramAnggaranModel.js`
- `e:\1-MyApp\React\ePeLARA\backend\routes\lakipRoutes.js`
- `e:\1-MyApp\React\ePeLARA\backend\routes\lakipGeneratorRoutes.js`
- `e:\1-MyApp\React\ePeLARA\backend\routes\lakipPkRoutes.js`
- `e:\1-MyApp\React\ePeLARA\backend\routes\lakipRealisasiAnggaranRoutes.js`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\pages\LAKIPDashboard.jsx`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\pages\LakipPkFormPage.jsx`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\components\LakipGeneratorPanel.jsx`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\services\lakipApi.js`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\services\lakipPkApi.js`
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\pages\LakipListPage.jsx` *(tidak dirouting — legacy)*
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\pages\LakipPrintView.jsx` *(stub, tidak dirouting)*
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\components\LakipForm.jsx` *(tidak dirouting — legacy)*
- `e:\1-MyApp\React\ePeLARA\frontend\src\features\lakip\components\LakipTable.jsx` *(tidak dirouting — legacy)*

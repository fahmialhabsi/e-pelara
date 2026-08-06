# Fase 10 — Investigasi "Aksi Input Data Renstra" vs "Input Tabel Renstra"

**Sifat:** Investigasi murni. **Tidak ada kode/data yang diubah** (dikonfirmasi `renstra_tabel_subkegiatan` tetap 0 baris di akhir investigasi).

**Kesimpulan langsung (detail lengkap di §1-6):** **Dugaan Anda BENAR, dan dibuktikan dengan bukti yang lebih kuat dari yang diduga.** "Tabel Sub Kegiatan" (bagian 2) memang jalur yang **tidak dipakai** operator sehari-hari untuk data target/pagu — tapi bukan karena digantikan langsung oleh "Sub Kegiatan" (bagian 1, tombol utama). Yang sebenarnya terjadi: **"Sub Kegiatan" (bagian 1) cuma mendaftarkan IDENTITAS** Sub Kegiatan (kode, nama, OPD — tanpa angka), sedangkan **angka target+pagu-nya ternyata dimasukkan lewat form "Indikator Sub Kegiatan"** (submenu dropdown "Indikator" di bagian 1 juga) — form itu **langsung menulis `pagu_tahun_1..5` dan `target_tahun_1..5` ke tabel `indikator_renstra`**, BUKAN ke `renstra_tabel_subkegiatan`. Dicek langsung ke database: **84/84 baris `indikator_renstra` stage `sub_kegiatan` untuk Renstra aktif SUDAH TERISI pagu > 0**, sementara `renstra_tabel_subkegiatan` (yang coba disambungkan Fase 6-9) **tetap 0 baris**. Jalur nyata yang dipakai operator BUKAN yang diasumsikan sepanjang Fase 4-9.

---

## 1 & 2. Kedua jalur di frontend + target tabel backend — TERNYATA ADA 3 FORM, BUKAN 2

| Tombol UI | Komponen | Endpoint submit | Tabel tujuan | Isi field |
|---|---|---|---|---|
| **"Sub Kegiatan"** (bagian 1, tombol utama, `/renstra/subkegiatan/add`) | `SubkegiatanRenstraForm.jsx` | `POST/PUT /renstra-subkegiatan` | **`renstra_subkegiatan`** (tabel master/identitas) | Kegiatan (dropdown), Sub Kegiatan (dropdown, pilih dari master RPJMD/SIPD), Kode & Nama Sub Kegiatan (readonly, auto-isi), Nama OPD, Bidang OPD, Sub Bidang OPD. **TIDAK ADA field angka target/pagu/realisasi sama sekali** — ada teks eksplisit di form: *"Pagu dihitung otomatis dari subkegiatan"* |
| **"Indikator" → "Indikator Sub Kegiatan"** (bagian 1, submenu dropdown, `/renstra/indikator/subkegiatan/add`) | `IndikatorSubKegiatanRenstraForm.jsx` | `POST/PUT /indikator-renstra` (`stage: 'sub_kegiatan'`) | **`indikator_renstra`** | Sub Kegiatan Renstra (dropdown, pilih dari hasil form "Sub Kegiatan" di atas), Kode & Nama Indikator, Satuan, Baseline, **Target Per Tahun (Th.1-5)**, Definisi Operasional, Metode Penghitungan, Sumber Data, Penanggung Jawab, **DAN blok "Pagu Indikatif Per Tahun (Rp)" — `pagu_tahun_1..5`, lengkap dengan kalkulator "Total Pagu Indikatif" live di form** |
| **"Tabel Sub Kegiatan"** (bagian 2, `/renstra/tabel/subkegiatan/add`) | `RenstraTabelSubKegiatanForm.jsx` (dibaca di Fase 6) | `POST/PUT /renstra-tabel-subkegiatan` | **`renstra_tabel_subkegiatan`** | Indikator (dropdown, wajib pilih `IndikatorRenstra` stage sub_kegiatan), `target_tahun_1..6`, `pagu_tahun_1..6` — **field yang SAMA ISINYA (target+pagu 5-6 tahun) dengan form "Indikator Sub Kegiatan" di atas, cuma di tabel BEDA** |

**Jawaban Q1/Q2:** Bukan 2 form yang beda, tapi **3 form** — dan **"Indikator Sub Kegiatan" (bagian 1) vs "Tabel Sub Kegiatan" (bagian 2) itulah yang sebenarnya SALING TUMPANG TINDIH fungsinya** (keduanya sama-sama menangkap target+pagu multi-tahun untuk 1 Sub Kegiatan indikator) — bukan "Sub Kegiatan" vs "Tabel Sub Kegiatan" seperti dugaan awal pertanyaan (itu 2 form yang memang beda tujuan: identitas vs data). Duplikasi fungsional yang sesungguhnya ada di 2 tabel `indikator_renstra.pagu_tahun_N` vs `renstra_tabel_subkegiatan.pagu_tahun_N`.

---

## 3. Status pemakaian nyata — dicek langsung ke database (renstra_id=1, Renstra aktif 2025-2029)

```sql
SELECT stage, COUNT(*) total,
  SUM(pagu_tahun_1 IS NOT NULL AND pagu_tahun_1 > 0) has_pagu1,
  SUM(target_tahun_1 IS NOT NULL AND target_tahun_1 <> 0) has_target1
FROM indikator_renstra WHERE renstra_id=1 GROUP BY stage;
```

| stage | total baris | ada pagu_tahun_1 > 0 | ada target_tahun_1 |
|---|---|---|---|
| `sub_kegiatan` | 84 | **84 (100%)** | **84 (100%)** |
| `kegiatan` | 16 | **16 (100%)** | 16 (100%) |
| `program` | 5 | **5 (100%)** | 5 (100%) |
| `sasaran` | 6 | 0 | 5 |
| `tujuan` | 2 | 0 | 1 |
| `iku` | 2 | 0 (kolom tidak relevan di level ini) | 2 |
| `ikk` | 6 | 0 | 6 |

vs.

```sql
SELECT COUNT(*) FROM renstra_tabel_subkegiatan;  -- hasil: 0 (dikonfirmasi ulang, sama seperti Fase 4-9)
```

**Bukti tak terbantahkan: `indikator_renstra.pagu_tahun_N` untuk level `sub_kegiatan`, `kegiatan`, DAN `program` 100% terisi data nyata (bukan nol/kosong), sementara `renstra_tabel_subkegiatan` yang menjadi fokus perbaikan Fase 6-9 tetap 100% kosong.** Ini membuktikan operator SUDAH mengisi data Renstra secara aktif — cuma lewat jalur `indikator_renstra` (form "Indikator ..." di bagian 1), bukan lewat "Input Tabel Renstra" (bagian 2).

**Catatan penting: `indikator_renstra` TIDAK punya kolom `realisasi_tahun_N`** (dicek skema-nya di Fase 8 — cuma `target_tahun_N`, `pagu_tahun_N`, tidak ada realisasi). Jadi jalur ini cuma menjawab separuh masalah (PAGU/rencana terbukti terisi), REALISASI tetap tidak ada sumber live yang terbukti terisi di level indikator manapun — konsisten dengan kenapa `buildHtml()` (Fase 1-3) tetap andalkan agregat `dpa`+`penatausahaan` langsung untuk realisasi, bukan salah satu dari kedua jalur Renstra ini.

---

## 4. Dropdown "Indikator" — kenapa bentuknya beda, dan indikator diinput di mana

Dropdown "Indikator" (bukan tombol tunggal) berisi 10 submenu: Semua Indikator, Indikator Tujuan/Sasaran/Strategi/Kebijakan/Program/Kegiatan/Sub Kegiatan, IKU, IKK. **Ini bukan "pilih indikator yang sudah ada" — tiap submenu adalah TITIK MASUK BUAT ENTITAS berbeda di tabel `indikator_renstra` yang sama, dibedakan oleh kolom `stage`.** Alasan bentuknya dropdown: karena "Indikator" bukan 1 jenis entitas seperti Tujuan/Sasaran/dst di sampingnya — indikator ADA DI SETIAP LEVEL hierarki (1 Tujuan bisa punya indikator Tujuan, 1 Sub Kegiatan bisa punya indikator Sub Kegiatan, dst.), jadi butuh submenu per level, bukan 1 tombol.

**Alur kerja 2 langkah yang tersirat dari struktur form** (dikonfirmasi lewat isi form `IndikatorSubKegiatanRenstraForm.jsx`, yang field pertamanya adalah dropdown "Sub Kegiatan Renstra" — mengambil opsi dari `GET /renstra-subkegiatan`):
1. **Langkah 1 — daftarkan entitas dulu** lewat tombol utama di bagian 1 (mis. "Sub Kegiatan" → isi `renstra_subkegiatan`, identitas saja).
2. **Langkah 2 — lekatkan indikator (+ target & pagu) ke entitas itu** lewat dropdown "Indikator" → pilih level yang sesuai (mis. "Indikator Sub Kegiatan") → form-nya punya dropdown untuk MEMILIH entitas yang sudah didaftarkan di Langkah 1, baru isi kode/nama indikator + angka.

Jadi jawaban Q4: benar, dropdown "Indikator" fungsinya beda dari tombol Tujuan/Sasaran/dst — bukan untuk "pilih indikator yang sudah ada" (tidak ada indikator "siap pakai" dari sumber lain), tapi untuk **membuat indikator baru yang DILEKATKAN ke entitas yang sudah dibuat di langkah 1**, dan form pembuatannya sendiri yang punya dropdown "pilih entitas induk".

---

## 5. Riwayat git — bukti tambahan yang memperkuat kesimpulan

| File | Commit terakhir | Total commit |
|---|---|---|
| `SubkegiatanRenstraForm.jsx` (bagian 1, "Sub Kegiatan") | **Tidak tercatat di git sama sekali** (`git ls-files` kosong — file baru, belum pernah di-commit) | 0 |
| `IndikatorSubKegiatanRenstraForm.jsx` (bagian 1, "Indikator Sub Kegiatan") | `6649ccd9` — *"feat: modul LAKIP PK & IKM, penyempurnaan MR/TLHP, dan **sumber data tabel + cascading Renstra**"* | 4 |
| `RenstraTabelSubKegiatanForm.jsx` (bagian 2, "Tabel Sub Kegiatan") | `8ba2bedf` — *"feat: Modul Renja - dashboard, form, auto-generate BAB I-V, tabel Word"* (tidak spesifik soal form ini) | 6 |
| `renstra_tabelSubKegiatanModel.js` (skema `renstra_tabel_subkegiatan`) | `7cc31216` — commit yang SAMA dengan investigasi Fase 4 (fitur realisasi-anggaran LAKIP) | 4 |

**Tidak ditemukan 1 commit pun yang secara eksplisit bilang "menggantikan"/"deprecate" salah satu jalur** — tidak ada pesan commit seperti "hapus Tabel Sub Kegiatan lama" atau semacamnya. Tapi pola commit-nya konsisten dengan kesimpulan di atas: `SubkegiatanRenstraForm.jsx` (bagian 1) bahkan **belum pernah di-commit** (paling baru dari semuanya, kemungkinan sedang aktif dikembangkan/baru selesai), `IndikatorSubKegiatanRenstraForm.jsx` terakhir disentuh di commit yang judulnya eksplisit menyebut *"sumber data tabel + cascading Renstra"* (mengindikasikan pekerjaan aktif terkait alur data), sementara `renstra_tabel_subkegiatan` (backend-nya "Tabel Sub Kegiatan") terakhir disentuh cuma sebagai bagian dari fitur LAKIP (Fase 4's commit `7cc31216`) — bukan dari sisi pengembangan form Renstra-nya sendiri sejak saat itu.

**Kesimpulan Q5:** kedua jalur **tidak dirancang eksplisit untuk saling menggantikan** (tidak ada dokumentasi/commit yang bilang begitu) — tapi pola pengembangan & isi data nyata menunjukkan **bagian 1 ("Sub Kegiatan" + "Indikator Sub Kegiatan") adalah jalur yang aktif dipakai & dikembangkan**, sedangkan "Tabel Sub Kegiatan" (bagian 2) **berhenti dipakai** meski tombolnya masih ada di UI (classic UI-tidak-dibersihkan-setelah-alur-kerja-berpindah, bukan sengaja dipertahankan untuk tujuan berbeda).

---

## 6. Kesimpulan akhir & implikasi untuk Fase 4-9

**Jawaban langsung ke pertanyaan Anda:** "Tabel Sub Kegiatan" (bagian 2) **adalah jalur mati/legacy** — bukan by design untuk tujuan berbeda yang sama-sama perlu diisi. Operator sehari-hari sudah pindah ke alur bagian 1 ("Sub Kegiatan" untuk identitas, lalu "Indikator Sub Kegiatan" untuk target+pagu), dibuktikan data nyata (84/84 baris terisi pagu di `indikator_renstra`, 0 baris di `renstra_tabel_subkegiatan`).

**Implikasi penting untuk pekerjaan Fase 4-9 (dicatat jujur, bukan untuk dikerjakan sekarang):** Seluruh investigasi & perbaikan Fase 4-9 berasumsi `renstra_tabel_subkegiatan` adalah sumber data pagu/target yang BENAR tapi kosong (tinggal diisi). Temuan Fase 10 ini menunjukkan asumsi itu **kemungkinan salah sasaran** — sumber data pagu yang SEBENARNYA sudah diisi operator ada di `indikator_renstra.pagu_tahun_N`/`target_tahun_N` langsung (level `sub_kegiatan`, `kegiatan`, `program` semua 100% terisi). Kalau tujuan akhirnya memang mau menyalakan `lakip.pagu_anggaran`/`realisasi_anggaran` dengan data Renstra yang REALISTIS ada isinya, `lakipRealisasiAnggaranSyncService.js` (hasil Fase 7/9) kemungkinan perlu **dirancang ulang untuk baca `IndikatorRenstra.pagu_tahun_N` LANGSUNG** (dari `ir` yang sudah didapat lewat pencocokan nama — tidak perlu lompat ke `RenstraTabelSubkegiatan` sama sekali untuk sisi PAGU), bukan diarahkan ke `renstra_tabel_subkegiatan` yang ternyata memang tidak dipakai siapa pun. Sisi REALISASI tetap terbuka masalahnya (tidak ada kolom realisasi di `indikator_renstra`) — kemungkinan tetap perlu agregat `dpa`+`penatausahaan` langsung (pola yang sama seperti `buildHtml()`), bukan dari `renstra_tabel_subkegiatan.realisasi_tahun_N` yang juga sama-sama tidak pernah terisi.

**Ini murni temuan/rekomendasi untuk dipertimbangkan** — sesuai instruksi Fase 10, tidak ada kode yang diubah di sini. Keputusan mau ditindaklanjuti (mis. "Fase 11" merancang ulang sumber data sync) sepenuhnya di tangan Anda.

---

## File yang dibaca (investigasi murni, tidak ada yang diubah)

- `frontend/src/features/renstra/pages/RenstraSidebar.jsx` (struktur menu, sumber ke-2 bagian)
- `frontend/src/features/renstra/subkegiatan/pages/subkegiatanRenstraAddPage.jsx`, `components/SubkegiatanRenstraForm.jsx`, `hooks/templatesUseRenstra/useSubkegiatanRenstraForm.js`
- `frontend/src/features/renstra/indikator/subkegiatan/components/IndikatorSubKegiatanRenstraForm.jsx`
- `frontend/src/features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm.jsx` (state Fase 6)
- `frontend/src/routes/renstraRoutes.jsx`, `frontend/src/config/routes.jsx`, `frontend/src/App.jsx` (verifikasi kedua route file live)
- `backend/models/renstra_tabelSubKegiatanModel.js` (state Fase 8/9)
- `git log --oneline --follow` untuk 4 file kunci
- Query read-only ke `indikator_renstra` (per `stage`) dan `renstra_tabel_subkegiatan` (tidak ada `INSERT`/`UPDATE`, dikonfirmasi `renstra_tabel_subkegiatan` tetap 0 baris di akhir investigasi — sama seperti kondisi akhir Fase 9)

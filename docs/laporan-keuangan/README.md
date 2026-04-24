# Modul Laporan Keuangan OPD — e-PELARA

Panduan ringkas operasional modul LK (BAS, BKU, snapshot laporan, CALK, PDF resmi).

## Cara penggunaan (alur kerja lengkap)

### Langkah 1: Data awal (sekali / awal tahun)

- Pastikan **kode akun BAS** sudah ter-seed (`kode_akun_bas`).
- Input **aset tetap** di `/lk/aset-tetap` (sesuai KIB/inventaris).
- Input **persediaan** awal di `/lk/persediaan` (jika relevan).
- Input **kewajiban** di `/lk/kewajiban` (jika ada).

### Langkah 2: Sepanjang tahun (per transaksi)

- Input **BKU** di `/lk/bku` (UP/GU/TUP, LS gaji/barang, dll.) atau **sinkron dari SIGAP** (`/lk/dashboard` atau endpoint `POST /api/bku/sync-sigap`).
- Posting **jurnal** bila menggunakan alur jurnal manual (`/lk/jurnal`).

### Langkah 3: Akhir tahun

- Jalankan **penyusutan** di `/lk/penyusutan` → **Proses** (sebelum LO/LPE final).
- **Generate LRA**: `/lk/lra`.
- **Generate Neraca**: `/lk/neraca`.
- **Generate LO**: `/lk/lo`.
- **Generate LPE**: `/lk/lpe` (periksa validasi ekuitas vs neraca).
- **Generate LAK**: `/lk/lak` (saldo akhir harus cocok dengan BKU Desember).

### Langkah 4: CALK

- Buka `/lk/calk` → **Generate semua bab**.
- Edit bab **TEKS** secara manual bila perlu.
- **Tandai FINAL** setiap bab wajib (semua bab `wajib=true` harus FINAL sebelum PDF).

### Langkah 5: Dokumen resmi (PDF)

- Buka `/lk/generator`.
- Pastikan **validasi** (neraca balance, LPE vs neraca, LRA belanja vs BKU belanja, LAK vs BKU, CALK wajib FINAL) semua hijau.
- Klik **Generate PDF** → unduh dari riwayat atau **Unduh PDF terbaru**.
- Opsional: **Finalisasi LK** (role PPK-SKPD / SUPER_ADMIN) mengunci snapshot LRA, Neraca, LO, LPE, LAK.

## Catatan penting

- Aset tetap harus selaras dengan inventaris fisik.
- Penyusutan mempengaruhi LO/LPE; jalankan sebelum mengunci laporan.
- Bab CALK bertipe **TEKS** membutuhkan pengeditan manual setelah generate.
- PDF dihasilkan dengan **Puppeteer** (Chromium). Di server tanpa dependensi browser, install Chromium atau set `PUPPETEER_EXECUTABLE_PATH` sesuai dokumentasi Puppeteer.

## Tautan terkait

- [API.md](./API.md) — daftar endpoint LK.
- [ERD.md](./ERD.md) — tabel utama modul LK.
- [TROUBLESHOOT.md](./TROUBLESHOOT.md) — masalah umum.

## Uji akhir (E2E)

Skenario lengkap (UP → pengeluaran → generate LRA/Neraca/LO/LPE/LAK → CALK FINAL → PDF) **harus dijalankan di lingkungan dengan database terisi** (data uji nyata). Otomatisasi penuh bergantung pada seed DPA/BKU/jurnal; dokumentasikan hasil aktual (nilai rupiah, balance) di laporan QA proyek Anda.

## Akses per role (e-PELARA)

| Fungsi | Role yang diizinkan (middleware) |
|--------|-----------------------------------|
| Baca LK, validasi, unduh PDF, preview HTML | SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA |
| Tulis BKU, generate snapshot, generate PDF | SUPER_ADMIN, ADMINISTRATOR, PENGAWAS |
| Kunci LRA/Neraca/LO/LPE/LAK, Finalisasi LK | SUPER_ADMIN, PPK-SKPD, PPK_SKPD |

Jika role **BENDAHARA** belum dipetakan di JWT, gunakan **ADMINISTRATOR** untuk input BKU dan generate; sesuaikan `allowRoles` bila role baru ditambahkan.

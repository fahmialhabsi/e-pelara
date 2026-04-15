# Troubleshooting Modul Laporan Keuangan

## Neraca tidak balance

- Jalankan ulang **Generate Neraca** setelah data aset/kewajiban/ekuitas konsisten.
- Periksa jurnal penyusutan dan mutasi aset.
- Lihat `/lpe/:tahun/validasi` untuk ringkasan agregat.

## Ekuitas LPE ≠ Neraca

- Generate ulang **LPE** setelah **LO** dan **Neraca** mutakhir.
- Isi koreksi manual di payload generate LPE jika diperlukan (persediaan, aset tetap, dll.).

## Saldo LAK ≠ Saldo BKU

- Pastikan BKU bulan **12** ada dan `status_validasi` VALID/BELUM.
- Generate ulang **LAK** dari menu LAK.
- Periksa klasifikasi jenis transaksi BKU (UP, LS_GAJI, LS_BARANG, dll.).

## Total belanja LRA ≠ BKU (belanja)

- Pastikan kode akun BKU terhubung ke BAS dengan `jenis = BELANJA`.
- Generate ulang LRA setelah BKU lengkap.

## Validasi PDF gagal — bab CALK belum FINAL

- Buka `/lk/calk`, tandai **FINAL** semua bab bertanda wajib.
- Seed template: jalankan seeder `calk_template` jika tabel kosong.

## PDF error / Puppeteer gagal

- **Gejala:** `503` atau error "Chrome/Chromium".
- **Solusi:** Di server Linux gunakan `apt` untuk dependensi Chromium atau set executable:
  - Variabel lingkungan `PUPPETEER_EXECUTABLE_PATH` ke binary Chrome/Chromium.
- Alternatif kode: modul sudah memakai `pdfkit` / `pdfmake` di `package.json` tetapi **generator LK resmi memakai Puppeteer**; mengganti mesin render memerlukan pengembangan tambahan.

## Tabel `lk_pdf_riwayat` tidak ada

- Jalankan migrasi: `20260408230000-create-lk-pdf-riwayat.js`.

## Unduh PDF 404

- Pastikan file masih ada di `backend/storage/lk-pdf/`.
- Gunakan `?latest=1` hanya jika sudah pernah generate sukses.

## Preview HTML kosong / error

- Pastikan snapshot LRA/Neraca minimal ada; jika tidak, bagian tabel akan kosong tetapi halaman tetap dirender.

## Role tidak bisa finalisasi / kunci

- Finalisasi memakai role **PPK-SKPD** / **SUPER_ADMIN** (normalisasi `PPK-SKPD` → `PPK_SKPD` di middleware).
- Sesuaikan JWT role atau `allowRoles` di `lkAccountingRoutes.js` jika struktur organisasi berbeda.

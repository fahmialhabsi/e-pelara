# Checklist akhir modul LK (Tahap 10.4)

Centang setelah verifikasi di lingkungan Anda. Item teknis bergantung pada data dan migrasi yang sudah dijalankan.

## Fondasi (Tahap 1)

- [ ] `kode_akun_bas` ter-seed
- [ ] Jurnal umum + detail berfungsi
- [ ] `saldo_akun` ter-update saat posting
- [ ] Validasi balance jurnal aktif

## BKU (Tahap 2)

- [ ] Input BKU manual
- [ ] Jurnal otomatis (alur terkait) / sync SPJ
- [ ] Endpoint sync SIGAP tersedia
- [ ] Saldo running balance konsisten

## LRA (Tahap 3)

- [ ] Generate dari BKU + DPA
- [ ] Cross-check / peringatan selisih
- [ ] Kunci LRA
- [ ] UI persentase warna

## Neraca (Tahap 4)

- [ ] Aset tetap & penyusutan
- [ ] Generate neraca
- [ ] Neraca balance

## LO + LPE (Tahap 5)

- [ ] Generate LO
- [ ] Generate LPE
- [ ] Ekuitas akhir LPE ≈ neraca

## LAK (Tahap 6)

- [ ] Generate LAK dari BKU
- [ ] Saldo akhir LAK = BKU
- [ ] Format kurung pengeluaran di UI

## CALK (Tahap 7)

- [ ] Template ter-seed
- [ ] Generate semua bab
- [ ] Editor & DRAFT/FINAL

## Dashboard (Tahap 8)

- [ ] Dashboard LK
- [ ] Link SIGAP (env)
- [ ] Grafik bulanan BKU

## Generator PDF (Tahap 9)

- [ ] `GET /lk/:tahun/validasi`
- [ ] Validasi memblokir generate jika gagal
- [ ] `POST /lk/:tahun/generate-pdf` sukses (Puppeteer + Chromium)
- [ ] Footer nomor halaman
- [ ] Isi: judul, LRA, neraca, LO, LPE, LAK, CALK

## Uji akhir

- [ ] Skenario E2E 10 langkah (data uji nyata)
- [ ] Akses role sesuai kebijakan OPD

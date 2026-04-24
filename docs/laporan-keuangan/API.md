# API Modul Laporan Keuangan

Semua path di bawah ini relatif terhadap base **`/api`** (lihat `server.js` → `app.use("/api", lkAccountingRoutes)`).

## Autentikasi

Header: `Authorization: Bearer <token>`  
Atau query `?_token=` untuk tab baru (preview HTML / unduh PDF).

## Kode akun & saldo

| Metode | Path | Keterangan |
|--------|------|------------|
| GET | `/kode-akun` | Daftar BAS |
| GET | `/kode-akun/tree` | Pohon akun |
| GET | `/kode-akun/detail` | Detail per kode |
| GET | `/kode-akun/saldo` | Saldo referensi |
| GET | `/saldo-akun/:tahun` | Saldo tahun |
| GET | `/saldo-akun/:tahun/:bulan` | Saldo per bulan |
| POST | `/saldo-akun/recalculate/:tahun` | Hitung ulang saldo |

## Jurnal

| Metode | Path |
|--------|------|
| GET | `/jurnal` |
| POST | `/jurnal` |
| GET | `/jurnal/:id` |
| PUT | `/jurnal/:id` |
| POST | `/jurnal/:id/post` |
| POST | `/jurnal/:id/void` |

## BKU

| Metode | Path |
|--------|------|
| GET | `/bku` |
| POST | `/bku` |
| GET | `/bku/:id` |
| PUT | `/bku/:id` |
| POST | `/bku/sync-sigap` |
| GET | `/bku/ringkasan/:tahun/:bulan` |
| … | (lihat `lkAccountingRoutes.js`) |

## LRA, Neraca, LO, LPE, Penyusutan

| Metode | Path |
|--------|------|
| GET | `/lra/:tahun` |
| POST | `/lra/:tahun/generate` |
| POST | `/lra/:tahun/kunci` |
| GET | `/lra/:tahun/crosscheck` |
| GET | `/neraca/:tahun` |
| POST | `/neraca/:tahun/generate` |
| POST | `/neraca/:tahun/kunci` |
| GET | `/lo/:tahun` |
| POST | `/lo/:tahun/generate` |
| POST | `/lo/:tahun/kunci` |
| GET | `/lpe/:tahun` |
| GET | `/lpe/:tahun/validasi` |
| POST | `/lpe/:tahun/generate` |
| POST | `/lpe/:tahun/kunci` |
| GET/POST | `/penyusutan/:tahun/preview` \| `/proses` |

## LAK

| Metode | Path |
|--------|------|
| GET | `/lak/:tahun` |
| POST | `/lak/:tahun/generate` |
| GET | `/lak/:tahun/validasi` |
| GET | `/lak/:tahun/export` |
| POST | `/lak/:tahun/kunci` |

## CALK

| Metode | Path |
|--------|------|
| GET | `/calk/:tahun` |
| GET | `/calk/:tahun/status` |
| GET | `/calk/:tahun/preview` |
| POST | `/calk/:tahun/generate-all` |
| GET | `/calk/:tahun/:template_id` |
| PUT | `/calk/:tahun/:template_id` |
| POST | `/calk/:tahun/bab/:template_id/refresh-data` |

## Dashboard & sinkron

| Metode | Path |
|--------|------|
| GET | `/lk/dashboard/:tahun` |
| POST | `/lk/sync-kinerja` |

## Generator PDF & finalisasi (Tahap 9)

| Metode | Path | Keterangan |
|--------|------|------------|
| GET | `/lk/:tahun/validasi` | Validasi gabungan sebelum PDF / finalisasi |
| POST | `/lk/:tahun/generate-pdf` | Generate PDF (gagal jika validasi tidak lolos) |
| GET | `/lk/:tahun/download-pdf?id=` atau `?latest=1` | Unduh PDF |
| GET | `/lk/:tahun/riwayat-generate` | Riwayat file |
| GET | `/lk/:tahun/preview-html` | HTML penuh (browser) |
| POST | `/lk/:tahun/finalisasi` | Kunci LRA, Neraca, LO, LPE, LAK (butuh validasi lolos) |

Untuk daftar lengkap satu per satu, buka `backend/routes/lkAccountingRoutes.js`.

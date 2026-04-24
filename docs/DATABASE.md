# Database ePeLARA

Dokumen ini membantu mencegah masalah **beda instance MySQL / skema tidak selaras dengan model Sequelize** (misalnya error `Unknown column`, login gagal padahal password benar).

## Satu lingkungan, satu database

- Satu proses backend harus mengarah ke **satu** kombinasi: `host` + `port` + `database`.
- Mengganti **port** (misalnya 3306 ↔ 3307) sering berarti **instance atau salinan DB lain**; data dan **versi skema** bisa berbeda.
- Setelah mengganti koneksi, selalu **verifikasi skema** (lihat bawah).

## Konfigurasi

- Kredensial utama: `backend/config/config.json` (environment `development`, `test`, atau `production` sesuai `NODE_ENV`).
- Pastikan **password** MySQL di `config.json` sesuai instalasi lokal Anda.
- Untuk tim: pertimbangkan menyalin nilai sensitif ke `.env` dan membaca dari situ (refactor terpisah); yang penting **satu sumber** yang jelas.

## Skema mengikuti kode

Setelah `git pull` atau menambah model/migrasi:

```bash
cd backend
npx sequelize-cli db:migrate
```

Jika migrasi penuh terblokir oleh migrasi lama, minimal pastikan kolom fitur baru ada. Untuk kolom **reset password** pada `users`:

```bash
npm run db:ensure-reset-cols
```

## Cek cepat: skema vs ekspektasi aplikasi

Dari folder `backend`:

```bash
npm run check:db-schema
```

- Keluar kode **0** jika tabel/kolom wajib terdeteksi.
- Keluar kode **1** jika ada yang kurang — jalankan `db:migrate` dan/atau `db:ensure-reset-cols`, lalu ulangi cek.

Disarankan menjalankan perintah ini **setelah mengganti port/host/database** atau **setup mesin baru**.

## Reset password pengguna (tanpa UI)

```bash
cd backend
npm run reset-password -- "email@domain.com" "PasswordBaru8+"
```

## Backup sebelum perubahan besar

Sebelum mengganti instance MySQL, restore dump, atau merge skema manual:

```bash
mysqldump -u root -p -P 3306 db_epelara > backup_epelara.sql
```

Sesuaikan user, port, dan nama database.

## Checklist saat login/autentikasi “aneh”

1. Cek `config.json`: **host, port, database** — apakah ini DB yang Anda kira?
2. `npm run check:db-schema`
3. Jika ada kolom hilang: `npx sequelize-cli db:migrate` lalu `npm run db:ensure-reset-cols` bila perlu.
4. Restart backend dan coba lagi.

## Menambah pemeriksaan skema baru

Edit `backend/scripts/checkDbSchema.js`, array `REQUIRED_SCHEMA`: tambahkan tabel/kolom yang wajib ada agar modul terkait tidak error di runtime.

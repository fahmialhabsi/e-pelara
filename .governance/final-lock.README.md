# EPELARA FINAL CODE LOCK — ALL FRONTEND & BACKEND

Guard ini mengunci seluruh folder `frontend/` dan `backend/` agar file yang sudah stabil/HIJAU tidak berubah tanpa unlock key owner.

## Yang dikunci

- Semua file di `frontend/`
- Semua file di `backend/`
- Dokumen 25 source-of-truth

## Yang dikecualikan

Beberapa folder runtime/build tidak dikunci:

- `frontend/node_modules/`
- `backend/node_modules/`
- `frontend/dist/`
- `frontend/build/`
- `backend/uploads/`
- `backend/logs/`
- `backend/tmp/`

## Cara pasang

Salin folder `.governance` dan `scripts` ke root repository e-Pelara.

Tambahkan script berikut ke `package.json` root:

```json
{
  "scripts": {
    "guard:final-lock": "node scripts/check-final-locked-files.js",
    "guard:hash-lock-key": "node scripts/hash-final-lock-key.js"
  }
}
```

Jika `scripts` sudah ada, tambahkan dua baris script saja, jangan hapus script lain.

## Cara membuat hash kunci

Jalankan di komputer owner:

```bash
node scripts/hash-final-lock-key.js "PASSWORD_RAHASIA_OWNER"
```

Output:

```txt
EPELARA_FINAL_LOCK_HASH=xxxxxxxx
```

Password asli tidak boleh dicommit.

## Cara menjalankan guard

```bash
npm run guard:final-lock
```

## Cara unlock sementara

PowerShell:

```powershell
$env:EPELARA_FINAL_LOCK_KEY="PASSWORD_RAHASIA_OWNER"
$env:EPELARA_FINAL_LOCK_HASH="HASH_SHA256_OWNER"
npm run guard:final-lock
```

Git Bash:

```bash
EPELARA_FINAL_LOCK_KEY="PASSWORD_RAHASIA_OWNER" EPELARA_FINAL_LOCK_HASH="HASH_SHA256_OWNER" npm run guard:final-lock
```

## Prosedur jika frontend/backend perlu diubah

1. Buat step baru.
2. Jelaskan alasan perubahan.
3. Owner menjalankan unlock key.
4. Jalankan regression test.
5. Update Dokumen 25.
6. Setelah selesai, guard tetap aktif.

## Catatan

Guard lokal bisa dibypass oleh orang yang punya akses penuh ke repository. Untuk tim, kombinasikan dengan branch protection, CODEOWNERS, dan CI.

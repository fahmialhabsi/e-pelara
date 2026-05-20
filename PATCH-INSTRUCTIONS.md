# PATCH GOVERNANCE-LOCK-ALL — Kunci Semua Frontend dan Backend e-Pelara

Patch ini mengganti pola lock parsial menjadi lock seluruh folder:

- `frontend/`
- `backend/`
- Dokumen 25

## File baru / pengganti

Salin ke root repo e-Pelara:

- `.governance/final-lock.json`
- `.governance/final-lock.README.md`
- `scripts/check-final-locked-files.js`
- `scripts/hash-final-lock-key.js`

## Update package.json root

Tambahkan dua script ini:

```json
"guard:final-lock": "node scripts/check-final-locked-files.js",
"guard:hash-lock-key": "node scripts/hash-final-lock-key.js"
```

## Uji syntax

```bash
node -c scripts/check-final-locked-files.js
node -c scripts/hash-final-lock-key.js
```

## Uji guard

Tanpa perubahan frontend/backend:

```bash
npm run guard:final-lock
```

Expected: OK.

Dengan perubahan frontend/backend tanpa key:

```bash
npm run guard:final-lock
```

Expected: BLOCKED.

## Buat hash password owner

```bash
node scripts/hash-final-lock-key.js "PASSWORD_RAHASIA_ANDA"
```

## Unlock sementara

PowerShell:

```powershell
$env:EPELARA_FINAL_LOCK_KEY="PASSWORD_RAHASIA_ANDA"
$env:EPELARA_FINAL_LOCK_HASH="HASH_SHA256_ANDA"
npm run guard:final-lock
```

Git Bash:

```bash
EPELARA_FINAL_LOCK_KEY="PASSWORD_RAHASIA_ANDA" EPELARA_FINAL_LOCK_HASH="HASH_SHA256_ANDA" npm run guard:final-lock
```

## Penting

Password asli jangan dikirim ke siapa pun dan jangan dicommit ke repository.

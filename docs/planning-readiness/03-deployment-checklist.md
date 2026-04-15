# Deployment Checklist - Planning Modules (Renstra, Renja, RKPD)

Checklist ini untuk persiapan deploy environment target (staging/production).

## 1) Migration yang wajib dijalankan
Jalankan dari folder `backend`:

```bash
npx sequelize-cli db:migrate
```

Minimal migration planning yang harus terpasang:
- `20260407-001-add-approval-status.js` (approval status + approval logs baseline)
- `20260408123550-create-planning-tables.cjs` (renstra/renja/rkpd planning fields)
- `20260408124000-ensure-activity-logs.js` (audit trail table)

## 2) Seeder yang wajib dijalankan
```bash
npx sequelize-cli db:seed --seed 20260408124500-seed-rpjmd-periode-minimal.js
```

Opsional (hanya jika reference data belum ada):
- seeder OPD/periode lama sesuai kebutuhan environment.

## 3) Route/endpoint yang perlu dicek
Pastikan route aktif (HTTP 200/401 sesuai auth, bukan 404):
- `GET /api/renstra-docs`
- `GET /api/renja`
- `GET /api/rkpd`
- `POST /api/renstra-docs/:id/actions/submit`
- `POST /api/renja/:id/actions/approve`
- `POST /api/rkpd/:id/actions/reject`
- `GET /api/renstra-docs/sync`
- `GET /api/renja/sync`
- `GET /api/rkpd/sync`

## 4) Env/config yang perlu diverifikasi
- `DB_*` terisi benar dan user DB punya akses DDL/DML.
- `JWT_SECRET` dan `JWT_REFRESH_SECRET` sudah sesuai environment.
- `CORS_ORIGINS` mencakup domain frontend target.
- `NODE_ENV` dan `PORT` sesuai environment.
- `backend/config/config.json` profile environment (`development/staging/production`) menunjuk DB target.

## 5) Smoke test setelah deploy

### Backend smoke
1. Login dan ambil token valid.
2. Buat 1 data uji:
   - Renstra draft
   - Renja draft
   - RKPD draft
3. Jalankan workflow:
   - `submit` -> `approve`
   - `revise` kembali ke draft
4. Verifikasi response shape `success/data/message` konsisten.

### Database smoke
- Cek tabel:
  - `renstra`, `renja`, `rkpd`
  - `activity_logs`
- Cek kolom status:
  - `status`, `approval_status`, `disetujui_oleh`, `disetujui_at`
- Cek log audit:
  - ada `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`

### Frontend smoke
- Halaman list:
  - `M027 Renstra`, `M029 Renja`, `M028 RKPD`
- Tombol workflow tampil sesuai role.
- Badge status + sinkronisasi tampil benar.
- Sync RKPD tampil sebagai mode stub (bukan error).

## 6) Rollback minimal (jika ada isu)
- Stop traffic write sementara.
- Restore DB dari backup sebelum migration.
- Deploy ulang artifact backend/frontend terakhir yang stabil.
- Re-run smoke test inti (list/create/workflow).

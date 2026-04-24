# Phase 5 — DATABASE ENFORCEMENT (FK) — ePelara

Target: mulai enforce relasi cascading di level database (MySQL/InnoDB) **tanpa** mengaktifkan NOT NULL (itu Phase 6).

Prasyarat (WAJIB):
- Phase 4 sudah dijalankan sampai **orphan=0 / pivot invalid=0 / duplicate target=0**.
- Jalankan `scripts/sql/cascading-gap-audit.sql` dan pastikan isu utama 0.
- Uji dulu di DB non-produksi (staging/dev) + backup sebelum menjalankan DDL.

Urutan eksekusi:
1) `01_preflight_fk_check.sql`
   - Mengecek engine/tipe kolom, orphan, broken chain, pivot invalid, duplicate detail.
   - Output ini jadi “gate” sebelum lanjut.
2) `02_add_fk_indexes.sql`
   - Menambah index untuk semua kolom child FK (dibuat dengan nama eksplisit `idx_fk_*`).
3) `03_add_fk_constraints.sql`
   - Menambah FK dengan **ON DELETE RESTRICT / ON UPDATE CASCADE** (kecuali `renstra_target_detail` yang CASCADE karena benar-benar dependent).
   - FK yang tipe kolomnya mismatch akan di-*SKIP* (ada pesan) dan ditangani di Phase 6 (UUID→INT/backfill).
4) Jika perlu rollback:
   - `04_rollback_fk_constraints.sql`

Catatan penting:
- Script Phase 5 ini tidak otomatis menyentuh produksi. Jalankan manual pada DB target.
- Semua constraint punya nama eksplisit: `fk_<child>__<childcol>__<parent>`.
- Semua index Phase 5 punya nama eksplisit: `idx_fk_<table>__<col>`.

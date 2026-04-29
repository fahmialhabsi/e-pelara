# Phase 6 — FK activation: `renstra_tujuan.rpjmd_tujuan_id -> tujuan.id`

Tujuan: mengaktifkan FK yang sebelumnya ditunda (Phase 5) karena mismatch tipe (legacy UUID/CHAR vs INT).

Syarat wajib sebelum eksekusi:
- `non_numeric/blank = 0` untuk `renstra_tujuan.rpjmd_tujuan_id`
- `missing parent = 0` (semua nilai numerik harus punya parent di `tujuan.id`)
- Setelah tipe disamakan, pastikan `type_mismatch = 0`

Catatan status:
- FK dianggap siap diaktivasi jika preflight Phase 6 menunjukkan `non_numeric/blank = 0` dan `missing parent = 0` (PASS).

Urutan eksekusi yang aman (DB non-prod dulu + backup):
1) Preflight Phase 6 (gate):
   - `01_preflight_phase6_fk_renstra_tujuan_rpjmd_tujuan_id.sql`
   - Jika `final_decision = NOT_READY_PHASE6`, selesaikan data issue terlebih dahulu.
   - Jika `NEEDS_TYPE_MIGRATION`, jalankan migration di langkah 2.
2) Migration tipe kolom (hanya jika masih mismatch):
   - `02_migrate_renstra_tujuan_rpjmd_tujuan_id_type_to_match_tujuan_id.sql`
3) Tambah index (idempotent):
   - `03_add_fk_index_renstra_tujuan_rpjmd_tujuan_id.sql`
4) Tambah FK constraint:
   - `04_add_fk_renstra_tujuan_rpjmd_tujuan_id_to_tujuan.sql`
5) Jika perlu rollback cepat (FK + index Phase 6):
   - `05_rollback_phase6_fk_renstra_tujuan_rpjmd_tujuan_id.sql`

Catatan:
- Phase 6 ini hanya untuk FK `renstra_tujuan.rpjmd_tujuan_id -> tujuan.id`.
- Phase 5 FK yang sudah ACTIVE tidak diubah.
- Setelah kolom di-migrate menjadi INT, selaraskan tipe di layer aplikasi (mis. model Sequelize `models/renstra_tujuanModel.js`) bila diperlukan.

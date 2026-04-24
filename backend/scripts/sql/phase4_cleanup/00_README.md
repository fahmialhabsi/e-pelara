# Phase 4 — DATA CLEANUP (RPJMD -> Renstra OPD)

Tujuan fase ini: membersihkan data existing agar **siap** ditambah FK (Phase 5) tanpa gagal karena orphan / broken chain / pivot invalid.

Prinsip aman:
- Utamakan **relink** (perbaiki foreign key menunjuk parent yang benar).
- Jika tidak bisa relink deterministik, gunakan **mapping table** (manual decision, tapi terkontrol).
- **Null** hanya jika kolom mengizinkan NULL (banyak kolom legacy `NOT NULL`, jadi sering tidak bisa).
- **Delete** hanya untuk data yang benar-benar tidak bisa dipulihkan (paling aman dilakukan bottom-up).

Urutan eksekusi yang disarankan:
1) `01_pivot_cleanup.sql` (aman: buang pivot invalid)
2) `02_rpjmd_chain_relink.sql` (RPJMD chain + program/kegiatan/sub_kegiatan)
3) `03_renstra_chain_relink.sql` (renstra_opd + renstra_* chain)
4) `04_target_detail_fix.sql` (dedupe + backfill target tahunan)
5) Re-run `scripts/sql/cascading-gap-audit.sql` + endpoint `GET /api/audit/cascading-gap`

Catatan:
- Script ini sengaja memisahkan: **report -> mapping -> apply**.
- Untuk statement `UPDATE/DELETE`, jalankan dalam transaksi: `START TRANSACTION; ... COMMIT;` (atau `ROLLBACK;` saat uji).

/*
  Phase 4 — Pivot Cleanup (SAFE)
  Fokus: buang baris pivot yang referensi parent-nya sudah hilang.

  Alasan:
  - Pivot invalid akan membuat FK gagal saat Phase 5.
  - Hapus pivot invalid relatif aman (tidak menghapus entity utama).
*/

/* =========================
   0) REPORT pivot invalid
========================= */
SELECT COUNT(*) AS pivot_program_arah_invalid
FROM program_arah_kebijakan pak
LEFT JOIN program p ON p.id = pak.program_id
LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
WHERE p.id IS NULL OR a.id IS NULL;

SELECT COUNT(*) AS pivot_program_strategi_invalid
FROM program_strategi ps
LEFT JOIN program p ON p.id = ps.program_id
LEFT JOIN strategi st ON st.id = ps.strategi_id
WHERE p.id IS NULL OR st.id IS NULL;

/* =========================
   1) APPLY delete pivot invalid
   Jalankan dalam transaksi. Default aman: statement DML dikomentari.
========================= */
-- START TRANSACTION;

-- DELETE pak
-- FROM program_arah_kebijakan pak
-- LEFT JOIN program p ON p.id = pak.program_id
-- LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
-- WHERE p.id IS NULL OR a.id IS NULL;

-- DELETE ps
-- FROM program_strategi ps
-- LEFT JOIN program p ON p.id = ps.program_id
-- LEFT JOIN strategi st ON st.id = ps.strategi_id
-- WHERE p.id IS NULL OR st.id IS NULL;

-- COMMIT;

/* =========================
   2) REPORT ulang (harus 0)
========================= */
SELECT COUNT(*) AS pivot_program_arah_invalid_after
FROM program_arah_kebijakan pak
LEFT JOIN program p ON p.id = pak.program_id
LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
WHERE p.id IS NULL OR a.id IS NULL;

SELECT COUNT(*) AS pivot_program_strategi_invalid_after
FROM program_strategi ps
LEFT JOIN program p ON p.id = ps.program_id
LEFT JOIN strategi st ON st.id = ps.strategi_id
WHERE p.id IS NULL OR st.id IS NULL;

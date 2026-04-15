-- Jalankan pada database yang dipakai backend (mis. db_epelara).
-- Jika salah satu kolom sudah ada, jalankan hanya perintah yang belum ada,
-- atau gunakan: npm run db:ensure-reset-cols

ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(128) NULL;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL;

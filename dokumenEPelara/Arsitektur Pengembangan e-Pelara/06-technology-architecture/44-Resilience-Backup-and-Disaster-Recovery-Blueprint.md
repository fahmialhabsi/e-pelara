---
document_id: BP-TECH-003
title: Resilience, Backup and Disaster Recovery Blueprint
system: e-PeLARA Next Generation
classification: Technology Architecture Blueprint
domain: Technology Architecture
version: 0.2.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-06
last_reviewed: 2026-08-29
parent_document: ../06-technology-architecture/43-Observability-and-Operations-Blueprint.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3–G5 — Integrated Target Architecture hingga Implementation Ready
roadmap_dependency: ADR-0003 (Backup and Disaster Recovery Decision), AIR-009, Observability and Operations Blueprint
intended_repository_path: 06-technology-architecture/44-Resilience-Backup-and-Disaster-Recovery-Blueprint.md
review_outcome: PASSED
prepared_by: Claude Work (Draft File Operator, di bawah prinsip One AI, One Responsibility — Chief Enterprise Architect: ChatGPT)
---

# 44 — Resilience, Backup and Disaster Recovery Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini menyusun **candidate resilience concern** — target ketahanan data dan prinsip backup/restore — di atas Observability and Operations Blueprint (BP-TECH-002, Approved), melanjutkan keputusan ADR-0003 (Backup and Disaster Recovery Decision, Accepted 2026-08-06). Dokumen ini **tidak** menetapkan teknologi/tooling backup konkret, lokasi penyimpanan, kebijakan retensi, atau disposition Gate.

## 2. Ruang Lingkup

Dalam scope: target RPO/RTO (per ADR-0003), prinsip restore test, cakupan backup konseptual, dan boundary dengan Observability Blueprint. Di luar scope: tooling/teknologi backup aktual, lokasi/retensi penyimpanan, prosedur operasional rinci, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/adr/ADR-0003-Backup-and-Disaster-Recovery-Decision.md` (Version 1.0.0, Accepted 2026-08-06) — keputusan target RPO/RTO.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-009, status Resolved merujuk ADR-0003 (Version 1.0.5).
- `06-technology-architecture/43-Observability-and-Operations-Blueprint.md` (BP-TECH-002, Approved) §6, §9 — mencatat "Backup/restore verification signal" sebagai Evidence Pending, dirutekan ke dokumen ini.
- `06-technology-architecture/40-Technology-Architecture.md` (ARCH-TECH-001, Approved) — Observability and Resilience Layer.
- Peninjauan langsung (dilakukan pada sesi penyusunan ADR-0003, 2026-08-06, read-only): `backend/scripts/` (tidak ditemukan script backup/restore), `docs/DATABASE.md` (tidak memuat prosedur backup/restore).
- **Addendum 2026-08-29** — Peninjauan langsung ulang atas kode aktual: `backend/scripts/databaseBackup.js`, `databaseBackupUploads.js`, `databaseRestoreVerify.js`, `backupEngineSelfTest.js`, `backend/scripts/lib/{backupConfig,backupManifest,backupRetention,restoreSafety}.js`, `docs/internal/database-backup-restore-runbook.md`, `.github/workflows/ci-generic.yml` (job `db:backup:test`/`db:backup:uploads:test`). Ditemukan sudah diimplementasikan sejak commit `949a3e4f` ("feat(recovery): harden backup restore verification and CI protection", 2026-08-16) — setelah ADR-0003 Accepted namun sebelum addendum ini dibuat. Dieksekusi langsung pada sesi ini (bukan laporan pihak ketiga): `npm run db:backup:test` (self-test unit, 35/35 pass), `npm run db:backup` (backup nyata terhadap `db_epelara` lokal/dev), `npm run db:restore:verify` (restore verification nyata ke database temporary). Hasil lengkap di §9.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Kondisi Saat Ini (Documented Current Fact)

**Kondisi pada 2026-08-06 (baseline ADR-0003, sudah usang — dipertahankan untuk riwayat):** Peninjauan langsung saat itu mengonfirmasi tidak ada backup/restore otomatis yang berjalan: tidak ditemukan script backup di `backend/scripts/`, tidak ada konfigurasi deployment produksi yang menyinggung backup, dan `docs/DATABASE.md` tidak memuat prosedur backup/restore (evidence dasar AIR-009, dikonfirmasi ulang oleh ADR-0003 §1.1).

**Kondisi pada 2026-08-29 (Addendum, evidence terverifikasi langsung pada sesi ini):** Kondisi di atas **sudah berubah**. Engine backup dan restore verification telah diimplementasikan (Sprint 2, commit `949a3e4f`, 2026-08-16) dan diuji unit secara otomatis di CI (`ci-generic.yml`, job `db:backup:test` dan `db:backup:uploads:test`, DB-independent, berjalan setiap push/PR ke `main`). Pada sesi ini, backup nyata dan restore verification nyata dijalankan langsung terhadap `db_epelara` lokal/dev dan **berhasil** — lihat §9 untuk detail evidence. **Yang masih belum tersedia**: penjadwalan otomatis berkala (Windows Task Scheduler) — dicek langsung via `Get-ScheduledTask` pada mesin ini, task "ePeLARA - Database Backup" **belum terdaftar**. Backup/restore sepenuhnya *capable* dan terbukti berfungsi, tetapi **belum berjalan otomatis berkala** — eksekusi harian bergantung Owner mengatur Task Scheduler secara manual sesuai `docs/internal/database-backup-restore-runbook.md` §5.

## 6. Target Ketahanan Data (per ADR-0003, Candidate Target Direction)

| Target | Nilai | Catatan |
| --- | --- | --- |
| Recovery Point Objective (RPO) | 24 jam | Backup basis data penuh minimal satu kali per hari. |
| Recovery Time Objective (RTO) | Fleksibel, disesuaikan kapasitas operasional | Tidak dipatok sebagai SLA formal pada tahap ini. |
| Restore test | Wajib dilakukan berkala | **Terbukti dapat dijalankan dan berhasil** (RESTORE_VERIFIED, 2026-08-29, evidence §9). Frekuensi berkala berikutnya belum ditetapkan/dijadwalkan — Evidence Pending (§9). |
| Cakupan minimum | Basis data produksi (MySQL) | Engine tersedia untuk database (`databaseBackup.js`) dan uploads (`databaseBackupUploads.js`). Cakupan log/konfigurasi di luar itu — Evidence Pending (§9). |

## 7. Prinsip Resilience

1. **Pembuktian, bukan hanya kebijakan**: backup yang tidak pernah diuji restore-nya tidak dianggap bukti ketahanan yang valid (ADR-0003 §3 butir 3) — prinsip ini konsisten dengan definisi resolusi AIR-009 yang mensyaratkan "disetujui serta dibuktikan".
2. **Prioritas internal**: karena backup sepenuhnya dalam kendali internal (tidak bergantung pihak eksternal seperti SIPD), implementasi awal direkomendasikan diprioritaskan lebih cepat dibanding item yang bergantung eksternal (ADR-0003 §3 butir 5) — dicatat sebagai rekomendasi, bukan penugasan atau jadwal resmi.
3. **Observability mendukung, tidak menggantikan**: sinyal verifikasi backup/restore (BP-TECH-002 §6) adalah pelengkap resilience, bukan pengganti keberadaan proses backup itu sendiri.
4. **Tidak ada asumsi SLA**: karena RTO fleksibel, ekspektasi pemulihan layanan tidak boleh dikomunikasikan sebagai janji waktu pasti (ADR-0003 §4.2).

## 8. Boundary dengan BP-TECH-002 dan ADR-0003 (Approved/Accepted)

BP-TECH-002 menetapkan prinsip observability dan merutekan sinyal verifikasi backup/restore ke dokumen ini sebagai Evidence Pending; ADR-0003 menetapkan target RPO/RTO. Dokumen ini menyusun detail resilience di atas keduanya tanpa mengubahnya. Dokumen ini tidak menetapkan tooling observability maupun mengubah environment tier BP-TECH-001.

## 9. Evidence Pending Register dan Routing

| Item | Status (per Addendum 2026-08-29) | Routing |
| --- | --- | --- |
| Teknologi/tooling backup konkret | **Implemented.** `mysqldump` via `backend/scripts/databaseBackup.js` (dump → checksum SHA-256 → manifest JSON → retention). Dipanggil manual (`npm run db:backup`) atau via Windows Task Scheduler — bukan `node-cron`, bukan proses dalam `server.js`. | Selesai. |
| Lokasi penyimpanan backup dan kebijakan retensi | **Default terpasang di kode** (`backend/scripts/lib/backupConfig.js`): `DB_BACKUP_DIR` default `<repo_root>/backups/database/`; retensi 14 hari (daily) → 8 minggu (weekly) → 6 bulan (monthly), dapat dikonfigurasi lewat env var. **Kecukupan nilai default ini belum eksplisit dikonfirmasi/direview Project Owner** — Evidence Pending untuk bagian itu saja. | Konfirmasi kecukupan nilai default — keputusan Project Owner. |
| Frekuensi dan prosedur restore test spesifik | Prosedur **terdokumentasi lengkap** (`docs/internal/database-backup-restore-runbook.md` §4) dan **terbukti berhasil dijalankan** satu kali (lihat baris evidence restore test di bawah). Frekuensi berkala (mis. mingguan/bulanan) belum ditetapkan sebagai kebijakan resmi. | Penetapan frekuensi — keputusan Project Owner. |
| Cakupan backup di luar basis data (file upload, log, konfigurasi) | **Sebagian Implemented**: file upload dicakup terpisah oleh `databaseBackupUploads.js`/`uploadsRestoreVerify.js` (unit-tested di CI, belum dieksekusi nyata pada sesi ini). Log aplikasi dan konfigurasi (`backend/config/`) belum dicakup mekanisme backup manapun — Evidence Pending. | Perluasan cakupan — implementasi teknis terpisah bila diperlukan. |
| Otoritas institusional pelaksana dan verifikator proses backup/restore | Belum ditetapkan — Evidence Pending, tidak berubah dari versi sebelumnya. | Keputusan Project Owner terpisah. |
| **Bukti restore test aktual (untuk closure formal AIR-009)** | **Tersedia.** Dieksekusi langsung pada sesi ini, 2026-08-29, terhadap `db_epelara` **lokal/dev** (bukan server produksi — lihat catatan di bawah): `backup_id=bkp_1787962698693_9de24c3c` (87.070.766 bytes, SHA-256 tercatat di manifest) → `db:restore:verify` → outcome **`RESTORE_VERIFIED`**, `checksum_match: true`, `tables_expected: 283` / `tables_found: 283`, seluruh critical tables (`users`, `roles`, `divisions`, `periode_rpjmds`) hadir, `cleanup_status: SUCCESS` (database temporary `epelara_restore_verify_1787962712287_cca7cad7` berhasil di-DROP, tidak pernah menyentuh `db_epelara`). Log lengkap tersimpan di `backups/database/restore-verify.log.jsonl` pada mesin ini. **Catatan penting**: ini adalah restore test **pertama yang tercatat**, dijalankan di lingkungan lokal/dev oleh sesi otomatis, bukan di server produksi, dan belum berulang secara berkala — closure formal AIR-009 tetap memerlukan keputusan eksplisit Project Owner apakah bukti ini dianggap cukup, atau perlu diulang terhadap lingkungan produksi/dengan kadensi berkala sebelum closure. | Keputusan closure AIR-009 — Project Owner. |
| Penjadwalan otomatis berkala (RPO 24 jam) | **Belum operasional.** Dicek langsung (`Get-ScheduledTask`) pada mesin ini: task "ePeLARA - Database Backup" belum terdaftar di Windows Task Scheduler. Kapabilitas ada, eksekusi berkala belum berjalan. | **Tindakan Owner** — mengikuti `docs/internal/database-backup-restore-runbook.md` §5 (di luar kewenangan sesi otomatis untuk mendaftarkan task terjadwal tak terawasi berisi kredensial DB tanpa otorisasi eksplisit terpisah). |

## 10. Assumptions dan Program State

1. BP-TECH-002 (Approved) dan ADR-0003 (Accepted 2026-08-06) adalah dependency; tidak diubah oleh dokumen ini.
2. AIR-009 berstatus Resolved (Architecture Issue Register); closure formal AIR-009 tetap memerlukan closure approval eksplisit Project Owner — bukti restore test aktual kini **tersedia** (§9, Addendum 2026-08-29), tetapi keputusan apakah bukti ini cukup untuk closure tetap wewenang Project Owner.
3. G1 dan G2 tetap tanpa disposition. Dokumen ini tidak menetapkan disposition G3–G5.
4. **Diperbarui 2026-08-29**: backup/restore otomatis **telah dibangun dan diuji** — evidence langsung di §5 dan §9. Yang belum ada: penjadwalan berkala otomatis (Task Scheduler) dan restore test terhadap lingkungan produksi.

## 11. Batas Kewenangan AI

**Mandat penyusunan awal (2026-08-06, Draft File Operator, draft-only)** — **Diizinkan**: Mendokumentasikan target RPO/RTO berdasarkan ADR-0003, menyusun prinsip resilience dan cakupan konseptual, routing Evidence Pending, mengikuti metadata dan struktur draft-only. **Dilarang**: Menetapkan atau mengklaim tooling/teknologi backup aktual, lokasi/retensi penyimpanan, implementasi selesai, bukti restore test aktual, owner/steward institusional, authority, compliance, effective date, atau disposition Gate.

**Addendum 2026-08-29 — mandat berbeda (eksekusi backlog runbook, bukan governance draft-only)**: pembaruan §5/§6/§9/§10 di atas dilakukan di bawah `11-roadmaps/backlog-eksekusi-otomatis.md` — sesi eksekusi teknis yang secara eksplisit diberi wewenang menjalankan verifikasi kode/infrastruktur nyata dan mencatat hasilnya, bukan sesi governance draft-only. Klaim yang ditambahkan (implementasi tooling, hasil restore test) merujuk langsung ke perintah yang dijalankan pada sesi ini sendiri (bukan laporan pihak ketiga yang tidak diverifikasi) — tetap **tidak** menetapkan disposition Gate baru, tidak mengklaim closure formal AIR-009, dan tidak mengklaim penjadwalan otomatis berkala telah berjalan.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / Draft File Operator | Claude Work | Selesai | Disusun berdasarkan ADR-0003 (Accepted) dan evidence kode yang telah ditinjau sebelumnya. | 2026-08-06 |
| Chief Enterprise Architect (review) | ChatGPT | Belum dilakukan terpisah | Review substantif oleh ChatGPT belum tercatat terpisah pada sesi ini; Project Owner memberikan persetujuan final secara langsung. | — |
| Project Owner | Fahmi Alhabsi | **Approved** | Disetujui secara eksplisit 2026-08-06. | 2026-08-06 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Penyusunan awal Resilience, Backup and Disaster Recovery Blueprint sebagai BP-TECH-003 Seq 44, berdasarkan ADR-0003 (Accepted) dan BP-TECH-002 (Approved). Cakupan: target RPO/RTO, prinsip restore test, cakupan backup konseptual. | Claude Work | Draft for Review |
| 0.1.0 (final) | 2026-08-06 | **Finalisasi**: Project Owner menyetujui BP-TECH-003 v0.1.0 secara eksplisit. Status dinaikkan menjadi Approved, effective_date 2026-08-06, review_outcome PASSED. Persetujuan ini tidak setara dengan closure formal AIR-009 — closure formal tetap memerlukan bukti restore test aktual terpisah, sesuai ADR-0003 §5. | Claude Work, berdasarkan persetujuan eksplisit Project Owner | Approved |
| 0.2.0 | 2026-08-29 | **Addendum evidence**: mengisi §5/§6/§9/§10 dengan hasil verifikasi langsung kode aktual dan eksekusi nyata backup+restore test terhadap `db_epelara` lokal/dev (outcome `RESTORE_VERIFIED`, lihat §9), dijalankan di bawah runbook `11-roadmaps/backlog-eksekusi-otomatis.md` (Item AIR-009). Tidak menetapkan disposition Gate baru, tidak mengklaim closure formal AIR-009, tidak mengklaim penjadwalan otomatis berkala sudah berjalan (dikonfirmasi belum, via `Get-ScheduledTask`). effective_date §12/§15 tidak diubah — persetujuan Project Owner atas versi 0.1.0 tetap berlaku untuk struktur dokumen; penambahan evidence ini belum direview terpisah oleh Chief Enterprise Architect/Project Owner. | Claude (mode `/loop`, sesi eksekusi backlog) | Approved (evidence addendum; review substantif Project Owner atas addendum ini belum dilakukan) |

## 14. Validation Checklist (Version 0.2.0)

1. ✓ Metadata versi/tanggal diperbarui sesuai perubahan substantif (evidence addendum), bukan administrative patch.
2. ✓ Dependency (BP-TECH-002, ADR-0003) tidak diubah.
3. ✓ Tooling backup aktual kini dicatat dengan rujukan file kode nyata (§9), bukan asumsi.
4. ✓ Klaim bukti restore test aktual disertai data konkret (backup_id, checksum, jumlah tabel, outcome) dan batasan eksplisit (lokal/dev, sekali jalan, bukan closure).
5. ✓ G1/G2 tetap tanpa disposition; AIR-009 tetap dicatat Resolved (bukan Closed) — closure eksplisit tetap wewenang Project Owner.
6. ✓ Tidak ada file lain tersentuh selain artefak ini pada edit dokumen ini (perubahan kode dieksekusi terpisah, tidak mengubah kode aplikasi).

## 15. State Aktual Dokumen

Version 0.2.0, status **Approved** (struktur v0.1.0 disetujui Project Owner 2026-08-06; addendum evidence 2026-08-29 belum direview terpisah), effective_date 2026-08-06, last_reviewed 2026-08-29. Backup engine dan restore verification kini terbukti berfungsi dengan evidence langsung (§9). Closure formal AIR-009 tetap memerlukan keputusan eksplisit Project Owner — bukti kini tersedia, tetapi kecukupannya (sekali jalan vs berkala, lokal/dev vs produksi) belum diputuskan.

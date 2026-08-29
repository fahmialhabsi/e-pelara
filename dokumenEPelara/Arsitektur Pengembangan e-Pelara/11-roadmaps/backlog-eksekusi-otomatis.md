---
document_id: RUNBOOK-EA-EXEC-001
title: Backlog Eksekusi Otomatis — Runbook Operasional (BUKAN Artefak Master Document Sequence)
system: e-PeLARA Next Generation
classification: Architecture Execution Runbook — Internal Operational Aid
domain: Enterprise Architecture Execution
version: 1.0.0
status: Active
owner: Project Owner
prepared_by: Claude Code (mode /loop)
created_date: 2026-08-29
intended_repository_path: 11-roadmaps/backlog-eksekusi-otomatis.md
---

# Backlog Eksekusi Otomatis — e-PeLARA EA

## 0. Kedudukan Dokumen Ini (baca sekali, jangan derive ulang)

Dokumen ini **bukan** artefak Master Document Sequence (Seq 00–74), **bukan** pengganti Architecture Issue Register (`00-governance/03-Architecture-Issue-Register.md`), Enterprise Change Log (`00-governance/06-Change-Log.md`), atau Master Artifact Register (`11-roadmaps/00-Master-Artifact-Register.md`). Dokumen ini adalah **runbook eksekusi operasional** untuk menjalankan `/loop` menyelesaikan backlog nyata yang tersisa dari 75 artefak governance yang sudah Approved.

**Aturan wajib untuk setiap iterasi loop:**

1. **Baca HANYA §2–§6 dokumen ini** untuk menentukan item berikutnya + definisi selesai. JANGAN scan ulang seluruh folder `Arsitektur Pengembangan e-Pelara/` atau baca ulang Master Artifact Register/Issue Register secara penuh tiap iterasi — semua konteks yang dibutuhkan sudah dirangkum di §2.
2. Sumber kebenaran progres adalah **tabel §3 di dokumen ini sendiri** — update baris statusnya di akhir tiap iterasi. Item berikutnya = baris pertama dengan status `Belum`.
3. Baca file kode/dokumen spesifik yang dirujuk per item **hanya saat item itu dikerjakan**, bukan semua sekaligus di awal.
4. Ikuti Aturan Commit (§4) dan Aturan Decision-Required (§5) tanpa pengecualian.
5. Setelah update baris di §3, **commit perubahan file runbook ini juga** (bagian dari commit item tsb), supaya iterasi berikutnya (dan sesi baru jika terputus) langsung tahu progres tanpa re-derive.

---

## 1. Daftar Prioritas Final (urutan eksekusi, tidak berubah)

1. AIR-009 — Backup & restore otomatis (Critical)
2. AIR-008 — CSRF protection (High)
3. AIR-006 — Kriteria production readiness seragam (High)
4. AIR-001 — Aturan transition year Renstra (Resolved, evidence tersisa)
5. AIR-004 — Workflow approval / lampiran 32a (Resolved, evidence tersisa)
6. AIR-007 — SIPD target integration pattern (Resolved, evidence tersisa)
7. AIR-010 — Traceability Matrix Seq 74 (Resolved, evidence tersisa)
8. AIR-002 — Status dashboard tidak konsisten (Medium)
9. AIR-003 — Status model Notification tidak konsisten (Medium)
10. AIR-005 — Konsolidasi UI library (Medium)
11. Housekeeping — Seq 66 Template Register + 9 folder kosong (lihat §6)

---

## 2. Definisi "Selesai" per Item

### Item 1 — AIR-009: Backup & Restore Otomatis (Critical)
- **Rujukan**: `00-governance/03-Architecture-Issue-Register.md` (baris AIR-009), `00-governance/adr/ADR-0003-Backup-and-Disaster-Recovery-Decision.md`, `06-technology-architecture/44-Resilience-Backup-and-Disaster-Recovery-Blueprint.md`.
- **Target sudah ditetapkan**: RPO 24 jam, RTO fleksibel, restore test wajib berkala sebagai bukti (bukan cuma backup ada).
- **Selesai bila**: (a) mekanisme backup terjadwal MySQL benar-benar ada di repo (script + dokumentasi cara jalan, konsisten §RPO 24 jam BP-TECH-003); (b) minimal satu restore test dijalankan di lingkungan lokal/dev dan hasilnya dibuktikan (log/output nyata, bukan klaim); (c) BP-TECH-003 §evidence diupdate dari placeholder menjadi bukti aktual; (d) AIR-009 tetap berstatus **Resolved** (bukan otomatis Closed — closure butuh approval eksplisit Project Owner terpisah per definisi mereka sendiri), tapi kolom evidence diisi; (e) Enterprise Change Log entry baru (mulai `ECHG-086`).
- **Batas**: restore test terhadap **server produksi sungguhan** butuh akses kredensial yang tidak dimiliki loop ini → bagian itu ditandai **Decision Required** (lihat §5), tapi backup script + restore test di DB lokal/dev **tetap wajib dikerjakan otomatis**, jangan skip seluruh item hanya karena bagian produksinya butuh manusia.

### Item 2 — AIR-008: CSRF Protection (High)
- **Rujukan**: `00-governance/03-Architecture-Issue-Register.md` (baris AIR-008), `07-security-architecture/49-Secure-Engineering-and-Secrets-Standard.md`, `07-security-architecture/47-Security-Privacy-and-Audit-Control-Blueprint.md`, `backend/server.js`, `backend/middlewares/verifyToken.js`.
- **Langkah wajib pertama**: verifikasi ulang di kode aktual apakah klaim "belum ada CSRF protection" masih benar hari ini — app memakai Bearer token dari localStorage untuk API utama (bukan cookie session), jadi scope risiko CSRF nyata harus dipastikan dulu (endpoint mana yang pakai cookie, mis. flow SSO/e-SIGAP) sebelum implementasi ditulis.
- **Selesai bila**: (a) scope risiko CSRF terverifikasi dan didokumentasikan; (b) mitigasi diimplementasikan untuk endpoint yang benar-benar berisiko (mis. `csurf`/double-submit-cookie/SameSite pada endpoint cookie-based); (c) dokumen keamanan terkait diupdate dengan evidence implementasi; (d) AIR-008 Open → Resolved dengan evidence link ke file/commit; (e) Change Log entry baru.

### Item 3 — AIR-006: Kriteria Production Readiness Seragam (High)
- **Rujukan**: `00-governance/03-Architecture-Issue-Register.md` (baris AIR-006), `10-transition-and-implementation/72-Production-Readiness-Checklist.md` (struktur Approved, isi belum dinilai).
- **Selesai bila**: (a) checklist Seq 72 diisi dengan penilaian **aktual** per item terhadap kondisi kode/infra sekarang (bukan struktur kosong); (b) evidence per item dicatat (link file/commit/hasil cek).
- **Batas**: keputusan final "boleh go-live atau tidak" secara eksplisit adalah wewenang Project Owner (AIR-006 sendiri berstatus "Decision Required" untuk eskalasi go-live) → jangan putuskan sendiri kelulusan go-live; isi checklist dengan temuan jujur, tandai kesimpulan go-live sebagai **Decision Required** di §5, lanjut ke item berikut.

### Item 4 — AIR-001: Aturan Transition Year Renstra (evidence tersisa)
- **Rujukan**: `00-governance/adr/ADR-0001-Temporal-Model-Decision.md` (Accepted, Opsi C Hybrid), `03-data-architecture/data-lineage/22-Data-Lineage-and-Traceability-Blueprint.md`, `03-data-architecture/data-governance/24-Data-Governance-Operating-Model.md`, `backend/models/rpjmdModel.js` dan model Renstra terkait.
- **Selesai bila**: (a) aturan pemicu (trigger rule) transition year tahun ke-6 dan definisi metadata `period_type` ditetapkan eksplisit di BP-DATA-003/GOV-DATA-001 (saat ini didelegasikan, belum diisi); (b) diverifikasi terhadap field `target_tahun_6`/`pagu_tahun_6` di model aktual apakah sudah konsisten; (c) dokumen diupdate + Change Log.

### Item 5 — AIR-004: Workflow Approval / Lampiran 32a (evidence tersisa)
- **Rujukan**: `00-governance/adr/ADR-0002-Enterprise-Workflow-State-Model-Decision.md`, `04-application-architecture/32-Enterprise-Workflow-State-Model.md`, `04-application-architecture/32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md`, `backend/models/ApprovalLog.js`, `backend/controllers/approvalController.js`, `backend/scripts/workflowComplianceExceptions.json`.
- **Konteks penting**: 32a mengklaim Tahap 1 (lint rule) & Tahap 3 (CI/pre-commit guard wiring) sudah "Implemented", tapi **belum diverifikasi independen** — evidence itu dilaporkan pelaksana implementasi di sesi coding terpisah. Tahap 2 (schema constraint) sengaja **N/A**, bukan gagal — belum ada modul baru yang qualify.
- **Selesai bila**: (a) verifikasi independen nyata terhadap klaim Tahap 1/3 — jalankan script lint rule yang diklaim ada, cek pre-commit hook benar-benar aktif, cocokkan hasil dengan klaim di 32a §7.1–§7.2; (b) tindak lanjuti dua item Evidence Pending dari ADR-0002: sinkronisasi RPJMD yang belum lengkap, dan penyatuan 2 definisi admin paralel (`ADMIN_ROLES` vs `isWorkflowAdminRole()`) — ini perbaikan kode nyata; (c) update 32a/BP-APP-002 dengan hasil verifikasi; (d) Change Log.
- **Batas**: Tahap 2 (schema constraint) tetap **Not Applicable** sampai ada modul baru nyata yang qualify — jangan dipaksakan, catat sebagai skip sah (bukan Decision Required, bukan gagal) di §3.

### Item 6 — AIR-007: SIPD Target Integration Pattern (evidence tersisa)
- **Rujukan**: `00-governance/adr/ADR-0004-SIPD-Integration-Interim-Pattern-Decision.md`, `05-integration-architecture/38-SIPD-Integration-Blueprint.md` (Bagian B placeholder).
- **Batas keras**: ketersediaan API SIPD adalah keputusan sistem eksternal Kemendagri — **tidak bisa dipastikan/diselesaikan otomatis**. Tandai sebagai **Decision Required** langsung di §5 untuk bagian konfirmasi resmi.
- **Yang tetap bisa dikerjakan otomatis** (bukan skip total): susun draft/rancangan "Candidate Target Integration Pattern (API-based)" di BP-INT-001 Bagian B berdasarkan API pattern yang lazim dipakai sistem sejenis, ditandai eksplisit **"belum dikonfirmasi Kemendagri, bukan keputusan final"**, supaya Bagian B tidak kosong total dan siap direview begitu ada kabar resmi.

### Item 7 — AIR-010: Traceability Matrix Seq 74 (evidence tersisa)
- **Rujukan**: `10-transition-and-implementation/74-Enterprise-Architecture-Traceability-Matrix.md` (struktur/populasi tingkat tinggi, mencatat Seq 32/38/44 "belum disusun" — sudah usang, ketiganya kini Approved).
- **Selesai bila**: (a) koreksi baris Seq 32/38/44 yang usang menjadi status Approved terkini; (b) populasikan mapping traceability requirement↔artefak↔kode secara lebih lengkap (bukan sekadar tingkat tinggi) untuk seluruh 75 artefak; (c) Change Log.

### Item 8 — AIR-002: Status Dashboard Tidak Konsisten (Medium)
- **Rujukan**: `01-current-state/` (5 baseline), kode dashboard aktual di `backend/`/`frontend/`.
- **Selesai bila**: (a) cross-check klaim baseline vs kode aktual; (b) tetapkan status final + evidence level yang benar; (c) update baseline yang keliru; (d) AIR-002 Open → Resolved; (e) Change Log.

### Item 9 — AIR-003: Status Model Notification Tidak Konsisten (Medium)
- **Rujukan**: `01-current-state/5-referensi-teknis-database-api-frontend.md`, `01-current-state/4-penilaian-kesesuaian-standar.md`, model Notification aktual di `backend/models/`.
- **Selesai bila**: (a) cek field model Notification aktual di kode; (b) tentukan dokumen mana yang keliru dan perbaiki; (c) AIR-003 Open → Resolved; (d) Change Log.

### Item 10 — AIR-005: Konsolidasi UI Library (Medium)
- **Rujukan**: CLAUDE.md (stack UI campuran by design per modul/vintage — MUI, Ant Design, react-bootstrap, Tailwind, Radix), `09-publishing-architecture/62-Government-Design-System-Standard.md`.
- **Catatan penting**: CLAUDE.md eksplisit melarang memperkenalkan library UI baru ke halaman yang sudah pakai library lain — jadi ini **bukan bug untuk di-refactor besar-besaran**, melainkan kebutuhan strategi konsolidasi bertahap jangka panjang.
- **Selesai bila**: (a) dokumentasikan strategi konsolidasi bertahap (non-big-bang) di dokumen Design System; (b) AIR-005 Open → Resolved dengan catatan eksekusi migrasi bertahap adalah item roadmap terpisah, bukan syarat closure AIR ini; (c) Change Log.

---

## 3. Tabel Status (SUMBER KEBENARAN PROGRES — update tiap iterasi)

| No | Item | Status | Tanggal | ECHG Ref | Catatan Singkat |
|----|------|--------|---------|----------|------------------|
| 1 | AIR-009 Backup & Restore | Selesai | 2026-08-29 | ECHG-086 | Engine sudah Implemented sejak Sprint 2 (commit 949a3e4f, belum dilaporkan ke governance). Backup+restore test nyata dijalankan sesi ini: RESTORE_VERIFIED, checksum match, 283/283 tabel. Task Scheduler berkala BELUM terdaftar (dicek Get-ScheduledTask) — tindakan Owner tersisa, dicatat di BP-TECH-003 §9. AIR-009 tetap Resolved (bukan Closed) — closure tetap wewenang Owner. |
| 2 | AIR-008 CSRF Protection | Belum | — | — | — |
| 3 | AIR-006 Production Readiness | Belum | — | — | — |
| 4 | AIR-001 Transition Year Renstra | Belum | — | — | — |
| 5 | AIR-004 Workflow / 32a | Belum | — | — | — |
| 6 | AIR-007 SIPD Target Pattern | Belum | — | — | — |
| 7 | AIR-010 Traceability Matrix | Belum | — | — | — |
| 8 | AIR-002 Status Dashboard | Belum | — | — | — |
| 9 | AIR-003 Status Notification | Belum | — | — | — |
| 10 | AIR-005 Konsolidasi UI | Belum | — | — | — |
| 11 | Housekeeping (§6) | Belum | — | — | — |

Nilai status yang valid: `Belum`, `Sedang Dikerjakan`, `Selesai`, `Decision Required — Skip (lihat §5)`, `N/A — Skip Sah`.

---

## 4. Aturan Commit

- Commit **lokal saja per item selesai** — jangan pernah `git push`.
- Scope commit hanya file yang benar-benar diubah untuk item tsb (dokumen governance terkait + kode jika ada + Change Log + tabel §3 file ini). Jangan `git add -A`.
- Format pesan commit: `docs(ea): selesaikan <ID-item> — <ringkasan singkat>` atau `fix(security): <ringkasan>` untuk perubahan kode, diikuti body singkat berisi ECHG ref.
- Jangan amend commit sebelumnya — selalu commit baru per item.

---

## 5. Aturan Decision Required (WAJIB — jangan berhenti total)

Jika suatu item (atau sebagian dari item) butuh salah satu dari ini:
- Konfirmasi/akses dari pihak eksternal (mis. Kemendagri untuk SIPD API — Item 6),
- Akses kredensial/server produksi sungguhan yang tidak tersedia (mis. restore test produksi — Item 1),
- Keputusan kebijakan yang eksplisit milik Project Owner (mis. kelulusan go-live — Item 3),

maka: **JANGAN hentikan seluruh loop.** Kerjakan seluruh bagian yang bisa dikerjakan tanpa akses/keputusan tsb, tandai baris di §3 sebagai `Decision Required — Skip`, tulis di kolom Catatan **persis apa yang butuh keputusan manusia dan siapa yang berwenang**, lalu **lanjut ke item berikutnya di §1**.

Item dengan status `Decision Required — Skip` tetap dilaporkan di ringkasan akhir (§7) untuk direview manual oleh Project Owner — bukan dianggap gagal.

---

## 6. Housekeeping Tambahan (Item 11, prioritas terendah)

- **Seq 66** (`09-publishing-architecture/66-Template-and-Publication-Asset-Register.md`): entri Evidence Pending — isi dengan inventarisasi template/asset publikasi aktual yang ditemukan di repo.
- **9 folder kosong** (dicatat Master Artifact Register §13.6, tidak pernah dipakai, dokumen sejenis sudah ada di lokasi lain):
  `02-business-architecture/business-processes/`, `02-business-architecture/capability-map/`, `02-business-architecture/regulatory-mapping/`, `02-business-architecture/value-streams/`, `03-data-architecture/master-reference-data/`, `04-application-architecture/application-portfolio/`, `04-application-architecture/dependency-maps/`, `04-application-architecture/domain-boundaries/`, `04-application-architecture/module-blueprints/`.
  Karena git tidak melacak direktori kosong (tidak ada risiko kehilangan data), hapus folder-folder ini dari filesystem dan catat pembersihan ini di Master Artifact Register §13.

---

## 7. Kondisi Stop

Loop berhenti (panggil stop, bukan lanjut menjadwalkan wake-up baru) **hanya** setelah semua 11 baris di §3 berstatus salah satu dari: `Selesai`, `Decision Required — Skip`, atau `N/A — Skip Sah`. Sebagai penutup, tulis ringkasan singkat di bagian ini (ditambahkan oleh loop saat selesai): daftar item Selesai, daftar item Decision Required beserta apa yang dibutuhkan, dan daftar commit yang dibuat — supaya Project Owner tinggal review + push.

**Ringkasan akhir (diisi otomatis saat loop selesai):**

_(belum terisi)_

---

## 8. Cara Menjalankan

Jalankan sekali: `/loop` (mode self-pacing, tanpa interval tetap) dengan instruksi merujuk file ini — contoh prompt:

> Kerjakan backlog di `dokumenEPelara/Arsitektur Pengembangan e-Pelara/11-roadmaps/backlog-eksekusi-otomatis.md` sesuai aturan di dalamnya, satu item per iterasi, sampai kondisi stop §7 tercapai.

Tidak perlu perintah tambahan setelah ini — loop akan menjadwalkan lanjutannya sendiri dan berhenti otomatis sesuai §7.

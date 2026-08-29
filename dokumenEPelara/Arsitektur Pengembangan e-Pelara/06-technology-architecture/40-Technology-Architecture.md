---
document_id: ARCH-TECH-001
title: Technology Architecture
system: e-PeLARA Next Generation
classification: Enterprise Architecture
domain: Technology Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../00-governance/00-Architecture-Charter.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Application/Integration Architecture
intended_repository_path: 06-technology-architecture/40-Technology-Architecture.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 40 — Technology Architecture

## 1. Tujuan dan Kedudukan

Dokumen ini adalah Technology Architecture overview untuk e-PeLARA Next Generation (Seq 40), disusun di bawah mandat 10-Artifact Autonomous Batch Project Owner Fahmi Alhabsi tanggal 2026-08-05. Dokumen menetapkan **candidate technology principle dan layer landscape** — prinsip dan kategori teknologi konseptual yang mendukung Application Architecture (Seq 29, Approved) dan Integration Architecture (Seq 34, Approved) — tanpa memilih vendor, produk, versi, atau konfigurasi teknis aktual.

Dokumen ini **tidak** menetapkan: vendor/produk spesifik, versi software, konfigurasi infrastruktur, deployment topology rinci, atau disposition Gate. Detail tersebut didelegasikan ke STD-TECH-001 (Technology Standards Catalog, Seq 41), BP-TECH-001 (Environment and Deployment Blueprint, Seq 42), BP-TECH-002 (Observability, Seq 43), dan BP-TECH-003 (Resilience/DR, Seq 44) — seluruhnya belum dimulai.

## 2. Ruang Lingkup

Dalam scope: prinsip teknologi, klasifikasi layer teknologi konseptual (compute, data store, integration runtime, presentation, security infrastructure), boundary dengan Application/Integration Architecture, dan interface ke standar/blueprint teknologi lanjutan. Di luar scope: pemilihan vendor/produk, versi, konfigurasi, kapasitas, biaya, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, batch ini) §6, §10 — application domain landscape dan boundary teknologi.
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, batch ini) §9 — boundary integrasi-teknologi.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-005 (beberapa library UI digunakan bersamaan, Open, target G3), AIR-009 (backup/restore otomatis belum tersedia, Decision Required, target G3-G5).
- `00-governance/00-Architecture-Charter.md` — prinsip keberlanjutan dan keamanan (dirujuk konsisten dari sesi sebelumnya).
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §6.5 — Seq 40-44, dependency, Gate G3-G5.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending — konsisten dengan artefak sebelumnya.

## 5. Prinsip Technology Architecture

1. Teknologi mendukung Application dan Integration Architecture; teknologi tidak menentukan boundary domain (arah sebaliknya berlaku — domain sudah ditetapkan ARCH-APP-001/ARCH-INT-001, teknologi mengikuti).
2. Prinsip platform-agnostic pada level arsitektur: dokumen ini tidak mengunci satu vendor/produk pada level prinsip; pemilihan aktual adalah scope STD-TECH-001.
3. Resiliency dan backup/restore adalah kebutuhan arsitektural yang harus direncanakan sejak awal, bukan ditambahkan belakangan; status aktual tetap mengikuti AIR-009 (belum tersedia).
4. Konsolidasi teknologi presentation (AIR-005 — beberapa library UI) adalah arah target, bukan keputusan yang sudah diselesaikan oleh dokumen ini.
5. Keamanan infrastruktur adalah cross-cutting concern yang berinteraksi dengan Security Architecture (ARCH-SEC-001, Seq 45, belum dimulai); dokumen ini tidak menetapkan security control rinci.

## 6. Candidate Technology Layer Landscape

| Layer Teknologi | Mendukung | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- | --- |
| Compute/Runtime Layer | Seluruh application domain (ARCH-APP-001 §6) | Lingkungan eksekusi aplikasi; tidak menetapkan platform (VM/container/serverless). | Candidate Target Direction |
| Data Store Layer | Data domain (BP-DATA-001, Approved) | Penyimpanan data otoritatif; tidak menetapkan produk database. | Documented Current (database existing pada baseline) + Candidate |
| Integration Runtime Layer | Integration domain (ARCH-INT-001 §6-7) | Lingkungan eksekusi pola integrasi (synchronous/asynchronous); tidak menetapkan message broker/API gateway produk. | Candidate Target Direction |
| Presentation/Design System Layer | APP-PUB-001, cross-cutting | Lingkungan rendering UI/publikasi; terkait AIR-005 (konsolidasi library UI, arah target). | Documented Current (multiple library existing) + Candidate Target Direction |
| Security Infrastructure Layer | Cross-cutting, seluruh domain | Infrastruktur pendukung kontrol keamanan (akan berinteraksi dengan ARCH-SEC-001 Seq 45). | Candidate Target Direction |
| Observability and Resilience Layer | Cross-cutting, operasional | Monitoring, backup, restore, disaster recovery; terkait AIR-009 (belum tersedia). | Evidence Pending (AIR-009 Decision Required) |

## 7. Boundary dengan Application dan Integration Architecture (Seq 29, 34 — Approved Batch Ini)

Application Architecture menetapkan **domain**; Integration Architecture menetapkan **pola komunikasi**; dokumen ini menetapkan **lapisan teknologi konseptual tempat keduanya berjalan**. Dokumen ini tidak mengubah domain atau pola integrasi yang telah ditetapkan.

## 8. Boundary dengan Security Architecture (Seq 45 — Belum Dimulai)

Security Infrastructure Layer (§6) hanya mencatat keberadaan lapisan konseptual; kontrol keamanan rinci (identity, access, threat model, secrets) didelegasikan sepenuhnya ke ARCH-SEC-001 (Seq 45) dan turunannya (BP-SEC-001/002/003, STD-SEC-001) yang belum dimulai.

## 9. Finding Baseline yang Relevan (Routing, Bukan Resolusi)

| Finding | Relevansi | Routing |
| --- | --- | --- |
| AIR-005 — Beberapa library UI digunakan bersamaan | Presentation/Design System Layer | Tetap Open; strategi konsolidasi didelegasikan ke STD-PUB-001 (Seq 62, belum dimulai) dan STD-TECH-001 (Seq 41). |
| AIR-009 — Backup dan restore otomatis belum tersedia | Observability and Resilience Layer | Tetap Decision Required; BP-TECH-003 (Resilience, Backup and Disaster Recovery Blueprint, Seq 44) yang menjadi artefak resolusinya **tidak termasuk batch ini** (kedalaman menengah/tinggi untuk resiliency memerlukan RPO/RTO yang bersifat keputusan institusional); dicatat sebagai Evidence Pending. |

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Vendor/produk/versi teknologi aktual | To be assigned by Project Owner — Evidence Pending | STD-TECH-001 Seq 41 |
| Environment/deployment topology | To be assigned by Project Owner — Evidence Pending | BP-TECH-001 Seq 42 |
| Observability tooling | To be assigned by Project Owner — Evidence Pending | BP-TECH-002 Seq 43 |
| RPO/RTO, backup/restore, DR | To be designated or verified by competent institutional authority — Evidence Pending | BP-TECH-003 Seq 44 (terkait AIR-009) |
| Security infrastructure rinci | To be assigned by Project Owner — Evidence Pending | ARCH-SEC-001 Seq 45 |

## 11. Assumptions dan Program State

1. ARCH-APP-001 dan ARCH-INT-001 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dependency normatif dokumen ini adalah status artefak Approved, bukan gate disposition, konsisten dengan Sequencing Rule §6.9.
3. Dokumen ini tidak menetapkan disposition G3.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate technology layer landscape berdasarkan Application/Integration Architecture yang Approved, mengklarifikasi boundary dengan Security Architecture, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan vendor/produk/versi, konfigurasi infrastruktur, RPO/RTO, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ditemukan finding. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Technology Architecture sebagai ARCH-TECH-001 Seq 40, berdasarkan ARCH-APP-001 dan ARCH-INT-001 (Approved). Cakupan: candidate technology layer landscape (6 layer), boundary Application/Integration/Security Architecture, routing AIR-005/AIR-009 tanpa resolusi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-APP-001, ARCH-INT-001) Approved dan tidak diubah.
3. ✓ Tidak ada vendor/produk/versi/konfigurasi konkret ditetapkan.
4. ✓ AIR-005/AIR-009 dirutekan, bukan diselesaikan; BP-TECH-003 eksplisit di luar batch.
5. ✓ Boundary Application/Integration/Security Architecture akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

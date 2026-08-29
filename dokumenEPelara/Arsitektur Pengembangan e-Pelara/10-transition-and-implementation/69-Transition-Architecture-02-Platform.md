---
document_id: BP-MIG-002
title: Transition Architecture 02 — Platform
system: e-PeLARA Next Generation
classification: Transition Architecture Blueprint
domain: Transition and Implementation
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../10-transition-and-implementation/68-Transition-Architecture-01-Foundation.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G4 — Migration Ready
roadmap_dependency: Transition 01
intended_repository_path: 10-transition-and-implementation/69-Transition-Architecture-02-Platform.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 69 — Transition Architecture 02 — Platform

## 1. Tujuan dan Kedudukan

Dokumen ini melanjutkan BP-MIG-001 (Transition Architecture 01 — Foundation, Approved batch ini) dengan menetapkan **candidate transition state description** untuk tahap Platform — Application, Integration, dan Technology — melanjutkan Roadmap Wave 3 (Design Secure Modular Platform). Dokumen ini menjelaskan keadaan transisi yang disetujui sebagai rencana (**Approved Plan**), bukan pernyataan bahwa platform/aplikasi telah bermigrasi atau beroperasi pada environment baru.

## 2. Ruang Lingkup

Dalam scope: candidate transition state untuk domain Application/Integration/Technology, dependency terhadap Foundation (BP-MIG-001). Di luar scope: kode aplikasi migrasi aktual, jadwal pelaksanaan, dan disposition G4.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `10-transition-and-implementation/68-Transition-Architecture-01-Foundation.md` (BP-MIG-001, Approved, batch ini) §6 — transition state Foundation sebagai prasyarat Platform.
- `00-governance/03-Architecture-Issue-Register.md` §8 — status AIR-002 (Open, status dashboard), AIR-003 (Open, notification model), AIR-004 (Decision Required, workflow approval), AIR-007 (Decision Required, integrasi SIPD) dibaca verbatim sebagai prasyarat terbuka domain Application/Integration.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending; Approved Plan; Implementation Pending; Verification Pending.

## 5. Prinsip Transition Architecture 02 — Platform

1. **Approval keadaan transisi ≠ platform dibangun**: dokumen ini menyatakan keadaan source/target/dependency disetujui sebagai deskripsi rencana; tidak ada klaim bahwa aplikasi/integrasi/environment teknologi baru sudah beroperasi.
2. **Bergantung pada Foundation selesai sebagai rencana, bukan pelaksanaan**: mengikuti Critical Dependency Chain Roadmap §7.1 — Platform transition state disusun setelah Foundation transition state disetujui (BP-MIG-001), bukan setelah Foundation benar-benar dimigrasikan.
3. **Empat gap terbuka dicatat sebagai prasyarat eksplisit**: AIR-002, AIR-003, AIR-004, AIR-007 harus diputuskan sebelum work package Platform terkait dapat dimulai — dokumen ini tidak menyelesaikan satu pun.
4. **Coexistence dengan sistem berjalan**: transisi Platform harus mempertimbangkan bahwa sistem lama tetap beroperasi selama masa transisi (Roadmap §15.2) — prinsip, bukan bukti pelaksanaan.

## 6. Candidate Transition State — Platform

| Elemen | Source State (Documented Current Fact/Assessment) | Target State (Approved Architecture Direction) | Evidence Status |
| --- | --- | --- | --- |
| Application Platform | AIR-002 (status dashboard tidak konsisten, Open); AIR-004 (workflow approval, Decision Required). | ARCH-APP-001/BP-APP-001/003 (Approved Batch 1). | Approved Plan; Implementation Pending untuk AIR-002/004 |
| Integration Platform | AIR-003 (notification model, Open); AIR-007 (integrasi SIPD, Decision Required). | ARCH-INT-001/STD-INT-001/002 (Approved Batch 1). | Approved Plan; Implementation Pending untuk AIR-003/007 |
| Technology Platform | Baseline current state (Evidence Pending rincian teknis). | ARCH-TECH-001 dan turunannya (Approved Batch 1-2). | Approved Plan |

## 7. Boundary dengan BP-MIG-001 (Approved, Batch Ini)

BP-MIG-001 menetapkan transition state Foundation; dokumen ini melanjutkan untuk tahap Platform, dengan dependency eksplisit terhadap Foundation, tanpa mengubah transition state BP-MIG-001.

## 8. Boundary dengan BP-MIG-003 (Batch Ini)

BP-MIG-003 (Transition Architecture 03 — Scale) akan melanjutkan transition state untuk tahap Scale (2031-2032, cross-OPD). Dokumen ini tidak mendahului cakupan tersebut.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Resolusi AIR-002/003/004/007 | To be designated or verified by competent institutional authority — Evidence Pending | Governance lanjutan (Decision Required/Open) |
| Environment platform aktual | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Jadwal migrasi aplikasi/integrasi aktual | To be assigned by Project Owner — Evidence Pending | Perencanaan operasional lanjutan |

## 10. Assumptions dan Program State

1. BP-MIG-001 dan domain blueprint Application/Integration/Technology (Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2/G3 tanpa disposition; dokumen ini tidak menetapkan disposition G4.
3. AIR-002, AIR-003, AIR-004, AIR-007 tetap berstatus sebagaimana tercatat; tidak ada resolusi baru.
4. Tidak ada aplikasi/integrasi/environment yang telah bermigrasi melalui dokumen ini.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate transition state Platform berdasarkan BP-MIG-001 dan domain blueprint Approved, mencatat AIR terbuka secara verbatim, routing Evidence Pending, self-review, dan finalisasi rencana (Approved Plan) dalam batas delegasi.

**Dilarang**: Mengklaim aplikasi/integrasi sudah bermigrasi, menutup AIR-002/003/004/007, menetapkan jadwal implementasi aktual, atau disposition G4.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; transition state sebagai Approved Plan, bukan klaim pelaksanaan. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Transition Architecture 02 — Platform sebagai BP-MIG-002 Seq 69, berdasarkan BP-MIG-001 dan domain blueprint Application/Integration/Technology (Approved). Cakupan: candidate transition state (Application/Integration/Technology Platform). AIR-002/003/004/007 dicatat verbatim tetap terbuka. Tidak ada klaim pelaksanaan migrasi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved (Approved Plan), efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (BP-MIG-001, domain blueprint) Approved dan tidak diubah.
3. ✓ AIR-002/003/004/007 dicatat verbatim, tidak diselesaikan.
4. ✓ Tidak ada klaim aplikasi/integrasi/environment sudah bermigrasi.
5. ✓ Approval dinyatakan eksplisit sebagai Approved Plan.
6. ✓ G1 DEFERRED, G2/G3 tanpa disposition; tidak ada disposition G4.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved** (Approved Plan). Dependency Approved dan tidak diubah. Belum ada aplikasi/integrasi/environment bermigrasi. AIR-002/003/004/007 tetap terbuka. G1 DEFERRED; G2/G3 tanpa disposition; tidak ada disposition G4.

---
document_id: BP-APP-001
title: Domain and Bounded Context Blueprint
system: e-PeLARA Next Generation
classification: Application Architecture Blueprint
domain: Application Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../04-application-architecture/29-Application-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Capability Map, Data Domains
intended_repository_path: 04-application-architecture/31-Domain-and-Bounded-Context-Blueprint.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 31 — Domain and Bounded Context Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam ARCH-APP-001 (Seq 29, Approved, batch ini) dengan menetapkan **candidate bounded context** untuk setiap application domain: tanggung jawab, batas data yang dimiliki, dan interaksi dengan domain lain. Dokumen ini tidak menetapkan desain modul teknis, skema database, atau API contract rinci.

## 2. Ruang Lingkup

Dalam scope: bounded context per application domain (tanggung jawab, data owned vs. data consumed, interaksi dengan domain lain). Di luar scope: skema database fisik, API contract, workflow rinci, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, batch ini) §6 — 10 candidate application domain dan pemetaan capability/data domain.
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, batch ini) §6 — pola integrasi antar-domain sebagai konteks interaksi.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Bounded Context

1. Setiap application domain memiliki **data owned** (data yang menjadi tanggung jawab utamanya untuk dikelola) dan **data consumed** (data milik domain lain yang dikonsumsi melalui interface).
2. Bounded context stabil terhadap perubahan struktur modul teknis, selaras dengan prinsip capability stabil (BP-BUS-001 §47).
3. Komunikasi antar bounded context mengikuti pola integrasi ARCH-INT-001 §6-7, bukan akses data langsung.

## 6. Candidate Bounded Context per Application Domain

| Application Domain (ARCH-APP-001 §6) | Data Owned (Primary) | Data Consumed (via Integration) | Interaksi Utama |
| --- | --- | --- | --- |
| APP-GOV-001 | DD-ORG-001 (organisasi/role) | DD-EVD-001 | Menyediakan konteks identitas/kewenangan ke seluruh domain lain. |
| APP-PLN-001 | DD-PLN-001 | DD-POL-001, DD-ORG-001 | → APP-BDG-001 (Synchronous, ARCH-INT-001 §6). |
| APP-BDG-001 | DD-BDG-001 | DD-PLN-001 | ← APP-PLN-001; → APP-EXE-001. |
| APP-EXE-001 | DD-EXE-001, DD-OPR-001 | DD-BDG-001 | ← APP-BDG-001; → APP-PRF-001 (Asynchronous). |
| APP-PRF-001 | DD-PRF-001 | DD-EXE-001 | ← APP-EXE-001; → APP-EVR-001 (Asynchronous). |
| APP-EVR-001 | DD-EVL-001, DD-DOC-001 | DD-PRF-001 | ← APP-PRF-001; → APP-PUB-001. |
| APP-DKM-001 | DD-MST-001, DD-MDL-001, DD-KNO-001 | Menerima event dari seluruh domain (lineage/metadata capture, ARCH-INT-001 §6) | Cross-cutting; melanjutkan BP-DATA-003/BP-DATA-004 (Approved). |
| APP-CMP-001 | DD-EVD-001 | Menerima evidence dari seluruh domain | Cross-cutting; melanjutkan GOV-DATA-001 (Approved). |
| APP-PUB-001 | DD-DOC-001, DD-KNO-001 | DD-EVL-001 (via APP-EVR-001), DD-KNO-001 (via APP-DKM-001) | Menerima input dari APP-EVR-001, APP-DKM-001. |
| APP-ADS-001 | — (tidak memiliki data primer; konsumen) | DD-KNO-001 (via APP-DKM-001) | Konsumen APP-DKM-001; output insight/rekomendasi (GOV-AI-001 §7, Approved — bukan decision authority). |

## 7. Prinsip Interaksi Cross-Domain

Interaksi antar bounded context mengikuti klasifikasi ARCH-INT-001 §7 (Internal Synchronous/Asynchronous). Domain tidak boleh mengakses data owned domain lain secara langsung tanpa melalui interface yang tercatat pada §6; pelanggaran prinsip ini dicatat sebagai finding arsitektur pada review berikutnya, bukan pada dokumen ini.

## 8. Boundary dengan ARCH-APP-001 dan ARCH-INT-001 (Approved, Batch Ini)

ARCH-APP-001 menetapkan domain; ARCH-INT-001 menetapkan pola komunikasi; dokumen ini menghubungkan keduanya menjadi bounded context yang konkret pada level data ownership. Dokumen ini tidak mengubah domain atau pola integrasi yang sudah ditetapkan.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Skema database fisik per bounded context | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| API contract antar bounded context | To be assigned by Project Owner — Evidence Pending | STD-INT-001 (Approved, batch ini) / REF-INT-001 Seq 37 |
| Owner aplikasi institusional per domain | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |

## 10. Assumptions dan Program State

1. ARCH-APP-001 dan ARCH-INT-001 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition.
3. Dokumen ini tidak menetapkan disposition G3.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate bounded context berdasarkan Application/Integration Architecture yang Approved, mengklarifikasi data ownership konseptual, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan skema database fisik, API contract rinci, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ditemukan finding. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Domain and Bounded Context Blueprint sebagai BP-APP-001 Seq 31, berdasarkan ARCH-APP-001 dan ARCH-INT-001 (Approved). Cakupan: candidate bounded context 10 domain (data owned/consumed), prinsip interaksi cross-domain. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-APP-001, ARCH-INT-001) Approved dan tidak diubah.
3. ✓ Tidak ada skema database/API contract konkret ditetapkan.
4. ✓ Boundary ARCH-APP-001/ARCH-INT-001 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

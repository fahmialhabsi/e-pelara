---
document_id: BP-SEC-001
title: Identity, Access and Separation of Duties Blueprint
system: e-PeLARA Next Generation
classification: Security Architecture Blueprint
domain: Security and Privacy Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../07-security-architecture/45-Security-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Roles/Authority Blueprint
intended_repository_path: 07-security-architecture/46-Identity-Access-and-Separation-of-Duties-Blueprint.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 46 — Identity, Access and Separation of Duties Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam ARCH-SEC-001 (Seq 45, Approved, Batch 2) §6 "Identity and Access Management" dengan menerjemahkan role archetype BP-BUS-004 (Approved) menjadi **candidate identity/access model dan separation-of-duties control teknis** — tanpa menetapkan mekanisme autentikasi/otorisasi teknis aktual (protokol, IdP, RBAC engine).

## 2. Ruang Lingkup

Dalam scope: candidate identity/access model konseptual, penerjemahan separation-of-duties BP-BUS-004 §23 ke konteks teknis, dan boundary dengan BP-INT-002 (SSO, Batch 1). Di luar scope: protokol autentikasi/otorisasi teknis, produk IdP, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `07-security-architecture/45-Security-Architecture.md` (ARCH-SEC-001, Approved, Batch 2) §6, §8 — Identity and Access Management control domain dan boundary Roles/Authority.
- `02-business-architecture/14-Roles-Authority-and-Approval-Blueprint.md` (BP-BUS-004, Approved) §9 (Role Archetype Catalogue), §23 (Separation-of-Duties Controls) — dibaca langsung sebagai basis.
- `05-integration-architecture/39-e-SIGAP-Integration-and-SSO-Blueprint.md` (BP-INT-002, Approved, Batch 1) §6-7 — boundary integrasi SSO eksternal.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Identity dan Access

1. **Role archetype BP-BUS-004 sebagai basis identity model**: dokumen ini tidak menciptakan role baru; role teknis (mis. system role/permission) diturunkan dari role archetype BP-BUS-004 §9, bukan sebaliknya.
2. **Least privilege pada level akses teknis**: setiap identity technical role memiliki scope akses minimum yang diperlukan untuk menjalankan role archetype-nya.
3. **Separation of duties diterjemahkan, bukan diciptakan ulang**: BP-BUS-004 §23 (Approved) sudah menetapkan separation-of-duties control konseptual (mis. preparer bukan approver); dokumen ini hanya menerjemahkannya ke kebutuhan teknis (mis. role-based access control tidak mengizinkan satu akun menjalankan kedua peran tanpa override tercatat).
4. **SSO eksternal tidak menggantikan otorisasi internal**: konsisten dengan BP-INT-002 §6 (Approved, Batch 1) — autentikasi federatif e-SIGAP tidak otomatis memberikan otorisasi penuh terhadap seluruh domain aplikasi.

## 6. Candidate Identity/Access Model

| Elemen | Deskripsi Konseptual | Rujukan |
| --- | --- | --- |
| Technical Role | Representasi teknis dari role archetype BP-BUS-004 §9; satu role archetype dapat memetakan ke satu atau lebih technical role. | BP-BUS-004 §9 |
| Permission Scope | Batas akses yang diperlukan role teknis terhadap application domain (ARCH-APP-001 §6). | ARCH-APP-001 §6 |
| Separation-of-Duties Rule | Aturan bahwa kombinasi role tertentu (mis. preparer + approver) tidak diberikan pada satu identity tanpa override tercatat. | BP-BUS-004 §23 |
| Federated Identity Context | Identity yang berasal dari SSO eksternal (e-SIGAP); memerlukan pemetaan ke technical role internal. | BP-INT-002 §6-7 |

## 7. Boundary dengan ARCH-SEC-001 dan BP-BUS-004 (Approved)

ARCH-SEC-001 menetapkan Identity and Access Management sebagai control domain; BP-BUS-004 menetapkan role archetype dan separation-of-duties konseptual pada level bisnis. Dokumen ini menghubungkan keduanya ke model teknis, tanpa mengubah role archetype atau separation-of-duties control yang sudah Approved.

## 8. Boundary dengan BP-INT-002 (SSO, Approved, Batch 1)

BP-INT-002 menetapkan boundary integrasi identitas eksternal (e-SIGAP); dokumen ini menetapkan bagaimana identity federatif tersebut dipetakan ke technical role internal (§6, Federated Identity Context). Dokumen ini tidak mengubah boundary integrasi yang telah ditetapkan BP-INT-002.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Protokol autentikasi/otorisasi teknis aktual | To be assigned by Project Owner — Evidence Pending | STD-SEC-001 (batch ini) / implementasi teknis |
| Produk IdP/RBAC engine | To be assigned by Project Owner — Evidence Pending | STD-TECH-001 (Approved, Batch 2) / implementasi teknis |
| Pemetaan technical role ke role archetype aktual | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |

## 10. Assumptions dan Program State

1. ARCH-SEC-001, BP-BUS-004, BP-INT-002 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate identity/access model berdasarkan ARCH-SEC-001/BP-BUS-004/BP-INT-002 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan protokol/produk IdP aktual, mengubah role archetype/separation-of-duties BP-BUS-004, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 2) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Identity, Access and Separation of Duties Blueprint sebagai BP-SEC-001 Seq 46, berdasarkan ARCH-SEC-001, BP-BUS-004, BP-INT-002 (Approved). Cakupan: candidate identity/access model, penerjemahan separation-of-duties, boundary SSO. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-SEC-001, BP-BUS-004, BP-INT-002) Approved dan tidak diubah.
3. ✓ Tidak ada protokol/produk IdP aktual ditetapkan.
4. ✓ Role archetype/separation-of-duties BP-BUS-004 tidak diciptakan ulang, hanya diterjemahkan.
5. ✓ Boundary ARCH-SEC-001/BP-BUS-004/BP-INT-002 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

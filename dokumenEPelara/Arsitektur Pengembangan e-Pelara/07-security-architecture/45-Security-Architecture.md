---
document_id: ARCH-SEC-001
title: Security Architecture
system: e-PeLARA Next Generation
classification: Enterprise Architecture
domain: Security and Privacy Architecture
version: 1.0.1
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-29
parent_document: ../00-governance/00-Architecture-Charter.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Business, Data, Application inputs
intended_repository_path: 07-security-architecture/45-Security-Architecture.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 45 — Security Architecture

## 1. Tujuan dan Kedudukan

Dokumen ini adalah Security Architecture overview untuk e-PeLARA Next Generation (Seq 45), disusun di bawah mandat 10-Artifact Autonomous Batch (Batch 2) Project Owner Fahmi Alhabsi tanggal 2026-08-05. Dokumen menerjemahkan Roles/Authority Blueprint (BP-BUS-004, Approved), Data Classification Standard (STD-DATA-002, Approved), dan Application/Integration/Technology Architecture (Batch 1, Approved) menjadi **candidate security principle dan control domain landscape** — tanpa menetapkan mekanisme teknis kontrol keamanan, produk security tooling, atau kriteria compliance/certification aktual.

Dokumen ini **tidak** menetapkan: mekanisme autentikasi/otorisasi teknis rinci, produk security tooling, threat model rinci per komponen, secrets management rinci, atau disposition Gate. Detail tersebut didelegasikan ke BP-SEC-001 (Identity/Access/Separation of Duties, batch ini), BP-SEC-002 (Security/Privacy/Audit Control, batch ini), BP-SEC-003 (Threat Model, batch ini), dan STD-SEC-001 (Secure Engineering/Secrets, batch ini).

## 2. Ruang Lingkup

Dalam scope: prinsip keamanan (defense-in-depth, least privilege, separation of duties di level prinsip), klasifikasi control domain konseptual, boundary dengan Application/Integration/Technology/Data Architecture, dan interface ke blueprint/standar security lanjutan. Di luar scope: mekanisme teknis rinci, produk security, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `02-business-architecture/14-Roles-Authority-and-Approval-Blueprint.md` (BP-BUS-004, Approved) §4, §17, §19 — prinsip roles/authority, oversight/audit roles, dan AI/automation boundary sebagai basis identity/access.
- `03-data-architecture/data-governance/25-Data-Classification-Retention-and-Privacy-Standard.md` (STD-DATA-002, Approved) — classification scheme archetype sebagai basis data protection control.
- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, Batch 1) §6 — application domain sebagai konteks kontrol keamanan.
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, Batch 1) §6 — integration domain sebagai konteks kontrol keamanan.
- `06-technology-architecture/40-Technology-Architecture.md` (ARCH-TECH-001, Approved, Batch 1) §6, §8 — Security Infrastructure Layer.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-008 (CSRF protection belum tersedia, Open, target G3).
- `00-governance/05-Compliance-Register.md` — COMP-008 (REG-09/REG-10 PSE dan PDP, Under Applicability Assessment, target G3).

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Security Architecture

1. **Defense-in-depth**: kontrol keamanan berlapis pada setiap layer (ARCH-TECH-001 §6), bukan bergantung pada satu titik kontrol.
2. **Least privilege**: akses dibatasi sesuai kebutuhan peran (BP-BUS-004 role archetype), bukan default terbuka.
3. **Separation of duties**: konsisten dengan BP-BUS-004 §23 (Separation-of-Duties Controls, Approved) — dokumen ini tidak menciptakan model separation of duties baru, hanya menerjemahkannya ke konteks teknis.
4. **AI bukan security authority**: konsisten dengan BP-BUS-004 §19 dan GOV-AI-001 (Approved) — AI/automation tidak menjadi independent verifier keamanan.
5. **Privacy by design**: kontrol data protection mengikuti klasifikasi STD-DATA-002 (Approved); dokumen ini tidak mengubah classification scheme yang telah ditetapkan.
6. **Applicability regulasi tetap eksklusif Compliance Register**: dokumen ini tidak menentukan applicability COMP-008 (REG-09/REG-10); status tersebut tetap Under Applicability Assessment sampai otoritas berwenang menetapkan.

## 6. Candidate Security Control Domain Landscape

| Control Domain | Konteks | Evidence Status |
| --- | --- | --- |
| Identity and Access Management | APP-GOV-001 (ARCH-APP-001 §6), role archetype BP-BUS-004 | Candidate Target Direction; detail di BP-SEC-001 (batch ini) |
| Data Protection and Privacy | Classification scheme STD-DATA-002 (Approved) | Candidate Target Direction; detail di BP-SEC-002 (batch ini) |
| Application Security | Seluruh application domain (ARCH-APP-001 §6); terkait AIR-008 (CSRF) | Evidence Pending (AIR-008 Open) |
| Integration Security | Pola integrasi ARCH-INT-001 §6-7, khususnya integrasi eksternal (SIPD, e-SIGAP) | Candidate Target Direction |
| Infrastructure Security | Security Infrastructure Layer (ARCH-TECH-001 §6) | Candidate Target Direction |
| Threat and Zone Management | Lintas Application/Integration/Technology | Candidate Target Direction; detail di BP-SEC-003 (batch ini) |
| Secure Engineering and Secrets | Lintas seluruh domain (development lifecycle, credential management) | Candidate Target Direction; detail di STD-SEC-001 (batch ini) |
| Audit and Compliance Assurance | BP-BUS-004 §17 (Oversight, Audit, Compliance Roles); COMP-008 | Documented Current (role archetype Approved) + Evidence Pending (COMP-008 Under Assessment) |

## 7. Boundary dengan Data Classification (STD-DATA-002, Approved)

Data Protection Control Domain (§6) menggunakan classification scheme archetype STD-DATA-002 (4 level: Public/Internal/Restricted/Confidential, illustrative) sebagai basis; dokumen ini tidak mengubah scheme tersebut, hanya menerjemahkannya ke kebutuhan kontrol akses teknis konseptual.

## 8. Boundary dengan Roles/Authority Blueprint (BP-BUS-004, Approved)

Identity and Access Management Control Domain menggunakan role archetype dan separation-of-duties control BP-BUS-004 sebagai basis; dokumen ini tidak menciptakan role baru, hanya menerjemahkannya ke kebutuhan identity/access teknis (detail di BP-SEC-001).

## 9. Finding Baseline yang Relevan (Routing, Bukan Resolusi)

| Finding | Domain Terdampak | Routing |
| --- | --- | --- |
| AIR-008 — CSRF protection belum tersedia | Application Security | **Addendum 2026-08-29**: AIR-008 diperbarui menjadi Resolved di Architecture Issue Register (v1.0.7) setelah verifikasi implementasi kode langsung (self-test 19/19 pass). Dicatat sesuai routing §10 dokumen ini ("AIR-EA-001, verifikasi implementasi") — resolusi tetap tercatat otoritatif di Issue Register itu sendiri, bukan ditulis ulang di sini. |
| COMP-008 — REG-09/REG-10 (PSE, PDP) | Data Protection, Application Security | Status Under Applicability Assessment tidak diubah; dokumen ini tidak membuat applicability determination. |

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Mekanisme autentikasi/otorisasi teknis | To be assigned by Project Owner — Evidence Pending | BP-SEC-001 (batch ini) |
| Kontrol privacy/audit rinci | To be assigned by Project Owner — Evidence Pending | BP-SEC-002 (batch ini) |
| Threat model dan security zone rinci | To be assigned by Project Owner — Evidence Pending | BP-SEC-003 (batch ini) |
| Secure engineering/secrets management rinci | To be assigned by Project Owner — Evidence Pending | STD-SEC-001 (batch ini) |
| Resolusi AIR-008 (CSRF) | **Addendum 2026-08-29**: verifikasi implementasi selesai, AIR-008 kini Resolved di AIR-EA-001 v1.0.7 — closure formal tetap Evidence Pending (wewenang Project Owner/otoritas keamanan). | AIR-EA-001 (verifikasi implementasi) |
| Applicability COMP-008 | To be designated or verified by competent institutional authority — Evidence Pending | Compliance Register (legal verification) |

## 11. Assumptions dan Program State

1. BP-BUS-004, STD-DATA-002, ARCH-APP-001, ARCH-INT-001, ARCH-TECH-001 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dependency normatif adalah status artefak Approved, bukan gate disposition.
3. Dokumen ini tidak menetapkan disposition G3.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate security control domain landscape berdasarkan artefak yang Approved, mengklarifikasi boundary, routing AIR-008/COMP-008 tanpa resolusi, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan mekanisme teknis kontrol keamanan, produk security tooling, applicability COMP-008, resolusi AIR-008, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; AIR-008/COMP-008 dirutekan tanpa resolusi. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 2) tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Security Architecture sebagai ARCH-SEC-001 Seq 45, berdasarkan BP-BUS-004, STD-DATA-002, ARCH-APP-001, ARCH-INT-001, ARCH-TECH-001 (Approved). Cakupan: 8 candidate security control domain, boundary Data Classification/Roles Authority, routing AIR-008/COMP-008 tanpa resolusi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |
| 1.0.1 | 2026-08-29 | Addendum administratif: baris §9/§10 terkait AIR-008 diperbarui mencatat bahwa AIR-008 kini Resolved di Architecture Issue Register (v1.0.7), tidak menulis ulang resolusi di dokumen ini (tetap sesuai routing asli — resolusi otoritatif di AIR-EA-001). Tidak ada perubahan pada 8 candidate security control domain atau kesimpulan konseptual dokumen ini. | Claude (mode `/loop`, sesi eksekusi backlog) | Approved — Administrative Patch |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Seluruh dependency Approved dan tidak diubah.
3. ✓ Tidak ada mekanisme teknis/produk security konkret ditetapkan.
4. ✓ AIR-008/COMP-008 dirutekan, tidak diselesaikan; tidak ada applicability determination.
5. ✓ Boundary Data Classification/Roles Authority/Application/Integration/Technology akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. AIR-008 tetap Open; COMP-008 tetap Under Applicability Assessment. G1 DEFERRED; G2 tanpa disposition.

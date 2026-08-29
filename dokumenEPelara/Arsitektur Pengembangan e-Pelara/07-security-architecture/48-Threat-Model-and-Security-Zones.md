---
document_id: BP-SEC-003
title: Threat Model and Security Zones
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
roadmap_dependency: App/Integration/Technology Architecture
intended_repository_path: 07-security-architecture/48-Threat-Model-and-Security-Zones.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 48 — Threat Model and Security Zones

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam ARCH-SEC-001 (Seq 45, Approved, Batch 2) §6 "Threat and Zone Management" dengan menetapkan **candidate security zone konseptual dan prinsip threat modeling** di atas Application/Integration/Technology Architecture (Batch 1, Approved) — tanpa melakukan threat modeling teknis rinci per komponen atau menetapkan kontrol mitigasi teknis aktual.

## 2. Ruang Lingkup

Dalam scope: candidate security zone (trust boundary konseptual), prinsip threat modeling tingkat arsitektur, dan boundary dengan Integration/Technology Architecture. Di luar scope: threat model teknis rinci (STRIDE/DREAD per komponen), kontrol mitigasi teknis, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `07-security-architecture/45-Security-Architecture.md` (ARCH-SEC-001, Approved, Batch 2) §6 — Threat and Zone Management control domain.
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, Batch 1) §6-7 — pola integrasi internal/eksternal sebagai basis trust boundary.
- `06-technology-architecture/40-Technology-Architecture.md` (ARCH-TECH-001, Approved, Batch 1) §6 — technology layer sebagai basis zone fisik/logis.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Threat Modeling Tingkat Arsitektur

1. **Trust boundary mengikuti pola integrasi**: batas kepercayaan (trust boundary) diturunkan dari klasifikasi integrasi ARCH-INT-001 §7 (Internal vs. Eksternal) — integrasi eksternal (SIPD, e-SIGAP) berada di luar trust boundary internal secara default.
2. **Threat modeling adalah proses berkelanjutan, bukan checklist satu kali**: dokumen ini menetapkan prinsip, bukan hasil threat model final; threat model rinci per komponen adalah aktivitas implementasi berkelanjutan.
3. **Zona bukan pengganti kontrol**: pembagian security zone tidak menggantikan kebutuhan kontrol identity/access (BP-SEC-001) atau data protection (BP-SEC-002) di dalam zona itu sendiri.

## 6. Candidate Security Zone

| Zone | Deskripsi Konseptual | Trust Level | Rujukan |
| --- | --- | --- | --- |
| Internal Trusted Zone | Application domain internal (ARCH-APP-001 §6) yang berkomunikasi via Internal Synchronous/Asynchronous. | Tinggi (internal) | ARCH-INT-001 §7 |
| Integration Boundary Zone | Titik integrasi antar-domain internal maupun ke eksternal; memerlukan verifikasi kontrak (STD-INT-001, Approved Batch 1). | Sedang (boundary) | ARCH-INT-001 §6 |
| External Untrusted Zone | Sistem eksternal (SIPD, e-SIGAP) sebelum verifikasi kontrak/identitas. | Rendah (untrusted by default) | ARCH-INT-001 §6, BP-INT-002 §5 (Approved, Batch 1) |
| Presentation Zone | Layer presentation/design system (ARCH-TECH-001 §6) yang berhadapan dengan pengguna akhir. | Sedang (user-facing) | ARCH-TECH-001 §6 |

## 7. Boundary dengan ARCH-INT-001 dan ARCH-TECH-001 (Approved, Batch 1)

Trust boundary (§6) diturunkan dari klasifikasi integrasi dan layer teknologi yang sudah Approved; dokumen ini tidak mengubah klasifikasi tersebut, hanya menambahkan lapisan konseptual keamanan di atasnya.

## 8. Boundary dengan BP-SEC-001 dan BP-SEC-002 (Batch Ini)

Security zone menetapkan **di mana** trust boundary berada; BP-SEC-001 (identity/access) dan BP-SEC-002 (data protection) menetapkan **kontrol apa** yang berlaku di dalam/lintas zona. Dokumen ini tidak menciptakan kontrol baru, hanya konteks zona.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Threat model teknis rinci (STRIDE/DREAD) per komponen | To be assigned by Project Owner — Evidence Pending | Implementasi teknis / security review berkelanjutan |
| Kontrol mitigasi teknis per zona | To be assigned by Project Owner — Evidence Pending | STD-SEC-001 (batch ini) / implementasi teknis |
| Network segmentation aktual | To be assigned by Project Owner — Evidence Pending | STD-TECH-001 (Approved, Batch 2) / implementasi teknis |

## 10. Assumptions dan Program State

1. ARCH-SEC-001, ARCH-INT-001, ARCH-TECH-001 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate security zone dan prinsip threat modeling berdasarkan ARCH-SEC-001/ARCH-INT-001/ARCH-TECH-001 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Melakukan threat modeling teknis rinci per komponen, menetapkan kontrol mitigasi teknis aktual, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 2) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Threat Model and Security Zones sebagai BP-SEC-003 Seq 48, berdasarkan ARCH-SEC-001, ARCH-INT-001, ARCH-TECH-001 (Approved). Cakupan: candidate security zone (4 zona), prinsip threat modeling tingkat arsitektur, boundary BP-SEC-001/002. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-SEC-001, ARCH-INT-001, ARCH-TECH-001) Approved dan tidak diubah.
3. ✓ Tidak ada threat model teknis rinci atau kontrol mitigasi aktual ditetapkan.
4. ✓ Boundary ARCH-INT-001/ARCH-TECH-001/BP-SEC-001/BP-SEC-002 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

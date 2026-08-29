---
document_id: BP-INT-002
title: e-SIGAP Integration and SSO Blueprint
system: e-PeLARA Next Generation
classification: Integration Architecture Blueprint
domain: Integration Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../05-integration-architecture/34-Integration-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Identity Blueprint, Integration Architecture
intended_repository_path: 05-integration-architecture/39-e-SIGAP-Integration-and-SSO-Blueprint.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 39 — e-SIGAP Integration and SSO Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **candidate boundary dan prinsip** integrasi identitas (SSO) dengan e-SIGAP, melanjutkan klasifikasi "Eksternal — Identity/SSO" (ARCH-INT-001 §6, Approved, batch ini) dan APP-GOV-001 (ARCH-APP-001 §6, Approved, batch ini). Dokumen ini **tidak** menetapkan protokol SSO aktual (SAML/OAuth/OIDC), kontrak API e-SIGAP, atau status ketersediaan integrasi — evidence mengenai e-SIGAP pada baseline yang dibaca sesi ini terbatas pada satu rujukan Charter (§59, §146) yang menyatakan e-SIGAP sebagai arah fondasi integrasi, tanpa detail teknis.

## 2. Ruang Lingkup

Dalam scope: prinsip boundary integrasi identitas, klasifikasi konseptual SSO, dan routing Evidence Pending untuk detail teknis. Di luar scope: protokol SSO aktual, kontrak/API e-SIGAP, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/00-Architecture-Charter.md` §59, §146 — satu-satunya rujukan e-SIGAP pada baseline yang dibaca sesi ini; menyatakan e-SIGAP sebagai arah fondasi integrasi tanpa detail kontrak.
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, batch ini) §6 — klasifikasi "Eksternal — Identity/SSO."
- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, batch ini) §6 — APP-GOV-001 sebagai domain identitas/kewenangan.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Status Evidence e-SIGAP (Eksplisit)

Berbeda dari SIPD (COMP-003, AIR-007 — sudah memiliki finding terdokumentasi lengkap), e-SIGAP **belum memiliki entri Issue Register atau Compliance Register tersendiri** pada evidence yang dibaca sesi ini. Dokumen ini tidak mengasumsikan integrasi e-SIGAP tersedia, memiliki kontrak, atau memiliki jadwal — konsisten dengan prinsip Charter bahwa integrasi eksternal memerlukan "kontrak integrasi yang terkendali" (Charter §59), bukan asumsi ketersediaan.

## 6. Prinsip Boundary Integrasi Identitas

1. **SSO sebagai fondasi APP-GOV-001**: Domain identitas/kewenangan (APP-GOV-001) adalah titik integrasi tunggal dengan e-SIGAP; domain lain tidak berintegrasi langsung dengan e-SIGAP.
2. **Prinsip least-disruption**: Integrasi SSO tidak menggantikan model role/permission internal (DD-ORG-001, BP-DATA-001) tanpa keputusan eksplisit; SSO menyediakan autentikasi federatif, bukan otomatis menggantikan otorisasi internal.
3. **Fallback tidak diasumsikan**: Dokumen ini tidak mengasumsikan mekanisme fallback jika e-SIGAP tidak tersedia; detail tersebut adalah keputusan implementasi/ADR bila material.
4. **Kontrak-first, konsisten dengan STD-INT-001**: Integrasi eksternal mengikuti prinsip contract-first (STD-INT-001 §5) yang sama dengan integrasi internal, dengan lapisan verifikasi tambahan untuk pihak eksternal.

## 7. Candidate Integration Boundary

| Elemen | Boundary Konseptual |
| --- | --- |
| Titik integrasi | APP-GOV-001 (ARCH-APP-001 §6) sebagai satu-satunya konsumen langsung. |
| Data yang dipertukarkan (konseptual) | Identitas pengguna, klaim otorisasi federatif — tidak menetapkan skema field. |
| Protokol | Tidak ditetapkan; kandidat umum SSO government-to-government (mis. SAML/OIDC) dicatat sebagai referensi konteks, bukan keputusan. |
| Governance akses | Mengikuti GOV-DATA-001 role archetype (Approved) untuk internal; akses federatif e-SIGAP adalah Evidence Pending. |

## 8. Boundary dengan ARCH-INT-001 dan ARCH-APP-001 (Approved, Batch Ini)

ARCH-INT-001 mengklasifikasikan integrasi eksternal identitas sebagai kategori; dokumen ini memperdalam boundary dan prinsip untuk kategori tersebut secara spesifik pada e-SIGAP. Dokumen ini tidak mengubah klasifikasi ARCH-INT-001 atau domain ARCH-APP-001.

## 9. Boundary dengan BP-SEC-001 (Identity, Access and Separation of Duties, Seq 46 — Belum Dimulai)

Mekanisme teknis identity/access control (termasuk implementasi SSO rinci) didelegasikan sepenuhnya ke BP-SEC-001, yang belum dimulai. Dokumen ini hanya menetapkan boundary integrasi pada level Integration Architecture, bukan Security Architecture.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Ketersediaan dan kontrak integrasi e-SIGAP aktual | To be designated or verified by competent institutional authority — Evidence Pending | Eskalasi Project Owner untuk integrasi eksternal (konsisten pola AIR-007) |
| Protokol SSO aktual | To be assigned by Project Owner — Evidence Pending | BP-SEC-001 Seq 46 / implementasi teknis |
| Skema klaim identitas/otorisasi federatif | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Mekanisme fallback | To be assigned by Project Owner — Evidence Pending | ADR bila material |

## 11. Assumptions dan Program State

1. ARCH-INT-001 dan ARCH-APP-001 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. Evidence e-SIGAP pada baseline sesi ini terbatas pada rujukan Charter §59/§146; tidak ada Issue/Compliance Register entry khusus e-SIGAP yang ditemukan — dicatat sebagai gap evidence, bukan diasumsikan tidak ada isu.
3. G1 DEFERRED; G2 tanpa disposition.
4. Dokumen ini tidak menetapkan disposition G3.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate boundary integrasi identitas berdasarkan Integration/Application Architecture yang Approved, mencatat keterbatasan evidence e-SIGAP secara eksplisit, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan protokol SSO aktual, kontrak/API e-SIGAP, mengasumsikan ketersediaan integrasi, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved dan evidence terbatas yang tersedia. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; keterbatasan evidence e-SIGAP dicatat eksplisit, tidak diasumsikan. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal e-SIGAP Integration and SSO Blueprint sebagai BP-INT-002 Seq 39, berdasarkan ARCH-INT-001 dan ARCH-APP-001 (Approved). Cakupan: candidate boundary integrasi identitas, prinsip SSO konseptual, keterbatasan evidence e-SIGAP dicatat eksplisit. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-INT-001, ARCH-APP-001) Approved dan tidak diubah.
3. ✓ Tidak ada protokol/kontrak e-SIGAP aktual diarang; keterbatasan evidence dicatat eksplisit.
4. ✓ Boundary ARCH-INT-001/ARCH-APP-001/BP-SEC-001 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. Evidence e-SIGAP tetap terbatas — Evidence Pending untuk detail teknis. G1 DEFERRED; G2 tanpa disposition.

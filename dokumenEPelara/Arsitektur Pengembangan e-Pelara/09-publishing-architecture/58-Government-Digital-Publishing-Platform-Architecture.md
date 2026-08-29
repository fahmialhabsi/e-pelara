---
document_id: ARCH-PUB-001
title: Government Digital Publishing Platform Architecture
system: e-PeLARA Next Generation
classification: Architecture Overview
domain: Publishing and Design System
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
roadmap_dependency: Business/Data/Application foundations
intended_repository_path: 09-publishing-architecture/58-Government-Digital-Publishing-Platform-Architecture.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 58 — Government Digital Publishing Platform Architecture

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **candidate architecture overview** untuk Government Digital Publishing Platform (GDPP) — North Star Platform kedua sesuai Master Roadmap §3.2 — yang menerapkan filosofi **One Data, Many Publications** melanjutkan BP-BUS-003 (Government Document Lifecycle, Approved), ARCH-DATA-001/BP-DATA-003 (Data Architecture dan Lineage, Approved), dan ARCH-APP-001 (Application Architecture, Approved, Batch 1). Dokumen ini adalah **arsitektur**, bukan implementasi generator/rendering engine; tidak ada klaim bahwa GDPP sudah beroperasi.

## 2. Ruang Lingkup

Dalam scope: layer arsitektur GDPP tingkat tinggi (Document Model, Generation/Publishing Pipeline, Template/Design Boundary, Traceability, Accessibility, Publication Quality), boundary dengan Document Lifecycle dan Data Lineage. Di luar scope: skema database dokumen, mesin rendering aktual, template konkret, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/00-Architecture-Charter.md` — prinsip "One Data, Many Publications" sebagai rujukan tertinggi.
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §3.2, §4, §6.7 — kapabilitas target GDPP dan Master Document Sequence Seq 58-66.
- `02-business-architecture/13-Government-Document-Lifecycle-Blueprint.md` (BP-BUS-003, Approved) §4, §6 — lifecycle phase, publication instance, prinsip pemisahan status (published tidak otomatis Approved/effective).
- `03-data-architecture/data-lineage/22-Data-Lineage-and-Traceability-Blueprint.md` (BP-DATA-003, Approved) — prinsip lineage sebagai basis publication lineage.
- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, Batch 1) §6 — domain aplikasi sebagai konsumen/sumber data bagi publishing pipeline.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Arsitektur GDPP

1. **One Data, Many Publications**: satu sumber data/narasi resmi menghasilkan berbagai format output (dashboard, PDF, Word, Excel, presentasi, infografis) — prinsip Charter, tidak diciptakan ulang di sini.
2. **Publication bukan authoritative source baru**: konsisten dengan BP-BUS-003 §4 poin 2-3 — publication instance adalah output penyajian, bukan sumber otoritatif yang menggantikan data asal.
3. **Traceability dari data ke output**: setiap publication harus dapat ditelusuri ke sumber data dan narasi resminya, melanjutkan prinsip lineage BP-DATA-003.
4. **Template/design terpisah dari konten**: struktur dokumen (canonical model) terpisah dari presentasi visual (Design System) — dipertegas lebih lanjut oleh BP-PUB-001/BP-PUB-002/STD-PUB-001 (batch ini dan berikutnya).
5. **Belum beroperasi**: dokumen ini adalah arsitektur; tidak ada klaim bahwa generator/pipeline publishing sudah diimplementasikan.

## 6. Candidate GDPP Layer Architecture

| Layer | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Canonical Document Model | Struktur dokumen netral-format yang menjadi sumber tunggal sebelum dirender ke berbagai output — diperdalam BP-PUB-001 (batch ini). | Candidate Target Direction |
| Generation/Publishing Pipeline | Alur konseptual dari data+narasi → canonical model → rendering multiformat — diperdalam BP-PUB-002 (batch ini). | Candidate Target Direction |
| Template/Design Boundary | Batas antara struktur dokumen dan presentasi visual (Design System, Seq 62-66) — dirujuk, tidak didefinisikan penuh di sini. | Candidate Target Direction |
| Publication Governance | Approval dan otorisasi publikasi — diperdalam GOV-PUB-001 (batch ini), melanjutkan BP-BUS-004 (Approved). | Candidate Target Direction |
| Traceability Layer | Lineage dari data sumber ke publication instance — melanjutkan BP-DATA-003 (Approved). | Candidate Target Direction |
| Accessibility and Quality Layer | Prinsip aksesibilitas dan kualitas publikasi — diperdalam STD-PUB-004 (Seq 65, di luar batch ini). | Candidate Target Direction |

## 7. Boundary dengan BP-BUS-003 (Approved) dan BP-DATA-003 (Approved)

BP-BUS-003 menetapkan lifecycle dokumen pemerintahan termasuk publication instance sebagai salah satu status; dokumen ini menetapkan arsitektur teknis-konseptual GDPP yang menghasilkan publication instance tersebut, tanpa mengubah lifecycle BP-BUS-003. BP-DATA-003 menetapkan prinsip lineage; dokumen ini menerapkannya pada konteks publication lineage tanpa mengubah prinsip lineage itu sendiri.

## 8. Boundary dengan ARCH-APP-001 (Approved, Batch 1) dan ARCH-AI-001 (Approved, Batch 2)

ARCH-APP-001 menetapkan domain aplikasi; GDPP dapat menggunakan data dari domain aplikasi tersebut sebagai sumber publikasi, tanpa mengubah domain boundary yang sudah Approved. ARCH-AI-001 (GIP) dapat menyediakan insight/narasi yang menjadi input bagi GDPP — hubungan GIP→GDPP mengikuti diagram Roadmap §3.3, bukan diciptakan ulang di sini.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Rendering engine/generator aktual | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Template konkret per jenis dokumen | To be assigned by Project Owner — Evidence Pending | BP-PUB-001/REF-PUB-001 (batch ini/lanjutan) |
| Design System detail (typography, layout, chart) | To be assigned by Project Owner — Evidence Pending | STD-PUB-001/002/003 (Seq 62-64, di luar batch ini) |
| Owner/steward institusional GDPP | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |

## 10. Assumptions dan Program State

1. BP-BUS-003, BP-BUS-004, BP-DATA-003, ARCH-APP-001, ARCH-AI-001 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.
3. GDPP belum beroperasi; dokumen ini adalah architecture overview, bukan klaim implementasi.
4. Seq 62-66 (Design System detail) berada di luar cakupan batch ini; dokumen ini hanya merujuk keberadaannya pada Roadmap.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate architecture overview GDPP berdasarkan Charter/Roadmap/BP-BUS-003/BP-DATA-003/ARCH-APP-001/ARCH-AI-001 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan rendering engine/template/Design System aktual, mengklaim GDPP beroperasi, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ada klaim implementasi GDPP. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 3) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Government Digital Publishing Platform Architecture sebagai ARCH-PUB-001 Seq 58, berdasarkan Charter, Roadmap, BP-BUS-003, BP-DATA-003, ARCH-APP-001, ARCH-AI-001 (Approved). Cakupan: 6 candidate GDPP layer (Canonical Document Model, Generation/Publishing Pipeline, Template/Design Boundary, Publication Governance, Traceability, Accessibility/Quality). Tidak ada klaim implementasi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Seluruh dependency Approved dan tidak diubah.
3. ✓ Tidak ada rendering engine/template/Design System aktual ditetapkan.
4. ✓ Tidak ada klaim GDPP sudah beroperasi.
5. ✓ Boundary BP-BUS-003/BP-DATA-003/ARCH-APP-001/ARCH-AI-001 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. GDPP belum beroperasi. G1 DEFERRED; G2 tanpa disposition.

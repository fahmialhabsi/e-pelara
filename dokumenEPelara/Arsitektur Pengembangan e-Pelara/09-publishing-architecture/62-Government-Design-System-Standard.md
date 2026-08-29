---
document_id: STD-PUB-001
title: Government Design System Standard
system: e-PeLARA Next Generation
classification: Architecture Standard
domain: Publishing and Design System
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../09-publishing-architecture/58-Government-Digital-Publishing-Platform-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Publishing Architecture, Accessibility
intended_repository_path: 09-publishing-architecture/62-Government-Design-System-Standard.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 62 — Government Design System Standard

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam ARCH-PUB-001 §6 "Template/Design Boundary" dengan menetapkan **candidate design system principle archetype** — prinsip konseptual visual identity, komponen, dan konsistensi presentasi lintas publikasi pemerintahan — melanjutkan ARCH-PUB-001 (Approved, Batch 3) dan BP-PUB-001 (Canonical Document Model, Approved, Batch 3) §5 poin 4 (template/design terpisah dari konten). Dokumen ini **tidak** menetapkan token warna/tipografi konkret, library komponen aktual, atau tooling design system, dan tidak mengklaim design system telah dibangun/beroperasi.

## 2. Ruang Lingkup

Dalam scope: prinsip design system tingkat tinggi, candidate structure archetype (design token, component, layout grid), dan boundary dengan Canonical Document Model. Di luar scope: nilai token konkret, kode komponen, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `09-publishing-architecture/58-Government-Digital-Publishing-Platform-Architecture.md` (ARCH-PUB-001, Approved, Batch 3) §6 — Template/Design Boundary layer.
- `09-publishing-architecture/59-Canonical-Document-Model-Blueprint.md` (BP-PUB-001, Approved, Batch 3) §5-6 — pemisahan struktur dokumen dari presentasi visual.
- `00-governance/05-Compliance-Register.md` (GOV-COMP-001) — referensi keberadaan concern aksesibilitas dalam ruang lingkup register, dibaca sebagai konteks, tidak sebagai penentuan applicability baru.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Government Design System

1. **Design system melayani konten, bukan menggantikannya**: presentasi visual (warna, tipografi, komponen) diterapkan pada canonical document model (BP-PUB-001, Approved) tanpa mengubah struktur/substansi konten.
2. **Konsistensi lintas format dan aplikasi**: prinsip visual yang sama berlaku pada publikasi (GDPP) maupun aplikasi (ARCH-APP-001, Approved Batch 1) — dokumen ini tidak menetapkan implementasi lintas keduanya, hanya prinsip keselarasan.
3. **Aksesibilitas sebagai prinsip melekat, bukan lapisan tambahan**: konsisten dengan cakupan GOV-COMP-001 yang mencantumkan aksesibilitas sebagai domain regulasi relevan — dokumen ini tidak melakukan applicability determination atas regulasi aksesibilitas tertentu; detail teknis aksesibilitas didelegasikan ke STD-PUB-004 (batch ini).
4. **Component archetype, bukan library kode**: komponen visual disebut sebagai konsep struktural (mis. heading, table, chart container), bukan kode/library front-end aktual.
5. **Belum dibangun**: dokumen ini adalah standar arsitektur; tidak ada klaim bahwa design system sudah diimplementasikan sebagai library atau tooling aktual.

## 6. Candidate Design System Structure Archetype

| Elemen | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Design Token (archetype) | Unit nilai visual mendasar (warna, spasi, ukuran) — konsep, bukan nilai hex/px konkret. | Candidate Target Direction |
| Typography Scale (archetype) | Hierarki ukuran/berat teks — diperdalam STD-PUB-002 (batch ini). | Candidate Target Direction |
| Component Archetype | Unit visual reusable (heading, table, card, chart container) — struktur, bukan kode. | Candidate Target Direction |
| Layout Grid (archetype) | Pola penataan ruang halaman/dokumen — konsep, bukan implementasi CSS/print layout aktual. | Candidate Target Direction |
| Accessibility Principle Reference | Rujukan ke STD-PUB-004 (batch ini) untuk detail aksesibilitas. | Candidate Target Direction |

## 7. Boundary dengan ARCH-PUB-001 (Approved) dan BP-PUB-001 (Approved, Batch 3)

ARCH-PUB-001 menetapkan Template/Design Boundary sebagai salah satu layer GDPP; dokumen ini memperdalam layer tersebut secara spesifik pada prinsip design system, tanpa mengubah layer architecture ARCH-PUB-001. BP-PUB-001 menetapkan struktur canonical model; dokumen ini menegaskan pemisahan struktur dan presentasi yang sudah dinyatakan BP-PUB-001 §5 poin 4, tanpa mengubahnya.

## 8. Boundary dengan STD-PUB-002/003/004 dan REF-PUB-001 (Batch Ini)

Dokumen ini menetapkan prinsip design system tingkat tinggi; STD-PUB-002 (Typography/Layout/Annual Report Style), STD-PUB-003 (Chart/Infographic), STD-PUB-004 (Accessibility/Quality), dan REF-PUB-001 (Template/Asset Register) akan memperdalam aspek masing-masing. Dokumen ini tidak mendahului cakupan keempatnya.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Nilai design token konkret (warna/tipografi) | To be assigned by Project Owner — Evidence Pending | Implementasi teknis / STD-PUB-002 |
| Library/tooling design system aktual | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Applicability regulasi aksesibilitas spesifik | To be designated or verified by competent institutional authority — Evidence Pending | GOV-COMP-001 / STD-PUB-004 |

## 10. Assumptions dan Program State

1. ARCH-PUB-001, BP-PUB-001 (Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.
3. Design system belum dibangun; dokumen ini adalah standar arsitektur, bukan klaim implementasi.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate design system principle berdasarkan ARCH-PUB-001/BP-PUB-001 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan token/library/tooling aktual, applicability regulasi aksesibilitas, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ada token/library aktual ditetapkan. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Government Design System Standard sebagai STD-PUB-001 Seq 62, berdasarkan ARCH-PUB-001, BP-PUB-001 (Approved). Cakupan: candidate design system structure archetype (5 elemen), boundary Canonical Document Model. Tidak ada token/library/tooling aktual. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Seluruh dependency Approved dan tidak diubah.
3. ✓ Tidak ada token/library/tooling design system aktual ditetapkan.
4. ✓ Tidak ada applicability regulasi aksesibilitas ditetapkan.
5. ✓ Boundary ARCH-PUB-001/BP-PUB-001/STD-PUB-002-004/REF-PUB-001 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. Design system belum dibangun. G1 DEFERRED; G2 tanpa disposition.

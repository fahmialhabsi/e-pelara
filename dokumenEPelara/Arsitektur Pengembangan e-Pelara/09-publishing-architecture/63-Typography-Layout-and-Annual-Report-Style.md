---
document_id: STD-PUB-002
title: Typography, Layout, and Annual Report Style
system: e-PeLARA Next Generation
classification: Architecture Standard
domain: Publishing and Design System
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../09-publishing-architecture/62-Government-Design-System-Standard.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Design System Standard
intended_repository_path: 09-publishing-architecture/63-Typography-Layout-and-Annual-Report-Style.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 63 — Typography, Layout, and Annual Report Style

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam STD-PUB-001 §6 "Typography Scale (archetype)" dan "Layout Grid (archetype)" dengan menetapkan **candidate typography/layout principle** dan **candidate Annual Report Style concept** — melanjutkan Roadmap §3.2 (Annual Report Style berkualitas kelas dunia sebagai kapabilitas target GDPP). Dokumen ini **tidak** menetapkan font/ukuran/margin konkret, dan tidak mengklaim style guide telah diterapkan pada publikasi aktual.

## 2. Ruang Lingkup

Dalam scope: prinsip tipografi/layout tingkat tinggi, candidate Annual Report Style concern, boundary dengan STD-PUB-001. Di luar scope: nilai font/ukuran konkret, print-ready spec teknis, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `09-publishing-architecture/62-Government-Design-System-Standard.md` (STD-PUB-001, Approved, batch ini) §6 — Typography Scale dan Layout Grid archetype sebagai basis pendalaman.
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §3.2 — kapabilitas target "Annual Report Style berkualitas kelas dunia" sebagai rujukan strategis, dan §4 baris Publishing "regulatory fidelity" sebagai batas eksplisit (kualitas visual tidak menukar kepatuhan regulasi).

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Typography, Layout, dan Annual Report Style

1. **Hierarki tipografi konseptual**: skala tipografi mengikuti prinsip hierarki (heading, subheading, body, caption) — nilai ukuran/font konkret Evidence Pending.
2. **Layout melayani keterbacaan, bukan sekadar estetika**: prinsip grid/margin/spacing mendukung keterbacaan dokumen pemerintahan yang padat data, bukan hanya nilai visual.
3. **Annual Report Style tidak mengurangi regulatory fidelity**: mengulang eksplisit batas Roadmap §9 Wave 4 Definition of Completion — kualitas visual Annual Report Style tidak boleh mengorbankan kepatuhan terhadap format/struktur regulasi yang berlaku (mis. LAKIP/LKjIP).
4. **Print dan digital sebagai dua konteks rendering**: prinsip typography/layout harus mempertimbangkan konteks cetak (print-ready) dan digital, tanpa menetapkan spesifikasi teknis print (DPI, bleed, dsb.) di sini.
5. **Belum diterapkan**: dokumen ini adalah standar arsitektur; tidak ada klaim bahwa style guide sudah diterapkan pada publikasi tertentu.

## 6. Candidate Typography/Layout/Annual Report Style Structure

| Elemen | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Typography Hierarchy (archetype) | Tingkatan heading/body/caption — struktur, bukan nilai font/ukuran. | Candidate Target Direction |
| Layout Grid Principle | Prinsip margin/kolom/spacing untuk keterbacaan — konsep, bukan spec CSS/print. | Candidate Target Direction |
| Annual Report Style Concern | Kualitas visual laporan tahunan yang tetap tunduk pada regulatory fidelity — konsep, bukan template konkret. | Candidate Target Direction |
| Print/Digital Rendering Context | Dua konteks rendering yang perlu dipertimbangkan prinsip typography/layout-nya. | Candidate Target Direction |

## 7. Boundary dengan STD-PUB-001 (Approved, Batch Ini)

STD-PUB-001 menetapkan Typography Scale dan Layout Grid sebagai archetype dalam design system secara umum; dokumen ini memperdalam keduanya secara spesifik termasuk Annual Report Style concern, tanpa mengubah structure archetype STD-PUB-001.

## 8. Boundary dengan STD-PUB-003 dan STD-PUB-004 (Batch Ini)

STD-PUB-003 (Chart and Infographic Standard) akan menetapkan prinsip visualisasi data secara spesifik; STD-PUB-004 (Accessibility and Quality) akan menetapkan prinsip aksesibilitas. Dokumen ini tidak mendahului cakupan keduanya.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Font/ukuran/margin konkret | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Spesifikasi print-ready teknis (DPI, bleed, dsb.) | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Template Annual Report Style konkret | To be assigned by Project Owner — Evidence Pending | REF-PUB-001 (batch ini) |

## 10. Assumptions dan Program State

1. STD-PUB-001 (Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.
3. Style guide belum diterapkan pada publikasi aktual.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate typography/layout/Annual Report Style principle berdasarkan STD-PUB-001 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan font/ukuran/spesifikasi print konkret, mengklaim style guide diterapkan, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ada spesifikasi konkret ditetapkan. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Typography, Layout, and Annual Report Style sebagai STD-PUB-002 Seq 63, berdasarkan STD-PUB-001 (Approved). Cakupan: candidate typography/layout/Annual Report Style structure (4 elemen). Tidak ada spesifikasi font/print/template konkret. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (STD-PUB-001) Approved dan tidak diubah.
3. ✓ Tidak ada font/ukuran/spesifikasi print konkret ditetapkan.
4. ✓ Regulatory fidelity dipertegas tidak dikorbankan oleh kualitas visual.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. Style guide belum diterapkan pada publikasi aktual. G1 DEFERRED; G2 tanpa disposition.

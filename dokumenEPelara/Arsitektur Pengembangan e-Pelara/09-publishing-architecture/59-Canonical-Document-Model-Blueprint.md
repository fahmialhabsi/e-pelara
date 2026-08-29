---
document_id: BP-PUB-001
title: Canonical Document Model Blueprint
system: e-PeLARA Next Generation
classification: Publishing Architecture Blueprint
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
roadmap_dependency: Document Lifecycle, Data Lineage
intended_repository_path: 09-publishing-architecture/59-Canonical-Document-Model-Blueprint.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 59 — Canonical Document Model Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam ARCH-PUB-001 (Seq 58, Approved batch ini) §6 "Canonical Document Model" dengan menetapkan **candidate document model structure archetype** — struktur konseptual dokumen yang format-netral, menjadi sumber tunggal sebelum dirender ke berbagai output — melanjutkan BP-BUS-003 (Government Document Lifecycle, Approved) §6 lifecycle metamodel dan BP-DATA-003 (Data Lineage, Approved) prinsip lineage. Dokumen ini **tidak** menetapkan skema database dokumen, format file konkret, atau tooling authoring.

## 2. Ruang Lingkup

Dalam scope: prinsip canonical document model, candidate structure archetype (section, content block, metadata), dan boundary dengan Document Lifecycle/Data Lineage. Di luar scope: skema teknis (XML/JSON schema aktual), tooling authoring, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `09-publishing-architecture/58-Government-Digital-Publishing-Platform-Architecture.md` (ARCH-PUB-001, Approved, batch ini) §6 — Canonical Document Model layer, boundary artefak lanjutan.
- `02-business-architecture/13-Government-Document-Lifecycle-Blueprint.md` (BP-BUS-003, Approved) §6 — lifecycle metamodel (document family, phase, candidate transition, publication instance), sebagai basis struktur document family.
- `03-data-architecture/data-lineage/22-Data-Lineage-and-Traceability-Blueprint.md` (BP-DATA-003, Approved) — prinsip lineage sebagai basis traceability canonical model ke sumber data.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Canonical Document Model

1. **Format-netral, bukan format akhir**: canonical model merepresentasikan struktur dan konten dokumen secara independen dari format output (PDF/Word/Excel/dashboard) — rendering adalah langkah terpisah (BP-PUB-002, batch ini).
2. **Melanjutkan document family BP-BUS-003 §6**: canonical model diterapkan pada document family yang sudah dikenali BP-BUS-003 (mis. dokumen perencanaan, laporan kinerja), tanpa menciptakan klasifikasi document family baru.
3. **Traceability ke data sumber**: setiap content block dalam canonical model dapat ditelusuri ke data/narasi sumber, melanjutkan prinsip lineage BP-DATA-003 — dokumen ini tidak menetapkan mekanisme lineage teknis baru.
4. **Version dan supersession mengikuti BP-BUS-003 §6**: canonical model tunduk pada prinsip version/supersession yang sudah Approved, tidak didefinisikan ulang.
5. **Belum ada model teknis dibangun**: dokumen ini adalah blueprint arsitektur konseptual; tidak ada klaim skema/database canonical model sudah diimplementasikan.

## 6. Candidate Canonical Document Model Structure

| Elemen Struktur | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Document Family Reference | Rujukan ke document family BP-BUS-003 §6 (tidak diciptakan ulang). | Approved Architecture Direction (BP-BUS-003) |
| Section (archetype) | Unit struktural dokumen (mis. pendahuluan, analisis, lampiran) — struktur, bukan template konkret. | Candidate Target Direction |
| Content Block (archetype) | Unit konten dalam section (narasi, tabel, chart placeholder) — tidak menetapkan format rendering. | Candidate Target Direction |
| Metadata Block | Metadata dokumen (versi, sumber, tanggal) mengikuti prinsip metadata GOV-EA-006 dan BP-BUS-003 §5. | Candidate Target Direction |
| Lineage Reference | Tautan dari content block ke sumber data (BP-DATA-003), bersifat referensi konseptual. | Candidate Target Direction |

## 7. Boundary dengan BP-BUS-003 (Approved) dan BP-DATA-003 (Approved)

BP-BUS-003 menetapkan document family dan lifecycle phase; dokumen ini menetapkan struktur internal dokumen (canonical model) yang berlaku pada instance document family tersebut, tanpa mengubah lifecycle BP-BUS-003. BP-DATA-003 menetapkan prinsip lineage data; dokumen ini menerapkannya sebagai lineage reference pada content block, tanpa mengubah mekanisme lineage BP-DATA-003.

## 8. Boundary dengan ARCH-PUB-001 (Approved, Batch Ini) dan BP-PUB-002 (Batch Ini)

ARCH-PUB-001 menetapkan layer GDPP tingkat tinggi; dokumen ini memperdalam layer Canonical Document Model secara spesifik. BP-PUB-002 (Multiformat Publishing Pipeline) akan menetapkan bagaimana canonical model ini dirender ke berbagai format — dokumen ini tidak mendahului cakupan BP-PUB-002.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Skema teknis (XML/JSON/database) aktual | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Tooling authoring/editor dokumen | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Template konkret per document family | To be assigned by Project Owner — Evidence Pending | REF-PUB-001 (Seq 66, di luar batch ini) |
| Mekanisme lineage teknis rinci | To be assigned by Project Owner — Evidence Pending | Implementasi teknis (mengikuti BP-DATA-003) |

## 10. Assumptions dan Program State

1. ARCH-PUB-001, BP-BUS-003, BP-DATA-003 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.
3. Canonical document model belum dibangun secara teknis; dokumen ini adalah blueprint arsitektur.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate document model structure archetype berdasarkan ARCH-PUB-001/BP-BUS-003/BP-DATA-003 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan skema teknis/tooling authoring aktual, mengklaim canonical model sudah dibangun, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ada skema teknis/klaim implementasi. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 3) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Canonical Document Model Blueprint sebagai BP-PUB-001 Seq 59, berdasarkan ARCH-PUB-001, BP-BUS-003, BP-DATA-003 (Approved). Cakupan: candidate document model structure (5 elemen), boundary Document Lifecycle/Data Lineage. Tidak ada skema teknis atau klaim implementasi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Seluruh dependency Approved dan tidak diubah.
3. ✓ Tidak ada skema teknis/tooling authoring aktual ditetapkan.
4. ✓ Tidak ada klaim canonical model sudah dibangun.
5. ✓ Boundary BP-BUS-003/BP-DATA-003/ARCH-PUB-001 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. Canonical document model belum dibangun secara teknis. G1 DEFERRED; G2 tanpa disposition.

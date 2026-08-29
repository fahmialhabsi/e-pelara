---
document_id: STD-PUB-003
title: Chart and Infographic Standard
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
roadmap_dependency: Data Quality, Design System
intended_repository_path: 09-publishing-architecture/64-Chart-and-Infographic-Standard.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 64 — Chart and Infographic Standard

## 1. Tujuan dan Kedudukan

Dokumen ini memperdalam STD-PUB-001 §6 "Component Archetype" secara spesifik untuk visualisasi data (chart, infografis) — melanjutkan STD-DATA-001 (Data Quality Standard, Approved) prinsip bahwa representasi data harus akurat terhadap sumbernya. Dokumen ini **tidak** menetapkan library charting/rendering aktual, palet warna konkret, atau jenis chart wajib per konteks, dan tidak mengklaim chart/infografis sudah diproduksi.

## 2. Ruang Lingkup

Dalam scope: prinsip representasi data visual, candidate chart/infographic principle, boundary dengan Data Quality dan Design System. Di luar scope: library/tooling charting aktual, palet warna konkret, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `09-publishing-architecture/62-Government-Design-System-Standard.md` (STD-PUB-001, Approved, batch ini) §6 — Component Archetype sebagai basis chart/infographic component.
- `03-data-architecture/data-quality/23-Data-Quality-Standard.md` (STD-DATA-001, Approved) §1 — prinsip dimensi kualitas data sebagai basis akurasi representasi visual.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Chart dan Infographic

1. **Representasi visual tidak boleh menyesatkan**: chart/infografis harus merepresentasikan data secara akurat sesuai sumbernya (melanjutkan prinsip kualitas data STD-DATA-001) — dokumen ini tidak menetapkan metric/threshold akurasi numerik baru.
2. **Traceability ke data sumber**: setiap chart/infografis dapat ditelusuri ke content block/data sumber pada canonical document model (BP-PUB-001, Approved Batch 3).
3. **Component archetype, bukan library kode**: jenis visualisasi (bar, line, pie, infographic block) disebut sebagai konsep struktural, bukan pustaka/kode rendering aktual.
4. **Aksesibilitas visual dipertimbangkan**: representasi visual harus mempertimbangkan keterbacaan bagi pengguna dengan keterbatasan (kontras, alt text konsep) — detail teknis didelegasikan ke STD-PUB-004 (batch ini).
5. **Belum diproduksi**: dokumen ini adalah standar arsitektur; tidak ada klaim bahwa chart/infografis sudah diproduksi untuk publikasi tertentu.

## 6. Candidate Chart and Infographic Structure

| Elemen | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Chart Type Archetype | Kategori visualisasi (kategori/tren/komposisi/perbandingan) — konsep, bukan implementasi library. | Candidate Target Direction |
| Data Accuracy Principle | Representasi visual harus konsisten dengan data sumber — melanjutkan STD-DATA-001. | Approved Architecture Direction (STD-DATA-001, prinsip kualitas data) |
| Infographic Block Archetype | Unit infografis (ikon+angka+narasi singkat) sebagai konsep struktural. | Candidate Target Direction |
| Accessible Visual Principle | Prinsip kontras/alt-text konseptual, detail didelegasikan STD-PUB-004. | Candidate Target Direction |

## 7. Boundary dengan STD-PUB-001 (Approved, Batch Ini) dan STD-DATA-001 (Approved)

STD-PUB-001 menetapkan Component Archetype secara umum; dokumen ini memperdalamnya khusus untuk chart/infografis. STD-DATA-001 menetapkan dimensi kualitas data secara umum; dokumen ini menerapkannya pada representasi visual tanpa mengubah standar STD-DATA-001.

## 8. Boundary dengan STD-PUB-004 (Batch Ini)

STD-PUB-004 (Publication Accessibility and Quality Standard) akan menetapkan prinsip aksesibilitas secara menyeluruh; dokumen ini hanya merujuk keterkaitan visual accessibility tanpa mendahului cakupan STD-PUB-004.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Library/tooling charting aktual | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Palet warna konkret | To be assigned by Project Owner — Evidence Pending | STD-PUB-001/002 (Approved, batch ini) sebagai basis, implementasi lanjutan |
| Mekanisme alt-text/kontras teknis | To be assigned by Project Owner — Evidence Pending | STD-PUB-004 (batch ini) |

## 10. Assumptions dan Program State

1. STD-PUB-001, STD-DATA-001 (Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.
3. Chart/infografis belum diproduksi untuk publikasi aktual.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate chart/infographic principle berdasarkan STD-PUB-001/STD-DATA-001 yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan library/tooling/palet warna konkret, mengklaim chart/infografis telah diproduksi, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ada library/tooling aktual ditetapkan. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Chart and Infographic Standard sebagai STD-PUB-003 Seq 64, berdasarkan STD-PUB-001, STD-DATA-001 (Approved). Cakupan: candidate chart/infographic structure (4 elemen). Tidak ada library/tooling/palet konkret. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (STD-PUB-001, STD-DATA-001) Approved dan tidak diubah.
3. ✓ Tidak ada library/tooling/palet warna konkret ditetapkan.
4. ✓ Tidak ada klaim chart/infografis telah diproduksi.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. Chart/infografis belum diproduksi. G1 DEFERRED; G2 tanpa disposition.

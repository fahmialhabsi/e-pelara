---
document_id: RM-MIG-002
title: Legacy Coexistence and Decommissioning Plan
system: e-PeLARA Next Generation
classification: Roadmap
domain: Transition and Implementation
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../10-transition-and-implementation/67-Migration-and-Modernization-Roadmap.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G4–G6
roadmap_dependency: Application Portfolio, Migration Roadmap
intended_repository_path: 10-transition-and-implementation/73-Legacy-Coexistence-and-Decommissioning-Plan.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 73 — Legacy Coexistence and Decommissioning Plan

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **candidate coexistence principle** dan **candidate decommissioning prerequisite** — melanjutkan REF-APP-001 (Application Portfolio Catalog, Approved Batch 1) dan RM-MIG-001 (Migration and Modernization Roadmap, Approved batch ini). Persetujuan dokumen ini berarti **rencana dan prasyarat coexistence/decommissioning disetujui** — bukan pernyataan bahwa sistem lama telah dimatikan/di-decommission.

## 2. Ruang Lingkup

Dalam scope: prinsip coexistence sistem lama-baru selama transisi, candidate decommissioning prerequisite, boundary dengan Application Portfolio dan Migration Roadmap. Di luar scope: jadwal decommissioning aktual, dan disposition G4-G6.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/30-Application-Portfolio-Catalog.md` (REF-APP-001, Approved, Batch 1) §5-7 — struktur katalog aplikasi (entri aktual Evidence Pending) sebagai basis unit legacy/coexistence.
- `10-transition-and-implementation/67-Migration-and-Modernization-Roadmap.md` (RM-MIG-001, Approved, batch ini) §5 poin 5 — prinsip coexistence sebagai prasyarat perencanaan.
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §15.2 — constraint "sistem berjalan harus dilindungi selama coexistence" sebagai batas eksplisit.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending; Approved Plan; Implementation Pending; Verification Pending.

## 5. Prinsip Legacy Coexistence and Decommissioning

1. **Approval rencana ≠ decommissioning dilaksanakan**: dokumen ini menyatakan rencana dan prasyarat disetujui; tidak ada klaim bahwa sistem lama mana pun telah dimatikan/dihapus/di-decommission.
2. **Sistem berjalan dilindungi selama coexistence**: mengulang eksplisit constraint Roadmap §15.2 — tidak ada keputusan replacement/shutdown tanpa rencana coexistence yang terbukti aman.
3. **Decommissioning memerlukan prasyarat eksplisit, bukan asumsi kesiapan**: prasyarat mencakup migrasi data selesai dan terverifikasi, rollback tidak lagi diperlukan, dan approval eksplisit — dokumen ini menetapkan prasyarat, bukan menyatakan prasyarat telah terpenuhi.
4. **Portfolio Approved sebagai referensi unit legacy, entri aktual tetap kosong**: mengikuti REF-APP-001 (Approved) yang strukturnya disahkan namun entri katalog aplikasi aktual tetap Evidence Pending — dokumen ini tidak mengisi entri tersebut atau menetapkan aplikasi mana yang akan di-decommission.

## 6. Candidate Coexistence and Decommissioning Structure

| Elemen | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| Coexistence Principle | Sistem lama dan baru beroperasi berdampingan selama masa transisi; tidak ada cutover tanpa rencana rollback (RM-MIG-001 §6). | Approved Architecture Direction (Roadmap §15.2) |
| Data Reconciliation Prerequisite | Data harus direkonsiliasi dan diverifikasi konsisten sebelum decommissioning dipertimbangkan — mekanisme rinci Evidence Pending. | Candidate Target Direction |
| Decommissioning Readiness Prerequisite | Kriteria konseptual: migrasi selesai terverifikasi, tidak ada dependency aktif tersisa, approval eksplisit — merujuk struktur GOV-MIG-001/002 (batch ini). | Candidate Target Direction |
| Legacy Unit Reference | Rujukan ke REF-APP-001 (Approved) sebagai basis unit aplikasi/sistem legacy — entri aktual tetap Evidence Pending, tidak diisi di sini. | Evidence Pending (entri katalog) |

## 7. Boundary dengan REF-APP-001 (Approved, Batch 1) dan RM-MIG-001 (Approved, Batch Ini)

REF-APP-001 menetapkan struktur katalog aplikasi; dokumen ini merujuknya sebagai basis unit legacy tanpa mengisi entri aktual atau mengubah struktur REF-APP-001. RM-MIG-001 menetapkan kerangka migrasi umum; dokumen ini menerapkan prinsip coexistence secara spesifik tanpa mengubah kerangka RM-MIG-001.

## 8. Boundary dengan GOV-MIG-001/002 (Approved, Batch Ini)

GOV-MIG-001/002 menetapkan struktur checklist kesiapan implementasi/produksi; dokumen ini merujuk struktur tersebut sebagai basis Decommissioning Readiness Prerequisite tanpa mengubah checklist keduanya.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri aplikasi/sistem legacy aktual yang akan di-decommission | To be assigned by Project Owner — Evidence Pending | REF-APP-001 (Approved, Batch 1) sebagai basis, keputusan lanjutan |
| Jadwal decommissioning aktual | To be assigned by Project Owner — Evidence Pending | Perencanaan operasional lanjutan |
| Mekanisme rekonsiliasi data teknis | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Approval decommissioning aktual per sistem | To be designated or verified by competent institutional authority — Evidence Pending | Governance lanjutan |

## 10. Assumptions dan Program State

1. REF-APP-001, RM-MIG-001, GOV-MIG-001/002 (Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2/G3 tanpa disposition; dokumen ini tidak menetapkan disposition G4-G6.
3. Belum ada sistem legacy yang telah di-decommission melalui dokumen ini.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate coexistence principle dan decommissioning prerequisite berdasarkan REF-APP-001/RM-MIG-001/GOV-MIG-001-002 yang Approved, routing Evidence Pending, self-review, dan finalisasi rencana (Approved Plan) dalam batas delegasi.

**Dilarang**: Mengklaim sistem legacy telah di-decommission, mengisi entri aplikasi aktual, menetapkan jadwal decommissioning aktual, atau disposition G4-G6.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; rencana disetujui sebagai Approved Plan, bukan klaim decommissioning. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Legacy Coexistence and Decommissioning Plan sebagai RM-MIG-002 Seq 73, berdasarkan REF-APP-001, RM-MIG-001, GOV-MIG-001-002 (Approved). Cakupan: candidate coexistence/decommissioning structure (4 elemen). Tidak ada entri aplikasi aktual atau klaim decommissioning. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved (Approved Plan), efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (REF-APP-001, RM-MIG-001, GOV-MIG-001-002) Approved dan tidak diubah.
3. ✓ Tidak ada entri aplikasi/sistem legacy aktual diisi.
4. ✓ Tidak ada klaim sistem legacy telah di-decommission.
5. ✓ Approval dinyatakan eksplisit sebagai Approved Plan.
6. ✓ G1 DEFERRED, G2/G3 tanpa disposition; tidak ada disposition G4-G6.
7. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved** (Approved Plan). Dependency Approved dan tidak diubah. Belum ada sistem legacy di-decommission. G1 DEFERRED; G2/G3 tanpa disposition; tidak ada disposition G4-G6.

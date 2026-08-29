---
document_id: REF-APP-001
title: Application Portfolio Catalog
system: e-PeLARA Next Generation
classification: Reference Catalog
domain: Application Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../04-application-architecture/29-Application-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Baseline, Application Architecture
intended_repository_path: 04-application-architecture/30-Application-Portfolio-Catalog.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 30 — Application Portfolio Catalog

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **struktur katalog** (skema, identifier, klasifikasi, field wajib) untuk mencatat inventaris aplikasi/modul aktual e-PeLARA Next Generation terhadap candidate application domain (ARCH-APP-001, Seq 29, Approved, batch ini). Dokumen ini **tidak** mengarang inventaris modul yang belum diverifikasi — entri katalog aktual diisi hanya berdasarkan evidence baseline yang benar-benar tersedia.

## 2. Ruang Lingkup

Dalam scope: skema katalog, identifier standard, klasifikasi lifecycle, field ownership placeholder, dan struktur entri portfolio. Di luar scope: keputusan modularisasi (BP-APP-003), bounded context rinci (BP-APP-001), dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, batch ini) §6 — 10 candidate application domain sebagai basis klasifikasi katalog.
- `00-governance/09-Traceability-Standard.md` (GOV-EA-006, Approved v1.1.0) §9, §30.1 — Identifier Standard dan Metadata/Evidence Level Standard sebagai pola yang direplikasi untuk skema katalog.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Skema Katalog Portfolio

| Field | Ketentuan |
| --- | --- |
| `app_id` | Identifier unik, pola `APP-<DOMAIN>-<NN>`, selaras Application Domain ID (ARCH-APP-001 §6). |
| `nama_modul` | Nama modul/aplikasi sebagaimana tercatat pada evidence baseline. |
| `application_domain` | Merujuk ke candidate application domain (ARCH-APP-001 §6). |
| `lifecycle_status` | Salah satu dari §6 (Active/Legacy/Candidate/Retired — lihat definisi). |
| `evidence_source` | Rujukan baseline/dokumen sumber yang mencatat keberadaan modul. |
| `evidence_level` | Documented Current Fact / Documented Assessment / Candidate Target Direction / Evidence Pending (GOV-EA-006 §30.2). |
| `owner` | `To be assigned by Project Owner` bila belum ditetapkan. |
| `bounded_context_ref` | Rujukan ke BP-APP-001 (Seq 31, Approved, batch ini) bila tersedia. |
| `notes` | Catatan tambahan, termasuk keterkaitan issue/risk/compliance bila relevan. |

## 6. Klasifikasi Lifecycle Status

| Status | Makna |
| --- | --- |
| `Active` | Modul beroperasi pada baseline current-state yang terverifikasi. |
| `Legacy` | Modul beroperasi tetapi menjadi kandidat modernisasi/coexistence (ARCH-APP-001 §8). |
| `Candidate` | Modul target yang belum ada evidence keberadaannya pada baseline. |
| `Retired` | Modul telah dihentikan; memerlukan evidence dan approval sesuai RM-MIG-002 (Seq 73, belum dimulai). |

## 7. Entri Katalog Awal

Dokumen ini **tidak** mengisi entri katalog rinci per modul pada tahap ini, karena verifikasi evidence modul-per-modul terhadap baseline current-state memerlukan pembacaan ulang seluruh baseline yang di luar scope batch ini (batch ini berfokus pada struktur/prinsip arsitektur, bukan audit inventaris). Mengisi entri tanpa verifikasi langsung berisiko fabrikasi evidence, yang dilarang mandat.

Entri katalog aktual adalah **Evidence Pending** dan menjadi tindak lanjut governance terpisah: inventarisasi modul existing terhadap baseline current-state (`01-current-state/`), dipetakan ke 10 candidate application domain (ARCH-APP-001 §6), dan diverifikasi `evidence_source`-nya secara individual.

## 8. Boundary dengan ARCH-APP-001 dan BP-APP-001 (Approved, Batch Ini)

Dokumen ini menyediakan **struktur** katalog; ARCH-APP-001 menetapkan domain; BP-APP-001 menetapkan bounded context. Dokumen ini tidak mengubah keduanya, dan tidak mengisi entri yang memerlukan verifikasi evidence individual di luar scope batch ini.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri katalog modul aktual (seluruh field) | Evidence Pending — memerlukan inventarisasi terverifikasi terhadap baseline | Governance lanjutan / tindak lanjut inventarisasi terpisah |
| Owner aplikasi institusional | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |

## 10. Assumptions dan Program State

1. ARCH-APP-001 dan BP-APP-001 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition.
3. Dokumen ini menyediakan struktur katalog, bukan inventaris aktual; inventaris tetap Evidence Pending sampai verifikasi terpisah dilakukan.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun struktur katalog (skema, identifier, klasifikasi lifecycle) berdasarkan pola GOV-EA-006 dan ARCH-APP-001 yang Approved, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Mengarang entri katalog modul tanpa evidence baseline terverifikasi, menetapkan owner institusional aktual, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ditemukan finding. Entri katalog sengaja tidak diisi untuk menghindari fabrikasi evidence. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Application Portfolio Catalog sebagai REF-APP-001 Seq 30, berdasarkan ARCH-APP-001 dan GOV-EA-006 (Approved). Cakupan: skema katalog, identifier standard, klasifikasi lifecycle. Entri katalog aktual sengaja tidak diisi (Evidence Pending) untuk menghindari fabrikasi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur katalog menjadi Version 1.0.0 Approved, efektif 2026-08-05, sebagai Official Application Portfolio Catalog structure (entri aktual tetap Evidence Pending). | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-APP-001, BP-APP-001, GOV-EA-006) Approved dan tidak diubah.
3. ✓ Tidak ada entri katalog modul yang diarang tanpa evidence.
4. ✓ Boundary ARCH-APP-001/BP-APP-001 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved** (struktur katalog), effective_date 2026-08-05. Entri katalog aktual tetap Evidence Pending. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

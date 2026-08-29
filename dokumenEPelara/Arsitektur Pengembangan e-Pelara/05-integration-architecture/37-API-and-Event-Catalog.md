---
document_id: REF-INT-001
title: API and Event Catalog
system: e-PeLARA Next Generation
classification: Reference Catalog
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
gate: G3–G6
roadmap_dependency: API/Event Standards
intended_repository_path: 05-integration-architecture/37-API-and-Event-Catalog.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 37 — API and Event Catalog

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **struktur katalog** untuk mencatat API dan event aktual sesuai prinsip STD-INT-001 (API Design and Versioning Standard, Approved, batch ini) dan STD-INT-002 (Event and Notification Standard, Approved, batch ini). Konsisten dengan REF-APP-001 (Seq 30, Approved, batch ini), dokumen ini **tidak** mengarang entri API/event aktual tanpa evidence terverifikasi.

## 2. Ruang Lingkup

Dalam scope: skema katalog API, skema katalog event, identifier standard, dan klasifikasi lifecycle/versioning. Di luar scope: entri API/event aktual (Evidence Pending), dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `05-integration-architecture/35-API-Design-and-Versioning-Standard.md` (STD-INT-001, Approved, batch ini) §7 — strategi versioning sebagai basis skema katalog API.
- `05-integration-architecture/36-Event-and-Notification-Standard.md` (STD-INT-002, Approved, batch ini) §5-6 — prinsip desain event dan klasifikasi notification sebagai basis skema katalog event.
- `00-governance/09-Traceability-Standard.md` (GOV-EA-006, Approved v1.1.0) §9 — Identifier Standard.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Skema Katalog API

| Field | Ketentuan |
| --- | --- |
| `api_id` | Identifier unik, pola `API-<DOMAIN>-<NN>`. |
| `nama_api` | Nama deskriptif. |
| `application_domain` | Merujuk ARCH-APP-001 §6. |
| `versi` | Semantic versioning (STD-INT-001 §7). |
| `pola_integrasi` | Internal Synchronous/Asynchronous/Eksternal (ARCH-INT-001 §7). |
| `lifecycle_status` | Draft/Active/Deprecated/Retired. |
| `evidence_level` | Sesuai GOV-EA-006 §30.2. |
| `owner` | `To be assigned by Project Owner` bila belum ditetapkan. |

## 6. Skema Katalog Event

| Field | Ketentuan |
| --- | --- |
| `event_id` | Identifier unik, pola `EVT-<DOMAIN>-<NN>`. |
| `nama_event` | Nama deskriptif, past-tense semantics (STD-INT-002 §5). |
| `application_domain_publisher` | Domain penerbit event. |
| `application_domain_consumer` | Domain konsumen event (dapat lebih dari satu). |
| `jenis_notification` | System-internal/User-facing/Cross-domain (STD-INT-002 §6). |
| `evidence_level` | Sesuai GOV-EA-006 §30.2. |
| `owner` | `To be assigned by Project Owner` bila belum ditetapkan. |

## 7. Entri Katalog Awal

Konsisten dengan REF-APP-001 §7, dokumen ini **tidak** mengisi entri API/event aktual pada tahap ini. Mengisi entri tanpa verifikasi langsung terhadap implementasi/kontrak aktual berisiko fabrikasi evidence. Entri katalog aktual tetap **Evidence Pending**, menjadi tindak lanjut governance terpisah setelah inventarisasi API/event existing dilakukan.

## 8. Boundary dengan STD-INT-001 dan STD-INT-002 (Approved, Batch Ini)

Dokumen ini menyediakan **struktur pencatatan**; STD-INT-001/STD-INT-002 menetapkan **prinsip desain**. Dokumen ini tidak mengubah prinsip yang telah ditetapkan keduanya.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri API aktual (seluruh field) | Evidence Pending — memerlukan inventarisasi terverifikasi | Governance lanjutan |
| Entri event aktual (seluruh field) | Evidence Pending — memerlukan inventarisasi terverifikasi | Governance lanjutan |

## 10. Assumptions dan Program State

1. STD-INT-001 dan STD-INT-002 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition.
3. Dokumen ini menyediakan struktur katalog, bukan inventaris aktual.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun struktur katalog API/event berdasarkan STD-INT-001/STD-INT-002 yang Approved, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Mengarang entri API/event tanpa evidence terverifikasi, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; entri katalog sengaja tidak diisi untuk menghindari fabrikasi. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal API and Event Catalog sebagai REF-INT-001 Seq 37, berdasarkan STD-INT-001 dan STD-INT-002 (Approved). Cakupan: skema katalog API dan event, identifier standard. Entri aktual sengaja tidak diisi (Evidence Pending). | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur katalog menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 14. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (STD-INT-001, STD-INT-002) Approved dan tidak diubah.
3. ✓ Tidak ada entri API/event yang diarang tanpa evidence.
4. ✓ Boundary STD-INT-001/STD-INT-002 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 15. State Aktual Dokumen

Version 1.0.0, status **Approved** (struktur katalog), effective_date 2026-08-05. Entri katalog aktual tetap Evidence Pending. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

---
document_id: REF-PUB-001
title: Template and Publication Asset Register
system: e-PeLARA Next Generation
classification: Reference Catalog
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
gate: G3–G6
roadmap_dependency: Publication standards
intended_repository_path: 09-publishing-architecture/66-Template-and-Publication-Asset-Register.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 66 — Template and Publication Asset Register

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **struktur register resmi** untuk mencatat template publikasi dan publication asset — melanjutkan STD-PUB-001/002/003/004 (seluruhnya Approved batch ini) — sebagai catalog/register yang strukturnya dapat disahkan (Approved) meskipun **seluruh entri aktual tetap Evidence Pending**, konsisten dengan pola REF-APP-001, REF-INT-001 (Batch 1), dan REF-AI-001 (Batch 3).

## 2. Ruang Lingkup

Dalam scope: struktur register (skema kolom, identifier pattern, evidence level, status verifikasi), boundary dengan STD-PUB-001-004. Di luar scope: entri template/asset aktual, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `09-publishing-architecture/62-Government-Design-System-Standard.md` (STD-PUB-001, Approved, batch ini) §6 — struktur design system sebagai basis klasifikasi asset.
- `09-publishing-architecture/65-Publication-Accessibility-and-Quality-Standard.md` (STD-PUB-004, Approved, batch ini) §6 — dimensi kualitas/aksesibilitas sebagai basis field status verifikasi.
- `05-integration-architecture/37-API-and-Event-Catalog.md` (REF-INT-001, Approved, Batch 1) — pola struktur register/catalog yang direplikasi.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Register

1. **Register adalah struktur, bukan inventaris terisi**: konsisten dengan pola REF-APP-001/REF-INT-001/REF-AI-001 (Approved) — struktur skema dapat Approved sebagai struktur resmi, entri aktual tetap Evidence Pending.
2. **Dua sub-register**: Template Register (dokumen/publikasi per document family) dan Asset Register (komponen visual/ikon/aset grafis) — dipisahkan agar traceable independen.
3. **Tidak ada template/asset aktual dicatat**: baris contoh bersifat ilustratif struktur, bukan entri resmi.

## 6. Candidate Template Register Schema

| Field | Ketentuan |
| --- | --- |
| `template_id` | Identifier unik, pola `TPL-<NN>`. |
| `document_family_reference` | Rujukan ke document family (BP-BUS-003 §6, Approved). |
| `design_system_version` | Rujukan ke STD-PUB-001 (Approved, batch ini). |
| `status_verifikasi` | Draft/Under Review/Approved for Use/Deprecated — merujuk STD-PUB-004 §6 untuk dimensi verifikasi. |
| `evidence_level` | Sesuai GOV-EA-006 §30.2 (Approved). |
| `owner` | `To be assigned by Project Owner` bila belum ditetapkan. |

## 7. Candidate Asset Register Schema

| Field | Ketentuan |
| --- | --- |
| `asset_id` | Identifier unik, pola `ASSET-<NN>`. |
| `jenis_asset` | Ikon/grafis/komponen visual — konseptual, bukan file binary. |
| `design_token_reference` | Rujukan ke STD-PUB-001 §6 (Approved, batch ini). |
| `rights_status` | To be designated or verified by competent institutional authority — Evidence Pending. |
| `status_verifikasi` | Merujuk STD-PUB-004 §6 (Approved, batch ini). |

## 8. Entri Register Awal

Konsisten dengan REF-APP-001/REF-INT-001/REF-AI-001 (Approved), dokumen ini **tidak** mengisi entri template atau asset aktual. Seluruh entri tetap **Evidence Pending**.

## 9. Boundary dengan STD-PUB-001-004 (Approved, Batch Ini)

STD-PUB-001-004 menetapkan prinsip dan skema konseptual design system/typography/chart/accessibility; dokumen ini menyediakan wadah register formal yang menggunakan skema tersebut tanpa mengubahnya.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri template aktual | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |
| Entri asset aktual | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |
| Rights/licensing asset | To be designated or verified by competent institutional authority — Evidence Pending | Keputusan institusional terpisah |

## 11. Assumptions dan Program State

1. STD-PUB-001, STD-PUB-002, STD-PUB-003, STD-PUB-004 (seluruhnya Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3-G6.
3. Register disahkan sebagai struktur resmi; entri aktual tetap Evidence Pending. Penyelesaian dokumen ini melengkapi seluruh Seq 58-66 (Publishing and Design System) sebagai Approved.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun struktur register dua sub-kategori berdasarkan STD-PUB-001-004 yang Approved, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Mengisi entri template/asset aktual, menetapkan rights/licensing, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; struktur register tanpa entri aktual. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Template and Publication Asset Register sebagai REF-PUB-001 Seq 66, berdasarkan STD-PUB-001-004 (Approved). Cakupan: dua skema sub-register (Template, Asset). Entri aktual sengaja tidak diisi. Menutup Seq 58-66 Publishing and Design System. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (STD-PUB-001-004) Approved dan tidak diubah.
3. ✓ Tidak ada entri template/asset aktual.
4. ✓ Rights/licensing tidak ditetapkan.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved** (struktur/skema). Seluruh entri Template/Asset tetap Evidence Pending. Seq 58-66 (Publishing and Design System) lengkap Approved. G1 DEFERRED; G2 tanpa disposition.

---
document_id: STD-AI-001
title: Prompt Library Standard
system: e-PeLARA Next Generation
classification: Architecture Standard
domain: Intelligence and AI Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../08-intelligence-ai-architecture/53-Responsible-AI-Governance-Standard.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Knowledge Lifecycle, AI Governance
intended_repository_path: 08-intelligence-ai-architecture/54-Prompt-Library-Standard.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 54 — Prompt Library Standard

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **prinsip dan struktur konseptual prompt library** — bagaimana prompt AI dikelola sebagai knowledge asset yang dapat ditelusuri (melanjutkan GOV-AI-001 provenance archetype dan BP-DATA-004 knowledge asset taxonomy, keduanya Approved) — tanpa menetapkan isi prompt aktual, model target, atau tooling prompt management.

## 2. Ruang Lingkup

Dalam scope: prinsip pengelolaan prompt sebagai knowledge asset, skema metadata prompt konseptual, dan boundary dengan GOV-AI-002/REF-AI-001. Di luar scope: isi prompt aktual, model target spesifik, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `08-intelligence-ai-architecture/53-Responsible-AI-Governance-Standard.md` (GOV-AI-002, Approved, batch ini) §6-7 — prinsip responsible AI dan checkpoint yang berlaku pada penggunaan prompt.
- `03-data-architecture/data-governance/28-Knowledge-Lifecycle-and-Provenance-Standard.md` (GOV-AI-001, Approved) §5 — Candidate Provenance Structure Archetype sebagai basis metadata prompt.
- `03-data-architecture/domain-models/26-Enterprise-Knowledge-Model.md` (BP-DATA-004, Approved) §5 — Knowledge Asset Taxonomy, dengan prompt sebagai kandidat sub-kategori Knowledge Asset.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Prompt sebagai Knowledge Asset

1. **Prompt adalah Knowledge Asset** (BP-DATA-004 §5, Approved): prompt yang digunakan berulang harus memiliki source, provenance, version, dan authority context — konsisten dengan definisi Knowledge Asset yang sudah Approved, bukan kategori baru.
2. **Versioning prompt mengikuti prinsip STD-INT-001 §7** (semantic versioning konseptual, Approved Batch 1) — perubahan prompt yang mengubah perilaku output secara signifikan memerlukan kenaikan versi.
3. **Provenance prompt dapat ditelusuri**: setiap prompt tercatat memiliki asal (siapa/apa yang menyusun), tujuan penggunaan, dan riwayat perubahan — melanjutkan GOV-AI-001 §5 (Candidate Provenance Structure Archetype).
4. **Tidak ada isi prompt aktual dalam standar ini**: dokumen ini menetapkan struktur pengelolaan, bukan pustaka prompt itu sendiri.

## 6. Skema Metadata Prompt Konseptual

| Field | Ketentuan |
| --- | --- |
| `prompt_id` | Identifier unik, pola `PROMPT-<DOMAIN>-<NN>`. |
| `tujuan_penggunaan` | Deskripsi tujuan (mis. ringkasan, klasifikasi) — konseptual, bukan isi prompt. |
| `application_domain` | Merujuk ARCH-APP-001 §6 (Approved, Batch 1), khususnya APP-ADS-001. |
| `versi` | Semantic versioning (STD-INT-001 §7 pattern). |
| `provenance` | Sumber/penyusun, tanggal, riwayat perubahan (GOV-AI-001 §5 pattern). |
| `evidence_level` | Sesuai GOV-EA-006 §30.2 (Approved). |
| `owner` | `To be assigned by Project Owner` bila belum ditetapkan. |
| `status_evaluasi` | Draft/Under Evaluation/Approved for Use/Deprecated — merujuk STD-AI-002 (batch ini) untuk kriteria evaluasi. |

## 7. Entri Prompt Library Awal

Konsisten dengan pola katalog Batch 1/2 (REF-APP-001, REF-INT-001, STD-TECH-001), dokumen ini **tidak** mengisi entri prompt aktual pada tahap ini. Prompt aktual tetap **Evidence Pending**, menjadi tindak lanjut governance/implementasi terpisah.

## 8. Boundary dengan GOV-AI-002 (Approved, Batch Ini)

GOV-AI-002 menetapkan prinsip responsible AI umum; dokumen ini menerapkannya secara spesifik pada pengelolaan prompt sebagai knowledge asset. Dokumen ini tidak mengubah prinsip GOV-AI-002.

## 9. Boundary dengan REF-AI-001 (Batch Ini)

Dokumen ini menetapkan skema metadata dan prinsip; REF-AI-001 (AI Model, Prompt, and Evaluation Register) menjadi register aktual yang mencatat entri prompt/model/evaluation. Dokumen ini tidak membuat register aktual.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri prompt aktual | Evidence Pending — memerlukan penyusunan dan evaluasi terverifikasi | REF-AI-001 (batch ini) / governance lanjutan |
| Tooling prompt management | To be assigned by Project Owner — Evidence Pending | STD-TECH-001 (Approved, Batch 2) |

## 11. Assumptions dan Program State

1. GOV-AI-002, GOV-AI-001, BP-DATA-004 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun prinsip dan skema metadata prompt library berdasarkan GOV-AI-002/GOV-AI-001/BP-DATA-004 yang Approved, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Mengisi entri prompt aktual, menetapkan model target spesifik, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; entri prompt sengaja tidak diisi. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 3) tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Prompt Library Standard sebagai STD-AI-001 Seq 54, berdasarkan GOV-AI-002, GOV-AI-001, BP-DATA-004 (Approved). Cakupan: prinsip prompt sebagai knowledge asset, skema metadata konseptual, boundary REF-AI-001. Entri prompt aktual sengaja tidak diisi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (GOV-AI-002, GOV-AI-001, BP-DATA-004) Approved dan tidak diubah.
3. ✓ Tidak ada isi prompt aktual atau model target spesifik.
4. ✓ Boundary GOV-AI-002/REF-AI-001 akurat.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved** (struktur/prinsip), effective_date 2026-08-05. Entri prompt aktual tetap Evidence Pending. G1 DEFERRED; G2 tanpa disposition.

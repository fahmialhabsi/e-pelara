---
document_id: REF-AI-001
title: AI Model, Prompt, and Evaluation Register
system: e-PeLARA Next Generation
classification: Reference Catalog
domain: Intelligence and AI Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../08-intelligence-ai-architecture/54-Prompt-Library-Standard.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3–G6
roadmap_dependency: AI standards
intended_repository_path: 08-intelligence-ai-architecture/56-AI-Model-Prompt-and-Evaluation-Register.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 56 — AI Model, Prompt, and Evaluation Register

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **struktur register resmi** untuk mencatat model AI, prompt, dan hasil evaluasi — melanjutkan STD-AI-001 §6 (Prompt Library, Approved batch ini) dan STD-AI-002 §6-7 (Evaluation, Approved batch ini) — sebagai catalog/register yang strukturnya dapat disahkan (Approved) meskipun **seluruh entri aktual tetap Evidence Pending**, konsisten dengan pola REF-APP-001 dan REF-INT-001 (Batch 1, Approved).

## 2. Ruang Lingkup

Dalam scope: struktur register (skema kolom, identifier pattern, evidence level), boundary dengan STD-AI-001/STD-AI-002. Di luar scope: entri model/prompt/evaluasi aktual, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `08-intelligence-ai-architecture/54-Prompt-Library-Standard.md` (STD-AI-001, Approved, batch ini) §6 — skema metadata prompt konseptual.
- `08-intelligence-ai-architecture/55-AI-Evaluation-and-Acceptance-Standard.md` (STD-AI-002, Approved, batch ini) §6-7 — dimensi evaluasi dan kategori acceptance boundary.
- `05-integration-architecture/37-API-and-Event-Catalog.md` (REF-INT-001, Approved, Batch 1) — pola struktur register/catalog yang direplikasi (skema kolom, evidence level, tanpa entri aktual dipaksakan).

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Register

1. **Register adalah struktur, bukan inventaris terisi**: konsisten dengan pola REF-APP-001/REF-INT-001 (Approved, Batch 1) — struktur skema dapat Approved sebagai struktur resmi, sementara entri aktual tetap Evidence Pending sampai disusun dan diverifikasi melalui governance terpisah.
2. **Tiga sub-register**: Model Register, Prompt Register (merujuk STD-AI-001 §6), Evaluation Register (merujuk STD-AI-002 §6-7) — dipisahkan agar traceable secara independen.
3. **Tidak ada model/provider aktual dicatat**: baris contoh pada register bersifat ilustratif struktur, bukan entri resmi.

## 6. Candidate Model Register Schema

| Field | Ketentuan |
| --- | --- |
| `model_id` | Identifier unik, pola `MODEL-<NN>`. |
| `provider` | To be designated or verified by competent institutional authority — Evidence Pending. |
| `tujuan_penggunaan` | Deskripsi konseptual tujuan (mis. ringkasan dokumen). |
| `provenance` | Sumber pemilihan/pengadaan — Evidence Pending. |
| `evidence_level` | Sesuai GOV-EA-006 §30.2 (Approved). |
| `status_evaluasi` | Merujuk STD-AI-002 §7 (Approved batch ini). |

## 7. Candidate Prompt Register Schema

Mengikuti skema STD-AI-001 §6 (Approved, batch ini) secara langsung: `prompt_id`, `tujuan_penggunaan`, `application_domain`, `versi`, `provenance`, `evidence_level`, `owner`, `status_evaluasi`. Dokumen ini tidak mengubah atau memperluas skema tersebut.

## 8. Candidate Evaluation Register Schema

| Field | Ketentuan |
| --- | --- |
| `evaluation_id` | Identifier unik, pola `EVAL-<NN>`. |
| `subjek` | Referensi ke `model_id` atau `prompt_id`. |
| `dimensi_evaluasi` | Merujuk STD-AI-002 §6 (relevansi, konsistensi, potensi bias). |
| `hasil` | Evidence Pending — tidak ada hasil aktual dicatat pada tahap ini. |
| `checkpoint` | Merujuk GOV-AI-001 §6 (Pre-Acceptance Review/Provenance Verification/Publication Gate). |
| `tanggal_evaluasi` | Evidence Pending. |

## 9. Entri Register Awal

Konsisten dengan REF-APP-001/REF-INT-001 (Approved, Batch 1), dokumen ini **tidak** mengisi entri model, prompt, atau evaluasi aktual. Seluruh entri tetap **Evidence Pending**, menjadi tindak lanjut governance/implementasi terpisah setelah model/prompt/evaluasi tersedia dan terverifikasi.

## 10. Boundary dengan STD-AI-001 dan STD-AI-002 (Approved, Batch Ini)

STD-AI-001 dan STD-AI-002 menetapkan prinsip dan skema metadata konseptual; dokumen ini menyediakan wadah register formal yang menggunakan skema tersebut tanpa mengubahnya.

## 11. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Entri model aktual | To be designated or verified by competent institutional authority — Evidence Pending | Governance lanjutan / keputusan Project Owner |
| Entri prompt aktual | Evidence Pending | STD-AI-001 (Approved) routing yang sama |
| Entri evaluasi aktual | Evidence Pending | STD-AI-002 (Approved) routing yang sama |

## 12. Assumptions dan Program State

1. STD-AI-001, STD-AI-002, GOV-AI-001 (seluruhnya Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dokumen ini tidak menetapkan disposition G3-G6.
3. Register disahkan sebagai struktur resmi; entri aktual tetap Evidence Pending.

## 13. Batas Kewenangan AI

**Diizinkan**: Menyusun struktur register tiga sub-kategori berdasarkan STD-AI-001/STD-AI-002 yang Approved, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Mengisi entri model/prompt/evaluasi aktual, memilih provider, atau disposition Gate.

## 14. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; struktur register tanpa entri aktual. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate (Batch 3) tanggal 2026-08-05. | 2026-08-05 |

## 15. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal AI Model, Prompt, and Evaluation Register sebagai REF-AI-001 Seq 56, berdasarkan STD-AI-001, STD-AI-002 (Approved). Cakupan: tiga skema sub-register (Model, Prompt, Evaluation). Entri aktual sengaja tidak diisi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 16. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (STD-AI-001, STD-AI-002) Approved dan tidak diubah.
3. ✓ Tidak ada entri model/prompt/evaluasi aktual.
4. ✓ Skema Prompt Register konsisten dengan STD-AI-001 §6, tidak diubah.
5. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
6. ✓ Tidak ada file lain tersentuh.

## 17. State Aktual Dokumen

Version 1.0.0, status **Approved** (struktur/skema). Seluruh entri Model/Prompt/Evaluation tetap Evidence Pending. G1 DEFERRED; G2 tanpa disposition.

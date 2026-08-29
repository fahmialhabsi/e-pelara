---
document_id: BP-DATA-004
title: Enterprise Knowledge Model
system: e-PeLARA Next Generation
classification: Architecture Blueprint
domain: Data and Knowledge Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Claude Work as Acting Chief Enterprise Architect under HANDOFF-e-PeLARA-EA-2026-08-05-v10 unified delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
prepared_by: Claude Work
effective_date: 2026-08-05
roadmap_dependency:
  - ARCH-DATA-001 — Enterprise Data Architecture
  - BP-DATA-001 — Enterprise Data Domain Model
  - REF-BUS-001 — Business Glossary
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; tanpa disposition
review_outcome: PASSED
intended_repository_path: 03-data-architecture/domain-models/26-Enterprise-Knowledge-Model.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# Seq 26 — Enterprise Knowledge Model

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **Official Enterprise Knowledge Model** (BP-DATA-004), Seq 26 pada Master Document Sequence, Master Roadmap `RM-EA-001` §6.3, Approved Architecture Blueprint. Dokumen menyusun **candidate knowledge asset taxonomy** — kategori objek pengetahuan pada level konseptual — melanjutkan ARCH-DATA-001 §27 (Knowledge Architecture Direction) dan BP-DATA-001 §21 (Knowledge, Analytics, AI, and Publishing Interface), tanpa membuat ontology/taxonomy formal (BP-DATA-005 Seq 27) atau AI governance model (GOV-AI-001 Seq 28).

Dokumen ini **tidak** menetapkan: ontology/taxonomy term formal, knowledge graph schema, AI model/provider/prompt, knowledge management tooling/platform, atau owner/steward institusional untuk knowledge asset. Seluruh elemen konkret tersebut tetap **Evidence Pending** dan didelegasikan ke BP-DATA-005 Seq 27 (ontology/taxonomy), GOV-AI-001 Seq 28 (AI governance), atau GOV-DATA-001 (ownership archetype, sudah Approved).

BP-DATA-004 Version 1.0.0 telah menyelesaikan substantive self-review oleh Claude Work bertindak sebagai Acting Chief Enterprise Architect di bawah mandat terpadu HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan review outcome **PASSED**, dan berlaku efektif sejak **5 Agustus 2026**. Status dokumen: **Approved**; Version **1.0.0**; `effective_date: 2026-08-05`; `review_outcome: PASSED`.

## 2. Ruang Lingkup

Cakupan dokumen:

1. Candidate knowledge asset taxonomy — kategori objek pengetahuan (source document, structured data, metadata, evidence, knowledge asset, glossary term, ontology/taxonomy term, analytical result, AI recommendation, decision, publication) sebagai pembeda konseptual, melanjutkan ARCH-DATA-001 §27 tanpa mengubah kategori tersebut.
2. Candidate knowledge asset lifecycle concern — melanjutkan pola lifecycle governance GOV-DATA-001 §7, diterapkan pada knowledge asset.
3. Boundary dengan Business Glossary (REF-BUS-001, Approved) — glossary term adalah kategori tersendiri, bukan bagian dari knowledge asset yang lebih luas.
4. Boundary dengan Analytics/AI interface (BP-DATA-001 §21) — knowledge model tidak mengulang detail analytical derivative atau AI recommendation governance.
5. Routing eksplisit item yang tetap Evidence Pending ke BP-DATA-005 Seq 27, GOV-AI-001 Seq 28, atau GOV-DATA-001.

Di luar cakupan: ontology/taxonomy term formal dan relationship semantic (BP-DATA-005 Seq 27), AI model/provider/prompt/training detail (GOV-AI-001 Seq 28), knowledge management platform/tooling, dan disposition G2.

## 3. Dependency dan Sumber

| Sumber | Peran | Version/Status Terverifikasi |
| --- | --- | --- |
| ARCH-DATA-001 | Normative parent — §27 Knowledge Architecture Direction, §28 Analytics and AI Data Interface | 1.0.0, Approved |
| BP-DATA-001 | Normative dependency — §21 Knowledge, Analytics, AI, and Publishing Interface (DD-KNO-001) | 1.0.0, Approved |
| REF-BUS-001 | Normative dependency — Business Glossary, kategori "glossary term" sebagai objek terpisah dari knowledge asset | 1.0.0, Approved |
| GOV-DATA-001 | Context — role archetype (Metadata Steward, Quality Steward) yang relevan bagi knowledge asset governance | 1.0.0, Approved |

Dokumen ini dibaca detail untuk ARCH-DATA-001 §27-§28, BP-DATA-001 §21. REF-BUS-001 direferensikan melalui kategori "glossary term" yang telah dibedakan ARCH-DATA-001 §27, tidak dibaca ulang penuh dari file aslinya pada draft ini.

## 4. Evidence Method dan Klasifikasi

Dokumen membedakan evidence konsisten dengan artefak Data Architecture sebelumnya:

- **Documented Current Fact**: fakta tercatat eksplisit pada baseline atau artefak Approved.
- **Documented Assessment**: penilaian didukung evidence tetapi belum diverifikasi authority sah.
- **Approved Architecture Direction**: arah telah Approved/Accepted pada artefak governance.
- **Candidate Target Direction**: arah kandidat memerlukan keputusan/implementasi lanjutan.
- **Evidence Pending**: fakta atau keputusan belum tersedia, tidak diarang.

Working assumption: seluruh source yang dibaca bersifat provisional; dokumen tidak mengklaim completeness atau representativeness atas source yang tidak dibaca penuh.

## 5. Candidate Knowledge Asset Taxonomy

Melanjutkan ARCH-DATA-001 §27 yang membedakan sebelas kategori objek knowledge tanpa detail lebih lanjut, tabel berikut menyusun definisi konseptual masing-masing kategori **tanpa mengubah pembedaan yang sudah ada**:

| Kategori (ARCH-DATA-001 §27) | Definisi Konseptual | Contoh Konteks | Evidence Status |
| --- | --- | --- | --- |
| **Source Document** | Dokumen resmi asal (RPJMD, Renstra, RKA, dst.) sebagai titik origin knowledge. | DD-DOC-001 | Documented Current (baseline dokumen) |
| **Structured Data** | Data terstruktur pada domain data (bukan dokumen naratif). | 13 domain BP-DATA-001 §9 | Documented Current |
| **Metadata** | Data tentang data (melanjutkan BP-DATA-003, Approved). | DD-MDL-001 | Approved Architecture Direction (BP-DATA-003) |
| **Evidence** | Bukti yang mendukung klaim/status (audit trail, approval record). | DD-EVD-001 | Documented Current + Candidate Target Direction |
| **Knowledge Asset** | Asset pengetahuan non-struktural (best practice, lesson learned, research) — fokus utama dokumen ini. | DD-EVL-001, DD-DOC-001, DD-KNO-001 | Candidate Target Direction |
| **Glossary Term** | Istilah dan definisi resmi — domain REF-BUS-001, **bukan** bagian dari Knowledge Asset. | REF-BUS-001 (Approved, terpisah) | Documented Current (REF-BUS-001) |
| **Ontology/Taxonomy Term** | Istilah terstruktur dengan relationship semantic — domain BP-DATA-005 Seq 27, **bukan** dibuat di sini. | BP-DATA-005 (belum dimulai) | Evidence Pending — BP-DATA-005 Seq 27 |
| **Analytical Result** | Output analytical (dashboard, report) — melanjutkan BP-DATA-001 §21 "Analytical Derivative". | DD-PRF-001, DD-EVL-001 | Documented Current (dashboard baseline) + Candidate Target Direction |
| **AI Recommendation** | Output AI — melanjutkan BP-DATA-001 §21; detail governance di GOV-AI-001 Seq 28, **bukan** di sini. | GOV-AI-001 (belum dimulai) | Evidence Pending — GOV-AI-001 Seq 28 |
| **Decision** | Keputusan manusia berbasis knowledge/analytical/AI input; bukan output otomatis. | Human decision maker (authority final, BP-DATA-001 §21) | Documented Current (prinsip) |
| **Publication** | Output publikasi resmi — melanjutkan "Publication Context" BP-DATA-001 §21 dan One Data Many Publications. | DD-DOC-001, DD-KNO-001 | Target Direction |

**Catatan penting**: Dokumen ini **tidak menciptakan kategori baru** di luar sebelas kategori yang telah dibedakan ARCH-DATA-001 §27. Fokus utama dokumen ini adalah kategori **Knowledge Asset** secara spesifik; sepuluh kategori lain dicatat untuk konteks boundary, bukan untuk didetailkan ulang.

## 6. Candidate Knowledge Asset Lifecycle Concern — Melanjutkan GOV-DATA-001 §7

Melanjutkan pola Lifecycle Governance Pattern pada GOV-DATA-001 §7, diterapkan khusus pada Knowledge Asset:

| Lifecycle Concern | Deskripsi Konseptual | Governance Archetype Terlibat (GOV-DATA-001) | Evidence Status |
| --- | --- | --- | --- |
| **Capture Concern** | Titik ketika knowledge asset pertama kali didokumentasikan (mis. lesson learned dari review triwulanan). | Metadata Steward mencatat provenance | Candidate Target Direction |
| **Review Concern** | Proses konseptual review sebelum knowledge asset diterima sebagai valid. | Quality Steward mengoordinasikan review | Candidate Target Direction |
| **Version Concern** | Knowledge asset dapat memiliki version, melanjutkan BP-DATA-003 §8 Version Coexistence and Supersession Concern. | Metadata Steward | Approved Architecture Direction (BP-DATA-003) |
| **Acceptance Concern** | Keputusan konseptual bahwa knowledge asset diterima sebagai authoritative reference. | Data Owner (archetype, GOV-DATA-001) | Candidate Target Direction |
| **Retirement Concern** | Kondisi konseptual ketika knowledge asset tidak lagi relevan; melanjutkan retention concern archetype STD-DATA-002 §6. | Data Owner, dengan retention rule (STD-DATA-002) | Candidate Target Direction |

Tidak ada workflow wajib, SLA, atau urutan mandatory yang ditetapkan — konsisten dengan pola "Candidate Lifecycle Concerns" pada BP-DATA-002 §9-10.

## 7. Boundary dengan Business Glossary (REF-BUS-001)

- **Glossary Term** (REF-BUS-001, Approved) adalah istilah dan definisi resmi yang telah disahkan sebagai baseline governance.
- **Knowledge Asset** (fokus dokumen ini) adalah asset pengetahuan yang lebih luas (best practice, lesson learned, research) — **bukan pengganti** dan **tidak mengubah** Business Glossary.
- Knowledge Asset dapat **merujuk** ke Glossary Term untuk konsistensi terminologi, namun dokumen ini tidak menetapkan mekanisme rujukan tersebut secara teknis.

## 8. Boundary dengan BP-DATA-005 (Government Ontology and Taxonomy, Seq 27 — Belum Dimulai)

Dokumen ini secara eksplisit **tidak** menetapkan:

- Ontology formal (class, property, relationship semantic).
- Taxonomy hierarchy dengan parent-child term relationship.
- Vocabulary standarisasi di luar yang sudah ada pada GOV-EA-006 (traceability) dan REF-BUS-001 (glossary).

Seluruh item di atas didelegasikan ke BP-DATA-005 Seq 27.

## 9. Boundary dengan GOV-AI-001 (Knowledge Lifecycle and Provenance Standard, Seq 28 — Belum Dimulai)

Dokumen ini secara eksplisit **tidak** menetapkan:

- AI model/provider/prompt selection.
- AI training data governance.
- AI recommendation acceptance criteria detail.
- Model oversight governance mechanism.

Seluruh item di atas didelegasikan ke GOV-AI-001 Seq 28, konsisten dengan BP-DATA-001 §21 dan ARCH-DATA-001 §28 ("AI bukan decision authority").

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Ontology/taxonomy term formal dan relationship semantic | To be assigned by Project Owner — Evidence Pending | BP-DATA-005 Seq 27 |
| AI model/provider/prompt/training governance | To be designated or verified by competent institutional authority — Evidence Pending | GOV-AI-001 Seq 28 |
| Knowledge Owner/Steward aktual per kategori | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 (role archetype sudah Approved; penunjukan aktual terpisah) |
| Knowledge management platform/tooling | To be assigned by Project Owner — Evidence Pending | Implementasi teknis di luar Master Document Sequence |
| Mekanisme rujukan Knowledge Asset ke Glossary Term | To be assigned by Project Owner — Evidence Pending | Implementasi teknis / BP-DATA-005 Seq 27 |
| Acceptance criteria detail knowledge asset | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 / governance lanjutan |

## 11. Assumptions dan Program State

1. ARCH-DATA-001 (1.0.0, Approved), BP-DATA-001 (1.0.0, Approved), REF-BUS-001 (1.0.0, Approved), dan GOV-DATA-001 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. Sebelas kategori objek knowledge identik dengan yang telah dibedakan ARCH-DATA-001 §27; tidak ada kategori baru diperkenalkan.
3. BP-DATA-005 Seq 27 dan GOV-AI-001 Seq 28 belum dimulai; interface ke dokumen tersebut bersifat Candidate relationship.
4. G1 dan G2 tetap tanpa disposition; dokumen ini tidak memberikan disposition G2.
5. Enterprise Change Log diperbarui sebagai operasi terpisah menyusul finalisasi ini (lihat ECHG terkait).

## 12. Batas Kewenangan AI

Claude Work menyusun dan memfinalisasi dokumen ini sebagai Acting Chief Enterprise Architect, Reviewer, dan Draft File Operator terpadu di bawah mandat HANDOFF-e-PeLARA-EA-2026-08-05-v10, delegation authority Project Owner — Fahmi Alhabsi.

**Diizinkan**: Menyusun candidate knowledge asset taxonomy (melanjutkan kategori ARCH-DATA-001 §27), candidate lifecycle concern melanjutkan GOV-DATA-001 §7, mengklarifikasi boundary dengan Business Glossary/BP-DATA-005/GOV-AI-001, routing Evidence Pending, validasi boundary terhadap dependency normatif, melakukan self-review substantif, dan memfinalisasi status dokumen (Draft for Review → Approved) bila seluruh acceptance criteria terpenuhi dan berada dalam batas delegasi.

**Tidak diizinkan**: Menetapkan ontology/taxonomy formal, AI model/provider/prompt, knowledge management platform/tooling, owner/steward institusional aktual, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | Claude Work | Menyusun draft awal BP-DATA-004 Version 0.1.0 berdasarkan dependency normatif ARCH-DATA-001, BP-DATA-001, REF-BUS-001, GOV-DATA-001. | Selesai | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Substantive self-review terhadap Version 0.1.0: seluruh 9-item acceptance test/validation checklist diverifikasi ulang dan dinyatakan PASSED. BP-DATA-004 disahkan sebagai Official Enterprise Knowledge Model Version 1.0.0 berdasarkan mandat terpadu Project Owner. | Approved | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat unified delivery mode melalui HANDOFF-e-PeLARA-EA-2026-08-05-v10, 5 Agustus 2026; menerima hasil finalisasi tanpa persetujuan rutin per baris. | Mandat dan penerimaan tercatat | 2026-08-05 |

## 14. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Enterprise Knowledge Model sebagai BP-DATA-004 Seq 26, berdasarkan ARCH-DATA-001 §27-§28 (Approved), BP-DATA-001 §21 (Approved), REF-BUS-001 (Approved), dan GOV-DATA-001 (Approved). Cakupan: candidate knowledge asset taxonomy (11 kategori identik ARCH-DATA-001 §27, fokus Knowledge Asset), candidate lifecycle concern melanjutkan GOV-DATA-001 §7, boundary dengan Business Glossary/BP-DATA-005/GOV-AI-001, dan routing Evidence Pending. Tidak ada ontology/taxonomy formal, AI governance, tooling, atau owner institusional aktual yang ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.1.0**: Outcome **PASSED**. Seluruh 9-item acceptance test/validation checklist (§15 draft) diverifikasi ulang: metadata draft-only, dependency status akurat, sebelas kategori identik ARCH-DATA-001 §27, tidak ada ontology/taxonomy/AI governance konkret, boundary Business Glossary akurat, authority placeholder lengkap, G1/G2 tanpa disposition, Seq 27-28 tetap belum dimulai, tidak ada file lain tersentuh. Tidak ditemukan finding baru. | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi Version 0.1.0 `Draft for Review` menjadi Version 1.0.0 `Approved`, efektif 2026-08-05, sebagai Official Enterprise Knowledge Model. Metadata: version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED. §1, §11, §12, §13, §15, §16 diperbarui mencerminkan status Approved. Tidak ada perubahan substantif terhadap knowledge asset taxonomy, lifecycle concern, boundary Business Glossary/BP-DATA-005/GOV-AI-001, atau routing Evidence Pending. | Claude Work sebagai Acting Chief Enterprise Architect di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Approved |

## 15. Validation Checklist — Version 1.0.0 Approved

1. ✓ Version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED.
2. ✓ Dependency normatif (ARCH-DATA-001, BP-DATA-001, REF-BUS-001, GOV-DATA-001) dicatat sebagai Approved, tidak diklaim provisional.
3. ✓ Sebelas kategori knowledge object identik dengan ARCH-DATA-001 §27; tidak ada kategori baru diperkenalkan.
4. ✓ Tidak ada ontology/taxonomy formal, relationship semantic, atau AI model/provider/prompt yang ditetapkan.
5. ✓ Boundary dengan Business Glossary (REF-BUS-001) dijelaskan tanpa mengubah substansi glossary.
6. ✓ Tidak ada owner/steward institusional baru ditetapkan; seluruh placeholder authority memakai suffix "— Evidence Pending" yang sesuai.
7. ✓ G1 dan G2 tetap tanpa disposition; approval BP-DATA-004 bukan disposition G2.
8. ✓ BP-DATA-005 Seq 27 dan GOV-AI-001 Seq 28 tetap belum dimulai; interface dicatat sebagai Candidate relationship.
9. ✓ ARCH-DATA-001, BP-DATA-001, REF-BUS-001, GOV-DATA-001, register lain tidak diubah oleh finalisasi ini; Enterprise Change Log diperbarui sebagai operasi terpisah.

## 16. State Aktual Dokumen — Version 1.0.0 Approved

```text
Document ID: BP-DATA-004
Version: 1.0.0
Status: Approved
Effective Date: 2026-08-05
Review Outcome: PASSED
Prepared by: Claude Work
Approved by: Claude Work as Acting Chief Enterprise Architect (HANDOFF-e-PeLARA-EA-2026-08-05-v10)
Project Owner: Fahmi Alhabsi
Gate: G2 — Data and Knowledge Foundation; tanpa disposition
```

**Program State Terkini:**
- ARCH-DATA-001, BP-DATA-001, REF-BUS-001, GOV-DATA-001: masing-masing Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- Enterprise Change Log: Version 1.0.20, Approved (ECHG-001–033) pada saat finalisasi ini ditulis; pembaruan dengan ECHG-034 dilakukan sebagai operasi terpisah menyusul finalisasi BP-DATA-004.
- BP-DATA-005 Seq 27, GOV-AI-001 Seq 28: tetap belum dimulai.
- G1 dan G2: tetap tanpa disposition.
- BP-DATA-004: **Approved**; approval ini tidak menetapkan implementation completion, institutional authority assignment, ontology/taxonomy formal, AI governance, atau disposition G1/G2.

**Sumber yang benar-benar dibaca langsung untuk penyusunan dan finalisasi ini:**
1. ARCH-DATA-001 (18-Enterprise-Data-Architecture.md) — §27, §28 dibaca detail.
2. BP-DATA-001 (19-Enterprise-Data-Domain-Model.md) — §21 dibaca detail.

**Sumber yang direferensi tetapi tidak dibaca ulang penuh:**
REF-BUS-001 (Business Glossary) — direferensikan melalui kategori "glossary term" pada ARCH-DATA-001 §27, tidak dibaca ulang penuh dari file aslinya. GOV-DATA-001 — role archetype dirujuk dari batch finalisasi sebelumnya, tidak dibaca ulang penuh.

**Konfirmasi Boundary:**
- Finalisasi ini hanya mengubah `03-data-architecture/domain-models/26-Enterprise-Knowledge-Model.md`.
- ARCH-DATA-001, BP-DATA-001, REF-BUS-001, GOV-DATA-001, Enterprise Change Log, register lain, dan artefak Approved lainnya tidak disentuh oleh finalisasi ini.
- Finalisasi ini tidak menetapkan implementation completion, institutional authority assignment, ontology/taxonomy formal, AI governance, atau disposition G1/G2.

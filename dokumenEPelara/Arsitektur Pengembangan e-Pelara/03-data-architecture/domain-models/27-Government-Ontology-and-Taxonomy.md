---
document_id: BP-DATA-005
title: Government Ontology and Taxonomy
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
  - BP-DATA-004 — Enterprise Knowledge Model
  - REF-BUS-001 — Business Glossary
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; tanpa disposition
review_outcome: PASSED
intended_repository_path: 03-data-architecture/domain-models/27-Government-Ontology-and-Taxonomy.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# Seq 27 — Government Ontology and Taxonomy

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **Official Government Ontology and Taxonomy** (BP-DATA-005), Seq 27 pada Master Document Sequence, Master Roadmap `RM-EA-001` §6.3, Approved Architecture Blueprint. Dokumen menyusun **candidate ontology/taxonomy structure archetype** — struktur konseptual untuk mengorganisasi taxonomy term dan concept relationship — melanjutkan BP-DATA-001 §17 ("Operational Taxonomy", Candidate Target Direction) dan BP-DATA-004 §5/§8 (kategori "Ontology/Taxonomy Term", didelegasikan ke dokumen ini).

Dokumen ini **tidak** menetapkan: taxonomy term aktual (nama/kode/definisi konkret), ontology class/property formal, knowledge graph schema, atau vocabulary standardization di luar yang sudah Approved (GOV-EA-006, REF-BUS-001). Seluruh term/vocabulary aktual tetap **Evidence Pending** dan merupakan implementasi/governance lanjutan di luar Master Document Sequence Enterprise Architecture.

BP-DATA-005 Version 1.0.0 telah menyelesaikan substantive self-review oleh Claude Work bertindak sebagai Acting Chief Enterprise Architect di bawah mandat terpadu HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan review outcome **PASSED**, dan berlaku efektif sejak **5 Agustus 2026**. Status dokumen: **Approved**; Version **1.0.0**; `effective_date: 2026-08-05`; `review_outcome: PASSED`.

## 2. Ruang Lingkup

Cakupan dokumen:

1. Candidate taxonomy structure archetype — pola hierarki (parent-child term) dan bentuk relationship semantic secara konseptual, tanpa term aktual.
2. Candidate ontology structure archetype — pola class/property/relationship secara konseptual, mengacu pada operational taxonomy yang telah diidentifikasi BP-DATA-001 §17.
3. Boundary dengan Business Glossary (REF-BUS-001, Approved) — glossary term tetap definisi flat/datar; taxonomy term memiliki hierarki dan relationship semantic tambahan.
4. Boundary dengan Enterprise Knowledge Model (BP-DATA-004, Approved) — knowledge asset taxonomy (kategori objek pengetahuan) berbeda dari government ontology/taxonomy (struktur konsep domain pemerintahan) yang menjadi fokus dokumen ini.
5. Routing eksplisit item yang tetap Evidence Pending ke governance/implementasi lanjutan.

Di luar cakupan: taxonomy term aktual, ontology class/property formal, knowledge graph database/schema teknis, vocabulary mapping ke standar eksternal (SKOS, OWL, dsb.), dan disposition G2.

## 3. Dependency dan Sumber

| Sumber | Peran | Version/Status Terverifikasi |
| --- | --- | --- |
| ARCH-DATA-001 | Normative parent — §27 Knowledge Architecture Direction (membedakan "ontology/taxonomy term" sebagai kategori tersendiri) | 1.0.0, Approved |
| BP-DATA-001 | Normative dependency — §17 Master and Reference Data Interface ("Operational Taxonomy": taxonomy term, definition, hierarchy, semantic relationship) | 1.0.0, Approved |
| BP-DATA-004 | Normative dependency — §5 (kategori "Ontology/Taxonomy Term" didelegasikan), §8 (Boundary dengan BP-DATA-005) | 1.0.0, Approved |
| REF-BUS-001 | Normative dependency — Business Glossary, definisi datar tanpa hierarki, sebagai pembanding boundary | 1.0.0, Approved |

Dokumen ini dibaca detail untuk ARCH-DATA-001 §27, BP-DATA-001 §17 (baris "Operational Taxonomy"), BP-DATA-004 §5 dan §8. REF-BUS-001 direferensikan melalui pembedaan "glossary term" vs "ontology/taxonomy term" pada ARCH-DATA-001 §27 dan BP-DATA-004 §5, tidak dibaca ulang penuh dari file aslinya.

## 4. Evidence Method dan Klasifikasi

Dokumen membedakan evidence konsisten dengan artefak Data Architecture sebelumnya:

- **Documented Current Fact**: fakta tercatat eksplisit pada baseline atau artefak Approved.
- **Documented Assessment**: penilaian didukung evidence tetapi belum diverifikasi authority sah.
- **Approved Architecture Direction**: arah telah Approved/Accepted pada artefak governance.
- **Candidate Target Direction**: arah kandidat memerlukan keputusan/implementasi lanjutan.
- **Evidence Pending**: fakta atau keputusan belum tersedia, tidak diarang.

Working assumption: seluruh source yang dibaca bersifat provisional; dokumen tidak mengklaim completeness atau representativeness atas source yang tidak dibaca penuh.

## 5. Candidate Taxonomy Structure Archetype

Melanjutkan BP-DATA-001 §17 ("Operational Taxonomy": taxonomy term, definition, hierarchy, semantic relationship — DD-EVL-001, DD-PRF-001, DD-KNO-001), dokumen ini menyusun struktur archetype:

| Elemen Struktur | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| **Term (archetype)** | Satu konsep taxonomy dengan nama dan definisi — struktur, bukan term aktual. | Candidate Target Direction |
| **Parent-Child Hierarchy (archetype)** | Term dapat memiliki parent term (lebih umum) dan child term (lebih spesifik). | Candidate Target Direction |
| **Semantic Relationship (archetype)** | Relasi antar-term di luar hierarki (mis. "related to", "synonym of") — jenis relasi spesifik tidak ditetapkan di sini. | Candidate Target Direction |
| **Domain Scope (archetype)** | Setiap term memiliki domain scope (mis. terkait DD-EVL-001 evaluasi, DD-PRF-001 kinerja) untuk membatasi ambiguitas. | Candidate Target Direction |
| **Versioning (archetype)** | Term dapat memiliki version, melanjutkan pola BP-DATA-003 §8 Version Coexistence and Supersession Concern. | Approved Architecture Direction (BP-DATA-003) |

**Contoh konteks dari baseline** (bukan term resmi, hanya ilustrasi struktur): "jenis pengeluaran" dan "jenis indikator" telah diidentifikasi BP-DATA-001 §17 sebagai Operational Taxonomy candidate — dokumen ini **tidak** mendefinisikan term aktual untuk keduanya, hanya menyediakan struktur archetype yang dapat diterapkan bila term tersebut disusun pada tahap governance berikutnya.

## 6. Candidate Ontology Structure Archetype

Ontology archetype disusun sebagai struktur yang lebih formal dari taxonomy archetype (§5), untuk domain pemerintahan yang memerlukan relationship semantic lebih kaya dari sekadar hierarki:

| Elemen Ontology | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| **Concept Class (archetype)** | Kategori konsep tingkat tinggi (mis. "Dokumen Perencanaan", "Indikator Kinerja") — nama ilustratif, bukan class resmi. | Candidate Target Direction |
| **Property (archetype)** | Atribut yang melekat pada concept class — tidak ditetapkan sebagai field database. | Candidate Target Direction |
| **Relationship Type (archetype)** | Jenis relasi antar-concept-class (mis. "bagian dari", "diturunkan dari") — **tidak** menggantikan vocabulary formal GOV-EA-006 §8 untuk traceability; ini adalah domain-semantic vocabulary terpisah, konsisten dengan pemisahan yang sudah dilakukan BP-DATA-001/BP-DATA-002/BP-DATA-003. | Candidate Target Direction |

**Catatan penting**: Ontology archetype di atas **tidak** menggunakan atau memodifikasi vocabulary formal traceability GOV-EA-006 (`DERIVED_FROM`, `SUPERSEDES`, dst.). Domain-semantic relationship (mis. "bagian dari") dan formal traceability relationship (mis. `DEPENDS_ON`) tetap dua vocabulary terpisah, konsisten dengan pola yang sudah ditetapkan di BP-DATA-001 §11 dan BP-DATA-003 §7.

## 7. Boundary dengan Business Glossary (REF-BUS-001)

- **Glossary Term** (REF-BUS-001, Approved): definisi datar/flat, satu istilah satu definisi, tanpa hierarki wajib.
- **Taxonomy/Ontology Term** (fokus dokumen ini): term dengan hierarki (parent-child) dan/atau relationship semantic tambahan.
- Taxonomy/ontology term **dapat merujuk** ke Glossary Term untuk definisi dasar, namun menambahkan struktur hierarki/relasi yang tidak dimiliki Glossary Term. Dokumen ini tidak mengubah Business Glossary.

## 8. Boundary dengan Enterprise Knowledge Model (BP-DATA-004)

- **Knowledge Asset Taxonomy** (BP-DATA-004, Approved): taksonomi *kategori objek pengetahuan* (source document, structured data, knowledge asset, dst. — 11 kategori).
- **Government Ontology and Taxonomy** (dokumen ini): taksonomi *konsep domain pemerintahan* (jenis pengeluaran, jenis indikator, dst.) — objek yang berbeda dari kategori pengetahuan itu sendiri.
- Kedua taksonomi ini **saling melengkapi, tidak tumpang tindih**: BP-DATA-004 mengategorikan *jenis objek pengetahuan*, sementara BP-DATA-005 menyusun *struktur konsep domain* yang menjadi isi dari objek-objek tersebut.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Taxonomy term aktual (nama, kode, definisi) | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 (Source Authority archetype) / keputusan governance terpisah |
| Ontology class/property formal | To be assigned by Project Owner — Evidence Pending | Implementasi teknis di luar Master Document Sequence |
| Domain-semantic relationship type vocabulary spesifik | To be assigned by Project Owner — Evidence Pending | Keputusan governance/implementasi lanjutan |
| Knowledge graph database/schema teknis | To be assigned by Project Owner — Evidence Pending | Implementasi teknis di luar Master Document Sequence |
| Mapping ke standar eksternal (SKOS, OWL, dsb.) | To be assigned by Project Owner — Evidence Pending | Implementasi teknis di luar Master Document Sequence |
| Term Authority (siapa berwenang menyusun/mengubah term) | To be designated or verified by competent institutional authority — Evidence Pending | GOV-DATA-001 / keputusan institusional terpisah |

## 10. Assumptions dan Program State

1. ARCH-DATA-001 (1.0.0, Approved), BP-DATA-001 (1.0.0, Approved), BP-DATA-004 (1.0.0, Approved), dan REF-BUS-001 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. Domain-semantic vocabulary (§6) tetap terpisah dari formal traceability vocabulary GOV-EA-006; dokumen ini tidak memodifikasi GOV-EA-006.
3. GOV-AI-001 Seq 28 belum dimulai; interface ke dokumen tersebut bersifat Candidate relationship (bila ontology digunakan sebagai context untuk AI recommendation, governance detail tetap GOV-AI-001).
4. G1 dan G2 tetap tanpa disposition; dokumen ini tidak memberikan disposition G2.
5. Enterprise Change Log diperbarui sebagai operasi terpisah menyusul finalisasi ini (lihat ECHG terkait).

## 11. Batas Kewenangan AI

Claude Work menyusun dan memfinalisasi dokumen ini sebagai Acting Chief Enterprise Architect, Reviewer, dan Draft File Operator terpadu di bawah mandat HANDOFF-e-PeLARA-EA-2026-08-05-v10, delegation authority Project Owner — Fahmi Alhabsi.

**Diizinkan**: Menyusun candidate taxonomy structure archetype dan candidate ontology structure archetype secara konseptual, mengklarifikasi boundary dengan Business Glossary dan Enterprise Knowledge Model, routing Evidence Pending, validasi boundary terhadap dependency normatif, melakukan self-review substantif, dan memfinalisasi status dokumen (Draft for Review → Approved) bila seluruh acceptance criteria terpenuhi dan berada dalam batas delegasi.

**Tidak diizinkan**: Menetapkan taxonomy term aktual, ontology class/property formal, knowledge graph schema teknis, vocabulary mapping ke standar eksternal, owner/steward institusional aktual, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | Claude Work | Menyusun draft awal BP-DATA-005 Version 0.1.0 berdasarkan dependency normatif ARCH-DATA-001, BP-DATA-001, BP-DATA-004, REF-BUS-001. | Selesai | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Substantive self-review terhadap Version 0.1.0: seluruh 9-item acceptance test/validation checklist diverifikasi ulang dan dinyatakan PASSED. BP-DATA-005 disahkan sebagai Official Government Ontology and Taxonomy Version 1.0.0 berdasarkan mandat terpadu Project Owner. | Approved | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat unified delivery mode melalui HANDOFF-e-PeLARA-EA-2026-08-05-v10, 5 Agustus 2026; menerima hasil finalisasi tanpa persetujuan rutin per baris. | Mandat dan penerimaan tercatat | 2026-08-05 |

## 13. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Government Ontology and Taxonomy sebagai BP-DATA-005 Seq 27, berdasarkan ARCH-DATA-001 §27 (Approved), BP-DATA-001 §17 (Approved), BP-DATA-004 §5/§8 (Approved), dan REF-BUS-001 (Approved). Cakupan: candidate taxonomy structure archetype (term/hierarchy/semantic relationship/domain scope/versioning), candidate ontology structure archetype (concept class/property/relationship type, terpisah dari vocabulary formal GOV-EA-006), boundary dengan Business Glossary dan Enterprise Knowledge Model, dan routing Evidence Pending. Tidak ada taxonomy term aktual, ontology class formal, atau knowledge graph schema teknis yang ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.1.0**: Outcome **PASSED**. Seluruh 9-item acceptance test/validation checklist (§14 draft) diverifikasi ulang: metadata draft-only, dependency status akurat, tidak ada term/class/vocabulary eksternal konkret, domain-semantic vocabulary terpisah dari GOV-EA-006, boundary Business Glossary/BP-DATA-004 akurat, authority placeholder lengkap, G1/G2 tanpa disposition, GOV-AI-001 Seq 28 tetap belum dimulai, tidak ada file lain tersentuh. Tidak ditemukan finding baru. | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi Version 0.1.0 `Draft for Review` menjadi Version 1.0.0 `Approved`, efektif 2026-08-05, sebagai Official Government Ontology and Taxonomy. Metadata: version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED. §1, §10, §11, §12, §14, §15 diperbarui mencerminkan status Approved. Tidak ada perubahan substantif terhadap taxonomy/ontology structure archetype, boundary dengan Business Glossary/BP-DATA-004, atau routing Evidence Pending. | Claude Work sebagai Acting Chief Enterprise Architect di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Approved |

## 14. Validation Checklist — Version 1.0.0 Approved

1. ✓ Version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED.
2. ✓ Dependency normatif (ARCH-DATA-001, BP-DATA-001, BP-DATA-004, REF-BUS-001) dicatat sebagai Approved, tidak diklaim provisional.
3. ✓ Tidak ada taxonomy term aktual, ontology class/property formal, atau vocabulary standardization eksternal yang ditetapkan.
4. ✓ Domain-semantic vocabulary (§6) dijaga terpisah dari formal traceability vocabulary GOV-EA-006; tidak memodifikasi GOV-EA-006.
5. ✓ Boundary dengan Business Glossary (REF-BUS-001) dan Enterprise Knowledge Model (BP-DATA-004) dijelaskan tanpa mengubah substansi keduanya.
6. ✓ Tidak ada owner/steward institusional baru ditetapkan; seluruh placeholder authority memakai suffix "— Evidence Pending" yang sesuai.
7. ✓ G1 dan G2 tetap tanpa disposition; approval BP-DATA-005 bukan disposition G2.
8. ✓ GOV-AI-001 Seq 28 tetap belum dimulai; interface dicatat sebagai Candidate relationship.
9. ✓ ARCH-DATA-001, BP-DATA-001, BP-DATA-004, REF-BUS-001, register lain tidak diubah oleh finalisasi ini; Enterprise Change Log diperbarui sebagai operasi terpisah.

## 15. State Aktual Dokumen — Version 1.0.0 Approved

```text
Document ID: BP-DATA-005
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
- ARCH-DATA-001, BP-DATA-001, BP-DATA-004, REF-BUS-001: masing-masing Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- Enterprise Change Log: Version 1.0.21, Approved (ECHG-001–034) pada saat finalisasi ini ditulis; pembaruan dengan ECHG-035 dilakukan sebagai operasi terpisah menyusul finalisasi BP-DATA-005.
- GOV-AI-001 Seq 28: tetap belum dimulai — Seq 22–27 (BP-DATA-003, STD-DATA-001, GOV-DATA-001, STD-DATA-002, BP-DATA-004, BP-DATA-005) seluruhnya Approved setelah dokumen ini.
- G1 dan G2: tetap tanpa disposition.
- BP-DATA-005: **Approved**; approval ini tidak menetapkan implementation completion, institutional authority assignment, taxonomy term aktual, ontology class formal, atau disposition G1/G2.

**Sumber yang benar-benar dibaca langsung untuk penyusunan dan finalisasi ini:**
1. ARCH-DATA-001 (18-Enterprise-Data-Architecture.md) — §27 dibaca detail.
2. BP-DATA-001 (19-Enterprise-Data-Domain-Model.md) — §17 dibaca detail (baris Operational Taxonomy).
3. BP-DATA-004 (26-Enterprise-Knowledge-Model.md) — §5, §8 dibaca detail.

**Sumber yang direferensi tetapi tidak dibaca ulang penuh:**
REF-BUS-001 (Business Glossary) — direferensikan melalui pembedaan "glossary term" vs "ontology/taxonomy term" pada ARCH-DATA-001 §27 dan BP-DATA-004 §5, tidak dibaca ulang penuh dari file aslinya.

**Konfirmasi Boundary:**
- Finalisasi ini hanya mengubah `03-data-architecture/domain-models/27-Government-Ontology-and-Taxonomy.md`.
- ARCH-DATA-001, BP-DATA-001, BP-DATA-004, REF-BUS-001, Enterprise Change Log, register lain, dan artefak Approved lainnya tidak disentuh oleh finalisasi ini.
- Finalisasi ini tidak menetapkan implementation completion, institutional authority assignment, taxonomy term aktual, ontology class formal, atau disposition G1/G2.

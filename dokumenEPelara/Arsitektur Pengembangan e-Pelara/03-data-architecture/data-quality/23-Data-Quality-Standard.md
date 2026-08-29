---
document_id: STD-DATA-001
title: Data Quality Standard
system: e-PeLARA Next Generation
classification: Architecture Standard
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
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; tanpa disposition
review_outcome: PASSED
intended_repository_path: 03-data-architecture/data-quality/23-Data-Quality-Standard.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# Seq 23 — Data Quality Standard

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **Official Data Quality Standard** (STD-DATA-001), Seq 23 pada Master Document Sequence, Master Roadmap `RM-EA-001` §6.3, Approved Architecture Standard. Dokumen menetapkan dimensi quality data sebagai **concern konseptual berstandar**, melanjutkan cross-cutting quality interface yang telah diidentifikasi oleh ARCH-DATA-001 §23 dan BP-DATA-001 §19, tanpa mengubah substansi kedua dokumen tersebut.

Dokumen ini **tidak** menetapkan: rule validasi konkret, threshold numerik, test case, acceptance criteria, metric formula, remediation procedure, quality tooling/teknologi, atau owner/steward institusional untuk data quality. Seluruh elemen konkret tersebut tetap **Evidence Pending** dan didelegasikan ke governance/implementasi lanjutan (GOV-DATA-001 Seq 24 untuk governance model; implementasi teknis di luar Master Document Sequence).

STD-DATA-001 Version 1.0.0 telah menyelesaikan substantive self-review oleh Claude Work bertindak sebagai Acting Chief Enterprise Architect di bawah mandat terpadu HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan review outcome **PASSED**, dan berlaku efektif sejak **5 Agustus 2026**. Status dokumen: **Approved**; Version **1.0.0**; `effective_date: 2026-08-05`; `review_outcome: PASSED`.

## 2. Ruang Lingkup

Cakupan dokumen:

1. Standarisasi definisi dan boundary sembilan dimensi quality data yang telah dirujuk konsisten oleh ARCH-DATA-001 §23 dan BP-DATA-001 §19, tanpa menambah atau mengurangi dimensi.
2. Candidate quality concern per dimensi: kapan dimensi tersebut relevan secara konseptual, tanpa metric/threshold/test.
3. Candidate boundary antara data quality (cross-cutting concern, dokumen ini) dan data lineage (BP-DATA-003 Seq 22, Approved) — quality dapat memakai lineage record sebagai salah satu input assessment, namun assessment rule sendiri tetap domain dokumen ini.
4. Routing eksplisit item yang tetap Evidence Pending ke GOV-DATA-001 Seq 24 (governance model, remediation authority) atau implementasi teknis (rule engine, tooling, dashboard monitoring).

Di luar cakupan: rule/threshold/test/metric formula konkret, quality tooling/teknologi, remediation workflow, owner/steward institusional, SLA/target quality, dan disposition G2.

## 3. Dependency dan Sumber

| Sumber | Peran | Version/Status Terverifikasi |
| --- | --- | --- |
| ARCH-DATA-001 | Normative parent — §23 Data Quality Direction menetapkan sembilan dimensi sebagai conceptual direction | 1.0.0, Approved |
| BP-DATA-001 | Normative dependency — §19 Data Quality Interface (Cross-Cutting Concern), tabel sembilan dimensi dengan Evidence Status per dimensi | 1.0.0, Approved |
| BP-DATA-002 | Context — §20 Data Quality Interface merujuk STD-DATA-001 Seq 23 untuk rule/metric/test/acceptance master-reference data | 1.0.0, Approved |
| BP-DATA-003 | Context — §10 Cross-Cutting Boundary dengan STD-DATA-001; lineage record sebagai salah satu input quality assessment | 1.0.0, Approved |
| GOV-EA-006 | Governing standard — Traceability Standard; tidak ada vocabulary baru diperkenalkan dokumen ini | 1.0.0, Approved |

Dokumen ini dibaca detail untuk ARCH-DATA-001 §23, BP-DATA-001 §19, BP-DATA-002 §20 (dan referensi terkait di §7, §14, §19), dan BP-DATA-003 §10.

## 4. Evidence Method dan Klasifikasi

Dokumen membedakan evidence konsisten dengan BP-DATA-001/BP-DATA-002/BP-DATA-003:

- **Documented Current Fact**: fakta tercatat eksplisit pada baseline atau artefak Approved.
- **Documented Assessment**: penilaian didukung evidence tetapi belum diverifikasi authority sah.
- **Approved Architecture Direction**: arah telah Approved/Accepted pada artefak governance.
- **Candidate Target Direction**: arah kandidat memerlukan keputusan/implementasi lanjutan.
- **Evidence Pending**: fakta atau keputusan belum tersedia, tidak diarang.

Working assumption: seluruh source yang dibaca bersifat provisional; dokumen tidak mengklaim completeness atau representativeness atas source yang tidak dibaca penuh.

## 5. Sembilan Dimensi Data Quality — Standarisasi Definisi

Tabel berikut menstandarkan definisi sembilan dimensi yang telah dirujuk konsisten oleh ARCH-DATA-001 §23 dan BP-DATA-001 §19. Dokumen ini **tidak menambah dimensi baru**; standarisasi hanya memperjelas boundary konseptual masing-masing dimensi.

| Dimensi | Definisi Terstandar | Domain Terkait (BP-DATA-001 §19) | Evidence Status |
| --- | --- | --- | --- |
| **Completeness** | Semua required attribute/record tersedia tanpa missing value, sesuai definisi "required" yang berlaku pada domain masing-masing. | Seluruh 13 domain | Candidate Target Direction |
| **Validity** | Data value sesuai allowed value set dan format rule yang berlaku, tanpa menetapkan format rule itu sendiri. | Seluruh domain, khususnya DD-MST-001 | Candidate Target Direction |
| **Consistency** | Data value sama lintas sistem/source untuk entity yang sama, dalam batas integration scope yang berlaku. | Seluruh domain, khususnya cross-domain | Evidence Pending (integration scope pending) |
| **Uniqueness** | Identifier unik sesuai scope yang berlaku, tanpa duplikasi. | DD-PLN-001, DD-BDG-001, DD-EXE-001, DD-ORG-001 | Candidate Target Direction |
| **Accuracy** | Data value mencerminkan realitas bisnis/faktual sesuai verification model yang berlaku. | Seluruh domain (verification model pending) | Evidence Pending |
| **Timeliness** | Data tersedia dalam waktu yang diperlukan untuk usage, tanpa menetapkan SLA/threshold waktu. | Seluruh domain | Evidence Pending |
| **Integrity** | Data relationship dan constraint logic terpenuhi sesuai domain model yang berlaku. | Seluruh domain, khususnya keyed domains | Candidate Target Direction |
| **Traceability** | Data dapat ditelusuri ke source, transformation, approval — beririsan langsung dengan BP-DATA-003 (lineage). | Seluruh domain (via DD-MDL-001) | Candidate Target Direction |
| **Authorized Accessibility** | Data dapat diakses oleh authorized consumer sesuai authority boundary yang berlaku, tanpa menetapkan access control mechanism. | Seluruh domain | Evidence Pending |

Standarisasi definisi di atas **tidak** mengubah Evidence Status yang telah dicatat BP-DATA-001 §19; kolom Evidence Status pada tabel ini identik dengan BP-DATA-001 §19 sebagai bentuk konsistensi lintas-artefak.

## 6. Candidate Quality Concern per Dimensi

Untuk tiap dimensi, dokumen ini mengidentifikasi *when the dimension becomes relevant* secara konseptual, tanpa menetapkan rule, threshold, test, atau acceptance criteria:

1. **Completeness Concern**: relevan pada titik data-entry dan pada titik konsumsi lintas-domain, ketika missing value dapat mempengaruhi downstream calculation atau reporting.
2. **Validity Concern**: relevan ketika data value dipetakan ke Reference Value Set atau Classification Scheme (BP-DATA-002 §7).
3. **Consistency Concern**: relevan ketika entity yang sama direpresentasikan pada lebih dari satu sistem/source — beririsan dengan reconciliation concern BP-DATA-003 §9.
4. **Uniqueness Concern**: relevan pada domain dengan identifier authoritative (BP-DATA-001 §17 Master and Reference Data Interface).
5. **Accuracy Concern**: relevan ketika data digunakan sebagai dasar keputusan atau publikasi resmi (One Data, Many Publications).
6. **Timeliness Concern**: relevan pada domain dengan siklus periode (DD-PLN-001, DD-OPR-001, DD-BDG-001), termasuk keterkaitan dengan siklus periode yang telah Accepted pada ADR-0001.
7. **Integrity Concern**: relevan ketika terdapat relationship antar-domain yang telah dicatat pada BP-DATA-001 §11-§12 (candidate relationship).
8. **Traceability Concern**: dipenuhi melalui BP-DATA-003 (Data Lineage and Traceability Blueprint, Approved); dokumen ini tidak mengulang detail lineage.
9. **Authorized Accessibility Concern**: relevan pada domain dengan sensitivitas tinggi (DD-EVD-001, DD-ORG-001 person data); detail access control mechanism tetap domain GOV-DATA-001 Seq 24.

Concern di atas adalah **Candidate Target Direction** untuk membantu diskusi arsitektur lanjutan, bukan rule operasional.

## 7. Boundary dengan BP-DATA-003 (Data Lineage and Traceability Blueprint)

Melanjutkan BP-DATA-003 §10 (Cross-Cutting Boundary dengan STD-DATA-001):

- Data quality dan data lineage adalah **dua concern cross-cutting yang terpisah**, bukan satu domain yang sama.
- Lineage record (BP-DATA-003) dapat menjadi salah satu **input** bagi quality assessment (contoh: mendeteksi anomali via perubahan source yang tidak wajar), namun rule assessment itu sendiri tetap domain dokumen ini.
- Traceability dimension (dimensi ke-8 pada §5) secara konseptual **dipenuhi oleh** keberadaan BP-DATA-003, bukan oleh dokumen ini; dokumen ini hanya mencatat keterkaitan tersebut tanpa mengulang substansi BP-DATA-003.

## 8. Boundary dengan GOV-DATA-001 (Data Governance Operating Model, Seq 24 — Belum Dimulai)

Dokumen ini secara eksplisit **tidak** menetapkan:

- Rule validasi, threshold numerik, atau test case konkret per dimensi.
- Metric formula atau scoring mechanism quality.
- Remediation workflow atau corrective action procedure.
- Owner/steward institusional untuk quality assessment.
- Quality tooling, teknologi, atau platform.

Seluruh item di atas didelegasikan ke GOV-DATA-001 Seq 24 (governance model) dan/atau implementasi teknis di luar Master Document Sequence.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Rule validasi dan threshold numerik per dimensi | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 Seq 24 / implementasi teknis |
| Metric formula dan scoring mechanism | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 Seq 24 / implementasi teknis |
| Test case dan acceptance criteria | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 Seq 24 / implementasi teknis |
| Remediation workflow dan corrective action authority | To be designated or verified by competent institutional authority — Evidence Pending | GOV-DATA-001 Seq 24 |
| Owner/steward quality assessment per domain | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 Seq 24 |
| Quality tooling/teknologi/platform | To be assigned by Project Owner — Evidence Pending | Implementasi teknis di luar Master Document Sequence |
| Integration scope untuk dimensi Consistency | To be assigned by Project Owner — Evidence Pending | ARCH-INT-001 Seq 34 (belum dimulai) |

## 10. Assumptions dan Program State

1. ARCH-DATA-001 (1.0.0, Approved) dan BP-DATA-001 (1.0.0, Approved) adalah normative dependency; tidak diubah oleh dokumen ini.
2. BP-DATA-002 (1.0.0, Approved) dan BP-DATA-003 (1.0.0, Approved) adalah context dependency; tidak diubah oleh dokumen ini.
3. Sembilan dimensi quality yang distandarkan identik dengan yang telah dirujuk konsisten oleh ARCH-DATA-001 §23 dan BP-DATA-001 §19; tidak ada dimensi baru diperkenalkan.
4. GOV-DATA-001 Seq 24 dan Seq 25–28 belum dimulai; interface ke dokumen tersebut bersifat Candidate relationship.
5. G1 dan G2 tetap tanpa disposition; dokumen ini tidak memberikan disposition G2.
6. Enterprise Change Log diperbarui sebagai operasi terpisah menyusul finalisasi ini (lihat ECHG terkait).

## 11. Batas Kewenangan AI

Claude Work menyusun dan memfinalisasi dokumen ini sebagai Acting Chief Enterprise Architect, Reviewer, dan Draft File Operator terpadu di bawah mandat HANDOFF-e-PeLARA-EA-2026-08-05-v10, delegation authority Project Owner — Fahmi Alhabsi.

**Diizinkan**: Menstandarkan definisi dan boundary dimensi quality yang telah ada, menyusun candidate quality concern per dimensi, mengklarifikasi boundary dengan BP-DATA-003, routing Evidence Pending, validasi boundary terhadap dependency normatif, melakukan self-review substantif, dan memfinalisasi status dokumen (Draft for Review → Approved) bila seluruh acceptance criteria terpenuhi dan berada dalam batas delegasi.

**Tidak diizinkan**: Menetapkan rule/threshold/test/metric konkret, remediation workflow, owner/steward institusional, teknologi/tooling, SLA/target quality, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | Claude Work | Menyusun draft awal STD-DATA-001 Version 0.1.0 berdasarkan dependency normatif ARCH-DATA-001, BP-DATA-001, BP-DATA-002, BP-DATA-003. | Selesai | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Substantive self-review terhadap Version 0.1.0: seluruh 9-item acceptance test/validation checklist diverifikasi ulang dan dinyatakan PASSED. STD-DATA-001 disahkan sebagai Official Data Quality Standard Version 1.0.0 berdasarkan mandat terpadu Project Owner. | Approved | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat unified delivery mode melalui HANDOFF-e-PeLARA-EA-2026-08-05-v10, 5 Agustus 2026; menerima hasil finalisasi tanpa persetujuan rutin per baris. | Mandat dan penerimaan tercatat | 2026-08-05 |

## 13. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Data Quality Standard sebagai STD-DATA-001 Seq 23, berdasarkan ARCH-DATA-001 §23 (Approved), BP-DATA-001 §19 (Approved), BP-DATA-002 §20 (Approved), dan BP-DATA-003 §10 (Approved). Cakupan: standarisasi definisi sembilan dimensi quality (tanpa menambah dimensi baru), candidate quality concern per dimensi, boundary dengan lineage/governance, dan routing Evidence Pending ke GOV-DATA-001 Seq 24. Tidak ada rule, threshold, test, metric, teknologi, atau owner institusional yang ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.1.0**: Outcome **PASSED**. Seluruh 9-item acceptance test/validation checklist (§14 draft) diverifikasi ulang: metadata draft-only, sembilan dimensi identik sumber, tidak ada rule/threshold/test/metric/teknologi ditetapkan, authority placeholder lengkap dengan suffix Evidence Pending, boundary BP-DATA-003 akurat, G1/G2 tanpa disposition, Seq 24–28 tetap belum dimulai, tidak ada file lain tersentuh. Tidak ditemukan finding baru. | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi Version 0.1.0 `Draft for Review` menjadi Version 1.0.0 `Approved`, efektif 2026-08-05, sebagai Official Data Quality Standard. Metadata: version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED. §1, §10, §11, §12, §14, §15 diperbarui mencerminkan status Approved. Tidak ada perubahan substantif terhadap standarisasi dimensi, candidate quality concern, boundary BP-DATA-003, atau routing Evidence Pending. | Claude Work sebagai Acting Chief Enterprise Architect di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Approved |

## 14. Validation Checklist — Version 1.0.0 Approved

1. ✓ Version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED.
2. ✓ Dependency normatif (ARCH-DATA-001, BP-DATA-001, BP-DATA-002, BP-DATA-003) dicatat sebagai Approved 1.0.0, tidak diklaim provisional.
3. ✓ Sembilan dimensi quality identik dengan BP-DATA-001 §19 dan ARCH-DATA-001 §23; tidak ada dimensi baru, tidak ada Evidence Status yang diubah dari sumber aslinya.
4. ✓ Tidak ada rule, threshold, test case, metric formula, remediation workflow, atau teknologi/tooling yang ditetapkan.
5. ✓ Tidak ada owner/steward institusional baru ditetapkan; seluruh placeholder authority memakai suffix "— Evidence Pending" yang sesuai.
6. ✓ Boundary dengan BP-DATA-003 (lineage) dijelaskan tanpa mengulang atau mengubah substansi BP-DATA-003.
7. ✓ G1 dan G2 tetap tanpa disposition; approval STD-DATA-001 bukan disposition G2.
8. ✓ Seq 24–28 tetap belum dimulai; interface dicatat sebagai Candidate relationship.
9. ✓ ARCH-DATA-001, BP-DATA-001, BP-DATA-002, BP-DATA-003, register lain tidak diubah oleh finalisasi ini; Enterprise Change Log diperbarui sebagai operasi terpisah.

## 15. State Aktual Dokumen — Version 1.0.0 Approved

```text
Document ID: STD-DATA-001
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
- ARCH-DATA-001: Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- BP-DATA-001: Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- BP-DATA-002: Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- BP-DATA-003: Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- Enterprise Change Log: Version 1.0.17, Approved (ECHG-001–030) pada saat finalisasi ini ditulis; pembaruan dengan ECHG-031 dilakukan sebagai operasi terpisah menyusul finalisasi STD-DATA-001.
- Seq 24–28: tetap belum dimulai.
- G1 dan G2: tetap tanpa disposition.
- STD-DATA-001: **Approved**; approval ini tidak menetapkan implementation completion, institutional authority assignment, owner/steward assignment, compliance determination, rule/threshold/test/metric konkret, atau disposition G1/G2.

**Sumber yang benar-benar dibaca langsung untuk penyusunan dan finalisasi ini:**
1. ARCH-DATA-001 (18-Enterprise-Data-Architecture.md) — §23 dibaca detail langsung dari file asli.
2. BP-DATA-001 (19-Enterprise-Data-Domain-Model.md) — §19 dibaca detail.
3. BP-DATA-002 (20-Master-and-Reference-Data-Blueprint.md) — §20 dan referensi STD-DATA-001 lain digrep dan dibaca konteksnya.
4. BP-DATA-003 (22-Data-Lineage-and-Traceability-Blueprint.md) — §10 dibaca detail.

**Sumber yang direferensi tetapi tidak dibaca ulang penuh:**
Tidak ada; seluruh dependency normatif yang dikutip langsung telah dibaca dari file aslinya.

**Konfirmasi Boundary:**
- Finalisasi ini hanya mengubah `03-data-architecture/data-quality/23-Data-Quality-Standard.md`.
- ARCH-DATA-001, BP-DATA-001, BP-DATA-002, BP-DATA-003, Enterprise Change Log, register lain, dan artefak Approved lainnya tidak disentuh oleh finalisasi ini.
- Finalisasi ini tidak menetapkan implementation completion, institutional authority assignment, owner/steward assignment, compliance determination, rule/threshold/test/metric konkret, atau disposition G1/G2.

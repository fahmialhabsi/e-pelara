---
document_id: ARCH-DATA-001
title: Enterprise Data Architecture
system: e-PeLARA Next Generation
classification: Enterprise Architecture
domain: Data and Knowledge Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Chief Enterprise Architect under standing delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
effective_date: 2026-08-04
roadmap_dependency:
  - G1 deliverables
  - Official Current State Baseline
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation
review_outcome: PASSED
intended_repository_path: 03-data-architecture/18-Enterprise-Data-Architecture.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# 18 — Enterprise Data Architecture

## 1. Tujuan dan Kedudukan

ARCH-DATA-001 adalah **Official Enterprise Data Architecture** yang menetapkan arah Data and Knowledge Architecture tingkat enterprise bagi e-PeLARA Next Generation. Dokumen ini menerjemahkan kebutuhan bisnis Approved dan evidence baseline yang diizinkan menjadi prinsip, landscape, boundary, dan arah target yang dapat ditelusuri untuk artefak data berikutnya.

Dokumen ini bukan Enterprise Data Domain Model terperinci, logical/physical data model atau ERD, schema database, tabel, kolom, index, constraint, API/event schema, canonical data model, blueprint master/reference data atau lineage, data-quality standard, governance operating model, classification/retention/privacy standard, ontology/taxonomy, ADR temporal, migration design, implementation specification, Canonical Traceability Matrix, legal opinion, compliance determination, maupun disposition G2.

Approval dokumen tidak menetapkan implementasi, authority institusional, compliance, verification, data-domain acceptance, atau disposition G2. G1 dan G2 tetap tanpa disposition.

## 2. Ruang Lingkup

Ruang lingkup mencakup arah konseptual data, metadata, lineage, knowledge, analytics, AI, dan publication interface dalam batas enterprise. Dokumen membedakan documented current evidence dari candidate target direction dan menetapkan interface ke artefak Seq 19–28 tanpa membuat isi artefak tersebut.

## 3. Sumber Otoritatif dan Dependency

Dependency roadmap hanya dua kelompok: **G1 deliverables** Approved dan **Official Current State Baseline**. G1 deliverables mencakup ARCH-BUS-001, BP-BUS-001 sampai BP-BUS-005, REF-BUS-001, dan STD-BUS-001. Baseline mencakup lima dokumen pada [01-current-state](../01-current-state/). Governance, roadmap, issue/risk/compliance register, serta sumber G1 digunakan sebagai link dan context, bukan dependency tambahan.

## 4. Data and Knowledge Architecture Vision

Visinya adalah fondasi data dan pengetahuan yang memungkinkan data pemerintah memiliki makna, sumber, konteks waktu, versi, lineage, evidence, dan batas authority yang dapat ditelusuri; dipakai kembali secara terkendali untuk proses, analitik, AI, dan publikasi tanpa mengubah substansi resmi.

## 5. Current-State Evidence Method

| Status evidence | Penggunaan |
| --- | --- |
| Documented Current Fact | Fakta yang dinyatakan Official Current State Baseline. |
| Documented Assessment | Temuan, gap, atau penilaian yang dicatat baseline. |
| Candidate Target Direction | Arah target dari Charter/G1 yang belum diimplementasikan atau diverifikasi. |
| Evidence Pending | Informasi tanpa evidence atau verifier sah. |

Informasi tertulis pada baseline tidak otomatis berstatus Verified. Ringkasan berikut tidak mengaudit ulang baseline dan selalu merujuk sumbernya.

## 6. Current-State Summary

| Area | Evidence yang dicatat | Kedudukan |
| --- | --- | --- |
| Platform data | Baseline identitas mendokumentasikan MySQL sebagai database utama serta Redis sebagai cache pada deployment yang dijelaskan. | Documented Current Fact — [Baseline 1](../01-current-state/1-identitas-sistem.md). |
| Rantai dokumen dan data | Baseline modul mendokumentasikan rantai RPJMD, Renstra, RKPD, Renja, RKA, DPA, realisasi, monev, dan laporan beserta modul terkait. | Documented Current Fact — [Baseline 2](../01-current-state/2-modul-sistem.md). |
| Identifier/periode | Baseline alur mendokumentasikan `periode_id` pada entitas terkait dan clone periode; detail governance identifier belum ditetapkan. | Documented Current Fact; governance target Evidence Pending — [Baseline 3](../01-current-state/3-alur-logika-sistem.md). |
| Siklus temporal | Bagian hierarki awal Baseline 2 mencatat Renstra OPD lima tahunan, sedangkan detail Modul Renstra mencatat siklus enam tahun termasuk target/pagu tahun 1–6; RPJMD dicatat lima tahunan. Perbedaan internal Renstra 5/6 tahun adalah conflict context; AIR-001 tetap terbuka dan ARCH-DATA-001 tidak menetapkan interpretasi atau keputusan temporal. | Documented Current Fact with documented conflict context — [Baseline 2](../01-current-state/2-modul-sistem.md). |
| Integrasi/workflow | Baseline assessment mencatat SIPD sebagai gap dan workflow approval belum tersedia pada semua modul perencanaan. | Documented Assessment — [Baseline 4](../01-current-state/4-penilaian-kesesuaian-standar.md). |
| Analytics/AI/export capability | Baseline mendokumentasikan dashboard/visualisasi, rekomendasi AI, serta kemampuan export PDF, Excel/CSV, dan Word sesuai bagian sumber masing-masing. Tidak dinyatakan bahwa seluruh dashboard atau seluruh export telah lengkap dan operasional end-to-end. | Documented Current Fact — [Baseline 1](../01-current-state/1-identitas-sistem.md), [Baseline 2](../01-current-state/2-modul-sistem.md). |
| Dashboard data readiness | Baseline assessment mencatat Dashboard RPJMD tersedia tetapi data masih dummy. | Documented Assessment — [Baseline 4](../01-current-state/4-penilaian-kesesuaian-standar.md). |
| Export completeness | Baseline assessment mencatat export PDF/Excel belum diterapkan lengkap pada seluruh modul; ini bukan klaim bahwa seluruh export belum tersedia. | Documented Assessment — [Baseline 4](../01-current-state/4-penilaian-kesesuaian-standar.md). |
| Teknis rinci | Baseline teknis berisi skema, katalog endpoint, frontend, dan migrasi sebagai fakta teknis baseline; ia tidak menetapkan authority institusional maupun canonical model. | Documented Current Fact — [Baseline 5](../01-current-state/5-referensi-teknis-database-api-frontend.md). |

Tidak ada kesimpulan end-to-end integration, authoritative ownership, workflow completeness, lineage readiness, quality compliance, API availability, backup readiness, atau target implementation dari ringkasan ini.

## 7. Data and Knowledge Drivers

Driver utama adalah kesinambungan perencanaan sampai akuntabilitas, Single Source of Truth, One Data, Many Publications, traceability, keamanan dan audit, serta human accountability for AI sebagaimana [Architecture Charter](../00-governance/00-Architecture-Charter.md). Business capability, value stream, lifecycle, authority, regulatory, glossary, dan modeling standard G1 memberikan context kebutuhan, bukan implementasi data.

## 8. Target Outcomes

Candidate target direction adalah data yang dapat ditautkan ke sumber, identifier, konteks bisnis, periode/waktu, versi, transformasi, decision context, evidence, penggunaan analitik, dan publikasi. Outcome ini tidak menyatakan target telah implemented atau Verified.

## 9. Scope dan Boundary

ARCH-DATA-001 menetapkan arah dan boundary enterprise. Ia tidak memilih database, teknologi, vendor, kontrak integrasi, struktur tabel, data domain resmi, atau pola ID instance. Detail menjadi ruang artefak berurutan yang dimandatkan Roadmap.

## 10. Stakeholder dan Actor Categories

Kategori konseptual meliputi business consumer, data producer, data consumer, source authority, data owner, steward, custodian, metadata steward, verifier, control owner, security/privacy authority, publication authority, system administrator, analyst, dan AI consumer. Tidak ada manusia atau unit yang ditetapkan.

## 11. Data and Knowledge Principles

1. One Data, Many Publications.
2. Traceability by link, not duplication.
3. Authoritative source dipisahkan dari copy, view, cache, export, dan publication.
4. Identifier stabil dan traceable; period, version, effective date, valid time, dan transaction time dipisahkan.
5. Data state bukan approval, verification, compliance, atau Gate disposition.
6. Metadata dan lineage adalah bagian kontrol arsitektur.
7. Data quality harus didefinisikan dan diuji oleh artefak berwenang.
8. Least privilege, separation of duties, privacy, classification, retention, dan security by design.
9. Human decision authority dipertahankan; output AI bukan data pemerintah authoritative tanpa validation, provenance, dan acceptance berwenang.
10. Knowledge asset memerlukan source, provenance, version, lifecycle, dan authority context; target bukan implemented state.

## 12. Enterprise Data Conceptual Landscape

Landscape konseptual menghubungkan: policy/regulatory sources → planning → budgeting → execution/control → performance → evaluation/accountability; dengan organizational context, master/reference data, document/publication, evidence/audit, metadata/lineage, dan knowledge/analytics/AI sebagai concern lintas area. Landscape ini bukan Enterprise Data Domain Model Seq 19.

## 13. Candidate Data Subject Areas

| Candidate subject area | Kedudukan |
| --- | --- |
| Policy and regulatory context; planning; budgeting; execution/control; performance; evaluation/accountability | Candidate Target Direction. |
| Organizational context; master/reference data; document/publication; evidence/audit | Candidate Target Direction. |
| Metadata/lineage; knowledge/analytics/AI | Candidate Target Direction. |

Tidak ada formal domain ID, canonical boundary, owner, atau entity/attribute list. Kandidat ini akan difinalkan hanya melalui BP-DATA-001 Seq 19.

## 14. Authoritative Source Concept

Authoritative source adalah status/penetapan yang dibuktikan melalui authority sah, bukan sekadar lokasi teknis data. Regulatory/policy source, authoritative business source, system of record, system of reference, master/reference source, evidence record, analytical derivative, AI recommendation, publication/output, dan archive/retained record adalah kategori yang berbeda. Penetapan source tertentu sebagai authoritative tetap Evidence Pending sampai evidence dan authority tersedia.

## 15. System of Record, System of Reference, dan Publication Source

System of record merekam transaksi/kondisi dalam scope yang sah; system of reference menyediakan nilai acuan terkelola; publication source menyediakan data atau narasi yang siap diterbitkan dari sumber terkelola. Copy, cache, export, dan derivative tidak otomatis menjadi source authoritative. Data origin, custodian, business authority, data owner, steward, approver, verifier, consumer, dan publication authority dipisahkan.

## 16. Data Lifecycle Direction

Arah lifecycle data mencakup creation/capture, use, update, version/history, controlled sharing, publication use, retention/archival context, dan disposal context sebagai concern. Ia tidak menetapkan transition otomatis, retention period, disposal rule, atau workflow approval.

## 17. Data State, Status, dan Decision-State Separation

Data state, document status, review outcome, approval, verification, compliance, evidence status, dan Gate disposition adalah status yang berbeda. Workflow completion bukan approval; reviewer bukan verifier; verification bukan approval; document approval bukan data-domain acceptance; data-domain acceptance bukan disposition G2.

## 18. Identifier and Identity Direction

Identifier target perlu unik dalam scope, stabil, tidak bergantung pada label, traceable ke source, memiliki namespace/context, dan mendukung history/version. Technical primary key, business identifier, regulatory/reference code, document identifier, version identifier, person/user identity, organizational identity, dan external-system identifier dibedakan. Tidak ada pola ID domain aktual yang ditetapkan.

## 19. Temporal, Period, Version, dan Effective-Dating Direction

Planning period, fiscal year, reporting period, version, revision, approval date, effective date, transaction time, dan valid time dibedakan. History tidak boleh otomatis ditimpa. AIR-001 tentang konflik siklus Renstra lima/enam tahun tetap terbuka; keputusan temporal dan ADR-0001 tetap Seq 21 serta Evidence Pending. Dokumen ini tidak memilih siklus atau membuat schema temporal.

## 20. Master and Reference Data Direction

Master data, reference data, transactional/operational data, planning/budgeting data, performance/realization data, document/record, metadata, evidence, knowledge asset, dan analytical derivative dibedakan. Tidak ada golden record, source, owner, atau synchronization rule yang ditetapkan. BP-DATA-002 Seq 20 menjadi follow-up yang dimandatkan.

## 21. Metadata and Catalog Direction

Metadata direction mengharuskan data dapat dikaitkan, bila relevan, dengan business meaning, source, identifier, period/time, version, lifecycle, classification context, evidence, and consuming/publication context. ARCH-DATA-001 tidak membuat katalog, owner, atau template record final; kebutuhan itu menuju artefak data berikutnya.

## 22. Data Lineage and Traceability Direction

Lineage target ditelusuri melalui source, identifier, business meaning, period/time, version, transformation, decision/approval context, evidence, consuming process, analytical use, publication, dan provenance. Business traceability, data lineage, document lineage, model lineage, evidence lineage, publication lineage, dan AI provenance dibedakan. Ini bukan Data Lineage Blueprint Seq 22 atau Canonical Traceability Matrix.

## 23. Data Quality Direction

Dimensi konseptual mencakup completeness, validity, consistency, uniqueness, accuracy, timeliness, integrity, traceability, dan authorized accessibility. Dimensi bukan hasil pengujian; rule, metric, threshold, test, acceptance, owner, dan verifier berada pada STD-DATA-001 Seq 23. Istilah `Valid` tidak digunakan sebagai klaim ambigu.

## 24. Data Ownership and Stewardship Boundary

Business owner, data owner, data steward, custodian, metadata steward, source authority, verifier, control owner, security/privacy authority, publication authority, dan system administrator adalah kategori berbeda. Program-level assignment yang belum tersedia menggunakan `To be assigned by Project Owner`; institutional/statutory authority yang belum terbukti menggunakan `To be designated or verified by competent institutional authority — Evidence Pending`. System permission dan database ownership teknis bukan data ownership institusional.

## 25. Data Classification, Privacy, Retention, dan Security Interface

Dokumen ini hanya menetapkan interface/design concern. Tidak ada classification level, personal-data determination, retention period, disposal rule, lawful basis, legal applicability, security control, access matrix, encryption standard, privacy-impact result, atau compliance result. `REG-08` tetap **Under Regulatory Status Verification**; `COMP-007` tetap **Under Applicability Assessment**. Mapping baru tetap Candidate relationship, Evidence Pending, dan belum Verified.

## 26. Interoperability and External Data Interface

Documented current integration, candidate integration, manual/file exchange, API availability, API contract, access authority, data-sharing agreement, external authoritative source, synchronization, reconciliation, dan exception handling dibedakan. SIPD atau sistem eksternal tidak diklaim memiliki API, kontrak, akses, atau integrasi aktif tanpa evidence. ARCH-DATA-001 tidak membuat Integration Architecture.

## 27. Knowledge Architecture Direction

Knowledge direction membedakan source document, structured data, metadata, evidence, knowledge asset, glossary term, ontology/taxonomy, analytical result, AI recommendation, decision, dan publication. Source, provenance, version, lifecycle, dan authority context diperlukan bagi knowledge asset. Detail Enterprise Knowledge Model, ontology, dan taxonomy berada pada Seq 26–27.

## 28. Analytics and AI Data Interface

Analytics derivative tidak menimpa source data. AI bukan decision authority; output AI bukan authoritative fact tanpa source, provenance, validation, dan acceptance berwenang. Arah ini tidak memilih model/provider, prompt, data access, atau implementasi AI.

## 29. One Data, Many Publications Interface

Publication menggunakan data/narasi resmi yang sama melalui sumber terkelola, tanpa mengubah makna, angka, status, version, atau lineage. Prinsip ini bukan satu tabel tunggal dan bukan izin publikasi otomatis; publication authority dan document approval tetap terpisah.

## 30. Current-to-Target Transition Themes

| Tema | Current evidence/gap | Candidate target direction | Follow-up | Evidence status |
| --- | --- | --- | --- | --- |
| Source-of-truth clarification | Baseline teknis tidak menetapkan authority institusional. | Pisahkan source, copy, view, cache, export, dan publication. | BP-DATA-001/002, GOV-DATA-001. | Evidence Pending. |
| Identifier dan temporal | `periode_id` didokumentasikan; konflik 5/6 tahun tercatat. | Identifier stabil dan temporal/version separation. | BP-DATA-001, ADR-0001. | Evidence Pending. |
| Metadata, catalog, lineage | Kebutuhan traceability dicatat G1/Charter. | Metadata dan lineage terkendali. | BP-DATA-003, GOV-DATA-001. | Evidence Pending. |
| Master/reference dan quality | Kode/nomenklatur dan quality concern tersedia sebagai context. | Controlled reference dan quality rule yang berwenang. | BP-DATA-002, STD-DATA-001. | Evidence Pending. |
| Ownership/interoperability | Assignment/kontrak/integrasi belum terbukti lengkap. | Boundary authority dan interface terkendali. | GOV-DATA-001; arsitektur lanjutan. | Evidence Pending. |
| Privacy/security/knowledge/publishing | Concern dicatat Charter dan register; outcome belum diverifikasi. | Provenance, controlled use, dan publication consistency. | STD-DATA-002, BP-DATA-004/005, GOV-AI-001. | Evidence Pending. |

Tidak ada tanggal, biaya, tim, SLA, maupun implementation sequence baru yang ditetapkan.

## 31. Hubungan dengan G1 Deliverables

ARCH-BUS-001 menyediakan parent/business context. BP-BUS-001 menyediakan capability context; BP-BUS-002 value-stream context; BP-BUS-003 document-lifecycle interface; BP-BUS-004 role/authority boundary; REF-BUS-001 vocabulary; BP-BUS-005 regulatory/requirement status; dan STD-BUS-001 modeling/traceability interface. Semua dipakai sebagai dependency kelompok G1 atau supporting context sesuai §3, tanpa mengubah statusnya.

## 32. Hubungan dengan Domain Arsitektur Berikutnya

ARCH-DATA-001 adalah parent/context bagi Seq 19 BP-DATA-001, Seq 20 BP-DATA-002, Seq 21 ADR-0001, Seq 22 BP-DATA-003, Seq 23 STD-DATA-001, Seq 24 GOV-DATA-001, Seq 25 STD-DATA-002, Seq 26 BP-DATA-004, Seq 27 BP-DATA-005, dan Seq 28 GOV-AI-001. Tidak satu pun artefak tersebut dibuat, READY, atau DONE oleh dokumen ini.

## 33. Issue, Risk, Compliance, ADR, dan Change Interfaces

Gap/contradiction dirujuk ke [Architecture Issue Register](../00-governance/03-Architecture-Issue-Register.md); uncertainty ke [Architecture Risk Register](../00-governance/04-Architecture-Risk-Register.md); requirement/control/evidence/exception ke [Compliance Register](../00-governance/05-Compliance-Register.md); material decision ke ADR; dan perubahan lintas artefak ke Enterprise Change Log. AIR/ARISK adalah context, bukan dependency normatif otomatis. Tidak ada AIR yang ditutup, ARISK diterima, COMP dinyatakan compliant, exception disetujui, ADR-0001 diputuskan, atau Enterprise Change Log diperbarui.

## 34. G2 Evidence Contribution

Dokumen menyediakan struktur evidence untuk Data and Knowledge Foundation: pemisahan current evidence/assessment/target, arah source/identifier/temporal/metadata/lineage/quality, dan boundary authority. Kontribusi ini bukan pernyataan G2 ready, passed, approved, atau memiliki disposition. Review outcome, document approval, evidence status, verification, data-domain acceptance, dan Gate disposition tetap berbeda.

## 35. Assumptions, Constraints, dan Evidence Pending

- Baseline digunakan sebagai evidence dokumenter; tidak diaudit ulang.
- Penetapan data domain, source authoritative, owner, steward, custodian, authority, verifier, dan control owner tetap Evidence Pending kecuali sumber berwenang menyatakan lain.
- AIR-001, ARISK-001, ARISK-007, REG-08, COMP-007, serta mapping terkait mempertahankan status sumbernya.
- Tidak ada legal applicability, privacy determination, compliance, control completion, retention period, SLA, threshold, target angka, atau implementation claim.
- Dependency tetap dua kelompok resmi pada metadata; context tidak menjadi dependency baru.

## 36. Batas Kewenangan AI

AI dapat membantu menyusun arah, menghubungkan source yang diizinkan, dan menandai Evidence Pending. AI tidak dapat menetapkan data domain resmi, data owner, authority, legal applicability, compliance, verifier, control completion, exception approval, ADR decision, implementation, atau Gate disposition.

## 37. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | ChatGPT Work | Disusun | Selesai | 2026-08-04 |
| Chief Enterprise Architect | ChatGPT | Direview, ditetapkan final, dan disahkan berdasarkan standing delegation | Selesai | 2026-08-04 |
| Delegation authority | Project Owner — Fahmi Alhabsi | Standing delegation melalui EA-007 Version 1.1.0 | Tercatat | 2026-08-04 |

## 38. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-04 | Penyusunan awal Enterprise Data Architecture sebagai deliverable EA-018 berdasarkan Master Roadmap Seq 18 serta dependency G1 deliverables dan Official Current State Baseline. | ChatGPT Work | Draft for Review |
| 0.1.0 | 2026-08-04 | Review CEA menetapkan REVISIONS REQUIRED karena Current-State Summary belum mencatat lengkap conflict internal Renstra 5/6 tahun serta mencampurkan current fact dan assessment pada analytics/AI/publikasi dengan sumber assessment data dummy yang tidak tepat. | ChatGPT | Revisions Required |
| 0.2.0 | 2026-08-04 | Koreksi Current-State Summary untuk mencatat lengkap conflict Renstra 5/6 tahun, memisahkan analytics/AI/export capability sebagai Documented Current Fact dari dashboard dummy dan export completeness sebagai Documented Assessment, serta memperbaiki link evidence baseline. | ChatGPT Work | Draft for Review |
| 1.0.0 | 2026-08-04 | Review final PASSED; finalisasi administratif dari Version 0.2.0 menjadi Version 1.0.0 `Approved`, efektif 2026-08-04, sebagai Official Enterprise Data Architecture. Finalisasi tidak mengubah substansi Version 0.2.0 yang telah PASSED; approval tidak menetapkan implementasi, data domain resmi, source authority, identifier design, keputusan temporal, metadata/lineage/quality implementation, ownership/stewardship, classification/privacy/security, interoperability, knowledge/AI implementation, legal applicability, compliance, verification, data-domain acceptance, atau disposition G1/G2. | ChatGPT | Approved |

## 39. Traceability Dokumen

| Source | Relationship | Target | Kedudukan |
| --- | --- | --- | --- |
| ARCH-DATA-001 | DEPENDS_ON | G1 deliverables | Documented Current berdasarkan Master Roadmap; dependency kelompok. |
| ARCH-DATA-001 | DEPENDS_ON | Official Current State Baseline | Documented Current berdasarkan Master Roadmap; dependency kelompok. |
| ARCH-DATA-001 | CONFORMS_TO | GOV-REP-001 — Repository Structure | Documented Current. |
| ARCH-DATA-001 | CONFORMS_TO | GOV-EA-005 — Architecture Review and Gate Standard | Documented Current. |
| ARCH-DATA-001 | CONFORMS_TO | GOV-EA-006 — Traceability Standard | Documented Current. |

Tabel ini bukan Canonical Traceability Matrix. Tidak ada `DERIVED_FROM` dicatat karena belum ada target tunggal yang semantics-nya cukup untuk menyatakan ARCH-DATA-001 diturunkan darinya. Tidak ada record yang menetapkan authority, legal applicability, compliance, verification, implementation, atau disposition G1/G2.

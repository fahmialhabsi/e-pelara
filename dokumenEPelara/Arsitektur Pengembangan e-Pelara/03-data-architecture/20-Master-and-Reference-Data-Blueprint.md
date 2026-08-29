---
document_id: BP-DATA-002
title: Master and Reference Data Blueprint
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
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; tanpa disposition
review_outcome: PASSED
intended_repository_path: 03-data-architecture/20-Master-and-Reference-Data-Blueprint.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# 20 — Master and Reference Data Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **Official Master and Reference Data Blueprint** (BP-DATA-002), Approved Architecture Blueprint yang mengatur candidate direction untuk master data dan reference data di tingkat enterprise pemerintahan e-PeLARA Next Generation.

Dokumen menerjemahkan kebutuhan dari `DD-MST-001` (Master and Reference Data domain) yang tercatat pada **BP-DATA-001 — Enterprise Data Domain Model, Version 1.0.0, Approved, Official Enterprise Data Domain Model**, menjadi proposed categories, lifecycle, boundary, control concern, dan design direction pada tingkat konseptual/logis enterprise. BP-DATA-001 telah menyelesaikan final substantive re-review CEA dengan review outcome PASSED dan efektif sejak 5 Agustus 2026; BP-DATA-001 menjadi **normative domain-model dependency** bagi BP-DATA-002 karena BP-DATA-002 menerjemahkan DD-MST-001 dan hubungannya dengan 13 enterprise data domains yang telah disahkan.

BP-DATA-002 Version 1.0.0 telah menyelesaikan substantive self-review oleh Claude Work bertindak sebagai Acting Chief Enterprise Architect di bawah mandat terpadu HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan review outcome **PASSED**, dan berlaku efektif sejak **5 Agustus 2026**. Approval ini menetapkan category landscape, category-boundary matrix, candidate lifecycle concerns, dan design direction master/reference data sebagai baseline arsitektur resmi, sebagaimana seluruh finding substantive review EA-020 (AR-EA020-001 sampai AR-EA020-009) telah diselesaikan pada corrective revision Version 0.2.0 dan diverifikasi ulang pada finalisasi ini.

Label **Candidate Target Direction** dan **Evidence Pending** yang masih digunakan dalam isi dokumen ini merupakan klasifikasi evidence atau arah implementasi lanjutan bagi setiap category, lifecycle concern, relationship, atau design concern tertentu — bukan tanda bahwa approval BP-DATA-002 secara keseluruhan masih pending. Approval BP-DATA-002 **tidak berarti** implementasi telah dilakukan; label tersebut tetap relevan untuk membedakan area yang memerlukan follow-up artifact, governance formal, atau evidence tambahan.

Dokumen **bukan**:
- Master data governance operasional dan policy final.
- Daftar master/reference data resmi atau authoritative source assignment.
- Source of truth, system of record, atau system of reference final.
- Identifier scheme resmi atau code set.
- Data model logical/physical, schema database, atau teknologi.
- Implementation specification atau SLA.
- Legal applicability, privacy determination, compliance result, atau compliance verification.
- G2 disposition atau Gate approval.

Kedudukan dokumen ini tidak menetapkan ownership aktual, stewardship, authority institusional, source priority, merge policy, atau keputusan substantif lainnya yang memerlukan verifier sah atau otoritas external.

## 2. Ruang Lingkup

Dokumen menetapkan proposed enterprise-level framework untuk master dan reference data mencakup:

1. Definisi dan pemisahan kategori data (master, reference, transactional, planning, performance, document, metadata, evidence, knowledge, analytical derivative).
2. Candidate lifecycle concern bagi master/reference data (proposal, validation, authorization, versioning, publication, consumption, supersession, archival) — sebagai kumpulan concern konseptual, bukan mandatory workflow.
3. Boundary konseptual antara source authority, system of record, system of reference, working copy, cache, export, publication, derivative, dan archive.
4. Candidate design concern: identifier, namespace, hierarchy, effective dating, versioning, supersession, crosswalk, distribution, synchronization, reconciliation, consumption, lineage, provenance — sebagai concern semantik, bukan mekanisme teknis.
5. Candidate category pada tingkat enterprise (organisasi, role, period, planning object, geography, measurement, document type, status/lifecycle vocabulary, classification, regulatory source, evidence vocabulary, external identity), dengan category-boundary matrix yang mencegah overlap terhadap domain lain.
6. Hubungan dengan 13 enterprise data domains dari BP-DATA-001 tanpa mengubahnya.
7. Interface konseptual menuju Seq 21–28 sebagai context only.
8. Evidence Pending table untuk keputusan, assignment, authority, dan evidence yang belum tersedia.

Dokumen tidak membuat implementasi detail, keputusan temporal, metadata/lineage/quality rule, ownership assignment, atau teknologi.

## 3. Dependency dan Sumber

| Sumber | Peran | Status Pembacaan |
| --- | --- | --- |
| [ARCH-DATA-001](18-Enterprise-Data-Architecture.md) — Enterprise Data Architecture | Normative parent; Version 1.0.0, Approved, effective 2026-08-04, review PASSED. Candidate direction dan arah master/reference data. | Dibaca langsung |
| [BP-DATA-001](19-Enterprise-Data-Domain-Model.md) — Enterprise Data Domain Model | Normative domain-model dependency; Version 1.0.0, Approved, Official Enterprise Data Domain Model, effective 2026-08-05, review PASSED. 13 enterprise data domains dan DD-MST-001 terkait. | Dibaca langsung sebagai normative dependency |
| [Repository Structure](../00-governance/01-Repository-Structure.md) — GOV-REP-001 | Klasifikasi, metadata, versioning, penamaan, link. Version 1.0.0, Approved. | Dibaca sebagian |
| [Architecture Review and Gate Standard](../00-governance/08-Architecture-Review-and-Gate-Standard.md) — GOV-EA-005 | Review outcome, evidence, authority, Gate boundary. Version 1.0.0, Approved. | Dibaca sebagian |
| [Traceability Standard](../00-governance/09-Traceability-Standard.md) — GOV-EA-006 | Identifier, relationship, evidence, versioning, supersession. Version 1.0.0, Approved. | Dibaca penuh |
| [Business Glossary](../03-data-architecture/business-glossary/15-Business-Glossary.md) — REF-BUS-001 | Vocabulary kanonis bisnis yang relevan. Version 1.0.0, Approved. | Dibaca sebagian |
| [Enterprise Change Log](../00-governance/06-Change-Log.md) — GOV-EA-003 | Version 1.0.14, Approved; memuat ECHG-027 (finalisasi BP-DATA-001). Dirujuk sebagai context; tidak diubah oleh corrective revision ini. | Dibaca sebagian |

Master Roadmap tidak wajib dibaca ulang pada corrective revision ini; state Seq 20 telah divalidasi melalui metadata dan sumber resmi di atas. Governance, register, roadmap lainnya digunakan sebagai link dan context, bukan dependency tambahan.

## 4. Evidence Method

Dokumen menggunakan kerangka kerja evidence berikut:

| Status Evidence | Penggunaan |
| --- | --- |
| Documented Current Fact | Hanya fakta current-state yang secara eksplisit dicatat ARCH-DATA-001 dari Official Current State Baseline. Tidak termasuk candidate direction atau arah target. |
| Documented Assessment | Assessment atau gap yang telah dicatat ARCH-DATA-001. Dokumen tidak mengubahnya menjadi verified fact. |
| Approved Architecture Direction | Arah dan prinsip yang telah ditetapkan sebagai baseline resmi melalui ARCH-DATA-001 Version 1.0.0 Approved atau BP-DATA-001 Version 1.0.0 Approved; bukan implementation completion. |
| Candidate Target Direction | Proposed category, lifecycle, boundary, relationship, design concern yang diturunkan dari ARCH-DATA-001/BP-DATA-001 context, belum diimplementasikan atau diverifikasi. |
| Evidence Pending | Informasi tanpa evidence cukup atau verifier sah; keputusan, assignment, authority, implementation, atau verification yang belum tersedia. |

Pemisahan evidence harus jelas pada setiap klaim. Dokumen tidak membaca atau mengaudit ulang Official Current State Baseline secara langsung. Documented Current Fact hanya dirujuk melalui ARCH-DATA-001 yang Approved.

## 5. Istilah dan Definisi Kerja

| Istilah | Definisi pada konteks ini |
| --- | --- |
| **Master data** | Data yang mendefinisikan entity, dimensi, atau reference stabil yang digunakan lintas proses operasional; ownership, stewardship, dan governance adalah candidate concern (Evidence Pending: assignment dan rule). |
| **Reference data** | Data nilai terkelola (code set, nomenklatur, klasifikasi, struktur hirarki) yang dipakai sebagai standard untuk operasi dan pelaporan. |
| **Authoritative source** | Penentuan oleh authority sah bukan sekadar lokasi teknis; berbeda dari system of record, system of reference, atau working copy. |
| **System of record** | Candidate record-keeping role untuk data tertentu dalam scope domain; record-keeping role adalah distinct dari institutional authority, source authority, atau data ownership (Evidence Pending: assignment). |
| **System of reference** | System yang menyediakan nilai-nilai reference managed yang konsisten bagi consumption; tidak sama dengan authoritative source untuk transaction. |
| **Candidate direction** | Proposed design, boundary, lifecycle, atau concern yang belum Accepted, Approved, atau implemented. |

## 6. Prinsip Candidate Master dan Reference Data

1. **Source Traceability**: Setiap fakta, identity, atau reference value perlu dapat ditelusuri ke source context, version, dan authority evidence yang relevan. Penetapan authoritative source, golden record, system of record, atau system of reference final tetap Evidence Pending.
2. **Traceability by Link, Not Duplication**: Master/reference data direferensikan, bukan diduplikasi; linkage dan lineage dapat ditelusuri.
3. **Controlled Consumption**: Consumer mengkonsumsi master/reference melalui interface terkendali sebagai conceptual boundary; mekanisme teknis (copy, cache, export) tetap Evidence Pending dan bukan bagian dari blueprint ini.
4. **Version and Effective-Dating Separation**: Setiap versi master/reference memiliki effective date, valid period, supersession context concern yang dapat dipisahkan.
5. **Namespace and Scope Separation**: Identifier master/reference unik dalam namespace yang didefinisikan; scope reconciliation concern tetap design consideration.
6. **Governance and Technical Separation**: Data governance (ownership, stewardship, approval) adalah concern yang berbeda dari technical custody (system administration, database operation).
7. **Evidence-Based Design**: Setiap design concern dan lifecycle didukung oleh evidence dari charter, business architecture, atau documented context dari approved source.
8. **Lifecycle Transparency**: Master/reference data memiliki candidate lifecycle concerns (proposal, validation, authorization, active-use, supersession, archival), bukan mandatory workflow sequence.

## 7. Candidate Enterprise Category Landscape dan Category-Boundary Matrix

Candidate master dan reference data pada tingkat enterprise dikelompokkan dalam kategori berikut (tanpa membuat record aktual):

### Organisasi dan Konteks Institusional

- **Organization and Organizational Unit** — Struktur organisasi, unit, departemen, cabang; hierarki, lokasi, fungsi; effective period dan organizational change.
- **Role and Authority Context** — Role operasional, role approval, authority boundary, decision scope, delegation context; effective period dan supersession.
- **Person and Party Identity** — Person identity, organization identity, external-party identity; relationship dan lifecycle.

### Perencanaan dan Waktu

- **Planning and Reporting Period** — Planning period (RPJMD, Renstra, annual), fiscal year, reporting period, calendar; effective date dan period closure.
- **Government Planning Object** — Pada tingkat reference: controlled nomenclature/classification untuk program, kegiatan, subkegiatan, period type; hierarki dan relationship across planning level.
- **Measurement Unit and Scale** — Unit of measurement, scale, aggregation rule; standard dan non-standard units.

### Klasifikasi dan Kategorisasi

- **Geography and Administrative Area** — Administrative boundary, region, district, sub-district, kelurahan; hierarchical relationship dan effective period.
- **Document and Publication Type** — Government document type, publication format type, output type; classification untuk publishing dan archive.
- **Status and Lifecycle Vocabulary** — Standard status vocabulary (approval status, document status, workflow status, realization status); meaning dan valid usage context.
- **Classification and Categorization Scheme** — Classification scheme (cost classification, budget type, expenditure type, activity type, indicator type); hierarchy dan effective period.

### Regulasi dan Governance

- **Regulatory and Policy Source Identity** — Identifier dan reference context bagi regulatory/policy source; reference number dan effective period.
- **Evidence and Control Vocabulary** — Controlled vocabulary untuk evidence/control type, risk category, audit finding category.
- **External Source and Interoperability Identity** — External identifier dan correspondence context; crosswalk dan mapping rule context.

Semua category di atas adalah **Candidate Target Direction** dan **Evidence Pending**. Tidak ada daftar value, nomenclature resmi, atau ownership yang ditetapkan dalam dokumen ini.

### Category-Boundary Matrix

Tabel berikut membedakan inclusion BP-DATA-002 dari exclusion yang tetap menjadi domain boundary domain lain, untuk mencegah overlap lintas-domain:

| Category concern | Inclusion | Exclusion/domain boundary | Evidence status |
| --- | --- | --- | --- |
| Organization identity | Organization/unit identity, code, hierarchy reference context | Authority/delegation rule tetap DD-ORG-001 dan GOV-DATA-001 | Candidate Target Direction; Evidence Pending |
| Person/party identity | Identity-reference context | Personal-data determination, access authority, dan privacy decision tetap STD-DATA-002/GOV-DATA-001 | Candidate Target Direction; Evidence Pending |
| Planning reference | Controlled nomenclature/classification untuk program, kegiatan, subkegiatan, period type | Plan instance, target, pagu, objective, realization tetap DD-PLN/DD-OPR/DD-BDG/DD-PRF | Candidate Target Direction; Evidence Pending |
| Regulatory-source identity | Identifier dan reference context bagi regulatory/policy source | Legal interpretation, applicability, requirement, dan compliance tetap DD-POL/Compliance Register | Candidate Target Direction; Evidence Pending |
| Evidence/control vocabulary | Controlled vocabulary untuk evidence/control type | Evidence instance, audit record, verification, dan compliance record tetap DD-EVD-001 | Candidate Target Direction; Evidence Pending |
| External identity/crosswalk | External identifier dan correspondence context | Integration mechanism, API/contract, synchronization protocol, dan source authority assignment berada di luar BP-DATA-002 | Candidate Target Direction; Evidence Pending |

Category-boundary matrix ini menegaskan bahwa BP-DATA-002 tidak memperlakukan seluruh planning objects sebagai reference data (plan instance/target/pagu/realization tetap domain masing-masing), tidak memindahkan authority/delegation rule ke master data, tidak memindahkan evidence instance ke reference data, tidak memindahkan compliance requirement atau legal interpretation ke master/reference data, dan tidak menetapkan person data sebagai aman/nonpersonal.

## 8. Hubungan dengan 13 Enterprise Data Domains

Dari BP-DATA-001 (Version 1.0.0, Approved), 13 enterprise data domains memiliki relationship konseptual dengan master dan reference data context. Relationship berikut tetap **Candidate Relationship** dan **Evidence Pending** meskipun domain itu sendiri telah Approved:

| Domain ID | Domain Name | Relationship dengan Master/Reference Data | Konsern |
| --- | --- | --- | --- |
| DD-MST-001 | Master and Reference Data | Provides candidate master/reference context. | Source, versioning, supersession, distribution. |
| DD-POL-001 | Policy and Regulatory Context | References candidate regulatory/policy source context. | Authority boundary, compliance context tetap DD-POL-001/Compliance Register. |
| DD-PLN-001 | Strategic Planning and Development | Consumes candidate planning-period master dan planning object reference context. | Effective dating, hierarchy, validation; plan instance tetap DD-PLN-001. |
| DD-OPR-001 | Operational Planning | Consumes candidate operational period dan activity reference context. | Effective dating, hierarchy, validation; plan instance tetap DD-OPR-001. |
| DD-BDG-001 | Budgeting and Financial Planning | Consumes candidate budget-type dan cost-classification reference context. | Consistency concern, traceability; budget instance tetap DD-BDG-001. |
| DD-EXE-001 | Execution and Administrative Control | Consumes candidate activity reference dan status vocabulary context. | Lookup consistency, versioning concern. |
| DD-PRF-001 | Performance and Realization | Consumes candidate indicator-type reference dan measurement-unit reference context. | Consistency concern; realization instance tetap DD-PRF-001. |
| DD-EVL-001 | Monitoring, Evaluation, and Accountability | Consumes candidate status vocabulary dan evidence-type reference context. | Standard meaning, traceability. |
| DD-ORG-001 | Organization, Party, Role, and Authority Context | Provides candidate organization, role, person-identity reference context. | Authority boundary, delegation, lifecycle tetap DD-ORG-001. |
| DD-DOC-001 | Document, Record, and Publication | Consumes candidate document-type dan publication-type reference context. | Format standard, lifecycle concern. |
| DD-EVD-001 | Evidence, Approval, and Audit | References candidate evidence-type vocabulary context untuk traceability concern. | Evidence instance, audit record, verification tetap DD-EVD-001. |
| DD-MDL-001 | Metadata, Lineage, and Provenance | Provides candidate metadata context concerning master/reference: version, effective date, lineage. | Traceability, version concern. |
| DD-KNO-001 | Knowledge, Analytics, and AI Derivatives | Consumes candidate master/reference untuk knowledge context; may provide derivative insight context. | Provenance, lineage. |

Relationship di atas adalah **Candidate relationship** dan **Evidence Pending**. Tidak ada domain yang "menjadi owner" atau "menjadi primary" atas master/reference. Tidak ada cardinality database, technical foreign key, atau integration rule yang ditetapkan. Setiap domain tetap independent, dengan boundary domain masing-masing dipertahankan sesuai category-boundary matrix §7.

## 9. Master Data dan Reference Data Separation

### Master Data Characteristics

Master data mewakili entity atau dimensi bisnis yang stabil dan fundamental. Candidate governance concern mencakup:

- **Ownership Context**: Business owner atau steward; assignment tetap Evidence Pending: `To be assigned by Project Owner — Evidence Pending`.
- **Lifecycle**: Candidate lifecycle concerns — proposal, validation, authorization, active-use, supersession, archival — sebagai kumpulan concern, bukan mandatory sequence dengan fixed order.
- **Identifier**: Business identifier unik, stabil, dan traceable ke source context.
- **Versioning**: Setiap version memiliki effective date dan valid-time range concern yang perlu dipisahkan (temporal model decision Accepted di ADR-0001 Seq 21, 2026-08-05; detail schema tetap Evidence Pending).
- **Version Coexistence and Supersession Concern**: Jika distributed, version coexistence dan supersession concern harus dipertimbangkan (Evidence Pending: reconciliation concern; detail BP-DATA-003 Seq 22).
- **Traceability Context**: Change history, effective dating, lineage concern harus traceable sebagai conceptual concern (Evidence Pending: detail BP-DATA-003 Seq 22).

### Reference Data Characteristics

Reference data mewakili nilai-nilai managed yang consistent untuk domain tertentu:

- **Source Traceability**: Source context untuk reference value set; may be external atau internal (Evidence Pending: source designation dan authority).
- **Change Control**: Nilai baru, modifikasi, atau supersession melalui approval formal atau change control sebagai conceptual concern (Evidence Pending: routing GOV-DATA-001 Seq 24).
- **Versioning**: Setiap value set version memiliki effective period dan may supersede prior version.
- **Distribution Concern**: Terkontrol ke consumer sebagai conceptual boundary (Evidence Pending: mekanisme di luar scope BP-DATA-002).
- **Validation Concern**: Consumer memvalidasi terhadap current reference set sebagai conceptual expectation; old version handling concern (Evidence Pending: rule).

### Boundary Guard

Dokumen tidak menetapkan ownership, source authority, change control authority, atau verification untuk master/reference tertentu.

## 10. Candidate Lifecycle Concerns

Master dan reference data memiliki **candidate lifecycle concerns**, yaitu kumpulan concern konseptual yang relevan bagi lifecycle data — bukan mandatory workflow sequence, bukan transition otomatis, bukan fixed order, dan bukan workflow engine, approval sequence, role assignment, atau implementation commitment. Concern berikut disusun berdasarkan tahapan konseptual untuk kemudahan pembacaan, tanpa menyiratkan urutan wajib atau kelengkapan proses:

### Proposal Concern

- **Initiation Concern**: Kebutuhan untuk master/reference baru diidentifikasi sebagai conceptual trigger (Evidence Pending: routing GOV-DATA-001 Seq 24).
- **Justification Concern**: Business case atau regulatory driver sebagai conceptual context.
- **Assessment Concern**: Duplication-risk concern terhadap source yang sudah ada.

### Validation Concern

- **Design Concern**: Identifier, structure, hierarchy, classification scheme sebagai conceptual design concern (Evidence Pending: standar design BP-DATA-003 Seq 22).
- **Source Identification Concern**: Authoritative source identification concern (Evidence Pending: keputusan GOV-DATA-001 Seq 24).
- **Rule Definition Concern**: Validation rule, effective dating, versioning rule sebagai conceptual concern (Evidence Pending: detail STD-DATA-001 Seq 23).
- **Relevant Stakeholder Review Concern**: Relevant stakeholder review concern terhadap proposed category (Evidence Pending: routing GOV-DATA-001 Seq 24).

### Authorization Concern

- **Authorization Concern**: Master/reference authorization sebagai conceptual concern (Evidence Pending: authority GOV-DATA-001 Seq 24).
- **Publication Concern**: Availability-for-consumption sebagai conceptual concern (Evidence Pending: interface di luar scope BP-DATA-002).

### Active-Use Concern

- **Correction Concern**: Value correction dan coverage-extension sebagai conceptual concern (Evidence Pending: responsibility GOV-DATA-001 Seq 24).
- **Update Concern**: Change dilakukan melalui controlled process sebagai conceptual concern (Evidence Pending: routing GOV-DATA-001 Seq 24).
- **Quality and Usage Observation Concern**: Quality dan usage sebagai conceptual observation concern (Evidence Pending: detail STD-DATA-001 Seq 23).

### Version Coexistence and Supersession Concern

- **Supersession Notification Concern**: Old value/version dan new value/version relationship sebagai conceptual concern (Evidence Pending: mekanisme di luar scope BP-DATA-002).
- **Version Coexistence Concern**: Old dan new version coexistence context untuk historical query (Evidence Pending: BP-DATA-003 Seq 22).

### Archival Concern

- **Closure Concern**: Version/value lama closure context sebagai conceptual concern (Evidence Pending: condition STD-DATA-002 Seq 25).
- **Retention Concern**: History retention untuk audit dan historical reference sebagai conceptual concern (Evidence Pending: STD-DATA-002 Seq 25).
- **Disposal Concern**: Disposal sebagai conceptual concern setelah retention (Evidence Pending: authority STD-DATA-002 Seq 25).

Seluruh lifecycle concern di atas adalah **Candidate Target Direction**. Tidak ada timeline, duration, signoff mechanism, notification mechanism, atau operational responsibility yang ditetapkan tanpa evidence.

## 11. Authoritative Source dan Record Boundary

### Source Context Concept

Source context mengidentifikasi candidate lokasi atau domain dari mana fakta, identifier, atau reference value dapat ditelusuri (tanpa menetapkan authority institusional atau designate sistem teknis sebagai "authoritative"):

| Category | Candidate Context | Authority Assignment |
| --- | --- | --- |
| **Regulatory Source** | Regulatory/policy source reference context. | To be designated or verified by competent institutional authority — Evidence Pending |
| **Business Source** | Business process, planning document, operational record context yang menjadi candidate fact source. | To be assigned by Project Owner — Evidence Pending |
| **Master Source** | Master data context yang candidate untuk entity atau dimension tertentu. | To be designated or verified by competent institutional authority — Evidence Pending |
| **Reference Source** | Reference value set context yang candidate untuk classification scheme atau code set. | To be assigned by Project Owner — Evidence Pending |
| **External Source** | External-source reference context. | To be designated or verified by competent institutional authority — Evidence Pending |

### System of Record, System of Reference, dan Publication Context — Conceptual Role Only

Dokumen mengidentifikasi tiga category conceptual role/boundary, tanpa menetapkan consumption pattern, read mechanism, copy mechanism, update mechanism, custodian aktual, atau technical system selection:

| System Category | Candidate Conceptual Role | Boundary |
| --- | --- | --- |
| **System of Record** | Candidate record-keeping role/boundary untuk transaksi atau kondisi dalam domain tertentu. | Bukan source authority, institutional data owner, approver, atau verifier; bukan penetapan technical system. |
| **System of Reference** | Candidate reference-holding role/boundary untuk value set managed atau classification concern. | Bukan source authority, governance owner, atau verifier; bukan penetapan technical system. |
| **Publication Context** | Candidate publication role/boundary untuk narasi resmi atau summary dari data. | Publication responsibility conceptual; bukan data ownership atau authority; bukan penetapan mekanisme distribusi. |

Ketiganya adalah **Candidate Target Direction**. Actual institutional authority assignment, system selection, source designation, approval responsibility, dan verification authority adalah **Evidence Pending** dan linked ke GOV-DATA-001 Seq 24. Temporal model decision terkait telah Accepted pada ADR-0001 Seq 21 (2026-08-05); aturan pemicu detail tetap Evidence Pending.

## 12. Candidate Identifier Direction — Semantic Concerns Only

Identifier master/reference data memiliki candidate design concern berikut, terbatas pada semantic concerns: scope, uniqueness concern, stability concern, namespace/context, version/supersession, dan traceability. Dokumen ini tidak menetapkan format, prefix/suffix, human-readable requirement, collision rule, physical key, atau official scheme.

| Identifier Type | Scope | Uniqueness Concern | Stability Concern | Namespace/Context | Version/Supersession Concern | Traceability Concern |
| --- | --- | --- | --- | --- | --- | --- |
| **Business Identifier** | Master/reference scope tertentu. | Unique dalam scope concern. | Stability concern; change tracked. | Namespace context yang dapat include organizational context. | Supersession concern per scope. | Traceable ke source context. |
| **Regulatory/Reference Code** | Regulatory atau reference set scope. | Uniqueness concern per regulation/scheme. | Stability concern per regulation. | Namespace context ditetapkan oleh authority (Evidence Pending). | Version concern per regulation cycle. | Traceable ke regulatory source. |
| **Crosswalk Identifier** | Correspondence context antara source contexts. | Candidate uniqueness concern per mapping context. | Candidate stability concern per mapping version. | Candidate namespace context. | Candidate version concern per mapping cycle. | Supports conceptual reconciliation concern. |

Design concern di atas adalah **Candidate Target Direction** dan **Evidence Pending**. Identifier format, implementation property, physical/logical structure, namespace definition, collision-handling rule, dan version rule tidak ditetapkan; detail berada di BP-DATA-003 Seq 22.

## 13. Hierarchy dan Relationship Direction

Master/reference data boleh memiliki hierarchical relationship atau network relationship sebagai conceptual concern (Evidence Pending: design pattern BP-DATA-003 Seq 22).

### Hierarchical Relationship

Contoh candidate hierarchy (tanpa data aktual, tanpa cardinality atau aggregation function):

- **Organization Hierarchy**: Parent-child relationship concern; effective dating concern (Evidence Pending: rule; authority/delegation rule tetap DD-ORG-001 sesuai category-boundary matrix §7).
- **Planning Object Hierarchy**: Visi → Misi → Tujuan → Sasaran → Program → Kegiatan → Subkegiatan sebagai controlled nomenclature reference context (Evidence Pending: versioning across level; plan instance tetap domain masing-masing).
- **Geography Hierarchy**: Country → Province → District → Sub-district → Kelurahan (Evidence Pending: boundary change handling).
- **Classification Hierarchy**: Top-level → Category → Sub-category → Detail (Evidence Pending: depth dan flexibility concern).

### Network Relationship

Contoh candidate relationship (tanpa implementation, tanpa cardinality atau aggregation function):

- **Crosswalk**: Relationship-correspondence concern antara two classification schemes (Evidence Pending: versioning concern).
- **Reference**: Master data reference ke reference data sebagai conceptual concern (Evidence Pending: validation concern).
- **Rollup**: Summary-level relationship concern dari detail context (Evidence Pending: exception concern; detail teknis berada di luar scope BP-DATA-002).

Hierarchy dan relationship design di atas adalah **Candidate Target Direction** dan **Evidence Pending** sampai detailed mapping dibuat dan diverifikasi.

## 14. Effective Dating dan Versioning

Master/reference data memiliki candidate concern tentang effective dating dan versioning (tanpa menetapkan temporal schema atau temporal classification):

### Effective Dating Concern

- **Effective Date**: Date context ketika value atau entity berlaku atau valid (Evidence Pending: semantics dan handling).
- **Expiration Date**: Date context ketika value atau entity tidak lagi berlaku (Evidence Pending: handling null atau open-ended).
- **Supersession Context**: Concept bahwa value lama dapat digantikan oleh value baru (Evidence Pending: co-existence rule untuk historical query).
- **Period Context**: Time range concern yang mengikat value atau entity pada periode specific (Evidence Pending: scope definition).

### Versioning Concern

- **Version Identifier**: Identifier untuk version iteration sebagai semantic concern (Evidence Pending: numbering scheme di luar scope BP-DATA-002).
- **Change Record Concern**: Context tentang perubahan, reason, effective date per version (Evidence Pending: capture requirement BP-DATA-003 Seq 22).
- **Compatibility Concern**: Old version consumption capability concern (Evidence Pending: support duration).
- **Version Transition Concern**: Period context ketika old dan new version dapat co-exist (Evidence Pending: transition handling concern).

Effective dating dan versioning di atas adalah **Candidate Target Direction**. Temporal model decision (5 vs 6 tahun Renstra) telah Accepted pada ADR-0001 Seq 21 (2026-08-05, Opsi C — Hybrid). Temporal design pattern, schema selection (temporal models), dan detail implementasi tetap **Evidence Pending** dan dirutekan ke BP-DATA-003/GOV-DATA-001.

## 15. Crosswalk dan Mapping Direction

Master/reference data dari sources berbeda (internal, regulatory, external) memerlukan crosswalk dan mapping sebagai conceptual concern (tanpa implementasi, tanpa merge algorithm):

### Crosswalk Concern

- **Mapping Context**: Relationship correspondence concern antara source contexts — Evidence Pending.
- **Validation Concern**: Mapping validation sebagai conceptual concern.
- **Exception Concern**: Unmapped atau ambiguous mapping concern; escalation concern (Evidence Pending: rule GOV-DATA-001 Seq 24).

### Source Reconciliation Concern

- **Source-Priority Concern**: Urutan authoritative apabila multiple source available (Evidence Pending: defined how, di luar scope BP-DATA-002).
- **Conflict/Source-Priority Exception Concern**: Concern ketika source berbeda pada value yang sama (Evidence Pending: rule dan authority GOV-DATA-001 Seq 24).

Crosswalk dan mapping di atas adalah **Candidate Target Direction** dan **Evidence Pending** sampai reconciliation concern defined dan diverifikasi. Detail mekanisme dan merge logic tetap berada di luar scope BP-DATA-002.

## 16. Distribution dan Publication Direction

Master/reference data dapat didistribusikan ke consumer melalui interface terkontrol sebagai conceptual concern (tanpa menetapkan teknologi, mekanisme, timing, cadence, protocol, atau contract):

### Distribution Concern

- **Consumption Concern**: Consumer consumption context sebagai conceptual boundary (Evidence Pending: mekanisme di luar scope BP-DATA-002).
- **Copy-Distribution Concern**: Managed-copy distribution concern (Evidence Pending: reconciliation concern BP-DATA-003 Seq 22).
- **Publication Context Concern**: Availability dalam publikasi resmi atau summary sebagai conceptual concern (Evidence Pending: approval gate di luar scope BP-DATA-002).

### Consumption Boundary Concern

- **Read-Only Principle Concern**: Consumer conceptual boundary sebagai non-modifying party (Evidence Pending: enforcement di luar scope BP-DATA-002).
- **Scope Boundary Concern**: Authorized-scope conceptual boundary (Evidence Pending: rule GOV-DATA-001 Seq 24).
- **Transformation Concern**: Master/reference transformation-for-consumption concern (Evidence Pending: rule dan lineage BP-DATA-003 Seq 22).

Distribution dan publication di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai concrete mechanism detail; mekanisme, timing, cadence, protocol, contract, direct access, filtering model, atau SLA berada di luar scope BP-DATA-002.

## 17. Synchronization dan Reconciliation Concern

Apabila master/reference didistribusikan atau memiliki copy di consumer, version coexistence dan reconciliation adalah candidate concern (tanpa implementasi, tanpa protocol, timing, atau cadence):

### Version Coexistence Concern

- **Update-Propagation Concern**: Conceptual concern mengenai bagaimana change di source dapat dikomunikasikan ke copy atau consumer (Evidence Pending: mechanism dan timing di luar scope BP-DATA-002).
- **Divergence Concern**: Source-copy divergence sebagai conceptual concern (Evidence Pending: per domain atau category).

### Reconciliation Concern

- **Consistency Concern**: Conceptual concern bahwa copy atau consumer state tetap consistent dengan source context (Evidence Pending: method di luar scope BP-DATA-002).
- **Mismatch-Resolution Concern**: Discovery dan correction concern ketika consumer state diverge dari source (Evidence Pending: rule dan resolution authority).
- **Exception Concern**: Scenario ketika reconciliation tidak mungkin; escalation-path concern (Evidence Pending: escalation routing GOV-DATA-001 Seq 24).

Synchronization dan reconciliation di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai concrete rule dan mechanism; protokol, timing, dan cadence berada di luar scope BP-DATA-002.

## 18. Consumption Boundary

Consumer dari master/reference data memiliki consumption boundary sebagai conceptual concern (tanpa menetapkan enforcement, filtering model, atau access mechanism):

### Conceptual Consumption Context

- **Access Context Concern**: Consumer access-boundary concern terhadap master/reference (Evidence Pending: rule GOV-DATA-001 Seq 24).
- **Reference Context Concern**: Current atau historical reference context concern (Evidence Pending: rule).
- **Modification Boundary Concern**: Consumer bukan pemilik; perubahan tetap memerlukan governance context concern (Evidence Pending: exception process).

### Consumption Purpose Context

- **Reference-Use Concern**: Consumer menggunakan master/reference untuk memahami atau menerapkan context bisnis (Evidence Pending: usage concern).
- **Derivative-Use Concern**: Consumer membentuk insight atau candidate analytics dari reference context (Evidence Pending: lineage dan traceability concern BP-DATA-003 Seq 22).

Consumption boundary di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai governance dan usage concern.

## 19. Candidate Metadata Association Concerns

Master/reference data memiliki candidate metadata association concerns untuk traceability (tanpa menetapkan template, mandatory minimum, capture mechanism, atau carrier implementation):

| Metadata Concern | Conceptual Purpose | Evidence Status |
| --- | --- | --- |
| **Source Origin Concern** | Origin authoritative source dan identifier dalam source. | Candidate Target Direction; Evidence Pending |
| **Version and Effective Date Concern** | Current version identifier dan effective date range. | Candidate Target Direction; Evidence Pending |
| **Last-Updated Concern** | Context tanggal dan actor perubahan terakhir. | Candidate Target Direction; Evidence Pending |
| **Steward/Owner Concern** | Current owner atau steward untuk change/exception. | Evidence Pending — GOV-DATA-001 Seq 24 |
| **Data-Quality Flag Concern** | Known quality issue atau validation exception. | Candidate Target Direction; Evidence Pending |
| **Lineage Concern** | Transformation-chain concern apabila derived dari source. | Evidence Pending — BP-DATA-003 Seq 22 |
| **Retention-Policy Concern** | Retention concern dan archival-date concern. | Evidence Pending — STD-DATA-002 Seq 25 |
| **Classification Concern** | Data classification dan access-restriction concern. | Evidence Pending — STD-DATA-002 Seq 25 |

Metadata concern di atas adalah **Candidate Target Direction** dan **Evidence Pending**. Record type, transaction log, metadata schema, governance register implementation, dan capture mechanism tidak ditetapkan; detail metadata/lineage berada pada BP-DATA-003 Seq 22.

## 20. Data Quality Interface

Master/reference data quality adalah cross-cutting concern (tanpa menetapkan rule):

### Quality Dimension Relevant untuk Master/Reference

- **Completeness**: Semua required attribute hadir.
- **Validity**: Value sesuai allowed set atau format rule.
- **Consistency**: Value sama across systems atau versions untuk entity yang sama.
- **Uniqueness**: Identifier unik dalam scope; no unintended duplicates.
- **Accuracy**: Value mencerminkan reality bisnis atau regulatory requirement.
- **Timeliness**: Value tersedia dalam timeframe yang diperlukan.
- **Traceability**: Value dapat ditelusuri ke source dan change history.

Quality concern di atas adalah **Candidate Target Direction**. Quality rule, metric, test, acceptance criteria, remediation authority adalah **Evidence Pending** dan linked ke STD-DATA-001 Seq 23.

## 21. Ownership, Stewardship, dan Authority Boundary

Master/reference data memiliki ownership dan stewardship boundary (tanpa menetapkan actual assignment). Definisi responsibility di bawah ini tetap **Candidate**; dokumen ini tidak menyatakan Data Owner atau Data Steward aktual sudah accountable, dan tidak menetapkan source authority, custodian, atau verifier.

### Role Distinction

| Role | Responsibility (Candidate) | Authority Status |
| --- | --- | --- |
| **Data Owner** | Candidate business-owner responsibility; accountability untuk accuracy dan completeness tetap Candidate concern. | To be assigned by Project Owner — Evidence Pending |
| **Data Steward** | Candidate quality-maintenance dan governance-compliance responsibility; exception management tetap Candidate concern. | To be assigned by Project Owner — Evidence Pending |
| **Source Authority** | Candidate authoritative-source maintenance dan change-approval responsibility. | To be designated or verified by competent institutional authority — Evidence Pending |
| **Custodian** | Candidate technical custody role; operational care dan maintenance tetap Candidate concern. | To be assigned by Project Owner — Evidence Pending |
| **Verifier** | Candidate independent-verification responsibility untuk critical data. | To be designated or verified by competent institutional authority — Evidence Pending |

Ownership dan stewardship assignment adalah **Evidence Pending** dan linked ke GOV-DATA-001 Seq 24. G2 — Data and Knowledge Foundation memerlukan data owner yang ditetapkan resmi dan data-domain acceptance pada tahap Gate; BP-DATA-002 tidak membuat penetapan tersebut, dan G2 tetap tanpa disposition.

## 22. Classification, Privacy, Retention, dan Governance Interface

Master/reference data classification dan retention adalah candidate governance concern (tanpa menetapkan rule atau decision):

### Classification dan Privacy Concern

- **Data Classification Concern**: Master/reference dapat termasuk dalam governance classification concern (Evidence Pending: classification scheme dan category).
- **Personal Data Context**: Master yang berisi personal identifier adalah candidate subject matter untuk privacy governance (Evidence Pending: scope dan applicable regulation; personal data tidak dinyatakan aman atau nonpersonal oleh dokumen ini).
- **Distribution Concern**: Publication atau distribution governance adalah governance matter (Evidence Pending: per domain atau category).

### Retention dan Governance Interface

- **Record Retention Concern**: Time-period concern untuk how long master/reference version atau historical record tetap retained (Evidence Pending: per domain atau category).
- **Disposal Context**: Procedure concern untuk disposal atau archival setelah retention period atau supersession (Evidence Pending: authority dan rule).
- **Access Control Concern**: Scope concern tentang who dapat access master/reference dan condition (Evidence Pending: governance rule).
- **Security Governance Concern**: Data protection concern (Evidence Pending: security governance rule di luar scope BP-DATA-002).

Classification, privacy, retention, security concern di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai governance standard dan rule. Detail technical (encryption, mechanism, enforcement) tetap Evidence Pending dan linked ke STD-DATA-002 Seq 25 dan GOV-DATA-001 Seq 24.

## 23. Interoperability dan External Source Interface

Master/reference data dari external source memerlukan interoperability candidate concern (tanpa implementasi, teknologi, mekanisme, timing, cadence, protocol, contract, atau service-level selection):

### External Source Interoperability Concern

- **Source Context Concern**: External-source conceptual context untuk category tertentu (Evidence Pending: agreement atau authority designation).
- **Data-Exchange Concern**: Data-exchange conceptual concern antara internal dan external context (Evidence Pending: mechanism dan contract rule di luar scope BP-DATA-002).
- **Identifier-Mapping Concern**: Crosswalk atau mapping concern antara internal dan external identifier atau value set (Evidence Pending: mapping rule).
- **Exception Concern**: Scenario ketika internal dan external diverge atau data tidak dapat direkonsiliasi (Evidence Pending: resolution rule dan escalation).

Interoperability concern di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai concrete rule dan mechanism. Tidak ada technology, mechanism, contract, cadence, timing, atau service-level selection yang ditetapkan; mekanisme integrasi eksternal berada pada Future Integration Architecture di luar scope BP-DATA-002 dan di luar scope ADR-0001 (ADR-0001 Accepted hanya menetapkan temporal model decision, bukan integration mechanism).

## 24. Knowledge, Analytics, AI, dan Publication Interface

Master/reference data dapat dikonsumsi oleh knowledge, analytics, AI, dan publication sebagai conceptual concern (tanpa implementasi, representation, model strategy, provider, prompt, training, atau algorithm):

### Knowledge Interface

- **Master dalam Knowledge Context**: Master entity dan classification conceptual context (Evidence Pending: resolution rule di luar scope BP-DATA-002).
- **Reference dalam Knowledge Context**: Reference value conceptual organization context (Evidence Pending: hierarchy rule).

### Analytics Interface

- **Reference untuk Analysis**: Reference hierarchy conceptual context untuk analytic use (Evidence Pending: analysis rule di luar scope BP-DATA-002).
- **Master untuk Analysis**: Master data conceptual context untuk analytic use (Evidence Pending: analytical design di luar scope BP-DATA-002).

### AI Interface — Provenance, Source Context, dan Human-Authority Boundary

- **Provenance Concern**: Master/reference conceptual context sebagai provenance input bagi AI consumption (Evidence Pending: detail GOV-AI-001 Seq 28).
- **Source-Context Concern**: Master/reference conceptual context sebagai source-context bagi AI output (Evidence Pending: detail GOV-AI-001 Seq 28).
- **Controlled-Consumption Concern**: AI consumption terhadap master/reference tetap controlled-consumption concern (Evidence Pending: rule GOV-AI-001 Seq 28).
- **Human-Authority Boundary**: AI tidak menggantikan human decision authority; AI recommendation bukan authoritative fact tanpa validation dan acceptance berwenang.

### Publication Interface

- **Master dalam Publication**: Master conceptual context untuk publikasi resmi (Evidence Pending: publication authority di luar scope BP-DATA-002).
- **Reference dalam Publication**: Reference data conceptual context untuk publikasi (Evidence Pending: publication governance).

Knowledge, analytics, AI, publication interface di atas adalah **Candidate Target Direction** dan **Evidence Pending** mengenai consumption detail.

## 25. Approved Architecture Source Context

Bagian ini mencatat exact attribution terhadap ARCH-DATA-001 (Version 1.0.0, Approved) sebagai sumber evidence, tanpa mengklaim bahwa seluruh area governance/quality/privacy/retention/integration sudah menjadi Documented Current Fact:

- **ARCH-DATA-001 §20 — Master and Reference Data Direction**: membedakan master data, reference data, transactional/operational data, planning/budgeting data, performance/realization data, document/record, metadata, evidence, knowledge asset, dan analytical derivative; tidak menetapkan golden record, source, owner, atau synchronization rule. BP-DATA-002 Seq 20 adalah follow-up yang dimandatkan oleh §20.
- **ARCH-DATA-001 §23 — Data Quality Direction**: menetapkan quality dimensions (completeness, validity, consistency, uniqueness, accuracy, timeliness, integrity, traceability, authorized accessibility) sebagai conceptual direction; rule, metric, threshold, test, acceptance, owner, dan verifier berada di STD-DATA-001 Seq 23, bukan di ARCH-DATA-001 atau BP-DATA-002.
- **ARCH-DATA-001 §24 — Data Ownership and Stewardship Boundary**: membedakan business owner, data owner, data steward, custodian, metadata steward, source authority, verifier, control owner, security/privacy authority, publication authority, dan system administrator sebagai kategori berbeda, tanpa membuat assignment aktual.
- **ARCH-DATA-001 §25 — Data Classification, Privacy, Retention, dan Security Interface**: mempertahankan classification/privacy/retention/security sebagai interface/design concern saja; tidak ada classification level, personal-data determination, retention period, disposal rule, lawful basis, legal applicability, security control, access matrix, encryption standard yang ditetapkan. `REG-08` tetap **Under Regulatory Status Verification**; `COMP-007` tetap **Under Applicability Assessment**.
- **ARCH-DATA-001 §26 — Interoperability and External Data Interface**: tidak membuktikan adanya external API, contract, access, atau active integration; ARCH-DATA-001 tidak membuat Integration Architecture.
- **ARCH-DATA-001 §30 — Current-to-Target Transition Themes**: mencatat master/reference dan quality sebagai transition-theme context (row "Master/reference dan quality") menuju BP-DATA-002 dan STD-DATA-001, bukan sebagai bukti formal listing kode/nomenklatur atau current governance yang telah established.

Dokumen ini tidak mengklaim sebagai Documented Current Fact: formal kebutuhan kode/nomenklatur per modul secara lengkap; source eksternal pemerintah pusat sebagai integrasi aktif; ataupun governance, quality, privacy, retention, atau integration condition yang tidak disebut secara exact sebagai current fact pada ARCH-DATA-001. Klasifikasi yang digunakan pada seluruh dokumen ini adalah `Approved Architecture Direction`, `Documented Assessment`, `Candidate Target Direction`, atau `Evidence Pending`, sesuai konteks masing-masing klaim.

## 26. Document-Level Traceability Summary using GOV-EA-006 vocabulary

**Penting:** Tabel di bawah ini adalah **Document-Level Traceability Summary**, bukan canonical traceability record, bukan formal minimum traceability record, dan bukan Canonical Traceability Matrix sebagaimana dimaksud GOV-EA-006. Tabel ini tidak mengklaim status `Verified`; owner, complete evidence reference, `verified_by`, dan `verification date` tetap **Evidence Pending** sampai canonical traceability record tersedia melalui governance resmi. Hanya `DEPENDS_ON` dan `GOVERNED_BY` digunakan sebagai formal GOV-EA-006 `relationship_type` pada summary ini. `CONFORMS_TO`, `REFERENCES`, atau `PROVIDES_CONTEXT_TO` tidak digunakan sebagai formal GOV-EA-006 `relationship_type`; metadata `conforms_to` pada front matter dipertahankan sebagai repository metadata (bukan formal GOV-EA-006 relationship record).

### Formal Traceability (DEPENDS_ON dan GOVERNED_BY sahaja)

| Source | Relationship | Target | Target Version | Target Relative Path | Rationale/Boundary |
| --- | --- | --- | --- | --- | --- |
| BP-DATA-002 | `DEPENDS_ON` | ARCH-DATA-001 | 1.0.0 | `03-data-architecture/18-Enterprise-Data-Architecture.md` | Normative parent architecture; BP-DATA-002 tidak berlaku tanpa arah ARCH-DATA-001. |
| BP-DATA-002 | `DEPENDS_ON` | BP-DATA-001 | 1.0.0 | `03-data-architecture/19-Enterprise-Data-Domain-Model.md` | Normative domain-model dependency; BP-DATA-002 menerjemahkan DD-MST-001 dan 13 enterprise data domains yang telah Approved. |
| BP-DATA-002 | `GOVERNED_BY` | GOV-REP-001 | 1.0.0 | `00-governance/01-Repository-Structure.md` | Repository structure, metadata, dan versioning governance. |
| BP-DATA-002 | `GOVERNED_BY` | GOV-EA-005 | 1.0.0 | `00-governance/08-Architecture-Review-and-Gate-Standard.md` | Architecture Review dan Gate governance. |
| BP-DATA-002 | `GOVERNED_BY` | GOV-EA-006 | 1.0.0 | `00-governance/09-Traceability-Standard.md` | Traceability vocabulary dan record governance. |

### Source Reference Table (context; bukan formal GOV-EA-006 relationship)

| Sumber | Target Version | Target Relative Path | Status Pembacaan Aktual |
| --- | --- | --- | --- |
| REF-BUS-001 — Business Glossary | 1.0.0 | `03-data-architecture/business-glossary/15-Business-Glossary.md` | Dibaca sebagian. |
| Enterprise Change Log (GOV-EA-003); mencatat ECHG-027 | 1.0.14 | `00-governance/06-Change-Log.md` | Dibaca sebagian; dirujuk sebagai context, tidak diubah. |
| Master Roadmap | — | `../11-roadmaps/02-Enterprise-Architecture-Roadmap.md` | Tidak dibaca ulang pada corrective revision ini; state Seq 20 divalidasi melalui metadata dan sumber resmi lain. |

### Conceptual Interface Table menuju Seq 21–28 (tanpa kolom formal relationship type)

| Target | Konsern | Status |
| --- | --- | --- |
| ADR-0001 Seq 21 | Temporal design concern — decision Accepted 2026-08-05 (Opsi C Hybrid); detail schema tetap Evidence Pending. | Candidate relationship |
| BP-DATA-003 Seq 22 | Metadata, catalog, lineage, crosswalk, versioning. | Candidate relationship |
| STD-DATA-001 Seq 23 | Quality rule, metric, test, acceptance untuk master/reference. | Candidate relationship |
| GOV-DATA-001 Seq 24 | Ownership, stewardship, authority, lifecycle governance. | Candidate relationship |
| STD-DATA-002 Seq 25 | Classification, retention, privacy, security untuk master/reference. | Candidate relationship |
| BP-DATA-004 Seq 26 | Knowledge asset dan master/reference dalam knowledge context. | Candidate relationship |
| BP-DATA-005 Seq 27 | Taxonomy dan reference dalam ontology context. | Candidate relationship |
| GOV-AI-001 Seq 28 | AI governance dan master/reference dalam AI context. | Candidate relationship |

Semua interface Conceptual Interface Table di atas adalah **Candidate relationship** dan **Evidence Pending**. Tidak ada artefak Seq 21–28 yang dibuat oleh dokumen ini.

## 27. Evidence Pending Register dan Routing Follow-up Artifact

Informasi berikut harus verified/resolved melalui follow-up artifact atau governance. Seluruh role/verifier placeholder memakai suffix `— Evidence Pending`.

| Pending Concern | Role/Verifier | Routing yang Benar | Status |
| --- | --- | --- | --- |
| Formal category listing, data owner/steward, source designation, lifecycle governance, workflow/exception governance | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 Seq 24 | Evidence Pending |
| Lineage, provenance, crosswalk history, version/supersession traceability, identifier/namespace traceability | To be assigned by Project Owner — Evidence Pending | BP-DATA-003 Seq 22 | Evidence Pending |
| Temporal model decision | Accepted pada ADR-0001 (2026-08-05, Opsi C Hybrid); aturan pemicu transition year tetap To be designated or verified by competent institutional authority — Evidence Pending | ADR-0001 Seq 21 | Approved Architecture Direction (ADR-0001); detail Evidence Pending |
| Quality rule/metric/threshold/test/acceptance | To be assigned by Project Owner — Evidence Pending | STD-DATA-001 Seq 23 | Evidence Pending |
| Classification, retention, privacy, security governance | To be designated or verified by competent institutional authority — Evidence Pending | STD-DATA-002 Seq 25 | Evidence Pending |
| Hierarchy, taxonomy, controlled vocabulary semantics | To be assigned by Project Owner — Evidence Pending | BP-DATA-005 Seq 27 | Evidence Pending |
| Knowledge context | To be assigned by Project Owner — Evidence Pending | BP-DATA-004 Seq 26 | Evidence Pending |
| AI governance/provenance | To be designated or verified by competent institutional authority — Evidence Pending | GOV-AI-001 Seq 28 | Evidence Pending |
| External integration mechanism, API/contract, protocol, service-level, exchange implementation | To be designated or verified by competent institutional authority — Evidence Pending | Future Integration Architecture di luar BP-DATA-002 dan di luar scope ADR-0001 | Evidence Pending |

External integration mechanism secara eksplisit **tidak** dirutekan ke ADR-0001; ADR-0001 Seq 21 (Accepted, 2026-08-05) hanya menangani temporal model decision. Synchronization/reconciliation conceptual lineage dapat dirutekan ke BP-DATA-003 Seq 22/GOV-DATA-001 Seq 24; mekanisme teknis integrasi eksternal tetap Future Integration Architecture.

## 28. Interface ke Seq 21–28

Dokumen ini tidak membuat Seq 21–28 dan tidak mengklaim status apa pun untuk artefak tersebut. Konsep dan design concern di atas hanya menyediakan context dan provisional input bagi follow-up work. Setiap Seq 21–28 tetap independent work yang dimulai setelah mandate dan governance mereka sendiri, dengan evidence dan review outcome mereka sendiri.

## 29. Assumptions dan Constraints

### Working Assumptions untuk Candidate Direction

1. ARCH-DATA-001 (Version 1.0.0, Approved) menyediakan documented baseline facts yang dapat menjadi context untuk master/reference candidate direction.
2. BP-DATA-001 (Version 1.0.0, Approved, Official Enterprise Data Domain Model) adalah **normative domain-model dependency**; 13 enterprise data domains dari BP-DATA-001 menjadi relationship reference context untuk master/reference concern.
3. Business architecture dan current baseline dari ARCH-DATA-001 menyediakan context untuk candidate master/reference concern (tidak menjamin sufficiency untuk implementasi).
4. One Data, Many Publications adalah **Approved architecture principle** dari ARCH-DATA-001; implementasi tetap Candidate Target Direction/Evidence Pending.

### Design Boundaries dan Evidence Pending

1. BP-DATA-002 tidak menetapkan ownership aktual atau institutional authority; assignment tetap responsibility Project Owner atau competent institutional authority.
2. BP-DATA-002 tidak menetapkan authoritative source resmi untuk any category; designation tetap Evidence Pending dan responsibility competent institutional authority.
3. BP-DATA-002 tidak membuat atau menstandarkan identifier scheme atau code set; design tetap Evidence Pending.
4. BP-DATA-002 tidak menetapkan temporal design atau technical schema selection; siklus Renstra telah diputuskan pada ADR-0001 Seq 21 (Accepted, 2026-08-05, Opsi C Hybrid); detail schema/metadata tetap Evidence Pending dan governance process lanjutan.
5. Semua design concern, category definition, lifecycle model, governance boundary adalah **Candidate Target Direction** dan **Evidence Pending**.

## 30. Issue, ADR, Compliance, Risk, dan Change Boundary

Dokumen mereferensi tetapi tidak mengubah:

| Reference | Status | Boundary |
| --- | --- | --- |
| AIR-001 | Resolved (2026-08-05) | Conflict Renstra period diputuskan melalui ADR-0001 Seq 21 Accepted; BP-DATA-002 tidak mengklaim resolve conflict itu sendiri. |
| ADR-0001 | Accepted (2026-08-05, Opsi C — Hybrid) | Temporal decision Seq 21 telah Accepted; BP-DATA-002 tidak membuat temporal design/schema; detail tetap Evidence Pending pada follow-up artifact. |
| REG-08 | Under Regulatory Status Verification | Privacy/regulation mapping tetap pending; detail di STD-DATA-002. |
| COMP-007 | Under Applicability Assessment | Personal data determination tetap pending; detail di STD-DATA-002. |
| Evidence Pending | Maintained | Semua Evidence Pending context tetap maintained; tidak diubah. |
| Enterprise Change Log | Version 1.0.14, Approved, memuat ECHG-027 | Tidak diubah oleh corrective revision BP-DATA-002 ini. |

Dokumen tidak menutup issue, menerima risk, menyetujui exception, menetapkan compliance, atau memberi status Verified.

## 31. G2 — Data and Knowledge Foundation Boundary

BP-DATA-002 menyediakan candidate framework untuk master dan reference data yang relevant ke G2 — Data and Knowledge Foundation, tetapi tidak menetapkan G2 disposition atau readiness:

| Candidate Element | Relationship ke G2 | Evidence Status |
| --- | --- | --- |
| Master/reference separation dan category concern | Candidate conceptual foundation untuk data categorization. | Evidence Pending — detailed category scope dan governance rule |
| Lifecycle dan authoritative source boundary | Candidate framework untuk data lifecycle dan source concern. | Evidence Pending — implementation rule dan assignment |
| Metadata dan lineage concern | Candidate foundation untuk traceability concern. | Evidence Pending — capture rule dan metadata standard |
| Ownership, stewardship, authority boundary | Candidate governance structure. | Evidence Pending — role assignment dan authority designation |

Kontribusi ini adalah **Candidate Target Direction** dan **Evidence Pending for G2**. G1 dan G2 tetap tanpa disposition. BP-DATA-002 tidak menetapkan G2 readiness, approval, atau memberikan Gate disposition apa pun.

## 32. Batas Kewenangan AI

Claude Work (AI) bertindak sebagai Acting Chief Enterprise Architect, Reviewer, dan Draft File Operator terpadu di bawah mandat HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan kewenangan terbatas:

- **Permitted**: Menyusun proposed category, lifecycle, boundary, design concern berdasarkan Charter, ARCH-DATA-001, dan BP-DATA-001 context. Melakukan self-review substantif dan administratif. Memfinalisasi status dokumen (Draft for Review → Approved) bila seluruh acceptance criteria terpenuhi dan berada dalam batas delegasi. Menandai seluruh category/lifecycle/design concern yang belum diverifikasi sebagai Candidate/Evidence Pending. Mereferensi evidence dengan jujur.
- **Prohibited**: Menetapkan authoritative source, owner, steward, code set, validation rule, quality metric, compliance status, temporal design, implementation, atau Gate disposition. Mengklaim kewenangan Project Owner, pejabat institusional, atau regulator.

Boundary otoritas dipisahkan sebagai berikut, bukan sebagai satu pengelompokan "external authority" tunggal:

- **Program-level assignment** (data owner/steward, custodian, business-source assignment) → `To be assigned by Project Owner — Evidence Pending`.
- **Institutional/statutory designation** (source authority, verifier, regulatory/reference code authority) → `To be designated or verified by competent institutional authority — Evidence Pending`.
- **Temporal decision** (5 vs 6 tahun Renstra) → Diputuskan pada ADR-0001 Seq 21 (Accepted, 2026-08-05, Opsi C Hybrid) oleh Project Owner; aturan pemicu transition year tetap Evidence Pending.
- **Compliance/legal applicability** (REG-08, COMP-007) → competent institutional authority; tidak ditetapkan BP-DATA-002.
- **G2 disposition** → authority sesuai GOV-EA-005 — Architecture Review and Gate Standard; tidak ditetapkan BP-DATA-002. G1 dan G2 tetap tanpa disposition.

## 33. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | Claude Work | Menyusun initial draft, boundary cleanup, dan corrective revision Version 0.2.0 berdasarkan finding CEA AR-EA020-001 sampai AR-EA020-009. | Selesai | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Substantive self-review terhadap Version 0.2.0: seluruh 21-item acceptance test/validation checklist diverifikasi ulang dan dinyatakan PASSED. BP-DATA-002 disahkan sebagai Official Master and Reference Data Blueprint Version 1.0.0 berdasarkan mandat terpadu Project Owner. | Approved | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat unified delivery mode melalui HANDOFF-e-PeLARA-EA-2026-08-05-v10, 5 Agustus 2026; menerima hasil finalisasi tanpa persetujuan rutin per baris. | Mandat dan penerimaan tercatat | 2026-08-05 |

## 34. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-04 | Penyusunan awal Master and Reference Data Blueprint sebagai BP-DATA-002 Seq 20 berdasarkan ARCH-DATA-001 Approved, BP-DATA-001 provisional draft context (saat itu Version 0.1.0), sumber terbatas. Proposed master/reference category, lifecycle, boundary, design concern disusun pada tingkat enterprise konseptual. Semua ditetapkan sebagai Candidate Target Direction dan Evidence Pending. Dokumen tidak menetapkan owner aktual, source, code set, rule, implementation, compliance, atau G2 disposition. Evidence Pending register dan follow-up interface tercatat. Destinasi: Review substantif CEA. | Claude Work | Draft for Review |
| 0.1.0 | 2026-08-05 | Final administrative boundary cleanup: §12 menghapus baris historis "Technical Primary Key" beserta istilah database table, surrogate key, dan schema/system dari identifier direction; §15 mengganti cardinality 1:1/1:N/M:N dengan correspondence concern; §18 menghapus pola consumption request/timing; §23 mengganti daftar teknologi negatif dengan boundary selection konseptual. Seluruh koreksi tetap Candidate Target Direction dan Evidence Pending. Metadata, 13 Domain ID termasuk DD-EVD-001, BP-DATA-001 provisional context (saat itu), G1/G2, AIR-001, ADR-0001, REG-08, COMP-007, Enterprise Change Log, dan Seq 21–28 tidak berubah. | Claude Work | Draft for Review |
| — | 2026-08-05 | **CEA Substantive Review terhadap Version 0.1.0**: Outcome **REVISIONS REQUIRED**. Finding AR-EA020-001 sampai AR-EA020-009 diterbitkan oleh Chief Enterprise Architect, mencakup: (1) state dan dependency drift terhadap BP-DATA-001 yang saat itu masih provisional draft dan kini telah Approved Version 1.0.0, serta Enterprise Change Log yang telah menjadi Version 1.0.14 dengan ECHG-027; (2) ketiadaan category-boundary matrix yang mencegah domain overlap; (3) lifecycle overcommitment yang menyiratkan mandatory workflow sequence; (4) operational dan technical overreach pada §11–§19, §23–§24 (direct access, synchronization protocol, cardinality, prefix/suffix identifier, AI strategy, dan sejenisnya); (5) authority placeholder yang tidak konsisten pada §9, §21, §27, §29, §32; (6) current-state attribution §25 yang tidak tepat terhadap ARCH-DATA-001 (menyebut "Status Baseline 2" yang tidak akurat); (7) traceability §26 yang belum sepenuhnya selaras vocabulary formal GOV-EA-006 (DEPENDS_ON/GOVERNED_BY sahaja); (8) routing follow-up artifact §27 yang belum memisahkan external integration mechanism dari ADR-0001; (9) assumptions dan program state §28–§32 yang belum mencerminkan BP-DATA-001 Approved dan Enterprise Change Log terkini. | Chief Enterprise Architect (ChatGPT) | Review Outcome: REVISIONS REQUIRED |
| 0.2.0 | 2026-08-05 | Corrective revision substantif terpadu berdasarkan seluruh finding AR-EA020-001 sampai AR-EA020-009: (1) Metadata — version 0.2.0; roadmap_dependency menambahkan BP-DATA-001 sebagai normative dependency; gate memakai "tanpa disposition" secara eksplisit. (2) State/dependency drift (AR-EA020-001) — front matter, §1–§3, §8, §26, §29–§30, §32, §35–§36 diperbarui mencerminkan BP-DATA-001 Version 1.0.0 Approved (bukan lagi provisional draft/Version 0.1.0), ARCH-DATA-001 tetap normative parent, Enterprise Change Log Version 1.0.14/ECHG-027 dicatat sebagai context tanpa diubah. (3) Category boundary (AR-EA020-002) — §7 menambahkan category-boundary matrix 6 baris; §7–§9 diperbaiki agar tidak overlap dengan DD-ORG-001/DD-PLN-001/DD-OPR-001/DD-BDG-001/DD-PRF-001/DD-POL-001/DD-EVD-001; tepat 13 Domain ID dipertahankan; istilah "13 enterprise data domains" digunakan. (4) Lifecycle reframing (AR-EA020-003) — §9-10 (kini §10) direframe menjadi "Candidate Lifecycle Concerns", bukan mandatory workflow; frasa "consumer dan steward direview" diganti "relevant stakeholder review concern"; "bug diperbaiki" diganti "correction concern"; monitoring metrics diganti "quality and usage observation concern"; migration/parallel running direframe menjadi "version coexistence and supersession concern". (5) Operational/technical overreach (AR-EA020-004) — §11–§19, §23–§24 direframe menjadi conceptual concern; §11 System of Record/Reference/Publication Context hanya conceptual role/boundary; §12 identifier dibatasi semantic concerns (scope, uniqueness, stability, namespace, version/supersession, traceability) tanpa format/prefix/collision rule; §13/§15 menghapus role inheritance, cardinality, aggregation function, merge algorithm; §16–§18/§23 menggunakan conceptual distribution/consumption/reconciliation/exception concern tanpa mekanisme/timing/protocol/SLA; §19 judul diganti "Candidate Metadata Association Concerns", kolom Carrier dihapus, frasa "metadata minimum"/"harus tagged" dihapus; §24 AI interface dibatasi provenance/source-context/controlled-consumption/human-authority boundary tanpa representation/strategy/provider/prompt/training/algorithm. (6) Authority placeholder (AR-EA020-005) — §9, §21, §27, §29, §32 distandarisasi penuh; §21 menegaskan Data Owner/Steward tidak accountable aktual dan G2 memerlukan data owner resmi yang belum ditetapkan BP-DATA-002; §32 pengelompokan "external authority" tunggal diganti lima boundary terpisah (program-level, institutional/statutory, temporal, compliance/legal, G2 disposition). (7) Current-state attribution (AR-EA020-006) — §25 ditulis ulang total menjadi "Approved Architecture Source Context" dengan exact attribution ke ARCH-DATA-001 §20, §23, §24, §25, §26, §30; frasa "ARCH-DATA-001 (Approved, Status Baseline 2)" dihapus. (8) Traceability GOV-EA-006 (AR-EA020-007) — §26 ditulis ulang total menjadi "Document-Level Traceability Summary using GOV-EA-006 vocabulary"; hanya DEPENDS_ON dan GOVERNED_BY dipakai sebagai formal relationship_type (5 baris: ARCH-DATA-001, BP-DATA-001, GOV-REP-001, GOV-EA-005, GOV-EA-006, masing-masing dengan target version dan relative path); ditambahkan Source Reference Table dan Conceptual Interface Table; ditegaskan bukan canonical/formal minimum traceability record. (9) Routing follow-up (AR-EA020-008) — §27 tabel routing diperbaiki; external integration mechanism dirutekan ke Future Integration Architecture, bukan ADR-0001; seluruh role/verifier placeholder memakai suffix "— Evidence Pending". (10) Assumptions/program state (AR-EA020-009) — §28–§32 diperbarui: BP-DATA-001 Approved normative dependency; One Data Many Publications sebagai Approved architecture principle; AIR-001 Open, ADR-0001 undecided, REG-08/COMP-007 unchanged, Enterprise Change Log Version 1.0.14/ECHG-027 unchanged, Seq 21–28 belum dimulai, G1/G2 tanpa disposition dipertahankan. (11) §33 Persetujuan diperbarui mencatat review REVISIONS REQUIRED dan status draft belum Approved; §34 Change Log menambah entri review dan corrective revision ini secara terpisah; §35 ditulis ulang sebagai validation checklist Version 0.2.0 tanpa klaim PASSED; §36 diperbarui ke state Version 0.2.0 Corrective Revision Completed, CEA Substantive Re-review Pending. Enterprise Change Log **tidak diperbarui** oleh corrective revision ini. | Claude Work | Draft for Review — Pending CEA Substantive Re-review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.2.0** (di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 unified delivery mandate): Outcome **PASSED**. Seluruh 21-item acceptance test/validation checklist Version 0.2.0 (§35) diverifikasi ulang terhadap file aktual: metadata, 13 Domain ID, category-boundary matrix 6 baris, authority placeholder suffix, operational/technical overreach removal, §25 source attribution, §26 formal DEPENDS_ON/GOVERNED_BY vocabulary, §27 routing non-ADR-0001 untuk external integration, dan status AIR-001/ADR-0001/REG-08/COMP-007/G1/G2/BP-DATA-001/Enterprise Change Log tidak berubah — seluruhnya dinyatakan lulus tanpa regresi. | Claude Work sebagai Acting Chief Enterprise Architect | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi BP-DATA-002 menjadi Official Master and Reference Data Blueprint berdasarkan hasil substantive self-review PASSED dan mandat terpadu Project Owner (HANDOFF-e-PeLARA-EA-2026-08-05-v10). Perubahan mencakup: metadata (version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED, approver mencatat Claude Work sebagai Acting CEA di bawah delegasi terpadu); current-state wording pada §1 (Tujuan dan Kedudukan) untuk mencerminkan status Approved tanpa mengklaim implementation completion; §32 diperbarui mencatat peran terpadu Acting CEA/Reviewer/Operator dan penghapusan syarat review ChatGPT rutin sesuai handoff v10; tabel Persetujuan §33 diperbarui mencatat self-review PASSED dan penerimaan mandat Project Owner; §35–§36 ditulis ulang mencerminkan state Version 1.0.0 Approved. Tidak ada perubahan substantif terhadap category landscape, category-boundary matrix, lifecycle concerns, relationship, authority placeholder assignment, atau evidence status yang telah dikoreksi pada Version 0.2.0. G1/G2 tetap tanpa disposition. BP-DATA-001, ARCH-DATA-001, register, ADR, dan Seq 21–28 tidak disentuh. Enterprise Change Log diperbarui sebagai operasi terpisah (lihat ECHG-028). | Claude Work sebagai Acting Chief Enterprise Architect | Approved |

## 35. Validation Checklist — Version 1.0.0 Approved

Checklist berikut memverifikasi state final Version 1.0.0 Approved setelah substantive self-review PASSED:

1. ✓ File yang berubah pada finalisasi ini hanya `03-data-architecture/20-Master-and-Reference-Data-Blueprint.md`.
2. ✓ Metadata: Version `1.0.0`, Status `Approved`, `effective_date: 2026-08-05`, `review_outcome: PASSED`, gate `G2 — Data and Knowledge Foundation; tanpa disposition`.
3. ✓ BP-DATA-001 tercatat sebagai Version 1.0.0, Approved, Official Enterprise Data Domain Model, normative domain-model dependency.
4. ✓ ARCH-DATA-001 tetap normative parent, Version 1.0.0, Approved.
5. ✓ Enterprise Change Log dirujuk sebagai Version 1.0.14 dengan ECHG-027 pada isi §3/§25/§30/§34; pembaruan Enterprise Change Log dengan ECHG-028 dilakukan sebagai operasi terpisah setelah finalisasi ini.
6. ✓ Tepat 13 Domain ID unik dipertahankan pada §8 dan referensi lain; tidak berubah oleh finalisasi.
7. ✓ Category-boundary matrix tetap tersedia pada §7 dengan 6 baris category concern; tidak berubah oleh finalisasi.
8. ✓ Tidak ada domain-overlap claim yang memindahkan planning instance, evidence instance, authority rule, atau compliance determination ke master/reference.
9. ✓ Tidak ada authority placeholder telanjang; seluruh occurrence memakai suffix "— Evidence Pending" yang sesuai (program-level atau institutional/statutory); tidak diubah oleh finalisasi.
10. ✓ Tidak ada fixed workflow, role assignment, timing, cadence, latency, algorithm, cardinality, direct-access mechanism, role-based filtering, prefix/suffix scheme, transaction-log carrier, atau AI strategy aktif.
11. ✓ §19 tidak memakai frasa "metadata minimum" atau "harus tagged"; kolom Carrier dihapus.
12. ✓ §25 hanya memuat source attribution yang didukung ARCH-DATA-001 §20, §23, §24, §25, §26, §30.
13. ✓ §26 hanya memakai formal `DEPENDS_ON` dan `GOVERNED_BY`; memuat target version dan relative path; menegaskan bukan canonical/formal minimum traceability record.
14. ✓ §27 tidak merutekan external integration mechanism ke ADR-0001.
15. ✓ AIR-001 (Resolved, 2026-08-05), ADR-0001 (Accepted, 2026-08-05, Opsi C — Hybrid), REG-08 (Under Regulatory Status Verification), COMP-007 (Under Applicability Assessment), G1, dan G2 (tanpa disposition) — status AIR-001/ADR-0001 diperbarui melalui administrative patch terpisah tertanggal 2026-08-05, tidak berubah oleh finalisasi Version 1.0.0 itu sendiri.
16. ✓ BP-DATA-001, ARCH-DATA-001, register, standard, glossary, dan Seq 21–28 tidak berubah oleh finalisasi ini.
17. ✓ Local Change Log (§34) memuat review v0.1.0 REVISIONS REQUIRED, corrective revision v0.2.0, substantive self-review PASSED, dan finalisasi v1.0.0 sebagai entri terpisah; entri historis tidak dihapus atau ditulis ulang.
18. ✓ Approval BP-DATA-002 **tidak** menetapkan implementation completion, institutional authority assignment, owner/steward assignment, compliance determination, temporal decision, atau disposition G1/G2; G2 tetap tanpa disposition.

Dokumen ini menyatakan Version 1.0.0 Approved berdasarkan substantive self-review Claude Work sebagai Acting Chief Enterprise Architect di bawah mandat terpadu, bukan review independen ChatGPT — sebagaimana diizinkan HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0 dan §3.4.

## 36. State Aktual Dokumen — Version 1.0.0 Approved

**EA-020 / BP-DATA-002 — Version 1.0.0; Approved; Official Master and Reference Data Blueprint.**

```text
Document ID: BP-DATA-002
Version: 1.0.0
Status: Approved
Effective Date: 2026-08-05
Review Outcome: PASSED
Prepared by: Claude Work
Approved by: Claude Work as Acting Chief Enterprise Architect (HANDOFF-e-PeLARA-EA-2026-08-05-v10)
Project Owner: Fahmi Alhabsi
Date: 2026-08-05
Gate: G2 — Data and Knowledge Foundation; tanpa disposition
```

Riwayat Review dan Revisi:
- v0.1.0 (2026-08-04): Penyusunan awal draft berdasarkan ARCH-DATA-001 Approved dan BP-DATA-001 (saat itu provisional draft Version 0.1.0).
- v0.1.0 (2026-08-05): Final administrative boundary cleanup (§12, §15, §18, §23).
- CEA Substantive Review terhadap v0.1.0 (2026-08-05): Outcome REVISIONS REQUIRED — finding AR-EA020-001 sampai AR-EA020-009.
- v0.2.0 (2026-08-05): Corrective revision substantif terpadu menyelesaikan seluruh finding AR-EA020-001 sampai AR-EA020-009.
- Substantive Self-Review terhadap v0.2.0 (2026-08-05): Outcome PASSED, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10.
- v1.0.0 (2026-08-05): Finalisasi menjadi Official Master and Reference Data Blueprint, Approved.
- v1.0.0 (2026-08-05): **Administrative patch pasca-keputusan ADR-0001.** ADR-0001 Accepted (Opsi C — Hybrid) dan AIR-001 Resolved; referensi status pada §13, §21, §27, §29, §30, §35, §36 diperbarui dari "AIR-001 Open"/"ADR-0001 undecided" menjadi "AIR-001 Resolved"/"ADR-0001 Accepted". Tidak ada perubahan substantif lain; version metadata tetap 1.0.0.

Program State Terkini:
- BP-DATA-001: Version 1.0.0, **Approved**, Official Enterprise Data Domain Model — normative domain-model dependency BP-DATA-002. Tidak diubah oleh finalisasi ini.
- ARCH-DATA-001: Version 1.0.0, Approved — normative parent. Tidak diubah.
- Enterprise Change Log: Version 1.0.14, Approved, memuat ECHG-027 pada saat finalisasi ini ditulis; pembaruan dengan ECHG-028 dilakukan sebagai operasi terpisah menyusul finalisasi BP-DATA-002.
- AIR-001: **Resolved** (diperbarui 2026-08-05).
- ADR-0001: **Accepted** (2026-08-05, Opsi C — Hybrid), Seq 21.
- REG-08: tetap **Under Regulatory Status Verification**.
- COMP-007: tetap **Under Applicability Assessment**.
- G1 dan G2: tetap **tanpa disposition**.
- Seq 21–28: tetap **belum dimulai**.
- BP-DATA-002: **Approved**; approval ini tidak menetapkan implementation completion, institutional authority assignment, owner/steward assignment, compliance determination, temporal decision, data-domain acceptance, atau disposition G1/G2.

Sumber yang benar-benar dibaca langsung untuk corrective revision dan finalisasi ini: BP-DATA-002 (self), ARCH-DATA-001, BP-DATA-001, GOV-EA-006 (penuh). Sumber yang dibaca sebagian: GOV-REP-001, GOV-EA-005, REF-BUS-001, Enterprise Change Log. Master Roadmap tidak dibaca ulang; state Seq 20 divalidasi melalui metadata dan sumber resmi lain sesuai instruksi mandat.

Konfirmasi Boundary:
- Finalisasi ini hanya mengubah `03-data-architecture/20-Master-and-Reference-Data-Blueprint.md`.
- Tidak ada file lain dibuat, dipindah, atau dihapus oleh finalisasi ini.
- BP-DATA-001, ARCH-DATA-001, standard, glossary, dan Seq 22–28 tidak disentuh oleh finalisasi ini. AIR-001 dan ADR-0001 diperbarui pada artefaknya sendiri melalui keputusan Project Owner 2026-08-05; BP-DATA-002 hanya memperbarui referensi status tersebut sebagai administrative patch terpisah, tidak mengambil keputusan.
- Tidak ada klaim implementation, institutional authority assignment, owner/steward assignment, compliance determination, temporal decision, atau disposition G1/G2.
- Enterprise Change Log akan diperbarui sebagai operasi terpisah (ECHG-028) menyusul finalisasi ini, sesuai HANDOFF-e-PeLARA-EA-2026-08-05-v10 §10.2.

---

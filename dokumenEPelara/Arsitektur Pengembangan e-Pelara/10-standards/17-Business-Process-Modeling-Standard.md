---
document_id: STD-BUS-001
title: Business Process Modeling Standard
system: e-PeLARA Next Generation
classification: Business Architecture Standard
domain: Business Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Chief Enterprise Architect under standing delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
effective_date: 2026-08-04
roadmap_dependency: Business Overview
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G1 — Business and Regulatory Alignment
review_outcome: PASSED
intended_repository_path: 10-standards/17-Business-Process-Modeling-Standard.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# 17 — Business Process Modeling Standard

## 1. Tujuan dan Kedudukan

STD-BUS-001 adalah **Official Business Process Modeling Standard** yang menetapkan konvensi internal untuk menyusun, mereview, dan menelusuri model proses bisnis e-PeLARA Next Generation. Standar ini memastikan model konsisten dalam struktur, vocabulary, notasi, boundary, dan metadata, serta dapat menjadi input terkendali bagi domain arsitektur lanjutan.

Dokumen ini adalah **modeling standard**, bukan kumpulan model proses aktual. Dokumen ini bukan SOP, pedoman operasional unit, organisation design, job description, RACI institusional, spesifikasi workflow engine, UI flow, API orchestration, database state model, test plan, control catalog, atau Canonical Traceability Matrix.

Standar ini tidak menetapkan business owner, process owner, approver, verifier, pejabat, unit, data owner, legal authority, compliance determination, risk acceptance, exception approval, SLA, target angka, maupun Gate disposition. Approval dokumen tidak menetapkan implementasi, authority institusional, compliance, verification, atau disposition G1; G1 tetap tanpa disposition sampai keputusan Gate yang sah dicatat secara terpisah.

## 2. Ruang Lingkup

Standar berlaku bagi model proses bisnis yang secara resmi dimandatkan dalam lingkup e-PeLARA. Cakupannya adalah struktur model, notasi, metadata, kualitas, traceability, review, penyimpanan, dan publikasi model. Model dapat merepresentasikan context, end-to-end process, subprocess, interface lintas fungsi, atau exception secara proporsional.

Standar tidak memerintahkan pembuatan model proses tertentu, perubahan implementasi, atau otomatisasi proses. Ketentuan institusional, legal, operasional, dan implementasi tetap memerlukan artefak serta kewenangan tersendiri.

## 3. Sumber Otoritatif dan Dependency

Dependency normatif STD-BUS-001 **hanya** [ARCH-BUS-001 — Business Architecture Overview](../02-business-architecture/10-Business-Architecture-Overview.md), sesuai Seq 17 Master Roadmap. Sumber berikut adalah governance atau supporting context dan tidak membentuk dependency normatif baru:

| Sumber | Kedudukan penggunaan |
| --- | --- |
| [Architecture Charter](../00-governance/00-Architecture-Charter.md) | Mandat, prinsip, dan batas kewenangan. |
| [Repository Structure](../00-governance/01-Repository-Structure.md) | Lokasi, penamaan, dan hubungan dokumen. |
| [Governance Operating Model](../00-governance/07-Architecture-Governance-Operating-Model.md) | Konteks review dan governance. |
| [Review and Gate Standard](../00-governance/08-Architecture-Review-and-Gate-Standard.md) | Pemisahan review outcome dan Gate disposition. |
| [Traceability Standard](../00-governance/09-Traceability-Standard.md) | Ketentuan relationship dan status evidence. |
| [Master Roadmap](../11-roadmaps/02-Enterprise-Architecture-Roadmap.md) | Seq 17, dependency, dan G1. |
| BP-BUS-001 sampai BP-BUS-005; [REF-BUS-001](../03-data-architecture/business-glossary/15-Business-Glossary.md) | Supporting context melalui link, bukan penyalinan substansi. |

## 4. Prinsip Pemodelan Proses

1. Model menjelaskan maksud, boundary, dan hubungan bisnis secara jelas.
2. Vocabulary mengikuti [REF-BUS-001](../03-data-architecture/business-glossary/15-Business-Glossary.md); istilah baru harus ditandai untuk pengelolaan glossary, bukan diasumsikan kanonis.
3. Current state, target state, candidate relationship, Evidence Pending, dan verified evidence selalu dipisahkan secara eksplisit.
4. Human decision authority dan separation of duties dipertahankan; system permission, workflow completion, atau keluaran AI bukan authority.
5. Traceability dilakukan melalui link ke sumber, bukan duplikasi substansi atau register.
6. Model bersifat proporsional: detail hanya ditambahkan untuk tujuan dan scope yang dimandatkan.
7. Satu data resmi dapat dipakai kembali bagi publikasi atau view yang berbeda tanpa mengubah makna, sumber, versi, atau statusnya — **One Data, Many Publications**.

## 5. Istilah dan Vocabulary

| Istilah | Penggunaan dalam standar |
| --- | --- |
| Process model | Representasi terkendali tentang alur atau hubungan proses dalam scope tertentu. |
| Activity | Pekerjaan atau tindakan yang menghasilkan outcome yang dapat dipahami. |
| Event | Kejadian pemicu, antara, atau akhir yang relevan bagi alur. |
| Gateway | Titik pengendalian alur dengan semantics dan kondisi eksplisit. |
| Role context | Konteks peran konseptual, bukan assignment manusia/unit. |
| Decision record | Objek atau referensi yang membedakan keputusan dari aktivitas. |
| Evidence | Bukti yang dirujuk untuk mendukung claim; statusnya tidak diasumsikan. |
| Candidate relationship | Hubungan usulan yang belum diverifikasi. |
| Evidence Pending | Bukti atau verifikasi yang masih diperlukan. |
| Verified | Status yang hanya boleh digunakan bila evidence dan verifier sah telah dicatat. |

Istilah bisnis kanonis mengikuti REF-BUS-001. Status dokumen, approval, verification, compliance, dan Gate disposition adalah konsep berbeda dan tidak boleh digabungkan.

## 6. Hirarki Model Proses

| Level | Cakupan konseptual | Batas |
| --- | --- | --- |
| L0 | Business context atau value stream | Menjelaskan konteks dan outcome lintas proses. |
| L1 | End-to-end business process | Menjelaskan boundary utama, trigger, outcome, dan handoff. |
| L2 | Business subprocess | Menjelaskan dekomposisi yang diperlukan untuk memahami L1. |
| L3 | Procedure/task decomposition | Hanya bila dimandatkan; bukan SOP resmi. |

Level 3 tidak menetapkan SOP. SOP formal memerlukan artefak, authority, dan persetujuan institusional tersendiri.

## 7. Jenis dan View Model

Setiap model menyatakan satu jenis atau lebih view berikut secara eksplisit: current-state process model; target-state process model; candidate process model; cross-functional process model; document lifecycle interface model; decision and approval interface model; exception/escalation interface; dan evidence/control interface.

Current dan target tidak boleh dicampur tanpa penanda status per elemen atau per view. Candidate model bukan bukti implementasi.

## 8. Metamodel Proses Bisnis

| Elemen | Minimum relationship yang dapat ditelusuri |
| --- | --- |
| Model | ID, nama, level, view, status, scope/boundary, trigger, intended outcome, versi. |
| Event / activity / gateway / flow | Model induk, role context bila relevan, input/output, kondisi atau outcome. |
| Role / decision | Referensi RAP-ROLE-* atau RAP-DEC-* bila relevan; tidak menetapkan authority. |
| Document / data / evidence / control | Referensi sumber, expectation, dan status evidence; bukan canonical catalog. |
| Lifecycle interface | Referensi DLC-PH-* atau DLC-TR-* bila relevan; relationship baru tetap candidate. |
| Capability / value stream / requirement | Referensi CAP-*, VST-*, COMP-*, atau REG-* bila relevan dan berstatus tepat. |

## 9. Konvensi Identifier

Pola berikut adalah standard identifier, bukan pembentukan instance aktual:

| Artefak | Pola |
| --- | --- |
| Process model | `BPM-[DOMAIN]-NNN` |
| Process level | `BPM-[DOMAIN]-NNN-L0`, `-L1`, `-L2`, atau `-L3` |
| Process step | `BPS-[DOMAIN]-NNN` |
| Business event | `BEV-[DOMAIN]-NNN` |
| Business rule reference | `BR-[DOMAIN]-NNN` |
| Exception path | `BEX-[DOMAIN]-NNN` |

`[DOMAIN]` menggunakan kode domain yang disetujui pada artefak sumber. ID instance hanya dibuat ketika model proses resmi dimandatkan; identifier tidak mengklaim implementasi atau authority.

## 10. Konvensi Penamaan

Nama model memakai pola kata kerja–objek–konteks yang jelas, misalnya “Mengelola [objek] dalam [boundary]”, tanpa menjadikan contoh sebagai model aktual. Nama activity menyatakan tindakan dan outcome; nama event menyatakan kejadian; nama gateway menyatakan pertanyaan atau dasar percabangan. Hindari label ambigu seperti “Proses data” tanpa objek dan outcome.

## 11. Notasi Pemodelan

Standar memakai **BPMN-inspired internal modeling subset** untuk komunikasi terkontrol: start, intermediate, dan end event; activity/task; subprocess; exclusive, parallel, dan event-based gateway bila diperlukan; sequence flow; message flow; pool; lane; data/document object; annotation; dan call activity bila benar-benar diperlukan. Subset ini hanya menggunakan sejumlah konsep/notasi umum yang dikenal dalam BPMN.

Subset ini bukan klaim BPMN 2.0 conformance, bukan sertifikasi, bukan executable process model, dan bukan workflow engine specification. Simbol tidak boleh digunakan tanpa definisi pada legenda model. Mermaid dapat dipakai untuk komunikasi/dokumentasi sederhana, tetapi bukan BPMN engine atau bukti kepatuhan BPMN.

## 12. Event, Activity, Gateway, dan Flow

- Start event memiliki konteks trigger; end event memiliki outcome atau state akhir yang dapat dipahami.
- Activity memiliki objek atau outcome dan role context yang dapat ditelusuri bila relevan.
- Gateway selalu memiliki semantics, kondisi, dan jalur keluar yang jelas; parallel gateway bukan pengganti kondisi keputusan.
- Sequence flow hanya menunjukkan urutan dalam satu pool. Message flow hanya menggambarkan pertukaran antar-pool dan tidak digunakan di dalam pool.
- Tidak boleh ada orphan node atau flow tidak tersambung. Happy path dibedakan dari exception path.
- Approval otomatis dilarang bila authority manusia diperlukan.

## 13. Pool, Lane, Role, dan Authority Boundary

Pool menunjukkan participant/boundary; lane dapat menunjukkan role context atau pengelompokan tanggung jawab konseptual. Referensi RAP-ROLE-* dan RAP-DEC-* dari [BP-BUS-004](../02-business-architecture/14-Roles-Authority-and-Approval-Blueprint.md) digunakan hanya sebagai interface konseptual.

Tidak ada manusia atau unit yang ditetapkan oleh model. Assignment program-level yang belum tersedia ditulis `To be assigned by Project Owner`. Institutional/statutory authority yang belum terbukti ditulis `To be designated or verified by competent institutional authority — Evidence Pending`. System permission bukan authority; workflow completion bukan approval; verification bukan approval; publication authorization bukan document approval; review outcome bukan approval atau Gate disposition.

## 14. Dokumen, Data, Evidence, Control, dan Decision Record

Document/data object menyatakan objek atau referensi, bukan database state model. Evidence/control interface hanya menyatakan expectation dan link ke sumbernya; standar ini tidak membentuk control catalog atau test plan. Decision record membedakan approval, review, verification, acceptance, publication authorization, dan Gate disposition sebagai objek keputusan yang berbeda.

Model grafis tidak menggantikan metadata, traceability, decision record, atau evidence.

## 15. Status Current, Target, Candidate, Evidence Pending, dan Verified

| Status | Arti dan guard |
| --- | --- |
| Current | Claim kondisi saat ini yang harus ditopang sumber/evidence yang sesuai. |
| Target | Rancangan masa depan; tidak boleh disebut implemented. |
| Candidate relationship | Hubungan usulan yang belum diverifikasi. |
| Evidence Pending | Bukti, assessment, atau verifikasi masih diperlukan. |
| Verified | Hanya bila evidence dan verifier sah telah direkam pada artefak yang berwenang. |

Tidak ada transisi otomatis dari Candidate menjadi Verified. Claim Current, Implemented, atau Verified harus dibedakan dan memiliki evidence serta verifier sah.

## 16. Hubungan dengan Capability Map

Model dapat menaut ke capability dalam [BP-BUS-001](../02-business-architecture/11-Business-Capability-Map.md) sebagai konteks capability. Link tersebut tidak menetapkan capability owner, kesiapan implementasi, maupun status verifikasi. Relationship yang belum tercatat pada artefak berwenang adalah Candidate relationship dan Evidence Pending.

## 17. Hubungan dengan Value Streams

Model dapat menaut stage value stream dalam [BP-BUS-002](../02-business-architecture/12-Planning-to-Accountability-Value-Streams.md) untuk menunjukkan konteks end-to-end. Link tidak mengubah stage menjadi SOP, workflow implementation, atau dependency normatif STD-BUS-001.

## 18. Hubungan dengan Government Document Lifecycle

DLC-PH-* dan DLC-TR-* dari [BP-BUS-003](../02-business-architecture/13-Government-Document-Lifecycle-Blueprint.md) digunakan hanya sebagai interface. Standar ini tidak menetapkan transition otomatis, Candidate menjadi Verified, retention/disposal rule, atau lifecycle phase sebagai workflow approval. Setiap hubungan proses–lifecycle baru adalah Candidate relationship dan Evidence Pending sampai diverifikasi.

## 19. Hubungan dengan Roles, Authority and Approval

Hubungan ke RAP-ROLE-* dan RAP-DEC-* dari BP-BUS-004 menjelaskan role/decision context. Hubungan itu tidak menunjuk pejabat, unit, approver, verifier, legal authority, atau institutional/statutory authority. Separation of duties perlu dapat dikenali tanpa menyimpulkan assignment yang belum sah.

## 20. Hubungan dengan Regulatory Requirement Traceability

COMP-* dan REG-* dirujuk melalui [BP-BUS-005](../02-business-architecture/16-Regulatory-Requirement-Traceability.md) dan Compliance Register sebagai sumber status. Hubungan REG–COMP yang telah dicatat tetap Documented Current. Mapping proses baru terhadap COMP-* adalah Candidate relationship, Evidence Pending, dan belum Verified.

`REG-08` tetap **Under Regulatory Status Verification** dan `COMP-007` tetap **Under Applicability Assessment**. Standar ini tidak menetapkan legal applicability, compliance, control completion, ataupun G1 disposition.

## 21. Traceability Minimum Set

Setiap model proses resmi wajib memiliki metadata minimum berikut, dengan link ke artefak sumber bila relevan:

| Kelompok | Field minimum |
| --- | --- |
| Identitas | Model ID, nama model, level, view/model type, version, last reviewed date. |
| Konteks | Current/Target/Candidate status, trigger, intended outcome, scope dan boundary, source/reference. |
| Keterhubungan bisnis | Capability reference, value-stream/stage reference, lifecycle reference bila relevan, role/decision-context reference. |
| Keterhubungan assurance | Regulatory requirement reference bila relevan, control/evidence expectation, issue/risk reference bila relevan, evidence status. |
| Governance | Model owner status, reviewer/verifier status, review outcome, approval status, Gate relevance. |

Traceability menghubungkan sumber dan target tanpa menyalin substansi. Tabel di dalam model bukan Canonical Traceability Matrix.

## 22. Modeling Quality Rules

1. Satu model memiliki scope dan boundary jelas.
2. Start event memiliki trigger context dan jalur utama memiliki end state/outcome yang dapat dipahami.
3. Gateway memiliki semantics serta kondisi jelas.
4. Actor/role context, decision point, input/output, exception, evidence, dan handoff lintas-boundary dapat dikenali bila relevan.
5. Tidak ada aktivitas ambigu, orphan node, atau flow tidak tersambung.
6. Approval, review, verification, acceptance, publication authorization, dan Gate disposition dimodelkan sebagai objek keputusan yang berbeda.
7. Current/Implemented/Verified memiliki evidence dan verifier sah; target/candidate tidak dinyatakan implemented.
8. Tidak ada SLA, batas waktu, threshold, jumlah maksimum node, atau target kuantitatif tanpa keputusan/evidence resmi.

## 23. Validation dan Review Checklist

| Area | Checklist minimum |
| --- | --- |
| Structural validation | ID, metadata, level, boundary, legenda, node, dan flow konsisten. |
| Semantic validation | Trigger, outcome, activity, gateway, exception, dan handoff dapat dipahami. |
| Traceability validation | Link capability, value stream, lifecycle, role/decision, requirement, evidence, issue/risk sesuai status. |
| Authority validation | Tidak ada assignment/authority yang disimpulkan; keputusan manusia dibedakan dari sistem. |
| Regulatory/evidence validation | Claim dan mapping baru diberi status tepat; legal/compliance tidak disimpulkan. |
| Architecture review outcome | Hanya `PASSED`, `REVISIONS REQUIRED`, atau `BLOCKED`. |
| Gate evidence relevance | Relevansi evidence G1 dicatat tanpa menetapkan disposition. |

Gate disposition hanya `APPROVED`, `APPROVED WITH CONDITIONS`, `DEFERRED`, atau `REJECTED` dan hanya dicatat melalui mekanisme Gate yang berwenang. Review outcome dan Gate disposition tidak dapat dipertukarkan.

## 24. Versioning dan Change Governance

Model dan metadata diberi versi serta change record lokal. Perubahan harus membedakan koreksi editorial, perubahan model, perubahan traceability, dan perubahan status evidence. Perubahan yang berdampak lintas domain atau melampaui standard ini mengikuti governance/ADR yang berlaku. Draft tidak mengubah Enterprise Change Log; perubahan pada artefak Approved memerlukan instruksi dan pencatatan yang sesuai.

## 25. Penyimpanan, Format, dan Publikasi Model

Model disimpan bersama metadata dan referensi yang memungkinkan review terkendali. Markdown/Mermaid dapat digunakan untuk komunikasi dan dokumentasi sederhana. Format modeling lain adalah opsi, bukan tool wajib, kecuali keputusan resmi menetapkan lain. Standar ini tidak memilih vendor atau aplikasi modeling tertentu.

Publikasi view tidak boleh mengubah sumber, makna, versi, status, approval, atau evidence. Representasi grafis tidak menggantikan artefak source atau record keputusan.

## 26. Hubungan dengan Domain Arsitektur Lain

Model yang disusun sesuai standard ini dapat menjadi input, bukan implementasi, bagi data lineage/data requirements; application capability/bounded context; workflow state model; integration interaction; identity/access dan separation of duties; audit/control design; AI human-oversight boundary; serta document/publishing workflow. Masing-masing memerlukan artefak domain dan Gate terkait sebelum menjadi keputusan atau implementasi.

## 27. Kontribusi terhadap G1

STD-BUS-001 menyediakan struktur evidence untuk memahami Business and Regulatory Alignment melalui model yang konsisten dan traceable. Kontribusi ini tidak membuktikan alignment, readiness, legal applicability, compliance, atau Gate approval. **G1 tetap tanpa disposition.**

## 28. Assumptions, Constraints, dan Evidence Pending

- Model aktual hanya dibuat setelah mandat tersendiri.
- Supporting context digunakan melalui artefak Approved terkait dan link, tanpa mengubahnya menjadi dependency normatif.
- Assignment program-level dan institutional/statutory authority mengikuti status Evidence Pending sebagaimana sumbernya.
- Mapping proses baru terhadap lifecycle, requirement, control, evidence, atau authority tidak diasumsikan verified.
- AIR, ARISK, COMP, dan exception tidak ditutup oleh standard ini.
- Tidak ada SLA, target, threshold, regulator, legal opinion, atau klaim implementasi yang ditetapkan.

## 29. Batas Kewenangan AI

AI dapat membantu menata model, metadata, link, dan candidate relationship dari sumber yang diizinkan. AI tidak menetapkan proses aktual, SOP, manusia/unit, authority, legal applicability, compliance, verifier, control owner, risk acceptance, exception approval, document approval, maupun Gate disposition. Keluaran AI tetap memerlukan review manusia berwenang sesuai governance.

## 30. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | ChatGPT Work | Disusun dan diperbarui sesuai review | Selesai | 2026-08-04 |
| Chief Enterprise Architect | ChatGPT | Direview, ditetapkan final, dan disahkan berdasarkan standing delegation | Selesai | 2026-08-04 |
| Delegation authority | Project Owner — Fahmi Alhabsi | Standing delegation melalui EA-007 Version 1.1.0 | Tercatat | 2026-08-04 |

## 31. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-04 | Penyusunan awal Business Process Modeling Standard sebagai deliverable EA-017 berdasarkan Master Roadmap Seq 17 dan dependency ARCH-BUS-001. | ChatGPT Work | Draft for Review |
| 0.1.0 | 2026-08-04 | Review CEA menetapkan REVISIONS REQUIRED karena terdapat ketidaktepatan identifier dan nama artefak pada Traceability Dokumen, belum tercatatnya CONFORMS_TO terhadap Traceability Standard, penggunaan relationship yang belum terbukti kanonis, kedudukan notasi BPMN yang ambigu, dan typo institutional/statutory authority. | ChatGPT | Revisions Required |
| 0.2.0 | 2026-08-04 | Koreksi identifier dan nama artefak traceability, penambahan hubungan CONFORMS_TO terhadap GOV-EA-006, penyesuaian supporting context menggunakan vocabulary kanonis, penetapan notasi sebagai BPMN-inspired internal modeling subset, dan koreksi typo authority. | ChatGPT Work | Draft for Review |
| 1.0.0 | 2026-08-04 | Review final PASSED dan finalisasi administratif sebagai Official Business Process Modeling Standard berdasarkan standing delegation. Finalisasi tidak mengubah hierarchy L0–L3, jenis/view model, identifier pattern, BPMN-inspired internal modeling subset, traceability minimum set, quality rules, validation checklist, authority boundary, dependency, Evidence Pending, REG-08, COMP-007, AIR, ARISK, COMP, exception, atau G1. | ChatGPT | Approved |

## Traceability Dokumen

| Source | Relationship | Target | Kedudukan |
| --- | --- | --- | --- |
| STD-BUS-001 | DEPENDS_ON | ARCH-BUS-001 — Business Architecture Overview | Documented Current berdasarkan Master Roadmap; dependency normatif tunggal. |
| STD-BUS-001 | CONFORMS_TO | GOV-REP-001 — Repository Structure | Documented Current. |
| STD-BUS-001 | CONFORMS_TO | GOV-EA-005 — Architecture Review and Gate Standard | Documented Current. |
| STD-BUS-001 | CONFORMS_TO | GOV-EA-006 — Traceability Standard | Documented Current. |
| STD-BUS-001 | DERIVED_FROM | ARCH-BUS-001 — Business Architecture Overview | Documented Current. |

BP-BUS-001 sampai BP-BUS-005 dan REF-BUS-001 dipertahankan sebagai supporting context pada §3 dan bagian terkait. Tidak ada relationship record dibuat untuk mereka karena tidak ada relationship kanonis yang tepat dan terbukti sesuai untuk kedudukan supporting context tersebut.

Tabel ini bukan Canonical Traceability Matrix dan tidak menetapkan authority, legal applicability, compliance, verification, atau Gate disposition.

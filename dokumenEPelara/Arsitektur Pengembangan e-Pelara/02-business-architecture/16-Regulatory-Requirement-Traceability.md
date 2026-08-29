---
document_id: BP-BUS-005
title: Regulatory Requirement Traceability
system: e-PeLARA Next Generation
classification: Business Architecture Blueprint
domain: Business Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Chief Enterprise Architect under standing delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
effective_date: 2026-08-04
roadmap_dependency:
  - Compliance Register
  - Planning-to-Accountability Value Streams
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
intended_repository_path: 02-business-architecture/16-Regulatory-Requirement-Traceability.md
gate: G1 — Business and Regulatory Alignment
review_outcome: PASSED
---

# Regulatory Requirement Traceability

## 1. Tujuan dan Kedudukan

`BP-BUS-005` adalah blueprint traceability domain Business Architecture untuk menghubungkan secara terkendali sumber regulasi, record requirement pada Compliance Register, applicability, capability, value-stream stage, lifecycle dan decision context, control/evidence expectation, verification context, serta relevansi Gate.

Dokumen ini adalah **Official Regulatory Requirement Traceability** untuk G1 — Business and Regulatory Alignment. Approval dokumen tidak menetapkan legal applicability, compliance, evidence sufficiency, verification, atau disposition G1; G1 tetap tanpa disposition. Dokumen ini bukan legal opinion, penetapan legal applicability, compliance determination, register regulasi tandingan, control catalog, test plan, SOP, RACI, maupun Gate disposition.

## 2. Ruang Lingkup

Blueprint ini memetakan record `COMP-001` sampai `COMP-011` yang telah memiliki dasar pada Compliance Register. Hubungan regulatory source `REG-xx` dengan requirement record `COMP-xxx` yang sudah dicatat pada Compliance Register merupakan **Documented Current relationship** sebagai fakta pencatatan register. Kedudukan Documented Current tersebut tidak membuktikan legal applicability, compliance, kecukupan evidence, atau verification.

Mapping baru dari requirement menuju capability, value-stream stage, lifecycle, dan role/authority tetap merupakan **Candidate relationship** sampai evidence, authority, dan verification yang diperlukan tersedia. Seluruh candidate mapping tetap Evidence Pending dan belum Verified.

Dokumen tidak menetapkan bahwa regulasi yang tercantum berlaku untuk konteks tertentu, requirement telah dipenuhi, control telah diimplementasikan, evidence telah cukup, atau G1 telah memperoleh disposition.

## 3. Sumber Otoritatif dan Dependency

| Sumber atau dependency | Kedudukan |
| --- | --- |
| `00-Architecture-Charter.md` | Prinsip Enterprise Architecture, boundary, dan One Data, Many Publications. |
| `01-Repository-Structure.md` | Klasifikasi, penamaan, lokasi artefak, dan traceability repository. |
| `03-Architecture-Issue-Register.md`, `04-Architecture-Risk-Register.md`, `05-Compliance-Register.md` | Sumber status issue, risk, regulatory source, requirement record, applicability, control/evidence expectation, dan exception yang berlaku. |
| `07-Architecture-Governance-Operating-Model.md`, `08-Architecture-Review-and-Gate-Standard.md`, `09-Traceability-Standard.md` | Batas authority, review, Gate, dan vocabulary relationship kanonis. |
| `02-Enterprise-Architecture-Roadmap.md` | Seq 16, dependency Compliance Register dan Value Streams, serta relevansi G1. |
| `ARCH-BUS-001`, `BP-BUS-001`, `BP-BUS-002`, `BP-BUS-003`, `BP-BUS-004`, `REF-BUS-001` | Konteks business architecture, capability, value stream, lifecycle, role/authority, dan vocabulary. |
| Official Current State Baseline | Konteks current state yang telah tercatat; tidak diaudit ulang oleh blueprint ini. |

## 4. Prinsip Regulatory Traceability

1. Compliance Register tetap menjadi sumber status regulasi, applicability, compliance, exception, control/evidence expectation, dan authority context.
2. Sumber regulasi dipisahkan dari record requirement, interpretation, applicability, control, evidence, verification, dan decision authority.
3. Candidate relationship tidak mengubah status objek sumber atau target dan belum Verified.
4. Approval register atau approval dokumen tidak membuktikan requirement terpenuhi dan bukan disposition Gate.
5. Exception Approved, bila tercatat pada register resmi, menuju Monitoring dan tidak otomatis compliant atau closed.
6. Review outcome `PASSED`, `REVISIONS REQUIRED`, atau `BLOCKED` bukan Gate disposition.
7. Prinsip One Data, Many Publications dipertahankan tanpa menyatakan data owner, control, atau publication authority telah ditetapkan.

## 5. Istilah dan Definisi

| Istilah | Definisi dalam blueprint |
| --- | --- |
| Regulatory source | Sumber regulasi dengan identifier `REG-xx` yang telah tercatat pada Compliance Register. |
| Requirement record | Record `COMP-xxx` pada Compliance Register yang menyatakan kebutuhan dan konteks assessment; bukan penetapan legal opinion baru. |
| Applicability status | Status applicability yang tercatat pada Compliance Register dan terpisah dari compliance status. |
| Control expectation | Harapan control yang dicatat pada `COMP-xxx`; bukan control catalog atau klaim control telah tersedia. |
| Evidence requirement | Bukti yang diperlukan menurut `COMP-xxx`; dapat tetap Evidence Pending. |
| Verification context | Kebutuhan review/verifikasi yang belum menghasilkan status verifikasi positif tanpa evidence dan verifier sah. |
| Candidate relationship | Hubungan draft menggunakan vocabulary EA-009 yang belum Verified. |

## 6. Traceability Metamodel

Alur konseptualnya adalah: **Regulatory source → Requirement record → Applicability status → Candidate capability/value-stream mapping → Lifecycle or decision context → Control/evidence expectation → Verification context → Gate relevance**.

Setiap dimensi pada metamodel dicatat terpisah. Lifecycle status, evidence status, verification status, compliance status, review outcome, document approval, dan Gate disposition tidak dapat saling menggantikan.

## 7. Identifier dan Relationship Standard

Blueprint hanya menggunakan identifier yang sudah ada: `REG-01`–`REG-16`, `COMP-001`–`COMP-011`, `CAP-*`, `VST-PTA-*`, `DLC-PH-*`, `RAP-ROLE-*`, `RAP-DEC-*`, `AIR-*`, dan `ARISK-*`. Tidak ada identifier requirement, control, test, verifier, atau authority baru.

| Relationship kanonis EA-009 | Penggunaan dalam blueprint |
| --- | --- |
| `DERIVED_FROM` | `COMP-xxx DERIVED_FROM REG-xx` merepresentasikan hubungan sumber yang telah dicatat pada Compliance Register. Kedudukan hubungan pencatatan dapat Documented Current, sedangkan legal applicability, compliance, evidence sufficiency, dan verification tetap mengikuti status masing-masing serta tidak otomatis positif. |
| `ADDRESSES` | Hanya untuk candidate mapping capability, stage, lifecycle, role/authority, issue, atau konteks lain yang belum Verified. |
| `DEPENDS_ON` | Blueprint bergantung pada Compliance Register dan Value Streams sesuai Roadmap. |
| `REQUIRED_FOR_GATE` | Evidence yang masih diperlukan dapat menjadi input Gate bila ditetapkan oleh sumber resmi. |

Tidak ada Canonical Traceability Matrix yang dibentuk oleh dokumen ini.

## 8. Regulatory Source View

| Regulatory source | Nama tercatat | Status regulasi tercatat | Kedudukan pada blueprint |
| --- | --- | --- | --- |
| REG-01 | UU No. 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional | Berlaku | Source untuk COMP-001. |
| REG-02 | Permendagri No. 86 Tahun 2017 | Berlaku | Source untuk COMP-001. |
| REG-03 | PP No. 12 Tahun 2019 | Berlaku | Source untuk COMP-002. |
| REG-04 | Permendagri No. 70 Tahun 2019 | Berlaku | Source untuk COMP-003. |
| REG-05 | Permendagri No. 90 Tahun 2019 | Berlaku | Source untuk COMP-004. |
| REG-06 | Perpres No. 29 Tahun 2014 | Berlaku | Source untuk COMP-005. |
| REG-07 | Perpres No. 95 Tahun 2018 | Berlaku | Source untuk COMP-006. |
| REG-08 | Perpres No. 39 Tahun 2019 tentang Satu Data Indonesia | Under Regulatory Status Verification | Source untuk COMP-007; status harus dipertahankan. |
| REG-09 | PP No. 71 Tahun 2019 | Berlaku | Source untuk COMP-008 dan COMP-009. |
| REG-10 | UU No. 27 Tahun 2022 | Berlaku | Source untuk COMP-008. |
| REG-11 | UU No. 43 Tahun 2009 | Berlaku | Source untuk COMP-009. |
| REG-12 | UU No. 14 Tahun 2008 | Berlaku | Source untuk COMP-010. |
| REG-13 | PP No. 61 Tahun 2010 | Berlaku | Source untuk COMP-010. |
| REG-14 | UU No. 8 Tahun 2016 | Berlaku | Source untuk COMP-011. |
| REG-15 | Permendagri No. 77 Tahun 2020 | Berlaku | Source untuk COMP-002. |
| REG-16 | Perpres No. 132 Tahun 2022 | Berlaku | Source untuk COMP-006. |

## 9. Requirement Traceability View

| Requirement record | Regulatory source | Applicability status | Compliance status | Control/evidence expectation | Verification context | Gate relevance |
| --- | --- | --- | --- | --- | --- |
| COMP-001 | REG-01, REG-02 | Applicable menurut Compliance Register | Gap Identified | Mapping requirement-data-output, keputusan temporal, dan contoh output. | Review regulasi dan traceability; authority belum ditetapkan. | G2; sebelum G2. |
| COMP-002 | REG-03, REG-15 | Under Applicability Assessment | Under Applicability Assessment | Regulatory control mapping, approval lifecycle, dan output teruji. | Review pejabat keuangan berwenang; Evidence Pending. | G3; sebelum G3. |
| COMP-003 | REG-04 | Applicable menurut Compliance Register | Gap Identified | Blueprint, status akses, dan kontrak bila ada. | Review integrasi dan pejabat berwenang; Evidence Pending. | G3; sebelum G3. |
| COMP-004 | REG-05 | Under Applicability Assessment | Under Applicability Assessment | Katalog reference, versi, dan perubahan. | Rekonsiliasi dengan sumber resmi; Evidence Pending. | G2; sebelum G2. |
| COMP-005 | REG-06 | Under Applicability Assessment | Under Applicability Assessment | Mapping, lineage, dan sample laporan. | Review pejabat kinerja berwenang; Evidence Pending. | G2; sebelum G2. |
| COMP-006 | REG-07, REG-16 | Under Applicability Assessment | Under Applicability Assessment | Arsitektur/kebijakan berwenang, traceability, dan gate record. | Review SPBE atau pejabat berwenang; Evidence Pending. | G1; sebelum G1. |
| COMP-007 | REG-08 | Under Applicability Assessment | Under Applicability Assessment | Legal verification status, katalog, metadata, lineage, dan ownership. | Review data governance dan pejabat berwenang; Evidence Pending. | G2; sebelum G2. |
| COMP-008 | REG-09, REG-10 | Under Applicability Assessment | Under Applicability Assessment | Klasifikasi data, control design, dan test evidence. | Security review oleh fungsi berwenang; Evidence Pending. | G3; sebelum G3. |
| COMP-009 | REG-11, REG-09 | Under Applicability Assessment | Under Applicability Assessment | Klasifikasi, jadwal retensi, dan kebijakan tanda tangan. | Review unit kearsipan atau pejabat berwenang; Evidence Pending. | G3; sebelum G3. |
| COMP-010 | REG-12, REG-13 | Under Applicability Assessment | Under Applicability Assessment | Klasifikasi, approval, dan register publikasi. | Review PPID atau pejabat berwenang; Evidence Pending. | G4; sebelum G4. |
| COMP-011 | REG-14 | Candidate | Candidate | Assessment, design criteria, dan test record. | Review aksesibilitas oleh fungsi berwenang; Evidence Pending. | G3; sebelum G3. |

`REG-08` tetap **Under Regulatory Status Verification**. `COMP-007` tetap **Under Applicability Assessment**; tidak ada legal applicability atau compliance determination yang dibuat oleh blueprint ini.

## 10. Requirement-to-Capability Mapping

| Capability source | Relationship | Requirement target | Kedudukan relasi | Evidence status | Verification status |
| --- | --- | --- | --- | --- | --- |
| CAP-PLN-01, CAP-PLN-02, CAP-PLN-03, CAP-CMP-01 | ADDRESSES | COMP-001 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-BDG-01, CAP-BDG-02, CAP-BDG-03, CAP-EXE-01, CAP-EXE-02, CAP-CMP-01 | ADDRESSES | COMP-002 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-GOV-01, CAP-DKM-01, CAP-CMP-01 | ADDRESSES | COMP-003 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-DKM-02, CAP-CMP-01 | ADDRESSES | COMP-004 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-PRF-01, CAP-EVR-01, CAP-EVR-02, CAP-CMP-01 | ADDRESSES | COMP-005 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-GOV-01, CAP-GOV-02, CAP-CMP-01, CAP-CMP-02, CAP-CMP-03 | ADDRESSES | COMP-006 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-DKM-01, CAP-DKM-03, CAP-CMP-01, CAP-CMP-02 | ADDRESSES | COMP-007 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-CMP-01, CAP-CMP-02 | ADDRESSES | COMP-008 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-PUB-01, CAP-PUB-02, CAP-CMP-01 | ADDRESSES | COMP-009 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-PUB-03, CAP-CMP-01, CAP-CMP-03 | ADDRESSES | COMP-010 | Candidate relationship | Evidence Pending | Evidence Pending |
| CAP-PUB-01, CAP-PUB-03, CAP-CMP-01 | ADDRESSES | COMP-011 | Candidate relationship | Evidence Pending | Evidence Pending |

## 11. Requirement-to-Value-Stream Mapping

| Value-stream stage source | Relationship | Requirement target | Kedudukan relasi | Evidence status | Verification status |
| --- | --- | --- | --- | --- | --- |
| VST-PTA-02 | ADDRESSES | COMP-001 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-03, VST-PTA-04 | ADDRESSES | COMP-002 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-01 | ADDRESSES | COMP-003 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-01, VST-PTA-03 | ADDRESSES | COMP-004 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-05, VST-PTA-06 | ADDRESSES | COMP-005 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-01, VST-PTA-08 | ADDRESSES | COMP-006 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-01, VST-PTA-07 | ADDRESSES | COMP-007 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-01 | ADDRESSES | COMP-008 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-07 | ADDRESSES | COMP-009 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-07 | ADDRESSES | COMP-010 | Candidate relationship | Evidence Pending | Evidence Pending |
| VST-PTA-07 | ADDRESSES | COMP-011 | Candidate relationship | Evidence Pending | Evidence Pending |

## 12. Requirement-to-Document-Lifecycle Interface

| Lifecycle source | Relationship | Requirement target | Kedudukan relasi | Interface context | Evidence status | Verification status |
| --- | --- | --- | --- | --- | --- | --- |
| DLC-PH-01, DLC-PH-03 | ADDRESSES | COMP-001 | Candidate relationship | Context, review, dan temporal evidence. | Evidence Pending | Evidence Pending |
| DLC-PH-01–05 | ADDRESSES | COMP-002 | Candidate relationship | RKA/DPA context, review, dan controlled-use context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-04 | ADDRESSES | COMP-003 | Candidate relationship | Integration context, review, dan decision record context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03 | ADDRESSES | COMP-004 | Candidate relationship | Reference-data context dan review context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-06 | ADDRESSES | COMP-005 | Candidate relationship | Indicator, report, monitoring, and publication-use context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-04 | ADDRESSES | COMP-006 | Candidate relationship | Governance, review, dan decision record context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-06 | ADDRESSES | COMP-007 | Candidate relationship | Data/metadata/lineage context dan review. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-04 | ADDRESSES | COMP-008 | Candidate relationship | Classification, review, dan decision record context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-05, DLC-PH-08 | ADDRESSES | COMP-009 | Candidate relationship | Record, controlled-use, dan archival context. | Evidence Pending | Evidence Pending |
| DLC-PH-03, DLC-PH-05, DLC-PH-06 | ADDRESSES | COMP-010 | Candidate relationship | Review, publication authorization, dan publication-use context. | Evidence Pending | Evidence Pending |
| DLC-PH-01, DLC-PH-03, DLC-PH-06 | ADDRESSES | COMP-011 | Candidate relationship | Accessibility assessment, review, dan publication-use context. | Evidence Pending | Evidence Pending |

Lifecycle interface tidak menyatakan transition otomatis, document approval, effective status, retention rule, atau disposal decision.

## 13. Requirement-to-Role/Authority Interface

| Role or decision context | Relationship | Requirement target | Kedudukan relasi | Authority status | Verification status | Batasan |
| --- | --- | --- | --- | --- | --- | --- |
| RAP-ROLE-02, RAP-ROLE-04, RAP-ROLE-05, RAP-ROLE-07; RAP-DEC-03–05 | ADDRESSES | COMP-001 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Bukan penetapan legal applicability atau approver. |
| RAP-ROLE-02, RAP-ROLE-04, RAP-ROLE-05, RAP-ROLE-07; RAP-DEC-03–05 | ADDRESSES | COMP-002 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Bukan penetapan pejabat keuangan. |
| RAP-ROLE-01, RAP-ROLE-07, RAP-ROLE-12 | ADDRESSES | COMP-003 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Bukan penetapan integration authority. |
| RAP-ROLE-06, RAP-ROLE-12 | ADDRESSES | COMP-004 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan data owner atau nomenclature authority. |
| RAP-ROLE-04, RAP-ROLE-05, RAP-ROLE-12 | ADDRESSES | COMP-005 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan verifier atau acceptance authority. |
| RAP-ROLE-01, RAP-ROLE-12, RAP-ROLE-13 | ADDRESSES | COMP-006 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Architecture review bukan Gate disposition. |
| RAP-ROLE-06, RAP-ROLE-12 | ADDRESSES | COMP-007 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan data ownership atau legal status REG-08. |
| RAP-ROLE-12; RAP-DEC-04–05 | ADDRESSES | COMP-008 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan security verifier atau compliance authority. |
| RAP-ROLE-09, RAP-ROLE-10, RAP-ROLE-12; RAP-DEC-08, RAP-DEC-11 | ADDRESSES | COMP-009 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan records authority atau retention rule. |
| RAP-ROLE-09, RAP-ROLE-12; RAP-DEC-08 | ADDRESSES | COMP-010 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan PPID atau publication authority. |
| RAP-ROLE-09, RAP-ROLE-12 | ADDRESSES | COMP-011 | Candidate relationship | To be designated or verified by competent institutional authority — Evidence Pending | Evidence Pending | Tidak menetapkan accessibility authority. |

Assignment program-level yang belum tersedia menggunakan `To be assigned by Project Owner` pada artefak sumber. Blueprint ini tidak mengubah assignment tersebut atau menetapkan institutional/statutory authority.

## 14. Control dan Evidence Expectation

Control expectation dan evidence requirement berasal dari field `Control/Evidence` pada Compliance Register. Blueprint ini tidak membentuk control catalog atau test plan baru.

| Kelompok requirement | Control/evidence expectation yang tercatat | Status evidence |
| --- | --- | --- |
| COMP-001–COMP-006 | Mapping, lineage, source/version, review, dan record sesuai requirement record terkait. | Evidence Pending atau status register terkait. |
| COMP-007 | Legal verification status REG-08, katalog, metadata, lineage, dan ownership. | Evidence Pending. |
| COMP-008–COMP-011 | Klasifikasi, control design/criteria, review, dan record sesuai scope requirement. | Evidence Pending. |

## 15. Applicability dan Verification Status

| Dimensi | Kedudukan |
| --- | --- |
| Regulatory status REG-08 | Under Regulatory Status Verification. |
| Applicability COMP-007 | Under Applicability Assessment. |
| Applicability COMP-002, COMP-004–COMP-010 | Tetap mengikuti status `Under Applicability Assessment` pada Compliance Register. |
| Applicability COMP-011 | Candidate pada Compliance Register. |
| Verification status seluruh candidate mapping | Evidence Pending; belum Verified. |
| Compliance status | Tetap mengikuti Compliance Register; blueprint tidak menentukan compliant/non-compliant. |
| Review outcome | Terpisah dari Gate disposition. |
| Document approval dan Gate disposition | Tidak ditetapkan oleh blueprint ini; G1 tetap tanpa disposition. |

## 16. Gap, Conflict, dan Evidence Pending

| Referensi | Gap atau conflict | Kedudukan |
| --- | --- | --- |
| REG-08, COMP-007 | Status regulasi dan applicability Satu Data Indonesia memerlukan verifikasi legal. | Under Regulatory Status Verification dan Under Applicability Assessment; Evidence Pending. |
| AIR-001, ARISK-001, COMP-001 | Siklus Renstra 5/6 tahun kontradiktif. | Tetap terbuka; blueprint tidak menetapkan temporal rule. |
| AIR-010, ARISK-007, COMP-006, COMP-007 | Current state, target, dan evidence level perlu dipisahkan konsisten. | Tetap terbuka; tidak ada status verifikasi positif. |
| COMP-002–COMP-011 | Pasal/lampiran, control, authority, dan evidence rinci belum tersedia sesuai scope masing-masing. | Evidence Pending; tindak lanjut mengikuti register dan Master Roadmap. |

## 17. Hubungan dengan Issue, Risk, dan Compliance Register

| Source/context | Relationship kanonis | Target | Kedudukan |
| --- | --- | --- |
| BP-BUS-005 | DEPENDS_ON | Compliance Register | Dependency Roadmap; register tetap sumber status resmi. |
| CAP-PLN-01, CAP-PLN-03 | ADDRESSES | AIR-001 | Candidate relationship; AIR-001 tidak ditutup. |
| CAP-DKM-01, CAP-DKM-03, CAP-CMP-02 | ADDRESSES | AIR-010 | Candidate relationship; AIR-010 tidak ditutup. |
| BP-BUS-005 | DEPENDS_ON | BP-BUS-002 | Dependency Roadmap; value-stream status tidak berubah. |

`ARISK-001` dan `ARISK-007` hanya dirujuk sebagai risk context pada §16 dan tidak dicatat sebagai formal dependency atau relationship BP-BUS-005. Tidak ada risk acceptance, treatment completion, atau closure yang dinyatakan oleh blueprint ini.

## 18. Hubungan dengan Domain Arsitektur Lain

Blueprint menyediakan input traceability untuk domain Data and Knowledge, Application/Integration, Security/Privacy, Technology, Publishing, dan AI bila artefak lanjutan telah dimandatkan oleh Master Roadmap. Blueprint ini tidak memulai artefak domain lain, menetapkan interface implementasi, atau mengubah dependency/Gate mereka.

## 19. Traceability

| Source | Relationship | Target | Kedudukan relasi | Evidence status | Verification status |
| --- | --- | --- | --- | --- | --- |
| BP-BUS-005 | DERIVED_FROM | Compliance Register | Draft blueprint relationship | Documented Current | Evidence Pending |
| BP-BUS-005 | DEPENDS_ON | Compliance Register | Dependency Roadmap; berbeda dari `DERIVED_FROM` yang menjelaskan asal substansi | Documented Current | Evidence Pending |
| BP-BUS-005 | DEPENDS_ON | BP-BUS-002 | Draft blueprint relationship | Documented Current | Evidence Pending |
| COMP-001 | DERIVED_FROM | REG-01, REG-02 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-002 | DERIVED_FROM | REG-03, REG-15 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-003 | DERIVED_FROM | REG-04 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-004 | DERIVED_FROM | REG-05 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-005 | DERIVED_FROM | REG-06 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-006 | DERIVED_FROM | REG-07, REG-16 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-007 | DERIVED_FROM | REG-08 | Documented Current relationship recorded in Compliance Register; regulatory status remains Under Regulatory Status Verification | Evidence Pending | Evidence Pending |
| COMP-008 | DERIVED_FROM | REG-09, REG-10 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-009 | DERIVED_FROM | REG-11, REG-09 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-010 | DERIVED_FROM | REG-12, REG-13 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |
| COMP-011 | DERIVED_FROM | REG-14 | Documented Current relationship recorded in Compliance Register | Documented Current | Evidence Pending |

Tabel ini bukan Canonical Traceability Matrix. Documented Current hanya membuktikan hubungan REG–COMP tersebut tercatat dalam Compliance Register, bukan legal applicability, compliance, evidence sufficiency, atau verification. Candidate relationship pada §10–§13 tetap Evidence Pending. Tidak ada relationship pada tabel ini yang menetapkan authority atau Gate disposition.

## 20. Kontribusi terhadap G1

Blueprint menyediakan struktur evidence untuk menilai keterlacakan Business and Regulatory Alignment. Kontribusi ini tidak membuktikan regulatory alignment atau readiness G1. Approval dokumen ini tidak menetapkan disposition G1, dan G1 tetap tanpa disposition.

## 21. Assumptions, Constraints, dan Evidence Pending

- Sumber regulasi, status, dan requirement record dibatasi pada Compliance Register dan rujukan resmi yang telah dicatat di sana.
- Legal applicability, pasal/lampiran rinci, authority, control owner, verifier, dan evidence provider tidak disimpulkan oleh blueprint.
- Institutional/statutory authority yang belum terbukti ditandai `To be designated or verified by competent institutional authority — Evidence Pending`.
- Assignment program-level yang belum ditetapkan tetap menggunakan `To be assigned by Project Owner` pada artefak sumber yang relevan.
- AI tidak menghitung atau menetapkan angka resmi, dan tidak menyimpulkan informasi hukum material.

## 22. Batas Kewenangan AI

AI dapat membantu menata kandidat mapping dan menyajikan traceability dari sumber yang diizinkan. AI tidak dapat menetapkan legal applicability, compliance, exception approval, risk acceptance, control owner, data owner, verifier, institutional authority, document approval, atau Gate disposition.

## 23. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | ChatGPT Work | Disusun dan diperbarui sesuai review | Selesai | 2026-08-04 |
| Chief Enterprise Architect | ChatGPT | Direview, ditetapkan final, dan disahkan berdasarkan standing delegation | Selesai | 2026-08-04 |
| Delegation authority | Project Owner — Fahmi Alhabsi | Standing delegation melalui EA-007 Version 1.1.0 | Tercatat | 2026-08-04 |

## 24. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-04 | Penyusunan awal Regulatory Requirement Traceability | ChatGPT Work | Draft for Review |
| 0.1.0 | 2026-08-04 | Review CEA menetapkan REVISIONS REQUIRED untuk memisahkan hubungan resmi Compliance Register dari candidate mapping dan mengoreksi penggunaan dependency terhadap Architecture Risk. | ChatGPT | Revisions Required |
| 0.2.0 | 2026-08-04 | Revisi sesuai review CEA: hubungan REG–COMP dinyatakan Documented Current sebagai pencatatan register, candidate mapping tetap Evidence Pending, dan ARISK tidak lagi diperlakukan sebagai dependency normatif Roadmap. | ChatGPT Work | Draft for Review |
| 1.0.0 | 2026-08-04 | Review final PASSED; finalisasi administratif menjadi Approved sebagai Official Regulatory Requirement Traceability berdasarkan standing delegation EA-007 Version 1.1.0. Tidak mengubah 16 regulatory source, 11 requirement record, 11 Documented Current relationship REG–COMP, 44 Candidate relationship, REG-08, COMP-007, Evidence Pending, AIR, ARISK, exception, authority, atau G1. | ChatGPT | Approved |

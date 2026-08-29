---
document_id: REG-EA-MASTER-001
title: Master Artifact Register
system: e-PeLARA Next Generation
classification: Architecture Governance — Inventory Register
domain: Enterprise Architecture
version: 1.0.5
status: Draft for Review
prepared_by: Claude Work (Acting Chief Enterprise Architect, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10)
effective_date: null
review_outcome: Pending
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
intended_repository_path: 11-roadmaps/00-Master-Artifact-Register.md
generated_date: 2026-08-05
last_updated: 2026-08-06 (§17d addendum kelima)
---

# Master Artifact Register — e-PeLARA Next Generation

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **inventarisasi status seluruh 75 artefak** (Seq 00–74) pada Master Document Sequence Enterprise Architecture Roadmap (`RM-EA-001`, Version 1.0.0, Approved), disusun sesuai HANDOFF-e-PeLARA-EA-2026-08-05-v10 §4.1 sebagai bagian dari Fase 1 (Establish Control Plane).

Register ini **bukan** artefak governance normatif baru, **bukan** pengganti Roadmap, Enterprise Change Log, atau Architecture Issue Register, dan **tidak** menetapkan prioritas, keputusan, disposisi Gate, atau otoritas apa pun. Register hanya mencatat state faktual yang diverifikasi langsung terhadap file repository pada 2026-08-05.

Status **Draft for Review**; version 1.0.0; effective_date null; review_outcome Pending — sesuai mandat draft-only untuk artefak baru yang belum melalui review/finalisasi terpisah.

## 2. Metodologi Verifikasi

Setiap baris diverifikasi terhadap dua sumber: (a) Master Document Sequence pada `RM-EA-001` §6.1–§6.8 untuk Seq/Document ID/Dependency/Gate/Prioritas; dan (b) pembacaan langsung front-matter (`document_id`, `version`, `status`, `effective_date`) file fisik yang ada di repository pada tanggal generate. Kolom **File Ada** menyatakan apakah file fisik ditemukan pada path yang diharapkan Repository Structure Standard. Kolom **Evidence** mencatat sumber pembacaan; tidak ada status yang diasumsikan tanpa pembacaan langsung.

Artefak tanpa front-matter metadata standar (mis. Architecture Charter, lima Official Current State Baseline) dicatat versi/status dari body teks dokumen bila tersedia secara eksplisit, dan ditandai pada kolom Catatan.

## 3. Register — Foundation and Governance Documents (Seq 00–09)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Effective Date | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | GOV-EA-001 | `00-Architecture-Charter.md` | Ya | 1.0.1 (dari body teks; tidak ada front-matter YAML) | Approved (Official Architecture Constitution) | 2026-08-04 | G0 | Metadata dibaca dari body dokumen, bukan front-matter. |
| 01 | GOV-REP-001 | `01-Repository-Structure.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G0 | — |
| 02 | RM-EA-001 | `02-Enterprise-Architecture-Roadmap.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G0 | Dibaca penuh (843 baris) pada Fase 1 inventarisasi. |
| 03 | AIR-EA-001 | `Architecture-Issue-Register.md` | Ya (path aktual: `00-governance/03-Architecture-Issue-Register.md`) | 1.0.2 | Approved | 2026-08-04 | G0–G6 | AIR-001 Resolved per 2026-08-05 (ADR-0001 Accepted); 9 issue lain (AIR-002–010) belum berubah status sejak v1.0.1. |
| 04 | GOV-EA-002 | `Architecture-Risk-Register.md` | Ya (path aktual: `00-governance/04-Architecture-Risk-Register.md`) | 1.0.1 | Approved | 2026-08-04 | G0–G6 | Isi tidak dibaca ulang pada sesi ini; version/status dari front-matter. |
| 05 | GOV-COMP-001 | `Compliance-Register.md` | Ya (path aktual: `00-governance/05-Compliance-Register.md`) | 1.0.0 | Approved | 2026-08-04 | G1–G6 | Isi tidak dibaca ulang pada sesi ini. |
| 06 | GOV-EA-003 | `Change-Log.md` | Ya (path aktual: `00-governance/06-Change-Log.md`) | 1.0.16 | Approved | 2026-08-04 | G0–G6 | ECHG-001 s.d. ECHG-029 tercatat (29 entri unik). |
| 07 | GOV-EA-004 | `Architecture-Governance-Operating-Model.md` | Ya | 1.1.0 | Approved | 2026-08-04 | G1 | Standing delegation CEA tercatat pada versi ini. |
| 08 | GOV-EA-005 | `Architecture-Review-and-Gate-Standard.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 09 | GOV-EA-006 | `Traceability-Standard.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | Vocabulary GOV-EA-006 dipakai BP-DATA-001/BP-DATA-002 §26/§34. |

## 4. Register — Business Architecture Documents (Seq 10–17)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Effective Date | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | ARCH-BUS-001 | `Business-Architecture-Overview.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 11 | BP-BUS-001 | `Business-Capability-Map.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 12 | BP-BUS-002 | `Planning-to-Accountability-Value-Streams.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 13 | BP-BUS-003 | `Government-Document-Lifecycle-Blueprint.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 14 | BP-BUS-004 | `Roles-Authority-and-Approval-Blueprint.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 15 | REF-BUS-001 | `Business-Glossary.md` | Ya (path aktual: `03-data-architecture/business-glossary/15-Business-Glossary.md`) | 1.0.0 | Approved | 2026-08-04 | G1–G2 | Lokasi fisik berada di bawah `03-data-architecture/business-glossary/`, bukan `02-business-architecture/`; evidence pending untuk alasan penempatan lintas-folder ini. |
| 16 | BP-BUS-005 | `Regulatory-Requirement-Traceability.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G1 | — |
| 17 | STD-BUS-001 | `Business-Process-Modeling-Standard.md` | Ya (path aktual: `10-standards/17-Business-Process-Modeling-Standard.md`) | 1.0.0 | Approved | 2026-08-04 | G1 | Lokasi fisik di `10-standards/`, bukan `02-business-architecture/`. |

## 5. Register — Data and Knowledge Architecture Documents (Seq 18–28)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Effective Date | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | ARCH-DATA-001 | `Enterprise-Data-Architecture.md` | Ya | 1.0.0 | Approved | 2026-08-04 | G2 | — |
| 19 | BP-DATA-001 | `Enterprise-Data-Domain-Model.md` | Ya | 1.0.0 | Approved | 2026-08-05 | G2 | Administrative patch 2026-08-05 memperbarui referensi AIR-001/ADR-0001 (versi tidak dibump). |
| 20 | BP-DATA-002 | `Master-and-Reference-Data-Blueprint.md` | Ya | 1.0.0 | Approved | 2026-08-05 | G2 | Administrative patch 2026-08-05 memperbarui referensi AIR-001/ADR-0001 (versi tidak dibump). |
| 21 | ADR-0001 | Temporal Model Decision | Ya (path aktual: `00-governance/adr/ADR-0001-Temporal-Model-Decision.md`) | 1.0.0 | **Accepted** | 2026-08-05 | G2 | Opsi C — Hybrid (siklus normatif 5 tahun + transition year kondisional tahun ke-6). AIR-001 Resolved sebagai konsekuensi. |
| 22 | BP-DATA-003 | `22-Data-Lineage-and-Traceability-Blueprint.md` | Ya (path aktual: `03-data-architecture/data-lineage/22-Data-Lineage-and-Traceability-Blueprint.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 23 | STD-DATA-001 | `23-Data-Quality-Standard.md` | Ya (path aktual: `03-data-architecture/data-quality/23-Data-Quality-Standard.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 24 | GOV-DATA-001 | `24-Data-Governance-Operating-Model.md` | Ya (path aktual: `03-data-architecture/data-governance/24-Data-Governance-Operating-Model.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 25 | STD-DATA-002 | `25-Data-Classification-Retention-and-Privacy-Standard.md` | Ya (path aktual: `03-data-architecture/data-governance/25-Data-Classification-Retention-and-Privacy-Standard.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 26 | BP-DATA-004 | `26-Enterprise-Knowledge-Model.md` | Ya (path aktual: `03-data-architecture/domain-models/26-Enterprise-Knowledge-Model.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 27 | BP-DATA-005 | `27-Government-Ontology-and-Taxonomy.md` | Ya (path aktual: `03-data-architecture/domain-models/27-Government-Ontology-and-Taxonomy.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 28 | GOV-AI-001 | `28-Knowledge-Lifecycle-and-Provenance-Standard.md` | Ya (path aktual: `03-data-architecture/data-governance/28-Knowledge-Lifecycle-and-Provenance-Standard.md`) | 1.0.0 | Approved | 2026-08-05 | G2 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |

## 6. Register — Application and Integration Architecture Documents (Seq 29–39)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 29 | ARCH-APP-001 | `29-Application-Architecture.md` | Ya (path aktual: `04-application-architecture/29-Application-Architecture.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 30 | REF-APP-001 | `30-Application-Portfolio-Catalog.md` | Ya (path aktual: `04-application-architecture/30-Application-Portfolio-Catalog.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 31 | BP-APP-001 | `31-Domain-and-Bounded-Context-Blueprint.md` | Ya (path aktual: `04-application-architecture/31-Domain-and-Bounded-Context-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 32 | BP-APP-002 | `32-Enterprise-Workflow-State-Model.md` | Ya (path aktual: `04-application-architecture/32-Enterprise-Workflow-State-Model.md`) | 0.2.0 | **Approved** | G3 | AIR-004 Resolved via ADR-0002; §7a (kewajiban kepatuhan modul baru) ditambahkan via ADR-0005. Disetujui Project Owner 2026-08-06, effective_date 2026-08-06. Lampiran teknis: 32a (Seq 32a). |
| 32a | BP-APP-002-ANNEX-01 | `32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md` | Ya (path aktual: `04-application-architecture/32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md`) | 0.1.0 | **Approved (governance); implementasi teknis: Partially Implemented** | G3 | Lampiran BP-APP-002 §7a.3. Governance Approved 2026-08-06. Eksekusi teknis dilakukan sesi coding terpisah (§8 opsi 2): Tahap 1 (lint rule) dan Tahap 3 (wiring pre-commit/guard/CI) dilaporkan Implemented dengan evidence; Tahap 2 (schema constraint) N/A — belum ada tabel qualifying. Evidence dilaporkan pelaksana implementasi, belum diverifikasi independen oleh Draft File Operator. Bukan bagian Master Document Sequence asli RM-EA-001 — lampiran teknis. |
| 33 | BP-APP-003 | `33-Application-Modularization-Blueprint.md` | Ya (path aktual: `04-application-architecture/33-Application-Modularization-Blueprint.md`) | 1.1.0 | Approved | G3 | v1.0.0 diverifikasi §17 addendum kedua; v1.1.0 menambahkan §6a (referensi kepatuhan modul baru) atas mandat ADR-0005, disetujui Project Owner 2026-08-06. Strategi modularisasi §6 asli tidak diubah. |
| 34 | ARCH-INT-001 | `34-Integration-Architecture.md` | Ya (path aktual: `05-integration-architecture/34-Integration-Architecture.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 35 | STD-INT-001 | `35-API-Design-and-Versioning-Standard.md` | Ya (path aktual: `05-integration-architecture/35-API-Design-and-Versioning-Standard.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 36 | STD-INT-002 | `36-Event-and-Notification-Standard.md` | Ya (path aktual: `05-integration-architecture/36-Event-and-Notification-Standard.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 37 | REF-INT-001 | `37-API-and-Event-Catalog.md` | Ya (path aktual: `05-integration-architecture/37-API-and-Event-Catalog.md`) | 1.0.0 | Approved | G3–G6 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 38 | BP-INT-001 | `38-SIPD-Integration-Blueprint.md` | Ya (path aktual: `05-integration-architecture/38-SIPD-Integration-Blueprint.md`) | 0.1.0 | **Approved** | G3 | AIR-007 Resolved via ADR-0004 (Accepted 2026-08-06, Opsi A — Formalisasi Interim Pattern). Disetujui Project Owner 2026-08-06, effective_date 2026-08-06. Bagian B (Target Integration Pattern) tetap placeholder Evidence Pending. |
| 39 | BP-INT-002 | `39-e-SIGAP-Integration-and-SSO-Blueprint.md` | Ya (path aktual: `05-integration-architecture/39-e-SIGAP-Integration-and-SSO-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |

## 7. Register — Technology and Security Architecture Documents (Seq 40–49)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 40 | ARCH-TECH-001 | `40-Technology-Architecture.md` | Ya (path aktual: `06-technology-architecture/40-Technology-Architecture.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 41 | STD-TECH-001 | `41-Technology-Standards-Catalog.md` | Ya (path aktual: `06-technology-architecture/41-Technology-Standards-Catalog.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 42 | BP-TECH-001 | `42-Environment-and-Deployment-Blueprint.md` | Ya (path aktual: `06-technology-architecture/42-Environment-and-Deployment-Blueprint.md`) | 1.0.0 | Approved | G3–G5 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 43 | BP-TECH-002 | `43-Observability-and-Operations-Blueprint.md` | Ya (path aktual: `06-technology-architecture/43-Observability-and-Operations-Blueprint.md`) | 1.0.0 | Approved | G3–G5 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 44 | BP-TECH-003 | `44-Resilience-Backup-and-Disaster-Recovery-Blueprint.md` | Ya (path aktual: `06-technology-architecture/44-Resilience-Backup-and-Disaster-Recovery-Blueprint.md`) | 0.1.0 | **Approved** | G3–G5 | AIR-009 Resolved via ADR-0003 (Accepted 2026-08-06, Opsi A — RPO 24 jam/RTO fleksibel). Disetujui Project Owner 2026-08-06, effective_date 2026-08-06. Closure formal AIR-009 tetap memerlukan bukti restore test aktual terpisah dari persetujuan blueprint ini. |
| 45 | ARCH-SEC-001 | `45-Security-Architecture.md` | Ya (path aktual: `07-security-architecture/45-Security-Architecture.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 46 | BP-SEC-001 | `46-Identity-Access-and-Separation-of-Duties-Blueprint.md` | Ya (path aktual: `07-security-architecture/46-Identity-Access-and-Separation-of-Duties-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 47 | BP-SEC-002 | `47-Security-Privacy-and-Audit-Control-Blueprint.md` | Ya (path aktual: `07-security-architecture/47-Security-Privacy-and-Audit-Control-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 48 | BP-SEC-003 | `48-Threat-Model-and-Security-Zones.md` | Ya (path aktual: `07-security-architecture/48-Threat-Model-and-Security-Zones.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 49 | STD-SEC-001 | `49-Secure-Engineering-and-Secrets-Standard.md` | Ya (path aktual: `07-security-architecture/49-Secure-Engineering-and-Secrets-Standard.md`) | 1.0.0 | Approved | G3–G5 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |

## 8. Register — Intelligence and AI Architecture Documents (Seq 50–57)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | ARCH-AI-001 | `50-Government-Intelligence-Platform-Architecture.md` | Ya (path aktual: `08-intelligence-ai-architecture/50-Government-Intelligence-Platform-Architecture.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 51 | BP-AI-001 | `51-Analytics-and-Decision-Intelligence-Blueprint.md` | Ya (path aktual: `08-intelligence-ai-architecture/51-Analytics-and-Decision-Intelligence-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 52 | BP-AI-002 | `52-AI-Gateway-and-Provider-Abstraction-Blueprint.md` | Ya (path aktual: `08-intelligence-ai-architecture/52-AI-Gateway-and-Provider-Abstraction-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 53 | GOV-AI-002 | `53-Responsible-AI-Governance-Standard.md` | Ya (path aktual: `08-intelligence-ai-architecture/53-Responsible-AI-Governance-Standard.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 54 | STD-AI-001 | `54-Prompt-Library-Standard.md` | Ya (path aktual: `08-intelligence-ai-architecture/54-Prompt-Library-Standard.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 55 | STD-AI-002 | `55-AI-Evaluation-and-Acceptance-Standard.md` | Ya (path aktual: `08-intelligence-ai-architecture/55-AI-Evaluation-and-Acceptance-Standard.md`) | 1.0.0 | Approved | G3–G6 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 56 | REF-AI-001 | `56-AI-Model-Prompt-and-Evaluation-Register.md` | Ya (path aktual: `08-intelligence-ai-architecture/56-AI-Model-Prompt-and-Evaluation-Register.md`) | 1.0.0 | Approved | G3–G6 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |
| 57 | BP-AI-003 | `57-Knowledge-Graph-and-Retrieval-Blueprint.md` | Ya (path aktual: `08-intelligence-ai-architecture/57-Knowledge-Graph-and-Retrieval-Blueprint.md`) | 1.0.0 | Approved | G3 | Diverifikasi ulang pada §17 addendum kedua (2026-08-06). |

## 9. Register — Publishing and Design System Documents (Seq 58–66)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 58 | ARCH-PUB-001 | `Government-Digital-Publishing-Platform-Architecture.md` | Ya | 1.0.0 | Approved | G3 | Batch 3, ECHG-064. |
| 59 | BP-PUB-001 | `Canonical-Document-Model-Blueprint.md` | Ya | 1.0.0 | Approved | G3 | Batch 3, ECHG-065. |
| 60 | BP-PUB-002 | `Multiformat-Publishing-Pipeline-Blueprint.md` | Ya | 1.0.0 | Approved | G3 | Batch 3, ECHG-066. |
| 61 | GOV-PUB-001 | `Publication-Governance-and-Approval-Standard.md` | Ya | 1.0.0 | Approved | G3 | Batch 3, ECHG-067. |
| 62 | STD-PUB-001 | `Government-Design-System-Standard.md` | Ya | 1.0.0 | Approved | G3 | Batch 4, ECHG-068. |
| 63 | STD-PUB-002 | `Typography-Layout-and-Annual-Report-Style.md` | Ya | 1.0.0 | Approved | G3 | Batch 4, ECHG-069. |
| 64 | STD-PUB-003 | `Chart-and-Infographic-Standard.md` | Ya | 1.0.0 | Approved | G3 | Batch 4, ECHG-070. |
| 65 | STD-PUB-004 | `Publication-Accessibility-and-Quality-Standard.md` | Ya | 1.0.0 | Approved | G3–G6 | Batch 4, ECHG-071. |
| 66 | REF-PUB-001 | `Template-and-Publication-Asset-Register.md` | Ya | 1.0.0 | Approved (struktur; entri Evidence Pending) | G3–G6 | Batch 4, ECHG-072. |

## 10. Register — Transition and Implementation Documents (Seq 67–74)

| Seq | Document ID | Dokumen | File Ada | Version | Status | Gate | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 67 | RM-MIG-001 | `Migration-and-Modernization-Roadmap.md` | Ya | 1.0.0 | Approved (Approved Plan) | G4 | Batch 4, ECHG-073. AIR-002/003/004/007/009 tetap terbuka. |
| 68 | BP-MIG-001 | `Transition-Architecture-01-Foundation.md` | Ya | 1.0.0 | Approved (Approved Plan) | G4 | Batch 4, ECHG-074. AIR-008 tetap Open. |
| 69 | BP-MIG-002 | `Transition-Architecture-02-Platform.md` | Ya | 1.0.0 | Approved (Approved Plan) | G4 | Batch 4, ECHG-075. AIR-002/003/004/007 tetap terbuka. |
| 70 | BP-MIG-003 | `Transition-Architecture-03-Scale.md` | Ya | 1.0.0 | Approved (Approved Plan) | G4 | Batch 4, ECHG-076. Horizon Wave 6 2031-2032, tidak dipercepat. |
| 71 | GOV-MIG-001 | `Implementation-Readiness-Checklist.md` | Ya | 1.0.0 | Approved (struktur; readiness belum dinilai) | G5 | Batch 4, ECHG-077. |
| 72 | GOV-MIG-002 | `Production-Readiness-Checklist.md` | Ya | 1.0.0 | Approved (struktur; readiness belum dinilai) | G6 | Batch 4, ECHG-078. AIR-006/008/009 tetap terbuka. |
| 73 | RM-MIG-002 | `Legacy-Coexistence-and-Decommissioning-Plan.md` | Ya | 1.0.0 | Approved (Approved Plan) | G4–G6 | Batch 4, ECHG-079. |
| 74 | REF-EA-001 | `Enterprise-Architecture-Traceability-Matrix.md` | Ya | 1.0.0 | Approved (struktur/populasi tingkat tinggi) | G1–G6 | Batch 4, ECHG-080. Seq 32/38/44 dicatat belum disusun. |

## 11. Register — Official Current State Baseline (di luar Master Document Sequence)

Lima baseline berikut berada pada `01-current-state/` sesuai Repository Structure Standard, dirujuk oleh berbagai artefak sebagai evidence current-state, namun tidak memiliki nomor Seq tersendiri pada Master Document Sequence §6.

| Dokumen | File Ada | Version/Status (body teks) | Catatan |
| --- | --- | --- | --- |
| `1-identitas-sistem.md` | Ya | Tidak memiliki front-matter metadata standar | Belum dibaca penuh pada sesi ini. |
| `2-modul-sistem.md` | Ya | Tidak memiliki front-matter metadata standar | Dibaca penuh pada riset ADR-0001; sumber evidence konflik temporal Renstra. |
| `3-alur-logika-sistem.md` | Ya | Tidak memiliki front-matter metadata standar | Belum dibaca penuh pada sesi ini. |
| `4-penilaian-kesesuaian-standar.md` | Ya | Tidak memiliki front-matter metadata standar | Digrep sebagian pada riset ADR-0001. |
| `5-referensi-teknis-database-api-frontend.md` | Ya | Tidak memiliki front-matter metadata standar | Belum dibaca penuh pada sesi ini. |

## 12. Ringkasan Statistik

Diperbarui pada addendum kelima (§17d), berdasarkan finalisasi persetujuan Project Owner terhadap seluruh artefak yang sebelumnya Draft for Review, per 2026-08-06.

| Kategori | Jumlah |
| --- | --- |
| Total artefak pada Master Document Sequence (Seq 00–74) | 75 |
| Artefak dengan file fisik ditemukan | 75 |
| Artefak belum disusun (belum ada file, sengaja ditunda) | 0 |
| Artefak berstatus Approved (termasuk Architecture Charter) | 75 |
| Artefak berstatus Accepted (ADR) | 5 |
| Artefak berstatus Draft for Review | 0 |
| Lampiran teknis di luar Master Document Sequence (Approved sebagai spesifikasi; implementasi tetap Planned) | 1 (Seq 32a) |
| Official Current State Baseline (di luar Seq, tidak dihitung pada Master Document Sequence) | 5 |

## 13. Evidence Pending dan Anomali Teridentifikasi

1. Architecture Charter (Seq 00) tidak memiliki front-matter YAML metadata seperti artefak lain; version/status dibaca dari body teks. Standarisasi metadata Charter **tidak** dilakukan oleh register ini — di luar mandat.
2. REF-BUS-001 (Seq 15) dan STD-BUS-001 (Seq 17) berada secara fisik di luar folder `02-business-architecture/` (masing-masing di `03-data-architecture/business-glossary/` dan `10-standards/`). Register hanya mencatat fakta lokasi; alasan penempatan tetap **Evidence Pending**, konsisten dengan catatan AIR-010 mengenai konsistensi metadata/lokasi artefak governance.
3. Lima Official Current State Baseline tidak memiliki front-matter metadata standar (document_id/version/status/effective_date terpisah); tidak distandarisasi oleh register ini.
4. Seq 32 (BP-APP-002, v0.2.0), Seq 38 (BP-INT-001, v0.1.0), dan Seq 44 (BP-TECH-003, v0.1.0) — seluruhnya telah **disetujui Project Owner dan difinalisasi menjadi Approved pada 2026-08-06** — lihat §17d. Tidak ada lagi artefak Master Document Sequence yang berstatus "belum disusun" atau "Draft for Review". Untuk BP-TECH-003 secara khusus: persetujuan blueprint ini tidak setara dengan closure formal AIR-009, yang tetap memerlukan bukti restore test aktual terpisah.
5. Banyak artefak Seq 22–57 dan Seq 29–57 memiliki path fisik yang berbeda dari nama dasar yang tercantum pada Master Document Sequence RM-EA-001 (mis. berada di dalam subfolder tematik seperti `data-lineage/`, `data-quality/`, `domain-models/`, dsb., di bawah folder Seq utama). Register mencatat path aktual pada kolom "File Ada"; penyelarasan penamaan lebih lanjut (bila diperlukan) berada di luar mandat register ini.
6. Sembilan subfolder kategori generik berikut ditemukan **kosong** (0 file) per verifikasi langsung 2026-08-06, meski struktur foldernya sudah ada di repository: `02-business-architecture/business-processes/`, `02-business-architecture/capability-map/`, `02-business-architecture/regulatory-mapping/`, `02-business-architecture/value-streams/`, `03-data-architecture/master-reference-data/`, `04-application-architecture/application-portfolio/`, `04-application-architecture/dependency-maps/`, `04-application-architecture/domain-boundaries/`, `04-application-architecture/module-blueprints/`. Verifikasi mengonfirmasi kekosongan ini **bukan** berarti artefak terkait belum dibuat — seluruh Document ID yang secara tematik berkaitan dengan nama folder tersebut (ARCH-BUS-001, BP-BUS-001–005, ARCH-DATA-001, BP-DATA-001–005, ARCH-APP-001, REF-APP-001, BP-APP-001, BP-APP-003) sudah memiliki file fisik Approved, namun disimpan langsung di folder induk (`02-business-architecture/`, `03-data-architecture/`, `04-application-architecture/`) atau di subfolder tematik lain (`data-lineage/`, `data-quality/`, `data-governance/`, `domain-models/`), bukan di subfolder kategori generik ini. Satu-satunya pengecualian adalah BP-APP-002 (Seq 32), yang memang belum disusun sama sekali (lihat butir 4 di atas). Kesembilan subfolder generik ini tampak dibuat sebagai kerangka struktur folder pada tahap awal repository namun tidak pernah dipakai; register mencatat fakta ini sebagai **Evidence Pending** — keputusan apakah subfolder tersebut perlu diisi ulang, direorganisasi, atau dihapus berada di luar mandat register ini dan memerlukan keputusan Project Owner/CEA terpisah.

## 14. Batas Kewenangan

Register ini **tidak** menetapkan prioritas pengerjaan baru, disposisi Gate, keputusan arsitektur, owner/steward, compliance determination, atau jadwal implementasi. Register murni mencatat state faktual repository pada tanggal generate untuk mendukung Fase 1 (Establish Control Plane) sesuai HANDOFF-e-PeLARA-EA-2026-08-05-v10 §4.1. Urutan pengerjaan berikutnya tetap mengikuti Master Roadmap §6.9 (Sequencing Rule) dan keputusan Project Owner/CEA.

## 15. Sumber yang Dibaca Langsung

1. `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` — §6.1–§6.9 (Master Document Sequence).
2. Front-matter (`document_id`, `version`, `status`, `effective_date`) dari seluruh 21 file `.md` berformat front-matter YAML plus Architecture Charter (body teks) yang ditemukan pada direktori repository (`find` terhadap struktur folder resmi) — total 22 artefak Master Document Sequence dengan file fisik.
3. `00-governance/00-Architecture-Charter.md` — baris 1–20 (header/body metadata).
4. Struktur direktori repository aktual per 2026-08-05 (verifikasi `File Ada`).

## 17. Addendum — Pembaruan Parsial Pasca-Batch 1–4 (2026-08-05)

Baris Seq 58–74 (§9–§10) diperbarui untuk mencerminkan hasil Batch 3 (Seq 58-61) dan Batch 4 (Seq 62-74), berdasarkan Enterprise Change Log ECHG-064 s.d. ECHG-080, **tanpa** melakukan full-repository scan ulang terhadap Seq 00–57. Baris Seq 00–57 (§3–§8) **belum diperbarui** pada addendum ini dan tetap mencerminkan state pada tanggal generate awal (2026-08-05, sebelum Batch 1); baris-baris tersebut kini **stale** — Seq 29-57 pada kenyataannya juga sudah Approved melalui Batch 1-2 (ECHG-038 s.d. ECHG-057) namun belum tercermin di §6-§8. Kolom Ringkasan Statistik (§12) dan Evidence Pending/Anomali (§13) juga **belum disesuaikan** dan tidak dapat diandalkan sebagai angka terkini.

## 17a. Addendum Kedua — Pembaruan Menyeluruh Seq 22–57 (2026-08-06)

Menindaklanjuti catatan pada §17 di atas, addendum ini melakukan verifikasi ulang langsung terhadap front-matter (`document_id`, `version`, `status`, `effective_date`) seluruh 36 file fisik pada rentang Seq 22–57, sesuai permintaan koreksi administratif Project Owner tanggal 2026-08-06 agar register tidak menyesatkan pembaca di masa depan.

Hasil verifikasi: 34 dari 36 artefak pada rentang Seq 22–57 ternyata **sudah Approved** (version 1.0.0, effective_date 2026-08-05) melalui Batch 1–2, namun sebelumnya masih tercatat keliru sebagai "Tidak"/"Belum dimulai" pada §5–§8. Baris-baris tersebut kini telah diperbarui pada §5–§8 di atas dengan path fisik aktual, version, status, dan effective_date yang benar. Dua artefak dalam rentang ini (Seq 32 dan Seq 38) dikonfirmasi tetap **belum disusun** — konsisten dengan Seq 44 (di luar rentang Seq 22–57, namun juga diverifikasi ulang) — total tiga artefak yang sengaja ditunda pada keseluruhan Master Document Sequence.

Ringkasan Statistik (§12) dan Evidence Pending/Anomali (§13) telah disesuaikan mengikuti hasil verifikasi ini. Addendum ini **tidak** mengubah status Draft for Review pada register, tidak menetapkan Gate disposition baru, dan tidak membuat artefak pengganti untuk Seq 32/38/44 — ketiganya tetap ditunda sampai evidence eksternal terkait dependency masing-masing (AIR-004, AIR-007, AIR-009) tersedia.

Cakupan verifikasi addendum kedua ini terbatas pada Seq 22–57 (ditambah konfirmasi ulang Seq 44); Seq 00–21 dan Seq 58–74 tidak dipindai ulang pada addendum ini karena sudah tercermin akurat pada §3–§4 (generate awal) dan §17 (addendum pertama).

## 17b. Addendum Ketiga — Penyusunan BP-APP-002 (Seq 32) Pasca-ADR-0002 (2026-08-06)

Menindaklanjuti resolusi AIR-004 melalui ADR-0002 (Enterprise Workflow State Model Decision, Accepted 2026-08-06, Opsi A — Standardisasi Penuh), BP-APP-002 (Seq 32, Enterprise Workflow State Model) telah disusun sebagai **Version 0.1.0, status Draft for Review**, atas permintaan Project Owner. Baris Seq 32 pada §6 telah diperbarui untuk mencerminkan hal ini.

Ini adalah **satu-satunya** perubahan status pada rentang Seq 22-57 sejak addendum kedua (§17a); Seq 38 (BP-INT-001) dan Seq 44 (BP-TECH-003) tetap belum disusun, tidak terpengaruh oleh addendum ini. Ringkasan Statistik (§12) dan Evidence Pending/Anomali (§13 butir 4) telah disesuaikan mengikuti perubahan ini.

Perlu dicatat: BP-APP-002 Version 0.1.0 **belum** melalui review Chief Enterprise Architect atau persetujuan Project Owner secara terpisah. Status Draft for Review pada baris Seq 32 tidak setara dengan Approved; register hanya mencatat bahwa file kini eksis, bukan bahwa artefak telah difinalisasi.

## 17c. Addendum Keempat — Penyusunan BP-INT-001 (Seq 38) dan BP-TECH-003 (Seq 44) Pasca-ADR-0004/ADR-0003 (2026-08-06)

Menindaklanjuti resolusi AIR-007 melalui ADR-0004 (SIPD Integration Interim Pattern Decision, Accepted 2026-08-06, Opsi A — Formalisasi Interim Pattern) dan resolusi AIR-009 melalui ADR-0003 (Backup and Disaster Recovery Decision, Accepted 2026-08-06, Opsi A — RPO 24 jam/RTO fleksibel), dua artefak terakhir yang sengaja ditunda pada Master Document Sequence telah disusun:

- **BP-INT-001** (Seq 38, SIPD Integration Blueprint) — **Version 0.1.0, status Draft for Review**, path `05-integration-architecture/38-SIPD-Integration-Blueprint.md`. Mendokumentasikan Interim Integration Pattern (PDF-import, aktif) dan kerangka placeholder Target Integration Pattern (API-based, belum diisi), sesuai ADR-0004 §3 butir 4.
- **BP-TECH-003** (Seq 44, Resilience, Backup and Disaster Recovery Blueprint) — **Version 0.1.0, status Draft for Review**, path `06-technology-architecture/44-Resilience-Backup-and-Disaster-Recovery-Blueprint.md`. Mendokumentasikan target RPO 24 jam/RTO fleksibel dan prinsip restore test wajib, sesuai ADR-0003 §3.

Baris Seq 38 dan Seq 44 pada §6-§7 telah diperbarui untuk mencerminkan hal ini. Dengan penyelesaian kedua artefak ini, **tidak ada lagi artefak Master Document Sequence (Seq 00-74) yang berstatus "belum disusun"** — seluruh 75 artefak kini memiliki file fisik. Ringkasan Statistik (§12) dan Evidence Pending/Anomali (§13 butir 4) telah disesuaikan mengikuti perubahan ini.

Perlu dicatat: BP-INT-001 dan BP-TECH-003 Version 0.1.0 **belum** melalui review Chief Enterprise Architect atau persetujuan Project Owner secara terpisah pada saat penulisan addendum ini — sama seperti BP-APP-002. Status Draft for Review tidak setara dengan Approved. Untuk BP-TECH-003 khususnya, closure formal AIR-009 tetap memerlukan bukti restore test aktual selain persetujuan draft ini, konsisten dengan ADR-0003 §5. **Update: ketiga artefak ini telah disetujui Project Owner pada 2026-08-06 — lihat §17d.**

## 17d. Addendum Kelima — Finalisasi Persetujuan Project Owner atas BP-APP-002, BP-INT-001, BP-TECH-003, BP-APP-003 v1.1.0, dan Lampiran 32a (2026-08-06)

Menindaklanjuti §17b (BP-APP-002 disusun), §17c (BP-INT-001/BP-TECH-003 disusun), dan penyusunan ADR-0005 beserta revisi BP-APP-002 §7a dan BP-APP-003 §6a (dicatat pada Enterprise Change Log ECHG-083), Project Owner memberikan **persetujuan eksplisit** terhadap seluruh artefak berikut pada 2026-08-06:

1. **BP-APP-002** (Seq 32) — v0.2.0, status dinaikkan dari Draft for Review menjadi **Approved**, effective_date 2026-08-06, mencakup §7a (kewajiban kepatuhan modul baru).
2. **BP-INT-001** (Seq 38) — v0.1.0, status dinaikkan dari Draft for Review menjadi **Approved**, effective_date 2026-08-06. Bagian B (Target Integration Pattern) tetap placeholder Evidence Pending — persetujuan tidak mengisi placeholder tersebut.
3. **BP-TECH-003** (Seq 44) — v0.1.0, status dinaikkan dari Draft for Review menjadi **Approved**, effective_date 2026-08-06. Persetujuan ini bukan closure formal AIR-009 — closure tetap memerlukan bukti restore test aktual.
4. **BP-APP-003** (Seq 33) — v1.1.0 tetap Approved (perubahan terkontrol sejak awal); Project Owner secara eksplisit meninjau dan menyetujui redaksi §6a hasil revisi (non-prescriptive, non-retroaktif, non-pemaksaan terhadap modul berkebutuhan arsitektur berbeda).
5. **Lampiran 32a** (Enterprise Workflow Compliance Enforcement — Technical Specification) — v0.1.0, status governance dinaikkan menjadi **Approved** sebagai rencana kerja definitif. Status **implementasi teknisnya tetap Planned** — persetujuan governance tidak berarti Tahap 1-4 (script lint rule, schema constraint, CI wiring) sudah dieksekusi. Eksekusi akan dilakukan Project Owner pada sesi terpisah di luar konteks governance ini.

Dengan finalisasi ini, **tidak ada lagi artefak berstatus Draft for Review** pada seluruh scope register (Master Document Sequence maupun lampiran). Baris Seq 32, 33, 38, 44 pada §6 telah diperbarui; baris baru Seq 32a ditambahkan pada §6 untuk mencatat lampiran teknis di luar Master Document Sequence asli. Ringkasan Statistik (§12) dan Evidence Pending/Anomali (§13 butir 4) telah disesuaikan.

Perlu dicatat secara eksplisit: persetujuan governance terhadap 32a **tidak** setara dengan pernyataan bahwa mekanisme enforcement berlapis sudah berjalan di repository — status itu hanya dapat berubah menjadi "Implemented" setelah keempat syarat pada 32a §7 (Definition of Implemented) terpenuhi dan dibuktikan, sebagai perubahan governance terpisah di kemudian hari.

## 18. Change Log

| Version | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 1.0.0 | 2026-08-05 | Penyusunan awal Master Artifact Register berdasarkan Master Document Sequence RM-EA-001 §6 dan verifikasi langsung terhadap file fisik repository. | Claude Work | Draft for Review |
| 1.0.0 (addendum) | 2026-08-05 | Pembaruan baris Seq 58-74 (§9-§10) mencerminkan Batch 3/4 (ECHG-064 s.d. ECHG-080); ditambahkan §17 addendum mencatat bahwa Seq 00-57 (§3-§8) dan Ringkasan Statistik (§12) belum diperbarui — tidak dianggap sebagai full-repository scan. Version tetap 1.0.0/Draft for Review karena register belum melalui finalisasi rutin. | Claude Work | Draft for Review |
| 1.0.2 | 2026-08-06 | Ditambahkan §17b mencatat penyusunan BP-APP-002 (Seq 32) sebagai Version 0.1.0 Draft for Review, setelah AIR-004 Resolved via ADR-0002 (Accepted 2026-08-06). Baris Seq 32 pada §6, Ringkasan Statistik (§12), dan Evidence Pending (§13 butir 4) diperbarui. Seq 38/44 tetap belum disusun, tidak terpengaruh. | Claude Work | Draft for Review |
| 1.0.1 | 2026-08-06 | Koreksi administratif atas permintaan Project Owner: verifikasi ulang langsung front-matter 36 file fisik Seq 22-57 (§5-§8), memperbaiki entri keliru "Tidak"/"Belum dimulai" menjadi Approved dengan path/version/effective_date aktual untuk 34 artefak; mengonfirmasi ulang Seq 32/38/44 tetap belum disusun (sengaja ditunda). Ringkasan Statistik (§12) dan Evidence Pending (§13) disesuaikan. Ditambahkan §17a. Tidak ada artefak pengganti dibuat; tidak ada Gate disposition ditetapkan. | Claude Work | Draft for Review |
| 1.0.3 | 2026-08-06 | Ditambahkan §17c mencatat penyusunan BP-INT-001 (Seq 38) dan BP-TECH-003 (Seq 44) sebagai Version 0.1.0 Draft for Review, setelah AIR-007 Resolved via ADR-0004 dan AIR-009 Resolved via ADR-0003 (keduanya Accepted 2026-08-06). Baris Seq 38/44 pada §6-§7, Ringkasan Statistik (§12), dan Evidence Pending (§13 butir 4) diperbarui. Tidak ada lagi artefak Master Document Sequence berstatus belum disusun. | Claude Work | Draft for Review |
| 1.0.4 | 2026-08-06 | Ditambahkan §17d mencatat finalisasi persetujuan Project Owner atas BP-APP-002 (v0.2.0→Approved), BP-INT-001 (v0.1.0→Approved), BP-TECH-003 (v0.1.0→Approved), BP-APP-003 (v1.1.0, persetujuan §6a), dan lampiran teknis baru 32a (v0.1.0, Approved sebagai spesifikasi; implementasi tetap Planned). Baris Seq 32/33/38/44 diperbarui; baris baru Seq 32a ditambahkan. Ringkasan Statistik (§12, 75/75 Approved, 0 Draft for Review) dan Evidence Pending (§13 butir 4) disesuaikan. | Claude Work | Draft for Review |
| 1.0.5 | 2026-08-06 | Baris Seq 32a diperbarui: kolom status implementasi teknis diubah dari "Planned" menjadi "Partially Implemented", menyusul laporan eksekusi teknis Tahap 1-3 dari sesi coding terpisah (§8 opsi 2 pada 32a). Perubahan bersifat penyelarasan status, bukan pekerjaan baru — governance status 32a tetap Approved sejak v1.0.4. Evidence dicatat sebagai dilaporkan pelaksana implementasi, belum diverifikasi independen oleh Draft File Operator, sesuai §7.1-§7.2/§12 dokumen 32a. | Claude Work | Draft for Review |

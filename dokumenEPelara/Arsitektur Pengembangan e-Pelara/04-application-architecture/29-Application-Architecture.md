---
document_id: ARCH-APP-001
title: Application Architecture
system: e-PeLARA Next Generation
classification: Enterprise Architecture
domain: Application Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../00-governance/00-Architecture-Charter.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: G1–G2 deliverables
intended_repository_path: 04-application-architecture/29-Application-Architecture.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 29 — Application Architecture

## 1. Tujuan dan Kedudukan

Dokumen ini adalah Application Architecture overview untuk e-PeLARA Next Generation, disusun sebagai artefak baru (Seq 29) di bawah mandat 10-Artifact Autonomous Batch dari Project Owner Fahmi Alhabsi tanggal 2026-08-05. Dokumen menerjemahkan Business Capability Map (BP-BUS-001, Approved) dan Enterprise Data Domain Model (BP-DATA-001, Approved) menjadi arah **candidate application domain landscape** — struktur konseptual boundary aplikasi yang menjadi parent bagi artefak Application Architecture lanjutan (REF-APP-001, BP-APP-001, BP-APP-003, dan seterusnya).

Dokumen ini **tidak** menetapkan: teknologi, framework, bahasa pemrograman, desain database fisik, API/event contract rinci, deployment topology, owner institusional aktual, atau disposition Gate. Seluruh elemen tersebut didelegasikan ke artefak lanjutan (REF-APP-001, BP-APP-001, ARCH-INT-001, ARCH-TECH-001) atau implementasi teknis di luar Master Document Sequence.

Kedudukan dokumen ini setara dengan ARCH-BUS-001 dan ARCH-DATA-001: overview domain, bukan blueprint rinci.

## 2. Ruang Lingkup

Dalam scope: application domain landscape konseptual, boundary aplikasi terhadap capability bisnis dan data domain, prinsip modularitas dan legacy coexistence, klasifikasi jenis aplikasi/modul, dan interface ke artefak Application Architecture lanjutan. Di luar scope: desain modul rinci, API/event contract, workflow state machine rinci, deployment/infrastructure, security control rinci, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `02-business-architecture/11-Business-Capability-Map.md` (BP-BUS-001, Approved) — 10 domain capability Level 0 (CAP-GOV, CAP-PLN, CAP-BDG, CAP-EXE, CAP-PRF, CAP-EVR, CAP-DKM, CAP-CMP, CAP-PUB, CAP-ADS) dan capability Level 1 terkait, dibaca penuh.
- `02-business-architecture/10-Business-Architecture-Overview.md` (ARCH-BUS-001, Approved) §1-4 — visi bisnis dan arah platform.
- `03-data-architecture/19-Enterprise-Data-Domain-Model.md` (BP-DATA-001, Approved) §8-9 — 13 data domain (DD-POL, DD-PLN, DD-OPR, DD-BDG, DD-EXE, DD-PRF, DD-EVL, DD-ORG, DD-MST, DD-DOC, DD-EVD, DD-MDL, DD-KNO).
- `00-governance/00-Architecture-Charter.md` — prinsip One Data Many Publications, batas kewenangan AI (dibaca pada sesi sebelumnya, dirujuk konsisten).
- `00-governance/03-Architecture-Issue-Register.md` — AIR-002 (status dashboard), AIR-003 (status model Notification), AIR-004 (workflow approval), AIR-005 (library UI) sebagai finding yang relevan terhadap domain aplikasi; tidak diselesaikan oleh dokumen ini.
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §6.4 — Seq 29-39, dependency, dan Gate G3.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending — konsisten dengan artefak Seq 18-28.

## 5. Prinsip Application Architecture

1. Aplikasi merealisasikan capability bisnis (BP-BUS-001) dan mengonsumsi/menghasilkan data domain (BP-DATA-001); aplikasi bukan capability itu sendiri.
2. Domain aplikasi dibatasi oleh bounded context yang selaras dengan capability Level 0, bukan oleh struktur modul teknis existing semata.
3. Legacy coexistence: modernisasi bertahap tanpa mengasumsikan penggantian menyeluruh sekaligus; detail transisi didelegasikan ke Migration Roadmap (Seq 67+).
4. Workflow, notification, dan dashboard yang statusnya belum konsisten pada baseline (AIR-002, AIR-003, AIR-004) tidak diasumsikan selesai atau gagal oleh dokumen ini; status tetap dirujuk ke Issue Register.
5. One Data, Many Publications: aplikasi tidak menduplikasi data otoritatif; aplikasi mengonsumsi melalui interface yang dapat ditelusuri (didelegasikan ke ARCH-INT-001).

## 6. Candidate Application Domain Landscape

Setiap capability Level 0 (BP-BUS-001 §8) memiliki candidate application domain yang merealisasikannya. Domain aplikasi **bukan** daftar modul/menu existing, melainkan boundary konseptual yang stabil terhadap perubahan struktur modul.

| Application Domain ID | Merealisasikan Capability | Konsumsi Data Domain (BP-DATA-001) | Evidence Status |
| --- | --- | --- | --- |
| APP-GOV-001 | CAP-GOV | DD-ORG-001, DD-EVD-001 | Candidate Target Direction |
| APP-PLN-001 | CAP-PLN | DD-PLN-001, DD-POL-001 | Documented Current (modul perencanaan baseline) + Candidate |
| APP-BDG-001 | CAP-BDG | DD-BDG-001 | Documented Current (modul RKA/DPA baseline) + Candidate |
| APP-EXE-001 | CAP-EXE | DD-EXE-001, DD-OPR-001 | Documented Current (modul pelaksanaan baseline) + Candidate |
| APP-PRF-001 | CAP-PRF | DD-PRF-001 | Documented Current (modul dashboard baseline, AIR-002 status belum konsisten) + Candidate |
| APP-EVR-001 | CAP-EVR | DD-EVL-001, DD-DOC-001 | Documented Current (modul evaluasi/laporan baseline) + Candidate |
| APP-DKM-001 | CAP-DKM | DD-MST-001, DD-MDL-001, DD-KNO-001 | Candidate Target Direction (mengacu Seq 18-28 Approved) |
| APP-CMP-001 | CAP-CMP | DD-EVD-001 | Candidate Target Direction |
| APP-PUB-001 | CAP-PUB | DD-DOC-001, DD-KNO-001 | Candidate Target Direction (mengacu ARCH-PUB-001 Seq 58, belum dimulai) |
| APP-ADS-001 | CAP-ADS | DD-KNO-001 | Candidate Target Direction (mengacu GOV-AI-001 Approved, AI bukan decision authority) |

Domain aplikasi tidak menetapkan satu-ke-satu dengan aplikasi/modul fisik; satu domain dapat direalisasikan oleh lebih dari satu modul, dan sebaliknya, sepanjang boundary data/capability tetap konsisten. Pemetaan modul fisik aktual adalah scope REF-APP-001 (Seq 30).

## 7. Prinsip Modularitas dan Bounded Context

Modularitas mengikuti prinsip bounded context: setiap application domain memiliki tanggung jawab data dan capability yang jelas, berkomunikasi dengan domain lain melalui interface yang dapat ditelusuri (bukan akses data langsung lintas-domain tanpa kontrak). Detail bounded context per domain didelegasikan ke BP-APP-001 (Seq 31); detail strategi modularisasi/dekomposisi didelegasikan ke BP-APP-003 (Seq 33).

## 8. Legacy Coexistence

Baseline current-state (dibaca pada sesi-sesi sebelumnya) menunjukkan modul-modul existing yang memetakan sebagian besar ke application domain di atas dalam kondisi Documented Current. Dokumen ini tidak menyatakan modul existing harus diganti; strategi coexistence, transisi, dan dekomisioning didelegasikan ke Migration and Modernization Roadmap (RM-MIG-001, Seq 67) dan Legacy Coexistence and Decommissioning Plan (RM-MIG-002, Seq 73) — keduanya belum dimulai.

## 9. Boundary dengan Data Architecture (Seq 18-28, Approved)

Application Architecture **mengonsumsi** data domain, lineage, quality, governance, dan knowledge model yang telah Approved pada Seq 18-28; dokumen ini tidak mengubah substansi artefak tersebut. Interface data-ke-aplikasi (bagaimana aplikasi mengakses data otoritatif) didelegasikan ke ARCH-INT-001 (Seq 34) sebagai integration concern, bukan application concern.

## 10. Boundary dengan Integration dan Technology Architecture (Seq 34, 40 — Batch Ini)

Application Architecture menetapkan **domain dan boundary**; ARCH-INT-001 menetapkan **bagaimana domain berkomunikasi** (API, event); ARCH-TECH-001 menetapkan **platform dan lingkungan** tempat domain berjalan. Ketiganya saling melengkapi tanpa tumpang tindih tanggung jawab.

## 11. Finding Baseline yang Relevan (Routing, Bukan Resolusi)

| Finding | Domain Aplikasi Terdampak | Routing |
| --- | --- | --- |
| AIR-002 — Status dashboard tidak konsisten | APP-PRF-001 | Tetap Open; tidak diselesaikan oleh dokumen ini; target gate G3. |
| AIR-003 — Status model Notification tidak konsisten | Lintas-domain (notification adalah cross-cutting concern) | Tetap Open; didelegasikan ke STD-INT-002 (Seq 36) sebagai standar konseptual, bukan resolusi status baseline. |
| AIR-004 — Ketidakjelasan status workflow approval | APP-EXE-001, APP-CMP-001 | Tetap Decision Required; BP-APP-002 (Enterprise Workflow State Model, Seq 32) yang menjadi artefak resolusinya **tidak termasuk batch ini** karena terikat keputusan eksternal; domain aplikasi tetap mencatat workflow sebagai Evidence Pending. |
| AIR-005 — Beberapa library UI digunakan bersamaan | Lintas-domain (presentation layer) | Tetap Open; didelegasikan ke STD-PUB-001 (Seq 62, belum dimulai). |

## 12. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Aplikasi/modul fisik aktual per domain | To be assigned by Project Owner — Evidence Pending | REF-APP-001 Seq 30 |
| Bounded context rinci per domain | To be assigned by Project Owner — Evidence Pending | BP-APP-001 Seq 31 |
| Workflow state model | To be designated or verified by competent institutional authority — Evidence Pending | BP-APP-002 Seq 32 (di luar batch ini, terikat AIR-004) |
| Strategi modularisasi/dekomposisi | To be assigned by Project Owner — Evidence Pending | BP-APP-003 Seq 33 |
| API/event contract | To be assigned by Project Owner — Evidence Pending | ARCH-INT-001, STD-INT-001, STD-INT-002 (Seq 34-36) |
| Platform/teknologi aktual | To be assigned by Project Owner — Evidence Pending | ARCH-TECH-001 Seq 40 |
| Owner aplikasi institusional | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |

## 13. Assumptions dan Program State

1. BP-BUS-001 (1.0.0, Approved), ARCH-BUS-001 (1.0.0, Approved), dan BP-DATA-001 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 berstatus DEFERRED (G1-Gate-Decision-Record.md v1.1.0); dependency normatif dokumen ini adalah status artefak Approved (BP-BUS-001, BP-DATA-001), bukan gate disposition itu sendiri, konsisten dengan Sequencing Rule Roadmap §6.9.
3. G2 tetap tanpa disposition.
4. BP-APP-002 (Seq 32) dan BP-INT-001 (Seq 38) tidak termasuk batch ini karena terikat keputusan eksternal (AIR-004, AIR-007); domain APP-EXE-001/APP-CMP-001 dan integrasi SIPD tetap mencatat Evidence Pending untuk item tersebut.
5. Dokumen ini tidak menetapkan disposition G3.

## 14. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate application domain landscape berdasarkan capability/data domain yang sudah Approved, mengklarifikasi boundary dengan Integration/Technology Architecture, routing Evidence Pending, validasi boundary, self-review, dan finalisasi Draft for Review → Approved dalam batas delegasi.

**Dilarang**: Menetapkan teknologi/platform/framework, desain API/event/database fisik, workflow state model (AIR-004 belum selesai), owner institusional aktual, atau disposition Gate G1/G2/G3.

## 15. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED terhadap 8-item validation checklist; tidak ditemukan finding. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi self-review dan finalisasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 16. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Application Architecture sebagai ARCH-APP-001 Seq 29, berdasarkan BP-BUS-001 (Approved), ARCH-BUS-001 (Approved), dan BP-DATA-001 (Approved). Cakupan: candidate application domain landscape (10 domain identik capability Level 0), prinsip modularitas/bounded context/legacy coexistence, boundary dengan Data/Integration/Technology Architecture, routing finding baseline (AIR-002/003/004/005) tanpa resolusi. Tidak ada teknologi, API/event contract, workflow model, atau owner institusional yang ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.1.0**: Outcome **PASSED**. 8-item validation checklist diverifikasi: metadata, dependency, 10 domain vs capability, tanpa teknologi konkret, routing finding tanpa resolusi, boundary Integration/Technology, G1/G2 dicatat akurat, single-file boundary. Tidak ditemukan finding baru. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi Version 0.1.0 menjadi Version 1.0.0 Approved, efektif 2026-08-05, sebagai Official Application Architecture. | Claude Work | Approved |

## 17. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Seluruh dependency (BP-BUS-001, ARCH-BUS-001, BP-DATA-001) berstatus Approved dan tidak diubah.
3. ✓ 10 application domain identik dengan 10 capability Level 0 BP-BUS-001; tidak ada domain baru tanpa dasar capability.
4. ✓ Tidak ada teknologi/platform/framework/API contract konkret ditetapkan.
5. ✓ AIR-002/003/004/005 dirutekan, bukan diselesaikan; BP-APP-002/BP-INT-001 eksplisit dicatat di luar batch.
6. ✓ Boundary dengan Integration/Technology Architecture (Seq 34, 40) dijelaskan tanpa tumpang tindih.
7. ✓ G1 DEFERRED dan G2 tanpa disposition dicatat akurat; tidak diasumsikan otomatis lolos.
8. ✓ Tidak ada file lain selain file ini yang tersentuh.

## 18. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency (BP-BUS-001, ARCH-BUS-001, BP-DATA-001) seluruhnya Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

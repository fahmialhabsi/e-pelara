---
document_id: ARCH-INT-001
title: Integration Architecture
system: e-PeLARA Next Generation
classification: Enterprise Architecture
domain: Integration Architecture
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
roadmap_dependency: Application and Data Architecture
intended_repository_path: 05-integration-architecture/34-Integration-Architecture.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 34 — Integration Architecture

## 1. Tujuan dan Kedudukan

Dokumen ini adalah Integration Architecture overview untuk e-PeLARA Next Generation (Seq 34), disusun di bawah mandat 10-Artifact Autonomous Batch Project Owner Fahmi Alhabsi tanggal 2026-08-05. Dokumen menetapkan **candidate integration principle dan boundary** — bagaimana application domain (ARCH-APP-001, Seq 29, Approved) berkomunikasi satu sama lain dan dengan sistem eksternal (SIPD, e-SIGAP) — tanpa menetapkan API/event contract rinci, teknologi middleware, atau kontrak eksternal aktual.

Dokumen ini **tidak** menetapkan: endpoint API, event payload, message broker/teknologi integrasi, kontrak/SLA dengan SIPD atau e-SIGAP, atau disposition Gate. Detail tersebut didelegasikan ke STD-INT-001 (API Design and Versioning Standard, Seq 35), STD-INT-002 (Event and Notification Standard, Seq 36), REF-INT-001 (API and Event Catalog, Seq 37), dan BP-INT-002 (e-SIGAP Integration and SSO Blueprint, Seq 39).

## 2. Ruang Lingkup

Dalam scope: prinsip integrasi (internal antar-domain dan eksternal), pola komunikasi konseptual (synchronous/asynchronous), klasifikasi jenis integrasi, boundary dengan Application dan Technology Architecture, dan interface ke standar/katalog integrasi lanjutan. Di luar scope: API contract rinci, event schema, teknologi middleware/message broker, kontrak hukum dengan pihak eksternal, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, difinalisasi pada batch ini) §6, §10 — 10 candidate application domain dan boundary dengan Integration Architecture.
- `03-data-architecture/19-Enterprise-Data-Domain-Model.md` (BP-DATA-001, Approved) §8-9 — 13 data domain sebagai konteks data yang dipertukarkan.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-007 (integrasi SIPD masih gap, Decision Required, target G3), AIR-003 (status model Notification tidak konsisten).
- `00-governance/05-Compliance-Register.md` — COMP-003 (REG-04 Permendagri 70/2019, SIPD; Gap Identified, target G3; eksplisit "regulasi ini tidak ditafsirkan sebagai kewajiban API tersedia").
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §6.4 — Seq 34-39, dependency, Gate G3.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending — konsisten dengan artefak sebelumnya.

## 5. Prinsip Integration Architecture

1. Integrasi antar-application domain internal menggunakan kontrak eksplisit (API/event), bukan akses data langsung lintas-domain.
2. Integrasi eksternal (SIPD, e-SIGAP) tidak diasumsikan tersedia, wajib, atau memiliki kontrak/akses tertentu tanpa evidence; status tetap mengikuti AIR-007 dan COMP-003.
3. One Data, Many Publications: integrasi tidak menduplikasi data otoritatif; integrasi menyediakan akses terkendali ke data otoritatif yang sama.
4. Prinsip Charter "AI bukan decision authority" berlaku pada integrasi yang melibatkan AI Gateway (BP-AI-002, Seq 52, belum dimulai) — di luar scope dokumen ini.
5. Pola integrasi dipilih berdasarkan kebutuhan konsistensi (synchronous) vs. throughput/decoupling (asynchronous/event-based), bukan preferensi teknologi semata; pemilihan teknologi aktual adalah scope ARCH-TECH-001.

## 6. Candidate Integration Domain Landscape

| Integration Concern | Application Domain Terkait (ARCH-APP-001 §6) | Pola Konseptual | Evidence Status |
| --- | --- | --- | --- |
| Internal — Planning ke Budgeting | APP-PLN-001 → APP-BDG-001 | Synchronous (konsistensi data perencanaan-anggaran) | Candidate Target Direction |
| Internal — Budgeting ke Execution | APP-BDG-001 → APP-EXE-001 | Synchronous | Candidate Target Direction |
| Internal — Execution ke Performance | APP-EXE-001 → APP-PRF-001 | Asynchronous (event realisasi) | Candidate Target Direction |
| Internal — Performance ke Evaluation | APP-PRF-001 → APP-EVR-001 | Asynchronous | Candidate Target Direction |
| Internal — seluruh domain ke Data/Knowledge Management | Seluruh APP-* → APP-DKM-001 | Event-based (lineage/metadata capture) | Candidate Target Direction, melanjutkan BP-DATA-003 (Approved) |
| Internal — seluruh domain ke Publication | APP-EVR-001, APP-DKM-001 → APP-PUB-001 | Synchronous/batch (publication pipeline) | Candidate Target Direction |
| Eksternal — SIPD | APP-PLN-001, APP-BDG-001 | Belum ditetapkan (AIR-007 Decision Required) | Evidence Pending |
| Eksternal — e-SIGAP (SSO) | APP-GOV-001 (identitas/akses) | Belum ditetapkan | Evidence Pending, detail di BP-INT-002 Seq 39 |

## 7. Klasifikasi Jenis Integrasi

| Jenis | Definisi Konseptual | Batas |
| --- | --- | --- |
| Internal Synchronous | Request-response antar application domain internal untuk kebutuhan konsistensi langsung. | Tidak menetapkan protokol (REST/gRPC/dsb.); detail di STD-INT-001. |
| Internal Asynchronous/Event | Publikasi-langganan event antar domain internal untuk decoupling dan lineage capture. | Tidak menetapkan message broker/teknologi; detail di STD-INT-002. |
| Eksternal Government-to-Government | Integrasi dengan sistem pemerintah lain (SIPD). | Tidak mengasumsikan API tersedia (COMP-003); status tetap AIR-007. |
| Eksternal Identity/SSO | Integrasi identitas dengan e-SIGAP. | Detail di BP-INT-002 Seq 39. |

## 8. Boundary dengan Application Architecture (Seq 29, Approved — Batch Ini)

ARCH-APP-001 menetapkan **domain dan boundary tanggung jawab**; dokumen ini menetapkan **bagaimana domain tersebut berkomunikasi**. Dokumen ini tidak mengubah domain aplikasi yang telah ditetapkan ARCH-APP-001.

## 9. Boundary dengan Technology Architecture (Seq 40 — Batch Ini)

Dokumen ini menetapkan pola integrasi konseptual; ARCH-TECH-001 menetapkan platform, environment, dan teknologi tempat pola tersebut diimplementasikan (termasuk pilihan middleware/message broker aktual). Dokumen ini tidak menetapkan teknologi.

## 10. Boundary dengan Data Architecture (Seq 18-28, Approved)

Integrasi yang membawa data mengikuti model lineage BP-DATA-003 (Approved) dan governance BP-DATA-004/GOV-AI-001 (Approved) untuk data/knowledge; dokumen ini tidak menciptakan model lineage atau governance baru, hanya merujuk sebagai konteks pola integrasi event-based (§6).

## 11. Finding Baseline yang Relevan (Routing, Bukan Resolusi)

| Finding | Relevansi | Routing |
| --- | --- | --- |
| AIR-007 — Integrasi SIPD masih gap | Integrasi eksternal SIPD (§6) | Tetap Decision Required; BP-INT-001 (Seq 38, SIPD Integration Blueprint) **tidak termasuk batch ini** karena terikat keputusan eksternal; kontrak/akses SIPD tetap Evidence Pending. |
| AIR-003 — Status model Notification tidak konsisten | Pola event/notification (§7) | Tetap Open; didelegasikan ke STD-INT-002 (Seq 36) sebagai standar konseptual. |
| COMP-003 — REG-04 SIPD | Integrasi eksternal SIPD | Status Gap Identified tidak diubah; dokumen ini tidak menafsirkan REG-04 sebagai kewajiban API tersedia, konsisten dengan rationale COMP-003 yang sudah tercatat. |

## 12. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| API contract rinci | To be assigned by Project Owner — Evidence Pending | STD-INT-001 Seq 35 |
| Event schema/payload rinci | To be assigned by Project Owner — Evidence Pending | STD-INT-002 Seq 36 |
| Katalog API/event aktual | To be assigned by Project Owner — Evidence Pending | REF-INT-001 Seq 37 |
| Kontrak/akses SIPD | To be designated or verified by competent institutional authority — Evidence Pending | BP-INT-001 Seq 38 (di luar batch ini, terikat AIR-007) |
| Integrasi e-SIGAP/SSO rinci | To be assigned by Project Owner — Evidence Pending | BP-INT-002 Seq 39 |
| Teknologi/middleware aktual | To be assigned by Project Owner — Evidence Pending | ARCH-TECH-001 Seq 40 |

## 13. Assumptions dan Program State

1. ARCH-APP-001 (1.0.0, Approved, difinalisasi batch ini) dan BP-DATA-001 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2 tanpa disposition; dependency normatif dokumen ini adalah status artefak Approved, bukan gate disposition, konsisten dengan Sequencing Rule §6.9.
3. BP-APP-002 (Seq 32) dan BP-INT-001 (Seq 38) tidak termasuk batch ini karena terikat AIR-004/AIR-007.
4. Dokumen ini tidak menetapkan disposition G3.

## 14. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate integration principle dan domain landscape berdasarkan Application/Data Architecture yang Approved, mengklarifikasi boundary, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan API/event contract rinci, teknologi middleware, kontrak/SLA eksternal (SIPD/e-SIGAP), atau disposition Gate.

## 15. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ditemukan finding. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 16. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Integration Architecture sebagai ARCH-INT-001 Seq 34, berdasarkan ARCH-APP-001 (Approved) dan BP-DATA-001 (Approved). Cakupan: candidate integration domain landscape, klasifikasi jenis integrasi, boundary Application/Technology/Data Architecture, routing AIR-007/AIR-003/COMP-003 tanpa resolusi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED terhadap 8-item checklist. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 17. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-APP-001, BP-DATA-001) Approved dan tidak diubah.
3. ✓ Tidak ada API/event contract rinci, teknologi middleware, atau kontrak eksternal ditetapkan.
4. ✓ AIR-007/AIR-003/COMP-003 dirutekan, bukan diselesaikan; BP-INT-001 eksplisit di luar batch.
5. ✓ Boundary Application/Technology/Data Architecture akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 18. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. G1 DEFERRED; G2 tanpa disposition.

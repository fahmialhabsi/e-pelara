---
document_id: BP-APP-003
title: Application Modularization Blueprint
system: e-PeLARA Next Generation
classification: Application Architecture Blueprint
domain: Application Architecture
version: 1.1.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-06
parent_document: ../04-application-architecture/29-Application-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Domain Blueprint, Portfolio, ADR-0005
intended_repository_path: 04-application-architecture/33-Application-Modularization-Blueprint.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05; addendum 1.1.0 sebagai Draft File Operator di bawah prinsip One AI, One Responsibility)
---

# 33 — Application Modularization Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **candidate modularization concern** — prinsip dan strategi konseptual untuk memecah/menggabungkan modul aplikasi selaras dengan bounded context (BP-APP-001, Seq 31, Approved, batch ini) — tanpa menetapkan struktur folder/repository teknis, framework, atau rencana migrasi rinci.

## 2. Ruang Lingkup

Dalam scope: prinsip modularisasi, strategi decomposition/composition konseptual, kriteria modul yang selaras bounded context, dan boundary dengan legacy coexistence. Di luar scope: struktur kode/repository, framework, rencana migrasi rinci (scope RM-MIG-001 Seq 67), dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `04-application-architecture/31-Domain-and-Bounded-Context-Blueprint.md` (BP-APP-001, Approved, batch ini) §6 — bounded context per domain sebagai basis modularisasi.
- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved, batch ini) §8 — prinsip legacy coexistence.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Modularisasi

1. Modul selaras dengan bounded context (BP-APP-001 §6); modul tidak dipecah berdasarkan struktur teknis semata (mis. per-tabel database) tanpa dasar bounded context.
2. Modularisasi bersifat bertahap (incremental), konsisten dengan prinsip legacy coexistence (ARCH-APP-001 §8) — dokumen ini tidak mengasumsikan big-bang refactoring.
3. Modul yang menangani data owned yang sama (BP-APP-001 §6) adalah kandidat modul tunggal; modul yang berinteraksi lintas bounded context melalui integration pattern (ARCH-INT-001, Approved) adalah kandidat modul terpisah.
4. Kriteria modularisasi tidak menetapkan ukuran/granularitas teknis (baris kode, jumlah endpoint); kriteria berbasis tanggung jawab domain.

## 6. Candidate Modularization Strategy per Domain

| Application Domain (BP-APP-001 §6) | Strategi Modularisasi Konseptual | Catatan Legacy Coexistence |
| --- | --- | --- |
| APP-GOV-001 | Modul tunggal (identitas/kewenangan cross-cutting) | Berpotensi modul shared/foundational; detail teknis Evidence Pending. |
| APP-PLN-001, APP-BDG-001 | Modul terpisah, berinteraksi via Internal Synchronous (ARCH-INT-001 §7) | Selaras modul perencanaan/anggaran baseline existing (Documented Current). |
| APP-EXE-001, APP-PRF-001 | Modul terpisah, berinteraksi via Internal Asynchronous | Status workflow (AIR-004) memengaruhi detail modularisasi APP-EXE-001; tetap Evidence Pending. |
| APP-EVR-001 | Modul tunggal | Selaras modul evaluasi/laporan baseline. |
| APP-DKM-001 | Modul cross-cutting (event consumer dari seluruh domain) | Melanjutkan arsitektur data/knowledge Seq 18-28 (Approved); tidak menciptakan modul data baru. |
| APP-CMP-001 | Modul cross-cutting (evidence consumer) | Melanjutkan GOV-DATA-001 (Approved). |
| APP-PUB-001 | Modul terpisah, konsumen APP-EVR-001/APP-DKM-001 | Terkait AIR-005 (konsolidasi library UI); detail di STD-PUB-001 (belum dimulai). |
| APP-ADS-001 | Modul terpisah, konsumen APP-DKM-001 | Rekomendasi AI bukan decision authority (GOV-AI-001, Approved). |

## 6a. Referensi Kepatuhan Workflow State untuk Modul Baru (per ADR-0005, ditambahkan v1.1.0)

Sesuai ADR-0005 (Mandatory Generic Workflow Compliance Decision, Accepted 2026-08-06), modul baru yang memiliki siklus dokumen perencanaan/pelaporan formal tunduk pada kewajiban kepatuhan Enterprise Workflow State Model generik sebagaimana ditetapkan **BP-APP-002 §7a** — dokumen ini tidak mengulang atau memperluas kewajiban tersebut, hanya mencatat rujukannya sebagai salah satu pertimbangan desain saat modularisasi modul baru direncanakan.

Konsisten dengan batas kewajiban pada ADR-0005 §3 butir 6 dan BP-APP-002 §7a.4: pasal ini **tidak retroaktif** terhadap modul existing yang cakupannya sudah diatur ADR-0002, dan **tidak memaksa** modul dengan kebutuhan arsitektur yang secara nyata berbeda (mis. pola integrasi eksternal atau resilience yang tidak sebanding) untuk tunduk pada model generik — pengecualian semacam itu tetap memerlukan ADR/blueprint tersendiri, bukan otomatis dikecualikan atau dipaksakan oleh pasal ini. Pasal ini **tidak** mengubah strategi modularisasi per domain pada §6 (Approved 2026-08-05), dan **tidak** menetapkan mekanisme enforcement atau detail teknis apa pun — seluruh itu tetap berada di BP-APP-002 §7a sebagai satu-satunya sumber kebenaran untuk kewajiban dan kriterianya.

## 7. Prinsip Decomposition dan Composition

Decomposition (memecah modul besar) dipertimbangkan ketika satu modul menangani lebih dari satu bounded context tanpa batas jelas. Composition (menggabungkan modul kecil) dipertimbangkan ketika modul terpisah secara konsisten berbagi data owned yang sama. Keputusan decomposition/composition aktual memerlukan analisis modul existing yang belum dilakukan pada dokumen ini — tetap Evidence Pending.

## 8. Boundary dengan REF-APP-001 (Seq 30), RM-MIG-001 (Seq 67, Belum Dimulai), dan BP-APP-002 (Seq 32)

Dokumen ini menetapkan **strategi konseptual**; REF-APP-001 mencatat **inventaris modul aktual**; RM-MIG-001 menetapkan **rencana migrasi/transisi bertahap**; BP-APP-002 menetapkan **model workflow state generik dan kewajiban kepatuhannya** (§7a). Dokumen ini tidak membuat inventaris, rencana migrasi, atau mengubah model workflow state — §6a hanya merujuk kewajiban tersebut sebagai kriteria desain tambahan.

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Inventaris modul aplikasi aktual | To be assigned by Project Owner — Evidence Pending | REF-APP-001 Seq 30 |
| Keputusan decomposition/composition aktual | To be assigned by Project Owner — Evidence Pending | Analisis lanjutan / ADR bila material |
| Rencana migrasi modularisasi | To be assigned by Project Owner — Evidence Pending | RM-MIG-001 Seq 67 |
| Bentuk teknis konkret enforcement kepatuhan modul baru (§6a) | To be assigned — Evidence Pending | BP-APP-002 §7a.3, Implementation Task tim development |

## 10. Assumptions dan Program State

1. BP-APP-001 dan ARCH-APP-001 (1.0.0, Approved, batch ini) adalah dependency; tidak diubah oleh dokumen ini.
2. ADR-0005 (Accepted, 2026-08-06) dan BP-APP-002 (Draft for Review) adalah dependency tambahan sejak v1.1.0 untuk §6a; tidak diubah oleh dokumen ini.
3. G1 DEFERRED; G2 tanpa disposition.
4. Dokumen ini tidak menetapkan disposition G3.
5. §6a tidak mengklaim mekanisme enforcement telah dibangun — hanya menetapkan kriteria desain tambahan yang wajib dipertimbangkan.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate modularization strategy berdasarkan bounded context yang Approved, mengklarifikasi boundary dengan REF-APP-001/RM-MIG-001/BP-APP-002, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi. Untuk addendum v1.1.0: menambahkan rujukan kewajiban kepatuhan workflow state berdasarkan ADR-0005 (Accepted) tanpa mengubah strategi modularisasi yang sudah Approved.

**Dilarang**: Menetapkan struktur kode/repository teknis, framework, rencana migrasi rinci, mekanisme enforcement teknis konkret, atau disposition Gate.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; tidak ditemukan finding. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |
| Project Owner (addendum v1.1.0) | Fahmi Alhabsi | Mandat tercatat | Mandat eksplisit untuk memperluas BP-APP-003 dengan kewajiban kepatuhan modul baru, diberikan dalam sesi 2026-08-06 dan diformalkan via ADR-0005. | 2026-08-06 |
| Project Owner (persetujuan final §6a) | Fahmi Alhabsi | **Approved** | Meninjau redaksi §6a hasil revisi (non-prescriptive, non-retroaktif, non-pemaksaan modul berkebutuhan berbeda) dan menyetujuinya secara eksplisit. | 2026-08-06 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Application Modularization Blueprint sebagai BP-APP-003 Seq 33, berdasarkan BP-APP-001 dan ARCH-APP-001 (Approved). Cakupan: prinsip modularisasi, strategi konseptual per domain, boundary REF-APP-001/RM-MIG-001. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |
| 1.1.0 | 2026-08-06 | Perubahan terkontrol pasca-Approved: ditambahkan §6a (Referensi Kepatuhan Workflow State untuk Modul Baru) berdasarkan mandat eksplisit Project Owner dan ADR-0005 (Accepted 2026-08-06). Strategi modularisasi per domain (§6) TIDAK diubah. §8 dan §9 diperbarui untuk mencatat boundary dan Evidence Pending baru terkait §6a. effective_date §6 tetap 2026-08-05 untuk isi asli; last_reviewed diperbarui ke 2026-08-06. | Claude Work, atas mandat eksplisit Project Owner (ADR-0005) | Approved (perubahan terkontrol) |
| 1.1.0 (revisi redaksional) | 2026-08-06 | Atas permintaan review Project Owner: §6a ditulis ulang agar tidak prescriptive — kata "wajib mempertimbangkan" diganti dengan pernyataan rujukan murni ke BP-APP-002 §7a sebagai satu-satunya sumber kewajiban, dan ditambahkan penegasan eksplisit non-retroaktif serta non-pemaksaan terhadap modul berkebutuhan arsitektur berbeda, selaras ADR-0005 §3 butir 6. Tidak ada perubahan substansi lain. | Claude Work | Approved (perubahan terkontrol) |
| 1.1.0 (final) | 2026-08-06 | **Persetujuan eksplisit**: Project Owner meninjau §6a hasil revisi dan menyatakan setuju. Tidak ada perubahan isi lebih lanjut pada langkah ini — hanya pencatatan formal persetujuan. | Claude Work, berdasarkan persetujuan eksplisit Project Owner | Approved |

## 14. Validation Checklist (Version 1.1.0)

1. ✓ Metadata: version 1.1.0, status Approved, effective_date asli 2026-08-05 dipertahankan, last_reviewed 2026-08-06.
2. ✓ Dependency (BP-APP-001, ARCH-APP-001) Approved dan tidak diubah; ADR-0005 dan BP-APP-002 ditambahkan sebagai dependency §6a.
3. ✓ Tidak ada struktur kode/repository/framework konkret ditetapkan; §6a eksplisit mendelegasikan detail teknis ke BP-APP-002 §7a.3.
4. ✓ Strategi modularisasi per domain (§6) tidak diubah — perubahan bersifat aditif (§6a baru).
5. ✓ Boundary REF-APP-001/RM-MIG-001/BP-APP-002 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat; tidak ada disposition G3 baru.
7. ✓ Perubahan dilakukan atas mandat eksplisit Project Owner (ADR-0005), bukan revisi sepihak terhadap artefak Approved.
8. ✓ Tidak ada file lain tersentuh selain dokumen ini.

## 15. State Aktual Dokumen

Version 1.1.0, status **Approved**, effective_date 2026-08-05 (isi asli §1-6, §7-9 lama), addendum §6a efektif 2026-08-06 atas mandat ADR-0005. Dependency Approved/Accepted dan tidak diubah untuk bagian yang sudah ada. G1 DEFERRED; G2 tanpa disposition; tidak ada disposition G3.

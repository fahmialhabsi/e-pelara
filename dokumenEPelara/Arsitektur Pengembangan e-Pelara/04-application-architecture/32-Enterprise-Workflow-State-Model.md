---
document_id: BP-APP-002
title: Enterprise Workflow State Model
system: e-PeLARA Next Generation
classification: Application Architecture Blueprint
domain: Business and Application Architecture
version: 0.2.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-06
last_reviewed: 2026-08-06
parent_document: ../04-application-architecture/29-Application-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Document Lifecycle; AIR-004; ADR-0002; ADR-0005
intended_repository_path: 04-application-architecture/32-Enterprise-Workflow-State-Model.md
prepared_by: Claude Work (Draft File Operator, di bawah mandat Project Owner Fahmi Alhabsi; Chief Enterprise Architect ChatGPT sebagai pemegang keputusan arsitektur)
review_outcome: PASSED
---

# 32 — Enterprise Workflow State Model

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **candidate Enterprise Workflow State Model** — model status/state resmi untuk workflow approval dokumen perencanaan, berlaku lintas modul, sebagai resolusi arsitektur atas AIR-004 (Ketidakjelasan status implementasi workflow approval), sesuai keputusan ADR-0002 (Enterprise Workflow State Model Decision, Accepted 2026-08-06, Opsi A — Standardisasi Penuh).

Dokumen ini **melanjutkan** ADR-0002, bukan menggantikannya. ADR-0002 menetapkan **arah keputusan** (standardisasi penuh ke model generik 4-state); dokumen ini menjabarkan model tersebut menjadi blueprint arsitektur yang lebih rinci — tetap pada level **candidate design**, bukan spesifikasi implementasi teknis siap-bangun.

Revisi 0.2.0 menambahkan pasal kewajiban kepatuhan untuk modul baru (§7a), sesuai ADR-0005 (Mandatory Generic Workflow Compliance Decision, Accepted 2026-08-06) — menetapkan bahwa modul yang ditambahkan ke e-PeLARA di masa depan wajib mengikuti model empat-state ini tanpa memerlukan revisi/persetujuan ulang blueprint ini untuk setiap modul baru.

Status **Approved**; version 0.2.0; effective_date 2026-08-06; review_outcome PASSED — disetujui Project Owner pada 2026-08-06.

## 2. Ruang Lingkup

Dalam scope: state resmi workflow approval (jumlah dan nama state), transisi yang diizinkan antar state, prinsip otorisasi transisi (kategori peran, bukan penunjukan pejabat institusional), cakupan modul yang tunduk pada model ini, dan boundary dengan checklist granular per modul (mis. Renja).

Di luar scope (eksplisit, sesuai batasan proyek dan ADR-0002 §1.3/§3.1): skema database fisik, kode/migrasi aplikasi aktual, penunjukan owner/steward institusional, kewenangan hukum approval, API/event contract teknis, rencana migrasi data Renja yang konkret, penyatuan definisi admin secara teknis, disposition Gate G3, dan keputusan approval berjenjang/multi-eselon (ditolak oleh ADR-0002, tetap Evidence Pending untuk masa depan).

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/adr/ADR-0002-Enterprise-Workflow-State-Model-Decision.md` (ADR-0002, Accepted 2026-08-06) — keputusan model state, transisi, dan batas kewenangan.
- `00-governance/adr/ADR-0005-Mandatory-Generic-Workflow-Compliance-Decision.md` (ADR-0005, Accepted 2026-08-06) — keputusan kewajiban kepatuhan modul baru dan kerangka enforcement berlapis.
- `00-governance/03-Architecture-Issue-Register.md` (AIR-EA-001, Version 1.0.4) — entri AIR-004, Resolved merujuk ADR-0002.
- `04-application-architecture/31-Domain-and-Bounded-Context-Blueprint.md` (BP-APP-001, Approved) §6 — bounded context per domain, termasuk APP-EXE-001/APP-PRF-001 yang dicatat eksplisit dipengaruhi status AIR-004.
- `04-application-architecture/33-Application-Modularization-Blueprint.md` (BP-APP-003, Approved) §6 — catatan bahwa "Status workflow (AIR-004) memengaruhi detail modularisasi APP-EXE-001; tetap Evidence Pending", dikutip verbatim sebagai konteks dependency.
- `04-application-architecture/29-Application-Architecture.md` (ARCH-APP-001, Approved) — konteks domain aplikasi tempat workflow ini beroperasi.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Model State Resmi (per ADR-0002 §3)

### 5.1 Empat State

| State | Deskripsi |
| --- | --- |
| `DRAFT` | Dokumen sedang disusun/direvisi; belum diajukan untuk review. State awal seluruh dokumen. |
| `SUBMITTED` | Dokumen telah diajukan oleh pengaju untuk direview approver. |
| `APPROVED` | Dokumen telah disetujui approver; dianggap final untuk siklus berjalan. |
| `REJECTED` | Dokumen ditolak approver dengan alasan wajib disertakan. |

Tidak ada state tambahan pada level enterprise di luar keempat ini (ADR-0002 §3.1).

### 5.2 Transisi yang Diizinkan

| Aksi | Dari State | Menuju State | Catatan |
| --- | --- | --- | --- |
| `SUBMIT` | `DRAFT`, `REJECTED` | `SUBMITTED` | Dokumen yang ditolak dapat diajukan ulang tanpa melalui `DRAFT` secara eksplisit. |
| `APPROVE` | `SUBMITTED` | `APPROVED` | Hanya dari status diajukan. |
| `REJECT` | `SUBMITTED` | `REJECTED` | Alasan/catatan penolakan wajib disertakan. |
| `REVISE` | `APPROVED`, `REJECTED`, `SUBMITTED` | `DRAFT` | Membuka kembali dokumen dari status apa pun menuju status awal untuk revisi. |

Transisi di luar tabel ini (mis. `DRAFT` langsung ke `APPROVED`) tidak diizinkan pada model resmi ini.

### 5.3 Prinsip Audit Trail

Setiap transisi wajib tercatat sebagai entri log tersendiri (bukan hanya overwrite kolom status), memuat minimal: state asal, state tujuan, aksi, waktu, pelaku, dan catatan (wajib untuk `REJECT`, opsional untuk aksi lain). Prinsip ini menegaskan kembali kebutuhan auditability yang menjadi dampak utama AIR-004; dokumen ini tidak menetapkan skema tabel/log teknis konkret.

## 6. Cakupan Modul

### 6.1 Modul yang Tunduk pada Model Ini

Sesuai ADR-0002 §3 butir 3, model empat-state ini berlaku seragam untuk seluruh modul dengan siklus dokumen perencanaan/pelaporan formal: **RPJMD, Renstra, Renja, RKA, DPA, RKPD, dan LAKIP**. Tidak ada pengecualian model state untuk modul-modul ini pada level enterprise.

### 6.2 RPJMD — Kewajiban Penyelarasan

ADR-0002 §3 butir 4 mencatat bahwa sinkronisasi status RPJMD ke model ini belum lengkap secara implementasi. Dokumen ini menetapkan sebagai **prinsip arsitektur**: RPJMD harus memiliki sinkronisasi status yang setara dengan modul lain — tidak boleh ada modul yang "valid" secara validasi tetapi silent no-op secara penyimpanan status. Detail teknis penyelarasan ini didelegasikan sebagai Evidence Pending ke pekerjaan implementasi terpisah (§9).

### 6.3 Renja — Checklist Granular sebagai Metadata, Bukan State Terpisah

Sesuai ADR-0002 §3 butir 5, Renja mempertahankan checklist granular per sub-tahap pengisian dokumen (mis. ketersediaan, distribusi, konsumsi, UPTD) sebagai **metadata pendukung kelengkapan**, bukan sebagai state resmi yang menggantikan atau berjalan paralel dengan model empat-state di atas. Prinsipnya:

1. Renja memiliki **satu** status resmi (salah satu dari `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`) sebagai sumber kebenaran status dokumen pada level enterprise.
2. Checklist granular adalah representasi kelengkapan pengisian data di dalam state `DRAFT` (atau state lain), bukan status lifecycle tersendiri. Sebuah dokumen Renja dapat berada di state `DRAFT` dengan checklist granular yang sebagian terisi.
3. Hubungan teknis pemetaan antara checklist granular yang sudah ada (kolom `status` string dan empat boolean sub-tahap) dengan model empat-state ini — termasuk rencana migrasi data — **tidak ditetapkan oleh dokumen ini**, tetap Evidence Pending, didelegasikan ke pekerjaan implementasi terpisah (§9).

### 6.4 Modul di Luar Cakupan Eksplisit

BMD, TLHP, MR (Manajemen Risiko), LK, dan Penatausahaan/BKU **tidak** termasuk cakupan yang diputuskan ADR-0002. Dokumen ini tidak menetapkan apakah modul-modul tersebut akan mengikuti model empat-state yang sama atau memerlukan model berbeda — dicatat sebagai Evidence Pending (§9), memerlukan analisis arsitektur lanjutan sebelum diputuskan.

## 7. Prinsip Otorisasi Transisi

Mengikuti pola dua tingkat yang sudah menjadi rujukan normatif ADR-0002:

1. **Kategori Pengaju** — dapat melakukan transisi `SUBMIT`. Tidak ada pembatasan kategori peran khusus untuk pengajuan pada level model ini.
2. **Kategori Approver/Admin** — dapat melakukan transisi `APPROVE`, `REJECT`, dan `REVISE`. Dokumen ini menetapkan sebagai **prinsip arsitektur** bahwa kategori "Approver/Admin" harus merupakan **satu definisi tunggal** yang konsisten dipakai oleh seluruh mekanisme yang berkaitan dengan workflow ini (termasuk mekanisme penguncian dokumen ter-approve). Penyatuan definisi otorisasi secara teknis **tidak ditetapkan oleh dokumen ini**, didelegasikan sebagai Evidence Pending ke pekerjaan implementasi terpisah (§9).
3. Dokumen ini **tidak** menetapkan siapa secara institusional/hukum berwenang menjadi approver pada masing-masing modul — kategori **institutional/statutory authority**, tetap `To be designated or verified by competent institutional authority — Evidence Pending`, konsisten dengan pola ADR-0001/ADR-0002.
4. Approval berjenjang/multi-eselon **tidak** menjadi bagian model resmi ini (ADR-0002 §3 butir 7, Opsi B ditolak untuk saat ini). Kebutuhan approval berjenjang untuk modul tertentu di masa depan tetap Evidence Pending, memerlukan ADR terpisah bila dikonfirmasi oleh Project Owner.

## 7a. Kewajiban Kepatuhan Modul Baru (per ADR-0005)

### 7a.1 Prinsip Kewajiban

Sesuai ADR-0005 (Mandatory Generic Workflow Compliance Decision, Accepted 2026-08-06), setiap modul baru yang ditambahkan ke e-PeLARA setelah dokumen ini dan **memiliki siklus dokumen perencanaan/pelaporan formal** wajib mengadopsi model empat-state ini (§5) dan transisi resminya, kecuali dikecualikan secara eksplisit oleh ADR terpisah di masa depan. Kewajiban ini bersifat **forward-looking**: berlaku otomatis untuk modul baru tanpa memerlukan revisi atau persetujuan ulang terhadap dokumen ini, BP-APP-003, BP-INT-001, atau BP-TECH-003 untuk setiap modul yang dibuat.

### 7a.2 Kriteria Validasi Kepatuhan (Deskripsi Arsitektural)

Dokumen ini mendeskripsikan **kriteria** yang perlu diperiksa untuk menilai kepatuhan modul baru terhadap model ini — sebagai kerangka arsitektural, bukan spesifikasi teknis siap-implementasi:

| Kriteria | Deskripsi |
| --- | --- |
| Field/kolom status | Modul baru harus memiliki satu kolom status resmi yang nilainya terbatas pada `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED` (atau padanan literalnya), bukan menciptakan skema status paralel tanpa alasan arsitektur yang terdokumentasi. |
| Nilai enum/domain nilai | Nilai yang diizinkan pada kolom status harus persis empat nilai pada §5.1 — penambahan nilai lain di level enterprise tidak diizinkan tanpa ADR terpisah. |
| Transisi state | Perubahan status harus mengikuti tabel transisi §5.2 (`SUBMIT`/`APPROVE`/`REJECT`/`REVISE`); transisi yang tidak terdaftar (mis. `DRAFT` langsung ke `APPROVED`) dianggap tidak patuh. |
| Audit trail | Setiap transisi harus tercatat sebagai entri log tersendiri, konsisten dengan prinsip §5.3, bukan hanya overwrite kolom status tanpa jejak. |
| Metadata granular tambahan | Modul boleh memiliki checklist/metadata granular internal (seperti pola Renja, §6.3), selama itu tidak menggantikan atau berjalan paralel dengan status resmi empat-state. |

### 7a.3 Kerangka Enforcement Berlapis (Candidate Target Direction)

Sesuai ADR-0005 §3 butir 4, kepatuhan terhadap kriteria di atas didekati secara berlapis. Dokumen ini mencatat kerangka ini sebagai arah arsitektur, **tanpa** menetapkan implementasi teknis konkret. Spesifikasi teknis rinci (kriteria pemeriksaan, pseudocode, rancangan constraint) tersedia sebagai lampiran terpisah: **32a — Enterprise Workflow Compliance Enforcement: Technical Specification** (`04-application-architecture/32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md`, status Planned/Draft for Review) — lampiran tersebut tetap berupa spesifikasi, bukan kode aplikasi yang sudah dieksekusi.

1. **Lapis Governance** — pasal ini (§7a) dan pasal terkait pada BP-APP-003 adalah mandat governance yang mendasari kewajiban. Kepatuhan diverifikasi pertama kali melalui architecture review saat modul baru diajukan.
2. **Lapis Static Check** — kerangka arsitektural: sebuah pemeriksaan otomatis dapat memindai model/migration modul baru dan memvalidasi kriteria §7a.2 (field status ada, nilai enum cocok, tidak ada state tambahan tak terdaftar), mengikuti pola self-check script yang sudah menjadi konvensi proyek (`backend/scripts/*ValidationSelfTest.js`) sebagai referensi bentuk. Dokumen ini **tidak** menuliskan script tersebut, tidak menentukan nama file, tool, atau exit-code behavior — itu adalah Implementation Task terpisah (§9).
3. **Lapis Schema Constraint** — kerangka arsitektural: kolom status modul baru sebaiknya dibatasi melalui ENUM atau CHECK constraint pada level basis data, membatasi nilai hanya pada empat state resmi, sebagai pertahanan lapis kedua terhadap data tidak valid. Dokumen ini **tidak** menetapkan sintaks migrasi konkret — itu adalah Implementation Task terpisah (§9).

### 7a.4 Batas Kewajiban

Kewajiban ini **tidak** berlaku retroaktif untuk memaksa migrasi modul existing yang sudah tercakup ADR-0002 (RPJMD, Renstra, Renja, RKA, DPA, RKPD, LAKIP) — modul-modul tersebut tetap tunduk pada arah penyelesaian yang sudah ditetapkan ADR-0002 dan §6 dokumen ini. Kewajiban ini juga **tidak** otomatis berlaku untuk modul yang secara nyata memiliki kebutuhan arsitektur berbeda (mis. pola integrasi eksternal atau kebutuhan resilience yang tidak sebanding) — modul semacam itu memerlukan ADR/blueprint tersendiri untuk menetapkan pengecualian, bukan tunduk paksa ke pasal ini.

## 8. Boundary dengan Artefak Lain

| Artefak | Hubungan |
| --- | --- |
| ADR-0002 (Accepted) | Keputusan arsitektur yang mendasari dokumen ini; dokumen ini menjabarkan, tidak mengubah keputusan ADR-0002. |
| ADR-0005 (Accepted) | Keputusan kewajiban kepatuhan modul baru; §7a dokumen ini menjabarkan ADR-0005, tidak mengubah keputusannya. |
| BP-APP-001 (Seq 31, Approved) | Menetapkan bounded context per domain; dokumen ini tidak mengubah bounded context, hanya menambahkan model state pada domain APP-EXE-001/APP-PRF-001 yang telah dicatat dipengaruhi AIR-004. |
| BP-APP-003 (Seq 33, Approved) | Mencatat bahwa detail modularisasi APP-EXE-001 dipengaruhi status AIR-004; dokumen ini melengkapi catatan tersebut dengan model state resmi, tanpa mengubah strategi modularisasi BP-APP-003. |
| BP-BUS-003 (Government Document Lifecycle Blueprint, Approved) | Menetapkan siklus hidup dokumen pada level bisnis; dokumen ini menetapkan model state teknis-arsitektural yang selaras, tidak menggantikan BP-BUS-003. |
| BP-BUS-004 (Roles, Authority and Approval Blueprint, Approved) | Menetapkan kerangka peran dan otoritas approval pada level bisnis; dokumen ini tidak menetapkan kewenangan institusional, hanya kategori peran teknis (§7). |

## 9. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Rencana migrasi teknis konkret status Renja (kolom `status` + 4 boolean → 4-state generik) | To be assigned by Project Owner — Evidence Pending | Migration/Implementation (Seq 67+) |
| Perbaikan sinkronisasi status RPJMD ke tabel dokumen | To be assigned by Project Owner — Evidence Pending | Migration/Implementation (Seq 67+) |
| Penyatuan teknis definisi otorisasi admin (dua sumber definisi paralel) | To be assigned by Project Owner — Evidence Pending | Migration/Implementation (Seq 67+) |
| Disposisi modul BMD, TLHP, MR, LK, Penatausahaan/BKU terhadap model ini | To be assigned by Project Owner — Evidence Pending | Analisis arsitektur lanjutan |
| Kebutuhan approval berjenjang/multi-eselon di masa depan | To be assigned by Project Owner — Evidence Pending | ADR terpisah bila dikonfirmasi |
| Owner/steward institusional per modul untuk peran approver | To be assigned by Project Owner — Evidence Pending | Governance lanjutan |
| Skema database/log audit trail teknis konkret | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |
| Bentuk teknis konkret static check/lint rule (bahasa, tool, lokasi file, exit-code behavior) | To be assigned — Evidence Pending | Implementation Task, tim development |
| Wiring CI/CD untuk menjadikan static check sebagai required gate | To be assigned by Project Owner — Evidence Pending | Bergantung ketersediaan infrastruktur CI, belum diverifikasi |
| Sintaks CHECK constraint/ENUM konkret per modul baru | To be assigned — Evidence Pending | Implementasi teknis saat modul dibangun |
| Proses persetujuan pengecualian pola generik untuk modul tertentu | To be assigned by Project Owner — Evidence Pending | Governance lanjutan, sama seperti proses persetujuan blueprint |

## 10. Assumptions dan Program State

1. ADR-0002 dan ADR-0005 (Accepted, 2026-08-06) adalah dependency utama; tidak diubah oleh dokumen ini.
2. BP-APP-001 dan BP-APP-003 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini. BP-APP-003 akan di-version-bump terkontrol secara terpisah untuk mencerminkan ADR-0005 (lihat §17c Master Artifact Register bila relevan).
3. G1 tetap tanpa disposition tercatat pada dokumen ini; G2 tanpa disposition; G3 tidak ditetapkan oleh dokumen ini.
4. AIR-004 Resolved (bukan Closed) sebagai konsekuensi ADR-0002; closure approval eksplisit Project Owner belum diperoleh terpisah.
5. Dokumen ini tidak mengklaim gap teknis yang dicatat pada §9 telah diperbaiki; dokumen ini hanya menjabarkan model state yang disepakati.
6. Dokumen ini tidak mengklaim mekanisme enforcement berlapis (§7a.3) telah dibangun atau berjalan — hanya menetapkan kerangka arsitektural dan kewajiban prinsip.

## 11. Batas Kewenangan AI

**Diizinkan**: Menyusun candidate Enterprise Workflow State Model berdasarkan ADR-0002 (Accepted) dan blueprint Application Architecture yang Approved, mengklarifikasi cakupan modul dan prinsip otorisasi pada level kategori peran, routing Evidence Pending, dan menyiapkan draft untuk review.

**Dilarang**: Menetapkan skema database/kode aplikasi aktual, menunjuk owner/steward institusional, menetapkan kewenangan hukum approval, menetapkan API/event contract teknis, mengklaim implementasi migrasi telah dilaksanakan, menetapkan approval berjenjang sebagai model resmi, atau memberikan disposition Gate G3.

## 12. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / Draft File Operator | Claude Work | Selesai | Disusun berdasarkan ADR-0002/ADR-0005 (Accepted) dan dependency Approved. | 2026-08-06 |
| Chief Enterprise Architect | ChatGPT | Belum dilakukan terpisah | Review substantif oleh ChatGPT belum tercatat terpisah pada sesi ini; Project Owner memberikan persetujuan final secara langsung. | — |
| Project Owner | Fahmi Alhabsi | **Approved** | Disetujui secara eksplisit 2026-08-06, termasuk §7a (Kewajiban Kepatuhan Modul Baru). | 2026-08-06 |

## 13. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Penyusunan awal Enterprise Workflow State Model sebagai BP-APP-002 Seq 32, berdasarkan ADR-0002 (Enterprise Workflow State Model Decision, Accepted 2026-08-06) dan dependency Approved (BP-APP-001, BP-APP-003, ARCH-APP-001). Cakupan: model 4-state resmi, transisi yang diizinkan, cakupan modul (termasuk penanganan khusus RPJMD dan Renja), prinsip otorisasi kategori peran, dan boundary dengan artefak lain. Tidak menetapkan skema teknis, migrasi aktual, atau disposition Gate. | Claude Work | Draft for Review |
| 0.2.0 | 2026-08-06 | Ditambahkan §7a (Kewajiban Kepatuhan Modul Baru) berdasarkan ADR-0005 (Mandatory Generic Workflow Compliance Decision, Accepted 2026-08-06): prinsip kewajiban forward-looking, kriteria validasi kepatuhan (deskripsi arsitektural), kerangka enforcement berlapis (governance/static check/schema constraint) sebagai Candidate Target Direction, dan batas kewajiban. §8, §9, §10 diperbarui untuk konsistensi referensi ADR-0005. Tidak ada kode/script validasi ditulis; tidak ada disposition Gate ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-06 | Rujukan ditambahkan ke lampiran teknis 32a (Enforcement Specification) pada §7a.3. | Claude Work | — |
| 0.2.0 (final) | 2026-08-06 | **Finalisasi**: Project Owner menyetujui BP-APP-002 v0.2.0 secara eksplisit, termasuk isi §7a. Status dinaikkan menjadi Approved, effective_date 2026-08-06, review_outcome PASSED. | Claude Work, berdasarkan persetujuan eksplisit Project Owner | Approved |

## 14. Validation Checklist (Version 0.2.0 Approved)

1. ✓ Metadata: version 0.2.0, status Draft for Review, effective_date null, review_outcome Pending.
2. ✓ Dependency (ADR-0002, ADR-0005, BP-APP-001, BP-APP-003, ARCH-APP-001) dikutip akurat dan tidak diubah.
3. ✓ Tidak ada skema database/kode aplikasi konkret ditetapkan; §7a.3 eksplisit mencatat kerangka enforcement sebagai Candidate Target Direction, bukan implementasi.
4. ✓ Tidak ada owner/steward institusional atau kewenangan hukum ditetapkan.
5. ✓ Approval berjenjang secara eksplisit dicatat ditolak untuk saat ini (Evidence Pending), bukan diadopsi.
6. ✓ Tidak ada disposition Gate G3 ditetapkan.
7. ✓ Kewajiban §7a dicatat forward-looking, tidak retroaktif memaksa migrasi modul existing (§7a.4).
8. ✓ Tidak ada file lain tersentuh selain dokumen ini.

## 15. State Aktual Dokumen

Version 0.2.0, status **Approved**, effective_date 2026-08-06, review_outcome PASSED. Disetujui Project Owner (Fahmi Alhabsi) 2026-08-06. Dependency (ADR-0002, ADR-0005, BP-APP-001, BP-APP-003) Approved/Accepted dan tidak diubah. G1/G2 tanpa disposition tercatat pada dokumen ini; G3 tidak ditetapkan oleh dokumen ini.

## 16. Addendum — RenjaDokumen Masuk Cakupan (Sprint 1 Fase 4, 2026-08-07)

**Status addendum: Draft for Review** — bagian ini TIDAK mengubah status Approved v0.2.0 di atas (§1–§15 tidak disentuh). Version metadata di front-matter TIDAK di-bump pada draft ini; bump version formal (mis. ke 0.3.0) dan perubahan `status`/`effective_date`/`review_outcome` di front-matter adalah keputusan Owner terpisah, sesuai pola yang sama dipakai saat §7a ditambahkan (disusun dulu sebagai draft, disetujui Owner belakangan).

### 16.1 Keputusan Owner

Project Owner (Fahmi Alhabsi), 2026-08-07, menetapkan: **RenjaDokumen masuk cakupan konsolidasi lifecycle dan workflow BP-APP-002** (melengkapi §6.1, yang sebelumnya hanya mencantumkan RPJMD, Renstra, Renja, RKA, DPA, RKPD, LAKIP — tidak menyebut RenjaDokumen sebagai entitas terpisah dari Renja). `workflow_status` (kolom pada `renja_dokumen`) ditetapkan sebagai field authoritative untuk status proses RenjaDokumen.

### 16.2 Pemetaan ke Model Empat-State (§5.1)

RenjaDokumen memakai mesin transisi tujuh-state (`draft`/`submitted`/`reviewed`/`approved`/`published`/`rejected`/`archived`, lihat `backend/services/renjaWorkflowGuardService.js`) — LEBIH RINCI dari model generik empat-state (`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`) pada §5.1. Ini dicatat sebagai kondisi faktual (Documented Current Fact), bukan diselaraskan paksa ke empat-state pada addendum ini — penyelarasan penuh (atau keputusan bahwa tujuh-state adalah spesialisasi sah dari model generik untuk modul dengan tahap review terpisah) tetap Evidence Pending, routing ke analisis arsitektur lanjutan (§16.5).

Kolom `status` lama (ENUM `draft`/`review`/`final`) pada `renja_dokumen` — pola yang sama dengan §6.3 (checklist granular Renja sebagai metadata, bukan state resmi terpisah) — ditetapkan **legacy/deprecated**, dipertahankan untuk kompatibilitas mundur, TIDAK dihapus. Pemetaan resmi `workflow_status` → `status` (satu arah, non-1:1) didokumentasikan di `backend/services/renjaDokumenStatusSyncService.js`.

### 16.3 Implementasi Teknis Terbatas (dilaporkan, belum diverifikasi independen)

Sesuai instruksi Owner ("addendum implementasi terbatas, bukan redesain arsitektur dari awal"), implementasi berikut dilaksanakan pada sesi coding terpisah (Sprint 1, Fase 4):

- Modul sentralisasi baru `backend/services/renjaDokumenStatusSyncService.js` — satu-satunya titik resmi yang menurunkan `status` (legacy) dari `workflow_status` (authoritative). Sinkronisasi TIDAK lagi ditulis tersebar per controller.
- `backend/controllers/renjaGovernanceController.js` (`workflowAction()`, `deleteDokumen()`) — diarahkan memakai service sentral di atas, menggantikan mapping inline yang sebelumnya hanya menangani kasus `published` (celah: transisi `reviewed`/`approved`/`archived` sebelumnya tidak pernah memperbarui `status` legacy).
- `backend/controllers/planningRenjaDokumenController.js` (`updateDokumen()`) — endpoint legacy yang menulis `status` langsung dari body request (di luar mesin transisi resmi) diberi pengaman: `workflow_status` disinkronkan lewat pemetaan terbalik best-effort, dengan aturan tidak pernah menurunkan `workflow_status` yang sudah lebih maju.
- Migrasi data `20260807120002-reconcile-renja-dokumen-workflow-status-authoritative.js` — merekonsiliasi baris `renja_dokumen` yang historically desync, memakai pemetaan resmi di atas. Skema TIDAK diubah, kolom lama TIDAK dihapus.

Evidence pelaksanaan (syntax check, hasil dry-run) dilaporkan oleh pelaksana implementasi pada laporan Fase 4 terpisah — **belum diverifikasi independen** oleh Chief Enterprise Architect maupun Draft File Operator pada dokumen ini, konsisten dengan pola evidence 32a §Master Artifact Register.

### 16.4 Batas Addendum Ini

Addendum ini TIDAK menetapkan: skema database final untuk penyatuan tujuh-state ke empat-state generik, rencana penghapusan kolom `status` legacy, disposition Gate G3, atau kewenangan institusional approver RenjaDokumen. Addendum ini juga tidak mengklaim migrasi data telah dieksekusi terhadap database produksi — eksekusi migrasi tetap memerlukan backup dan dry-run oleh Owner terlebih dahulu (lihat laporan Fase 4).

### 16.5 Evidence Pending Tambahan (melengkapi §9)

| Item | Placeholder | Routing |
| --- | --- | --- |
| Penyelarasan formal tujuh-state RenjaDokumen ke model generik empat-state (§5.1) — apakah dianggap spesialisasi sah atau perlu diseragamkan | To be assigned by Project Owner — Evidence Pending | Analisis arsitektur lanjutan |
| Rencana penghapusan kolom `status` (legacy) pada `renja_dokumen` setelah migrasi/audit/regresi selesai | To be assigned by Project Owner — Evidence Pending | Sprint terpisah |
| Verifikasi independen migrasi data `20260807120002-...` terhadap database produksi nyata | To be assigned — Evidence Pending | Fase 5 (test suite) / Owner |

### 16.6 Change Log Addendum

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| — (addendum, belum mengubah version dokumen utama) | 2026-08-07 | Ditambahkan §16: RenjaDokumen masuk cakupan BP-APP-002 per keputusan Owner Sprint 1 Fase 4; dokumentasi pemetaan workflow_status↔status legacy; implementasi teknis terbatas dilaporkan (belum diverifikasi independen). | Claude (Lead Implementer, mandat piagam implementasi e-PeLARA) | Draft for Review |

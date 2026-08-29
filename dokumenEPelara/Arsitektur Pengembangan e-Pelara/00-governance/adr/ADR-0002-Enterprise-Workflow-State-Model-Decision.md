---
document_id: ADR-0002
title: Enterprise Workflow State Model Decision — Standardisasi Model State Approval Lintas Modul
system: e-PeLARA Next Generation
classification: Architecture Decision Record
domain: Business and Application Architecture
version: 1.0.0
status: Accepted
owner: Project Owner
prepared_by: Claude Work (Acting Chief Enterprise Architect, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10)
effective_date: 2026-08-06
decision_authority: Project Owner — Fahmi Alhabsi
roadmap_dependency:
  - AIR-004 — Architecture Issue Register (ketidakjelasan status implementasi workflow approval)
  - BP-APP-002 — Enterprise Workflow State Model (Seq 32, artefak yang didelegasikan pada keputusan ini)
  - BP-APP-001 — Domain and Bounded Context Blueprint (mengecualikan workflow state model dari scope-nya)
  - BP-APP-003 — Application Modularization Blueprint (mengecualikan workflow state model dari scope-nya)
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture; keputusan ini adalah salah satu evidence minimum G3, bukan G3 disposition itu sendiri
intended_repository_path: 00-governance/adr/ADR-0002-Enterprise-Workflow-State-Model-Decision.md
---

# ADR-0002 — Enterprise Workflow State Model Decision: Standardisasi Model State Approval Lintas Modul

**Status: Accepted.** Project Owner (Fahmi Alhabsi) telah memilih **Opsi A — Standardisasi Penuh** pada 6 Agustus 2026. Dokumen ini adalah versi final ADR-0002.

---

## 1. Konteks Masalah

### 1.1 Sumber ketidakjelasan

Architecture Issue Register mencatat AIR-004 ("Ketidakjelasan status implementasi workflow approval") sebagai Critical/Decision Required sejak Wave 0, dengan evidence dari Charter §11, Roadmap BP-APP-002/G3, dan `01-current-state/4-penilaian-kesesuaian-standar.md` §4.6. Peninjauan langsung terhadap implementasi kode aplikasi (bukan hanya dokumentasi) pada 2026-08-06 mengonfirmasi kontradiksi berikut:

| Aspek | Kondisi ditemukan | Evidence |
| --- | --- | --- |
| Model generik | `ApprovalLog` (model) + `approvalController.js` mengimplementasikan 4 state (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`) dengan transisi `SUBMIT`/`APPROVE`/`REJECT`/`REVISE`, berlaku untuk 6 entity_type: `dpa, rka, lakip, renja, rkpd, renstra`. | `backend/models/ApprovalLog.js`; `backend/controllers/approvalController.js` (TRANSITIONS map, baris ~38-43). |
| RPJMD | Terdaftar sebagai `entity_type` valid pada validasi, tetapi **tidak ada** di `ENTITY_TABLE_MAP` — status approval tidak pernah tersinkron ke tabel `rpjmd`; transisi tercatat di log tapi silent no-op terhadap tabel dokumen. | `backend/controllers/approvalController.js` (`VALID_ENTITY_TYPES` vs `ENTITY_TABLE_MAP`). |
| Renja | Memiliki kolom `status` sendiri (STRING, bukan ENUM `approval_status`) plus empat kolom boolean granular per sub-tahap (`ketersediaan_submitted`, `distribusi_submitted`, `konsumsi_submitted`, `uptd_submitted`), terpisah dari model generik. Migrasi bernama `20260415153000-renja-governance-workflow-v3.js` mengindikasikan sudah melalui minimal 3 iterasi desain terpisah. | `backend/models/renjaModel.js`; `backend/services/renjaGovernanceService.js`; `backend/migrations/20260415153000-renja-governance-workflow-v3.js`. |
| Definisi otorisasi admin | Dua definisi "admin" berbeda dipakai untuk fungsi yang saling berkaitan: `ADMIN_ROLES` (hardcoded array di `approvalController.js`, dipakai untuk approve/reject/revise) versus `isWorkflowAdminRole()` (function di `planningWorkflowService.js`, dipakai oleh `guardApproved.js` untuk mengunci edit dokumen APPROVED). | `backend/controllers/approvalController.js`; `backend/middlewares/guardApproved.js`; `backend/services/planningWorkflowService.js`. |
| Modul di luar cakupan | BMD, TLHP, MR (Manajemen Risiko), LK, dan Penatausahaan/BKU tidak tersentuh sistem approval generik ini sama sekali; mekanisme status masing-masing modul tersebut belum diverifikasi pada peninjauan ini. | Grep menyeluruh terhadap `backend/` untuk `VALID_ENTITY_TYPES`/`ENTITY_TABLE_MAP`/`TABLE_STATUS_MAP`. |

### 1.2 Mengapa keputusan ini diperlukan

Roadmap RM-EA-001 menempatkan BP-APP-002 (Seq 32) sebagai artefak Critical dengan dependency eksplisit ke AIR-004 dan Gate G3. BP-APP-001 dan BP-APP-003 (keduanya Approved) secara eksplisit mengecualikan workflow state model dari scope masing-masing, mengonfirmasi bahwa model state approval memang didesain sebagai keputusan/artefak terpisah, bukan tercakup implisit di salah satu dari keduanya. Tanpa keputusan ini, BP-APP-002 tidak dapat disusun tanpa mengarang asumsi model state yang belum disahkan.

### 1.3 Yang TIDAK termasuk cakupan keputusan ini

- ADR-0002 tidak mengubah kode aplikasi. Keputusan ini adalah keputusan arsitektur/kebijakan; perubahan kode (migrasi data Renja, perbaikan sinkronisasi RPJMD, unifikasi definisi admin) adalah work package terpisah di bawah Migration/Implementation (Seq 67+), dan **tidak dieksekusi sebagai bagian dari ADR ini**.
- ADR-0002 tidak menetapkan approval berjenjang/multi-eselon (mis. level OPD lalu level Pemda) sebagai model resmi — ditolak secara eksplisit pada §2 di bawah, dengan pertimbangan didokumentasikan sebagai Evidence Pending untuk pertimbangan masa depan bila kebutuhan bisnis berubah.
- ADR-0002 tidak menetapkan disposisi teknis rinci untuk BMD, TLHP, MR, LK, dan Penatausahaan/BKU — modul-modul ini didelegasikan sebagai follow-up implementasi terpisah di bawah BP-APP-002 sendiri, bukan diputuskan langsung dalam ADR ini.
- ADR-0002 tidak menetapkan interpretasi legal/kewenangan institusional atas peran approval (mis. pejabat mana yang berwenang approve secara hukum) — tetap Evidence Pending, konsisten dengan pola ADR-0001 §3.1.

---

## 2. Opsi yang Dipertimbangkan

| Opsi | Deskripsi ringkas |
| --- | --- |
| **A — Standardisasi Penuh (dipilih)** | Seluruh modul (termasuk RPJMD dan Renja) distandarkan ke model generik 4-state (`DRAFT → SUBMITTED → APPROVED/REJECTED`, dengan `REVISE` kembali ke `DRAFT`) yang sudah ada pada `ApprovalLog`/`approvalController`. Sub-tahap granular Renja (`ketersediaan_submitted`, dst.) dipertahankan sebagai checklist metadata internal, bukan state resmi terpisah dari 4-state di atas. |
| B — Model generik + extension berjenjang | Mempertahankan 4-state sebagai kerangka inti, ditambah lapisan approval berjenjang opsional (mis. review OPD lalu review Pemda) untuk modul yang memerlukan. |
| C — Biarkan modul berbeda by design | Mengakui dua pola resmi paralel: model generik utuh untuk lima modul, model granular terpisah untuk Renja; tidak memaksakan satu model. |

---

## 3. Keputusan

**Seluruh modul perencanaan dan pelaporan pada e-PeLARA menggunakan satu Enterprise Workflow State Model generik:**

1. **Empat state resmi**: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`. Tidak ada state tambahan pada level enterprise di luar keempat ini.
2. **Transisi resmi** (mengikuti pola yang sudah terimplementasi pada `approvalController.js`, dijadikan rujukan normatif oleh keputusan ini): `SUBMIT` (dari `DRAFT` atau `REJECTED`, menuju `SUBMITTED`); `APPROVE` (dari `SUBMITTED`, menuju `APPROVED`); `REJECT` (dari `SUBMITTED`, menuju `REJECTED`, dengan alasan/catatan wajib); `REVISE` (dari `APPROVED`, `REJECTED`, atau `SUBMITTED`, kembali ke `DRAFT`).
3. **Model ini berlaku SERAGAM untuk seluruh modul** yang memiliki siklus dokumen perencanaan/pelaporan formal: RPJMD, Renstra, Renja, RKA, DPA, RKPD, dan LAKIP. Tidak ada pengecualian model state untuk modul tertentu pada level enterprise.
4. **RPJMD wajib disinkronkan penuh** ke model ini — status kesenjangan sinkronisasi RPJMD yang ditemukan pada peninjauan (§1.1) harus diselesaikan sebagai bagian dari implementasi BP-APP-002, bukan dibiarkan sebagai gap permanen.
5. **Sub-tahap granular Renja dipertahankan sebagai checklist metadata internal** (`ketersediaan_submitted`, `distribusi_submitted`, `konsumsi_submitted`, `uptd_submitted`), tetapi **bukan** state resmi yang menggantikan atau berjalan paralel dengan 4-state di atas. Renja tetap memiliki satu status resmi (salah satu dari `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`) sebagai sumber kebenaran status dokumen; keempat checklist granular tersebut adalah metadata pendukung kelengkapan pengisian, bukan pengganti status.
6. **Otorisasi transisi**: dua tingkat peran — pengaju (dapat men-submit) dan admin/approver (dapat approve/reject/revise). Definisi "admin" untuk keperluan workflow ini harus **disatukan menjadi satu sumber definisi tunggal** — penyelesaian dua definisi paralel yang ditemukan (`ADMIN_ROLES` vs `isWorkflowAdminRole()`) adalah bagian wajib dari implementasi BP-APP-002, bukan dibiarkan sebagai dua sumber kebenaran yang berbeda.
7. **Approval berjenjang/multi-eselon ditolak sebagai model resmi saat ini** (Opsi B tidak dipilih). Kebutuhan approval berjenjang untuk modul tertentu (mis. RKA) dicatat sebagai **Evidence Pending** untuk pertimbangan arsitektur masa depan, didelegasikan ke ADR terpisah bila kebutuhan bisnis tersebut dikonfirmasi oleh Project Owner di kemudian hari.
8. **Modul di luar cakupan enam modul yang disebutkan** (BMD, TLHP, MR, LK, Penatausahaan/BKU) **tidak diputuskan** oleh ADR ini apakah akan mengikuti model yang sama. Disposisi masing-masing modul tersebut didelegasikan sebagai analisis lanjutan di dalam BP-APP-002 sendiri (bagian scope BP-APP-002, bukan keputusan ADR terpisah).

### 3.1 Pertanyaan lanjutan yang tetap terbuka (bukan bagian keputusan ADR ini)

Butir berikut memerlukan klarifikasi/pekerjaan lanjutan sebelum implementasi teknis penuh, dan **tidak diputuskan** oleh ADR-0002:

1. Rencana migrasi teknis konkret untuk menyatukan status Renja (kolom `status` + 4 boolean) ke model 4-state, termasuk pemetaan nilai lama ke nilai baru.
2. Mekanisme teknis penyatuan definisi admin (`ADMIN_ROLES` vs `isWorkflowAdminRole()`) — pendekatan implementasi spesifik didelegasikan ke tim engineering di bawah Migration/Implementation (Seq 67+).
3. Apakah BMD, TLHP, MR, LK, dan Penatausahaan/BKU akan mengikuti model 4-state yang sama atau memerlukan model berbeda — dianalisis dalam BP-APP-002, bukan diputuskan di sini.
4. Kapan/apakah approval berjenjang diperlukan untuk modul tertentu di masa depan — tetap **Evidence Pending**, menunggu kebutuhan bisnis yang dikonfirmasi terpisah.
5. Siapa yang berwenang secara institusional/hukum untuk bertindak sebagai approver pada masing-masing modul — kategori **institutional/statutory authority**, tetap `To be designated or verified by competent institutional authority — Evidence Pending`, konsisten dengan pola ADR-0001.

Butir-butir ini dicatat sebagai **Evidence Pending** dan didelegasikan ke BP-APP-002 (untuk butir 1-3) dan GOV-EA-004/governance operating model (untuk butir 5) sebagai follow-up, bukan keputusan tambahan dalam ADR ini.

---

## 4. Konsekuensi

### 4.1 Dampak positif

- Satu model state yang konsisten dan dapat diaudit lintas seluruh modul perencanaan, menyelesaikan ambiguitas yang menjadi akar AIR-004.
- Tidak memerlukan pembangunan sistem approval baru — model generik yang sudah terimplementasi (`ApprovalLog`/`approvalController`) dijadikan rujukan normatif, meminimalkan pekerjaan ulang.
- RPJMD dan Renja, dua modul dengan gap paling signifikan, mendapat arah penyelesaian yang jelas alih-alih dibiarkan sebagai anomali tanpa penjelasan.
- Satu definisi otorisasi admin menghilangkan risiko kondisi timpang (bisa approve tapi tidak bisa mengunci-edit, atau sebaliknya).

### 4.2 Dampak yang memerlukan tindak lanjut

- Migrasi data Renja (kolom `status` + 4 boolean → 4-state generik) memerlukan analisis migrasi yang cermat agar tidak kehilangan granularitas checklist yang sudah ada — dijadikan scope BP-APP-002, bukan ADR ini.
- Perbaikan sinkronisasi RPJMD ke `ENTITY_TABLE_MAP` memerlukan perubahan kode — di luar cakupan ADR ini, menjadi work package Migration/Implementation.
- Penyatuan dua definisi admin memerlukan refactoring kode yang menyentuh middleware dan controller — di luar cakupan ADR ini.
- Disposisi modul di luar enam modul yang disebutkan (BMD, TLHP, MR, LK, Penatausahaan/BKU) tetap terbuka dan memerlukan analisis tambahan dalam BP-APP-002.

### 4.3 Yang tidak berubah

- Tidak ada perubahan kode aplikasi sebagai bagian dari ADR ini.
- Tidak ada data production yang dimodifikasi.
- Model approval berjenjang tidak diadopsi pada tahap ini; keputusan ini dapat ditinjau ulang di masa depan melalui ADR terpisah bila kebutuhan bisnis berubah.

---

## 5. Status dan Batas Kewenangan

- Status: **Accepted**, efektif 2026-08-06.
- Keputusan diambil oleh Project Owner (Fahmi Alhabsi), bukan oleh Claude Work secara sepihak — sesuai proses eskalasi HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6 dan §4.5, dan dikonfirmasi ulang oleh Project Owner pada sesi ini bahwa kewenangan pengambilan keputusan governance untuk ADR ini tetap berada padanya.
- G1, G2, dan G3 tetap tanpa disposition. ADR-0002 Accepted adalah salah satu evidence minimum untuk G3 (Roadmap §8), bukan G3 disposition itu sendiri.
- AIR-004 diperbarui menjadi Resolved sebagai konsekuensi keputusan ini (lihat pembaruan terpisah pada Architecture Issue Register); closure formal AIR-004 tetap memerlukan closure approval eksplisit Project Owner sesuai Definition of Closure register tersebut.
- ADR-0002 tidak menetapkan implementation completion, institutional authority assignment, compliance determination, atau Gate disposition apa pun di luar keputusan model state yang tercantum di §3.
- ADR-0002 tidak mengklaim bahwa gap teknis yang ditemukan (RPJMD, Renja, definisi admin ganda) telah diperbaiki — ADR ini hanya menetapkan **arah keputusan model state**; perbaikan teknis tetap menjadi pekerjaan implementasi terpisah yang belum dieksekusi.

---

## 6. Evidence dan Referensi

- Architecture Issue Register — AIR-004 (`00-governance/03-Architecture-Issue-Register.md`).
- Peninjauan langsung kode aplikasi 2026-08-06 (read-only): `backend/models/ApprovalLog.js`, `backend/controllers/approvalController.js`, `backend/routes/approvalRoutes.js`, `backend/middlewares/guardApproved.js`, `backend/models/renjaModel.js`, `backend/services/renjaGovernanceService.js`, `backend/services/planningWorkflowService.js`, `backend/migrations/20260415153000-renja-governance-workflow-v3.js`, `backend/migrations/20260407-001-add-approval-status.js`.
- BP-APP-001 — Domain and Bounded Context Blueprint, Version 1.0.0, Approved (mengecualikan workflow state model dari scope).
- BP-APP-003 — Application Modularization Blueprint, Version 1.0.0, Approved (mengecualikan workflow state model dari scope).
- Master Artifact Register — `11-roadmaps/00-Master-Artifact-Register.md`, baris Seq 32 (BP-APP-002, status belum disusun sebelum ADR ini).
- HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6, §3.3, §4.5 (proses eskalasi dan keputusan Project Owner).
- Keputusan Project Owner: dikonfirmasi 6 Agustus 2026 (Opsi A dipilih dari draft opsi/rekomendasi yang diajukan Claude Work berdasarkan peninjauan langsung kode aplikasi).

---

## 7. Persetujuan

| Peran | Nama | Keputusan | Tanggal |
| --- | --- | --- | --- |
| Project Owner | Fahmi Alhabsi | Memilih Opsi A (Standardisasi Penuh); Accepted | 2026-08-06 |
| Acting Chief Enterprise Architect | Claude Work (HANDOFF-e-PeLARA-EA-2026-08-05-v10) | Meninjau implementasi kode secara langsung, menyusun draft opsi, rekomendasi, dan finalisasi ADR sesuai keputusan Project Owner | 2026-08-06 |

## 8. Change Log

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Draft opsi (A/B/C) dan rekomendasi disiapkan untuk eskalasi Project Owner berdasarkan peninjauan langsung kode aplikasi; tidak ada opsi dipilih. | Claude Work | Proposed — Decision Pending |
| 1.0.0 | 2026-08-06 | Project Owner memilih Opsi A (Standardisasi Penuh). ADR difinalisasi dengan status Accepted, efektif 2026-08-06. | Claude Work berdasarkan keputusan Project Owner | Accepted |

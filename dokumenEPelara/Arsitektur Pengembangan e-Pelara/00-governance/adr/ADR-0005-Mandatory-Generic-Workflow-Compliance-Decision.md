---
document_id: ADR-0005
title: Mandatory Generic Workflow Compliance Decision — Kewajiban Modul Baru Mengikuti State Machine Generik
system: e-PeLARA Next Generation
classification: Architecture Decision Record
domain: Business and Application Architecture
version: 1.0.0
status: Accepted
owner: Project Owner
prepared_by: Claude Work (Draft File Operator, di bawah prinsip One AI, One Responsibility — Chief Enterprise Architect: ChatGPT)
effective_date: 2026-08-06
decision_authority: Project Owner — Fahmi Alhabsi
roadmap_dependency:
  - ADR-0002 — Enterprise Workflow State Model Decision (menetapkan model 4-state generik yang menjadi rujukan kewajiban ini)
  - BP-APP-002 — Enterprise Workflow State Model (Seq 32, Draft for Review, akan direvisi sebagai turunan keputusan ini)
  - BP-APP-003 — Application Modularization Blueprint (Seq 33, Approved, akan di-version-bump terkontrol sebagai turunan keputusan ini)
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture; keputusan ini adalah salah satu evidence pendukung G3, bukan G3 disposition itu sendiri
intended_repository_path: 00-governance/adr/ADR-0005-Mandatory-Generic-Workflow-Compliance-Decision.md
---

# ADR-0005 — Mandatory Generic Workflow Compliance Decision: Kewajiban Modul Baru Mengikuti State Machine Generik

**Status: Accepted.** Project Owner (Fahmi Alhabsi) menetapkan keputusan ini pada 6 Agustus 2026, sebagai kelanjutan langsung dari ADR-0002 (Enterprise Workflow State Model Decision, Accepted 2026-08-06).

---

## 1. Konteks Masalah

### 1.1 Sumber kebutuhan

ADR-0002 menetapkan model 4-state generik (`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`) sebagai standar enterprise untuk enam modul yang sudah diverifikasi (RPJMD, Renstra, Renja, RKA, DPA, RKPD, RKPD, LAKIP). ADR-0002 §3 butir 8 secara eksplisit **tidak** memutuskan apakah modul-modul di luar keenam modul tersebut (BMD, TLHP, MR, LK, Penatausahaan/BKU) mengikuti model yang sama, dan tidak membahas modul yang **belum ada** — yaitu modul yang akan ditambahkan ke e-PeLARA di masa depan.

Project Owner mengajukan pertanyaan: bagaimana memastikan modul baru yang ditambahkan setelah BP-APP-002/BP-INT-001/BP-TECH-003 disetujui tetap mengikuti pola generik yang sama, tanpa memerlukan persetujuan ulang atas ketiga blueprint tersebut setiap kali modul baru dibuat. Diskusi lanjutan mengonfirmasi bahwa tidak ada mekanisme teknis tunggal yang dapat memvalidasi kepatuhan desain modul baru secara otomatis dan pasti benar — kepatuhan terhadap pola state machine adalah keputusan desain, bukan sesuatu yang sepenuhnya dapat diverifikasi lewat sintaksis. Pendekatan berlapis (governance mandate → static check → schema constraint) disepakati sebagai arah yang realistis.

### 1.2 Mengapa keputusan ini diperlukan sebagai ADR terpisah dari ADR-0002

BP-APP-003 (Application Modularization Blueprint, Seq 33) sudah berstatus **Approved 1.0.0** — artefak Approved tidak boleh diubah tanpa mandat khusus per instruksi proyek yang berlaku. ADR ini adalah mandat khusus tersebut: mendokumentasikan keputusan Project Owner secara formal sebelum BP-APP-002 (masih draft) direvisi dan BP-APP-003 (Approved) di-version-bump secara terkontrol dengan Change Log, bukan diedit diam-diam.

### 1.3 Yang TIDAK termasuk cakupan keputusan ini

- ADR-0005 tidak mengubah kode aplikasi apa pun. Tidak ada script lint/validasi yang ditulis atau dijalankan sebagai bagian dari ADR ini.
- ADR-0005 tidak menetapkan implementasi teknis konkret dari mekanisme validasi (nama file script, tool CI spesifik, sintaks CHECK constraint) — ini didelegasikan sebagai Implementation Task ke tim development setelah blueprint terkait disetujui, konsisten dengan larangan BP-APP-002/BP-APP-003 menetapkan detail implementasi teknis.
- ADR-0005 tidak menetapkan disposisi modul di luar enam modul yang sudah dicakup ADR-0002 (BMD, TLHP, MR, LK, Penatausahaan/BKU) — status modul-modul tersebut tetap seperti ditetapkan ADR-0002 §3 butir 8, tidak diubah oleh ADR ini.
- ADR-0005 tidak menetapkan disposition Gate G3.
- ADR-0005 tidak mengklaim bahwa mekanisme enforcement (lint rule, CI gate, schema constraint) sudah berjalan atau dibangun — ADR ini hanya menetapkan **prinsip kewajiban dan kerangka pendekatan**, bukan pembuktian implementasi.

---

## 2. Opsi yang Dipertimbangkan

| Opsi | Deskripsi ringkas |
| --- | --- |
| **A — Mandat governance eksplisit + kerangka enforcement berlapis (dipilih)** | Menetapkan sebagai prinsip governance wajib bahwa modul baru harus mengikuti model 4-state generik (ADR-0002), didokumentasikan di BP-APP-002 dan BP-APP-003. Kerangka enforcement dicatat sebagai Candidate Target Direction berlapis: (1) mandat governance/dokumentasi, (2) static check/lint rule di level kode, (3) schema constraint di level data — tanpa menulis atau mewajibkan implementasi teknis spesifik sekarang. |
| B — Hanya dokumentasi prinsip, tanpa kerangka enforcement | Menyatakan modul baru "seharusnya" mengikuti pola generik sebagai rekomendasi, tanpa kata "wajib" dan tanpa kerangka enforcement berlapis. |
| C — Tunda, tidak diputuskan sekarang | Tidak membuat ADR baru; menunggu kebutuhan modul baru benar-benar muncul sebelum memutuskan mekanisme kepatuhan. |

---

## 3. Keputusan

**e-PeLARA menetapkan kewajiban kepatuhan pola generik untuk modul baru sebagai berikut:**

1. **Setiap modul baru yang memiliki siklus dokumen perencanaan/pelaporan formal wajib mengadopsi model 4-state generik** (`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`) dan transisi resmi (`SUBMIT`/`APPROVE`/`REJECT`/`REVISE`) sebagaimana ditetapkan ADR-0002 §3, kecuali ADR terpisah di masa depan secara eksplisit mengecualikan modul tersebut.
2. **Modul baru wajib menggunakan field/kolom status yang konsisten secara nomenklatur** dengan pola yang sudah menjadi rujukan normatif (`ApprovalLog`/`approvalController.js`, ADR-0002 §1.1) — bukan menciptakan skema status paralel baru tanpa alasan terdokumentasi, mengulang pola fragmentasi yang ditemukan pada Renja (ADR-0002 §1.1).
3. **Kewajiban ini bersifat generik ke depan (forward-looking)** — berlaku untuk modul yang akan dibuat setelah ADR ini Accepted, tanpa memerlukan persetujuan ulang terhadap BP-APP-002, BP-APP-003, BP-INT-001, atau BP-TECH-003 untuk setiap modul baru yang mengikuti pola ini. Modul baru yang mematuhi pola generik dianggap otomatis tercakup oleh keempat blueprint tersebut.
4. **Kerangka enforcement berlapis dicatat sebagai Candidate Target Direction**, bukan implementasi yang sudah berjalan:
   - **Lapis 1 — Governance mandate**: pasal kewajiban ini didokumentasikan di BP-APP-002 (revisi) dan BP-APP-003 (version bump terkontrol).
   - **Lapis 2 — Static check/lint rule**: kerangka arsitektural dicatat di BP-APP-002 — mendeskripsikan kriteria validasi yang perlu diperiksa (field status memakai enum yang cocok dengan 4-state, ada tidaknya definisi state paralel yang tidak terdaftar) — mengikuti pola self-check script yang sudah ada di `backend/scripts/` (`*ValidationSelfTest.js`) sebagai referensi bentuk, bukan sebagai kode yang ditulis oleh ADR ini.
   - **Lapis 3 — Schema constraint**: prinsip bahwa kolom status modul baru sebaiknya dibatasi ENUM/CHECK constraint pada keempat nilai generik, mengikuti pola constraint yang sudah ada pada `approval_logs` (evidence dari demo/skema existing) — dicatat sebagai prinsip, bukan migrasi yang dieksekusi.
5. **Detail implementasi teknis (script lint rule aktual, konfigurasi CI, sintaks constraint spesifik) adalah Implementation Task terpisah**, didelegasikan ke tim development setelah blueprint terkait (BP-APP-002, BP-APP-003) disetujui Project Owner — **tidak** dieksekusi sebagai bagian dari ADR ini maupun oleh Draft File Operator dalam kapasitas governance drafting.
6. **Pengecualian tetap mungkin**: modul dengan kebutuhan arsitektur yang secara nyata berbeda (mis. pola integrasi eksternal baru yang tidak sebanding dengan SIPD/e-SIGAP, atau kebutuhan resilience yang berbeda) tidak otomatis dipaksa mengikuti pola ini — kebutuhan semacam itu memerlukan ADR/blueprint tersendiri, bukan tunduk paksa ke ADR ini.

### 3.1 Pertanyaan lanjutan yang tetap terbuka (bukan bagian keputusan ADR ini)

1. Bentuk teknis konkret script static check (bahasa, tool, lokasi file, exit-code behavior) — didelegasikan ke tim development sebagai Implementation Task.
2. Apakah dan kapan CI/CD pipeline diwire untuk menjadikan static check ini sebagai required gate — bergantung pada ketersediaan infrastruktur CI proyek, yang belum diverifikasi pada ADR ini.
3. Sintaks CHECK constraint/ENUM spesifik per modul baru — keputusan implementasi teknis saat modul tersebut benar-benar dibangun.
4. Siapa yang berwenang menyetujui pengecualian pola generik untuk modul tertentu — didelegasikan ke proses governance yang sama seperti persetujuan blueprint (Chief Enterprise Architect review, Project Owner approval).

Butir-butir ini dicatat sebagai **Evidence Pending**/Candidate Target Direction, bukan keputusan tambahan dalam ADR ini.

---

## 4. Konsekuensi

### 4.1 Dampak positif

- Modul baru tidak memerlukan siklus persetujuan governance ulang untuk hal yang sudah menjadi prinsip generik, mempercepat proses architecture review untuk modul yang mematuhi pola.
- Mengurangi risiko fragmentasi model status seperti yang terjadi pada Renja (ADR-0002 §1.1) terulang pada modul baru.
- Kerangka enforcement berlapis memberi arah jelas bagi tim development tanpa memaksakan detail implementasi yang prematur.

### 4.2 Dampak yang memerlukan tindak lanjut

- BP-APP-002 (Draft for Review) perlu direvisi menambahkan pasal kewajiban ini beserta deskripsi arsitektural kriteria validasi.
- BP-APP-003 (Approved 1.0.0) perlu di-version-bump terkontrol dengan Change Log mencatat rujukan ke ADR-0005.
- Implementasi teknis static check dan schema constraint memerlukan mandat kerja terpisah untuk tim development — tidak dieksekusi oleh ADR ini.

### 4.3 Yang tidak berubah

- Tidak ada perubahan kode aplikasi sebagai bagian dari ADR ini.
- Tidak ada script validasi yang dibangun atau dijalankan sebagai konsekuensi ADR ini.
- Disposisi modul di luar enam modul ADR-0002 (BMD, TLHP, MR, LK, Penatausahaan/BKU) tidak berubah.

---

## 5. Status dan Batas Kewenangan

- Status: **Accepted**, efektif 2026-08-06.
- Keputusan diambil oleh Project Owner (Fahmi Alhabsi) berdasarkan diskusi eksplisit dalam sesi ini, bukan oleh Claude Work secara sepihak.
- G1, G2, dan G3 tetap tanpa disposition. ADR-0005 Accepted adalah salah satu evidence pendukung G3, bukan G3 disposition itu sendiri.
- ADR-0005 tidak menetapkan implementation completion, institutional authority assignment, compliance determination (dalam arti kepatuhan regulasi), atau Gate disposition apa pun di luar keputusan prinsip kewajiban yang tercantum di §3.
- ADR-0005 tidak mengklaim bahwa mekanisme enforcement teknis (lint rule, CI gate, schema constraint) telah dibangun — ADR ini hanya menetapkan **arah kebijakan dan kerangka**, bukan pembuktian implementasi.
- Revisi BP-APP-002 dan version bump BP-APP-003 sebagai turunan ADR ini dilakukan sebagai tindakan governance terpisah, mengikuti mandat draft-only (BP-APP-002 tetap Draft for Review) dan prinsip perubahan terkontrol untuk artefak Approved (BP-APP-003).

---

## 6. Evidence dan Referensi

- ADR-0002 — Enterprise Workflow State Model Decision, Version 1.0.0, Accepted 2026-08-06.
- BP-APP-002 — Enterprise Workflow State Model, Version 0.1.0, Draft for Review (`04-application-architecture/32-Enterprise-Workflow-State-Model.md`).
- BP-APP-003 — Application Modularization Blueprint, Version 1.0.0, Approved (`04-application-architecture/33-Application-Modularization-Blueprint.md`).
- Pola self-check script existing: `backend/scripts/*ValidationSelfTest.js` (dirujuk sebagai referensi bentuk, tidak dibaca ulang secara rinci pada sesi ini).
- Diskusi langsung dengan Project Owner dalam sesi ini (2026-08-06) mengenai kebutuhan mekanisme kepatuhan modul baru dan kesepakatan pendekatan berlapis.

---

## 7. Persetujuan

| Peran | Nama | Keputusan | Tanggal |
| --- | --- | --- | --- |
| Project Owner | Fahmi Alhabsi | Menetapkan Opsi A (Mandat governance eksplisit + kerangka enforcement berlapis); Accepted | 2026-08-06 |
| Draft File Operator | Claude Work (One AI, One Responsibility — Chief Enterprise Architect: ChatGPT) | Menyusun draft ADR berdasarkan diskusi eksplisit dengan Project Owner | 2026-08-06 |

## 8. Change Log

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 1.0.0 | 2026-08-06 | Penyusunan ADR-0005 berdasarkan keputusan eksplisit Project Owner dalam sesi ini (Opsi A dipilih langsung, bukan melalui siklus draft opsi terpisah). ADR difinalisasi dengan status Accepted, efektif 2026-08-06. | Claude Work berdasarkan keputusan Project Owner | Accepted |
| 1.0.0 (catatan implementasi) | 2026-08-06 | Ditambahkan §9 (Catatan Status Implementasi Teknis) menyusul eksekusi teknis Lapis 2-3 (§3 butir 4) pada sesi coding terpisah, di luar konteks governance drafting ADR ini. Keputusan prinsip ADR ini (§3, status Accepted) **tidak berubah** — catatan ini murni menunjuk ke bukti implementasi terkini di dokumen turunan (spec 32a §7.1), agar pembaca ADR tidak salah asumsi bahwa "Accepted" berarti mekanisme sudah berjalan penuh. | Claude (sesi coding terpisah, atas instruksi eksplisit Project Owner) | Accepted (tidak berubah) + catatan implementasi ditambahkan |
| 1.0.0 (perluasan enforcement Lapis 2) | 2026-08-06 | §9 direvisi: Lapis 2 (static check/lint rule) diperluas dari governance-lock guard manual menjadi pre-commit hook otomatis (husky + lint-staged) dan CI pipeline, menyusul keberatan Project Owner bahwa enforcement manual bukan enforcement sungguhan. Pre-commit hook diverifikasi operasional penuh oleh Project Owner (commit nyata diblokir lalu lolos otomatis pasca-whitelist). Lapis 3 (schema constraint) tidak berubah — tetap Planned. Keputusan prinsip ADR ini (§3) tidak berubah. Rincian evidence di spec 32a §7.2. | Claude, dikonfirmasi bersama Project Owner | Accepted (tidak berubah) + catatan implementasi diperbarui |

## 9. Catatan Status Implementasi Teknis (ditambahkan 2026-08-06, sesi coding terpisah)

Sesuai §1.3 dan §4.3, ADR ini tidak mengklaim mekanisme enforcement (lint rule, CI gate, schema constraint) sudah berjalan — dan itu tetap akurat pada saat ADR ini ditulis. Sejak itu, pada sesi coding terpisah dan sesi lanjutannya (di luar konteks governance drafting ADR ini, sesuai §5 dan spec 32a §8 opsi 2), eksekusi teknis Lapis 2 dan Lapis 3 (§3 butir 4) telah dilakukan dan diverifikasi nyata berkali-kali oleh Project Owner di mesin lokal, dengan hasil **sebagian**, bukan penuh:

- Lapis 2 (static check/lint rule): **Implemented, dengan enforcement otomatis penuh.** Script nyata dibuat (`backend/scripts/workflowComplianceValidationSelfTest.js`), diuji terhadap model nyata dan fixture. Awalnya hanya terpasang di governance-lock guard (dipicu manual). Menyusul keberatan Project Owner bahwa enforcement manual "bukan enforcement sungguhan," lapis ini diperluas dengan pre-commit hook otomatis (husky + lint-staged, aktif untuk semua developer lewat `npm install`) dan CI pipeline (`.github/workflows/workflow-compliance-verify.yml`). Pre-commit hook **diverifikasi operasional penuh**: commit nyata diblokir otomatis oleh model baru yang melanggar pola (`prosnpKategoriReferensiModel.js`), lolos otomatis setelah whitelist diperbarui — tanpa siapa pun perlu mengingat menjalankan pemeriksaan manual. CI pipeline diverifikasi secara kode terhadap data historis nyata, belum lewat run CI sungguhan.
- Lapis 3 (schema constraint): **Planned.** Tidak berubah — mekanisme/template siap (`backend/migrations/templates/TEMPLATE-add-generic-status-check-constraint.js`), tapi belum ada tabel yang memenuhi syarat sebagai target penerapan nyata per 2026-08-06 — bukan kegagalan, kondisi aktual yang sah sesuai analisis Tahap 2. Pre-commit hook dan CI memperkuat Lapis 2 (kode), tidak menyentuh Lapis 3 (data) sama sekali — keduanya pertahanan berbeda dalam desain berlapis §3 butir 4.
- Wiring ke governance-lock guard: **Implemented.** Diverifikasi berjalan nyata di mesin lokal Project Owner sebanyak dua kali — verifikasi pertama menemukan bug scope (model existing salah tertangkap), verifikasi kedua pasca-perbaikan mengonfirmasi bersih.

Rincian evidence lengkap ada di spec 32a §7.1, §7.2, dan §12 (dokumen turunan ADR ini). Status Accepted pada ADR ini tetap berlaku untuk **keputusan prinsip** (§3) — catatan ini tidak mengubah keputusan tersebut. Status implementasi teknis keseluruhan tetap **Sebagian Diimplementasikan**, bukan Implemented penuh, karena Lapis 3/schema constraint (Tahap 2 pada spec 32a) belum diterapkan pada migration nyata — meski Lapis 2 kini punya enforcement otomatis yang jauh lebih kuat dari kondisi awal (manual-only).

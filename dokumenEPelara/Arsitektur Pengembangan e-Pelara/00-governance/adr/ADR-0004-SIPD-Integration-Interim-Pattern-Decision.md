---
document_id: ADR-0004
title: SIPD Integration Interim Pattern Decision — Formalisasi Pola Ekspor-Manual/PDF-Parsing Sebagai Interim Resmi
system: e-PeLARA Next Generation
classification: Architecture Decision Record
domain: Integration Architecture
version: 1.0.0
status: Accepted
owner: Project Owner
prepared_by: Claude Work (Acting Chief Enterprise Architect, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10)
effective_date: 2026-08-06
decision_authority: Project Owner — Fahmi Alhabsi
roadmap_dependency:
  - AIR-007 — Architecture Issue Register (integrasi SIPD masih berupa gap)
  - BP-INT-001 — SIPD Integration Blueprint (Seq 38, artefak yang didelegasikan pada keputusan ini)
  - ARCH-INT-001 — Integration Architecture (mengklasifikasikan SIPD sebagai Eksternal Government-to-Government)
  - BP-INT-002 — e-SIGAP Integration and SSO Blueprint (preseden pola integrasi eksternal yang Approved)
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture; keputusan ini adalah salah satu evidence minimum G3, bukan G3 disposition itu sendiri
intended_repository_path: 00-governance/adr/ADR-0004-SIPD-Integration-Interim-Pattern-Decision.md
---

# ADR-0004 — SIPD Integration Interim Pattern Decision: Formalisasi Pola Ekspor-Manual/PDF-Parsing Sebagai Interim Resmi

**Status: Accepted.** Project Owner (Fahmi Alhabsi) telah memilih **Opsi A — Formalisasi Interim Pattern** pada 6 Agustus 2026. Dokumen ini adalah versi final ADR-0004.

---

## 1. Konteks Masalah

### 1.1 Sumber gap

Architecture Issue Register mencatat AIR-007 ("Integrasi SIPD masih berupa gap") sebagai **High**/Decision Required, dengan evidence dari Charter §11, Roadmap BP-INT-001/G3, dan `01-current-state/4-penilaian-kesesuaian-standar.md` §4.6 yang menyatakan perlu dikaji. Peninjauan langsung terhadap kode aplikasi pada 2026-08-06 mengonfirmasi kondisi berikut:

| Aspek | Kondisi ditemukan | Evidence |
| --- | --- | --- |
| Modul "SIPD" di backend | `sipdRoutes.js`/`sipdController.js` adalah **modul internal** ("SIPD Internal Module") yang hanya melakukan query terhadap tabel lokal (`sipd_ref_program`, `sipd_ref_kegiatan`, `sipd_realisasi`, `kode_rekening`, dst.) menggunakan nomenklatur referensi Permendagri — **bukan** client API ke server SIPD Kemendagri. | `backend/routes/sipdRoutes.js`; `backend/controllers/sipdController.js` (komentar eksplisit: "*placeholder, diisi lengkap di Tahap 3*"). |
| Fungsi sinkronisasi | Tidak ada endpoint sync yang benar-benar terhubung eksternal; fungsi bernama `syncMock` — namanya sendiri mengonfirmasi ini adalah mock, bukan integrasi nyata. | `backend/controllers/sipdController.js`. |
| Pola yang benar-benar berjalan | `rkaSipdPdfImportService.js` dan `realisasiSipdPdfImportService.js` adalah **parser PDF/OCR** atas dokumen hasil ekspor manual dari aplikasi SIPD — bukan integrasi API/webhook/cron. Ini adalah satu-satunya "jembatan" data SIPD yang benar-benar berfungsi saat ini. | `backend/services/rkaSipdPdfImportService.js`; `backend/services/realisasiSipdPdfImportService.js`. |
| Baseline dokumentasi | Mengonfirmasi eksplisit: "Saat ini sistem berdiri sendiri (standalone), belum terhubung ke SIPD pusat." | `01-current-state/4-penilaian-kesesuaian-standar.md` §4.6, §62. |
| Klasifikasi arsitektur | ARCH-INT-001 (Approved) mengklasifikasikan SIPD sebagai "Eksternal Government-to-Government", eksplisit menyatakan **tidak mengasumsikan API tersedia**, selaras COMP-003/REG-04 (Permendagri 70/2019). | `05-integration-architecture/34-Integration-Architecture.md`. |
| Preseden pola | BP-INT-002 (e-SIGAP, Approved) mendefinisikan boundary/prinsip integrasi tanpa menetapkan protokol teknis dan eksplisit tidak berasumsi ketersediaan — pola yang relevan sebagai referensi. | `05-integration-architecture/39-e-SIGAP-Integration-and-SSO-Blueprint.md`. |

### 1.2 Mengapa keputusan ini diperlukan

SIPD adalah aplikasi eksternal milik Kementerian Dalam Negeri (Kemendagri) — **ketersediaan dan syarat akses API-nya tidak dapat diputuskan sepihak oleh e-PeLARA**. Roadmap RM-EA-001 menempatkan BP-INT-001 (Seq 38) sebagai artefak Critical dengan dependency eksplisit ke AIR-007 dan Gate G3. Tanpa keputusan mengenai bagaimana memperlakukan pola interim yang sudah berjalan (PDF-import), BP-INT-001 tidak dapat disusun tanpa mengarang asumsi ketersediaan API yang belum dikonfirmasi eksternal.

### 1.3 Yang TIDAK termasuk cakupan keputusan ini

- ADR-0004 **tidak** menyatakan atau mengasumsikan bahwa API SIPD tersedia, akan tersedia, atau telah dikonfirmasi oleh Kemendagri. Status ketersediaan API tetap **Evidence Pending**.
- ADR-0004 tidak mengubah kode aplikasi. Peningkatan/perluasan parser PDF-import, atau pembangunan API client bila akses dikonfirmasi tersedia di masa depan, adalah work package terpisah di bawah Migration/Implementation (Seq 67+), dan **tidak dieksekusi sebagai bagian dari ADR ini**.
- ADR-0004 tidak menetapkan kontrak data/skema teknis rinci untuk pola PDF-import (format kolom, validasi, dsb.) — didelegasikan ke BP-INT-001 sebagai Candidate Target Direction.
- ADR-0004 tidak melakukan atau menugaskan eskalasi institusional ke Kemendagri/Kominfo/BPKAD untuk mengonfirmasi akses API — ini tetap menjadi keputusan/tindakan terpisah Project Owner di luar ADR ini, bila di kemudian hari diperlukan.
- ADR-0004 tidak menetapkan disposition Gate G3.

---

## 2. Opsi yang Dipertimbangkan

| Opsi | Deskripsi ringkas |
| --- | --- |
| **A — Formalisasi Interim Pattern (dipilih)** | Pola ekspor-manual/PDF-parsing yang sudah berjalan (`rkaSipdPdfImportService.js`, `realisasiSipdPdfImportService.js`) ditetapkan sebagai **Interim Integration Pattern resmi** di BP-INT-001 — bukan solusi darurat tak terdokumentasi, melainkan pola yang diakui dan didokumentasikan sebagai bagian arsitektur target sementara. Status akses API SIPD tetap Decision Required/Evidence Pending sampai dikonfirmasi eksternal. |
| B — Tunda penyusunan BP-INT-001 | Tunda seluruh penyusunan BP-INT-001 sampai Project Owner mengonfirmasi ke pihak berwenang (Kominfo/BPKAD) apakah akses API SIPD tersedia. AIR-007 tetap Decision Required tanpa perubahan. |

---

## 3. Keputusan

**e-PeLARA memformalkan pola integrasi interim untuk SIPD sebagai berikut:**

1. **Pola ekspor-manual/PDF-parsing yang sudah berjalan diakui sebagai "Interim Integration Pattern" resmi** untuk pertukaran data dengan SIPD, didokumentasikan dalam BP-INT-001, bukan dibiarkan sebagai solusi tidak terdokumentasi atau dianggap sementara tanpa status jelas.
2. **Interim Integration Pattern mencakup**: pengguna mengekspor dokumen (PDF) dari aplikasi SIPD secara manual, kemudian dokumen tersebut diimpor ke e-PeLARA melalui parser (`rkaSipdPdfImportService.js`/`realisasiSipdPdfImportService.js` sebagai referensi implementasi yang sudah ada). Pola ini **bukan** integrasi API/webhook/sinkronisasi otomatis.
3. **Status akses API SIPD tetap Decision Required/Evidence Pending.** ADR ini **tidak** menyatakan bahwa API tersedia atau tidak tersedia — keduanya belum dikonfirmasi secara institusional. Keputusan mengenai apakah dan kapan mengembangkan integrasi API penuh **ditunda** sampai ada konfirmasi eksternal dari Kemendagri mengenai ketersediaan dan syarat akses.
4. **BP-INT-001 disusun dengan dua bagian eksplisit**: (a) dokumentasi Interim Integration Pattern sebagai kondisi saat ini yang diformalkan; (b) placeholder/kerangka untuk Target Integration Pattern (API-based) yang **tidak diisi** sampai ketersediaan API dikonfirmasi — mencegah BP-INT-001 mengasumsikan API tersedia, konsisten dengan prinsip ARCH-INT-001 §6.
5. **Modul internal bernama "SIPD"** (`sipdRoutes.js`/`sipdController.js`, tabel referensi `sipd_ref_*`) **tetap merupakan modul referensi data lokal**, bukan bagian dari integrasi eksternal — ADR ini tidak mengubah klasifikasi atau fungsi modul tersebut, hanya mengklarifikasi bahwa modul ini bukan bukti integrasi API SIPD yang sudah berjalan.

### 3.1 Pertanyaan lanjutan yang tetap terbuka (bukan bagian keputusan ADR ini)

1. Apakah dan kapan Project Owner akan menugaskan eskalasi institusional (mis. ke Dinas Kominfo/BPKAD) untuk mengonfirmasi ke Kemendagri ketersediaan akses API SIPD — keputusan/tindakan ini sepenuhnya di luar ADR ini.
2. Kontrak data/skema teknis rinci untuk Interim Integration Pattern (format kolom PDF yang didukung, aturan validasi, penanganan error parsing) — didelegasikan ke BP-INT-001.
3. Bila di masa depan akses API SIPD dikonfirmasi tersedia, protokol/skema Target Integration Pattern akan memerlukan ADR terpisah atau pembaruan BP-INT-001 — tidak diputuskan sekarang.
4. Siapa yang berwenang secara institusional untuk memverifikasi keabsahan data hasil PDF-import (mis. apakah memerlukan tanda tangan digital/verifikasi manual tambahan) — kategori **institutional/statutory authority**, tetap `To be designated or verified by competent institutional authority — Evidence Pending`.

Butir-butir ini dicatat sebagai **Evidence Pending** dan didelegasikan ke BP-INT-001 (untuk butir 2) atau keputusan Project Owner terpisah (untuk butir 1, 3, 4), bukan keputusan tambahan dalam ADR ini.

---

## 4. Konsekuensi

### 4.1 Dampak positif

- Pola yang sudah berjalan (PDF-import) mendapat status resmi dan terdokumentasi, mengurangi ambiguitas AIR-007 tanpa memerlukan pembangunan integrasi API yang belum tentu dapat diakses.
- Tidak memerlukan asumsi ketersediaan API SIPD yang belum terkonfirmasi — konsisten dengan prinsip ARCH-INT-001 dan kehati-hatian terhadap sistem eksternal milik pihak lain.
- Memberi kejelasan kepada tim implementasi bahwa pola PDF-import bukan solusi darurat sementara tanpa arah, melainkan pola arsitektur yang diakui sampai ada perubahan kondisi eksternal.

### 4.2 Dampak yang memerlukan tindak lanjut

- BP-INT-001 perlu didokumentasikan dengan jelas membedakan Interim Integration Pattern (aktif) dari Target Integration Pattern (placeholder, belum diisi).
- Bila Project Owner ingin mempercepat resolusi ketersediaan API, eskalasi institusional ke Kemendagri/Kominfo/BPKAD perlu diinisiasi secara terpisah — di luar ADR ini.
- Kontrak data teknis Interim Pattern (validasi, error handling) memerlukan pekerjaan lanjutan dalam BP-INT-001.

### 4.3 Yang tidak berubah

- Tidak ada perubahan kode aplikasi sebagai bagian dari ADR ini.
- Tidak ada integrasi API baru dibangun sebagai konsekuensi ADR ini.
- Status ketersediaan API SIPD tetap tidak diketahui/tidak dikonfirmasi.

---

## 5. Status dan Batas Kewenangan

- Status: **Accepted**, efektif 2026-08-06.
- Keputusan diambil oleh Project Owner (Fahmi Alhabsi), bukan oleh Claude Work secara sepihak — sesuai proses eskalasi HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6 dan §4.5.
- G3 tetap tanpa disposition. ADR-0004 Accepted adalah salah satu evidence minimum untuk G3 (Roadmap §8), bukan G3 disposition itu sendiri.
- AIR-007 diperbarui menjadi Resolved sebagai konsekuensi keputusan ini (lihat pembaruan terpisah pada Architecture Issue Register); closure formal AIR-007 tetap memerlukan closure approval eksplisit Project Owner sesuai Definition of Closure register tersebut.
- ADR-0004 tidak menetapkan implementation completion, institutional authority assignment, compliance determination, ketersediaan API SIPD, atau Gate disposition apa pun di luar keputusan pola interim yang tercantum di §3.
- ADR-0004 secara eksplisit **tidak** mengklaim atau mengasumsikan bahwa akses API SIPD tersedia — ini adalah batasan yang sengaja dipertahankan sesuai sifat SIPD sebagai sistem eksternal milik Kemendagri yang berada di luar kendali e-PeLARA.

---

## 6. Evidence dan Referensi

- Architecture Issue Register — AIR-007 (`00-governance/03-Architecture-Issue-Register.md`).
- Peninjauan langsung kode aplikasi 2026-08-06 (read-only): `backend/routes/sipdRoutes.js`, `backend/controllers/sipdController.js`, `backend/services/rkaSipdPdfImportService.js`, `backend/services/realisasiSipdPdfImportService.js`, `backend/seeders/20260407-sipd-ref-seed.js`.
- `01-current-state/4-penilaian-kesesuaian-standar.md` §4.6, §62 (baseline mengonfirmasi sistem standalone, belum terhubung SIPD pusat).
- ARCH-INT-001 — Integration Architecture, Version 1.0.0, Approved, §6 (klasifikasi SIPD sebagai Eksternal Government-to-Government, tidak mengasumsikan API tersedia).
- BP-INT-002 — e-SIGAP Integration and SSO Blueprint, Version 1.0.0, Approved (preseden pola integrasi eksternal tanpa asumsi ketersediaan).
- Master Artifact Register — `11-roadmaps/00-Master-Artifact-Register.md`, baris Seq 38 (BP-INT-001, status belum disusun sebelum ADR ini).
- HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6, §3.3, §4.5 (proses eskalasi dan keputusan Project Owner).
- Keputusan Project Owner: dikonfirmasi 6 Agustus 2026 (Opsi A — Formalisasi Interim Pattern — dipilih dari draft opsi/rekomendasi yang diajukan Claude Work berdasarkan peninjauan langsung kode aplikasi).

---

## 7. Persetujuan

| Peran | Nama | Keputusan | Tanggal |
| --- | --- | --- | --- |
| Project Owner | Fahmi Alhabsi | Memilih Opsi A (Formalisasi Interim Pattern); Accepted | 2026-08-06 |
| Acting Chief Enterprise Architect | Claude Work (HANDOFF-e-PeLARA-EA-2026-08-05-v10) | Meninjau kondisi kode secara langsung, menyusun draft opsi, rekomendasi, dan finalisasi ADR sesuai keputusan Project Owner | 2026-08-06 |

## 8. Change Log

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Draft opsi (A/B) dan rekomendasi disiapkan untuk eskalasi Project Owner berdasarkan peninjauan langsung kode aplikasi; tidak ada opsi dipilih. | Claude Work | Proposed — Decision Pending |
| 1.0.0 | 2026-08-06 | Project Owner memilih Opsi A (Formalisasi Interim Pattern). ADR difinalisasi dengan status Accepted, efektif 2026-08-06. | Claude Work berdasarkan keputusan Project Owner | Accepted |

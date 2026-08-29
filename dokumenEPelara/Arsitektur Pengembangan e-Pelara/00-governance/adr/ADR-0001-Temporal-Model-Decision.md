---
document_id: ADR-0001
title: Temporal Model Decision Record — Siklus Perencanaan Renstra OPD (5 vs 6 Tahun)
system: e-PeLARA Next Generation
classification: Architecture Decision Record
domain: Data and Knowledge Architecture
version: 1.0.0
status: Accepted
owner: Project Owner
prepared_by: Claude Work (Acting Chief Enterprise Architect, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10)
effective_date: 2026-08-05
decision_authority: Project Owner — Fahmi Alhabsi
roadmap_dependency:
  - AIR-001 — Architecture Issue Register (conflict Renstra period)
  - BP-DATA-001 — Enterprise Data Domain Model (DD-PLN-001, temporal concern separation)
  - BP-DATA-002 — Master and Reference Data Blueprint (Planning and Reporting Period category)
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; keputusan ini adalah salah satu evidence minimum G2, bukan G2 disposition itu sendiri
intended_repository_path: 00-governance/adr/ADR-0001-Temporal-Model-Decision.md
---

# ADR-0001 — Temporal Model Decision: Siklus Perencanaan Renstra OPD (5 vs 6 Tahun)

**Status: Accepted.** Project Owner (Fahmi Alhabsi) telah memilih **Opsi C — Hybrid** pada 5 Agustus 2026. Dokumen ini adalah versi final ADR-0001, menggantikan draft opsi/rekomendasi sebelumnya.

---

## 1. Konteks Masalah

### 1.1 Sumber konflik

Baseline current-state (`01-current-state/2-modul-sistem.md`, Modul 1 dan Modul 4) mencatat dua siklus perencanaan yang berbeda pada satu rantai dokumen yang seharusnya konsisten:

| Dokumen | Siklus tercatat | Evidence |
| --- | --- | --- |
| **RPJMD** (Rencana Pembangunan Jangka Menengah Daerah) | **5 tahun** | Modul 1: "Pengelolaan rencana pembangunan daerah 5 tahunan"; field `target_tahun_1` s.d. `target_tahun_5` pada model indikator (Baseline 4, item 7). |
| **Renstra OPD** — deskripsi naratif | **5 tahun** (tersirat mengikuti RPJMD, dan disebutkan sebagai demikian pada Permendagri 86/2017 Bab VI secara umum) | Peta siklus dokumen (§2.1 Baseline 2): "RENSTRA OPD (5 tahunan, per OPD)". |
| **Renstra OPD** — implementasi aktual dalam sistem | **6 tahun** | Modul 4 Baseline 2, eksplisit: *"Siklus: 6 tahun (target_tahun_1 s.d. target_tahun_6 & pagu_tahun_1 s.d. pagu_tahun_6)"*; kalkulasi `target_akhir_renstra` = rata-rata 6 tahun via `renstraCalculationService.js`. |

### 1.2 Mengapa keputusan ini diperlukan

BP-DATA-001 §16 mencantumkan konflik ini sebagai documented conflict yang sengaja didelegasikan ke ADR-0001. BP-DATA-002 §13/§29 mencantumkan Planning and Reporting Period sebagai category concern yang bergantung pada keputusan ini. AIR-001 mencatat isu ini sebagai Critical/Decision Required sejak Wave 0.

### 1.3 Yang TIDAK termasuk cakupan keputusan ini

- ADR-0001 tidak mengubah periode RPJMD (tetap 5 tahun; tidak dipertentangkan).
- ADR-0001 tidak membuat temporal schema teknis (bitemporal, SCD, dsb.) — tetap Evidence Pending dan domain BP-DATA-003 Seq 22.
- ADR-0001 tidak mengubah kode aplikasi. Keputusan ini adalah keputusan arsitektur/kebijakan data; perubahan kode (bila diperlukan) menjadi work package terpisah di bawah Migration/Implementation (Seq 67+), dan **tidak dieksekusi sebagai bagian dari ADR ini**.
- ADR-0001 tidak menetapkan interpretasi legal definitif atas Permendagri 86/2017.

---

## 2. Opsi yang Dipertimbangkan

| Opsi | Deskripsi ringkas |
| --- | --- |
| A — 5 tahun | Renstra OPD distandarkan ke 5 tahun mengikuti RPJMD; field tahun ke-6 di-deprecate, migrasi data diperlukan. |
| B — 6 tahun | Renstra OPD distandarkan resmi ke 6 tahun mengikuti implementasi berjalan; tidak ada migrasi, perlu klarifikasi legal. |
| **C — Hybrid (dipilih)** | Renstra OPD tetap 5 tahun sebagai siklus normatif utama (selaras RPJMD/regulasi); tahun ke-6 dipertahankan sebagai **transition year** eksplisit dengan semantik baru, bukan bagian dari siklus utama. |

Analisis perbandingan lengkap dan trade-off ketiga opsi tercatat pada draft kerja yang mendahului keputusan ini (disimpan sebagai working paper, tidak menjadi bagian repository resmi).

---

## 3. Keputusan

**Renstra OPD menggunakan model periode hybrid:**

1. **Siklus normatif Renstra OPD adalah 5 tahun**, selaras dengan RPJMD dan bacaan umum Permendagri 86/2017 Bab VI. Field `target_tahun_1` s.d. `target_tahun_5` dan `pagu_tahun_1` s.d. `pagu_tahun_5` adalah **primary planning period** yang wajib diisi untuk setiap Renstra OPD.
2. **Tahun ke-6** (`target_tahun_6`, `pagu_tahun_6`) dipertahankan dalam skema data, tetapi diberi semantik eksplisit sebagai **"transition year"** — periode tambahan yang mengakomodasi kondisi bridging antara akhir satu RPJMD/Renstra dengan efektifnya RPJMD/Renstra berikutnya (misalnya karena perbedaan waktu pelantikan kepala daerah dengan awal periode RPJMD kalender).
3. Transition year **bersifat kondisional, bukan wajib** — tidak setiap siklus Renstra OPD otomatis memiliki transition year aktif.
4. Field/metadata baru `period_type` (nilai: `normative` | `transition`) diperlukan pada level design-time concern untuk membedakan kedua jenis tahun ini secara eksplisit. Detail skema, aturan pemicu, dan implementasi teknis **tidak ditetapkan dalam ADR ini** — didelegasikan ke BP-DATA-003 (Data Lineage and Traceability Blueprint, Seq 22) dan/atau GOV-DATA-001 (Data Governance Operating Model, Seq 24).

### 3.1 Pertanyaan lanjutan yang tetap terbuka (bukan bagian keputusan ADR ini)

Butir berikut memerlukan klarifikasi lanjutan sebelum implementasi teknis, dan **tidak diputuskan** oleh ADR-0001:

1. Kapan tepatnya transition year berlaku (aturan pemicu spesifik).
2. Apakah aturan berlaku seragam untuk seluruh OPD atau dapat bervariasi.
3. Siapa yang berwenang menetapkan/memverifikasi bahwa suatu Renstra memerlukan transition year — kategori **institutional/statutory authority**, tetap `To be designated or verified by competent institutional authority — Evidence Pending`.

Butir-butir ini dicatat sebagai **Evidence Pending** dan dirutekan ke GOV-DATA-001 Seq 24 sebagai follow-up governance, bukan keputusan tambahan dalam ADR ini.

---

## 4. Konsekuensi

### 4.1 Dampak positif
- Tidak memerlukan migrasi data destruktif; field tahun ke-6 yang sudah ada di sistem berjalan tidak dibuang.
- Selaras dengan RPJMD dan bacaan regulasi umum untuk siklus normatif.
- Memberi dasar semantik yang defensible secara audit untuk field tahun ke-6, alih-alih dibiarkan sebagai anomali tanpa penjelasan.

### 4.2 Dampak yang memerlukan tindak lanjut
- Skema data memerlukan penambahan metadata `period_type` (perubahan minor, non-destruktif) — pekerjaan ini berada di scope BP-DATA-003/GOV-DATA-001, bukan ADR ini.
- Aturan pemicu transition year memerlukan definisi lanjutan sebelum dapat diimplementasikan secara konsisten lintas OPD.
- Dokumentasi internal (Baseline 2 Modul 4) sebaiknya diperbarui pada siklus review baseline berikutnya untuk mencerminkan semantik baru ini — **ADR ini tidak mengubah Official Current State Baseline**, karena baseline adalah dokumen fakta historis, bukan target arsitektur.

### 4.3 Yang tidak berubah
- RPJMD tetap 5 tahun tanpa perubahan.
- Tidak ada perubahan kode aplikasi sebagai bagian dari ADR ini.
- Tidak ada data production yang dimodifikasi.

---

## 5. Status dan Batas Kewenangan

- Status: **Accepted**, efektif 2026-08-05.
- Keputusan diambil oleh Project Owner (Fahmi Alhabsi), bukan oleh Claude Work secara sepihak — sesuai proses eskalasi HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6 dan §4.5.
- G1 dan G2 tetap tanpa disposition. ADR-0001 Accepted adalah salah satu evidence minimum untuk G2 (Roadmap §8), bukan G2 disposition itu sendiri.
- AIR-001 diperbarui menjadi Resolved sebagai konsekuensi keputusan ini (lihat pembaruan terpisah pada Architecture Issue Register); closure formal AIR-001 tetap memerlukan closure approval eksplisit Project Owner sesuai Definition of Closure register tersebut.
- ADR-0001 tidak menetapkan implementation completion, institutional authority assignment, compliance determination, atau Gate disposition apa pun di luar keputusan periode yang tercantum di §3.

---

## 6. Evidence dan Referensi

- Baseline: `01-current-state/2-modul-sistem.md` (Modul 1, Modul 4, §2.1).
- BP-DATA-001 — Enterprise Data Domain Model, Version 1.0.0, Approved, §16.
- BP-DATA-002 — Master and Reference Data Blueprint, Version 1.0.0, Approved, §13, §29.
- Architecture Issue Register — AIR-001.
- HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6, §3.3, §4.5 (proses eskalasi dan keputusan Project Owner).
- Keputusan Project Owner: dikonfirmasi 5 Agustus 2026 (Opsi C dipilih dari draft opsi/rekomendasi yang diajukan Claude Work).

---

## 7. Persetujuan

| Peran | Nama | Keputusan | Tanggal |
| --- | --- | --- | --- |
| Project Owner | Fahmi Alhabsi | Memilih Opsi C (Hybrid); Accepted | 2026-08-05 |
| Acting Chief Enterprise Architect | Claude Work (HANDOFF-e-PeLARA-EA-2026-08-05-v10) | Menyusun draft opsi, rekomendasi, dan finalisasi ADR sesuai keputusan Project Owner | 2026-08-05 |

## 8. Change Log

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Draft opsi (A/B/C) dan rekomendasi disiapkan untuk eskalasi Project Owner; tidak ada opsi dipilih. | Claude Work | Proposed — Decision Pending |
| 1.0.0 | 2026-08-05 | Project Owner memilih Opsi C (Hybrid). ADR difinalisasi dengan status Accepted, efektif 2026-08-05. | Claude Work berdasarkan keputusan Project Owner | Accepted |

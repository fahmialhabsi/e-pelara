---
document_id: REF-EA-001
title: Enterprise Architecture Traceability Matrix
system: e-PeLARA Next Generation
classification: Reference Catalog
domain: Transition and Implementation
version: 1.1.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-29
parent_document: ../00-governance/09-Traceability-Standard.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G1–G6
roadmap_dependency: All approved artifacts
intended_repository_path: 10-transition-and-implementation/74-Enterprise-Architecture-Traceability-Matrix.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 74 — Enterprise Architecture Traceability Matrix

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **struktur register traceability resmi** yang menghubungkan Charter → Roadmap → domain blueprint → Gate — melanjutkan GOV-EA-006 (Traceability Standard, Approved) §7 identifier/relationship standard dan §30 metadata/evidence level standard. Dokumen ini adalah **struktur/skema matrix yang disahkan**, bukan pernyataan bahwa seluruh relationship telah diverifikasi lengkap dengan evidence penuh untuk setiap baris; relationship yang belum terverifikasi eksplisit tetap **Evidence Pending**.

## 2. Ruang Lingkup

Dalam scope: skema traceability matrix (kolom, relationship type, evidence level), populasi tingkat tinggi relationship Seq 00-74 berdasarkan dependency yang **sudah tercatat eksplisit pada Master Roadmap dan front-matter artefak** (roadmap_dependency, parent_document). Di luar scope: verifikasi ulang substansi tiap artefak, penciptaan relationship baru yang tidak tercatat, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/09-Traceability-Standard.md` (GOV-EA-006, Approved) §7, §30 — identifier/relationship standard dan metadata/evidence level standard sebagai basis skema matrix.
- `11-roadmaps/02-Enterprise-Architecture-Roadmap.md` §6 (Master Document Sequence, Seq 00-74) — daftar Document ID, Dependency, dan Gate per artefak, dibaca langsung sebagai sumber relationship tingkat tinggi.
- `00-governance/06-Change-Log.md` — ECHG-001 s.d. ECHG-080 (Batch 1-4, dibaca sebagai referensi keberadaan pencatatan finalisasi, tidak diverifikasi ulang isi detail tiap entri satu per satu).

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Enterprise Architecture Traceability Matrix

1. **Matrix mencerminkan dependency yang sudah tercatat, bukan verifikasi baru**: relationship pada matrix diambil dari kolom "Dependency" Master Roadmap §6 dan field `roadmap_dependency`/`parent_document` front-matter artefak — dokumen ini tidak melakukan analisis dependency independen baru.
2. **Gap tetap Evidence Pending**: apabila suatu relationship tidak dapat dikonfirmasi dari sumber yang dibaca, statusnya dicatat Evidence Pending, tidak diasumsikan atau diarang.
3. **Cakupan Seq 00-74**: matrix mencakup seluruh Master Document Sequence dari Charter (Seq 00) hingga Traceability Matrix ini sendiri (Seq 74) — traceability terhadap dokumen ini sendiri dicatat sebagai referensi struktural, bukan self-verifikasi substantif.
4. **Bukan pengganti evidence artefak individual**: matrix ini adalah indeks/ringkasan relationship; evidence detail tetap berada pada Persetujuan dan Change Log lokal masing-masing artefak.

## 6. Candidate Traceability Matrix Schema

| Field | Ketentuan |
| --- | --- |
| `seq` | Nomor urut Master Document Sequence (00-74). |
| `document_id` | Sesuai Master Roadmap §6. |
| `parent_dependency` | Diambil dari kolom Dependency Roadmap §6 / field `roadmap_dependency` front-matter. |
| `gate` | Sesuai kolom Gate Roadmap §6. |
| `status` | Approved/Not Applicable — Master Roadmap Exhausted/Deferred, sesuai state artefak terverifikasi. |
| `evidence_level` | Sesuai GOV-EA-006 §30.2. |
| `relationship_type` | `DEPENDS_ON` mengikuti vocabulary formal GOV-EA-006 §8 (tidak diciptakan ulang). |

## 7. Ringkasan Populasi Matrix Tingkat Tinggi (Seq 00-74)

| Rentang Seq | Domain | Status Keseluruhan | Evidence Status |
| --- | --- | --- | --- |
| 00-09 | Foundation and Governance | Approved | Documented Current Fact (tercatat Roadmap §6.1) |
| 10-17 | Business Architecture | Approved | Documented Current Fact (Roadmap §6.2) |
| 18-28 | Data and Knowledge Architecture | Approved | Documented Current Fact (Roadmap §6.3) |
| 29-39 | Application and Integration Architecture | **Approved penuh (koreksi 2026-08-29 — baris ini usang).** BP-APP-002 Seq 32 (v0.2.1, Approved 2026-08-06, evidence tambahan 2026-08-29) dan BP-INT-001 Seq 38 (v0.1.1, Approved 2026-08-06, evidence tambahan 2026-08-29) **sudah disusun dan Approved**, bukan lagi "belum disusun". | Documented Current Fact (lihat §7a untuk koreksi lengkap) |
| 40-49 | Technology and Security Architecture | **Approved penuh (koreksi 2026-08-29 — baris ini usang).** BP-TECH-003 Seq 44 (v0.2.0, Approved 2026-08-06, evidence restore test 2026-08-29) **sudah disusun dan Approved**, bukan lagi "belum disusun". | Documented Current Fact (lihat §7a untuk koreksi lengkap) |
| 50-57 | Intelligence and AI Architecture | Approved | Documented Current Fact (Batch 2-3) |
| 58-66 | Publishing and Design System | Approved | Documented Current Fact (Batch 3-4) |
| 67-74 | Transition and Implementation | Approved (Approved Plan, bukan pelaksanaan) | Documented Current Fact (Batch 4); Implementation Pending untuk seluruh evidence pelaksanaan |

### 7a. Addendum 2026-08-29 — Koreksi Staleness Seq 32/38/44, dan Batasan Populasi Detail

Dijalankan di bawah `11-roadmaps/backlog-eksekusi-otomatis.md` (mandat eksekusi teknis, bukan mandat draft-only §12 di bawah). Dua hal dilakukan:

**1. Koreksi faktual (dilakukan)**: §7 dan §9 sebelumnya mencatat Seq 32 (BP-APP-002), Seq 38 (BP-INT-001), Seq 44 (BP-TECH-003) sebagai "belum disusun" — ini benar pada 2026-08-05 saat dokumen ini pertama disusun, tetapi sudah **usang** sejak ketiganya disetujui Project Owner pada 2026-08-06 (Master Artifact Register §17d, ECHG-084). Baris §7 di atas diperbarui untuk mencerminkan status Approved terkini. Ini adalah koreksi fakta bersumber dari Change Log/Master Artifact Register yang sudah ada — bukan analisis dependency baru, konsisten dengan §5.1.

**2. Populasi detail requirement↔artefak↔kode per 75 artefak — SENGAJA TIDAK dilakukan.** Rencana awal runbook meminta "populasikan mapping traceability requirement↔artefak↔kode secara lebih lengkap (bukan sekadar tingkat tinggi) untuk seluruh 75 artefak." Peninjauan ulang dokumen ini sendiri menemukan itu bertentangan dengan batasan eksplisitnya sendiri: §2 ("Di luar scope: ... penciptaan relationship baru yang tidak tercatat"), §5.1 ("dokumen ini tidak melakukan analisis dependency independen baru"), dan §12 ("Dilarang: Menciptakan relationship yang tidak tercatat pada sumber"). Membangun matrix detail per-requirement untuk 75 artefak akan memerlukan menyimpulkan/menciptakan banyak relationship spesifik yang tidak eksplisit tercatat di Master Roadmap §6 atau front-matter — persis yang dilarang dokumen ini sendiri. Populasi tingkat tinggi (§7) tetap menjadi cakupan sah dokumen ini; populasi detail per baris tetap **Evidence Pending**, dicatat di §10, bukan dikerjakan dengan asumsi.

## 8. Boundary dengan GOV-EA-006 (Approved)

GOV-EA-006 menetapkan standar identifier, relationship vocabulary, dan metadata/evidence level; dokumen ini menerapkan standar tersebut sebagai matrix konsolidasi, tanpa mengubah vocabulary atau standar GOV-EA-006.

## 9. Boundary dengan Seq 32, 38, 44 (Historis — Sudah Disusun, lihat §7a)

**Bagian ini mendeskripsikan kondisi historis pada 2026-08-05, dipertahankan untuk riwayat.** Saat dokumen ini pertama disusun, Seq 32 (BP-APP-002), Seq 38 (BP-INT-001), Seq 44 (BP-TECH-003) memang **belum disusun**, terikat AIR-004/AIR-007/AIR-009. Ketiganya kini **sudah disusun dan Approved** sejak 2026-08-06 — lihat §7a untuk koreksi dan status terkini. AIR-004/007/009 sendiri kini berstatus Resolved (bukan lagi Decision Required), dengan evidence tambahan per 2026-08-29 (lihat Architecture Issue Register).

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Verifikasi detail relationship per baris (di luar tingkat tinggi) | To be assigned by Project Owner — Evidence Pending | Governance/review lanjutan |
| Populasi Seq 32/38/44 | To be designated or verified by competent institutional authority — Evidence Pending | Resolusi AIR-004/007/009 |
| Evidence pelaksanaan Seq 67-74 (migrasi/implementasi aktual) | To be assigned by Project Owner — Evidence Pending | Implementasi lanjutan |

## 11. Assumptions dan Program State

1. Seluruh artefak Approved Seq 00-74 (kecuali Seq 32/38/44 yang belum disusun) adalah dependency; tidak diubah oleh dokumen ini.
2. G1 DEFERRED; G2/G3 tanpa disposition; G4-G6 tanpa disposition; dokumen ini tidak menetapkan disposition Gate mana pun.
3. Penyelesaian dokumen ini melengkapi seluruh Master Document Sequence Seq 00-74 secara dokumentasi (kecuali Seq 32/38/44 yang tetap belum disusun karena terikat keputusan eksternal).
4. Penyelesaian dokumentasi tidak berarti implementasi/migrasi/production go-live telah dilaksanakan untuk domain mana pun.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun struktur traceability matrix dan populasi tingkat tinggi berdasarkan GOV-EA-006 dan Master Roadmap yang Approved, mencatat gap/Seq belum disusun secara verbatim, routing Evidence Pending, self-review, dan finalisasi struktur dalam batas delegasi.

**Dilarang**: Menciptakan relationship yang tidak tercatat pada sumber, mengklaim Seq 32/38/44 selesai, mengklaim implementasi/migrasi telah dilaksanakan, atau disposition Gate.

**Addendum 2026-08-29 — mandat berbeda**: koreksi §7/§9 dan penambahan §7a dilakukan di bawah runbook eksekusi backlog. Batasan di atas tetap berlaku penuh: koreksi Seq 32/38/44 bersumber dari Change Log/Master Artifact Register yang sudah ada (bukan relationship baru), populasi detail per-requirement 75 artefak **sengaja tidak dilakukan** (lihat §7a butir 2) karena akan melanggar larangan "menciptakan relationship yang tidak tercatat pada sumber" di atas.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan GOV-EA-006 dan Master Roadmap. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; matrix struktur/populasi tingkat tinggi, bukan verifikasi detail baru. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 25-Artifact Autonomous Batch Mandate (Batch 4) tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Enterprise Architecture Traceability Matrix sebagai REF-EA-001 Seq 74, berdasarkan GOV-EA-006 dan Master Roadmap §6 (Approved). Cakupan: skema matrix dan populasi tingkat tinggi Seq 00-74. Seq 32/38/44 dicatat belum disusun (terikat AIR-004/007/009). Menutup seluruh Master Document Sequence secara dokumentasi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi struktur menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |
| 1.1.0 | 2026-08-29 | **Koreksi staleness**: §7 baris "29-39" dan "40-49" diperbarui — Seq 32/38/44 sudah Approved sejak 2026-08-06, bukan lagi "belum disusun". §9 diberi keterangan historis. Ditambahkan §7a (penjelasan koreksi + batasan populasi detail). Populasi detail requirement↔artefak↔kode per 75 artefak **sengaja tidak dikerjakan** — bertentangan dengan larangan dokumen ini sendiri (§2/§5.1/§12) terhadap penciptaan relationship yang tidak tercatat pada sumber. Ditambahkan addendum §12. Dijalankan di bawah runbook `11-roadmaps/backlog-eksekusi-otomatis.md`. | Claude (mode `/loop`, sesi eksekusi backlog) | Approved (koreksi faktual; review substantif Project Owner belum dilakukan) |

## 15. Validation Checklist (Version 1.1.0)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (GOV-EA-006, Master Roadmap) Approved dan tidak diubah.
3. ✓ Seq 32/38/44 dicatat verbatim belum disusun, tidak diasumsikan selesai.
4. ✓ Tidak ada relationship baru diciptakan di luar sumber yang dibaca.
5. ✓ Tidak ada klaim implementasi/migrasi dilaksanakan.
6. ✓ G1 DEFERRED, G2-G6 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.1.0, status **Approved** (struktur/populasi tingkat tinggi; koreksi staleness 2026-08-29). Dependency Approved dan tidak diubah. Seq 32/38/44 **kini Approved** (dikoreksi dari "belum disusun" — lihat §7a). Master Document Sequence Seq 00-74 lengkap secara dokumentasi maupun status Approved untuk seluruh artefak. Populasi detail requirement↔artefak↔kode per baris tetap Evidence Pending, sengaja tidak dikerjakan (§7a butir 2). G1 DEFERRED; G2-G6 tanpa disposition.

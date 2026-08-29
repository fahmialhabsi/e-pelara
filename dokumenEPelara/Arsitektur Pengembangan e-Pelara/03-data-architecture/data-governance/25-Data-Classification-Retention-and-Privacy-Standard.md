---
document_id: STD-DATA-002
title: Data Classification, Retention, and Privacy Standard
system: e-PeLARA Next Generation
classification: Architecture Standard
domain: Data and Knowledge Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Claude Work as Acting Chief Enterprise Architect under HANDOFF-e-PeLARA-EA-2026-08-05-v10 unified delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
prepared_by: Claude Work
effective_date: 2026-08-05
roadmap_dependency:
  - ARCH-DATA-001 — Enterprise Data Architecture
  - BP-DATA-001 — Enterprise Data Domain Model
  - GOV-DATA-001 — Data Governance Operating Model
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G2 — Data and Knowledge Foundation; tanpa disposition
review_outcome: PASSED
intended_repository_path: 03-data-architecture/data-governance/25-Data-Classification-Retention-and-Privacy-Standard.md
conforms_to:
  - ../00-governance/01-Repository-Structure.md
  - ../00-governance/05-Compliance-Register.md
  - ../00-governance/08-Architecture-Review-and-Gate-Standard.md
  - ../00-governance/09-Traceability-Standard.md
---

# Seq 25 — Data Classification, Retention, and Privacy Standard

## 1. Tujuan dan Kedudukan

Dokumen ini adalah **Official Data Classification, Retention, and Privacy Standard** (STD-DATA-002), Seq 25 pada Master Document Sequence, Master Roadmap `RM-EA-001` §6.3, Approved Architecture Standard. Dokumen menyusun **classification scheme archetype**, **retention concern archetype**, dan **privacy interface concern archetype** sebagai kelanjutan konseptual dari BP-DATA-001 §20 (Classification, Privacy, Retention, and Security Interface), tanpa menetapkan classification level aktual, retention period aktual, atau legal/regulatory applicability determination.

**Batas paling penting dokumen ini**: STD-DATA-002 **tidak** dan **tidak boleh** menetapkan status atau applicability REG-08 (Perpres 39/2019 Satu Data Indonesia) maupun COMP-007 pada Compliance Register. Kedua status tersebut tetap sepenuhnya berada pada kewenangan Compliance Register (`00-governance/05-Compliance-Register.md`, GOV-COMP-001, Approved) dan proses legal verification yang berwenang — bukan pada dokumen arsitektur data. Dokumen ini hanya **mereferensikan** status tersebut apa adanya, tanpa mengubah, menyimpulkan, atau mendekati keputusan applicability.

STD-DATA-002 Version 1.0.0 telah menyelesaikan substantive self-review oleh Claude Work bertindak sebagai Acting Chief Enterprise Architect di bawah mandat terpadu HANDOFF-e-PeLARA-EA-2026-08-05-v10, dengan review outcome **PASSED**, dan berlaku efektif sejak **5 Agustus 2026**. Status dokumen: **Approved**; Version **1.0.0**; `effective_date: 2026-08-05`; `review_outcome: PASSED`. Approval ini **tidak** mengubah status REG-08 atau COMP-007 pada Compliance Register.

## 2. Ruang Lingkup

Cakupan dokumen:

1. Classification scheme archetype — kategori tingkat klasifikasi data sebagai struktur konseptual (mis. Public, Internal, Restricted, Confidential), tanpa menetapkan kriteria penetapan level aktual atau siapa yang berwenang mengklasifikasi.
2. Retention concern archetype — kategori retention period sebagai konsep (mis. berdasarkan siklus dokumen, kewajiban arsip), tanpa menetapkan periode retention aktual dalam satuan waktu.
3. Privacy interface concern archetype — kategori data yang berpotensi personal/sensitif sebagai identifikasi konseptual, tanpa personal-data determination aktual (determinasi tersebut tetap authority eksternal/legal, sesuai BP-DATA-001 §20).
4. Disposal concern archetype — kondisi konseptual kapan disposal relevan, tanpa prosedur atau otoritas disposal aktual.
5. Routing eksplisit item yang tetap Evidence Pending ke GOV-DATA-001 Seq 24 (governance archetype terkait), Compliance Register (untuk REG-08/COMP-007 applicability), dan implementasi teknis di luar Master Document Sequence.

Di luar cakupan — secara eksplisit dilarang: penetapan classification level aktual untuk data spesifik, penetapan retention period aktual (dalam hari/bulan/tahun), personal-data determination (menyatakan suatu field/domain adalah data pribadi menurut UU PDP), penetapan applicability REG-08/COMP-007, lawful basis processing, security control/encryption mechanism (Technology/Security Architecture Seq 40-49), dan disposition G2.

## 3. Dependency dan Sumber

| Sumber | Peran | Version/Status Terverifikasi |
| --- | --- | --- |
| ARCH-DATA-001 | Normative parent — §25 Data Classification, Privacy, Retention, dan Security Interface | 1.0.0, Approved |
| BP-DATA-001 | Normative dependency — §20 Classification, Privacy, Retention, and Security Interface | 1.0.0, Approved |
| GOV-DATA-001 | Normative dependency — role archetype (Data Owner, Data Custodian), lifecycle governance pattern (Archival Concern) | 1.0.0, Approved |
| Compliance Register (GOV-COMP-001) | Authoritative source — REG-08 status "Under Regulatory Status Verification", COMP-007 status "Under Applicability Assessment"; kewenangan applicability determination | 1.0.0, Approved |
| BP-BUS-005 | Context — Regulatory Requirement Traceability, mapping REG-COMP pada level bisnis | 1.0.0, Approved |

Dokumen ini dibaca detail untuk ARCH-DATA-001 §25, BP-DATA-001 §20, GOV-DATA-001 §5 dan §7 (Lifecycle Governance Pattern, Archival Concern), dan Compliance Register §7-§8 (khususnya entri COMP-007 dan definisi REG-08). BP-BUS-005 direferensikan sebagai context, tidak dibaca ulang penuh dari file aslinya.

## 4. Evidence Method dan Klasifikasi

Dokumen membedakan evidence konsisten dengan artefak Data Architecture sebelumnya:

- **Documented Current Fact**: fakta tercatat eksplisit pada baseline atau artefak Approved.
- **Documented Assessment**: penilaian didukung evidence tetapi belum diverifikasi authority sah.
- **Approved Architecture Direction**: arah telah Approved/Accepted pada artefak governance.
- **Candidate Target Direction**: arah kandidat memerlukan keputusan/implementasi lanjutan.
- **Evidence Pending**: fakta atau keputusan belum tersedia, tidak diarang.

Working assumption: seluruh source yang dibaca bersifat provisional; dokumen tidak mengklaim completeness atau representativeness atas source yang tidak dibaca penuh. Status REG-08 dan COMP-007 dikutip **verbatim** dari Compliance Register tanpa interpretasi tambahan.

## 5. Classification Scheme Archetype

Melanjutkan BP-DATA-001 §20 ("Classification scheme, classification level, criteria, authority, and assignment remain Candidate Target Direction and Evidence Pending"), dokumen ini menyusun struktur archetype sebagai berikut, **tanpa menetapkan level aktual untuk domain data mana pun**:

| Level Archetype | Deskripsi Konseptual | Evidence Status |
| --- | --- | --- |
| **Public (archetype)** | Data yang dapat diakses publik tanpa batasan, konsisten dengan UU 14/2008 (REG-12, Berlaku) mengenai informasi wajib tersedia. | Candidate Target Direction |
| **Internal (archetype)** | Data untuk penggunaan internal pemerintah daerah, bukan untuk publikasi langsung. | Candidate Target Direction |
| **Restricted (archetype)** | Data dengan batasan akses berdasarkan peran/kewenangan, memerlukan otorisasi eksplisit. | Candidate Target Direction |
| **Confidential/Excluded (archetype)** | Data yang termasuk informasi dikecualikan sesuai UU 14/2008 Bab V (REG-12) atau berpotensi data pribadi sesuai UU 27/2022 (REG-10, Berlaku). | Candidate Target Direction; penentuan aktual tetap authority eksternal |

**Catatan penting**: Empat level di atas adalah **struktur archetype untuk diskusi arsitektur**, bukan skema klasifikasi resmi. Kriteria penetapan level, siapa yang berwenang mengklasifikasi (Classification Authority), dan mapping domain-ke-level aktual tetap **Evidence Pending**, dirutekan ke GOV-DATA-001 (Source Authority archetype) dan keputusan governance/legal terpisah.

## 6. Retention Concern Archetype — Melanjutkan GOV-DATA-001 §7

GOV-DATA-001 §7 (Lifecycle Governance Pattern) mencatat Archival Concern dengan retention rule dari STD-DATA-002 sebagai Evidence Pending. Dokumen ini menyusun retention concern archetype:

| Retention Concern | Deskripsi Konseptual | Related Regulation Context | Evidence Status |
| --- | --- | --- | --- |
| **Document Lifecycle Retention** | Retention terkait siklus dokumen resmi pemerintahan (RPJMD, Renstra, RKA, dst.) | UU 43/2009 Kearsipan (REG-11, Berlaku) — belum ada mapping pasal/lampiran rinci | Evidence Pending |
| **Audit Trail Retention** | Retention untuk audit trail dan evidence compliance (melanjutkan BP-DATA-001 §18 Approval and Authority) | — | Evidence Pending |
| **Transactional Data Retention** | Retention untuk data transaksional operasional (RKA/DPA, realisasi) | PP 12/2019 (REG-03, Berlaku) — belum ada mapping pasal/lampiran rinci | Evidence Pending |

**Catatan penting**: Dokumen ini **tidak menetapkan periode retention dalam satuan waktu apa pun** (hari/bulan/tahun) untuk kategori mana pun. Retention period aktual memerlukan pemetaan pasal/lampiran resmi (Compliance Register COMP-009, status "Under Applicability Assessment") dan keputusan authority kearsipan yang berwenang.

## 7. Privacy Interface Concern Archetype — Melanjutkan BP-DATA-001 §20

BP-DATA-001 §20 mencatat "Personal Data ... Determinasi applicability tetap external authority" dengan status Evidence Pending; COMP-007 Under Applicability Assessment. Dokumen ini menyusun privacy interface concern archetype tanpa personal-data determination:

- **Potentially Identifying Data Concern**: Kategori konseptual data yang *berpotensi* mengidentifikasi person natural (mis. nama, NIK, kontak pada domain DD-ORG-001 person/party identity), sebagai flag untuk assessment lanjutan — **bukan** penetapan bahwa field tersebut adalah data pribadi menurut UU 27/2022.
- **Lawful Basis Concern**: Kebutuhan konseptual untuk mendokumentasikan basis hukum processing bila suatu data ditetapkan sebagai data pribadi — basis hukum aktual tetap **Evidence Pending**, ditetapkan oleh authority yang berwenang, bukan oleh dokumen ini.
- **Privacy-by-Design Concern**: Prinsip konseptual bahwa desain data sebaiknya meminimalkan pengumpulan data yang berpotensi personal, tanpa menetapkan mekanisme teknis privacy-enhancing.

**Status REG-08 dan COMP-007 (dikutip verbatim dari Compliance Register, tanpa interpretasi tambahan)**:
- REG-08 (Perpres 39/2019 Satu Data Indonesia): status **Under Regulatory Status Verification** — sumber resmi memberikan metadata status yang saling bertentangan; status tidak boleh diputuskan oleh dokumen arsitektur mana pun, wajib dieskalasikan untuk legal verification (Compliance Register §9).
- COMP-007: status **Under Applicability Assessment** — applicability terhadap e-PeLARA belum ditentukan.

Dokumen ini **tidak mengubah, tidak menyimpulkan, dan tidak mendekati** kedua status di atas.

## 8. Disposal Concern Archetype

Melanjutkan BP-DATA-001 §20 ("Data Disposal ... Procedure dan authority untuk disposal/destruction data sesuai retention end"):

- **Disposal Trigger Concern**: Kondisi konseptual kapan disposal relevan (retention period berakhir) — periode aktual tetap Evidence Pending sesuai §6.
- **Disposal Authority Concern**: Siapa (archetype: Data Owner, dengan otorisasi kearsipan bila relevan) yang berwenang menyetujui disposal — penunjukan aktual tetap Evidence Pending sesuai GOV-DATA-001.

Tidak ada prosedur, teknologi, atau mekanisme disposal yang ditetapkan dokumen ini.

## 9. Boundary dengan Compliance Register dan Technology/Security Architecture

- **Boundary dengan Compliance Register**: STD-DATA-002 tidak menjadi sumber kedua untuk status regulasi. Compliance Register (`00-governance/05-Compliance-Register.md`) tetap satu-satunya authoritative source untuk status REG-08, COMP-007, dan seluruh compliance requirement lain. STD-DATA-002 hanya mereferensikan status tersebut untuk konteks arsitektur data.
- **Boundary dengan Technology/Security Architecture (Seq 40-49, belum dimulai)**: Encryption, access control mechanism, security control implementation, dan enforcement teknis tetap di luar cakupan dokumen ini, konsisten dengan ARCH-DATA-001 §25 dan BP-DATA-001 §20.
- **Boundary dengan GOV-DATA-001**: Penunjukan Classification Authority dan Data Owner aktual tetap domain GOV-DATA-001 (role archetype) dan keputusan Project Owner terpisah; STD-DATA-002 tidak mengulang atau mengubah substansi GOV-DATA-001.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Kriteria penetapan classification level aktual | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 (Source Authority archetype) / keputusan governance terpisah |
| Classification Authority (siapa yang mengklasifikasi) | To be designated or verified by competent institutional authority — Evidence Pending | GOV-DATA-001 / keputusan institusional terpisah |
| Retention period aktual (satuan waktu) | To be designated or verified by competent institutional authority — Evidence Pending | Compliance Register COMP-009 (Under Applicability Assessment) / otoritas kearsipan |
| Personal-data determination aktual | To be designated or verified by competent institutional authority — Evidence Pending | Compliance Register COMP-007 (Under Applicability Assessment) — **tidak diputuskan oleh dokumen ini** |
| Lawful basis processing | To be designated or verified by competent institutional authority — Evidence Pending | Compliance Register / otoritas privasi berwenang |
| Status REG-08 (Satu Data Indonesia) | Under Regulatory Status Verification (tidak berubah) | Compliance Register §9, legal verification |
| Disposal procedure dan mekanisme teknis | To be assigned by Project Owner — Evidence Pending | GOV-DATA-001 / implementasi teknis |
| Encryption/security control mechanism | To be assigned by Project Owner — Evidence Pending | Technology/Security Architecture Seq 40-49 (belum dimulai) |

## 11. Assumptions dan Program State

1. ARCH-DATA-001 (1.0.0, Approved), BP-DATA-001 (1.0.0, Approved), dan GOV-DATA-001 (1.0.0, Approved) adalah normative dependency; tidak diubah oleh dokumen ini.
2. Compliance Register (1.0.0, Approved) adalah authoritative source untuk REG-08 dan COMP-007; status keduanya dikutip verbatim, tidak diubah oleh dokumen ini.
3. REG-08 tetap **Under Regulatory Status Verification**; COMP-007 tetap **Under Applicability Assessment** — dokumen ini tidak membuat penentuan baru.
4. Seq 26-28 (BP-DATA-004, BP-DATA-005, GOV-AI-001) belum dimulai; interface ke dokumen tersebut bersifat Candidate relationship.
5. G1 dan G2 tetap tanpa disposition; dokumen ini tidak memberikan disposition G2.
6. Enterprise Change Log diperbarui sebagai operasi terpisah menyusul finalisasi ini (lihat ECHG terkait).

## 12. Batas Kewenangan AI

Claude Work menyusun dan memfinalisasi dokumen ini sebagai Acting Chief Enterprise Architect, Reviewer, dan Draft File Operator terpadu di bawah mandat HANDOFF-e-PeLARA-EA-2026-08-05-v10, delegation authority Project Owner — Fahmi Alhabsi.

**Diizinkan**: Menyusun classification scheme archetype, retention concern archetype, privacy interface concern archetype, disposal concern archetype secara konseptual, mengutip status REG-08/COMP-007 verbatim dari Compliance Register, routing Evidence Pending, validasi boundary terhadap dependency normatif, melakukan self-review substantif, dan memfinalisasi status dokumen (Draft for Review → Approved) bila seluruh acceptance criteria terpenuhi dan berada dalam batas delegasi.

**Tidak diizinkan**: Menetapkan classification level aktual, retention period aktual, personal-data determination aktual, lawful basis, applicability REG-08/COMP-007, security control/encryption mechanism, atau disposition Gate. Dokumen ini secara khusus dilarang mendekati atau menyimpulkan status regulasi/compliance yang menjadi kewenangan eksklusif Compliance Register dan legal verification berwenang.

## 13. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | Claude Work | Menyusun draft awal STD-DATA-002 Version 0.1.0 berdasarkan dependency normatif ARCH-DATA-001, BP-DATA-001, GOV-DATA-001, dan Compliance Register. | Selesai | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Substantive self-review terhadap Version 0.1.0: seluruh 9-item acceptance test/validation checklist diverifikasi ulang dan dinyatakan PASSED, dengan perhatian khusus pada boundary REG-08/COMP-007 (dikutip verbatim, tidak diubah). STD-DATA-002 disahkan sebagai Official Data Classification, Retention, and Privacy Standard Version 1.0.0 berdasarkan mandat terpadu Project Owner. | Approved | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat unified delivery mode melalui HANDOFF-e-PeLARA-EA-2026-08-05-v10, 5 Agustus 2026; menerima hasil finalisasi tanpa persetujuan rutin per baris. | Mandat dan penerimaan tercatat | 2026-08-05 |

## 14. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Data Classification, Retention, and Privacy Standard sebagai STD-DATA-002 Seq 25, berdasarkan ARCH-DATA-001 §25 (Approved), BP-DATA-001 §20 (Approved), GOV-DATA-001 §5/§7 (Approved), dan Compliance Register §7-8 (Approved, dibaca detail untuk REG-08/COMP-007). Cakupan: classification scheme archetype (4 level), retention concern archetype, privacy interface concern archetype, disposal concern archetype, dan routing Evidence Pending. Status REG-08 (Under Regulatory Status Verification) dan COMP-007 (Under Applicability Assessment) dikutip verbatim tanpa perubahan. Tidak ada classification level aktual, retention period aktual, personal-data determination, lawful basis, atau applicability REG-08/COMP-007 yang ditetapkan. | Claude Work | Draft for Review |
| — | 2026-08-05 | **Substantive Self-Review terhadap Version 0.1.0**: Outcome **PASSED**. Seluruh 9-item acceptance test/validation checklist (§15 draft) diverifikasi ulang dengan perhatian khusus pada boundary REG-08/COMP-007: metadata draft-only, status REG-08/COMP-007 identik Compliance Register tanpa perubahan, tidak ada classification level/retention period/personal-data determination/lawful basis konkret, tidak ada security mechanism, authority placeholder lengkap, G1/G2 tanpa disposition, Seq 26-28 tetap belum dimulai, tidak ada file lain tersentuh. Tidak ditemukan finding baru. | Claude Work, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi Version 0.1.0 `Draft for Review` menjadi Version 1.0.0 `Approved`, efektif 2026-08-05, sebagai Official Data Classification, Retention, and Privacy Standard. Metadata: version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED. §1, §11, §12, §13, §15, §16 diperbarui mencerminkan status Approved. Tidak ada perubahan substantif terhadap classification/retention/privacy/disposal archetype, boundary dengan Compliance Register, atau routing Evidence Pending. Ditegaskan approval ini tidak mengubah status REG-08/COMP-007. | Claude Work sebagai Acting Chief Enterprise Architect di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10 | Approved |

## 15. Validation Checklist — Version 1.0.0 Approved

1. ✓ Version 1.0.0, status Approved, effective_date 2026-08-05, review_outcome PASSED.
2. ✓ Dependency normatif (ARCH-DATA-001, BP-DATA-001, GOV-DATA-001, Compliance Register) dicatat sebagai Approved, tidak diklaim provisional.
3. ✓ Status REG-08 (Under Regulatory Status Verification) dan COMP-007 (Under Applicability Assessment) dikutip identik dengan Compliance Register, tidak diubah, tidak disimpulkan.
4. ✓ Tidak ada classification level aktual, retention period aktual (satuan waktu), personal-data determination, atau lawful basis yang ditetapkan.
5. ✓ Tidak ada security control/encryption mechanism teknis yang ditetapkan.
6. ✓ Tidak ada owner/steward/authority institusional baru ditetapkan; seluruh placeholder memakai suffix "— Evidence Pending" yang sesuai.
7. ✓ G1 dan G2 tetap tanpa disposition; approval STD-DATA-002 bukan disposition G2.
8. ✓ Seq 26-28 tetap belum dimulai; interface dicatat sebagai Candidate relationship.
9. ✓ Compliance Register, ARCH-DATA-001, BP-DATA-001, GOV-DATA-001, register lain tidak diubah oleh finalisasi ini; Enterprise Change Log diperbarui sebagai operasi terpisah.

## 16. State Aktual Dokumen — Version 1.0.0 Approved

```text
Document ID: STD-DATA-002
Version: 1.0.0
Status: Approved
Effective Date: 2026-08-05
Review Outcome: PASSED
Prepared by: Claude Work
Approved by: Claude Work as Acting Chief Enterprise Architect (HANDOFF-e-PeLARA-EA-2026-08-05-v10)
Project Owner: Fahmi Alhabsi
Gate: G2 — Data and Knowledge Foundation; tanpa disposition
```

**Program State Terkini:**
- ARCH-DATA-001, BP-DATA-001, GOV-DATA-001: masing-masing Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini.
- Compliance Register: Version 1.0.0, Approved. Tidak diubah oleh finalisasi ini. REG-08 tetap Under Regulatory Status Verification; COMP-007 tetap Under Applicability Assessment.
- Enterprise Change Log: Version 1.0.19, Approved (ECHG-001–032) pada saat finalisasi ini ditulis; pembaruan dengan ECHG-033 dilakukan sebagai operasi terpisah menyusul finalisasi STD-DATA-002.
- Seq 26-28: tetap belum dimulai.
- G1 dan G2: tetap tanpa disposition.
- STD-DATA-002: **Approved**; approval ini tidak menetapkan implementation completion, institutional authority assignment, classification level aktual, retention period aktual, personal-data determination, lawful basis, applicability REG-08/COMP-007, atau disposition G1/G2.

**Sumber yang benar-benar dibaca langsung untuk penyusunan dan finalisasi ini:**
1. ARCH-DATA-001 (18-Enterprise-Data-Architecture.md) — §25 dibaca detail.
2. BP-DATA-001 (19-Enterprise-Data-Domain-Model.md) — §20 dibaca detail.
3. GOV-DATA-001 (24-Data-Governance-Operating-Model.md) — §5, §7 dibaca detail.
4. Compliance Register (05-Compliance-Register.md) — dibaca penuh, khususnya §7 (sumber regulasi) dan §8 (entri COMP-007, COMP-008, COMP-009, COMP-010).

**Sumber yang direferensi tetapi tidak dibaca ulang penuh:**
BP-BUS-005 (Regulatory Requirement Traceability) — direferensikan sebagai context mapping REG-COMP, tidak dibaca ulang penuh dari file aslinya.

**Konfirmasi Boundary:**
- Finalisasi ini hanya mengubah `03-data-architecture/data-governance/25-Data-Classification-Retention-and-Privacy-Standard.md`.
- ARCH-DATA-001, BP-DATA-001, GOV-DATA-001, Compliance Register, Enterprise Change Log, register lain, dan artefak Approved lainnya tidak disentuh oleh finalisasi ini.
- Finalisasi ini tidak menetapkan implementation completion, institutional authority assignment, classification level aktual, retention period aktual, personal-data determination, lawful basis, applicability REG-08/COMP-007, atau disposition G1/G2.

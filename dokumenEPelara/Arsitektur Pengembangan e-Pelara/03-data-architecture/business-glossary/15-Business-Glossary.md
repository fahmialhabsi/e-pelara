---
document_id: REF-BUS-001
title: Business Glossary
version: 1.0.0
status: Approved
effective_date: 2026-08-04
classification: Reference
domain: Business Architecture
repository_location: 03-data-architecture/business-glossary/15-Business-Glossary.md
owner: Chief Enterprise Architect
approver: Chief Enterprise Architect under standing delegation from Project Owner
delegation_authority: Project Owner — Fahmi Alhabsi
dependencies:
  - BP-BUS-001 — Business Capability Map
  - Official Current State Baseline
gate_relevance:
  - G1 — Business and Regulatory Alignment
  - G2 — Data and Knowledge Foundation
review_outcome: PASSED
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
---

# Business Glossary

## 1. Tujuan dan Kedudukan

Dokumen `REF-BUS-001` merupakan referensi istilah bisnis kanonis untuk e-PeLARA Next Generation. Glossary ini mendukung pemahaman bersama lintas perencanaan, penganggaran, pelaksanaan, pemantauan, evaluasi, pelaporan, data, pengetahuan, kepatuhan, publikasi, analitik, dan governance.

Kedudukannya adalah **Official Business Glossary** dengan klasifikasi **Reference**: glossary memberi konteks dan vocabulary terkendali, tetapi tidak menetapkan regulasi, kewenangan institusional, keputusan, status implementasi, atau disposition Gate. Glossary ini bukan data dictionary, ontology, process model, regulatory interpretation, organisation chart, RACI, maupun application catalog.

## 2. Ruang Lingkup

Ruang lingkup mencakup istilah yang telah muncul atau diturunkan secara langsung dari baseline resmi dan Business Architecture approved. Setiap istilah digunakan untuk mengurangi ambiguitas tanpa mengganti ketentuan normatif pada charter, standard, register, blueprint, atau artefak resmi lain.

Dokumen ini tidak mendefinisikan atribut fisik data, desain integrasi, skema basis data, logika aplikasi, penetapan personel, atau workflow implementasi.

## 3. Sumber Otoritatif dan Dependency

| Sumber atau dependency | Kedudukan pada glossary |
| --- | --- |
| `00-Architecture-Charter.md` | Prinsip, boundary, dan arah Enterprise Architecture. |
| `01-Repository-Structure.md` | Klasifikasi Reference, konvensi identitas, dan lokasi repository. |
| `03-Architecture-Issue-Register.md`, `04-Architecture-Risk-Register.md`, `05-Compliance-Register.md` | Konteks gap, risiko, kepatuhan, dan evidence pending; tidak diubah oleh glossary. |
| `07-Architecture-Governance-Operating-Model.md`, `08-Architecture-Review-and-Gate-Standard.md`, `09-Traceability-Standard.md` | Vocabulary governance, review, Gate, dan traceability yang berlaku. |
| `02-Enterprise-Architecture-Roadmap.md` | Menetapkan Seq 15, Document ID `REF-BUS-001`, dependency, prioritas, dan relevansi Gate G1–G2. |
| Official Current State Baseline | Bukti konteks istilah current state yang terdokumentasi. |
| `ARCH-BUS-001`, `BP-BUS-001`, `BP-BUS-002`, `BP-BUS-003`, `BP-BUS-004` | Sumber istilah Business Architecture yang telah approved. |

## 4. Prinsip Pengelolaan Istilah

1. Satu istilah kanonis digunakan untuk satu makna bisnis dalam scope yang sama.
2. Alias dan singkatan boleh dicatat, tetapi tidak menggantikan istilah kanonis pada artefak resmi baru.
3. Definisi tidak membentuk regulasi, penetapan kewenangan, atau klaim implementasi baru.
4. Istilah yang memiliki status evidence, verification, compliance, lifecycle, atau approval harus dipisahkan secara eksplisit.
5. Setiap perubahan substansial pada glossary mengikuti governance repository dan traceability standard yang berlaku.
6. Prinsip **One Data, Many Publications** dipertahankan: data otoritatif tunggal dapat dipublikasikan dalam berbagai format dengan lineage dan otorisasi publikasi yang sesuai.

## 5. Glossary Metamodel

Setiap entri glossary memiliki atribut minimum berikut.

| Atribut | Makna |
| --- | --- |
| Term ID | Identifier stabil lokal untuk entri glossary. |
| Canonical term | Istilah yang digunakan sebagai rujukan utama. |
| Definition | Makna ringkas dalam konteks Enterprise Architecture e-PeLARA. |
| Category/domain | Kategori vocabulary dan domain pemakaian utama. |
| Alias/abbreviation | Nama lain atau singkatan yang dikenal; `—` berarti belum dicatat. |
| Must be distinguished from | Istilah yang tidak boleh dipertukarkan maknanya. |
| Sources and official relationship | Sumber dan identifier artefak resmi yang menjadi konteks. |
| Evidence status | Status bukti untuk pemakaian atau keberadaan konteks istilah. |
| Owner/authority status | Kedudukan owner atau authority; bukan penetapan orang atau jabatan baru. |
| Notes | Batasan atau catatan penggunaan. |

## 6. Identifier dan Naming Standard

Identifier glossary menggunakan pola `TERM-BUS-<3 digit>`. Identifier ini stabil untuk referensi internal `REF-BUS-001`, bukan pengganti identifier kanonis capability, value stream, lifecycle, role, register, atau Gate. Istilah kanonis ditulis dalam bahasa Inggris ketika sudah digunakan demikian pada artefak resmi; penjelasan dan batasan disajikan dalam bahasa Indonesia.

## 7. Kategori Istilah

| Kategori | Cakupan |
| --- | --- |
| Business and planning | Kemampuan, aliran nilai, proses, dokumen, dan konteks perencanaan sampai akuntabilitas. |
| Governance and authority | Role, responsibility, authority, review, approval, Gate, dan delegation. |
| Document lifecycle and status | Phase, status dokumen, histori, supersession, dan pemisahan status. |
| Data, knowledge, traceability, and evidence | Data otoritatif, lineage, evidence, dan hubungan kandidat. |
| Publication, analytics, and AI | Publikasi, analitik, rekomendasi, dan batas peran AI. |

## 8. Daftar Istilah Bisnis Kanonis

| Term ID | Canonical term | Definition | Category/domain | Alias/abbreviation | Must be distinguished from | Sources and official relationship | Evidence status | Owner/authority status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TERM-BUS-001 | Capability | Kemampuan bisnis stabil yang diperlukan untuk menghasilkan outcome, terlepas dari urutan kerja tertentu. | Business Architecture | Kapabilitas | Value stream; business process | `BP-BUS-001`; `CAP-GOV`–`CAP-ADS` dan turunan Level 1. | Documented Current/Target sesuai capability terkait | Tidak menetapkan owner capability | Bukan klaim bahwa capability telah diimplementasikan. |
| TERM-BUS-002 | Value stream | Rangkaian stage bernilai dari pemicu sampai outcome yang menggambarkan penciptaan nilai bisnis. | Business Architecture | Aliran nilai | Capability; business process | `BP-BUS-002`; `VS-PTA-001`, `VST-PTA-01`–`VST-PTA-08`. | Target | Tidak menetapkan owner value stream | Tidak sama dengan prosedur operasional rinci. |
| TERM-BUS-003 | Business process | Urutan aktivitas operasional yang dapat dimodelkan lebih rinci untuk menjalankan suatu tujuan bisnis. | Business Architecture | Proses bisnis | Value stream; workflow | `ARCH-BUS-001`; scope pemodelan proses berada di luar glossary ini. | Evidence Pending | To be assigned by Project Owner | Glossary tidak membentuk process model. |
| TERM-BUS-004 | Planning context | Konteks penyusunan dan penyelarasan arah, sasaran, program, serta rencana pemerintah. | Planning | Konteks perencanaan | Budget formulation context; execution context | `ARCH-BUS-001`; `CAP-PLN-01`–`CAP-PLN-03`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | RPJMD menjadi konteks bagi Renstra OPD dan RKPD. |
| TERM-BUS-005 | Budget formulation context | Konteks penyusunan dan penyelarasan rencana dengan penganggaran. | Budgeting | Konteks penganggaran | Planning context; budget authorization context | `BP-BUS-001`; `CAP-BDG-01`, `CAP-BDG-03`. | Documented Current/Target sesuai evidence terkait | To be designated or verified by competent institutional authority — Evidence Pending | RKA dan DPA hanya digunakan sesuai evidence dan authority yang sah. |
| TERM-BUS-006 | Execution context | Konteks koordinasi pelaksanaan kegiatan dan administrasi keuangan setelah rencana serta anggaran relevan tersedia. | Execution | Konteks pelaksanaan | Workflow completion; approval | `BP-BUS-001`; `CAP-EXE-01`–`CAP-EXE-03`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menyatakan status workflow atau approval. |
| TERM-BUS-007 | Performance monitoring | Pemantauan indikator dan realisasi untuk menyediakan insight pengendalian kinerja. | Performance | Monitoring kinerja | Performance evaluation; accountability reporting | `BP-BUS-001`; `CAP-PRF-01`–`CAP-PRF-03`. | Documented Current/Target sesuai capability terkait | To be designated or verified by competent institutional authority — Evidence Pending | Tidak sama dengan evaluasi atau verifikasi. |
| TERM-BUS-008 | Performance evaluation | Penilaian atas kinerja untuk menghasilkan pembelajaran, pertimbangan, atau rekomendasi. | Evaluation | Evaluasi kinerja | Performance monitoring; decision | `BP-BUS-001`; `CAP-EVR-01`–`CAP-EVR-03`. | Documented Current/Target sesuai capability terkait | To be designated or verified by competent institutional authority — Evidence Pending | Evaluasi dapat menghasilkan rekomendasi, bukan keputusan otomatis. |
| TERM-BUS-009 | Accountability reporting | Penyusunan dan penyampaian informasi akuntabilitas kinerja sesuai konteks yang berlaku. | Reporting | Pelaporan akuntabilitas | Publication; performance evaluation | `BP-BUS-001`; `CAP-EVR-02`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Tidak disamakan dengan publikasi terbuka. |
| TERM-BUS-010 | Recommendation | Usulan tindakan atau pertimbangan berbasis informasi, analitik, evaluasi, atau review. | Decision support | Rekomendasi | Decision; approval | `BP-BUS-001`; `CAP-EVR-03`, `CAP-ADS-02`. | Documented Current/Target sesuai capability terkait | To be designated or verified by competent institutional authority — Evidence Pending | Rekomendasi tidak mengikat tanpa keputusan sah. |
| TERM-BUS-011 | Decision | Penetapan pilihan atau arah oleh pihak yang memiliki decision authority yang sah. | Governance | Keputusan | Recommendation; approval | `BP-BUS-004`; `RAP-DEC-01`–`RAP-DEC-12`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Glossary tidak menetapkan decision maker. |
| TERM-BUS-012 | RPJMD | Dokumen konteks perencanaan jangka menengah daerah yang bercabang menjadi konteks bagi Renstra OPD dan RKPD. | Government planning | RPJMD | Renstra OPD; RKPD; Renja OPD | Official Current State Baseline; `ARCH-BUS-001`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Tidak membentuk urutan linear RPJMD → Renstra OPD → RKPD → Renja OPD. |
| TERM-BUS-013 | Renstra OPD | Dokumen rencana strategis perangkat daerah yang menggunakan RPJMD sebagai konteks. | Government planning | Renstra | RKPD; Renja OPD | Official Current State Baseline; `ARCH-BUS-001`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Bersama RKPD menjadi konteks bagi Renja OPD. |
| TERM-BUS-014 | RKPD | Dokumen rencana kerja pemerintah daerah yang menggunakan RPJMD sebagai konteks. | Government planning | RKPD | Renstra OPD; Renja OPD | Official Current State Baseline; `ARCH-BUS-001`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Bersama Renstra OPD menjadi konteks bagi Renja OPD. |
| TERM-BUS-015 | Renja OPD | Dokumen rencana kerja perangkat daerah dengan Renstra OPD dan RKPD sebagai konteks konseptual. | Government planning | Renja | Renstra OPD; RKPD; RKA | Official Current State Baseline; `ARCH-BUS-001`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menetapkan dependency regulatif baru. |
| TERM-BUS-016 | RKA | Dokumen atau konteks rencana kerja dan anggaran yang dipakai dalam penyelarasan perencanaan-penganggaran sesuai evidence yang tersedia. | Budgeting | RKA | DPA; Renja OPD | Official Current State Baseline; `BP-BUS-001`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Glossary tidak menafsirkan authority atau urutan legalnya. |
| TERM-BUS-017 | DPA | Dokumen atau konteks pelaksanaan anggaran yang dirujuk sesuai evidence dan authority yang tersedia. | Budgeting | DPA | RKA; execution context | Official Current State Baseline; `BP-BUS-001`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menetapkan status dokumen atau authorization. |

## 9. Istilah Governance dan Authority

| Term ID | Canonical term | Definition | Category/domain | Alias/abbreviation | Must be distinguished from | Sources and official relationship | Evidence status | Owner/authority status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TERM-BUS-018 | Role archetype | Pola tanggung jawab arsitektur yang menggambarkan fungsi, bukan penetapan individu atau jabatan institusional. | Governance | Peran arketipal | Position/person; authority | `BP-BUS-004`; `RAP-ROLE-01`–`RAP-ROLE-14`. | Target | Tidak menetapkan individu atau jabatan | Digunakan untuk memisahkan desain peran dari struktur organisasi. |
| TERM-BUS-019 | Position/person | Jabatan organisasi atau individu yang dapat menjalankan peran setelah penetapan institusional yang sah. | Governance | Jabatan/individu | Role archetype | `BP-BUS-004`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak boleh disimpulkan dari role archetype. |
| TERM-BUS-020 | Responsibility | Kewajiban atau akuntabilitas pelaksanaan suatu pekerjaan atau kontribusi. | Governance | Tanggung jawab | Authority; permission | `BP-BUS-004`; `RAP-ROLE-01`–`RAP-ROLE-14`. | Target | To be assigned by Project Owner | Responsibility tidak otomatis memberi hak menetapkan keputusan. |
| TERM-BUS-021 | Authority | Hak atau kewenangan sah untuk mengambil atau mengesahkan keputusan dalam scope tertentu. | Governance | Kewenangan | Responsibility; system permission | `BP-BUS-004`; `RAP-DEC-01`–`RAP-DEC-12`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak ditetapkan oleh glossary atau AI. |
| TERM-BUS-022 | Review | Pemeriksaan kualitas, kesesuaian, atau kelengkapan terhadap scope yang ditentukan. | Governance | Peninjauan | Verification; approval | `08-Architecture-Review-and-Gate-Standard.md`; `BP-BUS-004`. | Documented Current | Reviewer tidak otomatis menjadi approver | Review dapat menghasilkan PASSED, REVISIONS REQUIRED, atau BLOCKED. |
| TERM-BUS-023 | Review outcome | Hasil review yang dibatasi pada `PASSED`, `REVISIONS REQUIRED`, atau `BLOCKED`. | Governance | Hasil review | Gate disposition; document status | `08-Architecture-Review-and-Gate-Standard.md`. | Documented Current | Ditentukan melalui review sah | Review outcome bukan disposition Gate. |
| TERM-BUS-024 | Verification | Konfirmasi berbasis evidence oleh verifier yang sah terhadap klaim atau kondisi tertentu. | Governance | Verifikasi | Review; acceptance | `09-Traceability-Standard.md`; `BP-BUS-004`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak ada status verifikasi positif tanpa evidence dan verifier sah. |
| TERM-BUS-025 | Acceptance | Penerimaan hasil sesuai kriteria yang berlaku oleh pihak berwenang. | Governance | Penerimaan | Verification; approval | `BP-BUS-004`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Acceptance bukan sinonim approval. |
| TERM-BUS-026 | Document approval | Pengesahan status dokumen oleh approver yang sah sesuai governance yang berlaku. | Governance | Approval dokumen | Gate disposition; publication authorization | `07-Architecture-Governance-Operating-Model.md`; `BP-BUS-004`. | Documented Current | Chief Enterprise Architect pada scope standing delegation yang berlaku | Standing delegation terbatas pada status final artefak EA sesuai boundary EA-007; approval dokumen tidak otomatis menetapkan disposition Gate. |
| TERM-BUS-027 | Publication authorization | Persetujuan untuk menerbitkan informasi dalam konteks, kanal, atau audiens tertentu. | Governance | Otorisasi publikasi | Document approval; system permission | `BP-BUS-001`; `CAP-PUB-03`; `BP-BUS-004`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Terpisah dari approval dokumen. |
| TERM-BUS-028 | Gate | Titik kendali arsitektur untuk menilai readiness terhadap kriteria yang ditetapkan. | EA governance | Architecture gate | Review outcome; document approval | `08-Architecture-Review-and-Gate-Standard.md`. | Documented Current | Gate authority mengikuti governance yang berlaku | G0–G6 tidak berubah oleh glossary. |
| TERM-BUS-029 | Gate disposition | Penetapan resmi hasil suatu Gate sesuai governance dan evidence yang berlaku. | EA governance | Disposition Gate | Review outcome; document approval | `08-Architecture-Review-and-Gate-Standard.md`. | Evidence Pending | Tidak ditetapkan oleh glossary | G1 belum memperoleh disposition melalui dokumen ini. |
| TERM-BUS-030 | Delegation | Pelimpahan terbatas yang terdokumentasi untuk melakukan tindakan dalam scope yang ditetapkan. | Governance | Delegasi | Institutional authority; role archetype | `07-Architecture-Governance-Operating-Model.md`; `EA-007 Version 1.1.0`. | Documented Current | Project Owner — Fahmi Alhabsi sebagai delegation authority | Standing delegation terbatas pada status final artefak EA sesuai boundary EA-007 dan tidak menetapkan disposition Gate. |
| TERM-BUS-031 | System permission | Hak teknis sistem untuk melakukan suatu aksi yang tidak dengan sendirinya membuktikan authority institusional. | Governance | Izin sistem | Authority; approval | `BP-BUS-004`; Official Current State Baseline. | Evidence Pending | Tidak menetapkan authority | Permission harus dibedakan dari kewenangan formal. |
| TERM-BUS-032 | Workflow completion | Kondisi selesainya langkah workflow sesuai mekanisme yang berlaku. | Governance | Penyelesaian workflow | Approval; verification | `BP-BUS-002`; `BP-BUS-004`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Selesai workflow tidak otomatis berarti approved. |

### Vocabulary Gate Terkendali

| Jenis | Nilai resmi |
| --- | --- |
| Gate | G0 — Charter Approved |
| Gate | G1 — Business and Regulatory Alignment |
| Gate | G2 — Data and Knowledge Foundation |
| Gate | G3 — Integrated Target Architecture |
| Gate | G4 — Migration Ready |
| Gate | G5 — Implementation Ready |
| Gate | G6 — Production Ready |
| Gate disposition | APPROVED |
| Gate disposition | APPROVED WITH CONDITIONS |
| Gate disposition | DEFERRED |
| Gate disposition | REJECTED |

Nama Gate dan nilai disposition berasal dari Master Roadmap serta Architecture Review and Gate Standard. Glossary ini tidak menetapkan disposition; G1 dan G2 tidak memperoleh disposition melalui dokumen ini. Review outcome `PASSED`, `REVISIONS REQUIRED`, atau `BLOCKED` bukan Gate disposition.

## 10. Istilah Lifecycle Dokumen dan Status

| Term ID | Canonical term | Definition | Category/domain | Alias/abbreviation | Must be distinguished from | Sources and official relationship | Evidence status | Owner/authority status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TERM-BUS-033 | Document lifecycle phase | Tahap konseptual perjalanan dokumen dari preparation sampai pengelolaan histori sesuai blueprint lifecycle. | Document lifecycle | Fase lifecycle | Document status; workflow status | `BP-BUS-003`; `DLC-PH-01`–`DLC-PH-08`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Phase bukan otomatisasi transition. |
| TERM-BUS-034 | Document status | Status administrasi artefak, misalnya draft atau approved, sesuai metadata dan governance dokumen. | Document governance | Status dokumen | Review outcome; Gate disposition | `01-Repository-Structure.md`; `BP-BUS-003`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | Status dokumen tidak membuktikan capability telah diimplementasikan. |
| TERM-BUS-035 | Evidence status | Kedudukan ketersediaan bukti yang digunakan untuk mendukung klaim atau relationship. | Evidence | Status bukti | Verification status; compliance status | `09-Traceability-Standard.md`; `BP-BUS-001`–`BP-BUS-004`. | Documented Current | To be designated or verified by competent institutional authority — Evidence Pending | `Documented Current`, `Target`, dan `Evidence Pending` tidak dapat dipertukarkan. |
| TERM-BUS-036 | Verification status | Kedudukan hasil verifikasi yang hanya dapat ditetapkan dengan evidence dan verifier sah. | Evidence | Status verifikasi | Evidence status; review outcome | `09-Traceability-Standard.md`; `BP-BUS-002`, `BP-BUS-003`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak ada status verifikasi positif pada glossary ini. |
| TERM-BUS-037 | Compliance status | Kedudukan pemenuhan atau penilaian kepatuhan terhadap requirement yang berlaku. | Compliance | Status kepatuhan | Evidence status; document status | `05-Compliance-Register.md`; `CAP-CMP-01`–`CAP-CMP-03`. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Tidak diubah atau ditetapkan oleh glossary. |
| TERM-BUS-038 | Supersession history | Riwayat versi atau dokumen sebelumnya yang tetap terlacak saat revisi, amendment, atau supersession terjadi. | Document lifecycle | Riwayat supersession | Deletion; cancellation | `BP-BUS-003`; `DLC-TR-08`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Transition tidak otomatis dan tidak menghapus histori. |

## 11. Istilah Data, Knowledge, Traceability, dan Evidence

| Term ID | Canonical term | Definition | Category/domain | Alias/abbreviation | Must be distinguished from | Sources and official relationship | Evidence status | Owner/authority status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TERM-BUS-039 | Authoritative data | Data yang diperlakukan sebagai sumber rujukan untuk konteks bisnis tertentu berdasarkan governance yang berlaku. | Data and knowledge | Data otoritatif | Reference data; publication copy | `BP-BUS-001`; `CAP-DKM-01`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menetapkan system of record. |
| TERM-BUS-040 | Source of truth | Sumber rujukan yang dapat ditelusuri untuk suatu fakta, definisi, atau evidence dalam scope tertentu. | Data and knowledge | Sumber kebenaran | Authoritative data; evidence | Official Current State Baseline; `CAP-DKM-01`. | Evidence Pending | To be assigned by Project Owner | Penggunaan istilah ini tidak membuat satu sumber menjadi otoritatif secara otomatis. |
| TERM-BUS-041 | Lineage | Keterlacakan asal, perubahan, dan hubungan suatu data, dokumen, atau publikasi. | Traceability | Jejak asal | History; provenance | `BP-BUS-001`; `CAP-PLN-03`, `CAP-DKM-03`, `CAP-PUB-02`. | Target | Tidak menetapkan custodian | Mendukung One Data, Many Publications. |
| TERM-BUS-042 | Evidence | Bukti yang dapat dinilai untuk mendukung klaim, relationship, kontrol, atau keputusan. | Evidence | Bukti | Assumption; recommendation | `09-Traceability-Standard.md`; AIR/ARISK/COMP registers. | Evidence Pending | To be designated or verified by competent institutional authority — Evidence Pending | Evidence tidak sama dengan status verifikasi. |
| TERM-BUS-043 | One Data, Many Publications | Prinsip bahwa satu data otoritatif dapat digunakan untuk beberapa publikasi yang konsisten dan terlacak. | Data and publication | — | Data duplication; uncontrolled publication | `ARCH-BUS-001`; `BP-BUS-001`; `CAP-PUB-01`–`CAP-PUB-02`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menyatakan integrasi atau implementasi telah tersedia. |
| TERM-BUS-044 | Candidate relationship | Relationship draft yang terdokumentasi untuk ditinjau, tanpa mengubah status source, target, capability, register, atau Gate. | Traceability | Hubungan kandidat | Canonical relationship; established relationship | `09-Traceability-Standard.md`; `BP-BUS-002`, `BP-BUS-003`. | Evidence Pending | Tidak menetapkan verifier | Tidak boleh diberi status verifikasi positif tanpa evidence dan verifier sah. |

## 12. Istilah Publikasi, Analytics, dan AI

| Term ID | Canonical term | Definition | Category/domain | Alias/abbreviation | Must be distinguished from | Sources and official relationship | Evidence status | Owner/authority status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TERM-BUS-045 | Controlled publication | Penyajian informasi yang mengikuti konteks, konsistensi, lineage, dan otorisasi publikasi yang relevan. | Publication | Publikasi terkendali | Document approval; uncontrolled publication | `BP-BUS-001`; `CAP-PUB-01`–`CAP-PUB-03`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Tidak menyatakan kanal publikasi telah diimplementasikan. |
| TERM-BUS-046 | Multi-format publication | Penyajian informasi yang sama dalam lebih dari satu format dengan menjaga konsistensi dan lineage. | Publication | Publikasi multiformat | Data duplication; controlled publication | `BP-BUS-001`; `CAP-PUB-01`, `CAP-PUB-02`. | Target | To be designated or verified by competent institutional authority — Evidence Pending | Menerapkan prinsip One Data, Many Publications. |
| TERM-BUS-047 | Analytics | Pengolahan informasi untuk menghasilkan insight yang mendukung pemantauan, evaluasi, atau pertimbangan. | Analytics | Analitik | Recommendation; decision | `BP-BUS-001`; `CAP-ADS-01`–`CAP-ADS-03`. | Documented Current/Target sesuai capability terkait | To be designated or verified by competent institutional authority — Evidence Pending | Insight analitik tidak otomatis menjadi keputusan. |
| TERM-BUS-048 | AI assistant | Alat bantu yang dapat mendukung analisis, penyusunan, atau retrieval informasi dalam boundary governance yang berlaku. | AI governance | Asisten AI | Decision maker; approver; verifier | `07-Architecture-Governance-Operating-Model.md`; `BP-BUS-004`. | Target | Tidak memiliki authority, approval, verification, atau Gate disposition | AI tidak dapat menggantikan kewenangan institusional. |

## 13. Alias, Singkatan, dan Istilah yang Berpotensi Ambigu

| Bentuk | Canonical term | Arahan penggunaan |
| --- | --- | --- |
| Kapabilitas | Capability | Gunakan untuk kemampuan stabil; bukan untuk urutan aktivitas. |
| Aliran nilai | Value stream | Gunakan untuk rangkaian stage bernilai; bukan process model rinci. |
| Renstra | Renstra OPD | Gunakan bentuk lengkap saat pertama kali muncul. |
| Renja | Renja OPD | Gunakan bentuk lengkap saat pertama kali muncul. |
| Approval | Document approval atau publication authorization | Nyatakan objek approval agar tidak ambigu. |
| Otorisasi | Authority atau publication authorization | Bedakan hak keputusan dari otorisasi penerbitan. |
| Selesai | Workflow completion | Tidak berarti review, verification, acceptance, atau approval. |
| Valid | Istilah ambigu — bukan status kanonis | Jangan digunakan tanpa menyebut objek, kriteria, evidence, dan authority; bukan sinonim `Verified`, `Approved`, `PASSED`, atau Gate disposition. |

## 14. Relasi Istilah dengan Capability, Value Stream, Lifecycle, dan Role Blueprint

| Area | Relasi glossary | Artefak resmi |
| --- | --- | --- |
| Capability | Istilah capability, planning, monitoring, evaluation, data/knowledge, compliance, publication, dan analytics mengontekstualkan capability map tanpa mengubah identifier-nya. | `BP-BUS-001` |
| Value stream | Istilah value stream, stage, workflow completion, recommendation, dan decision membedakan aliran nilai dari proses serta keputusan. | `BP-BUS-002` |
| Lifecycle | Istilah lifecycle phase, document status, evidence, verification, dan supersession mengontekstualkan fase serta candidate transition. | `BP-BUS-003` |
| Role blueprint | Istilah role, position/person, responsibility, authority, review, acceptance, approval, permission, dan delegation menjaga pemisahan tanggung jawab serta kewenangan. | `BP-BUS-004` |

Hubungan di atas merupakan relasi referensial. Glossary tidak mengubah status capability, value stream, stage, lifecycle phase, candidate transition, role, authority, register, atau Gate.

## 15. Gap, Konflik Definisi, dan Evidence Pending

| Referensi | Gap atau konflik | Arah tindak lanjut |
| --- | --- | --- |
| `AIR-001` | Konsistensi evidence mengenai siklus Renstra masih memerlukan klarifikasi. | Pertahankan sebagai issue resmi; glossary tidak memilih interpretasi. |
| `AIR-002` | Evidence baseline untuk beberapa konteks monitoring/dashboard belum lengkap. | Gunakan `Evidence Pending` sampai bukti sah tersedia. |
| `AIR-004` | Pemisahan workflow completion, approval, dan authority perlu tetap dijaga. | Tidak simpulkan approval dari status workflow. |
| `AIR-010`, `ARISK-007`, dan COMP terkait | Pemisahan current state, target direction, evidence, serta compliance perlu dipertahankan. | Ikuti register dan artefak resmi sesuai Master Roadmap. |

## 16. Hubungan dengan Domain Arsitektur Lain

Glossary ini ditempatkan pada `03-data-architecture/business-glossary/` karena folder kanonis repository untuk business glossary berada pada Data Architecture. Klasifikasi `REF` dan domain istilah `BUS` tidak mengubah ownership artefak Business Architecture yang telah approved.

Glossary memberi vocabulary awal bagi domain data dan knowledge, tetapi tidak membentuk Data Domain Model, Enterprise Knowledge Model, ontology, taxonomy, data governance model, atau desain implementasi. Semua artefak tersebut tetap mengikuti Master Roadmap, dependency, dan Gate masing-masing.

## 17. Traceability

| Source | Relationship | Target | Kedudukan relasi | Evidence status | Verification status |
| --- | --- | --- | --- | --- | --- |
| `REF-BUS-001` | DERIVED_FROM | `BP-BUS-001` | Draft reference relationship | Documented Current/Target sesuai sumber | Evidence Pending |
| `REF-BUS-001` | DERIVED_FROM | Official Current State Baseline | Draft reference relationship | Documented Current | Evidence Pending |
| `REF-BUS-001` | DERIVED_FROM | `BP-BUS-002` | Draft reference relationship | Target | Evidence Pending |
| `REF-BUS-001` | DERIVED_FROM | `BP-BUS-003` | Draft reference relationship | Target | Evidence Pending |
| `REF-BUS-001` | DERIVED_FROM | `BP-BUS-004` | Draft reference relationship | Target | Evidence Pending |

Tabel ini bukan Canonical Traceability Matrix. Pencatatan relationship referensial atau kandidat tidak mengubah status source, target, capability, register, evidence, verification, maupun Gate.

## 18. Kontribusi terhadap G1–G2

| Gate | Kontribusi | Batasan |
| --- | --- | --- |
| G1 — Business and Regulatory Alignment | Mengurangi ambiguitas istilah bisnis, dokumen, governance, review, approval, dan authority. | Tidak menetapkan alignment regulatif atau disposition G1. |
| G2 — Data and Knowledge Foundation | Menyediakan vocabulary awal untuk data, knowledge, lineage, evidence, dan publikasi. | Tidak membentuk model data/knowledge atau disposition G2. |

Tidak ada Gate disposition yang dihasilkan oleh draft ini.

## 19. Assumptions, Constraints, dan Evidence Pending

- Istilah hanya disusun dari sumber yang dicantumkan pada §3 dan tidak menggantikan sumber otoritatifnya.
- Status `Documented Current`, `Target`, dan `Evidence Pending` dipertahankan sesuai konteks sumber; glossary tidak menaikkan status verifikasi apa pun.
- Penetapan authority, approver, verifier, RACI, owner capability, owner data, atau personel berada di luar scope glossary.
- Struktur atau dependency pemerintah diperlakukan sebagai konteks konseptual dan tidak ditafsirkan menjadi aturan legal baru.
- Artefak lanjutan mengikuti Master Roadmap; dokumen ini tidak memulai pekerjaan Seq 16 atau Seq 17.

## 20. Batas Kewenangan AI

AI dapat membantu menyusun, mengelompokkan, atau mencari istilah berdasarkan sumber yang diizinkan. AI tidak dapat menetapkan definisi regulatif, kewenangan institusional, authority, approver, verifier, compliance status, status verifikasi, document approval, publication authorization, atau Gate disposition.

## 21. Persetujuan

| Peran | Nama | Catatan | Status | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen/File Operator | ChatGPT Work | Disusun dan diperbarui sesuai review | Selesai | 2026-08-04 |
| Chief Enterprise Architect | ChatGPT | Direview, ditetapkan final, dan disahkan berdasarkan standing delegation | Selesai | 2026-08-04 |
| Delegation authority | Project Owner — Fahmi Alhabsi | Standing delegation melalui EA-007 Version 1.1.0 | Tercatat | 2026-08-04 |

## 22. Change Log Dokumen

| Version | Date | Change | Actor | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-04 | Penyusunan awal Business Glossary | ChatGPT Work | Draft for Review |
| 0.1.0 | 2026-08-04 | Review CEA menetapkan REVISIONS REQUIRED untuk normalisasi traceability, evidence status, authority vocabulary, Gate vocabulary, dan istilah ambigu “Valid”. | ChatGPT | Revisions Required |
| 0.2.0 | 2026-08-04 | Revisi sesuai review CEA; normalisasi relationship DERIVED_FROM, evidence status, owner/authority status, vocabulary G0–G6, Gate disposition, dan istilah ambigu. | ChatGPT Work | Draft for Review |
| 1.0.0 | 2026-08-04 | Review final PASSED; ditetapkan Approved sebagai Official Business Glossary berdasarkan standing delegation EA-007 Version 1.1.0; approval dokumen tidak menetapkan disposition G1 atau G2. | ChatGPT | Approved |

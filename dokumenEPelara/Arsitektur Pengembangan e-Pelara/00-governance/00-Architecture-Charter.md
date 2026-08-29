# 00 — Architecture Charter

## e-PeLARA Next Generation

**Enterprise Architecture Constitution**  
**Pemerintah Provinsi Maluku Utara**  
**Status:** Official Architecture Constitution — Approved  
**Versi:** 1.0.1  
**Tanggal:** 4 Agustus 2026  
**Klasifikasi:** Dokumen Tata Kelola Arsitektur Resmi

---

## 1. Kedudukan Dokumen

Architecture Charter ini adalah konstitusi resmi bagi seluruh kegiatan perencanaan, perancangan, pengembangan, integrasi, migrasi, pengujian, pengoperasian, dan pengembangan berkelanjutan **e-PeLARA Next Generation**.

Dokumen ini menetapkan:

1. mandat dan tujuan transformasi;
2. ruang lingkup arsitektur;
3. prinsip dan guard arsitektur yang wajib dipatuhi;
4. struktur kewenangan dan pengambilan keputusan;
5. mekanisme pengendalian perubahan;
6. keluaran arsitektur yang wajib dihasilkan; dan
7. kriteria penerimaan setiap fase pengembangan.

Apabila terdapat pertentangan antara keputusan teknis operasional dengan Charter ini, maka Charter menjadi rujukan tertinggi sampai diterbitkan perubahan resmi yang disetujui Project Owner.

---

## 2. Mandat Transformasi

e-PeLARA Next Generation dibentuk sebagai evolusi terarah dari e-PeLARA saat ini menuju platform pemerintahan daerah yang:

- mengintegrasikan siklus perencanaan, penganggaran, pelaksanaan, pengendalian, evaluasi, dan akuntabilitas kinerja;
- menjaga keterlacakan data dari kebijakan daerah hingga realisasi dan hasil pembangunan;
- patuh terhadap regulasi pemerintahan Indonesia;
- aman, modular, dapat diaudit, mudah dipelihara, dan dapat dikembangkan secara bertahap;
- mampu menghasilkan dokumen resmi dan insight manajerial berkualitas tinggi; dan
- dapat menjadi fondasi reusable bagi ekosistem aplikasi pemerintahan daerah lainnya.

Transformasi tidak dimaknai sebagai pembangunan ulang tanpa kendali. Setiap perubahan harus mempertahankan nilai dari sistem berjalan, melindungi data, meminimalkan gangguan layanan, dan memiliki jalur migrasi yang terukur.

---

## 3. Visi Arsitektur

> **Mewujudkan e-PeLARA Next Generation sebagai Government Intelligence Platform yang menghubungkan kebijakan, program, anggaran, pelaksanaan, kinerja, pengetahuan, dan publikasi pemerintahan dalam satu arsitektur data yang terpercaya, patuh regulasi, aman, dan berkelanjutan.**

### 3.1 Sasaran Strategis

1. Mewujudkan kesinambungan digital **RPJMD → Renstra → RKPD → Renja → RKA → DPA → Realisasi → Monev → LAKIP/LKjIP**.
2. Menetapkan satu sumber data resmi untuk setiap entitas pemerintahan dan indikator kinerja.
3. Mengurangi penginputan berulang melalui data lineage, referensi induk, dan integrasi antarmodul.
4. Menjamin seluruh perubahan data penting dapat ditelusuri kepada pengguna, waktu, alasan, dan kondisi sebelum/sesudah perubahan.
5. Menyediakan analitik dan AI yang membantu pengambilan keputusan tanpa menggantikan kewenangan pejabat yang berwenang.
6. Menghasilkan dokumen PDF, Word, dan Excel yang akurat secara substansi, sesuai regulasi, dan berkualitas publikasi profesional.
7. Menyediakan fondasi integrasi dengan SIPD, e-SIGAP, dan layanan pemerintahan lain melalui kontrak integrasi yang terkendali.
8. Mewujudkan **Government Digital Publishing Platform** yang menghasilkan seluruh publikasi pemerintahan dengan kualitas visual setara Annual Report kelas dunia, sekaligus mempertahankan kepatuhan 100% terhadap regulasi pemerintah Indonesia.

### 3.2 Filosofi Resmi — One Data, Many Publications

> **One Data, Many Publications:** satu data pemerintahan yang sah, terkelola, dan dapat ditelusuri menjadi sumber bagi berbagai bentuk publikasi tanpa penginputan ulang dan tanpa perbedaan substansi.

Filosofi ini mengharuskan agar data, indikator, target, anggaran, realisasi, narasi, tabel, grafik, dan metadata yang telah disahkan dapat digunakan secara konsisten untuk menghasilkan dashboard, PDF, Word, Excel, laporan eksekutif, laporan regulatif, infografis, dan kanal publikasi digital lainnya. Perbedaan format dan desain diperbolehkan sesuai audiens dan tujuan publikasi, tetapi makna, angka, status, sumber, dan versi data tidak boleh berubah.

Government Digital Publishing Platform wajib menggabungkan dua standar yang tidak dapat dipisahkan:

1. **Regulatory fidelity** — struktur, substansi, formulir, nomenklatur, kewenangan, dan proses pengesahan mematuhi regulasi pemerintah Indonesia; dan
2. **World-class publishing quality** — tipografi, tata letak, hierarki visual, data visualization, konsistensi identitas, aksesibilitas, serta kualitas baca setara Annual Report kelas dunia.

---

## 4. Pemilik, Kepemimpinan, dan Akuntabilitas

### 4.1 Project Owner

**Project Owner:** Fahmi Alhabsi  
**Peran organisasi:** Sekretaris Dinas Pangan Provinsi Maluku Utara

Project Owner memegang:

- otoritas persetujuan institusional dan bisnis;
- penetapan kebutuhan pemerintahan dan prioritas organisasi;
- keputusan akhir atas ruang lingkup, anggaran, penerapan, dan penerimaan hasil;
- penghubung antara Chief Enterprise Architect, ChatGPT Work, pengguna organisasi, pengembang, dan pemangku kepentingan; serta
- kewenangan mengesahkan atau mengubah Charter.

### 4.2 Chief Enterprise Architect

**Chief Enterprise Architect:** ChatGPT Work, berdasarkan mandat Project Owner.

Chief Enterprise Architect memimpin:

- perumusan Future Enterprise Architecture;
- konsistensi lintas arsitektur bisnis, data, aplikasi, teknologi, keamanan, integrasi, AI, analitik, dan dokumen;
- penyusunan blueprint, standar, guard, decision record, dan roadmap;
- penilaian dampak keputusan strategis;
- pengendalian architecture debt; dan
- rekomendasi penerimaan atau penolakan desain pada setiap architecture gate.

Mandat ini adalah kewenangan desain dan tata kelola yang didelegasikan. Persetujuan institusional, legal, anggaran, dan operasional tetap berada pada Project Owner dan pejabat pemerintah yang berwenang.

### 4.3 Pelaksana Teknis dan AI Pendukung

Cursor, Claude, Codex, Manus, atau AI lain dapat digunakan sebagai pelaksana analisis dan engineering berdasarkan tugas terbatas. Semua hasilnya:

- tunduk pada Charter dan blueprint resmi;
- harus memiliki ruang lingkup yang jelas;
- tidak boleh mengubah keputusan arsitektur secara sepihak;
- tidak boleh memindai seluruh repository tanpa instruksi khusus;
- wajib menampilkan hasil yang dapat diperiksa; dan
- harus diterima atau ditolak melalui mekanisme governance yang berlaku.

---

## 5. Official Baseline

Lima dokumen berikut ditetapkan sebagai **Official Baseline – Current State e-PeLARA v1.0**:

1. `../01-current-state/1-identitas-sistem.md`
2. `../01-current-state/2-modul-sistem.md`
3. `../01-current-state/3-alur-logika-sistem.md`
4. `../01-current-state/4-penilaian-kesesuaian-standar.md`
5. `../01-current-state/5-referensi-teknis-database-api-frontend.md`

### 5.1 Ketentuan Penggunaan Baseline

- Baseline digunakan sebagai sumber resmi penyusunan Future Enterprise Architecture.
- Tidak dilakukan audit ulang repository atau database kecuali atas permintaan khusus Project Owner.
- Ketidakkonsistenan di dalam baseline dicatat dalam **Architecture Issue Register**.
- Kontradiksi dokumentasi tidak menghentikan penyusunan blueprint apabila masih dapat dikelola sebagai asumsi, risiko, atau keputusan tertunda.
- Klarifikasi atas kontradiksi dilakukan pada fase yang paling relevan dan tidak boleh memperluas ruang lingkup pekerjaan tanpa persetujuan.
- Nilai rahasia seperti password, token, secret key, sertifikat, dan API key tidak boleh dimasukkan ke dokumentasi arsitektur.

---

## 6. Ruang Lingkup Arsitektur

### 6.1 Termasuk dalam Ruang Lingkup

1. **Business Architecture** — proses pemerintahan, aktor, kewenangan, layanan, dan value stream.
2. **Data Architecture** — model data enterprise, master/reference data, metadata, lineage, kualitas, kepemilikan, retensi, dan pertukaran data.
3. **Application Architecture** — domain, bounded context, modul, layanan aplikasi, dependensi, dan lifecycle aplikasi.
4. **Integration Architecture** — API, event, sinkronisasi, interoperabilitas, serta integrasi SIPD dan e-SIGAP.
5. **Technology Architecture** — runtime, database, cache, container, deployment, konfigurasi lingkungan, observability, dan skalabilitas.
6. **Security & Privacy Architecture** — identitas, akses, autentikasi, otorisasi, audit, perlindungan data, keamanan aplikasi, dan ketahanan layanan.
7. **Government Intelligence Platform** — fondasi pengetahuan, analitik, insight, rekomendasi, dan pengambilan keputusan.
8. **AI Architecture** — AI gateway, model/provider policy, prompt governance, evaluasi, human oversight, dan pengendalian biaya.
9. **Document & Publishing Architecture** — sumber data, template, rendering, validasi, versi, tanda tangan, dan publikasi PDF/Word/Excel.
10. **Migration & Transition Architecture** — coexistence, prioritas migrasi, rollout, rollback, dan dekomisioning terkendali.
11. **Architecture Governance** — prinsip, standar, decision record, quality gate, issue register, risk register, dan compliance register.

### 6.2 Domain Bisnis Utama

- RPJMD dan cascading kebijakan;
- Renstra Perangkat Daerah;
- RKPD;
- Renja Perangkat Daerah;
- RKA dan DPA;
- realisasi fisik, keuangan, dan indikator;
- monitoring, pengendalian, dan evaluasi;
- manajemen risiko;
- LAKIP/LKjIP dan laporan pemerintahan;
- master data pemerintahan dan nomenklatur;
- dashboard, analitik, AI, dan publikasi dokumen;
- pengguna, organisasi, workflow, notifikasi, audit, dan tanda tangan digital.

### 6.3 Di Luar Ruang Lingkup Fase Charter

- perubahan source code;
- migrasi atau perubahan skema database;
- deployment ke produksi;
- pengadaan infrastruktur;
- integrasi langsung ke sistem eksternal;
- audit keamanan penetratif; dan
- pengesahan kepatuhan hukum oleh lembaga berwenang.

Hal-hal tersebut dapat dilakukan pada fase lanjutan setelah blueprint dan architecture gate terkait disetujui.

---

## 7. Prinsip Arsitektur Wajib

### P-01 — Government and Regulation by Design

Struktur data, proses, workflow, dan dokumen harus diturunkan dari regulasi dan kewenangan pemerintahan yang berlaku. Kepatuhan tidak boleh ditambahkan hanya pada akhir pengembangan.

### P-02 — End-to-End Planning and Performance Lineage

Setiap program, kegiatan, subkegiatan, indikator, target, anggaran, realisasi, dan hasil harus dapat ditelusuri sepanjang rantai perencanaan hingga akuntabilitas.

### P-03 — Single Source of Truth

Setiap data inti harus memiliki satu sumber otoritatif, pemilik data, definisi, versi, dan aturan perubahan yang jelas. Duplikasi hanya diperbolehkan sebagai salinan terkelola dengan mekanisme sinkronisasi yang eksplisit.

### P-04 — Modular Domain Architecture

Sistem disusun berdasarkan domain dengan batas tanggung jawab yang jelas. Modul tidak boleh mengambil alih logika bisnis domain lain melalui dependensi tersembunyi.

### P-05 — API and Contract First

Interaksi lintas modul dan lintas sistem menggunakan kontrak data/API yang terdokumentasi, terversi, tervalidasi, dan kompatibel dengan konsumen yang sah.

### P-06 — Security, Privacy, and Audit by Design

Prinsip least privilege, separation of duties, secure defaults, perlindungan data, audit trail, dan pengelolaan rahasia berlaku sejak desain awal.

### P-07 — Human Accountability for AI

AI memberi bantuan, analisis, deteksi, rekomendasi, atau narasi. AI tidak menjadi pejabat penetap, tidak mengesahkan dokumen, dan tidak boleh mengubah data resmi tanpa tindakan pengguna berwenang yang dapat diaudit.

### P-08 — Explainable and Evidence-Based Intelligence

Insight dan rekomendasi harus menunjukkan sumber data, periode, metode, asumsi, tingkat keyakinan, dan keterbatasannya. Konten AI harus dapat dibedakan dari data resmi dan pernyataan manusia.

### P-09 — Document as Governed Product

Dokumen resmi adalah produk sistem yang memiliki sumber data, struktur regulatif, template, versi, status, approval, jejak audit, dan aturan publikasi. PDF, Word, dan Excel harus konsisten secara substansi.

### P-10 — Incremental Modernization

Transformasi dilakukan bertahap berdasarkan nilai, risiko, dan dependensi. Sistem berjalan dipertahankan sampai pengganti telah melewati pengujian, migrasi, dan persetujuan.

### P-11 — Backward Compatibility and Controlled Migration

Perubahan terhadap data, API, workflow, dan dokumen harus memiliki analisis dampak, strategi kompatibilitas, rencana migrasi, mekanisme rollback, dan kriteria dekomisioning.

### P-12 — Observability and Operational Readiness

Layanan harus dapat dipantau melalui log, metrik, health check, alert, audit event, dan prosedur respons insiden yang proporsional terhadap tingkat risikonya.

### P-13 — Reuse Before Duplication

Kapabilitas, data, komponen, template, dan layanan yang telah tervalidasi harus digunakan kembali sebelum membangun duplikasi baru. Reuse tidak boleh menciptakan coupling yang melanggar batas domain.

### P-14 — Consistent User Experience

Antarmuka harus mengikuti satu design system resmi, pola interaksi konsisten, aksesibilitas, bahasa pemerintahan yang jelas, dan pengalaman pengguna berbasis peran.

### P-15 — Documentation Is Part of the System

Dokumentasi arsitektur, data, API, proses, keputusan, operasi, dan perubahan merupakan bagian wajib dari deliverable, bukan pekerjaan tambahan.

### P-16 — Measurable Quality

Pernyataan “selesai”, “sesuai”, “aman”, atau “siap produksi” hanya dapat digunakan apabila memenuhi kriteria penerimaan dan bukti yang telah ditentukan pada fase terkait.

### P-17 — Cost and Resource Awareness

Pemilihan teknologi dan AI harus mempertimbangkan biaya lisensi, token, infrastruktur, pemeliharaan, kompetensi tim, ketergantungan vendor, dan keberlanjutan anggaran pemerintah.

### P-18 — No Unbounded Analysis or Change

Setiap analisis dan perubahan harus memiliki tujuan, ruang lingkup, input, output, batas file/domain, dan kriteria selesai yang jelas. Pemindaian repository penuh hanya dilakukan atas mandat khusus.

### P-19 — One Data, Many Publications

Seluruh publikasi harus dibentuk dari data resmi yang sama melalui pipeline publikasi yang terkelola. Sistem tidak boleh menciptakan salinan data atau angka yang diketik ulang khusus untuk suatu format publikasi apabila sumber otoritatif sudah tersedia. Setiap hasil publikasi wajib mempertahankan konsistensi substansi, lineage, versi, status pengesahan, dan sumber data, sekaligus dapat menggunakan presentasi visual yang disesuaikan dengan audiensnya.

---

## 8. Guard Perubahan Sistem

Setiap perubahan arsitektur atau implementasi wajib memenuhi ketentuan berikut:

1. Tidak mengubah kode, database, konfigurasi produksi, atau data resmi tanpa instruksi dan ruang lingkup eksplisit.
2. Tidak menghapus fitur berjalan sebelum pengganti diterima dan rollback tersedia.
3. Tidak mencampur refactoring, perubahan fitur, migrasi data, dan perubahan tampilan dalam satu paket tanpa alasan serta kontrol pengujian yang jelas.
4. Tidak melakukan perubahan skema tanpa migration script, data impact assessment, backup plan, dan rollback plan.
5. Tidak memperkenalkan dependency baru tanpa tujuan, lisensi, risiko keamanan, biaya, dan rencana pemeliharaan.
6. Tidak menyimpan rahasia di source code, dokumentasi, log, prompt, atau repository.
7. Tidak menerima keluaran AI sebagai fakta resmi tanpa validasi manusia dan sumber yang memadai.
8. Tidak menyatakan kesesuaian regulasi hanya berdasarkan keberadaan nama modul atau tabel.
9. Tidak membuat endpoint, tabel, field, atau integrasi baru sebelum ownership dan kontraknya ditetapkan.
10. Setiap keputusan yang berdampak lintas domain wajib dicatat sebagai Architecture Decision Record.

---

## 9. Struktur Pengambilan Keputusan

| Jenis Keputusan | Pengusul/Penyusun | Otoritas Arsitektur | Persetujuan Akhir |
|---|---|---|---|
| Visi, ruang lingkup, prioritas | Project Owner / Chief Enterprise Architect | Chief Enterprise Architect | Project Owner |
| Prinsip dan standar arsitektur | Chief Enterprise Architect | Chief Enterprise Architect | Project Owner |
| Desain domain, data, aplikasi, integrasi | Tim/AI pelaksana | Chief Enterprise Architect | Project Owner untuk dampak strategis |
| Perubahan source code terbatas | Pelaksana teknis | Sesuai blueprint dan guard | Project Owner/penanggung jawab teknis |
| Perubahan database dan migrasi | Pelaksana teknis | Chief Enterprise Architect | Project Owner sebelum eksekusi |
| Kepatuhan regulasi | Domain pemerintahan/pejabat berwenang | Chief Enterprise Architect mengoordinasikan bukti | Pejabat yang berwenang |
| Security exception | Penanggung jawab keamanan | Chief Enterprise Architect | Project Owner dan pejabat berwenang |
| Penggunaan AI dan data sensitif | Pemilik proses/data | Chief Enterprise Architect | Project Owner/pemilik data |
| Go-live dan rollback | Tim implementasi | Rekomendasi Architecture Review | Project Owner |

### 9.1 Aturan Eskalasi

Keputusan wajib dieskalasikan kepada Project Owner apabila:

- memengaruhi regulasi, kewenangan, atau dokumen resmi;
- mengubah scope, biaya, jadwal utama, atau risiko institusional;
- memengaruhi data lintas OPD atau integrasi eksternal;
- memerlukan perubahan besar terhadap sistem berjalan;
- menimbulkan risiko kehilangan data, gangguan layanan, keamanan, atau vendor lock-in; atau
- membutuhkan pengecualian terhadap prinsip Charter.

---

## 10. Architecture Governance Artifacts

Artefak tata kelola yang wajib dipelihara:

| Artefak | Fungsi |
|---|---|
| Architecture Charter | Konstitusi dan mandat arsitektur |
| Current State Baseline | Referensi resmi kondisi awal |
| Architecture Issue Register | Kontradiksi, gap, dan masalah arsitektur |
| Architecture Decision Record (ADR) | Rekam keputusan dan konsekuensinya |
| Architecture Risk Register | Risiko, pemilik, mitigasi, dan status |
| Compliance Register | Pemetaan regulasi, kontrol, bukti, dan status |
| Data Catalog & Business Glossary | Definisi, ownership, klasifikasi, dan lineage data |
| API & Event Catalog | Kontrak integrasi dan versi |
| Application Portfolio | Kapabilitas, modul, lifecycle, ownership, dan dependency |
| Technology Standards Catalog | Teknologi yang disetujui, dibatasi, dan dihentikan |
| AI Model & Prompt Register | Model, tujuan, data, prompt, evaluasi, risiko, dan biaya |
| Migration Roadmap | Transisi, dependensi, gate, rollout, rollback, dan dekomisioning |
| Traceability Matrix | Hubungan kebutuhan, regulasi, desain, implementasi, dan pengujian |

---

## 11. Architecture Issue Register — Initial

Issue berikut dicatat dari Official Baseline. Issue bersifat **non-blocking** bagi penyusunan blueprint sampai keputusan domain terkait membutuhkannya.

| ID | Isu Awal | Klasifikasi | Penanganan |
|---|---|---|---|
| AIR-001 | Siklus Renstra dinyatakan 5 tahun dan 6 tahun pada bagian berbeda | Business/Data Rule | Tetapkan temporal model dan aturan periode pada Data Architecture |
| AIR-002 | Dashboard disebut menggunakan data dummy dan pada bagian lain disebut sudah memakai data nyata | Documentation State | Catat sebagai status implementasi yang belum konsisten; tidak menghambat target architecture |
| AIR-003 | Model Notification disebut kosong dan pada bagian lain disebut sudah lengkap | Documentation State | Tetapkan target notification architecture; verifikasi hanya bila masuk fase implementasi |
| AIR-004 | Workflow approval disebut belum tersedia, sementara perkembangan proyek menunjukkan implementasi parsial | Business/Application State | Rancang enterprise workflow state model yang berlaku lintas dokumen |
| AIR-005 | Beberapa library UI digunakan bersamaan | Technology/UX Debt | Tetapkan satu design system target dan strategi konsolidasi bertahap |
| AIR-006 | Klaim siap produksi belum memiliki kriteria penerimaan yang seragam | Governance Gap | Bentuk Production Readiness Gate dan evidence checklist |
| AIR-007 | Status integrasi SIPD masih berupa gap | Integration Gap | Susun Integration Blueprint tanpa mengasumsikan akses API tersedia |
| AIR-008 | CSRF protection disebut belum tersedia | Security Gap | Masukkan dalam Security Architecture dan control backlog |
| AIR-009 | Backup dan restore otomatis belum tersedia | Resilience Gap | Tetapkan RPO, RTO, backup, restore test, dan disaster recovery target |
| AIR-010 | Dokumentasi mencampur current state, hasil perbaikan, dan rekomendasi masa depan | Documentation Governance | Terapkan status, versi, tanggal efektif, owner, dan evidence level pada seluruh artefak |

Issue baru dapat ditambahkan kapan saja tanpa harus mengubah prinsip Charter. Penutupan issue harus disertai keputusan atau bukti yang relevan.

---

## 12. Blueprint yang Wajib Dihasilkan

Future Enterprise Architecture minimal menghasilkan:

1. **Government Intelligence Platform Blueprint**;
2. **Business Capability & Value Stream Blueprint**;
3. **Enterprise Data Architecture Blueprint**;
4. **Enterprise Knowledge Model & Business Glossary**;
5. **Application and Domain Architecture Blueprint**;
6. **API, Event, and Integration Architecture Blueprint**;
7. **Analytics and Decision Intelligence Blueprint**;
8. **AI Governance, AI Gateway, and Model Architecture Blueprint**;
9. **Government Digital Publishing Platform Blueprint**, termasuk document, narrative, visualization, template, rendering, multiformat publishing, dan publication governance;
10. **Identity, Security, Privacy, and Audit Architecture Blueprint**;
11. **Technology, Deployment, Observability, and Resilience Blueprint**;
12. **UX Design System and Accessibility Blueprint**;
13. **Migration and Modernization Roadmap**; dan
14. **Architecture Governance and Compliance Operating Model**.

Setiap blueprint harus menunjukkan current baseline, target state, prinsip, komponen, hubungan, keputusan, risiko, transisi, serta kriteria penerimaan.

---

## 13. Architecture Gates

### Gate 0 — Charter Approved

- mandat, peran, scope, prinsip, dan guard disetujui;
- Official Baseline terdaftar; dan
- issue awal tercatat.

### Gate 1 — Business and Regulatory Alignment

- capability map dan value stream disetujui;
- kewenangan aktor dan lifecycle dokumen didefinisikan;
- regulasi dipetakan ke requirement dan kontrol.

### Gate 2 — Data and Knowledge Foundation

- domain data, ownership, master data, lineage, kualitas, dan temporal model disetujui;
- business glossary tersedia;
- klasifikasi data dan retensi ditetapkan.

### Gate 3 — Application, Integration, and AI Design

- domain aplikasi dan kontrak integrasi disetujui;
- security boundary dan AI governance ditetapkan;
- target design system dan document architecture ditetapkan.

### Gate 4 — Migration Ready

- roadmap, dependensi, prioritas, coexistence, rollback, dan acceptance criteria tersedia;
- risiko dan biaya utama telah dinilai.

### Gate 5 — Implementation Ready

- work package terbatas dan terukur;
- traceability dari requirement ke desain dan test tersedia;
- environment, data migration, security, dan operational readiness plan tersedia.

### Gate 6 — Production Ready

- functional, integration, regression, performance, security, backup/restore, dan user acceptance evidence tersedia;
- dokumentasi operasi dan rollback disetujui;
- keputusan go-live diterbitkan oleh Project Owner.

---

## 14. Kriteria Kualitas Blueprint

Blueprint hanya dapat diterima apabila:

- menggunakan bahasa yang jelas dan dapat dipahami pemangku kepentingan pemerintahan maupun teknis;
- membedakan fakta baseline, asumsi, keputusan, rekomendasi, dan target state;
- menghubungkan setiap komponen dengan kebutuhan atau prinsip;
- tidak menciptakan fitur, regulasi, endpoint, atau data seolah-olah telah tersedia;
- mencantumkan ownership dan decision rights;
- memiliki diagram atau tabel hanya ketika hubungan kompleks memerlukannya;
- mencatat risiko, trade-off, dan konsekuensi keputusan;
- memiliki tahapan implementasi yang realistis dan tidak merusak sistem berjalan; serta
- dapat digunakan sebagai acuan bagi manusia maupun AI engineering tools.

---

## 15. Ukuran Keberhasilan Transformasi

Keberhasilan e-PeLARA Next Generation diukur sekurang-kurangnya melalui:

1. persentase keterlacakan data dari perencanaan sampai realisasi dan akuntabilitas;
2. pengurangan input dan rekonsiliasi data berulang;
3. kualitas, kelengkapan, konsistensi, dan ketepatan waktu data;
4. waktu penyusunan serta revisi dokumen resmi;
5. tingkat kepatuhan workflow dan approval;
6. jumlah keputusan yang didukung insight dengan sumber data yang dapat ditelusuri;
7. jumlah insiden keamanan, kehilangan data, kegagalan integrasi, dan gangguan layanan;
8. tingkat keberhasilan backup/restore dan pencapaian RPO/RTO;
9. konsistensi hasil PDF, Word, Excel, dan tampilan aplikasi;
10. tingkat adopsi, kepuasan, dan keberhasilan tugas pengguna; serta
11. biaya operasional, AI, dan pemeliharaan per kapabilitas yang digunakan.

Nilai target kuantitatif ditetapkan pada blueprint domain dan roadmap setelah baseline pengukuran tersedia.

---

## 16. Pengendalian Perubahan Charter

1. Perubahan Charter harus diajukan dengan alasan, dampak, dan bagian yang berubah.
2. Chief Enterprise Architect menilai konsistensi dan konsekuensi arsitekturnya.
3. Project Owner menyetujui atau menolak perubahan.
4. Setiap perubahan menghasilkan versi baru dan change log.
5. Keputusan yang hanya bersifat teknis dan tidak mengubah Charter dicatat melalui ADR.
6. Pengecualian sementara harus memiliki pemilik, alasan, risiko, kontrol kompensasi, dan tanggal berakhir.

### 16.1 Aturan Versi

- **Major:** mengubah mandat, visi, kewenangan, scope utama, atau prinsip.
- **Minor:** menambah ketentuan, artefak, gate, atau issue penting tanpa mengubah mandat utama.
- **Patch:** koreksi redaksional yang tidak mengubah makna.

---

## 17. Ketentuan Penggunaan AI dalam Program Arsitektur

1. AI bekerja berdasarkan tugas yang dibatasi scope, input, output, dan kriteria selesai.
2. AI tidak boleh meminta atau menampilkan credential dan rahasia sistem.
3. Prompt dan hasil penting yang memengaruhi keputusan harus dapat ditelusuri.
4. Hasil AI harus ditinjau sesuai tingkat risiko dan dampaknya.
5. Data pemerintahan sensitif hanya boleh digunakan sesuai klasifikasi dan otorisasi.
6. Model/provider tidak boleh dipilih semata-mata karena popularitas; pemilihan mempertimbangkan kemampuan, keamanan, privasi, biaya, keterlacakan, dan keberlanjutan.
7. Kegagalan provider AI tidak boleh menghentikan fungsi pemerintahan inti.
8. Setiap fitur AI wajib memiliki fallback non-AI atau prosedur manual yang memadai.

---

## 18. Pernyataan Pengesahan

Dengan pengesahan Charter ini:

- lima dokumen Current State menjadi Official Baseline;
- penyusunan Future Enterprise Architecture dapat dilanjutkan tanpa audit ulang repository/database;
- kontradiksi baseline dikelola melalui Architecture Issue Register;
- seluruh blueprint dan pekerjaan lanjutan wajib tunduk pada prinsip, guard, dan architecture gate dalam dokumen ini; dan
- perubahan implementasi baru hanya dilakukan melalui fase serta persetujuan yang sesuai.

### Persetujuan

| Peran | Nama | Status |
|---|---|---|
| Project Owner | Fahmi Alhabsi | Disetujui dan disahkan pada 4 Agustus 2026 |
| Chief Enterprise Architect | ChatGPT Work | Ditetapkan sebagai konstitusi arsitektur resmi |

---

## 19. Change Log

| Versi | Tanggal | Perubahan | Status |
|---|---|---|---|
| 1.0.1 | 2026-08-04 | Pembaruan referensi lokasi Official Current State Baseline setelah pemindahan ke 01-current-state; tanpa perubahan substansi. | Approved — Administrative Patch |
| 1.0.0 | 4 Agustus 2026 | Charter disahkan; filosofi One Data, Many Publications dan target Government Digital Publishing Platform ditetapkan | Approved — Official Architecture Constitution |

---

**End of Document — 00-Architecture-Charter.md**

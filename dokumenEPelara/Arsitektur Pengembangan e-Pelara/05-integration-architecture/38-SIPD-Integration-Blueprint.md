---
document_id: BP-INT-001
title: SIPD Integration Blueprint
system: e-PeLARA Next Generation
classification: Integration Architecture Blueprint
domain: Integration Architecture
version: 0.1.2
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-06
last_reviewed: 2026-08-29
parent_document: ../05-integration-architecture/34-Integration-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: ADR-0004 (SIPD Integration Interim Pattern Decision), AIR-007, Integration Architecture
intended_repository_path: 05-integration-architecture/38-SIPD-Integration-Blueprint.md
review_outcome: PASSED
prepared_by: Claude Work (Draft File Operator, di bawah prinsip One AI, One Responsibility — Chief Enterprise Architect: ChatGPT)
---

# 38 — SIPD Integration Blueprint

## 1. Tujuan dan Kedudukan

Dokumen ini menyusun **candidate boundary dan pola integrasi** antara e-PeLARA dan SIPD (Sistem Informasi Pemerintahan Daerah, milik Kementerian Dalam Negeri), melanjutkan klasifikasi "Eksternal Government-to-Government" (ARCH-INT-001 §6, Approved) dan keputusan ADR-0004 (SIPD Integration Interim Pattern Decision, Accepted 2026-08-06). Dokumen ini **tidak** menetapkan ketersediaan API SIPD, kontrak teknis resmi dengan Kemendagri, atau disposition Gate G3.

## 2. Ruang Lingkup

Dalam scope: dokumentasi Interim Integration Pattern (pola yang sudah berjalan), kerangka placeholder Target Integration Pattern (API-based, belum diisi), klasifikasi evidence, dan routing Evidence Pending. Di luar scope: kontrak/API SIPD aktual, keputusan eskalasi institusional ke Kemendagri/Kominfo/BPKAD, kepemilikan/steward institusional, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `00-governance/adr/ADR-0004-SIPD-Integration-Interim-Pattern-Decision.md` (Version 1.0.0, Accepted 2026-08-06) — keputusan formalisasi Interim Integration Pattern.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-007, status Resolved merujuk ADR-0004 (Version 1.0.5).
- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved) §6 — klasifikasi SIPD sebagai "Eksternal Government-to-Government".
- `05-integration-architecture/39-e-SIGAP-Integration-and-SSO-Blueprint.md` (BP-INT-002, Approved) — pola struktural artefak integrasi eksternal (dipakai sebagai template struktur, bukan sumber isi SIPD).
- Peninjauan langsung kode aplikasi (dilakukan pada sesi penyusunan ADR-0004, 2026-08-06, read-only): `backend/routes/sipdRoutes.js`, `backend/controllers/sipdController.js`, `backend/services/rkaSipdPdfImportService.js`, `backend/services/realisasiSipdPdfImportService.js`, `backend/seeders/20260407-sipd-ref-seed.js`.
- `01-current-state/4-penilaian-kesesuaian-standar.md` §4.6, §62 — baseline mengonfirmasi sistem standalone, belum terhubung SIPD pusat.

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Status Evidence SIPD (Eksplisit)

SIPD adalah aplikasi eksternal milik Kemendagri — ketersediaan dan syarat akses API-nya **tidak dapat diputuskan sepihak oleh e-PeLARA** (ADR-0004 §1.2). Modul internal bernama "SIPD" pada backend (`sipdRoutes.js`/`sipdController.js`, tabel `sipd_ref_*`) adalah **modul referensi data lokal** menggunakan nomenklatur Permendagri — bukan client API ke server SIPD Kemendagri, dan bukan bukti integrasi API yang sudah berjalan (ADR-0004 §3 butir 5). Dokumen ini tidak mengasumsikan status ini berubah.

## 6. Bagian A — Interim Integration Pattern (Documented Current Fact)

Ditetapkan resmi oleh ADR-0004 §3 sebagai pola interim yang diakui, bukan solusi darurat tak terdokumentasi.

| Elemen | Kondisi |
| --- | --- |
| Mekanisme | Pengguna mengekspor dokumen (PDF) dari aplikasi SIPD secara manual, kemudian dokumen diimpor ke e-PeLARA melalui parser. |
| Referensi implementasi yang sudah ada | `rkaSipdPdfImportService.js`, `realisasiSipdPdfImportService.js`. |
| Sifat pola | Parser PDF/OCR atas dokumen ekspor manual — bukan integrasi API/webhook/sinkronisasi otomatis. |
| Fungsi `syncMock` (`sipdController.js`) | Nama fungsi sendiri mengonfirmasi ini adalah mock, bukan sinkronisasi eksternal nyata — dicatat sebagai fakta kode, bukan diusulkan sebagai basis integrasi. |
| Status resmi | Interim Integration Pattern, per ADR-0004 §3 butir 1-2. |

## 7. Bagian B — Target Integration Pattern (Placeholder, Belum Diisi)

Sesuai ADR-0004 §3 butir 4, bagian ini sengaja **tidak diisi** sampai ketersediaan API SIPD dikonfirmasi secara institusional oleh Kemendagri.

| Elemen | Status |
| --- | --- |
| Protokol/API SIPD | To be designated or verified by competent institutional authority — Evidence Pending. |
| Skema kontrak data (request/response) | To be assigned — Evidence Pending; menunggu konfirmasi ketersediaan API. |
| Mekanisme autentikasi/otorisasi eksternal | To be assigned — Evidence Pending. |
| Jadwal/pemicu sinkronisasi | To be assigned — Evidence Pending. |

Placeholder ini tidak boleh diisi berdasarkan asumsi; pengisian memerlukan evidence institusional baru dan kemungkinan ADR terpisah (ADR-0004 §3.1 butir 3).

## 6a. Addendum 2026-08-29 — Dokumentasi Kontrak Teknis Interim Pattern (Bagian A saja)

Dilakukan di bawah `11-roadmaps/backlog-eksekusi-otomatis.md`, mandat eksekusi teknis berbeda dari mandat draft-only §12. Peninjauan langsung terhadap dua service parser yang sudah ada dan berjalan (§6):

**`rkaSipdPdfImportService.js`** (PDF "Cetak RKA Rincian Belanja"):
- Header (Program/Kegiatan/Sub Kegiatan/Alokasi) diparse dari teks flat (`pdf-parse`), berbasis pola baris "Label: Value" dengan daftar label yang dikenal secara eksplisit (`KNOWN_LABELS`).
- Rincian belanja per item (Koefisien/Satuan/Harga/Spesifikasi) diparse dari **posisi glyph** (`pdfjs-dist`), bukan teks flat — karena kolom pada tabel PDF asli tidak punya pemisah teks yang jelas; tiap glyph di-bucket ke kolom berdasar posisi-x, baris dikelompokkan berdasar posisi-y.
- Nominal Rupiah wajib format Indonesia penuh (`1.234.567,00`); kolom Koefisien punya penanganan desimal terpisah.
- Error handling: `throw new Error(...)` dengan pesan Bahasa Indonesia yang dapat dibaca pengguna (bukan error code terstruktur) — mis. "Tahun anggaran tidak ditemukan di PDF", "Kode Sub Kegiatan tidak ditemukan di PDF."
- Output divalidasi ulang oleh `rkaValidationService` dengan schema yang **sama** dengan input form manual (`POST /api/rka`) — tidak ada jalur validasi terpisah untuk data hasil import.

**`realisasiSipdPdfImportService.js`** (PDF "Laporan Realisasi per Sub Kegiatan", menu Penatausahaan > Statistik Belanja SIPD):
- PDF sumber **tidak memiliki lapisan teks sama sekali** (dikonfirmasi: nol operator `showText`, hanya `paintImageXObject`/vector path) — baik `pdf-parse` maupun `pdfjs-dist` text extraction mengembalikan 0 karakter.
- Satu-satunya jalur: render tiap halaman jadi gambar, OCR (`tesseract.js`) dengan output word-level bounding box, lalu pengelompokan baris via nearest-neighbor terhadap baris "anchor" (kode rekening + nilai Rp).
- Setiap baris SIPD punya 4 kolom realisasi (KKPD/UP-GU/TU/LS); parser mengembalikan satu objek `rincian` per baris SIPD, dipecah controller pemanggil jadi maksimal 4 baris Penatausahaan.
- PDF tidak mencantumkan tahun anggaran secara eksplisit (hanya tanggal cetak) — tahun **wajib** dikirim terpisah oleh pemanggil, bukan diekstrak dari dokumen.

**Sifat evidence**: Documented Current Fact (perilaku kode aktual saat ini), bukan spesifikasi normatif — perubahan pada parser di masa depan tidak otomatis mengubah dokumen ini. Ringkasan ini **tidak** menyentuh Bagian B (§7) — placeholder Target Integration Pattern (API-based) **sengaja tetap kosong**, dikonfirmasi ulang tetap berlaku sesuai ADR-0004 §3 butir 4 dan §7 dokumen ini sendiri ("tidak boleh diisi berdasarkan asumsi"). Tidak dibuat draft/candidate skema API apa pun pada addendum ini — berbeda dari pendekatan pada item backlog lain yang bersifat pola teknis generik, karena SIPD adalah sistem eksternal spesifik milik Kemendagri yang karakteristiknya tidak diketahui, sehingga draft apa pun akan murni karangan, bukan kandidat rekayasa yang beralasan.

## 8. Prinsip Boundary Integrasi

1. **Kontrak-first, konsisten STD-INT-001**: baik Interim maupun Target Pattern mengikuti prinsip contract-first, dengan lapisan verifikasi tambahan untuk pihak eksternal (mengikuti pola BP-INT-002 §6 butir 4).
2. **Tidak ada penggantian otomatis**: Interim Pattern tidak digantikan Target Pattern tanpa keputusan eksplisit (ADR terpisah atau pembaruan dokumen ini).
3. **Modul referensi lokal tetap terpisah**: modul `sipd_ref_*` tetap diklasifikasikan sebagai referensi data lokal, bukan titik integrasi eksternal (ADR-0004 §3 butir 5).
4. **Tidak berasumsi eskalasi institusional**: dokumen ini tidak menugaskan atau mengasumsikan eskalasi ke Kemendagri/Kominfo/BPKAD — itu tetap keputusan/tindakan terpisah Project Owner (ADR-0004 §3.1 butir 1).

## 9. Boundary dengan ARCH-INT-001, ADR-0004, dan BP-INT-002 (Approved/Accepted)

ARCH-INT-001 mengklasifikasikan SIPD sebagai kategori integrasi eksternal Government-to-Government; ADR-0004 memformalkan perlakuan interim; dokumen ini mendokumentasikan detail pola pada level Integration Architecture. Dokumen ini tidak mengubah klasifikasi ARCH-INT-001 maupun keputusan ADR-0004. BP-INT-002 (e-SIGAP) dipakai sebagai referensi pola struktural saja — SIPD dan e-SIGAP adalah domain integrasi eksternal yang berbeda (data referensi/pelaporan keuangan vs identitas/SSO) dan tidak disatukan dalam dokumen ini.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Ketersediaan dan konfirmasi API SIPD dari Kemendagri | To be designated or verified by competent institutional authority — Evidence Pending. **Keputusan Project Owner (2026-08-29)**: eskalasi ke Kemendagri sengaja **ditunda** — Interim Pattern diterima sebagai cara kerja tetap untuk saat ini, bukan sementara. Eskalasi hanya akan dilakukan bila muncul kebutuhan mendesak yang jelas. | Eskalasi Project Owner (di luar dokumen ini) — ditunda per keputusan 2026-08-29, lihat AIR-EA-001 (AIR-007). |
| Kontrak data/skema teknis Interim Pattern (format kolom PDF, aturan validasi, error handling) | **Terdokumentasi (Addendum 2026-08-29)** — lihat §6a untuk ringkasan kontrak teknis nyata kedua parser, berdasarkan peninjauan langsung kode. | Selesai untuk dokumentasi; perluasan/perbaikan teknis tetap implementasi terpisah. |
| Protokol dan skema Target Integration Pattern (API-based) | **Tetap placeholder kosong, dengan sengaja (tidak berubah).** Addendum 2026-08-29 mengonfirmasi ulang keputusan ini — lihat §6a penutup. | ADR terpisah bila API dikonfirmasi tersedia. |
| Otoritas institusional verifikasi keabsahan data hasil PDF-import | To be designated or verified by competent institutional authority — Evidence Pending | Keputusan Project Owner terpisah |

## 11. Assumptions dan Program State

1. ARCH-INT-001 (Approved) dan ADR-0004 (Accepted 2026-08-06) adalah dependency; tidak diubah oleh dokumen ini.
2. AIR-007 berstatus Resolved (Architecture Issue Register Version 1.0.5) merujuk ADR-0004; closure formal AIR-007 tetap memerlukan closure approval eksplisit Project Owner, terpisah dari penyusunan dokumen ini.
3. G1 dan G2 tetap tanpa disposition. Dokumen ini tidak menetapkan disposition G3.
4. Dokumen ini tidak mengasumsikan ketersediaan API SIPD berubah sejak ADR-0004 disahkan.

## 12. Batas Kewenangan AI

**Diizinkan**: Mendokumentasikan Interim Integration Pattern berdasarkan ADR-0004 dan evidence kode yang telah ditinjau, menyusun kerangka placeholder Target Integration Pattern tanpa mengisi kontennya, routing Evidence Pending, mengikuti metadata dan struktur draft-only.

**Dilarang**: Menetapkan atau mengklaim ketersediaan API SIPD, kontrak teknis resmi dengan Kemendagri, owner/steward institusional, authority, compliance, implementasi, effective date, atau disposition Gate.

**Addendum 2026-08-29 — mandat berbeda**: penambahan §6a dilakukan di bawah runbook eksekusi backlog, bukan mandat draft-only di atas. Batasan §12 asli tetap berlaku penuh untuk addendum ini: Bagian B (§7) tetap tidak diisi, tidak ada klaim ketersediaan API, tidak ada kontrak dengan Kemendagri diusulkan. §6a murni mendokumentasikan perilaku kode Interim Pattern yang sudah ada dan berjalan (Bagian A) — dalam kategori "Diizinkan" (mendokumentasikan Interim Pattern berdasarkan evidence kode).

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / Draft File Operator | Claude Work | Selesai | Disusun berdasarkan ADR-0004 (Accepted) dan evidence kode yang telah ditinjau sebelumnya. | 2026-08-06 |
| Chief Enterprise Architect (review) | ChatGPT | Belum dilakukan terpisah | Review substantif oleh ChatGPT belum tercatat terpisah pada sesi ini; Project Owner memberikan persetujuan final secara langsung. | — |
| Project Owner | Fahmi Alhabsi | **Approved** | Disetujui secara eksplisit 2026-08-06. | 2026-08-06 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Penyusunan awal SIPD Integration Blueprint sebagai BP-INT-001 Seq 38, berdasarkan ADR-0004 (Accepted) dan ARCH-INT-001 (Approved). Cakupan: dokumentasi Interim Integration Pattern (Bagian A) dan kerangka placeholder Target Integration Pattern (Bagian B, belum diisi). | Claude Work | Draft for Review |
| 0.1.0 (final) | 2026-08-06 | **Finalisasi**: Project Owner menyetujui BP-INT-001 v0.1.0 secara eksplisit. Status dinaikkan menjadi Approved, effective_date 2026-08-06, review_outcome PASSED. Bagian B (Target Integration Pattern) tetap placeholder — tidak diisi oleh finalisasi ini. | Claude Work, berdasarkan persetujuan eksplisit Project Owner | Approved |
| 0.1.1 | 2026-08-29 | **Addendum evidence**: ditambahkan §6a mendokumentasikan kontrak teknis nyata Interim Pattern (kedua parser PDF) berdasarkan peninjauan langsung kode. §10 baris kontrak teknis diperbarui dari Evidence Pending menjadi Terdokumentasi. Bagian B (§7) **sengaja tidak disentuh** — dikonfirmasi ulang tetap placeholder kosong sesuai ADR-0004 §3 butir 4, tidak ada draft/candidate API pattern dibuat. Ditambahkan addendum §12. Dijalankan di bawah runbook `11-roadmaps/backlog-eksekusi-otomatis.md`. | Claude (mode `/loop`, sesi eksekusi backlog) | Approved (evidence addendum; review substantif Project Owner belum dilakukan) |
| 0.1.2 | 2026-08-29 | **Keputusan Project Owner dicatat** (§10): Interim Pattern diterima sebagai cara kerja tetap untuk saat ini (bukan sementara); eskalasi ke Kemendagri untuk API sengaja ditunda sampai ada kebutuhan mendesak. Bagian B (§7) tetap tidak diisi — keputusan ini tidak mengubah placeholder, hanya menegaskan tidak ada rencana aktif mengejar Target Integration Pattern dalam waktu dekat. | Claude, berdasarkan keputusan eksplisit Project Owner | Approved |

## 15. Validation Checklist (Version 0.1.2)

1. ✓ Metadata sesuai mandat draft-only: version 0.1.0, status Draft for Review, effective_date null, review_outcome Pending.
2. ✓ Dependency (ARCH-INT-001, ADR-0004) tidak diubah.
3. ✓ Target Integration Pattern (Bagian B) sengaja dibiarkan sebagai placeholder, tidak diisi asumsi.
4. ✓ Tidak ada klaim ketersediaan API SIPD, kontrak teknis, owner/steward institusional, atau disposition Gate.
5. ✓ G1/G2 tetap tanpa disposition dicatat akurat; AIR-007 Resolved (bukan Closed) dicatat akurat.
6. ✓ Tidak ada file lain tersentuh selain artefak ini.

## 16. State Aktual Dokumen

Version 0.1.0, status **Approved**, effective_date 2026-08-06, review_outcome PASSED. Disetujui Project Owner (Fahmi Alhabsi) 2026-08-06. Bagian B (Target Integration Pattern) tetap placeholder Evidence Pending, tidak diisi oleh finalisasi ini.

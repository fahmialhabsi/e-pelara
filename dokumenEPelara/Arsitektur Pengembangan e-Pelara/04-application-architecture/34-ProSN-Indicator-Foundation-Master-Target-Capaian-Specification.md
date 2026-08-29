# 34 — ProSN Indicator Foundation: Master Indikator, Target, Capaian

**Status**: REVISIONS APPLIED — 7 koreksi wajib CEA (2026-08-07) sudah diterapkan ke dokumen ini. D1–D4 APPROVED (D2 dengan semantic guard, lihat §1.4 & §2). Menunggu konfirmasi final Project Owner sebelum §10 dieksekusi.

**Riwayat keputusan**: Disusun setelah Corrective Pass ProSN (Fase C) dinyatakan **ACCEPTED** oleh Project Owner (2026-08-07). Draft pertama ditinjau CEA dan dikembalikan dengan status *REVISIONS REQUIRED BEFORE IMPLEMENTATION* (7 koreksi wajib, lihat §12 Log Revisi). Dokumen ini adalah versi hasil revisi.

**Cakupan**: Generalisasi arsitektur Master Indikator + Target + Capaian ProSN dari 4 indikator Ketahanan Pangan (B.1.1–B.1.4, sudah live) menjadi fondasi yang juga menampung 7 indikator MBG (Makan Bergizi Gratis), dan siap diperluas ke Bab lain (A/C/D/E) di masa depan tanpa refactor ulang.

**Sumber regulasi**:
- Ketahanan Pangan (B.1.1–B.1.4): Kepmendagri 700.1.1.4-180/2026 Lampiran II — sudah diverifikasi & di-seed sejak Fase B (`backend/seeders/20260807020000-seed-prosnp-master-indikator-dan-mapping.js`).
- MBG (7 indikator): Kepmendagri 700.1.1.4-180/2026 Lampiran II, diberikan Project Owner verbatim pada sesi 2026-08-07 (lihat §4 di bawah — kutipan literal, bukan tafsiran).

**Non-goals** (bukan cakupan dokumen ini, dan JANGAN diperluas sendiri saat implementasi): ekspor Excel nasional MBG (belum ada file template audit), integrasi lintas-OPD data-sharing otomatis (mis. tarik data Dinas Kesehatan langsung), penambahan Bab A/C/D/E lain, **dan membangun mapping/pohon Program-Kegiatan-Subkegiatan milik Dinkes/Disdik/Dinsos** — sekalipun MBG butuh data mereka, e-PeLARA TIDAK menjadi sistem pengelolaan program OPD tsb. Mapping DPA lanjutan (di luar dokumen ini) hanya boleh mencakup Program/Kegiatan/Subkegiatan **Dinas Pangan sendiri** yang mendukung MBG.

---

## 1. Prinsip Desain

1. **Jangan retrofit yang sudah berjalan.** 4 rule engine Ketahanan Pangan (B.1.1–B.1.4) TIDAK diubah logikanya. `kriteria_skor` mereka tetap format lama (array deskriptif `[{skor, syarat}]`, dibaca manusia, bukan mesin) — mengubahnya berisiko regresi tanpa manfaat, karena rule engine mereka sudah bekerja dan diuji (31 unit test + 11 integration test, lihat Corrective Pass report).
2. **Indikator baru pakai rule engine generik berbasis konfigurasi**, bukan satu fungsi JS per indikator. `kriteria_skor` untuk tipe_form BARU berisi struktur mesin-terbaca (lihat §3.3) sehingga menambah indikator ke-12, ke-13, dst (Bab A/C/D/E masa depan) idealnya tidak perlu kode baru — cukup baris seed + kategori bukti baru.
3. **Tidak ada skor yang diketik manusia.** Semua 7 indikator MBG dihitung backend dari data register + evidence gate, persis pola Ketahanan Pangan. `skor_indikatif_internal` tetap eksplisit BUKAN nilai resmi nasional.
4. **Ownership bukan properti periode, tapi properti indikator — dan makna field lama TIDAK direinterpretasi.** `prosnp_periode.perangkat_daerah_id` TETAP APA ADANYA secara SKEMA (tidak breaking-change) **dan TETAP APA ADANYA secara MAKNA** — kolom ini terus berarti persis seperti sekarang di kode berjalan: OPD yang membuat/memiliki baris periode tsb secara administratif (dipakai unique constraint `uq_prosnp_periode_scope` dan pemeriksaan akses existing). Dokumen ini **tidak** mengklaim kolom itu "sekarang berarti Koordinator Provinsi" — klaim semacam itu adalah reinterpretasi diam-diam yang bisa menyesatkan kode/dokumentasi lain yang membaca kolom ini apa adanya. Peran koordinasi lintas-indikator (siapa penanggung jawab MBG 2.4, siapa pemilik data, dst) dinyatakan LEWAT FIELD BARU YANG EKSPLISIT di level `prosnp_indikator` (§3.2) — bukan lewat menafsirkan ulang field lama. Tidak perlu field "koordinator periode" baru sama sekali: akuntabilitas cukup berhenti di granularitas indikator (D4), dan tindakan administratif tingkat-periode (lock/ekspor) tetap dikontrol lewat role ADMIN yang sudah ada, terlepas dari `perangkat_daerah_id` periode itu.
5. **Evidence Category Gate tetap pola yang sama**: kategori bukti ditambah secara aditif ke ENUM `prosnp_bukti_dukung.kategori`, terikat entity_type/entity_id per record (bukan generik per-indikator), sama seperti Corrective Pass.

---

## 2. Keputusan Arsitektur — STATUS: D1/D3/D4 APPROVED, D2 APPROVED WITH SEMANTIC GUARD (CEA, 2026-08-07)

| # | Keputusan | Putusan | Catatan pelaksanaan |
|---|---|---|---|
| D1 | Kode indikator MBG: `MBG 2.1`..`MBG 2.7` vs `B.2.1`..`B.2.7` | **APPROVED** — pakai literal `MBG 2.1`..`MBG 2.7`. Jangan dipaksakan ke `B.2.x`; MBG adalah kelompok tersendiri dalam struktur laporan. | Tidak ada migrasi ulang diperlukan, sudah konsisten sejak draft pertama. |
| D2 | Scope `prosnp_periode` tetap per-OPD vs per-provinsi | **APPROVED WITH SEMANTIC GUARD** — skema TETAP per-OPD, TAPI makna `perangkat_daerah_id` TIDAK direinterpretasi jadi "Koordinator Provinsi" (lihat prinsip §1.4 versi revisi). Field itu tetap berarti persis seperti kode berjalan sekarang. Peran koordinasi lintas-indikator dinyatakan eksplisit lewat field ownership baru di `prosnp_indikator` (§3.2), bukan lewat menafsirkan ulang field lama. | Tidak ada perubahan skema `prosnp_periode` sama sekali di fase ini. |
| D3 | `prosnp_inovasi` dipakai ulang utk MBG 2.7 vs tabel baru | **APPROVED** — pakai ulang `prosnp_inovasi` + kolom generik baru `relevansi_umum` (§3.4). Data B.1.4 lama (kolom relevansi_pengadaan/pengelolaan/penyaluran) tidak diubah. | — |
| D4 | Kolom ownership di `prosnp_indikator` (per periode) vs `prosnp_master_indikator` (global) | **APPROVED** — keduanya, beda peran: `default_responsible_opd_id` di master = saran/default nullable saja (admin isi manual, TIDAK otomatis Dinas Pangan). Ownership AKTUAL yang mengikat ada di `prosnp_indikator` per periode. | — |

**D1–D4 final, tidak perlu dikonfirmasi ulang.** 7 koreksi wajib tambahan dari tinjauan CEA sudah diterapkan ke §3–§9 di bawah (lihat §12 Log Revisi untuk daftar lengkap & alasan tiap koreksi).

---

## 3. Skema Database (migration tambahan, semua ADDITIVE)

### 3.1 `prosnp_master_indikator` — kolom baru
```sql
ALTER TABLE prosnp_master_indikator
  ADD COLUMN kelompok_tematik ENUM('ketahanan_pangan','mbg') NOT NULL DEFAULT 'ketahanan_pangan',
  ADD COLUMN default_responsible_opd_id INT NULL REFERENCES perangkat_daerah(id) ON DELETE SET NULL,
  ADD COLUMN evidence_requirement_provenance ENUM('regulatory_requirement','internal_control') NOT NULL DEFAULT 'internal_control'
    COMMENT 'Koreksi wajib #6 (CEA): kategori bukti yg diwajibkan per indikator adalah derivasi konservatif ePeLARA dari objek yang dinilai, BUKAN nama dokumen yang secara literal disebut Kepmendagri — kecuali suatu indikator memang eksplisit menyebut nama dokumen (maka diset regulatory_requirement). Ditampilkan di UI (§7) dan API (§6) agar tidak pernah terkesan seolah persyaratan literal regulasi. Backfill: 4 baris Ketahanan Pangan existing JUGA diset internal_control (evidence category B.1.1-B.1.4 dari Corrective Pass juga derivasi konservatif, bukan kutipan literal Kepmendagri).',
  MODIFY COLUMN tipe_form ENUM(
    'dukungan_program','target_capaian_rasio','distribusi_status',
    'penugasan_kdh','koordinasi_forkopimda','cadangan_pangan_beras','inovasi_dan_perkada',
    -- BARU utk MBG:
    'status_bertingkat_evidence',      -- MBG 2.1 (klaim tunggal, evidence-driven, TANPA auto-downgrade — lihat §5)
    'checklist_proporsional_evidence', -- MBG 2.2 (koreksi #2 — checklist komponen, BUKAN status+textarea)
    'pelaporan_berkala_evidence',      -- MBG 2.3
    'capaian_persentase_bertingkat'    -- MBG 2.4, 2.5, 2.6
    -- MBG 2.7 pakai 'inovasi_dan_perkada' yang SUDAH ADA, tidak perlu tipe baru
  ) NOT NULL;
```
`prosnp_indikator.tipe_form` (kolom per-periode, model terpisah tapi ENUM harus identik) di-ALTER dengan value yang sama. `evidence_requirement_provenance` HANYA perlu di `prosnp_master_indikator` (definisi global), tidak perlu diduplikasi ke `prosnp_indikator`.

> **Koreksi #2 mengubah arsitektur**: draft pertama menaruh MBG 2.1 dan 2.2 di SATU tipe_form (`status_bertingkat_evidence`) karena keduanya tampak seperti "klaim status 3-tingkat". CEA menolak ini untuk 2.2 — status "lengkap/sebagian" harus BISA DIHITUNG dari komponen sarpras yang benar-benar ada, bukan diklaim manual. Karena mekanisme skoringnya beda secara fundamental (klaim tunggal vs proporsi checklist), 2.1 dan 2.2 sekarang punya tipe_form terpisah.

### 3.2 `prosnp_indikator` — kolom ownership baru
```sql
ALTER TABLE prosnp_indikator
  ADD COLUMN responsible_opd_id INT NULL REFERENCES perangkat_daerah(id) ON DELETE SET NULL
    COMMENT 'OPD penanggung jawab substantif indikator ini pada periode ini — TIDAK boleh default Dinas Pangan utk indikator non-Ketahanan-Pangan.',
  ADD COLUMN data_owner_opd_id INT NULL REFERENCES perangkat_daerah(id) ON DELETE SET NULL
    COMMENT 'OPD pemilik sumber data asli (mis. Dinas Kesehatan utk data ibu hamil/balita MBG 2.4/2.5).',
  ADD COLUMN evidence_coordinator_user_id INT NULL REFERENCES users(id) ON DELETE SET NULL
    COMMENT 'Individu yang mengoordinasi pengumpulan bukti utk indikator ini pada periode ini.';
```
Backfill: untuk 4 indikator Ketahanan Pangan pada 2 periode existing (id 1 & 2), set `responsible_opd_id = periode.perangkat_daerah_id` (Dinas Pangan) via migration data — eksplisit, bukan default implisit, supaya konsisten dgn prinsip #4.

Tabel kontributor many-to-many (opsional, dipakai kalau >1 OPD kontribusi data ke satu indikator):
```sql
CREATE TABLE prosnp_indikator_kontributor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT UNSIGNED NOT NULL REFERENCES tenants(id),
  indikator_id INT NOT NULL REFERENCES prosnp_indikator(id) ON DELETE CASCADE,
  opd_id INT NOT NULL REFERENCES perangkat_daerah(id),
  peran ENUM('kontributor_data','kontributor_bukti','koordinator_teknis') NOT NULL,
  catatan TEXT NULL,
  created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_indikator_opd_peran (indikator_id, opd_id, peran)
);
```

### 3.3 `kriteria_skor` — skema JSON terstruktur (HANYA untuk tipe_form baru; 4 indikator lama tidak disentuh)

Setiap tier di bawah punya `evidence_kategori_wajib` SENDIRI-SENDIRI dan dievaluasi INDEPENDEN (bukan "klaim lalu turun" — lihat §5 utk algoritma final pasca-koreksi #3).

**`status_bertingkat_evidence`** (MBG 2.1 SAJA — 2.2 pindah ke tipe lain, lihat di bawah):
```json
{
  "tipe": "status_tier",
  "opsi_status": [
    { "status": "terbentuk_aktif", "label": "Satgas telah terbentuk dan berfungsi aktif", "skor": 1.00, "evidence_kategori_wajib": ["sk_satgas_mbg", "bukti_aktivitas_satgas_mbg"] },
    { "status": "terbentuk_belum_optimal", "label": "Terbentuk tetapi belum berjalan optimal", "skor": 0.50, "evidence_kategori_wajib": ["sk_satgas_mbg"] },
    { "status": "belum_terbentuk", "label": "Belum terbentuk", "skor": 0.00, "evidence_kategori_wajib": [] }
  ],
  "evidence_provenance": "internal_control",
  "dasar_hukum": "Perpres 12/2025 RPJMN 2025-2029; SE Mendagri 400.5.7/4072/SJ tgl 25 Juli 2025"
}
```
Catatan tier `belum_terbentuk`: `evidence_kategori_wajib: []` (kosong) adalah lantai vakum yang selalu bisa dipenuhi — ini BUKAN "downgrade otomatis", melainkan tier yang secara faktual berarti "tidak ada bukti pembentukan apa pun", yang memang selalu benar jika tier di atasnya tidak terbukti.

**`checklist_proporsional_evidence`** (MBG 2.2 — koreksi #2, checklist komponen configurable admin, BUKAN status bebas):
```json
{
  "tipe": "checklist_proporsional",
  "daftar_komponen_wajib": [
    "Ruang/Sekretariat Satgas",
    "Sarana Komunikasi (telepon/internet)",
    "Alat Tulis Kantor",
    "Sarana Mobilitas/Transportasi Lapangan"
  ],
  "catatan_daftar_komponen": "Daftar ini contoh awal, EDITABLE oleh admin via PUT /prosnp/master-indikator/:id (§6) — Kepmendagri tidak merinci daftar sarpras secara eksplisit, sehingga daftar ini evidence_provenance=internal_control dan harus bisa disesuaikan tanpa deploy kode baru.",
  "tiers": [
    { "kondisi": "proporsi_tersedia == 1", "skor": 1.50 },
    { "kondisi": "0 < proporsi_tersedia < 1", "skor": 0.75 },
    { "kondisi": "proporsi_tersedia == 0", "skor": 0.00 }
  ],
  "evidence_kategori_wajib": ["daftar_sarpras_mbg", "bukti_ketersediaan_sarpras_mbg"],
  "evidence_provenance": "internal_control"
}
```
`proporsi_tersedia` dihitung backend = (jumlah baris `prosnp_sarpras_komponen_mbg` dgn `tersedia=true` YANG namanya cocok salah satu `daftar_komponen_wajib`) / (jumlah `daftar_komponen_wajib`). Jika admin belum mengisi `daftar_komponen_wajib` (array kosong), sistem TIDAK menebak — skor dikembalikan `null` dgn `excluded_reason: "Daftar komponen sarpras wajib belum dikonfigurasi admin — tidak dapat dihitung."` (bukan default ke 0 atau 1, karena keduanya sama-sama menebak).

**`pelaporan_berkala_evidence`** (MBG 2.3 — `data_lengkap` koreksi #1: DIHITUNG, bukan diinput):
```json
{
  "tipe": "pelaporan_berkala",
  "opsi_kondisi": [
    { "kondisi": "tepat_waktu_dan_sesuai", "skor": 1.00 },
    { "kondisi": "tidak_tepat_waktu_atau_tidak_sesuai", "skor": 0.50 },
    { "kondisi": "tidak_disampaikan", "skor": 0.00 }
  ],
  "evidence_kategori_wajib": ["laporan_satgas_mbg", "bukti_penyampaian_laporan_mbg"],
  "evidence_provenance": "internal_control"
}
```
`data_lengkap` (dipakai rule engine, TIDAK ADA di tabel sbg kolom writable — lihat §3.5 revisi) = server menghitung `rencana_kerja`, `permasalahan`, DAN `hasil_identifikasi_sppg` semuanya non-kosong. `tepat_waktu` = `tanggal_lapor_aktual <= tanggal_wajib_lapor`. Kondisi `tepat_waktu_dan_sesuai` HANYA terpenuhi jika tepat_waktu DAN data_lengkap DAN evidence_kategori_wajib valid — ketiganya, bukan salah satu.

**`capaian_persentase_bertingkat`** (MBG 2.4/2.5/2.6 — bobot beda per indikator, tier % SAMA bentuknya; aturan >100% koreksi #5):
```json
{
  "tipe": "tiered_percentage",
  "tiers": [
    { "min_persen": 90, "maks_persen": 100, "skor": 1.50 },
    { "min_persen": 80, "maks_persen": 89.999, "skor": 0.75 },
    { "min_persen": 50, "maks_persen": 79.999, "skor": 0.20 },
    { "min_persen": 0,  "maks_persen": 49.999, "skor": 0.00 }
  ],
  "persen_pencarian_tier_dibatasi_maks": 100,
  "evidence_kategori_wajib": ["dokumen_penetapan_sasaran_mbg", "data_realisasi_penerima_mbg"],
  "evidence_provenance": "internal_control"
}
```
(MBG 2.6 memakai tiers `[2.00, 1.00, 0.20, 0.00]` — angka beda, bentuk sama, lihat §4.) `persen_pencarian_tier_dibatasi_maks: 100` berarti: nilai persentase AKTUAL (bisa >100%, mis. realisasi melebihi sasaran krn migrasi penduduk) disimpan apa adanya di `skor_detail.persentase_realisasi_aktual` untuk audit, TAPI pencarian tier memakai `min(persentase_realisasi_aktual, 100)` — sehingga realisasi 137% tetap masuk tier 90-100% (skor penuh), bukan "no matching tier" / error.

**`inovasi_dan_perkada`** (MBG 2.7 — format SAMA seperti B.1.4, tidak diubah):
```json
[
  { "skor": 2.00, "syarat": "Inovasi ditetapkan dalam Peraturan Kepala Daerah" },
  { "skor": 1.00, "syarat": "Inovasi ada dan dilaksanakan, belum ditetapkan Perkada" },
  { "skor": 0.00, "syarat": "Tidak terdapat inovasi" }
]
```

### 3.4 `prosnp_inovasi` — satu kolom generik baru (dipakai ulang utk MBG 2.7)
```sql
ALTER TABLE prosnp_inovasi
  ADD COLUMN relevansi_umum BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'Relevansi generik thd objek indikator ProSN yg dinilai (dipakai indikator selain Ketahanan Pangan, mis. MBG 2.7). Kolom relevansi_pengadaan/pengelolaan/penyaluran TETAP dipakai khusus B.1.4, tidak diganti.';
```
`isRelevan()` di `prosnpB14RuleEngine.js` (dipakai ulang, TIDAK di-fork) diubah minimal:
```js
function isRelevan(inovasi) {
  return Boolean(inovasi.relevansi_umum || inovasi.relevansi_pengadaan || inovasi.relevansi_pengelolaan || inovasi.relevansi_penyaluran);
}
```

### 3.5 Register baru — hanya untuk MBG 2.1/2.2/2.3 (tidak ada register cocok yang bisa dipakai ulang)

`status_kelembagaan` di bawah adalah DEKLARASI/catatan operator sendiri (utk narasi & konteks pemeriksa), **BUKAN** sumber skor. Skor final SELALU dihitung ulang independen dari evidence (§5, koreksi #3) — jika deklarasi operator ("aktif") tidak match dgn tier yg evidence-nya benar-benar terbukti, `skor_detail` mencatat keduanya (`status_dideklarasikan` vs `status_terverifikasi`) supaya pemeriksa bisa lihat selisihnya, tanpa mengoreksi paksa deklarasi operator.

```sql
CREATE TABLE prosnp_satgas_mbg (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT UNSIGNED NOT NULL,
  periode_id INT NOT NULL REFERENCES prosnp_periode(id),
  indikator_id INT NOT NULL REFERENCES prosnp_indikator(id), -- selalu MBG 2.1
  pengisian_id INT NOT NULL REFERENCES prosnp_pengisian(id) ON DELETE CASCADE,
  status_kelembagaan ENUM('belum_terbentuk','terbentuk_belum_optimal','terbentuk_aktif') NOT NULL DEFAULT 'belum_terbentuk', -- deklarasi operator, lihat catatan di atas
  nomor_sk VARCHAR(150) NULL,
  tanggal_sk DATE NULL,
  uraian_aktivitas TEXT NULL,
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_by INT NULL, updated_by INT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL
);

-- Koreksi #2: BUKAN satu baris status+textarea. Satu baris PER KOMPONEN sarpras,
-- proporsi ketersediaan dihitung backend dari sini (lihat kriteria_skor checklist_proporsional di §3.3).
CREATE TABLE prosnp_sarpras_komponen_mbg (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT UNSIGNED NOT NULL,
  pengisian_id INT NOT NULL REFERENCES prosnp_pengisian(id) ON DELETE CASCADE, -- selalu MBG 2.2
  nama_komponen VARCHAR(150) NOT NULL, -- diisi dari daftar_komponen_wajib master_indikator.kriteria_skor (§3.3), operator TIDAK bebas mengetik nama baru
  tersedia BOOLEAN NOT NULL DEFAULT FALSE,
  catatan TEXT NULL,
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_by INT NULL, updated_by INT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_sarpras_komponen_pengisian_nama (pengisian_id, nama_komponen)
);

-- Koreksi #1: TIDAK ADA kolom data_lengkap yang bisa ditulis. Kelengkapan dihitung
-- rule engine dari rencana_kerja/permasalahan/hasil_identifikasi_sppg + evidence gate,
-- setiap kali "Hitung Ulang Skor" dijalankan — hasilnya hanya tersimpan di
-- prosnp_pengisian.skor_detail (read-only, audit trail), bukan kolom yang operator
-- bisa checklist sendiri.
CREATE TABLE prosnp_laporan_satgas_mbg (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT UNSIGNED NOT NULL,
  pengisian_id INT NOT NULL REFERENCES prosnp_pengisian(id) ON DELETE CASCADE, -- selalu MBG 2.3
  tanggal_wajib_lapor DATE NOT NULL,
  tanggal_lapor_aktual DATE NULL,
  rencana_kerja TEXT NULL,
  permasalahan TEXT NULL,
  hasil_identifikasi_sppg TEXT NULL,
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_by INT NULL, updated_by INT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL
);
```

MBG 2.4/2.5/2.6 pakai kolom generik yang SUDAH ADA di `prosnp_pengisian`: `target_nilai` (sasaran/denominator), `realisasi_nilai` (penerima/numerator), `rasio_nilai` (persentase, DIHITUNG BACKEND — endpoint update TIDAK menerima field ini dari client), `sumber_data`. Ini kolom lama peninggalan tipe_form `target_capaian_rasio` yang menganggur sejak Fase B — pemakaian ulang yang tepat. **Ditambah 2 kolom baru** (koreksi #4 — `sumber_data` teks bebas saja tidak cukup utk data lintas-OPD yang bisa diaudit):
```sql
ALTER TABLE prosnp_pengisian
  ADD COLUMN sumber_data_tanggal_posisi DATE NULL
    COMMENT 'Tanggal cutoff/posisi data realisasi (bukan tanggal input) — wajib diisi utk tipe_form capaian_persentase_bertingkat sebelum status Lengkap.',
  ADD COLUMN sumber_data_referensi_dokumen VARCHAR(255) NULL
    COMMENT 'Nomor/identitas dokumen atau dataset sumber data (mis. nomor surat Dinkes, nama dataset), generik utk indikator kuantitatif manapun.';
```
Identitas `data_owner` (OPD pemilik data asli, mis. Dinas Kesehatan utk data ibu hamil MBG 2.4) TIDAK perlu kolom baru lagi — sudah tersedia via `prosnp_indikator.data_owner_opd_id` (§3.2, D4) karena `prosnp_pengisian` 1:1 dengan `prosnp_indikator`.

### 3.6 Kategori bukti baru (ADD ke ENUM `prosnp_bukti_dukung.kategori`, aditif)
```
sk_satgas_mbg, bukti_aktivitas_satgas_mbg,
daftar_sarpras_mbg, bukti_ketersediaan_sarpras_mbg,
laporan_satgas_mbg, bukti_penyampaian_laporan_mbg,
dokumen_penetapan_sasaran_mbg, data_realisasi_penerima_mbg
```
(MBG 2.7 pakai ulang `bukti_implementasi` + `perkada`, sudah ada dari B.1.4.)

### 3.7 `entity_type` ENUM di `prosnp_bukti_indikator` — tambah 2 nilai
```
SATGAS_MBG, LAPORAN_SATGAS_MBG
```
- `SATGAS_MBG` (2.1): SK Satgas + bukti aktivitas terikat ke baris `prosnp_satgas_mbg` yang spesifik (bukan ke pengisian generik).
- `LAPORAN_SATGAS_MBG` (2.3): tiap entri laporan berkala punya bukti penyampaiannya SENDIRI, terikat ke baris `prosnp_laporan_satgas_mbg` yang spesifik — sama prinsipnya dgn B.1.2 "satu undangan tidak melegitimasi semua rapat": satu laporan bulan Januari tidak boleh dipakai membuktikan laporan bulan Februari.
- MBG 2.2 (`checklist_proporsional_evidence`): bukti (daftar/inventaris sarpras) terikat ke `PENGISIAN` — sudah ada di ENUM sejak Corrective Pass. Satu dokumen inventaris biasanya mencakup semua komponen sekaligus, tidak per-baris `prosnp_sarpras_komponen_mbg`.
- MBG 2.4/2.5/2.6: bukti terikat ke `PENGISIAN` — sudah ada.
- MBG 2.7: pakai `INOVASI` — sudah ada dari B.1.4.

---

## 4. Definisi 7 Indikator MBG (verbatim dari Project Owner, sumber Kepmendagri 700.1.1.4-180/2026 Lampiran II — JANGAN diubah angkanya tanpa konfirmasi ulang)

| Kode | Nama | Bobot | Tipe Form | Kriteria Skor |
|---|---|---|---|---|
| MBG 2.1 | Membentuk Satgas percepatan penyelenggaraan program MBG daerah | 1,00 | `status_bertingkat_evidence` | Aktif=1,00; belum optimal=0,50; belum terbentuk=0,00 (tier evidence-driven, lihat §5) |
| MBG 2.2 | Memfasilitasi kebutuhan sarpras kantor Satgas | 1,50 | `checklist_proporsional_evidence` (koreksi #2) | Proporsi komponen wajib tersedia 100%=1,50; sebagian=0,75; 0%=0,00 |
| MBG 2.3 | Melaporkan hasil Satgas (rencana kerja, permasalahan, identifikasi SPPG) tepat waktu & tepat data | 1,00 | `pelaporan_berkala_evidence` | Tepat waktu&sesuai=1,00; tidak tepat waktu/sesuai=0,50; tidak disampaikan=0,00 |
| MBG 2.4 | Capaian % ibu hamil & menyusui penerima bantuan MBG | 1,50 | `capaian_persentase_bertingkat` | 90-100%=1,50; 80-89%=0,75; 50-79%=0,20; <50%=0,00 |
| MBG 2.5 | Capaian % anak balita penerima bantuan MBG | 1,50 | `capaian_persentase_bertingkat` | 90-100%=1,50; 80-89%=0,75; 50-79%=0,20; <50%=0,00 |
| MBG 2.6 | Capaian % siswa & santri penerima bantuan MBG sesuai target | 2,00 | `capaian_persentase_bertingkat` | 90-100%=2,00; 80-89%=1,00; 50-79%=0,20; <50%=0,00 |
| MBG 2.7 | Inovasi program MBG sesuai perundang-undangan | 2,00 | `inovasi_dan_perkada` (reuse) | Perkada ditetapkan=2,00; ada tanpa Perkada=1,00; tidak ada=0,00 |

**Total bobot MBG = 10,50.** (4 indikator Ketahanan Pangan = 8,50 — dua tematik TIDAK dijumlah jadi satu skor gabungan; masing-masing tematik punya skor indikatif sendiri, sesuai prinsip §1.3 "bukan nilai resmi nasional".)

Dasar hukum: 2.1 & 2.2 — Perpres 12/2025 RPJMN 2025-2029 + SE Mendagri 400.5.7/4072/SJ (25 Juli 2025). 2.7 — Pasal 388 ayat (6) UU 23/2014.

**Evidence requirement per indikator** (diturunkan konservatif dari objek yang dinilai, BUKAN klaim dari Kepmendagri):
- 2.1: SK Satgas + bukti aktivitas/fungsi Satgas
- 2.2: daftar/inventaris sarpras + bukti ketersediaan
- 2.3: laporan Satgas (isi: rencana kerja + permasalahan + data SPPG) + bukti penyampaian tepat waktu
- 2.4/2.5/2.6: dokumen penetapan target/sasaran + data realisasi penerima + sumber data (field `sumber_data` di `prosnp_pengisian`)
- 2.7: dokumen inovasi; Peraturan Kepala Daerah utk skor penuh (pakai ulang kategori `bukti_implementasi`/`perkada`)

---

## 5. Rule Engine Generik (baru) — EVIDENCE-DRIVEN MURNI (koreksi wajib #3)

**Prinsip yang WAJIB dipegang** (revisi total dari draft pertama, yang secara keliru mengusulkan "klaim tier tinggi lalu turun satu tingkat jika evidence kurang" — CEA menolak ini karena membiarkan algoritma memberi skor 0,50 hanya karena operator MENGKLAIM "aktif" padahal tidak ada bukti sama sekali, seolah klaim itu sendiri bernilai):

> Skor **TIDAK PERNAH** ditentukan oleh apa yang diklaim/dideklarasikan operator (`status_kelembagaan` dkk hanyalah catatan naratif). Skor ditentukan HANYA dengan mengevaluasi SETIAP tier dari `kriteria_skor`, dari yang bobotnya PALING TINGGI ke PALING RENDAH, dan memberikan tier PERTAMA (=tertinggi) yang **evidence_kategori_wajib miliknya SENDIRI** (bukan milik tier lain) terbukti valid & terikat entity yang benar. Tidak ada "downgrade satu tingkat" — yang terjadi adalah: tier tinggi gagal syaratnya sendiri → cek tier berikutnya di bawahnya (yang punya syarat evidence LEBIH RINGAN, seringkali memang subset) → dst, sampai tier terendah (biasanya `evidence_kategori_wajib: []`, otomatis benar sbg lantai faktual "tidak ada bukti apa pun"). Contoh konkret dari CEA: klaim "aktif" tanpa bukti aktivitas TAPI SK Satgas valid ada → tier 0,50 lolos SENDIRI (syaratnya cuma SK) → skor 0,50, BUKAN karena "diturunkan dari 1,00", tapi karena tier 0,50 secara independen terbukti benar. Jika SK Satgas pun tidak ada → tier 0,50 juga gagal → jatuh ke tier 0,00 (lantai vakum) — ini bukan downgrade, ini fakta bahwa tidak ada bukti pembentukan apa pun.

Empat fungsi murni baru di `backend/services/prosnp/ruleEngine/prosnpGenericTierRuleEngine.js` — dipakai lintas indikator via `master_indikator.kriteria_skor`, TIDAK hardcode nama indikator:

```js
function hitungStatusTier(kriteriaSkor, evidenceKategoriValidSet) {
  // TIDAK menerima "statusTerpilih" sbg input yang menentukan skor (itu cuma dipakai
  // utk field skor_detail.status_dideklarasikan, informatif saja).
  // Iterasi kriteriaSkor.opsi_status terurut skor DESCENDING (asumsi sudah terurut di seed;
  // kalau tidak, sort eksplisit dulu, jangan asumsi urutan array).
  // Return tier PERTAMA yg evidence_kategori_wajib-nya SEMUA ada di evidenceKategoriValidSet.
  // Tier dgn evidence_kategori_wajib=[] otomatis lolos (lantai).
}

function hitungChecklistProporsional(daftarKomponenTersedia, kriteriaSkor, evidenceKategoriValidSet) {
  // Jika kriteriaSkor.daftar_komponen_wajib kosong -> return { skor: null, excluded_reason: 'Daftar komponen belum dikonfigurasi admin.' }
  // proporsi = |{k in daftar_komponen_wajib : daftarKomponenTersedia has k dgn tersedia=true}| / |daftar_komponen_wajib|
  // Skor tier (1.50/0.75/0.00) HANYA berlaku jika evidence_kategori_wajib (dokumen inventaris) juga valid;
  // jika proporsi>0 tapi evidence dokumen tidak ada -> skor 0 + excluded_reason eksplisit
  // ("komponen tercatat tersedia tapi tidak ada dokumen bukti terikat"), BUKAN diam-diam
  // memberi skor 0,75 tanpa bukti dokumen sama sekali.
}

function hitungPelaporanBerkala(laporanTerbaru, kriteriaSkor, evidenceKategoriValidSet) {
  // adaLaporan = laporanTerbaru != null
  // tepatWaktu = adaLaporan && laporanTerbaru.tanggal_lapor_aktual <= laporanTerbaru.tanggal_wajib_lapor
  // dataLengkap = adaLaporan && [rencana_kerja, permasalahan, hasil_identifikasi_sppg].every(non-empty) -- DIHITUNG, bukan field input (koreksi #1)
  // evidenceValid = evidenceKategoriValidSet berisi SEMUA kriteriaSkor.evidence_kategori_wajib,
  //                 DAN evidence itu terikat ke baris laporanTerbaru SPESIFIK (entity_type=LAPORAN_SATGAS_MBG,
  //                 entity_id=laporanTerbaru.id) -- bukan ke laporan bulan lain (lihat §3.7).
  // tepatWaktu && dataLengkap && evidenceValid -> 1.00
  // adaLaporan (apa pun kombinasi tepat waktu/lengkap/evidence yg tidak penuh) -> 0.50
  // !adaLaporan -> 0.00
}

function hitungCapaianPersentaseBertingkat(realisasi, target, kriteriaSkor, evidenceKategoriValidSet, opsi = {}) {
  // target=null/0 -> { skor: 0, alasan: 'Target/sasaran belum ditetapkan — capaian tidak dapat dihitung.' } (BUKAN divide-by-zero silent)
  // evidence kurang -> { skor: 0, alasan eksplisit, excluded: true } -- realisasi TIDAK dihitung tanpa evidence
  // persentaseAktual = (realisasi / target) * 100  -- disimpan APA ADANYA di skor_detail (audit, koreksi #5)
  // persentaseUntukTier = Math.min(persentaseAktual, kriteriaSkor.persen_pencarian_tier_dibatasi_maks ?? 100)
  // cari tier kriteriaSkor.tiers yg mencakup persentaseUntukTier -> skor tier itu
  // opsi.sumberDataLengkap wajib true (tanggal_posisi + referensi_dokumen terisi, koreksi #4) sebelum skor dianggap final utk status Lengkap
}
```
Orkestrasi (query DB + evidence gate + simpan skor) mengikuti pola PERSIS `prosnpRuleEngineService.js` yang sudah ada: `hitungUlangMbg21`, `hitungUlangMbg22`, dst, masing-masing tipis (fetch data → panggil fungsi generik → `simpanSkor()`). `skor_detail` WAJIB menyimpan `status_dideklarasikan` (utk 2.1) vs tier yang benar-benar diberikan, supaya pemeriksa bisa audit selisih deklarasi-vs-bukti.

Evidence gate baru: `backend/services/prosnp/prosnpEvidenceGateService.js` ditambah:
```js
async function kategoriValidSetUntukIndikator(indikatorId, tenantId, transaction) // generalisasi dari kategoriValidSetUntukEntity, scoped PENGISIAN
```

---

## 6. API Baru (pola sama seperti B.1.x — thin controller, service per register)

```
GET    /prosnp/pengisian/:pengisianId/satgas-mbg
POST   /prosnp/pengisian/:pengisianId/satgas-mbg
PUT    /prosnp/satgas-mbg/:id

GET    /prosnp/pengisian/:pengisianId/sarpras-komponen-mbg   -- list semua baris komponen
POST   /prosnp/pengisian/:pengisianId/sarpras-komponen-mbg/bootstrap
                               -- BARU: buat/sinkronkan baris komponen dari daftar_komponen_wajib
                               -- master_indikator.kriteria_skor terkini (idempotent — tambah baris
                               -- utk komponen baru, jangan hapus baris existing kalau daftar berubah)
PUT    /prosnp/sarpras-komponen-mbg/:id   -- update tersedia/catatan SATU komponen

GET    /prosnp/pengisian/:pengisianId/laporan-satgas-mbg
POST   /prosnp/pengisian/:pengisianId/laporan-satgas-mbg
PUT    /prosnp/laporan-satgas-mbg/:id

PUT    /prosnp/pengisian/:id  -- SUDAH ADA, tambah field target_nilai/realisasi_nilai/sumber_data
                               -- ke whitelist `editable` (prosnpWorkflowService.updatePengisian) KHUSUS
                               -- utk tipe_form='capaian_persentase_bertingkat' — rasio_nilai/skor TETAP
                               -- tidak pernah diterima dari client (dihitung ulang server-side saat Hitung Ulang Skor).

POST   /prosnp/indikator/:id/kepemilikan   -- ADMIN-only (SUPER_ADMIN/ADMINISTRATOR). Set
                                            -- responsible_opd_id/data_owner_opd_id/evidence_coordinator_user_id.
                                            -- PELAKSANA/PENGAWAS ditolak 403 (koreksi #7, wajib ada test negatif).
GET    /prosnp/indikator/:id/kontributor
POST   /prosnp/indikator/:id/kontributor   -- ADMIN-only, sama alasan di atas
DELETE /prosnp/indikator-kontributor/:id   -- ADMIN-only

PUT    /prosnp/master-indikator/:id/kriteria-skor  -- BARU, ADMIN-only. Endpoint yang belum
                                            -- ada sebelumnya (master_indikator hanya diseed,
                                            -- tidak ada API update). Wajib ada agar
                                            -- daftar_komponen_wajib MBG 2.2 (§3.3) benar-benar
                                            -- configurable tanpa deploy kode baru, sesuai koreksi #2.
                                            -- Response GET /prosnp/master-indikator (sudah ada)
                                            -- WAJIB menyertakan evidence_requirement_provenance
                                            -- (koreksi #6) supaya frontend bisa menampilkan badge.
```

---

## 7. Frontend (pola sama seperti 4 komponen B.1.x — React-Bootstrap, konsisten `EntityBuktiManager`)

Komponen baru di `frontend/src/features/prosnp/components/`:
- `SatgasMbgSection.jsx` (2.1) — radio 3 status (deklarasi operator, informatif) + `EntityBuktiManager` (SK Satgas/bukti aktivitas) + tampilan skor TERVERIFIKASI (hasil hitung backend) berdampingan dgn deklarasi, supaya selisihnya (jika ada) terlihat jelas — bukan radio yang langsung jadi skor.
- `SarprasKomponenMbgSection.jsx` (2.2) — checklist per komponen (dari `daftar_komponen_wajib`), setiap baris toggle tersedia/tidak + catatan, proporsi & skor read-only dari backend, `EntityBuktiManager` (daftar/inventaris sarpras) di level pengisian.
- `LaporanSatgasMbgSection.jsx` (2.3) — register tabel + form tanggal wajib/aktual + 3 field konten (rencana kerja/permasalahan/SPPG); kolom "Data Lengkap" di tabel HANYA tampilan hasil hitung backend, tidak ada checkbox input.
- `CapaianPersentaseMbgSection.jsx` (2.4/2.5/2.6, SATU komponen reusable via prop `indikator` — target/realisasi input, persentase & skor **read-only** dari backend, badge sumber data)
- MBG 2.7: pakai ulang `InovasiPerkadaSection.jsx` yang sudah ada (tambah toggle `relevansi_umum` bila `indikator.kelompok_tematik !== 'ketahanan_pangan'`)

`ProsnPeriodeDetailPage.jsx`: ganti branching `switch(indikator.tipe_form)` (sudah ada polanya utk 4 tipe lama) — tambah case utk 3 tipe baru + kelompokkan tampilan per `kelompok_tematik` (dua section terpisah: "Ketahanan Pangan" dan "Makan Bergizi Gratis").

Badge kepemilikan baru di header tiap indikator: `OPD Penanggung Jawab: {responsible_opd_id ?? 'Belum ditetapkan'}` + tombol admin "Atur Kepemilikan" — **jangan tampilkan default "Dinas Pangan"** untuk indikator MBG yang belum diisi (tampilkan eksplisit "Belum ditetapkan", sesuai prinsip #4).

Badge provenance evidence (koreksi #6) di setiap `EntityBuktiManager`/daftar kategori wajib: jika `master_indikator.evidence_requirement_provenance === 'internal_control'`, tampilkan label kecil "Kontrol internal ePeLARA — bukan nama dokumen literal dari Kepmendagri" di dekat daftar kategori bukti wajib, supaya pemeriksa/OPD lain tidak salah kira ini kutipan regulasi. Halaman "Atur Kepemilikan" (admin) untuk MBG 2.2 juga menyediakan form edit `daftar_komponen_wajib` (tekstarea/list input, panggil `PUT /prosnp/master-indikator/:id/kriteria-skor`).

---

## 8. Seed Master Data

`backend/seeders/<timestamp>-seed-prosnp-master-indikator-mbg.js` — 7 baris baru ke `prosnp_master_indikator`, `kelompok_tematik='mbg'`, `default_responsible_opd_id=NULL` (sengaja kosong — provinsi yang menetapkan, bukan sistem yang menebak), `evidence_requirement_provenance='internal_control'` (koreksi #6 — untuk SEMUA 7 baris, termasuk MBG 2.7 yang mengutip Pasal 388 ayat (6) UU 23/2014 sbg dasar hukum WEWENANG inovasi, bukan dasar hukum utk NAMA DOKUMEN buktinya). Kolom `kriteria_skor` persis skema §3.3 dengan angka §4, termasuk `daftar_komponen_wajib` awal utk MBG 2.2 (admin boleh ubah sesudahnya via endpoint §6). Migration data terpisah: backfill `evidence_requirement_provenance='internal_control'` ke 4 baris Ketahanan Pangan existing juga (§3.1).

**Bukan cakupan seeder ini**: nomenklatur mapping MBG ke `master_sub_kegiatan`/DPA (§10 Corrective Pass) — MBG lintas-OPD sehingga whitelist sub-kegiatan per OPD substantif (Dinkes, Disdik, Dinsos) perlu disusun terpisah per OPD, bukan satu whitelist Dinas Pangan. Jadikan task lanjutan setelah D1–D4 dikonfirmasi.

---

## 9. Test Wajib (pola sama seperti Corrective Pass — jangan kurang dari ini)

Unit (`prosnpMbgRuleEngineSelfTest.js`, baru):
- `hitungStatusTier`: **klaim "aktif" TANPA bukti aktivitas TAPI SK Satgas valid → skor 0,50** (tier 0,50 lolos independen, bukan "diturunkan dari 1,00" — ini test yang secara eksplisit membuktikan koreksi #3 diterapkan, bukan opsional); klaim "aktif" tanpa SK Satgas sama sekali → skor 0,00; evidence lengkap (SK+aktivitas) → skor 1,00
- `hitungChecklistProporsional`: `daftar_komponen_wajib` kosong (belum dikonfigurasi admin) → skor `null` + excluded_reason, BUKAN 0 atau 1; proporsi 2/4 komponen tersedia TAPI tanpa evidence dokumen inventaris → skor 0 + excluded_reason (bukan 0,75 diam-diam); proporsi 4/4 + evidence valid → 1,50
- `hitungPelaporanBerkala`: telat 1 hari → 0,50; data tidak lengkap (salah satu dari rencana_kerja/permasalahan/hasil_identifikasi_sppg kosong) meski tepat waktu → 0,50 (bukan 1,00); evidence laporan Januari tidak boleh dipakai memvalidasi laporan Februari (entity binding per-record, sama pola B.1.2); tanpa laporan sama sekali → 0,00
- `hitungCapaianPersentaseBertingkat`: batas tepat 90%/80%/50% (boundary test); target=0/null → skor 0 + alasan eksplisit, bukan crash; **realisasi 137% dari target → skor tier 90-100% (dibatasi maks 100 sesuai koreksi #5), bukan "no matching tier" atau error**; `persentase_realisasi_aktual` di `skor_detail` tetap tersimpan 137 apa adanya (bukan dipotong jadi 100 di data mentah, hanya di pencarian tier)
- MBG 2.7 reuse: `relevansi_umum=true` tanpa 3 boolean lama → tetap dianggap relevan; data B.1.4 existing (relevansi_pengadaan dkk) tidak berubah perilakunya

Integration (`prosnpMbgIntegrationSelfTest.js`, baru, pola periode uji tahun 2099 sama seperti Corrective Pass):
- End-to-end 7 indikator MBG dgn evidence binding + gate
- **Ownership**: buat indikator MBG dgn `responsible_opd_id` = OPD lain (bukan Dinas Pangan) — pastikan TIDAK ada bagian kode yang assume/override ke Dinas Pangan
- **Tenant isolation (koreksi #7, wajib)**: buat data uji di tenant A, verifikasi tenant B TIDAK BISA baca (`GET .../satgas-mbg` dkk → 404, bukan data kosong yang menyesatkan) maupun ubah (`PUT` → 404/403) register/evidence MBG milik tenant A. Uji utk minimal 2 dari 4 tabel baru (satgas, laporan) — pola sama seperti `assertSameTenant` yang sudah dipakai modul lain.
- **Authorization ownership (koreksi #7, wajib)**: `POST /prosnp/indikator/:id/kepemilikan` dan `PUT /prosnp/master-indikator/:id/kriteria-skor` dipanggil actor role PELAKSANA → harus ditolak 403 `PROSNP_FORBIDDEN`. Hanya SUPER_ADMIN/ADMINISTRATOR yang boleh berhasil.
- **Endpoint update pengisian menolak field terlarang**: `PUT /prosnp/pengisian/:id` dgn body berisi `rasio_nilai`/`skor_indikatif_internal` dari client HARUS diabaikan (tidak masuk whitelist `editable`) — assert nilai di DB tidak berubah walau dikirim di request body.
- Cleanup total data uji setelahnya (wajib, sama seperti Corrective Pass)

Workflow compliance: tabel baru (`prosnp_satgas_mbg`, `prosnp_sarpras_komponen_mbg`, `prosnp_laporan_satgas_mbg`, `prosnp_indikator_kontributor`) kemungkinan butuh entry baru di `workflowComplianceExceptions.json` — jalankan check saat model dibuat, jangan tunda ke akhir.

---

## 10. Prompt Claude Code — Mandat Implementasi (siap tempel ke sesi baru)

```
Mandat: ProSN Indicator Foundation — Master Indikator, Target, Capaian (MBG + generalisasi)

Rujukan wajib (baca dulu, jangan asumsi): dokumenEPelara/Arsitektur Pengembangan
e-Pelara/04-application-architecture/34-ProSN-Indicator-Foundation-Master-Target-Capaian-Specification.md

Konteks: Corrective Pass ProSN (evidence binding, evidence gate, rule engine B.1.1-B.1.4,
rekonsiliasi semester B.1.3, source-driven DPA mapping, ekspor template B.1.3) sudah
ACCEPTED oleh Project Owner. JANGAN ubah logika 4 rule engine Ketahanan Pangan yang sudah
berjalan (B.1.1/B.1.2/B.1.3/B.1.4) kecuali disebutkan eksplisit di spesifikasi (hanya
prosnp_inovasi + isRelevan() yang disentuh, itu pun aditif).

D1-D4 SUDAH FINAL (APPROVED, D2 dengan semantic guard) — TIDAK PERLU dikonfirmasi ulang,
lihat §2. Dokumen ini juga sudah melalui SATU putaran revisi wajib (7 koreksi CEA,
lihat §12 Log Revisi) — baca §12 dulu supaya paham APA yang berubah dari draft pertama
dan KENAPA, terutama koreksi #3 (rule engine evidence-driven murni, BUKAN "klaim lalu
turun tier") karena ini prinsip paling gampang salah diimplementasikan kalau hanya
membaca §5 sepintas.

Implementasikan berurutan:
1. Migration aditif sesuai §3 (kolom baru prosnp_master_indikator termasuk
   evidence_requirement_provenance/prosnp_indikator/prosnp_inovasi/prosnp_pengisian,
   tabel baru prosnp_satgas_mbg/prosnp_sarpras_komponen_mbg/prosnp_laporan_satgas_mbg/
   prosnp_indikator_kontributor, ENUM tambahan kategori bukti & entity_type). Backup
   database dulu. Jalankan check:db-schema setelahnya.
2. Model Sequelize utk 4 tabel baru + update model yang kena ALTER.
3. Rule engine generik (§5) — EMPAT fungsi murni (hitungStatusTier, hitungChecklistProporsional,
   hitungPelaporanBerkala, hitungCapaianPersentaseBertingkat), ditest unit dulu sebelum
   diorkestrasi. WAJIB tulis test yang eksplisit membuktikan "tier lolos independen,
   bukan diturunkan" sebelum lanjut ke langkah 4 — jangan asumsi implementasi otomatis benar.
4. Service orkestrasi per indikator MBG (pola sama prosnpRuleEngineService.js).
5. Evidence gate generalisasi (kategoriValidSetUntukIndikator).
6. Guard "Lengkap" (assertKelengkapanTipeBaru) — tambah 4 tipe_form baru (termasuk
   checklist_proporsional_evidence terpisah dari status_bertingkat_evidence) + MBG 2.7
   via tipe_form inovasi_dan_perkada yang sudah dihandle. Untuk capaian_persentase_bertingkat,
   status Lengkap juga mensyaratkan sumber_data_tanggal_posisi + sumber_data_referensi_dokumen terisi.
7. Seeder 7 baris MBG (§8) — angka HARUS sama persis §4, jangan dibulatkan/diubah.
   evidence_requirement_provenance='internal_control' utk 7 baris ini DAN backfill 4 baris lama.
8. Endpoint admin PUT /prosnp/master-indikator/:id/kriteria-skor (ADMIN-only) — wajib ada
   sebelum MBG 2.2 bisa dipakai nyata, karena daftar_komponen_wajib harus configurable.
9. Controller + routes (§6), termasuk role-guard ADMIN-only di endpoint kepemilikan/kontributor.
10. Frontend (§7) — 4 komponen baru + reuse InovasiPerkadaSection + badge provenance evidence.
11. Test (§9 lengkap): unit (termasuk 3 test yg eksplisit membuktikan koreksi #3, #2, #5),
    integration end-to-end dgn periode uji tahun 2099 + tenant isolation negative test +
    authorization negative test + cleanup total, workflow compliance check, browser UAT Puppeteer.
12. Laporan akhir jujur: READY/NOT READY per indikator, per OPD ownership assignment,
    apa yang masih manual (nomenklatur mapping DPA per-OPD MBG belum dicakup, lihat §8).

Jangan mengklaim selesai tanpa: (a) SEMUA test §9 lulus termasuk 3 test evidence-driven
yang eksplisit disebut di atas; (b) tidak ada skor yang bisa diketik manual dari UI
(verifikasi endpoint update pengisian menolak field rasio_nilai/skor_indikatif_internal
dari body request); (c) tidak ada OPD yang di-hardcode sebagai default pemilik indikator
MBG; (d) tenant isolation & authorization negative test lulus; (e) badge provenance
evidence tampil di UI utk indikator internal_control; (f) data uji dibersihkan total.
```

---

## 11. Ringkasan Perubahan vs Corrective Pass (untuk audit jejak)

| Aspek | Corrective Pass (selesai) | Indicator Foundation (dokumen ini) |
|---|---|---|
| Cakupan tematik | Ketahanan Pangan (4 indikator) | + MBG (7 indikator) |
| Rule engine | 4 fungsi bespoke per indikator | + 4 fungsi generik berbasis config, evidence-driven murni (§5, koreksi #3) |
| Ownership | Implisit (`periode.perangkat_daerah_id` = Dinas Pangan) | Eksplisit per-indikator, tidak hardcode OPD, field lama TIDAK direinterpretasi (§1.4) |
| kriteria_skor | Deskriptif (dokumentasi saja) | Baru: mesin-terbaca utk tipe_form baru, provenance eksplisit (internal_control vs regulatory_requirement) |
| Evidence gate | Per-entity (surat/rapat/target/transaksi/inovasi) | + per-pengisian generik (indikator kuantitatif) + per-record laporan berkala |
| Test | 31 unit + 11 integration | + tenant isolation & authorization negative test (koreksi #7) |

---

## 12. Log Revisi (CEA, 2026-08-07)

Draft pertama dokumen ini dikembalikan CEA dengan status *REVISIONS REQUIRED BEFORE IMPLEMENTATION*. Tujuh koreksi wajib berikut diterapkan sebelum status naik jadi siap-implementasi:

1. **MBG 2.3 `data_lengkap` tidak boleh checkbox operator** — diubah jadi dihitung server dari isi 3 field konten + evidence (§3.5, §5). Kolom `data_lengkap` dihapus dari tabel.
2. **MBG 2.2 tidak boleh status+textarea bebas** — diubah jadi checklist komponen (`prosnp_sarpras_komponen_mbg`, tipe_form baru `checklist_proporsional_evidence` terpisah dari 2.1) dgn daftar komponen wajib yang admin-configurable, bukan hardcode (§3.1, §3.3, §3.5, §6).
3. **Rule "evidence kurang → turun tier otomatis" dibatalkan** — diganti algoritma evidence-driven murni: setiap tier dievaluasi independen dari tinggi ke rendah, tier yg diberikan adalah yg SYARATNYA SENDIRI terbukti, bukan hasil penurunan dari klaim tier lain (§5, rewrite total).
4. **Metadata sumber MBG 2.4-2.6 diperkuat** — tambah `sumber_data_tanggal_posisi` + `sumber_data_referensi_dokumen` di `prosnp_pengisian`; `data_owner` sudah tercakup lewat `prosnp_indikator.data_owner_opd_id` (D4) (§3.5).
5. **Aturan realisasi >100% dieksplisitkan** — simpan `persentase_realisasi_aktual` apa adanya, cari tier pakai `min(aktual, 100)`, tidak pernah "no matching tier" (§3.3, §5).
6. **Provenance evidence requirement dieksplisitkan sampai DB/API/UI** — kolom baru `evidence_requirement_provenance` (`internal_control`/`regulatory_requirement`) di `prosnp_master_indikator`, dibackfill ke 4 indikator Ketahanan Pangan existing juga, ditampilkan sbg badge di frontend (§3.1, §6, §7, §8).
7. **Test tenant isolation + authorization ditambahkan sbg wajib** — negative test Tenant A/B dan PELAKSANA-tidak-boleh-ubah-ownership masuk §9, endpoint kepemilikan/kriteria-skor dieksplisitkan ADMIN-only di §6.

D2 disetujui DENGAN semantic guard tambahan: prinsip §1.4 ditulis ulang supaya TIDAK mengklaim `perangkat_daerah_id` "sekarang berarti Koordinator Provinsi" — field itu tetap bermakna persis seperti kode berjalan sekarang, akuntabilitas lintas-OPD sepenuhnya lewat field baru di `prosnp_indikator`.

Batasan yang DIPERTAHANKAN dari draft pertama (CEA setuju, tidak diubah): mapping DPA MBG ke Dinkes/Disdik/Dinsos TETAP di luar cakupan (§8) — pekerjaan lanjutan utk Dinas Pangan hanya boleh mencakup Program/Kegiatan/Subkegiatan Dinas Pangan sendiri yang mendukung MBG, bukan membangun pohon program OPD lain.

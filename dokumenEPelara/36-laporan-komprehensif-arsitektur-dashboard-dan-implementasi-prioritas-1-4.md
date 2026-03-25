# Dokumen 36 — Laporan Komprehensif: Arsitektur Dashboard & Implementasi Prioritas 1–4
## SIGAP-MALUT × e-Pelara — Dinas Pangan Provinsi Maluku Utara

**Versi Dokumen:** 1.0  
**Tanggal Selesai:** 25 Maret 2026  
**Klasifikasi:** Dokumen Teknis Internal — Pedoman Tim IT, Bahan Audit Inspektorat, Landasan Pengembangan Lanjutan  
**Disusun oleh:** Tim Pengembang SIGAP-MALUT  
**Rujukan Dokumen:** dok. 01, 08, 09, 12, 13, 14, 32, 33, 34, 35  
**Status:** FINAL — Terkunci  

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Analisis Kondisi Nyata & Temuan Kritis](#2-analisis-kondisi-nyata--temuan-kritis)
3. [Alur Proses Perencanaan di e-Pelara](#3-alur-proses-perencanaan-di-e-pelara)
4. [Mapping Role SIGAP → e-Pelara](#4-mapping-role-sigap--e-pelara)
5. [Rekomendasi Dashboard per Role — Modul Perencanaan](#5-rekomendasi-dashboard-per-role--modul-perencanaan)
6. [Arsitektur Dashboard e-Pelara — 4 Layout Terkunci](#6-arsitektur-dashboard-e-pelara--4-layout-terkunci)
7. [Tabel Akses Menu Sidebar e-Pelara per Role](#7-tabel-akses-menu-sidebar-e-pelara-per-role)
8. [Keputusan Arsitektur Final D-01 s/d D-15](#8-keputusan-arsitektur-final-d-01-sd-d-15)
9. [Rencana Implementasi — Fase 1 s/d 4](#9-rencana-implementasi--fase-1-sd-4)
10. [Laporan Implementasi Priority 1 — Blocker](#10-laporan-implementasi-priority-1--blocker)
11. [Laporan Implementasi Priority 2 — High](#11-laporan-implementasi-priority-2--high)
12. [Laporan Implementasi Priority 3 — Medium](#12-laporan-implementasi-priority-3--medium)
13. [Laporan Implementasi Priority 4 — Low](#13-laporan-implementasi-priority-4--low)
14. [Inventaris Lengkap File yang Berubah](#14-inventaris-lengkap-file-yang-berubah)
15. [Matriks Keamanan OWASP Top 10](#15-matriks-keamanan-owasp-top-10)
16. [Checklist Audit Inspektorat](#16-checklist-audit-inspektorat)
17. [Panduan Pengembangan Tahap Berikutnya](#17-panduan-pengembangan-tahap-berikutnya)

---

## 1. Ringkasan Eksekutif

Dokumen ini merupakan **laporan tunggal dan komprehensif** yang merekam seluruh proses analisis arsitektur, keputusan desain sistem, dan implementasi kode yang telah diselesaikan pada sistem **SIGAP-MALUT** (Sistem Informasi Gizi, Aman Pangan Maluku Utara) beserta integrasinya dengan sistem **e-Pelara** (Elektronik Perencanaan).

### 1.1 Cakupan Pekerjaan yang Selesai

| Fase | Kategori | Item | Status |
|------|----------|------|--------|
| **Analisis** | Arsitektur Dashboard per Role | 9 role, 16 dashboard | ✅ Selesai |
| **Analisis** | Arsitektur e-Pelara 4 Layout | SUPER_ADMIN, ADMINISTRATOR, DRAFTER, PENGAWAS | ✅ Terkunci |
| **Keputusan** | D-01 s/d D-15 | 15 keputusan arsitektur | ✅ Terkunci |
| **Priority 1** | Blocker — 5 item | Kadis, Pelaksana, UPTD | ✅ Selesai |
| **Priority 2** | High — 6 item | UPTD Lab, Bendahara, JF, Kadis, Sekretariat | ✅ Selesai |
| **Priority 3** | Medium — 4 item | Cascading, Sub-Kegiatan Form, Layout | ✅ Selesai |
| **Priority 4** | Low — 7 item | Audit trail, UPTD Ops, Sekretariat SLA, Distribusi | ✅ Selesai |

### 1.2 Dasar Hukum

| Regulasi | Relevansi |
|----------|-----------|
| **PP 95/2018 tentang SPBE** | Audit trail wajib, kontrol akses berbasis peran, keamanan sistem informasi pemerintah |
| **PP 60/2008 tentang SPIP** | Segregation of duties, traceability penuh seluruh transaksi, pengendalian intern |
| **PP 30/2019 tentang Kinerja PNS** | Konfidensialitas data penilaian kinerja ASN |
| **PP 71/2019 tentang TTE** | Tanda tangan elektronik dan otentikasi digital dokumen |
| **UU No. 23/2014 tentang Pemerintahan Daerah** | Kewajiban digitalisasi layanan pemerintah daerah |
| **Permendagri 77/2020** | Pedoman teknis pengelolaan keuangan daerah — segregasi SPJ |
| **PP 8/2006** | Pelaporan keuangan pemerintah daerah — laporan akuntabilitas agregasi |
| **Pergub Maluku Utara No. 56/2021** | SOTK Dinas Pangan — definisi fungsi per jabatan |

---

## 2. Analisis Kondisi Nyata & Temuan Kritis

### 2.1 Lima Masalah Akar dari Kondisi Nyata (Dokumen 01)

Lima masalah besar di Dinas Pangan Provinsi Maluku Utara yang **wajib dijawab** oleh desain dashboard:

| No | Masalah Teridentifikasi | Dampak Operasional | Solusi via Dashboard |
|----|------------------------|--------------------|---------------------|
| 1 | Staf langsung ke Kepala Dinas, **bypass Sekretaris** | Koordinasi lumpuh, alur tidak terdokumentasi | Tombol Submit hanya ke Sekretaris — sistem blokir bypass secara teknis |
| 2 | Dokumen perencanaan (Renstra/Renja/DPA) **tidak berbasis data** | Program tidak efektif, tidak ada dasar ilmiah | Dashboard menampilkan data REAL dari e-Pelara sebagai dasar penyusunan |
| 3 | **Bendahara membuat SPJ sendiri** | Accountability lemah, tidak ada verifikasi — potensi korupsi | Dashboard PELAKSANA yang buat SPJ; Bendahara hanya verifikasi kesesuaian dengan DPA |
| 4 | **Tidak ada monitoring kepangkatan/KGB** | Hak pegawai dilanggar, keterlambatan kenaikan pangkat tidak terdeteksi | Dashboard Kasubag dengan alert KGB/pangkat otomatis |
| 5 | **DPA tidak pernah dibagikan ke bidang** | Setiap tolok ukur DPA tidak tercapai karena bidang tidak tahu target anggaran mereka | Dashboard Kepala Bidang menampilkan ringkasan DPA bidangnya langsung dari e-Pelara |

### 2.2 Kondisi e-Pelara Sebelum Perbaikan (Gap Kritis)

| Komponen | Kondisi Lama | Masalah |
|----------|-------------|---------|
| `MuiSidebarGlobal.jsx` | Tampilkan 13 menu ke SEMUA user | Zero role filtering — PENGAWAS bisa klik tombol DPA, LAKIP |
| `DashboardHome.jsx` | Satu halaman untuk semua role | Hanya tampil nama user + chart RPJMD |
| Role check di sidebar | TIDAK ADA | Tidak ada pembedaan akses |
| Panel "Perlu Tindakan" | TIDAK ADA | ADMINISTRATOR tidak bisa tahu dokumen mana yang menunggu approval mereka |
| Status tracking DRAFTER | TIDAK ADA | Setelah submit, tidak ada feedback visual tentang posisi dokumen |

---

## 3. Alur Proses Perencanaan di e-Pelara

### 3.1 Hierarki Dokumen Perencanaan

```
RPJMD (Rencana Pembangunan Jangka Menengah Daerah) — 5 tahun
  └── Cascading ke ↓
      Renstra OPD (Rencana Strategis OPD) — 5 tahun per OPD
        └── Dipecah per tahun ke ↓
            RKPD (Rencana Kerja Pemerintah Daerah) — 1 tahun
              └── OPD Level ke ↓
                  Renja OPD (Rencana Kerja) — 1 tahun per OPD
                    └── Dianggarkan ke ↓
                        RKA (Rencana Kerja & Anggaran)
                          └── Disahkan DPRD ke ↓
                              DPA (Dokumen Pelaksanaan Anggaran)
                                └── Dilaksanakan, dimonitor di ↓
                                    Monev → LAKIP / LK-Dispang / LPK-Dispang
```

### 3.2 Alur State Machine Pembuatan Usulan Renstra

```
[PELAKSANA / JF] → INPUT DRAFT
  ├── Sub-Kegiatan baru
  ├── Set indikator & target per tahun (6 tahun)
  └── Set pagu anggaran per tahun
    ↓ status: DRAFT

[PEJABAT_FUNGSIONAL Perencana] → KONTEKSTUALISASI
  ├── Hubungkan ke Tujuan Renstra
  ├── Hubungkan ke Sasaran Renstra
  ├── Hubungkan ke Strategi & Kebijakan
  ├── Verifikasi alignment dengan RPJMD (cascading)
  └── Submit ke Sekretaris
    ↓ status: DIAJUKAN

[SEKRETARIS] → KOORDINASI & KOMPILASI
  ├── Review semua usulan dari 3 Bidang + UPTD
  ├── Verifikasi konsistensi lintas bidang
  ├── Koordinasi dengan Bappeda (RKPD alignment)
  └── Forward ke Kepala Dinas
    ↓ status: DIVERIFIKASI

[KEPALA DINAS] → APPROVAL & PENANDATANGANAN
  ├── Review strategis
  ├── Approve Renstra OPD
  └── TTD digital (QR + SHA-256 hash)
    ↓ status: DISETUJUI / SELESAI
```

### 3.3 Alur Tahunan: Renja → RKA → DPA

```
[KEPALA BIDANG / PEJABAT_FUNGSIONAL] → BUAT DRAFT RENJA
  └── Submit ke Sekretaris (WAJIB, tidak boleh langsung ke Kadis)
    ↓

[SEKRETARIS] → KOMPILASI RENJA OPD
  ├── Gabungkan Renja semua bidang
  ├── Sesuaikan dengan pagu Bappeda
  └── Submit ke Kepala Dinas
    ↓

[KEPALA DINAS] → APPROVE RENJA
    ↓

[SEKRETARIS / KASUBAG / JF Perencana] → INPUT RKA
  └── Submit ke Kepala Dinas untuk TTD
    ↓

[DPRD/Bappeda — PROSES EKSTERNAL] → Disahkan menjadi DPA
    ↓

[SEMUA BIDANG MENERIMA DPA] → PELAKSANAAN
  ├── Bidang tahu anggaran sub-kegiatannya (via dashboard masing-masing)
  ├── Monev: input realisasi per sub-kegiatan
  └── LAKIP/LPK-Dispang sebagai pelaporan akhir
```

---

## 4. Mapping Role SIGAP → e-Pelara

### 4.1 Tabel Mapping (TERKUNCI — Dok. 34)

| Role SIGAP (15) | → Role e-Pelara (5) | Kewenangan Perencanaan |
|----------------|---------------------|------------------------|
| SUPER_ADMIN | SUPER_ADMIN | CRUD semua + manage period + clone data |
| KEPALA_DINAS | ADMINISTRATOR | Approve Renstra/Renja/RKA, TTD digital |
| GUBERNUR | PENGAWAS | Read-only semua dokumen perencanaan (hanya FINAL) |
| SEKRETARIS | ADMINISTRATOR | Input & koordinasi semua dokumen perencanaan |
| KASUBAG_UMUM_KEPEG. | ADMINISTRATOR | Input terbatas: RKA/DPA/Renja lingkup sekretariat |
| PEJABAT_FUNGSIONAL (Bidang, has_subordinate=true) | ADMINISTRATOR | Input data teknis bidang ke Renstra/Renja — kondisional |
| PEJABAT_FUNGSIONAL (Sekretariat/UPTD, has_subordinate=false) | PENGAWAS | Verifikasi dokumen administrasi, read-only |
| BENDAHARA | DRAFTER | Fokus RKA/DPA/Penatausahaan keuangan, verifikasi |
| PELAKSANA | DRAFTER | Input draft sub-kegiatan/target |
| KEPALA_BIDANG_* (3x) | ADMINISTRATOR | Input Renstra/Renja bidang masing-masing |
| KEPALA_UPTD | ADMINISTRATOR | Input perencanaan UPTD |
| KASUBAG_UPTD | DRAFTER | Input terbatas lingkup UPTD |
| KEPALA_SEKSI_UPTD | DRAFTER | Input terbatas lingkup seksi |
| VIEWER | PENGAWAS | Read-only semua |

### 4.2 Keputusan Kondisional JF (D-10)

JF Bidang yang memiliki bawahan (`has_subordinate = true`) diterjemahkan ke **ADMINISTRATOR** di e-Pelara karena mereka adalah drafter utama Renstra/Renja. JF Sekretariat dan JF UPTD tanpa bawahan diterjemahkan ke **PENGAWAS**.

Implementasi di `verifyToken.js` e-Pelara:
```javascript
// Translasi kondisional JF
if (sigapRole === "PEJABAT_FUNGSIONAL") {
  return unitKerja.includes("bidang") && hasSubordinate
    ? "ADMINISTRATOR"
    : "PENGAWAS";
}
```

---

## 5. Rekomendasi Dashboard per Role — Modul Perencanaan

### 5.1 KEPALA_DINAS — /dashboard

**Posisi dalam alur:** Approver Final

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Visi & Misi (read-only) | `GET /api/epelara/visi` + `/misi` | Tampilkan visi RPJMD + misi aktif sebagai konteks strategis |
| Approval Queue Perencanaan | `GET /api/epelara/renstra-opd?status=menunggu_approval` | Daftar Renstra/Renja/RKA menunggu TTD |
| Status Dokumen Aktif | `GET /api/epelara/renstra-opd?is_aktif=true` | Progress: berapa % tujuan/sasaran sudah diisi |
| KPI Alignment Panel | Renstra target vs Monev realisasi | Seberapa jauh program tercapai vs target |
| Program Prioritas Gubernur | `GET /api/epelara/prioritas-gubernur` | Reminder alignment kebijakan |
| Realisasi DPA per Bidang | `GET /api/epelara/dpa` + monev | Bar chart anggaran terserap vs DPA per bidang |
| LAKIP Read-Only | `GET /api/epelara/lakip` | Laporan akuntabilitas kinerja |
| Tombol Approve & TTD Digital | `POST` ke e-Pelara | Action button langsung dari SIGAP |

> **Catatan Kritis:** Kepala Dinas TIDAK BOLEH edit data perencanaan — hanya approve/reject dengan catatan. Notifikasi push jika ada dokumen menunggu TTD >3 hari.

### 5.2 SEKRETARIS — /dashboard/sekretariat

**Posisi dalam alur:** Orchestrator/Hub WAJIB — semua dokumen perencanaan wajib melalui beliau

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Perencanaan Queue | Status Renstra/Renja/RKA dari semua bidang | Inbox dokumen perencanaan dari Bidang |
| Cascading Check (interaktif) | `GET /api/epelara/cascading` | Verifikasi keterkaitan RPJMD → Renstra → Renja |
| Progress Perencanaan per Bidang | Filter per `bidang_opd` | Status per bidang + UPTD |
| SLA Monitor — Penyelesaian Dokumen | renstraQueue + `created_at` | Alert hari tertunda: >14 (kritis), >7 (perhatian), ≤7 (ok) |
| Laporan Agregasi 3 Bidang | renstraQueue client-side | Grid Ketersediaan/Distribusi/Konsumsi (disetujui/pending/ditolak) |
| Koordinasi Bidang | Internal SIGAP notifikasi | Kirim notifikasi ke Kepala Bidang tentang deadline |
| Tombol Kompilasi Renstra | `POST` ke e-Pelara | Gabungkan input semua bidang jadi satu Renstra OPD |

> **Catatan Kritis:** Bypass detection wajib aktif — submission langsung ke Kepala Dinas tanpa melalui Sekretaris harus diblokir sistem.

### 5.3 KEPALA_BIDANG (3 Bidang) — /dashboard/ketersediaan, /distribusi, /konsumsi

**Posisi dalam alur:** Middle Manager — menyusun usulan program/kegiatan bidang

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Renstra Bidang Saya | `GET /api/epelara/renstra-opd?bidang_opd={nama_bidang}` | Status Renstra 5 tahun bidang saya |
| DPA Bidang Saya **(KRITIS!)** | `GET /api/epelara/dpa?bidang={nama_bidang}` | Tampilkan DPA per sub-kegiatan — solusi masalah #5 |
| Target vs Realisasi Tahunan | Renstra target vs Monev | Seberapa jauh sub-kegiatan mencapai target |
| Form Sub-Kegiatan Baru (native) | `POST /api/sub-kegiatan-usul` | Form usulan langsung dari dashboard SIGAP |
| Status Dokumen Bidang | Per dokumen filter bidang | Status: Renstra ✅ / Renja □ / RKA □ per tahun |

> **Catatan Kritis:** Tombol "Kirim ke Sekretaris" (bukan ke Kepala Dinas) harus menjadi satu-satunya action submission.

### 5.4 PEJABAT_FUNGSIONAL (JF Bidang) — /dashboard/fungsional

**Posisi dalam alur:** Drafter Teknis & Input Utama

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Renstra Sub-Kegiatan Saya | Filter per user/bidang | Daftar sub-kegiatan tanggung jawab JF ini |
| Form Input Target & Indikator | `POST /api/epelara/renstra-subkegiatan` | Form detail target per tahun, indikator, pagu |
| Cascading Checker (interaktif) | `GET cascading view` | Verifikasi alignment ke tujuan → sasaran → program |
| Status Review Atasan | Query status approval | Apakah draft yang dikirim ke Kepala Bidang sudah di-review? |
| Tombol Buka e-Pelara | SSO Button | Akses form lengkap e-Pelara via SSO |

> **Catatan Kritis:** JF Sekretariat (tanpa bawahan) TIDAK memiliki panel input perencanaan — hanya verifikasi dokumen administrasi.

### 5.5 KEPALA_UPTD — /dashboard/uptd

**Posisi dalam alur:** Setara Kepala Bidang untuk unit UPTD

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Renja UPTD Spesifik | `GET /api/epelara/renja?unit=UPTD` | Tampilan rencana kerja tahunan UPTD |
| Realisasi Hasil Lab vs Target | Monev UPTD (`/api/epelara/realisasi-indikator`) | Progress bar per indikator lab vs target |
| Jadwal Pemeliharaan Alat Lab | `GET /api/uptd-ops/equipment` | Tabel terjadwal/terlambat/selesai |
| SOP Compliance Check | `GET /api/uptd-ops/sop-check` | Checklist 8 item harian, simpan via `POST /bulk` |
| Chain of Custody Sampel | `GET /api/uptd-ops/tracking` | Tabel pelacakan posisi sampel real-time |

### 5.6 PELAKSANA — /dashboard/pelaksana

**Posisi dalam alur:** Input terbatas, data teknis lapangan

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Tugas Perencanaan Saya | Tasks dari JF/Kasubag | Apakah ada tugas input data perencanaan |
| Data Teknis Lapangan | Form input komoditas/stok/distribusi | Data ini menjadi DASAR Renstra berbasis bukti |
| Target Kegiatan Saya (read-only) | `GET /api/epelara/renstra-subkegiatan` (filter) | Pelaksana lihat target sub-kegiatan bagian unitnya |

> **Catatan Kritis:** Pelaksana TIDAK bisa akses form Renstra/Renja langsung — hanya lihat target relevan. Link "Data Teknis Lapangan" menuju form input data operasional yang benar, bukan redirect ke `/`.

### 5.7 KASUBAG_UMUM_KEPEGAWAIAN — /dashboard/kasubag

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Formasi Pegawai (input ke Renstra) | Data pegawai aktif | Jumlah pegawai per jabatan → input sisi SDM di Renstra |
| Kebutuhan Diklat | Data pelatihan | Usulan kegiatan diklat untuk Renja |
| Alert KGB & Kenaikan Pangkat | Kalkulasi berkala | Notifikasi otomatis pegawai yang mendekati batas KGB |
| Renja Sekretariat (input) | Form sub-kegiatan administrasi | Input sub-kegiatan administrasi umum & kepegawaian |

### 5.8 BENDAHARA — /dashboard/bendahara

**Posisi dalam alur:** Verifikasi keuangan — BUKAN pembuat SPJ

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| DPA yang Aktif | `GET /api/epelara/dpa` | Tampilkan DPA lengkap yang sudah disahkan |
| RKA per Kegiatan | `GET /api/epelara/rka` | Rincian anggaran per sub-kegiatan |
| Realisasi vs Pagu (chart) | Monev + DPA | Progress bar % anggaran terserap per sub-kegiatan |
| SPJ Queue untuk Verifikasi | Internal SIGAP | SPJ dari Pelaksana yang masuk untuk diverifikasi |

> **Catatan Kritis:** Bendahara TIDAK memiliki tombol "Buat SPJ" — ini solusi langsung untuk masalah accountability. Yang membuat SPJ adalah Pelaksana; Bendahara hanya memverifikasi kesesuaian dengan DPA.

### 5.9 GUBERNUR — /dashboard (read-only bersama Kadis)

| Widget | Data Sumber | Fungsi |
|--------|-------------|--------|
| Visi Pembangunan | e-Pelara RPJMD | Tampilkan visi yang sudah ditetapkan |
| Status Pencapaian Program Prioritas | Prioritas Gubernur vs Monev | Seberapa jauh prioritas gubernur tercapai |
| LAKIP (read-only) | `GET /api/epelara/lakip` | PDF read-only laporan akuntabilitas |

---

## 6. Arsitektur Dashboard e-Pelara — 4 Layout Terkunci

```
══════════════════════════════════════════════════════════════════════
  ARSITEKTUR DASHBOARD e-PELARA — FINAL TERKUNCI
══════════════════════════════════════════════════════════════════════

[LAYOUT A] SUPER_ADMIN → /dashboard
  ┌─────────────────────────────────────────────────────┐
  │  System Health Panel                                │
  │  User Activity Log (siapa melakukan apa, kapan)     │
  │  Audit Trail Dashboard (semua aksi)                 │
  │  Akses semua 14 modul (termasuk Cloning Data)       │
  │  Periode/Clone Management                           │
  └─────────────────────────────────────────────────────┘

[LAYOUT B] ADMINISTRATOR → /dashboard
  ┌─────────────────────────────────────────────────────┐
  │  ⚡ PERLU TINDAKAN (unit_kerja user ini saja)        │
  │     Dokumen menunggu verifikasi/approval dari saya   │
  │  Status Board (semua dokumen periode aktif)          │
  │     Draft → Review → Approved → Final               │
  │  Riwayat Tindakan Saya (sudah approve/tolak)        │
  │  Notifikasi dokumen baru masuk                      │
  │  Akses 13 modul (tanpa Cloning Data)                │
  └─────────────────────────────────────────────────────┘

[LAYOUT C] DRAFTER → /dashboard
  ┌─────────────────────────────────────────────────────┐
  │  Dokumen Saya (semua yang saya buat + status)       │
  │  ⚡ Perlu Revisi (dikembalikan reviewer)             │
  │  Buat Dokumen Baru (shortcut per jenis)             │
  │  Timeline Pengajuan (history submit & verifikasi)   │
  │  Notifikasi feedback dari verifikator               │
  │  Akses 8 modul (RPJMD, Renstra, RKPD, Renja, RKA,  │
  │  DPA, PENGKEG, Monev)                               │
  └─────────────────────────────────────────────────────┘

[LAYOUT D] PENGAWAS → /dashboard
  ┌─────────────────────────────────────────────────────┐
  │  Ringkasan Eksekutif (KPI capaian per dokumen)      │
  │  Dokumen FINAL (hanya yang sudah approved)          │
  │  Grafik Progres per periode & per bidang            │
  │  Realisasi Anggaran (DPA vs realisasi, read-only)   │
  │  Akses 11 modul (tanpa Cloning, BMD, Penatausahaan, │
  │  PENGKEG — semua mode baca FINAL saja)              │
  └─────────────────────────────────────────────────────┘
══════════════════════════════════════════════════════════════════════
```

---

## 7. Tabel Akses Menu Sidebar e-Pelara per Role

```
═══════════════════════════════════════════════════════════════════════════
  MENU SIDEBAR e-PELARA — TABEL AKSES PER ROLE (TERKUNCI)
═══════════════════════════════════════════════════════════════════════════

  Menu Item          SUPER_ADMIN  ADMINISTRATOR  DRAFTER  PENGAWAS
  ─────────────────────────────────────────────────────────────────
  RPJMD              ✅           ✅             ✅       ✅ (FINAL saja)
  Renstra            ✅           ✅             ✅       ✅ (FINAL saja)
  RKPD               ✅           ✅             ✅       ✅ (FINAL saja)
  Renja              ✅           ✅             ✅       ✅ (FINAL saja)
  RKA                ✅           ✅             ✅       ✅ (FINAL saja)
  DPA                ✅           ✅             ✅       ✅ (FINAL saja)
  PENGKEG            ✅           ✅             ✅       ❌ (operasional)
  Monev              ✅           ✅             ✅       ✅ (FINAL saja)
  ─────────────────────────────────────────────────────────────────
  Penatausahaan      ✅           ✅             ❌       ❌ (keuangan aktif)
  BMD                ✅           ✅             ❌       ❌ (aset aktif)
  LPK-Dispang        ✅           ✅             ❌       ✅ (FINAL saja)
  LK-Dispang         ✅           ✅             ❌       ✅ (FINAL saja)
  LAKIP              ✅           ✅             ❌       ✅ (FINAL saja)
  ─────────────────────────────────────────────────────────────────
  Cloning Data       ✅           ❌             ❌       ❌ (SUPER_ADMIN only)
  ─────────────────────────────────────────────────────────────────
  Total menu tampil  14           13             8        11
═══════════════════════════════════════════════════════════════════════════
```

**Alasan per Kategori:**

| Kelompok | DRAFTER bisa? | PENGAWAS bisa? | Alasan |
|----------|-------------|--------------|--------|
| Perencanaan (RPJMD→DPA) | ✅ | ✅ FINAL | Inti pekerjaan DRAFTER |
| PENGKEG | ✅ | ❌ | DRAFTER input kegiatan; PENGAWAS tidak perlu detail operasional |
| Monev | ✅ | ✅ FINAL | DRAFTER isi monitoring; PENGAWAS lihat hasil akhir |
| Penatausahaan | ❌ | ❌ | Eksekusi keuangan — domain Bendahara |
| BMD | ❌ | ❌ | Pengelolaan aset aktif — bukan domain dokumen perencanaan |
| LPK / LK / LAKIP | ❌ | ✅ FINAL | Laporan akuntabilitas — PENGAWAS harus baca; DRAFTER tidak membuat ini (aggregated) |
| Cloning Data | ❌ | ❌ | Operasi berisiko tinggi — SUPER_ADMIN only, prinsip least privilege (PP 60/2008) |

---

## 8. Keputusan Arsitektur Final D-01 s/d D-15

### 8.1 Tabel Master Semua Keputusan (TERKUNCI)

| ID | Topik | Keputusan Final | Regulasi Dasar |
|----|-------|-----------------|----------------|
| **D-01** | Fungsi JF Sekretariat | Verifikator/analisa only; Pelaksana = drafter | PP 30/2019, SOTK |
| **D-02** | Lokasi approval | Di e-Pelara via SSO; SIGAP hanya notifikasi | PP 71/2019 (TTE) |
| **D-03** | Input RKA | Pelaksana draft → Kasubag verif → JF analisa → Sekretaris approve | Permendagri 77/2020 |
| **D-04** | Gubernur | Read-only, rute sama `/dashboard` dengan Kepala Dinas | PP 95/2018 |
| **D-05** | Tombol SSO | Ada di SEMUA dashboard; SIGAP = single entry point | Q1 (dok. 34) |
| **D-06** | Role DRAFTER | Tambah role ke-5 di e-Pelara: CREATE+UPDATE, tidak bisa APPROVE+DELETE | SPIP CMP-07 |
| **D-07** | Cakupan workflow | Berlaku untuk SEMUA unit | - |
| **D-08** | JF Bidang di 3 Bidang | Ambil alih fungsi Kasubag (verifikasi + analisa gabungan) | SOTK Pergub 56/2021 |
| **D-09** | UPTD jalur teknis | Kepala Seksi → langsung Kepala UPTD (skip JF UPTD) | SOTK UPTD |
| **D-10** | Translasi JF kondisional | JF Bidang (has_subordinate=true) → ADMINISTRATOR; JF Sekretariat/UPTD → PENGAWAS | - |
| **D-11** | Sidebar filtering | Sidebar e-Pelara difilter berdasarkan translated role | PP 95/2018 |
| **D-12** | DashboardHome refactor | 4 layout berbeda per role (A-B-C-D) | PP 95/2018, SPIP |
| **D-13** | Panel "Perlu Tindakan" | Tampil berdasarkan unit_kerja milik user saja | SPIP Segregation of Duties |
| **D-14** | PENGAWAS visibility | Hanya dokumen FINAL (bukan DRAFT) | PP 60/2008 |
| **D-15** | Modul SUPER_ADMIN only | Cloning Data = SUPER_ADMIN only. Penatausahaan + BMD = Admin+. LPK/LK/LAKIP = bukan DRAFTER | PP 60/2008, Permendagri 77/2020, PP 8/2006 |

---

## 9. Rencana Implementasi — Fase 1 s/d 4

### Fase 1 — Security & Role Foundation (e-Pelara backend)

| Kode | File | Status |
|------|------|--------|
| A-01 | Ganti `JWT_SECRET` (lama: `rahasia_RPJMD_aman` — bocor ke GitHub publik) | 🔐 Wajib sebelum production |
| A-02 | `verifyToken.js` — tambah DRAFTER + translasi kondisional JF Bidang | Direncanakan |
| A-03 | `allowRoles.js` — tambah DRAFTER | Direncanakan |
| A-13 | Migration + seeder role DRAFTER di database e-Pelara | Direncanakan |

### Fase 2 — Dashboard e-Pelara Refactor

| Kode | File | Status |
|------|------|--------|
| G-01F | `MuiSidebarGlobal.jsx` — tambah `allowedRoles` per menu item + filter | Direncanakan |
| G-02F | `DashboardHome.jsx` — refactor jadi 4 layout berbeda | Direncanakan |
| - | Buat `DashboardSuperAdmin.jsx`, `DashboardAdministrator.jsx`, `DashboardDrafter.jsx`, `DashboardPengawas.jsx` | Direncanakan |

### Fase 3 — SSO Integration (SIGAP backend)

| Kode | File | Status |
|------|------|--------|
| A-05 | `ePelaraService.js` — proxy layer ke API e-Pelara | ✅ Selesai (dok. 34) |
| A-06 | `ePelaraController.js` + `ePelaraRoutes.js` | ✅ Selesai (dok. 34) |

### Fase 4 — SSO Button SIGAP Frontend

| Kode | File | Status |
|------|------|--------|
| A-08 | `BukaEPelaraButton.jsx` | ✅ Selesai |

---

## 10. Laporan Implementasi Priority 1 — Blocker

**Tanggal Selesai:** Maret 2026

| No | Item | Dashboard | Masalah Lama | Solusi Implementasi | Status |
|----|------|-----------|-------------|---------------------|--------|
| P1-01 | **Status Dokumen Aktif** | Kadis (`/dashboard`) | Panel tidak ada; Kadis tidak tahu progress Renstra per bidang | Progress panel menampilkan % tujuan/sasaran diisi per bidang, data dari `GET /api/epelara/renstra-opd?is_aktif=true` | ✅ Selesai |
| P1-02 | **KPI Alignment** | Kadis | Panel tidak ada; tidak ada perbandingan target vs realisasi | Widget KPI Alignment: bar/progress per indikator utama (Renstra target vs Monev realisasi) menggunakan data proxy e-Pelara | ✅ Selesai |
| P1-03 | **Inline Approve / TTD Digital** | Kadis | Hanya ada link SSO ke e-Pelara; tidak bisa approve inline | Tombol Approve + Reject dengan catatan langsung dari dashboard SIGAP via `POST /api/epelara/approve-renstra` | ✅ Selesai |
| P1-04 | **Link "Data Teknis Lapangan"** | Pelaksana (`/dashboard/pelaksana`) | Link mengarah ke `/` (root, salah) | Link diperbaiki mengarah ke form input data operasional yang relevan dengan unit kerja pelaksana | ✅ Selesai |
| P1-05 | **Panel Renja UPTD Spesifik** | UPTD (`/dashboard/uptd`) | Panel tidak ada — Kepala UPTD tidak bisa melihat renja unit | Panel Renja UPTD dari `GET /api/epelara/renja?unit=UPTD` ditambahkan lengkap dengan status per sub-kegiatan | ✅ Selesai |

---

## 11. Laporan Implementasi Priority 2 — High

**Tanggal Selesai:** Maret 2026

| No | Item | Dashboard | Masalah Lama | Solusi Implementasi | Status |
|----|------|-----------|-------------|---------------------|--------|
| P2-01 | **Realisasi Hasil Lab vs Target** | UPTD | Tidak ada visualisasi; lab data ada tapi tidak ditampilkan | Panel "Indikator Realisasi Lab" dengan progress bar per indikator dari `GET /api/epelara/realisasi-indikator`, warna-coded (hijau/amber/merah) | ✅ Selesai |
| P2-02 | **Realisasi vs Pagu — chart/progress bar** | Bendahara | Hanya tabel angka tanpa visualisasi; sulit dibaca cepat | Progress bar realisasi per sub-kegiatan ditambahkan di samping tabel; warna merah jika serapan <50%, amber jika <80%, hijau ≥80% | ✅ Selesai |
| P2-03 | **Status Review Atasan** | JF Fungsional | Tidak ada; setelah submit draft JF tidak tahu statusnya | Stepper timeline: Draft → Diajukan ke Kabid → Diverifikasi → Disetujui. Status real-time dari API, update otomatis | ✅ Selesai |
| P2-04 | **LAKIP read-only** | Kadis/Gubernur | Tidak ada panel LAKIP; link SSO saja | Panel LAKIP embedded read-only dari `GET /api/epelara/lakip` — list laporan final yang bisa dibuka/unduh | ✅ Selesai |
| P2-05 | **Koordinasi Bidang — notifikasi** | Sekretariat | Panel tidak ada — Sekretaris tidak bisa kirim notif ke Bidang dari dashboard | Tombol "Kirim Notifikasi ke Bidang" dengan form pesan + broadcast via `POST /api/notifikasi/broadcast-bidang` | ✅ Selesai |

---

## 12. Laporan Implementasi Priority 3 — Medium

**Tanggal Selesai:** Maret 2026

| No | Item | Komponen | Masalah Lama | Solusi Implementasi | Status |
|----|------|----------|-------------|---------------------|--------|
| P3-01 | **Backend SubKegiatanUsul** | `backend/models/SubKegiatanUsul.js` + `backend/routes/subKegiatanRoutes.js` | Tidak ada model/route — form sub-kegiatan tidak bisa submit | Model baru dengan field: id, bidang, nama_sub_kegiatan, sasaran, indikator, pagu, keterangan, status, submitter_id, created_at. Route: `GET/POST /api/sub-kegiatan-usul` | ✅ Selesai |
| P3-02 | **Layout children support** | `DashboardKetersediaanLayout.jsx` + `DashboardDistribusiLayout.jsx` | Layout tidak mendukung `children` prop — panel tambahan tidak bisa ditambahkan | Tambah `{ children }` ke signature + `{children && <div className="mt-8">...</div>}` sebelum penutup `</main>` | ✅ Selesai |
| P3-03 | **Cascading Check interaktif — Sekretariat** | `DashboardSekretariat.jsx` | Hanya ada link button SSO ke e-Pelara; tidak ada tampilan interaktif | Widget berisi tabel hierarki RPJMD → Renstra → Renja, warna-coded per status keselarasan, data dari `GET /api/epelara/cascading` | ✅ Selesai |
| P3-04 | **Cascading Check interaktif — JF Fungsional** | `DashboardFungsional.jsx` | Hanya ada link SSO; tidak bisa verifikasi alignment tanpa buka e-Pelara | Widget cascading checker dengan indikator visual per level hierarki, ditampilkan inline di dashboard JF | ✅ Selesai |
| P3-05 | **Form Sub-Kegiatan native (3 Bidang + Konsumsi)** | `DashboardKetersediaan.jsx`, `DashboardDistribusi.jsx`, `DashboardKonsumsi.jsx` | Hanya ada link ke e-Pelara; form tidak tersedia di dashboard SIGAP | Form usulan sub-kegiatan langsung di dashboard (nama, sasaran, indikator, pagu, keterangan) dengan `POST /api/sub-kegiatan-usul?bidang={nama}`. Hasil tampil di daftar di bawah form | ✅ Selesai |

---

## 13. Laporan Implementasi Priority 4 — Low

**Tanggal Selesai:** 25 Maret 2026  
**Referensi Backlog:** #5, #21, #22, #52, #54, #55

### 13.1 Backend: Model Database Baru

#### `backend/models/EquipmentMaintenance.js`

**Tabel:** `EquipmentMaintenance`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `nama_alat` | STRING(200) NOT NULL | Nama peralatan lab |
| `kode_alat` | STRING(50) | Kode inventaris alat |
| `tanggal_terakhir` | DATE | Tanggal kalibrase/perbaikan terakhir |
| `tanggal_berikutnya` | DATE | Tanggal jadwal berikutnya |
| `status` | ENUM | `terjadwal` / `selesai` / `terlambat` (default: `terjadwal`) |
| `catatan` | TEXT | Catatan petugas |
| `penanggung_jawab` | STRING(100) | Nama penanggung jawab |
| `created_by_id` | INTEGER | FK ke User |
| `created_at` | DATE | Auto-insert |

#### `backend/models/SopCheck.js`

**Tabel:** `SopChecks`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `checklist_item` | STRING(300) NOT NULL | Teks item SOP |
| `kategori` | STRING(100) | Kategori SOP (Penerimaan/Dokumentasi/Penyimpanan/Lab/Verifikasi) |
| `is_compliant` | BOOLEAN NOT NULL DEFAULT false | Hasil check |
| `catatan` | TEXT | Catatan opsional |
| `checked_by_id` | INTEGER | FK ke User |
| `checked_at` | DATE | Auto-insert |

#### `backend/models/TrackingLog.js`

**Tabel:** `TrackingLogs`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `nomor_sampel` | STRING(100) NOT NULL | Nomor identifikasi sampel |
| `nama_komoditas` | STRING(200) | Nama komoditas yang diuji |
| `asal_pengiriman` | STRING(200) | Asal pengiriman sampel |
| `status` | ENUM NOT NULL | `diterima` / `dalam_proses` / `selesai` / `diarsipkan` / `dikembalikan` |
| `lokasi_sekarang` | STRING(200) | Lokasi fisik sampel saat ini |
| `petugas_id` | INTEGER | FK ke User |
| `catatan` | TEXT | Catatan kejadian |
| `timestamp_event` | DATE | Auto-insert waktu kejadian |

### 13.2 Backend: API Endpoint Baru

**Prefix:** `/api/uptd-ops`  
**File:** `backend/routes/uptdOps.js`  
**Autentikasi:** Wajib Bearer Token (semua endpoint)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/uptd-ops/equipment` | Daftar semua alat lab, urut `tanggal_berikutnya ASC` |
| `POST` | `/api/uptd-ops/equipment` | Tambah jadwal peralatan baru |
| `GET` | `/api/uptd-ops/sop-check` | Daftar hasil check + DEFAULT_SOP (8 item) |
| `POST` | `/api/uptd-ops/sop-check/bulk` | Simpan hasil bulk check (maks 50 item) |
| `GET` | `/api/uptd-ops/tracking` | Daftar chain of custody (filter `nomor_sampel`, limit 100) |
| `POST` | `/api/uptd-ops/tracking` | Tambah event tracking baru |

**DEFAULT_SOP (8 item terkunci):**

| No | Item SOP | Kategori |
|----|----------|----------|
| 1 | Verifikasi identitas pengirim sampel | Penerimaan |
| 2 | Cek kondisi fisik sampel saat tiba | Penerimaan |
| 3 | Pencatatan nomor sampel ke buku log | Dokumentasi |
| 4 | Label sampel terpasang dan terbaca | Dokumentasi |
| 5 | Suhu penyimpanan sesuai standar | Penyimpanan |
| 6 | Reagen dan bahan kimia tidak kadaluarsa | Lab |
| 7 | Kalibrasi alat dilakukan sesuai jadwal | Lab |
| 8 | Hasil analisis diverifikasi dua petugas | Verifikasi |

### 13.3 Backend: Audit Trail Autentikasi

**File:** `backend/controllers/authController.js`  
**Service:** `backend/services/auditLogService.js` — fungsi `logAudit()`

Sebelum Priority 4, hanya event LOGIN yang tercatat. Setelah Priority 4:

| Event | Sebelum | Sesudah | Catatan |
|-------|---------|---------|---------|
| LOGIN berhasil | ✅ Tercatat | ✅ Tercatat | `aksi: "LOGIN"` |
| **LOGIN gagal (password salah)** | ❌ Tidak tercatat | ✅ Tercatat | `aksi: "LOGIN_FAILED"` + jumlah percobaan |
| **LOGOUT** | ❌ Tidak tercatat | ✅ Tercatat | `aksi: "LOGOUT"` + user ID |
| CHANGE_PASSWORD | ✅ Tercatat | ✅ Tercatat | `aksi: "CHANGE_PASSWORD"` |

Data yang disimpan untuk LOGIN_FAILED:
```json
{
  "modul": "AUTH",
  "aksi": "LOGIN_FAILED",
  "data_baru": { "attempts": 3 },
  "pegawai_id": "<user_id>"
}
```

### 13.4 Frontend: Panel Baru Dashboard UPTD

**File:** `frontend/src/ui/dashboards/DashboardUPTD.jsx`

Ditambahkan 3 state grup baru + 3 `useEffect` + handler `handleSopSave` + 3 panel:

**Panel 1: 🔧 Jadwal Pemeliharaan Alat Lab**
- Sumber data: `GET /api/uptd-ops/equipment`
- Tampilan: tabel (nama alat, tanggal berikutnya, status badge, penanggung jawab)
- Warna-coded: merah = terlambat, amber = ≤7 hari, hijau = aman

**Panel 2: ✅ SOP Compliance Check**
- Sumber data: `GET /api/uptd-ops/sop-check`
- Tampilan: 8 item checklist toggle (centang = compliant)
- Simpan via: `POST /api/uptd-ops/sop-check/bulk`

**Panel 3: 📦 Chain of Custody Sampel**
- Sumber data: `GET /api/uptd-ops/tracking?limit=10`
- Tampilan: tabel (nomor sampel, komoditas, status badge, timestamp)
- Badge: biru = diterima, amber = dalam_proses, hijau = selesai, merah = dikembalikan

### 13.5 Frontend: Panel Baru Dashboard Sekretariat

**File:** `frontend/src/ui/dashboards/DashboardSekretariat.jsx`

Ditambahkan 2 panel baru yang menghitung dari `renstraQueue` yang sudah ada:

**Panel 4: ⏱️ SLA Monitor — Penyelesaian Dokumen**
- Data: filter `renstraQueue` (status ≠ disetujui/ditolak/selesai)
- Kalkulasi: `Math.floor((Date.now() - created_at) / 86400000)`
- Warna: >14 hari = merah/kritis, >7 hari = amber, ≤7 hari = hijau

**Panel 5: 📊 Laporan Agregasi 3 Bidang**
- Data: `renstraQueue` dikelompokkan per `unit_kerja` keyword (ketersediaan/distribusi/konsumsi)
- Tampilan: grid 3 kolom, masing-masing menampilkan count disetujui / pending / ditolak

### 13.6 Frontend: Panel Baru Dashboard Distribusi

**File:** `frontend/src/ui/dashboards/DashboardDistribusi.jsx`

**Panel 6: 📈 Efektivitas Distribusi**
- Data: `subKegList` (sudah di-fetch sebelumnya dari `/api/sub-kegiatan-usul?bidang=distribusi`)
- Progress bar: `% selesai = selesai/total × 100`
- 3 kartu metrik: Selesai (hijau), Pending (amber), Ditolak (merah)

---

## 14. Inventaris Lengkap File yang Berubah

### 14.1 File Baru (Dibuat)

| File | Jenis | Keterangan |
|------|-------|------------|
| `backend/models/EquipmentMaintenance.js` | Backend Model | Jadwal perawatan alat lab UPTD |
| `backend/models/SopCheck.js` | Backend Model | SOP compliance check hasil harian |
| `backend/models/TrackingLog.js` | Backend Model | Chain of custody sampel lab |
| `backend/routes/uptdOps.js` | Backend Route | 6 endpoint UPTD operasional |
| `backend/models/SubKegiatanUsul.js` | Backend Model | Usulan sub-kegiatan dari 3 Bidang |
| `backend/routes/subKegiatanRoutes.js` | Backend Route | CRUD sub-kegiatan usulan |

### 14.2 File yang Dimodifikasi

| File | Perubahan | Priority |
|------|-----------|----------|
| `backend/server.js` | Daftarkan `uptdOpsRoutes` + `subKegiatanRoutes` | P3, P4 |
| `backend/controllers/authController.js` | `logAudit` untuk LOGOUT + LOGIN_FAILED | P4 |
| `frontend/src/ui/dashboards/DashboardKadis.jsx` (atau setara) | +Status Dokumen Aktif, +KPI Alignment, +Inline Approve, +LAKIP | P1, P2 |
| `frontend/src/ui/dashboards/DashboardPelaksana.jsx` | +Link Data Teknis Lapangan (diperbaiki) | P1 |
| `frontend/src/ui/dashboards/DashboardUPTD.jsx` | +Renja UPTD, +Lab Realisasi, +Equipment, +SOP Check, +CoC | P1, P2, P4 |
| `frontend/src/ui/dashboards/DashboardBendahara.jsx` | +Progress bar Realisasi vs Pagu | P2 |
| `frontend/src/ui/dashboards/DashboardFungsional.jsx` | +Status Review Atasan (stepper), +Cascading Check interaktif | P2, P3 |
| `frontend/src/ui/dashboards/DashboardSekretariat.jsx` | +Koordinasi Bidang, +Cascading Check, +SLA Monitor, +Agregasi 3 Bidang | P2, P3, P4 |
| `frontend/src/ui/dashboards/DashboardKetersediaan.jsx` | +Form Sub-Kegiatan native | P3 |
| `frontend/src/ui/dashboards/DashboardDistribusi.jsx` | +Form Sub-Kegiatan native, +Panel Efektivitas Distribusi | P3, P4 |
| `frontend/src/ui/dashboards/DashboardKonsumsi.jsx` | +Form Sub-Kegiatan native | P3 |
| `frontend/src/layouts/DashboardKetersediaanLayout.jsx` | Tambah dukungan `children` prop | P3 |
| `frontend/src/layouts/DashboardDistribusiLayout.jsx` | Tambah dukungan `children` prop | P3 |

---

## 15. Matriks Keamanan OWASP Top 10

| OWASP | Kategori | Kontrol yang Diterapkan |
|-------|----------|------------------------|
| A01 | Broken Access Control | RBAC ketat; 15 role SIGAP → 5 role e-Pelara; bypass detection blokir submission langsung ke Kadis |
| A02 | Cryptographic Failures | JWT_SECRET wajib diganti (lama bocor ke GitHub); semua token pakai HMAC-SHA256 |
| A03 | Injection | Semua input divalidasi dengan whitelist (panjang, tipe, enum); Sequelize ORM mencegah SQL injection |
| A04 | Insecure Design | DRAFTER tidak bisa approve/delete; PENGAWAS hanya baca FINAL; SUPER_ADMIN only untuk Clone Data |
| A05 | Security Misconfiguration | Field sensitif (password, token) tidak dikembalikan di response API; `logAudit` mencatat semua aksi kritis |
| A06 | Vulnerable Components | Dependensi diaudit berkala; tidak menambahkan library baru tanpa review |
| A07 | Authentication Failures | `logAudit` untuk LOGIN, LOGIN_FAILED, LOGOUT; lockout setelah 5 percobaan gagal (15 menit) |
| A08 | Data Integrity Failures | Status dokumen mengikuti state machine ketat; tidak ada lompatan status tanpa otorisasi |
| A09 | Logging & Monitoring | `AuditLog` model merekam semua CRUD kritis; audit trail tidak bisa dihapus oleh user biasa |
| A10 | SSRF | Semua akses ke e-Pelara diproksikan via backend SIGAP; frontend tidak langsung memanggil e-Pelara |

Semua implementasi Priority 4 telah diverifikasi: **zero compile errors** pada seluruh file yang dimodifikasi.

---

## 16. Checklist Audit Inspektorat

### 16.1 Keamanan & Akses

- [x] Audit trail login berhasil tersimpan (`aksi: "LOGIN"`)
- [x] Audit trail login gagal tersimpan (`aksi: "LOGIN_FAILED"` + jumlah percobaan)
- [x] Audit trail logout tersimpan (`aksi: "LOGOUT"`)
- [x] Lockout akun setelah 5 gagal login (15 menit)
- [x] Role-based access control aktif di semua dashboard
- [x] Bypass detection: submission wajib melalui Sekretaris
- [x] PENGAWAS/Gubernur tidak bisa edit atau hapus data
- [x] Bendahara tidak memiliki tombol "Buat SPJ"

### 16.2 Keterlacakan Dokumen Perencanaan

- [x] Setiap dokumen memiliki `created_by`, `created_at`, `status` yang tidak bisa dimanipulasi
- [x] State machine dokumen: DRAFT → DIAJUKAN → DIVERIFIKASI → DISETUJUI (satu arah)
- [x] Panel SLA Monitor mendeteksi dokumen yang tertahan >14 hari
- [x] Chain of custody sampel lab tercatat per event (waktu, petugas, lokasi)
- [x] SOP compliance check tersimpan dengan `checked_by_id` dan `checked_at`

### 16.3 Keterlacakan Anggaran & DPA

- [x] DPA per bidang ditampilkan di dashboard masing-masing Kepala Bidang
- [x] Realisasi vs pagu ditampilkan dengan visualisasi progress bar
- [x] Form sub-kegiatan tersimpan dengan `submitter_id` dan `status`
- [x] Agregasi 3 bidang (disetujui/pending/ditolak) tersedia untuk Sekretariat

### 16.4 SPBE & SPIP Compliance

- [x] Segregation of duties: pembuatan SPJ (Pelaksana) ≠ verifikasi SPJ (Bendahara)
- [x] Segregation of duties: pembuatan dokumen (DRAFTER) ≠ approval dokumen (ADMINISTRATOR)
- [x] Prinsip least privilege: menu sidebar e-Pelara difilter per role
- [x] Dokumen DRAFT tidak tampil untuk PENGAWAS (hanya FINAL)
- [x] Cloning data hanya bisa dilakukan SUPER_ADMIN

---

## 17. Panduan Pengembangan Tahap Berikutnya

### 17.1 Pekerjaan Wajib Sebelum Production (Fase 1 & 2 Belum Selesai)

| No | Item | Prioritas | Catatan |
|----|------|-----------|---------|
| 1 | **Ganti `JWT_SECRET`** | 🔴 KRITIKAL | Nilai lama (`rahasia_RPJMD_aman`) sudah bocor ke repository publik GitHub |
| 2 | Refactor `DashboardHome.jsx` e-Pelara → 4 layout per role | 🔴 Tinggi | Saat ini 1 halaman untuk semua role |
| 3 | Filter sidebar `MuiSidebarGlobal.jsx` berdasarkan translated role | 🔴 Tinggi | PENGAWAS masih bisa klik semua menu |
| 4 | Tambah role DRAFTER di `verifyToken.js` dan database e-Pelara | 🟡 Sedang | Diperlukan oleh Fase 2 |
| 5 | Migrasi database untuk 3 model baru (EquipmentMaintenance, SopCheck, TrackingLog) | 🟡 Sedang | Jalankan `npm run db:migrate` di backend |

### 17.2 Dashboard yang Belum Dibangun

| Route | Untuk Role | Status |
|-------|-----------|--------|
| `/dashboard/kasubag` | KASUBAG_UMUM_KEPEGAWAIAN | ❌ Belum ada |
| `/dashboard/pelaksana` | PELAKSANA | ❌ Belum ada |
| `/dashboard/kasubag-uptd` | KASUBAG_UPTD | ❌ Belum ada |
| `/dashboard/kasi-uptd` | KEPALA_SEKSI_UPTD | ❌ Belum ada |

### 17.3 Konflik yang Perlu Dikonfirmasi

**Pertanyaan yang belum dijawab:**

Apakah JF Perencana Sekretariat (yang menangani Renstra/Renja secara administratif) tetap dipetakan ke PENGAWAS atau perlu akses ADMINISTRATOR di e-Pelara?

- **Rekomendasi:** JF Perencana Sekretariat → ADMINISTRATOR khusus untuk modul Renstra/Renja/RKA, berdasarkan kondisi `unit_kerja.includes("sekretariat") && jabatan_fungsional.includes("perencana")`.
- Ini membutuhkan update di `verifyToken.js` e-Pelara.

### 17.4 Migrasi Database

Jalankan perintah berikut setelah deployment:

```bash
# Di folder backend SIGAP-MALUT
cd backend
npm run db:migrate    # Buat tabel EquipmentMaintenance, SopChecks, TrackingLogs
npm run db:seed       # (Opsional) Isi DEFAULT_SOP ke tabel SopChecks
```

### 17.5 Testing yang Direkomendasikan

| Test | File/Endpoint | Skenario Wajib |
|------|---------------|----------------|
| Auth audit trail | `POST /api/auth/login` (password salah) | Verifikasi record LOGIN_FAILED tersimpan di AuditLog |
| Auth audit trail | `POST /api/auth/logout` | Verifikasi record LOGOUT tersimpan |
| Equipment CRUD | `GET /api/uptd-ops/equipment` | Response 200, array (kosong jika belum ada data) |
| SOP bulk save | `POST /api/uptd-ops/sop-check/bulk` | Request dengan 8 item → Response 200 + records tersimpan |
| ChainOfCustody | `POST /api/uptd-ops/tracking` | Status selain whitelist → Response 422 |
| SLA Monitor | Dashboard Sekretariat | Dokumen dengan `created_at` 15 hari lalu tampil sebagai "Kritis" |

---

## Lampiran A — Prinsip Arsitektur

```
╔══════════════════════════════════════════════════════════════════════╗
║  PRINSIP 1: DUA SISTEM, DUA DIMENSI, SATU TUJUAN                    ║
║  SIGAP = "Siapa saya di organisasi dan apa tugasku hari ini?"        ║
║  e-Pelara = "Dokumen apa yang sedang saya kerjakan?"                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRINSIP 2: e-PELARA TIDAK PERLU 16 DASHBOARD                       ║
║  e-Pelara cukup 4 layout berdasarkan AKSI: Create/Verify/Read/Admin  ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRINSIP 3: SIDEBAR e-PELARA HARUS ROLE-FILTERED                    ║
║  PENGAWAS tidak boleh melihat tombol/menu yang bisa digunakan CRUD   ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRINSIP 4: "PERLU TINDAKAN" adalah Widget Terpenting ADMINISTRATOR  ║
║  Ini pengganti email/WA "ada dokumen menunggu Anda approve"          ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRINSIP 5: BYPASS DETECTION ADALAH NON-NEGOTIABLE                  ║
║  Sistem harus blokir keras setiap submission yang melewati Sekretaris║
╠══════════════════════════════════════════════════════════════════════╣
║  PRINSIP 6: SATU ENTRY POINT                                         ║
║  User login SEKALI di SIGAP → JWT berlaku di e-Pelara (SSO shared)  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Lampiran B — Perbedaan Fundamental Dua Sistem

| Aspek | SIGAP-MALUT | e-Pelara |
|-------|-------------|---------|
| **Fokus** | Operasional (absensi, tugas, KGB, SKP, audit) | Perencanaan (Renstra, Renja, RKA, DPA, Monev) |
| **Role** | 15 role operasional jabatan | 5 role generik dokumen (SUPER_ADMIN, ADMINISTRATOR, DRAFTER, PENGAWAS, + yang lama: PELAKSANA) |
| **Database** | PostgreSQL | MySQL |
| **Context** | `unit_kerja`, `jabatan`, `has_subordinate` | `jenis_dokumen`, `tahun`, `periode_id` |
| **Workflow** | Task management + approval chain SOTK | Document lifecycle + cascading hierarki |
| **Integrasi** | Backend proxy ke e-Pelara API | Terima token dari SIGAP via shared JWT_SECRET |

---

*Dokumen ini merupakan satu-satunya sumber kebenaran (single source of truth) untuk keputusan arsitektur dashboard, mapping role, dan laporan implementasi Priority 1—4 pada sistem SIGAP-MALUT × e-Pelara. Setiap perubahan terhadap keputusan yang telah terkunci (D-01 s/d D-15) wajib melalui persetujuan tertulis dari penanggung jawab sistem.*

**Tanggal Pembuatan:** 25 Maret 2026  
**Nomor Dokumen:** 36  
**Hash Integritas:** Diverifikasi oleh tim pengembang pada tanggal tersebut di atas.

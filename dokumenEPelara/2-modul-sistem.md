# 2. MODUL-MODUL SISTEM e-PeLARA

> Dokumen ini mencatat seluruh modul fungsional sistem e-PeLARA beserta fungsi, entitas data, dan API endpoint utamanya.
> Wajib diperbarui setiap ada penambahan atau perubahan modul.

---

## 2.1 Peta Siklus Dokumen Perencanaan

```
RPJMD (5 tahunan)
  └── RENSTRA OPD (5 tahunan, per OPD)
        └── RKPD (tahunan, seluruh daerah)
              └── RENJA OPD (tahunan, per OPD)
                    └── RKA (Rencana Kerja & Anggaran)
                          └── DPA (Dokumen Pelaksanaan Anggaran)
                                └── Realisasi (bulanan + per indikator)
                                      └── Monev & Evaluasi
                                            └── LAKIP / LPK-Dispang / LK-Dispang
```

---

## 2.2 Daftar Modul Lengkap

### MODUL 1 — RPJMD (Rencana Pembangunan Jangka Menengah Daerah)

| Item                | Detail                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fungsi**          | Pengelolaan rencana pembangunan daerah 5 tahunan                                                                                                                     |
| **Regulasi**        | Permendagri 86/2017, UU 25/2004                                                                                                                                      |
| **Entitas Utama**   | `RPJMD`, `Visi`, `Misi`, `Tujuan`, `Sasaran`, `Strategi`, `ArahKebijakan`, `Program`, `Kegiatan`, `SubKegiatan`                                                      |
| **Hierarki Data**   | RPJMD → Visi → Misi → Tujuan → Sasaran → Program → Kegiatan → SubKegiatan                                                                                            |
| **API Prefix**      | `/api/rpjmd`, `/api/visi`, `/api/misi`, `/api/tujuan`, `/api/sasaran`, `/api/strategi`, `/api/arah-kebijakan`, `/api/programs`, `/api/kegiatan`, `/api/sub-kegiatan` |
| **File Controller** | `controllers/` (misiController, tujuanController, sasaranController, dll)                                                                                            |

**Hierarki Lengkap:**

```
PeriodeRpjmd (mis. 2025–2029)
  └── RPJMD (nama, kepala daerah, periode)
        └── Visi (isi visi, tahun awal-akhir)
              └── Misi [1..n] (no_misi, isi_misi)
                    └── Tujuan [1..n] ← IndikatorTujuan
                          └── Sasaran [1..n] ← IndikatorSasaran
                                ├── Strategi [1..n]
                                ├── ArahKebijakan [1..n]
                                └── Program [1..n] ← IndikatorProgram
                                      └── Kegiatan [1..n] ← IndikatorKegiatan
                                            └── SubKegiatan [1..n]
```

---

### MODUL 2 — INDIKATOR KINERJA

| Item              | Detail                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fungsi**        | Penetapan dan pengelolaan indikator kinerja di setiap level perencanaan                                                                                                    |
| **Regulasi**      | Permendagri 86/2017 (Bab IX)                                                                                                                                               |
| **Entitas Utama** | `Indikator`, `IndikatorMisi`, `IndikatorTujuan`, `IndikatorSasaran`, `IndikatorProgram`, `IndikatorKegiatan`, `IndikatorDetail`, `RealisasiIndikator`                      |
| **Fitur**         | Wizard input indikator multi-level, target per tahun (tahun 1–5), baseline, satuan, penanggung jawab                                                                       |
| **API Prefix**    | `/api/indikators`, `/api/indikator-wizard`, `/api/indikator-misi`, `/api/indikator-tujuans`, `/api/indikator-sasaran`, `/api/indikator-program`, `/api/indikator-kegiatan` |

---

### MODUL 3 — CASCADING PERENCANAAN

| Item                 | Detail                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Fungsi**           | Visualisasi dan pengelolaan keterkaitan antara prioritas nasional, daerah, gubernur dengan RPJMD                        |
| **Regulasi**         | Permendagri 90/2019 (klasifikasi, kodefikasi, dan nomenklatur)                                                          |
| **Entitas Utama**    | `Cascading`, `CascadingStrategi`, `CascadingArahKebijakan`, `PrioritasNasional`, `PrioritasDaerah`, `PrioritasGubernur` |
| **Peta Keterkaitan** | Prioritas Nasional ↔ Prioritas Daerah ↔ Prioritas Gubernur ↔ Misi/Tujuan/Sasaran/Program/Kegiatan                       |
| **Relasi**           | Many-to-many via junction table `cascading_strategi` dan `cascading_arah_kebijakan`                                     |
| **API Prefix**       | `/api/cascading`, `/api/prioritas-nasional`, `/api/prioritas-daerah`, `/api/prioritas-gubernur`                         |
| **Frontend**         | Visualisasi Sankey diagram & Sunburst chart                                                                             |

---

### MODUL 4 — RENSTRA OPD (Rencana Strategis OPD)

| Item                    | Detail                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fungsi**              | Pengelolaan rencana strategis per Organisasi Perangkat Daerah (OPD), mengacu RPJMD. **Siklus: 6 tahun** (target_tahun_1 s.d. target_tahun_6 & pagu_tahun_1 s.d. pagu_tahun_6)                                                                                                                                                                                                                                |
| **Regulasi**            | Permendagri 86/2017 (Bab VI)                                                                                                                                                                                                                                                                                                                                                                                 |
| **Entitas Utama**       | `RenstraOPD`, `RenstraTujuan`, `RenstraSasaran`, `RenstraStrategi`, `RenstraKebijakan`, `RenstraProgram`, `RenstraKegiatan`, `RenstraSubkegiatan`, `IndikatorRenstra`, `RenstraTarget`, `RenstraTabelTujuan`, `RenstraTabelSasaran`, `RenstraTabelProgram`, `RenstraTabelKegiatan`, `RenstraTabelSubkegiatan`                                                                                                |
| **Fitur**               | Multi-OPD, tabel program/kegiatan/subkegiatan/tujuan/sasaran (6 tahun), clone data, export PDF/Excel/Word                                                                                                                                                                                                                                                                                                    |
| **API Prefix**          | `/api/renstra-opd`, `/api/renstra-tujuan`, `/api/renstra-sasaran`, `/api/renstra-strategi`, `/api/renstra-kebijakan`, `/api/renstra-program`, `/api/renstra-kegiatan`, `/api/renstra-subkegiatan`, `/api/indikator-renstra`, `/api/renstra-target`, `/api/renstra-tabel-tujuan`, `/api/renstra-tabel-sasaran`, `/api/renstra-tabel-program`, `/api/renstra-tabel-kegiatan`, `/api/renstra-tabel-subkegiatan` |
| **Relasi ke RPJMD**     | `RenstraSasaran.rpjmd_sasaran_id` → `Sasaran.id`                                                                                                                                                                                                                                                                                                                                                             |
| **⚠️ Perbedaan Siklus** | RPJMD = **5 tahun** (target_tahun_1–5); Renstra OPD = **6 tahun** (target_tahun_1–6). Kalkulasi `target_akhir_renstra` = rata-rata 6 tahun via `renstraCalculationService.js`                                                                                                                                                                                                                                |

---

### MODUL 5 — RKPD (Rencana Kerja Pemerintah Daerah)

| Item                    | Detail                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Fungsi**              | Pengelolaan rencana kerja tahunan pemerintah daerah, integrasi ke prioritas                                 |
| **Regulasi**            | Permendagri 86/2017 (Bab IV)                                                                                |
| **Entitas Utama**       | `Rkpd`, `PrioritasNasional`, `PrioritasDaerah`, `PrioritasGubernur`                                         |
| **Relasi**              | RKPD ↔ Visi, Misi, Tujuan, Sasaran, Strategi, ArahKebijakan, Program, Kegiatan, SubKegiatan, RenstraProgram |
| **Relasi Many-to-Many** | `rkpd_prioritas_nasional`, `rkpd_prioritas_daerah`, `rkpd_prioritas_gubernur`                               |
| **API Prefix**          | `/api/rkpd`, `/api/rkpd-init`                                                                               |

---

### MODUL 6 — RENJA (Rencana Kerja OPD)

| Item              | Detail                                                           |
| ----------------- | ---------------------------------------------------------------- |
| **Fungsi**        | Rencana kerja tahunan per OPD, turunan dari Renstra OPD dan RKPD |
| **Regulasi**      | Permendagri 86/2017 (Bab V)                                      |
| **Entitas Utama** | `Renja`                                                          |
| **Relasi**        | LAKIP.renja_id → Renja.id                                        |
| **API Prefix**    | `/api/renja`                                                     |

---

### MODUL 7 — RKA (Rencana Kerja dan Anggaran)

| Item              | Detail                                         |
| ----------------- | ---------------------------------------------- |
| **Fungsi**        | Penganggaran kegiatan dan sub kegiatan per OPD |
| **Regulasi**      | Permendagri 77/2020                            |
| **Entitas Utama** | `Rka`                                          |
| **API Prefix**    | `/api/rka`                                     |

---

### MODUL 8 — DPA (Dokumen Pelaksanaan Anggaran)

| Item              | Detail                                      |
| ----------------- | ------------------------------------------- |
| **Fungsi**        | Pengesahan dan pelaksanaan anggaran per OPD |
| **Regulasi**      | Permendagri 77/2020                         |
| **Entitas Utama** | `Dpa`                                       |
| **API Prefix**    | `/api/dpa`                                  |

---

### MODUL 9 — BMD (Barang Milik Daerah)

| Item              | Detail                                                                           |
| ----------------- | -------------------------------------------------------------------------------- |
| **Fungsi**        | Pencatatan dan pengelolaan barang milik daerah                                   |
| **Regulasi**      | PP 27/2014, Permendagri 19/2016                                                  |
| **Entitas Utama** | `Bmd`                                                                            |
| **Field Utama**   | nama_barang, kode_barang, tahun_perolehan, kondisi, nilai_perolehan, sumber_dana |
| **API Prefix**    | `/api/bmd`                                                                       |

---

### MODUL 10 — PENATAUSAHAAN

| Item              | Detail                                    |
| ----------------- | ----------------------------------------- |
| **Fungsi**        | Manajemen keuangan dan pengeluaran daerah |
| **Regulasi**      | Permendagri 77/2020                       |
| **Entitas Utama** | `Penatausahaan`                           |
| **API Prefix**    | `/api/penatausahaan`                      |

---

### MODUL 11 — PENGKEG (Pengendalian Kegiatan)

| Item              | Detail                                           |
| ----------------- | ------------------------------------------------ |
| **Fungsi**        | Monitoring dan pengendalian pelaksanaan kegiatan |
| **Entitas Utama** | `Pengkeg`                                        |
| **API Prefix**    | `/api/pengkeg`                                   |

---

### MODUL 12 — MONEV (Monitoring & Evaluasi)

| Item              | Detail                                                          |
| ----------------- | --------------------------------------------------------------- |
| **Fungsi**        | Monitoring dan evaluasi kinerja program, kegiatan, sub kegiatan |
| **Regulasi**      | Permendagri 86/2017 (Bab X)                                     |
| **Entitas Utama** | `Monev`, `Evaluasi`, `RealisasiBulanan`, `RealisasiIndikator`   |
| **Validasi**      | Joi schema validation untuk input monev                         |
| **API Prefix**    | `/api/monev`, `/api/evaluasi`, `/api/realisasi-indikator`       |

---

### MODUL 13 — LAPORAN AKUNTABILITAS (LAKIP / LPK / LK)

| Item              | Detail                                                              |
| ----------------- | ------------------------------------------------------------------- |
| **Fungsi**        | Laporan akuntabilitas kinerja dan laporan keuangan akhir tahun      |
| **Regulasi**      | PermenPANRB 53/2014 (LAKIP), Permendagri 77/2020 (LK)               |
| **Entitas Utama** | `Lakip`, `LpkDispang`, `LkDispang`                                  |
| **Relasi**        | Lakip → RenstraProgram, Rkpd, Renja, LkDispang                      |
| **API Prefix**    | `/api/laporan`, `/api/lakip`, `/api/lpk-dispang`, `/api/lk-dispang` |

---

### MODUL 14 — DASHBOARD & MONITORING

| Item              | Detail                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Fungsi**        | Visualisasi capaian kinerja RPJMD, monitoring real-time                                                                            |
| **Entitas Utama** | `Indikator`, `RealisasiIndikator`                                                                                                  |
| **API Prefix**    | `/api/dashboard-monitoring`, `/api/kpi`, `/api/trend`, `/api/dashboard-rpjmd`, `/api/monitoring`, `/api/kinerja`                   |
| **⚠️ Catatan**    | `dashboardController.js` masih menggunakan `Math.random()` sebagai data realisasi — **HARUS diganti dengan query realisasi nyata** |

---

### MODUL 15 — REKOMENDASI AI

| Item               | Detail                                                                |
| ------------------ | --------------------------------------------------------------------- |
| **Fungsi**         | Analisis indikator RPJMD dan rekomendasi kebijakan menggunakan AI     |
| **Provider**       | OpenAI GPT-3.5-turbo (pertimbangkan upgrade ke GPT-4o)                |
| **Input**          | Daftar indikator (kode, nama, baseline, target 1–5, penanggung jawab) |
| **Output**         | Ringkasan rekomendasi kebijakan berbasis tren target                  |
| **Access Control** | Semua role (SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA)          |
| **API Prefix**     | `/api/rekomendasi-ai`                                                 |
| **Env diperlukan** | `OPENAI_API_KEY`                                                      |

---

### MODUL 16 — CLONE PERIODE

| Item           | Detail                                                    |
| -------------- | --------------------------------------------------------- |
| **Fungsi**     | Duplikasi data dari satu periode RPJMD ke periode baru    |
| **Kegunaan**   | Awal periode RPJMD baru tanpa input ulang data struktural |
| **API Prefix** | `/api/clone-periode`                                      |

---

### MODUL 17 — NOTIFIKASI REAL-TIME

| Item              | Detail                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **Fungsi**        | Pemberitahuan real-time antar pengguna dalam sistem                                              |
| **Teknologi**     | Socket.IO v4                                                                                     |
| **Entitas Utama** | `Notification`                                                                                   |
| **API Prefix**    | `/api/notifications`                                                                             |
| **⚠️ Catatan**    | Model `Notification` saat ini kosong (tidak ada field yang didefinisikan) — **perlu dilengkapi** |

---

### MODUL 18 — TANDA TANGAN DIGITAL

| Item           | Detail                                        |
| -------------- | --------------------------------------------- |
| **Fungsi**     | Penandatanganan dokumen PDF secara digital    |
| **Teknologi**  | @signpdf + node-forge (sertifikat P12/PKCS12) |
| **Regulasi**   | PP 71/2019, Perpres 95/2018 (SPBE)            |
| **API Prefix** | `/api/sign-pdf`                               |

---

### MODUL 19 — MANAJEMEN PENGGUNA & AKSES

| Item              | Detail                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Fungsi**        | Registrasi, login, manajemen role, dan hak akses pengguna                              |
| **Entitas Utama** | `User`, `Role`, `Division`, `OpdPenanggungJawab`                                       |
| **Role Tersedia** | SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA                                        |
| **API Prefix**    | `/api/auth`, `/api/users`, `/api/roles`, `/api/divisions`, `/api/opd-penanggung-jawab` |

---

## 2.3 Ringkasan Jumlah Route API

| Kategori                                              | Jumlah Route Group   | Catatan                                                                                                          |
| ----------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Global (auth, user, role, division, opd-pj)           | 5                    | + `/api/dokumen-options` sebagai config global                                                                   |
| Periode & Konfigurasi                                 | 3                    | periode-rpjmd, dokumen-options, clone-periode                                                                    |
| RPJMD Hierarki                                        | 11                   | rpjmd, visi, misi, tujuan, sasaran, strategi, arah-kebijakan, programs, kegiatan, sub-kegiatan, targets          |
| Indikator Kinerja                                     | 7                    | indikators, wizard, misi, tujuan, sasaran, program, kegiatan                                                     |
| Cascading & Prioritas                                 | 4                    | cascading, prio-nasional, prio-daerah, prio-gubernur                                                             |
| Renstra OPD                                           | 14                   | opd + 9 entitas + target + bab + export + **5 tabel** (tujuan/sasaran/program/kegiatan/subkegiatan)              |
| RKPD, Renja, RKA, DPA                                 | 5                    | rkpd + rkpd-init, renja, rka, dpa                                                                                |
| Penatausahaan, Pengkeg, BMD                           | 3                    |                                                                                                                  |
| Monev, Evaluasi, Realisasi                            | 4                    | monev, evaluasi, realisasi-indikator, realisasi-bulanan                                                          |
| Laporan (LAKIP, LPK, LK, laporan umum, laporan RPJMD) | 5                    |                                                                                                                  |
| Dashboard & Monitoring                                | 4                    | `/api/dashboard-monitoring`, `/api/kpi`, `/api/trend`, `/api/dashboard-rpjmd`, `/api/monitoring`, `/api/kinerja` |
| Utilitas (AI, Sign, Clone, Notif)                     | 4                    | rekomendasi-ai, sign-pdf, clone-periode, notifications                                                           |
| **Total**                                             | **~79+ route group** | Terverifikasi dari `server.js` per 23 Maret 2026                                                                 |

---

_Dokumen ini dibuat otomatis berdasarkan analisa kode sumber pada tanggal 23 Maret 2026._

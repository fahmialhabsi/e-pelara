# 4. PENILAIAN KESESUAIAN STANDAR PEMERINTAHAN DAERAH

> Dokumen ini merupakan hasil analisa kesesuaian sistem e-PeLARA terhadap regulasi dan standar pemerintahan daerah Indonesia yang berlaku.
> Digunakan sebagai **pedoman perbaikan dan pengembangan** sistem aplikasi e-PeLARA.

---

## 4.1 Regulasi Acuan

| No  | Regulasi                          | Tentang                                                                                         |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **UU No. 25 Tahun 2004**          | Sistem Perencanaan Pembangunan Nasional (SPPN)                                                  |
| 2   | **Permendagri No. 86 Tahun 2017** | Tata Cara Perencanaan, Pengendalian & Evaluasi Pembangunan Daerah (RPJMD, Renstra, RKPD, Renja) |
| 3   | **Permendagri No. 90 Tahun 2019** | Klasifikasi, Kodefikasi, dan Nomenklatur Perencanaan Pembangunan dan Keuangan Daerah            |
| 4   | **Permendagri No. 77 Tahun 2020** | Pedoman Teknis Pengelolaan Keuangan Daerah (RKA, DPA, Penatausahaan)                            |
| 5   | **Permendagri No. 70 Tahun 2019** | Sistem Informasi Pemerintahan Daerah (SIPD)                                                     |
| 6   | **PP No. 27 Tahun 2014**          | Pengelolaan Barang Milik Negara/Daerah (BMD)                                                    |
| 7   | **Permendagri No. 19 Tahun 2016** | Pedoman Pengelolaan Barang Milik Daerah                                                         |
| 8   | **PermenPANRB No. 53 Tahun 2014** | Petunjuk Teknis Perjanjian Kinerja & LAKIP                                                      |
| 9   | **Perpres No. 95 Tahun 2018**     | Sistem Pemerintahan Berbasis Elektronik (SPBE)                                                  |
| 10  | **PP No. 71 Tahun 2019**          | Penyelenggaraan Sistem dan Transaksi Elektronik                                                 |

---

## 4.2 Penilaian: Aspek Yang Sudah Sesuai ✅

| No  | Aspek                                                                                                          | Standar Acuan                   | Status    | Catatan                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hierarki RPJMD: Visi → Misi → Tujuan → Sasaran → Strategi → Arah Kebijakan → Program → Kegiatan → Sub Kegiatan | Permendagri 86/2017             | ✅ Sesuai | Struktur model lengkap dan telah terimplementasi                                                                                        |
| 2   | Periode RPJMD 5 tahunan dengan tahun awal dan tahun akhir                                                      | UU 25/2004 SPPN                 | ✅ Sesuai | Model `PeriodeRpjmd` dan `RPJMD` sudah tersedia                                                                                         |
| 3   | Renstra OPD mengacu ke RPJMD (relasi `rpjmd_id` pada `RenstraOPD`)                                             | Permendagri 86/2017             | ✅ Sesuai | Ada relasi ke `OpdPenanggungJawab` dan `RPJMD`                                                                                          |
| 4   | RKPD sebagai dokumen perencanaan tahunan turunan RPJMD                                                         | Permendagri 86/2017             | ✅ Sesuai | Model `Rkpd` memiliki relasi ke Visi, Misi, Tujuan, Sasaran, Program, Kegiatan, SubKegiatan                                             |
| 5   | Sinkronisasi Prioritas Nasional, Daerah, dan Gubernur dengan RPJMD via Cascading                               | Permendagri 90/2019             | ✅ Sesuai | Model `Cascading` menghubungkan ketiga prioritas ke hierarki RPJMD (many-to-many)                                                       |
| 6   | Indikator Kinerja per level: Misi, Tujuan, Sasaran, Program, Kegiatan                                          | Permendagri 86/2017             | ✅ Sesuai | Model terpisah: `IndikatorMisi`, `IndikatorTujuan`, `IndikatorSasaran`, `IndikatorProgram`, `IndikatorKegiatan`                         |
| 7   | Target per tahun (5 tahun) untuk setiap indikator                                                              | Permendagri 86/2017             | ✅ Sesuai | Field `target_tahun_1` s/d `target_tahun_5` tersedia di model indikator                                                                 |
| 8   | LAKIP (Laporan Akuntabilitas Kinerja Instansi Pemerintah)                                                      | PermenPANRB 53/2014             | ✅ Sesuai | Modul LAKIP tersedia dengan relasi ke Renstra, RKPD, Renja, LK-Dispang                                                                  |
| 9   | Monitoring & Evaluasi realisasi indikator                                                                      | Permendagri 86/2017             | ✅ Sesuai | Modul Monev dan Evaluasi tersedia, data realisasi bulanan dan per indikator                                                             |
| 10  | Multi-OPD dengan OPD Penanggung Jawab                                                                          | Standar organisasi pemerintah   | ✅ Sesuai | Model `OpdPenanggungJawab` dan `Division` tersedia                                                                                      |
| 11  | BMD (Barang Milik Daerah)                                                                                      | PP 27/2014, Permendagri 19/2016 | ✅ Sesuai | Modul BMD tersedia dengan atribut: nama, kode, kondisi, nilai perolehan, sumber dana                                                    |
| 12  | Alur RKA → DPA                                                                                                 | Permendagri 77/2020             | ✅ Sesuai | Modul RKA dan DPA tersedia sebagai dokumen terpisah                                                                                     |
| 13  | Tanda Tangan Digital dokumen                                                                                   | PP 71/2019 (SPBE)               | ✅ Sesuai | Menggunakan `@signpdf` + `node-forge` (P12/PKCS12 certificate)                                                                          |
| 14  | SSO — Integrasi SIGAP (Single Sign-On lintas sistem)                                                           | Perpres 95/2018 (SPBE)          | ✅ Sesuai | `verifyToken.js` mendukung dual-auth: JWT lokal + SSO token SIGAP via `SSO_SHARED_SECRET`                                               |
| 15  | Log aktivitas pengguna                                                                                         | Perpres 95/2018 (SPBE)          | ✅ Sesuai | Model `ActivityLog` sudah ada dengan field lengkap: user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent |
| 16  | Rate limiting autentikasi                                                                                      | Keamanan SPBE                   | ✅ Sesuai | Rate limit 10 req/10 menit di production pada endpoint login & register                                                                 |
| 17  | Role-based access control (RBAC)                                                                               | Tata kelola SPBE                | ✅ Sesuai | 4 level role: SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA                                                                           |
| 18  | Password hashing (bcrypt)                                                                                      | Keamanan SPBE                   | ✅ Sesuai | bcrypt salt 10, password minimal 8 karakter                                                                                             |
| 19  | Penatausahaan Keuangan                                                                                         | Permendagri 77/2020             | ✅ Sesuai | Modul Penatausahaan tersedia                                                                                                            |
| 20  | Clone/duplikasi data antar periode RPJMD                                                                       | Kebutuhan transisi periode      | ✅ Sesuai | Modul `ClonePeriode` tersedia                                                                                                           |

---

## 4.3 Penilaian: Aspek Yang Perlu Diperbaiki ⚠️

> ✅ **Semua aspek yang tercatat telah diperbaiki.** Tabel ini telah dikosongkan setelah seluruh poin diselesaikan pada sesi perbaikan aktif.

---

## 4.4 Penilaian: Fitur Yang Belum Ada (Gap Fungsional) ❌

| No  | Fitur                                                                                       | Standar Acuan             | Prioritas            | Keterangan                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------- | ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Integrasi API SIPD Kemendagri** (sinkronisasi data dengan server pusat)                   | Permendagri 70/2019       | 🔴 TINGGI            | Saat ini sistem berdiri sendiri (standalone), belum terhubung ke SIPD pusat                                                                                              |
| 2   | **Audit Trail terstruktur** — log siapa, kapan, aksi apa, data sebelum/sesudah              | Perpres 95/2018 (SPBE)    | ✅ SELESAI (Tahap 1) | `auditService.logActivity()` aktif. Routes `/api/activity-logs`. Terintegrasi di: Misi, Program, Kegiatan                                                                |
| 3   | **Workflow Persetujuan (Approval)** — draft → review → disetujui → ditolak                  | Standar tata naskah dinas | 🔴 TINGGI            | Tidak ada status dokumen/persetujuan di semua modul perencanaan                                                                                                          |
| 4   | **Export laporan lengkap** (PDF/Excel) untuk semua modul                                    | Kebutuhan operasional     | 🟠 TINGGI            | Baru ada Puppeteer + ExcelJS di backend, belum semua modul mengimplementasikan                                                                                           |
| 5   | **Upload & manajemen dokumen pendukung** (SK, Perda, dll) terstruktur                       | SPBE                      | ✅ SELESAI (Tahap 2) | Multer + validasi tipe/ukuran (10MB). Routes `/api/dokumen`: GET list, POST upload, GET `:id/download`, DELETE `:id`. File disimpan di `uploads/dokumen/{entity_type}/`. |
| 6   | **Notifikasi real-time lengkap** (Socket.IO sudah ada dan model Notification sudah lengkap) | Kebutuhan operasional     | ✅ SELESAI (Tahap 1) | `notificationService` aktif via Socket.IO. Routes `/api/notifications` lengkap (GET, count, mark-read, delete)                                                           |
| 7   | **Dashboard Laporan Kinerja Daerah (LKD)** terintegrasi                                     | Permendagri 86/2017       | 🟡 SEDANG            | Dashboard RPJMD ada tapi data masih dummy                                                                                                                                |
| 8   | **Multi-level review indikator** (validasi oleh Kepala Bidang → Kepala Dinas)               | Standar birokrasi         | 🟡 SEDANG            | Tidak ada alur persetujuan bertahap                                                                                                                                      |
| 9   | **Backup & restore data** otomatis terjadwal                                                | Ketahanan sistem SPBE     | 🟡 SEDANG            | Tidak ada fitur backup terjadwal, hanya manual                                                                                                                           |
| 10  | **Validasi NIP/data ASN** dengan integrasi BKN/SIASN                                        | Standar kepegawaian       | 🟡 RENDAH            | Data user hanya username/email, tidak ada validasi ASN                                                                                                                   |

---

## 4.5 Penilaian Keamanan Sistem

| No  | Aspek Keamanan                             | Status          | Catatan                                                  |
| --- | ------------------------------------------ | --------------- | -------------------------------------------------------- |
| 1   | JWT + HttpOnly Cookie                      | ✅ Aman         | Proteksi dari XSS attack                                 |
| 2   | Password hashing (bcrypt, salt 10)         | ✅ Baik         | Standar industri                                         |
| 3   | Rate limiting login/register               | ✅ Aktif        | 10 req/10 menit di production                            |
| 4   | Role-based access control (RBAC)           | ✅ Aktif        | 4 level, mapping SIGAP→ePeLARA                           |
| 5   | Input validation (Joi + express-validator) | ✅ Konsisten    | express-validator diterapkan di seluruh route POST utama |
| 6   | HTTPS redirect di production               | ✅ Aktif        | Server.js redirect HTTP→HTTPS                            |
| 7   | SQL Injection protection                   | ✅ Aman         | Sequelize ORM (parameterized query)                      |
| 8   | XSS protection di frontend                 | ✅ Tersedia     | DOMPurify terinstall                                     |
| 9   | CORS terbatas                              | ✅ Configurabel | Origin dikonfigurasi via env `CORS_ORIGINS`              |
| 10  | Winston logging ke file                    | ✅ Aktif        | `error.log` + `combined.log`                             |
| 11  | `authenticate.js` hardcode SUPER ADMIN     | ✅ Diperbaiki   | Diarahkan ke `verifyToken.js`, tidak lagi hardcode       |
| 12  | Token SSO via shared secret                | ⚠️ Perhatikan   | Keamanan tergantung kerahasiaan `SSO_SHARED_SECRET`      |
| 13  | Tidak ada CSRF protection                  | ⚠️ Belum Ada    | Rentan CSRF attack pada form submission                  |
| 14  | Refresh token disimpan di cookie           | ✅ Baik         | HttpOnly cookie cegah akses JS                           |

---

## 4.6 Rekomendasi Perbaikan Berdasarkan Prioritas

### 🔴 Prioritas 1 — Kritikal (Sudah Diselesaikan ✅)

1. `authenticate.js` — diarahkan ke `verifyToken.js`, tidak lagi hardcode SUPER ADMIN.
2. `dashboardController.js` — `Math.random()` diganti query nyata ke `RealisasiIndikator`.
3. Model `ActivityLog` dan `Notification` — field lengkap sudah didefinisikan.

### 🟠 Prioritas 2 — Dekat (Sudah Diselesaikan ✅)

4. `backend/.env.example` — dibuat, mendokumentasikan semua variabel environment.
5. Validasi input konsisten — `express-validator` kini diterapkan di route POST: misi, tujuan, sasaran, strategi, arah-kebijakan, program, kegiatan, sub-kegiatan, dan periode.
6. `evaluasiController.js` — `tahunAwalRPJMD` kini dinamis dari `RPJMD.periode_awal`.

### 🟡 Prioritas 3 — Bertahap (Sudah Diselesaikan ✅)

7. CORS dikonfigurasi via env `CORS_ORIGINS`, tidak lagi hardcode; duplikasi CORS dihapus.
8. OpenAI model diganti ke `process.env.OPENAI_MODEL || 'gpt-4o'`.
9. `renstraCalculationService.js` — divisor dinamis via parameter `jumlahTahun`.

### 🟠 Prioritas 2 — Perlu Dikembangkan Berikutnya

10. **Implementasikan workflow approval** — tambahkan field `status` (draft/review/approved/rejected) di dokumen perencanaan utama.

### 🟡 Prioritas 3 — Dikembangkan Bertahap

11. **Lengkapi fitur export PDF/Excel** untuk semua modul perencanaan.
12. **Implementasikan notifikasi real-time** via Socket.IO dengan model Notification yang sudah lengkap.
13. **Kaji integrasi SIPD** Kemendagri untuk sinkronisasi data perencanaan ke server pusat.

---

## 4.7 Kesimpulan Kesesuaian

> **e-PeLARA secara keseluruhan telah sesuai dengan kerangka regulasi perencanaan dan penganggaran daerah Indonesia.**

Sistem sudah mencakup siklus penuh:
**RPJMD → Renstra OPD → RKPD → Renja → RKA → DPA → Realisasi → Monev → LAKIP**

sesuai dengan Permendagri 86/2017 sebagai regulasi utama perencanaan daerah.

Seluruh gap implementasi yang sebelumnya tercatat di §4.3 telah diselesaikan:

- ✅ `authenticate.js` sudah aman (redirect ke `verifyToken.js`)
- ✅ Data dashboard menggunakan data nyata dari `RealisasiIndikator`
- ✅ Model `ActivityLog` dan `Notification` sudah memiliki field lengkap
- ✅ `tahunAwalRPJMD` dinamis dari `RPJMD.periode_awal`
- ✅ `renstraCalculationService.js` divisor dinamis
- ✅ CORS dikonfigurasi via environment variable, duplikasi dihapus
- ✅ `.env.example` tersedia untuk developer baru
- ✅ OpenAI model dikonfigurasi via env `OPENAI_MODEL`
- ✅ Validasi input konsisten dengan `express-validator` di seluruh route POST utama

Sistem **siap digunakan dalam lingkungan produksi** dengan catatan bahwa fitur-fitur lanjutan (workflow approval, integrasi SIPD, export lengkap) perlu dikembangkan secara bertahap sebagaimana tercantum di §4.6.

---

_Dokumen ini dibuat pada: 23 Maret 2026_
_Diperbarui: setelah penyelesaian seluruh poin §4.3_
_Versi: 1.1_
_Status: Pedoman Aktif — Wajib dijadikan acuan setiap pengembangan e-PeLARA_

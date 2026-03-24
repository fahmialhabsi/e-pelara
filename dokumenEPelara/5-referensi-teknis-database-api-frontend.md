# 5. REFERENSI TEKNIS LENGKAP: DATABASE, API ENDPOINT & FRONTEND

> Dokumen ini merupakan **referensi teknis detail** sistem e-PeLARA yang mencakup skema database, katalog API endpoint lengkap dan terverifikasi, arsitektur frontend, serta deskripsi komponen teknis pendukung (validators, services, helpers).
>
> **Wajib diperbarui setiap ada perubahan**: penambahan tabel, endpoint baru, halaman baru, atau perubahan skema.
>
> Dokumen ini melengkapi dokumen 1–4 dan menjadi referensi teknis utama untuk keperluan audit, pengembangan, dan pemeliharaan sistem.

---

## 5.1 Skema Database Lengkap

### Keterangan Umum

- **DBMS:** MySQL 8.0
- **ORM:** Sequelize v6.37.7
- **Timezone:** UTC
- **Engine:** InnoDB
- **Migration Tool:** `sequelize-cli`
- **Perbedaan penting:** RPJMD menggunakan siklus **5 tahun** (target_tahun_1 s.d. target_tahun_5), sedangkan Renstra OPD menggunakan siklus **6 tahun** (target_tahun_1 s.d. target_tahun_6).

---

### 5.1.1 Tabel Inti (Core)

#### `roles`

| Kolom         | Tipe                    | Keterangan                                                  |
| ------------- | ----------------------- | ----------------------------------------------------------- |
| `id`          | INT, PK, AUTO_INCREMENT | Identitas unik role                                         |
| `name`        | VARCHAR(255), UNIQUE    | Nama role (SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA) |
| `description` | TEXT, nullable          | Deskripsi role                                              |
| `created_at`  | DATETIME                | Waktu buat                                                  |
| `updated_at`  | DATETIME                | Waktu perbarui                                              |

#### `divisions`

| Kolom           | Tipe                             | Keterangan                   |
| --------------- | -------------------------------- | ---------------------------- |
| `id`            | INT, PK, AUTO_INCREMENT          | Identitas unik divisi        |
| `name`          | VARCHAR(255)                     | Nama divisi/unit kerja       |
| `description`   | TEXT, nullable                   | Deskripsi                    |
| `rpjmd_id`      | INT, FK ke tabel rpjmd, nullable | Keterkaitan ke dokumen RPJMD |
| `jenis_dokumen` | VARCHAR(50), nullable            | Jenis dokumen terkait        |
| `tahun`         | INT, nullable                    | Tahun dokumen                |
| `created_at`    | DATETIME                         | Waktu buat                   |
| `updated_at`    | DATETIME                         | Waktu perbarui               |

#### `users`

| Kolom          | Tipe                                    | Keterangan                          |
| -------------- | --------------------------------------- | ----------------------------------- |
| `id`           | INT, PK, AUTO_INCREMENT                 | Identitas unik pengguna             |
| `username`     | VARCHAR(255), UNIQUE                    | Username login                      |
| `email`        | VARCHAR(255), UNIQUE                    | Email pengguna                      |
| `password`     | VARCHAR(255)                            | Password ter-hash (bcrypt, salt 10) |
| `opd`          | VARCHAR(255), nullable                  | Nama OPD pengguna                   |
| `role_id`      | INT, FK → `roles.id`                    | Role pengguna                       |
| `divisions_id` | INT, FK → `divisions.id`, nullable      | Divisi pengguna                     |
| `periode_id`   | INT, FK → `periode_rpjmds.id`, nullable | Periode RPJMD aktif pengguna        |
| `createdAt`    | DATETIME                                | Waktu buat                          |
| `updatedAt`    | DATETIME                                | Waktu perbarui                      |

#### `periode_rpjmds`

| Kolom         | Tipe                    | Keterangan                            |
| ------------- | ----------------------- | ------------------------------------- |
| `id`          | INT, PK, AUTO_INCREMENT | Identitas unik periode                |
| `nama`        | VARCHAR(255)            | Nama periode (mis. "RPJMD 2025-2029") |
| `tahun_awal`  | INT                     | Tahun mulai periode RPJMD             |
| `tahun_akhir` | INT                     | Tahun akhir periode RPJMD             |
| `createdAt`   | DATETIME                | Waktu buat                            |
| `updatedAt`   | DATETIME                | Waktu perbarui                        |

---

### 5.1.2 Tabel RPJMD (Rencana Pembangunan Jangka Menengah Daerah)

#### `rpjmds` (model: `rpjmdModel.js`)

| Kolom                      | Tipe                   | Keterangan               |
| -------------------------- | ---------------------- | ------------------------ |
| `id`                       | INT, PK                | Identitas unik           |
| `nama_rpjmd`               | VARCHAR(255)           | Judul dokumen RPJMD      |
| `kepala_daerah`            | VARCHAR(255)           | Nama Kepala Daerah       |
| `wakil_kepala_daerah`      | VARCHAR(255), nullable | Nama Wakil Kepala Daerah |
| `periode_awal`             | INT                    | Tahun awal               |
| `periode_akhir`            | INT                    | Tahun akhir              |
| `tahun_penetapan`          | INT                    | Tahun penetapan dokumen  |
| `akronim`                  | VARCHAR(50), nullable  | Akronim jabatan          |
| `foto_kepala_daerah`       | VARCHAR(255), nullable | Path foto kepala daerah  |
| `foto_wakil_kepala_daerah` | VARCHAR(255), nullable | Path foto wakil          |
| `createdAt`                | DATETIME               | Waktu buat               |
| `updatedAt`                | DATETIME               | Waktu perbarui           |

#### `visis` (model: `visiModel.js`)

| Kolom         | Tipe     | Keterangan       |
| ------------- | -------- | ---------------- |
| `id`          | INT, PK  | Identitas unik   |
| `isi_visi`    | TEXT     | Teks visi daerah |
| `tahun_awal`  | INT      | Tahun awal visi  |
| `tahun_akhir` | INT      | Tahun akhir visi |
| `created_at`  | DATETIME |                  |
| `updated_at`  | DATETIME |                  |

- **Validasi Model:** `tahun_awal < tahun_akhir`

#### `misis` (model: `misiModel.js`)

| Kolom           | Tipe                            | Keterangan                          |
| --------------- | ------------------------------- | ----------------------------------- |
| `id`            | INT, PK                         | Identitas unik                      |
| `visi_id`       | INT, FK → `visis.id`            | Visi induk                          |
| `rpjmd_id`      | INT, FK → `rpjmds.id`, nullable | RPJMD terkait                       |
| `periode_id`    | INT, FK → `periode_rpjmds.id`   | Periode aktif                       |
| `isi_misi`      | TEXT                            | Teks misi                           |
| `no_misi`       | INT                             | Nomor urut misi                     |
| `deskripsi`     | TEXT, nullable                  | Deskripsi                           |
| `jenis_dokumen` | VARCHAR(50)                     | Jenis dokumen (RPJMD, RENSTRA, dll) |
| `tahun`         | INT                             | Tahun dokumen                       |
| `created_at`    | DATETIME                        |                                     |
| `updated_at`    | DATETIME                        |                                     |

#### `tujuans` (model: `tujuanModel.js`)

| Kolom           | Tipe                          | Keterangan        |
| --------------- | ----------------------------- | ----------------- |
| `id`            | INT, PK                       | Identitas unik    |
| `rpjmd_id`      | INT, FK → `rpjmds.id`         | RPJMD terkait     |
| `misi_id`       | INT, FK → `misis.id`          | Misi induk        |
| `periode_id`    | INT, FK → `periode_rpjmds.id` | Periode aktif     |
| `no_tujuan`     | INT                           | Nomor urut tujuan |
| `isi_tujuan`    | TEXT                          | Uraian tujuan     |
| `jenis_dokumen` | VARCHAR(50)                   | Jenis dokumen     |
| `tahun`         | INT                           | Tahun             |
| `created_at`    | DATETIME                      |                   |
| `updated_at`    | DATETIME                      |                   |

- **Unique index:** `(misi_id, no_tujuan, jenis_dokumen, tahun, periode_id)`

#### `sasarans` (model: `sasaranModel.js`)

| Kolom           | Tipe                          | Keterangan     |
| --------------- | ----------------------------- | -------------- |
| `id`            | INT, PK                       | Identitas unik |
| `rpjmd_id`      | INT, FK → `rpjmds.id`         | RPJMD terkait  |
| `tujuan_id`     | INT, FK → `tujuans.id`        | Tujuan induk   |
| `periode_id`    | INT, FK → `periode_rpjmds.id` | Periode aktif  |
| `nomor`         | VARCHAR(50)                   | Nomor sasaran  |
| `isi_sasaran`   | TEXT                          | Uraian sasaran |
| `jenis_dokumen` | VARCHAR(50)                   | Jenis dokumen  |
| `tahun`         | INT                           | Tahun          |
| `created_at`    | DATETIME                      |                |
| `updated_at`    | DATETIME                      |                |

- **Unique index:** `(nomor, tujuan_id, jenis_dokumen, tahun, periode_id)`

#### `strategis` (model: `strategiModel.js`)

| Kolom           | Tipe                    | Keterangan    |
| --------------- | ----------------------- | ------------- |
| `id`            | INT, PK                 |               |
| `sasaran_id`    | INT, FK → `sasarans.id` | Sasaran induk |
| `periode_id`    | INT, FK                 | Periode aktif |
| `isi_strategi`  | TEXT                    | Isi strategi  |
| `jenis_dokumen` | VARCHAR(50)             |               |
| `tahun`         | INT                     |               |
| `created_at`    | DATETIME                |               |
| `updated_at`    | DATETIME                |               |

#### `arah_kebijakan` (model: `arahKebijakanModel.js`)

| Kolom                | Tipe        | Keterangan         |
| -------------------- | ----------- | ------------------ |
| `id`                 | INT, PK     |                    |
| `sasaran_id`         | INT, FK     | Sasaran induk      |
| `periode_id`         | INT, FK     |                    |
| `isi_arah_kebijakan` | TEXT        | Isi arah kebijakan |
| `jenis_dokumen`      | VARCHAR(50) |                    |
| `tahun`              | INT         |                    |
| `created_at`         | DATETIME    |                    |
| `updated_at`         | DATETIME    |                    |

#### `programs` (model: `programModel.js`)

| Kolom                     | Tipe                                           | Keterangan                           |
| ------------------------- | ---------------------------------------------- | ------------------------------------ |
| `id`                      | INT, PK                                        |                                      |
| `sasaran_id`              | INT, FK → `sasarans.id`                        | Sasaran induk                        |
| `periode_id`              | INT, FK                                        |                                      |
| `rpjmd_id`                | INT, FK, nullable                              |                                      |
| `kode_program`            | VARCHAR(50)                                    | Kode program (Permendagri 90/2019)   |
| `nama_program`            | VARCHAR(255)                                   | Nama program                         |
| `locked_pagu`             | BOOLEAN                                        | Apakah pagu dikunci                  |
| `pagu_anggaran`           | DECIMAL                                        | Pagu awal                            |
| `total_pagu_anggaran`     | DECIMAL                                        | Total pagu teragregasi dari kegiatan |
| `prioritas`               | VARCHAR(50)                                    | Level prioritas                      |
| `opd_penanggung_jawab_id` | INT, FK → `opd_penanggung_jawabs.id`, nullable |                                      |
| `renstra_program_id`      | INT, FK → `renstra_programs.id`, nullable      | Link ke Renstra OPD                  |
| `jenis_dokumen`           | VARCHAR(50)                                    |                                      |
| `tahun`                   | INT                                            |                                      |
| `created_at`              | DATETIME                                       |                                      |
| `updated_at`              | DATETIME                                       |                                      |

#### `kegiatans` (model: `kegiatanModel.js`)

| Kolom                         | Tipe                    | Keterangan                |
| ----------------------------- | ----------------------- | ------------------------- |
| `id`                          | INT, PK                 |                           |
| `program_id`                  | INT, FK → `programs.id` | Program induk             |
| `periode_id`                  | INT, FK                 |                           |
| `kode_kegiatan`               | VARCHAR(50)             | Kode kegiatan             |
| `nama_kegiatan`               | VARCHAR(255)            | Nama kegiatan             |
| `pagu_anggaran`               | DECIMAL                 | Pagu angaran              |
| `total_pagu_anggaran`         | DECIMAL                 | Total pagu teragregasi    |
| `opd_penanggung_jawab`        | VARCHAR(255)            | Nama OPD penanggung jawab |
| `bidang_opd_penanggung_jawab` | VARCHAR(255), nullable  | Bidang OPD                |
| `jenis_dokumen`               | VARCHAR(50)             |                           |
| `tahun`                       | INT                     |                           |
| `created_at`                  | DATETIME                |                           |
| `updated_at`                  | DATETIME                |                           |

#### `sub_kegiatans` (model: `SubKegiatan.js`)

| Kolom               | Tipe                     | Keterangan        |
| ------------------- | ------------------------ | ----------------- |
| `id`                | INT, PK                  |                   |
| `kegiatan_id`       | INT, FK → `kegiatans.id` | Kegiatan induk    |
| `periode_id`        | INT, FK                  |                   |
| `kode_sub_kegiatan` | VARCHAR(50)              | Kode sub kegiatan |
| `nama_sub_kegiatan` | VARCHAR(255)             | Nama sub kegiatan |
| `pagu_anggaran`     | DECIMAL                  |                   |
| `nama_opd`          | VARCHAR(255)             | Nama OPD          |
| `nama_bidang_opd`   | VARCHAR(255)             | Bidang OPD        |
| `sub_bidang_opd`    | VARCHAR(255), nullable   | Sub bidang OPD    |
| `jenis_dokumen`     | VARCHAR(50)              |                   |
| `tahun`             | INT                      |                   |
| `created_at`        | DATETIME                 |                   |
| `updated_at`        | DATETIME                 |                   |

---

### 5.1.3 Tabel Indikator (RPJMD — Siklus 5 Tahun)

> ⚠️ **PENTING:** Semua tabel indikator RPJMD menggunakan kolom `target_tahun_1` s.d. `target_tahun_5` (5 tahun sesuai siklus RPJMD).

#### `indikator_misis` / `indikatormisis`

| Kolom                               | Tipe         | Keterangan       |
| ----------------------------------- | ------------ | ---------------- |
| `id`                                | INT, PK      |                  |
| `misi_id`                           | INT, FK      |                  |
| `kode_indikator`                    | VARCHAR(50)  | Kode otomatis    |
| `nama_indikator`                    | VARCHAR(255) |                  |
| `satuan`                            | VARCHAR(50)  |                  |
| `baseline`                          | DECIMAL      | Nilai dasar      |
| `target_tahun_1` – `target_tahun_5` | DECIMAL      | Target per tahun |
| `penanggung_jawab`                  | VARCHAR(255) |                  |

#### `indikator_tujuans`, `indikator_sasarans`, `indikator_programs`, `indikator_kegiatans`

- Struktur sama seperti `indikator_misis` dengan FK ke tabel induk masing-masing
- `period_id` wajib ada di semua tabel indikator

#### `indikators` (model: `indikatorModel.js`) — Indikator Multi-Level

| Kolom                               | Tipe              | Keterangan                          |
| ----------------------------------- | ----------------- | ----------------------------------- |
| `id`                                | INT, PK           |                                     |
| `misi_id`                           | INT, FK, nullable | Terhubung ke misi (jika level misi) |
| `tujuan_id`                         | INT, FK, nullable | Terhubung ke tujuan                 |
| `sasaran_id`                        | INT, FK, nullable | Terhubung ke sasaran                |
| `program_id`                        | INT, FK, nullable | Terhubung ke program                |
| `kegiatan_id`                       | INT, FK, nullable | Terhubung ke kegiatan               |
| `rpjmd_id`                          | INT, FK           |                                     |
| `periode_id`                        | INT, FK           |                                     |
| `kode_indikator`                    | VARCHAR(50)       |                                     |
| `nama_indikator`                    | VARCHAR(255)      |                                     |
| `satuan`                            | VARCHAR(50)       |                                     |
| `baseline`                          | DECIMAL           |                                     |
| `target_tahun_1` – `target_tahun_5` | DECIMAL           | Target per tahun RPJMD              |
| `created_at`                        | DATETIME          |                                     |
| `updated_at`                        | DATETIME          |                                     |

#### `indikator_details` (model: `indikatorDetailModel.js`)

- Detail penjelasan per indikator; FK ke `indikators.id`

#### `realisasi_indikators`

- Realisasi capaian per indikator per tahun; FK ke `indikators.id`

---

### 5.1.4 Tabel Cascading & Prioritas

#### `cascadings`

| Kolom         | Tipe              | Keterangan |
| ------------- | ----------------- | ---------- |
| `id`          | INT, PK           |            |
| `misi_id`     | INT, FK, nullable |            |
| `tujuan_id`   | INT, FK, nullable |            |
| `sasaran_id`  | INT, FK, nullable |            |
| `program_id`  | INT, FK, nullable |            |
| `kegiatan_id` | INT, FK, nullable |            |
| `periode_id`  | INT, FK           |            |

#### `cascading_strategi`

- Junction table many-to-many: `cascading_id` ↔ `strategi_id`

#### `cascading_arah_kebijakan`

- Junction table many-to-many: `cascading_id` ↔ `arah_kebijakan_id`

#### `prioritas_nasionals`

| Kolom        | Tipe           | Keterangan                   |
| ------------ | -------------- | ---------------------------- |
| `id`         | INT, PK        |                              |
| `kode`       | VARCHAR(50)    | Kode prioritas nasional      |
| `nama`       | VARCHAR(255)   | Nama prioritas (RPJMN/Pusat) |
| `deskripsi`  | TEXT, nullable |                              |
| `periode_id` | INT, FK        |                              |

#### `prioritas_daerahs`

- Sama seperti `prioritas_nasionals` untuk skala daerah

#### `prioritas_gubernurs`

- Sama seperti `prioritas_nasionals` untuk level Kepala Daerah/Gubernur
- `sasaran_id` nullable — link langsung ke sasaran RPJMD

#### `rkpd_prioritas_nasional`, `rkpd_prioritas_daerah`, `rkpd_prioritas_gubernur`

- Junction tables RKPD ↔ Prioritas (many-to-many)

---

### 5.1.5 Tabel Renstra OPD (Siklus 6 Tahun)

> ⚠️ **PERBEDAAN KRITIS vs RPJMD:** Renstra OPD menggunakan kolom `target_tahun_1` s.d. `target_tahun_6` dan `pagu_tahun_1` s.d. `pagu_tahun_6` (6 tahun, sesuai masa jabatan + transisi).

#### `renstra_opd`

| Kolom            | Tipe                                 | Keterangan          |
| ---------------- | ------------------------------------ | ------------------- |
| `id`             | INT, PK                              |                     |
| `opd_id`         | INT, FK → `opd_penanggung_jawabs.id` | OPD pemilik Renstra |
| `rpjmd_id`       | INT, FK → `rpjmds.id`                | RPJMD induk         |
| `bidang_opd`     | VARCHAR(255)                         | Bidang OPD          |
| `sub_bidang_opd` | VARCHAR(255), nullable               | Sub bidang          |
| `nama_opd`       | VARCHAR(255)                         | Nama lengkap OPD    |
| `tahun_mulai`    | INT                                  | Tahun mulai Renstra |
| `tahun_akhir`    | INT                                  | Tahun akhir Renstra |
| `keterangan`     | TEXT, nullable                       |                     |
| `is_aktif`       | BOOLEAN                              | Status aktif        |
| `created_at`     | DATETIME                             |                     |
| `updated_at`     | DATETIME                             |                     |

#### `renstra_tujuans`

| Kolom              | Tipe                             | Keterangan              |
| ------------------ | -------------------------------- | ----------------------- |
| `id`               | INT, PK                          |                         |
| `misi_id`          | INT, FK                          |                         |
| `renstra_id`       | INT, FK → `renstra_opd.id`       | Renstra OPD induk       |
| `rpjmd_tujuan_id`  | INT, FK → `tujuans.id`, nullable | Tujuan RPJMD yang diacu |
| `no_tujuan`        | VARCHAR(20)                      | Nomor tujuan OPD        |
| `isi_tujuan`       | TEXT                             | Tujuan OPD              |
| `no_rpjmd`         | VARCHAR(20), nullable            | Nomor referensi RPJMD   |
| `isi_tujuan_rpjmd` | TEXT, nullable                   | Teks tujuan RPJMD       |

#### `renstra_sasarans`

- Sasaran Renstra OPD; FK ke `renstra_tujuans.id` dan `sasarans.id` (RPJMD)
- Field `rpjmd_sasaran_id` sebagai link ke `Sasaran` RPJMD

#### `renstra_strategis` & `renstra_kebijakans`

- Strategi dan kebijakan level Renstra OPD

#### `renstra_programs`

| Kolom                         | Tipe                              | Keterangan            |
| ----------------------------- | --------------------------------- | --------------------- |
| `id`                          | INT, PK                           |                       |
| `kode_program`                | VARCHAR(50)                       |                       |
| `nama_program`                | VARCHAR(255)                      |                       |
| `opd_penanggung_jawab`        | VARCHAR(255)                      |                       |
| `bidang_opd_penanggung_jawab` | VARCHAR(255)                      |                       |
| `renstra_id`                  | INT, FK → `renstra_opd.id`        |                       |
| `rpjmd_program_id`            | INT, FK → `programs.id`, nullable | Link ke Program RPJMD |

#### `renstra_kegiatans` & `renstra_subkegiatans`

- Kegiatan dan sub kegiatan Renstra OPD

#### `indikator_renstras`

- Indikator kinerja level Renstra OPD

#### `renstra_tabel_subkegiatan` ← **Tabel Kunci Renstra**

| Kolom                               | Tipe                       | Keterangan                    |
| ----------------------------------- | -------------------------- | ----------------------------- |
| `id`                                | INT, PK, AUTO_INCREMENT    |                               |
| `program_id`                        | INT, FK                    |                               |
| `kegiatan_id`                       | INT, FK                    |                               |
| `subkegiatan_id`                    | INT, FK                    |                               |
| `indikator_manual`                  | TEXT                       | Indikator yang diinput manual |
| `baseline`                          | DECIMAL                    |                               |
| `satuan_target`                     | VARCHAR(50)                |                               |
| `kode_subkegiatan`                  | VARCHAR(50)                |                               |
| `nama_subkegiatan`                  | VARCHAR(255)               |                               |
| `sub_bidang_penanggung_jawab`       | VARCHAR(255)               |                               |
| `lokasi`                            | VARCHAR(255)               |                               |
| `target_akhir_renstra`              | DECIMAL                    | Rata-rata target 6 tahun      |
| `pagu_akhir_renstra`                | DECIMAL                    | Total pagu 6 tahun            |
| `target_tahun_1` – `target_tahun_6` | DECIMAL                    | Target per tahun (6 tahun)    |
| `pagu_tahun_1` – `pagu_tahun_6`     | DECIMAL                    | Pagu per tahun (6 tahun)      |
| `renstra_opd_id`                    | INT, FK → `renstra_opd.id` |                               |
| `created_at`                        | DATETIME                   |                               |
| `updated_at`                        | DATETIME                   |                               |

#### `renstra_tabel_sasaran`

- Sama seperti `renstra_tabel_subkegiatan` untuk level sasaran
- FK ke `tujuan_id`, `sasaran_id`, `indikator_id`

#### `renstra_tabel_tujuan`

- Sama seperti atas untuk level tujuan
- FK ke `tujuan_id`, `opd_id` (renstra_opd)

#### `renstra_tabel_programs`, `renstra_tabel_kegiatans`

- Target & pagu per program/kegiatan Renstra (6 tahun)
- Dihitung otomatis dari agregasi sub kegiatan via `helpers/aggregatePagu.js`

#### `renstra_targets` & `renstra_target_details`

- Target kinerja Renstra per periode

---

### 5.1.6 Tabel Dokumen Perencanaan Tahunan

#### `rkpds` (model: `rkpdModel.js`)

- Rencana Kerja Pemerintah Daerah tahunan
- Many-to-many ke: Tujuan, Sasaran, Program, Kegiatan, SubKegiatan, RenstraProgram, PrioritasNasional, PrioritasDaerah, PrioritasGubernur

#### `renjas`

- Rencana Kerja OPD tahunan; FK ke Renja.renja_id → `Lakip`

#### `rkas`

- Rencana Kerja dan Anggaran; turunan dari Renja

#### `dpas`

- Dokumen Pelaksanaan Anggaran; finalisasi dari RKA

---

### 5.1.7 Tabel Realisasi & Monitoring

#### `realisasi_bulanans`

- Realisasi fisik dan keuangan per bulan (Januari–Desember)
- FK ke `indikators.id`

#### `realisasi_indikators`

- Capaian realisasi per indikator kinerja
- FK ke `indikators.id`

#### `monevs`

- Data Monitoring & Evaluasi; relasi ke Program/Kegiatan

#### `evaluasis`

- Hasil evaluasi kinerja per periode

---

### 5.1.8 Tabel Laporan Akuntabilitas

#### `lakips`

| Kolom           | Tipe                  | Keterangan                 |
| --------------- | --------------------- | -------------------------- |
| `id`            | INT, PK               |                            |
| `renja_id`      | INT, FK → `renjas.id` | Renja yang dilaporkan      |
| `rkpd_id`       | INT, FK, nullable     | RKPD terkait               |
| `lk_dispang_id` | INT, FK, nullable     | Link ke LK Dispang         |
| `tahun`         | INT                   | Tahun laporan              |
| ...             |                       | Data laporan LAKIP lainnya |

#### `lpk_dispangs`

- Laporan Pertanggungjawaban Keuangan Dispang

#### `lk_dispangs`

- Laporan Keuangan Dispang

---

### 5.1.9 Tabel Aset & Keuangan

#### `bmds` (Barang Milik Daerah)

| Kolom             | Tipe                  | Keterangan                      |
| ----------------- | --------------------- | ------------------------------- |
| `id`              | INT, PK               |                                 |
| `nama_barang`     | VARCHAR(255)          |                                 |
| `kode_barang`     | VARCHAR(50)           |                                 |
| `tahun_perolehan` | INT                   |                                 |
| `kondisi`         | VARCHAR(50)           | (Baik/Rusak Ringan/Rusak Berat) |
| `nilai_perolehan` | DECIMAL               |                                 |
| `sumber_dana`     | VARCHAR(100)          |                                 |
| `periode_id`      | INT, FK               |                                 |
| `jenis_dokumen`   | VARCHAR(50), nullable |                                 |

#### `penatausahaans`

- Manajemen keuangan dan pengeluaran daerah

#### `pengkegs` (Pengendalian Kegiatan)

- Data pengendalian pelaksanaan kegiatan

---

### 5.1.10 Tabel Dukungan Sistem

#### `opd_penanggung_jawabs`

| Kolom            | Tipe                   | Keterangan     |
| ---------------- | ---------------------- | -------------- |
| `id`             | INT, PK                |                |
| `nama_opd`       | VARCHAR(255)           | Nama resmi OPD |
| `bidang_opd`     | VARCHAR(255)           | Nama bidang    |
| `sub_bidang_opd` | VARCHAR(255), nullable | Sub bidang     |

#### `notifications`

- Model ada, **field belum didefinisikan** (lihat gap di dokumen-4)
- FK ke `users.id` (target notifikasi)

#### `activity_logs`

- Model ada, **field belum didefinisikan** (lihat gap di dokumen-4)
- Wajib diisi untuk audit trail

#### `SequelizeMeta`

| Kolom  | Tipe             | Keterangan                                |
| ------ | ---------------- | ----------------------------------------- |
| `name` | VARCHAR(255), PK | Nama file migration yang sudah dijalankan |

---

## 5.2 Katalog API Endpoint Lengkap & Terverifikasi

> Sumber: `backend/server.js` (registrasi route aktual per 23 Maret 2026)  
> ✅ = Terverifikasi dari kode | ⚠️ = Perlu konfirmasi detail

### 5.2.1 Autentikasi & Manajemen Pengguna

#### `/api/auth` (authRoutes.js)

| Method | Path                      | Auth   | Role    | Fungsi                            |
| ------ | ------------------------- | ------ | ------- | --------------------------------- |
| POST   | `/api/auth/register`      | Tidak  | Terbuka | Registrasi user baru              |
| POST   | `/api/auth/login`         | Tidak  | Terbuka | Login, return JWT cookie          |
| POST   | `/api/auth/refresh-token` | Cookie | Semua   | Perbarui access token             |
| POST   | `/api/auth/logout`        | Cookie | Semua   | Clear cookie token & refreshToken |

- **Rate Limit:** 10 request / 10 menit per IP (production)

#### `/api` — User Routes (userRoutes.js)

| Method | Path                    | Auth  | Role                                 | Fungsi                           |
| ------ | ----------------------- | ----- | ------------------------------------ | -------------------------------- |
| GET    | `/api/check-superadmin` | Tidak | Terbuka                              | Cek apakah SUPER_ADMIN sudah ada |
| POST   | `/api/users`            | JWT   | SUPER_ADMIN, ADMINISTRATOR           | Buat user baru                   |
| GET    | `/api/users`            | JWT   | SUPER_ADMIN, ADMINISTRATOR, PENGAWAS | Daftar semua user                |
| GET    | `/api/users/me`         | JWT   | Semua                                | Data user saat ini               |
| GET    | `/api/users/:id`        | JWT   | Semua                                | Detail user                      |
| PUT    | `/api/users/:id`        | JWT   | SUPER_ADMIN, ADMINISTRATOR           | Update user                      |

#### `/api/roles` (roleRoutes.js)

| Method | Path             | Auth | Role        | Fungsi            |
| ------ | ---------------- | ---- | ----------- | ----------------- |
| GET    | `/api/roles`     | JWT  | Semua       | Daftar semua role |
| POST   | `/api/roles`     | JWT  | SUPER_ADMIN | Buat role baru    |
| PUT    | `/api/roles/:id` | JWT  | SUPER_ADMIN | Update role       |
| DELETE | `/api/roles/:id` | JWT  | SUPER_ADMIN | Hapus role        |

#### `/api/divisions` (divisionRoutes.js)

| Method | Path                 | Auth | Role                       | Fungsi        |
| ------ | -------------------- | ---- | -------------------------- | ------------- |
| GET    | `/api/divisions`     | JWT  | Semua                      | Daftar divisi |
| POST   | `/api/divisions`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat divisi   |
| PUT    | `/api/divisions/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update        |
| DELETE | `/api/divisions/:id` | JWT  | SUPER_ADMIN                | Hapus         |

#### `/api/opd-penanggung-jawab` (opdPenanggungJawabRoutes.js)

| Method | Path                            | Auth | Role                       | Fungsi     |
| ------ | ------------------------------- | ---- | -------------------------- | ---------- |
| GET    | `/api/opd-penanggung-jawab`     | JWT  | Semua                      | Daftar OPD |
| POST   | `/api/opd-penanggung-jawab`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat OPD   |
| PUT    | `/api/opd-penanggung-jawab/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update     |
| DELETE | `/api/opd-penanggung-jawab/:id` | JWT  | SUPER_ADMIN                | Hapus      |

---

### 5.2.2 Periode & Konfigurasi

#### `/api/periode-rpjmd` (periodeRoutes.js)

| Method | Path                     | Auth | Role        | Fungsi               |
| ------ | ------------------------ | ---- | ----------- | -------------------- |
| GET    | `/api/periode-rpjmd`     | JWT  | Semua       | Daftar periode RPJMD |
| POST   | `/api/periode-rpjmd`     | JWT  | SUPER_ADMIN | Buat periode baru    |
| PUT    | `/api/periode-rpjmd/:id` | JWT  | SUPER_ADMIN | Update periode       |
| DELETE | `/api/periode-rpjmd/:id` | JWT  | SUPER_ADMIN | Hapus periode        |

#### `/api/dokumen-options` (dokumenOptionsRoutes.js) ✅

| Method | Path                   | Auth | Fungsi                                              |
| ------ | ---------------------- | ---- | --------------------------------------------------- |
| GET    | `/api/dokumen-options` | JWT  | Opsi jenis dokumen & tahun (dropdown filter global) |

#### `/api/clone-periode` (clonePeriodeRoutes.js)

| Method | Path                 | Auth | Role        | Fungsi                             |
| ------ | -------------------- | ---- | ----------- | ---------------------------------- |
| POST   | `/api/clone-periode` | JWT  | SUPER_ADMIN | Clone seluruh data ke periode baru |

---

### 5.2.3 RPJMD & Visi-Misi

#### `/api/rpjmd` (rpjmdRoutes.js)

| Method | Path             | Auth | Role                       | Fungsi       |
| ------ | ---------------- | ---- | -------------------------- | ------------ |
| GET    | `/api/rpjmd`     | JWT  | Semua                      | Daftar RPJMD |
| GET    | `/api/rpjmd/:id` | JWT  | Semua                      | Detail RPJMD |
| POST   | `/api/rpjmd`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat RPJMD   |
| PUT    | `/api/rpjmd/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update       |
| DELETE | `/api/rpjmd/:id` | JWT  | SUPER_ADMIN                | Hapus        |

#### `/api/visi` (visiRoutes.js)

| Method | Path            | Auth | Role                       | Fungsi      |
| ------ | --------------- | ---- | -------------------------- | ----------- |
| GET    | `/api/visi`     | JWT  | Semua                      | Daftar visi |
| POST   | `/api/visi`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat visi   |
| PUT    | `/api/visi/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update      |
| DELETE | `/api/visi/:id` | JWT  | SUPER_ADMIN                | Hapus       |

#### `/api/misi` (misiRoutes.js)

| Method | Path            | Auth | Role                       | Fungsi      |
| ------ | --------------- | ---- | -------------------------- | ----------- |
| GET    | `/api/misi`     | JWT  | Semua                      | Daftar misi |
| GET    | `/api/misi/:id` | JWT  | Semua                      | Detail misi |
| POST   | `/api/misi`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat misi   |
| PUT    | `/api/misi/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update      |
| DELETE | `/api/misi/:id` | JWT  | SUPER_ADMIN                | Hapus       |

#### `/api/tujuan` (tujuanRoutes.js)

- GET all, GET /:id, POST, PUT /:id, DELETE /:id
- Role tulis: SUPER_ADMIN, ADMINISTRATOR

#### `/api/sasaran` (sasaranRoutes.js)

- GET all, GET /:id, POST, PUT /:id, DELETE /:id
- Role tulis: SUPER_ADMIN, ADMINISTRATOR

#### `/api/strategi` (strategiRoutes.js)

- CRUD lengkap; GET all, GET /:id, POST, PUT /:id, DELETE /:id

#### `/api/arah-kebijakan` (arahKebijakanRoutes.js)

- CRUD lengkap

#### `/api/programs` (programRoutes.js)

| Method | Path                | Auth | Role                       | Fungsi                         |
| ------ | ------------------- | ---- | -------------------------- | ------------------------------ |
| GET    | `/api/programs`     | JWT  | Semua                      | Daftar program (dengan filter) |
| GET    | `/api/programs/all` | JWT  | Semua                      | Seluruh program tanpa paginasi |
| GET    | `/api/programs/:id` | JWT  | Semua                      | Detail program                 |
| POST   | `/api/programs`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat program                   |
| PUT    | `/api/programs/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update                         |
| DELETE | `/api/programs/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Hapus                          |

#### `/api/kegiatan` (kegiatanRoutes.js)

- CRUD lengkap + `GET /api/kegiatan/all`

#### `/api/sub-kegiatan` (subKegiatanRoutes.js)

- CRUD lengkap

#### `/api/targets` (targetsRoutes.js) ✅

| Method | Path           | Auth | Fungsi                            |
| ------ | -------------- | ---- | --------------------------------- |
| GET    | `/api/targets` | JWT  | Agregasi target per entitas RPJMD |
| POST   | `/api/targets` | JWT  | Simpan target                     |

---

### 5.2.4 Indikator Kinerja

#### `/api/indikators` (indikatorDetailRoutes.js)

- CRUD indikator detail; GET /:id, POST, PUT /:id, DELETE /:id

#### `/api/indikator-wizard` (indikatorWizardRoutes.js)

| Method | Path                                         | Auth | Fungsi                           |
| ------ | -------------------------------------------- | ---- | -------------------------------- |
| GET    | `/api/indikator-wizard`                      | JWT  | Mulai wizard pengisian indikator |
| POST   | `/api/indikator-wizard`                      | JWT  | Simpan langkah wizard            |
| GET    | `/api/indikator-wizard/next-kode/:level/:id` | JWT  | Generate kode otomatis           |

#### `/api/indikator-misi` (indikatorMisiRoutes.js)

- CRUD indikator level Misi

#### `/api/indikator-tujuans` (indikatorTujuan)

- CRUD indikator level Tujuan

#### `/api/indikator-sasaran` (indikatorSasaran)

- CRUD indikator level Sasaran

#### `/api/indikator-program` (indikatorProgram)

- CRUD indikator level Program

#### `/api/indikator-kegiatan` (indikatorKegiatan)

- CRUD indikator level Kegiatan

---

### 5.2.5 Cascading & Prioritas

#### `/api/cascading` (cascadingRoutes.js)

| Method | Path                 | Auth | Fungsi                |
| ------ | -------------------- | ---- | --------------------- |
| GET    | `/api/cascading`     | JWT  | Daftar cascading      |
| GET    | `/api/cascading/:id` | JWT  | Detail cascading      |
| POST   | `/api/cascading`     | JWT  | Buat relasi cascading |
| PUT    | `/api/cascading/:id` | JWT  | Update                |
| DELETE | `/api/cascading/:id` | JWT  | Hapus                 |

#### `/api/prioritas-nasional`, `/api/prioritas-daerah`, `/api/prioritas-gubernur`

- Masing-masing: GET all, GET /:id, POST, PUT /:id, DELETE /:id
- Role tulis: SUPER_ADMIN, ADMINISTRATOR

---

### 5.2.6 Renstra OPD

#### `/api/renstra-opd` (RenstraOpd)

| Method | Path                   | Auth | Role                       | Fungsi             |
| ------ | ---------------------- | ---- | -------------------------- | ------------------ |
| GET    | `/api/renstra-opd`     | JWT  | Semua                      | Daftar Renstra OPD |
| GET    | `/api/renstra-opd/:id` | JWT  | Semua                      | Detail             |
| POST   | `/api/renstra-opd`     | JWT  | SUPER_ADMIN, ADMINISTRATOR | Buat Renstra OPD   |
| PUT    | `/api/renstra-opd/:id` | JWT  | SUPER_ADMIN, ADMINISTRATOR | Update             |
| DELETE | `/api/renstra-opd/:id` | JWT  | SUPER_ADMIN                | Hapus              |

#### `/api/renstra-tujuan` (renstraTujuanRoutes.js)

| Method | Path                                        | Auth                   | Fungsi                         |
| ------ | ------------------------------------------- | ---------------------- | ------------------------------ |
| GET    | `/api/renstra-tujuan`                       | JWT                    | Daftar tujuan Renstra          |
| GET    | `/api/renstra-tujuan/generate-nomor-tujuan` | JWT                    | Generate nomor tujuan otomatis |
| GET    | `/api/renstra-tujuan/:id`                   | JWT                    | Detail                         |
| POST   | `/api/renstra-tujuan`                       | JWT                    | Buat                           |
| PUT    | `/api/renstra-tujuan/:id`                   | JWT                    | Update                         |
| DELETE | `/api/renstra-tujuan/:id`                   | JWT (SUPER_ADMIN only) | Hapus                          |

#### `/api/renstra-sasaran`, `/api/renstra-strategi`, `/api/renstra-kebijakan`

- CRUD lengkap masing-masing

#### `/api/renstra-program` (renstraProgramRoutes.js)

- CRUD program Renstra + generate kode program

#### `/api/renstra-kegiatan` (renstraKegiatanRoutes.js)

- CRUD kegiatan Renstra

#### `/api/renstra-subkegiatan` (renstraSubkegiatanRoutes.js)

- CRUD sub kegiatan Renstra

#### `/api/indikator-renstra` (indikatorRenstraRoutes.js)

- CRUD indikator Renstra OPD

#### `/api/renstra-target` (renstra_targetRoutes.js)

- CRUD target tahunan Renstra

#### `/api/renstra` — BAB Routes (renstraBabRoutes.js) ✅

- Navigasi bab-bab dokumen Renstra

#### `/api/renstra` — Export Routes (renstra_exportRoutes.js) ✅

| Method | Path                        | Auth | Fungsi                            |
| ------ | --------------------------- | ---- | --------------------------------- |
| GET    | `/api/renstra/export/pdf`   | JWT  | Export Renstra ke PDF (Puppeteer) |
| GET    | `/api/renstra/export/excel` | JWT  | Export Renstra ke Excel           |
| GET    | `/api/renstra/export/word`  | JWT  | Export Renstra ke Word            |

#### `/api/renstra-tabel-tujuan` (renstra_tabelTujuanRoutes.js) ✅

- CRUD tabel tujuan Renstra (dengan target & pagu 6 tahun)

#### `/api/renstra-tabel-sasaran` (renstra_tabelSasaranRoutes.js) ✅

- CRUD tabel sasaran Renstra

#### `/api/renstra-tabel-program` (renstra_tabelProgramRoutes.js) ✅

- CRUD tabel program Renstra (otomatis teragregasi dari kegiatan)

#### `/api/renstra-tabel-kegiatan` (renstra_tabelKegiatanRoutes.js) ✅

- CRUD tabel kegiatan Renstra

#### `/api/renstra-tabel-subkegiatan` (renstra_tabelSubKegiatanRoutes.js) ✅

- CRUD tabel sub kegiatan Renstra (input utama target & pagu 6 tahun)

---

### 5.2.7 RKPD, Renja, RKA, DPA

#### `/api/rkpd` (rkpdRoutes.js)

| Method | Path                     | Auth | Role                                 | Fungsi               |
| ------ | ------------------------ | ---- | ------------------------------------ | -------------------- |
| GET    | `/api/rkpd`              | JWT  | Semua                                | Daftar RKPD          |
| GET    | `/api/rkpd/:id`          | JWT  | Semua                                | Detail               |
| GET    | `/api/rkpd/export/excel` | JWT  | SUPER_ADMIN, ADMINISTRATOR           | Export Excel         |
| GET    | `/api/rkpd/export/pdf`   | JWT  | SUPER_ADMIN, ADMINISTRATOR           | Export PDF           |
| GET    | `/api/rkpd/perubahan`    | JWT  | SUPER_ADMIN, ADMINISTRATOR, PENGAWAS | Skema perubahan RKPD |
| POST   | `/api/rkpd`              | JWT  | SUPER_ADMIN, ADMINISTRATOR           | Buat RKPD            |
| PUT    | `/api/rkpd/:id`          | JWT  | SUPER_ADMIN, ADMINISTRATOR           | Update               |
| DELETE | `/api/rkpd/:id`          | JWT  | SUPER_ADMIN, ADMINISTRATOR           | Hapus                |

#### `/api/rkpd-init` (rkpdInitRoutes.js)

| Method | Path             | Auth | Fungsi                                            |
| ------ | ---------------- | ---- | ------------------------------------------------- |
| POST   | `/api/rkpd-init` | JWT  | Inisialisasi RKPD dari data RPJMD (auto-populate) |

#### `/api/renja` (renjaRoutes.js)

- CRUD Renja OPD

#### `/api/rka` (rkaRoutes.js)

- CRUD RKA

#### `/api/dpa` (dpaRoutes.js)

- CRUD DPA

---

### 5.2.8 Keuangan & Aset

#### `/api/penatausahaan` (penatausahaanRoutes.js)

- CRUD manajemen keuangan

#### `/api/pengkeg` (pengkegRoutes.js)

- CRUD pengendalian kegiatan

#### `/api/bmd` (bmdRoutes.js)

- CRUD Barang Milik Daerah; filter per periode & jenis dokumen

---

### 5.2.9 Realisasi, Monev & Evaluasi

#### `/api/realisasi-indikator` (realisasiRoutes.js)

| Method | Path                           | Auth | Fungsi                     |
| ------ | ------------------------------ | ---- | -------------------------- |
| GET    | `/api/realisasi-indikator`     | JWT  | Daftar realisasi indikator |
| POST   | `/api/realisasi-indikator`     | JWT  | Input realisasi            |
| PUT    | `/api/realisasi-indikator/:id` | JWT  | Update                     |
| DELETE | `/api/realisasi-indikator/:id` | JWT  | Hapus                      |

#### `/api` — Realisasi Bulanan Routes (realisasiBulananRoutes.js)

- Input realisasi fisik dan keuangan per bulan

#### `/api/monev` (monevRoutes.js)

- CRUD Monitoring & Evaluasi dengan validasi Joi

#### `/api/evaluasi` (evaluasiRoutes.js)

- CRUD evaluasi kinerja
- ⚠️ `tahunAwalRPJMD` masih hardcode = 2025 (lihat dokumen-4 gap #3)

---

### 5.2.10 Dashboard & Monitoring

#### `/api` — Dashboard Routes (dashboardRoutes.js)

> ⚠️ **KOREKSI dari dokumen-2:** Route aktual bukan `/api/dashboard`, melainkan:

| Method | Path                        | Auth | Fungsi                    |
| ------ | --------------------------- | ---- | ------------------------- |
| GET    | `/api/dashboard-monitoring` | JWT  | Data monitoring umum      |
| GET    | `/api/kpi`                  | JWT  | Key Performance Indicator |
| GET    | `/api/trend`                | JWT  | Data tren kinerja         |

- ⚠️ Data masih menggunakan `Math.random()` (lihat gap di dokumen-4 #2)

#### `/api/dashboard-rpjmd` (dashboardRpjmdRoutes.js)

| Method | Path                           | Auth | Fungsi                       |
| ------ | ------------------------------ | ---- | ---------------------------- |
| GET    | `/api/dashboard-rpjmd`         | JWT  | Dashboard RPJMD terintegrasi |
| GET    | `/api/dashboard-rpjmd/summary` | JWT  | Ringkasan capaian RPJMD      |

#### `/api` — Monitoring Routes (monitoringRoutes.js) ✅

| Method | Path              | Auth | Fungsi                           |
| ------ | ----------------- | ---- | -------------------------------- |
| GET    | `/api/monitoring` | JWT  | Data monitoring program/kegiatan |

#### `/api` — Kinerja Routes (kinerjaRoutes.js) ✅

| Method | Path           | Auth | Fungsi                        |
| ------ | -------------- | ---- | ----------------------------- |
| GET    | `/api/kinerja` | JWT  | Rekap kinerja per OPD/program |

---

### 5.2.11 Laporan

#### `/api/laporan` — Laporan Umum (laporanRoutes.js)

| Method | Path                        | Auth | Fungsi                         |
| ------ | --------------------------- | ---- | ------------------------------ |
| GET    | `/api/laporan`              | JWT  | Daftar laporan                 |
| GET    | `/api/laporan/export/pdf`   | JWT  | Export laporan PDF (Puppeteer) |
| GET    | `/api/laporan/export/excel` | JWT  | Export laporan Excel           |

#### `/api/laporan` — Laporan RPJMD (laporanRpjmdRoutes.js) ✅

- Laporan khusus untuk RPJMD (cetak dokumen formal RPJMD)

#### `/api/lakip` (lakipRoutes.js)

- CRUD LAKIP + export PDF/Word

#### `/api/lpk-dispang` (lpkDispangRoutes.js)

- CRUD LPK Dispang

#### `/api/lk-dispang` (lkDispangRoutes.js)

- CRUD LK Dispang

---

### 5.2.12 Utilitas Sistem

#### `/api/notifications` (notificationRoutes.js)

| Method | Path                          | Auth | Fungsi                 |
| ------ | ----------------------------- | ---- | ---------------------- |
| GET    | `/api/notifications`          | JWT  | Daftar notifikasi user |
| PUT    | `/api/notifications/:id/read` | JWT  | Tandai dibaca          |
| DELETE | `/api/notifications/:id`      | JWT  | Hapus notifikasi       |

#### `/api/rekomendasi-ai` (rekomendasiAIRoutes.js)

| Method | Path                  | Auth | Role  | Fungsi                                         |
| ------ | --------------------- | ---- | ----- | ---------------------------------------------- |
| POST   | `/api/rekomendasi-ai` | JWT  | Semua | Kirim daftar indikator → terima rekomendasi AI |

- Provider: OpenAI gpt-3.5-turbo (pertimbangkan upgrade ke gpt-4o)

#### `/api` — Sign PDF (signPdfRoutes.js)

| Method | Path                      | Auth | Fungsi                                           |
| ------ | ------------------------- | ---- | ------------------------------------------------ |
| POST   | `/api/sign-pdf`           | JWT  | Upload & tanda tangani PDF dengan sertifikat P12 |
| GET    | `/api/sign-pdf/:filename` | JWT  | Download PDF bertanda tangan                     |

---

### 5.2.13 Ringkasan Total Endpoint

| Kategori               | Jumlah Route Group   | Catatan                                                                                                            |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Auth & User Management | 5                    | auth, users, roles, divisions, opd-pj                                                                              |
| Periode & Config       | 3                    | periode, dokumen-options, clone                                                                                    |
| RPJMD Hierarki         | 9                    | rpjmd, visi, misi, tujuan, sasaran, strategi, arah-kebijakan, programs, kegiatan, sub-kegiatan, targets            |
| Indikator Kinerja      | 7                    | indikators, wizard, misi, tujuan, sasaran, program, kegiatan                                                       |
| Cascading & Prioritas  | 4                    | cascading, prio-nasional, prio-daerah, prio-gubernur                                                               |
| Renstra OPD            | 14                   | opd, tujuan, sasaran, strategi, kebijakan, program, kegiatan, subkegiatan, indikator, target, bab, export, 5 tabel |
| RKPD/Renja/RKA/DPA     | 5                    | rkpd (+init), renja, rka, dpa                                                                                      |
| Keuangan & Aset        | 3                    | penatausahaan, pengkeg, bmd                                                                                        |
| Realisasi & Monev      | 4                    | realisasi-indikator, realisasi-bulanan, monev, evaluasi                                                            |
| Dashboard & Monitoring | 4                    | dashboard-monitoring/kpi/trend, dashboard-rpjmd, monitoring, kinerja                                               |
| Laporan                | 5                    | laporan, laporan-rpjmd, lakip, lpk-dispang, lk-dispang                                                             |
| Utilitas               | 3                    | notifications, rekomendasi-ai, sign-pdf                                                                            |
| **Total**              | **~79+ route group** |                                                                                                                    |

---

## 5.3 Arsitektur Frontend

### 5.3.1 Stack & Build

| Aspek        | Detail                  |
| ------------ | ----------------------- |
| Framework    | React 18.2.0            |
| Build Tool   | Vite 5.2.8              |
| Package Name | `epenta-frontend`       |
| Entry Point  | `frontend/src/main.jsx` |
| Router       | `frontend/src/App.jsx`  |

### 5.3.2 Struktur Direktori Frontend

```
frontend/src/
├── main.jsx                  — Entry point, setup React Query & Router
├── App.jsx                   — Root routing & global providers stack
├── App.css, index.css        — Global styles
│
├── features/                 — Modul fitur utama (feature-based structure)
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   └── components/
│   │       ├── ProtectedRoute.jsx     — Guard untuk halaman login-required
│   │       └── GuestRoute.jsx         — Guard untuk halaman guest-only
│   ├── rpjmd/
│   │   ├── pages/
│   │   │   ├── DashboardHome.jsx
│   │   │   └── DashboardUtamaRpjmd.jsx
│   │   ├── hooks/
│   │   │   └── usePeriodeAktif.js
│   │   └── components/
│   ├── renstra/
│   │   ├── pages/
│   │   │   ├── RenstraDashboard.jsx
│   │   │   └── DashboardLayout.jsx
│   │   └── components/
│   ├── rkpd/
│   │   ├── pages/
│   │   │   ├── RkpdDashboard.jsx
│   │   │   └── RkpdFormPage.jsx
│   │   └── components/
│   │       └── RkpdSidebarLayout.jsx
│   ├── renja/            — Halaman Renja OPD
│   ├── rka/              — Halaman RKA
│   ├── dpa/              — Halaman DPA
│   ├── pengkeg/          — Pengendalian Kegiatan
│   ├── monev/
│   │   ├── pages/MonevDashboard.jsx
│   │   └── context/MonevContext.js
│   ├── lpk-dispang/      — LPK Dispang halaman
│   ├── lk-dispang/       — LK Dispang halaman
│   └── lakip/            — LAKIP halaman
│
├── pages/                — Halaman berdiri sendiri (non-feature)
│   ├── AktivitasPage.jsx
│   ├── KeterkaitanPage.jsx
│   ├── MonitoringPage.jsx
│   ├── NotFoundPage.jsx
│   ├── NotifikasiPage.jsx
│   ├── RealisasiPage.jsx
│   ├── RekapPage.jsx
│   ├── aktivitas/        — Sub halaman aktivitas
│   ├── cascading/
│   │   ├── CascadingDetail.jsx
│   │   ├── CascadingSankeySunburst.jsx   — Visualisasi Sankey & Sunburst
│   │   └── CascadingStatistik.jsx
│   ├── notifications/    — Halaman detail notifikasi
│   └── statistik/        — Halaman statistik
│
├── contexts/             — React Context Providers (lihat 5.3.3)
├── layouts/
│   └── DashboardLayoutGlobal.jsx   — Layout utama dengan sidebar & header
├── components/
│   ├── ui/               — Komponen UI dasar (shadcn/radix)
│   └── InitRkpdButton.jsx
├── shared/components/
│   ├── GlobalDokumenTahunPickerModal.jsx
│   └── KegiatanNestedView.jsx
├── routes/
│   └── renstraRoutes.jsx   — Konfigurasi routing Renstra
├── config/
│   └── routes.js           — Konfigurasi routing RPJMD
├── admin/
│   ├── ClonePeriodePage.jsx
│   └── ClonedDataTable.jsx
├── hooks/                — Custom React hooks
│   ├── useAuth.js
│   └── useDokumen.js
├── services/             — API service layer (Axios wrappers)
├── validations/          — Schema validasi form (Yup)
├── constants/            — Konstanta global
├── utils/                — Fungsi utilitas
├── style/                — Style global tambahan
├── lib/                  — Library wrapper
└── assets/               — Gambar, ikon, font
```

---

### 5.3.3 React Context Providers (State Global)

Stack provider dari luar ke dalam (urutan di `App.jsx`/`main.jsx`):

| Provider               | File                               | Scope       | Fungsi                                       |
| ---------------------- | ---------------------------------- | ----------- | -------------------------------------------- |
| `QueryClientProvider`  | `main.jsx` (TanStack Query)        | Seluruh App | Cache & state HTTP requests                  |
| `BrowserRouter`        | `main.jsx`                         | Seluruh App | Client-side routing                          |
| `AuthProvider`         | `contexts/AuthProvider.js`         | Seluruh App | State autentikasi: user, token, login/logout |
| `NotificationProvider` | `contexts/NotificationProvider.js` | Seluruh App | Socket.IO, state notifikasi real-time        |
| `FilterProvider`       | `contexts/FilterContext.js`        | Seluruh App | Filter global (jenis_dokumen, tahun)         |
| `MonevProvider`        | (dalam fitur monev)                | Fitur Monev | State khusus monitoring & evaluasi           |
| `ConfigProvider`       | (Ant Design)                       | Seluruh App | Tema & konfigurasi Ant Design                |
| `DokumenProvider`      | `contexts/DokumenProvider.js`      | Seluruh App | State pemilihan jenis dokumen aktif          |
| `PeriodeContext`       | `contexts/PeriodeContext.js`       | Seluruh App | Periode RPJMD yang sedang aktif              |

---

### 5.3.4 Routing Frontend Lengkap (App.jsx)

```
/ (root)
├── /login                    → <Login />             [GuestRoute]
├── /register                 → <Register />           [GuestRoute]
│
└── /* (protected)            → <DashboardLayoutGlobal> [ProtectedRoute]
    ├── /                     → <DashboardHome />
    ├── /rpjmd                → <DashboardUtamaRpjmd />
    │   └── (dari rpjmdRoutes: visi, misi, tujuan, sasaran, strategi,
    │         arah-kebijakan, program, kegiatan, sub-kegiatan,
    │         indikator & cascade, wizard)
    ├── /renstra              → <RenstraDashboard />
    │   └── (dari renstraRoutes: tujuan, sasaran, strategi, kebijakan,
    │         program, kegiatan, subkegiatan, indikator, target, tabel)
    ├── /rkpd                 → <RkpdSidebarLayout>
    │   ├── /rkpd             → <RkpdDashboard />
    │   ├── /rkpd/:id         → Detail RKPD
    │   └── /rkpd/form        → <RkpdFormPage />
    ├── /renja                → <RenjaDashboard />
    ├── /rka                  → <RkaDashboard />
    ├── /dpa                  → <DpaDashboard />
    ├── /pengkeg              → <PengkegDashboard />
    ├── /monev                → <MonevDashboard />
    ├── /lpk-dispang          → <LpkDispangDashboard />
    ├── /lk-dispang           → <LkDashboard />
    ├── /lakip                → <LakipDashboard />
    ├── /cascading            → <CascadingPage>
    │   ├── /cascading/detail → <CascadingDetail />
    │   ├── /cascading/visual → <CascadingSankeySunburst />
    │   └── /cascading/statistik → <CascadingStatistik />
    ├── /keterkaitan          → <KeterkaitanPage />
    ├── /monitoring           → <MonitoringPage />
    ├── /realisasi            → <RealisasiPage />
    ├── /rekap                → <RekapPage />
    ├── /aktivitas            → <AktivitasPage />
    ├── /notifikasi           → <NotifikasiPage />
    ├── /admin/clone-periode  → <ClonePeriodePage />
    ├── /admin/cloned-data    → <ClonedDataTable />
    └── *                     → <NotFoundPage />
```

---

## 5.4 Komponen Teknis Backend

### 5.4.1 Validators (Input Validation)

| File                                   | Endpoint Terkait                                                            | Aturan Validasi                                                            |
| -------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `validators/renstraTargetValidator.js` | `/api/renstra-target`                                                       | indikator_id: int>0, tahun: 2000-2100, target_value: decimal, pagu: int>=0 |
| `utils/entityValidator.js`             | `/api/programs`, `/api/kegiatan`, `/api/sub-kegiatan`, `/api/periode-rpjmd` | Lihat detail di bawah                                                      |

**Validator Program (entityValidator.validateProgram):**

- `sasaran_id`: wajib
- `nama_program`: wajib
- `kode_program`: wajib
- `rpjmd_id`: wajib
- `prioritas`: wajib
- `tahun`: wajib, integer
- `jenis_dokumen`: wajib

**Validator Kegiatan (entityValidator.validateKegiatan):**

- `program_id`, `nama_kegiatan`, `kode_kegiatan`, `jenis_dokumen`, `tahun`: semua wajib

**Validator SubKegiatan (entityValidator.validateSubKegiatan):**

- `kegiatan_id`, `kode_sub_kegiatan`, `nama_sub_kegiatan`, `nama_opd`, `nama_bidang_opd`, `sub_bidang_opd`, `jenis_dokumen`, `tahun`: semua wajib

**Validator Periode (entityValidator.validatePeriode):**

- `tahun_awal`: wajib, int >= 1900
- `tahun_akhir`: wajib, int >= 1900, dan > tahun_awal

> ⚠️ **Gap:** Belum semua controller menggunakan validator. Controller yang belum tervalidasi: misi, tujuan, sasaran, strategi, arah-kebijakan, sebagian renstra.

---

### 5.4.2 Services

| File                                    | Fungsi                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `services/renstraCalculationService.js` | Hitung `target_akhir_renstra` (rata-rata) dan `pagu_akhir_renstra` (total) dari 6 tahun menggunakan `decimal.js` |
| `services/renstraValidationService.js`  | Validasi integritas data Renstra sebelum disimpan (referential check)                                            |

**Detail `renstraCalculationService.hitungAkhirRenstra(data)`:**

```
target_akhir_renstra = (target_tahun_1 + ... + target_tahun_6) / 6
pagu_akhir_renstra   = pagu_tahun_1 + ... + pagu_tahun_6
```

> ⚠️ **Gap:** Pembagi hardcode `6` — tidak akurat jika periode Renstra ≠ 6 tahun (lihat dokumen-4 gap #5)

---

### 5.4.3 Helpers

| File                               | Fungsi                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `helpers/aggregatePagu.js`         | Agregasi pagu dari SubKegiatan → Kegiatan → Program (cascade update) |
| `helpers/computeFinalRenstra.js`   | Hitung nilai akhir Renstra                                           |
| `helpers/generateKodeIndikator.js` | Generate kode indikator otomatis                                     |
| `helpers/updateKegiatanPagu.js`    | Update pagu kegiatan dari sub kegiatan                               |

---

### 5.4.4 Utils

| File                                                | Fungsi                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `utils/logger.js`                                   | Winston logger: `error.log` + `combined.log`                                                                                  |
| `utils/redisClient.js`                              | Koneksi Redis dengan auto-retry dan pooling                                                                                   |
| `utils/responseHelper.js`                           | Format respons API standar `{success, message, data}`                                                                         |
| `utils/pdfUtils.js`                                 | Utilitas generate PDF (pdfmake/pdfkit)                                                                                        |
| `utils/pdfSigner.js`                                | Tanda tangan digital PDF (signpdf + P12)                                                                                      |
| `utils/excelUtils.js`                               | Export Excel (ExcelJS)                                                                                                        |
| `utils/periodHelper.js`                             | Manajemen dan validasi periode                                                                                                |
| `utils/recommendationUtils.js`                      | Integrasi OpenAI untuk rekomendasi AI                                                                                         |
| `utils/safeRedis.js`                                | Wrapper operasi Redis yang aman (tidak throw jika Redis mati)                                                                 |
| `utils/validasiPaguKegiatanSubkegiatan.js`          | Validasi pagu sub kegiatan ≤ pagu kegiatan                                                                                    |
| `utils/validasiPaguRenstraTabelKegiatan.js`         | Validasi pagu tabel Renstra                                                                                                   |
| `utils/autoCloneHelper.js` + 12 file autoClone\*.js | Logic clone data per entitas (ArahKebijakan, Indikator, Kegiatan, Prioritas, Program, Sasaran, Strategi, SubKegiatan, Tujuan) |
| `utils/entityValidator.js`                          | Validasi input per entitas (express-validator)                                                                                |
| `utils/groupWarnings.js`                            | Agregasi peringatan validasi                                                                                                  |
| `utils/hapusSemuaCacheClone.js`                     | Cleanup cache Redis setelah operasi clone                                                                                     |
| `utils/includeRelations.js`                         | Helper Sequelize include/association loading                                                                                  |
| `utils/normalizeDecimal.js`                         | Normalisasi angka desimal (decimal.js)                                                                                        |

---

### 5.4.5 Seeders (Data Awal Sistem)

| File Seeder                               | Fungsi                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `add-roles.js`                            | Role awal: SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA           |
| `add-divisions.js` / `seed-divisions.js`  | Data divisi/unit kerja awal                                          |
| `seed-roles.js`                           | Seed tambahan role (ADMIN, SUPERVISOR, STAFF — untuk kompatibilitas) |
| `seed-opd-penanggung-jawab.js`            | Data OPD penanggung jawab awal                                       |
| `demo-periode-rpjmds.js`                  | Data demo periode RPJMD                                              |
| `dummy-opd-penanggung-jawab.js`           | Data OPD dummy untuk development                                     |
| `seed-misi-tujuan-to-indikatortujuans.js` | Backfill relasi Misi-Tujuan ke IndikatorTujuan                       |
| `add-nomor-to-existing-sasaran.js`        | Backfill nomor sasaran yang kosong                                   |
| `seed-strategi.js`                        | Seed data strategi awal                                              |
| `set-sasaran-id-prioritas-gubernur.js`    | Set relasi sasaran ↔ prioritas gubernur                              |

> **Perintah jalankan seeder:** `npx sequelize-cli db:seed:all`

---

### 5.4.6 Middlewares Detail

| File                 | Fungsi                                                      | Status                     |
| -------------------- | ----------------------------------------------------------- | -------------------------- |
| `verifyToken.js`     | Verifikasi JWT lokal + SSO SIGAP; inject `req.user`         | ✅ Aktif, gunakan ini      |
| `allowRoles.js`      | RBAC — cek role dari `req.user.role`; mapping SIGAP→ePeLARA | ✅ Aktif                   |
| `validateRequest.js` | Express-validator result checker                            | ✅ Aktif                   |
| `upload.js`          | Multer file upload ke `uploads/`                            | ✅ Aktif                   |
| `authenticate.js`    | **HARDCODE `req.user = {id:1, role:"SUPER ADMIN"}`**        | ❌ BAHAYA — Jangan gunakan |

---

## 5.5 Migrasi Database (Riwayat Perubahan Skema)

| ID Migrasi        | File                                    | Perubahan                             |
| ----------------- | --------------------------------------- | ------------------------------------- |
| 20250420094330    | `create-roles.js`                       | Buat tabel `roles`                    |
| 20250420101520    | `create-divisions.js`                   | Buat tabel `divisions`                |
| 20250420102223    | `create-users.js`                       | Buat tabel `users`                    |
| 20250525015058    | `create-renstra-opd.js`                 | Buat tabel `renstra_opd`              |
| 20250602022944    | `create-periode_rpjmd.js`               | Buat tabel `periode_rpjmds`           |
| 20250905094908    | `create-renstra-tabel-subkegiatan.js`   | Buat tabel tabel sub kegiatan Renstra |
| 20250905094910    | `create-renstra-tabel-tujuan.js`        | Buat tabel tabel tujuan Renstra       |
| 20250905094911    | `create-renstra-tabel-sasaran.js`       | Buat tabel tabel sasaran Renstra      |
| 20250906061725–28 | add/remove timestamps                   | Penyesuaian timestamp tabel Renstra   |
| 20250906061729    | `add-opd-id-to-renstra-tabel-tujuan.js` | Tambah FK `opd_id`                    |
| 20250906061730–31 | remove opd-penanggung-jawab             | Hapus kolom tidak terpakai            |

> **Jalankan migrasi:** `npx sequelize-cli db:migrate`  
> **Rollback:** `npx sequelize-cli db:migrate:undo`

---

_Dokumen ini dibuat pada: 23 Maret 2026_  
_Versi: 1.0_  
_Status: **Pedoman Aktif** — Wajib diperbarui setiap perubahan database/API/frontend_  
_Dibuat berdasarkan analisa langsung kode sumber aktual: `backend/server.js`, `backend/models/`, `backend/routes/`, `backend/migrations/`, `frontend/src/App.jsx`_

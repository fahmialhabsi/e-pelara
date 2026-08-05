# Rancangan Implementasi Modul ProSN Internal e-Pelara

## 1. Keputusan arsitektur

Modul ProSN adalah **kertas kerja internal**. Ia tidak menginput ke dan tidak
mengubah sistem ProSN nasional. Modul ini juga tidak boleh menulis ke
`renja_pro_sn_master` atau `renja_dukungan_prosn_tematik`.

Kedua tabel Renja tersebut hanya menjadi referensi opsional pada indikator.
Relasi tersebut bukan sumber kebenaran untuk target, realisasi, bukti, hasil
pemeriksaan, maupun status kerja ProSN.

Delapan tabel di bawah adalah tabel baru modul. Nama memakai awalan `prosnp_`
agar tidak berbenturan dengan referensi Renja `pro_sn` yang sudah ada.

## 2. Kontrak data dan status

### 2.1 Peran aplikasi

Tidak perlu membuat tabel peran ProSN baru. Terapkan permission module-level
pada role aplikasi yang telah ada:

| Peran ProSN | Role e-Pelara minimum | Izin utama |
|---|---|---|
| Administrator | `SUPER_ADMIN`, `ADMINISTRATOR` | seluruh periode, konfigurasi, override terbatas |
| Operator | `PELAKSANA` | membuat dan mengubah pengisian/bukti miliknya pada periode terbuka |
| Pemeriksa internal | `PENGAWAS` | memeriksa, memberi catatan, mengubah ke Perlu Perbaikan/Lengkap |
| Petugas input ProSN | permission `PROSN_INPUT` pada sistem hak akses yang sudah ada | menandai siap diinput/diinput manual dan mengunggah bukti input |

`PROSN_INPUT` adalah permission aplikasi, bukan alasan untuk membuat role global
baru bila role/permission e-Pelara sudah mendukung penugasan. Jika belum ada
permission granular, gunakan `ADMINISTRATOR` sementara untuk petugas input dan
tambahkan permission tersebut pada Tahap 2.

### 2.2 Status `prosnp_pengisian`

Nilai enum disediakan sejak migrasi pertama agar skema tidak perlu diubah pada
Tahap 2. Service membatasi transisi yang diaktifkan per fase.

| Status | Fase | Makna |
|---|---|---|
| `belum_diisi` | 1 | record dibuat dari seed, belum ada pekerjaan |
| `dalam_pengisian` | 1 | operator mulai mengisi |
| `lengkap` | 1 | operator/pemeriksa menyatakan siap diperiksa atau lolos |
| `perlu_perbaikan` | 1 | pemeriksa meminta perbaikan |
| `siap_diinput_prosn` | 2 | data final siap disalin ke sistem nasional |
| `diinput_manual` | 2 | petugas mencatat input manual selesai |
| `diarsipkan` | 2 | snapshot final sudah dibuat; bersifat read-only |

Transisi yang sah: `belum_diisi -> dalam_pengisian`; `dalam_pengisian -> lengkap`;
`lengkap -> perlu_perbaikan | siap_diinput_prosn`; `perlu_perbaikan -> dalam_pengisian | lengkap`;
`siap_diinput_prosn -> diinput_manual | dalam_pengisian`; `diinput_manual -> diarsipkan`.
Administrator dapat melakukan rollback hanya dengan `alasan` wajib. Tidak ada
hard delete untuk data yang telah diperiksa atau diarsipkan.

## 3. Skema basis data - migrasi Sequelize

Migrasi tunggal awal: `backend/migrations/20260805xxxxxx-create-prosnp-module.js`.
Tanggal final harus disesuaikan dengan urutan migrasi yang benar saat implementasi.
Semua foreign key user mengarah ke tabel aplikasi yang telah ada, `users`.

```js
'use strict';

const auditColumns = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});
const userRef = { model: 'users', key: 'id' };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prosnp_periode', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.INTEGER, allowNull: true },
      perangkat_daerah_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      semester: { type: Sequelize.ENUM('1', '2', 'tahunan'), allowNull: false, defaultValue: 'tahunan' },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_tenggat: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'aktif', 'terkunci', 'diarsipkan'), allowNull: false, defaultValue: 'draft' },
      dikunci_at: { type: Sequelize.DATE, allowNull: true },
      dikunci_oleh: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_periode', ['tenant_id', 'perangkat_daerah_id', 'tahun', 'semester'], { unique: true, name: 'uq_prosnp_periode_scope' });
    await queryInterface.addIndex('prosnp_periode', ['status', 'tanggal_tenggat']);

    await queryInterface.createTable('prosnp_indikator', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      kode: { type: Sequelize.STRING(32), allowNull: false },
      nama: { type: Sequelize.STRING(500), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      tipe_form: { type: Sequelize.ENUM('dukungan_program', 'target_capaian_rasio', 'distribusi_status'), allowNull: false },
      konfigurasi_form: { type: Sequelize.JSON, allowNull: false },
      satuan_default: { type: Sequelize.STRING(80), allowNull: true },
      rumus: { type: Sequelize.TEXT, allowNull: true },
      wajib_bukti: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      minimum_bukti: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      renja_pro_sn_master_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'renja_pro_sn_master', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      renja_dukungan_prosn_tematik_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'renja_dukungan_prosn_tematik', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_indikator', ['periode_id', 'kode'], { unique: true, name: 'uq_prosnp_indikator_periode_kode' });
    await queryInterface.addIndex('prosnp_indikator', ['periode_id', 'aktif', 'urutan']);

    await queryInterface.createTable('prosnp_pengisian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      status: { type: Sequelize.ENUM('belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan', 'siap_diinput_prosn', 'diinput_manual', 'diarsipkan'), allowNull: false, defaultValue: 'belum_diisi' },
      data_form: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      target_nilai: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
      realisasi_nilai: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
      rasio_nilai: { type: Sequelize.DECIMAL(9, 4), allowNull: true },
      satuan: { type: Sequelize.STRING(80), allowNull: true },
      sumber_data: { type: Sequelize.TEXT, allowNull: true },
      periode_data: { type: Sequelize.STRING(100), allowNull: true },
      hambatan: { type: Sequelize.TEXT, allowNull: true },
      tindak_lanjut: { type: Sequelize.TEXT, allowNull: true },
      diisi_oleh: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      diisi_at: { type: Sequelize.DATE, allowNull: true },
      siap_input_oleh: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      siap_input_at: { type: Sequelize.DATE, allowNull: true },
      input_manual_oleh: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      input_manual_at: { type: Sequelize.DATE, allowNull: true },
      nomor_bukti_input: { type: Sequelize.STRING(150), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_pengisian', ['indikator_id'], { unique: true, name: 'uq_prosnp_pengisian_indikator' });
    await queryInterface.addIndex('prosnp_pengisian', ['status']);

    await queryInterface.createTable('prosnp_bukti_dukung', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.INTEGER, allowNull: true },
      kelompok_uuid: { type: Sequelize.UUID, allowNull: false },
      versi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      judul: { type: Sequelize.STRING(255), allowNull: false },
      jenis_bukti: { type: Sequelize.STRING(80), allowNull: true },
      nama_asli: { type: Sequelize.STRING(255), allowNull: false },
      nama_tersimpan: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      file_url: { type: Sequelize.STRING(500), allowNull: true },
      mime_type: { type: Sequelize.STRING(150), allowNull: false },
      ukuran_byte: { type: Sequelize.BIGINT, allowNull: false },
      checksum_sha256: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.ENUM('aktif', 'perlu_perbaikan', 'digantikan', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },
      menggantikan_bukti_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'prosnp_bukti_dukung', key: 'id' }, onDelete: 'SET NULL' },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      diunggah_oleh: { type: Sequelize.INTEGER, allowNull: false, references: userRef, onDelete: 'RESTRICT' },
      diunggah_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['kelompok_uuid', 'versi'], { unique: true, name: 'uq_prosnp_bukti_versi' });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['tenant_id', 'checksum_sha256']);

    await queryInterface.createTable('prosnp_bukti_indikator', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bukti_dukung_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_bukti_dukung', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      relevansi: { type: Sequelize.TEXT, allowNull: true },
      checklist_status: { type: Sequelize.ENUM('belum_dicek', 'sesuai', 'tidak_sesuai'), allowNull: false, defaultValue: 'belum_dicek' },
      catatan_kekurangan: { type: Sequelize.TEXT, allowNull: true },
      ditautkan_oleh: { type: Sequelize.INTEGER, allowNull: true, references: userRef, onDelete: 'SET NULL' },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['bukti_dukung_id', 'indikator_id'], { unique: true, name: 'uq_prosnp_bukti_indikator' });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['indikator_id', 'checklist_status']);

    await queryInterface.createTable('prosnp_pemeriksaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      putaran: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      hasil: { type: Sequelize.ENUM('lengkap', 'perlu_perbaikan'), allowNull: false },
      status_data: { type: Sequelize.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
      status_bukti: { type: Sequelize.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
      catatan_kekurangan: { type: Sequelize.TEXT, allowNull: true },
      diperiksa_oleh: { type: Sequelize.INTEGER, allowNull: false, references: userRef, onDelete: 'RESTRICT' },
      diperiksa_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_pemeriksaan', ['pengisian_id', 'putaran'], { unique: true, name: 'uq_prosnp_pemeriksaan_putaran' });

    await queryInterface.createTable('prosnp_riwayat_status', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      status_sebelum: { type: Sequelize.STRING(40), allowNull: true },
      status_sesudah: { type: Sequelize.STRING(40), allowNull: false },
      alasan: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      diubah_oleh: { type: Sequelize.INTEGER, allowNull: false, references: userRef, onDelete: 'RESTRICT' },
      diubah_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('prosnp_riwayat_status', ['pengisian_id', 'diubah_at']);

    await queryInterface.createTable('prosnp_arsip', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      nomor_arsip: { type: Sequelize.STRING(100), allowNull: false },
      snapshot_data: { type: Sequelize.JSON, allowNull: false },
      checksum_snapshot: { type: Sequelize.STRING(64), allowNull: false },
      bukti_input_manual_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'prosnp_bukti_dukung', key: 'id' }, onDelete: 'SET NULL' },
      diekspor_excel_at: { type: Sequelize.DATE, allowNull: true },
      diekspor_pdf_at: { type: Sequelize.DATE, allowNull: true },
      diekspor_word_at: { type: Sequelize.DATE, allowNull: true },
      diarsipkan_oleh: { type: Sequelize.INTEGER, allowNull: false, references: userRef, onDelete: 'RESTRICT' },
      diarsipkan_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_arsip', ['periode_id'], { unique: true, name: 'uq_prosnp_arsip_periode' });
    await queryInterface.addIndex('prosnp_arsip', ['nomor_arsip'], { unique: true, name: 'uq_prosnp_nomor_arsip' });
  },
  async down(queryInterface) {
    for (const table of ['prosnp_arsip', 'prosnp_riwayat_status', 'prosnp_pemeriksaan', 'prosnp_bukti_indikator', 'prosnp_bukti_dukung', 'prosnp_pengisian', 'prosnp_indikator', 'prosnp_periode']) await queryInterface.dropTable(table);
  },
};
```

Catatan implementasi: pastikan nama fisik tabel `perangkat_daerah` sesuai
migrasi yang ada sebelum menjalankan migration. `tenant_id` harus mengikuti
tenant hook e-Pelara bila modul dipakai lintas tenant; hapus kolom tersebut
hanya bila deployment dipastikan tunggal.

## 4. Model layer

Buat delapan factory model di `backend/models/`, seluruhnya dengan pola:
`underscored: true`, `timestamps: true`, `createdAt: 'created_at'`, dan
`updatedAt: 'updated_at'`. Nama model:

| File | Model | Asosiasi wajib |
|---|---|---|
| `prosnpPeriodeModel.js` | `ProsnPPeriode` | `hasMany(ProsnPIndikator, { as: 'indikators' })`, `hasOne(ProsnPArsip, { as: 'arsip' })` |
| `prosnpIndikatorModel.js` | `ProsnPIndikator` | `belongsTo(ProsnPPeriode)`, `hasOne(ProsnPPengisian, { as: 'pengisian' })`, `belongsToMany(ProsnPBuktiDukung, through: ProsnPBuktiIndikator)` |
| `prosnpPengisianModel.js` | `ProsnPPengisian` | `belongsTo(ProsnPIndikator)`, `hasMany(ProsnPPemeriksaan)`, `hasMany(ProsnPRiwayatStatus)` |
| `prosnpBuktiDukungModel.js` | `ProsnPBuktiDukung` | self `belongsTo(..., { as: 'versiSebelumnya' })`, `belongsToMany(ProsnPIndikator, through: ProsnPBuktiIndikator)` |
| `prosnpBuktiIndikatorModel.js` | `ProsnPBuktiIndikator` | `belongsTo(ProsnPBuktiDukung)`, `belongsTo(ProsnPIndikator)` |
| `prosnpPemeriksaanModel.js` | `ProsnPPemeriksaan` | `belongsTo(ProsnPPengisian, { as: 'pengisian' })` |
| `prosnpRiwayatStatusModel.js` | `ProsnPRiwayatStatus` | `belongsTo(ProsnPPengisian, { as: 'pengisian' })` |
| `prosnpArsipModel.js` | `ProsnPArsip` | `belongsTo(ProsnPPeriode)`, `belongsTo(ProsnPBuktiDukung, { as: 'buktiInputManual' })` |

Tambahkan relasi `belongsTo(models.User, ...)` hanya bila nama model pengguna
yang terdaftar benar-benar `User`; foreign key migration tetap `users.id`.
Model reference Renja memakai `belongsTo(models.RenjaProSnMaster, { as:
'referensiProSn' })` dan `belongsTo(models.RenjaDukunganProsnTematik, { as:
'referensiDukunganRenja' })` pada `ProsnPIndikator`.

## 5. API REST

Base path: `/api/prosnp`. Seluruh endpoint memakai `verifyToken`. Tenant dan
`perangkat_daerah_id` selalu divalidasi di service, bukan dipercaya dari body.

| Endpoint | Akses | Kontrak ringkas |
|---|---|---|
| `GET /periode` | semua peran | filter `tahun,status`; daftar periode scoped |
| `POST /periode` | Administrator | `{ tahun, semester, nama, tanggal_mulai, tanggal_tenggat }` |
| `GET /periode/:id` | semua peran | periode, indikator, ringkasan status |
| `PATCH /periode/:id` | Administrator | hanya `draft/aktif`; tidak mengubah scope |
| `POST /periode/:id/aktifkan` | Administrator | mengubah `draft -> aktif` dan membuat pengisian kosong |
| `POST /periode/:id/indikator` | Administrator | konfigurasi indikator tambahan/opsional |
| `PATCH /indikator/:id` | Administrator | konfigurasi, bukan data pengisian |
| `GET /indikator/:id/pengisian` | semua peran | pengisian, bukti, pemeriksaan, riwayat |
| `PUT /indikator/:id/pengisian` | Operator/Admin | target/realisasi/data_form/sumber/hambatan/tindak lanjut |
| `POST /pengisian/:id/transisi` | role sesuai transisi | `{ status_tujuan, alasan? }` |
| `POST /pengisian/:id/pemeriksaan` | Pemeriksa/Admin | `{ hasil, status_data, status_bukti, catatan_kekurangan }` |
| `POST /bukti` | Operator/Admin | multipart `file`, `judul`, `jenis_bukti`, `indikator_ids[]`, `relevansi` |
| `POST /bukti/:id/versi` | Operator/Admin | multipart file pengganti; versi baru, versi lama `digantikan` |
| `PATCH /bukti-relasi/:id/checklist` | Pemeriksa/Admin | `{ checklist_status, catatan_kekurangan }` |
| `GET /bukti/:id/download` | role berhak | stream file setelah otorisasi scope |
| `GET /periode/:id/ekspor/excel` | Admin/Pemeriksa/Petugas input | file Excel template resmi |
| `GET /periode/:id/ekspor/pdf` | Admin/Pemeriksa/Petugas input | PDF annual report |
| `GET /periode/:id/ekspor/word` | Admin/Pemeriksa/Petugas input | DOCX annual report |
| `POST /periode/:id/arsipkan` | Admin/Petugas input | `{ bukti_input_manual_id, catatan? }`; transaksi snapshot + lock |
| `GET /periode/:id/arsip` | semua peran | snapshot immutable |

Response sukses konsisten dengan pola backend:

```json
{ "success": true, "data": { "id": 14, "status": "lengkap" }, "meta": {} }
```

Error validasi menggunakan `400`, tidak punya akses `403`, record tidak ada
`404`, konflik transisi/status terkunci `409`, dan unggahan file tidak valid
`422`. Jangan pernah menerima `tenant_id`, `diisi_oleh`, `diperiksa_oleh`, atau
`diarsipkan_oleh` dari client.

## 6. Logic layer dan validasi alur

Service utama: `backend/services/prosnp/prosnpWorkflowService.js`. Seluruh
perubahan status harus dilakukan dalam transaksi Sequelize:

1. ambil `pengisian` beserta indikator, periode, relasi bukti aktif, dan status terakhir;
2. cek tenant/OPD dan permission pemohon;
3. cek periode `aktif` dan transisi yang diizinkan;
4. sebelum `lengkap`, validasi field wajib dari `konfigurasi_form`, sumber data,
   dan minimum bukti aktif;
5. sebelum `siap_diinput_prosn`, wajib ada pemeriksaan terbaru dengan `hasil=lengkap`;
6. sebelum `diinput_manual`, wajib petugas input dan `nomor_bukti_input` atau
   file bukti input;
7. sebelum `diarsipkan`, semua indikator aktif harus `diinput_manual`;
8. update pengisian, insert satu riwayat append-only, lalu commit.

`prosnp_riwayat_status` tidak mempunyai endpoint ubah/hapus. Saat rollback
administrator, insert event baru, bukan edit event lama.

## 7. Tiga form generik pada satu tabel pengisian

Kolom yang seragam (`target_nilai`, `realisasi_nilai`, `rasio_nilai`, `satuan`,
`sumber_data`, `hambatan`, `tindak_lanjut`) dipakai untuk ringkasan, filter,
ekspor, dan dashboard. Detail berbeda disimpan dalam `data_form` JSON dan
divalidasi berdasarkan `indikator.tipe_form` + `konfigurasi_form` oleh service
Joi sebelum disimpan.

| Tipe | `data_form` minimum | Contoh penggunaan |
|---|---|---|
| `dukungan_program` | `{ "program": "...", "kegiatan": "...", "sub_kegiatan": "...", "anggaran_target": 0, "anggaran_realisasi": 0, "lokasi": "..." }` | B.1.1, B.1.2 |
| `target_capaian_rasio` | `{ "pembilang": 0, "penyebut": 0, "periode_pengukuran": "...", "metode": "..." }` | B.1.3 rasio stok beras |
| `distribusi_status` | `{ "kategori": [{ "kode": "...", "label": "...", "jumlah": 0 }], "total": 0, "definisi_kategori": "..." }` | C.1.6 dan indikator distribusi |

Contoh konfigurasi B.1.3:

```json
{
  "required": ["pembilang", "penyebut", "periode_pengukuran"],
  "formula": "(pembilang / penyebut) * 100",
  "min": 0,
  "max": 100,
  "display": { "target": "Persen", "realisasi": "Persen" }
}
```

JSON bukan tempat menyimpan file atau status workflow. Field JSON harus dibatasi
schema dan ukuran payloadnya; database tetap menyimpan kolom yang perlu dicari,
diurutkan, atau diaudit.

## 8. Bukti dukung

Upload memakai `multer.diskStorage`, pola yang telah digunakan backend. Simpan
di `backend/uploads/prosnp/<tenant>/<periode>/<uuid>-<nama-aman>`. Validasi:
PDF, XLSX, DOCX, JPG, PNG; batas ukuran sesuai kebijakan; nama aman; hitung
SHA-256 dari buffer/file; dan akses download harus melalui controller agar
scope tenant/OPD diterapkan.

Upload baru membuat satu `prosnp_bukti_dukung`, lalu membuat N baris
`prosnp_bukti_indikator` dari daftar indikator yang dipilih. Dengan begitu satu
file dapat dipakai banyak indikator tanpa duplikasi berkas. Upload revisi
membuat row baru dengan `kelompok_uuid` sama dan `versi + 1`; row lama ditandai
`digantikan`, tidak ditimpa atau dihapus.

Checklist per hubungan bukti-indikator penting karena satu file dapat cukup
untuk indikator A namun belum cukup untuk indikator B.

## 9. Ekspor dan arsip

Service: `prosnpExportService.js` (ExcelJS), `prosnpAnnualReportService.js`
(DOCX/PDF generator yang sudah dipakai backend), dan `prosnpArchiveService.js`.

Dataset tunggal yang disiapkan service export harus memuat: identitas periode,
metadata indikator, target/realisasi/rasio, detail `data_form`, sumber,
hambatan, tindak lanjut, status, pemeriksaan terakhir, daftar bukti aktif,
serta jejak input manual. Excel memakai sheet ringkasan + satu sheet tiap tipe
form. PDF/DOCX memakai halaman judul, ringkasan eksekutif, tabel capaian per
indikator, analisis hambatan/tindak lanjut, daftar bukti, dan lampiran.

Pengarsipan dilakukan dalam satu transaksi: validasi seluruh item, serialisasi
dataset export canonical ke `snapshot_data`, hash SHA-256 ke `checksum_snapshot`,
insert `prosnp_arsip`, ubah semua pengisian ke `diarsipkan`, dan kunci periode.
Snapshot tidak diregenerasi dari tabel hidup saat pengguna melihat arsip.

## 10. Seed awal

Buat `backend/scripts/seedProsnPIndikator.js` yang menerima `periode_id` dan
idempotent dengan natural key `(periode_id, kode)`. Seed hanya boleh berjalan
untuk periode `draft`; setelah periode aktif, perubahan indikator melalui API
administrator dan semua perubahan tercatat.

| Kode | Nama kerja awal | Tipe form | Satuan | Wajib bukti |
|---|---|---|---|---|
| B.1.1 | Dukungan program/kegiatan ProSN I | `dukungan_program` | rupiah/kegiatan | ya |
| B.1.2 | Dukungan program/kegiatan ProSN II | `dukungan_program` | rupiah/kegiatan | ya |
| B.1.3 | Rasio ketersediaan stok beras | `target_capaian_rasio` | persen | ya |
| B.1.4 | Capaian indikator utama ProSN | `target_capaian_rasio` | sesuai definisi | ya |
| MBG | Dukungan Makan Bergizi Gratis | `dukungan_program` | rupiah/penerima | opsional, `aktif=false` awal |
| TPID | Dukungan pengendalian inflasi daerah | `dukungan_program` | kegiatan | opsional, `aktif=false` awal |

`C.1.6` tidak perlu disimpan aktif pada seed minimum jika belum masuk ruang
lingkup awal; saat diaktifkan, gunakan `distribusi_status` dengan konfigurasi
kategori yang disepakati Dinas Pangan.

## 11. Roadmap

| Tahap | Cakupan | Kompleksitas | Keluaran penerimaan |
|---|---|---|---|
| 1 - Fondasi | migrasi 8 tabel, model, periode, seed, tiga form, upload dasar, status sampai `lengkap/perlu_perbaikan`, RBAC | tinggi | operator mengisi B.1.1-B.1.4, pemeriksa memberi keputusan, bukti terhubung |
| 2 - Pemeriksaan dan input | checklist bukti, versi, log immutable, status siap input/diinput/arsip, bukti input nasional, notifikasi in-app/email opsional | tinggi | periode dapat diselesaikan dan snapshot arsip tervalidasi |
| 3 - Ekspor | dataset canonical, template Excel resmi, PDF/DOCX annual report, uji render | tinggi | laporan profesional konsisten dengan snapshot |
| 4 - Perluasan | MBG/TPID/C.1.6, dashboard, konfigurasi indikator lebih luas, pengingat tenggat dan analitik | sedang | indikator baru aktif tanpa migrasi tabel |

Urutan pengujian minimum: migration up/down pada database uji, unit test matriks
transisi status, integrasi otorisasi tenant/role, validasi schema setiap tipe
form, upload/revisi bukti M:N, snapshot immutability, serta render visual PDF
dan DOCX sebelum rilis.

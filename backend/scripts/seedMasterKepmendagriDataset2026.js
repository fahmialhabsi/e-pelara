'use strict';

/**
 * Duplikasi dataset master nomenklatur `kepmendagri_provinsi_900_2024` menjadi
 * dataset baru `kepmendagri_provinsi_900_2026` (Kepmendagri No. 900.1-861 Tahun 2026),
 * lalu menambahkan Sub Kegiatan baru pada urusan Pangan (2.09.02-2.09.05) yang
 * dikonfirmasi user belum ada di dataset lama, berdasarkan pembacaan
 * dokumenEPelara/Kepmendagri-No-900-1-861-Tahun-2026 OK.pdf hal. 378-387.
 *
 * Program/Kegiatan/Sub Kegiatan yang kode+namanya sudah sama persis tidak
 * diubah (hanya disalin apa adanya); 2.09.01 (umum lintas OPD) ikut disalin
 * tanpa modifikasi.
 *
 * Aman diulang: dataset baru dihapus dulu jika sudah ada sebelum disalin ulang.
 *
 * Pakai:
 *   node scripts/seedMasterKepmendagriDataset2026.js --uji   # rencana saja
 *   node scripts/seedMasterKepmendagriDataset2026.js         # terapkan
 */

const db = require('../models');

const DATASET_LAMA = 'kepmendagri_provinsi_900_2024';
const DATASET_BARU = 'kepmendagri_provinsi_900_2026';
const DATASET_MANUAL_LAMA = 'manual-kepmendagri-900.1-861-2026';

const SUB_KEGIATAN_BARU = [
  {
    kode_kegiatan_full: '2.09.03.1.01',
    kode_sub_kegiatan: '0015',
    kode_sub_kegiatan_full: '2.09.03.1.01.0015',
    nama_sub_kegiatan: 'Penyusunan Proyeksi Neraca Pangan Wilayah Provinsi',
    kinerja: 'Tersedianya data proyeksi neraca pangan Wilayah Provinsi',
    indikator: 'Data Proyeksi Neraca Pangan Wilayah Provinsi',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan_full: '2.09.04.1.02',
    kode_sub_kegiatan: '0006',
    kode_sub_kegiatan_full: '2.09.04.1.02.0006',
    nama_sub_kegiatan: 'Kajian Kesiapsiagaan Krisis Pangan untuk skala provinsi',
    kinerja: 'Terlaksananya Kajian Kesiapsiagaan Krisis Pangan untuk skala provinsi',
    indikator: 'Kajian Kesiapsiagaan Krisis Pangan untuk skala provinsi yang Ditetapkan',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan_full: '2.09.04.1.02',
    kode_sub_kegiatan: '0007',
    kode_sub_kegiatan_full: '2.09.04.1.02.0007',
    nama_sub_kegiatan: 'Fasilitasi sarana dan prasarana mendukung penyelamatan pangan Provinsi',
    kinerja: 'Terfasilitasinya sarana dan prasarana mendukung penyelamatan pangan Provinsi',
    indikator: 'Sarana dan prasarana mendukung penyelamatan pangan Provinsi',
    satuan: 'Paket',
  },
  {
    kode_kegiatan_full: '2.09.04.1.02',
    kode_sub_kegiatan: '0008',
    kode_sub_kegiatan_full: '2.09.04.1.02.0008',
    nama_sub_kegiatan: 'Pelaksanaan kebijakan dan aksi penyelamatan pangan Provinsi',
    kinerja: 'Terlaksananya kebijakan dan aksi penyelamatan pangan Provinsi',
    indikator: 'Jumlah Kebijakan dan aksi penyelamatan pangan Provinsi yang dilaksanakan',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan_full: '2.09.05.1.01',
    kode_sub_kegiatan: '0012',
    kode_sub_kegiatan_full: '2.09.05.1.01.0012',
    nama_sub_kegiatan: 'Fasilitasi dan Pembinaan Pasar Pangan Segar Aman',
    kinerja: 'Terlaksananya fasilitasi dan pembinaan Pasar Pangan Segar Aman',
    indikator: 'Jumlah lokasi Pasar Pangan Segar Aman yang terfasilitasi',
    satuan: 'Unit',
  },
];

const REGULASI_VERSI_BARU = {
  nama_regulasi: 'Kepmendagri 900.1-861 Tahun 2026',
  nomor_regulasi: '900.1-861',
  nomor_peraturan: '900.1-861',
  tahun: 2026,
  deskripsi:
    'Pemutakhiran nomenklatur Program/Kegiatan/Sub Kegiatan urusan Pangan (2.09.02-2.09.05) dari Kepmendagri 900.1.15.5-3406/2024. Sumber: dokumenEPelara/Kepmendagri-No-900-1-861-Tahun-2026 OK.pdf hal. 378-387.',
  sumber_dokumen_url: 'dokumenEPelara/Kepmendagri-No-900-1-861-Tahun-2026 OK.pdf',
  is_active: true,
};

async function main() {
  const ujiSaja = process.argv.includes('--uji');
  const sequelize = db.sequelize;

  const [[{ n: totalProgramLama }]] = await sequelize.query(
    'SELECT COUNT(*) AS n FROM master_program WHERE dataset_key = :d',
    { replacements: { d: DATASET_LAMA } },
  );
  if (Number(totalProgramLama) === 0) {
    throw new Error(`Dataset sumber "${DATASET_LAMA}" tidak ditemukan / kosong.`);
  }

  console.log(`[rencana] Salin dataset "${DATASET_LAMA}" -> "${DATASET_BARU}"`);
  console.log(`[rencana] Tambah ${SUB_KEGIATAN_BARU.length} sub kegiatan baru urusan Pangan`);
  console.log(`[rencana] Buat regulasi_versi baru: ${REGULASI_VERSI_BARU.nama_regulasi}`);
  console.log(`[rencana] Hapus baris uji lama dataset_key="${DATASET_MANUAL_LAMA}"`);

  if (ujiSaja) {
    console.log('[uji] Tidak ada perubahan ditulis (--uji).');
    return;
  }

  await sequelize.transaction(async (t) => {
    await sequelize.query('DELETE FROM master_sub_kegiatan WHERE dataset_key = :d', {
      replacements: { d: DATASET_BARU },
      transaction: t,
    });
    await sequelize.query('DELETE FROM master_kegiatan WHERE dataset_key = :d', {
      replacements: { d: DATASET_BARU },
      transaction: t,
    });
    await sequelize.query('DELETE FROM master_program WHERE dataset_key = :d', {
      replacements: { d: DATASET_BARU },
      transaction: t,
    });

    let [existingVersi] = await sequelize.query(
      'SELECT id FROM regulasi_versi WHERE nomor_peraturan = :nomor',
      { replacements: { nomor: REGULASI_VERSI_BARU.nomor_peraturan }, transaction: t },
    );
    let regulasiVersiId;
    if (existingVersi.length) {
      regulasiVersiId = existingVersi[0].id;
      console.log(`[info] regulasi_versi sudah ada (id=${regulasiVersiId}), pakai ulang.`);
    } else {
      const [insertResult] = await sequelize.query(
        `INSERT INTO regulasi_versi
           (nama_regulasi, nomor_regulasi, nomor_peraturan, tahun, deskripsi, sumber_dokumen_url, is_active, created_at, updated_at)
         VALUES
           (:nama_regulasi, :nomor_regulasi, :nomor_peraturan, :tahun, :deskripsi, :sumber_dokumen_url, :is_active, NOW(), NOW())`,
        { replacements: REGULASI_VERSI_BARU, transaction: t },
      );
      regulasiVersiId = insertResult;
      console.log(`[info] regulasi_versi dibuat (id=${regulasiVersiId}).`);
    }

    await sequelize.query(
      `INSERT INTO master_program
         (dataset_key, kode_urusan, kode_bidang_urusan, kode_program, kode_program_full, nama_urusan, nama_program, regulasi_versi_id, is_active, created_at, updated_at)
       SELECT :datasetBaru, kode_urusan, kode_bidang_urusan, kode_program, kode_program_full, nama_urusan, nama_program, :regulasiVersiId, is_active, NOW(), NOW()
       FROM master_program WHERE dataset_key = :datasetLama`,
      { replacements: { datasetBaru: DATASET_BARU, datasetLama: DATASET_LAMA, regulasiVersiId }, transaction: t },
    );

    await sequelize.query(
      `INSERT INTO master_kegiatan
         (master_program_id, dataset_key, kode_kegiatan, kode_kegiatan_full, nama_kegiatan, regulasi_versi_id, is_active, created_at, updated_at)
       SELECT newp.id, :datasetBaru, k.kode_kegiatan, k.kode_kegiatan_full, k.nama_kegiatan, :regulasiVersiId, k.is_active, NOW(), NOW()
       FROM master_kegiatan k
       JOIN master_program oldp ON oldp.id = k.master_program_id AND oldp.dataset_key = :datasetLama
       JOIN master_program newp ON newp.dataset_key = :datasetBaru AND newp.kode_program_full = oldp.kode_program_full
       WHERE k.dataset_key = :datasetLama`,
      { replacements: { datasetBaru: DATASET_BARU, datasetLama: DATASET_LAMA, regulasiVersiId }, transaction: t },
    );

    await sequelize.query(
      `INSERT INTO master_sub_kegiatan
         (master_kegiatan_id, dataset_key, kode_sub_kegiatan, kode_sub_kegiatan_full, nama_sub_kegiatan, kinerja, indikator, satuan, regulasi_versi_id, is_active, created_at, updated_at)
       SELECT newk.id, :datasetBaru, s.kode_sub_kegiatan, s.kode_sub_kegiatan_full, s.nama_sub_kegiatan, s.kinerja, s.indikator, s.satuan, :regulasiVersiId, s.is_active, NOW(), NOW()
       FROM master_sub_kegiatan s
       JOIN master_kegiatan oldk ON oldk.id = s.master_kegiatan_id AND oldk.dataset_key = :datasetLama
       JOIN master_kegiatan newk ON newk.dataset_key = :datasetBaru AND newk.kode_kegiatan_full = oldk.kode_kegiatan_full
       WHERE s.dataset_key = :datasetLama`,
      { replacements: { datasetBaru: DATASET_BARU, datasetLama: DATASET_LAMA, regulasiVersiId }, transaction: t },
    );

    const [[{ n: totalProgramBaru }]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM master_program WHERE dataset_key = :d',
      { replacements: { d: DATASET_BARU }, transaction: t },
    );
    const [[{ n: totalKegiatanBaru }]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM master_kegiatan WHERE dataset_key = :d',
      { replacements: { d: DATASET_BARU }, transaction: t },
    );
    const [[{ n: totalSubBaru }]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM master_sub_kegiatan WHERE dataset_key = :d',
      { replacements: { d: DATASET_BARU }, transaction: t },
    );
    console.log(
      `[info] Disalin: ${totalProgramBaru} program, ${totalKegiatanBaru} kegiatan, ${totalSubBaru} sub kegiatan.`,
    );

    for (const item of SUB_KEGIATAN_BARU) {
      const [[kegiatan]] = await sequelize.query(
        'SELECT id FROM master_kegiatan WHERE dataset_key = :d AND kode_kegiatan_full = :k',
        { replacements: { d: DATASET_BARU, k: item.kode_kegiatan_full }, transaction: t },
      );
      if (!kegiatan) {
        throw new Error(`Kegiatan ${item.kode_kegiatan_full} tidak ditemukan di dataset baru.`);
      }
      await sequelize.query(
        `INSERT INTO master_sub_kegiatan
           (master_kegiatan_id, dataset_key, kode_sub_kegiatan, kode_sub_kegiatan_full, nama_sub_kegiatan, kinerja, indikator, satuan, regulasi_versi_id, is_active, created_at, updated_at)
         VALUES
           (:kegiatanId, :datasetBaru, :kode_sub_kegiatan, :kode_sub_kegiatan_full, :nama_sub_kegiatan, :kinerja, :indikator, :satuan, :regulasiVersiId, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           nama_sub_kegiatan = VALUES(nama_sub_kegiatan),
           kinerja = VALUES(kinerja),
           indikator = VALUES(indikator),
           satuan = VALUES(satuan),
           regulasi_versi_id = VALUES(regulasi_versi_id),
           is_active = 1`,
        {
          replacements: {
            kegiatanId: kegiatan.id,
            datasetBaru: DATASET_BARU,
            kode_sub_kegiatan: item.kode_sub_kegiatan,
            kode_sub_kegiatan_full: item.kode_sub_kegiatan_full,
            nama_sub_kegiatan: item.nama_sub_kegiatan,
            kinerja: item.kinerja,
            indikator: item.indikator,
            satuan: item.satuan,
            regulasiVersiId,
          },
          transaction: t,
        },
      );
      console.log(`[tambah] ${item.kode_sub_kegiatan_full} - ${item.nama_sub_kegiatan}`);
    }

    const [deleteResult] = await sequelize.query(
      'DELETE FROM master_sub_kegiatan WHERE dataset_key = :d',
      { replacements: { d: DATASET_MANUAL_LAMA }, transaction: t },
    );
    console.log(`[bersih] Hapus baris uji lama dataset_key="${DATASET_MANUAL_LAMA}".`);

    const [[{ n: totalSubAkhir }]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM master_sub_kegiatan WHERE dataset_key = :d',
      { replacements: { d: DATASET_BARU }, transaction: t },
    );
    console.log(`[selesai] Total sub kegiatan dataset baru: ${totalSubAkhir}.`);
  });

  console.log('[selesai] Dataset "kepmendagri_provinsi_900_2026" siap dipakai.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[gagal]', err);
    process.exit(1);
  });

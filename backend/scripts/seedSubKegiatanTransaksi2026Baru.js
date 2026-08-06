'use strict';

/**
 * Tambah baris `sub_kegiatan` (tabel transaksi RPJMD/Renstra, BUKAN master
 * nomenklatur) untuk 5 Sub Kegiatan baru Kepmendagri 900.1-861/2026 (urusan
 * Pangan) yang sudah masuk ke `master_sub_kegiatan` dataset
 * `kepmendagri_provinsi_900_2026` (lihat seedMasterKepmendagriDataset2026.js)
 * tapi belum punya baris transaksi — sehingga tidak muncul di dropdown
 * "Sub Kegiatan" pada form Tambah Sub Kegiatan Renstra (baca dari tabel
 * `sub_kegiatan`, filter `kegiatan_id`, bukan dari `master_sub_kegiatan`).
 *
 * PENTING: pagu_anggaran/target_awal/target_akhir sengaja dikosongkan (0/NULL)
 * karena ini aktivitas baru yang belum pernah dianggarkan — isi manual lewat
 * form Edit Sub Kegiatan setelah baris ini muncul di dropdown.
 *
 * nama_bidang_opd/sub_bidang_opd mengikuti pola sub kegiatan sejenis
 * (tema kerawanan/mutu pangan) di Kegiatan yang sama; bukan asumsi acak.
 *
 * Aman diulang: pakai INSERT ... ON DUPLICATE KEY tidak berlaku (tidak ada
 * unique constraint kode+kegiatan), jadi cek dulu duplikat kode_sub_kegiatan
 * per kegiatan_id sebelum insert.
 *
 * Pakai:
 *   node scripts/seedSubKegiatanTransaksi2026Baru.js --uji
 *   node scripts/seedSubKegiatanTransaksi2026Baru.js
 */

const db = require('../models');

const REGULASI_VERSI_2026 = 'Kepmendagri 900.1-861 Tahun 2026';
const DATASET_2026 = 'kepmendagri_provinsi_900_2026';
const NAMA_OPD = 'Dinas Pangan';
const PERIODE_ID = 2;
const JENIS_DOKUMEN = 'rpjmd';
const TAHUN = 2025;

const BARIS_BARU = [
  {
    kode_kegiatan: '2.09.03.1.01',
    kode_sub_kegiatan: '2.09.03.1.01.0015',
    nama_sub_kegiatan: 'Penyusunan Proyeksi Neraca Pangan Wilayah Provinsi',
    nama_bidang_opd: 'Bidang Konsumsi Dan Keamanan Pangan',
    sub_bidang_opd: 'Seksi Kerawanan Pangan',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan: '2.09.04.1.02',
    kode_sub_kegiatan: '2.09.04.1.02.0006',
    nama_sub_kegiatan: 'Kajian Kesiapsiagaan Krisis Pangan untuk skala provinsi',
    nama_bidang_opd: 'Bidang Ketersediaan & Kerawanan Pangan',
    sub_bidang_opd: 'Seksi Kerawanan Pangan',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan: '2.09.04.1.02',
    kode_sub_kegiatan: '2.09.04.1.02.0007',
    nama_sub_kegiatan: 'Fasilitasi sarana dan prasarana mendukung penyelamatan pangan Provinsi',
    nama_bidang_opd: 'Bidang Ketersediaan & Kerawanan Pangan',
    sub_bidang_opd: 'Seksi Kerawanan Pangan',
    satuan: 'Paket',
  },
  {
    kode_kegiatan: '2.09.04.1.02',
    kode_sub_kegiatan: '2.09.04.1.02.0008',
    nama_sub_kegiatan: 'Pelaksanaan kebijakan dan aksi penyelamatan pangan Provinsi',
    nama_bidang_opd: 'Bidang Ketersediaan & Kerawanan Pangan',
    sub_bidang_opd: 'Seksi Kerawanan Pangan',
    satuan: 'Dokumen',
  },
  {
    kode_kegiatan: '2.09.05.1.01',
    kode_sub_kegiatan: '2.09.05.1.01.0012',
    nama_sub_kegiatan: 'Fasilitasi dan Pembinaan Pasar Pangan Segar Aman',
    nama_bidang_opd: 'Balai Pengawasan Mutu Pangan',
    sub_bidang_opd: 'Seksi Mutu',
    satuan: 'Unit',
  },
];

async function main() {
  const ujiSaja = process.argv.includes('--uji');
  const sequelize = db.sequelize;

  const [[regulasiVersi]] = await sequelize.query(
    'SELECT id FROM regulasi_versi WHERE nama_regulasi = :n',
    { replacements: { n: REGULASI_VERSI_2026 } },
  );
  if (!regulasiVersi) {
    throw new Error(`regulasi_versi "${REGULASI_VERSI_2026}" tidak ditemukan.`);
  }
  const regulasiVersiId = regulasiVersi.id;

  console.log(`[rencana] Tambah ${BARIS_BARU.length} baris sub_kegiatan transaksi baru.`);

  await sequelize.transaction(async (t) => {
    for (const item of BARIS_BARU) {
      const [[kegiatan]] = await sequelize.query(
        'SELECT id FROM kegiatan WHERE kode_kegiatan = :k',
        { replacements: { k: item.kode_kegiatan }, transaction: t },
      );
      if (!kegiatan) {
        throw new Error(`Kegiatan transaksi kode ${item.kode_kegiatan} tidak ditemukan.`);
      }

      const [[master]] = await sequelize.query(
        'SELECT id FROM master_sub_kegiatan WHERE dataset_key = :d AND kode_sub_kegiatan_full = :k',
        { replacements: { d: DATASET_2026, k: item.kode_sub_kegiatan }, transaction: t },
      );
      if (!master) {
        throw new Error(`Master sub kegiatan ${item.kode_sub_kegiatan} tidak ditemukan di dataset 2026.`);
      }

      const [[existing]] = await sequelize.query(
        'SELECT id FROM sub_kegiatan WHERE kegiatan_id = :kid AND kode_sub_kegiatan = :kode',
        { replacements: { kid: kegiatan.id, kode: item.kode_sub_kegiatan }, transaction: t },
      );
      if (existing) {
        console.log(`[lewati] ${item.kode_sub_kegiatan} sudah ada (id=${existing.id}).`);
        continue;
      }

      console.log(
        `[tambah] ${item.kode_sub_kegiatan} - ${item.nama_sub_kegiatan} (kegiatan_id=${kegiatan.id})`,
      );
      if (ujiSaja) continue;

      await sequelize.query(
        `INSERT INTO sub_kegiatan
           (kegiatan_id, nama_sub_kegiatan, kode_sub_kegiatan, nama_opd, nama_bidang_opd, sub_bidang_opd,
            periode_id, jenis_dokumen, tahun, pagu_anggaran, total_pagu_anggaran, anggaran_kegiatan,
            satuan, status_monitoring, master_sub_kegiatan_id, regulasi_versi_id, input_mode,
            catatan, created_at, updated_at)
         VALUES
           (:kegiatan_id, :nama_sub_kegiatan, :kode_sub_kegiatan, :nama_opd, :nama_bidang_opd, :sub_bidang_opd,
            :periode_id, :jenis_dokumen, :tahun, 0, 0, 0,
            :satuan, 'on-track', :master_sub_kegiatan_id, :regulasi_versi_id, 'MASTER',
            :catatan, NOW(), NOW())`,
        {
          replacements: {
            kegiatan_id: kegiatan.id,
            nama_sub_kegiatan: item.nama_sub_kegiatan,
            kode_sub_kegiatan: item.kode_sub_kegiatan,
            nama_opd: NAMA_OPD,
            nama_bidang_opd: item.nama_bidang_opd,
            sub_bidang_opd: item.sub_bidang_opd,
            periode_id: PERIODE_ID,
            jenis_dokumen: JENIS_DOKUMEN,
            tahun: TAHUN,
            satuan: item.satuan,
            master_sub_kegiatan_id: master.id,
            regulasi_versi_id: regulasiVersiId,
            catatan:
              'Sub Kegiatan baru dari Kepmendagri 900.1-861/2026 — target, satuan realisasi, dan pagu anggaran perlu diisi manual.',
          },
          transaction: t,
        },
      );
    }
  });

  if (ujiSaja) {
    console.log('[uji] Tidak ada perubahan ditulis (--uji).');
  } else {
    console.log('[selesai] Baris sub_kegiatan transaksi baru ditambahkan.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[gagal]', err);
    process.exit(1);
  });

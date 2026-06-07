// File: services/rkaRevisiService.js
const { Rka, RkaRincianBelanja, sequelize } = require('../models');

/**
 * Mengklon dokumen RKA beserta sub-rincian belanjanya ke tahapan anggaran berikutnya
 * @param {Object} params - Parameter kloning
 * @param {number} params.rkaId - ID RKA sumber yang akan diklon (biasanya tahapan aktif saat ini)
 * @param {string} params.tahapanTujuan - ENUM target ('PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN')
 * @param {number} params.userId - ID User yang mengeksekusi (untuk audit trail)
 */
async function cloneRkaToNextTahapan({ rkaId, tahapanTujuan, userId }) {
  // Menggunakan database Transaction untuk memastikan atomisitas data (All-or-Nothing)
  const tx = await sequelize.transaction();

  try {
    // 1. Ambil data RKA sumber beserta seluruh rincian belanjanya
    const sourceRka = await Rka.findByPk(rkaId, {
      include: [{ model: RkaRincianBelanja, as: 'rincianBelanja' }],
      transaction: tx,
    });

    if (!sourceRka) {
      const err = new Error('Data RKA sumber tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    // 2. Validasi pencegahan duplikasi tahapan yang sama pada satu sub-kegiatan
    const generateUniqueCode = `${sourceRka.tahun}-${sourceRka.opd_id}-${sourceRka.sub_kegiatan}-${tahapanTujuan}`;
    const existingTarget = await Rka.findOne({
      where: { kode_unik_sub_kegiatan: generateUniqueCode },
      transaction: tx,
    });

    if (existingTarget) {
      const err = new Error(`Tahapan ${tahapanTujuan} untuk sub-kegiatan ini sudah pernah dibuat.`);
      err.status = 400;
      throw err;
    }

    // 3. Buat Record Parent RKA Baru untuk Tahapan Revisi
    const rkaPlainData = sourceRka.toJSON();
    delete rkaPlainData.id; // Hapus ID lama agar digenerate baru oleh DB
    delete rkaPlainData.created_at;
    delete rkaPlainData.updated_at;

    const newRka = await Rka.create(
      {
        ...rkaPlainData,
        tahapan: tahapanTujuan,
        kode_unik_sub_kegiatan: generateUniqueCode,
        version: 1, // Reset ke versi 1 untuk tahapan revisi baru
        approval_status: 'DRAFT', // Memulai kembali dari status Draft revisi
        is_active_version: true,
        change_reason_text: `Inisiasi kloning otomatis menuju tahapan ${tahapanTujuan}`,
      },
      { transaction: tx },
    );

    // 4. Klon Seluruh Anak Rincian Belanja Belanja (Termasuk Koefisien JSON-nya)
    if (sourceRka.rincianBelanja && sourceRka.rincianBelanja.length > 0) {
      const clonedRincianRows = sourceRka.rincianBelanja.map((item) => {
        const itemPlain = item.toJSON();
        delete itemPlain.id; // Hapus ID lama
        delete itemPlain.created_at;
        delete itemPlain.updated_at;

        return {
          ...itemPlain,
          rka_id: newRka.id, // Pasangkan ke ID Parent RKA tahapan yang baru
        };
      });

      await RkaRincianBelanja.bulkCreate(clonedRincianRows, { transaction: tx });
    }

    // Komit seluruh operasi jika sukses tanpa cela
    await tx.commit();

    return {
      success: true,
      message: `Berhasil melakukan pergeseran dokumen RKA ke tahapan ${tahapanTujuan}.`,
      data: {
        new_rka_id: newRka.id,
        tahapan: newRka.tahapan,
      },
    };
  } catch (error) {
    // Batalkan seluruh perubahan jika di tengah jalan terdapat error/mati lampu server
    await tx.rollback();
    throw error;
  }
}

/**
 * Membandingkan nilai rincian belanja sebelum dan sesudah pergeseran anggaran
 * Berguna untuk mencetak Lampiran Perubahan / Pergeseran Anggaran
 * @param {string} kodeUnikSubKegiatanInduk - Kode unik sub kegiatan asal
 * @param {string} tahapanTujuan - Tahapan pembanding ('PERGESERAN_1', dll)
 */
async function compareTahapanHistory(kodeUnikSubKegiatanInduk, tahapanTujuan) {
  // Logika query agregasi perbandingan data historis side-by-side dapat diletakkan di sini
  // (e-PeLARA dapat membandingkan pergeseran kode rekening secara real-time)
}

module.exports = {
  cloneRkaToNextTahapan,
  compareTahapanHistory,
};

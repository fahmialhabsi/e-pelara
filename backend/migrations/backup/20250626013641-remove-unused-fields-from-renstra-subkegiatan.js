"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columnsToRemove = [
      "anggaran_sub_kegiatan",
      "anggaran_kegiatan",
      "pagu_anggaran",
      "waktu_pelaksanaan",
      "sumber_daya_pendukung",
      "rencana_lokasi_desa",
      "rencana_lokasi_kecamatan",
      "rencana_lokasi_kabupaten",
      "deskripsi",
      "kerangka_pelaksanaan",
      "output",
      "pihak_terlibat",
      "rpjmd_id",
      "target_awal",
      "target_akhir",
      "satuan",
      "status_monitoring",
      "tanggal_laporan",
      "catatan",
      "kode_indikator",
      "nama_indikator",
      "tipe_indikator",
      "jenis",
      "tolok_ukur_kinerja",
      "target_kinerja",
      "jenis_indikator",
      "kriteria_kuantitatif",
      "kriteria_kualitatif",
      "satuan_indikator",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
      "target_tahun_1",
      "target_tahun_2",
      "target_tahun_3",
      "target_tahun_4",
      "target_tahun_5",
      "sumber_data",
      "penanggung_jawab",
      "keterangan",
      "renstra_id",
    ];

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn("renstra_subkegiatan", column);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Untuk rollback, kamu bisa menambahkan ulang kolom-kolom ini satu per satu jika dibutuhkan.
    // Saat ini kita kosongkan, atau bisa ditambahkan jika perlu rollback lengkap.
  },
};

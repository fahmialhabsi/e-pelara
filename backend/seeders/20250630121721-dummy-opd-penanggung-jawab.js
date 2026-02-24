"use strict";

const generateNama = () => {
  const namaDepan = [
    "Andi",
    "Rina",
    "Budi",
    "Dewi",
    "Agus",
    "Siti",
    "Hendra",
    "Lina",
    "Bayu",
    "Fitri",
  ];
  const namaBelakang = [
    "Saputra",
    "Wulandari",
    "Kurniawan",
    "Pratiwi",
    "Santoso",
    "Halim",
    "Nuraini",
    "Wijaya",
    "Anjani",
    "Fadillah",
  ];
  const depan = namaDepan[Math.floor(Math.random() * namaDepan.length)];
  const belakang =
    namaBelakang[Math.floor(Math.random() * namaBelakang.length)];
  return `${depan} ${belakang}`;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const opds = [
      "Dinas Pendidikan dan Kebudayaan",
      "Dinas Kesehatan",
      "Dinas Pekerjaan Umum dan Perumahan Rakyat",
      "Dinas Sosial",
      "Dinas Perumahan dan Kawasan Pemukiman",
      "Dinas Perhubungan",
      "Dinas Pariwisata",
      "Dinas Kepemudaan dan Olahraga",
      "Dinas Tenaga Kerja dan Transmigrasi",
      "Dinas Pemberdayaan Masyarakat dan Desa",
      "Dinas Koperasi Usaha Kecil dan Menengah",
      "Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu",
      "Dinas Pemberdayaan Perempuan dan Perlindungan Anak",
      "Dinas Kearsipan dan Perpustakaan",
      "Dinas Lingkungan Hidup",
      "Dinas Pertanian",
      "Dinas Perindustrian dan Perdagangan",
      "Dinas Kehutanan",
      "Dinas Energi dan Sumber Daya Mineral",
      "Dinas Kelautan dan Perikanan",
      "Dinas Administrasi Kependudukan dan Pencatatan Sipil",
      "Inspektorat",
      "Satuan Polisi Pamong Praja",
      "Badan Perencanaan dan Pembangunan Daerah (BAPPEDA)",
      "Badan Pengelolaan Keuangan dan Aset Daerah",
      "Badan Pendapatan Daerah",
      "Badan Kepegawaian Daerah",
      "Badan Pengembangan Sumber Daya Manusia",
      "Badan Penelitian dan Pengembangan Daerah",
      "Badan Penanggulangan Bencana Daerah",
      "Badan Kesatuan Bangsa dan Politik",
      "Badan Penghubung",
      "Badan Pengelolaan Perbatasan",
      "Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah",
      "Biro Kesejahteraan Rakyat Sekretariat Daerah",
      "Biro Hukum Sekretariat Daerah",
      "Biro Perekonomian Sekretariat Daerah",
      "Biro Pengadaan Barang dan Jasa Sekretariat Daerah",
      "Biro Organisasi Sekretariat Daerah",
      "Biro Administrasi Pimpinan Sekretariat Daerah",
      "Biro Administrasi Pembangunan Sekretariat Daerah",
      "Biro Umum Sekretariat Daerah",
      "RSUD dr. Chasan Boesoirie",
      "RSU Sofifi",
      "Rumah Sakit Jiwa",
      "Sekretariat DPRD Provinsi Maluku Utara",
      "Dinas Komunikasi, Informatika dan Persandian",
    ];

    let data = [];

    opds.forEach((opd) => {
      const base = opd
        .replace(
          /Dinas |Badan |Biro |RSUD |RSU |Rumah Sakit |Sekretariat /g,
          ""
        )
        .split(" ")[0];

      // 1 Sekretariat
      data.push({
        nama_opd: opd,
        nama_bidang_opd: "Sekretariat",
        nama: generateNama(),
        nip: `1975${Math.floor(Math.random() * 1000000000)}`,
        jabatan: "Sekretaris",
        created_at: now,
        updated_at: now,
      });

      // 4 bidang tambahan
      const bidangNames = [
        `Bidang ${base} Perencanaan`,
        `Bidang ${base} Pelayanan`,
        `Bidang ${base} Pengembangan`,
        `Bidang ${base} Pengawasan`,
      ];

      bidangNames.forEach((bidang) => {
        data.push({
          nama_opd: opd,
          nama_bidang_opd: bidang,
          nama: generateNama(),
          nip: `1980${Math.floor(Math.random() * 1000000000)}`,
          jabatan: "Kepala Bidang",
          created_at: now,
          updated_at: now,
        });
      });
    });

    await queryInterface.bulkInsert("opd_penanggung_jawab", data);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("opd_penanggung_jawab", null, {});
  },
};

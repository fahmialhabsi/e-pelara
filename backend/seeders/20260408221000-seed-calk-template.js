"use strict";

const { QueryTypes } = require("sequelize");

const templates = [
  {
    bab: 1,
    sub_bab: "1.1",
    judul: "Maksud dan Tujuan Penyusunan Laporan Keuangan",
    tipe: "TEKS",
    urutan: 10,
    wajib: true,
    konten_default: `Laporan Keuangan [NAMA_OPD] disusun dan disediakan sebagai sarana
informasi yang relevan mengenai posisi keuangan dan seluruh transaksi yang dilakukan oleh
[NAMA_OPD] selama satu periode pelaporan Tahun Anggaran [TAHUN].

Laporan Keuangan [NAMA_OPD] digunakan untuk membandingkan realisasi pendapatan dan belanja
dengan anggaran yang telah ditetapkan, menilai kondisi keuangan, menilai efektivitas dan
efisiensi SKPD dan membantu menentukan ketaatannya terhadap peraturan perundang-undangan.`,
  },
  {
    bab: 1,
    sub_bab: "1.2",
    judul: "Landasan Hukum Penyusunan Laporan Keuangan",
    tipe: "TEKS",
    urutan: 20,
    wajib: true,
    konten_default: `Laporan Keuangan [NAMA_OPD] Tahun Anggaran [TAHUN] disusun dengan
berpedoman pada ketentuan yang termuat dalam:
1. Undang-Undang Nomor 17 Tahun 2003 tentang Keuangan Negara;
2. Peraturan Pemerintah Nomor 71 Tahun 2010 tentang Standar Akuntansi Pemerintahan;
3. Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020 tentang Pedoman Pengelolaan Keuangan Daerah;
4. Peraturan Gubernur [NAMA_PROVINSI] tentang Penjabaran APBD Tahun Anggaran [TAHUN].`,
  },
  {
    bab: 1,
    sub_bab: "1.3",
    judul: "Sistematika Penulisan Catatan atas Laporan Keuangan",
    tipe: "TEKS",
    urutan: 30,
    wajib: true,
    konten_default: "[Sistematika sesuai template OPD]",
  },
  {
    bab: 2,
    sub_bab: "2.1",
    judul: "Ikhtisar Realisasi Pencapaian Target Kinerja Keuangan",
    tipe: "TABEL_AUTO",
    sumber_data: "lraService.getLraRingkasan",
    urutan: 40,
    wajib: true,
    konten_default: "[Data diambil otomatis dari LRA]",
  },
  {
    bab: 2,
    sub_bab: "2.2",
    judul: "Hambatan dan Kendala dalam Pencapaian Target",
    tipe: "TEKS",
    urutan: 50,
    wajib: true,
    konten_default:
      "Secara umum tidak ada hambatan dan kendala yang mempengaruhi pencapaian target...",
  },
  {
    bab: 3,
    sub_bab: "3.1",
    judul: "Entitas Akuntansi dan Entitas Pelaporan Keuangan",
    tipe: "TEKS",
    urutan: 60,
    wajib: true,
    konten_default: "Entitas pelaporan keuangan adalah [NAMA_OPD] Provinsi [NAMA_PROVINSI].",
  },
  {
    bab: 3,
    sub_bab: "3.2",
    judul: "Basis Akuntansi yang Mendasari Penyusunan Laporan Keuangan",
    tipe: "TEKS",
    urutan: 70,
    wajib: true,
    konten_default: `Basis akuntansi yang digunakan: basis akrual untuk LO, LPE, dan Neraca;
basis kas untuk LRA. Penyusunan mengacu pada Permendagri Nomor 77 Tahun 2020.`,
  },
  {
    bab: 3,
    sub_bab: "3.3",
    judul: "Basis Pengukuran yang Mendasari Penyusunan Laporan Keuangan",
    tipe: "TEKS",
    urutan: 80,
    wajib: true,
    konten_default: "[Kebijakan pengukuran aset, kewajiban, ekuitas]",
  },
  {
    bab: 3,
    sub_bab: "3.4",
    judul: "Penerapan Kebijakan Akuntansi berkaitan dengan SAP",
    tipe: "TEKS",
    urutan: 90,
    wajib: true,
    konten_default: "[Penjelasan kebijakan akuntansi spesifik]",
  },
  {
    bab: 4,
    sub_bab: "4.1.1",
    judul: "Pendapatan",
    tipe: "TABEL_AUTO",
    sumber_data: "lraService.getPendapatan",
    urutan: 100,
    wajib: true,
    konten_default: "[Data pendapatan diambil otomatis dari LRA]",
  },
  {
    bab: 4,
    sub_bab: "4.1.2",
    judul: "Belanja (Pegawai, Barang & Jasa, Modal)",
    tipe: "TABEL_AUTO",
    sumber_data: "lraService.getBelanja",
    urutan: 110,
    wajib: true,
    konten_default: "[Data belanja diambil otomatis dari LRA]",
  },
  {
    bab: 4,
    sub_bab: "4.1.3",
    judul: "Aset (Lancar, Tetap, Lain-lain)",
    tipe: "TABEL_AUTO",
    sumber_data: "neracaService.getAset",
    urutan: 120,
    wajib: true,
    konten_default: "[Data aset diambil otomatis dari Neraca]",
  },
  {
    bab: 4,
    sub_bab: "4.1.4",
    judul: "Kewajiban",
    tipe: "TABEL_AUTO",
    sumber_data: "neracaService.getKewajiban",
    urutan: 130,
    wajib: true,
    konten_default: "[Data kewajiban diambil otomatis dari Neraca]",
  },
  {
    bab: 4,
    sub_bab: "4.1.5",
    judul: "Ekuitas Dana",
    tipe: "TABEL_AUTO",
    sumber_data: "lpeService.getEkuitas",
    urutan: 140,
    wajib: true,
    konten_default: "[Data ekuitas diambil otomatis dari LPE]",
  },
  {
    bab: 4,
    sub_bab: "4.1.6",
    judul: "Laporan Operasional",
    tipe: "TABEL_AUTO",
    sumber_data: "loService.getLo",
    urutan: 150,
    wajib: true,
    konten_default: "[Data LO diambil otomatis]",
  },
  {
    bab: 4,
    sub_bab: "4.1.7",
    judul: "Laporan Perubahan Ekuitas",
    tipe: "TABEL_AUTO",
    sumber_data: "lpeService.getLpe",
    urutan: 160,
    wajib: true,
    konten_default: "[Data LPE diambil otomatis]",
  },
  {
    bab: 5,
    sub_bab: null,
    judul: "Penjelasan atas Informasi Non-Keuangan",
    tipe: "TEKS",
    urutan: 170,
    wajib: false,
    konten_default: `[NAMA_OPD] memiliki tugas pokok [TUPOKSI_OPD].

Temuan BPK dan tindak lanjut: [ISI_JIKA_ADA]

Rekening Pemerintah: No. Rek [NOMOR_REKENING].`,
  },
  {
    bab: 6,
    sub_bab: null,
    judul: "Penutup",
    tipe: "TEKS",
    urutan: 180,
    wajib: true,
    konten_default: `Demikian Laporan Keuangan dan Catatan atas Laporan Keuangan [NAMA_OPD]
Tahun Anggaran [TAHUN] disusun untuk digunakan sebagaimana mestinya.

[KOTA], [BULAN_TAHUN]
[JABATAN_KEPALA_OPD],

[NAMA_KEPALA_OPD]
NIP. [NIP_KEPALA_OPD]`,
  },
];

module.exports = {
  async up(queryInterface) {
    const rows = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS cnt FROM calk_template",
      { type: QueryTypes.SELECT },
    );
    const cnt = rows[0]?.cnt ?? 0;
    if (Number(cnt) > 0) {
      console.log("[seed] calk_template sudah berisi, skip");
      return;
    }
    const now = new Date();
    const insertRows = templates.map((t) => ({
      bab: t.bab,
      sub_bab: t.sub_bab,
      judul: t.judul,
      konten_default: t.konten_default,
      tipe: t.tipe,
      sumber_data: t.sumber_data || null,
      urutan: t.urutan,
      wajib: t.wajib,
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert("calk_template", insertRows);
    console.log(`[seed] ✅ ${insertRows.length} baris calk_template`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("calk_template", null, {});
  },
};

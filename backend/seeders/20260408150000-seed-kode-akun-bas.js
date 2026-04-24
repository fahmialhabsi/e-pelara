"use strict";

/**
 * Seed BAS minimal OPD — Dinas Pangan (struktur akun SAP / LK).
 */
module.exports = {
  async up(queryInterface) {
    const [[{ cnt }]] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS cnt FROM kode_akun_bas",
    );
    if (Number(cnt) > 0) {
      console.log("[seed] kode_akun_bas sudah berisi, skip");
      return;
    }

    const now = new Date();
    const rows = [];
    const add = (kode, nama, jenis, normal_balance, digunakan_di, kode_rekening_ref = null) => {
      const p = kode.split(".");
      rows.push({
        kode,
        nama,
        level: p.length,
        kode_induk: p.length > 1 ? p.slice(0, -1).join(".") : null,
        jenis,
        normal_balance,
        digunakan_di,
        kode_rekening_ref,
        aktif: true,
        created_at: now,
        updated_at: now,
      });
    };

    // —— ASET (NERACA) ——
    add("1.1", "Aset Lancar", "ASET", "DEBIT", "NERACA");
    add("1.1.01", "Kas dan Setara Kas", "ASET", "DEBIT", "NERACA");
    add("1.1.01.01", "Kas di Kas Daerah", "ASET", "DEBIT", "NERACA", "1.1.01.01");
    add("1.1.01.02", "Kas di Bendahara Pengeluaran", "ASET", "DEBIT", "NERACA", "1.1.01.02");
    add("1.1.01.03", "Kas di Bendahara Penerimaan", "ASET", "DEBIT", "NERACA", "1.1.01.03");
    add("1.1.06", "Piutang", "ASET", "DEBIT", "NERACA");
    add("1.1.06.01", "Piutang Lain-lain", "ASET", "DEBIT", "NERACA");
    add("1.1.07", "Penyisihan Piutang", "ASET", "KREDIT", "NERACA");
    add("1.1.08", "Beban Dibayar Dimuka", "ASET", "DEBIT", "NERACA");
    add("1.1.09", "Persediaan", "ASET", "DEBIT", "NERACA");
    add("1.3", "Aset Tetap", "ASET", "DEBIT", "NERACA");
    add("1.3.01", "Tanah", "ASET", "DEBIT", "NERACA");
    add("1.3.02", "Peralatan dan Mesin", "ASET", "DEBIT", "NERACA");
    add("1.3.03", "Gedung dan Bangunan", "ASET", "DEBIT", "NERACA");
    add("1.3.04", "Jalan, Irigasi dan Instalasi", "ASET", "DEBIT", "NERACA");
    add("1.3.05", "Aset Tetap Lainnya", "ASET", "DEBIT", "NERACA");
    add("1.3.06", "Konstruksi Dalam Pengerjaan", "ASET", "DEBIT", "NERACA");
    add("1.3.07", "Akumulasi Penyusutan", "ASET", "KREDIT", "NERACA");
    add("1.5", "Aset Lainnya", "ASET", "DEBIT", "NERACA");

    // —— KEWAJIBAN ——
    add("2.1", "Kewajiban Jangka Pendek", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.01", "Utang Perhitungan Pihak Ketiga (PFK)", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.05", "Pendapatan Diterima Dimuka", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.09", "Utang Beban", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.09.01", "Utang Beban Pegawai", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.09.02", "Utang Beban Barang dan Jasa", "KEWAJIBAN", "KREDIT", "NERACA");
    add("2.1.10", "Utang Jangka Pendek Lainnya", "KEWAJIBAN", "KREDIT", "NERACA");

    // —— EKUITAS ——
    add("3.1", "Ekuitas", "EKUITAS", "KREDIT", "NERACA");
    add("3.1.01", "Ekuitas (saldo ekuitas OPD)", "EKUITAS", "KREDIT", "NERACA");

    // —— PENDAPATAN LRA ——
    add("4.1", "Pendapatan Asli Daerah — LRA", "PENDAPATAN", "KREDIT", "LRA");
    add("4.1.01", "Pendapatan Pajak Daerah — LRA", "PENDAPATAN", "KREDIT", "LRA");
    add("4.1.04", "Lain-lain PAD yang Sah — LRA", "PENDAPATAN", "KREDIT", "LRA");

    // —— BELANJA LRA ——
    add("5.1", "Belanja Pegawai", "BELANJA", "DEBIT", "LRA");
    add("5.1.01", "Belanja Gaji dan Tunjangan ASN", "BELANJA", "DEBIT", "LRA");
    add("5.1.02", "Belanja Tambahan Penghasilan ASN", "BELANJA", "DEBIT", "LRA");
    add("5.1.03", "Belanja Gaji dan Tunjangan DPRD", "BELANJA", "DEBIT", "LRA");
    add("5.1.09", "Belanja Penerimaan Lainnya Pimpinan DPRD", "BELANJA", "DEBIT", "LRA");
    add("5.2", "Belanja Barang dan Jasa", "BELANJA", "DEBIT", "LRA");
    add("5.2.01", "Belanja Barang", "BELANJA", "DEBIT", "LRA");
    add("5.2.02", "Belanja Jasa", "BELANJA", "DEBIT", "LRA");
    add("5.2.03", "Belanja Pemeliharaan", "BELANJA", "DEBIT", "LRA");
    add("5.2.04", "Belanja Perjalanan Dinas", "BELANJA", "DEBIT", "LRA");
    add("5.2.05", "Belanja Barang untuk Diserahkan kepada Masyarakat", "BELANJA", "DEBIT", "LRA");
    add("5.2.06", "Belanja Barang untuk Diserahkan kepada Pihak Ketiga", "BELANJA", "DEBIT", "LRA");
    add("5.3", "Belanja Modal", "BELANJA", "DEBIT", "LRA");
    add("5.3.01", "Belanja Modal Tanah", "BELANJA", "DEBIT", "LRA");
    add("5.3.02", "Belanja Modal Peralatan dan Mesin", "BELANJA", "DEBIT", "LRA");
    add("5.3.03", "Belanja Modal Gedung dan Bangunan", "BELANJA", "DEBIT", "LRA");
    add("5.3.04", "Belanja Modal Jalan, Irigasi dan Instalasi", "BELANJA", "DEBIT", "LRA");
    add("5.3.05", "Belanja Modal Aset Tetap Lainnya", "BELANJA", "DEBIT", "LRA");

    // —— PEMBIAYAAN (LRA) ——
    add("6.1", "Penerimaan Pembiayaan", "PEMBIAYAAN", "DEBIT", "LRA");
    add("6.1.01", "Penggunaan SiLPA", "PEMBIAYAAN", "DEBIT", "LRA");
    add("6.2", "Pengeluaran Pembiayaan", "PEMBIAYAAN", "KREDIT", "LRA");
    add("6.2.01", "Pembentukan Dana Cadangan", "PEMBIAYAAN", "KREDIT", "LRA");

    // —— BEBAN LO ——
    add("8.1", "Beban Operasi", "BEBAN", "DEBIT", "LO");
    add("8.1.01", "Beban Pegawai — LO", "BEBAN", "DEBIT", "LO");
    add("8.1.02", "Beban Barang dan Jasa — LO", "BEBAN", "DEBIT", "LO");
    add("8.1.03", "Beban Bunga — LO", "BEBAN", "DEBIT", "LO");
    add("8.1.06", "Beban Subsidi — LO", "BEBAN", "DEBIT", "LO");
    add("8.1.07", "Beban Hibah — LO", "BEBAN", "DEBIT", "LO");
    add("8.1.09", "Beban Penyusutan dan Amortisasi — LO", "BEBAN", "DEBIT", "LO");

    // —— PENDAPATAN LO ——
    add("9.1", "Pendapatan Asli Daerah — LO", "PENDAPATAN", "KREDIT", "LO");
    add("9.1.01", "Pendapatan Pajak Daerah — LO", "PENDAPATAN", "KREDIT", "LO");
    add("9.1.04", "Lain-lain PAD yang Sah — LO", "PENDAPATAN", "KREDIT", "LO");

    await queryInterface.bulkInsert("kode_akun_bas", rows);
    console.log(`[seed] ✅ ${rows.length} baris kode_akun_bas`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("kode_akun_bas", null, {});
  },
};

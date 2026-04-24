/**
 * Mengisi data awal untuk uji modul LK (idempoten).
 * Jalankan dari folder backend: node scripts/inputDataAwalLk.js
 */
"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { sequelize, AsetTetap, Bku, Persediaan } = db;

const TAHUN = 2024;

async function main() {
  console.log("Mengisi data awal LK...\n");

  const asetData = [
    {
      kode_barang: "LK-DEMO-AT-001",
      nama_barang: "Laptop Dell i7",
      kategori: "PERALATAN_MESIN",
      harga_perolehan: 15000000,
      tahun_perolehan: 2022,
      tarif_penyusutan: 0.25,
      umur_ekonomis: 4,
      kondisi: "BAIK",
      status: "AKTIF",
    },
    {
      kode_barang: "LK-DEMO-AT-002",
      nama_barang: "Meja Kerja Pejabat",
      kategori: "PERALATAN_MESIN",
      harga_perolehan: 3500000,
      tahun_perolehan: 2021,
      tarif_penyusutan: 0.25,
      umur_ekonomis: 4,
      kondisi: "BAIK",
      status: "AKTIF",
    },
    {
      kode_barang: "LK-DEMO-AT-003",
      nama_barang: "Kendaraan Dinas Roda 4",
      kategori: "PERALATAN_MESIN",
      harga_perolehan: 280000000,
      tahun_perolehan: 2020,
      tarif_penyusutan: 0.125,
      umur_ekonomis: 8,
      kondisi: "BAIK",
      status: "AKTIF",
    },
    {
      kode_barang: "LK-DEMO-AT-004",
      nama_barang: "Instalasi Jaringan Internet",
      kategori: "JALAN_IRIGASI_INSTALASI",
      harga_perolehan: 45000000,
      tahun_perolehan: 2019,
      tarif_penyusutan: 0.1,
      umur_ekonomis: 10,
      kondisi: "BAIK",
      status: "AKTIF",
    },
  ];

  const cntAsetDemo = await AsetTetap.count({
    where: { kode_barang: { [Op.like]: "LK-DEMO-AT-%" } },
  });
  if (cntAsetDemo === 0) {
    await AsetTetap.bulkCreate(asetData);
    console.log("✅ Aset tetap demo:", asetData.length, "record");
  } else {
    console.log("⏭  Aset demo sudah ada (LK-DEMO-AT-*):", cntAsetDemo, "— skip");
  }

  const existingBku = await Bku.count({ where: { tahun_anggaran: TAHUN } });
  if (existingBku === 0) {
    /* Saldo berjalan konsisten (dalam rupiah) — angka kecil untuk uji */
    const bkuData = [
      {
        tahun_anggaran: TAHUN,
        bulan: 1,
        tanggal: `${TAHUN}-01-10`,
        nomor_bukti: `UP-${TAHUN}-001`,
        uraian: "Penerimaan Uang Persediaan Tahap I",
        jenis_transaksi: "UP",
        penerimaan: 5000000,
        pengeluaran: 0,
        saldo: 5000000,
        kode_akun: null,
        status_validasi: "VALID",
      },
      {
        tahun_anggaran: TAHUN,
        bulan: 1,
        tanggal: `${TAHUN}-01-31`,
        nomor_bukti: `LS-GAJI-${TAHUN}-001`,
        uraian: "Gaji PNS Januari",
        jenis_transaksi: "LS_GAJI",
        penerimaan: 0,
        pengeluaran: 2000000,
        saldo: 3000000,
        kode_akun: "5.1.01",
        status_validasi: "VALID",
      },
      {
        tahun_anggaran: TAHUN,
        bulan: 2,
        tanggal: `${TAHUN}-02-05`,
        nomor_bukti: `GU-${TAHUN}-001`,
        uraian: "Ganti Uang Persediaan (gaji)",
        jenis_transaksi: "GU",
        penerimaan: 2000000,
        pengeluaran: 0,
        saldo: 5000000,
        kode_akun: null,
        status_validasi: "VALID",
      },
      {
        tahun_anggaran: TAHUN,
        bulan: 3,
        tanggal: `${TAHUN}-03-20`,
        nomor_bukti: `LS-BARANG-${TAHUN}-001`,
        uraian: "Belanja ATK Kantor Q1",
        jenis_transaksi: "LS_BARANG",
        penerimaan: 0,
        pengeluaran: 1000000,
        saldo: 4000000,
        kode_akun: "5.2.01",
        status_validasi: "VALID",
      },
      {
        tahun_anggaran: TAHUN,
        bulan: 3,
        tanggal: `${TAHUN}-03-25`,
        nomor_bukti: `GU-${TAHUN}-002`,
        uraian: "Ganti Uang Persediaan (barang)",
        jenis_transaksi: "GU",
        penerimaan: 1000000,
        pengeluaran: 0,
        saldo: 5000000,
        kode_akun: null,
        status_validasi: "VALID",
      },
      {
        tahun_anggaran: TAHUN,
        bulan: 12,
        tanggal: `${TAHUN}-12-31`,
        nomor_bukti: `SETOR-${TAHUN}-001`,
        uraian: "Setoran Sisa UP ke Kas Daerah",
        jenis_transaksi: "SETORAN_SISA_UP",
        penerimaan: 0,
        pengeluaran: 5000000,
        saldo: 0,
        kode_akun: null,
        status_validasi: "VALID",
      },
    ];
    await Bku.bulkCreate(bkuData);
    console.log(`✅ BKU ${TAHUN}:`, bkuData.length, "transaksi");
  } else {
    console.log(`⏭  BKU ${TAHUN} sudah ada:`, existingBku, "record — skip");
  }

  const existingPersediaan = await Persediaan.count({
    where: { tahun_anggaran: TAHUN, nama_barang: "Alat Tulis Kantor (demo LK)" },
  });
  if (existingPersediaan === 0) {
    await Persediaan.create({
      tahun_anggaran: TAHUN,
      nama_barang: "Alat Tulis Kantor (demo LK)",
      satuan: "paket",
      jumlah: 1,
      harga_satuan: 0,
      nilai: 0,
      tanggal_opname: `${TAHUN}-12-31`,
    });
    console.log(`✅ Persediaan ${TAHUN}: 1 record`);
  } else {
    console.log(`⏭  Persediaan demo ${TAHUN} sudah ada — skip`);
  }

  console.log("\nSelesai. Siap generate laporan.");
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
  });

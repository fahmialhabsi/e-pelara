"use strict";

/**
 * Migrasi historis penatausahaan → bku tanpa jurnal otomatis (data lama).
 * Setelah selesai, running saldo BKU dihitung ulang per tahun.
 *
 * Usage: node backend/scripts/migrasiPenatausahaanKeBku.js
 */

const db = require("../models");
const { Penatausahaan, Bku, sequelize } = db;
const { hitungUlangSaldoBkuDari } = require("../services/bkuJurnalService");

function mapJenisPenatausahaan(jt, jumlah) {
  const j = String(jt || "").toUpperCase();
  const n = Math.abs(Number(jumlah) || 0);

  if (
    j.includes("PENERIMA") ||
    j.includes("TERIMA") ||
    j === "UP" ||
    j.startsWith("UP ") ||
    j.includes(" UANG PERSEDIAAN") ||
    j === "GU" ||
    j === "TUP"
  ) {
    let jenis_transaksi = "PENERIMAAN_LAIN";
    if (j.includes("TUP")) jenis_transaksi = "TUP";
    else if (j.includes("GU")) jenis_transaksi = "GU";
    else if (j.includes("UP")) jenis_transaksi = "UP";
    return { penerimaan: n, pengeluaran: 0, jenis_transaksi };
  }

  if (j.includes("SETOR") && j.includes("SISA")) {
    return { penerimaan: 0, pengeluaran: n, jenis_transaksi: "SETORAN_SISA_UP" };
  }
  if (j.includes("GAJI") || j.includes("PEGAWAI") || j.includes("TUNJANGAN")) {
    return { penerimaan: 0, pengeluaran: n, jenis_transaksi: "LS_GAJI" };
  }
  if (j.includes("BARANG") || j.includes("MODAL") || j.includes("JASA")) {
    return { penerimaan: 0, pengeluaran: n, jenis_transaksi: "LS_BARANG" };
  }

  return { penerimaan: 0, pengeluaran: n, jenis_transaksi: "PENGELUARAN_LAIN" };
}

async function main() {
  const hasil = {
    total: 0,
    ok: 0,
    skip_sudah_ada: 0,
    gagal: 0,
    detail_gagal: [],
    perlu_review_manual: [],
  };
  const rows = await Penatausahaan.findAll({
    order: [
      ["tanggal_transaksi", "ASC"],
      ["id", "ASC"],
    ],
  });
  hasil.total = rows.length;
  const tahunSet = new Set();

  for (const p of rows) {
    const tgl = p.tanggal_transaksi;
    const tanggal =
      tgl instanceof Date ? tgl.toISOString().slice(0, 10) : String(tgl).slice(0, 10);
    const tahun_anggaran = Number(p.tahun) || new Date(tanggal).getFullYear();
    const bulan = parseInt(String(tanggal).slice(5, 7), 10) || 1;
    const { penerimaan, pengeluaran, jenis_transaksi } = mapJenisPenatausahaan(
      p.jenis_transaksi,
      p.jumlah,
    );

    if (!p.kode_akun && pengeluaran > 0 && !["UP", "GU", "TUP", "PENERIMAAN_LAIN"].includes(jenis_transaksi)) {
      hasil.perlu_review_manual.push({
        penatausahaan_id: p.id,
        alasan: "Pengeluaran tanpa kode_akun — cek mapping jenis_transaksi",
      });
    }

    const nomorMigrasi = `PEN-MIGR-${p.id}`;
    const sudah = await Bku.findOne({ where: { nomor_bukti: nomorMigrasi } });
    if (sudah) {
      hasil.skip_sudah_ada++;
      tahunSet.add(tahun_anggaran);
      continue;
    }

    try {
      await Bku.create({
        tahun_anggaran,
        bulan,
        tanggal,
        nomor_bukti: nomorMigrasi,
        uraian: p.uraian,
        jenis_transaksi,
        penerimaan,
        pengeluaran,
        saldo: 0,
        kode_akun: p.kode_akun || null,
        sigap_spj_id: null,
        jurnal_id: null,
        status_validasi: "BELUM",
      });
      hasil.ok++;
      tahunSet.add(tahun_anggaran);
    } catch (e) {
      hasil.gagal++;
      hasil.detail_gagal.push({ penatausahaan_id: p.id, error: e.message });
    }
  }

  for (const th of tahunSet) {
    await sequelize.transaction(async (t) => {
      await hitungUlangSaldoBkuDari(db, th, 1, t);
    });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(hasil, null, 2));
  process.exit(hasil.gagal ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}

module.exports = { mapJenisPenatausahaan, main };

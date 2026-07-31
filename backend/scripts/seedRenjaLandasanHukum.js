'use strict';

/**
 * Seed daftar landasan hukum Bab I.2 Renja dari
 * `seeders/data/renja-landasan-hukum.json`.
 *
 * Idempoten dengan cara mengosongkan tabel lalu menulis ulang. Aman karena
 * berkas JSON adalah satu-satunya sumber kebenaran daftar ini; penambahan
 * peraturan dilakukan dengan menyunting berkas tersebut, bukan langsung ke
 * basis data, supaya perubahannya ikut tercatat di riwayat repositori.
 *
 * Pakai:
 *   node scripts/seedRenjaLandasanHukum.js
 *   node scripts/seedRenjaLandasanHukum.js --periksa
 */

const fs = require('fs');
const path = require('path');
const db = require('../models');

const BERKAS = path.join(__dirname, '..', 'seeders', 'data', 'renja-landasan-hukum.json');

async function seed() {
  const data = JSON.parse(fs.readFileSync(BERKAS, 'utf8'));
  const baris = (data.baris || []).map((r, i) => ({
    kode_bidang_urusan: r.kode_bidang_urusan ?? null,
    jenis_produk: r.jenis_produk || 'lainnya',
    nomor: r.nomor ?? null,
    tahun: r.tahun ?? null,
    judul: r.judul,
    teks_lengkap: r.teks_lengkap ?? null,
    urutan: r.urutan ?? i + 1,
    berlaku_dari: r.berlaku_dari ?? null,
    berlaku_sampai: r.berlaku_sampai ?? null,
    aktif: r.aktif !== false,
    perlu_verifikasi: r.perlu_verifikasi === true,
    catatan: r.catatan ?? null,
  }));

  await db.RenjaLandasanHukum.destroy({ where: {}, truncate: false });
  await db.RenjaLandasanHukum.bulkCreate(baris);
  return baris;
}

async function ringkasan() {
  const rows = await db.RenjaLandasanHukum.findAll({
    order: [
      ['urutan', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const umum = rows.filter((r) => !r.kode_bidang_urusan);
  const khusus = rows.filter((r) => r.kode_bidang_urusan);
  const perluCek = rows.filter((r) => r.perlu_verifikasi);

  console.log(`\nPeraturan umum (semua OPD) : ${umum.length}`);
  console.log(`Peraturan khusus urusan    : ${khusus.length}`);
  console.log(`Perlu diverifikasi         : ${perluCek.length}`);

  console.log('\nContoh keluaran Bab I.2 untuk urusan 2.09 (Pangan):');
  const dipakai = rows.filter((r) => r.aktif && (!r.kode_bidang_urusan || r.kode_bidang_urusan === '2.09'));
  dipakai.forEach((r, i) => {
    const tanda = r.perlu_verifikasi ? ' [perlu verifikasi]' : '';
    console.log(`  ${i + 1}. ${r.teksCetak().slice(0, 118)}${tanda}`);
  });

  if (perluCek.length) {
    console.log('\nEntri yang menunggu konfirmasi perangkat daerah:');
    perluCek.forEach((r) => console.log(`  - ${r.teksCetak().slice(0, 90)}\n      ${r.catatan || ''}`));
  }
}

async function main() {
  if (!process.argv.includes('--periksa')) {
    const baris = await seed();
    console.log(`Landasan hukum tersimpan: ${baris.length} baris`);
  }
  await ringkasan();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Gagal:', e.message);
    process.exit(1);
  });

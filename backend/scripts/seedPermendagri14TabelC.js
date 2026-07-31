'use strict';

/**
 * Seed Tabel C-1, C-2, C-3, dan C-6 Lampiran Permendagri 14/2026 dari berkas
 * `seeders/data/permendagri14-tabel-c.json` (dihasilkan sekali oleh
 * `scripts/extract_permendagri14_tabel_c.py`).
 *
 * Ketiga tabel ini adalah "Kesepakatan Rakortekbang Tahun 2026" — daftar
 * nasional yang berlaku sama untuk semua provinsi, bukan data yang diinput OPD.
 * Perangkat daerah hanya memakai baris yang cocok dengan bidang urusannya,
 * disambung lewat `kode_sub_kegiatan`.
 *
 * Idempoten: hanya baris ber-`sumber='rakortekbang_2026'` yang dihapus dan
 * ditulis ulang, sehingga baris tambahan milik OPD (`sumber='opd'`) aman.
 *
 * Pakai:
 *   node scripts/seedPermendagri14TabelC.js            # seed
 *   node scripts/seedPermendagri14TabelC.js --periksa  # tampilkan ringkasan saja
 */

const fs = require('fs');
const path = require('path');
const db = require('../models');

const BERKAS = path.join(__dirname, '..', 'seeders', 'data', 'permendagri14-tabel-c.json');
const SUMBER_REGULASI = 'rakortekbang_2026';

const potong = (v, n) => (v === null || v === undefined ? null : String(v).slice(0, n));

function muatData() {
  if (!fs.existsSync(BERKAS)) {
    throw new Error(
      `Berkas ${BERKAS} tidak ditemukan. Jalankan dulu:\n` +
        '  python scripts/extract_permendagri14_tabel_c.py ' +
        '"../dokumenEPelara/29. Permendagri No. 14 Tahun 2026.pdf" ' +
        'seeders/data/permendagri14-tabel-c.json',
    );
  }
  return JSON.parse(fs.readFileSync(BERKAS, 'utf8'));
}

async function seedProSnMaster(data) {
  // renja_pro_sn_master seluruhnya referensi regulasi (tanpa kolom `sumber`),
  // jadi tabelnya ditulis ulang penuh.
  await db.RenjaProSnMaster.destroy({ where: {}, truncate: false });
  const baris = data.c1_pro_sn_master.map((r) => ({
    pro_sn: potong(r.pro_sn, 150),
    proyek_kegiatan: potong(r.proyek_kegiatan, 255),
    urutan: r.urutan,
  }));
  await db.RenjaProSnMaster.bulkCreate(baris);
  return baris.length;
}

async function seedDukungan(data, petaProSn, daftarMaster, statistik) {
  await db.RenjaDukunganProsnTematik.destroy({ where: { sumber: SUMBER_REGULASI } });

  const dariC2 = data.c2_dukungan_pro_sn.map((r) => ({
    tahun: null,
    perangkat_daerah_id: null,
    jenis: 'pro_sn',
    sumber: SUMBER_REGULASI,
    // Dicocokkan ke master Tabel C-1 lewat nama proyek/kegiatan. Tanpa FK
    // constraint agar master boleh direvisi tanpa memutus baris ini.
    pro_sn_master_id: (() => {
      const hasil = cariMaster(r.proyek_kegiatan, petaProSn, daftarMaster);
      statistik[hasil.cara] = (statistik[hasil.cara] || 0) + 1;
      return hasil.id;
    })(),
    pro_sn: potong(r.pro_sn, 150),
    proyek_kegiatan: potong(r.proyek_kegiatan, 255),
    tematik_pembangunan: null,
    outcome: r.outcome ?? null,
    indikator_outcome: r.indikator_outcome ?? null,
    satuan: potong(r.satuan, 50),
    pengampu_bidang_urusan_utama: potong(r.pengampu_bidang_urusan_utama, 150),
    bidang_urusan_terkait: potong(r.bidang_urusan_terkait, 150),
    program: potong(r.program, 255),
    kode: potong(r.kode, 100),
    kode_bidang_urusan: potong(r.kode_bidang_urusan, 10),
    sub_kegiatan: r.sub_kegiatan ?? null,
    urutan: r.urutan,
  }));

  const dariC3 = data.c3_dukungan_tematik.map((r) => ({
    tahun: null,
    perangkat_daerah_id: null,
    jenis: 'tematik',
    sumber: SUMBER_REGULASI,
    pro_sn_master_id: null,
    pro_sn: null,
    proyek_kegiatan: null,
    tematik_pembangunan: potong(r.tematik_pembangunan, 255),
    outcome: r.outcome ?? null,
    indikator_outcome: r.indikator_outcome ?? null,
    satuan: potong(r.satuan, 50),
    pengampu_bidang_urusan_utama: potong(r.pengampu_bidang_urusan_utama, 150),
    bidang_urusan_terkait: potong(r.bidang_urusan_terkait, 150),
    program: potong(r.program, 255),
    kode: potong(r.kode, 100),
    kode_bidang_urusan: potong(r.kode_bidang_urusan, 10),
    sub_kegiatan: r.sub_kegiatan ?? null,
    urutan: r.urutan,
  }));

  await db.RenjaDukunganProsnTematik.bulkCreate([...dariC2, ...dariC3]);
  return { pro_sn: dariC2.length, tematik: dariC3.length };
}

async function seedAstaCita(data) {
  await db.RenjaOutcomeAstaCita.destroy({ where: { sumber: SUMBER_REGULASI } });
  const baris = data.c6_outcome_asta_cita.map((r) => ({
    tahun: null,
    perangkat_daerah_id: null,
    sumber: SUMBER_REGULASI,
    no_baris_c6: r.no_baris_c6 ?? null,
    asta_cita: r.asta_cita ?? '',
    bidang_urusan: potong(r.bidang_urusan, 150),
    outcome_prioritas: r.outcome_prioritas ?? null,
    indikator: r.indikator ?? null,
    satuan: potong(r.satuan, 50),
    program: potong(r.program, 255),
    kode_subkegiatan: potong(r.kode_subkegiatan, 100),
    kode_bidang_urusan: potong(r.kode_bidang_urusan, 10),
    subkegiatan: r.subkegiatan ?? null,
    urutan: r.urutan,
  }));
  await db.RenjaOutcomeAstaCita.bulkCreate(baris);
  return baris.length;
}

/** Kunci pencocokan longgar: abaikan beda huruf besar/kecil dan tanda baca. */
const kunciProyek = (v) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenProyek = (v) => new Set(kunciProyek(v).split(' ').filter((t) => t.length >= 4));

/**
 * Cari padanan di master Tabel C-1 untuk sebuah nama proyek pada Tabel C-2.
 *
 * Kedua tabel berada di lampiran yang sama tetapi menamai proyek yang sama
 * dengan kalimat berbeda — mis. C-1 menulis "Penuntasan TBC" sedangkan C-2
 * menulis "Penuntasan Tuberkulosis (TBC)", dan C-1 memuat salah ketik
 * "Kemiskinan Eksetrim" yang di C-2 tertulis "Kemiskinan Ekstrem". Karena itu
 * kecocokan persis dicoba lebih dulu, lalu jatuh ke irisan kata; ambang 0,6
 * cukup longgar untuk variasi kalimat namun masih menolak proyek yang berbeda.
 */
function cariMaster(nama, petaPersis, daftarMaster) {
  const persis = petaPersis.get(kunciProyek(nama));
  if (persis) return { id: persis, cara: 'persis' };

  const token = tokenProyek(nama);
  if (token.size === 0) return { id: null, cara: 'gagal' };

  let terbaik = null;
  for (const m of daftarMaster) {
    const tokenMaster = tokenProyek(m.proyek_kegiatan);
    if (tokenMaster.size === 0) continue;
    let irisan = 0;
    for (const t of token) if (tokenMaster.has(t)) irisan += 1;
    if (irisan === 0) continue;
    const nilai = irisan / Math.min(token.size, tokenMaster.size);
    if (!terbaik || nilai > terbaik.nilai) terbaik = { id: m.id, nilai };
  }
  if (terbaik && terbaik.nilai >= 0.6) return { id: terbaik.id, cara: 'mirip' };
  return { id: null, cara: 'gagal' };
}

async function ringkasan() {
  const [master, dukungan, astaCita] = await Promise.all([
    db.RenjaProSnMaster.count(),
    db.RenjaDukunganProsnTematik.count({ where: { sumber: SUMBER_REGULASI } }),
    db.RenjaOutcomeAstaCita.count({ where: { sumber: SUMBER_REGULASI } }),
  ]);
  console.log('\nIsi basis data saat ini:');
  console.log(`  renja_pro_sn_master           : ${master} baris`);
  console.log(`  renja_dukungan_prosn_tematik  : ${dukungan} baris (referensi regulasi)`);
  console.log(`  renja_outcome_asta_cita       : ${astaCita} baris (referensi regulasi)`);
}

async function main() {
  const hanyaPeriksa = process.argv.includes('--periksa');
  if (hanyaPeriksa) {
    await ringkasan();
    return;
  }

  const data = muatData();
  console.log(`Sumber : ${data.sumber}`);
  console.log(`Regulasi: ${data.regulasi}\n`);

  const jumlahMaster = await seedProSnMaster(data);
  console.log(`Tabel C-1 Pro-SN master        : ${jumlahMaster} baris`);

  // Peta nama proyek/kegiatan -> id master, untuk menyambung baris Tabel C-2.
  const master = await db.RenjaProSnMaster.findAll();
  const petaProSn = new Map(master.map((m) => [kunciProyek(m.proyek_kegiatan), m.id]));

  const statistikTaut = {};
  const dukungan = await seedDukungan(data, petaProSn, master, statistikTaut);
  console.log(`Tabel C-2 Dukungan Pro-SN      : ${dukungan.pro_sn} baris`);
  console.log(`Tabel C-3 Dukungan Tematik     : ${dukungan.tematik} baris`);

  const jumlahAstaCita = await seedAstaCita(data);
  console.log(`Tabel C-6 Outcome Asta Cita    : ${jumlahAstaCita} baris`);

  const tertaut = await db.RenjaDukunganProsnTematik.count({
    where: { sumber: SUMBER_REGULASI, jenis: 'pro_sn' },
  });
  const tertautMaster = await db.RenjaDukunganProsnTematik.count({
    where: { sumber: SUMBER_REGULASI, jenis: 'pro_sn', pro_sn_master_id: { [db.Sequelize.Op.ne]: null } },
  });
  console.log(
    `\nTaut C-2 -> master C-1         : ${tertautMaster}/${tertaut} baris berhasil dicocokkan` +
      ` (persis ${statistikTaut.persis || 0}, mirip ${statistikTaut.mirip || 0},` +
      ` gagal ${statistikTaut.gagal || 0})`,
  );

  await ringkasan();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Gagal:', e.message);
    process.exit(1);
  });

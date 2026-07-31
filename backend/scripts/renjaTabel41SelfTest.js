'use strict';

/**
 * Pemeriksaan mandiri Tabel 4.1 Renja (Permendagri 14/2026).
 *
 * Menguji sifat-sifat yang harus selalu benar apa pun isi datanya, bukan
 * mencocokkan angka tertentu — supaya tetap berguna ketika dokumen berubah.
 *
 * Pakai:
 *   node scripts/renjaTabel41SelfTest.js            # dokumen bawaan
 *   node scripts/renjaTabel41SelfTest.js 52         # dokumen tertentu
 */

const db = require('../models');
const { buildTabel41, KOLOM } = require('../services/permendagri14/renjaTabel41Service');

const JENIS_SAH = [
  'opd',
  'urusan',
  'bidang_urusan',
  'program',
  'outcome_program',
  'indikator_program',
  'kegiatan',
  'outcome_kegiatan',
  'indikator_kegiatan',
  'subkegiatan',
  'output_subkegiatan',
];

const hasil = [];
const periksa = (nama, lulus, keterangan = '') => {
  hasil.push({ nama, lulus, keterangan });
  console.log(`  ${lulus ? 'LULUS' : 'GAGAL'}  ${nama}${keterangan ? ` — ${keterangan}` : ''}`);
};

const rp = (n) => Number(n || 0).toLocaleString('id-ID');

async function main() {
  db.sequelize.options.logging = false;
  const dokumenId = Number(process.argv[2]) || 52;

  const tabel = await buildTabel41(db, dokumenId);
  const { meta, baris } = tabel;

  console.log(`Dokumen ${dokumenId} — ${meta.nama_opd}, Tahun ${meta.tahun}`);
  console.log(
    `${meta.jumlah_program} program / ${meta.jumlah_kegiatan} kegiatan / ` +
      `${meta.jumlah_subkegiatan} subkegiatan · pagu ${rp(meta.total_pagu)}\n`,
  );

  // --- Struktur kolom -------------------------------------------------------
  periksa('Jumlah kolom tepat 17', KOLOM.length === 17, `ditemukan ${KOLOM.length}`);
  periksa(
    'Setiap baris memuat seluruh kunci kolom',
    baris.every((b) => KOLOM.every((k) => k.key in b)),
  );

  // --- Jenis & jenjang baris ------------------------------------------------
  const jenisTakDikenal = [...new Set(baris.map((b) => b.jenis))].filter(
    (j) => !JENIS_SAH.includes(j),
  );
  periksa('Tidak ada jenis baris asing', jenisTakDikenal.length === 0, jenisTakDikenal.join(', '));

  periksa(
    'Tepat satu baris tingkat perangkat daerah',
    baris.filter((b) => b.jenis === 'opd').length === 1,
  );
  periksa(
    'Baris pertama adalah tingkat perangkat daerah',
    baris.length > 0 && baris[0].jenis === 'opd',
  );

  // --- Keutuhan pagu --------------------------------------------------------
  const jumlahPer = (jenis) =>
    baris.filter((b) => b.jenis === jenis).reduce((s, b) => s + Number(b.pagu || 0), 0);

  const totalOpd = Number(baris.find((b) => b.jenis === 'opd')?.pagu || 0);
  for (const jenis of ['urusan', 'bidang_urusan', 'program', 'kegiatan', 'subkegiatan']) {
    const jml = jumlahPer(jenis);
    periksa(
      `Pagu tingkat "${jenis}" berjumlah sama dengan total`,
      jml === totalOpd,
      `${rp(jml)} vs ${rp(totalOpd)}`,
    );
  }

  // --- Kaidah pengisian sel -------------------------------------------------
  const subkeg = baris.filter((b) => b.jenis === 'subkegiatan');
  periksa(
    'Setiap baris subkegiatan punya kode berformat sah',
    subkeg.every((b) => /^\d\.\d{2}\.\d{2}\.\d\.\d{2}\.\d{3,4}$/.test(String(b.kode || ''))),
  );

  const output = baris.filter((b) => b.jenis === 'output_subkegiatan');
  periksa(
    'Jumlah baris output sama dengan jumlah subkegiatan',
    output.length === subkeg.length,
    `${output.length} vs ${subkeg.length}`,
  );
  periksa(
    'Baris output tidak mengulang kode subkegiatan',
    output.every((b) => !b.kode),
  );
  periksa(
    'Kolom uraian dan indikator baris output tidak identik',
    output.every((b) => !b.uraian || !b.indikator || b.uraian !== b.indikator),
  );
  periksa(
    'Baris output selalu menyebut perangkat daerah penanggung jawab',
    output.every((b) => !!b.pd_penanggung_jawab),
  );

  // --- Prioritas hanya boleh berasal dari Tabel C ----------------------------
  const berprioritas = output.filter((b) => b.prioritas_nasional || b.prioritas_daerah);
  const kodeBerprioritas = subkeg
    .map((b) => b.kode)
    .filter((_k, i) => berprioritas.includes(output[i]));

  const [dariTabelC] = await db.sequelize.query(
    `SELECT COUNT(*) AS n FROM (
        SELECT kode FROM renja_dukungan_prosn_tematik WHERE kode IS NOT NULL
        UNION
        SELECT kode_subkegiatan FROM renja_outcome_asta_cita WHERE kode_subkegiatan IS NOT NULL
     ) x`,
    { type: db.Sequelize.QueryTypes.SELECT },
  );
  periksa(
    'Tabel C sudah ter-seed (prasyarat kolom Prioritas)',
    Number(dariTabelC.n) > 0,
    `${dariTabelC.n} kode referensi`,
  );

  let prioritasSah = true;
  for (const kode of kodeBerprioritas) {
    const [cek] = await db.sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM renja_dukungan_prosn_tematik WHERE kode = :kode) +
         (SELECT COUNT(*) FROM renja_outcome_asta_cita WHERE kode_subkegiatan = :kode) AS n`,
      { replacements: { kode }, type: db.Sequelize.QueryTypes.SELECT },
    );
    if (Number(cek.n) === 0) prioritasSah = false;
  }
  periksa(
    'Setiap penanda Prioritas berasal dari Tabel C',
    prioritasSah,
    `${berprioritas.length} baris berprioritas`,
  );

  // --- Nomor urut -----------------------------------------------------------
  const nomorProgram = baris.filter((b) => b.jenis === 'program').map((b) => b.no);
  const berurutan = nomorProgram.every((n, i) => n === `${i + 1}.`);
  periksa('Nomor program berurutan 1..N tanpa lompatan', berurutan, nomorProgram.join(' '));

  const gagal = hasil.filter((h) => !h.lulus);
  console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`);
  if (gagal.length) {
    console.log('Gagal:');
    gagal.forEach((g) => console.log(`  - ${g.nama} ${g.keterangan}`));
  }
  return gagal.length === 0 ? 0 : 1;
}

main()
  .then((kode) => process.exit(kode))
  .catch((e) => {
    console.error('Gagal menjalankan:', e.message);
    process.exit(1);
  });

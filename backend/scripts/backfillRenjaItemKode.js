'use strict';

/**
 * Isi kolom `kode_program`, `kode_kegiatan`, dan `kode_sub_kegiatan` pada
 * `renja_item` dari kode yang selama ini hanya tersimpan sebagai awalan teks
 * nomenklatur, mis. "2.09.02.1.01.0003 - Penyediaan Infrastruktur ...".
 *
 * Ketiga kolom itu sudah lama ada tetapi tidak pernah terisi, sehingga Renja
 * belum bisa disambungkan ke Tabel C-2/C-3/C-6 Permendagri 14/2026 maupun ke
 * `master_sub_kegiatan`. Backfill ini prasyarat Tabel 4.1 (Fase 2).
 *
 * Aman diulang: hanya baris yang kolom kodenya masih kosong yang disentuh,
 * kecuali dijalankan dengan --paksa.
 *
 * Pakai:
 *   node scripts/backfillRenjaItemKode.js --uji     # tampilkan rencana, tanpa menulis
 *   node scripts/backfillRenjaItemKode.js           # terapkan
 *   node scripts/backfillRenjaItemKode.js --paksa   # tulis ulang termasuk yang sudah terisi
 */

const db = require('../models');

// Kode Kepmendagri 900: program 2.09.02, kegiatan 2.09.02.1.01,
// subkegiatan 2.09.02.1.01.0003. Titik di ekor ("2.09.03.") ikut dirapikan.
const POLA = {
  program: /^\s*(\d\.\d{2}\.\d{2})\.?(?=\s|-|$)/,
  kegiatan: /^\s*(\d\.\d{2}\.\d{2}\.\d\.\d{2})\.?(?=\s|-|$)/,
  sub_kegiatan: /^\s*(\d\.\d{2}\.\d{2}\.\d\.\d{2}\.\d{3,4})\.?(?=\s|-|$)/,
};

const ambilKode = (teks, jenis) => {
  const m = String(teks ?? '').match(POLA[jenis]);
  return m ? m[1] : null;
};

const kosong = (v) => v === null || v === undefined || String(v).trim() === '';

async function main() {
  const ujiSaja = process.argv.includes('--uji');
  const paksa = process.argv.includes('--paksa');
  db.sequelize.options.logging = false;

  const rows = await db.RenjaItem.findAll({
    attributes: [
      'id',
      'renja_dokumen_id',
      'program',
      'kegiatan',
      'sub_kegiatan',
      'kode_program',
      'kode_kegiatan',
      'kode_sub_kegiatan',
    ],
  });

  const perubahan = [];
  const gagal = { program: 0, kegiatan: 0, sub_kegiatan: 0 };

  for (const r of rows) {
    const usulan = {};
    for (const jenis of ['program', 'kegiatan', 'sub_kegiatan']) {
      const kolom = `kode_${jenis}`;
      if (!paksa && !kosong(r[kolom])) continue;
      const kode = ambilKode(r[jenis], jenis);
      if (!kode) {
        if (!kosong(r[jenis])) gagal[jenis] += 1;
        continue;
      }
      if (r[kolom] !== kode) usulan[kolom] = kode;
    }
    if (Object.keys(usulan).length) perubahan.push({ id: r.id, usulan });
  }

  console.log(`Baris renja_item          : ${rows.length}`);
  console.log(`Baris yang akan diperbarui: ${perubahan.length}`);
  console.log(
    `Tidak terbaca polanya     : program ${gagal.program}, kegiatan ${gagal.kegiatan}, subkegiatan ${gagal.sub_kegiatan}`,
  );

  if (perubahan.length) {
    console.log('\nContoh 3 perubahan pertama:');
    perubahan.slice(0, 3).forEach((p) => console.log(`  #${p.id}`, JSON.stringify(p.usulan)));
  }

  if (ujiSaja) {
    console.log('\n(--uji) Tidak ada yang ditulis.');
    return;
  }

  for (const p of perubahan) {
    await db.RenjaItem.update(p.usulan, { where: { id: p.id } });
  }
  console.log(`\n${perubahan.length} baris diperbarui.`);

  const sisa = await db.RenjaItem.count({ where: { kode_sub_kegiatan: null } });
  console.log(`Sisa baris tanpa kode_sub_kegiatan: ${sisa}`);

  // Seberapa banyak subkegiatan Renja yang benar-benar tersambung ke Tabel C.
  const [cocok] = await db.sequelize.query(
    `SELECT COUNT(DISTINCT ri.id) AS n
       FROM renja_item ri
       JOIN renja_dukungan_prosn_tematik d ON d.kode = ri.kode_sub_kegiatan
      WHERE ri.kode_sub_kegiatan IS NOT NULL`,
    { type: db.Sequelize.QueryTypes.SELECT },
  );
  const [cocokAc] = await db.sequelize.query(
    `SELECT COUNT(DISTINCT ri.id) AS n
       FROM renja_item ri
       JOIN renja_outcome_asta_cita a ON a.kode_subkegiatan = ri.kode_sub_kegiatan
      WHERE ri.kode_sub_kegiatan IS NOT NULL`,
    { type: db.Sequelize.QueryTypes.SELECT },
  );
  console.log(`\nBaris Renja yang cocok ke Tabel C-2/C-3 : ${cocok.n}`);
  console.log(`Baris Renja yang cocok ke Tabel C-6     : ${cocokAc.n}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Gagal:', e.message);
    process.exit(1);
  });

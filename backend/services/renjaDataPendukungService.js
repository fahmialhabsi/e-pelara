'use strict';

/**
 * Layanan data pendukung Renja Permendagri 14/2026:
 * - Pokok-pokok pikiran DPRD (subbab 2.3/2.4)
 * - Inovasi bidang urusan (subbab 2.4/2.5)
 *
 * Kedua data ini berasal dari luar aplikasi (hasil reses DPRD dan usulan
 * inovasi OPD), sehingga titik masuknya tidak bisa dihitung sistem. Yang
 * dilakukan modul ini adalah menekan input manual seminimal mungkin:
 *
 * 1. Impor massal — data ditempel/diunggah sekali, bukan diketik baris per baris.
 * 2. Auto-fill kolom "program/kegiatan terkait" — dicocokkan otomatis ke
 *    nomenklatur Kepmendagri 900 (master_sub_kegiatan) milik bidang urusan OPD.
 * 3. Recall antartahun — inovasi yang masih berjalan diturunkan otomatis ke
 *    tahun berikutnya, tidak diketik ulang setiap tahun.
 * 4. Rekap — angka jumlah/total dihitung, tidak disimpan sebagai angka statis.
 */

const { Op } = require('sequelize');

/** Kata yang tidak membawa makna pencocokan pada teks usulan/nomenklatur. */
const STOPWORDS = new Set([
  'dan',
  'atau',
  'yang',
  'untuk',
  'pada',
  'di',
  'ke',
  'dari',
  'dengan',
  'dalam',
  'serta',
  'agar',
  'oleh',
  'sebagai',
  'adalah',
  'ada',
  'akan',
  'per',
  'bagi',
  'antar',
  'atas',
  'terhadap',
  'guna',
  'melalui',
  'tentang',
  'para',
  'itu',
  'ini',
  'juga',
  'lebih',
  'agar',
  'mohon',
  'usulan',
  'kegiatan',
  'program',
  'daerah',
  'provinsi',
  'kabupaten',
  'kota',
]);

const bersihkanTeks = (v) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Ambil token bermakna (>=4 huruf, bukan stopword) dari sebuah teks. */
const tokenBermakna = (teks) => {
  const set = new Set();
  for (const t of bersihkanTeks(teks).split(' ')) {
    if (t.length >= 4 && !STOPWORDS.has(t)) set.add(t);
  }
  return set;
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Tentukan kode bidang urusan (mis. "2.09") milik sebuah perangkat daerah.
 *
 * perangkat_daerah.kode belum terisi untuk sebagian OPD, jadi kode diturunkan
 * dari data perencanaan yang sudah ada: nomenklatur program pada renja_item
 * menyimpan kode di awal teks ("2.09.02 - PROGRAM ..."). Cara ini justru lebih
 * tahan perubahan karena mengikuti data yang benar-benar dipakai OPD.
 */
async function resolveBidangUrusan(db, perangkatDaerahId) {
  const pdId = toInt(perangkatDaerahId);
  if (!pdId) return null;

  const rows = await db.sequelize
    .query(
      `SELECT ri.kode_program, ri.program
         FROM renja_item ri
         JOIN renja_dokumen rd ON rd.id = ri.renja_dokumen_id
        WHERE rd.perangkat_daerah_id = :pdId
          AND (ri.kode_program IS NOT NULL OR ri.program IS NOT NULL)
        ORDER BY rd.tahun DESC, ri.id ASC
        LIMIT 40`,
      { replacements: { pdId }, type: db.Sequelize.QueryTypes.SELECT },
    )
    .catch(() => []);

  for (const r of rows) {
    const sumber = r.kode_program || r.program || '';
    const m = String(sumber).match(/(\d\.\d{2})/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Cari nomenklatur subkegiatan yang paling mendekati sebuah teks usulan.
 * Skor = irisan token usulan dengan token nama subkegiatan, dinormalkan agar
 * nomenklatur panjang tidak otomatis menang.
 */
async function sugestiNomenklatur(db, { teks, bidangUrusan, batas = 3 }) {
  const tokenUsulan = tokenBermakna(teks);
  if (tokenUsulan.size === 0) return [];

  const where = { is_active: { [Op.ne]: 0 } };
  if (bidangUrusan) where.kode_sub_kegiatan_full = { [Op.like]: `${bidangUrusan}%` };

  const kandidat = await db.MasterSubKegiatan.findAll({
    where,
    attributes: ['kode_sub_kegiatan_full', 'nama_sub_kegiatan'],
    limit: 2000,
  }).catch(() => []);

  // master_sub_kegiatan menyimpan kode yang sama pada beberapa dataset/versi
  // regulasi, jadi hasil didedupe per kode agar saran tidak tampil berulang.
  const terbaik = new Map();
  for (const k of kandidat) {
    const tokenNama = tokenBermakna(k.nama_sub_kegiatan);
    if (tokenNama.size === 0) continue;
    let irisan = 0;
    for (const t of tokenUsulan) if (tokenNama.has(t)) irisan += 1;
    if (irisan === 0) continue;
    // Bagi dengan ukuran himpunan terkecil supaya cocok-sebagian tetap bernilai.
    const nilai = irisan / Math.min(tokenUsulan.size, tokenNama.size);
    const kode = k.kode_sub_kegiatan_full;
    const sebelumnya = terbaik.get(kode);
    if (sebelumnya && sebelumnya.skor >= nilai) continue;
    terbaik.set(kode, {
      kode_sub_kegiatan: kode,
      nama_sub_kegiatan: k.nama_sub_kegiatan,
      skor: Number(nilai.toFixed(4)),
      token_cocok: irisan,
    });
  }

  const skor = [...terbaik.values()];
  skor.sort((a, b) => b.skor - a.skor || b.token_cocok - a.token_cocok);
  return skor.slice(0, batas);
}

/**
 * Usulkan isi kolom program_kegiatan_terkait bagi baris Pokir yang masih kosong.
 * Tidak menulis apa pun — hasilnya ditinjau dulu di layar, baru diterapkan.
 */
async function previewAutofillPokir(db, { tahun, perangkat_daerah_id, ambang = 0.34 }) {
  const pdId = toInt(perangkat_daerah_id);
  const where = {};
  if (tahun) where.tahun = String(tahun);
  if (pdId) where.perangkat_daerah_id = pdId;

  const rows = await db.RenjaPokirDprd.findAll({
    where,
    order: [
      ['urutan', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  const bidangUrusan = pdId ? await resolveBidangUrusan(db, pdId) : null;
  const perubahan = [];
  let dilewati = 0;

  for (const r of rows) {
    const sudahTerisi = r.program_kegiatan_terkait && String(r.program_kegiatan_terkait).trim();
    if (sudahTerisi) {
      dilewati += 1;
      continue;
    }
    const saran = await sugestiNomenklatur(db, { teks: r.usulan, bidangUrusan });
    const teratas = saran[0];
    if (!teratas || teratas.skor < ambang) {
      dilewati += 1;
      continue;
    }
    perubahan.push({
      id: r.id,
      usulan: r.usulan,
      nilai_lama: r.program_kegiatan_terkait || null,
      nilai_baru: `${teratas.kode_sub_kegiatan} - ${teratas.nama_sub_kegiatan}`,
      skor: teratas.skor,
      alternatif: saran.slice(1),
    });
  }

  return { bidang_urusan: bidangUrusan, total: rows.length, dilewati, perubahan };
}

/** Terapkan hasil preview autofill yang disetujui pengguna. */
async function terapkanAutofillPokir(db, perubahan) {
  const daftar = Array.isArray(perubahan) ? perubahan : [];
  let diperbarui = 0;
  for (const p of daftar) {
    const id = toInt(p?.id);
    if (!id || !p?.nilai_baru) continue;
    const [n] = await db.RenjaPokirDprd.update(
      { program_kegiatan_terkait: String(p.nilai_baru).slice(0, 255) },
      { where: { id } },
    );
    diperbarui += n;
  }
  return { diperbarui };
}

/**
 * Impor massal Pokir DPRD. Baris tanpa "usulan" ditolak karena kolom itu wajib;
 * sisanya diterima agar satu baris rusak tidak menggagalkan seluruh berkas.
 */
async function importPokir(db, { tahun, perangkat_daerah_id, rows }) {
  const pdId = toInt(perangkat_daerah_id);
  if (!tahun || !pdId) throw new Error('tahun dan perangkat_daerah_id wajib diisi.');
  const daftar = Array.isArray(rows) ? rows : [];
  if (daftar.length === 0) throw new Error('Tidak ada baris untuk diimpor.');

  const terakhir = await db.RenjaPokirDprd.max('urutan', {
    where: { tahun: String(tahun), perangkat_daerah_id: pdId },
  });
  let urutan = Number(terakhir) || 0;

  const diterima = [];
  const ditolak = [];

  daftar.forEach((r, i) => {
    const usulan = String(r?.usulan ?? '').trim();
    if (!usulan) {
      ditolak.push({ baris: i + 1, alasan: 'Kolom "usulan" kosong.' });
      return;
    }
    urutan += 1;
    diterima.push({
      tahun: String(tahun),
      perangkat_daerah_id: pdId,
      nama_anggota_dprd: r.nama_anggota_dprd ? String(r.nama_anggota_dprd).slice(0, 150) : null,
      dapil: r.dapil ? String(r.dapil).slice(0, 100) : null,
      usulan,
      lokasi: r.lokasi ? String(r.lokasi).slice(0, 255) : null,
      program_kegiatan_terkait: r.program_kegiatan_terkait
        ? String(r.program_kegiatan_terkait).slice(0, 255)
        : null,
      nilai_usulan_anggaran: parseRupiah(r.nilai_usulan_anggaran),
      urutan,
      catatan: r.catatan ? String(r.catatan) : null,
    });
  });

  if (diterima.length === 0) return { disimpan: 0, ditolak };
  await db.RenjaPokirDprd.bulkCreate(diterima);
  return { disimpan: diterima.length, ditolak };
}

/** Terima "1.500.000.000", "1500000000", "Rp 1.500.000" maupun angka biasa. */
function parseRupiah(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const bersih = String(v)
    .replace(/rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(/,/g, '.');
  const n = Number(bersih);
  return Number.isFinite(n) ? n : null;
}

/** Rekap Pokir untuk baris total tabel dan narasi subbab Bab II. */
async function rekapPokir(db, { tahun, perangkat_daerah_id }) {
  const pdId = toInt(perangkat_daerah_id);
  const where = {};
  if (tahun) where.tahun = String(tahun);
  if (pdId) where.perangkat_daerah_id = pdId;

  const rows = await db.RenjaPokirDprd.findAll({ where });
  const totalNilai = rows.reduce((s, r) => s + (Number(r.nilai_usulan_anggaran) || 0), 0);
  const terakomodasi = rows.filter(
    (r) => r.program_kegiatan_terkait && String(r.program_kegiatan_terkait).trim(),
  ).length;
  const dapil = [...new Set(rows.map((r) => r.dapil).filter(Boolean))];
  const anggota = [...new Set(rows.map((r) => r.nama_anggota_dprd).filter(Boolean))];

  return {
    jumlah_usulan: rows.length,
    total_nilai_usulan: totalNilai,
    terakomodasi,
    belum_terakomodasi: rows.length - terakomodasi,
    jumlah_dapil: dapil.length,
    jumlah_anggota: anggota.length,
  };
}

/**
 * Preview recall inovasi: bawa inovasi tahun sebelumnya yang masih berjalan ke
 * tahun berkenaan. Inovasi kehutanan pada dokumen acuan berjalan lintas tahun
 * (diusulkan 2023, dinilai ulang 2024/2025), jadi pengulangan seperti ini wajar
 * dan tidak perlu diketik ulang tiap tahun.
 */
async function previewRecallInovasi(db, { tahun, perangkat_daerah_id }) {
  const pdId = toInt(perangkat_daerah_id);
  if (!tahun || !pdId) throw new Error('tahun dan perangkat_daerah_id wajib diisi.');

  const tahunSumber = String(Number(tahun) - 1);
  const [sumber, tujuan] = await Promise.all([
    db.RenjaInovasiBidangUrusan.findAll({
      where: { tahun: tahunSumber, perangkat_daerah_id: pdId },
      order: [
        ['urutan', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    db.RenjaInovasiBidangUrusan.findAll({
      where: { tahun: String(tahun), perangkat_daerah_id: pdId },
    }),
  ]);

  const sudahAda = new Set(tujuan.map((r) => bersihkanTeks(r.nama_inovasi)));
  const kandidat = sumber
    .filter((r) => !sudahAda.has(bersihkanTeks(r.nama_inovasi)))
    .map((r) => ({
      nama_inovasi: r.nama_inovasi,
      bentuk_inovasi: r.bentuk_inovasi,
      deskripsi: r.deskripsi,
      tahun_mulai: r.tahun_mulai || tahunSumber,
      manfaat: r.manfaat,
      jumlah: r.jumlah,
      catatan: r.catatan,
    }));

  return {
    tahun_sumber: tahunSumber,
    tahun_tujuan: String(tahun),
    tersedia_di_sumber: sumber.length,
    sudah_ada_di_tujuan: tujuan.length,
    kandidat,
  };
}

/** Terapkan recall inovasi dari tahun sebelumnya. */
async function terapkanRecallInovasi(db, { tahun, perangkat_daerah_id, kandidat }) {
  const pdId = toInt(perangkat_daerah_id);
  if (!tahun || !pdId) throw new Error('tahun dan perangkat_daerah_id wajib diisi.');

  const daftar =
    Array.isArray(kandidat) && kandidat.length
      ? kandidat
      : (await previewRecallInovasi(db, { tahun, perangkat_daerah_id: pdId })).kandidat;

  if (daftar.length === 0) return { disimpan: 0 };

  const terakhir = await db.RenjaInovasiBidangUrusan.max('urutan', {
    where: { tahun: String(tahun), perangkat_daerah_id: pdId },
  });
  let urutan = Number(terakhir) || 0;

  const baris = daftar
    .filter((k) => String(k?.nama_inovasi ?? '').trim())
    .map((k) => {
      urutan += 1;
      return {
        tahun: String(tahun),
        perangkat_daerah_id: pdId,
        nama_inovasi: String(k.nama_inovasi).slice(0, 255),
        bentuk_inovasi: k.bentuk_inovasi ? String(k.bentuk_inovasi).slice(0, 150) : null,
        deskripsi: k.deskripsi ?? null,
        tahun_mulai: k.tahun_mulai ? String(k.tahun_mulai).slice(0, 4) : null,
        manfaat: k.manfaat ?? null,
        jumlah: toInt(k.jumlah),
        urutan,
        catatan: k.catatan ?? null,
      };
    });

  if (baris.length === 0) return { disimpan: 0 };
  await db.RenjaInovasiBidangUrusan.bulkCreate(baris);
  return { disimpan: baris.length };
}

/**
 * Rekap inovasi. jumlah_inovasi memasok IKK "Jumlah Inovasi Perangkat Daerah
 * Yang Dihasilkan" pada Tabel 2.4, sehingga angkanya tidak diketik dua kali.
 */
async function rekapInovasi(db, { tahun, perangkat_daerah_id }) {
  const pdId = toInt(perangkat_daerah_id);
  const where = {};
  if (tahun) where.tahun = String(tahun);
  if (pdId) where.perangkat_daerah_id = pdId;

  const rows = await db.RenjaInovasiBidangUrusan.findAll({ where });
  const perBentuk = {};
  for (const r of rows) {
    const k = r.bentuk_inovasi || '(belum dikategorikan)';
    perBentuk[k] = (perBentuk[k] || 0) + 1;
  }

  return {
    jumlah_inovasi: rows.length,
    per_bentuk: perBentuk,
    inovasi_baru: rows.filter((r) => String(r.tahun_mulai || '') === String(tahun)).length,
    inovasi_berlanjut: rows.filter((r) => r.tahun_mulai && String(r.tahun_mulai) !== String(tahun))
      .length,
  };
}

module.exports = {
  resolveBidangUrusan,
  sugestiNomenklatur,
  previewAutofillPokir,
  terapkanAutofillPokir,
  importPokir,
  rekapPokir,
  previewRecallInovasi,
  terapkanRecallInovasi,
  rekapInovasi,
  parseRupiah,
};

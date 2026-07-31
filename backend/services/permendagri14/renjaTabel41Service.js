'use strict';

/**
 * Tabel 4.1 Renja — "Rencana Program dan Kegiatan Prioritas Daerah"
 * (Bab IV, sistematika Permendagri 14/2026).
 *
 * Tabel ini berorientasi landscape dengan 17 kolom dan kepala tabel 3 tingkat,
 * serta baris berjenjang 5 tingkat:
 *
 *   Perangkat Daerah                              (total)
 *     Urusan Pemerintahan                         mis. "2"
 *       Bidang Urusan                             mis. "2.09"
 *         Program                                 mis. "2.09.03"
 *           outcome program + indikatornya
 *           Kegiatan                              mis. "2.09.03.1.01"
 *             outcome kegiatan + indikatornya
 *             Subkegiatan                         mis. "2.09.03.1.01.0006"
 *               output subkegiatan + indikatornya
 *
 * Prinsip yang dipegang:
 *  - Nomor urut kolom 1 DIHITUNG SAAT RENDER, tidak pernah disimpan. Lampiran
 *    sumber diketahui memiliki penomoran yang meloncat, dan tabel ini berubah
 *    setiap kali baris ditambah/dihapus.
 *  - Kolom "Prioritas Nasional"/"Prioritas Daerah" dihitung dari sambungan
 *    `kode_sub_kegiatan` ke Tabel C-2/C-3/C-6, bukan disimpan sebagai kolom,
 *    supaya tidak basi ketika lampiran Rakortekbang diperbarui.
 *  - Pagu tingkat atas adalah penjumlahan dari bawah, bukan angka yang diketik.
 */

const { pilihTargetTahun } = require('../lakipBridgeService');

/**
 * Penggolongan urusan pada digit pertama kode, sesuai Permendagri 90/2019.
 * Tidak tersedia sebagai tabel master di basis data (master_program.nama_urusan
 * berisi nama BIDANG urusan, bukan golongannya), sementara daftarnya tetap dan
 * hanya delapan butir.
 */
const NAMA_URUSAN = {
  1: 'URUSAN PEMERINTAHAN WAJIB YANG BERKAITAN DENGAN PELAYANAN DASAR',
  2: 'URUSAN PEMERINTAHAN WAJIB YANG TIDAK BERKAITAN DENGAN PELAYANAN DASAR',
  3: 'URUSAN PEMERINTAHAN PILIHAN',
  4: 'UNSUR PENDUKUNG URUSAN PEMERINTAHAN',
  5: 'UNSUR PENUNJANG URUSAN PEMERINTAHAN',
  6: 'UNSUR PENGAWASAN URUSAN PEMERINTAHAN',
  7: 'UNSUR KEWILAYAHAN',
  8: 'UNSUR PEMERINTAHAN UMUM',
  '?': 'PROGRAM/KEGIATAN TANPA KODE (PERLU DILENGKAPI DI DATA SUMBER)',
};

/**
 * Baris renja_item kadang punya nama program tanpa awalan kode (data sumber
 * tidak konsisten — pernah terjadi nyata: satu baris hasil impor RKPD hanya
 * berisi nama program, tanpa "2.09.02 - " di depannya). Sentinel ini
 * mengelompokkan baris semacam itu ke satu bucket yang tetap TERLIHAT dan
 * tetap IKUT dihitung di setiap tingkat, alih-alih hilang diam-diam dari
 * tabel padahal pagu-nya tetap masuk ke total OPD — itulah yang sempat
 * membuat total OPD dan total tingkat Urusan berselisih tanpa penjelasan.
 */
const KODE_TANPA_PROGRAM = '?.??';

/** Spesifikasi kepala tabel 3 tingkat — dipakai mesin render DOCX/PDF. */
const KOLOM = [
  { key: 'no', label: 'NO', lebar: 3 },
  { key: 'kode', label: 'KODE', lebar: 7 },
  {
    key: 'uraian',
    label: 'URUSAN / BIDANG URUSAN / PROGRAM / OUTCOME / KEGIATAN / SUBKEGIATAN OUTPUT',
    lebar: 16,
  },
  { key: 'indikator', label: 'INDIKATOR', lebar: 12 },
  { key: 'target_akhir_renstra', label: 'TARGET AKHIR RENSTRA', lebar: 5 },
  { key: 'realisasi_lalu', label: 'REALISASI', lebar: 5, dinamis: 'tahunRealisasi' },
  { key: 'prakiraan_berjalan', label: 'PRAKIRAAN', lebar: 5, dinamis: 'tahunBerjalan' },
  { key: 'target', label: 'TARGET', lebar: 5, grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN', dinamis: 'tahun' },
  { key: 'pagu', label: 'PAGU INDIKATIF', lebar: 7, grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN' },
  { key: 'lokasi', label: 'LOKASI', lebar: 6, grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN' },
  { key: 'sumber_dana', label: 'SUMBER DANA', lebar: 6, grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN' },
  {
    key: 'prioritas_nasional',
    label: 'NASIONAL',
    lebar: 5,
    grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN',
    subgrup: 'PRIORITAS',
  },
  {
    key: 'prioritas_daerah',
    label: 'DAERAH',
    lebar: 5,
    grup: 'CAPAIAN KINERJA DAN KERANGKA PENDANAAN',
    subgrup: 'PRIORITAS',
  },
  { key: 'kelompok_sasaran', label: 'KELOMPOK SASARAN', lebar: 6 },
  { key: 'target_maju', label: 'TARGET', lebar: 5, grup: 'PRAKIRAAN MAJU', dinamis: 'tahunMaju' },
  { key: 'pagu_maju', label: 'PAGU INDIKATIF', lebar: 7, grup: 'PRAKIRAAN MAJU', dinamis: 'tahunMaju' },
  { key: 'pd_penanggung_jawab', label: 'PERANGKAT DAERAH PENANGGUNG JAWAB', lebar: 7 },
];

const angka = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Buang awalan kode dari "2.09.03 - PROGRAM ..." agar tersisa namanya saja. */
const tanpaKode = (teks) =>
  String(teks ?? '')
    .replace(/^\s*[\d.]+\s*-\s*/, '')
    .trim();

/** Kunci pembanding nama lintas tabel (lk_dispang memakai nama, bukan kode). */
const kunciNama = (teks) =>
  tanpaKode(teks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Gabung target + satuan jadi satu sel, mis. "1 Dokumen" atau "67,41 %". */
function teksTarget(nilai, satuan) {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  const n = Number(nilai);
  const angkaTeks = Number.isFinite(n)
    ? String(parseFloat(n.toFixed(4))).replace('.', ',')
    : String(nilai);
  return satuan ? `${angkaTeks} ${satuan}`.trim() : angkaTeks;
}

/** Baris kosong berisi seluruh kolom, supaya mesin render tidak perlu menebak. */
function barisKosong(tambahan) {
  const dasar = {};
  for (const k of KOLOM) dasar[k.key] = null;
  return { ...dasar, ...tambahan };
}

// ---------------------------------------------------------------------------
// Pemuatan data pendukung
// ---------------------------------------------------------------------------

/** Nama bidang urusan (mis. "URUSAN PEMERINTAHAN BIDANG PANGAN") dari master. */
async function muatNamaBidangUrusan(db, kodeBidangUrusanList) {
  if (!kodeBidangUrusanList.length) return {};
  const rows = await db.sequelize
    .query(
      `SELECT DISTINCT LEFT(kode_program_full, 4) AS kode, nama_urusan
         FROM master_program
        WHERE LEFT(kode_program_full, 4) IN (:kode)`,
      {
        replacements: { kode: kodeBidangUrusanList },
        type: db.Sequelize.QueryTypes.SELECT,
      },
    )
    .catch(() => []);
  const peta = {};
  for (const r of rows) if (r.kode && !peta[r.kode]) peta[r.kode] = r.nama_urusan;
  return peta;
}

/**
 * Indikator Renstra tingkat program dan kegiatan, dikunci dengan kode agar
 * tidak bergantung pada kolom source_renstra_* yang belum tentu terisi.
 */
async function muatIndikatorRenstra(db, renstraId) {
  if (!renstraId) return { program: {}, kegiatan: {} };

  const ambil = async (stage, tabel, kolomKode) => {
    const rows = await db.sequelize
      .query(
        `SELECT ir.*, t.${kolomKode} AS kode_ref
           FROM indikator_renstra ir
           JOIN ${tabel} t ON t.id = ir.ref_id
          WHERE ir.renstra_id = :rid AND ir.stage = :stage`,
        {
          replacements: { rid: renstraId, stage },
          type: db.Sequelize.QueryTypes.SELECT,
        },
      )
      .catch(() => []);
    const peta = {};
    for (const r of rows) {
      // Kode di renstra kadang bertitik menggantung ("2.09.03.") — dirapikan.
      const kode = String(r.kode_ref || '').replace(/\.+$/, '');
      if (!kode) continue;
      if (!peta[kode]) peta[kode] = [];
      peta[kode].push(r);
    }
    return peta;
  };

  return {
    program: await ambil('program', 'renstra_program', 'kode_program'),
    kegiatan: await ambil('kegiatan', 'renstra_kegiatan', 'kode_kegiatan'),
  };
}

/**
 * Dukungan Pro-SN/Tematik (Tabel C-2/C-3) dan Asta Cita (Tabel C-6) per kode
 * subkegiatan. Dua kueri terpisah karena keduanya tabel berbeda dengan nama
 * kolom kode yang berbeda pula; digabung di sisi aplikasi.
 */
async function muatPrioritas(db, kodeSubList) {
  if (!kodeSubList.length) return {};

  const [proSn, astaCita] = await Promise.all([
    db.sequelize.query(
      `SELECT kode,
              GROUP_CONCAT(DISTINCT pro_sn)              AS pro_sn,
              GROUP_CONCAT(DISTINCT tematik_pembangunan) AS tematik
         FROM renja_dukungan_prosn_tematik
        WHERE kode IN (:kode)
        GROUP BY kode`,
      { replacements: { kode: kodeSubList }, type: db.Sequelize.QueryTypes.SELECT },
    ),
    db.sequelize.query(
      `SELECT kode_subkegiatan AS kode,
              GROUP_CONCAT(DISTINCT outcome_prioritas) AS asta_cita
         FROM renja_outcome_asta_cita
        WHERE kode_subkegiatan IN (:kode)
        GROUP BY kode_subkegiatan`,
      { replacements: { kode: kodeSubList }, type: db.Sequelize.QueryTypes.SELECT },
    ),
  ]);

  const peta = {};
  for (const r of proSn) {
    peta[r.kode] = { pro_sn: r.pro_sn || null, tematik: r.tematik || null, asta_cita: null };
  }
  for (const r of astaCita) {
    peta[r.kode] = { ...(peta[r.kode] || { pro_sn: null, tematik: null }), asta_cita: r.asta_cita || null };
  }
  return peta;
}

/** Target & pagu dokumen Renja tahun sebelumnya — kolom "Prakiraan". */
async function muatPrakiraanTahunBerjalan(db, dok) {
  const sebelumnya = await db.RenjaDokumen.findOne({
    where: {
      perangkat_daerah_id: dok.perangkat_daerah_id,
      tahun: Number(dok.tahun) - 1,
    },
    order: [
      ['is_final_active', 'DESC'],
      ['id', 'DESC'],
    ],
  }).catch(() => null);
  if (!sebelumnya) return {};

  const items = await db.RenjaItem.findAll({
    where: { renja_dokumen_id: sebelumnya.id },
    attributes: ['kode_sub_kegiatan', 'target', 'target_numerik', 'target_teks', 'satuan', 'pagu'],
  });

  const peta = {};
  for (const it of items) {
    if (!it.kode_sub_kegiatan) continue;
    peta[it.kode_sub_kegiatan] = {
      target: teksTarget(it.target_numerik ?? it.target, it.satuan) || it.target_teks || null,
      pagu: angka(it.pagu),
    };
  }
  return peta;
}

/**
 * Nomenklatur resmi subkegiatan dari master Kepmendagri 900.
 *
 * Kolom `kinerja` berisi rumusan keluaran ("Tersedianya ...", "Terlaksananya
 * ...") yang pada dokumen acuan mengisi kolom uraian baris output subkegiatan —
 * berbeda dari kolom INDIKATOR yang berisi "Jumlah ...". Tanpa ini kedua kolom
 * akan memuat teks yang sama.
 */
async function muatMasterSubKegiatan(db, kodeSubList) {
  if (!kodeSubList.length) return {};
  const rows = await db.MasterSubKegiatan.findAll({
    where: { kode_sub_kegiatan_full: kodeSubList },
    attributes: ['kode_sub_kegiatan_full', 'nama_sub_kegiatan', 'kinerja', 'indikator', 'satuan'],
  }).catch(() => []);

  // Master menyimpan kode yang sama pada beberapa dataset/versi regulasi;
  // baris yang paling lengkap dimenangkan.
  const peta = {};
  for (const r of rows) {
    const kode = r.kode_sub_kegiatan_full;
    const skor = (r.kinerja ? 1 : 0) + (r.indikator ? 1 : 0);
    const lama = peta[kode];
    if (!lama || skor > lama._skor) peta[kode] = { ...r.get({ plain: true }), _skor: skor };
  }
  return peta;
}

/** Realisasi anggaran tahun lalu dari LK, dikunci nama subkegiatan. */
async function muatRealisasiTahunLalu(db, tahunLalu) {
  const rows = await db.sequelize
    .query(
      `SELECT sub_kegiatan, SUM(realisasi) AS realisasi
         FROM lk_dispang
        WHERE tahun = :tahun
        GROUP BY sub_kegiatan`,
      { replacements: { tahun: String(tahunLalu) }, type: db.Sequelize.QueryTypes.SELECT },
    )
    .catch(() => []);
  const peta = {};
  for (const r of rows) {
    const k = kunciNama(r.sub_kegiatan);
    if (k) peta[k] = angka(r.realisasi);
  }
  return peta;
}

// ---------------------------------------------------------------------------
// Penyusunan hierarki
// ---------------------------------------------------------------------------

function susunPohon(items) {
  const pohon = new Map();
  for (const it of items) {
    const kodeP = it.kode_program || KODE_TANPA_PROGRAM;
    const kodeK = it.kode_kegiatan || '(tanpa kode)';
    if (!pohon.has(kodeP)) {
      pohon.set(kodeP, { kode: kodeP, nama: tanpaKode(it.program), kegiatan: new Map(), pagu: 0 });
    }
    const prog = pohon.get(kodeP);
    if (!prog.kegiatan.has(kodeK)) {
      prog.kegiatan.set(kodeK, {
        kode: kodeK,
        nama: tanpaKode(it.kegiatan),
        subkegiatan: [],
        pagu: 0,
      });
    }
    const keg = prog.kegiatan.get(kodeK);
    keg.subkegiatan.push(it);
    const pagu = angka(it.pagu_indikatif ?? it.pagu);
    keg.pagu += pagu;
    prog.pagu += pagu;
  }
  return pohon;
}

// ---------------------------------------------------------------------------
// Titik masuk
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{meta: object, kolom: Array, baris: Array}>}
 */
async function buildTabel41(db, dokumenId) {
  const dok = await db.RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: db.PerangkatDaerah, as: 'perangkatDaerah', required: false },
      { model: db.PeriodeRpjmd, as: 'periode', required: false },
      { model: db.RenstraPdDokumen, as: 'renstraPdDokumen', required: false },
    ],
  });
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  const tahun = Number(dok.tahun);
  const namaOpd = dok.perangkatDaerah?.nama || 'Perangkat Daerah';
  const tahunAwal = dok.periode?.tahun_awal || tahun;
  const tahunAkhir = dok.periode?.tahun_akhir || tahun + 4;
  const renstraId = dok.renstraPdDokumen?.renstra_opd_id || null;

  const items = await db.RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [
      ['kode_sub_kegiatan', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  const kodeSubList = [...new Set(items.map((i) => i.kode_sub_kegiatan).filter(Boolean))];
  // Item tanpa kode_program dipetakan ke KODE_TANPA_PROGRAM, BUKAN dibuang —
  // lihat catatan pada definisi KODE_TANPA_PROGRAM di atas.
  const kodeBidangList = [
    ...new Set(
      items.map((i) => (i.kode_program ? i.kode_program.slice(0, 4) : KODE_TANPA_PROGRAM)),
    ),
  ];

  // Semantik tahun mengikuti dokumen acuan (Renja 2027: realisasi 2025,
  // prakiraan 2026). Saat Renja disusun, tahun-1 masih BERJALAN sehingga baru
  // berupa prakiraan; tahun terakhir yang realisasinya lengkap adalah tahun-2.
  const tahunRealisasi = tahun - 2;
  const tahunBerjalan = tahun - 1;

  const [
    namaBidang,
    indikatorRenstra,
    prioritas,
    prakiraan,
    realisasiLalu,
    indikatorPerItem,
    masterSub,
  ] = await Promise.all([
    muatNamaBidangUrusan(db, kodeBidangList),
    muatIndikatorRenstra(db, renstraId),
    muatPrioritas(db, kodeSubList),
    muatPrakiraanTahunBerjalan(db, dok),
    muatRealisasiTahunLalu(db, tahunRealisasi),
    muatIndikatorItem(db, items),
    muatMasterSubKegiatan(db, kodeSubList),
  ]);

  const pohon = susunPohon(items);
  const totalPagu = [...pohon.values()].reduce((s, p) => s + p.pagu, 0);
  const baris = [];

  // Tingkat 0 — total perangkat daerah.
  baris.push(barisKosong({ uraian: namaOpd, pagu: totalPagu, level: 0, jenis: 'opd' }));

  // Tingkat 1 & 2 — urusan dan bidang urusan, diurutkan menurut kode.
  const bidangTerurut = [...new Set(kodeBidangList)].sort();
  const urusanTerurut = [...new Set(bidangTerurut.map((b) => b.slice(0, 1)))].sort();

  let nomorProgram = 0;

  for (const kodeUrusan of urusanTerurut) {
    const bidangMilikUrusan = bidangTerurut.filter((b) => b.startsWith(`${kodeUrusan}.`));
    const paguUrusan = [...pohon.values()]
      .filter((p) => p.kode.startsWith(`${kodeUrusan}.`))
      .reduce((s, p) => s + p.pagu, 0);

    baris.push(
      barisKosong({
        kode: kodeUrusan,
        uraian: NAMA_URUSAN[kodeUrusan] || 'URUSAN PEMERINTAHAN',
        pagu: paguUrusan,
        level: 1,
        jenis: 'urusan',
      }),
    );

    for (const kodeBidang of bidangMilikUrusan) {
      const programMilikBidang = [...pohon.values()]
        .filter((p) => p.kode.startsWith(kodeBidang))
        .sort((a, b) => a.kode.localeCompare(b.kode));
      const paguBidang = programMilikBidang.reduce((s, p) => s + p.pagu, 0);

      baris.push(
        barisKosong({
          kode: kodeBidang,
          uraian:
            kodeBidang === KODE_TANPA_PROGRAM
              ? NAMA_URUSAN['?']
              : namaBidang[kodeBidang] || `URUSAN PEMERINTAHAN BIDANG (${kodeBidang})`,
          pagu: paguBidang,
          level: 2,
          jenis: 'bidang_urusan',
        }),
      );

      for (const prog of programMilikBidang) {
        nomorProgram += 1;
        baris.push(
          barisKosong({
            no: `${nomorProgram}.`,
            kode: prog.kode,
            uraian: prog.nama,
            pagu: prog.pagu,
            level: 3,
            jenis: 'program',
          }),
        );

        // Outcome program beserta indikatornya (dari Renstra tingkat program).
        for (const ir of indikatorRenstra.program[prog.kode] || []) {
          baris.push(
            barisKosong({
              uraian: ir.nama_indikator,
              pagu: prog.pagu,
              level: 4,
              jenis: 'outcome_program',
            }),
          );
          baris.push(
            barisKosong({
              indikator: ir.nama_indikator,
              target_akhir_renstra: teksTarget(
                pilihTargetTahun(ir, tahunAkhir, tahunAwal),
                ir.satuan,
              ),
              target: teksTarget(pilihTargetTahun(ir, tahun, tahunAwal), ir.satuan),
              prakiraan_berjalan: teksTarget(
                pilihTargetTahun(ir, tahunBerjalan, tahunAwal),
                ir.satuan,
              ),
              pagu: prog.pagu,
              level: 5,
              jenis: 'indikator_program',
            }),
          );
        }

        const kegiatanTerurut = [...prog.kegiatan.values()].sort((a, b) =>
          a.kode.localeCompare(b.kode),
        );

        for (const keg of kegiatanTerurut) {
          baris.push(
            barisKosong({
              kode: keg.kode,
              uraian: keg.nama,
              pagu: keg.pagu,
              level: 4,
              jenis: 'kegiatan',
            }),
          );

          for (const ir of indikatorRenstra.kegiatan[keg.kode] || []) {
            baris.push(
              barisKosong({
                uraian: ir.nama_indikator,
                pagu: keg.pagu,
                level: 5,
                jenis: 'outcome_kegiatan',
              }),
            );
          }

          // Ringkasan indikator output seluruh subkegiatan di bawah kegiatan ini
          // — meniru dokumen acuan yang mendaftarnya sebelum rincian subkegiatan.
          for (const sub of keg.subkegiatan) {
            const ind = indikatorPerItem[sub.id] || {};
            const ms = masterSub[sub.kode_sub_kegiatan] || {};
            baris.push(
              barisKosong({
                indikator: sub.indikator || ind.nama_indikator || ms.indikator || null,
                target_akhir_renstra: ind.target_akhir || null,
                prakiraan_berjalan: prakiraan[sub.kode_sub_kegiatan]?.target || null,
                target: teksTarget(sub.target_numerik ?? sub.target, sub.satuan) || sub.target_teks,
                pagu: angka(sub.pagu_indikatif ?? sub.pagu),
                target_maju: sub.target_prakiraan_maju || null,
                pagu_maju: sub.pagu_prakiraan_maju ? angka(sub.pagu_prakiraan_maju) : null,
                level: 5,
                jenis: 'indikator_kegiatan',
              }),
            );
          }

          for (const sub of keg.subkegiatan) {
            const kodeSub = sub.kode_sub_kegiatan;
            const pri = prioritas[kodeSub] || {};
            const ind = indikatorPerItem[sub.id] || {};
            const ms = masterSub[kodeSub] || {};
            const paguSub = angka(sub.pagu_indikatif ?? sub.pagu);

            baris.push(
              barisKosong({
                kode: kodeSub,
                uraian: tanpaKode(sub.sub_kegiatan),
                pagu: paguSub,
                level: 5,
                jenis: 'subkegiatan',
              }),
            );

            baris.push(
              barisKosong({
                // Rumusan keluaran ("Tersedianya ...") berasal dari master
                // Kepmendagri 900; definisi_operasional Renstra dipakai bila
                // master belum memuatnya.
                uraian: ms.kinerja || ind.kinerja || null,
                indikator: sub.indikator || ind.nama_indikator || ms.indikator || null,
                target_akhir_renstra: ind.target_akhir || null,
                realisasi_lalu: realisasiLalu[kunciNama(sub.sub_kegiatan)] ?? null,
                prakiraan_berjalan: prakiraan[kodeSub]?.target || null,
                target: teksTarget(sub.target_numerik ?? sub.target, sub.satuan) || sub.target_teks,
                pagu: paguSub,
                lokasi: sub.lokasi || null,
                sumber_dana: sub.sumber_dana || null,
                // Dihitung dari Tabel C, bukan dibaca dari kolom tersimpan.
                prioritas_nasional: pri.pro_sn || pri.asta_cita || null,
                prioritas_daerah: pri.tematik || null,
                kelompok_sasaran: sub.kelompok_sasaran || null,
                target_maju: sub.target_prakiraan_maju || null,
                pagu_maju: sub.pagu_prakiraan_maju ? angka(sub.pagu_prakiraan_maju) : null,
                pd_penanggung_jawab: sub.pd_penanggung_jawab || namaOpd,
                level: 6,
                jenis: 'output_subkegiatan',
              }),
            );
          }
        }
      }
    }
  }

  const jumlahProgram = pohon.size;
  const jumlahKegiatan = [...pohon.values()].reduce((s, p) => s + p.kegiatan.size, 0);
  const jumlahSubkegiatan = items.length;
  const mendukungPrioritas = kodeSubList.filter((k) => prioritas[k]).length;

  return {
    meta: {
      dokumen_id: dok.id,
      nama_opd: namaOpd,
      tahun,
      tahun_realisasi: tahunRealisasi,
      tahun_berjalan: tahunBerjalan,
      tahun_maju: tahun + 1,
      tahun_awal_renstra: tahunAwal,
      tahun_akhir_renstra: tahunAkhir,
      total_pagu: totalPagu,
      jumlah_program: jumlahProgram,
      jumlah_kegiatan: jumlahKegiatan,
      jumlah_subkegiatan: jumlahSubkegiatan,
      mendukung_prioritas_nasional: mendukungPrioritas,
      judul: `Rencana Program dan Kegiatan Prioritas Daerah Tahun ${tahun} ${namaOpd}`,
    },
    kolom: KOLOM,
    baris: baris.map((b, i) => ({ ...b, urutan_baris: i + 1 })),
  };
}

/**
 * Indikator Renstra untuk tiap baris Renja, lewat `source_indikator_renstra_id`
 * yang jauh lebih lengkap terisi daripada source_renstra_subkegiatan_id.
 */
async function muatIndikatorItem(db, items) {
  const ids = [...new Set(items.map((i) => i.source_indikator_renstra_id).filter(Boolean))];
  if (!ids.length) return {};

  const rows = await db.IndikatorRenstra.findAll({ where: { id: ids } }).catch(() => []);
  const perId = {};
  for (const r of rows) perId[r.id] = r;

  const hasil = {};
  for (const it of items) {
    const ir = perId[it.source_indikator_renstra_id];
    if (!ir) continue;
    hasil[it.id] = {
      nama_indikator: ir.nama_indikator,
      satuan: ir.satuan,
      kinerja: ir.definisi_operasional || null,
      // target_tahun_5 = tahun terakhir periode Renstra.
      target_akhir: teksTarget(ir.target_tahun_5, ir.satuan),
    };
  }
  return hasil;
}

module.exports = { buildTabel41, KOLOM, NAMA_URUSAN };

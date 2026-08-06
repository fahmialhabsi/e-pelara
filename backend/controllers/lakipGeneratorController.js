/**
 * lakipGeneratorController.js
 * Generator dokumen LAKIP/LKj untuk ePeLARA.
 *
 * Endpoint:
 *   GET /api/lakip-generator/data?tahun=2025&periode_id=1
 *   GET /api/lakip-generator/preview?tahun=2025&periode_id=1   → HTML print-ready
 *   GET /api/lakip-generator/export-pdf?tahun=2025&periode_id=1 → PDF (Tahap 2)
 */

const { sequelize } = require('../models');
const { statusCapaianLima, warnaStatusLima, analisaOtomatis, analisaEfisiensi } = require('../services/lakipAnalisaService');
const lakipPkService = require('../services/lakipPkService');
const { buildPkHtml } = require('../services/lakipPkExportService');
const { formatNip } = require('../utils/formatNip');

// ── Nama OPD dinas ──────────────────────────────────────────────────────────
// Field yang tidak punya sumber per-OPD di DB (provinsi selalu sama, tahun
// anggaran = tahun berjalan). nama_opd/kepala_opd DIAMBIL dari renstra_opd
// aktif (lihat renstraAktif di collectLakipData), BUKAN hardcode di sini —
// sebelumnya hardcode 'Dinas Ketahanan Pangan' berbeda dari master data
// (Fase 13 FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 1, diperbaiki Fase 14).
const OPD_CONFIG_DEFAULT = {
  nama_provinsi: 'Maluku Utara',
  tahun_anggaran: new Date().getFullYear(),
};

// ── Ambil semua data sumber LAKIP ─────────────────────────────────────────────
async function collectLakipData(tahun, periode_id) {
  // 1. Identitas periode RPJMD
  const [[periode]] = await sequelize.query(
    `SELECT id, nama, tahun_awal, tahun_akhir FROM periode_rpjmds WHERE id = :id LIMIT 1`,
    { replacements: { id: periode_id || 1 } },
  );

  // 1b. OPD aktif (Renstra) — Indikator Kinerja hanya diambil untuk OPD ini,
  // jangan lintas OPD (tabel legacy `indikator` tidak punya kolom penghubung OPD).
  const [[renstraAktif]] = await sequelize.query(
    `SELECT id, tahun_mulai, nama_opd FROM renstra_opd WHERE is_aktif = 1 LIMIT 1`,
  );

  const namaOpdAktif = renstraAktif?.nama_opd || 'OPD';
  const opdConfig = {
    ...OPD_CONFIG_DEFAULT,
    nama_opd: namaOpdAktif,
    kepala_opd: `Kepala ${namaOpdAktif}`,
    nip_kepala: 'NIP. —',
  };

  // 1c. Data Perjanjian Kinerja (Fase 3, Lampiran 1) — reuse lakipPkService.getPkDetail()
  // apa adanya (sama persis dgn yang dipakai export PK mandiri), sudah punya fallback
  // DEFAULT_PASAL kalau LakipPk belum diisi untuk tahun ini (lihat lakipPkService.js).
  // .catch(null) murni jaga-jaga error DB tak terduga — bukan mengganti behaviour
  // getPkDetail sendiri — supaya generate LAKIP tidak ikut gagal total gara-gara
  // Lampiran PK, cukup Lampiran 1 tampil placeholder "belum tersedia".
  const pkDetail =
    renstraAktif && tahun
      ? await lakipPkService.getPkDetail(renstraAktif.id, tahun).catch(() => null)
      : null;

  // 2. Visi
  const [[visi]] = await sequelize.query(
    `SELECT v.isi_visi FROM visi v
     LEFT JOIN periode_rpjmds p ON v.rpjmd_id = p.id
     LIMIT 1`,
  );

  // 3. Misi — FIX AKAR MASALAH (Fase 16, FASE16-FIX-AKAR-MASALAH-JENIS-DOKUMEN.md):
  // baris "duplikat" yang ditemukan Fase 13/14 TERNYATA BUKAN data kotor,
  // melainkan 4 salinan sah `misi` per `jenis_dokumen` (rpjmd/rkpd/rka/renja) —
  // arsitektur clone-on-read yang disengaja (lihat utils/autoCloneMisiIfNeeded.js
  // & FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md). Query lama menarik SEMUA
  // jenis_dokumen tercampur, itulah akar masalah sebenarnya — bukan data
  // duplikat yang perlu dedup. LAKIP adalah laporan akuntabilitas yang harus
  // merujuk Visi-Misi RESMI daerah (RPJMD), bukan salinan kerja modul lain,
  // jadi difilter eksplisit ke jenis_dokumen='rpjmd' (dikonfirmasi: 6 baris
  // bersih, 1 per no_misi, tanpa duplikat internal). `tahun` juga ikut
  // difilter (kalau parameter tahun diisi) untuk jaga-jaga kalau kelak ada
  // >1 periode RPJMD tersimpan sekaligus (saat ini baru 1: tahun 2025).
  //
  // GROUP BY no_misi,isi_misi DIPERTAHANKAN sebagai lapis pertahanan
  // tambahan (bukan lagi solusi utama — sudah tidak berpengaruh ke hasil
  // query untuk data saat ini karena filter jenis_dokumen di atas sendirian
  // sudah cukup, tapi tetap murah & tidak mengganggu kalau suatu saat baris
  // rpjmd itu sendiri kemasukan duplikat karena sebab lain).
  const [misiList] = await sequelize.query(
    `SELECT MIN(id) AS id, no_misi, isi_misi FROM misi
     WHERE jenis_dokumen = 'rpjmd'${tahun ? ' AND tahun = :tahun' : ''}
     GROUP BY no_misi, isi_misi ORDER BY no_misi ASC`,
    tahun ? { replacements: { tahun } } : undefined,
  );

  // 4. Tujuan (Renstra OPD aktif)
  const [tujuanList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, misi_id, no_tujuan, isi_tujuan FROM renstra_tujuan
         WHERE renstra_id = :renstraId ORDER BY id ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 5. Sasaran (Renstra OPD aktif)
  const [sasaranList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, tujuan_id, nomor, isi_sasaran FROM renstra_sasaran
         WHERE renstra_id = :renstraId ORDER BY nomor ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 5b. Strategi/Kebijakan/Program/Kegiatan (Renstra OPD aktif) — dipakai untuk
  // merunut indikator ke rantai Tujuan->Sasaran->Program->Kegiatan, karena Program
  // terhubung ke Sasaran lewat kebijakan_id->strategi_id->sasaran_id (tidak langsung).
  const [strategiList, kebijakanList, programList, kegiatanList] = renstraAktif
    ? await Promise.all([
        sequelize
          .query(`SELECT id, sasaran_id FROM renstra_strategi WHERE renstra_id = :renstraId`, {
            replacements: { renstraId: renstraAktif.id },
          })
          .then(([r]) => r),
        sequelize
          .query(`SELECT id, strategi_id FROM renstra_kebijakan WHERE renstra_id = :renstraId`, {
            replacements: { renstraId: renstraAktif.id },
          })
          .then(([r]) => r),
        sequelize
          .query(
            `SELECT id, kebijakan_id, nama_program FROM renstra_program WHERE renstra_id = :renstraId`,
            { replacements: { renstraId: renstraAktif.id } },
          )
          .then(([r]) => r),
        sequelize
          .query(
            `SELECT id, program_id, nama_kegiatan FROM renstra_kegiatan WHERE renstra_id = :renstraId`,
            { replacements: { renstraId: renstraAktif.id } },
          )
          .then(([r]) => r),
      ])
    : [[], [], [], []];

  const strategiById = new Map(strategiList.map((s) => [s.id, s]));
  const kebijakanById = new Map(kebijakanList.map((k) => [k.id, k]));
  const programById = new Map(programList.map((p) => [p.id, p]));
  const kegiatanById = new Map(kegiatanList.map((k) => [k.id, k]));
  const sasaranById = new Map(sasaranList.map((s) => [s.id, s]));

  function resolveSasaranIdFromProgram(programId) {
    const program = programById.get(programId);
    const kebijakan = program ? kebijakanById.get(program.kebijakan_id) : null;
    const strategi = kebijakan ? strategiById.get(kebijakan.strategi_id) : null;
    return strategi?.sasaran_id || null;
  }

  function resolveAncestry(stage, refId) {
    let sasaranId = null;
    let programId = null;
    let kegiatanId = null;

    if (stage === 'sasaran') {
      sasaranId = refId;
    } else if (stage === 'program') {
      programId = refId;
      sasaranId = resolveSasaranIdFromProgram(programId);
    } else if (stage === 'kegiatan') {
      kegiatanId = refId;
      programId = kegiatanById.get(kegiatanId)?.program_id || null;
      sasaranId = resolveSasaranIdFromProgram(programId);
    }

    const tujuanId = sasaranId ? sasaranById.get(sasaranId)?.tujuan_id || null : null;
    return { tujuanId, sasaranId, programId, kegiatanId };
  }

  // 6. Indikator Kinerja Renstra OPD aktif (sasaran/program/kegiatan)
  const [indikatorList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, ref_id, stage, nama_indikator, satuan, jenis_indikator, kode_indikator,
                penanggung_jawab,
                target_tahun_1, target_tahun_2, target_tahun_3,
                target_tahun_4, target_tahun_5, target_tahun_6
         FROM indikator_renstra
         WHERE stage IN ('sasaran','program','kegiatan') AND renstra_id = :renstraId
         ORDER BY id ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 6b. IKU & IKK — indikator level OPD yang berdiri sendiri (ref_id = renstra_id),
  // tidak masuk hierarki Tujuan->Sasaran->Program->Kegiatan di atas, ditampilkan
  // sebagai section terpisah (lihat indikatorIkuHtml/indikatorIkkHtml di buildHtml).
  const [indikatorIkuIkkList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, ref_id, stage, nama_indikator, satuan, jenis_indikator, kode_indikator,
                penanggung_jawab,
                target_tahun_1, target_tahun_2, target_tahun_3,
                target_tahun_4, target_tahun_5, target_tahun_6
         FROM indikator_renstra
         WHERE stage IN ('iku','ikk') AND renstra_id = :renstraId
         ORDER BY id ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 7. Realisasi tahun berjalan DAN tahun sebelumnya per indikator (dari
  // Renstra OPD aktif) — tahun sebelumnya & keterangan dipakai kolom Analisa
  // (lihat lakipAnalisaService.js) utk mendeteksi tren nyata, bukan template.
  const indikatorIds = [...indikatorList, ...indikatorIkuIkkList].map((i) => i.id);
  const tahunSebelumnya = tahun ? String(Number(tahun) - 1) : null;
  let realisasiMap = {};
  let realisasiLaluMap = {};
  if (indikatorIds.length > 0 && tahun) {
    const [realisasiRows] = await sequelize.query(
      `SELECT indikator_renstra_id, tahun, nilai_realisasi, keterangan
       FROM realisasi_indikator_renstra
       WHERE indikator_renstra_id IN (:ids) AND tahun IN (:tahunList)`,
      { replacements: { ids: indikatorIds, tahunList: [tahun, tahunSebelumnya] } },
    );
    for (const r of realisasiRows) {
      if (String(r.tahun) === String(tahun)) realisasiMap[r.indikator_renstra_id] = r;
      else if (String(r.tahun) === String(tahunSebelumnya)) realisasiLaluMap[r.indikator_renstra_id] = r;
    }
  }

  // 8. Data lakip entries (program/kegiatan dengan target-realisasi langsung)
  const [lakipEntries] = await sequelize.query(
    `SELECT id, tahun, program, kegiatan, indikator_kinerja, target, realisasi,
            evaluasi, rekomendasi, jenis_dokumen, approval_status
     FROM lakip
     ${tahun ? 'WHERE tahun = :tahun' : ''}
     ORDER BY tahun DESC, program ASC`,
    tahun ? { replacements: { tahun } } : undefined,
  );

  // 9. Agregasi anggaran — pagu dari DPA, realisasi dari Penatausahaan (OCR SIPD),
  // konsisten dengan sumber yang dipakai renstraRealisasiAnggaranSyncService.js.
  // KNOWN ISSUE (Fase 4, Agustus 2026 — FASE4-INVESTIGASI-DATA-ANGGARAN.md): sengaja
  // TIDAK baca `lakip.pagu_anggaran`/`realisasi_anggaran` (hasil sync
  // lakipRealisasiAnggaranSyncService.js) — kolom itu saat ini selalu Rp 0 (tabel
  // renstra_tabel_subkegiatan yang jadi sumbernya kosong), agregasi langsung di bawah
  // ini terbukti akurat & sudah diverifikasi menyeluruh (Fase 1-3).
  const dpaWhere = tahun ? 'd.tahun = :tahun AND' : '';
  const [anggaranRows] = await sequelize.query(
    `SELECT
       (SELECT SUM(d.anggaran) FROM dpa d WHERE ${dpaWhere} d.is_active_version = 1) as total_pagu,
       (SELECT SUM(p.jumlah) FROM penatausahaan p
          INNER JOIN dpa d ON d.id = p.dpa_id
          WHERE ${dpaWhere} d.is_active_version = 1) as total_realisasi`,
    tahun ? { replacements: { tahun } } : undefined,
  );
  const anggaranPagu = parseFloat(anggaranRows[0]?.total_pagu) || 0;
  const anggaranRealisasi = parseFloat(anggaranRows[0]?.total_realisasi) || 0;
  const anggaranPct = anggaranPagu > 0 ? Math.round((anggaranRealisasi / anggaranPagu) * 100) : null;

  // 9c. Anggaran per Kegiatan (pagu DPA + realisasi Penatausahaan, dikelompokkan per
  // teks `dpa.kegiatan`) — dipakai untuk Analisis Efisiensi Bab III bagian D. Subquery
  // pre-agregat realisasi per dpa_id dulu SEBELUM join, supaya SUM(d.anggaran) di luar
  // tidak fan-out kalau satu baris DPA punya banyak baris Penatausahaan.
  const [anggaranPerKegiatanRows] = tahun
    ? await sequelize.query(
        `SELECT d.kegiatan,
                SUM(d.anggaran) AS pagu,
                SUM(COALESCE(realPerDpa.total_realisasi, 0)) AS realisasi
         FROM dpa d
         LEFT JOIN (
           SELECT dpa_id, SUM(jumlah) AS total_realisasi
           FROM penatausahaan
           GROUP BY dpa_id
         ) realPerDpa ON realPerDpa.dpa_id = d.id
         WHERE d.tahun = :tahun AND d.is_active_version = 1
         GROUP BY d.kegiatan`,
        { replacements: { tahun } },
      )
    : [[]];
  // Nama Kegiatan di Renstra vs di DPA kadang beda spasi/kapitalisasi meski maksudnya
  // sama (mis. "Lainnya  sesuai" vs "Lainnya sesuai") — normalisasi supaya tidak
  // salah dianggap "tidak ditemukan" (pagu 0) padahal datanya sebenarnya ada.
  const normalizeKegiatanKey = (s) =>
    String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const anggaranPerKegiatanMap = new Map(
    anggaranPerKegiatanRows.map((r) => [normalizeKegiatanKey(r.kegiatan), r]),
  );

  // 9b. Latar Belakang, Tusi (Tugas/Fungsi/Struktur Organisasi), Sumber Daya (SDM), &
  // Isu Strategis dari modul Renstra (BAB I, II & III). Keputusan Fase 2 Poin 2 Opsi A:
  // butir 2.1 dipakai untuk "D. Tugas dan Fungsi serta Struktur Organisasi" (BUKAN lagi
  // "Gambaran Umum Organisasi" — judulnya lama menyesatkan, isinya memang Tusi/struktur),
  // butir 2.2 dipakai untuk "E. Gambaran Umum Organisasi" yang sebenarnya (profil SDM).
  const [renstraBabRows] = renstraAktif
    ? await sequelize.query(
        `SELECT bab, judul_bab, isi FROM renstra_bab WHERE tahun = :tahunRenstra AND bab IN ('I','II','III')`,
        { replacements: { tahunRenstra: renstraAktif.tahun_mulai } },
      )
    : [[]];
  let latarBelakangItem = null;
  let tusiItem = null;
  let sumberDayaItem = null;
  let isuStrategisItem = null;
  for (const row of renstraBabRows) {
    let items = [];
    try {
      items = JSON.parse(row.isi);
    } catch (e) {
      items = [];
    }
    if (row.bab === 'I') {
      latarBelakangItem = items[0] || null;
    } else if (row.bab === 'II') {
      tusiItem = items.find((it) => String(it.judul || '').startsWith('2.1')) || items[0] || null;
      // Tidak pakai fallback items[1] kalau butir 2.2 tidak ditemukan — OPD lain / tahun
      // Renstra lain mungkin tidak punya butir ini persis, mending null (placeholder
      // eksplisit "belum tersedia" di buildHtml) daripada diam-diam menampilkan butir
      // yang salah.
      sumberDayaItem = items.find((it) => String(it.judul || '').startsWith('2.2')) || null;
    } else if (row.bab === 'III') {
      isuStrategisItem =
        items.find((it) => String(it.judul || '').startsWith('3.5')) ||
        items[items.length - 1] ||
        null;
    }
  }

  // 10. Flatten indikator + resolusi ancestry, lalu susun jadi nested tree
  // Tujuan -> Sasaran -> Program -> Kegiatan supaya jelas indikator itu milik siapa.
  const buildIndikatorRow = (ind, ancestry = {}) => {
    const offset =
      renstraAktif && tahun
        ? Math.min(Math.max(Number(tahun) - Number(renstraAktif.tahun_mulai) + 1, 1), 6)
        : 1;
    const target = parseFloat(ind[`target_tahun_${offset}`]) || 0;
    const real = realisasiMap[ind.id];
    const realisasi = real ? parseFloat(real.nilai_realisasi) : 0;
    const pct = target > 0 ? Math.round((realisasi / target) * 100) : 0;
    const statusCapaian =
      pct >= 100 ? 'Tercapai' : pct >= 75 ? 'Hampir Tercapai' : 'Belum Tercapai';
    const realLalu = realisasiLaluMap[ind.id];
    const status5 = statusCapaianLima(pct);
    return {
      id: ind.id,
      stage: ind.stage,
      nama_indikator: ind.nama_indikator,
      satuan: ind.satuan,
      kode_indikator: ind.kode_indikator,
      penanggung_jawab: ind.penanggung_jawab,
      target,
      realisasi,
      pct_capaian: pct,
      status_capaian: statusCapaian,
      narasi: generateNarasi(ind.nama_indikator, target, realisasi, pct, ind.satuan),
      // Kolom Analisa (5 tingkat status) — lihat lakipAnalisaService.js.
      status_capaian_5: status5,
      warna_status_5: warnaStatusLima(status5),
      analisa: analisaOtomatis({
        nama: ind.nama_indikator,
        satuan: ind.satuan,
        target,
        realisasi,
        pct,
        status: status5,
        keteranganTahunIni: real?.keterangan,
        realisasiTahunLalu: realLalu ? parseFloat(realLalu.nilai_realisasi) : null,
        tahunLalu: tahunSebelumnya,
        anggaranPct,
        namaOpd: opdConfig.nama_opd,
      }),
      ...ancestry,
    };
  };

  const indikatorFlat = indikatorList.map((ind) =>
    buildIndikatorRow(ind, resolveAncestry(ind.stage, ind.ref_id)),
  );

  // IKU & IKK: indikator level OPD standalone, tidak punya ancestry hierarki.
  const ikuIkkFlat = indikatorIkuIkkList.map((ind) => buildIndikatorRow(ind));
  const iku = ikuIkkFlat.filter((i) => i.stage === 'iku');
  const ikk = ikuIkkFlat.filter((i) => i.stage === 'ikk');

  const placedIndikatorIds = new Set();
  const indikatorTree = tujuanList.map((t) => {
    const sasaranAnak = sasaranList.filter((s) => s.tujuan_id === t.id);
    return {
      id: t.id,
      no_tujuan: t.no_tujuan,
      isi_tujuan: t.isi_tujuan,
      sasaran: sasaranAnak.map((s) => {
        const indikatorSasaran = indikatorFlat.filter(
          (i) => i.stage === 'sasaran' && i.sasaranId === s.id,
        );
        indikatorSasaran.forEach((i) => placedIndikatorIds.add(i.id));

        const programAnak = programList.filter((p) => resolveSasaranIdFromProgram(p.id) === s.id);

        return {
          id: s.id,
          nomor: s.nomor,
          isi_sasaran: s.isi_sasaran,
          indikator: indikatorSasaran,
          program: programAnak.map((p) => {
            const indikatorProgram = indikatorFlat.filter(
              (i) => i.stage === 'program' && i.programId === p.id,
            );
            indikatorProgram.forEach((i) => placedIndikatorIds.add(i.id));

            const kegiatanAnak = kegiatanList.filter((k) => k.program_id === p.id);

            return {
              id: p.id,
              nama_program: p.nama_program,
              indikator: indikatorProgram,
              kegiatan: kegiatanAnak.map((k) => {
                const indikatorKegiatan = indikatorFlat.filter(
                  (i) => i.stage === 'kegiatan' && i.kegiatanId === k.id,
                );
                indikatorKegiatan.forEach((i) => placedIndikatorIds.add(i.id));
                return {
                  id: k.id,
                  nama_kegiatan: k.nama_kegiatan,
                  indikator: indikatorKegiatan,
                };
              }),
            };
          }),
        };
      }),
    };
  });

  // Indikator yang rantai ancestry-nya tidak lengkap (mis. program belum
  // tersambung kebijakan/strategi) — jangan hilang diam-diam, tampilkan terpisah.
  const indikatorOrphan = indikatorFlat.filter((i) => !placedIndikatorIds.has(i.id));

  // 11. Analisis Efisiensi (Bab III bagian D) — grain per Kegiatan (bukan Program),
  // karena anggaran (DPA/Penatausahaan) tertaut ke teks `dpa.kegiatan`, bukan ke
  // Program. % Capaian Kinerja = rata-rata pct_capaian indikator milik Kegiatan itu
  // sendiri (kosong kalau Kegiatan tidak punya indikator langsung — lihat
  // analisaEfisiensi() utk bagaimana kekosongan itu ditangani, bukan NaN/crash).
  const efisiensiInput = [];
  indikatorTree.forEach((t) => {
    t.sasaran.forEach((s) => {
      s.program.forEach((p) => {
        p.kegiatan.forEach((k) => {
          const pctKinerja =
            k.indikator.length > 0
              ? Math.round(
                  k.indikator.reduce((sum, i) => sum + i.pct_capaian, 0) / k.indikator.length,
                )
              : null;
          const anggaranRow = anggaranPerKegiatanMap.get(normalizeKegiatanKey(k.nama_kegiatan));
          efisiensiInput.push({
            nama_program: p.nama_program,
            nama_kegiatan: k.nama_kegiatan,
            pct_capaian_kinerja: pctKinerja,
            pagu: anggaranRow?.pagu || 0,
            realisasi: anggaranRow?.realisasi || 0,
          });
        });
      });
    });
  });
  const efisiensi = analisaEfisiensi(efisiensiInput);

  return {
    meta: {
      opd: opdConfig,
      tahun: tahun || String(new Date().getFullYear()),
      periode,
      generated_at: new Date().toISOString(),
    },
    visi: visi?.isi_visi || `Visi ${namaOpdAktif} ${opdConfig.nama_provinsi}`,
    misi: misiList,
    tujuan: tujuanList,
    sasaran: sasaranList,
    indikator: indikatorFlat,
    indikatorTree,
    indikatorOrphan,
    iku,
    ikk,
    lakipEntries,
    latarBelakangItem,
    tusiItem,
    sumberDayaItem,
    isuStrategisItem,
    efisiensi,
    pkDetail,
    anggaran: {
      total_pagu: anggaranPagu,
      total_realisasi: anggaranRealisasi,
      pct: anggaranPct ?? 0,
    },
  };
}

// ── Auto-generate narasi analisis capaian ──────────────────────────────────
function generateNarasi(namaIndikator, target, realisasi, pct, satuan) {
  const sat = satuan || '';
  if (pct === 0 && realisasi === 0 && target === 0) {
    return `Indikator "${namaIndikator}" belum memiliki data target dan realisasi. Pengisian data realisasi diperlukan untuk evaluasi kinerja.`;
  }
  if (pct >= 100) {
    return `Indikator "${namaIndikator}" berhasil mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Kinerja dinyatakan sangat baik dan sesuai perencanaan.`;
  }
  if (pct >= 75) {
    const selisih = (target - realisasi).toFixed(2);
    return `Indikator "${namaIndikator}" hampir mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Terdapat kekurangan sebesar ${selisih} ${sat}. Diperlukan upaya lebih intensif pada periode berikutnya.`;
  }
  return `Indikator "${namaIndikator}" belum mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Perlu evaluasi mendalam terhadap faktor penghambat dan penyesuaian strategi pelaksanaan.`;
}

// ── Rupiah formatter ──────────────────────────────────────────────────────
function formatRp(n) {
  if (!n || isNaN(n)) return 'Rp 0';
  return 'Rp ' + parseFloat(n).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

// ── Daftar Isi — daftar section level-Bab (Fase 19) ────────────────────────
// Dipakai untuk 2 hal: (1) render tabel Daftar Isi, (2) marker split N-way di
// lakipExportController.js (exportPdfFinal) — key & urutan array ini HARUS
// sinkron dengan urutan marker komentar HTML di buildHtml() (COVER tidak
// termasuk, ditangani terpisah sejak Fase 17). Kalau nambah/hapus Bab, array
// ini WAJIB diupdate bersamaan — safeguard di lakipExportController.js akan
// menolak generate "final" (BUKAN diam-diam salah nomor) kalau ada drift
// antara jumlah section di sini vs baris level-Bab di tabel Daftar Isi aktual.
// Lihat FASE19-NOMOR-HALAMAN-TOC.md.
const TOC_SECTIONS = (tahun) => [
  { key: 'kata_pengantar', label: 'Kata Pengantar' },
  { key: 'daftar_isi', label: 'Daftar Isi' },
  { key: 'ringkasan_eksekutif', label: 'Ringkasan Eksekutif' },
  {
    key: 'bab1',
    label: 'BAB I &nbsp; PENDAHULUAN',
    bold: true,
    subItems: [
      'A. Latar Belakang',
      'B. Dasar Hukum',
      'C. Maksud dan Tujuan',
      'D. Tugas dan Fungsi serta Struktur Organisasi',
      'E. Gambaran Umum Organisasi',
      'F. Isu Strategis',
    ],
  },
  {
    key: 'bab2',
    label: 'BAB II &nbsp; PERENCANAAN KINERJA',
    bold: true,
    subItems: ['A. Rencana Strategis', `B. Perjanjian Kinerja Tahun ${tahun}`],
  },
  {
    key: 'bab3',
    label: 'BAB III &nbsp; AKUNTABILITAS KINERJA',
    bold: true,
    subItems: [
      'A. Capaian Kinerja Organisasi',
      'B. Rincian Realisasi Program dan Kegiatan',
      'C. Realisasi Anggaran',
      'D. Analisis Efisiensi',
    ],
  },
  { key: 'bab4', label: 'BAB IV &nbsp; PENUTUP', bold: true },
  { key: 'pernyataan_reviu', label: 'PERNYATAAN TELAH DIREVIU', bold: true },
  { key: 'lampiran1', label: 'LAMPIRAN 1 &nbsp; PERJANJIAN KINERJA', bold: true },
  { key: 'lampiran2', label: 'LAMPIRAN 2 &nbsp; PENGUKURAN KINERJA', bold: true },
];

// ── HTML Template Generator ───────────────────────────────────────────────
// `options.pageNumbers` — { [tocSectionKey]: nomorHalamanAwal } — kalau diisi
// (dipakai HANYA oleh pipeline "export final" Fase 19 di lakipExportController.js
// setelah pass render-hitung-halaman), Daftar Isi menampilkan kolom Halaman
// dan disclaimer "tidak dicantumkan" dihapus. Default (tidak diisi, dipakai
// /preview & /export/pdf biasa) — perilaku SAMA seperti sebelum Fase 19,
// Daftar Isi tanpa nomor + disclaimer seperti biasa.
function buildHtml(data, options = {}) {
  const { pageNumbers = null } = options;
  const {
    meta,
    visi,
    misi,
    tujuan,
    sasaran,
    indikator,
    indikatorTree,
    indikatorOrphan,
    iku,
    ikk,
    lakipEntries,
    latarBelakangItem,
    tusiItem,
    sumberDayaItem,
    isuStrategisItem,
    efisiensi,
    pkDetail,
    anggaran,
  } = data;
  const tahun = meta.tahun;
  const opd = meta.opd;

  // Fase 17 Poin 5: tanggal terbit TETAP dihitung (dipakai konsumen lain bila
  // perlu), tapi TIDAK dirender lagi di cover — dokumen resmi lazimnya cover
  // polos tanpa tanggal terbit. Lihat FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md.
  const tanggalTerbit = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Fase 18 Poin 7 — kota tanda tangan & data Kepala Dinas untuk blok TTD
  // Kata Pengantar dan Bab IV (BUKAN blok Inspektur di Pernyataan Telah
  // Direviu — itu placeholder manual by design sejak Fase 3, sengaja tidak
  // disentuh, lihat FASE18-FIX-MARGIN-TANDA-TANGAN.md).
  //
  // "Sofifi" HARDCODE, bukan dari field database manapun — dikonfirmasi di
  // Fase 17 (FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md Poin 7): pejabat_penandatangan
  // tidak punya kolom kota sama sekali, dan "Sofifi" (ibu kota Maluku Utara)
  // di-hardcode identik di 11 generator dokumen resmi lain di aplikasi ini
  // (renstraGenerateController.js, lakipPkExportService.js, dpaController.js,
  // dkk) — bukan data dinamis per-OPD.
  const kotaTtd = 'Sofifi';
  // pkDetail.pihak_kedua sudah di-fetch collectLakipData() via
  // lakipPkService.getPkDetail() utk Lampiran 1 PK (query PejabatPenandatangan
  // role=KEPALA_DINAS) — reuse langsung, TIDAK query baru. Fallback ke
  // opd.kepala_opd/nip_kepala (placeholder generik) kalau PK belum diisi
  // utk tahun tsb (pkDetail bisa null, ada .catch(() => null) di collectLakipData).
  const namaKepalaDinas = pkDetail?.pihak_kedua?.nama || opd.kepala_opd;
  const nipKepalaDinas = pkDetail?.pihak_kedua?.nip || opd.nip_kepala;
  // Fase 20 Poin B — jabatan ditempatkan SEBELUM nama (mis. "Kepala Dinas
  // Pangan,"), menggantikan baris placeholder tanda tangan titik-titik yang
  // dihapus. NIP diformat berkelompok "8-6-1-3" via utils/formatNip.js (baru
  // dibuat Fase 20 — dicek dulu 11 generator dokumen lain, tidak ada yang
  // punya util serupa, jadi ini titik reuse pertama).
  const jabatanKepalaDinas = pkDetail?.pihak_kedua?.jabatan || opd.kepala_opd;
  const nipKepalaDinasFormatted = formatNip(nipKepalaDinas);

  // Fase 19 — daftar section Daftar Isi (lihat definisi TOC_SECTIONS di atas).
  const tocSections = TOC_SECTIONS(escH(tahun));

  // Header warna sesuai status capaian
  const pctColor = (pct) => (pct >= 100 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626');

  // Baris + tabel indikator, dipakai berulang di tiap level (Sasaran/Program/Kegiatan)
  const indikatorRowsHtml = (items) =>
    items.length
      ? items
          .map(
            (ind) => `
          <tr>
            <td>${escH(ind.nama_indikator)}</td>
            <td class="center">${escH(ind.satuan || '-')}</td>
            <td class="center">${ind.target || '-'}</td>
            <td class="center">${ind.realisasi || '-'}</td>
            <td class="center" style="color:${pctColor(ind.pct_capaian)}; font-weight:bold">${ind.pct_capaian}%</td>
            <td class="center"><span class="badge badge-${ind.pct_capaian >= 100 ? 'green' : ind.pct_capaian >= 75 ? 'yellow' : 'red'}">${ind.status_capaian}</span></td>
          </tr>
          <tr class="narasi-row">
            <td colspan="6"><em>Analisis: ${escH(ind.narasi)}</em></td>
          </tr>`,
          )
          .join('')
      : `<tr><td colspan="6" class="center text-muted">Belum ada indikator</td></tr>`;

  // Tabel Perjanjian Kinerja: Sasaran + Indikator level sasaran + Target tahun berjalan
  const perjanjianKinerjaRows = () => {
    let no = 0;
    const rows = [];
    (indikatorTree || []).forEach((t) => {
      t.sasaran.forEach((s) => {
        (s.indikator || []).forEach((ind) => {
          no++;
          rows.push(`
            <tr>
              <td class="center">${no}</td>
              <td>${escH(s.isi_sasaran || '-')}</td>
              <td>${escH(ind.nama_indikator)}</td>
              <td class="center">${escH(ind.satuan || '-')}</td>
              <td class="center">${ind.target || '-'}</td>
            </tr>`);
        });
      });
    });
    return (
      rows.join('') ||
      `<tr><td colspan="5" class="center text-muted">Belum ada data sasaran/indikator level sasaran</td></tr>`
    );
  };

  const indikatorTableHtml = (items) => `
    <table>
      <thead>
        <tr>
          <th style="width:32%">Indikator Kinerja</th>
          <th style="width:10%">Satuan</th>
          <th style="width:12%">Target</th>
          <th style="width:12%">Realisasi</th>
          <th style="width:12%">Capaian</th>
          <th style="width:22%">Status</th>
        </tr>
      </thead>
      <tbody>${indikatorRowsHtml(items)}</tbody>
    </table>`;

  // Fase 15B — suppress tampilan blok Program yang BENAR-BENAR kosong (0
  // indikator & 0 Kegiatan) DAN nama_program-nya sama persis dengan baris
  // lain dalam Sasaran yang sama. FIX TAMPILAN SEMENTARA, BUKAN solusi akar
  // masalah: akar masalahnya adalah renstra_program.kebijakan_id kolom
  // scalar tunggal (1 Program cuma bisa punya 1 induk Kebijakan), sehingga
  // kalau 1 Program sah menopang banyak Kebijakan, satu-satunya cara yang
  // tersedia saat ini adalah bikin baris renstra_program baru ber-nama sama
  // per Kebijakan tambahan (bukan benar-benar "link") — baris tambahan itu
  // selalu 0 indikator/0 Kegiatan karena kegiatan & indikator cuma pernah
  // ditautkan ke SATU dari baris-baris kembar itu. Redesain skema (mis. tabel
  // pivot many-to-many renstra_kebijakan<->renstra_program) masih perlu
  // dikerjakan terpisah — lihat FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 3
  // dan FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md. Data `renstra_program` DI
  // DATABASE TIDAK DIUBAH oleh fungsi ini — murni filter di tahap render.
  //
  // Aturan: kalau ada >1 baris Program dengan nama_program sama dalam 1
  // Sasaran —
  //   - kalau SEMUA baris kosong (0 indikator & 0 Kegiatan): tampilkan cuma
  //     baris pertama (representasi tunggal), bukan N blok kosong berulang.
  //   - kalau ADA baris yang punya indikator dan/atau Kegiatan: tampilkan
  //     SEMUA baris yang punya data apa adanya (hierarki asli tidak
  //     disentuh), cuma baris yang benar-benar kosong yang disembunyikan.
  const suppressProgramKosongDuplikat = (programList) => {
    const grup = new Map();
    (programList || []).forEach((p) => {
      const kunci = p.nama_program || '';
      if (!grup.has(kunci)) grup.set(kunci, []);
      grup.get(kunci).push(p);
    });
    const hasil = [];
    for (const rows of grup.values()) {
      if (rows.length === 1) {
        hasil.push(rows[0]);
        continue;
      }
      const berisi = rows.filter(
        (p) => (p.indikator?.length || 0) > 0 || (p.kegiatan?.length || 0) > 0,
      );
      hasil.push(...(berisi.length > 0 ? berisi : [rows[0]]));
    }
    return hasil;
  };

  // Nested Tujuan -> Sasaran -> Program -> Kegiatan, supaya jelas indikator milik siapa.
  const indikatorHierarkiHtml =
    indikatorTree && indikatorTree.length
      ? indikatorTree
          .map(
            (t) => `
        <div class="tujuan-block">
          <h4 class="hierarchy-title tujuan-title">Tujuan ${escH(t.no_tujuan || '')}: ${escH(t.isi_tujuan || '-')}</h4>
          ${t.sasaran
            .map(
              (s) => `
            <div class="sasaran-block">
              <h5 class="hierarchy-title sasaran-title">Sasaran ${escH(s.nomor || '')}: ${escH(s.isi_sasaran || '-')}</h5>
              ${indikatorTableHtml(s.indikator)}
              ${suppressProgramKosongDuplikat(s.program)
                .map(
                  (p) => `
                <div class="program-block">
                  <h6 class="hierarchy-title program-title">Program: ${escH(p.nama_program || '-')}</h6>
                  ${indikatorTableHtml(p.indikator)}
                  ${p.kegiatan
                    .map(
                      (k) => `
                    <div class="kegiatan-block">
                      <h6 class="hierarchy-title kegiatan-title">Kegiatan: ${escH(k.nama_kegiatan || '-')}</h6>
                      ${indikatorTableHtml(k.indikator)}
                    </div>`,
                    )
                    .join('')}
                </div>`,
                )
                .join('')}
            </div>`,
            )
            .join('')}
        </div>`,
          )
          .join('')
      : `<p class="text-muted">Belum ada data Tujuan/Sasaran/Program/Kegiatan untuk OPD aktif.</p>`;

  const indikatorOrphanHtml =
    indikatorOrphan && indikatorOrphan.length
      ? `<div class="orphan-block">
         <h4 class="hierarchy-title">Indikator Belum Terhubung ke Hierarki Renstra</h4>
         ${indikatorTableHtml(indikatorOrphan)}
       </div>`
      : '';

  // IKU & IKK: indikator level OPD standalone (bukan bagian hierarki Tujuan..Kegiatan).
  const indikatorIkuHtml =
    iku && iku.length
      ? `<div class="tujuan-block">
         <h4 class="hierarchy-title tujuan-title">Indikator Kinerja Utama (IKU)</h4>
         ${indikatorTableHtml(iku)}
       </div>`
      : '';
  const indikatorIkkHtml =
    ikk && ikk.length
      ? `<div class="tujuan-block">
         <h4 class="hierarchy-title tujuan-title">Indikator Kinerja Kunci (IKK)</h4>
         ${indikatorTableHtml(ikk)}
       </div>`
      : '';

  // Baris LAKIP entries (program/kegiatan) — Bab III B "Rincian Realisasi
  // Program dan Kegiatan".
  //
  // KNOWN GAP (Fase 13 FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 4, dicatat
  // Fase 14, BELUM diimplementasikan): kolom `l.evaluasi` di bawah ini murni
  // field manual (`lakip.evaluasi`, diisi lewat form CRUD lakipController.js)
  // — TIDAK ADA logika auto-generate untuk kolom ini, berbeda dari narasi
  // "Analisis: ..." di Bab III A (tabel indikatorTableHtml) yang otomatis
  // lewat analisaOtomatis(). Baris lakipEntries yang dibuat lewat pipeline
  // auto-generate (lakipAutoGenerateService.js/lakipBridgeService.js) tidak
  // pernah mengisi field ini, sehingga tetap kosong sampai operator mengisi
  // manual. 3 opsi jangka panjang (isian manual per-baris, auto-generate versi
  // Program/Kegiatan seperti analisaOtomatis(), atau kombinasi keduanya) sudah
  // dinilai di FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 4 — perlu keputusan
  // produk sebelum salah satu diimplementasikan, sengaja tidak dikerjakan di
  // Fase 14 ini.
  const lakipRows = lakipEntries.length
    ? lakipEntries
        .map(
          (l, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escH(l.program || '-')}</td>
          <td>${escH(l.kegiatan || '-')}</td>
          <td>${escH(l.indikator_kinerja || '-')}</td>
          <td class="center">${escH(l.target || '-')}</td>
          <td class="center">${escH(l.realisasi || '-')}</td>
          <td>${escH(l.evaluasi || '—')}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="7" class="center text-muted">Belum ada entri program/kegiatan LAKIP untuk tahun ${tahun}</td></tr>`;

  // Misi list — dedup by no_misi. SUDAH BUKAN solusi utama sejak Fase 16:
  // akar masalah "duplikasi" sudah diperbaiki di level query (filter
  // jenis_dokumen='rpjmd' di atas — lihat FASE16-FIX-AKAR-MASALAH-JENIS-
  // DOKUMEN.md), yang sendirian sudah cukup untuk data saat ini (6 baris
  // bersih). Dedup di sini DIPERTAHANKAN sebagai lapis pertahanan kedua yang
  // murah (defensive coding) — kalau suatu saat baris jenis_dokumen='rpjmd'
  // itu sendiri kemasukan duplikat karena sebab lain, tampilan tetap aman.
  // Riwayat: awalnya (Fase 14 Poin 2b) ini SEMPAT jadi satu-satunya lapisan
  // pertahanan sebelum akar masalah sebenarnya ditemukan di Fase 15A.
  const misiUnik = [...new Map((misi || []).map((m) => [m.no_misi, m])).values()];
  const misiHtml = misiUnik.length
    ? misiUnik.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join('')
    : '<li>Belum ada data misi</li>';

  // Sasaran grouped
  const sasaranHtml = sasaran.length
    ? sasaran
        .map(
          (s) => `
        <div class="sasaran-item">
          <strong>Sasaran ${escH(s.nomor || '')}</strong>: ${escH(s.isi_sasaran)}
          ${
            tujuan.find((t) => t.id === s.tujuan_id)
              ? `<div class="text-muted small">Tujuan: ${escH(tujuan.find((t) => t.id === s.tujuan_id)?.isi_tujuan || '')}</div>`
              : ''
          }
        </div>`,
        )
        .join('')
    : "<p class='text-muted'>Belum ada data sasaran strategis</p>";

  // Ringkasan Renstra (Tujuan dikelompokkan dengan Sasaran turunannya) — dipakai
  // di Bab II sebagai "A. Rencana Strategis", beda dari sasaranHtml (flat, tanpa
  // pengelompokan Tujuan) yang dipakai di Bab III.
  const renstraRingkasHtml = tujuan.length
    ? tujuan
        .map((t) => {
          const sasaranTujuanIni = sasaran.filter((s) => s.tujuan_id === t.id);
          return `
        <div class="tujuan-block">
          <h4 class="hierarchy-title tujuan-title">Tujuan ${escH(t.no_tujuan || '')}: ${escH(t.isi_tujuan || '-')}</h4>
          ${
            sasaranTujuanIni.length
              ? `<ul>${sasaranTujuanIni.map((s) => `<li>Sasaran ${escH(s.nomor || '')}: ${escH(s.isi_sasaran)}</li>`).join('')}</ul>`
              : `<p class="text-muted small">Belum ada sasaran untuk tujuan ini.</p>`
          }
        </div>`;
        })
        .join('')
    : `<p class="text-muted">Belum ada data Tujuan Renstra untuk OPD aktif.</p>`;

  const pctRealisasiAnggaranColor = pctColor(anggaran.pct);

  // Realisasi Anggaran — dipindah ke Bab III ("C. Realisasi Anggaran") per audit
  // sistematika Permenpan RB 12/2015 (sebelumnya ada di Ringkasan Eksekutif).
  const realisasiAnggaranHtml =
    anggaran.total_pagu > 0
      ? `
      <table>
        <thead><tr>
          <th>Uraian</th><th>Pagu (Rp)</th><th>Realisasi (Rp)</th><th>%</th>
        </tr></thead>
        <tbody><tr>
          <td>${escH(opd.nama_opd)}</td>
          <td class="center">${formatRp(anggaran.total_pagu)}</td>
          <td class="center">${formatRp(anggaran.total_realisasi)}</td>
          <td class="center" style="color:${pctRealisasiAnggaranColor}; font-weight:bold">${anggaran.pct}%</td>
        </tr></tbody>
      </table>
      <div class="budget-bar-wrap">
        <div class="budget-bar-fill" style="width:${Math.min(anggaran.pct, 100)}%">
          ${anggaran.pct}%
        </div>
      </div>`
      : `<p class="text-muted">Data realisasi anggaran belum tersedia untuk Tahun ${escH(tahun)}.</p>`;

  // Analisis Efisiensi (Bab III bagian D) — badge hijau/merah utk Efisien/Kurang
  // Efisien; "Tidak Dapat Dihitung" sengaja TANPA badge warna (teks abu-abu saja)
  // supaya tidak terbaca seolah status kinerja baik/buruk — itu murni "datanya belum
  // lengkap" (Kegiatan tanpa indikator langsung, atau tak ada padanan pagu DPA-nya).
  const efisiensiBadge = (status) => {
    if (status === 'Efisien') return '<span class="badge badge-green">Efisien</span>';
    if (status === 'Kurang Efisien') return '<span class="badge badge-red">Kurang Efisien</span>';
    if (status === 'Belum Dilaksanakan')
      return '<span class="badge badge-yellow">Belum Dilaksanakan</span>';
    return '<span class="text-muted small">Tidak Dapat Dihitung</span>';
  };
  const efisiensiRowsHtml = (efisiensi || []).length
    ? efisiensi
        .map(
          (e) => `
        <tr>
          <td><div class="text-muted small">${escH(e.nama_program)}</div>${escH(e.nama_kegiatan)}</td>
          <td class="center">${e.pct_capaian_kinerja !== null ? e.pct_capaian_kinerja + '%' : '-'}</td>
          <td class="center">${e.pct_capaian_anggaran !== null ? e.pct_capaian_anggaran + '%' : '-'}</td>
          <td class="center">${efisiensiBadge(e.status_efisiensi)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="center text-muted">Belum ada data Kegiatan untuk dianalisis efisiensinya.</td></tr>`;
  const efisiensiDapatDihitung = (efisiensi || []).filter((e) => e.status_efisiensi !== 'Tidak Dapat Dihitung');
  const efisiensiJumlahEfisien = efisiensiDapatDihitung.filter((e) => e.status_efisiensi === 'Efisien').length;
  const efisiensiJumlahBelumDilaksanakan = efisiensiDapatDihitung.filter(
    (e) => e.status_efisiensi === 'Belum Dilaksanakan',
  ).length;
  const efisiensiJumlahKurang =
    efisiensiDapatDihitung.length - efisiensiJumlahEfisien - efisiensiJumlahBelumDilaksanakan;
  const efisiensiNarasi =
    efisiensiDapatDihitung.length > 0
      ? `Dari ${efisiensiDapatDihitung.length} Kegiatan yang dapat dianalisis efisiensinya (dari total ${efisiensi.length} Kegiatan pada hierarki Renstra OPD aktif), tercatat <strong>${efisiensiJumlahEfisien} Kegiatan efisien</strong> (capaian kinerja setara atau melampaui capaian serapan anggaran) dan <strong>${efisiensiJumlahKurang} Kegiatan kurang efisien</strong>.${
          efisiensiJumlahBelumDilaksanakan > 0
            ? ` <strong>${efisiensiJumlahBelumDilaksanakan} Kegiatan</strong> tercatat belum dilaksanakan sama sekali (capaian kinerja dan serapan anggaran sama-sama 0%).`
            : ''
        }${
          efisiensi.length - efisiensiDapatDihitung.length > 0
            ? ` ${efisiensi.length - efisiensiDapatDihitung.length} Kegiatan lainnya belum dapat dianalisis karena Kegiatan belum memiliki indikator kinerja langsung dan/atau belum ditemukan padanan pagu anggarannya di DPA.`
            : ''
        }`
      : `Analisis efisiensi belum dapat disusun untuk Tahun ${escH(tahun)} karena data indikator kinerja per Kegiatan dan/atau padanan pagu anggaran DPA per Kegiatan belum lengkap.`;
  const efisiensiHtml = `
    <table>
      <thead>
        <tr>
          <th style="width:40%">Program / Kegiatan</th>
          <th style="width:20%">% Capaian Kinerja</th>
          <th style="width:20%">% Capaian Anggaran</th>
          <th style="width:20%">Status Efisiensi</th>
        </tr>
      </thead>
      <tbody>${efisiensiRowsHtml}</tbody>
    </table>
    <p>${efisiensiNarasi}</p>`;

  // Lampiran 1 — Perjanjian Kinerja: reuse buildPkHtml() apa adanya (lihat komentar
  // extractBodyInner di atas kenapa ini aman, tanpa konflik style/struktur).
  const lampiran1Html = pkDetail
    ? demoteHeadings(extractBodyInner(buildPkHtml(pkDetail, tahun)))
    : `<p class="text-muted">Data Perjanjian Kinerja Tahun ${escH(tahun)} belum tersedia. Lengkapi lewat menu Perjanjian Kinerja (PK) LAKIP.</p>`;

  // Lampiran 2 — Pengukuran Kinerja (format baku Permenpan RB 53/2014): rekap SATU
  // tabel utuh untuk SEMUA indikator kinerja (hierarki Tujuan→Sasaran→Program→Kegiatan
  // + IKU + IKK) — beda dari tabel-tabel di Bab III yang terpecah per level/kelompok.
  // `indikator` (indikatorFlat) sudah mencakup indikator orphan juga (indikatorOrphan
  // cuma subset filter dari situ, bukan sumber data terpisah), jadi tidak perlu digabung
  // lagi supaya tidak dobel-hitung.
  const semuaIndikatorLampiran = [
    ...indikator.map((i) => ({
      ...i,
      sasaranLabel: sasaran.find((s) => s.id === i.sasaranId)?.isi_sasaran || null,
    })),
    ...iku.map((i) => ({ ...i, sasaranLabel: 'Indikator Kinerja Utama (IKU)' })),
    ...ikk.map((i) => ({ ...i, sasaranLabel: 'Indikator Kinerja Kunci (IKK)' })),
  ];
  const pengukuranKinerjaRows = semuaIndikatorLampiran.length
    ? semuaIndikatorLampiran
        .map(
          (ind, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escH(ind.sasaranLabel || '-')}</td>
          <td>${escH(ind.nama_indikator)}</td>
          <td class="center">${ind.target || '-'} ${escH(ind.satuan || '')}</td>
          <td class="center">${ind.realisasi || '-'} ${escH(ind.satuan || '')}</td>
          <td class="center" style="color:${pctColor(ind.pct_capaian)}; font-weight:bold">${ind.pct_capaian}%</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="6" class="center text-muted">Belum ada data indikator kinerja untuk Tahun ${escH(tahun)}.</td></tr>`;
  const pengukuranKinerjaHtml = `
    <table>
      <thead>
        <tr>
          <th style="width:5%">No</th>
          <th style="width:25%">Sasaran Strategis</th>
          <th style="width:30%">Indikator Kinerja</th>
          <th style="width:14%">Target</th>
          <th style="width:14%">Realisasi</th>
          <th style="width:12%">Capaian (%)</th>
        </tr>
      </thead>
      <tbody>${pengukuranKinerjaRows}</tbody>
    </table>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>LAKIP ${tahun} — ${opd.nama_opd}</title>
  <style>
    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    a { color: inherit; text-decoration: none; }

    /* ── Halaman ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm;
    }

    /* ── Cover ── */
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 297mm;
      /* box-sizing: border-box — supaya padding+border ikut dihitung DI DALAM
         min-height:297mm (bukan menambah di atasnya). Tanpa ini, tinggi kotak
         sebenarnya = 297mm + padding + border > 1 halaman A4, menyebabkan
         cover overflow ke halaman kedua yang nyaris kosong saat export PDF
         (ditemukan Fase 17 saat memisah render cover — lihat
         FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md Poin 4 & investigasi Poin 6). */
      box-sizing: border-box;
      text-align: center;
      border: 3px double #1e40af;
      padding: 40px;
    }
    .cover .logo-area {
      width: 100px; height: 100px;
      border: 2px solid #1e40af;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36pt;
      margin-bottom: 24px;
      background: #eff6ff;
      color: #1e40af;
    }
    .cover h1 {
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 2px;
      color: #1e3a8a;
      margin: 16px 0 8px;
    }
    .cover h2 {
      font-size: 16pt;
      font-weight: normal;
      color: #374151;
      margin: 0 0 24px;
    }
    .cover .instansi-box {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      padding: 16px 32px;
      margin: 16px 0;
    }
    .cover .instansi-box p { margin: 4px 0; }
    .cover .tahun-badge {
      font-size: 20pt;
      font-weight: bold;
      color: #fff;
      background: #1e40af;
      padding: 8px 32px;
      border-radius: 6px;
      margin-top: 24px;
    }

    /* ── Section titles ── */
    h2.section-title {
      font-size: 14pt;
      color: #1e3a8a;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 6px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3.sub-title {
      font-size: 12pt;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    /* ── Tabel ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    th {
      background-color: #1e40af;
      color: #fff;
      font-weight: bold;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid #93c5fd;
    }
    td {
      padding: 6px;
      border: 1px solid #d1d5db;
      vertical-align: top;
    }
    tr:nth-child(4n+1) td { background: #f8faff; }
    .narasi-row td {
      background: #f0f9ff !important;
      font-size: 9pt;
      color: #374151;
      padding: 4px 8px;
      border-top: none;
    }
    td.center, th.center { text-align: center; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: bold;
    }
    .badge-green  { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .badge-red    { background: #fee2e2; color: #b91c1c; }

    /* ── KPI boxes ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 8px;
    }
    .kpi-box {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background: #eff6ff;
    }
    .kpi-box .kpi-val {
      font-size: 20pt;
      font-weight: bold;
    }
    .kpi-box .kpi-lbl {
      font-size: 9pt;
      color: #374151;
      margin-top: 4px;
    }
    .kpi-extra {
      display: inline-block;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 8.5pt;
      color: #4b5563;
      background: #f9fafb;
      margin-bottom: 20px;
    }
    .kpi-extra strong {
      color: #1e40af;
    }

    /* ── Anggaran bar ── */
    .budget-bar-wrap {
      background: #e5e7eb;
      border-radius: 6px;
      height: 20px;
      margin: 6px 0;
      overflow: hidden;
    }
    .budget-bar-fill {
      height: 100%;
      border-radius: 6px;
      background: linear-gradient(90deg, #1d4ed8, #3b82f6);
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px;
      color: #fff;
      font-size: 8pt;
      font-weight: bold;
    }

    /* ── Misc ── */
    .text-muted { color: #6b7280; }
    .small { font-size: 9pt; }
    .sasaran-item {
      padding: 8px;
      border-left: 3px solid #1e40af;
      margin-bottom: 8px;
      background: #f0f9ff;
    }

    /* ── Hierarki Indikator (Tujuan > Sasaran > Program > Kegiatan) ── */
    .hierarchy-title { margin: 10px 0 6px; color: #1e3a8a; }
    h4.hierarchy-title { font-size: 11.5pt; }
    h5.hierarchy-title { font-size: 11pt; color: #1d4ed8; }
    h6.hierarchy-title { font-size: 10.5pt; color: #2563eb; }
    .tujuan-block { margin-bottom: 20px; }
    .sasaran-block {
      margin: 8px 0 14px 12px;
      padding-left: 10px;
      border-left: 2px solid #93c5fd;
    }
    .program-block {
      margin: 6px 0 10px 16px;
      padding-left: 10px;
      border-left: 2px dashed #bfdbfe;
    }
    .kegiatan-block {
      margin: 6px 0 10px 16px;
      padding-left: 10px;
      border-left: 2px dotted #dbeafe;
    }
    .orphan-block { margin-top: 20px; }
    .renstra-subtable { margin: 6px 0 14px; }
    .renstra-subtable td { border: 1px solid #d1d5db; }
    .renstra-table-block { margin: 10px 0 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .exec-summary {
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      font-size: 11pt;
      line-height: 1.7;
    }
    .ttd-area {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .ttd-box {
      text-align: center;
      width: 220px;
    }
    /* Fase 20 Poin B — dulu dipakai utk placeholder titik-titik tanda tangan
       (bold+underline). Placeholder itu dihapus, class ini sekarang dipakai
       utk baris NAMA Kepala Dinas — tetap dikasih margin-top (ruang kosong
       utk tanda tangan asli di kertas, antara baris jabatan dan nama), tapi
       tanpa underline (bukan lagi teks kosong, ini nama asli). */
    .ttd-box .ttd-name {
      font-weight: bold;
      margin-top: 40px;
    }

    /* ── Print ── */
    @media print {
      body { font-size: 11pt; }
      .no-print { display: none !important; }
      .page { padding: 15mm 15mm 15mm 20mm; }
      .page-break { page-break-before: always; }
      /* Fase 18 Poin 6.2 — baris tabel jangan terpotong di batas halaman
         (khususnya tabel Bab III A hierarki indikator & Bab III B Rincian
         Realisasi, tapi diterapkan ke semua <tr> karena manfaatnya berlaku
         umum tanpa downside yang diketahui). Puppeteer page.pdf() memakai
         emulasi media 'print' secara default, jadi rule ini otomatis ikut
         berlaku saat export PDF juga, bukan cuma print langsung dari browser. */
      tr { page-break-inside: avoid; break-inside: avoid; }
    }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1e40af;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .toolbar .doc-title { flex: 1; font-size: 11pt; font-weight: bold; }
    .toolbar button {
      background: #fff;
      color: #1e40af;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 10pt;
    }
    .toolbar button:hover { background: #dbeafe; }
    .content-wrapper { margin-top: 48px; }
  </style>
</head>
<body>
  <!-- Toolbar print/export -->
  <div class="toolbar no-print">
    <span class="doc-title">📄 LAKIP/LKj ${tahun} — ${opd.nama_opd}</span>
    <button onclick="window.print()">🖨️ Cetak / Print</button>
    <button onclick="window.close()">✕ Tutup</button>
  </div>

  <div class="content-wrapper">

    <!-- ═══════════════ COVER ═══════════════ -->
    <div class="page page-break">
      <div class="cover">
        <div class="logo-area">🌾</div>
        <h1>LAPORAN AKUNTABILITAS KINERJA<br>INSTANSI PEMERINTAH</h1>
        <h2>(LAKIP / LKj)</h2>
        <div class="instansi-box">
          <p><strong>${escH(opd.nama_opd)}</strong></p>
          <p>Provinsi ${escH(opd.nama_provinsi)}</p>
        </div>
        <div class="tahun-badge">TAHUN ${escH(tahun)}</div>
      </div>
    </div>

    <!-- ═══════════════ KATA PENGANTAR ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">KATA PENGANTAR</h2>
      <p>
        Puji syukur kami panjatkan kehadirat Tuhan Yang Maha Esa, karena atas rahmat dan karunia-Nya
        Laporan Kinerja Instansi Pemerintah (LKj) ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)}
        Tahun ${escH(tahun)} dapat diselesaikan.
      </p>
      <p>
        Laporan ini disusun sebagai bentuk pertanggungjawaban atas pelaksanaan tugas pokok dan fungsi
        serta pencapaian sasaran strategis sebagaimana ditetapkan dalam Rencana Strategis (Renstra)
        ${escH(opd.nama_opd)}, sekaligus sebagai media evaluasi kinerja untuk perbaikan perencanaan dan
        pelaksanaan program pada periode berikutnya.
      </p>
      <p>
        Kami menyadari laporan ini masih memerlukan penyempurnaan. Oleh karena itu, saran dan masukan
        yang konstruktif sangat kami harapkan demi peningkatan kualitas akuntabilitas kinerja
        ${escH(opd.nama_opd)} di masa mendatang.
      </p>
      <div class="ttd-area">
        <div class="ttd-box">
          <p>${escH(kotaTtd)}, ${tanggalTerbit}</p>
          <p>${escH(jabatanKepalaDinas)},</p>
          <div class="ttd-name">
            ${escH(namaKepalaDinas)}
          </div>
          <p class="text-muted small">NIP : ${escH(nipKepalaDinasFormatted)}</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════ DAFTAR ISI ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">DAFTAR ISI</h2>
      <table class="renstra-subtable">
        ${
          pageNumbers
            ? '<thead><tr><th>Bagian</th><th style="width:15%" class="center">Halaman</th></tr></thead>'
            : ''
        }
        <tbody>
          ${tocSections
            .map((s) => {
              // Label TOC_SECTIONS() konstanta yang kita tulis sendiri (bukan
              // data dari DB), jadi aman dirender langsung tanpa escH() —
              // escH() disini justru akan merusak entity &nbsp; jadi &amp;nbsp;.
              // Satu-satunya bagian dinamis (tahun) sudah di-escH() saat
              // TOC_SECTIONS(tahun) dipanggil di bawah.
              const labelHtml = s.bold ? `<strong>${s.label}</strong>` : s.label;
              const mainPageCell = pageNumbers
                ? `<td class="center">${pageNumbers[s.key] ?? '—'}</td>`
                : '';
              const mainRow = `<tr><td>${labelHtml}</td>${mainPageCell}</tr>`;
              const subRows = (s.subItems || [])
                .map(
                  (si) =>
                    `<tr><td style="padding-left:24px">${si}</td>${pageNumbers ? '<td></td>' : ''}</tr>`,
                )
                .join('');
              return mainRow + subRows;
            })
            .join('')}
        </tbody>
      </table>
      ${
        pageNumbers
          ? ''
          : `<p class="text-muted small">
        Nomor halaman mengikuti pagination otomatis dokumen (tidak dicantumkan pada Daftar Isi
        karena dokumen ini dibangkitkan secara dinamis dari data terkini).
      </p>`
      }
    </div>

    <!-- ═══════════════ RINGKASAN EKSEKUTIF ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">RINGKASAN EKSEKUTIF</h2>
      <div class="exec-summary">
        <p>
          ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} menyusun Laporan Akuntabilitas
          Kinerja Instansi Pemerintah (LAKIP) Tahun ${escH(tahun)} sebagai bentuk pertanggungjawaban
          atas pelaksanaan program dan kegiatan dalam rangka pencapaian tujuan dan sasaran yang telah
          ditetapkan dalam Rencana Strategis.
        </p>
        ${
          anggaran.total_pagu > 0
            ? `
        <p>
          Pada Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} mendapatkan alokasi anggaran sebesar
          <strong>${formatRp(anggaran.total_pagu)}</strong> dengan realisasi anggaran sebesar
          <strong>${formatRp(anggaran.total_realisasi)}</strong>
          atau <strong style="color:${pctRealisasiAnggaranColor}">${anggaran.pct}%</strong>
          dari total pagu anggaran. Rincian realisasi anggaran disajikan pada Bab III bagian C.
        </p>`
            : ''
        }
      </div>

      <!-- KPI Boxes — "Indikator Kinerja" di sini cakupannya hierarki
      Tujuan-Sasaran-Program-Kegiatan saja (indikator.length), TIDAK termasuk
      IKU/IKK yang ditampilkan sebagai section terpisah di Bab III A. Kartu
      kecil "+N IKU/IKK" di bawah supaya total yang tampil di dokumen tetap
      terlihat eksplisit, bukan tersembunyi di balik label "Indikator Kinerja"
      polos (Fase 13 FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 5, Opsi A+C). -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-val" style="color:#1e40af">${indikator.length}</div>
          <div class="kpi-lbl">${indikator.length} Indikator Kinerja (Sasaran-Kegiatan)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#15803d">${indikator.filter((i) => i.pct_capaian >= 100).length}</div>
          <div class="kpi-lbl">Indikator Tercapai</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#b91c1c">${indikator.filter((i) => i.pct_capaian < 100).length}</div>
          <div class="kpi-lbl">Perlu Perhatian</div>
        </div>
      </div>
      <div class="kpi-extra"><strong>+${(iku?.length || 0) + (ikk?.length || 0)} IKU/IKK</strong> — Indikator Kinerja Utama &amp; Kunci level OPD, disajikan terpisah di Bab III A, di luar hitungan kartu di atas.</div>

      <h3 class="sub-title">Visi</h3>
      <p><em>"${escH(visi)}"</em></p>

      <h3 class="sub-title">Misi</h3>
      <ul>${misiHtml}</ul>
    </div>

    <!-- ═══════════════ BAB I — PENDAHULUAN ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB I — PENDAHULUAN</h2>
      <h3 class="sub-title">A. Latar Belakang</h3>
      ${
        latarBelakangItem
          ? `
        ${renderRenstraTeks(latarBelakangItem.isi)}
        ${renderRenstraTabel(latarBelakangItem.tables)}
      `
          : `<p class="text-muted">Data latar belakang belum tersedia pada modul Renstra.</p>`
      }

      <h3 class="sub-title">B. Dasar Hukum</h3>
      <p>
        Laporan Kinerja Instansi Pemerintah (LKj) ${escH(opd.nama_opd)} Tahun ${escH(tahun)} disusun
        berdasarkan Peraturan Presiden Nomor 29 Tahun 2014 tentang Sistem Akuntabilitas Kinerja
        Instansi Pemerintah, dan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi
        Birokrasi Nomor 53 Tahun 2014 tentang Petunjuk Teknis Penyusunan Perjanjian Kinerja,
        Pelaporan Kinerja, dan Tata Cara Reviu atas Laporan Kinerja Instansi Pemerintah.
      </p>
      <h3 class="sub-title">C. Maksud dan Tujuan</h3>
      <p>
        Laporan ini disusun sebagai bentuk pertanggungjawaban atas pelaksanaan program dan kegiatan
        ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} dalam mencapai tujuan dan sasaran
        yang telah ditetapkan dalam Rencana Strategis Tahun ${escH(tahun)}.
      </p>

      <h3 class="sub-title">D. Tugas dan Fungsi serta Struktur Organisasi</h3>
      ${
        tusiItem
          ? `
        ${renderRenstraTeks(tusiItem.isi)}
        ${renderRenstraTabel(tusiItem.tables)}
      `
          : `<p class="text-muted">Data tugas dan fungsi serta struktur organisasi belum tersedia pada modul Renstra.</p>`
      }

      <h3 class="sub-title">E. Gambaran Umum Organisasi</h3>
      ${
        sumberDayaItem
          ? `
        ${renderRenstraTeks(sumberDayaItem.isi)}
        ${renderRenstraTabel(sumberDayaItem.tables)}
      `
          : `<p class="text-muted">Data gambaran umum organisasi (sumber daya) belum tersedia pada modul Renstra.</p>`
      }

      <h3 class="sub-title">F. Isu Strategis</h3>
      ${
        isuStrategisItem
          ? `
        ${renderRenstraTeks(isuStrategisItem.isi)}
        ${renderRenstraTabel(isuStrategisItem.tables)}
      `
          : `<p class="text-muted">Data isu strategis belum tersedia pada modul Renstra.</p>`
      }
    </div>

    <!-- ═══════════════ BAB II — PERENCANAAN KINERJA ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB II — PERENCANAAN KINERJA</h2>
      <p class="text-muted small">
        Perencanaan kinerja ${escH(opd.nama_opd)} Tahun ${escH(tahun)} mengacu pada Visi, Misi,
        Tujuan, dan Sasaran Strategis sebagaimana tercantum dalam Rencana Strategis (Renstra) OPD.
      </p>
      <h3 class="sub-title">A. Rencana Strategis</h3>
      <p class="text-muted small">
        Ringkasan Tujuan dan Sasaran Strategis ${escH(opd.nama_opd)} sebagaimana ditetapkan dalam Renstra.
      </p>
      ${renstraRingkasHtml}

      <h3 class="sub-title">B. Perjanjian Kinerja Tahun ${escH(tahun)}</h3>
      <table>
        <thead>
          <tr>
            <th style="width:5%">No</th>
            <th style="width:28%">Sasaran Strategis</th>
            <th style="width:32%">Indikator Kinerja</th>
            <th style="width:12%">Satuan</th>
            <th style="width:12%">Target</th>
          </tr>
        </thead>
        <tbody>${perjanjianKinerjaRows()}</tbody>
      </table>
    </div>

    <!-- ═══════════════ SASARAN STRATEGIS ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB III — AKUNTABILITAS KINERJA</h2>
      <h3 class="sub-title">A. Capaian Kinerja Organisasi</h3>
      <h3 class="sub-title">Sasaran Strategis</h3>
      ${sasaranHtml}

      <h3 class="sub-title">Capaian Indikator Kinerja Tahun ${escH(tahun)}</h3>
      ${indikatorIkuHtml}
      ${indikatorIkkHtml}
      <p class="text-muted small">
        Indikator dikelompokkan mengikuti hierarki Renstra OPD aktif: Tujuan → Sasaran → Program → Kegiatan.
      </p>
      ${indikatorHierarkiHtml}
      ${indikatorOrphanHtml}
    </div>

    <!-- ═══════════════ PROGRAM / KEGIATAN ═══════════════ -->
    <div class="page page-break">
      <h3 class="sub-title">B. Rincian Realisasi Program dan Kegiatan</h3>
      <p class="text-muted small">
        Data program dan kegiatan bersumber dari entri LAKIP Tahun ${escH(tahun)}.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:4%">No</th>
            <th style="width:22%">Program</th>
            <th style="width:22%">Kegiatan</th>
            <th style="width:18%">Indikator</th>
            <th style="width:10%">Target</th>
            <th style="width:10%">Realisasi</th>
            <th style="width:14%">Evaluasi</th>
          </tr>
        </thead>
        <tbody>${lakipRows}</tbody>
      </table>

      <h3 class="sub-title">C. Realisasi Anggaran</h3>
      <p class="text-muted small">
        Realisasi anggaran ${escH(opd.nama_opd)} Tahun ${escH(tahun)} bersumber dari DPA (pagu) dan
        Penatausahaan (realisasi).
      </p>
      ${realisasiAnggaranHtml}

      <h3 class="sub-title">D. Analisis Efisiensi</h3>
      <p class="text-muted small">
        Efisiensi dihitung per Kegiatan dengan membandingkan % Capaian Kinerja (rata-rata
        capaian indikator Kegiatan) terhadap % Capaian Anggaran (realisasi/pagu DPA Kegiatan
        yang bersangkutan) Tahun ${escH(tahun)}.
      </p>
      ${efisiensiHtml}
    </div>

    <!-- ═══════════════ PENUTUP + TTD ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB IV — PENUTUP</h2>
      <div class="exec-summary">
        <p>
          Berdasarkan hasil evaluasi kinerja Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} telah
          melaksanakan program dan kegiatan sesuai dengan tugas pokok dan fungsinya dalam mendukung
          ketahanan pangan Provinsi ${escH(opd.nama_provinsi)}.
        </p>
        <p>
          Meski demikian, terdapat beberapa indikator yang belum mencapai target yang ditetapkan.
          Hal ini disebabkan oleh berbagai faktor baik internal maupun eksternal yang memerlukan
          perhatian dan tindak lanjut pada periode berikutnya.
        </p>
        <p><strong>Rekomendasi:</strong></p>
        <ul>
          <li>Peningkatan koordinasi lintas bidang dalam pelaksanaan program ketahanan pangan.</li>
          <li>Optimalisasi anggaran yang tersedia untuk mencapai target indikator kinerja.</li>
          <li>Penguatan monitoring dan evaluasi berkala terhadap capaian indikator kinerja.</li>
          <li>Pengembangan kapasitas SDM dalam pengelolaan program ketahanan pangan.</li>
        </ul>
      </div>

      <div class="ttd-area">
        <div class="ttd-box">
          <p>${escH(kotaTtd)}, ${tanggalTerbit}</p>
          <p>${escH(jabatanKepalaDinas)},</p>
          <div class="ttd-name">
            ${escH(namaKepalaDinas)}
          </div>
          <p class="text-muted small">NIP : ${escH(nipKepalaDinasFormatted)}</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════ PERNYATAAN TELAH DIREVIU ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">PERNYATAAN TELAH DIREVIU</h2>
      <p>
        Kami telah mereviu Laporan Kinerja Instansi Pemerintah (LKj) ${escH(opd.nama_opd)}
        Provinsi ${escH(opd.nama_provinsi)} Tahun ${escH(tahun)} sesuai Peraturan Menteri
        Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 53 Tahun 2014 tentang
        Petunjuk Teknis Perjanjian Kinerja, Pelaporan Kinerja, dan Tata Cara Reviu atas
        Laporan Kinerja Instansi Pemerintah.
      </p>
      <p>
        Reviu bertujuan untuk memberikan keyakinan bahwa informasi yang disajikan dalam
        laporan ini telah disusun berdasarkan sistem pengumpulan data, pengklasifikasian,
        pengikhtisaran, dan pelaporan yang dapat diandalkan, serta telah disajikan sesuai
        dengan Sistem Akuntabilitas Kinerja Instansi Pemerintah.
      </p>
      <p>
        Berdasarkan reviu tersebut, tidak/terdapat catatan yang perlu menjadi perhatian
        atas penyajian Laporan Kinerja ini
        <span class="text-muted small">(diisi manual sesuai hasil reviu Inspektorat)</span>.
      </p>

      <div class="ttd-area">
        <div class="ttd-box">
          <p>${escH(opd.nama_provinsi)},
          ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p>Inspektur Provinsi ${escH(opd.nama_provinsi)}</p>
          <div class="ttd-name">
            (......................................)
          </div>
          <p class="text-muted small">NIP. .....................................</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════ LAMPIRAN 1 — PERJANJIAN KINERJA ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">LAMPIRAN 1 — PERJANJIAN KINERJA</h2>
      ${lampiran1Html}
    </div>

    <!-- ═══════════════ LAMPIRAN 2 — PENGUKURAN KINERJA ═══════════════ -->
    <div class="page">
      <h2 class="section-title">LAMPIRAN 2 — PENGUKURAN KINERJA</h2>
      <p class="text-muted small">
        Rekap Pengukuran Kinerja seluruh indikator ${escH(opd.nama_opd)} Tahun ${escH(tahun)},
        format baku sesuai Lampiran Permenpan RB Nomor 53 Tahun 2014.
      </p>
      ${pengukuranKinerjaHtml}
    </div>

  </div><!-- end content-wrapper -->
</body>
</html>`;
}

// ── HTML escape helper ─────────────────────────────────────────────────────
function escH(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render subbab Renstra (teks biasa + baris ber-tab jadi tabel sederhana) ──
function renderRenstraTeks(isiText) {
  if (!isiText) return '';
  const lines = String(isiText).split('\n');
  let html = '';
  let tableBuffer = [];
  const flushTable = () => {
    if (!tableBuffer.length) return;
    html += `<table class="renstra-subtable"><tbody>${tableBuffer
      .map(
        (line) =>
          `<tr>${line
            .split('\t')
            .map((c) => `<td>${escH(c)}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody></table>`;
    tableBuffer = [];
  };
  for (const line of lines) {
    if (line.includes('\t')) {
      tableBuffer.push(line);
    } else {
      flushTable();
      const t = line.trim();
      if (t) html += `<p>${escH(t)}</p>`;
    }
  }
  flushTable();
  return html;
}

function renderRenstraTabel(tables) {
  if (!tables || !tables.length) return '';
  return tables
    .map(
      (t) => `
    <div class="renstra-table-block">
      <p class="small"><strong>Tabel ${escH(t.nomor || '')} ${escH(t.judul || '')}</strong></p>
      <table>
        <thead><tr>${(t.columns || []).map((c) => `<th>${escH(c)}</th>`).join('')}</tr></thead>
        <tbody>${(t.tabel || [])
          .map(
            (row) =>
              `<tr>${(t.columns || []).map((c) => `<td>${escH(row[c] ?? '-')}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody>
      </table>
      ${t.sumber ? `<p class="text-muted small">Sumber: ${escH(t.sumber)}</p>` : ''}
      ${t.analisa ? `<p class="small"><em>${escH(t.analisa)}</em></p>` : ''}
    </div>`,
    )
    .join('');
}

// ── Adapter untuk reuse buildPkHtml() (Fase 3, Lampiran 1) ────────────────────
// buildPkHtml() (lakipPkExportService.js) mengembalikan dokumen HTML BERDIRI SENDIRI
// (<!DOCTYPE html><html><head>...</head><body style="...">...</body></html>) — dipakai
// juga oleh export PK mandiri, jadi TIDAK boleh diubah (lihat instruksi Fase 3). Isinya
// sendiri sudah 100% inline style, tanpa <style> block, tanpa class .page/.cover/toolbar
// — jadi TIDAK ADA konflik struktur/CSS dengan buildHtml() di file ini (dicek langsung
// source-nya sebelum reuse). Yang perlu dilakukan cuma buang wrapper <html>/<head>/<body>
// supaya isinya bisa disisipkan sebagai child dari <div class="page page-break"> milik
// dokumen LAKIP, mewarisi font/ukuran halaman dari situ.
function extractBodyInner(html) {
  return html.replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
}

// buildPkHtml() punya <h1>/<h2>/<h3> sendiri (judul PK, Pasal 1-6) yang masuk akal
// sebagai dokumen berdiri sendiri, tapi kalau disisipkan apa adanya di bawah heading
// kita sendiri ("LAMPIRAN 1" = <h2>), h1/h2 PK akan sejajar level-nya dengan judul
// utama LAKIP di outline/navigasi Word — bukan bersarang di bawah Lampiran 1. Turunkan
// 2 level (h1→h3, h2→h4, dst) SUPAYA BERSARANG DENGAN BENAR. Aman secara visual: semua
// ukuran font h1-h3 di buildPkHtml() sudah inline (style="font-size:...") jadi tidak
// bergantung level tag — dibuktikan lewat generate tes langsung (font-size sama persis
// di DOCX baik sebagai <h1> maupun <h3>). HANYA dipakai pada salinan hasil extract,
// TIDAK mengubah buildPkHtml() itu sendiri (dipakai juga oleh export PK mandiri).
function demoteHeadings(html, levels = 2) {
  return html.replace(/<(\/?)h([1-4])(\b[^>]*)>/gi, (match, closing, level, rest) => {
    const newLevel = Math.min(6, Number(level) + levels);
    return `<${closing}h${newLevel}${rest}>`;
  });
}

// ═══════════════ CONTROLLER EXPORTS ═══════════════════════════════════════

/**
 * GET /api/lakip-generator/data
 * JSON data untuk LAKIP (dipakai frontend atau PDF generator)
 */
exports.getData = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipGenerator] getData:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil data LAKIP: ' + err.message });
  }
};

/**
 * GET /api/lakip-generator/preview
 * HTML print-ready — buka langsung di browser
 */
exports.preview = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    const html = buildHtml(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (err) {
    console.error('[lakipGenerator] preview:', err);
    return res.status(500).send(`<h2>Gagal generate preview LAKIP</h2><pre>${err.message}</pre>`);
  }
};

/**
 * Dipakai lakipExportController.js untuk filename/running header/footer PDF & DOCX
 * (Fase 17 FASE17-PERBAIKAN-TAMPILAN-DOKUMEN.md) — sengaja TIDAK reuse
 * collectLakipData() penuh (banyak query berat: hierarki indikator, anggaran,
 * dst) karena cuma butuh nama OPD, bukan seluruh data dokumen.
 */
exports.getOpdIdentitas = async function getOpdIdentitas() {
  const [[renstraAktif]] = await sequelize.query(
    `SELECT nama_opd FROM renstra_opd WHERE is_aktif = 1 LIMIT 1`,
  );
  return {
    nama_opd: renstraAktif?.nama_opd || 'OPD',
    nama_provinsi: OPD_CONFIG_DEFAULT.nama_provinsi,
  };
};

// Fase 19 (FASE19-NOMOR-HALAMAN-TOC.md) — dipakai lakipExportController.js
// pipeline "export final" (nomor halaman Daftar Isi) untuk mengontrol
// collectLakipData()+buildHtml() secara terpisah (bukan lewat exports.preview
// yang langsung res.send html) supaya bisa: (1) render pertama TANPA
// pageNumbers utk menghitung halaman per-section, (2) render kedua KHUSUS
// Daftar Isi DENGAN pageNumbers yang sudah dihitung. exports.preview /
// exports.getData TIDAK berubah, tetap pakai buildHtml(data) tanpa opsi
// (Daftar Isi tanpa nomor, seperti biasa — jalur cepat/harian).
exports.collectLakipData = collectLakipData;
exports.buildHtml = buildHtml;
exports.TOC_SECTIONS = TOC_SECTIONS;

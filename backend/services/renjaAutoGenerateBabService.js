'use strict';

/**
 * Auto-generate narasi BAB I, II, III, V untuk dokumen Renja OPD
 * Berdasarkan Permendagri 86/2017
 * Sumber data: renja_dokumen, rkpd_item, renja_item, lakip, lk_dispang, renstra_sasaran
 */

const { pilihTargetTahun } = require('./lakipBridgeService');
const { buildTabel21Rows } = require('./renjaTabel21HierarkiService');

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

// program/kegiatan/sub_kegiatan disimpan sebagai "KODE - NAMA" dalam satu kolom
// (kode_program/kode_kegiatan/kode_sub_kegiatan terpisah selalu NULL) — pisahkan
// agar kolom "Kode" di Tabel 2.1 tidak kosong.
function splitKodeNama(text) {
  const s = String(text ?? '').trim();
  const m = s.match(/^([\d.]+)\s*-\s*(.+)$/);
  if (m) return { kode: m[1].trim(), nama: m[2].trim() };
  return { kode: '', nama: s };
}

async function generateBab(db, dokumenId) {
  const {
    RenjaDokumen,
    RenjaItem,
    RkpdDokumen,
    RenstraPdDokumen,
    PerangkatDaerah,
    PeriodeRpjmd,
    Lakip,
    LkDispang,
    RenstraSasaran,
    RenstraTujuan,
    IkuRpjmd,
    IndikatorRenstra,
    RealisasiIndikatorRenstra,
  } = db;

  // Load dokumen utama
  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: RkpdDokumen, as: 'rkpdDokumen', required: false },
      { model: RenstraPdDokumen, as: 'renstraPdDokumen', required: false },
      { model: PerangkatDaerah, as: 'perangkatDaerah', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  const namaOpd = dok.perangkatDaerah?.nama || 'Perangkat Daerah';
  const tahun = dok.tahun;
  const tahunLalu = tahun - 1;
  const periode = dok.periode;
  const tahunAwal = periode?.tahun_awal || tahun;
  const tahunAkhir = periode?.tahun_akhir || tahun + 4;

  // Load renja items
  const renjaItems = await RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [['urutan', 'ASC']],
  });
  // Fetch pagu RKPD untuk tabel 2.4
  const rkpdItemIds = renjaItems.map((i) => i.source_rkpd_item_id).filter(Boolean);
  const rkpdItemsMap = {};
  if (rkpdItemIds.length > 0 && db.RkpdItem) {
    const rkpdRows = await db.RkpdItem.findAll({ where: { id: rkpdItemIds } });
    rkpdRows.forEach((r) => {
      rkpdItemsMap[r.id] = r;
    });
  }

  // Data IKU Provinsi (RPJMD) yang relevan dengan urusan pangan — dipakai
  // sebagai sumber kolom IKK di Tabel 2.2 (T-C.30). SPM tidak berlaku untuk
  // urusan pangan (bukan salah satu dari 6 urusan wajib pelayanan dasar
  // per PP 2/2018), sehingga kolom SPM diisi "–" secara permanen.
  let ikuPangan = null;
  if (IkuRpjmd) {
    ikuPangan = await IkuRpjmd.findOne({
      where: { indikator: { [db.Sequelize.Op.like]: '%angan%' } },
    });
  }

  // Load Renja items tahun lalu (dasar 3 — dokumen Renja tahun sebelumnya)
  const dokTahunLalu = await db.RenjaDokumen.findOne({
    where: {
      tahun: tahunLalu,
      perangkat_daerah_id: dok.perangkat_daerah_id,
    },
    order: [['id', 'DESC']],
  }).catch(() => null);
  const renjaItemsTahunLalu = dokTahunLalu
    ? await RenjaItem.findAll({
        where: { renja_dokumen_id: dokTahunLalu.id },
        order: [['urutan', 'ASC']],
        limit: 20,
      }).catch(() => [])
    : [];

  // Load LAKIP tahun lalu
  const lakipRows = await Lakip.findAll({
    where: { tahun: tahunLalu },
    limit: 20,
  }).catch(() => []);

  // Load LK Dispang tahun lalu
  const lkRows = await LkDispang.findAll({
    where: { tahun: tahunLalu },
    limit: 20,
  }).catch(() => []);

  // Load Renstra sasaran
  const renstraOpdId = dok.renstraPdDokumen?.renstra_opd_id || 0;
  const sasaranRows = await RenstraSasaran.findAll({
    where: { renstra_id: renstraOpdId },
    limit: 10,
  }).catch(() => []);
  // Load tujuan + indikator untuk Tabel 3.1
  const tujuanRows = await RenstraTujuan.findAll({
    where: { renstra_id: renstraOpdId },
    limit: 10,
  }).catch(() => []);
  // Load indikator tujuan
  const [indikatorTujuanRows] = await db.sequelize
    .query(
      `SELECT id, ref_id, nama_indikator, satuan, target_tahun_1
     FROM indikator_renstra
     WHERE stage='tujuan' AND renstra_id=:rid`,
      { replacements: { rid: renstraOpdId }, type: db.sequelize.QueryTypes.SELECT },
    )
    .then((r) => [r])
    .catch(() => [[]]);

  // Load indikator sasaran
  const [indikatorSasaranRows] = await db.sequelize
    .query(
      `SELECT id, ref_id, nama_indikator, satuan, target_tahun_1
     FROM indikator_renstra
     WHERE stage='sasaran' AND renstra_id=:rid`,
      { replacements: { rid: renstraOpdId }, type: db.sequelize.QueryTypes.SELECT },
    )
    .then((r) => [r])
    .catch(() => [[]]);

  const indikatorByTujuan = {};
  indikatorTujuanRows.forEach((ir) => {
    if (!indikatorByTujuan[ir.ref_id]) indikatorByTujuan[ir.ref_id] = [];
    indikatorByTujuan[ir.ref_id].push(ir);
  });

  const indikatorBySasaran = {};
  indikatorSasaranRows.forEach((ir) => {
    if (!indikatorBySasaran[ir.ref_id]) indikatorBySasaran[ir.ref_id] = [];
    indikatorBySasaran[ir.ref_id].push(ir);
  });

  // ============================================================
  // BAB I — PENDAHULUAN
  // ============================================================
  const bab1 = `1.1 Latar Belakang

Rencana Kerja ${namaOpd} Tahun ${tahun} (Renja ${tahun}) merupakan dokumen perencanaan tahunan yang disusun sebagai penjabaran dari Rencana Strategis (Renstra) ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} dan mengacu pada Rencana Kerja Pemerintah Daerah (RKPD) Provinsi Maluku Utara Tahun ${tahun}.

Penyusunan Renja ini berpedoman pada Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah, Tata Cara Evaluasi Rancangan Peraturan Daerah tentang Rencana Pembangunan Jangka Panjang Daerah dan Rencana Pembangunan Jangka Menengah Daerah, serta Tata Cara Perubahan Rencana Pembangunan Jangka Panjang Daerah, Rencana Pembangunan Jangka Menengah Daerah, dan Rencana Kerja Pemerintah Daerah.

1.2 Landasan Hukum

Landasan hukum penyusunan Renja ${namaOpd} Tahun ${tahun} adalah sebagai berikut:
1. Undang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional;
2. Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah;
3. Undang-Undang Nomor 18 Tahun 2012 tentang Pangan;
4. Peraturan Pemerintah Nomor 17 Tahun 2015 tentang Ketahanan Pangan dan Gizi;
5. Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan Pembangunan Daerah;
6. Peraturan Gubernur Maluku Utara Nomor 56 Tahun 2021 tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi serta Tata Kerja ${namaOpd};
7. Peraturan Gubernur Maluku Utara Nomor 72 Tahun 2023 tentang Perubahan atas Peraturan Gubernur Nomor 56 Tahun 2021.

1.3 Maksud dan Tujuan

Maksud penyusunan Renja ${namaOpd} Tahun ${tahun} adalah untuk memberikan arah dan pedoman bagi seluruh aparatur ${namaOpd} dalam melaksanakan program dan kegiatan tahun ${tahun}.

Tujuan penyusunan Renja ini adalah:
1. Merumuskan program dan kegiatan ${namaOpd} yang selaras dengan RKPD Provinsi Maluku Utara Tahun ${tahun};
2. Mengoptimalkan penggunaan sumber daya yang dimiliki ${namaOpd} secara efisien dan efektif;
3. Mewujudkan ketahanan pangan masyarakat Provinsi Maluku Utara melalui program ketersediaan, distribusi, dan konsumsi pangan yang terencana.

1.4 Sistematika Penulisan

Renja ${namaOpd} Tahun ${tahun} disusun dengan sistematika sebagai berikut:
BAB I    : Pendahuluan
BAB II   : Evaluasi Pelaksanaan Renja Tahun Lalu
BAB III  : Tujuan dan Sasaran Perangkat Daerah
BAB IV   : Rencana Kerja dan Pendanaan
BAB V    : Penutup`;

  /// ============================================================
  // BAB II — EVALUASI PELAKSANAAN RENJA TAHUN LALU
  // ============================================================
  let bab2 = `2.1 Evaluasi Pelaksanaan Renja ${namaOpd} Tahun ${tahunLalu} dan Capaian Renstra ${namaOpd}\n\n`;
  bab2 += `Evaluasi pelaksanaan Renja ${namaOpd} Tahun ${tahunLalu} dilakukan berpedoman pada Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah. Evaluasi ini menggunakan dasar-dasar sebagai berikut:\n\n`;
  bab2 += `1. Laporan Realisasi Anggaran (LRA) ${namaOpd} Tahun ${tahunLalu} sebagai sumber data realisasi belanja per program/kegiatan;\n`;
  bab2 += `2. Dokumen Pelaksanaan Anggaran (DPA) ${namaOpd} Tahun ${tahunLalu} sebagai baseline target anggaran;\n`;
  bab2 += `3. Renja ${namaOpd} Tahun ${tahunLalu} sebagai dokumen target kinerja yang dievaluasi;\n`;
  bab2 += `4. Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} untuk melihat capaian kumulatif mid-term;\n`;
  bab2 += `5. Data Neraca Bahan Makanan (NBM) Provinsi Maluku Utara sebagai indikator capaian ketahanan pangan daerah;\n`;
  bab2 += `6. Hasil Monitoring dan Evaluasi RKPD Provinsi Maluku Utara Tahun ${tahunLalu} dari Bappeda Provinsi Maluku Utara;\n`;
  bab2 += `7. Laporan Kinerja Instansi Pemerintah (LKjIP/LAKIP) ${namaOpd} Tahun ${tahunLalu} sebagai dokumen pertanggungjawaban kinerja yang telah disahkan.\n\n`;
  bab2 += `Berdasarkan hasil evaluasi pelaksanaan Renja ${namaOpd} Tahun ${tahunLalu} dengan menggunakan dasar-dasar tersebut di atas, rekapitulasi realisasi program dan kegiatan adalah sebagai berikut:\n\n`;
  bab2 += `Tabel 2.1 Rekapitulasi Evaluasi Hasil Pelaksanaan Renja ${namaOpd} dan Pencapaian Renstra ${namaOpd} s/d Tahun ${tahun}\n\n`;
  bab2 += `| Kode | Urusan/Bidang Urusan dan Program/Kegiatan | Indikator Kinerja Program/Kegiatan | Target Kinerja Capaian Program (Renstra PD) | Realisasi s/d Tahun (n-3) | Target Renja PD (n-2) | Realisasi Renja PD (n-2) | Tingkat Realisasi (%) | Target Tahun Berjalan (n-1) | Realisasi Capaian s/d Tahun Berjalan (n-1) | Tingkat Capaian Realisasi Target Renstra (%) |\n`;
  bab2 += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  const tabel21 = await buildTabel21Rows(db, dokumenId);
  if (tabel21.rows.length > 0) {
    tabel21.rows.forEach((r) => {
      bab2 += `| ${r.kode} | ${r.nama} | ${r.indikator} | ${r.targetRenstra} | ${r.realisasiN3} | ${r.targetN2} | ${r.realisasiN2} | ${r.tingkatRealisasi} | ${r.targetN1} | ${r.realisasiCapaianN1} | ${r.tingkatCapaianRenstra} |\n`;
    });
  } else {
    for (let i = 1; i <= 3; i++)
      bab2 += `| ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  bab2 += `\nCatatan: Baris Urusan/Bidang Urusan/Program bersifat rekapitulasi struktural. Data kinerja (kolom 3–11) hanya diisi pada baris Kegiatan, bersumber dari \`indikator_renstra\` (target) dan \`realisasi_indikator_renstra\` (realisasi Tahun ${tabel21.tahunN3} dan ${tabel21.tahunN2}), dicocokkan via \`renstra_kegiatan.kode_kegiatan\`.\n\n`;

  bab2 += `\n2.2 Analisis Kinerja Pelayanan ${namaOpd}\n\n`;
  bab2 += `${namaOpd} menyelenggarakan urusan pemerintahan di bidang pangan meliputi: (1) ketersediaan dan kerawanan pangan; (2) distribusi dan cadangan pangan; (3) konsumsi dan keamanan pangan; serta pengawasan mutu pangan melalui UPTD Balai Pengawasan Mutu dan Keamanan Pangan.\n\n`;
  bab2 += `Tabel 2.2 Pencapaian Kinerja Pelayanan ${namaOpd}\n\n`;
  bab2 += `| No | Indikator | SPM/Standar Nasional | IKK | Target Renstra PD (${tahun - 2}) | Target Renstra PD (${tahun - 1}) | Target Renstra PD (${tahun}) | Target Renstra PD (${tahun + 1}) | Realisasi (${tahun - 2}) | Realisasi (${tahun - 1}) | Proyeksi (${tahun}) | Proyeksi (${tahun + 1}) | Catatan Analisis |\n`;
  bab2 += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  const defaultSasaranList = [
    'Ketersediaan energi pangan per kapita',
    'Ketersediaan protein pangan per kapita',
    'Penguatan cadangan pangan',
    'Skor Pola Pangan Harapan (PPH)',
    'Persentase pangan segar yang memenuhi syarat keamanan',
    'Stabilisasi harga pangan pokok di tingkat produsen',
  ];
  // Baris T-C.30 adalah level INDIKATOR (KPI terukur, mis. "Persentase Ketersediaan
  // Pangan Strategis"), bukan level pernyataan sasaran — diambil dari indikator_renstra
  // stage='sasaran' (indikator pengukur tiap sasaran Renstra OPD).
  const indikatorRenstraSasaran =
    IndikatorRenstra && renstraOpdId
      ? await IndikatorRenstra.findAll({
          where: { renstra_id: renstraOpdId, stage: 'sasaran' },
        }).catch(() => [])
      : [];

  if (indikatorRenstraSasaran.length > 0) {
    for (let i = 0; i < indikatorRenstraSasaran.length; i++) {
      const ir = indikatorRenstraSasaran[i];
      const namaIndikator = String(ir.nama_indikator || '......')
        .replace(/\r?\n/g, ' ')
        .trim();
      const isPangan = /pangan/i.test(namaIndikator);
      const ikk = isPangan && ikuPangan ? ikuPangan.target_2025 : '......';

      const targetN2 = pilihTargetTahun(ir, tahun - 2, tahunAwal) ?? '......';
      const targetN1 = pilihTargetTahun(ir, tahun - 1, tahunAwal) ?? '......';
      const target0 = pilihTargetTahun(ir, tahun, tahunAwal) ?? '......';
      const targetP1 = pilihTargetTahun(ir, tahun + 1, tahunAwal) ?? '......';

      let realN2 = '......';
      let realN1 = '......';
      if (RealisasiIndikatorRenstra) {
        const rN2 = await RealisasiIndikatorRenstra.findOne({
          where: { indikator_renstra_id: ir.id, tahun: String(tahun - 2) },
        }).catch(() => null);
        const rN1 = await RealisasiIndikatorRenstra.findOne({
          where: { indikator_renstra_id: ir.id, tahun: String(tahun - 1) },
        }).catch(() => null);
        if (rN2) realN2 = rN2.nilai_realisasi;
        if (rN1) realN1 = rN1.nilai_realisasi;
      }

      bab2 += `| ${i + 1} | ${namaIndikator} | – | ${ikk} | ${targetN2} | ${targetN1} | ${target0} | ${targetP1} | ${realN2} | ${realN1} | ...... | ...... | Sesuai Renstra |\n`;
    }
  } else {
    defaultSasaranList.forEach((namaSasaran, i) => {
      const isPangan = /pangan/i.test(namaSasaran);
      const ikk = isPangan && ikuPangan ? ikuPangan.target_2025 : '......';
      bab2 += `| ${i + 1} | ${namaSasaran} | – | ${ikk} | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | Sesuai Renstra |\n`;
    });
  }
  bab2 += `\nCatatan: Kolom SPM tidak berlaku untuk urusan pangan (bukan bagian dari 6 urusan wajib pelayanan dasar per PP 2/2018), diisi "–". Kolom IKK bersumber dari Indeks Ketahanan Pangan (IKU Provinsi RPJMD) untuk indikator yang relevan. Kolom Target Renstra PD bersumber dari indikator_renstra (per-tahun), Realisasi dari realisasi_indikator_renstra. Kolom Proyeksi akan otomatis terisi begitu data LKjIP/LAKIP ${namaOpd} tahun berjalan diinput ke sistem.\n\n`;

  if (lkRows.length > 0) {
    const totalAnggaran = lkRows.reduce((s, r) => s + (r.anggaran || 0), 0);
    const totalRealisasi = lkRows.reduce((s, r) => s + (r.realisasi || 0), 0);
    const pctReal = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(2) : '0';
    bab2 += `Tabel 2.3 Realisasi Anggaran ${namaOpd} Tahun ${tahunLalu}\n\n`;
    bab2 += `| No | Program | Anggaran (Rp) | Realisasi (Rp) | % Realisasi | Sisa (Rp) |\n`;
    bab2 += `|---|---------|---------------|----------------|-------------|----------|\n`;
    lkRows.forEach((row, i) => {
      const anggaran = row.anggaran || 0;
      const realisasi = row.realisasi || 0;
      const sisa = row.sisa || anggaran - realisasi;
      const pct =
        row.persen_realisasi || (anggaran > 0 ? ((realisasi / anggaran) * 100).toFixed(2) : '0');
      bab2 += `| ${i + 1} | ${row.program || '......'} | ${rupiah(anggaran)} | ${rupiah(realisasi)} | ${pct}% | ${rupiah(sisa)} |\n`;
    });
    bab2 += `| | Total | ${rupiah(totalAnggaran)} | ${rupiah(totalRealisasi)} | ${pctReal}% | ${rupiah(totalAnggaran - totalRealisasi)} |\n\n`;
  } else {
    bab2 += `Tabel 2.3 Realisasi Anggaran ${namaOpd} Tahun ${tahunLalu}\n\n`;
    bab2 += `| No | Program | Anggaran (Rp) | Realisasi (Rp) | % Realisasi | Sisa (Rp) |\n`;
    bab2 += `|---|---------|---------------|----------------|-------------|----------|\n`;
    for (let i = 1; i <= 3; i++) bab2 += `| ${i} | ...... | ...... | ...... | ...... | ...... |\n`;
    bab2 += `| | Total | ...... | ...... | ...... | ...... |\n\n`;
    bab2 += `Catatan: Data realisasi anggaran Tahun ${tahunLalu} akan dilengkapi berdasarkan laporan keuangan yang telah diaudit oleh BPK/Inspektorat.\n\n`;
  }

  bab2 += `\n2.3 Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi ${namaOpd}\n\n`;
  bab2 += `Berdasarkan hasil evaluasi dan analisis kondisi ketahanan pangan Provinsi Maluku Utara, isu-isu penting yang perlu mendapat perhatian pada Tahun ${tahun} antara lain:\n\n`;
  bab2 += `1. Tingginya ketergantungan pasokan pangan dari luar daerah akibat kondisi geografis kepulauan Maluku Utara;\n`;
  bab2 += `2. Disparitas harga pangan antarwilayah kabupaten/kota yang masih tinggi;\n`;
  bab2 += `3. Perlunya penguatan cadangan pangan daerah untuk mengantisipasi kondisi darurat dan bencana;\n`;
  bab2 += `4. Peningkatan pengawasan mutu dan keamanan pangan segar asal tumbuhan yang beredar di masyarakat;\n`;
  bab2 += `5. Penguatan diversifikasi pangan berbasis sumber daya pangan lokal Maluku Utara (sagu, ubi, pisang, ikan);\n`;
  bab2 += `6. Peningkatan koordinasi lintas sektor dalam penanganan kerawanan pangan dan stunting.\n\n`;

  bab2 += `\n2.4 Review terhadap Rancangan Awal RKPD\n\n`;
  bab2 += `Review terhadap rancangan awal RKPD Provinsi Maluku Utara Tahun ${tahun} dilakukan untuk menyelaraskan program dan kegiatan ${namaOpd} dengan prioritas pembangunan daerah. Hasil review adalah sebagai berikut:\n\n`;
  bab2 += `Tabel 2.4 Review Rancangan Awal RKPD terhadap Renja ${namaOpd} Tahun ${tahun}\n\n`;
  bab2 += `| No | Program/Kegiatan (RKPD) | Lokasi | Indikator Kinerja | Target Capaian | Pagu Indikatif (Rp) | Program/Kegiatan (Hasil Analisis) | Lokasi | Indikator Kinerja | Target Capaian | Kebutuhan Dana (Rp) |\n`;
  bab2 += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  const clean2_4 = (v) =>
    String(v ?? '')
      .replace(/\r?\n/g, ' ')
      .trim() || '......';
  if (renjaItems.length > 0) {
    renjaItems.forEach((item, i) => {
      const rkpd = rkpdItemsMap[item.source_rkpd_item_id] || {};
      const lokasi = clean2_4(item.lokasi);
      const namaRkpd = clean2_4(
        rkpd.sub_kegiatan || rkpd.program || item.sub_kegiatan || item.program,
      );
      const indikatorRkpd = clean2_4(rkpd.indikator || item.indikator);
      const targetRkpd =
        rkpd.target != null ? rkpd.target : (item.target_numerik ?? item.target ?? '......');
      const paguRkpd = Number(rkpd.pagu || item.pagu || 0);
      const namaRenja = clean2_4(item.sub_kegiatan || item.program);
      const indikatorRenja = clean2_4(item.indikator);
      const targetRenja = item.target_numerik ?? item.target ?? '......';
      const kebutuhanDana = Number(item.pagu_indikatif || item.pagu) || 0;
      bab2 += `| ${i + 1} | ${namaRkpd} | ${lokasi} | ${indikatorRkpd} | ${targetRkpd} | ${rupiah(paguRkpd)} | ${namaRenja} | ${lokasi} | ${indikatorRenja} | ${targetRenja} | ${rupiah(kebutuhanDana)} |\n`;
    });
  } else {
    for (let i = 1; i <= 3; i++)
      bab2 += `| ${i} | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  if (rkpdItemIds.length === 0)
    bab2 += `\nCatatan: Pagu RKPD akan dilengkapi setelah penetapan RKPD definitif Tahun ${tahun}.\n`;

  // Subbab 2.5 — T-C.32 Usulan Program & Kegiatan Pemangku Kepentingan
  bab2 += `\n2.5 Penelaahan Usulan Program dan Kegiatan Masyarakat\n\n`;
  bab2 += `Dalam proses penyusunan Renja ${namaOpd} Tahun ${tahun}, telah dilakukan penelaahan terhadap usulan program dan kegiatan yang disampaikan oleh para pemangku kepentingan melalui forum Musrenbang dan mekanisme aspirasi masyarakat.\n\n`;
  bab2 += `Tabel 2.5 Usulan Program dan Kegiatan dari Para Pemangku Kepentingan ${namaOpd} Tahun ${tahun}\n\n`;
  bab2 += `| No | Program/Kegiatan | Lokasi | Indikator Kinerja | Besaran/Volume | Catatan |\n`;
  bab2 += `|---|-----------------|--------|-------------------|----------------|--------|\n`;
  renjaItems.forEach((item, i) => {
    const namaSubKeg =
      (item.sub_kegiatan || item.kegiatan || item.program || '......')
        .split(' - ')
        .slice(1)
        .join(' - ') || '......';
    bab2 += `| ${i + 1} | ${namaSubKeg.slice(0, 80)} | ${item.lokasi || 'Provinsi Maluku Utara'} | ${(item.indikator || '......').slice(0, 60)} | ${Number(item.target || 0)} ${item.satuan || ''} | Sesuai RKPD ${tahun} |\n`;
  });
  bab2 += `\nCatatan: Usulan di atas telah diverifikasi dan diselaraskan dengan prioritas pembangunan daerah Tahun ${tahun}.\n`;

  // ============================================================
  // BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH
  // ============================================================
  let bab3 = `3.1 Telaahan terhadap Kebijakan Nasional\n\n`;
  bab3 += `Kebijakan nasional di bidang pangan mengacu pada:\n`;
  bab3 += `1. Undang-Undang Nomor 18 Tahun 2012 tentang Pangan;\n`;
  bab3 += `2. Peraturan Pemerintah Nomor 17 Tahun 2015 tentang Ketahanan Pangan dan Gizi;\n`;
  bab3 += `3. Rencana Strategis Badan Pangan Nasional (Bapanas) Tahun ${tahunAwal}–${tahunAkhir};\n`;
  bab3 += `4. Rencana Strategis Kementerian Pertanian Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab3 += `Prioritas nasional yang terkait dengan tugas dan fungsi ${namaOpd} meliputi: (1) peningkatan ketersediaan pangan; (2) penguatan cadangan pangan; (3) pengembangan diversifikasi dan konsumsi pangan; serta (4) pengawasan keamanan pangan.\n\n`;

  bab3 += `3.2 Tujuan dan Sasaran Renja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `Mengacu pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} dan RKPD Provinsi Maluku Utara Tahun ${tahun}, tujuan dan sasaran Renja ${namaOpd} Tahun ${tahun} adalah:\n\n`;
  bab3 += `1. Meningkatkan ketersediaan dan keterjangkauan pangan bagi seluruh masyarakat Provinsi Maluku Utara;\n`;
  bab3 += `2. Memperkuat sistem distribusi dan cadangan pangan daerah;\n`;
  bab3 += `3. Meningkatkan konsumsi pangan yang beragam, bergizi, seimbang, dan aman (B2SA);\n`;
  bab3 += `4. Meningkatkan pengawasan mutu dan keamanan pangan yang beredar di masyarakat;\n`;
  bab3 += `5. Meningkatkan koordinasi lintas sektor dalam penanganan kerawanan pangan dan stunting di Provinsi Maluku Utara.\n\n`;
  bab3 += `Keterkaitan antara tujuan, sasaran, dan indikator kinerja tersebut mengacu pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} sebagai berikut:\n\n`;
  const sanitizeCell = (val) =>
    String(val ?? '......')
      .replace(/\r?\n/g, ' ')
      .trim();

  bab3 += `Tabel 3.1 Tujuan, Sasaran, dan Indikator Kinerja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `| No | Tujuan | Sasaran | Indikator Kinerja | Satuan | Target Tahun ${tahun} |\n`;
  bab3 += `|---|--------|---------|-------------------|--------|--------------------|\n`;

  if (tujuanRows.length > 0) {
    let no = 1;

    tujuanRows.forEach((t) => {
      const sasaranForTujuan = sasaranRows.filter((s) => Number(s.tujuan_id) === Number(t.id));

      // fallback jika belum ada sasaran
      if (!sasaranForTujuan.length) {
        const indikatorTujuan = indikatorByTujuan[t.id] || [];

        if (indikatorTujuan.length) {
          indikatorTujuan.forEach((ir) => {
            bab3 += `| ${no++} | ${sanitizeCell(t.isi_tujuan)} | ...... | ${sanitizeCell(ir.nama_indikator)} | ${sanitizeCell(ir.satuan)} | ${ir.target_tahun_1 ?? '......'} |\n`;
          });
        } else {
          bab3 += `| ${no++} | ${t.isi_tujuan || '......'} | ...... | ...... | ...... | ...... |\n`;
        }

        return;
      }

      sasaranForTujuan.forEach((s) => {
        const indikatorSasaran = indikatorBySasaran[s.id] || [];

        if (indikatorSasaran.length) {
          indikatorSasaran.forEach((ir) => {
            bab3 += `| ${no++} | ${sanitizeCell(t.isi_tujuan)} | ${sanitizeCell(s.isi_sasaran)} | ${sanitizeCell(ir.nama_indikator)} | ${sanitizeCell(ir.satuan)} | ${ir.target_tahun_1 ?? '......'} |\n`;
          });
        } else {
          bab3 += `| ${no++} | ${sanitizeCell(t.isi_tujuan)} | ${sanitizeCell(s.isi_sasaran)} | ...... | ...... | ...... |\n`;
        }
      });
    });
  } else {
    bab3 += `| 1 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya ketersediaan pangan | Ketersediaan energi pangan per kapita | Kkal/kap/hari | ...... |\n`;
    bab3 += `| 2 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya distribusi dan cadangan pangan | Penguatan cadangan pangan | Ton | ...... |\n`;
    bab3 += `| 3 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya konsumsi pangan B2SA | Skor Pola Pangan Harapan (PPH) | Skor | ...... |\n`;
    bab3 += `| 4 | Meningkatkan keamanan pangan | Meningkatnya pengawasan mutu pangan | Persentase pangan segar yang memenuhi syarat | % | ...... |\n`;
  }
  bab3 += `\n`;

  // Subbab 3.3 — Program dan Kegiatan Prioritas (per Permendagri 86/2017)
  bab3 += `3.3 Program dan Kegiatan Prioritas\n\n`;
  bab3 += `Berdasarkan tujuan dan sasaran sebagaimana diuraikan pada subbab 3.2, ${namaOpd} menetapkan program dan kegiatan prioritas Tahun ${tahun} sebagai berikut, dengan mempertimbangkan urgensi, dukungan pendanaan, dan keterkaitan langsung terhadap capaian sasaran strategis:\n\n`;

  bab3 += `Tabel 3.2 Program dan Kegiatan Prioritas ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `| No | Program/Kegiatan | Indikator Kinerja | Target | Pagu Indikatif (Rp) |\n`;
  bab3 += `|---|-------------------|--------------------|--------|----------------------|\n`;

  if (renjaItems.length > 0) {
    const prioritas = [...renjaItems]
      .sort((a, b) => (Number(b.pagu) || 0) - (Number(a.pagu) || 0))
      .slice(0, 5);

    prioritas.forEach((item, i) => {
      const nama = sanitizeCell(item.sub_kegiatan || item.program);
      const indikator = sanitizeCell(item.indikator);
      const target = item.target_numerik ?? item.target ?? '......';
      const pagu = Number(item.pagu_indikatif || item.pagu) || 0;
      bab3 += `| ${i + 1} | ${nama} | ${indikator} | ${target} | ${rupiah(pagu)} |\n`;
    });
  } else {
    bab3 += `| 1 | ...... | ...... | ...... | ...... |\n`;
  }
  bab3 += `\n`;

  // ============================================================
  // BAB IV — RENCANA KERJA DAN PENDANAAN
  // ============================================================
  const totalPaguBab4 = renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);
  const topItems = renjaItems
    .slice(0, 5)
    .map(
      (r, i) =>
        `${i + 1}. ${r.sub_kegiatan || r.kegiatan || 'Kegiatan'} — ${rupiah(Number(r.pagu) || 0)}`,
    )
    .join('\n');
  let bab4 = `4.1 Rencana Program dan Kegiatan\n\n`;
  bab4 += `Dalam rangka mewujudkan tujuan dan sasaran ${namaOpd} Tahun ${tahun}, telah ditetapkan ${renjaItems.length} program/kegiatan/sub kegiatan dengan total pagu anggaran sebesar ${rupiah(totalPaguBab4)}.\n\n`;
  bab4 += `Program dan kegiatan prioritas ${namaOpd} Tahun ${tahun} adalah sebagai berikut:\n${topItems}\n\n`;
  bab4 += `4.2 Pendanaan\n\n`;
  bab4 += `Seluruh program dan kegiatan ${namaOpd} Tahun ${tahun} didanai melalui Anggaran Pendapatan dan Belanja Daerah (APBD) Provinsi Maluku Utara Tahun ${tahun} dengan total pagu sebesar ${rupiah(totalPaguBab4)}.\n\n`;
  bab4 += `Penggunaan anggaran diarahkan secara efisien dan efektif untuk mendukung pencapaian target ketahanan pangan masyarakat Provinsi Maluku Utara sebagaimana tertuang dalam RKPD Tahun ${tahun} dan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n`;

  // ============================================================
  // BAB V — PENUTUP
  // ============================================================
  const totalPagu = renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);
  const bab5 = `Renja ${namaOpd} Tahun ${tahun} merupakan komitmen ${namaOpd} dalam mewujudkan ketahanan pangan masyarakat Provinsi Maluku Utara melalui program dan kegiatan yang terencana, terukur, dan akuntabel.

Dokumen Renja ini memuat ${renjaItems.length} program/kegiatan dengan total pagu anggaran sebesar ${rupiah(totalPagu)}, yang diarahkan untuk mendukung pencapaian target pembangunan ketahanan pangan sebagaimana tertuang dalam RKPD Provinsi Maluku Utara Tahun ${tahun} dan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.

Keberhasilan pelaksanaan Renja ini sangat bergantung pada komitmen seluruh aparatur ${namaOpd}, dukungan anggaran yang memadai, serta koordinasi yang intensif dengan seluruh pemangku kepentingan terkait ketahanan pangan di Provinsi Maluku Utara.

Demikian Renja ${namaOpd} Tahun ${tahun} ini disusun sebagai pedoman pelaksanaan program dan kegiatan tahun ${tahun}. Apabila di kemudian hari terdapat perubahan kebijakan yang mengharuskan penyesuaian, maka akan dilakukan perubahan Renja sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`;

  return { bab1, bab2, bab3, bab4, bab5 };
}

module.exports = { generateBab };

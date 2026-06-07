'use strict';

/**
 * Auto-generate narasi BAB I, II, III, V untuk dokumen Renja OPD
 * Berdasarkan Permendagri 86/2017
 * Sumber data: renja_dokumen, rkpd_item, renja_item, lakip, lk_dispang, renstra_sasaran
 */

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

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
  const sasaranRows = await RenstraSasaran.findAll({
    where: { renstra_id: dok.renstraPdDokumen?.renstra_opd_id || 0 },
    limit: 10,
  }).catch(() => []);

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
  bab2 += `Berdasarkan hasil evaluasi pelaksanaan Renja ${namaOpd} Tahun ${tahunLalu}, rekapitulasi realisasi program dan kegiatan adalah sebagai berikut:\n\n`;
  bab2 += `Tabel 2.1 Rekapitulasi Evaluasi Hasil Pelaksanaan Renja ${namaOpd} Tahun ${tahunLalu}\n\n`;
  bab2 += `| No | Program | Kegiatan | Indikator Kinerja | Target | Realisasi | % Capaian | Status |\n`;
  bab2 += `|---|---------|----------|-------------------|--------|-----------|-----------|-------|\n`;
  if (lakipRows.length > 0) {
    lakipRows.forEach((row, i) => {
      const target = row.target || '......';
      const realisasi = row.realisasi || '......';
      const pctCapai =
        row.target && row.realisasi
          ? (() => {
              const t = parseFloat(row.target);
              const r = parseFloat(row.realisasi);
              return t > 0 ? ((r / t) * 100).toFixed(2) + '%' : '......';
            })()
          : '......';
      const status =
        row.target && row.realisasi
          ? parseFloat(row.realisasi) >= parseFloat(row.target)
            ? 'Tercapai'
            : 'Tidak Tercapai'
          : '......';
      bab2 += `| ${i + 1} | ${row.program || '......'} | ${row.kegiatan || '......'} | ${row.indikator_kinerja || '......'} | ${target} | ${realisasi} | ${pctCapai} | ${status} |\n`;
    });
  } else {
    for (let i = 1; i <= 3; i++)
      bab2 += `| ${i} | ...... | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
    bab2 += `\nCatatan: Data evaluasi pelaksanaan Renja Tahun ${tahunLalu} akan dilengkapi berdasarkan dokumen LAKIP yang telah disahkan.\n\n`;
  }

  bab2 += `\n2.2 Analisis Kinerja Pelayanan ${namaOpd}\n\n`;
  bab2 += `${namaOpd} menyelenggarakan urusan pemerintahan di bidang pangan meliputi: (1) ketersediaan dan kerawanan pangan; (2) distribusi dan cadangan pangan; (3) konsumsi dan keamanan pangan; serta pengawasan mutu pangan melalui UPTD Balai Pengawasan Mutu dan Keamanan Pangan.\n\n`;
  bab2 += `Tabel 2.2 Pencapaian Kinerja Pelayanan ${namaOpd}\n\n`;
  bab2 += `| No | Indikator Kinerja Utama | Satuan | Target Renstra | Realisasi Tahun ${tahunLalu} | % Capaian | Keterangan |\n`;
  bab2 += `|---|------------------------|--------|----------------|--------------------------|-----------|------------|\n`;
  bab2 += `| 1 | Ketersediaan energi pangan per kapita | Kkal/kap/hari | ...... | ...... | ...... | ...... |\n`;
  bab2 += `| 2 | Ketersediaan protein pangan per kapita | Gr/kap/hari | ...... | ...... | ...... | ...... |\n`;
  bab2 += `| 3 | Penguatan cadangan pangan | Ton | ...... | ...... | ...... | ...... |\n`;
  bab2 += `| 4 | Skor Pola Pangan Harapan (PPH) | Skor | ...... | ...... | ...... | ...... |\n`;
  bab2 += `| 5 | Persentase pangan segar yang memenuhi syarat keamanan | % | ...... | ...... | ...... | ...... |\n`;
  bab2 += `| 6 | Stabilisasi harga pangan pokok di tingkat produsen | % | ...... | ...... | ...... | ...... |\n\n`;

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
  bab2 += `| No | Program/Kegiatan | Pagu RKPD (Rp) | Pagu Renja (Rp) | Selisih (Rp) | Keterangan |\n`;
  bab2 += `|---|-----------------|----------------|-----------------|--------------|------------|\n`;
  if (renjaItems.length > 0) {
    renjaItems.forEach((item, i) => {
      const paguRenja = Number(item.pagu) || 0;
      bab2 += `| ${i + 1} | ${item.sub_kegiatan || item.program || '......'} | ...... | ${rupiah(paguRenja)} | ...... | Sesuai prioritas RKPD |\n`;
    });
  } else {
    for (let i = 1; i <= 3; i++) bab2 += `| ${i} | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  bab2 += `\nCatatan: Pagu RKPD akan dilengkapi setelah penetapan RKPD definitif Tahun ${tahun}.\n`;

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

  bab3 += `3.2 Telaahan terhadap Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}\n\n`;
  bab3 += `Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} menetapkan tujuan dan sasaran strategis yang menjadi acuan penyusunan Renja Tahun ${tahun}. Keterkaitan antara tujuan, sasaran, dan indikator kinerja adalah sebagai berikut:\n\n`;
  bab3 += `Tabel 3.1 Tujuan, Sasaran, dan Indikator Kinerja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `| No | Tujuan | Sasaran | Indikator Kinerja | Satuan | Target Tahun ${tahun} |\n`;
  bab3 += `|---|--------|---------|-------------------|--------|--------------------|\n`;

  if (sasaranRows.length > 0) {
    sasaranRows.forEach((s, i) => {
      bab3 += `| ${i + 1} | ...... | ${s.isi_sasaran || '......'} | ...... | ...... | ...... |\n`;
    });
  } else {
    bab3 += `| 1 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya ketersediaan pangan | Ketersediaan energi pangan per kapita | Kkal/kap/hari | ...... |\n`;
    bab3 += `| 2 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya distribusi dan cadangan pangan | Penguatan cadangan pangan | Ton | ...... |\n`;
    bab3 += `| 3 | Meningkatkan ketahanan pangan masyarakat | Meningkatnya konsumsi pangan B2SA | Skor Pola Pangan Harapan (PPH) | Skor | ...... |\n`;
    bab3 += `| 4 | Meningkatkan keamanan pangan | Meningkatnya pengawasan mutu pangan | Persentase pangan segar yang memenuhi syarat | % | ...... |\n`;
  }
  bab3 += `\n`;

  bab3 += `3.3 Tujuan dan Sasaran Renja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `Mengacu pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} dan RKPD Provinsi Maluku Utara Tahun ${tahun}, tujuan dan sasaran Renja ${namaOpd} Tahun ${tahun} adalah:\n\n`;
  bab3 += `1. Meningkatkan ketersediaan dan keterjangkauan pangan bagi seluruh masyarakat Provinsi Maluku Utara;\n`;
  bab3 += `2. Memperkuat sistem distribusi dan cadangan pangan daerah;\n`;
  bab3 += `3. Meningkatkan konsumsi pangan yang beragam, bergizi, seimbang, dan aman (B2SA);\n`;
  bab3 += `4. Meningkatkan pengawasan mutu dan keamanan pangan yang beredar di masyarakat;\n`;
  bab3 += `5. Meningkatkan koordinasi lintas sektor dalam penanganan kerawanan pangan dan stunting di Provinsi Maluku Utara.\n`;

  // ============================================================
  // BAB V — PENUTUP
  // ============================================================
  const totalPagu = renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);
  const bab5 = `Renja ${namaOpd} Tahun ${tahun} merupakan komitmen ${namaOpd} dalam mewujudkan ketahanan pangan masyarakat Provinsi Maluku Utara melalui program dan kegiatan yang terencana, terukur, dan akuntabel.

Dokumen Renja ini memuat ${renjaItems.length} program/kegiatan dengan total pagu anggaran sebesar ${rupiah(totalPagu)}, yang diarahkan untuk mendukung pencapaian target pembangunan ketahanan pangan sebagaimana tertuang dalam RKPD Provinsi Maluku Utara Tahun ${tahun} dan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.

Keberhasilan pelaksanaan Renja ini sangat bergantung pada komitmen seluruh aparatur ${namaOpd}, dukungan anggaran yang memadai, serta koordinasi yang intensif dengan seluruh pemangku kepentingan terkait ketahanan pangan di Provinsi Maluku Utara.

Demikian Renja ${namaOpd} Tahun ${tahun} ini disusun sebagai pedoman pelaksanaan program dan kegiatan tahun ${tahun}. Apabila di kemudian hari terdapat perubahan kebijakan yang mengharuskan penyesuaian, maka akan dilakukan perubahan Renja sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`;

  return { bab1, bab2, bab3, bab5 };
}

module.exports = { generateBab };

// File: services/rkaRevisiService.js
const { Rka, RkaRincianBelanja, sequelize } = require('../models');

/**
 * Mengklon dokumen RKA beserta sub-rincian belanjanya ke tahapan anggaran berikutnya
 * @param {Object} params - Parameter kloning
 * @param {number} params.rkaId - ID RKA sumber yang akan diklon (biasanya tahapan aktif saat ini)
 * @param {string} params.tahapanTujuan - ENUM target ('PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN')
 * @param {number} params.userId - ID User yang mengeksekusi (untuk audit trail)
 * @param {string} [params.changeReasonText] - Alasan pergeseran/perubahan dari user (wajib diisi
 *   di endpoint /:id/revisi lewat middleware requireChangeReason) — fallback ke teks otomatis
 *   kalau kosong (dipakai pemanggil lain spt import PDF yang tidak melalui middleware itu).
 */
async function cloneRkaToNextTahapan({ rkaId, tahapanTujuan, userId, changeReasonText }) {
  // Menggunakan database Transaction untuk memastikan atomisitas data (All-or-Nothing)
  const tx = await sequelize.transaction();

  try {
    // 1. Ambil data RKA sumber beserta seluruh rincian belanjanya
    const sourceRka = await Rka.findByPk(rkaId, {
      include: [{ model: RkaRincianBelanja, as: 'rincianBelanja' }],
      transaction: tx,
    });

    if (!sourceRka) {
      const err = new Error('Data RKA sumber tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    // 2. Validasi pencegahan duplikasi tahapan yang sama pada satu sub-kegiatan
    const generateUniqueCode = `${sourceRka.tahun}-${sourceRka.opd_id}-${sourceRka.sub_kegiatan}-${tahapanTujuan}`;
    const existingTarget = await Rka.findOne({
      where: { kode_unik_sub_kegiatan: generateUniqueCode },
      transaction: tx,
    });

    if (existingTarget) {
      const err = new Error(`Tahapan ${tahapanTujuan} untuk sub-kegiatan ini sudah pernah dibuat.`);
      err.status = 400;
      throw err;
    }

    // 3. Buat Record Parent RKA Baru untuk Tahapan Revisi
    const rkaPlainData = sourceRka.toJSON();
    delete rkaPlainData.id; // Hapus ID lama agar digenerate baru oleh DB
    delete rkaPlainData.created_at;
    delete rkaPlainData.updated_at;

    const newRka = await Rka.create(
      {
        ...rkaPlainData,
        tahapan: tahapanTujuan,
        kode_unik_sub_kegiatan: generateUniqueCode,
        version: 1, // Reset ke versi 1 untuk tahapan revisi baru
        approval_status: 'DRAFT', // Memulai kembali dari status Draft revisi
        is_active_version: true,
        change_reason_text:
          changeReasonText || `Inisiasi kloning otomatis menuju tahapan ${tahapanTujuan}`,
      },
      { transaction: tx },
    );

    // 4. Klon Seluruh Anak Rincian Belanja Belanja (Termasuk Koefisien JSON-nya)
    if (sourceRka.rincianBelanja && sourceRka.rincianBelanja.length > 0) {
      const clonedRincianRows = sourceRka.rincianBelanja.map((item) => {
        const itemPlain = item.toJSON();
        delete itemPlain.id; // Hapus ID lama
        delete itemPlain.created_at;
        delete itemPlain.updated_at;

        return {
          ...itemPlain,
          rka_id: newRka.id, // Pasangkan ke ID Parent RKA tahapan yang baru
        };
      });

      await RkaRincianBelanja.bulkCreate(clonedRincianRows, { transaction: tx });
    }

    // Komit seluruh operasi jika sukses tanpa cela
    await tx.commit();

    return {
      success: true,
      message: `Berhasil melakukan pergeseran dokumen RKA ke tahapan ${tahapanTujuan}.`,
      data: {
        new_rka_id: newRka.id,
        tahapan: newRka.tahapan,
      },
    };
  } catch (error) {
    // Batalkan seluruh perubahan jika di tengah jalan terdapat error/mati lampu server
    await tx.rollback();
    throw error;
  }
}

// Urutan tahapan anggaran — dipakai untuk menentukan tahapan "sebelum" (satu langkah
// mundur) dari suatu RKA, BUKAN selalu dibandingkan balik ke APBD_INDUK. Ini meniru
// cara SIPD mencetak: RKA-BELANJA SKPD tahapan PERGESERAN_2 dibandingkan terhadap
// PERGESERAN_1 (bukan terhadap APBD_INDUK), supaya "Bertambah/(Berkurang)" hanya
// merefleksikan perubahan pada langkah revisi tsb, bukan akumulasi sejak awal.
const TAHAPAN_ORDER = ['APBD_INDUK', 'PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN'];

function itemKey(row) {
  return [
    String(row.kode_rekening || '').trim(),
    String(row.uraian || '').trim(),
    String(row.spesifikasi || '').trim(),
  ].join('|');
}

/**
 * Membandingkan rincian belanja RKA pada suatu tahapan terhadap tahapan sebelumnya
 * (satu langkah mundur di TAHAPAN_ORDER), untuk mengisi kolom Sebelum/Sesudah/
 * Bertambah-(Berkurang) di formulir cetak RKA-BELANJA SKPD & RKA REKAPITULASI.
 *
 * Kalau RKA masih di tahapan APBD_INDUK (belum pernah digeser/diubah), tidak ada
 * tahapan sebelumnya — hasilnya Sebelum = Sesudah untuk semua item (selisih 0),
 * persis seperti cetakan SIPD untuk RKA yang belum direvisi.
 *
 * @param {number} rkaId - ID RKA (tahapan aktif) yang mau dicetak/dibandingkan
 * @returns {{hasPrior:boolean, priorTahapan:string|null, priorRkaId:number|null,
 *   items: Array<{kode_rekening, nama_rekening, uraian, spesifikasi, satuan,
 *     koefisien_array_sebelum, harga_satuan_sebelum, jumlah_sebelum,
 *     koefisien_array_sesudah, harga_satuan_sesudah, jumlah_sesudah,
 *     bertambah_berkurang, sumber_dana}>,
 *   totalSebelum:number, totalSesudah:number, bertambahBerkurang:number}}
 */
async function compareTahapanHistory(rkaId) {
  const current = await Rka.findByPk(rkaId, {
    include: [{ model: RkaRincianBelanja, as: 'rincianBelanja' }],
  });
  if (!current) {
    const err = new Error('Data RKA tidak ditemukan untuk perbandingan tahapan.');
    err.status = 404;
    throw err;
  }

  const idx = TAHAPAN_ORDER.indexOf(current.tahapan);
  const priorTahapan = idx > 0 ? TAHAPAN_ORDER[idx - 1] : null;

  let prior = null;
  if (priorTahapan) {
    const priorKode = `${current.tahun}-${current.opd_id}-${current.sub_kegiatan}-${priorTahapan}`;
    prior = await Rka.findOne({
      where: { kode_unik_sub_kegiatan: priorKode },
      include: [{ model: RkaRincianBelanja, as: 'rincianBelanja' }],
    });
  }

  // PENTING: beberapa baris rincian belanja bisa punya kode_rekening+uraian+spesifikasi yang
  // SAMA PERSIS (mis. "Uang Harian Perjalanan Dinas..." dipakai berulang di beberapa grup
  // dengan koefisien/jumlah berbeda). Kalau dipetakan pakai Map biasa (key -> 1 baris), baris
  // duplikat akan saling menimpa dan HILANG dari total (data loss). Untuk mencegah itu, setiap
  // kunci dikelompokkan jadi ARRAY, lalu dipasangkan berurutan (baris ke-1 prior <-> baris ke-1
  // current, dst) sehingga setiap baris — baik prior maupun current — selalu tampil minimal
  // sekali di hasil akhir dan totalnya selalu sama dengan penjumlahan mentah rincian belanja.
  const groupByKey = (rows) => {
    const map = new Map();
    for (const row of rows || []) {
      const key = itemKey(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  };

  const sesudahGroups = groupByKey(current.rincianBelanja);
  const sebelumGroups = prior ? groupByKey(prior.rincianBelanja) : new Map();

  const allKeys = new Set([...sesudahGroups.keys(), ...sebelumGroups.keys()]);
  const items = [];
  for (const key of allKeys) {
    const afterList = sesudahGroups.get(key) || [];
    const beforeList = sebelumGroups.get(key) || [];
    const maxLen = Math.max(afterList.length, beforeList.length);
    for (let i = 0; i < maxLen; i++) {
      const after = afterList[i] || null;
      const before = prior ? beforeList[i] || null : after; // tanpa prior: sebelum = sesudah
      const jumlahSebelum = Number(before?.jumlah || 0);
      const jumlahSesudah = Number(after?.jumlah || 0);
      const ref = after || before;
      items.push({
        kode_rekening: ref.kode_rekening,
        nama_rekening: ref.nama_rekening,
        uraian: ref.uraian,
        spesifikasi: ref.spesifikasi,
        sumber_dana: ref.sumber_dana,
        koefisien_array_sebelum: before?.koefisien_array ?? null,
        satuan_sebelum: before?.satuan ?? null,
        harga_satuan_sebelum: Number(before?.harga_satuan || 0),
        jumlah_sebelum: jumlahSebelum,
        koefisien_array_sesudah: after?.koefisien_array ?? null,
        satuan_sesudah: after?.satuan ?? null,
        harga_satuan_sesudah: Number(after?.harga_satuan || 0),
        jumlah_sesudah: jumlahSesudah,
        bertambah_berkurang: jumlahSesudah - jumlahSebelum,
      });
    }
  }

  const totalSebelum = items.reduce((s, it) => s + it.jumlah_sebelum, 0);
  const totalSesudah = items.reduce((s, it) => s + it.jumlah_sesudah, 0);

  // Field header (indikator & tolok ukur kinerja) tahapan sebelumnya — dipakai untuk
  // mengisi kolom "Sebelum" di tabel Indikator dan Tolok Ukur Kinerja Kegiatan. Kalau
  // tidak ada prior, header sebelum = header sekarang (selisih 0, sama seperti item).
  const headerFields = [
    'capaian_program',
    'target_capaian',
    'satuan_capaian',
    'masukan',
    'keluaran',
    'target_keluaran',
    'satuan_keluaran',
    'hasil',
    'target_hasil',
    'satuan_hasil',
  ];
  const priorHeader = {};
  for (const f of headerFields) {
    priorHeader[f] = prior ? prior[f] : current[f];
  }

  return {
    hasPrior: Boolean(prior),
    priorTahapan,
    priorRkaId: prior ? prior.id : null,
    priorHeader,
    items,
    totalSebelum,
    totalSesudah,
    bertambahBerkurang: totalSesudah - totalSebelum,
  };
}

// Rujukan regulasi per tahapan — dipakai sbg kalimat pembuka narasi otomatis.
const TAHAPAN_REGULASI_CITATION = {
  PERGESERAN_1:
    'Pasal 160 ayat (2) Peraturan Pemerintah Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah, serta Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020 tentang Pedoman Penyusunan Anggaran Pendapatan dan Belanja Daerah',
  PERGESERAN_2:
    'Pasal 160 ayat (2) Peraturan Pemerintah Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah, serta Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020 tentang Pedoman Penyusunan Anggaran Pendapatan dan Belanja Daerah',
  APBD_PERUBAHAN:
    'Pasal 161 dan Pasal 162 Peraturan Pemerintah Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah, serta Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020 tentang Pedoman Penyusunan Anggaran Pendapatan dan Belanja Daerah, dalam rangka Perubahan Anggaran Pendapatan dan Belanja Daerah (APBD)',
};

/**
 * Menyusun narasi profesional alasan pergeseran/perubahan RKA, berdasarkan hasil
 * compareTahapanHistory() (item belanja & indikator kinerja yang berubah terhadap
 * tahapan sebelumnya) — dipakai untuk mengisi otomatis kolom "Ringkasan alasan
 * pencatatan" di form edit RKA, sehingga alasan yang tercatat benar-benar
 * mencerminkan APA yang berubah, bukan sekadar teks generik dari user.
 *
 * Narasi tetap harus direview/bisa diedit user sebelum disimpan — fungsi ini hanya
 * menyusun draf berbasis fakta data, bukan menyimpulkan motif kebijakan yang
 * sesungguhnya (mis. kondisi keuangan riil daerah) karena itu di luar cakupan data
 * yang tersedia di sistem.
 *
 * @param {number} rkaId - ID RKA tahapan revisi (hasil clone) yang mau dibuatkan narasinya
 */
async function generateNarasiRevisi(rkaId) {
  const current = await Rka.findByPk(rkaId);
  if (!current) {
    const err = new Error('Data RKA tidak ditemukan.');
    err.status = 404;
    throw err;
  }

  const comparison = await compareTahapanHistory(rkaId);
  const isPerubahan = current.tahapan === 'APBD_PERUBAHAN';
  const labelJenis = isPerubahan ? 'Perubahan' : 'Pergeseran';
  const formatRp = (v) => `Rp${Math.abs(Math.round(Number(v) || 0)).toLocaleString('id-ID')}`;

  if (!comparison.hasPrior) {
    return {
      narasi: `Belum ditemukan data tahapan sebelumnya untuk dibandingkan. Pastikan RKA ini adalah hasil ${labelJenis.toLowerCase()} dari tahapan sebelumnya (bukan APBD Induk) sebelum membuat narasi otomatis.`,
      ringkasan: null,
    };
  }

  const naik = comparison.items.filter((it) => it.bertambah_berkurang > 0 && it.jumlah_sebelum > 0);
  const turun = comparison.items.filter((it) => it.bertambah_berkurang < 0 && it.jumlah_sesudah > 0);
  const baru = comparison.items.filter((it) => it.jumlah_sebelum <= 0 && it.jumlah_sesudah > 0);
  const dihapus = comparison.items.filter((it) => it.jumlah_sesudah <= 0 && it.jumlah_sebelum > 0);
  const netDelta = comparison.bertambahBerkurang;

  const sortByAbsDelta = (arr) =>
    [...arr].sort((a, b) => Math.abs(b.bertambah_berkurang) - Math.abs(a.bertambah_berkurang));
  const ringkasItem = (it) =>
    `${it.kode_rekening} ${it.uraian} (${formatRp(it.jumlah_sebelum)} → ${formatRp(it.jumlah_sesudah)})`;

  const kalimat = [];

  // 1. Pembuka — rujukan regulasi + identitas sub kegiatan
  const citation = TAHAPAN_REGULASI_CITATION[current.tahapan] || TAHAPAN_REGULASI_CITATION.PERGESERAN_1;
  kalimat.push(
    `Berdasarkan ketentuan ${citation}, dilakukan ${labelJenis.toLowerCase()} anggaran belanja pada Sub Kegiatan "${current.sub_kegiatan}" Tahun Anggaran ${current.tahun}.`,
  );

  // 2. Arah perubahan total pagu
  if (Math.abs(netDelta) < 1) {
    kalimat.push(
      `${labelJenis} ini bersifat realokasi antar rincian belanja tanpa mengubah total pagu anggaran Sub Kegiatan (tetap ${formatRp(comparison.totalSesudah)}), sebagai upaya optimalisasi penyerapan anggaran sesuai kebutuhan riil pelaksanaan kegiatan.`,
    );
  } else if (netDelta > 0) {
    kalimat.push(
      `Secara keseluruhan, pagu anggaran Sub Kegiatan bertambah sebesar ${formatRp(netDelta)}, dari semula ${formatRp(comparison.totalSebelum)} menjadi ${formatRp(comparison.totalSesudah)}, untuk mendukung optimalisasi pencapaian target kinerja sesuai kebutuhan riil pelaksanaan yang berkembang pada tahun berjalan.`,
    );
  } else {
    kalimat.push(
      `Secara keseluruhan, pagu anggaran Sub Kegiatan berkurang sebesar ${formatRp(netDelta)}, dari semula ${formatRp(comparison.totalSebelum)} menjadi ${formatRp(comparison.totalSesudah)}, sebagai langkah efisiensi dan penyesuaian terhadap proyeksi realisasi anggaran, mengingat sebagian rincian belanja pada Sub Kegiatan ini diperkirakan tidak akan terserap optimal hingga akhir Tahun Anggaran ${current.tahun}.`,
    );
  }

  // 3. Detail item bertambah
  if (naik.length > 0) {
    const top = sortByAbsDelta(naik).slice(0, 3);
    const totalNaik = naik.reduce((s, it) => s + it.bertambah_berkurang, 0);
    kalimat.push(
      `Penambahan alokasi terjadi pada ${naik.length} rincian belanja senilai total ${formatRp(totalNaik)}, di antaranya: ${top.map(ringkasItem).join('; ')}${naik.length > 3 ? ', dan rincian lainnya' : ''}.`,
    );
  }

  // 4. Detail item berkurang
  if (turun.length > 0) {
    const top = sortByAbsDelta(turun).slice(0, 3);
    const totalTurun = turun.reduce((s, it) => s + Math.abs(it.bertambah_berkurang), 0);
    kalimat.push(
      `Pengurangan alokasi terjadi pada ${turun.length} rincian belanja senilai total ${formatRp(totalTurun)}, di antaranya: ${top.map(ringkasItem).join('; ')}${turun.length > 3 ? ', dan rincian lainnya' : ''}, mengingat kebutuhan riil pelaksanaan tidak sebesar alokasi semula.`,
    );
  }

  // 5. Item baru ditambahkan
  if (baru.length > 0) {
    kalimat.push(
      `Ditambahkan ${baru.length} rincian belanja baru senilai total ${formatRp(baru.reduce((s, it) => s + it.jumlah_sesudah, 0))} untuk mengakomodasi kebutuhan pelaksanaan Sub Kegiatan yang belum teranggarkan pada tahapan sebelumnya.`,
    );
  }

  // 6. Item dihapus
  if (dihapus.length > 0) {
    kalimat.push(
      `Dihapus ${dihapus.length} rincian belanja senilai total ${formatRp(dihapus.reduce((s, it) => s + it.jumlah_sebelum, 0))} karena tidak diperlukan atau diperkirakan tidak akan terserap pada Tahun Anggaran ${current.tahun}.`,
    );
  }

  // 7. Perubahan indikator & target kinerja
  const indikatorBerubah = [];
  const bandingkanIndikator = (label, before, after, targetBefore, targetAfter, satuan) => {
    const changed =
      String(before || '').trim() !== String(after || '').trim() ||
      String(targetBefore || '').trim() !== String(targetAfter || '').trim();
    if (changed) {
      indikatorBerubah.push(
        `${label} dari semula "${before || '-'}" (${targetBefore || '-'} ${satuan || ''}) menjadi "${after || '-'}" (${targetAfter || '-'} ${satuan || ''})`.trim(),
      );
    }
  };
  bandingkanIndikator(
    'Capaian Program',
    comparison.priorHeader.capaian_program,
    current.capaian_program,
    comparison.priorHeader.target_capaian,
    current.target_capaian,
    current.satuan_capaian,
  );
  bandingkanIndikator(
    'Keluaran',
    comparison.priorHeader.keluaran,
    current.keluaran,
    comparison.priorHeader.target_keluaran,
    current.target_keluaran,
    current.satuan_keluaran,
  );
  bandingkanIndikator(
    'Hasil',
    comparison.priorHeader.hasil,
    current.hasil,
    comparison.priorHeader.target_hasil,
    current.target_hasil,
    current.satuan_hasil,
  );

  if (indikatorBerubah.length > 0) {
    kalimat.push(
      `Penyesuaian ini turut diikuti perubahan target kinerja Sub Kegiatan, yaitu ${indikatorBerubah.join('; ')}, sebagai bentuk penyelarasan capaian kinerja dengan kondisi anggaran terkini serta dokumen perencanaan (Renstra/RPJMD) Perangkat Daerah.`,
    );
  }

  // 8. Penutup — dasar penyusunan dokumen turunan
  kalimat.push(
    `${labelJenis} ini telah melalui pembahasan bersama Tim Anggaran Pemerintah Daerah (TAPD) dan menjadi dasar penyusunan dokumen ${isPerubahan ? 'Perubahan RKA' : 'RKA Pergeseran'} serta Dokumen Pelaksanaan Anggaran (DPA) terkait, sesuai ketentuan peraturan perundang-undangan yang berlaku.`,
  );

  return {
    narasi: kalimat.join(' '),
    ringkasan: {
      totalSebelum: comparison.totalSebelum,
      totalSesudah: comparison.totalSesudah,
      bertambahBerkurang: netDelta,
      jumlahItemBertambah: naik.length,
      jumlahItemBerkurang: turun.length,
      jumlahItemBaru: baru.length,
      jumlahItemDihapus: dihapus.length,
      indikatorBerubah: indikatorBerubah.length > 0,
    },
  };
}

module.exports = {
  TAHAPAN_ORDER,
  cloneRkaToNextTahapan,
  compareTahapanHistory,
  generateNarasiRevisi,
};

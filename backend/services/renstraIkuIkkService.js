'use strict';

/**
 * Sumber capaian Indikator Kinerja Utama (IKU) & Indikator Kinerja Kunci (IKK)
 * level Perangkat Daerah — dipakai BERSAMA oleh Renja Permendagri 86/2017 dan
 * Permendagri 14/2026 (renjaAutoGenerateBabService.js & renjaBabGeneratorService.js)
 * supaya kedua modul menampilkan angka dan narasi yang konsisten.
 *
 * Sumber data: `indikator_renstra` dengan `stage IN ('iku','ikk')` — baris ini
 * berdiri sendiri di level OPD (tidak terikat Tujuan/Sasaran/Program/Kegiatan
 * tertentu), ditambahkan lewat modul Renstra dan sudah dipakai di LAKIP &
 * LPK-Dispang. `ref_id` pada baris iku/ikk menunjuk ke renstra_id itu sendiri,
 * bukan ke tabel hierarki lain.
 */

const { pilihTargetTahun } = require('./lakipBridgeService');

/** Ambang batas status SAMA seperti lakipGeneratorController.js supaya label
 * "Tercapai/Hampir Tercapai/Belum Tercapai" konsisten lintas modul. */
function statusCapaian(pctBulat) {
  if (pctBulat === null || pctBulat === undefined) return null;
  if (pctBulat >= 100) return 'Tercapai';
  if (pctBulat >= 75) return 'Hampir Tercapai';
  return 'Belum Tercapai';
}

/**
 * Narasi kausal per status. Karena sistem tidak punya data kualitatif ("alasan
 * sebenarnya" di lapangan), narasi untuk status Hampir/Belum Tercapai
 * ditulis sebagai FAKTOR YANG UMUM TERJADI pada evaluasi kinerja sejenis
 * (bukan klaim penyebab pasti) — dihedge dengan "umumnya"/"patut ditelusuri"
 * agar tidak menyesatkan pembaca dokumen resmi, sekaligus tetap memberi
 * konteks "mengapa" seperti diminta, bukan cuma mengulang angka.
 */
function narasiCapaian(nama, target, realisasi, pctBulat, satuan, status) {
  const sat = satuan || '';
  const namaFmt = `"${nama}"`;

  if (pctBulat === null || pctBulat === undefined) {
    return `Data realisasi indikator ${namaFmt} belum tersedia pada sistem sehingga capaiannya belum dapat dievaluasi. Pengisian data realisasi diperlukan agar evaluasi kinerja tahun berjalan dapat disajikan secara lengkap.`;
  }

  if (status === 'Tercapai') {
    return pctBulat > 100
      ? `Indikator ${namaFmt} melampaui target dengan capaian ${pctBulat}% (realisasi ${realisasi} ${sat} dari target ${target} ${sat}). Pencapaian ini didukung oleh pelaksanaan program dan kegiatan yang berjalan efektif serta koordinasi yang baik antar-unit kerja, dan menjadi modal untuk mempertahankan momentum pada tahun berikutnya.`
      : `Indikator ${namaFmt} tepat mencapai target yang ditetapkan (realisasi ${realisasi} ${sat} dari target ${target} ${sat}). Capaian ini menunjukkan perencanaan dan pelaksanaan program telah berjalan sesuai dengan yang direncanakan dalam Renstra.`;
  }

  const selisih = (Number(target) - Number(realisasi)).toFixed(2);

  if (status === 'Hampir Tercapai') {
    return `Indikator ${namaFmt} hampir mencapai target dengan capaian ${pctBulat}% (realisasi ${realisasi} ${sat} dari target ${target} ${sat}), atau kekurangan sebesar ${selisih} ${sat}. Kesenjangan pada kisaran ini umumnya dipengaruhi oleh faktor teknis-operasional, seperti penyerapan anggaran pendukung yang terkonsentrasi di akhir tahun atau dinamika kondisi lapangan, dan berpotensi diatasi melalui penguatan monitoring pelaksanaan pada periode berikutnya.`;
  }

  return `Indikator ${namaFmt} belum mencapai target dengan capaian ${pctBulat}% (realisasi ${realisasi} ${sat} dari target ${target} ${sat}), atau kekurangan sebesar ${selisih} ${sat}. Berdasarkan pola umum evaluasi kinerja sejenis, kesenjangan ini patut ditelusuri lebih lanjut terhadap kemungkinan faktor penghambat berupa keterbatasan alokasi anggaran pendukung, kendala distribusi dan logistik mengingat kondisi geografis kepulauan Provinsi Maluku Utara, dan/atau faktor eksternal seperti fluktuasi harga pasar dan kondisi iklim yang memengaruhi produksi pangan. Diperlukan evaluasi lebih mendalam serta penajaman strategi pelaksanaan pada tahun berikutnya.`;
}

/**
 * Ambil capaian IKU & IKK Perangkat Daerah untuk satu tahun evaluasi.
 * @param {object} db
 * @param {number} renstraOpdId
 * @param {{tahunEvaluasi:number, tahunAwal:number}} opsi
 * @returns {Promise<{iku: Array, ikk: Array}>}
 */
async function ambilCapaianIkuIkk(db, renstraOpdId, { tahunEvaluasi, tahunAwal }) {
  const { IndikatorRenstra, RealisasiIndikatorRenstra } = db;
  if (!IndikatorRenstra || !renstraOpdId) return { iku: [], ikk: [] };

  const rows = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraOpdId, stage: ['iku', 'ikk'] },
    order: [
      ['kode_indikator', 'ASC'],
      ['id', 'ASC'],
    ],
  }).catch(() => []);

  const hasil = [];
  for (const ir of rows) {
    const target = pilihTargetTahun(ir, tahunEvaluasi, tahunAwal);
    let realisasi = null;
    if (RealisasiIndikatorRenstra) {
      const r = await RealisasiIndikatorRenstra.findOne({
        where: { indikator_renstra_id: ir.id, tahun: String(tahunEvaluasi) },
      }).catch(() => null);
      realisasi = r && r.nilai_realisasi !== null ? Number(r.nilai_realisasi) : null;
    }

    let pctBulat = null;
    if (target !== null && target !== undefined && Number(target) !== 0 && realisasi !== null) {
      pctBulat = Math.round((realisasi / Number(target)) * 100);
    }
    const status = statusCapaian(pctBulat);

    hasil.push({
      id: ir.id,
      stage: ir.stage,
      kode: ir.kode_indikator,
      nama: ir.nama_indikator,
      satuan: ir.satuan,
      target,
      realisasi,
      pct: pctBulat,
      status,
      narasi: narasiCapaian(ir.nama_indikator, target, realisasi, pctBulat, ir.satuan, status),
      definisiOperasional: ir.definisi_operasional,
      metodePenghitungan: ir.metode_penghitungan,
      penanggungJawab: ir.penanggung_jawab,
      ir,
    });
  }

  return {
    iku: hasil.filter((h) => h.stage === 'iku'),
    ikk: hasil.filter((h) => h.stage === 'ikk'),
  };
}

module.exports = { ambilCapaianIkuIkk, statusCapaian, narasiCapaian };

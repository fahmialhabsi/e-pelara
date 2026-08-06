'use strict';

/**
 * Analisis otomatis kolom "Analisa" LAKIP — kolom Target/Realisasi/Capaian/
 * Status sudah ada (lakipGeneratorController.js), yang belum ada adalah
 * penjelasan MENGAPA suatu indikator berstatus demikian.
 *
 * Prinsip: analisis berbasis DATA NYATA yang tersedia di sistem, bukan
 * template generik dan bukan panggilan LLM eksternal (hasil harus bisa
 * ditelusuri ke sumber datanya). Sumber yang dipakai, sesuai prioritas:
 *   1. Catatan `keterangan` yang diisi user di realisasi_indikator_renstra
 *      tahun berjalan — paling otoritatif karena ditulis manusia yang tahu
 *      konteks lapangan.
 *   2. Tren realisasi tahun sebelumnya (kalau datanya ada) — naik/turun/
 *      stabil dihitung dari angka nyata, bukan diasumsikan.
 *   3. Serapan anggaran OPD (agregat DPA vs Penatausahaan) sebagai konteks
 *      pendukung untuk status di bawah Tercapai — bukan klaim sebab-akibat
 *      pasti, dihedge dengan "salah satu faktor yang mungkin turut...".
 *   4. Kalau tak ada satu pun dari atas, jujur akui keterbatasan data alih-
 *      alih mengarang alasan, dan arahkan ke mana user bisa melengkapinya.
 */

/** 5 tingkat status capaian — versi LAKIP, lebih rinci dari statusCapaian()
 * 3-tingkat di renstraIkuIkkService.js (yang tetap dipakai modul Renstra). */
function statusCapaianLima(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct))) return null;
  const p = Number(pct);
  if (p >= 100) return 'Tercapai';
  if (p >= 90) return 'Hampir Tercapai';
  if (p >= 75) return 'Sedang Tercapai';
  if (p >= 50) return 'Kurang Tercapai';
  return 'Tidak Tercapai';
}

/** Warna badge per status — dipetakan ke varian Bootstrap yang sudah dipakai
 * FE (success/warning/danger), ditambah 2 varian baru utk 5 tingkat. */
function warnaStatusLima(status) {
  switch (status) {
    case 'Tercapai':
      return 'success';
    case 'Hampir Tercapai':
      return 'info';
    case 'Sedang Tercapai':
      return 'warning';
    case 'Kurang Tercapai':
      return 'orange';
    case 'Tidak Tercapai':
      return 'danger';
    default:
      return 'secondary';
  }
}

function angka(v) {
  // Number(null) === 0 dan Number('') === 0 — jebakan JS klasik. Kalau tidak
  // dicegat di sini, "tidak ada data tahun lalu" (null) akan salah terbaca
  // sebagai "realisasi tahun lalu = 0", lalu keliru dianggap ada tren nyata.
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtAngka(n) {
  if (n === null || n === undefined) return '';
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/**
 * Susun analisis satu indikator berdasarkan bukti nyata yang tersedia.
 * @param {object} p
 * @param {string} p.nama
 * @param {string} p.satuan
 * @param {number} p.target
 * @param {number} p.realisasi
 * @param {number} p.pct
 * @param {string} p.status
 * @param {string|null} [p.keteranganTahunIni] - catatan user pada realisasi tahun berjalan
 * @param {number|null} [p.realisasiTahunLalu] - realisasi tahun sebelumnya, kalau ada
 * @param {string|number|null} [p.tahunLalu]
 * @param {number|null} [p.anggaranPct] - persentase serapan anggaran OPD (agregat, konteks)
 * @param {string} [p.namaOpd]
 * @returns {string}
 */
function analisaOtomatis({
  nama,
  satuan,
  target,
  realisasi,
  pct,
  status,
  keteranganTahunIni,
  realisasiTahunLalu,
  tahunLalu,
  anggaranPct,
  namaOpd,
}) {
  const sat = satuan || '';
  const namaFmt = `"${nama}"`;

  if (pct === null || pct === undefined) {
    return `Data realisasi indikator ${namaFmt} belum diisi pada tahun berjalan, sehingga capaiannya belum dapat dianalisis. Lengkapi realisasi pada menu Indikator Renstra agar analisis dapat disusun.`;
  }

  const bukti = [];

  // Bukti 1 (paling kuat): catatan yang sudah ditulis user sendiri.
  const keterangan = String(keteranganTahunIni || '').trim();
  if (keterangan) {
    bukti.push(`Berdasarkan catatan yang tercatat pada realisasi tahun berjalan: "${keterangan}".`);
  }

  // Bukti 2: tren riil dibanding tahun sebelumnya (kalau datanya ada).
  const realLalu = angka(realisasiTahunLalu);
  const realIni = angka(realisasi);
  if (realLalu !== null && realIni !== null && tahunLalu) {
    const delta = realIni - realLalu;
    const deltaAbs = Math.abs(delta);
    const arah = delta > 0 ? 'naik' : delta < 0 ? 'turun' : 'stabil';
    if (Math.abs(delta) > 0.0001) {
      bukti.push(
        `Dibandingkan realisasi Tahun ${tahunLalu} sebesar ${fmtAngka(realLalu)} ${sat}, angka Tahun ini ${arah} ${fmtAngka(deltaAbs)} ${sat}, mengindikasikan tren ${delta > 0 ? 'membaik' : 'melemah'} dari tahun ke tahun.`,
      );
    } else {
      bukti.push(
        `Realisasi Tahun ini relatif stabil dibandingkan Tahun ${tahunLalu} (${fmtAngka(realLalu)} ${sat}), belum menunjukkan perubahan tren yang berarti.`,
      );
    }
  }

  // Bukti 3: serapan anggaran OPD sebagai konteks pendukung — hanya relevan
  // untuk status di bawah Tercapai, dan hanya kalau datanya benar-benar ada.
  const statusNaik = status === 'Tercapai' || status === 'Hampir Tercapai';
  const anggaranPctNum = angka(anggaranPct);
  if (!statusNaik && anggaranPctNum !== null && anggaranPctNum < 90) {
    bukti.push(
      `Sebagai konteks, serapan anggaran ${namaOpd || 'Perangkat Daerah'} pada tahun yang sama tercatat ${Math.round(anggaranPctNum)}%, yang dapat menjadi salah satu faktor pendukung keterbatasan pelaksanaan program terkait — bukan penyebab tunggal, karena keterkaitan langsung ke indikator ini belum tertaut per program/kegiatan di sistem.`,
    );
  }

  const gapKalimat =
    target && Number.isFinite(Number(target))
      ? `(realisasi ${fmtAngka(realisasi)} ${sat} dari target ${fmtAngka(target)} ${sat})`
      : '';

  let pembuka;
  if (status === 'Tercapai') {
    pembuka = `Indikator ${namaFmt} tercapai dengan capaian ${pct}% ${gapKalimat}.`;
  } else if (status === 'Hampir Tercapai') {
    pembuka = `Indikator ${namaFmt} hampir tercapai dengan capaian ${pct}% ${gapKalimat}.`;
  } else if (status === 'Sedang Tercapai') {
    pembuka = `Indikator ${namaFmt} berada pada capaian sedang (${pct}%) ${gapKalimat}.`;
  } else if (status === 'Kurang Tercapai') {
    pembuka = `Indikator ${namaFmt} masih kurang tercapai (${pct}%) ${gapKalimat}.`;
  } else {
    pembuka = `Indikator ${namaFmt} tidak tercapai (${pct}%) ${gapKalimat}.`;
  }

  if (bukti.length === 0) {
    // Jujur mengakui belum ada data pendukung, bukan mengarang alasan.
    const saran = statusNaik
      ? ''
      : ' Untuk analisis penyebab yang lebih tepat, lengkapi catatan/keterangan saat mengisi realisasi tahun berjalan pada menu Indikator Renstra.';
    return `${pembuka} Belum ada catatan, data tren tahun sebelumnya, atau data anggaran pendukung yang dapat dianalisis lebih lanjut untuk indikator ini.${saran}`;
  }

  return `${pembuka} ${bukti.join(' ')}`;
}

/**
 * Analisis Efisiensi per Program/Kegiatan (Bab III bagian D LAKIP) — bandingkan
 * % Capaian Kinerja (rata-rata pct_capaian indikator Kegiatan, dari hierarki Renstra
 * yang sudah dihitung di collectLakipData) terhadap % Capaian Anggaran (realisasi/
 * pagu DPA per Kegiatan, lihat query anggaranPerKegiatanRows di lakipGeneratorController.js).
 *   - Capaian Kinerja >= Capaian Anggaran → "Efisien" (kinerja tidak kalah dari serapan)
 *   - Capaian Kinerja <  Capaian Anggaran → "Kurang Efisien"
 *   - Salah satu data tidak tersedia (Kegiatan tanpa indikator, atau pagu 0/tidak
 *     ditemukan padanan DPA-nya) → "Tidak Dapat Dihitung", BUKAN NaN/Infinity/crash.
 * @param {Array<{nama_program:string, nama_kegiatan:string, pct_capaian_kinerja:number|null, pagu:number, realisasi:number}>} rows
 * @returns {Array<{nama_program:string, nama_kegiatan:string, pct_capaian_kinerja:number|null, pct_capaian_anggaran:number|null, status_efisiensi:string}>}
 */
function analisaEfisiensi(rows) {
  return (rows || []).map((r) => {
    const pctKinerja = angka(r.pct_capaian_kinerja);
    const pagu = angka(r.pagu) || 0;
    const realisasi = angka(r.realisasi) || 0;
    const pctAnggaran = pagu > 0 ? Math.round((realisasi / pagu) * 100) : null;

    let status;
    if (pctKinerja === null || pctAnggaran === null) {
      status = 'Tidak Dapat Dihitung';
    } else if (pctKinerja === 0 && pctAnggaran === 0) {
      // Kegiatan belum dilaksanakan sama sekali (0% kinerja, 0% serapan
      // anggaran) — sebelumnya lolos "Efisien" karena 0 >= 0 (Fase 13
      // FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md Poin 6, Opsi A).
      status = 'Belum Dilaksanakan';
    } else if (pctKinerja >= pctAnggaran) {
      status = 'Efisien';
    } else {
      status = 'Kurang Efisien';
    }

    return {
      nama_program: r.nama_program,
      nama_kegiatan: r.nama_kegiatan,
      pct_capaian_kinerja: pctKinerja,
      pct_capaian_anggaran: pctAnggaran,
      status_efisiensi: status,
    };
  });
}

module.exports = { statusCapaianLima, warnaStatusLima, analisaOtomatis, analisaEfisiensi };

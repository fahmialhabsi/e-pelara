'use strict';

/**
 * Import Realisasi Anggaran dari PDF "Laporan Realisasi per Sub Kegiatan" SIPD
 * (menu Penatausahaan > Statistik Belanja) ke tabel Penatausahaan — meniru pola
 * rkaImportController.js (importOneFile dipakai bersama endpoint single & batch).
 *
 * Keputusan yang sudah difinalkan (lihat catatan proyek):
 * - PDF tidak mencantumkan tahun -> wajib dikirim terpisah lewat field `tahun`.
 * - tanggal_transaksi = 31 Desember tahun ybs (placeholder akhir tahun anggaran,
 *   laporan SIPD ini tidak mencantumkan tanggal per transaksi).
 * - kode_akun = "5.1.02" (kode induk level-3, satu-satunya yg ada di KodeAkunBas
 *   utk grup ini) utk semua baris — kode rekening SIPD yg rinci (mis.
 *   5.1.02.01.01.0039) disimpan sbg prefix di kolom uraian, bukan kode_akun.
 * - jenis_transaksi baru: KKPD, UP_GU, TU, LS (persis nama kolom SIPD, terpisah
 *   dari konvensi lama mapJenisPenatausahaan yg baca kata kunci di uraian).
 */

const fs = require('fs');
const { Penatausahaan, PeriodeRpjmd, Dpa } = require('../models');
const { parseSipdRealisasiPdf } = require('../services/realisasiSipdPdfImportService');

const KODE_AKUN_BELANJA = '5.1.02';
const JENIS_TRANSAKSI_LIST = ['KKPD', 'UP_GU', 'TU', 'LS'];

async function resolvePeriodeId(tahun) {
  const rows = await PeriodeRpjmd.findAll();
  const match = rows.find(
    (p) => Number(p.tahun_awal) <= Number(tahun) && Number(tahun) <= Number(p.tahun_akhir),
  );
  return match?.id || null;
}

async function resolveDpa(kodeSubKegiatan, tahun) {
  return Dpa.findOne({
    where: { kode_sub_kegiatan: kodeSubKegiatan, tahun: String(tahun), is_active_version: true },
    order: [['id', 'DESC']],
  });
}

function buildImportTag(kodeSubKegiatan, tahun) {
  return `SIPD-REALISASI-${kodeSubKegiatan}-${tahun}`;
}

// Proses SATU berkas PDF realisasi menjadi baris-baris Penatausahaan. Dipakai
// baik oleh endpoint single (`importPdf`) maupun batch (`importPdfBatch`).
async function importOneFile(file, body, uid) {
  const tahun = String(body?.tahun || '').trim();
  if (!tahun) {
    throw Object.assign(
      new Error('Tahun anggaran wajib diisi — PDF laporan realisasi ini tidak mencantumkan tahun secara eksplisit (hanya tanggal cetak).'),
      { status: 400 },
    );
  }

  const buffer = fs.readFileSync(file.path);
  const parsed = await parseSipdRealisasiPdf(buffer);

  if (parsed._meta.baris_tidak_konsisten > 0) {
    throw Object.assign(
      new Error(
        `${parsed._meta.baris_tidak_konsisten} dari ${parsed._meta.jumlah_baris_rincian} baris rincian pada berkas ini gagal validasi silang (Sisa Pagu/SPD tidak konsisten dengan Pagu dikurangi Realisasi) — kemungkinan hasil OCR kurang akurat. Berkas TIDAK diimpor demi menjaga akurasi data keuangan. Mohon cek kualitas/resolusi berkas atau unggah ulang.`,
      ),
      { status: 422, details: parsed._meta.detail_baris_tidak_konsisten },
    );
  }

  const periode_id = await resolvePeriodeId(tahun);
  if (!periode_id) {
    throw Object.assign(
      new Error(`Tidak ditemukan Periode RPJMD yang mencakup tahun ${tahun}.`),
      { status: 400 },
    );
  }

  const dpa = await resolveDpa(parsed.kode_sub_kegiatan, tahun);
  if (!dpa) {
    throw Object.assign(
      new Error(
        `DPA untuk Sub Kegiatan "${parsed.kode_sub_kegiatan}" (${parsed.nama_sub_kegiatan}) tahun ${tahun} tidak ditemukan/belum aktif. Pastikan DPA sub kegiatan ini sudah dibuat & disetujui sebelum mengimpor realisasinya.`,
      ),
      { status: 400 },
    );
  }

  const importTag = buildImportTag(parsed.kode_sub_kegiatan, tahun);
  const sudahAda = await Penatausahaan.findOne({ where: { bukti: importTag } });
  if (sudahAda) {
    throw Object.assign(
      new Error(
        `Realisasi Sub Kegiatan "${parsed.kode_sub_kegiatan}" tahun ${tahun} sudah pernah diimpor sebelumnya (lihat data Penatausahaan dgn tag "${importTag}"). Hapus data lama dulu kalau ingin mengimpor ulang.`,
      ),
      { status: 409 },
    );
  }

  const tanggalTransaksi = `${tahun}-12-31`;
  const rowsToCreate = [];

  parsed.rincian.forEach((r) => {
    const uraianLengkap = `${r.kode_rekening} - ${r.uraian}`;

    JENIS_TRANSAKSI_LIST.forEach((jenis) => {
      const nilai = r.realisasi[jenis];
      if (!nilai || nilai <= 0) return;

      rowsToCreate.push({
        tahun,
        periode_id,
        tanggal_transaksi: tanggalTransaksi,
        uraian: uraianLengkap,
        jumlah: nilai,
        jenis_transaksi: jenis,
        bukti: importTag,
        sumber_dana: null,
        jenis_dokumen: 'Laporan Realisasi SIPD',
        dpa_id: dpa.id,
        kode_akun: KODE_AKUN_BELANJA,
      });
    });
  });

  if (!rowsToCreate.length) {
    throw Object.assign(
      new Error('Semua baris rincian pada berkas ini nilai realisasinya Rp0 — tidak ada data yang bisa diimpor ke Penatausahaan.'),
      { status: 422 },
    );
  }

  const created = await Penatausahaan.bulkCreate(rowsToCreate);

  return {
    status: 201,
    payload: {
      success: true,
      message: `Realisasi Sub Kegiatan "${parsed.kode_sub_kegiatan}" (${parsed.nama_sub_kegiatan}) tahun ${tahun} berhasil diimpor — ${created.length} baris Penatausahaan dibuat dari ${parsed._meta.jumlah_baris_rincian} baris rincian rekening.`,
      data: {
        dpa_id: dpa.id,
        kode_sub_kegiatan: parsed.kode_sub_kegiatan,
        nama_sub_kegiatan: parsed.nama_sub_kegiatan,
        tahun,
        jumlah_baris_rincian: parsed._meta.jumlah_baris_rincian,
        jumlah_penatausahaan_dibuat: created.length,
        total_pagu_terbaca: parsed._meta.total_pagu_terbaca,
      },
    },
  };
}

async function importPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Berkas PDF wajib diunggah.' });
  }

  try {
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const result = await importOneFile(req.file, req.body, uid);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.details || undefined,
    });
  }
}

async function importPdfBatch(req, res) {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ success: false, error: 'Minimal satu berkas PDF wajib diunggah.' });
  }

  const uid = req.user?.id ?? req.user?.userId ?? null;
  const results = [];

  for (const file of req.files) {
    try {
      const result = await importOneFile(file, req.body, uid);
      results.push({ filename: file.originalname, success: true, ...result.payload });
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: error.message,
        details: error.details || undefined,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return res.status(207).json({
    success: failCount === 0,
    message:
      failCount === 0
        ? `Semua ${successCount} berkas berhasil diimpor.`
        : `${successCount} dari ${results.length} berkas berhasil diimpor, ${failCount} gagal (lihat rincian per berkas).`,
    results,
  });
}

module.exports = { importPdf, importPdfBatch };

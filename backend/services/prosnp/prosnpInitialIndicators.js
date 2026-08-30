'use strict';

const db = require('../../models');

// Fallback murni jika tabel prosnp_master_indikator belum ter-seed (mis. di
// lingkungan yang belum menjalankan migrasi/seeder redesign ProSN). Dalam
// kondisi normal, initializeInitialIndicators() SELALU membaca dari
// ProsnMasterIndikator (Kepmendagri 700.1.1.4-180/2026) sebagai sumber
// kebenaran, bukan array ini.
const FALLBACK_INDICATORS = [
  { kode: 'B.1.1', nama: 'Penugasan Kepala Daerah kepada OPD', tipe_form: 'penugasan_kdh', bobot_maksimal: '2.00', urutan: 10 },
  { kode: 'B.1.2', nama: 'Koordinasi dengan Forkopimda', tipe_form: 'koordinasi_forkopimda', bobot_maksimal: '2.00', urutan: 20 },
  { kode: 'B.1.3', nama: 'Pencapaian Jumlah Cadangan Pangan Beras', tipe_form: 'cadangan_pangan_beras', bobot_maksimal: '2.50', urutan: 30 },
  { kode: 'B.1.4', nama: 'Inovasi Pengadaan/Pengelolaan Gabah-Beras dan Penyaluran CBP', tipe_form: 'inovasi_dan_perkada', bobot_maksimal: '2.00', urutan: 40 },
];

// Empat tipe form baru (register anak: surat/rapat/target-transaksi/inovasi)
// tidak memakai data_form generik untuk penilaian, sehingga required=[].
function konfigurasiFormUntuk() {
  return { required: [], fields: [], catatan: 'Data dicatat melalui register anak (lihat modul B.1.x), bukan data_form generik.' };
}

async function initializeInitialIndicators({ periode, actorId = null, transaction }) {
  const masterRows = await db.ProsnMasterIndikator.findAll({ where: { aktif: true }, order: [['urutan', 'ASC']], transaction });
  const source = masterRows.length
    ? masterRows.map((m) => ({ kode: m.kode, nama: m.nama_indikator, tipe_form: m.tipe_form, master_indikator_id: m.id, bobot_maksimal: m.bobot_maksimal, urutan: m.urutan }))
    : FALLBACK_INDICATORS;

  const rows = source.map((item) => ({
    ...item,
    konfigurasi_form: konfigurasiFormUntuk(),
    tenant_id: periode.tenant_id,
    periode_id: periode.id,
    wajib_bukti: true,
    minimum_bukti: 1,
    created_by: actorId,
    updated_by: actorId,
  }));
  await db.ProsnIndikator.bulkCreate(rows, { ignoreDuplicates: true, transaction });
  return rows.length;
}

module.exports = { FALLBACK_INDICATORS, initializeInitialIndicators };

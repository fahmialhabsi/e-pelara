'use strict';

/**
 * Rule engine generik ProSN Indicator Foundation (spek 34 §5) — EVIDENCE-DRIVEN
 * MURNI (koreksi wajib #3, CEA 2026-08-07). Dipakai lintas indikator via
 * master_indikator.kriteria_skor, TIDAK hardcode nama indikator.
 *
 * Prinsip wajib: skor TIDAK PERNAH ditentukan oleh apa yang diklaim/dideklarasikan
 * operator. Setiap tier dievaluasi INDEPENDEN dari tinggi ke rendah; tier yang
 * diberikan adalah tier PERTAMA yang evidence_kategori_wajib MILIKNYA SENDIRI
 * terbukti valid — bukan hasil "menurunkan" skor dari tier yang gagal di atasnya.
 * Tier terendah (biasanya evidence_kategori_wajib=[]) adalah lantai faktual
 * "tidak ada bukti apa pun", bukan downgrade otomatis.
 */

function semuaKategoriAda(kategoriWajib, evidenceKategoriValidSet) {
  return (kategoriWajib || []).every((k) => evidenceKategoriValidSet.has(k));
}

/**
 * MBG 2.1 (dan indikator sejenis di masa depan): klaim status tunggal,
 * skor ditentukan evidence, bukan oleh statusTerpilih.
 */
function hitungStatusTier(kriteriaSkor, evidenceKategoriValidSet) {
  const opsi = [...(kriteriaSkor.opsi_status || [])].sort((a, b) => b.skor - a.skor);
  for (const tier of opsi) {
    if (semuaKategoriAda(tier.evidence_kategori_wajib, evidenceKategoriValidSet)) {
      return {
        skor: tier.skor,
        status_terverifikasi: tier.status,
        alasan: `Tier "${tier.label || tier.status}" (skor ${tier.skor}) terbukti — evidence kategori [${(tier.evidence_kategori_wajib || []).join(', ') || 'tidak ada syarat'}] valid & terikat.`,
      };
    }
  }
  // Tidak ada tier yang lolos sama sekali (seharusnya tidak terjadi jika ada tier lantai evidence=[]).
  return { skor: 0, status_terverifikasi: null, alasan: 'Tidak ada tier yang evidence-nya terpenuhi, termasuk tier lantai — periksa konfigurasi kriteria_skor.' };
}

/**
 * MBG 2.2 (dan indikator checklist sejenis): proporsi komponen wajib yang
 * benar-benar tersedia (dicatat sbg baris terpisah, bukan diklaim bebas).
 */
function hitungChecklistProporsional(daftarKomponenTersedia, kriteriaSkor, evidenceKategoriValidSet) {
  const daftarWajib = kriteriaSkor.daftar_komponen_wajib || [];
  if (daftarWajib.length === 0) {
    return { skor: null, proporsi: null, excluded_reason: 'Daftar komponen sarpras wajib belum dikonfigurasi admin — tidak dapat dihitung.' };
  }
  const tersediaSet = new Set((daftarKomponenTersedia || []).filter((k) => k.tersedia).map((k) => k.nama_komponen));
  const jumlahTersedia = daftarWajib.filter((nama) => tersediaSet.has(nama)).length;
  const proporsi = jumlahTersedia / daftarWajib.length;

  const evidenceValid = semuaKategoriAda(kriteriaSkor.evidence_kategori_wajib, evidenceKategoriValidSet);
  if (proporsi > 0 && !evidenceValid) {
    return { skor: 0, proporsi, excluded_reason: `Komponen tercatat tersedia (${jumlahTersedia}/${daftarWajib.length}) tetapi dokumen bukti (${(kriteriaSkor.evidence_kategori_wajib || []).join(', ')}) belum valid/terikat — skor tidak diberikan tanpa bukti.` };
  }
  if (proporsi === 0) {
    return { skor: 0, proporsi, alasan: 'Tidak ada komponen wajib yang tercatat tersedia.' };
  }
  if (!evidenceValid) {
    return { skor: 0, proporsi, excluded_reason: 'Belum ada dokumen bukti inventaris sarpras yang valid.' };
  }
  const tierPenuh = (kriteriaSkor.tiers || []).find((t) => /==\s*1\b/.test(t.kondisi));
  const tierSebagian = (kriteriaSkor.tiers || []).find((t) => /0\s*<.*<\s*1/.test(t.kondisi));
  if (proporsi === 1) {
    return { skor: tierPenuh ? tierPenuh.skor : 0, proporsi, alasan: `Seluruh ${daftarWajib.length} komponen wajib tersedia & terbukti.` };
  }
  return { skor: tierSebagian ? tierSebagian.skor : 0, proporsi, alasan: `${jumlahTersedia}/${daftarWajib.length} komponen wajib tersedia & terbukti (sebagian).` };
}

/**
 * MBG 2.3: kelengkapan laporan DIHITUNG dari isi field, bukan checkbox operator
 * (koreksi #1). evidenceKategoriValidSet HARUS sudah discope ke entity_id
 * laporanTerbaru yang spesifik oleh pemanggil (LAPORAN_SATGAS_MBG), bukan
 * digabung lintas laporan bulan lain.
 */
function hitungPelaporanBerkala(laporanTerbaru, kriteriaSkor, evidenceKategoriValidSet) {
  if (!laporanTerbaru) {
    return { skor: 0, tepat_waktu: false, data_lengkap: false, alasan: 'Belum ada laporan Satgas yang disampaikan pada periode ini.' };
  }
  const tepatWaktu = !!laporanTerbaru.tanggal_lapor_aktual
    && new Date(laporanTerbaru.tanggal_lapor_aktual) <= new Date(laporanTerbaru.tanggal_wajib_lapor);
  const dataLengkap = [laporanTerbaru.rencana_kerja, laporanTerbaru.permasalahan, laporanTerbaru.hasil_identifikasi_sppg]
    .every((v) => typeof v === 'string' && v.trim().length > 0);
  const evidenceValid = semuaKategoriAda(kriteriaSkor.evidence_kategori_wajib, evidenceKategoriValidSet);

  if (tepatWaktu && dataLengkap && evidenceValid) {
    return { skor: 1.00, tepat_waktu: true, data_lengkap: true, alasan: 'Laporan disampaikan tepat waktu, data lengkap (rencana kerja, permasalahan, identifikasi SPPG), dan bukti penyampaian valid.' };
  }
  const kekurangan = [];
  if (!tepatWaktu) kekurangan.push('tidak tepat waktu');
  if (!dataLengkap) kekurangan.push('data tidak lengkap');
  if (!evidenceValid) kekurangan.push('bukti penyampaian belum valid');
  return { skor: 0.50, tepat_waktu: tepatWaktu, data_lengkap: dataLengkap, alasan: `Laporan disampaikan tetapi ${kekurangan.join(', ')}.` };
}

/**
 * MBG 2.4/2.5/2.6: capaian persentase bertingkat. Realisasi >100% (koreksi #5)
 * disimpan apa adanya di persentase_realisasi_aktual, tier dicari dgn nilai
 * dibatasi maksimum (default 100).
 */
function hitungCapaianPersentaseBertingkat(realisasi, target, kriteriaSkor, evidenceKategoriValidSet, opsi = {}) {
  if (target === null || target === undefined || Number(target) === 0) {
    return { skor: 0, persentase_realisasi_aktual: null, alasan: 'Target/sasaran belum ditetapkan — capaian tidak dapat dihitung.' };
  }
  const evidenceValid = semuaKategoriAda(kriteriaSkor.evidence_kategori_wajib, evidenceKategoriValidSet);
  if (!evidenceValid) {
    return { skor: 0, persentase_realisasi_aktual: null, excluded_reason: `Dokumen bukti (${(kriteriaSkor.evidence_kategori_wajib || []).join(', ')}) belum valid/terikat — realisasi tidak dihitung tanpa bukti.` };
  }
  const persentaseAktual = (Number(realisasi || 0) / Number(target)) * 100;
  const batasMaks = kriteriaSkor.persen_pencarian_tier_dibatasi_maks ?? 100;
  const persentaseUntukTier = Math.min(persentaseAktual, batasMaks);
  const tier = (kriteriaSkor.tiers || []).find((t) => persentaseUntukTier >= t.min_persen && persentaseUntukTier <= t.maks_persen);
  const skor = tier ? tier.skor : 0;

  const hasil = {
    skor,
    persentase_realisasi_aktual: Math.round(persentaseAktual * 100) / 100,
    alasan: `Capaian ${Math.round(persentaseAktual * 100) / 100}% (realisasi ${realisasi} / target ${target}) → skor ${skor}.`,
  };
  if (opsi.sumberDataLengkap === false) {
    hasil.peringatan_sumber_data = 'Tanggal posisi data dan/atau referensi dokumen sumber belum diisi — wajib dilengkapi sebelum status Lengkap.';
  }
  return hasil;
}

module.exports = {
  hitungStatusTier,
  hitungChecklistProporsional,
  hitungPelaporanBerkala,
  hitungCapaianPersentaseBertingkat,
};

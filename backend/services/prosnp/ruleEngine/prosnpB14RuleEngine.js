'use strict';

/**
 * Rule engine B.1.4 — Inovasi dan Perkada.
 *
 * Corrective pass "B.1.4 Regulatory Conformance" (Final Regulatory Scoring
 * Decision, disahkan Project Owner 10 Agustus 2026) — redaksi Kepmendagri
 * 700.1.1.4-180/2026 utk B.1.4 HANYA mensyaratkan 2 fakta regulatori:
 * (1) terdapat inovasi relevan; (2) inovasi tsb telah/belum ditetapkan dalam
 * Peraturan Kepala Daerah (Perkada). Redaksi TIDAK PERNAH menyebut tahap
 * implementasi (status_implementasi) maupun bukti implementasi sbg syarat
 * tier — kedua hal itu dulu dipakai sbg GERBANG SEBELUM pengecekan Perkada
 * (mandat §6.4 versi lama), yang terbukti OVER-STRICT: bisa membalik inovasi
 * yang SUDAH punya Perkada valid (tier resmi 2,00) menjadi skor 0 hanya krn
 * status_implementasi masih 'gagasan' atau bukti implementasi belum lengkap.
 * Regulatory scoring gate SEKARANG dipisahkan tegas dari internal evidence/
 * quality gate — status implementasi & bukti implementasi TETAP dihasilkan
 * di `detail` sbg `kelengkapan_internal` (auditability), TAPI TIDAK LAGI
 * menurunkan skor regulasi.
 *
 * Skor per inovasi (regulatory-only):
 *   0,00 = tidak ada inovasi relevan
 *   1,00 = terdapat inovasi relevan, Perkada belum ditetapkan/belum terbukti (dokumen valid)
 *   2,00 = terdapat inovasi relevan, Perkada telah ditetapkan DAN dokumen PERKADA valid
 * (Dokumen PERKADA tetap disyaratkan utk membuktikan FAKTA "Perkada ada" —
 * ini bukan gerbang kualitas internal, melainkan pembuktian fakta regulatori
 * dasar itu sendiri, sesuai prinsip C/E Final Regulatory Scoring Decision.)
 */

function isRelevan(inovasi) {
  // relevansi_umum: generalisasi Indicator Foundation (spek 34 §3.4, D3) dipakai
  // indikator selain Ketahanan Pangan (mis. MBG 2.7). Kolom relevansi_pengadaan/
  // pengelolaan/penyaluran TETAP khusus B.1.4, perilakunya tidak berubah.
  return Boolean(inovasi.relevansi_umum || inovasi.relevansi_pengadaan || inovasi.relevansi_pengelolaan || inovasi.relevansi_penyaluran);
}
function isDiterapkan(inovasi) {
  return inovasi.status_implementasi === 'diterapkan_sebagian' || inovasi.status_implementasi === 'diterapkan_penuh';
}

/**
 * @param {Array} inovasiList - baris prosnp_inovasi utk satu pengisian
 * @param {(inovasiId: number) => boolean} adaDokumenPerkada - PERKADA valid terikat ke inovasi ini (membuktikan fakta regulatori "Perkada ada")
 * @param {(inovasiId: number) => boolean} adaBuktiImplementasi - BUKTI_IMPLEMENTASI valid terikat ke inovasi ini (internal control/auditability, TIDAK menggerbang skor)
 */
function hitungB14(inovasiList, adaDokumenPerkada, adaBuktiImplementasi) {
  const rincian = inovasiList.map((inovasi) => {
    const relevan = isRelevan(inovasi);
    const diterapkan = isDiterapkan(inovasi);
    const perkadaDitetapkan = inovasi.status_perkada === 'ditetapkan';
    const dokumenPerkadaAda = Boolean(adaDokumenPerkada && adaDokumenPerkada(inovasi.id));
    const buktiImplementasiAda = Boolean(adaBuktiImplementasi && adaBuktiImplementasi(inovasi.id));

    let skor;
    let alasan;
    if (!relevan) {
      skor = 0.00; alasan = 'Tidak terdapat inovasi relevan dengan pengadaan/pengelolaan/penyaluran CBP.';
    } else if (perkadaDitetapkan && dokumenPerkadaAda) {
      skor = 2.00; alasan = 'Terdapat inovasi relevan dan telah ditetapkan dalam Peraturan Kepala Daerah (Perkada) dengan dokumen valid.';
    } else if (perkadaDitetapkan && !dokumenPerkadaAda) {
      skor = 1.00; alasan = 'Terdapat inovasi relevan; Perkada tercatat ditetapkan namun dokumen PERKADA belum tersedia/valid utk membuktikan fakta regulatori — skor regulasi tetap 1,00 sampai dokumen diverifikasi.';
    } else {
      skor = 1.00; alasan = 'Terdapat inovasi relevan, namun belum ditetapkan dalam Peraturan Kepala Daerah (Perkada).';
    }

    // Kelengkapan INTERNAL (auditability/quality) — TIDAK mempengaruhi skor
    // regulasi di atas (Final Regulatory Scoring Decision §6.1/§6.2).
    const kelengkapanInternal = {
      diterapkan,
      bukti_implementasi_ada: buktiImplementasiAda,
      status: !diterapkan
        ? 'gagasan_belum_diimplementasikan'
        : (buktiImplementasiAda ? 'diimplementasikan_dengan_bukti' : 'diimplementasikan_tanpa_bukti'),
    };

    return {
      id: inovasi.id, nama_inovasi: inovasi.nama_inovasi, relevan,
      perkada_ditetapkan: perkadaDitetapkan, dokumen_perkada_ada: dokumenPerkadaAda,
      skor, alasan,
      kelengkapan_internal: kelengkapanInternal,
    };
  });

  if (rincian.length === 0) {
    return { skor: 0, alasan: 'Belum ada inovasi yang dicatat.', detail: { inovasi: [] } };
  }

  const terbaik = rincian.reduce((best, cur) => (cur.skor > best.skor ? cur : best), rincian[0]);
  return {
    skor: terbaik.skor,
    alasan: `${terbaik.alasan} (berdasarkan inovasi terbaik: "${terbaik.nama_inovasi}")`,
    detail: { inovasi: rincian, inovasi_terbaik_id: terbaik.id },
  };
}

module.exports = { hitungB14, isRelevan, isDiterapkan };

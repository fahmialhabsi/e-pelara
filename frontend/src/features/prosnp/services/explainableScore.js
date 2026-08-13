/**
 * Corrective "ProSN Semester-II Readiness — Explainable Compliance" (mandat
 * §21-§26, Req J/K/L/M) — klasifikasi gap MURNI dari `skor_detail` yang SUDAH
 * dihasilkan rule engine backend (tidak pernah menghitung ulang skor/formula
 * di frontend, mandat "reuse actual rule detail"). Membedakan:
 *   REQUIREMENT_GAP  — syarat substantif (mis. frekuensi rapat) belum
 *                       terpenuhi WALAU evidence yg ada sudah lengkap.
 *   EVIDENCE_GAP      — ada record yg berpotensi memenuhi syarat tapi
 *                       bukti/kategorinya belum lengkap.
 *   VALIDATION_GAP    — evidence ada tapi belum berstatus Valid.
 *   null              — skor sudah maksimal, tidak ada gap.
 * MURNI FUNGSI, testable tanpa render. B.1.3 SENGAJA TIDAK dicakup (FUNCTIONAL
 * BASELINE FROZEN — mandat "DO NOT alter... UI behavior", modul ini tidak
 * pernah dipanggil utk tipe_form cadangan_pangan_beras).
 */

function classifyB11(detail, skor, bobotMaksimal) {
  if (skor === null || skor === undefined) return null;
  if (Number(skor) >= Number(bobotMaksimal)) return { gapType: null, summary: 'Skor maksimal tercapai.', exclusions: [], nextActions: [] };
  const total = detail?.jumlah_surat_dikeluarkan ?? 0;
  const sah = detail?.jumlah_surat_sah ?? 0;
  const bulanKosong = detail?.bulan_kosong || [];
  const exclusions = (detail?.surat_ditolak || detail?.surat_tidak_sah || []).map((s) => ({
    label: s.nomor_surat || `Surat #${s.id}`,
    reason: Array.isArray(s.alasan) ? s.alasan.join('; ') : (s.alasan || 'Tidak memenuhi syarat.'),
  }));
  if (total === 0) {
    return { gapType: 'REQUIREMENT_GAP', summary: 'Belum ada surat penugasan tercatat pada register untuk periode ini.', exclusions, nextActions: ['Menyusun dan menerbitkan surat penugasan Kepala Daerah sesuai kebutuhan periode.'] };
  }
  if (sah === 0) {
    return { gapType: 'EVIDENCE_GAP', summary: `${total} surat tercatat, namun belum ada yang memiliki bukti SURAT_PENUGASAN valid terikat langsung.`, exclusions, nextActions: ['Melengkapi bukti dokumen SURAT_PENUGASAN yang sah dan mengikatnya langsung ke surat terkait.'] };
  }
  if (bulanKosong.length > 0) {
    return { gapType: 'REQUIREMENT_GAP', summary: `${sah} dari ${total} surat sudah sah, tapi masih ada ${bulanKosong.length} bulan tanpa surat sah (${bulanKosong.join(', ')}) — evidence pada surat yang ADA sudah lengkap, kendalanya adalah frekuensi/cakupan bulanan.`, exclusions, nextActions: ['Melengkapi surat penugasan untuk bulan yang belum terdokumentasi.'] };
  }
  return { gapType: 'REQUIREMENT_GAP', summary: `${sah} dari ${total} surat sah — capaian belum mencapai tier maksimal.`, exclusions, nextActions: ['Tinjau kembali detail skor untuk syarat tier berikutnya.'] };
}

function classifyB12(detail, skor, bobotMaksimal) {
  if (skor === null || skor === undefined) return null;
  if (Number(skor) >= Number(bobotMaksimal)) return { gapType: null, summary: 'Skor maksimal tercapai.', exclusions: [], nextActions: [] };
  const sah = detail?.jumlah_rapat_sah ?? 0;
  const bulanEvaluasi = detail?.jumlah_bulan_evaluasi ?? 6;
  const frekuensi = detail?.frekuensi_rata_rata_bulanan ?? 0;
  const tidakSah = detail?.rapat_tidak_sah || [];
  const exclusions = tidakSah.map((r) => ({ label: r.nama_forum || `Rapat #${r.id}`, reason: Array.isArray(r.alasan) ? r.alasan.join('; ') : (r.alasan || 'Tidak memenuhi syarat.') }));
  const adaEvidenceGapPadaRapatTidakSah = tidakSah.some((r) => (Array.isArray(r.alasan) ? r.alasan : [r.alasan]).some((a) => String(a || '').includes('Bukti belum lengkap')));
  if (sah === 0 && tidakSah.length > 0) {
    return {
      gapType: adaEvidenceGapPadaRapatTidakSah ? 'EVIDENCE_GAP' : 'REQUIREMENT_GAP',
      summary: `${tidakSah.length} rapat tercatat, namun tidak ada yang sah — periksa alasan penolakan per rapat.`,
      exclusions, nextActions: ['Melengkapi bukti Undangan/Daftar Hadir/Notulen yang valid, atau pastikan is_forkopimda/topik sesuai.'],
    };
  }
  // Corrective §22 "1 qualifying meeting / 6 months = 0.17/month -> FREQUENCY
  // gap, NOT evidence gap" — jika rapat yg SAH (sudah lolos evidence gate)
  // tetap belum cukup memenuhi ambang frekuensi, itu murni REQUIREMENT_GAP.
  return {
    gapType: 'REQUIREMENT_GAP',
    summary: `Terdapat ${sah} rapat Forkopimda sah dalam ${bulanEvaluasi} bulan evaluasi (rata-rata ${frekuensi.toFixed ? frekuensi.toFixed(2) : frekuensi}/bulan) — evidence pada rapat yang SAH sudah lengkap; kendala saat ini adalah FREKUENSI rapat, bukan kelengkapan bukti.`,
    exclusions,
    nextActions: sah > 0
      ? ['Jadwalkan rapat koordinasi Forkopimda tambahan (dengan topik pengadaan/pengelolaan/penyaluran) untuk menaikkan frekuensi rata-rata bulanan.']
      : ['Menjadwalkan dan melaksanakan rapat koordinasi Forkopimda sesuai kebutuhan periode.'],
  };
}

function classifyB14(detail, skor, bobotMaksimal) {
  if (skor === null || skor === undefined) return null;
  if (Number(skor) >= Number(bobotMaksimal)) return { gapType: null, summary: 'Skor maksimal tercapai.', exclusions: [], nextActions: [] };
  const inovasiList = detail?.inovasi || [];
  const exclusions = inovasiList
    .filter((i) => !i?.kelengkapan_internal?.bukti_implementasi_ada || !i?.kelengkapan_internal?.dokumen_perkada_ada)
    .map((i) => ({
      label: i.nama_inovasi || `Inovasi #${i.id}`,
      reason: !i?.kelengkapan_internal?.dokumen_perkada_ada ? 'Dokumen Perkada belum tersedia/valid.' : 'Bukti implementasi belum tersedia/valid.',
    }));
  if (!inovasiList.length) {
    return { gapType: 'REQUIREMENT_GAP', summary: 'Belum ada inovasi tercatat pada register.', exclusions, nextActions: ['Mencatat inisiatif/inovasi yang relevan pada register.'] };
  }
  if (exclusions.length > 0) {
    return { gapType: 'EVIDENCE_GAP', summary: `${exclusions.length} dari ${inovasiList.length} inovasi belum memenuhi kelengkapan bukti (Perkada/implementasi) untuk skor maksimal.`, exclusions, nextActions: ['Melengkapi dokumen Perkada dan/atau bukti implementasi untuk inovasi yang belum lengkap.'] };
  }
  return { gapType: 'REQUIREMENT_GAP', summary: 'Kelengkapan bukti sudah terpenuhi — capaian dibatasi oleh tier relevansi/status implementasi saat ini.', exclusions, nextActions: ['Tinjau kembali status implementasi/relevansi inovasi untuk tier berikutnya.'] };
}

const CLASSIFY_BY_TIPE_FORM = {
  penugasan_kdh: classifyB11,
  koordinasi_forkopimda: classifyB12,
  inovasi_dan_perkada: classifyB14,
};

/**
 * @returns {null|{gapType: 'REQUIREMENT_GAP'|'EVIDENCE_GAP'|'VALIDATION_GAP'|null, summary: string, exclusions: Array<{label:string, reason:string}>, nextActions: string[]}}
 * `null` bila tipe_form tidak didukung (mis. B.1.3 — FROZEN, atau MBG — PROTECTED) atau skor belum dihitung.
 */
export function classifyScoreGap({ tipeForm, skor, bobotMaksimal, detail }) {
  const fn = CLASSIFY_BY_TIPE_FORM[tipeForm];
  if (!fn || !detail) return null;
  return fn(detail, skor, bobotMaksimal);
}

export const GAP_TYPE_LABEL = {
  REQUIREMENT_GAP: 'Kesenjangan Syarat (Requirement Gap)',
  EVIDENCE_GAP: 'Kesenjangan Bukti (Evidence Gap)',
  VALIDATION_GAP: 'Kesenjangan Verifikasi (Validation Gap)',
};

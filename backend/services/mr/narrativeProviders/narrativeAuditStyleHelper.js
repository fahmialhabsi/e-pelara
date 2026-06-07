'use strict';

const normalizeStyleProfile = () =>
  String(process.env.MR_NARRATIVE_STYLE_PROFILE || 'government_formal')
    .trim()
    .toLowerCase();

const getAuditNarrativeStyleBlock = () => {
  const profile = normalizeStyleProfile();
  const useAuditTone =
    profile === 'bpkp_bpk' ||
    profile === 'government_audit' ||
    profile === 'government_formal';

  if (!useAuditTone) {
    return '';
  }

  return `
Gaya narasi (BPKP / BPK / pengawasan pemerintah daerah):
- Bahasa Indonesia baku formal, operasional, dan dapat diaudit.
- Gunakan terminologi lazim: pengendalian, akuntabilitas kinerja, tindak lanjut, rekomendasi, temuan pemeriksaan (jika relevan), SAKIP/LAKIP, bukti dukung, koordinasi, pemantauan, evaluasi APIP.
- nama_risiko berbentuk pernyataan risiko ("Risiko ..."), bukan sekadar judul dokumen.
- Uraian memakai pola kausal: kondisi → konsekuensi jika tidak dikendalikan.
- Rekomendasi dan rencana tindak lanjut diawali kata kerja: Melakukan, Memperkuat, Menyelenggarakan, Memastikan, Meningkatkan.
- Jika fakta terbatas, gunakan hedging audit: "berdasarkan informasi yang tersedia", "berpotensi", "dapat berdampak pada".
- Larangan: bahasa promosi, klaim tanpa dasar input, angka/tanggal/instansi baru di luar input.
`.trim();
};

module.exports = {
  getAuditNarrativeStyleBlock,
  normalizeStyleProfile,
};

'use strict';

/**
 * Spesifikasi 35 v3 §16/§26 — Catatan Otomatis (Narrative Draft). Prioritas
 * RULE_ENHANCED SELALU lebih dulu (template kalimat dari field yang sudah
 * dikonfirmasi tinggi — tidak butuh LLM utk kasus umum). `narrativeProviderFactory.js`
 * existing (MR) TIDAK diubah — provider `rule_enhanced`-nya SENDIRI spesifik
 * risiko/5-Why (root cause PEOPLE/PROCESS/SYSTEM/EXTERNAL) dan TIDAK relevan
 * utk bentuk data ProSN (surat/rapat/inovasi), jadi template ProSN ditulis
 * baru di sini (bukan memanggil `buildRuleEnhancedNarrative` MR apa adanya).
 *
 * Titik integrasi Ollama (Fase 7, OD-3 RESOLVED Option A — default OFF, gate
 * `PROSNP_NARRATIVE_OLLAMA_ENABLED`) DIDOKUMENTASIKAN di sini sbg hook, TIDAK
 * diaktifkan — memanggil `narrativeProviderFactory.getNarrativeProvider('ollama')`
 * HANYA bila env eksplisit true, itu pun sbg peningkatan opsional di atas
 * draft RULE_ENHANCED yang sudah ada (tidak pernah menggantikan bila gagal).
 */
const OLLAMA_ENABLED = String(process.env.PROSNP_NARRATIVE_OLLAMA_ENABLED || '').toLowerCase() === 'true';

function fieldValue(confirmedFields, key) {
  const f = (confirmedFields || []).find((x) => x.field_key === key);
  return f && f.value !== null && f.value !== undefined ? f.value : null;
}

function cakupanKalimat(confirmedFields, prefixList) {
  const label = { pengadaan: 'pengadaan', pengelolaan: 'pengelolaan', penyaluran: 'penyaluran' };
  const aktif = Object.keys(label).filter((k) => fieldValue(confirmedFields, `${prefixList}_${k}`) === true);
  if (!aktif.length) return null;
  return aktif.map((k) => label[k]).join(', ');
}

function draftPenugasanKdh(confirmedFields) {
  const nomor = fieldValue(confirmedFields, 'nomor_surat');
  const cakupan = cakupanKalimat(confirmedFields, 'cakupan');
  const parts = [];
  if (nomor) parts.push(`Penugasan melalui Surat Nomor ${nomor}`);
  else parts.push('Penugasan kepada OPD');
  if (cakupan) parts.push(`dalam rangka ${cakupan} gabah/beras dan Cadangan Beras Pemerintah`);
  return `${parts.join(' ')}.`;
}

function draftKoordinasiForkopimda(confirmedFields) {
  const namaForum = fieldValue(confirmedFields, 'nama_forum');
  const tanggal = fieldValue(confirmedFields, 'tanggal_rapat');
  const topik = cakupanKalimat(confirmedFields, 'topik');
  const parts = [namaForum ? `Rapat koordinasi "${namaForum}"` : 'Rapat koordinasi Forkopimda'];
  if (tanggal) parts.push(`tanggal ${tanggal}`);
  if (topik) parts.push(`membahas dukungan ${topik}`);
  return `${parts.join(' ')}.`;
}

function draftInovasi(confirmedFields) {
  const nama = fieldValue(confirmedFields, 'nama_inovasi');
  const status = fieldValue(confirmedFields, 'status_perkada');
  const parts = [nama ? `Inovasi "${nama}"` : 'Inovasi pengadaan/pengelolaan gabah-beras dan penyaluran CBP'];
  if (status === 'ditetapkan') parts.push('telah ditetapkan melalui Perkada');
  return `${parts.join(' ')}.`;
}

const TEMPLATE_BY_TIPE_FORM = {
  penugasan_kdh: draftPenugasanKdh,
  koordinasi_forkopimda: draftKoordinasiForkopimda,
  inovasi_dan_perkada: draftInovasi,
};

/**
 * §16 — draft catatan otomatis. `confirmedFields` = field yang SUDAH
 * dikonfirmasi user (checkbox tercentang saat apply), BUKAN raw preview.
 * Return `null` bila tipe_form tidak punya template (mis. cadangan_pangan_beras,
 * yang catatannya tetap manual) — TIDAK memaksakan draft kosong.
 */
async function buildNarrativeDraft({ tipeForm, confirmedFields }) {
  const builder = TEMPLATE_BY_TIPE_FORM[tipeForm];
  if (!builder) return null;
  const catatan = builder(confirmedFields || []);
  if (!catatan) return null;

  // Fase 7 hook (TIDAK aktif secara default) — peningkatan opsional Ollama.
  // Kegagalan/timeout provider eksternal TIDAK PERNAH menggagalkan draft RULE_ENHANCED
  // yang sudah ada (fallback berlapis existing, §17).
  if (OLLAMA_ENABLED) {
    try {
      // eslint-disable-next-line global-require
      const { getNarrativeProvider } = require('../../../mr/narrativeProviders/narrativeProviderFactory');
      const provider = getNarrativeProvider('ollama');
      if (provider && !provider.fallback_used) {
        // Placeholder intentional: prompt ProSN spesifik belum diimplementasikan
        // (di luar scope Fase 6/7 — OD-3 Option A memutuskan Ollama tetap OFF
        // sampai ada instruksi eksplisit Project Owner terpisah).
        return { catatan, source_type: 'RULE_DERIVED', confidence: 'MEDIUM', requires_review: true };
      }
    } catch (_) {
      // Kegagalan integrasi opsional tidak pernah menggagalkan draft RULE_ENHANCED.
    }
  }

  return { catatan, source_type: 'RULE_DERIVED', confidence: 'MEDIUM', requires_review: true };
}

module.exports = { buildNarrativeDraft, OLLAMA_ENABLED };

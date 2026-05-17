"use strict";

const cleanText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const sentenceTrim = (value) => {
  const text = cleanText(value);
  if (!text) return "";
  return text.endsWith(".") ? text.slice(0, -1) : text;
};

const includesAny = (text, keywords = []) => {
  const source = String(text || "").toLowerCase();
  return keywords.some((keyword) =>
    source.includes(String(keyword || "").toLowerCase())
  );
};

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const toBulletText = (items = []) =>
  unique(items)
    .map((item) => `- ${sentenceTrim(item)}.`)
    .join("\n");

const countWords = (value) => {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const hasGenericOnlyNarrative = (value = "") => {
  const text = String(value || "").toLowerCase();

  const genericPhrases = [
    "pengendalian atas objek risiko belum sepenuhnya terdokumentasi",
    "pembagian peran, pic, dan target penyelesaian belum berjalan optimal",
    "monitoring dan bukti tindak lanjut belum sepenuhnya memadai",
    "pencapaian tujuan, kepatuhan, akuntabilitas",
  ];

  return genericPhrases.some((phrase) => text.includes(phrase));
};

const buildQualityNotes = ({ payload = {}, draft = {}, focus = [] }) => {
  const notes = [];

  if (!payload.ringkasan_temuan && !payload.kendala_pelaksanaan) {
    notes.push(
      "Input ringkasan/kendala belum lengkap sehingga draft masih membutuhkan review substantif."
    );
  }

  if (countWords(payload.ringkasan_temuan) < 20) {
    notes.push(
      "Ringkasan temuan relatif pendek sehingga kualitas inferensi penyebab, dampak, dan rencana tindak lanjut masih terbatas."
    );
  }

  if (!focus.length) {
    notes.push(
      "Fokus masalah belum terdeteksi kuat dari kata kunci input; user perlu memastikan narasi sesuai substansi dokumen."
    );
  }

  if (countWords(draft.rekomendasi) < 25) {
    notes.push("Rekomendasi masih terlalu singkat dan perlu diperkaya.");
  }

  if (hasGenericOnlyNarrative(draft.penyebab_risiko)) {
    notes.push(
      "Penyebab risiko masih mengandung pola umum; user perlu menyesuaikan dengan akar masalah riil."
    );
  }

  if (hasGenericOnlyNarrative(draft.dampak_risiko)) {
    notes.push(
      "Dampak risiko masih mengandung pola umum; user perlu menyesuaikan dengan konsekuensi riil."
    );
  }

  return unique(notes).slice(0, 6);
};

const calculateQualityConfidence = ({ payload = {}, focus = [], causes = [], impacts = [], actions = [] }) => {
  let score = 0.45;

  if (countWords(payload.ringkasan_temuan) >= 30) score += 0.08;
  if (countWords(payload.ringkasan_temuan) >= 80) score += 0.07;
  if (focus.length >= 2) score += 0.07;
  if (causes.length >= 3) score += 0.05;
  if (impacts.length >= 3) score += 0.05;
  if (actions.length >= 4) score += 0.05;
  if (payload.status_tindak_lanjut) score += 0.03;
  if (payload.unit_terkait || payload.nama_opd) score += 0.03;

  return Math.max(0.35, Math.min(0.75, Number(score.toFixed(2))));
};

const inferFocus = ({ title = "", summary = "" }) => {
  const text = `${title}\n${summary}`;
  const focus = [];

  if (
    includesAny(text, [
      "dokumen",
      "pertanggungjawaban",
      "bukti",
      "administrasi",
      "kelengkapan",
      "foto",
      "berita acara",
    ])
  ) {
    focus.push("kelengkapan dokumen pertanggungjawaban dan bukti pendukung");
  }

  if (
    includesAny(text, [
      "negosiasi",
      "ppk",
      "penyedia",
      "eo",
      "kontrak",
      "pengadaan",
      "jasa",
    ])
  ) {
    focus.push("kepatuhan proses pengadaan dan pengendalian kerja sama dengan penyedia");
  }

  if (
    includesAny(text, [
      "anggaran",
      "apbd",
      "dekonsentrasi",
      "pembiayaan",
      "biaya",
      "operasional",
    ])
  ) {
    focus.push("perencanaan pembiayaan dan dukungan anggaran");
  }

  if (
    includesAny(text, [
      "distribusi pangan",
      "kios pangan",
      "gerakan pangan murah",
      "gpm",
      "komoditas",
      "transportasi",
      "pergudangan",
      "bongkar muat",
    ])
  ) {
    focus.push("efektivitas pelaksanaan distribusi pangan dan dukungan sarana layanan");
  }

  if (
    includesAny(text, [
      "monitoring",
      "pemantauan",
      "evaluasi",
      "belum optimal",
      "tidak optimal",
      "tidak lengkap",
    ])
  ) {
    focus.push("monitoring, evaluasi, dan pengendalian tindak lanjut");
  }

  return unique(focus).slice(0, 5);
};

const inferCauses = ({ title = "", summary = "" }) => {
  const text = `${title}\n${summary}`;
  const causes = [];

  if (
    includesAny(text, [
      "dokumen",
      "pertanggungjawaban",
      "bukti",
      "foto",
      "berita acara",
    ])
  ) {
    causes.push(
      "Dokumen pertanggungjawaban dan bukti pendukung belum disiapkan secara lengkap dan terdokumentasi"
    );
  }

  if (
    includesAny(text, [
      "negosiasi",
      "ppk",
      "penyedia",
      "eo",
      "kontrak",
      "pengadaan",
    ])
  ) {
    causes.push(
      "Pengendalian proses pengadaan atau kerja sama dengan penyedia belum berjalan sesuai prinsip tertib administrasi"
    );
  }

  if (
    includesAny(text, [
      "anggaran",
      "pembiayaan",
      "biaya",
      "operasional",
      "dekonsentrasi",
      "apbd",
    ])
  ) {
    causes.push(
      "Dukungan pembiayaan, perencanaan anggaran, atau mekanisme pendanaan belum sepenuhnya memadai"
    );
  }

  if (
    includesAny(text, [
      "monitoring",
      "pemantauan",
      "evaluasi",
      "belum optimal",
      "tidak optimal",
    ])
  ) {
    causes.push(
      "Monitoring dan evaluasi pelaksanaan kegiatan atau tindak lanjut belum dilakukan secara konsisten"
    );
  }

  if (!causes.length) {
    causes.push(
      "Pengendalian atas objek risiko belum sepenuhnya terdokumentasi, terukur, dan dimonitor secara berkala"
    );
    causes.push(
      "Pembagian peran, PIC, target penyelesaian, dan bukti tindak lanjut belum sepenuhnya memadai"
    );
  }

  return unique(causes).slice(0, 5);
};

const inferImpacts = ({ title = "", summary = "" }) => {
  const text = `${title}\n${summary}`;
  const impacts = [];

  if (
    includesAny(text, [
      "pertanggungjawaban",
      "dokumen",
      "bukti",
      "administrasi",
    ])
  ) {
    impacts.push(
      "Akuntabilitas pertanggungjawaban kegiatan berpotensi tidak dapat diyakini secara memadai"
    );
  }

  if (
    includesAny(text, [
      "pengadaan",
      "penyedia",
      "kontrak",
      "negosiasi",
      "ppk",
    ])
  ) {
    impacts.push(
      "Kepatuhan terhadap proses pengadaan dan pengendalian pelaksanaan pekerjaan berpotensi dipertanyakan"
    );
  }

  if (
    includesAny(text, [
      "anggaran",
      "biaya",
      "pembiayaan",
      "operasional",
    ])
  ) {
    impacts.push(
      "Keterlambatan atau ketidaktepatan pemanfaatan anggaran dapat menghambat pencapaian output kegiatan"
    );
  }

  if (
    includesAny(text, [
      "distribusi pangan",
      "gpm",
      "gerakan pangan murah",
      "kios pangan",
      "komoditas",
      "transportasi",
    ])
  ) {
    impacts.push(
      "Efektivitas layanan distribusi pangan kepada masyarakat berpotensi tidak tercapai secara optimal"
    );
  }

  if (
    includesAny(text, [
      "monitoring",
      "tindak lanjut",
      "belum optimal",
    ])
  ) {
    impacts.push(
      "Tindak lanjut berpotensi terlambat, tidak lengkap, atau tidak menyelesaikan akar permasalahan"
    );
  }

  if (!impacts.length) {
    impacts.push(
      "Pencapaian tujuan, kepatuhan, akuntabilitas, dan kualitas pelaksanaan tugas perangkat daerah dapat menurun"
    );
    impacts.push(
      "Permasalahan berpotensi berulang karena pengendalian dan monitoring belum memadai"
    );
  }

  return unique(impacts).slice(0, 5);
};

const inferActions = ({ title = "", summary = "", unit = "" }) => {
  const text = `${title}\n${summary}`;
  const actions = [];

  if (
    includesAny(text, [
      "dokumen",
      "bukti",
      "pertanggungjawaban",
      "foto",
      "berita acara",
    ])
  ) {
    actions.push(
      "Melengkapi dokumen pertanggungjawaban, bukti pendukung, berita acara, dan dokumentasi pelaksanaan secara tertib"
    );
  }

  if (
    includesAny(text, [
      "negosiasi",
      "ppk",
      "penyedia",
      "eo",
      "kontrak",
      "pengadaan",
    ])
  ) {
    actions.push(
      "Menertibkan proses pengadaan atau kerja sama, termasuk dokumentasi negosiasi, penetapan tanggung jawab, dan verifikasi hasil pekerjaan"
    );
  }

  if (
    includesAny(text, [
      "anggaran",
      "pembiayaan",
      "biaya",
      "operasional",
      "dekonsentrasi",
      "apbd",
    ])
  ) {
    actions.push(
      "Menyusun rencana pembiayaan dan kebutuhan anggaran secara realistis sesuai prioritas risiko dan ketentuan yang berlaku"
    );
  }

  if (
    includesAny(text, [
      "distribusi pangan",
      "gpm",
      "gerakan pangan murah",
      "kios pangan",
      "komoditas",
      "transportasi",
      "pergudangan",
    ])
  ) {
    actions.push(
      "Memperkuat koordinasi pelaksanaan distribusi pangan, dukungan sarana, fasilitasi distribusi, dan pemantauan capaian layanan"
    );
  }

  actions.push(
    `Menetapkan PIC pada ${unit || "unit terkait"}, target penyelesaian, bukti dukung, dan jadwal monitoring berkala`
  );

  return unique(actions).slice(0, 6);
};

const buildRuleEnhancedNarrative = async ({ payload = {} } = {}) => {
  const sourceType = String(payload.proposal_source_type || "").toUpperCase();

  const title =
    cleanText(payload.judul_temuan) ||
    cleanText(payload.nama_kegiatan) ||
    cleanText(payload.akun_pos) ||
    cleanText(payload.jenis_dokumen_pertanggungjawaban) ||
    cleanText(payload.nama_kategori_baru) ||
    "objek risiko yang diusulkan";

  const summary =
    cleanText(payload.ringkasan_temuan) ||
    cleanText(payload.kendala_pelaksanaan) ||
    cleanText(payload.catatan_koreksi) ||
    cleanText(payload.deskripsi_kategori_baru) ||
    cleanText(payload.contoh_sumber_risiko);

  const unit =
    cleanText(payload.unit_terkait) ||
    cleanText(payload.nama_opd) ||
    "unit terkait";

  const periode = cleanText(payload.periode_label) || "periode berjalan";
  const objekRisiko = sentenceTrim(title);

  const sourceLabelMap = {
    TINDAK_LANJUT_BPK: "temuan pemeriksaan BPK",
    TINDAK_LANJUT_INSPEKTORAT: "hasil pemeriksaan/pengawasan Inspektorat",
    LAKIP: "evaluasi kinerja/LAKIP",
    LAPORAN_KEUANGAN: "laporan keuangan",
    PELAKSANAAN_KEGIATAN: "pelaksanaan kegiatan",
    PERTANGGUNGJAWABAN_KEUANGAN: "pertanggungjawaban keuangan",
    SPIP_E_SIGAP: "data SPIP/e-SIGAP",
    MANUAL_ADHOC: "usulan manual/adhoc",
    LAINNYA: "usulan kategori baru",
  };

  const sourceLabel = sourceLabelMap[sourceType] || "usulan risiko";
  const focus = inferFocus({ title, summary });
  const causes = inferCauses({ title, summary });
  const impacts = inferImpacts({ title, summary });
  const actions = inferActions({ title, summary, unit });

  const focusClause = focus.length
    ? ` Fokus pengendalian diarahkan pada ${focus.join("; ")}.`
    : "";

  const statusClause = payload.status_tindak_lanjut
    ? ` Status tindak lanjut saat ini adalah ${String(
        payload.status_tindak_lanjut
      ).replace(/_/g, " ")}.`
    : "";

  const recommendationActionClause = actions.length
    ? ` Rencana tindak lanjut utama diarahkan untuk ${actions
        .slice(0, 4)
        .map((item) => sentenceTrim(item).toLowerCase())
        .join("; ")}.`
    : "";

  const draft = {
    rekomendasi: `Menindaklanjuti ${sourceLabel} terkait ${objekRisiko} secara terukur, rasional, dan dapat dipertanggungjawabkan.${statusClause}${focusClause}${recommendationActionClause} Setiap tindak lanjut perlu dilengkapi dengan PIC, target penyelesaian, bukti dukung, dan monitoring berkala sampai risiko terkendali.`,
    objek_risiko: objekRisiko,
    nama_risiko: `Risiko ketidakmemadaian pengendalian atas ${objekRisiko}.`,
    uraian_risiko: `Terdapat risiko bahwa ${objekRisiko} belum dikelola secara memadai pada ${periode}, sehingga dapat memengaruhi pencapaian tujuan, kepatuhan, akuntabilitas, efektivitas pelaksanaan kegiatan, serta kualitas layanan perangkat daerah.`,
    penyebab_risiko: toBulletText(causes),
    dampak_risiko: toBulletText(impacts),
    rencana_tindak_lanjut_awal: toBulletText(actions),
    pic: unit,
    target_waktu: "",
    catatan:
      "Draft ini dihasilkan oleh provider rule_enhanced berbasis aturan/kata kunci. User tetap wajib melakukan review substantif sebelum menyimpan.",
    confidence: calculateQualityConfidence({
      payload,
      focus,
      causes,
      impacts,
      actions,
    }),
    needs_user_review: true,
    basis_ringkasan: unique([
      `Sumber usulan risiko: ${sourceLabel}.`,
      payload.nomor_temuan ? `Nomor/dokumen: ${payload.nomor_temuan}.` : null,
      payload.tahun_pemeriksaan
        ? `Tahun pemeriksaan: ${payload.tahun_pemeriksaan}.`
        : null,
      `Objek utama: ${objekRisiko}.`,
      focus.length ? `Fokus masalah: ${focus.join("; ")}.` : null,
      "User wajib melakukan review dan penyesuaian sebelum menyimpan.",
    ]),
  };

  const qualityNotes = buildQualityNotes({
    payload,
    draft,
    focus,
  });

  if (qualityNotes.length > 0) {
    draft.basis_ringkasan = unique([
      ...draft.basis_ringkasan,
      ...qualityNotes.map((item) => `Quality guard: ${item}`),
    ]).slice(0, 10);

    draft.catatan = `${draft.catatan}\n${qualityNotes
      .map((item) => `- ${item}`)
      .join("\n")}`;
  }

  return draft;
};

module.exports = {
  providerName: "rule_enhanced",
  buildRuleEnhancedNarrative,
};
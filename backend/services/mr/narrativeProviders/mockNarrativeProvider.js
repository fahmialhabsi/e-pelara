"use strict";

const cleanText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildMockNarrative = async ({ payload = {} } = {}) => {
  const title =
    cleanText(payload.judul_temuan) ||
    cleanText(payload.nama_kegiatan) ||
    cleanText(payload.akun_pos) ||
    cleanText(payload.jenis_dokumen_pertanggungjawaban) ||
    cleanText(payload.nama_kategori_baru) ||
    "objek risiko yang diusulkan";

  const unit =
    cleanText(payload.unit_terkait) ||
    cleanText(payload.nama_opd) ||
    "unit terkait";

  const periode = cleanText(payload.periode_label) || "periode berjalan";

  return {
    rekomendasi: `Menyusun tindak lanjut atas ${title} secara terukur melalui penetapan rencana aksi, PIC, target waktu, bukti pendukung, dan monitoring berkala. Draft ini masih perlu direview karena provider AI belum diaktifkan.`,
    objek_risiko: title,
    nama_risiko: `Risiko ketidakmemadaian pengendalian atas ${title}.`,
    uraian_risiko: `Terdapat risiko bahwa ${title} belum dikelola secara memadai pada ${periode}, sehingga dapat memengaruhi pencapaian tujuan, kepatuhan, akuntabilitas, dan kualitas pelaksanaan tugas perangkat daerah.`,
    penyebab_risiko: [
      "- Pengendalian atas objek risiko belum sepenuhnya terdokumentasi dan terukur;",
      "- Pembagian peran, PIC, dan target penyelesaian belum berjalan optimal;",
      "- Monitoring dan bukti tindak lanjut belum sepenuhnya memadai.",
    ].join("\n"),
    dampak_risiko: [
      "- Tindak lanjut berpotensi terlambat atau tidak selesai sesuai target;",
      "- Temuan atau permasalahan berpotensi berulang;",
      "- Akuntabilitas pelaksanaan tugas perangkat daerah dapat menurun.",
    ].join("\n"),
    rencana_tindak_lanjut_awal: [
      `- Menetapkan PIC pada ${unit};`,
      "- Menyusun rencana aksi dan target waktu penyelesaian;",
      "- Melengkapi dokumen pendukung dan bukti tindak lanjut;",
      "- Melakukan monitoring progres secara berkala sampai risiko terkendali.",
    ].join("\n"),
    pic: unit,
    target_waktu: cleanText(payload.target_waktu) || "",
    // PENTING: field ini masuk permanen ke laporan resmi (RiskAnalysis.
    // analysis_note, Lampiran 2B1 "Catatan Analisis") — WAJIB substantif,
    // bukan disclaimer proses/provider.
    catatan: `Analisis risiko didasarkan pada data terkait ${title}. Perlu koordinasi dengan pihak terkait, kelengkapan bukti dukung, dan pemutakhiran data secara berkala untuk memastikan validitas penilaian.`,
    // Rantai 5-Why saling merujuk (bukan 5 kalimat lepas) — lihat buildRcaFields
    // di ruleEnhancedNarrativeProvider.js utk pola & alasan yang sama.
    why_1: `Akar penyebab risiko dari Risiko ketidakmemadaian pengendalian atas ${title}, karena adanya pengendalian yang belum sepenuhnya terdokumentasi dan terukur.`,
    why_2: "Mengapa pengendalian yang belum sepenuhnya terdokumentasi dan terukur bisa terjadi, karena adanya pembagian peran, PIC, dan target penyelesaian yang belum berjalan optimal.",
    why_3: "Mengapa pembagian peran, PIC, dan target penyelesaian yang belum berjalan optimal bisa terjadi, karena monitoring dan verifikasi bukti tindak lanjut belum dilakukan secara berkala.",
    why_4: "Mengapa monitoring dan verifikasi bukti tindak lanjut belum dilakukan secara berkala bisa terjadi, karena keterbatasan sumber daya (SDM, anggaran, atau sarana pendukung) menghambat penguatan pengendalian.",
    why_5: "Mengapa keterbatasan sumber daya menghambat penguatan pengendalian bisa terjadi, karena belum ada evaluasi sistemik di tingkat perangkat daerah atas akar permasalahan ini, sehingga risiko berpotensi berulang.",
    kategori_penyebab_kode: "PROCESS",
    dampak_area_kode: "KINERJA",
    confidence: 0.25,
    needs_user_review: true,
    basis_ringkasan: [
      "Provider mock belum melakukan analisis substansi mendalam.",
      "User wajib melakukan review dan penyesuaian sebelum menyimpan.",
    ],
  };
};

module.exports = {
  providerName: "mock",
  buildMockNarrative,
};
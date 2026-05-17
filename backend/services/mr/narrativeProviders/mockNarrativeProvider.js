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
    catatan:
      "Draft ini dihasilkan oleh provider mock untuk pengujian kontrak endpoint. Aktifkan provider AI atau rule-enhanced agar narasi lebih substantif dan sesuai ringkasan.",
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
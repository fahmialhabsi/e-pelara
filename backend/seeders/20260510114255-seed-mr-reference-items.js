"use strict";

/**
 * Seeder Final MR Reference Items
 *
 * PHASE 4 — STEP 10B-2
 *
 * Tujuan:
 * - Mengisi item referensi MR berdasarkan group.
 * - Menjadi sumber dropdown/ENUM backend.
 * - Menjadi fondasi untuk seed-mr-risk-matrix.
 *
 * Guard:
 * - Tidak hardcode group_id.
 * - Lookup group_id berdasarkan kode_group.
 * - Idempotent.
 * - Tidak duplicate kode_item dalam group yang sama.
 * - Jika item sudah ada, update field aman.
 * - Tidak membuat risk_matrix.
 * - Tidak membuat data transaksi MR.
 */

const TABLE_NAME = "mr_reference_items";
const GROUP_TABLE = "mr_reference_groups";
const NOW_LITERAL = "CURRENT_TIMESTAMP";

const REFERENCE_ITEMS = [
  // =====================================================
  // LIKELIHOOD
  // =====================================================
  {
    kode_group: "LIKELIHOOD",
    kode_item: "L1",
    nama_item: "Sangat Rendah",
    deskripsi: "Kemungkinan risiko sangat rendah.",
    nilai_numeric: 1,
    nilai_text: "sangat_rendah",
    warna: "#22c55e",
    icon: "likelihood-lowest",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "LIKELIHOOD",
    kode_item: "L2",
    nama_item: "Rendah",
    deskripsi: "Kemungkinan risiko rendah.",
    nilai_numeric: 2,
    nilai_text: "rendah",
    warna: "#84cc16",
    icon: "likelihood-low",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "LIKELIHOOD",
    kode_item: "L3",
    nama_item: "Sedang",
    deskripsi: "Kemungkinan risiko sedang.",
    nilai_numeric: 3,
    nilai_text: "sedang",
    warna: "#eab308",
    icon: "likelihood-medium",
    urutan: 30,
    is_default: true,
  },
  {
    kode_group: "LIKELIHOOD",
    kode_item: "L4",
    nama_item: "Tinggi",
    deskripsi: "Kemungkinan risiko tinggi.",
    nilai_numeric: 4,
    nilai_text: "tinggi",
    warna: "#f97316",
    icon: "likelihood-high",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "LIKELIHOOD",
    kode_item: "L5",
    nama_item: "Sangat Tinggi",
    deskripsi: "Kemungkinan risiko sangat tinggi.",
    nilai_numeric: 5,
    nilai_text: "sangat_tinggi",
    warna: "#ef4444",
    icon: "likelihood-highest",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // IMPACT
  // =====================================================
  {
    kode_group: "IMPACT",
    kode_item: "I1",
    nama_item: "Sangat Rendah",
    deskripsi: "Dampak risiko sangat rendah.",
    nilai_numeric: 1,
    nilai_text: "sangat_rendah",
    warna: "#22c55e",
    icon: "impact-lowest",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "IMPACT",
    kode_item: "I2",
    nama_item: "Rendah",
    deskripsi: "Dampak risiko rendah.",
    nilai_numeric: 2,
    nilai_text: "rendah",
    warna: "#84cc16",
    icon: "impact-low",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "IMPACT",
    kode_item: "I3",
    nama_item: "Sedang",
    deskripsi: "Dampak risiko sedang.",
    nilai_numeric: 3,
    nilai_text: "sedang",
    warna: "#eab308",
    icon: "impact-medium",
    urutan: 30,
    is_default: true,
  },
  {
    kode_group: "IMPACT",
    kode_item: "I4",
    nama_item: "Tinggi",
    deskripsi: "Dampak risiko tinggi.",
    nilai_numeric: 4,
    nilai_text: "tinggi",
    warna: "#f97316",
    icon: "impact-high",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "IMPACT",
    kode_item: "I5",
    nama_item: "Sangat Tinggi",
    deskripsi: "Dampak risiko sangat tinggi.",
    nilai_numeric: 5,
    nilai_text: "sangat_tinggi",
    warna: "#ef4444",
    icon: "impact-highest",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // RISK_LEVEL
  // =====================================================
  {
    kode_group: "RISK_LEVEL",
    kode_item: "LOW",
    nama_item: "Rendah",
    deskripsi: "Level risiko rendah.",
    nilai_numeric: 1,
    nilai_text: "rendah",
    warna: "#22c55e",
    icon: "risk-low",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "RISK_LEVEL",
    kode_item: "MEDIUM",
    nama_item: "Sedang",
    deskripsi: "Level risiko sedang.",
    nilai_numeric: 2,
    nilai_text: "sedang",
    warna: "#eab308",
    icon: "risk-medium",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "RISK_LEVEL",
    kode_item: "HIGH",
    nama_item: "Tinggi",
    deskripsi: "Level risiko tinggi.",
    nilai_numeric: 3,
    nilai_text: "tinggi",
    warna: "#f97316",
    icon: "risk-high",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "RISK_LEVEL",
    kode_item: "EXTREME",
    nama_item: "Ekstrem",
    deskripsi: "Level risiko ekstrem.",
    nilai_numeric: 4,
    nilai_text: "ekstrem",
    warna: "#ef4444",
    icon: "risk-extreme",
    urutan: 40,
    is_default: false,
  },

  // =====================================================
  // RISK_CATEGORY
  // =====================================================
  {
    kode_group: "RISK_CATEGORY",
    kode_item: "STRATEGIC",
    nama_item: "Strategis",
    deskripsi: "Risiko terkait arah kebijakan, sasaran strategis, dan capaian jangka menengah.",
    nilai_text: "strategis",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "RISK_CATEGORY",
    kode_item: "OPERATIONAL",
    nama_item: "Operasional",
    deskripsi: "Risiko terkait proses kerja, pelaksanaan kegiatan, dan operasional layanan.",
    nilai_text: "operasional",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "RISK_CATEGORY",
    kode_item: "FINANCIAL",
    nama_item: "Keuangan",
    deskripsi: "Risiko terkait anggaran, pagu, realisasi, dan pengelolaan keuangan.",
    nilai_text: "keuangan",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "RISK_CATEGORY",
    kode_item: "COMPLIANCE",
    nama_item: "Kepatuhan",
    deskripsi: "Risiko terkait kepatuhan terhadap aturan, standar, dan regulasi.",
    nilai_text: "kepatuhan",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "RISK_CATEGORY",
    kode_item: "PERFORMANCE",
    nama_item: "Kinerja",
    deskripsi: "Risiko terkait pencapaian target indikator kinerja.",
    nilai_text: "kinerja",
    urutan: 50,
    is_default: true,
  },

  // =====================================================
  // RISK_SOURCE
  // =====================================================
  {
    kode_group: "RISK_SOURCE",
    kode_item: "INTERNAL",
    nama_item: "Internal",
    deskripsi: "Risiko yang bersumber dari faktor internal organisasi.",
    nilai_text: "internal",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "RISK_SOURCE",
    kode_item: "EXTERNAL",
    nama_item: "Eksternal",
    deskripsi: "Risiko yang bersumber dari faktor eksternal organisasi.",
    nilai_text: "eksternal",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "RISK_SOURCE",
    kode_item: "PLANNING",
    nama_item: "Perencanaan",
    deskripsi: "Risiko yang bersumber dari proses perencanaan.",
    nilai_text: "perencanaan",
    urutan: 30,
    is_default: true,
  },
  {
    kode_group: "RISK_SOURCE",
    kode_item: "BUDGETING",
    nama_item: "Penganggaran",
    deskripsi: "Risiko yang bersumber dari proses penganggaran.",
    nilai_text: "penganggaran",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "RISK_SOURCE",
    kode_item: "IMPLEMENTATION",
    nama_item: "Pelaksanaan",
    deskripsi: "Risiko yang bersumber dari pelaksanaan program/kegiatan.",
    nilai_text: "pelaksanaan",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // RISK_APPETITE
  // =====================================================
  {
    kode_group: "RISK_APPETITE",
    kode_item: "LOW",
    nama_item: "Rendah",
    deskripsi: "Selera risiko rendah.",
    nilai_numeric: 4,
    nilai_text: "rendah",
    warna: "#22c55e",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "RISK_APPETITE",
    kode_item: "MEDIUM",
    nama_item: "Sedang",
    deskripsi: "Selera risiko sedang.",
    nilai_numeric: 9,
    nilai_text: "sedang",
    warna: "#eab308",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "RISK_APPETITE",
    kode_item: "HIGH",
    nama_item: "Tinggi",
    deskripsi: "Selera risiko tinggi.",
    nilai_numeric: 16,
    nilai_text: "tinggi",
    warna: "#f97316",
    urutan: 30,
    is_default: false,
  },

  // =====================================================
  // IMPACT_AREA
  // =====================================================
  {
    kode_group: "IMPACT_AREA",
    kode_item: "PERFORMANCE_TARGET",
    nama_item: "Kinerja / Capaian Target",
    deskripsi:
      "Dampak risiko terhadap pencapaian target, indikator kinerja, sasaran, program, kegiatan, atau sub kegiatan.",
    nilai_text: "kinerja_capaian_target",
    urutan: 10,
    is_default: true,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "FINANCE_BUDGET",
    nama_item: "Keuangan / Anggaran",
    deskripsi:
      "Dampak risiko terhadap pagu, realisasi, efisiensi anggaran, pertanggungjawaban, atau pengelolaan keuangan.",
    nilai_text: "keuangan_anggaran",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "COMPLIANCE_REGULATION",
    nama_item: "Kepatuhan / Regulasi",
    deskripsi:
      "Dampak risiko terhadap kepatuhan peraturan, standar, pedoman, prosedur, atau ketentuan pengawasan.",
    nilai_text: "kepatuhan_regulasi",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "OPERATIONAL_SERVICE",
    nama_item: "Operasional / Layanan",
    deskripsi:
      "Dampak risiko terhadap proses kerja, layanan perangkat daerah, koordinasi pelaksanaan, atau operasional kegiatan.",
    nilai_text: "operasional_layanan",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "REPUTATION_PUBLIC_TRUST",
    nama_item: "Reputasi / Kepercayaan Publik",
    deskripsi:
      "Dampak risiko terhadap reputasi perangkat daerah, kepercayaan publik, kredibilitas, atau persepsi stakeholder.",
    nilai_text: "reputasi_kepercayaan_publik",
    urutan: 50,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "ASSET_INFRASTRUCTURE",
    nama_item: "Aset / Infrastruktur",
    deskripsi:
      "Dampak risiko terhadap aset, sarana prasarana, infrastruktur pendukung, atau fasilitas layanan.",
    nilai_text: "aset_infrastruktur",
    urutan: 60,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "HUMAN_RESOURCE_ORGANIZATION",
    nama_item: "SDM / Organisasi",
    deskripsi:
      "Dampak risiko terhadap kapasitas SDM, pembagian peran, organisasi, kompetensi, atau beban kerja.",
    nilai_text: "sdm_organisasi",
    urutan: 70,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "DATA_INFORMATION_SYSTEM",
    nama_item: "Data / Sistem Informasi",
    deskripsi:
      "Dampak risiko terhadap kualitas data, integrasi sistem, keamanan informasi, aplikasi, atau ketersediaan informasi.",
    nilai_text: "data_sistem_informasi",
    urutan: 80,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "SPIP_INTERNAL_CONTROL",
    nama_item: "SPIP / Pengendalian Internal",
    deskripsi:
      "Dampak risiko terhadap unsur SPIP, pengendalian internal, RTP, monitoring pengendalian, atau keterhubungan e-SIGAP.",
    nilai_text: "spip_pengendalian_internal",
    urutan: 90,
    is_default: false,
  },
  {
    kode_group: "IMPACT_AREA",
    kode_item: "ACCOUNTABILITY_REPORTING",
    nama_item: "Akuntabilitas / Pelaporan",
    deskripsi:
      "Dampak risiko terhadap laporan kinerja, laporan manajemen risiko, akuntabilitas, evaluasi, atau pelaporan pimpinan.",
    nilai_text: "akuntabilitas_pelaporan",
    urutan: 100,
    is_default: false,
  },

  // =====================================================
  // RISK_STATUS
  // =====================================================
  {
    kode_group: "RISK_STATUS",
    kode_item: "ACTIVE",
    nama_item: "Aktif",
    deskripsi: "Risiko masih aktif dan perlu dipantau.",
    nilai_text: "aktif",
    urutan: 10,
    is_default: true,
  },
  {
    kode_group: "RISK_STATUS",
    kode_item: "INACTIVE",
    nama_item: "Tidak Aktif",
    deskripsi: "Risiko tidak aktif.",
    nilai_text: "tidak_aktif",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "RISK_STATUS",
    kode_item: "CLOSED",
    nama_item: "Ditutup",
    deskripsi: "Risiko telah ditutup.",
    nilai_text: "ditutup",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "RISK_STATUS",
    kode_item: "MONITORED",
    nama_item: "Dipantau",
    deskripsi: "Risiko berada dalam status pemantauan.",
    nilai_text: "dipantau",
    urutan: 40,
    is_default: false,
  },

  // =====================================================
  // MITIGATION_RESPONSE
  // =====================================================
  {
    kode_group: "MITIGATION_RESPONSE",
    kode_item: "ACCEPT",
    nama_item: "Menerima Risiko",
    deskripsi: "Risiko diterima dengan pemantauan.",
    nilai_text: "accept",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "MITIGATION_RESPONSE",
    kode_item: "REDUCE",
    nama_item: "Mengurangi Risiko",
    deskripsi: "Risiko dikurangi melalui tindakan mitigasi.",
    nilai_text: "reduce",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "MITIGATION_RESPONSE",
    kode_item: "AVOID",
    nama_item: "Menghindari Risiko",
    deskripsi: "Risiko dihindari dengan perubahan strategi/kegiatan.",
    nilai_text: "avoid",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "MITIGATION_RESPONSE",
    kode_item: "TRANSFER",
    nama_item: "Mentransfer Risiko",
    deskripsi: "Risiko dialihkan kepada pihak lain sesuai mekanisme yang sah.",
    nilai_text: "transfer",
    urutan: 40,
    is_default: false,
  },

  // =====================================================
  // CONTROL_EFFECTIVENESS
  // =====================================================
  {
    kode_group: "CONTROL_EFFECTIVENESS",
    kode_item: "EFFECTIVE",
    nama_item: "Efektif",
    deskripsi: "Pengendalian berjalan efektif.",
    nilai_text: "efektif",
    warna: "#22c55e",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "CONTROL_EFFECTIVENESS",
    kode_item: "PARTIAL",
    nama_item: "Sebagian Efektif",
    deskripsi: "Pengendalian berjalan sebagian efektif.",
    nilai_text: "sebagian_efektif",
    warna: "#eab308",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "CONTROL_EFFECTIVENESS",
    kode_item: "NOT_EFFECTIVE",
    nama_item: "Tidak Efektif",
    deskripsi: "Pengendalian tidak berjalan efektif.",
    nilai_text: "tidak_efektif",
    warna: "#ef4444",
    urutan: 30,
    is_default: false,
  },

  // =====================================================
  // WARNING_SEVERITY
  // =====================================================
  {
    kode_group: "WARNING_SEVERITY",
    kode_item: "INFO",
    nama_item: "Informasi",
    deskripsi: "Peringatan risiko bersifat informasi.",
    nilai_numeric: 1,
    nilai_text: "info",
    warna: "#3b82f6",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "WARNING_SEVERITY",
    kode_item: "WARNING",
    nama_item: "Peringatan",
    deskripsi: "Peringatan risiko perlu perhatian.",
    nilai_numeric: 2,
    nilai_text: "warning",
    warna: "#eab308",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "WARNING_SEVERITY",
    kode_item: "CRITICAL",
    nama_item: "Kritis",
    deskripsi: "Peringatan risiko bersifat kritis.",
    nilai_numeric: 3,
    nilai_text: "critical",
    warna: "#ef4444",
    urutan: 30,
    is_default: false,
  },

  // =====================================================
  // DEVIATION_SEVERITY
  // =====================================================
  {
    kode_group: "DEVIATION_SEVERITY",
    kode_item: "MINOR",
    nama_item: "Ringan",
    deskripsi: "Deviasi ringan.",
    nilai_numeric: 1,
    nilai_text: "minor",
    warna: "#22c55e",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "DEVIATION_SEVERITY",
    kode_item: "MODERATE",
    nama_item: "Sedang",
    deskripsi: "Deviasi sedang.",
    nilai_numeric: 2,
    nilai_text: "moderate",
    warna: "#eab308",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "DEVIATION_SEVERITY",
    kode_item: "MAJOR",
    nama_item: "Berat",
    deskripsi: "Deviasi berat.",
    nilai_numeric: 3,
    nilai_text: "major",
    warna: "#ef4444",
    urutan: 30,
    is_default: false,
  },

  // =====================================================
  // PERIODE_TYPE
  // =====================================================
  {
    kode_group: "PERIODE_TYPE",
    kode_item: "BULANAN",
    nama_item: "Bulanan",
    deskripsi: "Periode MR bulanan.",
    nilai_text: "bulanan",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "PERIODE_TYPE",
    kode_item: "TRIWULAN",
    nama_item: "Triwulan",
    deskripsi: "Periode MR triwulan.",
    nilai_text: "triwulan",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "PERIODE_TYPE",
    kode_item: "SEMESTER",
    nama_item: "Semester",
    deskripsi: "Periode MR semester.",
    nilai_text: "semester",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "PERIODE_TYPE",
    kode_item: "TAHUNAN",
    nama_item: "Tahunan",
    deskripsi: "Periode MR tahunan.",
    nilai_text: "tahunan",
    urutan: 40,
    is_default: true,
  },
  {
    kode_group: "PERIODE_TYPE",
    kode_item: "ADHOC",
    nama_item: "Adhoc",
    deskripsi: "Periode MR adhoc.",
    nilai_text: "adhoc",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // CONTEXT_TYPE
  // =====================================================
  {
    kode_group: "CONTEXT_TYPE",
    kode_item: "RENSTRA_TUJUAN",
    nama_item: "Renstra Tujuan",
    deskripsi: "Konteks MR dari tujuan Renstra.",
    nilai_text: "renstra_tujuan",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "CONTEXT_TYPE",
    kode_item: "RENSTRA_SASARAN",
    nama_item: "Renstra Sasaran",
    deskripsi: "Konteks MR dari sasaran Renstra.",
    nilai_text: "renstra_sasaran",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "CONTEXT_TYPE",
    kode_item: "RENSTRA_PROGRAM",
    nama_item: "Renstra Program",
    deskripsi: "Konteks MR dari program Renstra.",
    nilai_text: "renstra_program",
    urutan: 30,
    is_default: true,
  },
  {
    kode_group: "CONTEXT_TYPE",
    kode_item: "RENSTRA_KEGIATAN",
    nama_item: "Renstra Kegiatan",
    deskripsi: "Konteks MR dari kegiatan Renstra.",
    nilai_text: "renstra_kegiatan",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "CONTEXT_TYPE",
    kode_item: "RENSTRA_SUB_KEGIATAN",
    nama_item: "Renstra Sub Kegiatan",
    deskripsi: "Konteks MR dari sub kegiatan Renstra.",
    nilai_text: "renstra_sub_kegiatan",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // ROOT_CAUSE_CATEGORY
  // =====================================================
  {
    kode_group: "ROOT_CAUSE_CATEGORY",
    kode_item: "PEOPLE",
    nama_item: "SDM",
    deskripsi: "Akar penyebab terkait sumber daya manusia.",
    nilai_text: "people",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "ROOT_CAUSE_CATEGORY",
    kode_item: "PROCESS",
    nama_item: "Proses",
    deskripsi: "Akar penyebab terkait proses kerja.",
    nilai_text: "process",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "ROOT_CAUSE_CATEGORY",
    kode_item: "SYSTEM",
    nama_item: "Sistem",
    deskripsi: "Akar penyebab terkait sistem/aplikasi.",
    nilai_text: "system",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "ROOT_CAUSE_CATEGORY",
    kode_item: "EXTERNAL",
    nama_item: "Eksternal",
    deskripsi: "Akar penyebab dari faktor eksternal.",
    nilai_text: "external",
    urutan: 40,
    is_default: false,
  },

  // =====================================================
  // SPIP_ELEMENT
  // =====================================================
  {
    kode_group: "SPIP_ELEMENT",
    kode_item: "CONTROL_ENVIRONMENT",
    nama_item: "Lingkungan Pengendalian",
    deskripsi: "Unsur SPIP: Lingkungan Pengendalian.",
    nilai_text: "lingkungan_pengendalian",
    urutan: 10,
    is_default: false,
  },
  {
    kode_group: "SPIP_ELEMENT",
    kode_item: "RISK_ASSESSMENT",
    nama_item: "Penilaian Risiko",
    deskripsi: "Unsur SPIP: Penilaian Risiko.",
    nilai_text: "penilaian_risiko",
    urutan: 20,
    is_default: true,
  },
  {
    kode_group: "SPIP_ELEMENT",
    kode_item: "CONTROL_ACTIVITY",
    nama_item: "Kegiatan Pengendalian",
    deskripsi: "Unsur SPIP: Kegiatan Pengendalian.",
    nilai_text: "kegiatan_pengendalian",
    urutan: 30,
    is_default: false,
  },
  {
    kode_group: "SPIP_ELEMENT",
    kode_item: "INFORMATION_COMMUNICATION",
    nama_item: "Informasi dan Komunikasi",
    deskripsi: "Unsur SPIP: Informasi dan Komunikasi.",
    nilai_text: "informasi_komunikasi",
    urutan: 40,
    is_default: false,
  },
  {
    kode_group: "SPIP_ELEMENT",
    kode_item: "MONITORING",
    nama_item: "Pemantauan",
    deskripsi: "Unsur SPIP: Pemantauan.",
    nilai_text: "pemantauan",
    urutan: 50,
    is_default: false,
  },

  // =====================================================
  // SPIP_SUB_ELEMENT
  // =====================================================
  {
    kode_group: "SPIP_SUB_ELEMENT",
    kode_item: "GENERAL_CONTROL",
    nama_item: "Pengendalian Umum",
    deskripsi: "Sub unsur SPIP umum untuk pemetaan awal RTP.",
    nilai_text: "pengendalian_umum",
    urutan: 10,
    is_default: true,
  },
  {
    kode_group: "SPIP_SUB_ELEMENT",
    kode_item: "APPLICATION_CONTROL",
    nama_item: "Pengendalian Aplikasi",
    deskripsi: "Sub unsur SPIP terkait pengendalian aplikasi/sistem.",
    nilai_text: "pengendalian_aplikasi",
    urutan: 20,
    is_default: false,
  },

  // =====================================================
  // RTP_OUTPUT
  // =====================================================
  {
    kode_group: "RTP_OUTPUT",
    kode_item: "CONTROL_DOCUMENT",
    nama_item: "Dokumen Pengendalian",
    deskripsi: "Output RTP berupa dokumen pengendalian.",
    nilai_text: "control_document",
    urutan: 10,
    is_default: true,
  },
  {
    kode_group: "RTP_OUTPUT",
    kode_item: "ACTION_PLAN",
    nama_item: "Rencana Aksi",
    deskripsi: "Output RTP berupa rencana aksi pengendalian.",
    nilai_text: "action_plan",
    urutan: 20,
    is_default: false,
  },
  {
    kode_group: "RTP_OUTPUT",
    kode_item: "EVIDENCE",
    nama_item: "Evidence",
    deskripsi: "Output RTP berupa evidence/bukti pengendalian.",
    nilai_text: "evidence",
    urutan: 30,
    is_default: false,
  },
];

const normalizeBoolean = (value) => (value ? 1 : 0);
const serializeJson = (value) => JSON.stringify(value || {});

const buildMetadata = (item) => ({
  module: "MR",
  source: "seed-mr-reference-items",
  kode_group: item.kode_group,
  kode_item: item.kode_item,
  locked_code: true,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const groupRows = await queryInterface.sequelize.query(
        `
          SELECT id, kode_group
          FROM ${GROUP_TABLE}
          WHERE kode_group IN (:kodeGroups)
            AND is_active = 1
        `,
        {
          replacements: {
            kodeGroups: [...new Set(REFERENCE_ITEMS.map((item) => item.kode_group))],
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const groupIdByCode = new Map(
        groupRows.map((group) => [group.kode_group, group.id])
      );

      for (const item of REFERENCE_ITEMS) {
        const groupId = groupIdByCode.get(item.kode_group);

        if (!groupId) {
          throw new Error(
            `Reference group ${item.kode_group} tidak ditemukan atau tidak aktif. Jalankan seed-mr-reference-groups lebih dulu.`
          );
        }

        const metadata = {
          ...buildMetadata(item),
          ...(item.metadata_json || {}),
        };

        const [existing] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM ${TABLE_NAME}
            WHERE group_id = :group_id
              AND kode_item = :kode_item
            LIMIT 1
          `,
          {
            replacements: {
              group_id: groupId,
              kode_item: item.kode_item,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const replacements = {
          group_id: groupId,
          kode_item: item.kode_item,
          nama_item: item.nama_item,
          deskripsi: item.deskripsi || null,
          nilai_numeric:
            item.nilai_numeric === undefined ? null : item.nilai_numeric,
          nilai_text: item.nilai_text || null,
          warna: item.warna || null,
          icon: item.icon || null,
          urutan: item.urutan || 0,
          is_default: normalizeBoolean(item.is_default),
          is_active: normalizeBoolean(
            item.is_active === undefined ? true : item.is_active
          ),
          effective_start_date: item.effective_start_date || null,
          effective_end_date: item.effective_end_date || null,
          tahun_berlaku: item.tahun_berlaku || null,
          metadata_json: serializeJson(metadata),
          created_by: null,
          updated_by: null,
        };

        if (existing) {
          await queryInterface.sequelize.query(
            `
              UPDATE ${TABLE_NAME}
              SET
                nama_item = :nama_item,
                deskripsi = :deskripsi,
                nilai_numeric = :nilai_numeric,
                nilai_text = :nilai_text,
                warna = :warna,
                icon = :icon,
                urutan = :urutan,
                is_default = :is_default,
                is_active = :is_active,
                effective_start_date = :effective_start_date,
                effective_end_date = :effective_end_date,
                tahun_berlaku = :tahun_berlaku,
                metadata_json = CAST(:metadata_json AS JSON),
                updated_by = :updated_by,
                updated_at = ${NOW_LITERAL}
              WHERE group_id = :group_id
                AND kode_item = :kode_item
            `,
            {
              replacements,
              transaction,
            }
          );
        } else {
          await queryInterface.sequelize.query(
            `
              INSERT INTO ${TABLE_NAME} (
                group_id,
                parent_item_id,
                kode_item,
                nama_item,
                deskripsi,
                nilai_numeric,
                nilai_text,
                warna,
                icon,
                urutan,
                is_default,
                is_active,
                effective_start_date,
                effective_end_date,
                tahun_berlaku,
                metadata_json,
                created_by,
                updated_by,
                created_at,
                updated_at
              )
              VALUES (
                :group_id,
                NULL,
                :kode_item,
                :nama_item,
                :deskripsi,
                :nilai_numeric,
                :nilai_text,
                :warna,
                :icon,
                :urutan,
                :is_default,
                :is_active,
                :effective_start_date,
                :effective_end_date,
                :tahun_berlaku,
                CAST(:metadata_json AS JSON),
                :created_by,
                :updated_by,
                ${NOW_LITERAL},
                ${NOW_LITERAL}
              )
            `,
            {
              replacements,
              transaction,
            }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const kodeGroups = [...new Set(REFERENCE_ITEMS.map((item) => item.kode_group))];

      const groupRows = await queryInterface.sequelize.query(
        `
          SELECT id, kode_group
          FROM ${GROUP_TABLE}
          WHERE kode_group IN (:kodeGroups)
        `,
        {
          replacements: {
            kodeGroups,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const groupIdByCode = new Map(
        groupRows.map((group) => [group.kode_group, group.id])
      );

      for (const item of REFERENCE_ITEMS) {
        const groupId = groupIdByCode.get(item.kode_group);

        if (!groupId) continue;

        /**
         * Down tidak delete fisik karena item bisa dipakai oleh risk/matrix.
         * Cukup nonaktifkan item dari seeder ini.
         */
        await queryInterface.sequelize.query(
          `
            UPDATE ${TABLE_NAME}
            SET
              is_active = 0,
              updated_at = ${NOW_LITERAL}
            WHERE group_id = :group_id
              AND kode_item = :kode_item
          `,
          {
            replacements: {
              group_id: groupId,
              kode_item: item.kode_item,
            },
            transaction,
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
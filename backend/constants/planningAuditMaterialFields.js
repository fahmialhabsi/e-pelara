"use strict";

/**
 * Field material per tipe dokumen untuk diff audit & ringkasan UI.
 * Gunakan nama kolom DB (snake_case) sesuai hasil captureRow / toJSON.
 */
const MATERIAL_FIELDS_BY_TABLE = {
  rpjmd: [
    "nama_rpjmd",
    "kepala_daerah",
    "wakil_kepala_daerah",
    "periode_awal",
    "periode_akhir",
    "tahun_penetapan",
    "akronim",
    "version",
  ],
  renstra: [
    "judul",
    "periode_awal",
    "periode_akhir",
    "status",
    "approval_status",
    "dokumen_url",
    "rpjmd_id",
    "pagu_tahun_1",
    "pagu_tahun_2",
    "pagu_tahun_3",
    "pagu_tahun_4",
    "pagu_tahun_5",
    "total_pagu",
    "version",
  ],
  renja: [
    "tahun",
    "judul",
    "status",
    "approval_status",
    "renstra_id",
    "rpjmd_id",
    "anggaran",
    "pagu_year_1",
    "pagu_year_2",
    "pagu_year_3",
    "pagu_year_4",
    "pagu_year_5",
    "pagu_total",
    "version",
  ],
  rkpd: [
    "tahun",
    "nama_sub_kegiatan",
    "kode_sub_kegiatan",
    "status",
    "renja_id",
    "rpjmd_id",
    "pagu_anggaran",
    "anggaran",
    "pagu_year_1",
    "pagu_year_2",
    "pagu_year_3",
    "pagu_year_4",
    "pagu_year_5",
    "pagu_total",
    "version",
  ],
  rka: [
    "tahun",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "indikator",
    "target",
    "anggaran",
    "renja_id",
    "rpjmd_id",
    "pagu_year_1",
    "pagu_year_2",
    "pagu_year_3",
    "pagu_year_4",
    "pagu_year_5",
    "pagu_total",
    "version",
  ],
  dpa: [
    "tahun",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "indikator",
    "target",
    "anggaran",
    "rka_id",
    "rpjmd_id",
    "kode_rekening",
    "approval_status",
    "pagu_year_1",
    "pagu_year_2",
    "pagu_year_3",
    "pagu_year_4",
    "pagu_year_5",
    "pagu_total",
    "version",
  ],
  renja_dokumen: [
    "judul",
    "tahun",
    "status",
    "versi",
    "rkpd_dokumen_id",
    "renstra_pd_dokumen_id",
    "perangkat_daerah_id",
    "periode_id",
    "is_final_active",
    "text_bab1",
    "text_bab2",
    "text_bab5",
    "is_test",
  ],
  rkpd_dokumen: [
    "judul",
    "tahun",
    "status",
    "versi",
    "periode_id",
    "is_test",
    "text_bab2",
  ],
  renja_item: [
    "renja_dokumen_id",
    "urutan",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "indikator",
    "target",
    "satuan",
    "pagu",
    "status_baris",
  ],
  rkpd_item: [
    "rkpd_dokumen_id",
    "urutan",
    "prioritas_daerah",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "indikator",
    "target",
    "satuan",
    "pagu",
    "perangkat_daerah_id",
    "status_baris",
  ],
  renja_rkpd_item_map: ["renja_item_id", "rkpd_item_id"],
  generic: [],
};

function resolveMaterialKeys(tableName) {
  const key = String(tableName || "").toLowerCase();
  return MATERIAL_FIELDS_BY_TABLE[key] || MATERIAL_FIELDS_BY_TABLE.generic;
}

/** Map aksi workflow ke label audit eksplisit */
function workflowActionToAuditType(action, fallbackStatusTransition = "WORKFLOW") {
  const a = String(action || "")
    .trim()
    .toLowerCase();
  const map = {
    submit: "SUBMIT",
    approve: "APPROVE",
    reject: "REJECT",
    revise: "REVISE",
    reset: "RESET_WORKFLOW",
    publish: "PUBLISH",
    finalize: "FINALIZE",
    restore_version: "RESTORE_VERSION",
  };
  if (map[a]) return map[a];
  if (a) return `WORKFLOW_${a.toUpperCase()}`;
  return fallbackStatusTransition;
}

module.exports = {
  MATERIAL_FIELDS_BY_TABLE,
  resolveMaterialKeys,
  workflowActionToAuditType,
};

import React, { useEffect, useMemo, useState } from "react";
import ReactSelect from "react-select";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import {
  BarChartLine,
  Bullseye,
  CardHeading,
  Clipboard2Data,
  GeoAlt,
  GraphUp,
  InfoCircle,
  JournalText,
  ListCheck,
  PencilSquare,
  Tags,
} from "react-bootstrap-icons";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { extractListData } from "../../../utils/apiResponse";
import {
  dedupeOpdPenanggungJawabRows,
  normalizeOpdNameKey,
} from "../../../utils/opdPenanggungJawabDedup";
import { rpjmdImportCreate, rpjmdImportUpdate } from "../services/rpjmdImportAdminApi";

const FIELDS = {
  u228: [
    { name: "indikator", label: "Indikator", type: "textarea", rows: 4 },
    { name: "tahun_2021", label: "2021", type: "text" },
    { name: "tahun_2022", label: "2022", type: "text" },
    { name: "tahun_2023", label: "2023", type: "text" },
    { name: "tahun_2024", label: "2024", type: "text" },
    { name: "tahun_2025", label: "2025", type: "text" },
    { name: "satuan", label: "Satuan", type: "text" },
  ],
  apbd: [
    { name: "kode_baris", label: "Kode", type: "text" },
    { name: "uraian", label: "Uraian", type: "textarea", rows: 3 },
    { name: "target_2025", label: "2025", type: "text" },
    { name: "proyeksi_2026", label: "2026", type: "text" },
    { name: "proyeksi_2027", label: "2027", type: "text" },
    { name: "proyeksi_2028", label: "2028", type: "text" },
    { name: "proyeksi_2029", label: "2029", type: "text" },
    { name: "proyeksi_2030", label: "2030", type: "text" },
  ],
  t31: [
    { name: "tujuan", label: "Tujuan", type: "textarea", rows: 3 },
    { name: "sasaran", label: "Sasaran", type: "textarea", rows: 3 },
    { name: "indikator", label: "Sasaran / indikator", type: "textarea", rows: 3 },
    { name: "target_2025", label: "2025", type: "text" },
    { name: "target_2026", label: "2026", type: "text" },
    { name: "target_2027", label: "2027", type: "text" },
    { name: "target_2028", label: "2028", type: "text" },
    { name: "target_2029", label: "2029", type: "text" },
    { name: "target_2030", label: "2030", type: "text" },
    { name: "ket", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  arah: [
    { name: "no_misi", label: "No misi", type: "number" },
    { name: "misi_ringkas", label: "Misi ringkas", type: "text" },
    { name: "arah_kebijakan", label: "Arah kebijakan", type: "textarea", rows: 12 },
  ],
  iku: [
    { name: "no_urut", label: "No", type: "number" },
    { name: "indikator", label: "Indikator", type: "textarea", rows: 3 },
    { name: "baseline_2024", label: "Baseline '24", type: "text" },
    { name: "target_2025", label: "2025", type: "text" },
    { name: "target_2026", label: "2026", type: "text" },
    { name: "target_2027", label: "2027", type: "text" },
    { name: "target_2028", label: "2028", type: "text" },
    { name: "target_2029", label: "2029", type: "text" },
    { name: "target_2030", label: "2030", type: "text" },
  ],
  /* Sheet `indikatortujuans`. `kode_indikator` / `rkpd_id` tidak ditampilkan di form impor; submit tetap menghapus kode di handleSubmit. */
  indikator_tujuan: [
    { name: "tujuan_id", label: "Tujuan ID", type: "relation", relationKey: "tujuan" },
    {
      name: "misi_id",
      label: "Misi ID (baca saja; disimpan dari tujuan)",
      type: "number",
      readOnly: true,
    },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Impact"],
      readOnly: true,
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorsasarans`. `kode_indikator` tidak di form impor (otomatis); submit menghapus seperti tujuan. */
  indikator_sasaran: [
    { name: "sasaran_id", label: "Sasaran ID", type: "relation", relationKey: "sasaran" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    { name: "tipe_indikator", label: "Tipe indikator", type: "select", options: ["Outcome"], readOnly: true },
    { name: "jenis_indikator", label: "Jenis indikator", type: "select", options: ["Kuantitatif", "Kualitatif"] },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorstrategis`. `kode_indikator` tidak di form (otomatis); submit menghapus kode seperti sasaran. */
  indikator_strategi: [
    { name: "strategi_id", label: "Strategi", type: "relation", relationKey: "strategi" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Outcome", "Output", "Impact", "Process", "Input"],
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorarahkebijakans`. `kode_indikator` tidak di form (otomatis); layout selaras strategi. */
  indikator_arah_kebijakan: [
    { name: "arah_kebijakan_id", label: "Arah kebijakan", type: "relation", relationKey: "arah" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Outcome", "Output", "Impact", "Process", "Input"],
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorprograms`. `kode_indikator` tidak di form (otomatis); layout selaras arah/strategi. */
  indikator_program: [
    { name: "indikator_sasaran_id", label: "Indikator sasaran", type: "relation", relationKey: "indikator_sasaran" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Output"],
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorkegiatans`. `kode_indikator` tidak di form (otomatis); acuan = indikator_sasaran (pola program). */
  indikator_kegiatan: [
    { name: "indikator_sasaran_id", label: "Indikator sasaran", type: "relation", relationKey: "indikator_sasaran" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Proses"],
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
  /* Sheet `indikatorsubkegiatans`. `kode_indikator` tidak di form (otomatis); pola selaras indikator kegiatan. */
  indikator_sub_kegiatan: [
    { name: "sub_kegiatan_id", label: "Sub kegiatan", type: "relation", relationKey: "sub_kegiatan" },
    { name: "nama_indikator", label: "Nama indikator", type: "textarea", rows: 3 },
    { name: "satuan", label: "Satuan", type: "text" },
    {
      name: "tipe_indikator",
      label: "Tipe indikator",
      type: "select",
      options: ["Outcome", "Output", "Impact", "Process", "Input"],
    },
    {
      name: "jenis_indikator",
      label: "Jenis indikator",
      type: "select",
      options: ["Kuantitatif", "Kualitatif"],
    },
    { name: "jenis", label: "Jenis (IKU/IKK)", type: "text" },
    { name: "tolok_ukur_kinerja", label: "Tolok ukur kinerja", type: "textarea", rows: 2 },
    { name: "target_kinerja", label: "Target kinerja", type: "textarea", rows: 2 },
    { name: "baseline", label: "Baseline", type: "text" },
    { name: "target_tahun_1", label: "Target tahun 1", type: "text" },
    { name: "target_tahun_2", label: "Target tahun 2", type: "text" },
    { name: "target_tahun_3", label: "Target tahun 3", type: "text" },
    { name: "target_tahun_4", label: "Target tahun 4", type: "text" },
    { name: "target_tahun_5", label: "Target tahun 5", type: "text" },
    { name: "capaian_tahun_1", label: "Capaian tahun 1", type: "text" },
    { name: "capaian_tahun_2", label: "Capaian tahun 2", type: "text" },
    { name: "capaian_tahun_3", label: "Capaian tahun 3", type: "text" },
    { name: "capaian_tahun_4", label: "Capaian tahun 4", type: "text" },
    { name: "capaian_tahun_5", label: "Capaian tahun 5", type: "text" },
    { name: "kriteria_kuantitatif", label: "Kriteria kuantitatif", type: "textarea", rows: 2 },
    { name: "kriteria_kualitatif", label: "Kriteria kualitatif", type: "textarea", rows: 2 },
    { name: "definisi_operasional", label: "Definisi operasional", type: "textarea", rows: 2 },
    { name: "metode_penghitungan", label: "Metode penghitungan", type: "textarea", rows: 2 },
    { name: "sumber_data", label: "Sumber data", type: "textarea", rows: 2 },
    { name: "penanggung_jawab", label: "Penanggung jawab", type: "opd_select" },
    { name: "keterangan", label: "Keterangan", type: "textarea", rows: 2 },
  ],
};

/** Label ringkas untuk subjudul header modal (tanpa mengubah `tableKey` internal). */
const TABLE_LABEL_FOR_HEADER = {
  u228: "Urusan kinerja (2.28)",
  apbd: "Proyeksi APBD (2.29)",
  t31: "Target tujuan & sasaran (3.1)",
  arah: "Arah kebijakan (3.3)",
  iku: "IKU provinsi (4.2)",
  indikator_tujuan: "Indikator tujuan · indikatortujuans",
  indikator_sasaran: "Indikator sasaran · indikatorsasarans",
  indikator_strategi: "Indikator strategi · indikatorstrategis",
  indikator_arah_kebijakan: "Indikator arah kebijakan · indikatorarahkebijakans",
  indikator_program: "Indikator program · indikatorprograms",
  indikator_kegiatan: "Indikator kegiatan · indikatorkegiatans",
  indikator_sub_kegiatan: "Indikator sub kegiatan · indikatorsubkegiatans",
};

/**
 * Section UI untuk indikator tujuan — urutan `names` mengikuti field yang ada di FIELDS.
 * `yearGrid`: baris field target/capaian tahun dirapikan dalam grid rapat.
 */
const INDIKATOR_TUJUAN_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["tujuan_id", "misi_id"] },
  {
    id: "identitas",
    title: "Identitas indikator",
    Icon: CardHeading,
    names: ["nama_indikator", "satuan"],
  },
  {
    id: "klasifikasi",
    title: "Klasifikasi",
    Icon: Tags,
    names: ["tipe_indikator", "jenis_indikator", "jenis"],
  },
  {
    id: "target_kinerja",
    title: "Target & kinerja",
    Icon: Bullseye,
    names: ["tolok_ukur_kinerja", "target_kinerja", "baseline"],
  },
  {
    id: "target_tahun",
    title: "Target per tahun RPJMD",
    Icon: BarChartLine,
    names: ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"],
    yearGrid: true,
  },
  {
    id: "capaian_tahun",
    title: "Capaian per tahun",
    Icon: GraphUp,
    names: ["capaian_tahun_1", "capaian_tahun_2", "capaian_tahun_3", "capaian_tahun_4", "capaian_tahun_5"],
    yearGrid: true,
  },
  {
    id: "kriteria",
    title: "Kriteria indikator",
    Icon: ListCheck,
    names: ["kriteria_kuantitatif", "kriteria_kualitatif"],
  },
  {
    id: "definisi",
    title: "Definisi & metode",
    Icon: PencilSquare,
    names: ["definisi_operasional", "metode_penghitungan"],
  },
  {
    id: "referensi",
    title: "Referensi & catatan",
    Icon: Clipboard2Data,
    names: ["sumber_data", "penanggung_jawab", "keterangan"],
  },
];

/** Section UI untuk indikator sasaran — pola sama dengan tujuan, relasi utama = sasaran_id. */
const INDIKATOR_SASARAN_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["sasaran_id"] },
  { id: "identitas",    title: "Identitas indikator",   Icon: CardHeading,   names: ["nama_indikator", "satuan"] },
  { id: "klasifikasi",  title: "Klasifikasi",           Icon: Tags,          names: ["tipe_indikator", "jenis_indikator", "jenis"] },
  { id: "target_kinerja", title: "Target & kinerja",   Icon: Bullseye,      names: ["tolok_ukur_kinerja", "target_kinerja", "baseline"] },
  { id: "target_tahun", title: "Target per tahun RPJMD", Icon: BarChartLine, names: ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"], yearGrid: true },
  { id: "capaian_tahun", title: "Capaian per tahun",   Icon: GraphUp,       names: ["capaian_tahun_1", "capaian_tahun_2", "capaian_tahun_3", "capaian_tahun_4", "capaian_tahun_5"], yearGrid: true },
  { id: "kriteria",     title: "Kriteria indikator",    Icon: ListCheck,     names: ["kriteria_kuantitatif", "kriteria_kualitatif"] },
  { id: "definisi",     title: "Definisi & metode",     Icon: PencilSquare,  names: ["definisi_operasional", "metode_penghitungan"] },
  { id: "referensi",    title: "Referensi & catatan",   Icon: Clipboard2Data, names: ["sumber_data", "penanggung_jawab", "keterangan"] },
];

/** Section UI indikator strategi — sama struktur sasaran, relasi = strategi_id. */
const INDIKATOR_STRATEGI_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["strategi_id"] },
  { id: "identitas", title: "Identitas indikator", Icon: CardHeading, names: ["nama_indikator", "satuan"] },
  { id: "klasifikasi", title: "Klasifikasi", Icon: Tags, names: ["tipe_indikator", "jenis_indikator", "jenis"] },
  { id: "target_kinerja", title: "Target & kinerja", Icon: Bullseye, names: ["tolok_ukur_kinerja", "target_kinerja", "baseline"] },
  { id: "target_tahun", title: "Target per tahun RPJMD", Icon: BarChartLine, names: ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"], yearGrid: true },
  { id: "capaian_tahun", title: "Capaian per tahun", Icon: GraphUp, names: ["capaian_tahun_1", "capaian_tahun_2", "capaian_tahun_3", "capaian_tahun_4", "capaian_tahun_5"], yearGrid: true },
  { id: "kriteria", title: "Kriteria indikator", Icon: ListCheck, names: ["kriteria_kuantitatif", "kriteria_kualitatif"] },
  { id: "definisi", title: "Definisi & metode", Icon: PencilSquare, names: ["definisi_operasional", "metode_penghitungan"] },
  { id: "referensi", title: "Referensi & catatan", Icon: Clipboard2Data, names: ["sumber_data", "penanggung_jawab", "keterangan"] },
];

/** Section UI indikator arah kebijakan — sama struktur strategi, relasi = arah_kebijakan_id. */
const INDIKATOR_ARAH_KEBIJAKAN_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["arah_kebijakan_id"] },
  { id: "identitas", title: "Identitas indikator", Icon: CardHeading, names: ["nama_indikator", "satuan"] },
  { id: "klasifikasi", title: "Klasifikasi", Icon: Tags, names: ["tipe_indikator", "jenis_indikator", "jenis"] },
  { id: "target_kinerja", title: "Target & kinerja", Icon: Bullseye, names: ["tolok_ukur_kinerja", "target_kinerja", "baseline"] },
  { id: "target_tahun", title: "Target per tahun RPJMD", Icon: BarChartLine, names: ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"], yearGrid: true },
  { id: "capaian_tahun", title: "Capaian per tahun", Icon: GraphUp, names: ["capaian_tahun_1", "capaian_tahun_2", "capaian_tahun_3", "capaian_tahun_4", "capaian_tahun_5"], yearGrid: true },
  { id: "kriteria", title: "Kriteria indikator", Icon: ListCheck, names: ["kriteria_kuantitatif", "kriteria_kualitatif"] },
  { id: "definisi", title: "Definisi & metode", Icon: PencilSquare, names: ["definisi_operasional", "metode_penghitungan"] },
  { id: "referensi", title: "Referensi & catatan", Icon: Clipboard2Data, names: ["sumber_data", "penanggung_jawab", "keterangan"] },
];

/** Section UI indikator program — relasi indikator_sasaran + program opsional. */
const INDIKATOR_PROGRAM_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["indikator_sasaran_id"] },
  { id: "identitas", title: "Identitas indikator", Icon: CardHeading, names: ["nama_indikator", "satuan"] },
  { id: "klasifikasi", title: "Klasifikasi", Icon: Tags, names: ["tipe_indikator", "jenis_indikator", "jenis"] },
  { id: "target_kinerja", title: "Target & kinerja", Icon: Bullseye, names: ["tolok_ukur_kinerja", "target_kinerja", "baseline"] },
  { id: "target_tahun", title: "Target per tahun RPJMD", Icon: BarChartLine, names: ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"], yearGrid: true },
  { id: "capaian_tahun", title: "Capaian per tahun", Icon: GraphUp, names: ["capaian_tahun_1", "capaian_tahun_2", "capaian_tahun_3", "capaian_tahun_4", "capaian_tahun_5"], yearGrid: true },
  { id: "kriteria", title: "Kriteria indikator", Icon: ListCheck, names: ["kriteria_kuantitatif", "kriteria_kualitatif"] },
  { id: "definisi", title: "Definisi & metode", Icon: PencilSquare, names: ["definisi_operasional", "metode_penghitungan"] },
  { id: "referensi", title: "Referensi & catatan", Icon: Clipboard2Data, names: ["sumber_data", "penanggung_jawab", "keterangan"] },
];

/** Indikator kegiatan — struktur sama program; acuan = indikator sasaran (bukan indikator_program di UI). */
const INDIKATOR_KEGIATAN_SECTION_META = INDIKATOR_PROGRAM_SECTION_META;

/** Indikator sub kegiatan — sama struktur; relasi utama = sub_kegiatan_id. */
const INDIKATOR_SUB_KEGIATAN_SECTION_META = [
  { id: "konteks", title: "Konteks data", Icon: GeoAlt, names: ["sub_kegiatan_id"] },
  ...INDIKATOR_PROGRAM_SECTION_META.slice(1),
];

function pickFieldsByNames(allFields, names) {
  const map = new Map(allFields.map((f) => [f.name, f]));
  return names.map((n) => map.get(n)).filter(Boolean);
}

function buildSectionsFromMeta(meta, fields) {
  return meta
    .map((m) => ({
      id: m.id,
      title: m.title,
      Icon: m.Icon,
      yearGrid: m.yearGrid === true,
      fields: pickFieldsByNames(fields, m.names),
    }))
    .filter((s) => s.fields.length > 0);
}

function buildFieldSections(tableKey, fields) {
  if (!fields?.length) return [];
  if (tableKey === "indikator_tujuan") return buildSectionsFromMeta(INDIKATOR_TUJUAN_SECTION_META, fields);
  if (tableKey === "indikator_sasaran") return buildSectionsFromMeta(INDIKATOR_SASARAN_SECTION_META, fields);
  if (tableKey === "indikator_strategi") return buildSectionsFromMeta(INDIKATOR_STRATEGI_SECTION_META, fields);
  if (tableKey === "indikator_arah_kebijakan") return buildSectionsFromMeta(INDIKATOR_ARAH_KEBIJAKAN_SECTION_META, fields);
  if (tableKey === "indikator_program") return buildSectionsFromMeta(INDIKATOR_PROGRAM_SECTION_META, fields);
  if (tableKey === "indikator_kegiatan") return buildSectionsFromMeta(INDIKATOR_KEGIATAN_SECTION_META, fields);
  if (tableKey === "indikator_sub_kegiatan") return buildSectionsFromMeta(INDIKATOR_SUB_KEGIATAN_SECTION_META, fields);
  if (String(tableKey || "").startsWith("indikator_")) {
    const used = new Set();
    const rel = fields.filter((f) => f.type === "relation");
    rel.forEach((f) => used.add(f.name));
    const targets = fields.filter((f) => /^target_tahun_\d+$/.test(f.name));
    targets.forEach((f) => used.add(f.name));
    const cap = fields.filter((f) => /^capaian_tahun_\d+$/.test(f.name));
    cap.forEach((f) => used.add(f.name));
    const identity = fields.filter((f) => f.name === "kode_indikator" || f.name === "nama_indikator");
    identity.forEach((f) => used.add(f.name));
    const rest = fields.filter((f) => !used.has(f.name));
    const out = [];
    if (rel.length)
      out.push({ id: "ctx", title: "Konteks data", Icon: GeoAlt, yearGrid: false, fields: rel });
    if (identity.length)
      out.push({
        id: "idn",
        title: "Identitas indikator",
        Icon: CardHeading,
        yearGrid: false,
        fields: identity,
      });
    if (rest.length)
      out.push({
        id: "mix",
        title: "Klasifikasi & pengaturan",
        Icon: Tags,
        yearGrid: false,
        fields: rest,
      });
    if (targets.length)
      out.push({
        id: "tgt",
        title: "Target per tahun RPJMD",
        Icon: Bullseye,
        yearGrid: true,
        fields: targets,
      });
    if (cap.length)
      out.push({
        id: "cap",
        title: "Capaian per tahun",
        Icon: GraphUp,
        yearGrid: true,
        fields: cap,
      });
    return out.length ? out : [{ id: "all", title: "Data impor", Icon: JournalText, yearGrid: false, fields }];
  }
  return [{ id: "data", title: "Data impor", Icon: JournalText, yearGrid: false, fields }];
}

/** Panel section — hanya presentasi; tidak menyentuh binding/submit. */
function ImportEditModalSection({ title, Icon: IconComp, children }) {
  return (
    <section className="rpjmd-import-edit-section card border-0 shadow-sm mb-4 bg-white rounded-3 overflow-hidden">
      <div className="card-body p-4 p-md-4">
        <h6 className="d-flex align-items-stretch gap-0 fw-semibold text-dark mb-4 pb-2 border-bottom border-secondary border-opacity-25">
          <span
            className="border-start border-4 border-primary rounded-1 ps-3 d-flex align-items-center gap-2 flex-grow-1"
            style={{ borderTopLeftRadius: "0.2rem", borderBottomLeftRadius: "0.2rem" }}
          >
            <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary bg-opacity-10 p-2 text-primary">
              <IconComp size={18} aria-hidden />
            </span>
            <span className="fs-6 lh-sm pt-1">{title}</span>
          </span>
        </h6>
        {children}
      </div>
    </section>
  );
}

/** Satu kontrol input — sama persis perilaku binding sebelum refactor section UI. */
function renderImportFieldInput(f, ctx) {
  const {
    draft,
    setVal,
    busy,
    relLoading,
    relOpts,
    tableKey,
    mode,
    apbdUnlocked,
    inputClassName,
  } = ctx;
  const kodeReadonly =
    tableKey === "apbd" && mode === "create" && apbdUnlocked && f.name === "kode_baris";
  const fieldReadonly = kodeReadonly || f.readOnly === true;
  const ctrlClass = [inputClassName, fieldReadonly ? "bg-light" : ""].filter(Boolean).join(" ");

  if (f.type === "relation") {
    return (
      <Form.Select
        className={ctrlClass || undefined}
        value={draft[f.name] ?? ""}
        onChange={(e) => setVal(f.name, e.target.value)}
        disabled={busy || fieldReadonly || relLoading}
      >
        <option value="">— pilih —</option>
        {(relOpts[f.relationKey] || []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Form.Select>
    );
  }
  if (f.type === "select") {
    return (
      <Form.Select
        className={ctrlClass || undefined}
        value={draft[f.name] ?? ""}
        onChange={(e) => setVal(f.name, e.target.value)}
        disabled={busy || fieldReadonly}
      >
        <option value="">— pilih —</option>
        {(f.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Form.Select>
    );
  }
  if (f.type === "opd_select") {
    const opts = ctx.opdSelectOptions || [];
    const loading = ctx.opdListLoading;
    const opdErr = ctx.opdListErr;
    /* Bentuk options react-select: { value: id_string, label: nama_opd } */
    const rsOptions = opts.map((o) => ({ value: String(o.id), label: o.label }));
    const currentId = draft[f.name] != null ? String(draft[f.name]).trim() : "";
    const selectedOpt = currentId ? (rsOptions.find((x) => x.value === currentId) || null) : null;
    return (
      <div>
        {opdErr ? (
          <div className="text-danger small mb-1">Gagal memuat daftar OPD. Tutup modal lalu coba lagi.</div>
        ) : null}
        <ReactSelect
          options={rsOptions}
          value={selectedOpt}
          onChange={(opt) => setVal(f.name, opt ? opt.value : "")}
          isSearchable
          isClearable
          isDisabled={busy || fieldReadonly}
          isLoading={loading}
          placeholder="Cari / pilih OPD penanggung jawab"
          noOptionsMessage={() => "OPD tidak ditemukan"}
          loadingMessage={() => "Memuat daftar OPD…"}
          filterOption={(option, inputValue) =>
            option.label.toLowerCase().includes(inputValue.toLowerCase())
          }
          /* Pastikan menu muncul di atas modal dengan portal */
          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            control: (base, state) => ({
              ...base,
              minHeight: 31,
              fontSize: "0.875rem",
              borderColor: state.isFocused ? "#86b7fe" : "#ced4da",
              boxShadow: state.isFocused ? "0 0 0 0.25rem rgba(13,110,253,.25)" : "none",
            }),
            valueContainer: (base) => ({ ...base, padding: "0 8px" }),
            dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
            clearIndicator: (base) => ({ ...base, padding: "0 6px" }),
            option: (base, state) => ({
              ...base,
              fontSize: "0.875rem",
              backgroundColor: state.isSelected
                ? "#0d6efd"
                : state.isFocused
                ? "#e8f0fe"
                : undefined,
              color: state.isSelected ? "#fff" : "#212529",
            }),
          }}
        />
      </div>
    );
  }
  if (f.type === "textarea") {
    return (
      <Form.Control
        as="textarea"
        rows={f.rows || 3}
        className={ctrlClass || undefined}
        value={draft[f.name] ?? ""}
        onChange={(e) => setVal(f.name, e.target.value)}
        disabled={busy || fieldReadonly}
        readOnly={fieldReadonly}
      />
    );
  }
  return (
    <Form.Control
      type={f.type === "number" ? "number" : "text"}
      className={ctrlClass || undefined}
      value={draft[f.name] ?? ""}
      onChange={(e) => setVal(f.name, e.target.value)}
      disabled={busy || fieldReadonly}
      readOnly={fieldReadonly}
    />
  );
}

const APBD_L1 = ["PENDAPATAN", "BELANJA", "PEMBIAYAAN"];

const APBD_L2_FALLBACK = {
  PENDAPATAN: [
    { kode: "1.1", uraian: "Pendapatan Asli Daerah" },
    { kode: "1.2", uraian: "Pendapatan Transfer" },
    { kode: "1.3", uraian: "Lain-Lain Pendapatan Daerah" },
  ],
  BELANJA: [
    { kode: "2.1", uraian: "Belanja Operasi" },
    { kode: "2.2", uraian: "Belanja Modal" },
  ],
  PEMBIAYAAN: [
    { kode: "3.1", uraian: "Penerimaan Pembiayaan" },
    { kode: "3.2", uraian: "Pengeluaran Pembiayaan" },
  ],
};

function buildApbdL2FromRows(rows, l1) {
  const prefix = l1 === "PENDAPATAN" ? "1." : l1 === "BELANJA" ? "2." : "3.";
  const root = prefix.slice(0, -1);
  const map = new Map();
  for (const r of rows || []) {
    const k = String(r.kode_baris || "").trim();
    if (!k.startsWith(prefix) || k === root) continue;
    const ur = String(r.uraian || "").trim();
    if (!ur) continue;
    if (!map.has(k)) map.set(k, { kode: k, uraian: ur });
  }
  const arr = Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
  return arr.length ? arr : APBD_L2_FALLBACK[l1] || [];
}

function rowToDraft(tableKey, row) {
  const fields = FIELDS[tableKey] || [];
  const d = {};
  if (tableKey === "u228") {
    d.bidang_urusan = row?.bidang_urusan != null ? String(row.bidang_urusan) : "";
    d.no_urut = row?.no_urut != null ? String(row.no_urut) : "";
  }
  if (tableKey === "t31") {
    d.urutan = row?.urutan != null ? String(row.urutan) : "";
    d.baseline_2024 = row?.baseline_2024 != null ? String(row.baseline_2024) : "";
  }
  for (const f of fields) {
    const v = row?.[f.name];
    if (v === null || v === undefined) d[f.name] = "";
    else d[f.name] = f.type === "number" ? String(v) : String(v);
  }
  return d;
}

function parseNumLoose(v) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  const lc = s.lastIndexOf(",");
  const ld = s.lastIndexOf(".");
  if (lc !== -1 && lc > ld) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function computeT31BaselineFromDraft(d) {
  const keys = ["target_2025", "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"];
  const nums = keys.map((k) => parseNumLoose(d[k])).filter((n) => n !== null);
  if (!nums.length) return "";
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return String(Number(mean.toFixed(2)));
}

function nextU228No(rows, bidang) {
  const b = String(bidang || "").trim();
  let max = 0;
  for (const r of rows || []) {
    if (String(r.bidang_urusan || "").trim() !== b) continue;
    const n = parseInt(r.no_urut, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function nextT31Urutan(rows) {
  let max = 0;
  for (const r of rows || []) {
    const n = parseInt(r.urutan, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function truncateLabel(s, max = 100) {
  if (s == null) return "";
  const t = String(s);
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export default function RpjmdImportEditModal({
  show,
  mode = "edit",
  tableKey,
  row,
  periodeId,
  onHide,
  onSaved,
  onBusyChange,
  rowsU228 = [],
  rowsApbd = [],
  rowsT31 = [],
  rowsIndikatorSasaran = [],
  rowsIndikatorProgram = [],
  /** OPD dari parent (satu fetch dengan panel) — `{ id, nama_opd }[]`. */
  opdList: opdListProp = [],
}) {
  const { dokumen, tahun } = useDokumen();
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [apbdL1, setApbdL1] = useState("");
  const [apbdL2, setApbdL2] = useState("");
  const [apbdUnlocked, setApbdUnlocked] = useState(false);
  const [relOpts, setRelOpts] = useState({
    tujuan: [],
    sasaran: [],
    strategi: [],
    arah: [],
    indikator_sasaran: [],
    indikator_program: [],
    sub_kegiatan: [],
  });
  const [relLoading, setRelLoading] = useState(false);
  const [relErr, setRelErr] = useState("");
  const [opdListInternal, setOpdListInternal] = useState([]);
  const [opdListLoading, setOpdListLoading] = useState(false);
  const [opdListErr, setOpdListErr] = useState("");

  const opdDeduped = useMemo(() => {
    const raw = Array.isArray(opdListProp) && opdListProp.length ? opdListProp : opdListInternal;
    return dedupeOpdPenanggungJawabRows(raw);
  }, [opdListProp, opdListInternal]);

  const opdSelectOptions = useMemo(
    () =>
      (opdDeduped.list || []).map((r) => ({
        id: String(r.id),
        label: String(r.nama_opd || "").trim() || `OPD #${r.id}`,
      })),
    [opdDeduped],
  );

  const bidangOptions = useMemo(() => {
    const s = new Set();
    for (const r of rowsU228 || []) {
      const b = String(r.bidang_urusan || "").trim();
      if (b) s.add(b);
    }
    if (mode === "edit" && row?.bidang_urusan) {
      s.add(String(row.bidang_urusan).trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rowsU228, mode, row]);

  const apbdL2Options = useMemo(() => {
    if (!apbdL1) return [];
    return buildApbdL2FromRows(rowsApbd, apbdL1);
  }, [rowsApbd, apbdL1]);

  /* Fallback fetch OPD hanya jika parent tidak mengirim `opdList`. */
  const needsOpd =
    tableKey === "indikator_tujuan" ||
    tableKey === "indikator_sasaran" ||
    tableKey === "indikator_strategi" ||
    tableKey === "indikator_arah_kebijakan" ||
    tableKey === "indikator_program" ||
    tableKey === "indikator_kegiatan" ||
    tableKey === "indikator_sub_kegiatan";
  useEffect(() => {
    if (!show || !needsOpd) return;
    if (Array.isArray(opdListProp) && opdListProp.length > 0) {
      setOpdListInternal([]);
      setOpdListErr("");
      setOpdListLoading(false);
      return;
    }
    let cancelled = false;
    setOpdListLoading(true);
    setOpdListErr("");
    (async () => {
      try {
        const res = await api.get("/opd-penanggung-jawab", { params: { limit: 999 } });
        if (cancelled) return;
        const rows = extractListData(res.data);
        setOpdListInternal(
          (rows || [])
            .filter((r) => r != null && r.id != null)
            .map((r) => ({ id: r.id, nama_opd: r.nama_opd || "" })),
        );
      } catch (ex) {
        if (!cancelled) {
          setOpdListErr(ex?.response?.data?.message || ex.message || "Gagal memuat OPD");
          setOpdListInternal([]);
        }
      } finally {
        if (!cancelled) setOpdListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, tableKey, opdListProp]);

  /* ID duplikat / nama mentah → id kanonik (satu per nama, id terkecil). */
  useEffect(() => {
    if (!show || !needsOpd) return;
    const { list, idToCanonical } = opdDeduped;
    if (!list.length) return;
    const cur = draft.penanggung_jawab;
    if (cur == null || String(cur).trim() === "") return;
    const s = String(cur).trim();
    const canonIds = new Set(list.map((r) => String(r.id)));
    if (canonIds.has(s)) return;
    const mapped = idToCanonical.get(s);
    if (mapped && mapped !== s) {
      setDraft((p) => ({ ...p, penanggung_jawab: mapped }));
      return;
    }
    const nk = normalizeOpdNameKey(s);
    const byName = list.find((r) => normalizeOpdNameKey(r.nama_opd) === nk);
    if (byName) setDraft((p) => ({ ...p, penanggung_jawab: String(byName.id) }));
  }, [show, tableKey, opdDeduped, draft.penanggung_jawab]);

  useEffect(() => {
    if (!show || !String(tableKey || "").startsWith("indikator_")) return;
    if (!periodeId || !tahun || !dokumen) {
      setRelErr("Pilih jenis dokumen dan tahun anggaran di bilah atas agar daftar relasi terisi.");
      return;
    }
    let cancelled = false;
    (async () => {
      setRelLoading(true);
      setRelErr("");
      try {
        const base = { jenis_dokumen: dokumen, tahun, limit: 3500, page: 1 };
        const [tuj, sas, strat, arahRes, subRes] = await Promise.all([
          api.get("/tujuan", { params: { ...base, periode_id: periodeId } }),
          api.get("/sasaran", { params: { ...base, periode_id: periodeId } }),
          api.get("/strategi", { params: base }),
          api.get("/arah-kebijakan", { params: base }),
          api.get("/sub-kegiatan", {
            params: {
              periode_id: periodeId,
              tahun,
              jenis_dokumen: dokumen,
              limit: 3500,
              page: 1,
            },
          }),
        ]);
        if (cancelled) return;
        const tujuanRows = extractListData(tuj.data);
        const sasaranRows = extractListData(sas.data);
        const strategiRows = extractListData(strat.data);
        const arahRows = extractListData(arahRes.data);
        const subRows = extractListData(subRes.data);
        const indSasOpts = (rowsIndikatorSasaran || []).map((r) => ({
          id: String(r.id),
          label: `${r.kode_indikator || "—"} — ${truncateLabel(r.nama_indikator || "", 90)}`,
        }));
        const indProgOpts = (rowsIndikatorProgram || []).map((r) => ({
          id: String(r.id),
          label: `${r.kode_indikator || "—"} — ${truncateLabel(r.nama_indikator || "", 90)}`,
        }));
        setRelOpts({
          tujuan: tujuanRows.map((it) => ({
            id: String(it.id),
            label: `${it.no_tujuan != null ? `${it.no_tujuan} · ` : ""}${truncateLabel(it.isi_tujuan || "(tanpa teks)", 120)}`,
          })),
          sasaran: sasaranRows.map((it) => ({
            id: String(it.id),
            label: `${it.nomor != null ? `${it.nomor} · ` : ""}${truncateLabel(it.isi_sasaran || "(tanpa teks)", 120)}`,
          })),
          strategi: strategiRows.map((it) => ({
            id: String(it.id),
            label: truncateLabel(
              [it.kode_strategi, it.deskripsi].filter(Boolean).join(" — ") || `Strategi #${it.id}`,
              120,
            ),
          })),
          arah: arahRows.map((it) => ({
            id: String(it.id),
            label: truncateLabel(it.arah_kebijakan || it.ringkas || `Arah #${it.id}`, 120),
          })),
          indikator_sasaran: indSasOpts,
          indikator_program: indProgOpts,
          sub_kegiatan: subRows.map((it) => ({
            id: String(it.id),
            label: truncateLabel(
              [it.kode_sub_kegiatan, it.nama_sub_kegiatan].filter(Boolean).join(" — ") || `Sub kegiatan #${it.id}`,
              100,
            ),
          })),
        });
      } catch (ex) {
        if (!cancelled) {
          setRelErr(ex?.response?.data?.message || ex.message || "Gagal memuat daftar relasi.");
        }
      } finally {
        if (!cancelled) setRelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, tableKey, periodeId, tahun, dokumen, rowsIndikatorSasaran, rowsIndikatorProgram]);

  useEffect(() => {
    if (!show || !tableKey) return;
    if (tableKey === "apbd" && mode === "create") {
      setApbdL1("");
      setApbdL2("");
      setApbdUnlocked(false);
    } else {
      setApbdUnlocked(true);
    }
    if (mode === "create") {
      const base = rowToDraft(tableKey, null);
      if (tableKey === "t31") {
        base.urutan = String(nextT31Urutan(rowsT31));
        base.baseline_2024 = computeT31BaselineFromDraft(base);
      }
      if (String(tableKey || "").startsWith("indikator_")) {
        base.jenis_indikator = base.jenis_indikator || "Kuantitatif";
        if (tableKey === "indikator_tujuan") base.tipe_indikator = "Impact";
        else if (tableKey === "indikator_sasaran") base.tipe_indikator = "Outcome";
        else if (tableKey === "indikator_strategi") base.tipe_indikator = base.tipe_indikator || "Outcome";
        else if (tableKey === "indikator_arah_kebijakan") base.tipe_indikator = base.tipe_indikator || "Outcome";
        else if (tableKey === "indikator_program") base.tipe_indikator = "Output";
        else if (tableKey === "indikator_kegiatan") base.tipe_indikator = "Proses";
        else if (tableKey === "indikator_sub_kegiatan") base.tipe_indikator = base.tipe_indikator || "Output";
      }
      setDraft(base);
      setErr("");
      return;
    }
    if (row) {
      const d = rowToDraft(tableKey, row);
      if (tableKey === "t31") {
        if (!d.baseline_2024) d.baseline_2024 = computeT31BaselineFromDraft(d);
      }
      if (tableKey === "apbd") {
        const kb = String(row.kode_baris || "").trim();
        const l1 =
          kb.startsWith("1") ? "PENDAPATAN" :
          kb.startsWith("2") ? "BELANJA" :
          kb.startsWith("3") ? "PEMBIAYAAN" : "";
        setApbdL1(l1);
        setApbdL2(kb);
        setApbdUnlocked(true);
      }
      setDraft(d);
      setErr("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, tableKey, mode, row]);

  const setVal = (name, val) => {
    setDraft((prev) => {
      const next = { ...prev, [name]: val };
      if (tableKey === "t31" && name.startsWith("target_")) {
        next.baseline_2024 = computeT31BaselineFromDraft(next);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setErr("");
    try {
      const body = { ...draft };
      // Strip internal tracking fields
      delete body._xlsxRowIndex;
      delete body._xlsxSheet;
      delete body.__uid;
      if (tableKey === "indikator_tujuan") {
        delete body.kode_indikator;
        body.tipe_indikator = "Impact";
      }
      if (tableKey === "indikator_sasaran") {
        delete body.kode_indikator;
        body.tipe_indikator = "Outcome";
      }
      if (
        tableKey === "indikator_strategi" ||
        tableKey === "indikator_arah_kebijakan" ||
        tableKey === "indikator_program" ||
        tableKey === "indikator_kegiatan" ||
        tableKey === "indikator_sub_kegiatan"
      ) {
        delete body.kode_indikator;
      }
      if (tableKey === "indikator_kegiatan") body.tipe_indikator = "Proses";
      if (mode === "create") {
        await rpjmdImportCreate(tableKey, periodeId, body);
      } else {
        await rpjmdImportUpdate(tableKey, periodeId, row.id, body);
      }
      onSaved?.();
      onHide?.();
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message || "Gagal menyimpan data.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  /* ── Konteks yang diteruskan ke renderImportFieldInput ── */
  const fields = FIELDS[tableKey] || [];
  const sections = buildFieldSections(tableKey, fields);

  const ctx = {
    draft,
    setVal,
    busy,
    relLoading,
    relOpts,
    tableKey,
    mode,
    apbdUnlocked,
    inputClassName: "form-control-sm",
    opdSelectOptions,
    opdListLoading,
    opdListErr,
  };

  const headerLabel = TABLE_LABEL_FOR_HEADER[tableKey] || tableKey || "—";
  const modalTitle =
    mode === "create" ? `Tambah: ${headerLabel}` : `Edit: ${headerLabel}`;

  const showSections =
    (tableKey !== "apbd" || apbdUnlocked) &&
    !(tableKey === "u228" && mode === "create" && !draft.bidang_urusan);

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable style={{ zIndex: 1120 }}>
      <Modal.Header closeButton className="py-2">
        <Modal.Title className="fs-6 fw-semibold">{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4">
        {relErr ? (
          <Alert variant="warning" className="small py-2 mb-3">
            {relErr}
          </Alert>
        ) : null}
        {err ? (
          <Alert variant="danger" className="small py-2 mb-3">
            {err}
          </Alert>
        ) : null}

        <Form onSubmit={handleSubmit} noValidate>
          {/* ── APBD: wizard L1 / L2 (mode create, sebelum unlock) ── */}
          {tableKey === "apbd" && mode === "create" && !apbdUnlocked ? (
            <div className="mb-3">
              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold">Kategori (level 1)</Form.Label>
                <Form.Select
                  size="sm"
                  value={apbdL1}
                  onChange={(e) => { setApbdL1(e.target.value); setApbdL2(""); }}
                >
                  <option value="">— pilih —</option>
                  {APBD_L1.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              {apbdL1 ? (
                <Form.Group className="mb-2">
                  <Form.Label className="small fw-semibold">Sub kategori (level 2)</Form.Label>
                  <Form.Select size="sm" value={apbdL2} onChange={(e) => setApbdL2(e.target.value)}>
                    <option value="">— pilih —</option>
                    {apbdL2Options.map((l) => (
                      <option key={l.kode} value={l.kode}>{l.kode} — {l.uraian}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!apbdL1 || !apbdL2}
                onClick={() => {
                  const d = rowToDraft(tableKey, null);
                  d.kode_baris = apbdL2;
                  setDraft(d);
                  setApbdUnlocked(true);
                }}
              >
                Lanjut
              </Button>
            </div>
          ) : null}

          {/* ── U228: wizard bidang_urusan (mode create) ── */}
          {tableKey === "u228" && mode === "create" ? (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Bidang urusan</Form.Label>
              <Form.Select
                size="sm"
                value={draft.bidang_urusan ?? ""}
                onChange={(e) => {
                  const b = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    bidang_urusan: b,
                    no_urut: String(nextU228No(rowsU228, b)),
                  }));
                }}
              >
                <option value="">— pilih atau ketik baru —</option>
                {bidangOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
              {draft.bidang_urusan ? (
                <Form.Text className="text-muted small">
                  No urut otomatis: <strong>{draft.no_urut}</strong>
                </Form.Text>
              ) : null}
            </Form.Group>
          ) : null}
          {tableKey === "u228" && mode === "edit" ? (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Bidang urusan</Form.Label>
              <Form.Control
                size="sm"
                value={draft.bidang_urusan ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, bidang_urusan: e.target.value }))}
              />
            </Form.Group>
          ) : null}

          {/* ── T31: urutan + baseline ── */}
          {tableKey === "t31" ? (
            <div className="row g-2 mb-3">
              <div className="col-sm-4">
                <Form.Label className="small fw-semibold">No urut</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  value={draft.urutan ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, urutan: e.target.value }))}
                />
              </div>
              <div className="col-sm-4">
                <Form.Label className="small fw-semibold">Baseline 2024 (auto)</Form.Label>
                <Form.Control size="sm" readOnly className="bg-light" value={draft.baseline_2024 ?? ""} />
              </div>
            </div>
          ) : null}

          {/* ── Section rendering (semua tabel, termasuk indikator) ── */}
          {showSections
            ? sections.map((section) => (
                <ImportEditModalSection key={section.id} title={section.title} Icon={section.Icon}>
                  {section.yearGrid ? (
                    <div className="row g-2">
                      {section.fields.map((f) => (
                        <div key={f.name} className="col-6 col-sm-4 col-md-2">
                          <Form.Label className="small text-muted mb-1">{f.label}</Form.Label>
                          {renderImportFieldInput(f, ctx)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="row g-3">
                      {section.fields.map((f) => (
                        <div key={f.name} className="col-12">
                          <Form.Label className="small fw-semibold mb-1">{f.label}</Form.Label>
                          {renderImportFieldInput(f, ctx)}
                        </div>
                      ))}
                    </div>
                  )}
                </ImportEditModalSection>
              ))
            : null}

          {/* ── Tombol submit ── */}
          <div className="d-flex justify-content-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onHide} disabled={busy}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={
                busy ||
                (tableKey === "apbd" && mode === "create" && !apbdUnlocked) ||
                (tableKey === "u228" && mode === "create" && !draft.bidang_urusan)
              }
            >
              {busy ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Menyimpan…
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
} 
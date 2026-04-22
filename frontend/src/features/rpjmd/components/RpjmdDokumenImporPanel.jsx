import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Nav, OverlayTrigger, Spinner, Tab, Table, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { dedupeOpdPenanggungJawabRows } from "../../../utils/opdPenanggungJawabDedup";
import { rpjmdImportDelete, rpjmdIndikatorPreview, rpjmdIndikatorApply } from "../services/rpjmdImportAdminApi";
import RpjmdImportEditModal from "./RpjmdImportEditModal";
import { useRpjmdExcelPreview } from "../../../contexts/RpjmdExcelPreviewContext";

function extractData(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return Array.isArray(p) ? p : [];
}

function truncate(s, max = 120) {
  if (s == null) return "";
  const t = String(s);
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Nilai sel untuk kolom selaras template Excel `indikatortujuans`.
 * `indikator_kinerja` di template dipetakan ke field DB `jenis` bila kolom template tidak ada di payload.
 */
function indikatortujuansCellRaw(row, key) {
  if (!row) return undefined;
  if (key === "indikator_kinerja") {
    const ik = row.indikator_kinerja;
    if (ik != null && String(ik).trim() !== "") return ik;
    return row.jenis;
  }
  return row[key];
}

/** Sel tabel pratinjau kaya — badge / teks panjang + tooltip.
 * opdMap: { [id]: nama_opd } — digunakan untuk resolusi penanggung_jawab */
function resolveOpdDisplayName(opdMap, raw) {
  if (!opdMap || raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return opdMap[s] ?? opdMap[String(Number(s))] ?? null;
}

/** Kolom pratinjau kaya: kosong dari Excel → sel kosong (bukan em dash). Payload tidak diubah. */
const TUJUAN_PREVIEW_BLANK_WHEN_EMPTY_KEYS = new Set([
  "baseline",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "sumber_data",
  "penanggung_jawab",
  "indikator_kinerja",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "definisi_operasional",
  "metode_penghitungan",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
]);

function TujuanPreviewRichCell({ row, col, opdMap }) {
  const raw = indikatortujuansCellRaw(row, col.key);
  /* penanggung_jawab: ID → nama OPD dari opdMap; jika tidak ada mapping, tampilkan nilai asli */
  let displayRaw = raw;
  if (col.key === "penanggung_jawab" && raw != null && String(raw).trim() !== "") {
    const resolved = resolveOpdDisplayName(opdMap, raw);
    if (resolved) displayRaw = resolved;
  }
  const isEmpty =
    displayRaw === undefined || displayRaw === null || String(displayRaw).trim() === "";
  const full = isEmpty
    ? TUJUAN_PREVIEW_BLANK_WHEN_EMPTY_KEYS.has(col.key)
      ? ""
      : "—"
    : String(displayRaw);
  const type = col.cellType || "text";
  if (type === "badge" && !isEmpty) {
    return (
      <Badge bg={col.variant || "secondary"} className="fw-normal text-wrap">
        {full}
      </Badge>
    );
  }
  if (type === "mono") {
    return (
      <code className="small text-break d-block" style={{ maxWidth: col.maxW }}>
        {full}
      </code>
    );
  }
  if (type === "long") {
    const limit = 200;
    if (full === "—" || full === "" || full.length <= limit) {
      return (
        <span className="small text-body" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
          {full}
        </span>
      );
    }
    const preview = truncate(full, limit);
    return (
      <OverlayTrigger
        placement="auto"
        delay={{ show: 350, hide: 120 }}
        overlay={
          <Tooltip
            id={`tt-${col.key}-${row.__uid || row._xlsxRowIndex}`}
            className="text-start shadow"
            style={{ maxWidth: Math.min(520, typeof window !== "undefined" ? window.innerWidth - 40 : 520) }}
          >
            {full}
          </Tooltip>
        }
      >
        <span
          className="small text-body border-bottom border-dotted"
          style={{ cursor: "help", whiteSpace: "normal", wordBreak: "break-word" }}
        >
          {preview}
        </span>
      </OverlayTrigger>
    );
  }
  return <span className="small">{full}</span>;
}

/** Blok ukuran kinerja + target/capaian (nama field = kolom Sequelize `raw: true`). */
const GRID_INDIKATOR_JENIS_THROUGH_CAPAIAN = [
  { key: "jenis", label: "Jenis (IKU/IKK)", truncate: 20 },
  { key: "tolok_ukur_kinerja", label: "Tolok Ukur Kinerja", truncate: 40 },
  { key: "target_kinerja", label: "Target Kinerja", truncate: 40 },
  { key: "jenis_indikator", label: "Jenis Indikator", truncate: 14 },
  { key: "kriteria_kuantitatif", label: "Kriteria Kuantitatif", truncate: 36 },
  { key: "kriteria_kualitatif", label: "Kriteria Kualitatif", truncate: 36 },
  { key: "satuan", label: "Satuan", truncate: 16 },
  { key: "definisi_operasional", label: "Definisi Operasional", truncate: 40 },
  { key: "metode_penghitungan", label: "Metode Penghitungan", truncate: 40 },
  { key: "baseline", label: "Baseline", truncate: 20 },
  { key: "target_tahun_1", label: "Target Tahun 1", truncate: 14 },
  { key: "target_tahun_2", label: "Target Tahun 2", truncate: 14 },
  { key: "target_tahun_3", label: "Target Tahun 3", truncate: 14 },
  { key: "target_tahun_4", label: "Target Tahun 4", truncate: 14 },
  { key: "target_tahun_5", label: "Target Tahun 5", truncate: 14 },
  { key: "capaian_tahun_1", label: "capaian_tahun_1", truncate: 14 },
  { key: "capaian_tahun_2", label: "capaian_tahun_2", truncate: 14 },
  { key: "capaian_tahun_3", label: "capaian_tahun_3", truncate: 14 },
  { key: "capaian_tahun_4", label: "capaian_tahun_4", truncate: 14 },
  { key: "capaian_tahun_5", label: "capaian_tahun_5", truncate: 14 },
];

const GRID_INDIKATOR_SUMBER_KET_RKPD_TIPE = [
  { key: "sumber_data", label: "Sumber Data", truncate: 36 },
  { key: "penanggung_jawab", label: "Penanggung Jawab", truncate: 48 },
  { key: "keterangan", label: "keterangan", truncate: 40 },
  { key: "tipe_indikator", label: "Tipe Indikator", truncate: 10 },
];

const GRID_INDIKATOR_TARGET_AWAL_AKHIR = [
  { key: "target_awal", label: "target_awal", truncate: 16 },
  { key: "target_akhir", label: "target_akhir", truncate: 16 },
  { key: "tahun_awal", label: "tahun_awal", truncate: 10 },
  { key: "tahun_akhir", label: "tahun_akhir", truncate: 10 },
];

const GRID_INDIKATOR_SUMBER_KET_TIPE_DOC = [
  { key: "sumber_data", label: "Sumber Data", truncate: 36 },
  { key: "penanggung_jawab", label: "Penanggung Jawab", truncate: 24 },
  { key: "keterangan", label: "keterangan", truncate: 40 },
  { key: "tipe_indikator", label: "Tipe Indikator", truncate: 10 },
  { key: "jenis_dokumen", label: "jenis_dokumen", truncate: 20 },
  { key: "tahun", label: "tahun", truncate: 10 },
];

/** Kolom grid tab Indikator tujuan — urutan & label sama header template Excel `indikatortujuans`. */
const INDIKATOR_TUJUAN_GRID_COLS = [
  { key: "nama_indikator", label: "nama_indikator", truncate: 72 },
  { key: "indikator_kinerja", label: "indikator_kinerja", truncate: 28 },
  { key: "tolok_ukur_kinerja", label: "tolok_ukur_kinerja", truncate: 40 },
  { key: "target_kinerja", label: "target_kinerja", truncate: 40 },
  { key: "definisi_operasional", label: "definisi_operasional", truncate: 40 },
  { key: "metode_penghitungan", label: "metode_penghitungan", truncate: 40 },
  { key: "kriteria_kuantitatif", label: "kriteria_kuantitatif", truncate: 36 },
  { key: "kriteria_kualitatif", label: "kriteria_kualitatif", truncate: 36 },
  { key: "target_tahun_1", label: "target_tahun_1", truncate: 14 },
  { key: "target_tahun_2", label: "target_tahun_2", truncate: 14 },
  { key: "target_tahun_3", label: "target_tahun_3", truncate: 14 },
  { key: "target_tahun_4", label: "target_tahun_4", truncate: 14 },
  { key: "target_tahun_5", label: "target_tahun_5", truncate: 14 },
  { key: "sumber_data", label: "sumber_data", truncate: 36 },
  { key: "capaian_tahun_1", label: "capaian_tahun_1", truncate: 14 },
  { key: "capaian_tahun_2", label: "capaian_tahun_2", truncate: 14 },
  { key: "capaian_tahun_3", label: "capaian_tahun_3", truncate: 14 },
  { key: "capaian_tahun_4", label: "capaian_tahun_4", truncate: 14 },
  { key: "capaian_tahun_5", label: "capaian_tahun_5", truncate: 14 },
  { key: "satuan", label: "satuan", truncate: 16 },
];

/** `indikatorsasarans` — pola kolom selaras tab Indikator Tujuan (tanpa ID internal). */
const INDIKATOR_SASARAN_GRID_COLS = [
  { key: "nama_indikator", label: "Nama Indikator", truncate: 72 },
  ...GRID_INDIKATOR_JENIS_THROUGH_CAPAIAN,
  ...GRID_INDIKATOR_SUMBER_KET_RKPD_TIPE,
];

/** `indikatorstrategis` — pola grid selaras Indikator Sasaran (tanpa ID internal). */
const INDIKATOR_STRATEGI_GRID_COLS = [
  ...INDIKATOR_SASARAN_GRID_COLS,
];

/** `indikatorarahkebijakans` — pola grid selaras Indikator Strategi (tanpa ID internal). */
const INDIKATOR_ARAH_KEBIJAKAN_GRID_COLS = [
  ...INDIKATOR_SASARAN_GRID_COLS,
];

/** `indikatorprograms` — pola selaras indikator sasaran (relasi acuan + indikator). */
const INDIKATOR_PROGRAM_GRID_COLS = [
  { key: "indikator_sasaran_id", label: "Indik. Sasaran ID", truncate: 10 },
  ...INDIKATOR_SASARAN_GRID_COLS,
  { key: "jenis_dokumen", label: "jenis_dokumen", truncate: 20 },
  { key: "tahun", label: "tahun", truncate: 10 },
];

/** `indikatorkegiatans` — acuan indikator sasaran + isi indikator (tanpa kode / FK hierarki / program_id di pratinjau). */
const INDIKATOR_KEGIATAN_GRID_COLS = [
  { key: "indikator_sasaran_id", label: "Indik. Sasaran (acuan)", truncate: 10 },
  { key: "nama_indikator", label: "Nama Indikator", truncate: 72 },
  ...GRID_INDIKATOR_JENIS_THROUGH_CAPAIAN,
  { key: "sumber_data", label: "Sumber Data", truncate: 36 },
  { key: "penanggung_jawab", label: "Penanggung Jawab", truncate: 48 },
  { key: "keterangan", label: "keterangan", truncate: 40 },
  { key: "tipe_indikator", label: "Tipe Indikator", truncate: 10 },
];

/** `indikatorsubkegiatans` — acuan kegiatan/sub + isi indikator (tanpa kode / denormal sub / hierarki di pratinjau). */
const INDIKATOR_SUB_KEGIATAN_GRID_COLS = [
  { key: "kegiatan_id", label: "Kegiatan (acuan)", truncate: 10 },
  { key: "sub_kegiatan_id", label: "Sub kegiatan ID", truncate: 10 },
  { key: "nama_indikator", label: "Nama Indikator", truncate: 72 },
  { key: "jenis", label: "Jenis (IKU/IKK)", truncate: 20 },
  { key: "tolok_ukur_kinerja", label: "Tolok Ukur Kinerja", truncate: 40 },
  { key: "target_kinerja", label: "Target Kinerja", truncate: 40 },
  { key: "jenis_indikator", label: "Jenis Indikator", truncate: 14 },
  { key: "kriteria_kuantitatif", label: "Kriteria Kuantitatif", truncate: 36 },
  { key: "kriteria_kualitatif", label: "Kriteria Kualitatif", truncate: 36 },
  { key: "satuan", label: "Satuan", truncate: 16 },
  { key: "definisi_operasional", label: "Definisi Operasional", truncate: 40 },
  { key: "metode_penghitungan", label: "Metode Penghitungan", truncate: 40 },
  { key: "baseline", label: "Baseline", truncate: 20 },
  ...GRID_INDIKATOR_TARGET_AWAL_AKHIR,
  { key: "realisasi", label: "realisasi", truncate: 14 },
  { key: "anggaran", label: "anggaran", truncate: 14 },
  { key: "target_tahun_1", label: "Target Tahun 1", truncate: 14 },
  { key: "target_tahun_2", label: "Target Tahun 2", truncate: 14 },
  { key: "target_tahun_3", label: "Target Tahun 3", truncate: 14 },
  { key: "target_tahun_4", label: "Target Tahun 4", truncate: 14 },
  { key: "target_tahun_5", label: "Target Tahun 5", truncate: 14 },
  { key: "capaian_tahun_1", label: "capaian_tahun_1", truncate: 14 },
  { key: "capaian_tahun_2", label: "capaian_tahun_2", truncate: 14 },
  { key: "capaian_tahun_3", label: "capaian_tahun_3", truncate: 14 },
  { key: "capaian_tahun_4", label: "capaian_tahun_4", truncate: 14 },
  { key: "capaian_tahun_5", label: "capaian_tahun_5", truncate: 14 },
  { key: "sumber_data", label: "Sumber Data", truncate: 36 },
  { key: "penanggung_jawab", label: "Penanggung Jawab", truncate: 24 },
  { key: "keterangan", label: "keterangan", truncate: 40 },
  { key: "tipe_indikator", label: "Tipe Indikator", truncate: 10 },
];

const INDIKATOR_GRID_COLS_BY_TABLE = {
  indikator_tujuan: INDIKATOR_TUJUAN_GRID_COLS,
  indikator_sasaran: INDIKATOR_SASARAN_GRID_COLS,
  indikator_strategi: INDIKATOR_STRATEGI_GRID_COLS,
  indikator_arah_kebijakan: INDIKATOR_ARAH_KEBIJAKAN_GRID_COLS,
  indikator_program: INDIKATOR_PROGRAM_GRID_COLS,
  indikator_kegiatan: INDIKATOR_KEGIATAN_GRID_COLS,
  indikator_sub_kegiatan: INDIKATOR_SUB_KEGIATAN_GRID_COLS,
};

const DEFAULT_INDIKATOR_GRID_COLS = [
  { key: "kode_indikator", label: "Kode indikator", truncate: 32 },
  { key: "nama_indikator", label: "Nama indikator", truncate: 160 },
  { key: "satuan", label: "Satuan", truncate: 24 },
  { key: "target_tahun_1", label: "Target tahun 1", truncate: 16 },
  { key: "target_tahun_2", label: "Target tahun 2", truncate: 16 },
  { key: "target_tahun_3", label: "Target tahun 3", truncate: 16 },
  { key: "target_tahun_4", label: "Target tahun 4", truncate: 16 },
  { key: "target_tahun_5", label: "Target tahun 5", truncate: 16 },
];

function gridColsForIndikatorTable(tableKey) {
  return INDIKATOR_GRID_COLS_BY_TABLE[tableKey] ?? DEFAULT_INDIKATOR_GRID_COLS;
}

function indikatorGridCell(row, col, opdMap) {
  const v = indikatortujuansCellRaw(row, col.key);
  if (v === undefined || v === null || v === "") return "—";
  if (col.key === "penanggung_jawab") {
    const name = resolveOpdDisplayName(opdMap, v);
    if (name) return truncate(name, col.truncate ?? 48);
  }
  const max = col.truncate ?? 48;
  return truncate(String(v), max);
}

/** Selaras query `importTable` backend — satu tab dashboard = satu sheet workbook. */
const INDIKATOR_TAB_IMPORT_TABLE = {
  indikator_tujuan: "indikatortujuans",
  indikator_sasaran: "indikatorsasarans",
  indikator_strategi: "indikatorstrategis",
  indikator_arah_kebijakan: "indikatorarahkebijakans",
  indikator_program: "indikatorprograms",
  indikator_kegiatan: "indikatorkegiatans",
  indikator_sub_kegiatan: "indikatorsubkegiatans",
};

/**
 * Pratinjau kaya Indikator Sasaran — key = field DB, `cellType` = tampilan.
 * Selaras Indikator Tujuan: tanpa `kode_indikator` di UI (otomatis backend).
 */
const INDIKATOR_SASARAN_PREVIEW_RICH_COLS = [
  { key: "nama_indikator", label: "Nama Indikator", maxW: 240, cellType: "long" },
  { key: "satuan", label: "Satuan", maxW: 96, cellType: "text" },
  { key: "tipe_indikator", label: "Tipe Indikator", maxW: 96, cellType: "badge", variant: "primary" },
  { key: "jenis_indikator", label: "Jenis Indikator", maxW: 96, cellType: "badge", variant: "info" },
  { key: "jenis", label: "Jenis (IKU/IKK)", maxW: 96, cellType: "badge", variant: "secondary" },
  { key: "tolok_ukur_kinerja", label: "Tolok Ukur Kinerja", maxW: 200, cellType: "long" },
  { key: "target_kinerja", label: "Target Kinerja", maxW: 220, cellType: "long" },
  { key: "baseline", label: "Baseline", maxW: 80, cellType: "text" },
  { key: "target_tahun_1", label: "Target Tahun 1", maxW: 72, cellType: "text" },
  { key: "target_tahun_2", label: "Target Tahun 2", maxW: 72, cellType: "text" },
  { key: "target_tahun_3", label: "Target Tahun 3", maxW: 72, cellType: "text" },
  { key: "target_tahun_4", label: "Target Tahun 4", maxW: 72, cellType: "text" },
  { key: "target_tahun_5", label: "Target Tahun 5", maxW: 72, cellType: "text" },
  { key: "sumber_data", label: "Sumber Data", maxW: 180, cellType: "long" },
  { key: "capaian_tahun_1", label: "Capaian Tahun 1", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_2", label: "Capaian Tahun 2", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_3", label: "Capaian Tahun 3", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_4", label: "Capaian Tahun 4", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_5", label: "Capaian Tahun 5", maxW: 88, cellType: "text" },
  { key: "penanggung_jawab", label: "Penanggung Jawab", maxW: 160, cellType: "text" },
  { key: "kriteria_kuantitatif", label: "Kriteria Kuantitatif", maxW: 240, cellType: "long" },
  { key: "kriteria_kualitatif", label: "Kriteria Kualitatif", maxW: 240, cellType: "long" },
  { key: "definisi_operasional", label: "Definisi Operasional", maxW: 260, cellType: "long" },
  { key: "metode_penghitungan", label: "Metode Penghitungan", maxW: 260, cellType: "long" },
];

/** Pratinjau kaya Indikator Strategi — tanpa ID internal. */
const INDIKATOR_STRATEGI_PREVIEW_RICH_COLS = [
  ...INDIKATOR_SASARAN_PREVIEW_RICH_COLS,
];

/** Pratinjau kaya Indikator Arah Kebijakan — tanpa ID internal. */
const INDIKATOR_ARAH_KEBIJAKAN_PREVIEW_RICH_COLS = [
  ...INDIKATOR_SASARAN_PREVIEW_RICH_COLS,
];

/** Pratinjau kaya Indikator Program — acuan sasaran (indikator_sasaran_id) + indikator. */
const INDIKATOR_PROGRAM_PREVIEW_RICH_COLS = [
  { key: "indikator_sasaran_id", label: "Indikator Sasaran ID", maxW: 72, cellType: "mono" },
  ...INDIKATOR_SASARAN_PREVIEW_RICH_COLS,
];

/** Pratinjau kaya Indikator Kegiatan — acuan sasaran + indikator. */
const INDIKATOR_KEGIATAN_PREVIEW_RICH_COLS = [
  { key: "indikator_sasaran_id", label: "Indikator Sasaran (acuan)", maxW: 72, cellType: "mono" },
  ...INDIKATOR_SASARAN_PREVIEW_RICH_COLS,
];

/** Pratinjau kaya Indikator Sub Kegiatan — acuan kegiatan/sub + indikator. */
const INDIKATOR_SUB_KEGIATAN_PREVIEW_RICH_COLS = [
  { key: "kegiatan_id", label: "Kegiatan (acuan)", maxW: 72, cellType: "mono" },
  { key: "sub_kegiatan_id", label: "Sub kegiatan ID", maxW: 72, cellType: "mono" },
  ...INDIKATOR_SASARAN_PREVIEW_RICH_COLS,
];

/** Pratinjau tab Indikator Tujuan — header & urutan sama template Excel (bukan kolom internal DB). */
const INDIKATOR_TUJUAN_PREVIEW_RICH_COLS = [
  { key: "nama_indikator", label: "nama_indikator", maxW: 240, cellType: "long" },
  { key: "indikator_kinerja", label: "indikator_kinerja", maxW: 160, cellType: "long" },
  { key: "tolok_ukur_kinerja", label: "tolok_ukur_kinerja", maxW: 200, cellType: "long" },
  { key: "target_kinerja", label: "target_kinerja", maxW: 220, cellType: "long" },
  { key: "definisi_operasional", label: "definisi_operasional", maxW: 260, cellType: "long" },
  { key: "metode_penghitungan", label: "metode_penghitungan", maxW: 260, cellType: "long" },
  { key: "kriteria_kuantitatif", label: "kriteria_kuantitatif", maxW: 240, cellType: "long" },
  { key: "kriteria_kualitatif", label: "kriteria_kualitatif", maxW: 240, cellType: "long" },
  { key: "target_tahun_1", label: "target_tahun_1", maxW: 88, cellType: "text" },
  { key: "target_tahun_2", label: "target_tahun_2", maxW: 88, cellType: "text" },
  { key: "target_tahun_3", label: "target_tahun_3", maxW: 88, cellType: "text" },
  { key: "target_tahun_4", label: "target_tahun_4", maxW: 88, cellType: "text" },
  { key: "target_tahun_5", label: "target_tahun_5", maxW: 88, cellType: "text" },
  { key: "sumber_data", label: "sumber_data", maxW: 180, cellType: "long" },
  { key: "capaian_tahun_1", label: "capaian_tahun_1", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_2", label: "capaian_tahun_2", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_3", label: "capaian_tahun_3", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_4", label: "capaian_tahun_4", maxW: 88, cellType: "text" },
  { key: "capaian_tahun_5", label: "capaian_tahun_5", maxW: 88, cellType: "text" },
  { key: "satuan", label: "satuan", maxW: 96, cellType: "text" },
];

/**
 * Ekstrak baris payload dari response pratinjau backend.
 * Hanya baris yang lolos (errors kosong) yang diambil.
 * @param {object} previewData – respons dari rpjmdIndikatorPreview
 * @returns {object[]}
 */
function extractPayloadRowsFromPreview(previewData) {
  if (!previewData?.sheets) return [];
  const rows = [];
  for (const sh of previewData.sheets) {
    for (const r of sh.rows || []) {
      if (!r.payload) continue;
      const hasErr = Array.isArray(r.errors) && r.errors.length > 0;
      if (hasErr) continue;
      // Tambahkan _xlsxRowIndex unik agar id tidak tabrakan saat tidak ada id DB
      rows.push({
        ...r.payload,
        __uid: `imp-${String(sh.sheetName || "sheet").replace(/\s+/g, "_")}-L${r.line}`,
        _xlsxRowIndex: r.line,
        _xlsxSheet: sh.sheetName,
        // id null dari Excel – gunakan sentinel supaya filter dropdown tidak rusak
        id: r.payload.id ?? `xlsx_${r.line}`,
      });
    }
  }
  return rows;
}

/**
 * Normalise header Excel yang bervariasi (lowercase + trim + remove spasi/garis).
 * Tidak mengubah nilai data, hanya memetakan nama kolom.
 */
function normalizeHeaderKey(raw) {
  if (raw == null) return "";
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, "_");
}

/**
 * Verifikasi sheet `indikatortujuans` ada di payload dan memiliki field
 * `nama_indikator`. Normalise header jika perlu.
 * @param {object[]} rows
 * @returns {{ ok: boolean, message: string }}
 */
function validateIndikatortujuansRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatortujuans tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatortujuans tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola dengan `validateIndikatortujuansRows` — sheet `indikatorsasarans`. */
function validateIndikatorsasaransRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorsasarans tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorsasarans tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola dengan sasaran — sheet `indikatorstrategis`. */
function validateIndikatorstrategisRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorstrategis tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorstrategis tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola dengan strategi — sheet `indikatorarahkebijakans`. */
function validateIndikatorarahkebijakansRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorarahkebijakans tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorarahkebijakans tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola — sheet `indikatorprograms`. */
function validateIndikatorprogramsRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorprograms tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorprograms tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola — sheet `indikatorkegiatans`. */
function validateIndikatorkegiatansRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorkegiatans tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorkegiatans tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

/** Sama pola — sheet `indikatorsubkegiatans`. */
function validateIndikatorsubkegiatansRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "Sheet indikatorsubkegiatans tidak berisi data." };
  }
  const sample = rows[0];
  const keys = Object.keys(sample).map(normalizeHeaderKey);
  if (!keys.includes("nama_indikator")) {
    return {
      ok: false,
      message:
        "Header sheet indikatorsubkegiatans tidak ditemukan kolom 'nama_indikator'. " +
        "Pastikan template Excel yang benar.",
    };
  }
  return { ok: true, message: "" };
}

function RpjmdIndikatorExcelImportCard({
  periodeId,
  importTable,
  onApplied,
  busy,
  /** Callback(rows: object[]) dipanggil setelah pratinjau berhasil parse baris lolos. */
  onPreviewData,
  /** Map { [id]: nama_opd } untuk resolusi penanggung_jawab ID → nama di preview kaya. */
  opdMap = {},
}) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [applyRes, setApplyRes] = useState(null);
  const [pvBusy, setPvBusy] = useState(false);
  const [apBusy, setApBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [validationErr, setValidationErr] = useState("");

  useEffect(() => {
    setPreview(null);
    setApplyRes(null);
    setLocalErr("");
    setValidationErr("");
    if (fileRef.current) fileRef.current.value = "";
  }, [importTable]);

  /** Baris ringkas untuk tabel status pratinjau (sheet/baris/kode/nama/status) */
  const previewRows = React.useMemo(() => {
    if (!preview?.sheets) return [];
    const out = [];
    for (const sh of preview.sheets) {
      for (const r of sh.rows || []) {
        const errJoin = (Array.isArray(r.errors) ? r.errors : []).join("; ").trim();
        const hasErr = Array.isArray(r.errors) && r.errors.length > 0;
        out.push({
          sheet: sh.sheetName,
          line: r.line,
          kode: r.payload?.kode_indikator,
          nama: truncate(r.payload?.nama_indikator, 80),
          statusText: hasErr ? errJoin : "Lolos pratinjau",
          hasErr,
        });
      }
    }
    return out;
  }, [preview]);

  const RICH_PREVIEW_TABLES = [
    "indikatortujuans",
    "indikatorsasarans",
    "indikatorstrategis",
    "indikatorarahkebijakans",
    "indikatorprograms",
    "indikatorkegiatans",
    "indikatorsubkegiatans",
  ];

  /** Baris lengkap untuk preview kaya — tujuan, sasaran, strategi. */
  const richPreviewRows = React.useMemo(() => {
    if (!RICH_PREVIEW_TABLES.includes(importTable) || !preview?.sheets) return [];
    return extractPayloadRowsFromPreview(preview);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, importTable]);

  const onPreview = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f || !periodeId) {
      setLocalErr("Pilih berkas Excel (.xlsx) dan pastikan periode RPJMD aktif.");
      return;
    }
    setPvBusy(true);
    setLocalErr("");
    setValidationErr("");
    setApplyRes(null);
    try {
      const data = await rpjmdIndikatorPreview(periodeId, f, importTable);
      setPreview(data);

      // --- Validasi ringkas + context (tujuan) / hanya validasi (sasaran) — pola sama ---
      if (importTable === "indikatortujuans") {
        const payloadRows = extractPayloadRowsFromPreview(data);

        if (payloadRows.length === 0) {
          // Cek apakah sheet ada tapi semua baris error
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatortujuans ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatortujuans tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatortujuansRows(payloadRows);
          if (!check.ok) {
            setValidationErr(check.message);
          } else {
            // ✓ Semua valid — kirim ke context via callback
            onPreviewData?.(payloadRows);
          }
        }
      } else if (importTable === "indikatorsasarans") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorsasarans ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorsasarans tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorsasaransRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      } else if (importTable === "indikatorstrategis") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorstrategis ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorstrategis tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorstrategisRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      } else if (importTable === "indikatorarahkebijakans") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorarahkebijakans ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorarahkebijakans tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorarahkebijakansRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      } else if (importTable === "indikatorprograms") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorprograms ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorprograms tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorprogramsRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      } else if (importTable === "indikatorkegiatans") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorkegiatans ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorkegiatans tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorkegiatansRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      } else if (importTable === "indikatorsubkegiatans") {
        const payloadRows = extractPayloadRowsFromPreview(data);
        if (payloadRows.length === 0) {
          const totalRows = (data?.sheets || []).reduce(
            (sum, sh) => sum + (sh.rows || []).length,
            0
          );
          if (totalRows > 0) {
            setValidationErr(
              "Sheet indikatorsubkegiatans ditemukan namun semua baris memiliki error. " +
              "Periksa data dan format template Excel."
            );
          } else {
            setValidationErr(
              "Sheet indikatorsubkegiatans tidak ditemukan atau kosong. " +
              "Pastikan file Excel menggunakan template yang benar."
            );
          }
        } else {
          const check = validateIndikatorsubkegiatansRows(payloadRows);
          if (!check.ok) setValidationErr(check.message);
        }
      }
    } catch (e) {
      setLocalErr(e?.response?.data?.message || e.message || "Pratinjau gagal.");
    } finally {
      setPvBusy(false);
    }
  };

  const onApply = async () => {
    if (!preview?.previewId || !periodeId) return;
    setApBusy(true);
    setLocalErr("");
    try {
      const data = await rpjmdIndikatorApply(periodeId, preview.previewId);
      setApplyRes(data);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      onApplied?.();
    } catch (e) {
      const d = e?.response?.data;
      const backendMsg =
        (d && typeof d.message === "string" && d.message.trim() && d.message) ||
        (typeof d === "string" && d.trim() ? d : "") ||
        "";
      setLocalErr(backendMsg || e.message || "Terapkan gagal.");
    } finally {
      setApBusy(false);
    }
  };

  const failDetails = Array.isArray(applyRes?.errors)
    ? applyRes.errors
    : (applyRes?.details || []).filter((d) => !d.ok);

  const isIndikatorTujuanTab = importTable === "indikatortujuans";
  const isIndikatorSasaranTab = importTable === "indikatorsasarans";
  const isIndikatorStrategiTab = importTable === "indikatorstrategis";
  const isIndikatorArahKebijakanTab = importTable === "indikatorarahkebijakans";
  const isIndikatorProgramTab = importTable === "indikatorprograms";
  const isIndikatorKegiatanTab = importTable === "indikatorkegiatans";
  const isIndikatorSubKegiatanTab = importTable === "indikatorsubkegiatans";
  const isRichPreviewTab =
    isIndikatorTujuanTab ||
    isIndikatorSasaranTab ||
    isIndikatorStrategiTab ||
    isIndikatorArahKebijakanTab ||
    isIndikatorProgramTab ||
    isIndikatorKegiatanTab ||
    isIndikatorSubKegiatanTab;
  const richCols = isIndikatorSasaranTab
    ? INDIKATOR_SASARAN_PREVIEW_RICH_COLS
    : isIndikatorStrategiTab
      ? INDIKATOR_STRATEGI_PREVIEW_RICH_COLS
      : isIndikatorArahKebijakanTab
        ? INDIKATOR_ARAH_KEBIJAKAN_PREVIEW_RICH_COLS
        : isIndikatorProgramTab
          ? INDIKATOR_PROGRAM_PREVIEW_RICH_COLS
          : isIndikatorKegiatanTab
            ? INDIKATOR_KEGIATAN_PREVIEW_RICH_COLS
            : isIndikatorSubKegiatanTab
              ? INDIKATOR_SUB_KEGIATAN_PREVIEW_RICH_COLS
              : INDIKATOR_TUJUAN_PREVIEW_RICH_COLS;

  return (
    <Alert variant="light" className="border small mb-3">
      <div className="fw-semibold mb-2">Impor Excel — indikator (pratinjau → konfirmasi → sisipkan)</div>
      <p className="text-muted mb-2">
        Hanya sheet <code>{importTable}</code> yang diproses untuk tab ini (sheet lain di file yang sama diabaikan).
        Baris yang bermasalah di pratinjau tidak akan disisipkan.
        {isIndikatorTujuanTab && (
          <>
            {" "}
            <strong>
              Data pratinjau tab ini menjadi sumber dropdown «Nama Indikator» di form Pengisian Indikator Spesifik RPJMD
              (Step Tujuan) — tanpa perlu «Terapkan» terlebih dahulu.
            </strong>
          </>
        )}
      </p>
      {localErr ? (
        <Alert variant="danger" className="py-2 small mb-2">
          {localErr}
        </Alert>
      ) : null}
      {validationErr ? (
        <Alert variant="warning" className="py-2 small mb-2">
          <strong>Peringatan validasi sheet:</strong> {validationErr}
        </Alert>
      ) : null}
      {applyRes ? (
        <Alert
          variant={
            (applyRes.failed ?? 0) > 0 || (applyRes.skippedDuplicates ?? 0) > 0 ? "warning" : "success"
          }
          className="py-2 small mb-2"
        >
          <div className="mb-1">
            Selesai: <strong>{applyRes.inserted ?? applyRes.ok ?? 0}</strong> baris disisipkan,{" "}
            <strong>{applyRes.failed ?? applyRes.fail ?? 0}</strong> tidak disisipkan (gagal pratinjau / validasi
            sebelum sisip)
            {applyRes.attempted != null ? (
              <>
                {" "}
                · dijadwalkan sisip: <strong>{applyRes.attempted}</strong>
              </>
            ) : null}
            {applyRes.total != null ? ` — total baris di pratinjau: ${applyRes.total}` : ""}.
          </div>
          {(applyRes.skippedDuplicates ?? 0) > 0 ? (
            <div className="text-body-secondary border-top pt-1 mt-1">
              <strong>{applyRes.skippedDuplicates}</strong> baris dilewati karena kombinasi kode + tujuan + tahun +
              jenis sudah ada di basis data (bukan kegagalan sisip untuk baris baru yang valid).
            </div>
          ) : null}
        </Alert>
      ) : null}
      <div className="d-flex flex-wrap align-items-end gap-2 mb-2">
        <div>
          <Form.Label className="small mb-0">Berkas .xlsx</Form.Label>
          <Form.Control
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ref={fileRef}
            disabled={busy || pvBusy || apBusy}
            size="sm"
          />
        </div>
        <Button type="button" variant="outline-primary" size="sm" disabled={busy || pvBusy || apBusy} onClick={onPreview}>
          {pvBusy ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Memuat pratinjau…
            </>
          ) : (
            "Pratinjau"
          )}
        </Button>
        <Button
          type="button"
          variant="success"
          size="sm"
          disabled={busy || !preview?.previewId || pvBusy || apBusy}
          onClick={onApply}
        >
          {apBusy ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Menyisipkan…
            </>
          ) : (
            "Terapkan ke basis data"
          )}
        </Button>
      </div>
      {preview?.previewId ? (
        <div className="text-muted small mb-2">
          ID pratinjau: <code>{preview.previewId}</code> (kedaluwarsa setelah diterapkan atau ±1 jam)
        </div>
      ) : null}

      {/* ── Preview kaya: tab Indikator Tujuan, Sasaran, Strategi ── */}
      {isRichPreviewTab && richPreviewRows.length > 0 ? (
        <>
          <div className="fw-semibold small mb-2 text-success d-flex flex-wrap align-items-center gap-2">
            <span>
              ✓ {richPreviewRows.length} baris lolos pratinjau — sheet <code>{importTable}</code>
            </span>
            <Badge bg="success" className="fw-normal">
              siap Terapkan
            </Badge>
            {isIndikatorTujuanTab && (
              <span className="text-muted fw-normal">
                (juga tersedia di dropdown «Nama Indikator» Step Tujuan sebelum Terapkan)
              </span>
            )}
          </div>
          <div
            className="table-responsive rounded border shadow-sm mb-2"
            style={{
              maxHeight: "min(62vh, 520px)",
              overflow: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <Table striped hover size="sm" className="mb-0 align-middle">
              <thead
                className="table-light sticky-top"
                style={{ zIndex: 3, boxShadow: "0 1px 0 rgba(0,0,0,.08)" }}
              >
                <tr>
                  {!isIndikatorTujuanTab ? (
                    <>
                      <th className="text-muted small" style={{ width: 44 }}>#</th>
                      <th className="text-muted small" style={{ width: 56 }}>Baris</th>
                    </>
                  ) : null}
                  {richCols.map((c) => (
                    <th
                      key={c.key}
                      className="small text-secondary"
                      style={{
                        minWidth: c.maxW * 0.45,
                        maxWidth: c.maxW + 48,
                        fontSize: "0.7rem",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="small">
                {richPreviewRows.map((row, idx) => (
                  <tr key={row.__uid || `rich-${row._xlsxRowIndex ?? idx}`}>
                    {!isIndikatorTujuanTab ? (
                      <>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="text-muted font-monospace">{row._xlsxRowIndex ?? "—"}</td>
                      </>
                    ) : null}
                    {richCols.map((c) => (
                      <td
                        key={c.key}
                        className="align-top py-2"
                        style={{ maxWidth: c.maxW + 48, verticalAlign: "top" }}
                      >
                        <TujuanPreviewRichCell row={row} col={c} opdMap={opdMap} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}

      {/* ── Tabel status pratinjau ringkas (semua tab, termasuk baris error) ── */}
      {previewRows.length > 0 && !(isRichPreviewTab && richPreviewRows.length > 0) ? (
        <div className="table-responsive mb-2" style={{ maxHeight: 280 }}>
          <Table striped bordered hover size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Sheet</th>
                <th>Baris</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Status pratinjau</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => (
                <tr key={`${r.sheet}-${r.line}-${i}`} className={r.hasErr ? "table-warning" : undefined}>
                  <td className="text-nowrap">{r.sheet}</td>
                  <td>{r.line}</td>
                  <td>{r.kode}</td>
                  <td style={{ maxWidth: 200 }}>{r.nama}</td>
                  <td
                    className={`small ${r.hasErr ? "text-danger" : "text-success"}`}
                    style={{ maxWidth: 320 }}
                  >
                    {r.statusText}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
      {/* Tabel error ringkas — tab Indikator Tujuan / Sasaran / Strategi saat ada baris error bersama baris lolos */}
      {isRichPreviewTab && previewRows.some((r) => r.hasErr) ? (
        <div className="table-responsive mb-2" style={{ maxHeight: 200 }}>
          <div className="small fw-semibold text-danger mb-1">Baris bermasalah (tidak akan disisipkan):</div>
          <Table bordered size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Baris</th>
                <th>Nama</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {previewRows
                .filter((r) => r.hasErr)
                .map((r, i) => (
                  <tr key={`err-${r.line}-${i}`}>
                    <td>{r.line}</td>
                    <td style={{ maxWidth: 200 }}>{r.nama}</td>
                    <td className="small text-danger">{r.statusText}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      ) : null}

      {failDetails.length ? (
        <>
          <div className="fw-semibold small mb-1">Detail baris gagal (setelah terapkan)</div>
          <div className="table-responsive" style={{ maxHeight: 220 }}>
            <Table bordered size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sheet</th>
                  <th>Baris</th>
                  <th>Pesan</th>
                </tr>
              </thead>
              <tbody>
                {failDetails.map((d, i) => (
                  <tr key={`${d.sheet}-${d.line}-${i}`}>
                    <td>{d.sheet}</td>
                    <td>{d.line}</td>
                    <td className="small text-danger">{d.error || d.message}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}
      {Array.isArray(applyRes?.duplicateSkips) && applyRes.duplicateSkips.length > 0 ? (
        <>
          <div className="fw-semibold small mb-1 mt-2">Baris dilewati (sudah ada di basis data)</div>
          <div className="table-responsive border rounded" style={{ maxHeight: 200 }}>
            <Table striped size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sheet</th>
                  <th>Baris</th>
                  <th>Kode</th>
                  <th>Ringkasan</th>
                </tr>
              </thead>
              <tbody>
                {applyRes.duplicateSkips.map((d, i) => (
                  <tr key={`dup-${d.line}-${i}`}>
                    <td>{d.sheet}</td>
                    <td>{d.line}</td>
                    <td>
                      <code className="small">{d.kode_indikator || "—"}</code>
                    </td>
                    <td className="small text-muted">{d.message}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}
    </Alert>
  );
}

export default function RpjmdDokumenImporPanel({ periodeId }) {
  const { setIndikatortujuansRows } = useRpjmdExcelPreview();

  const handleIndikatorTujuanPreviewData = useCallback(
    (rows) => {
      setIndikatortujuansRows(rows);
    },
    [setIndikatortujuansRows]
  );

  /** Map { id: nama_opd } untuk resolusi penanggung_jawab ID → nama */
  const [opdMap, setOpdMap] = useState({});
  /** Baris OPD untuk dropdown modal edit (id + nama_opd) — satu fetch dengan opdMap. */
  const [opdList, setOpdList] = useState([]);
  useEffect(() => {
    api
      .get("/opd-penanggung-jawab", { params: { limit: 999 } })
      .then((res) => {
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const m = {};
        for (const r of rows) {
          if (r.id != null) m[String(r.id)] = r.nama_opd || "";
        }
        const { list } = dedupeOpdPenanggungJawabRows(rows);
        setOpdMap(m);
        setOpdList(list);
      })
      .catch(() => {}); // non-critical
  }, []);

  const [tab, setTab] = useState("u228");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [u228, setU228] = useState([]);
  const [apbd, setApbd] = useState([]);
  const [t31, setT31] = useState([]);
  const [arah, setArah] = useState([]);
  const [iku, setIku] = useState([]);
  const [ituj, setItuj] = useState([]);
  const [isas, setIsas] = useState([]);
  const [istr, setIstr] = useState([]);
  const [iarah, setIarah] = useState([]);
  const [iprog, setIprog] = useState([]);
  const [ikeg, setIkeg] = useState([]);
  const [isub, setIsub] = useState([]);
  const [actionBusy, setActionBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState("edit");
  const [editKey, setEditKey] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const pid = periodeId != null ? String(periodeId) : "";

  const load = useCallback(async () => {
    if (!pid) {
      setErr("Periode RPJMD belum dipilih.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const base = { params: { limit: 2000, offset: 0 } };
      const [
        sRes,
        uRes,
        aRes,
        tRes,
        rRes,
        iRes,
        itujRes,
        isasRes,
        istrRes,
        iarahRes,
        iprogRes,
        ikegRes,
        isubRes,
      ] = await Promise.all([
        api.get(`/rpjmd-import/summary/${pid}`),
        api.get(`/rpjmd-import/urusan-kinerja/${pid}`, base),
        api.get(`/rpjmd-import/apbd-proyeksi/${pid}`, base),
        api.get(`/rpjmd-import/tujuan-sasaran/${pid}`, base),
        api.get(`/rpjmd-import/arah-kebijakan/${pid}`, base),
        api.get(`/rpjmd-import/iku/${pid}`, base),
        api.get(`/rpjmd-import/indikator-tujuan/${pid}`, base),
        api.get(`/rpjmd-import/indikator-sasaran/${pid}`, base),
        api.get(`/rpjmd-import/indikator-strategi/${pid}`, base),
        api.get(`/rpjmd-import/indikator-arah-kebijakan/${pid}`, base),
        api.get(`/rpjmd-import/indikator-program/${pid}`, base),
        api.get(`/rpjmd-import/indikator-kegiatan/${pid}`, base),
        api.get(`/rpjmd-import/indikator-sub-kegiatan/${pid}`, base),
      ]);
      setSummary(extractData(sRes));
      setU228(extractData(uRes));
      setApbd(extractData(aRes));
      setT31(extractData(tRes));
      setArah(extractData(rRes));
      setIku(extractData(iRes));
      setItuj(extractData(itujRes));
      setIsas(extractData(isasRes));
      setIstr(extractData(istrRes));
      setIarah(extractData(iarahRes));
      setIprog(extractData(iprogRes));
      setIkeg(extractData(ikegRes));
      setIsub(extractData(isubRes));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat data impor.");
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (key, row) => {
    setEditMode("edit");
    setEditKey(key);
    setEditRow(row);
    setEditOpen(true);
  };

  const openCreate = (key) => {
    setEditMode("create");
    setEditKey(key);
    setEditRow(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditKey(null);
    setEditMode("edit");
  };

  const tabToolbar = (key) => (
    <div className="d-flex justify-content-end mb-2">
      <Button
        variant="success"
        size="sm"
        disabled={actionBusy || loading}
        onClick={() => openCreate(key)}
      >
        Tambah
      </Button>
    </div>
  );

  const handleDelete = async (tableKey, row) => {
    if (!row?.id) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setActionBusy(true);
    setErr(null);
    try {
      await rpjmdImportDelete(tableKey, pid, row.id);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal menghapus data.");
    } finally {
      setActionBusy(false);
    }
  };

  const actionsCell = (tableKey, row, opts = {}) => {
    const { stickyWideTable } = opts;
    const buttons = (
      <>
        <Button
          type="button"
          variant="outline-primary"
          size="sm"
          className="me-1"
          disabled={actionBusy}
          onClick={() => openEdit(tableKey, row)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="outline-danger"
          size="sm"
          disabled={actionBusy}
          onClick={() => handleDelete(tableKey, row)}
        >
          Hapus
        </Button>
      </>
    );
    if (stickyWideTable) {
      return (
        <td
          className="text-nowrap align-top"
          style={{
            position: "sticky",
            right: 0,
            zIndex: 1,
            minWidth: 132,
            width: 1,
            backgroundColor: "var(--bs-body-bg)",
            boxShadow: "-4px 0 8px rgba(0,0,0,0.06)",
          }}
        >
          {buttons}
        </td>
      );
    }
    return <td className="text-nowrap" style={{ width: 1 }}>{buttons}</td>;
  };

  const indikatorTable = (tableKey, rows) => {
    const cols = gridColsForIndikatorTable(tableKey);
    /* opdMap tersedia dari closure parent component */
    const colCount = cols.length + 1;
    return (
      <>
        {tabToolbar(tableKey)}
        <p className="text-muted small mb-2 mb-md-1">
          Tabel lebar: gunakan scroll horizontal di dalam kotak di bawah — tata letak halaman tidak ikut melebar.
        </p>
        <div
          className="table-responsive rounded border min-w-0 shadow-sm"
          style={{
            maxHeight: "min(70vh, 560px)",
            maxWidth: "100%",
            overflow: "auto",
            overscrollBehaviorX: "contain",
          }}
        >
          <Table bordered hover size="sm" className="mb-0">
            <thead className="table-light sticky-top" style={{ zIndex: 2 }}>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className="small text-wrap text-break"
                    style={{ maxWidth: 112, verticalAlign: "bottom" }}
                    title={c.label}
                  >
                    {c.label}
                  </th>
                ))}
                <th
                  className="text-center text-nowrap"
                  style={{
                    position: "sticky",
                    right: 0,
                    zIndex: 3,
                    minWidth: 132,
                    backgroundColor: "var(--bs-table-bg)",
                    boxShadow: "-4px 0 8px rgba(0,0,0,0.06)",
                  }}
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan={colCount} className="text-muted text-center py-3">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    {cols.map((c) => (
                      <td
                        key={c.key}
                        className="small align-top text-break"
                        style={{
                          maxWidth:
                            c.key === "nama_indikator" || c.key === "nama_sub_kegiatan" ? 220 : 120,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={String(indikatortujuansCellRaw(r, c.key) ?? "")}
                      >
                        {indikatorGridCell(r, c, opdMap)}
                      </td>
                    ))}
                    {actionsCell(tableKey, r, { stickyWideTable: true })}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </>
    );
  };

  if (!pid) {
    return <Alert variant="warning">Pilih periode RPJMD aktif untuk menampilkan data impor dokumen.</Alert>;
  }

  return (
    <div className="rpjmd-dokumen-impor-panel min-w-0">
      <h5 className="mb-2">Data impor dokumen RPJMD (PDF)</h5>
      <p className="text-muted small mb-3">
        Data impor ini mengikuti <strong>satu periode RPJMD</strong> (rentang berjalan), bukan pengaturan angka
        kalender terpisah dari periode tersebut. Sumber: ekstraksi tabel dari dokumen naskah RPJMD. Anda dapat
        mengoreksi atau menghapus baris hasil
        impor di bawah. Untuk struktur operasional (tujuan/sasaran), gunakan menu input; data di sini dapat dipakai
        referensi silang.
        {" "}
        <Link to="/dashboard-rpjmd?menu=tujuan_list">Daftar tujuan</Link>
        {" · "}
        <Link to="/dashboard-rpjmd?menu=sasaran_list">Daftar sasaran</Link>
      </p>
      {err && <Alert variant="danger">{err}</Alert>}
      {loading && (
        <div className="d-flex align-items-center gap-2 mb-2">
          <Spinner animation="border" size="sm" />
          <span>Memuat…</span>
        </div>
      )}
      {summary && (
        <Alert variant="light" className="small py-2 mb-3 border">
          Ringkasan periode #{pid}: urusan 2021–2024 = {summary.urusan_kinerja_2021_2024}, APBD ={" "}
          {summary.apbd_proyeksi_2026_2030}, tujuan-sasaran = {summary.rpjmd_target_tujuan_sasaran_2025_2029}, arah
          kebijakan = {summary.arah_kebijakan_rpjmd}, IKU = {summary.iku_rpjmd}.
        </Alert>
      )}

      <Tab.Container activeKey={tab} onSelect={(k) => setTab(k || "u228")}>
        <Nav variant="tabs" className="mb-2 flex-wrap">
          <Nav.Item>
            <Nav.Link eventKey="u228">Kinerja urusan 2021–2024 (2.28)</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="apbd">Proyeksi APBD 2026–2030 (2.29)</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="t31">Target tujuan &amp; sasaran (3.1)</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="arah">Arah kebijakan (3.3)</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="iku">IKU provinsi (4.2)</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_tujuan">Indikator tujuan</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_sasaran">Indikator sasaran</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_strategi">Indikator strategi</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_arah_kebijakan">Indikator arah kebijakan</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_program">Indikator program</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_kegiatan">Indikator kegiatan</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="indikator_sub_kegiatan">Indikator sub kegiatan</Nav.Link>
          </Nav.Item>
        </Nav>
        {String(tab || "").startsWith("indikator_") ? (
          <RpjmdIndikatorExcelImportCard
            periodeId={pid}
            importTable={INDIKATOR_TAB_IMPORT_TABLE[tab] || "indikatortujuans"}
            onApplied={load}
            busy={loading || actionBusy}
            opdMap={opdMap}
            onPreviewData={
              tab === "indikator_tujuan"
                ? handleIndikatorTujuanPreviewData
                : undefined
            }
          />
        ) : null}
        <Tab.Content className="min-w-0">
          <Tab.Pane eventKey="u228">
            {tabToolbar("u228")}
            <div className="table-responsive" style={{ maxHeight: 560, overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Bidang</th>
                    <th>No</th>
                    <th>Indikator</th>
                    <th>2021</th>
                    <th>2022</th>
                    <th>2023</th>
                    <th>2024</th>
                    <th>2025</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!u228.length ? (
                    <tr>
                      <td colSpan={9} className="text-muted text-center py-3">
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    u228.map((r) => (
                      <tr key={r.id}>
                        <td>{r.bidang_urusan}</td>
                        <td>{r.no_urut}</td>
                        <td style={{ maxWidth: 280 }}>{r.indikator}</td>
                        <td>{r.tahun_2021}</td>
                        <td>{r.tahun_2022}</td>
                        <td>{r.tahun_2023}</td>
                        <td>{r.tahun_2024}</td>
                        <td>{r.tahun_2025}</td>
                        {actionsCell("u228", r)}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="apbd">
            {tabToolbar("apbd")}
            <div className="table-responsive" style={{ maxHeight: 560, overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Kode</th>
                    <th>Uraian</th>
                    <th>2025</th>
                    <th>2026</th>
                    <th>2027</th>
                    <th>2028</th>
                    <th>2029</th>
                    <th>2030</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!apbd.length ? (
                    <tr>
                      <td colSpan={9} className="text-muted text-center py-3">
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    apbd.map((r) => (
                      <tr key={r.id}>
                        <td>{r.kode_baris}</td>
                        <td style={{ maxWidth: 260 }}>{r.uraian}</td>
                        <td>{r.target_2025}</td>
                        <td>{r.proyeksi_2026}</td>
                        <td>{r.proyeksi_2027}</td>
                        <td>{r.proyeksi_2028}</td>
                        <td>{r.proyeksi_2029}</td>
                        <td>{r.proyeksi_2030}</td>
                        {actionsCell("apbd", r)}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="t31">
            {tabToolbar("t31")}
            <div className="table-responsive" style={{ maxHeight: 560, overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>#</th>
                    <th>Tujuan</th>
                    <th>Sasaran / indikator</th>
                    <th>Baseline &apos;24</th>
                    <th>25</th>
                    <th>26</th>
                    <th>27</th>
                    <th>28</th>
                    <th>29</th>
                    <th>30</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!t31.length ? (
                    <tr>
                      <td colSpan={11} className="text-muted text-center py-3">
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    t31.map((r) => (
                      <tr key={r.id}>
                        <td>{r.urutan}</td>
                        <td style={{ maxWidth: 200 }}>{r.tujuan}</td>
                        <td style={{ maxWidth: 240 }}>{r.indikator}</td>
                        <td>{r.baseline_2024}</td>
                        <td>{r.target_2025}</td>
                        <td>{r.target_2026}</td>
                        <td>{r.target_2027}</td>
                        <td>{r.target_2028}</td>
                        <td>{r.target_2029}</td>
                        <td>{r.target_2030}</td>
                        {actionsCell("t31", r)}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="arah">
            {tabToolbar("arah")}
            <div className="table-responsive" style={{ maxHeight: 560, overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>No misi</th>
                    <th>Misi ringkas</th>
                    <th>Arah kebijakan (cuplikan)</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!arah.length ? (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-3">
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    arah.map((r) => (
                      <tr key={r.id}>
                        <td>{r.no_misi}</td>
                        <td style={{ maxWidth: 200 }}>{r.misi_ringkas}</td>
                        <td style={{ maxWidth: 360 }}>{truncate(r.arah_kebijakan, 200)}</td>
                        {actionsCell("arah", r)}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="iku">
            {tabToolbar("iku")}
            <div className="table-responsive" style={{ maxHeight: 560, overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>No</th>
                    <th>Indikator</th>
                    <th>Baseline &apos;24</th>
                    <th>25</th>
                    <th>26</th>
                    <th>27</th>
                    <th>28</th>
                    <th>29</th>
                    <th>30</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!iku.length ? (
                    <tr>
                      <td colSpan={10} className="text-muted text-center py-3">
                        Belum ada data.
                      </td>
                    </tr>
                  ) : (
                    iku.map((r) => (
                      <tr key={r.id}>
                        <td>{r.no_urut}</td>
                        <td style={{ maxWidth: 280 }}>{r.indikator}</td>
                        <td>{r.baseline_2024}</td>
                        <td>{r.target_2025}</td>
                        <td>{r.target_2026}</td>
                        <td>{r.target_2027}</td>
                        <td>{r.target_2028}</td>
                        <td>{r.target_2029}</td>
                        <td>{r.target_2030}</td>
                        {actionsCell("iku", r)}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="indikator_tujuan">{indikatorTable("indikator_tujuan", ituj)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_sasaran">{indikatorTable("indikator_sasaran", isas)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_strategi">{indikatorTable("indikator_strategi", istr)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_arah_kebijakan">{indikatorTable("indikator_arah_kebijakan", iarah)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_program">{indikatorTable("indikator_program", iprog)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_kegiatan">{indikatorTable("indikator_kegiatan", ikeg)}</Tab.Pane>
          <Tab.Pane eventKey="indikator_sub_kegiatan">{indikatorTable("indikator_sub_kegiatan", isub)}</Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <RpjmdImportEditModal
        show={editOpen}
        mode={editMode}
        tableKey={editKey}
        row={editRow}
        periodeId={pid}
        onHide={closeEdit}
        onSaved={load}
        onBusyChange={setActionBusy}
        rowsU228={u228}
        rowsApbd={apbd}
        rowsT31={t31}
        rowsIndikatorSasaran={isas}
        rowsIndikatorProgram={iprog}
      />
    </div>
  );
}

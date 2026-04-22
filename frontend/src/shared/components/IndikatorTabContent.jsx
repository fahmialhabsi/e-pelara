// src/components/IndikatorTabContent.jsx

import React, { useEffect, useMemo } from "react";
import { Col, Form } from "react-bootstrap";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  uniqueColumnOptions,
  unionYearColumnsOptions,
  optionsWithCurrentValue,
  computeRationalBaselineFromFourCaps,
  extrapolateCapaianTahun5FromFour,
  parseFlexibleNumber,
} from "@/features/rpjmd/utils/urusanKinerja228Picklists";
import { applyRpjmdTujuanSasaran31Row } from "@/features/rpjmd/utils/rpjmdIndicatorImportApply";
import {
  hydrateDraftFromIndikatorRow,
  mapApiIndikatorToListRow,
} from "@/shared/components/steps/wizardIndikatorStepUtils";
import { WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT } from "@/shared/constants/rpjmdIndikatorWizardSteps";

const URU_TAHUN_COL_BY_CAPAIAN = {
  capaian_tahun_1: "tahun_2021",
  capaian_tahun_2: "tahun_2022",
  capaian_tahun_3: "tahun_2023",
  capaian_tahun_4: "tahun_2024",
};

/** Samakan id misi wizard / baris API (string vs number, camelCase). */
function parsePositiveIntId(v) {
  if (v == null || v === "") return null;
  const n = Number.parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rowMisiIdFromIndikatorTujuanRow(r) {
  if (!r || typeof r !== "object") return null;
  return parsePositiveIntId(r.misi_id ?? r.misiId);
}

/**
 * Dropdown Nama Indikator — step Strategi: baris `values.strategi` (GET by-strategi),
 * bukan sheet impor indikator tujuan (itk) agar kode tetap STR…
 */
function buildMergedStrategiNamaIndikatorOptions(values) {
  const out = [];
  const selSid = parsePositiveIntId(values.strategi_id);
  if (selSid == null) return out;

  (Array.isArray(values.strategi) ? values.strategi : []).forEach((r) => {
    if (!r || typeof r !== "object") return;
    const rowSid = parsePositiveIntId(r.strategi_id ?? r.strategiId);
    if (rowSid != null && rowSid !== selSid) return;
    const nama = String(r.nama_indikator || r.indikator || "").trim();
    if (!nama) return;
    const shortNama = nama.length > 90 ? `${nama.slice(0, 90)}…` : nama;
    const isXlsx = Boolean(r._xlsxSource);
    const rowKey =
      isXlsx && r.__uid
        ? String(r.__uid)
        : String(r.id ?? "").trim() ||
          (r.__uid != null ? String(r.__uid).trim() : "");
    if (!rowKey) return;
    out.push({
      value: `ist:${rowKey}`,
      label: shortNama,
      row: r,
      _src: "ist",
      _rowKey: rowKey,
    });
  });
  return out;
}

/** Label dropdown Penanggung Jawab: hanya `nama_opd` (bersih dari angka di depan). */
function opdPenanggungJawabLabelOnly(opd) {
  if (!opd || typeof opd !== "object") return "";
  let s = String(opd.nama_opd ?? "").trim();
  if (!s && opd.label != null) s = String(opd.label).trim();
  s = s.replace(/^\d+\s*[-.]\s*/, "").trim();
  if (/^\d+$/.test(s)) return "";
  return s;
}

function opdNamaFromTujuanRowForPj(values) {
  const row = Array.isArray(values?.tujuan) ? values.tujuan[0] : null;
  if (!row || typeof row !== "object") return "";
  const nested =
    row.opdPenanggungJawab ??
    row.opd_penanggung_jawab ??
    row.OpdPenanggungJawab ??
    null;
  if (nested && typeof nested === "object") {
    const n = String(nested.nama_opd ?? "").trim();
    if (n) return n;
  }
  return "";
}

export default function IndikatorTabContent({
  tabKey,
  fields,
  values,
  errors,
  touched,
  setFieldValue,
  opdOptions = [],
  stepOptions = [],
  wizardStepKey,
  urusanKinerja228 = [],
  rpjmdTujuanSasaran31 = [],
  rpjmdImporIndikatorTujuan = [],
  rpjmdPdfImportRefsLoading: _rpjmdPdfImportRefsLoading = false,
  handleFieldChange,
  handleFieldChangeWithUnit,
}) {
  /** Field yang diisi otomatis (autofill) saat memilih baris dari impor Excel. */
  const AUTOFILL_FIELD_NAMES = new Set([
    "tipe_indikator",
    "jenis_indikator",
    "jenis",
    "tolok_ukur_kinerja",
    "target_kinerja",
    "kriteria_kuantitatif",
    "kriteria_kualitatif",
    "definisi_operasional",
    "metode_penghitungan",
  ]);

  /**
   * Indikator tujuan impor: saat Misi atau Tujuan dipilih → tampilkan baris referensi yang relevan.
   *
   * Strategi filter (dua lapis, OR):
   *   1. tujuan_id cocok (paling spesifik & tidak bergantung pada kebenaran misi_id di DB)
   *   2. misi_id cocok atau null (fallback ketika tujuan belum dipilih)
   *
   * Lapis 1 memproteksi dari bug data lama: jika misi_id di baris referensi salah karena
   * tujuan_id mapping salah (import sebelum fix), baris tetap muncul selama tujuan_id benar.
   *
   * Tabel 3.1 & 2.28 tidak punya kolom misi — hanya ditampilkan jika Misi wizard belum dipilih.
   */
  const mergedIndikatorImportOptions = useMemo(() => {
    if (wizardStepKey === "strategi") {
      return buildMergedStrategiNamaIndikatorOptions(values);
    }

    const out = [];
    const selMisi = parsePositiveIntId(values.misi_id);
    const selTujuan = parsePositiveIntId(values.tujuan_id);
    // Kode prefix tujuan (mis. "T1-01") yang disimpan saat pengguna memilih tujuan.
    // Diisi oleh handleTujuanChange / syncSelectionFromTujuanItem via setFieldValue.
    const selNoTujuanCode = String(values.tujuan_no_tujuan_code || "")
      .trim()
      .toUpperCase();

    // Butuh setidaknya satu konteks terpilih agar baris ditampilkan
    const hasContext = selMisi != null || selTujuan != null;

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[IndikatorTabContent] rpjmdImporIndikatorTujuan: ${(rpjmdImporIndikatorTujuan || []).length} baris mentah | selMisi=${selMisi} selTujuan=${selTujuan} selNoTujuanCode=${selNoTujuanCode}`,
      );
    }

    if (wizardStepKey === "tujuan") {
    (rpjmdImporIndikatorTujuan || []).forEach((r) => {
      if (!hasContext) return;

      const rowMisi = rowMisiIdFromIndikatorTujuanRow(r);
      const rowTujuan = parsePositiveIntId(r.tujuan_id ?? r.tujuanId);
      const rowRefCode = String(
        r.reference_target_code ?? r.referenceTargetCode ?? "",
      )
        .trim()
        .toUpperCase();

      /**
       * Strategi filter (tiga lapis):
       *
       * Lapis 1 — reference_target_code (paling andal, tidak bergantung pada FK lama):
       *   Jika baris referensi punya reference_target_code dan pengguna sudah memilih
       *   tujuan (selNoTujuanCode tersedia), gunakan kecocokan kode prefix sebagai sumber
       *   kebenaran utama.
       *
       * Lapis 2 — tujuan_id cocok persis (fallback untuk baris tanpa reference_target_code):
       *   Tidak bergantung pada kebenaran misi_id di DB.
       *
       * Lapis 3 — misi_id cocok atau null (fallback terakhir):
       *   Untuk baris yang tidak punya tujuan_id / reference_target_code tapi ada misi.
       */
      let match = false;

      if (rowRefCode && selNoTujuanCode) {
        // Lapis 1: filter berdasarkan kode prefix tujuan (paling deterministic)
        match = rowRefCode === selNoTujuanCode;
      } else {
        // Lapis 2 & 3: fallback ke tujuan_id / misi_id
        const matchTujuan =
          selTujuan != null && rowTujuan != null && rowTujuan === selTujuan;
        const matchMisi =
          selMisi != null && (rowMisi === null || rowMisi === selMisi);
        match = matchTujuan || matchMisi;
      }

      if (!match) return;

      const nama = String(r.nama_indikator || "").trim();
      if (!nama) return;
      const shortNama = nama.length > 90 ? `${nama.slice(0, 90)}…` : nama;
      const isXlsx = Boolean(r._xlsxSource);
      // Gunakan __uid (synthetic id dari backend) untuk baris xlsx agar unik
      // meskipun r.id null. Untuk baris dari DB gunakan id numerik seperti biasa.
      const rowKey = isXlsx && r.__uid ? r.__uid : String(r.id ?? "");
      out.push({
        value: `itk:${rowKey}`,
        // Label = nama saja (kode tidak ditampilkan; jangan timpa kode_indikator wizard dari baris impor)
        label: shortNama,
        row: r,
        _src: "itk",
        _rowKey: rowKey,
      });
    });
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[IndikatorTabContent] options setelah filter: ${out.length} baris`,
      );
    }

    if (!hasContext) {
      (rpjmdTujuanSasaran31 || []).forEach((r) => {
        const ind = String(r.indikator || "").trim();
        if (!ind) return;
        const short = ind.length > 100 ? `${ind.slice(0, 100)}…` : ind;
        out.push({
          value: `t31:${r.id}`,
          label: short,
          row: r,
          _src: "t31",
        });
      });
      (urusanKinerja228 || []).forEach((r) => {
        const ind = String(r.indikator || "").trim();
        if (!ind) return;
        const short = ind.length > 120 ? `${ind.slice(0, 120)}…` : ind;
        out.push({
          value: `u228:${r.id}`,
          label: short,
          row: r,
          _src: "u228",
        });
      });
    }
    return out;
  }, [
    wizardStepKey,
    rpjmdImporIndikatorTujuan,
    values.misi_id,
    values.tujuan_id,
    values.tujuan_no_tujuan_code,
    values.strategi_id,
    values.strategi,
    rpjmdTujuanSasaran31,
    urusanKinerja228,
  ]);

  const namaIndikatorSelectValue = useMemo(() => {
    const v = values.nama_indikator;

    if (wizardStepKey === "strategi") {
      const pickId = values.rpjmd_import_indikator_strategi_id;
      if (pickId != null && String(pickId).trim() !== "") {
        const pickStr = String(pickId).trim();
        const istHit = mergedIndikatorImportOptions.find((o) => {
          if (o._src !== "ist") return false;
          if (o._rowKey != null && String(o._rowKey) === pickStr) return true;
          return Number(o.row?.id) === Number(pickStr);
        });
        if (istHit) return istHit;
      }
      if (v == null || String(v).trim() === "") return null;
      const t = String(v).trim();
      const hit = mergedIndikatorImportOptions.find((o) => {
        const rowNama = String(
          o.row?.nama_indikator ?? o.row?.indikator ?? "",
        ).trim();
        return rowNama === t;
      });
      if (hit) return hit;
      return { value: "__manual__", label: t, row: null };
    }

    const pickId = values.rpjmd_import_indikator_tujuan_id;
    if (pickId != null && String(pickId).trim() !== "") {
      const pickStr = String(pickId).trim();
      const itkHit = mergedIndikatorImportOptions.find((o) => {
        if (o._src !== "itk") return false;
        // Cocokkan dengan __uid (xlsx) atau id numerik (DB)
        if (o._rowKey != null && String(o._rowKey) === pickStr) return true;
        // Fallback: cocokkan numeric id untuk baris DB lama
        return Number(o.row?.id) === Number(pickStr);
      });
      if (itkHit) return itkHit;
    }
    if (v == null || String(v).trim() === "") return null;
    const t = String(v).trim();
    const hit = mergedIndikatorImportOptions.find((o) => {
      const rowNama = String(
        o.row?.nama_indikator ?? o.row?.indikator ?? "",
      ).trim();
      return rowNama === t;
    });
    if (hit) return hit;
    return { value: "__manual__", label: t, row: null };
  }, [
    wizardStepKey,
    values.nama_indikator,
    values.rpjmd_import_indikator_tujuan_id,
    values.rpjmd_import_indikator_strategi_id,
    mergedIndikatorImportOptions,
  ]);

  /** Jangan kunci/badge autofill jika id impor tidak lagi punya baris sumber (preview dikosongkan / DB kosong). */
  const rpjmdImportRowStillValid = useMemo(() => {
    const pickId = values.rpjmd_import_indikator_tujuan_id;
    if (pickId == null || String(pickId).trim() === "") return false;
    const pickStr = String(pickId).trim();
    return mergedIndikatorImportOptions.some((o) => {
      if (o._src !== "itk") return false;
      if (o._rowKey != null && String(o._rowKey) === pickStr) return true;
      return Number(o.row?.id) === Number(pickStr);
    });
  }, [values.rpjmd_import_indikator_tujuan_id, mergedIndikatorImportOptions]);

  useEffect(() => {
    if (wizardStepKey !== "tujuan") return;
    const pickId = values.rpjmd_import_indikator_tujuan_id;
    if (pickId == null || String(pickId).trim() === "") return;
    if (rpjmdImportRowStillValid) return;
    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
  }, [
    wizardStepKey,
    values.rpjmd_import_indikator_tujuan_id,
    rpjmdImportRowStillValid,
    setFieldValue,
  ]);

  useEffect(() => {
    const pickId = values.rpjmd_import_indikator_strategi_id;
    if (pickId == null || String(pickId).trim() === "") return;
    if (wizardStepKey !== "strategi") {
      setFieldValue("rpjmd_import_indikator_strategi_id", "");
      return;
    }
    const pickStr = String(pickId).trim();
    const still = mergedIndikatorImportOptions.some((o) => {
      if (o._src !== "ist") return false;
      if (o._rowKey != null && String(o._rowKey) === pickStr) return true;
      return Number(o.row?.id) === Number(pickStr);
    });
    if (still) return;
    setFieldValue("rpjmd_import_indikator_strategi_id", "");
  }, [
    wizardStepKey,
    values.rpjmd_import_indikator_strategi_id,
    mergedIndikatorImportOptions,
    setFieldValue,
  ]);

  const unionYearOpts = useMemo(
    () => unionYearColumnsOptions(urusanKinerja228),
    [urusanKinerja228],
  );

  useEffect(() => {
    if (wizardStepKey !== "tujuan") return;
    const next = computeRationalBaselineFromFourCaps(
      values.capaian_tahun_1,
      values.capaian_tahun_2,
      values.capaian_tahun_3,
      values.capaian_tahun_4,
    );
    if (!next) return;
    const curN = parseFlexibleNumber(values.baseline);
    const nextN = parseFlexibleNumber(next);
    if (curN !== null && nextN !== null && Math.abs(curN - nextN) < 1e-6)
      return;
    setFieldValue("baseline", next);
    const cap5Empty =
      values.capaian_tahun_5 == null ||
      String(values.capaian_tahun_5).trim() === "";
    if (cap5Empty) {
      const cap5 = extrapolateCapaianTahun5FromFour(
        values.capaian_tahun_1,
        values.capaian_tahun_2,
        values.capaian_tahun_3,
        values.capaian_tahun_4,
      );
      if (cap5) setFieldValue("capaian_tahun_5", cap5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline/cap5 dibaca hanya untuk skip set redundan; jangan jalankan ulang saat cap5/baseline diedit saja
  }, [
    wizardStepKey,
    values.capaian_tahun_1,
    values.capaian_tahun_2,
    values.capaian_tahun_3,
    values.capaian_tahun_4,
    setFieldValue,
  ]);

  return (
    <>
      {fields[tabKey]?.map((field) => {
        if (!field) return null;

        // Dropdown Tujuan
        if (field.type === "tujuan") {
          const tujuanOptions = (stepOptions.length > 0 ? stepOptions : []).map(
            (t) => ({
              value: t.id,
              label: `${t.no_tujuan} - ${t.isi_tujuan}`,
            }),
          );

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                name={field.name}
                options={tujuanOptions}
                value={
                  tujuanOptions.find(
                    (opt) => opt.value === values[field.name],
                  ) || null
                }
                onChange={(selected) =>
                  setFieldValue(field.name, selected?.value || "")
                }
                placeholder={field.placeholder}
                isClearable
              />
            </Form.Group>
          );
        }

        // Dropdown Sasaran
        if (field.name === "sasaran_id") {
          const sasaranOptions = (
            stepOptions.length > 0 ? stepOptions : []
          ).map((s) => ({
            value: s.id,
            label: `${s.nomor} - ${s.isi_sasaran}`,
          }));

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label || "Pilih Sasaran"}</Form.Label>
              <Select
                name={field.name}
                options={sasaranOptions}
                value={
                  sasaranOptions.find(
                    (opt) => opt.value === values[field.name],
                  ) || null
                }
                onChange={(selected) =>
                  setFieldValue(field.name, selected?.value || "")
                }
                placeholder="Pilih Sasaran"
                isClearable
              />
            </Form.Group>
          );
        }

        // Nama Indikator — semua step indikator RPJMD: opsi impor + jangan timpa kode_indikator wizard
        if (
          WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT.has(wizardStepKey) &&
          tabKey === 1 &&
          field.name === "nama_indikator"
        ) {
          return (
            <Form.Group as={Col} md={12} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <CreatableSelect
                inputId={`nama-indikator-rpjmd-pdf-import-${wizardStepKey}`}
                options={mergedIndikatorImportOptions}
                value={namaIndikatorSelectValue}
                onChange={(opt) => {
                  if (!opt) {
                    setFieldValue("nama_indikator", "");
                    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
                    setFieldValue("rpjmd_import_indikator_strategi_id", "");
                    return;
                  }
                  if (opt.__isNew__) {
                    setFieldValue(
                      "nama_indikator",
                      String(opt.value || "").trim(),
                    );
                    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
                    setFieldValue("rpjmd_import_indikator_strategi_id", "");
                    return;
                  }
                  if (opt.row) {
                    if (opt._src === "ist") {
                      if (wizardStepKey !== "strategi") return;
                      setFieldValue("rpjmd_import_indikator_tujuan_id", "");
                      setFieldValue(
                        "rpjmd_import_indikator_strategi_id",
                        opt._rowKey ?? opt.row.id ?? "",
                      );
                      hydrateDraftFromIndikatorRow(opt.row, setFieldValue);
                      const rowKode = String(
                        opt.row?.kode_indikator ?? "",
                      ).trim();
                      const kodeWizard = values.kode_indikator;
                      setFieldValue(
                        "kode_indikator",
                        rowKode ||
                          (kodeWizard == null ? "" : String(kodeWizard).trim()),
                      );
                      return;
                    }
                    if (opt._src === "itk") {
                      if (wizardStepKey !== "tujuan") return;
                      const kodeWizard = values.kode_indikator;
                      setFieldValue("rpjmd_import_indikator_strategi_id", "");
                      setFieldValue(
                        "rpjmd_import_indikator_tujuan_id",
                        opt._rowKey ?? opt.row.id,
                      );
                      hydrateDraftFromIndikatorRow(opt.row, setFieldValue);
                      // Pakai kode dari baris yang dipilih jika tersedia (misal: T1-01-01 dari DB).
                      // Fallback ke kode wizard (next-kode otomatis) hanya jika baris belum punya kode.
                      const rowKode = String(
                        opt.row?.kode_indikator ?? "",
                      ).trim();
                      setFieldValue(
                        "kode_indikator",
                        rowKode ||
                          (kodeWizard == null ? "" : String(kodeWizard).trim()),
                      );
                      const mapped = { ...mapApiIndikatorToListRow(opt.row) };
                      delete mapped.id;
                      delete mapped.indikator_id;
                      setFieldValue("tujuan", [mapped]);
                      return;
                    }
                    if (opt._src === "t31") {
                      setFieldValue("rpjmd_import_indikator_tujuan_id", "");
                      setFieldValue("rpjmd_import_indikator_strategi_id", "");
                      applyRpjmdTujuanSasaran31Row(opt.row, setFieldValue);
                      return;
                    }
                    const row = opt.row;
                    setFieldValue("rpjmd_import_indikator_tujuan_id", "");
                    setFieldValue("rpjmd_import_indikator_strategi_id", "");
                    setFieldValue(
                      "nama_indikator",
                      row.indikator != null ? String(row.indikator) : "",
                    );
                    return;
                  }
                  setFieldValue(
                    "nama_indikator",
                    String(opt.label || "").trim(),
                  );
                }}
                placeholder={
                  wizardStepKey === "tujuan"
                    ? "Pilih indikator tujuan (impor PDF, sesuai Misi) / 3.1 / 2.28 atau ketik manual"
                    : wizardStepKey === "strategi"
                      ? "Pilih indikator strategi (data strategi terpilih) atau ketik manual"
                      : "Pilih nama indikator dari impor (PDF/Excel) atau ketik manual"
                }
                isClearable
                formatCreateLabel={(input) => `Gunakan teks: "${input}"`}
                classNamePrefix="rs"
              />
              <Form.Text className="text-muted">
                {mergedIndikatorImportOptions.some(
                  (o) => o.row?._xlsxSource,
                ) ? (
                  <>
                    <strong>Sumber aktif: pratinjau Excel</strong> — dropdown
                    memuat baris dari berkas .xlsx yang dipratinjau di tab{" "}
                    <em>Indikator Tujuan</em> (Data impor dokumen RPJMD).
                    Setelah pilih baris, tab Detail, Deskripsi, dan Target
                    terisi otomatis (field ditandai{" "}
                    <span className="badge bg-secondary text-white">
                      terisi otomatis
                    </span>
                    ). Semua kolom tetap dapat disunting manual dengan menghapus
                    pilihan dropdown Nama Indikator terlebih dahulu.
                  </>
                ) : (
                  <>
                    <strong>Indikator tujuan impor</strong> (Data impor dokumen
                    RPJMD → tab Indikator tujuan) hanya muncul setelah{" "}
                    <strong>Misi</strong> dipilih di step sebelumnya. Tanpa
                    misi, dropdown memuat acuan <strong>3.1</strong> dan{" "}
                    <strong>2.28</strong> saja. Setelah pilih baris impor, tab
                    Detail, Deskripsi, dan Target mengikuti data baris tersebut.
                    Semua kolom tetap dapat diedit.
                  </>
                )}
              </Form.Text>
              {touched[field.name] && errors[field.name] ? (
                <div className="text-danger small mt-1">
                  {errors[field.name]}
                </div>
              ) : null}
            </Form.Group>
          );
        }

        // Step Tujuan + impor 2.28: Capaian 1–4 dari kolom 2021–2024
        const uruCol = URU_TAHUN_COL_BY_CAPAIAN[field.name];
        if (
          wizardStepKey === "tujuan" &&
          tabKey === 4 &&
          uruCol &&
          Array.isArray(urusanKinerja228) &&
          urusanKinerja228.length > 0
        ) {
          const opts = optionsWithCurrentValue(
            uniqueColumnOptions(urusanKinerja228, uruCol),
            values[field.name],
          );
          const cur = values[field.name];
          const selected =
            cur != null && String(cur).trim() !== ""
              ? opts.find((o) => o.value === String(cur).trim()) || {
                  value: String(cur).trim(),
                  label: String(cur).trim(),
                }
              : null;
          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                inputId={`cap-${field.name}-228`}
                options={opts}
                value={selected}
                onChange={(opt) =>
                  setFieldValue(field.name, opt ? String(opt.value) : "")
                }
                placeholder={`Kolom impor (${String(uruCol).replace(/^tahun_/, "th. ")})`}
                isClearable
                classNamePrefix="rs"
              />
              <Form.Text className="text-muted">
                Opsi dari kolom impor tabel 2.28 yang sesuai (capaian historis).
              </Form.Text>
            </Form.Group>
          );
        }

        // Step Tujuan + impor 2.28: Capaian 5 — opsi gabungan nilai 2021–2024 (baseline otomatis dari T1–T4)
        if (
          wizardStepKey === "tujuan" &&
          tabKey === 4 &&
          field.name === "capaian_tahun_5" &&
          Array.isArray(urusanKinerja228) &&
          urusanKinerja228.length > 0
        ) {
          const opts = optionsWithCurrentValue(
            unionYearOpts,
            values[field.name],
          );
          const cur = values[field.name];
          const selected =
            cur != null && String(cur).trim() !== ""
              ? opts.find((o) => o.value === String(cur).trim()) || {
                  value: String(cur).trim(),
                  label: String(cur).trim(),
                }
              : null;
          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                inputId={`${field.name}-228-union`}
                options={opts}
                value={selected}
                onChange={(opt) =>
                  setFieldValue(field.name, opt ? String(opt.value) : "")
                }
                placeholder="Pilih nilai yang pernah muncul di 2021–2024 (impor)"
                isClearable
                classNamePrefix="rs"
              />
              <Form.Text className="text-muted">
                Daftar gabungan nilai unik dari kolom <strong>2021</strong> s.d.{" "}
                <strong>2024</strong> pada tabel impor 2.28.
              </Form.Text>
            </Form.Group>
          );
        }

        if (
          wizardStepKey === "tujuan" &&
          tabKey === 4 &&
          field.name === "baseline"
        ) {
          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Control
                name={field.name}
                type="text"
                value={values.baseline || ""}
                onChange={handleFieldChangeWithUnit(field.name)}
                isInvalid={touched[field.name] && !!errors[field.name]}
                placeholder="Terisi otomatis dari Capaian T1–T4"
              />
              <Form.Control.Feedback type="invalid">
                {errors[field.name]}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Otomatis: rata-rata berbobot{" "}
                <strong>1&nbsp;: 2&nbsp;: 3&nbsp;: 4</strong> pada capaian th.
                ke-1 s/d ke-4 (th. ke-4 historis lebih berat). Contoh 68,30 …
                70,04 menghasilkan sekitar <strong>69.50</strong>. Nilai tetap
                dapat Anda sesuaikan manual setelah perubahan capaian.
              </Form.Text>
            </Form.Group>
          );
        }

        // Dropdown OPD — value string konsisten dengan normalizeListItems + Yup penanggung_jawab string
        if (field.type === "opd") {
          const raw = values[field.name];
          const rawStr =
            raw !== null && raw !== undefined && String(raw).trim() !== ""
              ? String(raw).trim()
              : "";

          const opdListBase = (opdOptions || []).map((opd) => {
            const value = String(opd.id ?? opd.value ?? "");
            const label = opdPenanggungJawabLabelOnly(opd) || "—";
            return { value, label };
          });

          const matched = rawStr
            ? opdListBase.find((opt) => String(opt.value) === rawStr)
            : null;

          const fallbackNama = opdNamaFromTujuanRowForPj(values);
          const syntheticLabel =
            fallbackNama ||
            (rawStr && !/^\d+$/.test(rawStr) ? String(rawStr).trim() : "") ||
            "Pilih OPD dari daftar";

          const opdList =
            rawStr && !matched
              ? [...opdListBase, { value: rawStr, label: syntheticLabel }]
              : opdListBase;

          const selectedOption = rawStr
            ? (opdList.find((opt) => String(opt.value) === rawStr) ?? null)
            : null;

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                name={field.name}
                options={opdList}
                getOptionLabel={(o) => o.label}
                getOptionValue={(o) => o.value}
                value={selectedOption}
                onChange={(opt) =>
                  setFieldValue(
                    field.name,
                    opt != null && opt.value !== "" && opt.value != null
                      ? String(opt.value)
                      : "",
                  )
                }
                placeholder={field.placeholder || "Pilih OPD"}
                isClearable
              />
            </Form.Group>
          );
        }

        /**
         * Apakah field ini adalah hasil autofill dari baris impor Excel?
         * Saat `rpjmd_import_indikator_tujuan_id` terisi (pengguna memilih baris dari
         * dropdown Nama Indikator), field-field autofill dibuat readonly/disabled agar
         * tidak terjadi salah ketik dan menjaga konsistensi dengan sumber data.
         */
        const isAutofillLocked =
          WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT.has(wizardStepKey) &&
          AUTOFILL_FIELD_NAMES.has(field.name) &&
          rpjmdImportRowStillValid;

        // Textarea
        if (field.type === "textarea") {
          return (
            <Form.Group as={Col} md={12} key={field.name}>
              <Form.Label>
                {field.label}
                {isAutofillLocked && (
                  <span className="ms-2 badge bg-secondary text-white small fw-normal">
                    terisi otomatis
                  </span>
                )}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={values[field.name] || ""}
                onChange={
                  isAutofillLocked ? undefined : handleFieldChange(field.name)
                }
                isInvalid={touched[field.name] && !!errors[field.name]}
                readOnly={isAutofillLocked || false}
                style={
                  isAutofillLocked
                    ? { backgroundColor: "#f8f9fa", cursor: "default" }
                    : undefined
                }
              />
              <Form.Control.Feedback type="invalid">
                {errors[field.name]}
              </Form.Control.Feedback>
            </Form.Group>
          );
        }

        // Select umum
        if (field.type === "select") {
          const opts = field.options || [];
          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>
                {field.label}
                {isAutofillLocked && (
                  <span className="ms-2 badge bg-secondary text-white small fw-normal">
                    terisi otomatis
                  </span>
                )}
              </Form.Label>
              <Form.Select
                name={field.name}
                value={values[field.name] || ""}
                onChange={
                  isAutofillLocked
                    ? (e) => e.preventDefault()
                    : (e) => setFieldValue(field.name, e.target.value)
                }
                isInvalid={touched[field.name] && !!errors[field.name]}
                disabled={isAutofillLocked}
              >
                <option value="">-</option>
                {opts.map((opt, i) => (
                  <option key={i} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors[field.name]}
              </Form.Control.Feedback>
            </Form.Group>
          );
        }

        // Input default
        const numericFields = [
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
        ];

        const isNumericField = numericFields.includes(field.name);
        const effectiveReadOnly = isAutofillLocked || field.readOnly || false;

        return (
          <Form.Group as={Col} md={6} key={field.name}>
            <Form.Label>
              {field.label}
              {isAutofillLocked && (
                <span className="ms-2 badge bg-secondary text-white small fw-normal">
                  terisi otomatis
                </span>
              )}
            </Form.Label>
            <Form.Control
              name={field.name}
              type="text"
              value={
                values[field.name] === null ||
                values[field.name] === undefined ||
                values[field.name] === ""
                  ? ""
                  : String(values[field.name])
              }
              onChange={
                effectiveReadOnly
                  ? undefined
                  : isNumericField
                    ? handleFieldChangeWithUnit(field.name)
                    : handleFieldChange(field.name)
              }
              isInvalid={touched[field.name] && !!errors[field.name]}
              readOnly={effectiveReadOnly}
              style={
                isAutofillLocked
                  ? { backgroundColor: "#f8f9fa", cursor: "default" }
                  : undefined
              }
              placeholder={
                field.placeholder ||
                (isNumericField ? "Masukkan angka saja" : "")
              }
            />
            <Form.Control.Feedback type="invalid">
              {errors[field.name]}
            </Form.Control.Feedback>
          </Form.Group>
        );
      })}
    </>
  );
}

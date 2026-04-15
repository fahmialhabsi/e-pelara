import React, { useMemo } from "react";
import { Alert } from "react-bootstrap";

function formatMisi(m) {
  if (!m) return null;
  if (m.label) return m.label;
  if (m.isi_misi) return m.no_misi != null ? `${m.no_misi}. ${m.isi_misi}` : m.isi_misi;
  return m.id != null ? `ID: ${m.id}` : null;
}

function formatTujuan(t, id) {
  if (!t) return id != null && id !== "" ? `ID: ${id}` : null;
  if (t.label) return t.label;
  if (t.isi_tujuan)
    return t.no_tujuan != null ? `${t.no_tujuan}: ${t.isi_tujuan}` : t.isi_tujuan;
  return id != null ? `ID: ${id}` : null;
}

function formatSasaran(s, id) {
  if (!s) return id != null && id !== "" ? `ID: ${id}` : null;
  if (s.label) return s.label;
  if (s.isi_sasaran)
    return s.nomor != null ? `${s.nomor}: ${s.isi_sasaran}` : s.isi_sasaran;
  return id != null ? `ID: ${id}` : null;
}

function formatStrategi(s, id) {
  if (!s) return id != null && id !== "" ? `ID: ${id}` : null;
  const u =
    (s.deskripsi && String(s.deskripsi).trim()) ||
    (s.isi_strategi && String(s.isi_strategi).trim()) ||
    (s.nama_strategi && String(s.nama_strategi).trim()) ||
    "";
  const c = s.kode_strategi ?? s.nomor ?? s.value ?? s.id;
  if (u) return `${c != null && c !== "" ? c : id} – ${u}`;
  if (s.label && !/\s[–-]\s*$/.test(String(s.label).trim())) return s.label;
  if (s.label) return s.label;
  return id != null && id !== "" ? `ID: ${id}` : null;
}

function formatArah(a, id) {
  if (!a) return id != null && id !== "" ? `ID: ${id}` : null;
  const u =
    (a.deskripsi && String(a.deskripsi).trim()) ||
    (a.isi_arah_kebijakan && String(a.isi_arah_kebijakan).trim()) ||
    (a.nama_arah_kebijakan && String(a.nama_arah_kebijakan).trim()) ||
    "";
  const c = a.kode_arah ?? a.kode_arah_kebijakan ?? a.nomor ?? a.value ?? a.id;
  if (u) return `${c != null && c !== "" ? c : id} – ${u}`;
  if (a.label && !/\s[–-]\s*$/.test(String(a.label).trim())) return a.label;
  if (a.label) return a.label;
  return id != null && id !== "" ? `ID: ${id}` : null;
}

function formatProgram(p, id) {
  if (!p) return id != null && id !== "" ? `ID: ${id}` : null;
  if (p.label) return p.label;
  if (p.nama_program)
    return p.kode_program ? `${p.kode_program} - ${p.nama_program}` : p.nama_program;
  return id != null ? `ID: ${id}` : null;
}

function formatKegiatan(k, id) {
  if (!k) return id != null && id !== "" ? `ID: ${id}` : null;
  if (k.label) return k.label;
  if (k.nama_kegiatan)
    return k.kode_kegiatan
      ? `${k.kode_kegiatan} - ${k.nama_kegiatan}`
      : k.nama_kegiatan;
  return id != null ? `ID: ${id}` : null;
}

function formatSubKegiatan(sk, id) {
  if (!sk) return id != null && id !== "" ? `ID: ${id}` : null;
  if (sk.label) return sk.label;
  if (sk.nama_sub_kegiatan)
    return sk.kode_sub_kegiatan
      ? `${sk.kode_sub_kegiatan} - ${sk.nama_sub_kegiatan}`
      : sk.nama_sub_kegiatan;
  return id != null ? `ID: ${id}` : null;
}

const STEPS_AFTER_SASARAN = [
  "sasaran",
  "strategi",
  "arah_kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];
const STEPS_AFTER_STRATEGI = [
  "strategi",
  "arah_kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];
const STEPS_AFTER_ARAH = ["arah_kebijakan", "program", "kegiatan", "sub_kegiatan"];
const STEPS_AFTER_PROGRAM = ["program", "kegiatan", "sub_kegiatan"];

/**
 * Ringkasan hierarki terpilih agar user yakin konteks input sebelum simpan/submit.
 */
export default function IndikatorInputContextSummary({
  stepKey,
  values,
  options = {},
  tujuanOptions = [],
  sasaranOptions = [],
  programOptions = [],
  strategiOptions = [],
  arahKebijakanOptions = [],
  subKegiatanOptions = [],
  kegiatanOptions = [],
  title = "Konteks indikator yang sedang diisi",
}) {
  const rows = useMemo(() => {
    const misiArr = options.misi || [];
    const tujuanId = values.no_tujuan ?? values.tujuan_id;

    let misi = misiArr.find((m) => String(m.id) === String(values.misi_id));
    if (!misi && (values.no_misi || values.isi_misi)) {
      misi = misiArr.find(
        (m) =>
          (values.no_misi != null &&
            String(m.no_misi ?? "") === String(values.no_misi)) ||
          (values.isi_misi &&
            String(m.isi_misi ?? "").trim() ===
              String(values.isi_misi).trim())
      );
    }

    let tujuanRow = null;
    if (tujuanOptions.length > 0) {
      tujuanRow = tujuanOptions.find(
        (o) => String(o.value) === String(tujuanId)
      );
    } else {
      tujuanRow = (options.tujuan || []).find(
        (t) => String(t.id) === String(tujuanId)
      );
    }

    let sasaranRow = null;
    if (sasaranOptions.length > 0) {
      sasaranRow = sasaranOptions.find(
        (o) => String(o.value) === String(values.sasaran_id)
      );
    } else {
      sasaranRow = (options.sasaran || []).find(
        (s) => String(s.id) === String(values.sasaran_id)
      );
    }

    let strategiRow = null;
    if (strategiOptions.length > 0) {
      strategiRow = strategiOptions.find(
        (o) => String(o.value) === String(values.strategi_id)
      );
    } else {
      strategiRow = (options.strategi || []).find(
        (s) => String(s.id) === String(values.strategi_id)
      );
    }

    let arahRow = null;
    if (arahKebijakanOptions.length > 0) {
      arahRow = arahKebijakanOptions.find(
        (o) => String(o.value) === String(values.arah_kebijakan_id)
      );
    } else {
      arahRow = (options.arah_kebijakan || []).find(
        (a) => String(a.id) === String(values.arah_kebijakan_id)
      );
    }

    let programRow = null;
    if (programOptions.length > 0) {
      programRow = programOptions.find(
        (o) => String(o.value) === String(values.program_id)
      );
    } else {
      programRow = (options.program || []).find(
        (p) => String(p.id) === String(values.program_id)
      );
    }

    let kegiatanRow = null;
    if (kegiatanOptions.length > 0) {
      kegiatanRow = kegiatanOptions.find(
        (o) => String(o.value) === String(values.kegiatan_id)
      );
    } else {
      kegiatanRow = (options.kegiatan || []).find(
        (k) => String(k.id) === String(values.kegiatan_id)
      );
    }

    let subKegiatanRow = null;
    if (subKegiatanOptions.length > 0) {
      subKegiatanRow = subKegiatanOptions.find(
        (o) => String(o.value) === String(values.sub_kegiatan_id)
      );
    } else {
      subKegiatanRow = (options.sub_kegiatan || []).find(
        (s) => String(s.id) === String(values.sub_kegiatan_id)
      );
    }

    const out = [
      {
        key: "misi",
        label: "Misi",
        text: formatMisi(misi) || "— belum dipilih —",
        show: true,
      },
      {
        key: "tujuan",
        label: "Tujuan",
        text: formatTujuan(tujuanRow, tujuanId) || "— belum dipilih —",
        show: stepKey !== "misi",
      },
      {
        key: "sasaran",
        label: "Sasaran",
        text:
          formatSasaran(sasaranRow, values.sasaran_id) || "— belum dipilih —",
        show: STEPS_AFTER_SASARAN.includes(stepKey),
      },
      {
        key: "strategi",
        label: "Strategi",
        text: (() => {
          const lbl = (values.strategi_label || "").trim();
          if (lbl) return lbl;
          return (
            formatStrategi(strategiRow, values.strategi_id) || "— belum dipilih —"
          );
        })(),
        show: STEPS_AFTER_STRATEGI.includes(stepKey),
      },
      {
        key: "arah_kebijakan",
        label: "Arah Kebijakan",
        text: (() => {
          const al = (values.arah_kebijakan_label || "").trim();
          if (al) return al;
          return (
            formatArah(arahRow, values.arah_kebijakan_id) || "— belum dipilih —"
          );
        })(),
        show: STEPS_AFTER_ARAH.includes(stepKey),
      },
      {
        key: "program",
        label: "Program",
        text: (() => {
          const pl = (values.program_label || "").trim();
          if (pl) return pl;
          return (
            formatProgram(programRow, values.program_id) || "— belum dipilih —"
          );
        })(),
        show: STEPS_AFTER_PROGRAM.includes(stepKey),
      },
      {
        key: "kegiatan",
        label: "Kegiatan",
        text: (() => {
          const kl =
            (values.label_kegiatan || values.kegiatan_label || "").trim();
          if (kl) return kl;
          const synth =
            values.kode_kegiatan || values.nama_kegiatan
              ? {
                  kode_kegiatan: values.kode_kegiatan,
                  nama_kegiatan: values.nama_kegiatan,
                }
              : null;
          return (
            formatKegiatan(kegiatanRow || synth, values.kegiatan_id) ||
            "— belum dipilih —"
          );
        })(),
        show: stepKey === "kegiatan" || stepKey === "sub_kegiatan",
      },
      {
        key: "sub_kegiatan",
        label: "Sub Kegiatan",
        text: (() => {
          const sl = (values.sub_kegiatan_label || "").trim();
          if (sl) return sl;
          const synth =
            values.kode_sub_kegiatan || values.nama_sub_kegiatan
              ? {
                  kode_sub_kegiatan: values.kode_sub_kegiatan,
                  nama_sub_kegiatan: values.nama_sub_kegiatan,
                }
              : null;
          return (
            formatSubKegiatan(subKegiatanRow || synth, values.sub_kegiatan_id) ||
            "— belum dipilih —"
          );
        })(),
        show: stepKey === "sub_kegiatan",
      },
    ];

    return out.filter((r) => r.show);
  }, [
    stepKey,
    values,
    options,
    tujuanOptions,
    sasaranOptions,
    strategiOptions,
    arahKebijakanOptions,
    programOptions,
    kegiatanOptions,
    subKegiatanOptions,
  ]);

  return (
    <Alert variant="light" className="border py-2 mb-3 small">
      <div className="fw-semibold mb-2">{title}</div>
      <ul className="mb-0 ps-3">
        {rows.map((r) => (
          <li key={r.key}>
            <span className="text-muted">{r.label}:</span> {r.text}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

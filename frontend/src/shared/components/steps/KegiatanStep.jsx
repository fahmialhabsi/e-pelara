import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import StepTemplate from "./StepTemplate";
import {
  createIndikatorKegiatanBatch,
  fetchIndikatorKegiatanByKegiatan,
  fetchKegiatanByProgram,
  updateIndikatorKegiatan,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget";
import { toast } from "react-toastify";
import { Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  buildKegiatanIndikatorPayload,
  validateKegiatanWizardForSubmit,
} from "@/features/rpjmd/services/indikatorRpjmdPayload";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "@/utils/mapBackendErrorsToFormik";
import {
  clearIndikatorDraftScalars,
  extractIndikatorKegiatanListFromResponseBody,
  hydrateDraftFromIndikatorRow,
  KEGIATAN_EXTRA_DRAFT_KEYS,
  listLooksPersistedFromServer,
  mapIndikatorKegiatanApiRowToWizard,
  RPJMD_INDIKATOR_DRAFT_KEYS,
} from "./wizardIndikatorStepUtils";

// Pada Step Kegiatan, `penanggung_jawab` sebaiknya tetap mengikuti konteks dari Step sebelumnya
// (indikator program/arah kebijakan). Jangan dihapus hanya karena indikator kegiatan belum ada di DB.
const KEGIATAN_DRAFT_CLEAR_KEYS = [
  ...RPJMD_INDIKATOR_DRAFT_KEYS.filter((k) => k !== "penanggung_jawab"),
  ...KEGIATAN_EXTRA_DRAFT_KEYS,
];

function isLegacyKodeIndikatorKegiatan(kode) {
  const s = kode == null ? "" : String(kode).trim().toUpperCase();
  if (!s) return true;
  // Data impor lama sering pakai pola "IK-..." (legacy) bukan "IPK-...".
  if (s.startsWith("IK-")) return true;
  if (!s.startsWith("IPK-")) return true;
  return false;
}

function firstPenanggungJawabFromWizardContext(values) {
  const fromRows = (rows) => {
    if (!Array.isArray(rows)) return null;
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const pj = r.penanggung_jawab ?? r.penanggungJawab;
      if (pj != null && String(pj).trim() !== "") return pj;
      const nested = r.opdPenanggungJawab ?? r.opd_penanggung_jawab;
      if (nested && typeof nested === "object" && nested.id != null)
        return nested.id;
    }
    return null;
  };
  return (
    values?.penanggung_jawab ??
    values?.arah_kebijakan_penanggung_jawab ??
    fromRows(values?.program) ??
    fromRows(values?.arah_kebijakan) ??
    fromRows(values?.strategi) ??
    fromRows(values?.tujuan) ??
    null
  );
}

export default function KegiatanStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "kegiatan";
  const { values, setFieldValue, resetForm, validateForm, setErrors } =
    useFormikContext();
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);
  const restoredOnceRef = React.useRef(false);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");

    if (restoredOnceRef.current) return;
    restoredOnceRef.current = true;

    if (!saved) {
      setRestored(true);
      return;
    }

    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([key, val]) => {
      const cur = values?.[key];
      const curEmpty =
        cur == null || (typeof cur === "string" && cur.trim() === "");
      if (!curEmpty) return;
      setFieldValue(key, val, false);
    });

    validateForm().finally(() => {
      setRestored(true);
    });
  }, [setFieldValue, validateForm, values]);

  // Step Kegiatan: pastikan Penanggung Jawab tetap terisi dari konteks wizard (Arah Kebijakan/Program),
  // agar tab Target + Preview tidak menampilkan "-" hanya karena baris indikator kegiatan dari impor punya PJ NULL.
  useEffect(() => {
    if (!restored) return;
    const cur = values?.penanggung_jawab;
    const empty = cur == null || String(cur).trim() === "";
    if (!empty) return;
    const pjFallback = firstPenanggungJawabFromWizardContext(values);
    if (pjFallback != null && String(pjFallback).trim() !== "") {
      setFieldValue("penanggung_jawab", String(pjFallback), false);
    }
  }, [restored, setFieldValue, values]);

  useEffect(() => {
    if (!restored || !values.program_id || !options?.program?.length) return;

    const selected = options.program.find(
      (p) => String(p.value) === String(values.program_id)
    );

    if (selected) {
      setFieldValue("misi_id", selected.misi_id || null);
      setFieldValue("tujuan_id", selected.tujuan_id || null);
      setFieldValue("sasaran_id", selected.sasaran_id || null);
    }
  }, [restored, options?.program, values.program_id, setFieldValue]);

  useEffect(() => {
    if (!values.program_id) return;

    const stringified = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", stringified);
    sessionStorage.setItem("form_rpjmd", stringified);
  }, [values]);

  useEffect(() => {
    if (!restored) return;

    const { program_id, tahun, jenis_dokumen } = values;
    if (!program_id || !tahun || !jenis_dokumen) return;

    const jd = String(jenis_dokumen || "").trim().toLowerCase();
    fetchKegiatanByProgram({
      program_id,
      tahun,
      jenis_dokumen: jd,
    })
      .then((res) => {
        const mapped = normalizeListItems(res.data).map((k) => ({
          value: k.id,
          label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
          kode_kegiatan: k.kode_kegiatan,
          nama_kegiatan: k.nama_kegiatan,
          misi_id: k.program?.sasaran?.Tujuan?.Misi?.id ?? null,
          tujuan_id: k.program?.sasaran?.Tujuan?.id ?? null,
          sasaran_id: k.program?.sasaran?.id ?? null,
        }));

        setKegiatanOptions(mapped);
      })
      .catch((err) => {
        console.error("Gagal memuat kegiatan:", err);
        setKegiatanOptions([]);
      });
  }, [restored, values.program_id, values.tahun, values.jenis_dokumen]);

  useEffect(() => {
    if (!restored) return;

    if (!values.kegiatan_id || !values.indikator_program_id) {
      setFieldValue("kegiatan", []);
      clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
      return;
    }

    if (!values.tahun || !values.jenis_dokumen) return;

    let cancelled = false;
    (async () => {
      try {
        const jd = String(values.jenis_dokumen || "").trim().toLowerCase();
        const res = await fetchIndikatorKegiatanByKegiatan(
          String(values.kegiatan_id),
          {
            tahun: String(values.tahun),
            jenis_dokumen: jd,
            indikator_program_id: values.indikator_program_id,
          }
        );
        if (cancelled) return;
        const rawRows = extractIndikatorKegiatanListFromResponseBody(res.data);
        const kSel = values.kode_kegiatan || "";
        const nSel = values.nama_kegiatan || "";
        const pjFallback = firstPenanggungJawabFromWizardContext(values);
        const mapped = rawRows.map((r) => {
          const row = mapIndikatorKegiatanApiRowToWizard(r);
          const rid = r?.id ?? row?.id;
          const base =
            rid == null || rid === ""
              ? row
              : { ...row, id: String(rid), indikator_id: String(rid) };
          return {
            ...base,
            kode_kegiatan: base.kode_kegiatan || kSel,
            nama_kegiatan: base.nama_kegiatan || nSel,
            // Jangan biarkan kode legacy (IK-...) mengunci wizard.
            // Wizard harus tetap generate kode baru via next-kode (IPK-...).
            ...(isLegacyKodeIndikatorKegiatan(base.kode_indikator)
              ? { kode_indikator: "" }
              : null),
            // Samakan pola Step Program/Arah Kebijakan: jika PJ baris kosong, isi dari konteks wizard.
            ...((pjFallback != null && String(pjFallback).trim() !== "") &&
            ((base.penanggung_jawab ?? base.penanggungJawab) == null ||
              String(base.penanggung_jawab ?? base.penanggungJawab).trim() === "")
              ? { penanggung_jawab: String(pjFallback).trim() }
              : null),
          };
        });
        setFieldValue("kegiatan", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(
            mapped[0],
            setFieldValue,
            KEGIATAN_EXTRA_DRAFT_KEYS
          );
          // Letakkan setelah hydrate agar nilai hydrate tidak menimpa fallback.
          const pjFallback2 = firstPenanggungJawabFromWizardContext(values);
          if (pjFallback2 != null && String(pjFallback2).trim() !== "") {
            const curPj = values?.penanggung_jawab;
            const emptyPj = curPj == null || String(curPj).trim() === "";
            if (emptyPj) {
              setFieldValue("penanggung_jawab", String(pjFallback2), false);
            }
          }
        } else {
          clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("kegiatan", []);
          clearIndikatorDraftScalars(setFieldValue, KEGIATAN_DRAFT_CLEAR_KEYS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    restored,
    values.kegiatan_id,
    values.indikator_program_id,
    values.tahun,
    values.jenis_dokumen,
    values.kode_kegiatan,
    values.nama_kegiatan,
    setFieldValue,
  ]);

  const { generateKeteranganFrom } = useIndikatorBuilder({
    values,
    setFieldValue,
    options: options?.penanggungJawab || [],
  });

  useEffect(() => {
    const requiredFields = [
      "tolok_ukur_kinerja",
      "target_kinerja",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
    ];
    if (requiredFields.every((field) => values[field])) {
      setFieldValue("keterangan", generateKeteranganFrom(values));
    }
  }, [values, setFieldValue, generateKeteranganFrom]);

  /** Simpan batch indikator kegiatan lalu lanjut ke step Sub Kegiatan (sama pola dengan ProgramStep). */
  const handleWizardContinue = async () => {
    const check = validateKegiatanWizardForSubmit(values);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];

    try {
      setErrors({});
      const first = list[0] || {};
      const firstId = first?.id != null ? String(first.id).trim() : "";
      const firstKode = first?.kode_indikator ?? first?.kodeIndikator ?? "";
      const shouldUpgradeLegacy =
        listLooksPersistedFromServer(list) &&
        firstId &&
        /^\d+$/.test(firstId) &&
        isLegacyKodeIndikatorKegiatan(firstKode) &&
        values?.kode_indikator &&
        String(values.kode_indikator).trim().toUpperCase().startsWith("IPK-");

      if (shouldUpgradeLegacy) {
        // Upgrade data legacy (hasil impor) agar:
        // 1) kode indikator mengikuti standar IPK-...,
        // 2) penanggung_jawab tidak kosong,
        // 3) data tidak menjadi duplikat (id tetap).
        await updateIndikatorKegiatan(firstId, {
          ...first,
          program_id: values.program_id ? Number(values.program_id) : null,
          indikator_program_id: values.indikator_program_id
            ? Number(values.indikator_program_id)
            : null,
          jenis_dokumen: values.jenis_dokumen,
          tahun: values.tahun,
          kode_indikator: String(values.kode_indikator).trim(),
          nama_indikator:
            values.nama_indikator != null && String(values.nama_indikator).trim() !== ""
              ? String(values.nama_indikator).trim()
              : first?.nama_indikator ?? null,
          // Simpan PJ dari konteks wizard jika tersedia.
          penanggung_jawab:
            values.penanggung_jawab != null &&
            String(values.penanggung_jawab).trim() !== ""
              ? Number(values.penanggung_jawab)
              : first?.penanggung_jawab ?? null,
          // baseline akan di-auto-fill oleh backend dari capaian_tahun_5 jika tersedia,
          // tetapi kita kirim baseline draft juga untuk konsistensi.
          baseline:
            values.baseline != null && String(values.baseline).trim() !== ""
              ? String(values.baseline).trim()
              : first?.baseline ?? null,
          capaian_tahun_1: values.capaian_tahun_1 ?? first?.capaian_tahun_1 ?? null,
          capaian_tahun_2: values.capaian_tahun_2 ?? first?.capaian_tahun_2 ?? null,
          capaian_tahun_3: values.capaian_tahun_3 ?? first?.capaian_tahun_3 ?? null,
          capaian_tahun_4: values.capaian_tahun_4 ?? first?.capaian_tahun_4 ?? null,
          capaian_tahun_5: values.capaian_tahun_5 ?? first?.capaian_tahun_5 ?? null,
          target_tahun_1: values.target_tahun_1 ?? first?.target_tahun_1 ?? null,
          target_tahun_2: values.target_tahun_2 ?? first?.target_tahun_2 ?? null,
          target_tahun_3: values.target_tahun_3 ?? first?.target_tahun_3 ?? null,
          target_tahun_4: values.target_tahun_4 ?? first?.target_tahun_4 ?? null,
          target_tahun_5: values.target_tahun_5 ?? first?.target_tahun_5 ?? null,
        });
        toast.success("Data indikator kegiatan berhasil disimpan (upgrade dari data impor).");
      } else if (!listLooksPersistedFromServer(list)) {
        const payload = buildKegiatanIndikatorPayload(values);
        await createIndikatorKegiatanBatch(payload);
        toast.success("Data indikator kegiatan berhasil disimpan.");
      } else {
        toast.success("Indikator kegiatan sudah tersimpan. Melanjutkan wizard.");
      }

      const ctx = {
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        sasaran_id: values.sasaran_id,
        program_id: values.program_id,
        kegiatan_id: values.kegiatan_id,
        indikator_program_id: values.indikator_program_id,
        // Dipakai oleh Step Sub Kegiatan untuk membentuk kode indikator berbasis kode indikator kegiatan (IPK-... -> IPSK-...).
        kegiatan_kode_indikator:
          values.kode_indikator != null ? String(values.kode_indikator).trim() : "",
        no_misi: values.no_misi,
        isi_misi: values.isi_misi,
        periode_id: values.periode_id,
        tahun: values.tahun,
        jenis_dokumen: values.jenis_dokumen,
        level_dokumen: values.level_dokumen,
        jenis_iku: values.jenis_iku,
        tujuan_label: values.tujuan_label,
        sasaran_label: values.sasaran_label,
        program_label: values.program_label,
        strategi_id: values.strategi_id,
        arah_kebijakan_id: values.arah_kebijakan_id,
        strategi_label: values.strategi_label,
        arah_kebijakan_label: values.arah_kebijakan_label,
      };
      const nextValues = { ...values, ...ctx, kegiatan: [] };
      resetForm({ values: nextValues });
      try {
        const str = JSON.stringify(nextValues);
        localStorage.setItem("form_rpjmd", str);
        sessionStorage.setItem("form_rpjmd", str);
      } catch {
        /* ignore quota */
      }
      onNext?.();
    } catch (err) {
      console.error(
        "Gagal simpan indikator kegiatan:",
        err.response?.data || err
      );
      const data = err?.response?.data;
      setErrors(mapBackendErrorsToFormik(data));
      toast.error(
        pickBackendErrorMessage(
          data,
          "Gagal menyimpan data indikator kegiatan."
        )
      );
    }
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setKegiatanOptions([]);
  };

  const handleGoToList = () => {
    navigate("/dashboard-rpjmd/indikator-kegiatan-list");
  };

  return (
    <div>
      <Alert variant="light" className="border small mb-3 py-2">
        Di langkah ini, indikator pada tab <strong>Ringkasan</strong> disimpan ke
        server saat Anda menekan <strong>Simpan &amp; Lanjut</strong>; setelah
        sukses wizard melanjutkan ke langkah <strong>Sub Kegiatan</strong>. Untuk
        membuka daftar indikator kegiatan saja, gunakan tombol di bawah.
      </Alert>
      <StepTemplate
        stepKey={stepKey}
        options={{ ...options, kegiatan: kegiatanOptions }}
        stepOptions={kegiatanOptions}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onNext={handleWizardContinue}
      />

      <div className="d-flex justify-content-between mt-3">
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset}>
            Reset Form
          </Button>
          <Button variant="outline-primary" onClick={handleGoToList}>
            Daftar Indikator Kegiatan
          </Button>
        </div>
      </div>
    </div>
  );
}

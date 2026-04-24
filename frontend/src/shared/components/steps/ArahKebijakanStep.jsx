// ArahKebijakanStep.jsx — Input Indikator Arah Kebijakan RPJMD

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useFormikContext } from "formik";
import { Button, Alert, Spinner, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import debounce from "lodash.debounce";

import StepTemplate from "./StepTemplate";
import {
  fetchArahKebijakanForStep,
  createIndikatorArahKebijakanBatch,
  fetchIndikatorArahByArahKebijakan,
  createArahKebijakan,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { pickBackendErrorMessage } from "@/utils/mapBackendErrorsToFormik";
import { useAuth } from "@/hooks/useAuth";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { normalizeListItems } from "@/utils/apiResponse";
import {
  mapApiIndikatorToListRow,
  hydrateDraftFromIndikatorRow,
  clearIndikatorDraftScalars,
  listLooksPersistedFromServer,
} from "./wizardIndikatorStepUtils";

const API_READY = true;

/** PJ dari langkah induk (strategi / tujuan) bila baris arah belum punya FK OPD. */
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
  return fromRows(values.strategi) ?? fromRows(values.tujuan) ?? null;
}

export default function ArahKebijakanStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "arah_kebijakan";
  const { values, setFieldValue, resetForm } = useFormikContext();
  const [arahOptionsForStep, setArahOptionsForStep] = useState([]);
  const [loadingArah, setLoadingArah] = useState(false);
  const [addingArah, setAddingArah] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { periode_id, tahun } = usePeriodeAktif();
  const arahIdRef = useRef(values.arah_kebijakan_id);
  arahIdRef.current = values.arah_kebijakan_id;
  const prevStrategiRef = useRef(null);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    if (periode_id && values.periode_id !== periode_id) setFieldValue("periode_id", periode_id);
    if (tahun && !values.tahun) setFieldValue("tahun", tahun);
    if (!values.jenis_dokumen && user?.default_jenis_dokumen)
      setFieldValue("jenis_dokumen", user.default_jenis_dokumen);
  }, [periode_id, tahun, user, values, setFieldValue]);

  useEffect(() => {
    const saved = localStorage.getItem("form_rpjmd") || sessionStorage.getItem("form_rpjmd");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
      } catch { /* ignore */ }
    }
  }, [setFieldValue]);

  useEffect(() => {
    if (!values.arah_kebijakan_id || !values.jenis_dokumen || !values.tahun) return;
    const str = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", str);
    sessionStorage.setItem("form_rpjmd", str);
  }, [values]);

  useEffect(() => {
    const cur = values.strategi_id;
    if (
      prevStrategiRef.current != null &&
      String(prevStrategiRef.current) !== String(cur ?? "")
    ) {
      setFieldValue("arah_kebijakan_id", "");
      setFieldValue("arah_kebijakan_label", "");
      setFieldValue("arah_kebijakan", []);
      clearIndikatorDraftScalars(setFieldValue);
    }
    prevStrategiRef.current = cur;
  }, [values.strategi_id, setFieldValue]);

  const indukPenanggungJawabKey = useMemo(() => {
    const v = firstPenanggungJawabFromWizardContext(values);
    return v != null && String(v).trim() !== "" ? String(v).trim() : "";
  }, [values.strategi, values.tujuan]);

  const fetchArahKebijakan = useCallback(
    debounce(async () => {
      if (!values.strategi_id || !values.tahun || !values.jenis_dokumen) return;
      if (!API_READY) return;

      try {
        setLoadingArah(true);
        const res = await fetchArahKebijakanForStep({
          strategi_id: values.strategi_id,
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });

        const mapped = normalizeListItems(res.data).map((a) => {
          const kode = a.kode_arah || a.kode_arah_kebijakan || a.nomor || a.id;
          const uraian =
            (a.deskripsi && String(a.deskripsi).trim()) ||
            (a.isi_arah_kebijakan && String(a.isi_arah_kebijakan).trim()) ||
            (a.nama_arah_kebijakan && String(a.nama_arah_kebijakan).trim()) ||
            "";
          return {
            value: a.id,
            label: uraian ? `${kode} – ${uraian}` : String(kode),
            nomor: a.kode_arah || a.kode_arah_kebijakan || a.nomor,
            kode_arah: a.kode_arah,
            deskripsi: a.deskripsi || a.isi_arah_kebijakan || a.nama_arah_kebijakan || "",
          };
        });

        setArahOptionsForStep(mapped);
        setApiUnavailable(false);

        const selectedId = arahIdRef.current;
        const hasSelected = mapped.some(
          (o) => String(o.value) === String(selectedId || "")
        );
        if (mapped.length > 0 && !hasSelected) {
          setFieldValue("arah_kebijakan_id", String(mapped[0].value));
          setFieldValue("arah_kebijakan_label", mapped[0].label);
        }
      } catch (err) {
        console.warn("Arah Kebijakan API belum tersedia atau error:", err?.message);
        setApiUnavailable(true);
        setArahOptionsForStep([]);
      } finally {
        setLoadingArah(false);
      }
    }, 500),
    [values.strategi_id, values.tahun, values.jenis_dokumen, setFieldValue]
  );

  useEffect(() => {
    fetchArahKebijakan();
    return () => fetchArahKebijakan.cancel();
  }, [fetchArahKebijakan]);

  useEffect(() => {
    const o = arahOptionsForStep.find(
      (x) => String(x.value) === String(values.arah_kebijakan_id ?? "")
    );
    if (o?.label) setFieldValue("arah_kebijakan_label", o.label);
  }, [arahOptionsForStep, values.arah_kebijakan_id, setFieldValue]);

  useEffect(() => {
    if (!values.arah_kebijakan_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorArahByArahKebijakan(values.arah_kebijakan_id, {
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });
        if (cancelled) return;
        let raw = normalizeListItems(res.data);
        if (raw.length === 0 && values.tahun && !cancelled) {
          const res2 = await fetchIndikatorArahByArahKebijakan(values.arah_kebijakan_id, {
            tahun: values.tahun,
          });
          if (!cancelled) raw = normalizeListItems(res2.data);
        }
        if (cancelled) return;
        const pjFallback = firstPenanggungJawabFromWizardContext(values);
        let mapped = raw.map(mapApiIndikatorToListRow);
        if (pjFallback != null && String(pjFallback).trim() !== "") {
          mapped = mapped.map((r) => {
            const cur = r?.penanggung_jawab ?? r?.penanggungJawab;
            const empty = cur == null || String(cur).trim() === "";
            return empty ? { ...r, penanggung_jawab: pjFallback } : r;
          });
        }
        setFieldValue("arah_kebijakan", mapped);
        if (mapped.length > 0) {
          hydrateDraftFromIndikatorRow(mapped[0], setFieldValue);
        } else {
          clearIndikatorDraftScalars(setFieldValue);
        }
      } catch {
        if (!cancelled) {
          setFieldValue("arah_kebijakan", []);
          clearIndikatorDraftScalars(setFieldValue);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    values.arah_kebijakan_id,
    values.tahun,
    values.jenis_dokumen,
    indukPenanggungJawabKey,
    setFieldValue,
  ]);

  const handleTambahArahSameStep = async () => {
    if (!values.strategi_id) return toast.error("Strategi belum dipilih.");
    setAddingArah(true);
    try {
      const res = await createArahKebijakan({
        strategi_id: values.strategi_id,
        deskripsi:
          "[Draft] Arah kebijakan — lengkapi nanti dari menu master bila perlu.",
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      });
      const newId = res.data?.id || res.data?.data?.id;
      const newKode =
        res.data?.kode_arah ||
        res.data?.data?.kode_arah ||
        res.data?.kode_arah_kebijakan ||
        res.data?.data?.kode_arah_kebijakan ||
        "";
      const desk =
        res.data?.deskripsi ||
        res.data?.data?.deskripsi ||
        res.data?.isi_arah_kebijakan ||
        res.data?.data?.isi_arah_kebijakan ||
        "[Draft] Arah kebijakan";
      const newLabel = `${newKode || newId} – ${desk}`;
      const newOpt = {
        value: newId,
        label: newLabel,
        kode_arah: newKode,
        deskripsi: desk,
      };

      setArahOptionsForStep((prev) => [...prev, newOpt]);
      setFieldValue("arah_kebijakan_id", String(newId));
      setFieldValue("arah_kebijakan_label", newLabel);
      setFieldValue("arah_kebijakan", []);
      clearIndikatorDraftScalars(setFieldValue);
      toast.success("Arah kebijakan baru siap; lanjutkan isi indikator di tab yang sama.");
    } catch (err) {
      toast.error(pickBackendErrorMessage(err?.response?.data, "Gagal menambah arah kebijakan."));
    } finally {
      setAddingArah(false);
    }
  };

  const handleNextStep = async () => {
    const arahList = Array.isArray(values.arah_kebijakan) ? values.arah_kebijakan : [];

    if (!values.strategi_id && !apiUnavailable) {
      toast.error("Strategi belum dipilih.");
      return;
    }

    if (apiUnavailable) {
      toast("Step Arah Kebijakan dilewati (API belum tersedia). Lanjut ke Program.", { icon: "⚠️" });
    } else {
      if (!values.arah_kebijakan_id) {
        toast.error("Pilih Arah Kebijakan terlebih dahulu.");
        return;
      }
      if (arahList.length === 0) {
        toast.error("Tambahkan minimal satu indikator Arah Kebijakan.");
        return;
      }

      if (!listLooksPersistedFromServer(arahList)) {
        try {
          await createIndikatorArahKebijakanBatch(
            arahList.map((item) => ({
              ...item,
              arah_kebijakan_id: values.arah_kebijakan_id,
              strategi_id: values.strategi_id,
              sasaran_id: values.sasaran_id,
              tujuan_id: values.tujuan_id,
              misi_id: values.misi_id,
              jenis_dokumen: values.jenis_dokumen,
              tahun: values.tahun,
              periode_id: values.periode_id,
            }))
          );
          toast.success("Indikator Arah Kebijakan berhasil disimpan!");
        } catch (err) {
          toast.error(pickBackendErrorMessage(err?.response?.data, "Gagal menyimpan indikator arah kebijakan."));
          return;
        }
      } else {
        toast.success("Indikator arah kebijakan sudah tersimpan. Melanjutkan wizard.");
      }
    }

    const ctx = {
      misi_id: values.misi_id,
      tujuan_id: values.tujuan_id,
      sasaran_id: values.sasaran_id,
      strategi_id: values.strategi_id,
      strategi_label: values.strategi_label,
      arah_kebijakan_id: values.arah_kebijakan_id,
      arah_kebijakan_label: values.arah_kebijakan_label,
      // Dipakai oleh step Program untuk membentuk kode indikator berbasis kode indikator arah kebijakan.
      // Ambil dari draft saat ini; fallback ke baris pertama jika draft kosong.
      arah_kebijakan_kode_indikator:
        (values.kode_indikator && String(values.kode_indikator).trim()) ||
        (arahList?.[0]?.kode_indikator && String(arahList[0].kode_indikator).trim()) ||
        "",
      // Snapshot OPD PJ indikator arah kebijakan agar step Program bisa auto-isi PJ walau baris referensi legacy (ST...) ber-PJ NULL.
      arah_kebijakan_penanggung_jawab: (() => {
        const v =
          values.penanggung_jawab ??
          arahList?.[0]?.penanggung_jawab ??
          firstPenanggungJawabFromWizardContext(values);
        return v != null && String(v).trim() !== "" ? String(v) : "";
      })(),
      // Mirror agar Step Program bisa langsung pakai tanpa ambiguity nama field.
      program_ref_ar_kode_indikator:
        (values.kode_indikator && String(values.kode_indikator).trim()) ||
        (arahList?.[0]?.kode_indikator && String(arahList[0].kode_indikator).trim()) ||
        "",
      no_misi: values.no_misi,
      isi_misi: values.isi_misi,
      periode_id: values.periode_id,
      tahun: values.tahun,
      jenis_dokumen: values.jenis_dokumen,
      level_dokumen: values.level_dokumen,
      jenis_iku: values.jenis_iku,
    };
    resetForm({ values: { ...values, ...ctx, arah_kebijakan: [] } });
    onNext?.();
  };

  const strategiOptionsForContext = useMemo(() => {
    const base = Array.isArray(options?.strategi) ? options.strategi : [];
    const sid = values.strategi_id;
    if (!sid) return base;
    const idStr = String(sid);
    if (base.some((s) => String(s.id ?? s.value) === idStr)) return base;
    const lbl = (values.strategi_label || "").trim();
    if (!lbl) return base;
    return [
      ...base,
      {
        id: sid,
        value: sid,
        label: lbl,
        deskripsi: lbl,
        kode_strategi: "",
      },
    ];
  }, [options?.strategi, values.strategi_id, values.strategi_label]);

  if (loadingArah) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" role="status" />
        <div className="mt-2 text-muted small">Memuat daftar Arah Kebijakan…</div>
      </div>
    );
  }

  if (apiUnavailable) {
    return (
      <div>
        <Alert variant="warning" className="d-flex align-items-start gap-3">
          <span style={{ fontSize: 28 }}>🚧</span>
          <div>
            <strong>Backend Arah Kebijakan belum tersedia</strong>
            <p className="mb-2 mt-1 small">
              Endpoint <code>/arah-kebijakan</code> dan <code>/indikator-arah-kebijakan</code> belum aktif.
            </p>
            <Badge bg="secondary" className="me-2">TODO: aktifkan API backend</Badge>
            <Badge bg="info">Step dapat dilewati sementara</Badge>
          </div>
        </Alert>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-warning" onClick={handleNextStep}>
            Lewati step ini & Lanjut ke Program →
          </Button>
        </div>
      </div>
    );
  }

  if (!values.strategi_id) {
    return (
      <Alert variant="info">
        Silakan pilih <strong>Strategi</strong> terlebih dahulu di step sebelumnya.
      </Alert>
    );
  }

  return (
    <div>
      {arahOptionsForStep.length === 0 ? (
        <Alert variant="secondary">
          Belum ada Arah Kebijakan untuk Strategi yang dipilih.{" "}
          <span
            className="text-primary"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => !addingArah && handleTambahArahSameStep()}
          >
            Tambah sekarang
          </span>
        </Alert>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{
            ...options,
            arah_kebijakan: arahOptionsForStep,
            strategi: strategiOptionsForContext,
          }}
          stepOptions={arahOptionsForStep}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onNext={handleNextStep}
        />
      )}

      <div className="d-flex justify-content-between mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => navigate("/dashboard-rpjmd/indikator-arah-kebijakan-list")}
        >
          Daftar Indikator Arah Kebijakan
        </Button>
        {values.strategi_id && arahOptionsForStep.length > 0 && (
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => !addingArah && handleTambahArahSameStep()}
            disabled={addingArah}
          >
            {addingArah ? "Menyimpan…" : "+ Tambah Arah Kebijakan"}
          </Button>
        )}
      </div>
    </div>
  );
}

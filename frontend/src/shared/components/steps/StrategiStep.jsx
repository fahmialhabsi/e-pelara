// StrategiStep.jsx — Input Indikator Strategi RPJMD

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFormikContext } from "formik";
import { Button, Alert, Spinner, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import debounce from "lodash.debounce";

import StepTemplate from "./StepTemplate";
import {
  fetchStrategiForStep,
  createIndikatorStrategiBatch,
  createStrategi,
  fetchIndikatorStrategiByStrategi,
  fetchNextKodeIndikatorStrategi,
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

export default function StrategiStep({ options, tabKey, setTabKey, onNext }) {
  const stepKey = "strategi";
  const { values, setFieldValue, resetForm } = useFormikContext();
  const [strategiOptionsForStep, setStrategiOptionsForStep] = useState([]);
  const [loadingStrategi, setLoadingStrategi] = useState(false);
  const [addingStrategi, setAddingStrategi] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { periode_id, tahun } = usePeriodeAktif();
  const strategiIdRef = useRef(values.strategi_id);
  strategiIdRef.current = values.strategi_id;
  const prevSasaranRef = useRef(null);

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  useEffect(() => {
    if (periode_id && values.periode_id !== periode_id)
      setFieldValue("periode_id", periode_id);
    if (tahun && !values.tahun) setFieldValue("tahun", tahun);
    if (!values.jenis_dokumen && user?.default_jenis_dokumen)
      setFieldValue("jenis_dokumen", user.default_jenis_dokumen);
  }, [periode_id, tahun, user, values, setFieldValue]);

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val));
      } catch {
        /* ignore */
      }
    }
  }, [setFieldValue]);

  useEffect(() => {
    if (!values.strategi_id || !values.jenis_dokumen || !values.tahun) return;
    const str = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", str);
    sessionStorage.setItem("form_rpjmd", str);
  }, [values]);

  useEffect(() => {
    const cur = values.sasaran_id;
    if (
      prevSasaranRef.current != null &&
      String(prevSasaranRef.current) !== String(cur ?? "")
    ) {
      setFieldValue("strategi_id", "");
      setFieldValue("strategi_label", "");
      setFieldValue("strategi", []);
      setFieldValue("rpjmd_import_indikator_strategi_id", "");
      clearIndikatorDraftScalars(setFieldValue);
    }
    prevSasaranRef.current = cur;
  }, [values.sasaran_id, setFieldValue]);

  const fetchStrategi = useCallback(
    debounce(async () => {
      if (!values.sasaran_id || !values.tahun || !values.jenis_dokumen) return;
      if (!API_READY) return;

      try {
        setLoadingStrategi(true);
        const res = await fetchStrategiForStep({
          sasaran_id: values.sasaran_id,
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });

        const mapped = normalizeListItems(res.data).map((s) => {
          const kode = s.kode_strategi || s.nomor || s.id;
          const uraian =
            (s.deskripsi && String(s.deskripsi).trim()) ||
            (s.isi_strategi && String(s.isi_strategi).trim()) ||
            (s.nama_strategi && String(s.nama_strategi).trim()) ||
            "";
          return {
            value: s.id,
            label: uraian ? `${kode} – ${uraian}` : String(kode),
            nomor: s.kode_strategi || s.nomor,
            kode_strategi: s.kode_strategi,
            deskripsi: s.deskripsi || s.isi_strategi || s.nama_strategi || "",
          };
        });

        setStrategiOptionsForStep(mapped);
        setApiUnavailable(false);

        const selectedId = strategiIdRef.current;
        const hasSelected = mapped.some(
          (o) => String(o.value) === String(selectedId || ""),
        );
        if (mapped.length > 0 && !hasSelected) {
          setFieldValue("strategi_id", String(mapped[0].value));
          setFieldValue("strategi_label", mapped[0].label);
        }
      } catch (err) {
        console.warn("Strategi API belum tersedia atau error:", err?.message);
        setApiUnavailable(true);
        setStrategiOptionsForStep([]);
      } finally {
        setLoadingStrategi(false);
      }
    }, 500),
    [values.sasaran_id, values.tahun, values.jenis_dokumen, setFieldValue],
  );

  useEffect(() => {
    fetchStrategi();
    return () => fetchStrategi.cancel();
  }, [fetchStrategi]);

  useEffect(() => {
    const o = strategiOptionsForStep.find(
      (x) => String(x.value) === String(values.strategi_id ?? ""),
    );
    if (o?.label) setFieldValue("strategi_label", o.label);
  }, [strategiOptionsForStep, values.strategi_id, setFieldValue]);

  useEffect(() => {
    if (!values.strategi_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIndikatorStrategiByStrategi(values.strategi_id, {
          tahun: values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });
        if (cancelled) return;
        let raw = normalizeListItems(res.data);
        /**
         * Jika filter jenis_dokumen wizard (label panjang) tidak cocok eksak dengan DB ("RPJMD"),
         * daftar kosong → jangan langsung next-kode (-02). Coba ulang tanpa jenis_dokumen.
         */
        if (
          raw.length === 0 &&
          values.tahun &&
          !cancelled
        ) {
          const res2 = await fetchIndikatorStrategiByStrategi(
            values.strategi_id,
            { tahun: values.tahun },
          );
          if (!cancelled) raw = normalizeListItems(res2.data);
        }
        const mapped = raw.map(mapApiIndikatorToListRow);
        setFieldValue("strategi", mapped);
        if (mapped.length > 0) {
          const r0 = mapped[0];
          const raw0 = raw[0] || {};
          hydrateDraftFromIndikatorRow(r0, setFieldValue);
          /* Kunci dropdown ist = id baris indikatorstrategis (PK), bukan indikator_id master. */
          const pk =
            raw0.id ??
            r0.id ??
            r0.__uid ??
            raw0.__uid;
          const id0 =
            pk != null && String(pk).trim() !== "" ? String(pk).trim() : "";
          setFieldValue("rpjmd_import_indikator_strategi_id", id0);
        } else {
          setFieldValue("rpjmd_import_indikator_strategi_id", "");
          clearIndikatorDraftScalars(setFieldValue);
          if (
            !cancelled &&
            values.strategi_id &&
            values.jenis_dokumen &&
            values.tahun
          ) {
            try {
              const nk = await fetchNextKodeIndikatorStrategi(
                values.strategi_id,
                {
                  jenis_dokumen: values.jenis_dokumen,
                  tahun: values.tahun,
                },
              );
              const next = nk.data?.next_kode;
              if (!cancelled && next) setFieldValue("kode_indikator", next);
            } catch {
              /* next-kode opsional */
            }
          }
        }
      } catch {
        if (!cancelled) {
          setFieldValue("strategi", []);
          setFieldValue("rpjmd_import_indikator_strategi_id", "");
          clearIndikatorDraftScalars(setFieldValue);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    values.strategi_id,
    values.tahun,
    values.jenis_dokumen,
    setFieldValue,
  ]);

  const handleTambahStrategiSameStep = async () => {
    if (!values.sasaran_id) return toast.error("Sasaran belum dipilih.");
    setAddingStrategi(true);
    try {
      const res = await createStrategi({
        sasaran_id: values.sasaran_id,
        deskripsi:
          "[Draft] Strategi — lengkapi nanti dari menu master bila perlu.",
        jenis_dokumen: values.jenis_dokumen,
        tahun: values.tahun,
      });
      const newId = res.data?.id || res.data?.data?.id;
      const newKode =
        res.data?.kode_strategi || res.data?.data?.kode_strategi || "";
      const desk =
        res.data?.deskripsi ||
        res.data?.data?.deskripsi ||
        res.data?.isi_strategi ||
        res.data?.data?.isi_strategi ||
        "[Draft] Strategi";
      const newLabel = `${newKode || newId} – ${desk}`;
      const newOpt = {
        value: newId,
        label: newLabel,
        kode_strategi: newKode,
        deskripsi: desk,
      };

      setStrategiOptionsForStep((prev) => [...prev, newOpt]);
      setFieldValue("strategi_id", String(newId));
      setFieldValue("strategi_label", newLabel);
      setFieldValue("strategi", []);
      setFieldValue("rpjmd_import_indikator_strategi_id", "");
      clearIndikatorDraftScalars(setFieldValue);
      toast.success(
        "Strategi baru siap; lanjutkan isi indikator di tab yang sama.",
      );
    } catch (err) {
      toast.error(
        pickBackendErrorMessage(
          err?.response?.data,
          "Gagal menambah strategi.",
        ),
      );
    } finally {
      setAddingStrategi(false);
    }
  };

  const handleNextStep = async () => {
    const strategiList = Array.isArray(values.strategi) ? values.strategi : [];

    if (!values.sasaran_id) {
      toast.error(
        "Sasaran belum dipilih. Kembali ke step Sasaran terlebih dahulu.",
      );
      return;
    }

    if (apiUnavailable) {
      toast(
        "Step Strategi dilewati (API belum tersedia). Lanjut ke Arah Kebijakan.",
        { icon: "⚠️" },
      );
    } else {
      if (!values.strategi_id) {
        toast.error("Pilih Strategi terlebih dahulu.");
        return;
      }
      if (strategiList.length === 0) {
        toast.error("Tambahkan minimal satu indikator Strategi.");
        return;
      }

      if (!listLooksPersistedFromServer(strategiList)) {
        try {
          await createIndikatorStrategiBatch(
            strategiList.map((item) => ({
              ...item,
              strategi_id: values.strategi_id,
              sasaran_id: values.sasaran_id,
              tujuan_id: values.tujuan_id,
              misi_id: values.misi_id,
              jenis_dokumen: values.jenis_dokumen,
              tahun: values.tahun,
              periode_id: values.periode_id,
            })),
          );
          toast.success("Indikator Strategi berhasil disimpan!");
        } catch (err) {
          toast.error(
            pickBackendErrorMessage(
              err?.response?.data,
              "Gagal menyimpan indikator strategi.",
            ),
          );
          return;
        }
      } else {
        toast.success(
          "Indikator strategi sudah tersimpan. Melanjutkan wizard.",
        );
      }
    }

    const ctx = {
      misi_id: values.misi_id,
      tujuan_id: values.tujuan_id,
      sasaran_id: values.sasaran_id,
      strategi_id: values.strategi_id,
      strategi_label: values.strategi_label,
      no_misi: values.no_misi,
      isi_misi: values.isi_misi,
      periode_id: values.periode_id,
      tahun: values.tahun,
      jenis_dokumen: values.jenis_dokumen,
      level_dokumen: values.level_dokumen,
      jenis_iku: values.jenis_iku,
      arah_kebijakan_id: "",
      arah_kebijakan_label: "",
    };
    resetForm({ values: { ...values, ...ctx, strategi: [] } });
    onNext?.();
  };

  if (loadingStrategi) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" role="status" />
        <div className="mt-2 text-muted small">Memuat daftar Strategi…</div>
      </div>
    );
  }

  if (apiUnavailable) {
    return (
      <div>
        <Alert variant="warning" className="d-flex align-items-start gap-3">
          <span style={{ fontSize: 28 }}>🚧</span>
          <div>
            <strong>Backend Strategi belum tersedia</strong>
            <p className="mb-2 mt-1 small">
              Endpoint <code>/strategi</code> dan{" "}
              <code>/indikator-strategi</code> belum aktif.
            </p>
            <Badge bg="secondary" className="me-2">
              TODO: aktifkan API backend
            </Badge>
            <Badge bg="info">Step dapat dilewati sementara</Badge>
          </div>
        </Alert>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-warning" onClick={handleNextStep}>
            Lewati step ini & Lanjut ke Arah Kebijakan →
          </Button>
        </div>
      </div>
    );
  }

  if (!values.sasaran_id) {
    return (
      <Alert variant="info">
        Silakan pilih <strong>Sasaran</strong> terlebih dahulu di step
        sebelumnya.
      </Alert>
    );
  }

  return (
    <div>
      {strategiOptionsForStep.length === 0 ? (
        <Alert variant="secondary">
          Belum ada Strategi untuk Sasaran yang dipilih.{" "}
          <span
            className="text-primary"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => !addingStrategi && handleTambahStrategiSameStep()}
          >
            Tambah sekarang
          </span>
        </Alert>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{ ...options, strategi: strategiOptionsForStep }}
          stepOptions={strategiOptionsForStep}
          tabKey={tabKey}
          setTabKey={setTabKey}
          onNext={handleNextStep}
        />
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => navigate("/dashboard-rpjmd/indikator-strategi-list")}
        >
          Daftar Indikator Strategi
        </Button>
        {values.sasaran_id && strategiOptionsForStep.length > 0 && (
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => !addingStrategi && handleTambahStrategiSameStep()}
            disabled={addingStrategi}
          >
            {addingStrategi ? "Menyimpan…" : "+ Tambah Strategi"}
          </Button>
        )}
      </div>
    </div>
  );
}

// SubKegiatanStep.jsx — Input Indikator Sub Kegiatan RPJMD (step terakhir wizard)
// TODO: Aktifkan koneksi API setelah backend /sub-kegiatan & /indikator-sub-kegiatan tersedia

import React, { useEffect, useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { Button, Alert, Spinner, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import StepTemplate from "./StepTemplate";
import IndikatorInputContextSummary from "./indikatorStep/IndikatorInputContextSummary";
import {
  fetchSubKegiatanByKegiatan,
  saveIndikatorSubKegiatanWizard,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import {
  pickBackendErrorMessage,
  mapBackendErrorsToFormik,
} from "@/utils/mapBackendErrorsToFormik";
import { useAuth } from "@/hooks/useAuth";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { normalizeListItems } from "@/utils/apiResponse";

const API_READY = true; // ← set false jika backend belum tersedia

export default function SubKegiatanStep({ options, tabKey, setTabKey }) {
  const stepKey = "sub_kegiatan";
  const { values, setFieldValue, resetForm, validateForm, setErrors } = useFormikContext();
  const [subKegiatanOptions, setSubKegiatanOptions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [restored, setRestored]     = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { periode_id, tahun } = usePeriodeAktif();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  /* ── Restore from localStorage saat mount ── */
  useEffect(() => {
    const saved = localStorage.getItem("form_rpjmd") || sessionStorage.getItem("form_rpjmd");
    if (!saved) { setRestored(true); return; }
    try {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, val]) => setFieldValue(key, val, false));
    } catch { /* ignore */ }
    validateForm().finally(() => setRestored(true));
  }, [setFieldValue, validateForm]);

  /* ── Save to localStorage ── */
  useEffect(() => {
    if (!values.kegiatan_id) return;
    const str = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", str);
    sessionStorage.setItem("form_rpjmd", str);
  }, [values]);

  /* ── Fetch Sub Kegiatan berdasarkan kegiatan_id ── */
  useEffect(() => {
    if (!restored || !values.kegiatan_id || !values.tahun || !values.jenis_dokumen) return;
    if (!API_READY) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchSubKegiatanByKegiatan({
          kegiatan_id:   values.kegiatan_id,
          tahun:         values.tahun,
          jenis_dokumen: values.jenis_dokumen,
        });

        const mapped = normalizeListItems(res.data).map((s) => ({
          value:          s.id,
          label:          `${s.kode_sub_kegiatan || s.id} – ${s.nama_sub_kegiatan || ""}`,
          kode_sub_kegiatan: s.kode_sub_kegiatan,
          nama_sub_kegiatan: s.nama_sub_kegiatan,
          misi_id:        s.kegiatan?.program?.sasaran?.Tujuan?.Misi?.id ?? null,
          tujuan_id:      s.kegiatan?.program?.sasaran?.Tujuan?.id ?? null,
          sasaran_id:     s.kegiatan?.program?.sasaran?.id ?? null,
          program_id:     s.kegiatan?.program?.id ?? null,
          kegiatan_id:    s.kegiatan?.id ?? null,
        }));

        setSubKegiatanOptions(mapped);
        setApiUnavailable(false);

        if (mapped.length > 0 && !mapped.some((o) => String(o.value) === String(values.sub_kegiatan_id || ""))) {
          setFieldValue("sub_kegiatan_id", mapped[0].value);
          setFieldValue("sub_kegiatan_label", mapped[0].label);
        }
      } catch (err) {
        console.warn("Sub Kegiatan API belum tersedia:", err?.message);
        setApiUnavailable(true);
        setSubKegiatanOptions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [restored, values.kegiatan_id, values.tahun, values.jenis_dokumen, setFieldValue]);

  /* ── Submit final — dipanggil dari tombol "Kirim Semua" di IndikatorRPJMDForm ── */
  const handleSave = useCallback(async () => {
    const subKegiatanList = Array.isArray(values.sub_kegiatan) ? values.sub_kegiatan : [];

    if (apiUnavailable) {
      toast("Sub Kegiatan dilewati (API belum tersedia). Data wizard selesai.", { icon: "⚠️" });
      return true; // signal success agar wizard bisa complete
    }

    if (!values.kegiatan_id) {
      toast.error("Kegiatan belum dipilih. Kembali ke step Kegiatan.");
      return false;
    }
    if (!values.sub_kegiatan_id) {
      toast.error("Pilih Sub Kegiatan terlebih dahulu.");
      return false;
    }
    if (subKegiatanList.length === 0) {
      toast.error("Tambahkan minimal satu indikator Sub Kegiatan.");
      return false;
    }

    try {
      await saveIndikatorSubKegiatanWizard(values);
      toast.success("Indikator Sub Kegiatan berhasil disimpan!");
      return true;
    } catch (err) {
      toast.error(pickBackendErrorMessage(err?.response?.data, "Gagal menyimpan indikator sub kegiatan."));
      return false;
    }
  }, [values, apiUnavailable]);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" role="status" />
        <div className="mt-2 text-muted small">Memuat daftar Sub Kegiatan…</div>
      </div>
    );
  }

  if (apiUnavailable) {
    return (
      <div>
        <Alert variant="warning" className="d-flex align-items-start gap-3">
          <span style={{ fontSize: 28 }}>🚧</span>
          <div>
            <strong>Backend Sub Kegiatan belum tersedia</strong>
            <p className="mb-2 mt-1 small">
              Endpoint <code>/sub-kegiatan</code> dan <code>/indikator-sub-kegiatan</code> belum aktif.
              Anda tetap bisa menyelesaikan wizard — step ini akan dilewati.
            </p>
            <Badge bg="secondary" className="me-2">TODO: aktifkan API backend</Badge>
            <Badge bg="success">Wizard tetap dapat diselesaikan</Badge>
          </div>
        </Alert>
        <IndikatorInputContextSummary
          stepKey="sub_kegiatan"
          values={values}
          options={options}
          title="Ringkasan hierarki yang sudah diisi"
        />
      </div>
    );
  }

  return (
    <div>
      <IndikatorInputContextSummary
        stepKey="sub_kegiatan"
        values={values}
        options={options}
        title="Ringkasan sebelum Kirim (indikator sub kegiatan)"
      />

      {!values.kegiatan_id ? (
        <Alert variant="info">
          Silakan pilih <strong>Kegiatan</strong> terlebih dahulu di step sebelumnya.
        </Alert>
      ) : subKegiatanOptions.length === 0 ? (
        <Alert variant="secondary">
          Belum ada Sub Kegiatan untuk Kegiatan yang dipilih.
        </Alert>
      ) : (
        <StepTemplate
          stepKey={stepKey}
          options={{ ...options, sub_kegiatan: subKegiatanOptions }}
          stepOptions={subKegiatanOptions}
          tabKey={tabKey}
          setTabKey={setTabKey}
          showTab5WizardActions={false}
        />
      )}

      <div className="d-flex justify-content-between mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => navigate("/dashboard-rpjmd/indikator-sub-kegiatan-list")}
        >
          Daftar Indikator Sub Kegiatan
        </Button>
      </div>
    </div>
  );
}

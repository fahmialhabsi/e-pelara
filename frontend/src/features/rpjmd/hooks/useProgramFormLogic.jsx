import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePeriode } from "@/contexts/PeriodeContext";
import { useAuth } from "../../../hooks/useAuth";
import useFetchProgramDetail from "./subhooks/useFetchProgramDetail";
import useReferenceData from "./subhooks/useReferenceData";
import useProgramValidation from "./subhooks/useProgramValidation";
import useProgramHandlers from "./subhooks/useProgramHandlers";
import useProgramFilters from "./subhooks/useProgramFilters";
import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";

const initialState = {
  kode_program: "",
  nama_program: "",
  pagu_anggaran: "",
  misi_id: "",
  tujuan_id: "",
  sasaran_id: "",
  strategi_ids: [],
  arah_ids: [],
  rpjmd_id: "",
  prioritas: "",
  opd_penanggung_jawab: "",
  bidang_opd: [],
};

function validateFormPaguAnggaran(value) {
  const num = Number(value);
  return isNaN(num) || num < 0 ? 0 : Math.round(num);
}

export default function useProgramFormLogic(
  initialValues = {},
  onSubmitSuccess,
  tahun
) {
  const { id: programId } = useParams();
  const isEdit = Boolean(programId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen } = useDokumen();
  const { id: periode_id, loading: periodeLoading } = usePeriode();

  const [programData, setProgramData] = useState(initialValues);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [initCompleted, setInitCompleted] = useState(false);

  // Refs untuk kontrol efek satu kali
  const initializedRef = useRef(false);
  const injectedDokRef = useRef(false);
  const hydratedDropdownRef = useRef(false);
  const hydratedBidangRef = useRef(false);
  const strategiHydratedRef = useRef(false);

  const { detail, loading: loadingDetail } = useFetchProgramDetail(programId);

  // Mode edit → isi data detail
  useEffect(() => {
    if (isEdit && detail && periode_id && tahun && !initializedRef.current) {
      initializedRef.current = true;

      const strategiOpts = (detail.Strategi || []).map((s) => ({
        value: s.id,
        label: `${s.kode_strategi} – ${s.deskripsi}`,
      }));

      const arahOpts = (detail.ArahKebijakan || []).map((a) => ({
        value: a.id,
        label: `${a.kode_arah} – ${a.deskripsi}`,
        strategi_id: a?.ProgramArahKebijakan?.strategi_id ?? null,
      }));

      setProgramData({
        ...detail,
        strategi_ids: strategiOpts,
        arah_ids: arahOpts,
      });
      setInitCompleted(true);
    }
  }, [isEdit, detail, periode_id, tahun]);

  // Mode create → tandai init selesai
  useEffect(() => {
    if (!isEdit && !initializedRef.current) {
      initializedRef.current = true;
      setInitCompleted(true);
    }
  }, [isEdit]);

  // Inject periode
  useEffect(() => {
    if (!isEdit && periode_id && !programData.rpjmd_id) {
      setProgramData((prev) => ({ ...prev, rpjmd_id: periode_id }));
    }
  }, [periode_id, isEdit]);

  // Inject dokumen
  useEffect(() => {
    if (!injectedDokRef.current && dokumen && !programData.jenis_dokumen) {
      injectedDokRef.current = true;
      setProgramData((prev) => ({ ...prev, jenis_dokumen: dokumen }));
    }
  }, [dokumen]);

  const referenceParams = useMemo(() => {
    if (!periode_id || !tahun || (isEdit && !initCompleted)) return null;
    return {
      mode: isEdit ? "edit" : "create",
      rpjmd_id: periode_id,
      tahun,
      jenis_dokumen: dokumen,
      sasaran_id: programData.sasaran_id,
      strategi_ids:
        programData.strategi_ids?.map((s) => s.value || s.id || s) ?? [],
      opd_penanggung_jawab: programData.opd_penanggung_jawab,
    };
  }, [isEdit, periode_id, tahun, dokumen, initCompleted, programData]);

  const reference = useReferenceData(referenceParams ?? {});
  const {
    misis = [],
    tujuans = [],
    sasarans = [],
    strategis = [],
    aras = [],
    opdEntries = [],
    bidangOptions = [],
    allPrograms = [],
    refsLoading = false,
  } = reference || {};

  // Gabungan efek: set misi & tujuan + auto-isi strategi sekali saja
  useEffect(() => {
    if (
      initCompleted &&
      !hydratedDropdownRef.current &&
      programData.sasaran_id &&
      sasarans.length > 0
    ) {
      hydratedDropdownRef.current = true;

      // Auto-isi Misi & Tujuan
      const selSasaran = sasarans.find(
        (s) => String(s.id) === String(programData.sasaran_id)
      );
      const selTujuan = selSasaran?.Tujuan;
      const selMisi = selTujuan?.Misi;

      setProgramData((prev) => ({
        ...prev,
        misi_id: selMisi?.id ?? prev.misi_id,
        tujuan_id: selTujuan?.id ?? prev.tujuan_id,
      }));

      // Auto-isi Strategi
      if (
        strategis.length > 0 &&
        !strategiHydratedRef.current &&
        (!isEdit || (programData.strategi_ids || []).length === 0)
      ) {
        const opsiStrategi = strategis.map((s) => ({
          value: s.id,
          label: `${s.kode_strategi} – ${s.deskripsi}`,
        }));

        setProgramData((prev) => ({
          ...prev,
          strategi_ids: opsiStrategi,
        }));

        strategiHydratedRef.current = true;
      }
    }
  }, [
    initCompleted,
    programData.sasaran_id,
    sasarans,
    strategis,
    isEdit,
    (programData.strategi_ids || []).length,
  ]);

  // Hydrate bidang opd saat edit
  useEffect(() => {
    if (
      isEdit &&
      initCompleted &&
      !hydratedBidangRef.current &&
      programData.opd_penanggung_jawab &&
      !programData.bidang_opd?.length &&
      bidangOptions.length > 0
    ) {
      hydratedBidangRef.current = true;

      const bidangList =
        programData.bidang_opd_penanggung_jawab
          ?.split(",")
          .map((b) => b.trim()) ?? [];

      const bidangDefault = bidangOptions.filter((b) =>
        bidangList.includes(b.label)
      );

      setProgramData((prev) => ({
        ...prev,
        bidang_opd: bidangDefault,
      }));
    }
  }, [
    isEdit,
    initCompleted,
    programData.opd_penanggung_jawab,
    programData.bidang_opd_penanggung_jawab,
    bidangOptions,
  ]);

  const { filteredSasarans, filteredStrategis, filteredAras } =
    useProgramFilters(programData, sasarans, tujuans, strategis, aras);

  const { handleChange, handleMultiChange, handleBidangChange } =
    useProgramHandlers(setProgramData, setErrorMsg, aras);
  const { validateForm } = useProgramValidation(
    programData,
    allPrograms,
    programId,
    isEdit
  );

  const normalize = (val) =>
    typeof val === "string" ? val.trim().replace(/\s+/g, " ") : val;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const validationResult = validateForm();
    if (validationResult.error) {
      setErrorMsg(validationResult.message);
      setSubmitting(false);
      return;
    }

    const strategiIds = (programData.strategi_ids || [])
      .map((s) => s.value || s)
      .filter(Boolean);
    const arahIds = (programData.arah_ids || [])
      .map((a) => {
        const id = a.value || a.id || a;
        return {
          id,
          strategi_id:
            a.strategi_id ??
            filteredAras.find((r) => String(r.id) === String(id))
              ?.strategi_id ??
            null,
        };
      })
      .filter((a) => a.id);

    const selectedOpd = opdEntries.find(
      (o) => String(o.id) === String(programData.opd_penanggung_jawab)
    );
    const opdValue = selectedOpd
      ? `${selectedOpd.nama_opd}||${selectedOpd.nama_bidang_opd}`
      : programData.opd_penanggung_jawab;

    const payload = {
      ...validationResult.payload,
      nama_program: normalize(validationResult.payload.nama_program),
      kode_program: normalize(validationResult.payload.kode_program),
      pagu_anggaran: validateFormPaguAnggaran(
        validationResult.payload?.pagu_anggaran ??
          programData.pagu_anggaran ??
          0
      ),
      opd_penanggung_jawab: normalize(opdValue),
      bidang_opd_penanggung_jawab: (programData.bidang_opd || [])
        .map((b) => b.value)
        .join(", "),
      strategi: strategiIds,
      arah_kebijakan: arahIds,
      tahun,
      jenis_dokumen: dokumen,
    };

    try {
      const res = isEdit
        ? await api.put(`/programs/${programData.id}`, payload)
        : await api.post("/programs", payload);
      setToast({
        show: true,
        message: `✅ Program berhasil ${isEdit ? "diperbarui" : "disimpan"}.`,
        variant: "success",
      });
      setTimeout(() => {
        if (onSubmitSuccess) onSubmitSuccess();
        else
          navigate("/program-list", {
            state: {
              reload: true,
              message: "Program berhasil diperbarui",
              variant: "success",
            },
          });
      }, 800);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || "Gagal simpan.";
      setToast({ show: true, message: `❌ ${errMsg}`, variant: "danger" });
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setProgramData(initialState);
    setErrorMsg("");
  };

  const handleClose = () => navigate("/program-list");
  const loading = periodeLoading || loadingDetail || refsLoading;

  return {
    isEdit,
    isPelaksana: user?.role === "PELAKSANA",
    isPengawas: user?.role === "PENGAWAS",
    loading,
    periodeLoading,
    programData,
    setProgramData,
    misis,
    tujuans,
    sasarans,
    strategis,
    filteredSasarans,
    filteredStrategis,
    filteredAras,
    bidangOptions,
    opdEntries,
    handleChange,
    handleMultiChange,
    handleBidangChange,
    handleSubmit,
    submitting,
    toast,
    setToast,
    navigate,
    handleCancel,
    handleClose,
    errorMsg,
    initCompleted,
  };
}

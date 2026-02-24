// src/features/rpjmd/hooks/useKegiatanFormLogic.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePeriode } from "@/contexts/PeriodeContext";
import useFetchPrograms from "./subhooks/useFetchPrograms";
import usePrefillKegiatan from "./subhooks/usePrefillKegiatan";
import useDuplicateChecker from "./subhooks/useCheckDuplicateKegiatan";
import api from "@/services/api";
import useKodeGenerator from "./subhooks/useKodeGenerator";
import useKegiatanSubmission from "./subhooks/useKegiatanSubmission";

const initialState = {
  program_id: "",
  nama_kegiatan: "",
  kode_kegiatan: "",
  jenis_dokumen: "RPJMD",
  tahun: "2025",
  opd_penanggung_jawab: "",
  bidang_opd_penanggung_jawab: "",
};

export default function useKegiatanFormLogic(
  existingData,
  onSubmitSuccess = () => {}
) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: periode_id, loading: periodeLoading } = usePeriode();
  const isEdit = Boolean(existingData);
  const isPelaksana = user?.role === "PELAKSANA";

  const [kegiatanData, setKegiatanData] = useState(initialState);
  const [activeTab, setActiveTab] = useState("umum");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // 🆕 Ambil tahun & jenis_dokumen dari state
  const { tahun, jenis_dokumen } = kegiatanData;

  // 🆕 Kirim parameter ke useFetchPrograms
  const {
    programs,
    loading: programsLoading,
    error: programsError,
  } = useFetchPrograms(tahun, jenis_dokumen);

  // 🔎 Logging debug
  useEffect(() => {
    if (!programsLoading && programs.length === 0) {
      console.warn(
        "⚠️ Tidak ada data program yang tersedia untuk tahun",
        tahun,
        "dan jenis dokumen",
        jenis_dokumen
      );
    }
  }, [programs, programsLoading, tahun, jenis_dokumen]);

  usePrefillKegiatan(isEdit, existingData, setKegiatanData);
  useKodeGenerator(kegiatanData, setKegiatanData, programs, isEdit);

  const { duplicateField, checking, checkDuplicate } = useDuplicateChecker(
    periode_id,
    isEdit,
    existingData,
    tahun,
    jenis_dokumen
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[Change] Field: ${name}, Value: "${value}"`);

    const next = { ...kegiatanData, [name]: value };
    setKegiatanData(next);

    if (["nama_kegiatan", "kode_kegiatan"].includes(name)) {
      console.log(`[Validasi] Trigger checkDuplicate for ${name}:`, value);
      checkDuplicate(name, value);
    }
  };

  const handleProgramChange = async (e) => {
    const program_id = e.target.value;

    setKegiatanData((prev) => ({
      ...prev,
      program_id,
      kode_kegiatan: "",
      opd_penanggung_jawab: "",
      bidang_opd_penanggung_jawab: "",
    }));

    try {
      const res = await api.get(`/programs/${program_id}`);
      const prog = res.data.data;
      setKegiatanData((prev) => ({
        ...prev,
        opd_penanggung_jawab: prog.opd_penanggung_jawab,
        bidang_opd_penanggung_jawab: prog.bidang_opd_penanggung_jawab,
      }));
    } catch (err) {
      console.error("Fetch program error:", err);
    }
  };

  const handleCancel = () => {
    setKegiatanData(
      isEdit ? { ...initialState, ...existingData } : initialState
    );
  };

  const { handleSubmit } = useKegiatanSubmission(
    isEdit,
    existingData,
    kegiatanData,
    periode_id,
    setErrorMsg,
    setSuccessMsg,
    setKegiatanData,
    initialState,
    onSubmitSuccess,
    setFormLoading
  );

  return {
    kegiatanData,
    setKegiatanData,
    programs,
    duplicateField,
    checking,
    errorMsg,
    successMsg,
    isEdit,
    isPelaksana,
    loading: formLoading,
    periodeLoading,
    activeTab,
    setActiveTab,
    navigate,
    handleChange,
    handleSubmit,
    handleCancel,
    handleProgramChange,
    programsLoading,
    programsError,
  };
}

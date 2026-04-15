// src/features/rpjmd/hooks/useKegiatanFormLogic.js
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePeriode } from "@/contexts/PeriodeContext";
import useFetchPrograms from "./subhooks/useFetchPrograms";
import usePrefillKegiatan from "./subhooks/usePrefillKegiatan";
import useDuplicateChecker from "./subhooks/useCheckDuplicateKegiatan";
import api from "@/services/api";
import useKodeGenerator from "./subhooks/useKodeGenerator";
import useKegiatanSubmission from "./subhooks/useKegiatanSubmission";
import {
  fetchMasterPrograms,
  fetchMasterKegiatanByProgram,
  formatMasterKegiatanLabel,
} from "@/services/masterService";
import { findMasterProgramRow } from "@/utils/masterRpjmdResolve";

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
  const [masterPrograms, setMasterPrograms] = useState([]);
  const [masterProgramsLoading, setMasterProgramsLoading] = useState(false);
  const [masterKegiatans, setMasterKegiatans] = useState([]);
  const [masterKegiatanLoading, setMasterKegiatanLoading] = useState(false);

  // 🆕 Ambil tahun & jenis_dokumen dari state
  const { tahun, jenis_dokumen } = kegiatanData;

  // 🆕 Kirim parameter ke useFetchPrograms
  const {
    programs,
    loading: programsLoading,
    error: programsError,
  } = useFetchPrograms(tahun, jenis_dokumen);

  const masterDatasetKey = useMemo(() => {
    try {
      const v = import.meta.env?.VITE_MASTER_DATASET_KEY;
      return v != null && String(v).trim() !== "" ? String(v).trim() : undefined;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMasterProgramsLoading(true);
    (async () => {
      try {
        let { data } = await fetchMasterPrograms(masterDatasetKey);
        let rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
          const r2 = await fetchMasterPrograms(undefined, {
            allDatasets: true,
            bypassCache: true,
          });
          rows = Array.isArray(r2.data) ? r2.data : [];
        }
        if (!cancelled) setMasterPrograms(rows);
      } catch (e) {
        console.error("[useKegiatanFormLogic] master program:", e);
        if (!cancelled) setMasterPrograms([]);
      } finally {
        if (!cancelled) setMasterProgramsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [masterDatasetKey]);

  const selectedRpjmProgram = useMemo(
    () =>
      programs.find((p) => String(p.id) === String(kegiatanData.program_id)) ||
      null,
    [programs, kegiatanData.program_id],
  );

  const matchedMasterProgram = useMemo(
    () => findMasterProgramRow(masterPrograms, selectedRpjmProgram),
    [masterPrograms, selectedRpjmProgram],
  );

  useEffect(() => {
    let cancelled = false;
    if (!matchedMasterProgram?.id) {
      setMasterKegiatans([]);
      setMasterKegiatanLoading(false);
      return undefined;
    }
    setMasterKegiatanLoading(true);
    (async () => {
      try {
        const dk = matchedMasterProgram.dataset_key || undefined;
        const { data } = await fetchMasterKegiatanByProgram(
          matchedMasterProgram.id,
          { datasetKey: dk },
        );
        if (!cancelled) {
          setMasterKegiatans(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("[useKegiatanFormLogic] master kegiatan:", e);
        if (!cancelled) setMasterKegiatans([]);
      } finally {
        if (!cancelled) setMasterKegiatanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchedMasterProgram?.id, matchedMasterProgram?.dataset_key]);

  const masterKegiatanOptions = useMemo(
    () =>
      (masterKegiatans || []).map((k) => ({
        value: String(k.id),
        label: formatMasterKegiatanLabel(k),
        kode: String(k.kode_kegiatan_full || k.kode_kegiatan || "").trim(),
        nama: String(k.nama_kegiatan || "").trim(),
      })),
    [masterKegiatans],
  );

  const selectedMasterKegiatanOption = useMemo(() => {
    const kc = String(kegiatanData.kode_kegiatan || "").trim();
    const nk = String(kegiatanData.nama_kegiatan || "").trim();
    if (!kc && !nk) return null;
    const byKode = masterKegiatanOptions.find((o) => o.kode === kc);
    if (byKode) return byKode;
    if (nk) {
      return masterKegiatanOptions.find((o) => o.nama === nk) || null;
    }
    return null;
  }, [
    masterKegiatanOptions,
    kegiatanData.kode_kegiatan,
    kegiatanData.nama_kegiatan,
  ]);

  const hasMasterKegiatanList = masterKegiatanOptions.length > 0;
  const kodeKegiatanOutsideMaster =
    hasMasterKegiatanList &&
    (Boolean(String(kegiatanData.kode_kegiatan || "").trim()) ||
      Boolean(String(kegiatanData.nama_kegiatan || "").trim())) &&
    !selectedMasterKegiatanOption;

  const applyMasterKegiatanSelection = (opt) => {
    if (!opt) {
      setKegiatanData((prev) => ({
        ...prev,
        kode_kegiatan: "",
        nama_kegiatan: "",
      }));
      return;
    }
    setKegiatanData((prev) => ({
      ...prev,
      kode_kegiatan: opt.kode,
      nama_kegiatan: opt.nama,
    }));
  };

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
  useKodeGenerator(kegiatanData, setKegiatanData, isEdit, programs, {
    skipAutoKode: Boolean(matchedMasterProgram && masterKegiatanOptions.length > 0),
  });

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
      nama_kegiatan: "",
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
    masterKegiatanOptions,
    masterKegiatanLoading: masterProgramsLoading || masterKegiatanLoading,
    applyMasterKegiatanSelection,
    selectedMasterKegiatanOption,
    hasMasterKegiatanList,
    kodeKegiatanOutsideMaster,
    masterProgramsLoading,
  };
}

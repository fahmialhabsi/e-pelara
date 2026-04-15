import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import initSubKegiatan from "./subhooks/useInitSubKegiatan";
import { useDokumen } from "@/hooks/useDokumen";
import {
  fetchMasterPrograms,
  fetchMasterKegiatanByProgram,
  fetchMasterSubKegiatanByKegiatan,
  formatMasterSubKegiatanLabel,
} from "@/services/masterService";
import {
  findMasterProgramRow,
  findMasterKegiatanRow,
} from "@/utils/masterRpjmdResolve";

export default function useSubKegiatanFormLogic(existingData, onSubmit) {
  const [formData, setFormData] = useState({
    program_id: "",
    kegiatan_id: "",
    kode_sub_kegiatan: "",
    nama_sub_kegiatan: "",
    pagu_anggaran: 0,
    nama_opd: "",
    nama_bidang_opd: "",
    sub_bidang_opd: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [duplicateField, setDuplicateField] = useState("");
  const [key, setKey] = useState("informasi");
  const [programList, setProgramList] = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [totalPaguKegiatan, setTotalPaguKegiatan] = useState(0);
  const [totalPaguProgram, setTotalPaguProgram] = useState(0);
  const [masterPrograms, setMasterPrograms] = useState([]);
  const [masterProgramsLoading, setMasterProgramsLoading] = useState(false);
  const [masterKegiatans, setMasterKegiatans] = useState([]);
  const [masterKegiatanLoading, setMasterKegiatanLoading] = useState(false);
  const [masterSubKegiatans, setMasterSubKegiatans] = useState([]);
  const [masterSubLoading, setMasterSubLoading] = useState(false);

  const { dokumen, tahun } = useDokumen();

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
        console.error("[useSubKegiatanFormLogic] master program:", e);
        if (!cancelled) setMasterPrograms([]);
      } finally {
        if (!cancelled) setMasterProgramsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [masterDatasetKey]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen: dokumen },
        });
        const raw = res.data?.data ?? res.data;
        setProgramList(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error("❌ Gagal memuat program:", err);
      }
    };

    if (dokumen && tahun) {
      fetchPrograms();
    }
  }, [dokumen, tahun]);

  useEffect(() => {
    if (existingData && programList.length > 0 && dokumen && tahun) {
      const formattedPagu = existingData.pagu_anggaran
        ? formatRupiah(existingData.pagu_anggaran.toString())
        : "0";

      const initial = {
        ...formData,
        ...existingData,
        pagu_anggaran: formattedPagu,
        jenis_dokumen: dokumen,
        tahun,
      };

      setTotalPaguKegiatan(existingData.kegiatan?.total_pagu_anggaran ?? 0);
      setTotalPaguProgram(
        existingData.kegiatan?.program?.total_pagu_anggaran ?? 0
      );

      initSubKegiatan(existingData, initial, setFormData, handleProgramChange);
    }

    setLoading(false);
  }, [existingData, programList, dokumen, tahun]);

  const selectedRpjmProgram = useMemo(
    () =>
      programList.find((p) => String(p.id) === String(formData.program_id)) ||
      null,
    [programList, formData.program_id],
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
        console.error("[useSubKegiatanFormLogic] master kegiatan:", e);
        if (!cancelled) setMasterKegiatans([]);
      } finally {
        if (!cancelled) setMasterKegiatanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchedMasterProgram?.id, matchedMasterProgram?.dataset_key]);

  const selectedRpjmKegiatan = useMemo(
    () =>
      kegiatanList.find((k) => String(k.id) === String(formData.kegiatan_id)) ||
      null,
    [kegiatanList, formData.kegiatan_id],
  );

  const matchedMasterKegiatan = useMemo(
    () => findMasterKegiatanRow(masterKegiatans, selectedRpjmKegiatan),
    [masterKegiatans, selectedRpjmKegiatan],
  );

  useEffect(() => {
    let cancelled = false;
    if (!matchedMasterKegiatan?.id) {
      setMasterSubKegiatans([]);
      setMasterSubLoading(false);
      return undefined;
    }
    setMasterSubLoading(true);
    (async () => {
      try {
        const dk = matchedMasterProgram?.dataset_key || undefined;
        const { data } = await fetchMasterSubKegiatanByKegiatan(
          matchedMasterKegiatan.id,
          { datasetKey: dk },
        );
        if (!cancelled) {
          setMasterSubKegiatans(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("[useSubKegiatanFormLogic] master sub kegiatan:", e);
        if (!cancelled) setMasterSubKegiatans([]);
      } finally {
        if (!cancelled) setMasterSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    matchedMasterKegiatan?.id,
    matchedMasterProgram?.dataset_key,
  ]);

  const masterSubKegiatanOptions = useMemo(
    () =>
      (masterSubKegiatans || []).map((s) => ({
        value: String(s.id),
        label: formatMasterSubKegiatanLabel(s),
        kode: String(s.kode_sub_kegiatan_full || s.kode_sub_kegiatan || "").trim(),
        nama: String(s.nama_sub_kegiatan || "").trim(),
      })),
    [masterSubKegiatans],
  );

  const selectedMasterSubOption = useMemo(() => {
    const kc = String(formData.kode_sub_kegiatan || "").trim();
    const nk = String(formData.nama_sub_kegiatan || "").trim();
    if (!kc && !nk) return null;
    const byKode = masterSubKegiatanOptions.find((o) => o.kode === kc);
    if (byKode) return byKode;
    if (nk) {
      return masterSubKegiatanOptions.find((o) => o.nama === nk) || null;
    }
    return null;
  }, [
    masterSubKegiatanOptions,
    formData.kode_sub_kegiatan,
    formData.nama_sub_kegiatan,
  ]);

  const hasMasterSubList = masterSubKegiatanOptions.length > 0;
  const kodeSubOutsideMaster =
    hasMasterSubList &&
    (Boolean(String(formData.kode_sub_kegiatan || "").trim()) ||
      Boolean(String(formData.nama_sub_kegiatan || "").trim())) &&
    !selectedMasterSubOption;

  const applyMasterSubSelection = (opt) => {
    if (!opt) {
      setFormData((prev) => ({
        ...prev,
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      kode_sub_kegiatan: opt.kode,
      nama_sub_kegiatan: opt.nama,
    }));
  };

  const handleProgramChange = async (programId, prefillKegiatanId = "") => {
    try {
      const res = await api.get("/kegiatan", {
        params: {
          program_id: programId,
          tahun,
          jenis_dokumen: dokumen,
        },
      });

      const kRaw = res.data?.data ?? res.data;
      setKegiatanList(Array.isArray(kRaw) ? kRaw : []);

      const selectedProgram = programList.find((p) => p.id === +programId);

      setFormData((prev) => ({
        ...prev,
        program_id: programId,
        kegiatan_id: prefillKegiatanId || "",
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        nama_opd: selectedProgram?.opd?.nama_opd || "",
        nama_bidang_opd: selectedProgram?.bidang_opd_penanggung_jawab || "",
      }));
    } catch (err) {
      console.error("❌ Gagal memuat kegiatan:", err);
    }
  };

  const formatRupiah = (value) => {
    const numeric = value.replace(/[^\d]/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const unformatRupiah = (formatted) => {
    return formatted.replace(/\./g, "");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "pagu_anggaran") {
      const formatted = formatRupiah(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formatted,
      }));
    } else if (name === "kegiatan_id") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setChecking(true);
    setDuplicateField("");

    const rawPagu = Number(unformatRupiah(formData.pagu_anggaran));

    if (!rawPagu || rawPagu <= 0) {
      setMessage("❌ Pagu Anggaran wajib diisi dan harus lebih dari 0.");
      setChecking(false);
      return;
    }

    if (rawPagu > 1_000_000_000_000) {
      setMessage(
        "❌ Pagu Anggaran terlalu besar. Maksimal 1 Triliun untuk saat ini."
      );
      setChecking(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        tahun,
        jenis_dokumen: dokumen,
        pagu_anggaran: rawPagu,
        nama_opd: formData.nama_opd,
        nama_bidang_opd: formData.nama_bidang_opd,
      };

      let res;
      if (existingData?.id) {
        res = await api.put(`/sub-kegiatan/${existingData.id}`, payload);
        setMessage("✅ Sub Kegiatan berhasil diperbarui.");
      } else {
        res = await api.post("/sub-kegiatan", payload);
        setMessage("✅ Sub Kegiatan berhasil ditambahkan.");
      }

      if (onSubmit) onSubmit();
    } catch (err) {
      console.error("❌ Gagal menyimpan Sub Kegiatan:", err);
      if (err?.response?.data?.duplicateField) {
        setDuplicateField(err.response.data.duplicateField);
      }
      setMessage(
        "❌ Terjadi kesalahan saat menyimpan. Silakan cek kembali input Anda."
      );
    } finally {
      setChecking(false);
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    programList,
    kegiatanList,
    handleProgramChange,
    key,
    setKey,
    message,
    setMessage,
    checking,
    duplicateField,
    loading,
    totalPaguKegiatan,
    totalPaguProgram,
    masterSubKegiatanOptions,
    masterSubLoading:
      masterProgramsLoading || masterKegiatanLoading || masterSubLoading,
    applyMasterSubSelection,
    selectedMasterSubOption,
    hasMasterSubList,
    kodeSubOutsideMaster,
    masterProgramsLoading,
    masterKegiatanLoading,
  };
}

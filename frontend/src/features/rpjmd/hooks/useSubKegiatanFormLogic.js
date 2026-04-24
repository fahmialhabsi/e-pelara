import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "@/services/api";
import initSubKegiatan from "./subhooks/useInitSubKegiatan";
import { useDokumen } from "@/hooks/useDokumen";
import {
  fetchMasterPrograms,
  fetchMasterKegiatanByProgram,
  fetchMasterSubKegiatanByKegiatan,
  formatMasterSubKegiatanLabel,
  formatMasterProgramLabel,
  formatMasterKegiatanLabel,
} from "@/services/masterService";
import {
  findMasterProgramRow,
  findMasterKegiatanRow,
  findRpjmdProgramRowForMaster,
  findRpjmdKegiatanRowForMaster,
} from "@/utils/masterRpjmdResolve";

function normStr(v) {
  return v == null ? "" : String(v).trim();
}

export default function useSubKegiatanFormLogic(existingData, onSubmit) {
  const [formData, setFormData] = useState({
    program_id: "",
    kegiatan_id: "",
    kode_program: "",
    nama_program: "",
    kode_kegiatan: "",
    nama_kegiatan: "",
    kode_sub_kegiatan: "",
    nama_sub_kegiatan: "",
    master_sub_kegiatan_id: "",
    regulasi_versi_id: "",
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

  const [masterProgramList, setMasterProgramList] = useState([]);
  const [masterProgramsLoading, setMasterProgramsLoading] = useState(false);
  const [masterKegiatanList, setMasterKegiatanList] = useState([]);
  const [masterKegiatanLoading, setMasterKegiatanLoading] = useState(false);
  const [masterSubKegiatanList, setMasterSubKegiatanList] = useState([]);
  const [masterSubLoading, setMasterSubLoading] = useState(false);

  const [selectedMasterProgramId, setSelectedMasterProgramId] = useState("");
  const [selectedMasterKegiatanId, setSelectedMasterKegiatanId] = useState("");
  const [selectedMasterSubKegiatanId, setSelectedMasterSubKegiatanId] =
    useState("");

  const { dokumen, tahun } = useDokumen();

  const masterDatasetKey = useMemo(() => {
    try {
      const v = import.meta.env?.VITE_MASTER_DATASET_KEY;
      return v != null && String(v).trim() !== "" ? String(v).trim() : undefined;
    } catch {
      return undefined;
    }
  }, []);

  const referensiDatasetKey = useMemo(
    () =>
      masterDatasetKey != null && String(masterDatasetKey).trim() !== ""
        ? String(masterDatasetKey).trim()
        : undefined,
    [masterDatasetKey],
  );

  const masterPathActive = Boolean(
    selectedMasterProgramId && String(selectedMasterProgramId).trim() !== "",
  );

  const clearMasterSelections = useCallback(() => {
    setSelectedMasterProgramId("");
    setSelectedMasterKegiatanId("");
    setSelectedMasterSubKegiatanId("");
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("MODE:", masterPathActive ? "MASTER" : "MANUAL", {
      program_id: formData.program_id,
      kegiatan_id: formData.kegiatan_id,
      master_program_id: masterPathActive ? selectedMasterProgramId : "",
      master_kegiatan_id: masterPathActive ? selectedMasterKegiatanId : "",
      master_sub_kegiatan_id: formData.master_sub_kegiatan_id,
    });
  }, [
    masterPathActive,
    formData.program_id,
    formData.kegiatan_id,
    formData.master_sub_kegiatan_id,
    selectedMasterProgramId,
    selectedMasterKegiatanId,
  ]);

  useEffect(() => {
    let cancelled = false;
    setMasterProgramsLoading(true);
    (async () => {
      try {
        let { data } = await fetchMasterPrograms(masterDatasetKey);
        let rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
          const r2 = await fetchMasterPrograms(masterDatasetKey, {
            allDatasets: true,
            bypassCache: true,
          });
          rows = Array.isArray(r2.data) ? r2.data : [];
        }
        if (!cancelled) setMasterProgramList(rows);
      } catch (e) {
        console.error("[useSubKegiatanFormLogic] master program:", e);
        if (!cancelled) setMasterProgramList([]);
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
        existingData.kegiatan?.program?.total_pagu_anggaran ?? 0,
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
    () => findMasterProgramRow(masterProgramList, selectedRpjmProgram),
    [masterProgramList, selectedRpjmProgram],
  );

  const masterProgramIdForKegiatanFetch = masterPathActive
    ? selectedMasterProgramId
    : matchedMasterProgram?.id != null
      ? String(matchedMasterProgram.id)
      : "";

  useEffect(() => {
    let cancelled = false;
    if (!masterProgramIdForKegiatanFetch) {
      setMasterKegiatanList([]);
      setMasterKegiatanLoading(false);
      return undefined;
    }
    setMasterKegiatanLoading(true);
    (async () => {
      try {
        const { data } = await fetchMasterKegiatanByProgram(
          masterProgramIdForKegiatanFetch,
          { datasetKey: referensiDatasetKey },
        );
        if (!cancelled) {
          setMasterKegiatanList(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("[useSubKegiatanFormLogic] master kegiatan:", e);
        if (!cancelled) setMasterKegiatanList([]);
      } finally {
        if (!cancelled) setMasterKegiatanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [masterProgramIdForKegiatanFetch, referensiDatasetKey]);

  const selectedRpjmKegiatan = useMemo(
    () =>
      kegiatanList.find((k) => String(k.id) === String(formData.kegiatan_id)) ||
      null,
    [kegiatanList, formData.kegiatan_id],
  );

  const matchedMasterKegiatan = useMemo(
    () => findMasterKegiatanRow(masterKegiatanList, selectedRpjmKegiatan),
    [masterKegiatanList, selectedRpjmKegiatan],
  );

  const masterKegiatanIdForSubFetch = masterPathActive
    ? selectedMasterKegiatanId
    : matchedMasterKegiatan?.id != null
      ? String(matchedMasterKegiatan.id)
      : "";

  useEffect(() => {
    let cancelled = false;
    if (!masterKegiatanIdForSubFetch) {
      setMasterSubKegiatanList([]);
      setMasterSubLoading(false);
      return undefined;
    }
    setMasterSubLoading(true);
    (async () => {
      try {
        const { data } = await fetchMasterSubKegiatanByKegiatan(
          masterKegiatanIdForSubFetch,
          { datasetKey: referensiDatasetKey },
        );
        if (!cancelled) {
          setMasterSubKegiatanList(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("[useSubKegiatanFormLogic] master sub kegiatan:", e);
        if (!cancelled) setMasterSubKegiatanList([]);
      } finally {
        if (!cancelled) setMasterSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [masterKegiatanIdForSubFetch, referensiDatasetKey]);

  const masterSubKegiatanOptions = useMemo(
    () =>
      (masterSubKegiatanList || []).map((s) => ({
        value: String(s.id),
        label: formatMasterSubKegiatanLabel(s),
        kode: String(s.kode_sub_kegiatan_full || s.kode_sub_kegiatan || "").trim(),
        nama: String(s.nama_sub_kegiatan || "").trim(),
        masterSubId: s.id,
        regulasiVersiId: s.regulasi_versi_id,
      })),
    [masterSubKegiatanList],
  );

  const selectedMasterSubOption = useMemo(() => {
    if (masterPathActive && selectedMasterSubKegiatanId) {
      return (
        masterSubKegiatanOptions.find(
          (o) => o.value === String(selectedMasterSubKegiatanId),
        ) || null
      );
    }
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
    masterPathActive,
    selectedMasterSubKegiatanId,
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
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
      }));
      setSelectedMasterSubKegiatanId("");
      return;
    }
    const vid = opt.regulasiVersiId;
    setFormData((prev) => ({
      ...prev,
      kode_sub_kegiatan: opt.kode,
      nama_sub_kegiatan: opt.nama,
      master_sub_kegiatan_id:
        opt.masterSubId != null ? String(opt.masterSubId) : "",
      regulasi_versi_id: vid != null && vid !== "" ? String(vid) : "",
    }));
    setSelectedMasterSubKegiatanId(
      masterPathActive && opt.masterSubId != null
        ? String(opt.masterSubId)
        : "",
    );
  };

  const handleProgramChange = async (
    programId,
    prefillKegiatanId = "",
    opts = {},
  ) => {
    const { fromMasterRow } = opts;
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
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
        nama_opd: selectedProgram?.opd?.nama_opd || "",
        nama_bidang_opd: selectedProgram?.bidang_opd_penanggung_jawab || "",
        ...(fromMasterRow
          ? {
              kode_program: normStr(fromMasterRow.kode_program_full),
              nama_program: normStr(fromMasterRow.nama_program),
              kode_kegiatan: "",
              nama_kegiatan: "",
            }
          : {
              kode_program: normStr(selectedProgram?.kode_program),
              nama_program: normStr(selectedProgram?.nama_program),
              kode_kegiatan: "",
              nama_kegiatan: "",
            }),
      }));
    } catch (err) {
      console.error("❌ Gagal memuat kegiatan:", err);
    }
  };

  const handleLegacyProgramChange = async (programId) => {
    clearMasterSelections();
    await handleProgramChange(programId, "");
  };

  const handleMasterProgramChange = async (e) => {
    const raw = e?.target?.value ?? "";
    const id = raw != null ? String(raw) : "";
    setSelectedMasterKegiatanId("");
    setSelectedMasterSubKegiatanId("");
    setSelectedMasterProgramId(id);
    setMessage("");

    if (!id) {
      setFormData((prev) => ({
        ...prev,
        program_id: "",
        kegiatan_id: "",
        kode_program: "",
        nama_program: "",
        kode_kegiatan: "",
        nama_kegiatan: "",
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
        nama_opd: "",
        nama_bidang_opd: "",
      }));
      setKegiatanList([]);
      return;
    }

    const row = masterProgramList.find((p) => String(p.id) === id);
    if (!row) return;

    const rp = findRpjmdProgramRowForMaster(programList, row);
    if (!rp) {
      setMessage(
        "Program referensi tidak memiliki pasangan di program RPJMD untuk dokumen/tahun ini. Pilih program transaksi secara manual (kosongkan referensi) atau lengkapi data RPJMD.",
      );
      setFormData((prev) => ({
        ...prev,
        program_id: "",
        kegiatan_id: "",
        kode_program: normStr(row.kode_program_full),
        nama_program: normStr(row.nama_program),
        kode_kegiatan: "",
        nama_kegiatan: "",
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
        nama_opd: "",
        nama_bidang_opd: "",
      }));
      setKegiatanList([]);
      return;
    }

    await handleProgramChange(String(rp.id), "", { fromMasterRow: row });
  };

  const handleMasterKegiatanChange = (e) => {
    const raw = e?.target?.value ?? "";
    const kid = raw != null ? String(raw) : "";
    setSelectedMasterSubKegiatanId("");
    setSelectedMasterKegiatanId(kid);
    setMessage("");

    if (!kid) {
      setFormData((prev) => ({
        ...prev,
        kegiatan_id: "",
        kode_kegiatan: "",
        nama_kegiatan: "",
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
      }));
      return;
    }

    const row = masterKegiatanList.find((k) => String(k.id) === kid);
    if (!row) return;

    const rk = findRpjmdKegiatanRowForMaster(kegiatanList, row);
    if (!rk) {
      setMessage(
        "Kegiatan referensi tidak memiliki pasangan di kegiatan RPJMD untuk program ini.",
      );
      setFormData((prev) => ({
        ...prev,
        kegiatan_id: "",
        kode_kegiatan: normStr(row.kode_kegiatan_full),
        nama_kegiatan: normStr(row.nama_kegiatan),
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      kegiatan_id: String(rk.id),
      kode_kegiatan: normStr(row.kode_kegiatan_full),
      nama_kegiatan: normStr(row.nama_kegiatan),
      kode_sub_kegiatan: "",
      nama_sub_kegiatan: "",
      master_sub_kegiatan_id: "",
      regulasi_versi_id: "",
    }));
  };

  const formatRupiah = (value) => {
    const numeric = value.replace(/[^\d]/g, "");
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const unformatRupiah = (formatted) => {
    return formatted.replace(/\./g, "");
  };

  const masterEditHydrateRef = useRef(null);

  useEffect(() => {
    if (!existingData?.id) {
      masterEditHydrateRef.current = null;
      return;
    }
    if (
      existingData.input_mode !== "MASTER" &&
      existingData.master_sub_kegiatan_id == null
    ) {
      return;
    }
    if (masterEditHydrateRef.current === existingData.id) {
      return;
    }
    if (!masterProgramList.length || !programList.length || !kegiatanList.length) {
      return;
    }
    if (!masterKegiatanList.length) {
      return;
    }
    if (existingData.master_sub_kegiatan_id && masterSubLoading) {
      return;
    }

    const p = programList.find(
      (x) => String(x.id) === String(existingData.program_id),
    );
    const mp = findMasterProgramRow(masterProgramList, p);
    if (mp?.id) setSelectedMasterProgramId(String(mp.id));

    const k = kegiatanList.find(
      (x) => String(x.id) === String(existingData.kegiatan_id),
    );
    const mk = findMasterKegiatanRow(masterKegiatanList, k);
    if (mk?.id) setSelectedMasterKegiatanId(String(mk.id));

    if (existingData.master_sub_kegiatan_id && masterSubKegiatanList.length) {
      const sid = String(existingData.master_sub_kegiatan_id);
      if (masterSubKegiatanList.some((s) => String(s.id) === sid)) {
        setSelectedMasterSubKegiatanId(sid);
      }
    }

    masterEditHydrateRef.current = existingData.id;
  }, [
    existingData,
    masterProgramList,
    programList,
    kegiatanList,
    masterKegiatanList,
    masterSubKegiatanList,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "pagu_anggaran") {
      const formatted = formatRupiah(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formatted,
      }));
    } else if (name === "kegiatan_id") {
      clearMasterSelections();
      const kg = kegiatanList.find((k) => String(k.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        kode_sub_kegiatan: "",
        nama_sub_kegiatan: "",
        master_sub_kegiatan_id: "",
        regulasi_versi_id: "",
        kode_kegiatan: kg ? normStr(kg.kode_kegiatan) : "",
        nama_kegiatan: kg ? normStr(kg.nama_kegiatan) : "",
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
        "❌ Pagu Anggaran terlalu besar. Maksimal 1 Triliun untuk saat ini.",
      );
      setChecking(false);
      return;
    }

    if (masterPathActive) {
      if (!normStr(formData.program_id) || !normStr(formData.kegiatan_id)) {
        setMessage("Mapping ke RPJMD gagal. Data tidak bisa disimpan.");
        setChecking(false);
        return;
      }
      if (!normStr(formData.master_sub_kegiatan_id)) {
        setMessage(
          "❌ Mode MASTER: pilih sub kegiatan dari referensi master terlebih dahulu.",
        );
        setChecking(false);
        return;
      }
    } else if (!normStr(formData.program_id) || !normStr(formData.kegiatan_id)) {
      setMessage(
        "❌ Program dan kegiatan RPJMD wajib terisi. Sesuaikan referensi master agar berpasangan dengan data transaksi, atau pilih program/kegiatan transaksi secara manual.",
      );
      setChecking(false);
      return;
    }

    if (import.meta.env.DEV) {
      console.log("MODE (submit):", masterPathActive ? "MASTER" : "MANUAL", {
        program_id: formData.program_id,
        kegiatan_id: formData.kegiatan_id,
        master_program_id: masterPathActive ? selectedMasterProgramId : "",
        master_kegiatan_id: masterPathActive ? selectedMasterKegiatanId : "",
        master_sub_kegiatan_id: formData.master_sub_kegiatan_id,
      });
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

      if (masterPathActive) {
        payload.master_program_id = selectedMasterProgramId;
        payload.master_kegiatan_id = selectedMasterKegiatanId;
        payload.input_mode = "MASTER";
      } else {
        delete payload.master_program_id;
        delete payload.master_kegiatan_id;
        if (payload.input_mode === "MASTER") delete payload.input_mode;
      }

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
        "❌ Terjadi kesalahan saat menyimpan. Silakan cek kembali input Anda.",
      );
    } finally {
      setChecking(false);
    }
  };

  const lockManualKodeNama =
    masterPathActive ||
    (hasMasterSubList && Boolean(selectedMasterSubOption) && !kodeSubOutsideMaster);

  return {
    formData,
    handleChange,
    handleSubmit,
    programList,
    kegiatanList,
    handleProgramChange: handleLegacyProgramChange,
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
    masterProgramList,
    masterKegiatanList,
    masterSubKegiatanList,
    selectedMasterProgramId,
    selectedMasterKegiatanId,
    selectedMasterSubKegiatanId,
    masterPathActive,
    handleMasterProgramChange,
    handleMasterKegiatanChange,
    formatMasterProgramLabel,
    formatMasterKegiatanLabel,
    lockManualKodeNama,
  };
}

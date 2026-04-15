import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Dropdown from "../components/Dropdown";
import DropdownTujuan from "../components/DropdownTujuan";
import DropdownSasaran from "../components/DropdownSasaran";
import DropdownStrategi from "../components/DropdownStrategi";
import DropdownArahKebijakan from "../components/DropdownArahKebijakan";
import fetchWithLog from "../../../utils/fetchWithLog";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { canManagePlanningWorkflow } from "../../../utils/roleUtils";
import { createRkpd, getRkpdById, updateRkpd, getRkpdAudit } from "../services/rkpdApi";
import { canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";
import PlanningAuditSection from "../../planning-audit/components/PlanningAuditSection";

const buildUniqueOpdOptions = (items = []) => {
  const seen = new Set();

  return items.reduce((result, item) => {
    const namaOpd = item?.nama_opd?.trim();
    const key = namaOpd?.toLowerCase();

    if (!namaOpd || !key || seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push({
      id: String(item.id),
      label: namaOpd,
    });

    return result;
  }, []);
};

const buildUniqueMisiOptions = (items = []) => {
  const seen = new Set();

  return items.reduce((result, item) => {
    const nomor = String(item?.no_misi ?? "").trim();
    const isi = String(item?.isi_misi ?? "").trim();
    const key = `${nomor}|${isi.toLowerCase()}`;

    if (!nomor || !isi || seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push({
      id: String(item.id),
      label: `${nomor} - ${isi}`,
    });

    return result;
  }, []);
};

const asOptionLabel = (...values) => {
  for (const value of values) {
    const cleaned = String(value ?? "").trim();
    if (cleaned) return cleaned;
  }
  return "-";
};

const buildPriorityOptions = (items = [], config = {}) => {
  const { kodeKey, namaKey, uraianKey } = config;

  return items
    .map((item) => {
      const id = String(item?.id ?? "").trim();
      if (!id) return null;

      const kode = String(item?.[kodeKey] ?? "").trim();
      const label = asOptionLabel(item?.[namaKey], item?.[uraianKey]);

      return {
        id,
        label: kode ? `${kode} - ${label}` : label,
      };
    })
    .filter(Boolean);
};

const isEmptyValue = (value) =>
  value === null || value === undefined || String(value).trim() === "";

const RkpdFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { user } = useAuth();
  const canManageRkpd = canManagePlanningWorkflow(user?.role);
  const { tahun, dokumen: jenis_dokumen } = useDokumen();

  /** Backend /programs, /kegiatan, /prioritas-* wajib tahun + jenis_dokumen; halaman RKPD paksa konteks rkpd. */
  const effectiveJenisDokumen = useMemo(
    () => String(jenis_dokumen || "rkpd").toLowerCase(),
    [jenis_dokumen],
  );

  const [periodeList, setPeriodeList] = useState([]);
  const [opdList, setOpdList] = useState([]);
  const [prioNasList, setPrioNasList] = useState([]);
  const [prioDaerahList, setPrioDaerahList] = useState([]);
  const [prioGubList, setPrioGubList] = useState([]);

  const [periodeId, setPeriodeId] = useState("");
  const [opdId, setOpdId] = useState("");
  const [prioNas, setPrioNas] = useState("");
  const [prioDaerah, setPrioDaerah] = useState("");
  const [prioGub, setPrioGub] = useState("");

  const [visiList, setVisiList] = useState([]);
  const [misiList, setMisiList] = useState([]);
  const [sasaranList, setSasaranList] = useState([]);
  const [strategiList, setStrategiList] = useState([]);
  const [arahList, setArahList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [subKegiatanList, setSubKegiatanList] = useState([]);

  const [visiId, setVisiId] = useState("");
  const [misiId, setMisiId] = useState("");
  const [tujuanId, setTujuanId] = useState("");
  const [sasaranId, setSasaranId] = useState("");
  const [strategiId, setStrategiId] = useState("");
  const [arahId, setArahId] = useState("");
  const [programId, setProgramId] = useState("");
  const [kegiatanId, setKegiatanId] = useState("");
  const [subKegiatanId, setSubKegiatanId] = useState("");

  const [indikatorTujuanList, setIndikatorTujuanList] = useState([]);
  const [indikatorSasaranList, setIndikatorSasaranList] = useState([]);
  const [indikatorProgramList, setIndikatorProgramList] = useState([]);
  const [indikatorKegiatanList, setIndikatorKegiatanList] = useState([]);
  const [targetValue, setTargetValue] = useState("");
  const [satuanValue, setSatuanValue] = useState("");
  const [paguAnggaran, setPaguAnggaran] = useState("");
  const [sumberDana, setSumberDana] = useState("");
  const [statusWorkflow, setStatusWorkflow] = useState("draft");
  const [rowDetail, setRowDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydratingEditRef = useRef(false);
  const [auditRows, setAuditRows] = useState([]);

  useEffect(() => {
    if (!isEditMode || !id) {
      setAuditRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getRkpdAudit(id);
        if (!cancelled) setAuditRows(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setAuditRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode]);

  const arahTerpilih = arahList.find(
    (item) => String(item.id) === String(arahId)
  );
  const opdOptions = buildUniqueOpdOptions(opdList);
  const misiOptions = buildUniqueMisiOptions(misiList);
  const selectedProgram = programList.find(
    (item) => String(item.id) === String(programId),
  );
  const selectedKegiatan = kegiatanList.find(
    (item) => String(item.id) === String(kegiatanId),
  );
  const selectedSubKegiatan = subKegiatanList.find(
    (item) => String(item.id) === String(subKegiatanId),
  );
  const prioritasNasionalOptions = buildPriorityOptions(prioNasList, {
    kodeKey: "kode_prionas",
    namaKey: "nama_prionas",
    uraianKey: "uraian_prionas",
  });
  const prioritasDaerahOptions = buildPriorityOptions(prioDaerahList, {
    kodeKey: "kode_prioda",
    namaKey: "nama_prioda",
    uraianKey: "uraian_prioda",
  });
  const prioritasGubernurOptions = buildPriorityOptions(prioGubList, {
    kodeKey: "kode_priogub",
    namaKey: "nama_priogub",
    uraianKey: "uraian_priogub",
  });

  useEffect(() => {
    if (!isEditMode || opdId || !rowDetail?.opd_penanggung_jawab) return;

    const matched = opdOptions.find(
      (item) =>
        String(item.label || "").toLowerCase() ===
        String(rowDetail.opd_penanggung_jawab || "").toLowerCase(),
    );
    if (matched) {
      setOpdId(String(matched.id));
    }
  }, [isEditMode, opdId, opdOptions, rowDetail]);

  const resetFormState = () => {
    setPeriodeId("");
    setOpdId("");
    setPrioNas("");
    setPrioDaerah("");
    setPrioGub("");

    setVisiId("");
    setMisiId("");
    setTujuanId("");
    setSasaranId("");
    setStrategiId("");
    setArahId("");
    setProgramId("");
    setKegiatanId("");
    setSubKegiatanId("");

    setMisiList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahList([]);
    setProgramList([]);
    setKegiatanList([]);
    setSubKegiatanList([]);

    setIndikatorTujuanList([]);
    setIndikatorSasaranList([]);
    setIndikatorProgramList([]);
    setIndikatorKegiatanList([]);
    setTargetValue("");
    setSatuanValue("");
    setPaguAnggaran("");
    setSumberDana("");
    setStatusWorkflow("draft");
    setRowDetail(null);
  };

  const levels = [
    { key: "misi", actions: [() => setMisiId(""), () => setMisiList([])] },
    {
      key: "tujuan",
      actions: [() => setTujuanId(""), () => setIndikatorTujuanList([])],
    },
    {
      key: "sasaran",
      actions: [
        () => setSasaranId(""),
        () => setSasaranList([]),
        () => setIndikatorSasaranList([]),
      ],
    },
    {
      key: "strategi",
      actions: [() => setStrategiId(""), () => setStrategiList([])],
    },
    { key: "arah", actions: [() => setArahId(""), () => setArahList([])] },
    {
      key: "program",
      actions: [
        () => setProgramId(""),
        () => setProgramList([]),
        () => setIndikatorProgramList([]),
      ],
    },
    {
      key: "kegiatan",
      actions: [
        () => setKegiatanId(""),
        () => setKegiatanList([]),
        () => setIndikatorKegiatanList([]),
      ],
    },
    {
      key: "subkegiatan",
      actions: [() => setSubKegiatanId(""), () => setSubKegiatanList([])],
    },
  ];

  const resetBelow = (level) => {
    if (isHydratingEditRef.current) return;

    const startIndex = levels.findIndex((item) => item.key === level);
    if (startIndex === -1) return;

    for (let i = startIndex; i < levels.length; i += 1) {
      levels[i].actions.forEach((action) => action());
    }
  };

  useEffect(() => {
    resetFormState();
  }, [tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;

    const loadDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const row = await getRkpdById(id);
        if (!isMounted || !row) return;

        isHydratingEditRef.current = true;
        setRowDetail(row);
        setPeriodeId(String(row.periode_rpjmd_id || row.periode_id || ""));
        setOpdId(String(row.opd_id || ""));
        setPrioNas(row.prioritas_nasional_id ? String(row.prioritas_nasional_id) : "");
        setPrioDaerah(row.prioritas_daerah_id ? String(row.prioritas_daerah_id) : "");
        setPrioGub(
          row.prioritas_kepala_daerah_id
            ? String(row.prioritas_kepala_daerah_id)
            : "",
        );
        setVisiId(String(row.visi_id || ""));
        setMisiId(String(row.misi_id || ""));
        setTujuanId(String(row.tujuan_id || ""));
        setSasaranId(String(row.sasaran_id || ""));
        setStrategiId(String(row.strategi_id || ""));
        setArahId(String(row.arah_id || ""));
        setProgramId(String(row.program_id || ""));
        setKegiatanId(String(row.kegiatan_id || ""));
        setSubKegiatanId(String(row.sub_kegiatan_id || ""));
        setTargetValue(
          row.target === null || row.target === undefined ? "" : String(row.target),
        );
        setSatuanValue(row.satuan || "");
        setPaguAnggaran(
          row.pagu_anggaran === null || row.pagu_anggaran === undefined
            ? ""
            : String(row.pagu_anggaran),
        );
        setSumberDana(row.sumber_dana || "");
        setStatusWorkflow(row.status || "draft");
        setTimeout(() => {
          isHydratingEditRef.current = false;
        }, 0);
      } catch (err) {
        console.error("Gagal memuat detail RKPD:", err);
        alert("Gagal memuat data RKPD untuk edit.");
        navigate("/dashboard-rkpd");
      } finally {
        isHydratingEditRef.current = false;
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    fetchWithLog("/periode-rpjmd", {}, setPeriodeList);
    fetchWithLog("/opd-penanggung-jawab/dropdown", {}, setOpdList);
    fetchWithLog(
      "/prioritas-nasional",
      { tahun, jenis_dokumen: effectiveJenisDokumen, limit: 200 },
      setPrioNasList,
    );
    fetchWithLog(
      "/prioritas-daerah",
      { tahun, jenis_dokumen: effectiveJenisDokumen, limit: 200 },
      setPrioDaerahList,
    );
    fetchWithLog(
      "/prioritas-gubernur",
      { tahun, jenis_dokumen: effectiveJenisDokumen, limit: 200 },
      setPrioGubList,
    );
  }, [tahun, effectiveJenisDokumen]);

  useEffect(() => {
    fetchWithLog("/visi", { tahun, jenis_dokumen: effectiveJenisDokumen }, setVisiList);
  }, [tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("misi");

    if (!visiId) return;

    fetchWithLog(
      "/misi",
      { visi_id: visiId, tahun, jenis_dokumen: effectiveJenisDokumen },
      setMisiList,
    );
  }, [visiId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("tujuan");
  }, [misiId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("strategi");

    if (!sasaranId) return;

    fetchWithLog(
      "/programs",
      {
        sasaran_id: sasaranId,
        tahun,
        jenis_dokumen: effectiveJenisDokumen,
        limit: 100,
      },
      setProgramList,
    );
  }, [sasaranId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("arah");
  }, [strategiId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("kegiatan");

    if (!programId) return;

    fetchWithLog(
      "/kegiatan",
      {
        program_id: programId,
        tahun,
        jenis_dokumen: effectiveJenisDokumen,
        limit: 100,
      },
      setKegiatanList,
    );
  }, [programId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    resetBelow("subkegiatan");

    if (!kegiatanId) return;

    fetchWithLog(
      "/sub-kegiatan",
      {
        kegiatan_id: kegiatanId,
        tahun,
        jenis_dokumen: effectiveJenisDokumen,
        limit: 100,
      },
      setSubKegiatanList,
    );
  }, [kegiatanId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (!tujuanId) {
      setIndikatorTujuanList([]);
      return;
    }

    fetchWithLog(
      "/indikator-tujuans",
      { tujuan_id: tujuanId, tahun, jenis_dokumen: effectiveJenisDokumen },
      setIndikatorTujuanList,
    );
  }, [tujuanId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (!sasaranId) {
      setIndikatorSasaranList([]);
      return;
    }

    fetchWithLog(
      "/indikator-sasaran",
      { sasaran_id: sasaranId, tahun, jenis_dokumen: effectiveJenisDokumen },
      setIndikatorSasaranList,
    );
  }, [sasaranId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (!programId) {
      setIndikatorProgramList([]);
      return;
    }

    fetchWithLog(
      "/indikator-program",
      { program_id: programId, tahun, jenis_dokumen: effectiveJenisDokumen },
      setIndikatorProgramList,
    );
  }, [programId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (!kegiatanId) {
      setIndikatorKegiatanList([]);
      return;
    }

    fetchWithLog(
      "/indikator-kegiatan",
      { kegiatan_id: kegiatanId, tahun, jenis_dokumen: effectiveJenisDokumen },
      setIndikatorKegiatanList,
    );
  }, [kegiatanId, tahun, effectiveJenisDokumen]);

  useEffect(() => {
    if (isHydratingEditRef.current) return;

    const indikatorUtama =
      indikatorKegiatanList?.[0] || indikatorProgramList?.[0] || null;
    if (!indikatorUtama) return;

    if (isEmptyValue(targetValue) && !isEmptyValue(indikatorUtama.target_kinerja)) {
      setTargetValue(String(indikatorUtama.target_kinerja));
    }
    if (isEmptyValue(satuanValue) && !isEmptyValue(indikatorUtama.satuan)) {
      setSatuanValue(String(indikatorUtama.satuan));
    }
  }, [
    indikatorKegiatanList,
    indikatorProgramList,
    targetValue,
    satuanValue,
  ]);

  useEffect(() => {
    if (isHydratingEditRef.current || !selectedSubKegiatan) return;

    const autoPagu =
      selectedSubKegiatan.pagu_anggaran ??
      selectedSubKegiatan.total_pagu_anggaran ??
      selectedSubKegiatan.anggaran;

    if (isEmptyValue(paguAnggaran) && autoPagu !== null && autoPagu !== undefined) {
      setPaguAnggaran(String(autoPagu));
    }

    const autoSumberDana = asOptionLabel(
      selectedSubKegiatan.sumber_dana,
      selectedSubKegiatan.sumberDana,
      selectedSubKegiatan.sumber_pendanaan,
      selectedSubKegiatan.sumber_pendanaan_utama,
      "",
    );

    if (isEmptyValue(sumberDana) && autoSumberDana !== "-") {
      setSumberDana(autoSumberDana);
    }
  }, [selectedSubKegiatan, paguAnggaran, sumberDana]);

  useEffect(() => {
    if (isHydratingEditRef.current) return;

    if (isEmptyValue(paguAnggaran)) {
      const fallbackPagu =
        selectedKegiatan?.pagu_anggaran ??
        selectedKegiatan?.total_pagu_anggaran ??
        selectedProgram?.pagu_anggaran ??
        selectedProgram?.total_pagu_anggaran;

      if (fallbackPagu !== null && fallbackPagu !== undefined) {
        setPaguAnggaran(String(fallbackPagu));
      }
    }

    if (isEmptyValue(sumberDana)) {
      const fallbackSumber = asOptionLabel(
        selectedKegiatan?.sumber_dana,
        selectedKegiatan?.sumberDana,
        selectedProgram?.sumber_dana,
        selectedProgram?.sumberDana,
        "",
      );

      if (fallbackSumber !== "-") {
        setSumberDana(fallbackSumber);
      }
    }
  }, [selectedKegiatan, selectedProgram, paguAnggaran, sumberDana]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!tujuanId || !sasaranId || !strategiId) {
      return alert("Mohon lengkapi hingga minimal Sasaran & Strategi.");
    }

    if (!periodeId || !opdId) {
      return alert("Periode dan OPD wajib dipilih.");
    }

    try {
      const selectedOpd = opdOptions.find(
        (item) => String(item.id) === String(opdId)
      );
      const indikatorUtama =
        indikatorKegiatanList?.[0] || indikatorProgramList?.[0] || null;

      const payload = {
        tahun: rowDetail?.tahun || tahun,
        jenis_dokumen: "rkpd",
        status: statusWorkflow,
        periode_rpjmd_id: periodeId || null,
        periode_id: periodeId,
        opd_id: opdId,
        opd_penanggung_jawab: selectedOpd?.label || null,
        prioritas_nasional_id: prioNas || null,
        prioritas_daerah_id: prioDaerah || null,
        prioritas_kepala_daerah_id: prioGub || null,
        visi_id: visiId,
        misi_id: misiId,
        tujuan_id: tujuanId,
        sasaran_id: sasaranId,
        strategi_id: strategiId,
        arah_id: arahId,
        program_id: programId,
        kegiatan_id: kegiatanId,
        sub_kegiatan_id: subKegiatanId,
        kode_program: selectedProgram?.kode_program || null,
        nama_program:
          selectedProgram?.nama_program || selectedProgram?.isi_program || null,
        kode_kegiatan: selectedKegiatan?.kode_kegiatan || null,
        nama_kegiatan:
          selectedKegiatan?.nama_kegiatan || selectedKegiatan?.isi_kegiatan || null,
        kode_sub_kegiatan:
          selectedSubKegiatan?.kode_sub_kegiatan ||
          selectedSubKegiatan?.kode_subkegiatan ||
          null,
        nama_sub_kegiatan:
          selectedSubKegiatan?.nama_sub_kegiatan ||
          selectedSubKegiatan?.nama_subkegiatan ||
          null,
        indikator: indikatorUtama?.nama_indikator || null,
        target: targetValue || indikatorUtama?.target_kinerja || null,
        satuan: satuanValue || indikatorUtama?.satuan || null,
        pagu_anggaran: paguAnggaran || null,
        sumber_dana: sumberDana || null,
      };

      const reason = window.prompt(
        isEditMode ? "Alasan perubahan RKPD (wajib untuk audit):" : "Alasan pencatatan RKPD (wajib untuk audit):",
        "",
      );
      if (!reason || !String(reason).trim()) {
        alert("Alasan wajib diisi.");
        return;
      }
      const withReason = { ...payload, change_reason_text: String(reason).trim() };

      setIsSubmitting(true);
      if (isEditMode) {
        await updateRkpd(id, withReason);
      } else {
        await createRkpd(withReason);
      }
      alert(`Data RKPD berhasil ${isEditMode ? "diperbarui" : "disimpan"}!`);
      resetFormState();
      navigate("/dashboard-rkpd");
    } catch (err) {
      console.error("Gagal menyimpan RKPD:", err);
      alert("Gagal menyimpan RKPD");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="rounded border bg-white p-4 text-sm text-gray-600">
        Memuat detail RKPD...
      </div>
    );
  }

  if (!canManageRkpd) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Anda tidak memiliki akses untuk membuat atau mengubah RKPD.
      </div>
    );
  }

  return (
    <>
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="bg-gray-100 border rounded px-3 py-2 text-sm text-gray-700">
        <span className="font-semibold">Jenis Dokumen Aktif :</span>{" "}
        {effectiveJenisDokumen.toUpperCase()}
        <span className="mx-2">|</span>
        <span className="font-semibold">Tahun Aktif :</span> {tahun || "—"}
        <span className="mx-2">|</span>
        <span className="font-semibold">Mode :</span>{" "}
        {isEditMode ? "Edit RKPD" : "Tambah RKPD"}
      </div>

      {(!tahun || String(tahun).trim() === "") && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pilih <strong>tahun</strong> di pemilih dokumen global (header). Tanpa tahun, API
          prioritas/program tidak mengembalikan data — dropdown akan kosong.
        </div>
      )}

      {!jenis_dokumen && (
        <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Jenis dokumen global kosong; form memakai konteks <strong>RKPD</strong> untuk
          mengisi dropdown.
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
        <strong>Catatan domain:</strong> tombol simpan ini memakai API{" "}
        <code>/api/rkpd</code> (data RKPD hierarki klasik). Dashboard &quot;Ringkasan
        perencanaan v2&quot; memakai <code>rkpd_dokumen</code> / <code>rkpd_item</code>{" "}
        — dua lapisan berbeda; jangan menganggap entri form otomatis menjadi dokumen v2.
      </div>

      <Dropdown
        label="Periode RPJMD"
        options={periodeList.map((item) => ({
          id: String(item.id),
          label: `${item.nama} (${item.tahun_awal} - ${item.tahun_akhir})`,
        }))}
        value={periodeId}
        onChange={setPeriodeId}
      />

      <Dropdown
        label="OPD Penanggung Jawab"
        options={opdOptions}
        value={opdId}
        onChange={setOpdId}
      />

      <Dropdown
        label="Visi"
        options={visiList.map((item) => ({
          id: String(item.id),
          label: item.isi_visi,
        }))}
        value={visiId}
        onChange={setVisiId}
      />

      <Dropdown
        label="Misi"
        options={misiOptions}
        value={misiId}
        onChange={setMisiId}
      />

      <DropdownTujuan misiId={misiId} value={tujuanId} onChange={setTujuanId} />

      <DropdownSasaran
        tujuanId={tujuanId}
        value={sasaranId}
        onChange={setSasaranId}
        onOptionsChange={setSasaranList}
      />

      {sasaranList.length === 0 && tujuanId && (
        <div className="text-sm text-red-500 mt-1">
          Tidak ada data Sasaran untuk Tujuan ini.
        </div>
      )}

      <DropdownStrategi
        sasaranId={sasaranId}
        value={strategiId}
        onChange={setStrategiId}
        onOptionsChange={setStrategiList}
      />

      <DropdownArahKebijakan
        strategiId={strategiId}
        value={arahId}
        onChange={setArahId}
        onOptionsChange={setArahList}
      />

      {arahTerpilih?.deskripsi && (
        <p className="text-sm text-gray-500 mt-1">{arahTerpilih.deskripsi}</p>
      )}

      <Dropdown
        label="Program"
        options={programList.map((item) => ({
          id: String(item.id),
          label: asOptionLabel(item.nama_program, item.isi_program, item.kode_program),
        }))}
        value={programId}
        onChange={setProgramId}
      />

      <Dropdown
        label="Kegiatan"
        options={kegiatanList.map((item) => ({
          id: String(item.id),
          label: asOptionLabel(item.nama_kegiatan, item.isi_kegiatan, item.kode_kegiatan),
        }))}
        value={kegiatanId}
        onChange={setKegiatanId}
      />

      <Dropdown
        label="Sub-Kegiatan"
        options={subKegiatanList.map((item) => ({
          id: String(item.id),
          label: asOptionLabel(
            item.nama_sub_kegiatan,
            item.nama_subkegiatan,
            item.isi_sub_kegiatan,
            item.kode_sub_kegiatan,
            item.kode_subkegiatan,
          ),
        }))}
        value={subKegiatanId}
        onChange={setSubKegiatanId}
      />

      <Dropdown
        label="Prioritas Nasional"
        options={prioritasNasionalOptions}
        value={prioNas}
        onChange={setPrioNas}
      />

      <Dropdown
        label="Prioritas Daerah"
        options={prioritasDaerahOptions}
        value={prioDaerah}
        onChange={setPrioDaerah}
      />

      <Dropdown
        label="Prioritas Gubernur"
        options={prioritasGubernurOptions}
        value={prioGub}
        onChange={setPrioGub}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block font-medium">Target</label>
          <input
            value={targetValue}
            onChange={(event) => setTargetValue(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Contoh: 90"
          />
        </div>
        <div>
          <label className="block font-medium">Satuan</label>
          <input
            value={satuanValue}
            onChange={(event) => setSatuanValue(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Contoh: % / Paket / Orang"
          />
        </div>
        <div>
          <label className="block font-medium">Pagu Anggaran</label>
          <input
            value={paguAnggaran}
            onChange={(event) => setPaguAnggaran(event.target.value)}
            className="w-full rounded border px-3 py-2"
            type="number"
            min="0"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block font-medium">Sumber Dana</label>
          <input
            value={sumberDana}
            onChange={(event) => setSumberDana(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="APBD / DAK / Lainnya"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium">Status Workflow</label>
        <select
          value={statusWorkflow}
          onChange={(event) => setStatusWorkflow(event.target.value)}
          className="w-full rounded border px-3 py-2"
        >
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
        </select>
      </div>

      {indikatorTujuanList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Tujuan</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorTujuanList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {indikatorSasaranList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Sasaran</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorSasaranList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {indikatorProgramList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Program</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorProgramList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {indikatorKegiatanList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Kegiatan</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorKegiatanList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isSubmitting
          ? "Menyimpan..."
          : isEditMode
            ? "Simpan Perubahan RKPD"
            : "Simpan RKPD"}
      </button>
    </form>
    {isEditMode && id ? (
      <div className="mt-6 space-y-4">
        <PlanningAuditSection
          documentType="rkpd"
          documentId={Number(id)}
          auditRows={auditRows}
          auditLoading={false}
          allowRestore={canRestorePlanningDocumentVersion(user?.role)}
          onVersionRestored={() => {
            setAuditRows([]);
            if (id) {
              getRkpdAudit(id).then((rows) => setAuditRows(Array.isArray(rows) ? rows : [])).catch(() => {});
            }
          }}
        />
      </div>
    ) : null}
    </>
  );
};

export default RkpdFormPage;

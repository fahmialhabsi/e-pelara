import { useState, useEffect } from "react";
import api from "@/services/api";
import initSubKegiatan from "./subhooks/useInitSubKegiatan";
import { useDokumen } from "@/hooks/useDokumen";

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

  const { dokumen, tahun } = useDokumen();

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen: dokumen },
        });
        setProgramList(res.data.data);
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

  const handleProgramChange = async (programId, prefillKegiatanId = "") => {
    try {
      const res = await api.get("/kegiatan", {
        params: {
          program_id: programId,
          tahun,
          jenis_dokumen: dokumen,
        },
      });

      setKegiatanList(res.data.data);

      const selectedProgram = programList.find((p) => p.id === +programId);

      setFormData((prev) => ({
        ...prev,
        program_id: programId,
        kegiatan_id: prefillKegiatanId || "",
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
  };
}

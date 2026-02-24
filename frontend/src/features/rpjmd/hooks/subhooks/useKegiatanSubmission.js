// src/features/rpjmd/hooks/subhooks/useKegiatanSubmission.js
import api from "@/services/api";

export default function useKegiatanSubmission(
  isEdit,
  existingData,
  kegiatanData,
  periode_id,
  setErrorMsg,
  setSuccessMsg,
  setKegiatanData,
  initialState,
  onSubmitSuccess,
  setLoading
) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (
      !periode_id ||
      !kegiatanData.program_id ||
      !kegiatanData.nama_kegiatan ||
      !kegiatanData.kode_kegiatan ||
      !kegiatanData.jenis_dokumen ||
      !kegiatanData.tahun ||
      !kegiatanData.opd_penanggung_jawab ||
      !kegiatanData.bidang_opd_penanggung_jawab
    ) {
      setErrorMsg("Semua field wajib diisi.");
      return;
    }

    const payload = { ...kegiatanData, periode_id };

    try {
      setLoading(true);
      const res = isEdit
        ? await api.put(`/kegiatan/${existingData.id}`, payload)
        : await api.post("/kegiatan", payload);

      setSuccessMsg("Berhasil menyimpan data");
      if (!isEdit) setKegiatanData(initialState);
      onSubmitSuccess?.(res.data?.data || res.data);
    } catch (err) {
      console.error("Submit gagal:", err.response?.data || err);
      setErrorMsg(
        err.response?.data?.message || "Gagal menyimpan data kegiatan."
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSubmit,
  };
}

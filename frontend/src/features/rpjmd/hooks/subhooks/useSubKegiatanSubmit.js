// subhooks/useSubKegiatanSubmit.js
import api from "@/services/api";

export default function useSubKegiatanSubmit(
  formData,
  setMessage,
  duplicateField,
  onSubmit
) {
  return async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null); // Reset pesan sebelumnya

    if (duplicateField) {
      setMessage({ type: "danger", text: "Terdapat isian yang duplikat." });
      return;
    }

    try {
      const res = formData.id
        ? await api.put(`/sub-kegiatan/${formData.id}`, formData)
        : await api.post("/sub-kegiatan", formData);

      setMessage({ type: "success", text: "Data berhasil disimpan." });

      if (onSubmit) onSubmit(res.data);
    } catch (err) {
      console.error("Submit gagal:", err);

      // Bisa tambah detail error dari server jika ada
      const errorMessage =
        err?.response?.data?.message || "Gagal menyimpan data.";

      setMessage({ type: "danger", text: errorMessage });
    }
  };
}

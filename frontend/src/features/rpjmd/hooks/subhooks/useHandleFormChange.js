// subhooks/useHandleFormChange.js
export default function useHandleFormChange(
  formData,
  setFormData,
  kegiatanList,
  checkDuplicate,
  handleProgramChange // ✅ tambahkan
) {
  return (e) => {
    const { name, value } = e.target;

    if (name === "program_id") {
      setFormData((d) => ({
        ...d,
        [name]: value,
        kegiatan_id: "", // reset kegiatan saat program berubah
        nama_bidang_opd: "",
      }));
      handleProgramChange(value); // ✅ panggil perubahan program
      return;
    }

    if (name === "kegiatan_id") {
      const selectedKegiatan = kegiatanList.find(
        (k) => String(k.id) === String(value)
      );
      setFormData((d) => ({
        ...d,
        [name]: value,
        nama_bidang_opd: selectedKegiatan?.bidang_opd_penanggung_jawab || "",
      }));
    } else {
      setFormData((d) => ({ ...d, [name]: value }));
    }

    if (["nama_sub_kegiatan", "kode_sub_kegiatan"].includes(name)) {
      checkDuplicate(name, value);
    }
  };
}

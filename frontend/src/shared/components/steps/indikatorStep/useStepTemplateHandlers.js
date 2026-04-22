import { useCallback } from "react";

/**
 * Handler perubahan hierarki & field form — tanpa fetch (FASE 3).
 */
export default function useStepTemplateHandlers(setFieldValue) {
  const handleTujuanChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        isi_tujuan = "",
        no_tujuan = "",
      } = selected || {};
      setFieldValue("no_tujuan", value);
      setFieldValue("label_tujuan", label);
      setFieldValue("tujuan_label", label);
      setFieldValue("isi_tujuan", isi_tujuan);
      setFieldValue("tujuan_id", value);
      // Simpan kode prefix tujuan (mis. "T1-01") untuk filter dropdown referensi impor
      // Nilai ini digunakan IndikatorTabContent untuk mencocokkan reference_target_code
      setFieldValue("tujuan_no_tujuan_code", no_tujuan);
    },
    [setFieldValue],
  );

  const handleSasaranChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        isi_sasaran = "",
        misi_id = "",
        tujuan_id = "",
      } = selected || {};

      setFieldValue("nomor", value);
      setFieldValue("label_sasaran", label);
      setFieldValue("isi_sasaran", isi_sasaran);
      setFieldValue("sasaran_id", value ? Number(value) : null);
      setFieldValue("misi_id", misi_id || "");
      setFieldValue("tujuan_id", tujuan_id || "");
    },
    [setFieldValue],
  );

  const handleProgramChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        nama_program = "",
        kode_program = "",
        misi_id = "",
        tujuan_id = "",
        sasaran_id = "",
      } = selected || {};

      setFieldValue("program_id", String(value));
      setFieldValue("kode_program", kode_program);
      setFieldValue("nama_program", nama_program);
      setFieldValue("label_program", label);
      setFieldValue("program_label", label);
      setFieldValue("misi_id", misi_id || "");
      setFieldValue("tujuan_id", tujuan_id || "");
      setFieldValue("sasaran_id", sasaran_id || "");
    },
    [setFieldValue],
  );

  const handleStrategiChange = useCallback(
    (selected) => {
      const { value = "", label = "" } = selected || {};
      setFieldValue(
        "strategi_id",
        value != null && value !== "" ? String(value) : "",
      );
      setFieldValue("strategi_label", label);
      setFieldValue("rpjmd_import_indikator_strategi_id", "");
    },
    [setFieldValue],
  );

  const handleArahKebijakanChange = useCallback(
    (selected) => {
      const { value = "", label = "" } = selected || {};
      setFieldValue(
        "arah_kebijakan_id",
        value != null && value !== "" ? String(value) : "",
      );
      setFieldValue("arah_kebijakan_label", label);
    },
    [setFieldValue],
  );

  const handleSubKegiatanChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        misi_id = "",
        tujuan_id = "",
        sasaran_id = "",
        program_id = "",
        kegiatan_id = "",
      } = selected || {};
      setFieldValue(
        "sub_kegiatan_id",
        value != null && value !== "" ? String(value) : "",
      );
      setFieldValue("sub_kegiatan_label", label);
      if (misi_id !== "" && misi_id != null) setFieldValue("misi_id", misi_id);
      if (tujuan_id !== "" && tujuan_id != null)
        setFieldValue("tujuan_id", tujuan_id);
      if (sasaran_id !== "" && sasaran_id != null)
        setFieldValue("sasaran_id", sasaran_id);
      if (program_id !== "" && program_id != null) {
        setFieldValue("program_id", String(program_id));
      }
      if (kegiatan_id !== "" && kegiatan_id != null) {
        setFieldValue("kegiatan_id", String(kegiatan_id));
      }
    },
    [setFieldValue],
  );

  const handleKegiatanChange = useCallback(
    (selected) => {
      const {
        value = "",
        label = "",
        nama_kegiatan = "",
        kode_kegiatan = "",
        misi_id = "",
        tujuan_id = "",
        sasaran_id = "",
      } = selected || {};

      console.log("🔁 handleKegiatanChange called:", selected);

      setFieldValue("kegiatan_id", value);
      setFieldValue("kode_kegiatan", kode_kegiatan);
      setFieldValue("nama_kegiatan", nama_kegiatan);
      setFieldValue("label_kegiatan", label);

      setFieldValue("misi_id", misi_id);
      setFieldValue("tujuan_id", tujuan_id);
      setFieldValue("sasaran_id", sasaran_id);
    },
    [setFieldValue],
  );

  const handleFieldChange = useCallback(
    (name) => (e) => {
      if (name === "baseline") return;
      setFieldValue(name, e.target.value);
    },
    [setFieldValue],
  );

  const handleFieldChangeWithUnit = useCallback(
    (name) => (e) => {
      const val = e.target.value.replace(/[^0-9.,]/g, "").trim();
      setFieldValue(name, val);
    },
    [setFieldValue],
  );

  return {
    handleTujuanChange,
    handleSasaranChange,
    handleProgramChange,
    handleKegiatanChange,
    handleStrategiChange,
    handleArahKebijakanChange,
    handleSubKegiatanChange,
    handleFieldChange,
    handleFieldChangeWithUnit,
  };
}

import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";

const DropdownKegiatan = ({ programId, value, onChange }) => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!programId || !tahun || !jenis_dokumen) {
      setOptions([]);
      onChange?.(""); // Reset jika tidak valid
      return;
    }

    api
      .get("/kegiatan", {
        params: {
          program_id: programId,
          tahun,
          jenis_dokumen,
          limit: 1000,
        },
      })
      .then((res) => {
        const data = Array.isArray(res.data.data) ? res.data.data : [];

        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item.kode_kegiatan} - ${item.nama_kegiatan}`,
        }));

        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.(""); // Reset pilihan jika tidak valid
        }
      })
      .catch((err) => {
        console.error("❌ Gagal memuat data kegiatan:", err);
        setOptions([]);
        onChange?.("");
      });
  }, [programId, tahun, jenis_dokumen]);

  return (
    <Dropdown
      label="Kegiatan"
      options={options}
      value={value}
      onChange={onChange}
      disabled={!programId}
    />
  );
};

export default DropdownKegiatan;

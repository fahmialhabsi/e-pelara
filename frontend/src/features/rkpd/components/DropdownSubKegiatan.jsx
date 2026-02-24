import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";

const DropdownSubKegiatan = ({ kegiatanId, value, onChange }) => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!kegiatanId || !tahun || !jenis_dokumen) {
      setOptions([]);
      onChange?.("");
      return;
    }

    api
      .get("/sub-kegiatan", {
        params: {
          kegiatan_id: kegiatanId,
          tahun,
          jenis_dokumen,
          limit: 1000,
        },
      })
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];

        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item.kode_sub_kegiatan} - ${item.nama_sub_kegiatan}`,
        }));

        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("❌ Gagal memuat sub-kegiatan:", err);
        setOptions([]);
        onChange?.("");
      });
  }, [kegiatanId, tahun, jenis_dokumen]);

  return (
    <Dropdown
      label="Sub‑Kegiatan"
      options={options}
      value={value}
      onChange={onChange}
      disabled={!kegiatanId}
    />
  );
};

export default DropdownSubKegiatan;

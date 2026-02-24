import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";

const DropdownPrioritasKepalaDaerah = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    api
      .get("/prioritas-gubernur", {
        params: {
          limit: 1000, // Ambil semua data untuk dropdown
        },
      })
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item.kode_priogub} - ${item.uraian_priogub}`,
        }));
        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("❌ Gagal memuat prioritas kepala daerah:", err);
        setOptions([]);
        onChange?.("");
      });
  }, []);

  return (
    <Dropdown
      label="Prioritas Kepala Daerah"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
};

export default DropdownPrioritasKepalaDaerah;

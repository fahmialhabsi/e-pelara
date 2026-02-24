import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";

const DropdownPrioritasDaerah = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    api
      .get("/prioritas-daerah", {
        params: {
          page: 1,
          limit: 1000, // ambil semua data tanpa pagination
        },
      })
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item.kode_prioda} - ${item.uraian_prioda}`,
        }));
        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("❌ Gagal memuat prioritas daerah:", err);
        setOptions([]);
        onChange?.("");
      });
  }, []);

  return (
    <Dropdown
      label="Prioritas Daerah"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
};

export default DropdownPrioritasDaerah;

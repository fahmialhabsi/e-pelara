import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";

const DropdownPrioritasNasional = ({ value, onChange }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    api
      .get("/prioritas-nasional")
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item.kode_prionas} - ${item.uraian_prionas}`,
        }));
        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("❌ Gagal memuat prioritas nasional:", err);
        setOptions([]);
        onChange?.("");
      });
  }, []);

  return (
    <Dropdown
      label="Prioritas Nasional"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
};

export default DropdownPrioritasNasional;

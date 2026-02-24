import React, { useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import fetchWithLog from "../../../utils/fetchWithLog"; // pastikan path benar

const DropdownProgram = ({ sasaranId, value, onChange }) => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!sasaranId || !tahun || !jenis_dokumen) {
      setOptions([]);
      onChange?.("");
      return;
    }

    fetchWithLog(
      "/programs",
      {
        sasaran_id: sasaranId,
        tahun,
        jenis_dokumen: jenis_dokumen,
        limit: 1000,
      },
      (data) => {
        const mapped = Array.isArray(data)
          ? data.map((item) => ({
              id: item.id,
              label: `${item.kode_program} ${item.nama_program}`,
            }))
          : [];

        setOptions(mapped);

        if (!mapped.some((opt) => opt.id === value)) {
          onChange?.("");
        }
      },
      "get programs"
    );

  }, [sasaranId, tahun, jenis_dokumen]);

  return (
    <Dropdown
      label="Program"
      options={options}
      value={value}
      onChange={onChange}
      disabled={!sasaranId}
    />
  );
};

export default DropdownProgram;

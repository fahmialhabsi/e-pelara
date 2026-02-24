import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";

const DropdownArahKebijakan = ({
  strategiId,
  value,
  onChange,
  onOptionsChange,
}) => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!strategiId || !tahun || !jenis_dokumen) {
      setOptions([]);
      onOptionsChange?.([]);
      return;
    }

    setIsLoading(true);
    api
      .get("/arah-kebijakan", {
        params: {
          strategi_id: strategiId,
          tahun,
          jenis_dokumen,
        },
      })
      .then((res) => {
        const mapped = Array.isArray(res.data)
          ? res.data.map((item) => ({
              id: item.id,
              label: item.kode_arah,
              deskripsi: item.deskripsi || "",
            }))
          : [];

        setOptions(mapped);
        onOptionsChange?.(mapped);

        // ✅ Jangan reset value kalau options kosong
        if (
          mapped.length > 0 &&
          value &&
          !mapped.find((item) => item.id === value)
        ) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("❌ Gagal fetch arah kebijakan:", err);
        // ❗ Jangan reset value saat error
        setOptions([]);
        onOptionsChange?.([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [strategiId, tahun, jenis_dokumen]);

  // 🔹 Buat entry sementara kalau value lama tidak ada di options
  const displayOptions =
    value && !options.find((o) => o.id === value)
      ? [
          ...options,
          {
            id: value,
            label: `(Data belum tersedia - ID: ${value})`,
            deskripsi: "",
          },
        ]
      : options;

  const selected = displayOptions.find((o) => o.id === value);

  return (
    <>
      <Dropdown
        label="Arah Kebijakan"
        options={displayOptions}
        value={value}
        onChange={onChange}
        disabled={!strategiId || isLoading}
      />
      {selected?.deskripsi && (
        <p className="text-sm text-gray-500 mt-1">{selected.deskripsi}</p>
      )}
    </>
  );
};

export default DropdownArahKebijakan;

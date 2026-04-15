import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import { normalizeListItems } from "../../../utils/apiResponse";

const DropdownArahKebijakan = ({
  strategiId,
  value,
  onChange,
  onOptionsChange,
}) => {
  const { tahun, dokumen } = useDokumen();
  const jenis_dokumen = String(dokumen || "rkpd").toLowerCase();
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!strategiId || !tahun) {
      setOptions([]);
      onOptionsChange?.([]);
      if (value) onChange?.("");
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
        const items = normalizeListItems(res.data);
        const mapped = items.map((item) => ({
          id: String(item.id),
          label: item.kode_arah,
          deskripsi: item.deskripsi || "",
        }));

        setOptions(mapped);
        onOptionsChange?.(mapped);

        if (
          value &&
          !mapped.find((item) => String(item.id) === String(value))
        ) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("Gagal fetch arah kebijakan:", err);
        setOptions([]);
        onOptionsChange?.([]);
        if (value) onChange?.("");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [strategiId, tahun, jenis_dokumen, value, onChange, onOptionsChange]);

  const displayOptions =
    value && !options.find((o) => String(o.id) === String(value))
      ? [
          ...options,
          {
            id: String(value),
            label: `(Data belum tersedia - ID: ${value})`,
            deskripsi: "",
          },
        ]
      : options;

  const selected = displayOptions.find(
    (o) => String(o.id) === String(value)
  );

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

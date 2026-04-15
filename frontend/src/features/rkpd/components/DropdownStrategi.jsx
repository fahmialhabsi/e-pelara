import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import { normalizeListItems } from "../../../utils/apiResponse";

const DropdownStrategi = ({ sasaranId, value, onChange, onOptionsChange }) => {
  const { tahun, dokumen } = useDokumen();
  const jenis_dokumen = String(dokumen || "rkpd").toLowerCase();
  const [strategiList, setStrategiList] = useState([]);

  useEffect(() => {
    if (!sasaranId || !tahun) {
      setStrategiList([]);
      onOptionsChange?.([]);
      if (value) onChange?.("");
      return;
    }

    api
      .get("/strategi", {
        params: {
          sasaran_id: sasaranId,
          tahun: String(tahun),
          jenis_dokumen,
        },
      })
      .then((res) => {
        const items = normalizeListItems(res.data);
        const mapped = items.map((item) => ({
          id: String(item.id),
          label: `${item?.kode_strategi || "-"} - ${
            item?.deskripsi || "Tanpa deskripsi"
          }`,
        }));

        setStrategiList(mapped);
        onOptionsChange?.(mapped);

        if (
          value &&
          !mapped.some((item) => String(item.id) === String(value))
        ) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil data strategi:", err);
        setStrategiList([]);
        onOptionsChange?.([]);
        if (value) onChange?.("");
      });
  }, [sasaranId, tahun, jenis_dokumen, value, onChange, onOptionsChange]);

  return (
    <Dropdown
      label="Strategi"
      options={strategiList}
      value={value}
      onChange={onChange}
      disabled={!sasaranId}
    />
  );
};

export default DropdownStrategi;

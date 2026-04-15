import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "./Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import { normalizeListItems } from "../../../utils/apiResponse";

const DropdownSasaran = ({ tujuanId, value, onChange, onOptionsChange }) => {
  const { tahun, dokumen } = useDokumen();
  const jenis_dokumen = String(dokumen || "rkpd").toLowerCase();
  const [sasaranList, setSasaranList] = useState([]);

  useEffect(() => {
    if (!tujuanId) {
      setSasaranList([]);
      onOptionsChange?.([]);
      if (value) onChange?.("");
      return;
    }

    api
      .get("/sasaran", {
        params: { tujuan_id: tujuanId, tahun, jenis_dokumen },
      })
      .then((res) => {
        const items = normalizeListItems(res.data);
        const mapped = items.map((item) => ({
          id: String(item.id),
          label: `${item.nomor} - ${item.isi_sasaran}`,
        }));

        setSasaranList(mapped);
        onOptionsChange?.(mapped);

        if (
          value &&
          !mapped.find((item) => String(item.id) === String(value))
        ) {
          onChange?.("");
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil data sasaran:", err);
        setSasaranList([]);
        onOptionsChange?.([]);
        if (value) onChange?.("");
      });
  }, [tujuanId, tahun, jenis_dokumen, value, onChange, onOptionsChange]);

  return (
    <Dropdown
      label="Sasaran"
      options={sasaranList}
      value={value}
      onChange={onChange}
      disabled={!tujuanId}
    />
  );
};

export default DropdownSasaran;

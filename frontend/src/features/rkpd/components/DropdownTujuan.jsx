import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";

const DropdownTujuan = ({ misiId, value, onChange, sourceDokumen = null }) => {
  const { tahun, dokumen } = useDokumen();
  const jenis_dokumen = sourceDokumen || dokumen; // fallback ke dokumen aktif

  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!misiId) {
      setOptions([]);
      onChange("");
      return;
    }
    if (!misiId || isNaN(Number(misiId))) {
      setOptions([]);
      onChange("");
      return;
    }
    api
      .get("/tujuan", {
        params: { misi_id: misiId, tahun, jenis_dokumen },
      })
      .then((res) => {
        const mapped = res.data.map((item) => ({
          id: item.id,
          label: `${item.no_tujuan} - ${item.isi_tujuan}`,
        }));
        setOptions(mapped);

        if (!mapped.find((opt) => opt.id === value)) {
          onChange("");
        }
      })
      .catch((err) => {
        console.error("Gagal ambil data Tujuan:", err);
        setOptions([]);
        onChange("");
      });
  }, [misiId, tahun, jenis_dokumen]);

  return (
    <Dropdown
      label={`Tujuan (${jenis_dokumen?.toUpperCase()})`}
      options={options}
      value={value}
      onChange={onChange}
      disabled={!misiId}
    />
  );
};

export default DropdownTujuan;

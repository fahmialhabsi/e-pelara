import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "./Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";

const DropdownSasaran = ({ tujuanId, value, onChange, onOptionsChange }) => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [sasaranList, setSasaranList] = useState([]);

  useEffect(() => {
    if (!tujuanId) {
      setSasaranList([]);
      onOptionsChange?.([]);
      return;
    }

    console.log("Fetching sasaran dengan params:", {
      tujuanId,
      tahun,
      jenis_dokumen,
    });

    api
      .get("/sasaran", {
        params: { tujuan_id: tujuanId, tahun, jenis_dokumen },
      })
      .then((res) => {
        const items = res.data?.data || [];
        const mapped = items.map((item) => ({
          id: item.id,
          label: `${item.nomor} – ${item.isi_sasaran}`,
        }));
        setSasaranList(mapped);
        onOptionsChange?.(mapped);
      })
      .catch((err) => {
        console.error("Gagal mengambil data sasaran:", err);
        setSasaranList([]);
        onOptionsChange?.([]);
      });
  }, [tujuanId, tahun, jenis_dokumen]);

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

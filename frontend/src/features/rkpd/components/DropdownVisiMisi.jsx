import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";

const DropdownTujuan = ({ misiId, tahun, jenis_dokumen, value, onChange }) => {
  const [tujuanList, setTujuanList] = useState([]);

  useEffect(() => {
    setTujuanList([]);
    if (!misiId) return;

    api
      .get("/tujuan", {
        params: { misi_id: misiId, tahun, jenis_dokumen },
      })
      .then((res) =>
        setTujuanList(
          res.data.map((item) => ({
            id: item.id,
            label: `${item.no_tujuan} - ${item.isi_tujuan}`,
          }))
        )
      )
      .catch((err) => {
        console.error("Gagal mengambil data tujuan:", err);
        setTujuanList([]);
      });
  }, [misiId, tahun, jenis_dokumen]);

  return (
    <Dropdown
      label="Tujuan"
      options={tujuanList}
      value={value}
      onChange={onChange}
      disabled={!misiId}
    />
  );
};

export default DropdownTujuan;

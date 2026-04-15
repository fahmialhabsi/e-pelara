import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import { normalizeListItems } from "../../../utils/apiResponse";

const DropdownTujuan = ({ misiId, value, onChange, sourceDokumen = null }) => {
  const { tahun, dokumen } = useDokumen();
  const jenis_dokumen = String(
    sourceDokumen || dokumen || "rkpd",
  ).toLowerCase();

  const [options, setOptions] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    if (!misiId) {
      setOptions([]);
      if (value) onChange("");
      return;
    }
    if (!misiId || isNaN(Number(misiId))) {
      setOptions([]);
      if (value) onChange("");
      return;
    }
    const fetchTujuan = async (dokumen) => {
      const res = await api.get("/tujuan", {
        params: { misi_id: misiId, tahun, jenis_dokumen: dokumen },
      });
      const items = normalizeListItems(res.data);
      return items.map((item) => ({
        id: String(item.id),
        label: `${item.no_tujuan} - ${item.isi_tujuan}`,
      }));
    };

    (async () => {
      try {
        let mapped = await fetchTujuan(jenis_dokumen);

        // Fallback kompatibilitas: di sebagian data lama Tujuan tersimpan sebagai RPJMD.
        if (!mapped.length && String(jenis_dokumen).toLowerCase() !== "rpjmd") {
          mapped = await fetchTujuan("rpjmd");
        }

        if (isCancelled) return;
        setOptions(mapped);

        if (
          value &&
          !mapped.find((opt) => String(opt.id) === String(value))
        ) {
          onChange("");
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Gagal ambil data Tujuan:", err);
        setOptions([]);
        if (value) onChange("");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [misiId, tahun, jenis_dokumen, value, onChange]);

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

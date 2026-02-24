import React, { useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import { useDokumen } from "../../../hooks/useDokumen";
import fetchWithLog from "../../../utils/fetchWithLog"; // ⬅️ sesuaikan path-nya

const DropdownStrategi = ({ sasaranId, value, onChange, onOptionsChange }) => {
  console.log("📢 Komponen DropdownStrategi dimount");

  const { tahun, dokumen: jenis_dokumen } = useDokumen();
  const [strategiList, setStrategiList] = useState([]);

  useEffect(() => {
    console.log("🔍 [useEffect] sasaranId:", sasaranId);
    console.log("🔍 [useEffect] tahun:", tahun);
    console.log("🔍 [useEffect] jenis_dokumen:", jenis_dokumen);

    // validasi awal
    if (!sasaranId || !tahun || !jenis_dokumen) {
      console.warn("⚠️ Parameter tidak lengkap, strategi dikosongkan.");
      setStrategiList([]);
      onOptionsChange?.([]);
      return;
    }

    console.log("📤 Params dikirim:", { sasaranId, tahun, jenis_dokumen });

    fetchWithLog(
      "/strategi",
      { sasaran_id: sasaranId, tahun: String(tahun), jenis_dokumen },
      (data) => {
        console.log("📦 Data strategi mentah dari fetchWithLog:", data);

        const mapped = data.map((item) => ({
          id: item.id,
          label: `${item?.kode_strategi || "–"} – ${
            item?.deskripsi || "Tanpa deskripsi"
          }`,
        }));

        console.log("🧾 [Mapping Result] mapped:", mapped);
        console.log(
          "🧮 Jumlah ID unik:",
          new Set(mapped.map((m) => m.id)).size
        );

        setStrategiList(mapped);
        onOptionsChange?.(mapped);

        // reset value jika tidak valid
        const isValid = mapped.some((item) => item.id === value);
        console.log("✅ Value valid:", isValid, "| value:", value);
        if (!isValid) onChange?.("");
      },
      "Strategi"
    );
  }, [sasaranId, tahun, jenis_dokumen]);

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

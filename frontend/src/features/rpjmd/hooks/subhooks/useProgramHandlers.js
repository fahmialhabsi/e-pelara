import { useCallback } from "react";

export default function useProgramHandlers(
  setProgramData,
  setErrorMsg,
  allArahKebijakan
) {
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      console.log("📩 update field:", name, "=>", value); // ✅ Penempatan tepat

      setProgramData((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "opd_penanggung_jawab" ? { bidang_opd: [] } : {}),
        ...(name === "misi_id"
          ? {
              tujuan_id: "",
              sasaran_id: "",
              strategi_ids: [],
              arah_ids: [],
            }
          : {}),
        ...(name === "tujuan_id"
          ? {
              sasaran_id: "",
              strategi_ids: [],
              arah_ids: [],
            }
          : {}),
        ...(name === "sasaran_id"
          ? {
              strategi_ids: [],
              arah_ids: [],
            }
          : {}),
      }));

      setErrorMsg("");
    },
    [setProgramData, setErrorMsg]
  );

  const handleMultiChange = useCallback(
    (field, selectedValues) => {
      setProgramData((prev) => {
        if (field === "strategi_ids") {
          const selectedStrategiIds = (selectedValues || [])
            .map((v) => (typeof v === "object" ? v.value : v))
            .filter(Boolean);

          const allowedArah = allArahKebijakan.filter((arah) =>
            selectedStrategiIds.includes(
              arah?.ProgramArahKebijakan?.strategi_id ?? arah?.strategi_id
            )
          );

          const filteredArahObjs = (prev.arah_ids || [])
            .filter((arah) => {
              const id = typeof arah === "object" ? arah.value : arah;
              return allowedArah.some((a) => a.id === id);
            })
            .map((idOrObj) => {
              const id = typeof idOrObj === "object" ? idOrObj.value : idOrObj;
              const arah = allowedArah.find((a) => a.id === id);
              return arah
                ? {
                    value: arah.id,
                    label: `${arah.kode_arah || "-"} – ${
                      arah.deskripsi || "-"
                    }`,
                    strategi_id:
                      arah?.ProgramArahKebijakan?.strategi_id ??
                      arah?.strategi_id ??
                      null,
                  }
                : null;
            })
            .filter(Boolean);

          return {
            ...prev,
            strategi_ids: selectedValues || [],
            arah_ids: filteredArahObjs,
          };
        }

        return {
          ...prev,
          [field]: selectedValues || [],
        };
      });

      setErrorMsg("");
    },
    [setProgramData, setErrorMsg, allArahKebijakan]
  );

  const handleBidangChange = useCallback(
    (selected) => {
      setProgramData((p) => ({
        ...p,
        bidang_opd: selected || [],
      }));
      setErrorMsg("");
    },
    [setProgramData, setErrorMsg]
  );

  return {
    handleChange,
    handleMultiChange,
    handleBidangChange,
  };
}

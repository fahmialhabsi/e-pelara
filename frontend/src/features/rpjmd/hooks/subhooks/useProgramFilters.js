import { useMemo } from "react";

export default function useProgramFilters(
  programData,
  sasarans = [],
  tujuans = [],
  strategis = [],
  aras = [],
  dokumen = null,
  tahun = null
) {
  const filteredSasarans = useMemo(() => {
    if (!programData.tujuan_id || !Array.isArray(sasarans)) return [];
    return sasarans.filter(
      (s) =>
        String(s.tujuan_id) === String(programData.tujuan_id) &&
        (!dokumen || s.jenis_dokumen === dokumen) &&
        (!tahun || String(s.tahun) === String(tahun))
    );
  }, [programData.tujuan_id, sasarans, dokumen, tahun]);

  // 🎯 Filter strategi berdasarkan sasaran_id
  const filteredStrategis = useMemo(() => strategis, [strategis]);

  const strategiIdList = useMemo(() => {
    return (programData.strategi_ids || []).map((s) =>
      typeof s === "object" ? Number(s.value ?? s.id ?? s) : Number(s)
    );
  }, [programData.strategi_ids]);

  const filteredAras = useMemo(() => {
    if (!Array.isArray(aras) || strategiIdList.length === 0) return [];
    return aras.filter((a) =>
      strategiIdList.includes(
        Number(a?.strategi_id ?? a?.ProgramArahKebijakan?.strategi_id)
      )
    );
  }, [aras, strategiIdList]);

  const hierarkiStrategiIds = useMemo(() => {
    return filteredStrategis.map((s) => s.id);
  }, [filteredStrategis]);

  const hierarkiAras = useMemo(() => {
    if (!Array.isArray(aras) || hierarkiStrategiIds.length === 0) return [];
    return aras.filter((a) =>
      hierarkiStrategiIds.includes(Number(a?.strategi_id))
    );
  }, [aras, hierarkiStrategiIds]);

  return {
    filteredSasarans,
    filteredStrategis,
    filteredAras,
    hierarkiAras,
  };
}

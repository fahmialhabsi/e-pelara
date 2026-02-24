// subhooks/useFetchPrograms.js
import { useEffect, useState } from "react";
import api from "@/services/api";

export default function useFetchPrograms(tahun, jenis_dokumen = "rpjmd") {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPrograms = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen, limit: 1000 },
        });

        let data = res.data;
        if (Array.isArray(data)) {
          // langsung array
        } else if (data && Array.isArray(data.data)) {
          data = data.data;
        } else {
          throw new Error("Format data tidak sesuai");
        }

        data.sort((a, b) => a.kode_program.localeCompare(b.kode_program));
        setPrograms(data);
      } catch (err) {
        console.error("❌ Gagal memuat data program:", err);
        setError("Gagal memuat data program.");
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [tahun, jenis_dokumen]);

  // GUNAKAN INI (perubahan return):
  return { programs, loading, error };
}

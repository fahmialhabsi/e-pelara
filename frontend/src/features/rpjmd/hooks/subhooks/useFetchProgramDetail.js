import { useEffect, useState } from "react";
import api from "@/services/api";

export default function useFetchProgramDetail(programId) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!programId) {
      setLoading(false);
      setDetail(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("⏳ Memuat detail program untuk ID:", programId);
        const res = await api.get(`/programs/${programId}`, { signal });

        // ✅ Log yang benar
        console.log("📦 [DETAIL FETCHED] Program:", res.data);

        const data = res?.data?.data;

        if (!data) {
          console.warn("⚠️ Data kosong");
          setDetail(null);
          setError("Data program tidak ditemukan.");
          return;
        }

        // ✅ Normalisasi alias field OPD
        if (data.opd && !data.penanggungJawabOpd) {
          data.penanggungJawabOpd = data.opd;
        }

        console.log("🧾 Cek penanggungJawabOpd:", data.penanggungJawabOpd);
        if (!data.penanggungJawabOpd) {
          console.warn("⚠️ penanggungJawabOpd tidak tersedia atau null.");
        } else {
          console.log(
            "✅ penanggungJawabOpd tersedia:",
            data.penanggungJawabOpd
          );
        }
        console.log("✅ Detail program ditemukan:", data);
        setDetail({
          ...data,
          isReady:
            !!data &&
            Array.isArray(data.Strategi) &&
            Array.isArray(data.ArahKebijakan) &&
            !!data.penanggungJawabOpd &&
            !!data.sasaran,
        });
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          console.warn("⚠️ Permintaan dibatalkan.");
        } else {
          console.error("❌ Gagal memuat detail program:", err);
          setError(err.response?.data?.message || err.message);
          setDetail(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      console.log("🛑 Abort: useFetchProgramDetail cleanup");
      controller.abort();
    };
  }, [programId]);

  useEffect(() => {
    console.log("📌 useFetchProgramDetail loading:", loading);
  }, [loading]);

  return { detail, loading, error };
}

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
} from "react";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { toast } from "react-toastify"; // ✅ Pastikan ini diimpor

const PeriodeAktifContext = createContext();

export const PeriodeAktifProvider = ({ children }) => {
  const { dokumen, tahun, loading: docLoading } = useDokumen();
  const { user, loading: authLoading } = useAuth();

  const [periodeId, setPeriodeId] = useState(null);
  const [periodeList, setPeriodeList] = useState([]);
  const [loadingPeriode, setLoadingPeriode] = useState(true);

  // Ambil data periode dari API
  useEffect(() => {
    const fetchPeriode = async () => {
      if (!dokumen || !tahun) {
        // Jangan blokir loading — biarkan DokumenTahunGuard yang handle
        setLoadingPeriode(false);
        return;
      }

      try {
        setLoadingPeriode(true);
        const res = await api.get("/periode-rpjmd");
        setPeriodeList(res.data);
      } catch (error) {
        console.error("Gagal memuat daftar periode:", error);
        toast.error("Gagal memuat daftar periode.");
      } finally {
        setLoadingPeriode(false);
      }
    };

    fetchPeriode();
  }, [dokumen, tahun]);

  // Cari periode aktif berdasarkan tahun
  useEffect(() => {
    if (
      loadingPeriode ||
      !dokumen ||
      !tahun ||
      periodeList.length === 0 ||
      !user
    ) {
      setPeriodeId(null);
      return;
    }

    const currentYear = parseInt(tahun, 10);

    // ✅ LOGIKA BENAR: cari dalam rentang tahun_awal <= currentYear <= tahun_akhir
    const foundPeriode = periodeList.find((p) => {
      const tahunAwal = parseInt(p.tahun_awal, 10);
      const tahunAkhir = parseInt(p.tahun_akhir, 10);
      return currentYear >= tahunAwal && currentYear <= tahunAkhir;
    });

    if (foundPeriode) {
      setPeriodeId(foundPeriode.id);
    } else {
      const fallbackId = user?.periode_id || null;
      setPeriodeId(fallbackId);

      if (!fallbackId) {
        console.warn(
          `Tidak ada periode cocok untuk tahun ${tahun}, dan periode_id user juga tidak tersedia.`,
        );
        toast.warn(`Tidak dapat menemukan periode aktif untuk tahun ${tahun}.`);
      }
    }
  }, [dokumen, tahun, periodeList, loadingPeriode, user?.periode_id]);

  const value = {
    dokumen,
    tahun,
    periode_id: periodeId,
    loading: docLoading || loadingPeriode,
    setPeriodeId,
    periodeList,
  };

  return (
    <PeriodeAktifContext.Provider value={value}>
      {children}
    </PeriodeAktifContext.Provider>
  );
};

export const usePeriodeAktif = () => {
  const context = useContext(PeriodeAktifContext);
  if (!context) {
    throw new Error(
      "usePeriodeAktif must be used within a PeriodeAktifProvider",
    );
  }
  return context;
};

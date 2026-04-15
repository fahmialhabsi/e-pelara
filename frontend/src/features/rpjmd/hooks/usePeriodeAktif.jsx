import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { toast } from "react-toastify";
import { extractListData } from "../../../utils/apiResponse";

const PeriodeAktifContext = createContext();

export const PeriodeAktifProvider = ({ children }) => {
  const { dokumen, tahun, loading: docLoading } = useDokumen();
  const { user } = useAuth();

  const [periodeId, setPeriodeId] = useState(null);
  const [periodeList, setPeriodeList] = useState([]);
  const [loadingPeriode, setLoadingPeriode] = useState(true);

  useEffect(() => {
    const fetchPeriode = async () => {
      if (!dokumen || !tahun) {
        setLoadingPeriode(false);
        return;
      }

      try {
        setLoadingPeriode(true);
        const res = await api.get("/periode-rpjmd");
        setPeriodeList(extractListData(res.data));
      } catch (error) {
        console.error("Gagal memuat daftar periode:", error);
        toast.error("Gagal memuat daftar periode.");
      } finally {
        setLoadingPeriode(false);
      }
    };

    fetchPeriode();
  }, [dokumen, tahun]);

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
    const foundPeriode = periodeList.find((periode) => {
      const tahunAwal = parseInt(periode.tahun_awal, 10);
      const tahunAkhir = parseInt(periode.tahun_akhir, 10);
      return currentYear >= tahunAwal && currentYear <= tahunAkhir;
    });

    if (foundPeriode) {
      setPeriodeId(foundPeriode.id);
      return;
    }

    const fallbackId = user?.periode_id || null;
    setPeriodeId(fallbackId);

    if (!fallbackId) {
      toast.warn(`Tidak dapat menemukan periode aktif untuk tahun ${tahun}.`);
    }
  }, [dokumen, tahun, periodeList, loadingPeriode, user]);

  return (
    <PeriodeAktifContext.Provider
      value={{
        dokumen,
        tahun,
        periode_id: periodeId,
        loading: docLoading || loadingPeriode,
        setPeriodeId,
        periodeList,
      }}
    >
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

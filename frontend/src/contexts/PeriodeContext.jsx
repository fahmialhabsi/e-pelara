import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

const PeriodeContext = createContext();
export const usePeriode = () => useContext(PeriodeContext);

export const PeriodeProvider = ({ children }) => {
  const [periode, setPeriode] = useState({
    id: null,
    tahun_awal: null,
    tahun_akhir: null,
    loading: true,
  });

  const { user, loading: authLoading } = useAuth();
  const didFetchRef = useRef(false); // 👈 flag untuk memastikan fetch hanya sekali

  useEffect(() => {
    if (authLoading || !user || didFetchRef.current) return;

    didFetchRef.current = true; // 👈 tandai sudah fetch
    const fetchPeriode = async () => {
      try {
        const res = await api.get("/periode-rpjmd/active");
        const { id, tahun_awal, tahun_akhir } = res.data || {};
        setPeriode({ id, tahun_awal, tahun_akhir, loading: false });
      } catch (err) {
        console.error("Gagal memuat periode aktif RPJMD:", err);
        setPeriode({
          id: null,
          tahun_awal: null,
          tahun_akhir: null,
          loading: false,
        });
      }
    };

    fetchPeriode();
  }, [authLoading, user]);

  return (
    <PeriodeContext.Provider value={periode}>
      {children}
    </PeriodeContext.Provider>
  );
};

// src/shared/hooks/useAutoIsiTahunDanTarget.js
import { useEffect } from "react";
import { usePeriode } from "@/contexts/PeriodeContext";

export default function useAutoIsiTahunDanTarget(values, setFieldValue) {
  const { tahun_awal, tahun_akhir } = usePeriode();

  useEffect(() => {
    if (tahun_awal && !values.tahun_awal) {
      setFieldValue("tahun_awal", tahun_awal);
    }
    if (tahun_akhir && !values.tahun_akhir) {
      setFieldValue("tahun_akhir", tahun_akhir);
    }
  }, [tahun_awal, tahun_akhir, values.tahun_awal, values.tahun_akhir]);

  useEffect(() => {
    if (values.target_tahun_1 && !values.target_awal) {
      setFieldValue("target_awal", values.target_tahun_1);
    }
    if (values.target_tahun_5 && !values.target_akhir) {
      setFieldValue("target_akhir", values.target_tahun_5);
    }
  }, [
    values.target_tahun_1,
    values.target_tahun_5,
    values.target_awal,
    values.target_akhir,
  ]);
}

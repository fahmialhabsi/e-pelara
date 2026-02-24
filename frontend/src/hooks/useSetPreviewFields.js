// src/hooks/useSetPreviewFields.js
import { useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function useSetPreviewFields(values, setFieldValue) {
  useEffect(() => {
    // Fetch tahun_awal dan tahun_akhir dari API Periode RPJMD
    const fetchPeriode = async () => {
      try {
        const response = await axios.get("/periode-rpjmds/active");
        const { tahun_awal, tahun_akhir } = response.data || {};
        if (tahun_awal && tahun_akhir) {
          setFieldValue("tahun_awal", tahun_awal);
          setFieldValue("tahun_akhir", tahun_akhir);
        }
      } catch (error) {
        toast.error("Gagal memuat data Periode RPJMD");
      }
    };

    fetchPeriode();

    // Set target_awal dan target_akhir dari target_tahun_1 & target_tahun_5
    if (values?.target_tahun_1) {
      setFieldValue("target_awal", values.target_tahun_1);
    }
    if (values?.target_tahun_5) {
      setFieldValue("target_akhir", values.target_tahun_5);
    }
  }, [values.target_tahun_1, values.target_tahun_5]);
}

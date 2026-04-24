// src/hooks/useSetPreviewFields.js
import { useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function useSetPreviewFields(values, setFieldValue, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, setFieldValue]);

  useEffect(() => {
    if (!enabled) return;
    const t1 = values?.target_tahun_1;
    const t5 = values?.target_tahun_5;
    if (t1 !== undefined && t1 !== null && t1 !== "") {
      setFieldValue("target_awal", t1);
    }
    if (t5 !== undefined && t5 !== null && t5 !== "") {
      setFieldValue("target_akhir", t5);
    }
  }, [enabled, values?.target_tahun_1, values?.target_tahun_5, setFieldValue]);
}

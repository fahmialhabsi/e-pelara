import React, { useEffect, useState } from "react";
import api from "@/services/api";
import IndikatorUmumRenstraForm from "../components/IndikatorUmumRenstraForm";
import GlobalDokumenTahunPicker from "@/shared/components/GlobalDokumenTahunPicker";
import { useDokumen } from "@/hooks/useDokumen";

const IndikatorUmumRenstraAddPage = () => {
  const { tahun } = useDokumen();
  const [renstraAktif, setRenstraAktif] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRenstraAktif = async () => {
      if (!tahun) return;

      setLoading(true);
      try {
        const res = await api.get(`/indikator-renstra/aktif?tahun=${tahun}`);
        setRenstraAktif(res.data);
      } catch (err) {
        console.error("Gagal mendapatkan renstra aktif", err);
        setRenstraAktif(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRenstraAktif();
  }, [tahun]);

  if (loading) return <div>Loading...</div>;
  if (!renstraAktif)
    return <div>Renstra aktif tidak ditemukan untuk tahun {tahun}</div>;

  return (
    <div style={{ padding: 16 }}>
      <GlobalDokumenTahunPicker />
      <IndikatorUmumRenstraForm renstraAktif={renstraAktif} />
    </div>
  );
};

export default IndikatorUmumRenstraAddPage;

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchKegiatanRenstraById } from "../api/kegiatanRenstraApi";
import KegiatanRenstraForm from "../components/KegiatanRenstraForm";

const KegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["kegiatan-renstra", id],
    queryFn: async () => {
      const res = await fetchKegiatanRenstraById(id);
      return res.data;
    },
    enabled: !!id, // optional safety check
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <KegiatanRenstraForm
      initialData={data}
      onSuccess={() => navigate("/kegiatan")}
    />
  );
};

export default KegiatanRenstraEditPage;

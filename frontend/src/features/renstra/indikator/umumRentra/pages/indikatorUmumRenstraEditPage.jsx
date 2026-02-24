import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIndikatorRenstra } from "../../api/indikatorUmumRenstraApi";
import IndikatorUmumRenstraForm from "../components/IndikatorUmumRenstraForm";

const IndikatorUmumRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-renstra", id],
    queryFn: () => getIndikatorRenstra(id),
    enabled: !!id, // ✅ biar tidak fetch kalau id belum ada
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>❌ Error: {error.message}</div>;

  return (
    <IndikatorUmumRenstraForm
      initialData={data}
      onSuccess={() => navigate("/indikator")}
    />
  );
};

export default IndikatorUmumRenstraEditPage;

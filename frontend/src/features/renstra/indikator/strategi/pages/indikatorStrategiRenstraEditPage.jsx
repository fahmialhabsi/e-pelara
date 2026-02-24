import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIndikatorRenstra } from "../../api/indikatorUmumRenstraApi";
import IndikatorStrategiRenstraForm from "../components/IndikatorStrategiRenstraForm";

const IndikatorStrategiRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(["indikator-renstra", id], () =>
    getIndikatorRenstra(id)
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <IndikatorStrategiRenstraForm
      initialData={data}
      onSuccess={() => navigate("/indikator")}
    />
  );
};

export default IndikatorStrategiRenstraEditPage;

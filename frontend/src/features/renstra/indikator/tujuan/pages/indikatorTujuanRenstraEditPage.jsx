import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIndikatorRenstra } from "../../api/indikatorUmumRenstraApi";
import IndikatorTujuanRenstraForm from "../components/IndikatorTujuanRenstraForm";

const IndikatorTujuanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(["indikator-renstra", id], () => getIndikatorRenstra(id));

  if (isLoading) return <div>Loading...</div>;

  return (
    <IndikatorTujuanRenstraForm
      initialData={data}
      onSuccess={() => navigate("/indikator")}
    />
  );
};

export default IndikatorTujuanRenstraEditPage;

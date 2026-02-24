import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIndikatorRenstra } from "../../api/indikatorUmumRenstraApi";
import IndikatorKegiatanRenstraForm from "../components/IndikatorKegiatanRenstraForm";

const IndikatorKegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(["indikator-renstra", id], () => getIndikatorRenstra(id));

  if (isLoading) return <div>Loading...</div>;

  return (
    <IndikatorKegiatanRenstraForm
      initialData={data}
      onSuccess={() => navigate("/indikator")}
    />
  );
};

export default IndikatorKegiatanRenstraEditPage;

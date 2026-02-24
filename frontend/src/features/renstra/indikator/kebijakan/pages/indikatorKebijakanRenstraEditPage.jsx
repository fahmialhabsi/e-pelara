import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getIndikatorRenstra } from "../../api/indikatorUmumRenstraApi";
import IndikatorKebijakanRenstraForm from "../components/IndikatorKebijakanRenstraForm";

const IndikatorKebijakanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(["indikator-renstra", id], () => getIndikatorRenstra(id));

  if (isLoading) return <div>Loading...</div>;

  return (
    <IndikatorKebijakanRenstraForm
      initialData={data}
      onSuccess={() => navigate("/indikator")}
    />
  );
};

export default IndikatorKebijakanRenstraEditPage;

// src/features/renstra/program/components/RenstraTabelProgramFormWrapper.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import RenstraTabelProgramForm from "./RenstraTabelProgramForm";

const RenstraTabelProgramFormWrapper = ({ renstraAktif }) => {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["renstra-tabel-program", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-program/${id}`);
      console.log("📦 Detail Tabel Program:", res.data);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <RenstraTabelProgramForm initialData={data} renstraAktif={renstraAktif} />
  );
};

export default RenstraTabelProgramFormWrapper;

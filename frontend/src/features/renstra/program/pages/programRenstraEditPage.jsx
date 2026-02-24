import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProgramRenstraById } from "../api/programRenstraApi";
import ProgramRenstraForm from "../components/ProgramRenstraForm";

const ProgramRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["program-renstra", id],
    queryFn: async () => {
      const res = await fetchProgramRenstraById(id);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div>⏳ Memuat data...</div>;
  if (isError) return <div>❌ Gagal memuat data: {error.message}</div>;

  return (
    <ProgramRenstraForm
      initialData={data}
      renstraAktif={data.renstra}
      onSuccess={() => navigate("/renstra/program")}
    />
  );
};

export default ProgramRenstraEditPage;

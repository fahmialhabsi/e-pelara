import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSubkegiatanRenstraById } from "../api/subkegiatanRenstraApi";
import SubkegiatanRenstraForm from "../components/SubkegiatanRenstraForm";

const SubkegiatanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    ["subkegiatan-renstra", id],
    async () => {
      const res = await fetchSubkegiatanRenstraById(id);
      return res.data;
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <SubkegiatanRenstraForm
      initialData={data}
      onSuccess={() => navigate("/renstra/subkegiatan")}
    />
  );
};

export default SubkegiatanRenstraEditPage;

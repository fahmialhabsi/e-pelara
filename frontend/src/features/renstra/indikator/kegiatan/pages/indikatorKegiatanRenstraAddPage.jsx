import React from "react";
import IndikatorKegiatanRenstraForm from "../components/IndikatorKegiatanRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorKegiatanRenstraAddPage = () => {
  const navigate = useNavigate();
  return <IndikatorKegiatanRenstraForm onSuccess={() => navigate("/indikator")} />;
};

export default IndikatorKegiatanRenstraAddPage;

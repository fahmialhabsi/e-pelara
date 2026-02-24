import React from "react";
import IndikatorTujuanRenstraForm from "../components/IndikatorTujuanRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorTujuanRenstraAddPage = () => {
  const navigate = useNavigate();
  return <IndikatorTujuanRenstraForm onSuccess={() => navigate("/indikator")} />;
};

export default IndikatorTujuanRenstraAddPage;

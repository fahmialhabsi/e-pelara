import React from "react";
import IndikatorStrategiRenstraForm from "../components/IndikatorStrategiRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorStrategiRenstraAddPage = () => {
  const navigate = useNavigate();
  return (
    <IndikatorStrategiRenstraForm onSuccess={() => navigate("/indikator")} />
  );
};

export default IndikatorStrategiRenstraAddPage;

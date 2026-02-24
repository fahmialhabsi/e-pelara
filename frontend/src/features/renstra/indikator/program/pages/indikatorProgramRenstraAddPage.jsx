import React from "react";
import IndikatorProgramRenstraForm from "../components/IndikatorProgramRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorProgramRenstraAddPage = () => {
  const navigate = useNavigate();
  return (
    <IndikatorProgramRenstraForm onSuccess={() => navigate("/indikator")} />
  );
};

export default IndikatorProgramRenstraAddPage;

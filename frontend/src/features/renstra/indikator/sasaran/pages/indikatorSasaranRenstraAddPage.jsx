import React from "react";
import IndikatorSasaranRenstraForm from "../components/IndikatorSasaranRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorSasaranRenstraAddPage = () => {
  const navigate = useNavigate();
  return <IndikatorSasaranRenstraForm onSuccess={() => navigate("/indikator")} />;
};

export default IndikatorSasaranRenstraAddPage;

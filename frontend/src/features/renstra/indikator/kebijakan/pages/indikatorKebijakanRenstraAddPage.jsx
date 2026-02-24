import React from "react";
import IndikatorKebijakanRenstraForm from "../components/IndikatorKebijakanRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorKebijakanRenstraAddPage = () => {
  const navigate = useNavigate();
  return <IndikatorKebijakanRenstraForm onSuccess={() => navigate("/indikator")} />;
};

export default IndikatorKebijakanRenstraAddPage;

import React from "react";
import IndikatorSubKegiatanRenstraForm from "../components/IndikatorSubKegiatanRenstraForm";
import { useNavigate } from "react-router-dom";

const IndikatorSubKegiatanRenstraAddPage = () => {
  const navigate = useNavigate();
  return (
    <IndikatorSubKegiatanRenstraForm onSuccess={() => navigate("/indikator")} />
  );
};

export default IndikatorSubKegiatanRenstraAddPage;

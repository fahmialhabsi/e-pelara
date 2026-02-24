import React from "react";
import KegiatanRenstraForm from "../components/KegiatanRenstraForm";
import { useNavigate } from "react-router-dom";

const KegiatanRenstraAddPage = () => {
  const navigate = useNavigate();
  return (
    <KegiatanRenstraForm onSuccess={() => navigate("/renstra/kegiatan")} />
  );
};

export default KegiatanRenstraAddPage;

import React from "react";
import { useNavigate } from "react-router-dom";
import SubkegiatanRenstraForm from "../components/SubkegiatanRenstraForm";

const SubkegiatanRenstraAddPage = () => {
  const navigate = useNavigate();

  return (
    <SubkegiatanRenstraForm
      // hapus props renstraAktif karena sudah tidak digunakan
      onSuccess={() => navigate("/renstra/sub-kegiatan")}
    />
  );
};

export default SubkegiatanRenstraAddPage;

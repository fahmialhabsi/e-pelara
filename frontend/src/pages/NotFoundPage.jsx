import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "5rem" }}>
      <h1>404 - Halaman tidak ditemukan</h1>
      <p>Ups! Halaman yang Anda cari tidak tersedia.</p>
      <Button type="primary" onClick={() => navigate("/")}>
        Kembali ke Beranda
      </Button>
    </div>
  );
};

export default NotFoundPage;

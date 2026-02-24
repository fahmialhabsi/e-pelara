// src/features/renstra/components/FormRenstraOPDWrapper.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FormRenstraOPD from "../components/FormRenstraOPD";
import axios from "axios";
import { Spin, Alert } from "antd";

const FormRenstraOPDWrapper = () => {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`/api/renstra-opd/${id}`)
      .then((res) => setInitialData(res.data))
      .catch((err) => {
        console.error("Gagal memuat data Renstra OPD:", err);
        setError("Data tidak ditemukan");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin tip="Memuat data..." size="large">
          <div style={{ minHeight: 100, background: "#f0f2f5" }} />
        </Spin>
      </div>
    );
  }

  if (error) return <Alert type="error" message={error} />;

  return <FormRenstraOPD initialData={initialData} />;
};

export default FormRenstraOPDWrapper;

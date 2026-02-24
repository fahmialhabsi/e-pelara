import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Spinner, Alert } from "react-bootstrap";
import SubKegiatanForm from "@/components/forms/SubKegiatanForm";
import api from "@/services/api";

export default function SubKegiatanEdit() {
  const { id } = useParams(); // ID dari URL
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/sub-kegiatan/${id}`);
        setData(res.data?.data);
      } catch (err) {
        setError("Gagal memuat data sub-kegiatan.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleSubmit = async () => {
    // Berhasil simpan, redirect ke daftar
    navigate("/sub-kegiatan-list");
  };

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Memuat data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <h4>Edit Sub Kegiatan</h4>
      <SubKegiatanForm existingData={data} onSubmit={handleSubmit} />
    </Container>
  );
}

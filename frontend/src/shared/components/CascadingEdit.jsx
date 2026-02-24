// src/shared/components/CascadingEdit.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner, Alert, Container, Breadcrumb } from "react-bootstrap";
import api from "../../services/api";
import CascadingForm from "../../shared/components/CascadingForm";

function CascadingEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/cascading/${id}`);
        setData(res.data);
      } catch (err) {
        setError("Gagal mengambil data cascading.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaved = () => {
    navigate("/rpjmd/cascading-list");
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status" />
        <div>Memuat data cascading...</div>
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
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate("/dashboard")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate("/rpjmd/cascading-list")}>
          Daftar Cascading
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Edit Cascading</Breadcrumb.Item>
      </Breadcrumb>
      <h4 className="mb-3">Edit Cascading</h4>
      <CascadingForm existingData={data} onSaved={handleSaved} />
    </Container>
  );
}

export default CascadingEdit;

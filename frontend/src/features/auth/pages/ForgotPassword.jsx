import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import { requestPasswordReset } from "../../../services/authService";

const cardStyle = {
  maxWidth: "440px",
  width: "100%",
  backgroundColor: "#1e1e2f",
  color: "#fff",
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setResetUrl("");
    setLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      setInfo(data.message || "Permintaan telah diproses.");
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      const d = err.response?.data;
      const extra = d?.detail ? ` (${d.detail})` : d?.hint ? ` ${d.hint}` : "";
      setError(
        (d?.message || err.message || "Gagal mengirim permintaan.") + extra,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100 bg-dark">
      <Card className="p-4 shadow-lg" style={cardStyle}>
        <h3 className="text-center mb-3">Lupa password</h3>
        <p className="text-secondary small mb-4">
          Belum ada pengiriman email otomatis (SMTP). Di lingkungan pengembangan,
          tautan reset ditampilkan di halaman ini setelah Anda mengirim—buka
          tautan itu di browser yang sama agar port/asal cocok dengan aplikasi
          Anda. Alternatif: administrator dapat menjalankan{" "}
          <code className="text-light">npm run reset-password</code> di folder
          backend.
        </p>
        {error && <Alert variant="danger">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}
        {resetUrl && (
          <Alert variant="warning" className="small">
            <div className="fw-semibold mb-2">Tautan reset (dev / non-prod)</div>
            <a href={resetUrl} className="text-break d-block">
              {resetUrl}
            </a>
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="email@domain.go.id"
            />
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3"
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Kirim"}
          </Button>
          <div className="text-center">
            <Link to="/login" className="text-info text-decoration-none">
              Kembali ke login
            </Link>
          </div>
        </Form>
      </Card>
    </Container>
  );
}

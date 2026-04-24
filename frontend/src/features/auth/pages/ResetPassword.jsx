import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Container,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import { resetPasswordWithToken } from "../../../services/authService";
import PasswordInputWithToggle from "../components/PasswordInputWithToggle";

const cardStyle = {
  maxWidth: "440px",
  width: "100%",
  backgroundColor: "#1e1e2f",
  color: "#fff",
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token") || "";
    const e = searchParams.get("email") || "";
    if (t) setToken(t);
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== password2) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    try {
      const data = await resetPasswordWithToken({
        email: email.trim(),
        token: token.trim(),
        password,
      });
      setSuccess(data.message || "Password berhasil diubah.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Gagal mengubah password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100 bg-dark">
      <Card className="p-4 shadow-lg" style={cardStyle}>
        <h3 className="text-center mb-3">Atur ulang password</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Token reset</Form.Label>
            <Form.Control
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="off"
              className="font-monospace small"
            />
            <Form.Text className="text-secondary">
              Terisi otomatis jika Anda membuka tautan dari email atau dari
              halaman lupa password (mode pengembangan).
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password baru</Form.Label>
            <PasswordInputWithToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Ulangi password baru</Form.Label>
            <PasswordInputWithToggle
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3"
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Simpan password"}
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

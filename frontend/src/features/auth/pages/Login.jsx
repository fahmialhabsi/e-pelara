// src/features/auth/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { login as loginService } from "../../../services/authService";
import { Container, Form, Button, Card, Alert, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import PasswordInputWithToggle from "../components/PasswordInputWithToggle";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await loginService(form);

      console.log("✅ userData dari loginService:", userData);

      await loginUser(userData);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("⚠️ Login error detail:", err);

      if (err.response) {
        setError(err.response.data?.message || `Error ${err.response.status}`);
      } else if (err.request) {
        setError("Server tidak merespons.");
      } else {
        setError("Terjadi kesalahan client.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100 bg-dark">
      <Card
        className="p-4 shadow-lg"
        style={{
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "#1e1e2f",
          color: "#fff",
        }}
      >
        <h3 className="text-center mb-4">Selamat Datang 👋</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formEmail" className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="Masukkan email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </Form.Group>
          <Form.Group controlId="formPassword" className="mb-4">
            <Form.Label>Password</Form.Label>
            <PasswordInputWithToggle
              name="password"
              placeholder="Masukkan password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100"
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Masuk"}
          </Button>
          <div className="text-center mt-3">
            <Link
              to="/forgot-password"
              className="text-decoration-none text-warning d-block mb-2 small"
            >
              Lupa password?
            </Link>
            <span>Belum punya akun? </span>
            <Link to="/register" className="text-decoration-none text-info">
              Daftar di sini
            </Link>
          </div>
        </Form>
      </Card>
    </Container>
  );
};

export default Login;

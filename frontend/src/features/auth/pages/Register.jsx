import React, { useState, useEffect } from "react";
import { Form, Button, Container, Card, Alert, Spinner } from "react-bootstrap";
import PasswordInputWithToggle from "../components/PasswordInputWithToggle";
import { register, checkSuperAdmin } from "../../../services/authService";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../../../hooks/useRoles";
import { useDivisions } from "../../../hooks/useDivisions";
import { getCurrentPeriode } from "../../../services/periodeService";

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Register = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role_id: "",
    opd: "",
    divisions_id: "",
  });
  const roles = useRoles();
  const divisions = useDivisions();
  const [hideSuper, setHideSuper] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { exists } = await checkSuperAdmin();
        setHideSuper(exists);
      } catch (e) {
        setError("Gagal load status super admin");
      } finally {
        setLoadingCheck(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    console.log("Data yang dikirim:", form);

    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(form.email)) {
      setError("Email tidak valid!");
      return;
    }
    if (!strongPassword.test(form.password)) {
      setError(
        "Password harus minimal 8 karakter, huruf besar, kecil, angka, simbol."
      );
      return;
    }

    setSubmitting(true);
    try {
      const periode = await getCurrentPeriode();

      await register({
        ...form,
        role_id: Number(form.role_id),
        divisions_id: Number(form.divisions_id),
        opd: form.opd,
        periode_id: periode.id, // ✅ auto set periode_id
      });
      setSuccess("Registrasi berhasil! Silakan login.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registrasi gagal! Email sudah terdaftar?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCheck)
    return <Spinner animation="border" className="d-block mx-auto mt-5" />;

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100 bg-dark">
      <Card
        className="p-4 shadow-lg"
        style={{
          maxWidth: "500px",
          width: "100%",
          backgroundColor: "#1e1e2f",
          color: "#fff",
        }}
      >
        <h3 className="text-center mb-4">Form Registrasi</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit} autoComplete="off">
          <Form.Group className="mb-3">
            <Form.Label>Nama Jabatan</Form.Label>
            <Form.Control
              type="text"
              name="username"
              placeholder="Masukkan nama Jabatan Anda"
              value={form.username}
              onChange={handleChange}
              required
              minLength={3}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="Masukkan email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="new-email"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <PasswordInputWithToggle
              name="password"
              placeholder="Min. 8 karakter, huruf besar & angka"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              name="role_id"
              value={form.role_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Role --</option>
              {roles
                .filter((r) => !(hideSuper && r.name === "SUPER ADMIN"))
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nama Perangkat Daerah</Form.Label>
            <Form.Control
              type="text"
              name="opd"
              placeholder="Masukkan OPD"
              value={form.opd}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Divisi</Form.Label>
            <Form.Select
              name="divisions_id"
              value={form.divisions_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Divisi --</option>
              {divisions.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100"
            disabled={submitting}
          >
            {submitting ? <Spinner animation="border" size="sm" /> : "Daftar"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default Register;

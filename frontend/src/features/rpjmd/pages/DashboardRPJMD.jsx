import React from "react";
import { Container, Alert } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";

const DashboardRPJMD = () => {
  const { user } = useAuth();
  const allowedRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];

  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container className="p-5 d-flex justify-content-center align-items-center">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Anda tidak memiliki akses ke halaman RPJMD.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="p-4">
      <h2 className="mb-4">📝 Halaman Utama RPJMD</h2>
      {/* Konten utama RPJMD */}
    </Container>
  );
};

export default DashboardRPJMD;

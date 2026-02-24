// === src/components/Users/Users.js ===
import React, { useEffect, useMemo, useState } from "react";
import { Table, Alert, Spinner } from "react-bootstrap";
import useAuth from "../../contexts/AuthContext";
import api from "../../services/api";
import { normalizeRole } from "../../utils/roleUtils";

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const allowedRoles = useMemo(() => ["SUPER_ADMIN"], []);
  const userRole = normalizeRole(user?.role);

  useEffect(() => {
    if (!allowedRoles.includes(userRole)) return;

    const fetchUsers = async () => {
      try {
        const res = await api.get("/users");
        setUsers(res.data);
      } catch (err) {
        console.error("Gagal mengambil data pengguna:", err);
        setError("Gagal memuat data pengguna.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userRole, allowedRoles]);

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="p-4 text-danger">
        🚫 Anda tidak memiliki hak akses untuk melihat halaman ini.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="mb-4">👥 Manajemen Pengguna</h2>

      {loading ? (
        <Spinner animation="border" />
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Pengguna</th>
              <th>Email</th>
              <th>Role</th>
              <th>OPD</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role?.name}</td>
                <td>{u.opd || "-"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default Users;

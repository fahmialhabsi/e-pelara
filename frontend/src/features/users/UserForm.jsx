// === src/components/Users/Users.js ===
import React, { useEffect, useState } from "react";
import { Button, Table, Spinner, Alert } from "react-bootstrap";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import UserForm from "./UserForm";

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Gagal memuat pengguna", err);
      setError("Tidak dapat memuat daftar pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setUserToEdit(user);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus pengguna ini?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Pengguna dihapus.");
      fetchUsers();
    } catch (err) {
      toast.error("Gagal menghapus pengguna.");
    }
  };

  if (!user || user.role !== "SUPER ADMIN") {
    return <div>Anda tidak memiliki hak akses untuk melihat halaman ini.</div>;
  }

  return (
    <div className="p-3">
      <h4 className="mb-3">👥 Manajemen Pengguna</h4>

      {showForm ? (
        <UserForm
          userToEdit={userToEdit}
          onCancel={() => {
            setShowForm(false);
            setUserToEdit(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setShowForm(false);
            setUserToEdit(null);
          }}
        />
      ) : (
        <>
          <Button
            className="mb-3"
            onClick={() => {
              setUserToEdit(null);
              setShowForm(true);
            }}
          >
            ➕ Tambah Pengguna
          </Button>

          {loading ? (
            <Spinner animation="border" />
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Divisi</th>
                  <th>OPD</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role?.name}</td>
                    <td>{u.division?.name}</td>
                    <td>{u.opd}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        className="me-2"
                        onClick={() => handleEdit(u)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(u.id)}
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
};

export default Users;

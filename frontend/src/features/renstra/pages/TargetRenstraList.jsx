// src/features/renstra/pages/TargetRenstraList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Table, Spinner, Alert, Button } from "react-bootstrap";
import api from "../../../services/api";

export default function TargetRenstraList() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch data target dari API
  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/renstra-target");
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setTargets(data);
    } catch (err) {
      console.error("Gagal memuat target:", err);
      setError("Gagal memuat daftar target dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  // Hapus target
  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus target ini?"))
      return;
    try {
      await api.delete(`/renstra/renstra-target/${id}`);
      alert("Data berhasil dihapus!");
      fetchTargets(); // refresh data
    } catch (err) {
      console.error("Gagal menghapus data", err);
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  // Arahkan ke halaman edit
  const handleEdit = (id) => {
    navigate(`/renstra-target/edit/${id}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow rounded">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-xl font-bold">Daftar Target Renstra</h2>
        <Link to="/renstra/target/add" className="btn btn-primary">
          ➕ Tambah Target Renstra
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : targets.length === 0 ? (
        <Alert variant="info">Belum ada data target Renstra.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>No</th>
              <th>Tujuan</th>
              <th>Sasaran</th>
              <th>Program</th>
              <th>Kegiatan</th>
              <th>Sub Kegiatan</th>
              <th>Tahun</th>
              <th>Target</th>
              <th>Satuan</th>
              <th>Pagu Anggaran</th>
              <th>Lokasi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t, idx) => (
              <tr key={t.id || idx}>
                <td>{idx + 1}</td>
                <td>{t.tujuan || "-"}</td>
                <td>{t.sasaran || "-"}</td>
                <td>{t.program || "-"}</td>
                <td>{t.kegiatan || "-"}</td>
                <td>{t.subkegiatan || "-"}</td>
                <td>{t.tahun || "-"}</td>
                <td>{t.target_value || "-"}</td>
                <td>{t.satuan || "-"}</td>
                <td>{t.pagu_anggaran || "-"}</td>
                <td>{t.lokasi || "-"}</td>
                <td className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => handleEdit(t.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(t.id)}
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

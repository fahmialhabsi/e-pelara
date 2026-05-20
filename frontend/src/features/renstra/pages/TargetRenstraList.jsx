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

  const fetchTargets = async () => {
    try {
      const res = await api.get("/renstra-target");
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setTargets(data);
    } catch (err) {
      void err;
      setError("Gagal memuat daftar target dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadTargets = async () => {
      try {
        const res = await api.get("/renstra-target");
        if (!isMounted) return;

        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setTargets(data);
      } catch (err) {
        if (!isMounted) return;
        setError("Gagal memuat daftar target dari server.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadTargets();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus target ini?")) return;
    try {
      await api.delete(`/renstra/renstra-target/${id}`);
      alert("Data berhasil dihapus!");
      setLoading(true);
      fetchTargets();
    } catch (err) {
      void err;
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  const handleEdit = (id) => {
    navigate(`/renstra-target/edit/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Daftar Target Renstra
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Daftar Target Renstra</h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Ringkasan target lintas level untuk meninjau tujuan, sasaran, program, kegiatan, dan sub kegiatan
                dalam satu tampilan yang lebih rapi.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {targets.length} data
              </span>
              <Link
                to="/renstra/target/add"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Tambah Target Renstra
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner animation="border" role="status" />
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="danger">{error}</Alert>
            </div>
          ) : targets.length === 0 ? (
            <div className="p-4">
              <Alert variant="info">Belum ada data target Renstra.</Alert>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table striped bordered hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>No</th>
                    <th>Tujuan</th>
                    <th>Sasaran</th>
                    <th>Program</th>
                    <th>Kegiatan</th>
                    <th>Sub Kegiatan</th>
                    <th>Acuan periode (data)</th>
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
                        <Button size="sm" variant="warning" onClick={() => handleEdit(t.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// src/features/renstra/tujuan/pages/RenstraTabelTujuanListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerFullscreen from "../components/SpinnerTujuanFullscreen";

const formatNumber = (num) =>
  num === null || num === undefined || num === ""
    ? "-"
    : Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2 });

const RenstraTabelTujuanListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["renstra-tabel-tujuan"],
    queryFn: async () => (await api.get("/renstra-tabel-tujuan")).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/renstra-tabel-tujuan/${id}`),
    onSuccess: () => queryClient.invalidateQueries(["renstra-tabel-tujuan"]),
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  if (isLoading) return <SpinnerFullscreen tip="Memuat daftar..." />;

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data" />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button onClick={() => navigate("/dashboard-renstra")}>
            🔙 Kembali
          </Button>
          <Button
            type="primary"
            onClick={() => navigate("/renstra/tabel/tujuan/add")}
          >
            ➕ Tambah
          </Button>
        </div>
      </div>
    );

  const columns = [
    {
      title: "Indikator",
      dataIndex: ["indikator", "nama_indikator"],
      key: "indikator",
      fixed: "left",
    },
    { title: "Baseline", dataIndex: "baseline", key: "baseline" },
    { title: "Satuan", dataIndex: "satuan_target", key: "satuan_target" },
    { title: "Lokasi", dataIndex: "lokasi", key: "lokasi" },
    {
      title: "Target per Tahun",
      children: Array.from({ length: 6 }, (_, i) => ({
        title: `T${i + 1}`,
        dataIndex: `target_tahun_${i + 1}`,
        key: `target_tahun_${i + 1}`,
        render: (value) => formatNumber(value),
      })),
    },
    {
      title: "Pagu per Tahun",
      children: Array.from({ length: 6 }, (_, i) => ({
        title: `T${i + 1}`,
        dataIndex: `pagu_tahun_${i + 1}`,
        key: `pagu_tahun_${i + 1}`,
        render: (value) => formatNumber(value),
      })),
    },
    {
      title: "Target Akhir",
      dataIndex: "target_akhir_renstra",
      key: "target_akhir_renstra",
      render: (value) => formatNumber(value),
    },
    {
      title: "Pagu Akhir",
      dataIndex: "pagu_akhir_renstra",
      key: "pagu_akhir_renstra",
      render: (value) => formatNumber(value),
    },
    {
      title: "Aksi",
      key: "aksi",
      fixed: "right",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            onClick={() => navigate(`/renstra/tabel/tujuan/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Apakah Anda yakin ingin menghapus data ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button danger>🗑️ Hapus</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali
        </Button>
        <Button
          type="primary"
          onClick={() => navigate("/renstra/tabel/tujuan/add")}
        >
          ➕ Tambah
        </Button>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        bordered
        scroll={{ x: 1500 }}
      />
    </div>
  );
};

export default RenstraTabelTujuanListPage;

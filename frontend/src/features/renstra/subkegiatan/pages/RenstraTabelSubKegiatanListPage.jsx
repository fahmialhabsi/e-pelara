// src/features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerFullscreen from "../components/RenstraTableSubKegiatanSpinnerFullscreen";

// helper format angka
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "-";
  return Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2 });
};

const RenstraTabelSubKegiatanListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // GET data
  const { data, isLoading } = useQuery({
    queryKey: ["renstra-tabel-subkegiatan"],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-subkegiatan");
      return res.data.data || [];
    },
  });

  // DELETE data
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/renstra-tabel-subkegiatan/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-subkegiatan"]);
    },
  });

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  if (isLoading)
    return <SpinnerFullscreen tip="Memuat daftar subkegiatan..." />;

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data subkegiatan" />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button onClick={() => navigate("/dashboard-renstra")}>
            🔙 Kembali
          </Button>
          <Button
            type="primary"
            onClick={() => navigate("/renstra/tabel/subkegiatan/add")}
          >
            ➕ Tambah
          </Button>
        </div>
      </div>
    );

  const columns = [
    {
      title: "Program",
      dataIndex: ["program", "nama_program"],
      key: "program",
      fixed: "left",
    },
    {
      title: "Kegiatan",
      dataIndex: ["kegiatan", "nama_kegiatan"],
      key: "kegiatan",
      fixed: "left",
    },
    {
      title: "Subkegiatan",
      dataIndex: "nama_subkegiatan",
      key: "subkegiatan",
      fixed: "left",
    },
    {
      title: "Indikator",
      dataIndex: "indikator_manual",
      key: "indikator",
    },
    {
      title: "Baseline",
      dataIndex: "baseline",
      key: "baseline",
      render: (value) => formatNumber(value),
    },
    {
      title: "Satuan Target",
      dataIndex: "satuan_target",
      key: "satuan_target",
    },
    { title: "Lokasi", dataIndex: "lokasi", key: "lokasi" },
    {
      title: "Sub Bidang Penanggung Jawab",
      dataIndex: "sub_bidang_penanggung_jawab",
      key: "sub_bidang",
    },
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
            onClick={() =>
              navigate(`/renstra/tabel/subkegiatan/edit/${record.id}`)
            }
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
          onClick={() => navigate("/renstra/tabel/subkegiatan/add")}
        >
          ➕ Tambah
        </Button>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        bordered
        scroll={{ x: 2000 }}
      />
    </div>
  );
};

export default RenstraTabelSubKegiatanListPage;

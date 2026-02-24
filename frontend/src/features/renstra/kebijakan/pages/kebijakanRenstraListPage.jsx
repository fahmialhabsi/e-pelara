// src/features/renstra/kebijakan/pages/kebijakanRenstraListPage.jsx (FINAL)
import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Alert,
  Empty,
  Space,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { BsPencil, BsTrash, BsPlus, BsArrowLeftCircle } from "react-icons/bs";

const KebijakanRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Mengambil daftar kebijakan Renstra
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-kebijakan"], // Key query untuk daftar
    queryFn: async () => (await api.get("/renstra-kebijakan")).data, // Panggil API
  });

  // Mutation untuk menghapus data
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-kebijakan/${id}`), // Panggil API delete
    onSuccess: () => {
      message.success("Data kebijakan berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["renstra-kebijakan"] }); // Invalidate query untuk refresh daftar
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Gagal menghapus data");
    },
  });

  const columns = [
    {
      title: "Kebijakan Renstra", // Menggabungkan kode dan deskripsi kebijakan
      key: "kebijakan_detail",
      render: (_, record) => (
        <div style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {/* ALUR 2: Gunakan kode_kebjkn yang dihasilkan otomatis */}
          <div>
            <strong>Kode:</strong> {record.kode_kebjkn || "Otomatis"}
          </div>
          <div>
            <strong>Deskripsi:</strong> {record.deskripsi}
          </div>
        </div>
      ),
    },

    {
      title: "Arah Kebijakan RPJMD",
      key: "arah_kebijakan_rpjmd",
      render: (_, record) =>
        record.arah_kebijakan ? (
          <div>
            <div>
              <strong>Kode:</strong>{" "}
              {record.no_arah_rpjmd || record.arah_kebijakan.kode_arah || "N/A"}
            </div>
            <div>
              <strong>Deskripsi:</strong>{" "}
              {record.isi_arah_rpjmd ||
                record.arah_kebijakan.deskripsi ||
                "N/A"}
            </div>
          </div>
        ) : (
          <span style={{ color: "gray" }}>N/A</span>
        ),
    },
    {
      title: "Prioritas",
      dataIndex: "prioritas",
      key: "prioritas",
      width: 100,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<BsPencil />}
            onClick={() => navigate(`/renstra/kebijakan/edit/${record.id}`)}
          />
          <Popconfirm
            title="Hapus Kebijakan?"
            description="Apakah Anda yakin ingin menghapus data ini?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button
              type="link"
              danger
              icon={<BsTrash />}
              loading={deleteMutation.isLoading} // Tampilkan loading saat menghapus
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tampilan loading global
  if (isLoading) return <Spin tip="Memuat data..." size="large" fullscreen />;
  // Tampilan error global
  if (isError)
    return (
      <Alert
        message="Gagal memuat data"
        description={error.message}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <h2>Daftar Kebijakan Renstra</h2>
        <Space>
          <Button
            icon={<BsArrowLeftCircle />}
            onClick={() => navigate("/dashboard-renstra")}
          >
            Kembali ke Dashboard
          </Button>
          <Button
            type="primary"
            icon={<BsPlus />}
            onClick={() => navigate("/renstra/kebijakan/add")}
          >
            Tambah Kebijakan
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        bordered
        locale={{
          emptyText: <Empty description="Belum ada data Kebijakan Renstra." />,
        }}
      />
    </div>
  );
};

export default KebijakanRenstraListPage;

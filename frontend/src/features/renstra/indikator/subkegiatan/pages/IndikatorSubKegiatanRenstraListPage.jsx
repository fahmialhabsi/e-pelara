import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const IndikatorSubKegiatanRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["indikator-sub-kegiatan-renstra"],
    queryFn: async () => {
      const res = await api.get("/indikator-sub-kegiatan-renstra");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-sub-kegiatan-renstra/${id}`);
    },
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries(["indikator-sub-kegiatan-renstra"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const columns = [
    {
      title: "No",
      dataIndex: "kode_indikator",
    },
    {
      title: "Nama Indikator",
      dataIndex: "nama_indikator",
    },
    {
      title: "Satuan",
      dataIndex: "satuan",
    },
    {
      title: "Target (th. ke-1)",
      dataIndex: "target_tahun_1",
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() =>
              navigate(`/renstra/indikator-sub-kegiatan/edit/${record.id}`)
            }
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus data ini?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger>
              🗑️ Hapus
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (isLoading) return <Spin fullscreen tip="Memuat data..." />;
  if (isError)
    return (
      <Alert
        type="error"
        message="Gagal memuat data"
        description={error?.message}
        style={{ margin: 24 }}
      />
    );

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Indikator Sub Kegiatan" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/indikator-sub-kegiatan/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Kebijakan
        </Button>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Button onClick={() => navigate("/dashboard-renstra")}>
          🔙 Kembali ke Dashboard Renstra
        </Button>
        <Button
          type="primary"
          onClick={() => navigate("/renstra/indikator-sub-kegiatan/add")}
        >
          ➕ Tambah Indikator Kebijakan
        </Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" bordered />
    </div>
  );
};

export default IndikatorSubKegiatanRenstraListPage;

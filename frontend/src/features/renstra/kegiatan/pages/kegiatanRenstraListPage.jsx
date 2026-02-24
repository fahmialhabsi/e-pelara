import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchKegiatanRenstra,
  deleteKegiatanRenstra,
} from "../api/kegiatanRenstraApi";
import { useNavigate } from "react-router-dom";

const KegiatanRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["renstra-kegiatan"],
    queryFn: async () => (await fetchKegiatanRenstra()).data,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKegiatanRenstra,
    onSuccess: () => {
      message.success("Data berhasil dihapus 🗑️");
      queryClient.invalidateQueries(["renstra-kegiatan"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    {
      title: "Program Renstra",
      key: "program_renstra",
      render: (_, record) => {
        const kode = record.program_renstra?.kode_program;
        const nama = record.program_renstra?.nama_program;
        return kode && nama ? (
          <div>
            <strong>{kode}</strong> - {nama}
          </div>
        ) : (
          <span style={{ color: "gray" }}>Tidak ada</span>
        );
      },
    },
    {
      title: "Kegiatan Renstra",
      key: "kegiatan_renstra",
      render: (_, record) => {
        const kode = record.kode_kegiatan;
        const nama = record.nama_kegiatan;
        return kode && nama ? (
          <div>
            <strong>{kode}</strong> - {nama}
          </div>
        ) : (
          <span style={{ color: "gray" }}>Tidak ada</span>
        );
      },
    },
    {
      title: "OPD Penanggung Jawab",
      key: "bidang_opd",
      render: (_, record) => {
        return record.bidang_opd ? (
          <div>{record.bidang_opd}</div>
        ) : (
          <span style={{ color: "gray" }}>Tidak ada</span>
        );
      },
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/kegiatan/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin hapus?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger>
              🗑️ Hapus
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (isLoading) {
    return <Spin tip="Memuat data kegiatan..." size="large" fullscreen />;
  }

  if (isError) {
    return (
      <Alert
        message="Gagal memuat data"
        description={error?.message || "Terjadi kesalahan"}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Kegiatan Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/kegiatan/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Kegiatan
        </Button>
      </div>
    );
  }

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
          onClick={() => navigate("/renstra/kegiatan/add")}
        >
          ➕ Tambah Kegiatan
        </Button>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </div>
  );
};

export default KegiatanRenstraListPage;

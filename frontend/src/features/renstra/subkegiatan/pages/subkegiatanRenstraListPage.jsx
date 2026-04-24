import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubkegiatanRenstra,
  deleteSubkegiatanRenstra,
} from "../api/subkegiatanRenstraApi";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";

const SubkegiatanRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: renstraAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subkegiatan-renstra", renstraAktif?.id],
    queryFn: async () => {
      const params = {};
      if (renstraAktif?.id) params.renstra_id = renstraAktif.id;
      const res = await fetchSubkegiatanRenstra(params);

      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    },
    enabled: !!renstraAktif?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubkegiatanRenstra,
    onSuccess: () => {
      message.success("Data berhasil dihapus 🗑️");
      queryClient.invalidateQueries(["subkegiatan-renstra"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const joinDash = (parts) =>
    parts
      .map((p) => (p == null || p === "" ? "" : String(p).trim()))
      .filter(Boolean)
      .join(" - ");

  const columns = [
    {
      title: "Kegiatan Renstra",
      key: "kegiatan_renstra",
      ellipsis: true,
      render: (_, record) =>
        joinDash([
          record.kegiatan?.kode_kegiatan,
          record.kegiatan?.nama_kegiatan,
        ]) || "—",
    },
    {
      title: "Sub Kegiatan Renstra",
      key: "sub_kegiatan_renstra",
      ellipsis: true,
      render: (_, record) =>
        joinDash([record.kode_sub_kegiatan, record.nama_sub_kegiatan]) || "—",
    },
    {
      title: "OPD Penanggung Jawab",
      key: "opd",
      ellipsis: true,
      render: (_, record) =>
        joinDash([
          record.sub_bidang_opd,
          record.nama_bidang_opd,
          record.nama_opd,
        ]) || "—",
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/subkegiatan/edit/${record.id}`)}
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

  if (isLoading || !renstraAktif) {
    return <Spin tip="Memuat data..." size="large" fullscreen />;
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

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Sub Kegiatan Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/subkegiatan/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Subkegiatan
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
          onClick={() => navigate("/renstra/subkegiatan/add")}
        >
          ➕ Tambah Subkegiatan
        </Button>
      </div>
      <Table columns={columns} dataSource={rows} rowKey="id" bordered />
    </div>
  );
};

export default SubkegiatanRenstraListPage;
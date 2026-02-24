import React from "react";
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProgramRenstra,
  deleteProgramRenstra,
} from "../api/programRenstraApi";
import { useNavigate } from "react-router-dom";

const ProgramRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["program-renstra"],
    queryFn: async () => (await fetchProgramRenstra()).data,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgramRenstra,
    onSuccess: () => {
      message.success("Data berhasil dihapus 🗑️");
      queryClient.invalidateQueries(["program-renstra"]);
    },
    onError: () => {
      message.error("Gagal menghapus data");
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    {
      title: "Program RPJMD",
      key: "program_rpjmd",
      render: (_, record) => {
        if (record.kode_program && record.nama_program) {
          return (
            <div>
              <strong>{record.kode_program}</strong> - {record.nama_program}
            </div>
          );
        }
        return <span style={{ color: "gray" }}>Tidak ada</span>;
      },
    },

    {
      title: "OPD Penanggung Jawab",
      key: "opd_penanggung_jawab",
      render: (_, record) => {
        const nama_opd = record.opd_penanggung_jawab;
        const nama_bidang_opd = record.bidang_opd_penanggung_jawab;
        if (nama_opd && nama_bidang_opd) {
          return (
            <div>
              <strong>{nama_opd}</strong> - {nama_bidang_opd}
            </div>
          );
        }
        return <span style={{ color: "gray" }}>Tidak ada</span>;
      },
    },

    {
      title: "Aksi",
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/program/edit/${record.id}`)}
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
    return <Spin tip="Memuat daftar program..." size="large" fullscreen />;
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
        <Empty description="Belum ada data Program Renstra" />
        <Button
          type="primary"
          onClick={() => navigate("/renstra/program/add")}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Program
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
        <Button type="primary" onClick={() => navigate("/renstra/program/add")}>
          ➕ Tambah Program
        </Button>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </div>
  );
};

export default ProgramRenstraListPage;

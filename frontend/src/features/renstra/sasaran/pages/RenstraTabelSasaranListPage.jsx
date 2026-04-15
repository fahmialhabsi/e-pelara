// src/features/renstra/sasaran/pages/RenstraTabelSasaranListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm, Typography } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerSasaranFullscreen from "../components/SpinnerSasaranFullscreen";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
  renstraTabelListTableProps,
  renstraTabelListPageShellStyle,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const RenstraTabelSasaranListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["renstra-tabel-sasaran"],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-sasaran");
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/renstra-tabel-sasaran/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-sasaran"]);
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  if (isLoading) return <SpinnerSasaranFullscreen tip="Memuat daftar..." />;

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data" />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button onClick={() => navigate("/dashboard-renstra")}>
            Kembali
          </Button>
          <Button
            type="primary"
            onClick={() => navigate("/renstra/tabel/sasaran/add")}
          >
            Tambah
          </Button>
        </div>
      </div>
    );

  const columns = [
    {
      title: "Kode",
      dataIndex: "kode_sasaran",
      key: "kode_sasaran",
      width: 96,
      ellipsis: true,
      fixed: "left",
    },
    {
      title: "Sasaran",
      dataIndex: "nama_sasaran",
      key: "nama_sasaran",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Indikator",
      dataIndex: ["indikator", "nama_indikator"],
      key: "indikator",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Lokasi",
      dataIndex: "lokasi",
      key: "lokasi",
      width: 130,
      ellipsis: true,
    },
    {
      title: "Target akhir",
      dataIndex: "target_akhir_renstra",
      key: "target_akhir_renstra",
      width: 108,
      align: "right",
      render: (v) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(v)}
        </span>
      ),
    },
    {
      title: "Pagu akhir",
      dataIndex: "pagu_akhir_renstra",
      key: "pagu_akhir_renstra",
      width: 120,
      align: "right",
      render: (v) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumberShort(v)}
        </span>
      ),
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 168,
      fixed: "right",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/renstra/tabel/sasaran/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Hapus data ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button size="small" danger>
              Hapus
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={renstraTabelListPageShellStyle}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <Button onClick={() => navigate("/dashboard-renstra")}>
          Kembali
        </Button>
        <Button
          type="primary"
          onClick={() => navigate("/renstra/tabel/sasaran/add")}
        >
          Tambah
        </Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target &amp; pagu per tahun (1–6).
        </Text>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        {...renstraTabelListTableProps}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: (record) => (
            <StandardRenstraExpandedRow record={record} />
          ),
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default RenstraTabelSasaranListPage;

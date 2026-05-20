// src/features/renstra/sasaran/pages/RenstraTabelSasaranListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm, Typography, Card, Spin } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerSasaranFullscreen from "../components/SpinnerSasaranFullscreen";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const ExpandedRowDetail = ({ id }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["renstra-tabel-sasaran-detail", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-sasaran/${id}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!id,
  });

  const indikatorId = data?.indikator_id ?? data?.indikator?.id;
  const sourceIndikatorId =
    data?.indikator?.source_indikator_id ?? data?.source_indikator_id;
  const { data: indikatorDetail } = useQuery({
    queryKey: ["indikator-renstra-detail", indikatorId],
    queryFn: async () => {
      const res = await api.get(`/indikator-renstra/${indikatorId}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!indikatorId && !data?.baseline,
  });

  const { data: sourceIndikatorDetail } = useQuery({
    queryKey: ["indikator-sasaran-source-detail", sourceIndikatorId],
    queryFn: async () => {
      const res = await api.get(`/indikator-sasaran/${sourceIndikatorId}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!sourceIndikatorId && !data?.baseline && !indikatorDetail?.baseline,
  });

  if (isLoading) return <Spin tip="Memuat detail..." />;
  if (isError || !data) return <div style={{ padding: 12 }}>Detail tidak tersedia.</div>;

  return (
    <StandardRenstraExpandedRow
      record={{
        ...data,
        baseline:
          data.baseline ??
          indikatorDetail?.baseline ??
          data.indikator?.baseline ??
          sourceIndikatorDetail?.baseline ??
          sourceIndikatorDetail?.capaian_tahun_5,
      }}
    />
  );
};

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

  const columns = [
    {
      title: "Kode",
      dataIndex: "kode_sasaran",
      key: "kode_sasaran",
      width: 120,
      ellipsis: true,
      fixed: "left",
      render: (value) => value || "-",
    },
    {
      title: "Sasaran",
      dataIndex: "nama_sasaran",
      key: "nama_sasaran",
      width: 260,
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Indikator",
      key: "indikator",
      width: 260,
      ellipsis: true,
      render: (_, record) =>
        record.indikator?.nama_indikator ||
        record.nama_indikator ||
        "-",
    },
    {
      title: "Lokasi",
      key: "lokasi",
      width: 220,
      ellipsis: true,
      render: (_, record) =>
        record.lokasi ||
        record.opd?.bidang_opd ||
        "-",
    },
    {
      title: "Target Akhir",
      dataIndex: "target_akhir_renstra",
      key: "target_akhir_renstra",
      width: 130,
      align: "right",
      render: (value) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(value)}
        </span>
      ),
    },
    {
      title: "Pagu RPJMD",
      dataIndex: "pagu_rpjmd_acuan",
      key: "pagu_rpjmd_acuan",
      width: 140,
      align: "right",
      render: (value) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumberShort(value)}
        </span>
      ),
    },
    {
      title: "Pagu Akhir",
      dataIndex: "pagu_akhir_renstra",
      key: "pagu_akhir_renstra",
      width: 140,
      align: "right",
      render: (value) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumberShort(value)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status_revisi",
      key: "status_revisi",
      width: 120,
      render: (value) => value || "-",
    },
    {
      title: "Versi",
      dataIndex: "versi",
      key: "versi",
      width: 90,
      align: "center",
      render: (value) => value || 1,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 180,
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
          <Button
            size="small"
            onClick={() =>
              navigate(`/renstra/tabel/sasaran/history/${record.id}`)
            }
          >
            History
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

  if (isLoading) return <SpinnerSasaranFullscreen tip="Memuat daftar..." />;

  return (
    <Card title="Renstra Tabel Sasaran">
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
          Klik baris untuk melihat target dan pagu periode tahun ke-1 sampai ke-5.
        </Text>
      </div>

      {!data || data.length === 0 ? (
        <Empty description="Belum ada data" />
      ) : (
        <Table
          size="small"
          bordered
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandRowByClick: true,
            expandedRowRender: (record) => <ExpandedRowDetail id={record.id} />,
            rowExpandable: () => true,
          }}
        />
      )}
    </Card>
  );
};

export default RenstraTabelSasaranListPage;

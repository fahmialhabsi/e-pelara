// src/features/renstra/tujuan/pages/RenstraTabelTujuanListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm, Typography, Tag, Card, Spin } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerFullscreen from "../components/SpinnerTujuanFullscreen";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const pageStyle = {
  padding: 0,
  width: "100%",
};

const cardBodyStyle = {
  width: "100%",
};

const tableWrapperStyle = {
  width: "100%",
  overflowX: "auto",
};

const ExpandedRowDetail = ({ id }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["renstra-tabel-tujuan-detail", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-tujuan/${id}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!id,
  });

  if (isLoading) return <Spin tip="Memuat detail..." />;
  if (isError || !data) return <div style={{ padding: 12 }}>Detail tidak tersedia.</div>;

  return <StandardRenstraExpandedRow record={data} />;
};

const RenstraTabelTujuanListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["renstra-tabel-tujuan"],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-tujuan");
      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      const detailRows = await Promise.all(
        rows.map(async (row) => {
          try {
            const detailRes = await api.get(`/renstra-tabel-tujuan/${row.id}`);
            return detailRes.data?.data ?? detailRes.data ?? row;
          } catch {
            return row;
          }
        }),
      );

      return detailRows;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/renstra-tabel-tujuan/${id}`),
    onSuccess: () => queryClient.invalidateQueries(["renstra-tabel-tujuan"]),
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const renderStatusRevisi = (status) => {
  const value = status || "draft";

  const colorMap = {
    draft: "orange",
    verifikasi: "blue",
    approved: "green",
    ditolak: "red",
  };

  return (
      <Tag color={colorMap[value] || "default"}>
        {String(value).toUpperCase()}
      </Tag>
    );
  };

  if (isLoading) return <SpinnerFullscreen tip="Memuat daftar..." />;

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
            onClick={() => navigate("/renstra/tabel/tujuan/add")}
          >
            Tambah
          </Button>
        </div>
      </div>
    );

  const columns = [
    {
      title: "Kode",
      key: "kode_tujuan",
      width: 90,
      ellipsis: true,
      fixed: "left",
      render: (_, record) =>
        record.no_tujuan || record.kode_tujuan || record.nomor_tujuan || "-",
    },
    {
      title: "Tujuan",
      key: "nama_tujuan",
      width: 260,
      ellipsis: true,
      render: (_, record) => record.isi_tujuan || record.nama_tujuan || "-",
    },
    {
      title: "Indikator",
      key: "indikator",
      width: 240,
      ellipsis: true,
      render: (_, record) =>
        record.indikator?.nama_indikator ||
        record.nama_indikator ||
        record.indikator_nama ||
        "-",
    },
    {
      title: "Lokasi",
      key: "lokasi",
      width: 150,
      ellipsis: true,
      render: (_, record) =>
        record.lokasi ||
        record.opd?.bidang_opd ||
        record.opd?.sub_bidang_opd ||
        record.opd?.nama_opd ||
        record.nama_opd ||
        record.opd_penanggung_jawab ||
        record.bidang_opd_penanggung_jawab ||
        "-",
    },
    {
      title: "Target akhir",
      key: "target_akhir_renstra",
      width: 108,
      align: "right",
      render: (_, record) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(record.target_akhir_renstra)}
        </span>
      ),
    },
    {
      title: "Pagu akhir",
      key: "pagu_akhir_renstra",
      width: 120,
      align: "right",
      render: (_, record) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumberShort(record.pagu_akhir_renstra)}
        </span>
      ),
    },
    {
      title: "Pagu RPJMD",
      key: "pagu_rpjmd_acuan",
      width: 120,
      align: "right",
      render: (_, record) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumberShort(record.pagu_rpjmd_acuan)}
        </span>
      ),
    },
    {
      title: "Versi",
      dataIndex: "versi",
      key: "versi",
      width: 72,
      align: "center",
      render: (v) => v || 1,
    },
    {
      title: "Status",
      dataIndex: "status_revisi",
      key: "status_revisi",
      width: 112,
      align: "center",
      render: renderStatusRevisi,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 190,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/renstra/tabel/tujuan/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Button
            size="small"
            onClick={() => navigate(`/renstra/tabel/tujuan/history/${record.id}`)}
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

  return (
  <Card title="Renstra Tabel Tujuan" bodyStyle={cardBodyStyle}>
    <div style={pageStyle}>
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
          onClick={() => navigate("/renstra/tabel/tujuan/add")}
        >
          Tambah
        </Button>

        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target &amp; pagu periode (th. ke-1 s/d ke-5).
        </Text>
      </div>

      <div style={tableWrapperStyle}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          size="small"
          bordered
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
          scroll={{ x: "max-content" }}
          expandable={{
            expandRowByClick: true,
            expandedRowRender: (record) => <ExpandedRowDetail id={record.id} />,
            rowExpandable: () => true,
          }}
        />
      </div>
    </div>
  </Card>
);
};

export default RenstraTabelTujuanListPage;

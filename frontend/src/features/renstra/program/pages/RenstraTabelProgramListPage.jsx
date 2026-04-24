// src/features/renstra/program/pages/RenstraTabelProgramListPage.jsx
import React from "react";
import { Table, Button, Empty, Popconfirm, Typography } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import SpinnerFullscreen from "../components/RenstraTableSpinnerFullscreen";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
  renstraTabelListTableProps,
  renstraTabelListPageShellStyle,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const RenstraTabelProgramListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["renstra-tabel-program"],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-program");
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/renstra-tabel-program/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-program"]);
    },
  });

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
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
            onClick={() => navigate("/renstra/tabel/program/add")}
          >
            Tambah
          </Button>
        </div>
      </div>
    );

  const columns = [
    {
      title: "Kode",
      dataIndex: "kode_program",
      key: "kode_program",
      width: 96,
      ellipsis: true,
      fixed: "left",
    },
    {
      title: "Program",
      dataIndex: "nama_program",
      key: "nama_program",
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
      width: 120,
      ellipsis: true,
    },
    {
      title: "OPD PJ",
      dataIndex: "opd_penanggung_jawab",
      key: "opd_penanggung_jawab",
      width: 140,
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
            onClick={() => navigate(`/renstra/tabel/program/edit/${record.id}`)}
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
          onClick={() => navigate("/renstra/tabel/program/add")}
        >
          Tambah
        </Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target &amp; pagu periode (th. ke-1 s/d ke-6).
        </Text>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        {...renstraTabelListTableProps}
        scroll={{ x: 1250 }}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: (record) => (
            <StandardRenstraExpandedRow
              record={record}
              extraMeta={[
                {
                  label: "OPD penanggung jawab",
                  value: record.opd_penanggung_jawab,
                },
              ]}
            />
          ),
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default RenstraTabelProgramListPage;

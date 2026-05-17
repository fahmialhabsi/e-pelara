import React from "react";
import { Table, Button, Empty, Popconfirm, Typography, Card, Tag, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;
const ENDPOINT = "/renstra-tabel-strategi";
const QUERY_KEY = "renstra-tabel-strategi";

export default function RenstraTabelStrategiListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: renstraAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get(ENDPOINT, {
        params: { renstra_id: renstraAktif?.id },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!renstraAktif?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`${ENDPOINT}/${id}`),
    onSuccess: () => {
      message.success("Data strategi berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: () => message.error("Gagal menghapus data strategi"),
  });

  const columns = [
    {
      title: "Kode",
      dataIndex: "kode_strategi",
      key: "kode_strategi",
      width: 140,
      fixed: "left",
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Strategi",
      key: "strategi",
      width: 280,
      ellipsis: true,
      render: (_, record) =>
        record.deskripsi_strategi ||
        record.strategi?.deskripsi ||
        "-",
    },
    {
      title: "Indikator",
      key: "indikator",
      width: 260,
      ellipsis: true,
      render: (_, record) =>
        record.indikator_detail?.nama_indikator ||
        record.indikator ||
        "-",
    },
    {
      title: "Lokasi",
      key: "lokasi",
      width: 240,
      ellipsis: true,
      render: (_, record) =>
        record.lokasi ||
        record.renstra?.bidang_opd ||
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
      render: (value) => (
        <Tag color={value === "approved" ? "green" : value === "verifikasi" ? "blue" : value === "ditolak" ? "red" : "orange"}>
          {String(value || "draft").toUpperCase()}
        </Tag>
      ),
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
      width: 210,
      fixed: "right",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/renstra/tabel/strategi/edit/${record.id}`)}
          >
            Edit
          </Button>

          <Button
            size="small"
            onClick={() => navigate(`/renstra/tabel/strategi/history/${record.id}`)}
          >
            History
          </Button>

          <Popconfirm
            title="Hapus data strategi ini?"
            onConfirm={() => deleteMutation.mutate(record.id)}
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
    <Card title="Renstra Tabel Strategi">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <Button onClick={() => navigate("/dashboard-renstra")}>Kembali</Button>

        <Button
          type="primary"
          onClick={() => navigate("/renstra/tabel/strategi/add")}
        >
          Tambah
        </Button>

        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target dan pagu periode tahun ke-1 sampai ke-5.
        </Text>
      </div>

      {isLoading ? (
        <div>Memuat daftar...</div>
      ) : !data || data.length === 0 ? (
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
            expandedRowRender: (record) => (
              <StandardRenstraExpandedRow
                record={record}
                extraMeta={[
                  { label: "Lokasi", value: record.lokasi },
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
      )}
    </Card>
  );
}
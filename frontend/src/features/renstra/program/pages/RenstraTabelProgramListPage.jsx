import React from "react";
import {
  Table,
  Button,
  Empty,
  Popconfirm,
  Typography,
  Card,
  Tag,
  message,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const ENDPOINT = "/renstra-tabel-program";
const QUERY_KEY = "renstra-tabel-program";

const statusColor = {
  draft: "orange",
  verifikasi: "blue",
  approved: "green",
  ditolak: "red",
};

const wrapTextStyle = {
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: 1.5,
};

export default function RenstraTabelProgramListPage() {
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
      message.success("Data program berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      message.error(
        error?.response?.data?.message || "Gagal menghapus data program"
      );
    },
  });

  const columns = [
    {
      title: "Kode",
      key: "kode_program",
      width: 140,
      fixed: "left",
      ellipsis: true,
      render: (_, record) =>
        record.kode_program || record.program?.kode_program || "-",
    },
    {
      title: "Program",
      key: "program",
      width: 360,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.nama_program || record.program?.nama_program || "-"}
        </div>
      ),
    },
    {
      title: "Indikator",
      key: "indikator",
      width: 280,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.indikator_detail?.nama_indikator ||
            record.indikator ||
            "-"}
        </div>
      ),
    },
    {
      title: "Lokasi",
      key: "lokasi",
      width: 220,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.lokasi || record.renstra?.bidang_opd || "-"}
        </div>
      ),
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
        <Tag color={statusColor[value] || "orange"}>
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
      width: 230,
      fixed: "right",
      render: (_, record) => {
      const isApproved = record.status_revisi === "approved";

      return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!isApproved && (
            <Button
              size="small"
              type="primary"
              onClick={() =>
                navigate(`/renstra/tabel/program/edit/${record.id}`)
              }
            >
              Edit Draft
            </Button>
          )}

          {isApproved && (
            <Button
              size="small"
              type="dashed"
              style={{ borderColor: "#fa8c16", color: "#fa8c16" }}
              onClick={() =>
                navigate(`/renstra/tabel/program/edit/${record.id}`)
              }
            >
              Buat Revisi
            </Button>
          )}

          <Button
            size="small"
            onClick={() =>
              navigate(`/renstra/tabel/program/history/${record.id}`)
            }
          >
            History
          </Button>

          {!isApproved && (
            <Popconfirm
              title="Hapus data program ini?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Ya"
              cancelText="Batal"
            >
              <Button size="small" danger>
                Hapus
              </Button>
            </Popconfirm>
          )}
        </div>
      );
    },
    },
  ];

  return (
    <Card title="Renstra Tabel Program">
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
          onClick={() => navigate("/renstra/tabel/program/add")}
        >
          Tambah
        </Button>

        <Button onClick={() => navigate("/renstra/tabel/arah-kebijakan")}>
          Lihat Arah Kebijakan
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
          scroll={{ x: 1300 }}
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
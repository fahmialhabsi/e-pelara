// frontend/src/features/renstra/kebijakan/pages/RenstraTabelArahKebijakanHistoryPage.jsx
import React from "react";
import { Card, Button, Table, Tag, Typography, Descriptions } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

const { Text } = Typography;

const ENDPOINT = "/renstra-tabel-arah-kebijakan";
const LIST_PATH = "/renstra/tabel/arah-kebijakan";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const statusColor = {
  draft: "orange",
  verifikasi: "blue",
  approved: "green",
  ditolak: "red",
};

export default function RenstraTabelArahKebijakanHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-arah-kebijakan-detail", id],
    queryFn: async () => (await api.get(`${ENDPOINT}/${id}`)).data,
    enabled: !!id,
  });

  const { data: historyRows = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["renstra-tabel-arah-kebijakan-history", id],
    queryFn: async () => {
      const res = await api.get(`${ENDPOINT}/${id}/history`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!id,
  });

  const verifikasiMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`${ENDPOINT}/history/${historyId}/verifikasi`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-history", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-detail", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan"],
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`${ENDPOINT}/history/${historyId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-history", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-detail", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan"],
      });
    },
  });

  const tolakMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`${ENDPOINT}/history/${historyId}/tolak`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-history", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan-detail", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["renstra-tabel-arah-kebijakan"],
      });
    },
  });

  if (loadingDetail || loadingHistory) {
    return <div>Memuat riwayat revisi...</div>;
  }

  const columns = [
    {
      title: "Versi",
      width: 100,
      render: (_, row) => `${row.versi_sebelum} → ${row.versi_sesudah}`,
    },
    {
      title: "Status",
      dataIndex: "status_revisi",
      width: 120,
      render: (status) => (
        <Tag color={statusColor[status] || "default"}>
          {String(status || "-").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Pagu Sebelum",
      align: "right",
      render: (_, row) => formatCurrency(row.before_json?.pagu_akhir_renstra),
    },
    {
      title: "Pagu Setelah",
      align: "right",
      render: (_, row) => formatCurrency(row.after_json?.pagu_akhir_renstra),
    },
    {
      title: "Target Sebelum",
      align: "right",
      render: (_, row) => row.before_json?.target_akhir_renstra ?? "-",
    },
    {
      title: "Target Setelah",
      align: "right",
      render: (_, row) => row.after_json?.target_akhir_renstra ?? "-",
    },
    {
      title: "Dibuat",
      dataIndex: "dibuat_pada",
      width: 170,
    },
    {
      title: "Aksi",
      width: 260,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            size="small"
            disabled={row.status_revisi !== "draft"}
            loading={verifikasiMutation.isPending}
            onClick={() => verifikasiMutation.mutate(row.id)}
          >
            Verifikasi
          </Button>

          <Button
            size="small"
            type="primary"
            disabled={row.status_revisi !== "verifikasi"}
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate(row.id)}
          >
            Approve
          </Button>

          <Button
            size="small"
            danger
            disabled={!["draft", "verifikasi"].includes(row.status_revisi)}
            loading={tolakMutation.isPending}
            onClick={() => tolakMutation.mutate(row.id)}
          >
            Tolak
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card title="Riwayat Revisi Arah Kebijakan Renstra">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={() => navigate(LIST_PATH)}>Kembali</Button>

        <Button
          type="primary"
          disabled={detail?.status_revisi === "approved"}
          onClick={() => navigate(`${LIST_PATH}/edit/${id}`)}
        >
          Edit / Buat Revisi
        </Button>
      </div>

      <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Kode Arah Kebijakan">
          {detail?.kode_kebijakan || detail?.kebijakan?.kode_kebjkn || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Arah Kebijakan">
          {detail?.deskripsi_kebijakan || detail?.kebijakan?.deskripsi || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Indikator">
          {detail?.indikator_detail?.nama_indikator || detail?.indikator || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Pagu RPJMD Acuan">
          {formatCurrency(detail?.pagu_rpjmd_acuan)}
        </Descriptions.Item>

        <Descriptions.Item label="Pagu Renstra Aktif">
          {formatCurrency(detail?.pagu_akhir_renstra)}
        </Descriptions.Item>

        <Descriptions.Item label="Versi Aktif">
          {detail?.versi || 1}
        </Descriptions.Item>

        <Descriptions.Item label="Status Aktif">
          <Tag color={statusColor[detail?.status_revisi] || "default"}>
            {String(detail?.status_revisi || "draft").toUpperCase()}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      <Table
        rowKey="id"
        dataSource={historyRows}
        columns={columns}
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (row) => (
            <div>
              <p>
                <Text strong>Alasan Revisi:</Text>{" "}
                {row.alasan_revisi || "-"}
              </p>

              <Descriptions bordered size="small" column={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <React.Fragment key={i}>
                    <Descriptions.Item label={`Pagu Tahun ${i} Sebelum`}>
                      {formatCurrency(row.before_json?.[`pagu_tahun_${i}`])}
                    </Descriptions.Item>

                    <Descriptions.Item label={`Pagu Tahun ${i} Setelah`}>
                      {formatCurrency(row.after_json?.[`pagu_tahun_${i}`])}
                    </Descriptions.Item>

                    <Descriptions.Item label={`Target Tahun ${i} Sebelum`}>
                      {row.before_json?.[`target_tahun_${i}`] ?? "-"}
                    </Descriptions.Item>

                    <Descriptions.Item label={`Target Tahun ${i} Setelah`}>
                      {row.after_json?.[`target_tahun_${i}`] ?? "-"}
                    </Descriptions.Item>
                  </React.Fragment>
                ))}
              </Descriptions>
            </div>
          ),
        }}
      />
    </Card>
  );
}
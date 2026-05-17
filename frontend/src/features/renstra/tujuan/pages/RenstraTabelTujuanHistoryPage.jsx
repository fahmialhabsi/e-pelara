import React from "react";
import { Card, Button, Table, Tag, Typography, Descriptions } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import SpinnerFullscreen from "../components/SpinnerTujuanFullscreen";

const { Text } = Typography;

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

const RenstraTabelTujuanHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-tujuan", id],
    queryFn: async () => (await api.get(`/renstra-tabel-tujuan/${id}`)).data,
    enabled: !!id,
  });

  const { data: historyRows = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["renstra-tabel-tujuan-history", id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-tujuan/${id}/history`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!id,
  });

  const verifikasiMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`/renstra-tabel-tujuan/history/${historyId}/verifikasi`),
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-tujuan-history", id]);
      queryClient.invalidateQueries(["renstra-tabel-tujuan", id]);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`/renstra-tabel-tujuan/history/${historyId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-tujuan-history", id]);
      queryClient.invalidateQueries(["renstra-tabel-tujuan", id]);
      queryClient.invalidateQueries(["renstra-tabel-tujuan"]);
    },
  });

  const tolakMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(`/renstra-tabel-tujuan/history/${historyId}/tolak`),
    onSuccess: () => {
      queryClient.invalidateQueries(["renstra-tabel-tujuan-history", id]);
      queryClient.invalidateQueries(["renstra-tabel-tujuan", id]);
    },
  });

  if (loadingDetail || loadingHistory) {
    return <SpinnerFullscreen tip="Memuat riwayat revisi..." />;
  }

  const columns = [
    {
      title: "Versi",
      key: "versi",
      width: 100,
      render: (_, row) => `${row.versi_sebelum} → ${row.versi_sesudah}`,
    },
    {
      title: "Status",
      dataIndex: "status_revisi",
      key: "status_revisi",
      width: 120,
      render: (status) => (
        <Tag color={statusColor[status] || "default"}>
          {String(status || "-").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Pagu Sebelum",
      key: "pagu_before",
      align: "right",
      render: (_, row) => formatCurrency(row.before_json?.pagu_akhir_renstra),
    },
    {
      title: "Pagu Setelah",
      key: "pagu_after",
      align: "right",
      render: (_, row) => formatCurrency(row.after_json?.pagu_akhir_renstra),
    },
    {
      title: "Target Sebelum",
      key: "target_before",
      align: "right",
      render: (_, row) => row.before_json?.target_akhir_renstra ?? "-",
    },
    {
      title: "Target Setelah",
      key: "target_after",
      align: "right",
      render: (_, row) => row.after_json?.target_akhir_renstra ?? "-",
    },
    {
      title: "Dibuat",
      dataIndex: "dibuat_pada",
      key: "dibuat_pada",
      width: 170,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 260,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            size="small"
            disabled={row.status_revisi !== "draft"}
            loading={verifikasiMutation.isLoading}
            onClick={() => verifikasiMutation.mutate(row.id)}
          >
            Verifikasi
          </Button>

          <Button
            size="small"
            type="primary"
            disabled={row.status_revisi !== "verifikasi"}
            loading={approveMutation.isLoading}
            onClick={() => approveMutation.mutate(row.id)}
          >
            Approve
          </Button>

          <Button
            size="small"
            danger
            disabled={!["draft", "verifikasi"].includes(row.status_revisi)}
            loading={tolakMutation.isLoading}
            onClick={() => tolakMutation.mutate(row.id)}
          >
            Tolak
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card title="Riwayat Revisi Tujuan Renstra">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={() => navigate("/renstra/tabel/tujuan")}>
          Kembali
        </Button>
        <Button
          type="primary"
          onClick={() => navigate(`/renstra/tabel/tujuan/edit/${id}`)}
        >
          Edit / Buat Revisi
        </Button>
      </div>

      <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Kode Tujuan">
          {detail?.kode_tujuan || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Nama Tujuan">
          {detail?.nama_tujuan || "-"}
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
        expandable={{
          expandedRowRender: (row) => (
            <div>
              <p>
                <Text strong>Alasan Revisi:</Text>{" "}
                {row.alasan_revisi || "-"}
              </p>

              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Pagu Tahun 1 Sebelum">
                  {formatCurrency(row.before_json?.pagu_tahun_1)}
                </Descriptions.Item>
                <Descriptions.Item label="Pagu Tahun 1 Setelah">
                  {formatCurrency(row.after_json?.pagu_tahun_1)}
                </Descriptions.Item>

                <Descriptions.Item label="Pagu Tahun 2 Sebelum">
                  {formatCurrency(row.before_json?.pagu_tahun_2)}
                </Descriptions.Item>
                <Descriptions.Item label="Pagu Tahun 2 Setelah">
                  {formatCurrency(row.after_json?.pagu_tahun_2)}
                </Descriptions.Item>

                <Descriptions.Item label="Pagu Tahun 3 Sebelum">
                  {formatCurrency(row.before_json?.pagu_tahun_3)}
                </Descriptions.Item>
                <Descriptions.Item label="Pagu Tahun 3 Setelah">
                  {formatCurrency(row.after_json?.pagu_tahun_3)}
                </Descriptions.Item>

                <Descriptions.Item label="Pagu Tahun 4 Sebelum">
                  {formatCurrency(row.before_json?.pagu_tahun_4)}
                </Descriptions.Item>
                <Descriptions.Item label="Pagu Tahun 4 Setelah">
                  {formatCurrency(row.after_json?.pagu_tahun_4)}
                </Descriptions.Item>

                <Descriptions.Item label="Pagu Tahun 5 Sebelum">
                  {formatCurrency(row.before_json?.pagu_tahun_5)}
                </Descriptions.Item>
                <Descriptions.Item label="Pagu Tahun 5 Setelah">
                  {formatCurrency(row.after_json?.pagu_tahun_5)}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ),
        }}
      />
    </Card>
  );
};

export default RenstraTabelTujuanHistoryPage;
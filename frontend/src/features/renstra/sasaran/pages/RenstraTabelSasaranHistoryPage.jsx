// src/features/renstra/sasaran/pages/RenstraTabelSasaranHistoryPage.jsx
import React from "react";
import { Card, Button, Table, Tag, Typography, Descriptions } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import SpinnerFullscreen from "../components/SpinnerSasaranFullscreen";

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

const RenstraTabelSasaranHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // =========================
  // DETAIL DATA UTAMA
  // =========================
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["renstra-tabel-sasaran", id],
    queryFn: async () =>
      (await api.get(`/renstra-tabel-sasaran/${id}`)).data,
    enabled: !!id,
  });

  // =========================
  // HISTORY
  // =========================
  const { data: historyRows = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["renstra-tabel-sasaran-history", id],
    queryFn: async () => {
      const res = await api.get(
        `/renstra-tabel-sasaran/${id}/history`
      );
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!id,
  });

  // =========================
  // MUTATIONS
  // =========================
  const verifikasiMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(
        `/renstra-tabel-sasaran/history/${historyId}/verifikasi`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran-history",
        id,
      ]);
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran",
        id,
      ]);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(
        `/renstra-tabel-sasaran/history/${historyId}/approve`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran-history",
        id,
      ]);
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran",
        id,
      ]);
      queryClient.invalidateQueries(["renstra-tabel-sasaran"]);
    },
  });

  const tolakMutation = useMutation({
    mutationFn: async (historyId) =>
      api.patch(
        `/renstra-tabel-sasaran/history/${historyId}/tolak`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran-history",
        id,
      ]);
      queryClient.invalidateQueries([
        "renstra-tabel-sasaran",
        id,
      ]);
    },
  });

  if (loadingDetail || loadingHistory) {
    return <SpinnerFullscreen tip="Memuat riwayat revisi..." />;
  }

  // =========================
  // COLUMNS
  // =========================
  const columns = [
    {
      title: "Versi",
      width: 100,
      render: (_, row) =>
        `${row.versi_sebelum} → ${row.versi_sesudah}`,
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
      render: (_, row) =>
        formatCurrency(row.before_json?.pagu_akhir_renstra),
    },
    {
      title: "Pagu Setelah",
      align: "right",
      render: (_, row) =>
        formatCurrency(row.after_json?.pagu_akhir_renstra),
    },
    {
      title: "Target Sebelum",
      align: "right",
      render: (_, row) =>
        row.before_json?.target_akhir_renstra ?? "-",
    },
    {
      title: "Target Setelah",
      align: "right",
      render: (_, row) =>
        row.after_json?.target_akhir_renstra ?? "-",
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
    <Card title="Riwayat Revisi Sasaran Renstra">
      {/* NAV */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={() => navigate("/renstra/tabel/sasaran")}>
          Kembali
        </Button>

        <Button
          type="primary"
          onClick={() =>
            navigate(`/renstra/tabel/sasaran/edit/${id}`)
          }
        >
          Edit / Buat Revisi
        </Button>
      </div>

      {/* DETAIL */}
      <Descriptions
        bordered
        size="small"
        column={1}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="Kode Sasaran">
          {detail?.kode_sasaran || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Nama Sasaran">
          {detail?.nama_sasaran || "-"}
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

      {/* TABLE */}
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
                {[1, 2, 3, 4, 5].map((i) => (
                  <React.Fragment key={i}>
                    <Descriptions.Item
                      label={`Pagu Tahun ${i} Sebelum`}
                    >
                      {formatCurrency(
                        row.before_json?.[`pagu_tahun_${i}`]
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item
                      label={`Pagu Tahun ${i} Setelah`}
                    >
                      {formatCurrency(
                        row.after_json?.[`pagu_tahun_${i}`]
                      )}
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
};

export default RenstraTabelSasaranHistoryPage;
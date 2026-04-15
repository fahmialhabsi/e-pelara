import React from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Spin,
  Empty,
  Typography,
  Tag,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
  renstraTabelListTableProps,
  renstraTabelListPageShellStyle,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const RenstraTabelStrategiKebijakanListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: renstraAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["renstra-tabel-strategi-kebijakan", renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-strategi-kebijakan", {
        params: { renstra_id: renstraAktif.id },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!renstraAktif?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-tabel-strategi-kebijakan/${id}`),
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries(["renstra-tabel-strategi-kebijakan"]);
    },
    onError: () => message.error("Gagal menghapus data"),
  });

  const columns = [
    {
      title: "Strategi",
      key: "strategi",
      width: 200,
      ellipsis: true,
      render: (_, r) => (
        <div>
          <Tag color="blue">{r.kode_strategi}</Tag>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
            {r.deskripsi_strategi}
          </div>
        </div>
      ),
    },
    {
      title: "Kebijakan",
      key: "kebijakan",
      width: 200,
      ellipsis: true,
      render: (_, r) => (
        <div>
          <Tag color="green">{r.kode_kebijakan}</Tag>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
            {r.deskripsi_kebijakan}
          </div>
        </div>
      ),
    },
    {
      title: "Indikator",
      dataIndex: "indikator",
      key: "indikator",
      width: 180,
      ellipsis: true,
    },
    {
      title: "Target akhir",
      dataIndex: "target_akhir_renstra",
      key: "target_akhir",
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
      key: "pagu",
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
      render: (_, r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            size="small"
            type="primary"
            onClick={() =>
              navigate(`/renstra/tabel/strategi-kebijakan/edit/${r.id}`)
            }
          >
            Edit
          </Button>
          <Popconfirm
            title="Hapus data ini?"
            onConfirm={() => deleteMutation.mutate(r.id)}
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
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Tabel Strategi &amp; Arah Kebijakan
      </Typography.Title>
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
          onClick={() => navigate("/renstra/tabel/strategi-kebijakan/add")}
        >
          Tambah
        </Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target &amp; pagu per tahun (1–6).
        </Text>
      </div>

      {isLoading ? (
        <Spin tip="Memuat data..." />
      ) : data.length === 0 ? (
        <Empty description="Belum ada data Tabel Strategi & Kebijakan" />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          {...renstraTabelListTableProps}
          scroll={{ x: 1180 }}
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
    </div>
  );
};

export default RenstraTabelStrategiKebijakanListPage;

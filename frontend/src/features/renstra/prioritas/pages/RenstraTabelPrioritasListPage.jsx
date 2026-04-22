// Generic list page — jenis (nasional/daerah/gubernur) dari URL param
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
import { useNavigate, useParams } from "react-router-dom";
import api from "@/services/api";
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
  renstraTabelListTableProps,
  renstraTabelListPageShellStyle,
} from "@/features/renstra/shared/components/RenstraTabelListCommon";

const { Text } = Typography;

const JENIS_META = {
  nasional: { label: "Prioritas Nasional", color: "red", icon: "🇮🇩" },
  daerah: { label: "Prioritas Daerah", color: "orange", icon: "🏛️" },
  gubernur: { label: "Prioritas Gubernur", color: "purple", icon: "👤" },
};

const RenstraTabelPrioritasListPage = () => {
  const navigate = useNavigate();
  const { jenis = "nasional" } = useParams();
  const queryClient = useQueryClient();
  const meta = JENIS_META[jenis] || JENIS_META.nasional;

  const { data: renstraAktif } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => (await api.get("/renstra-opd/aktif")).data.data,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["renstra-tabel-prioritas", renstraAktif?.id, jenis],
    queryFn: async () => {
      const res = await api.get("/renstra-tabel-prioritas", {
        params: { renstra_id: renstraAktif.id, jenis_prioritas: jenis },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!renstraAktif?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-tabel-prioritas/${id}`),
    onSuccess: () => {
      message.success("Data berhasil dihapus");
      queryClient.invalidateQueries(["renstra-tabel-prioritas"]);
    },
    onError: () => message.error("Gagal menghapus data"),
  });

  const columns = [
    {
      title: "Prioritas",
      key: "nama",
      width: 260,
      ellipsis: true,
      render: (_, r) => (
        <div>
          {r.kode_prioritas && (
            <Tag color={meta.color}>{r.kode_prioritas}</Tag>
          )}
          <div style={{ marginTop: 4 }}>{r.nama_prioritas}</div>
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
      title: "Lokasi",
      dataIndex: "lokasi",
      key: "lokasi",
      width: 130,
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
              navigate(`/renstra/tabel/prioritas/${jenis}/edit/${r.id}`)
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
        {meta.icon} Tabel {meta.label}
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
          onClick={() => navigate(`/renstra/tabel/prioritas/${jenis}/add`)}
        >
          Tambah
        </Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target &amp; pagu periode (th. ke-1 s/d ke-6).
        </Text>
      </div>

      {isLoading ? (
        <Spin tip="Memuat data..." />
      ) : data.length === 0 ? (
        <Empty description={`Belum ada data ${meta.label}`} />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          {...renstraTabelListTableProps}
          scroll={{ x: 1100 }}
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
                  {
                    label: "Program terkait",
                    value: record.program_terkait,
                  },
                  {
                    label: "Kegiatan terkait",
                    value: record.kegiatan_terkait,
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

export default RenstraTabelPrioritasListPage;

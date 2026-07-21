// frontend/src/pages/mr/MrPlanningLhpListPage.jsx
// Modul TLHP — Daftar Laporan Hasil Pemeriksaan (LHP)

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, FileTextOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningLhpService, { MR_PLANNING_LHP_QUERY_KEYS } from "@/services/mrPlanningLhpService";

const { Title, Text } = Typography;

const safeText = (value, fallback = "-") => (value === undefined || value === null || value === "" ? fallback : String(value));

const STATUS_COLOR = { draft: "default", aktif: "processing", diarsipkan: "success" };
const STATUS_LABEL = { draft: "Draft", aktif: "Aktif", diarsipkan: "Diarsipkan" };

export default function MrPlanningLhpListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState({ tahun: "", status_dokumen: "" });
  const [search, setSearch] = React.useState("");

  const { data: allData = [], isFetching, refetch } = useQuery({
    queryKey: MR_PLANNING_LHP_QUERY_KEYS.list(filters),
    queryFn: () => mrPlanningLhpService.getAll(filters),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => mrPlanningLhpService.activate(id),
    onSuccess: () => {
      message.success("LHP berhasil diaktifkan — Temuan sudah bisa dibuat di bawahnya.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
    },
    onError: (error) => message.error(error?.response?.data?.message || "Gagal mengaktifkan LHP."),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => mrPlanningLhpService.archive(id),
    onSuccess: () => {
      message.success("LHP berhasil diarsipkan.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
    },
    onError: (error) => message.error(error?.response?.data?.message || "Gagal mengarsipkan LHP."),
  });

  const rows = allData.filter((r) => {
    if (!search) return true;
    const haystack = `${r.nomor_lhp} ${r.judul_lhp} ${r.entitas_pemeriksa}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, i) => i + 1 },
    { title: "Nomor LHP", dataIndex: "nomor_lhp", render: (v) => safeText(v) },
    { title: "Judul", dataIndex: "judul_lhp", render: (v) => safeText(v) },
    { title: "Entitas", dataIndex: "entitas_pemeriksa", width: 130, render: (v) => safeText(v) },
    { title: "Tahun", dataIndex: "tahun", width: 80, align: "center" },
    { title: "Jml Temuan", dataIndex: "jumlah_temuan", width: 100, align: "center" },
    { title: "Jml Rekomendasi", dataIndex: "jumlah_rekomendasi", width: 120, align: "center" },
    {
      title: "Status",
      dataIndex: "status_dokumen",
      width: 110,
      align: "center",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Aksi",
      width: 320,
      align: "center",
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" disabled={record.status_dokumen !== "draft"} onClick={() => navigate(`/mr/planning-lhp/edit/${record.id}`)}>
            Ubah
          </Button>
          <Button size="small" disabled={record.status_dokumen !== "draft"} loading={activateMutation.isPending} onClick={() => activateMutation.mutate(record.id)}>
            Aktifkan
          </Button>
          <Button size="small" disabled={record.status_dokumen !== "aktif"} loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate(record.id)}>
            Arsipkan
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FileTextOutlined />}
            disabled={record.status_dokumen === "draft"}
            onClick={() => navigate(`/mr/planning-lhp/${record.id}/temuan`)}
          >
            Temuan
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            Laporan Hasil Pemeriksaan (LHP)
          </Title>
          <Text type="secondary">Pengelolaan Tindak Lanjut Temuan Inspektorat, BPK, dan BPKP</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/mr/planning-lhp/create")}>
              Tambah LHP
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Space wrap>
          <Input.Search placeholder="Cari nomor/judul LHP..." allowClear style={{ width: 260 }} onSearch={setSearch} onChange={(e) => !e.target.value && setSearch("")} />
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            value={filters.status_dokumen || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, status_dokumen: v || "" }))}
            options={[
              { value: "draft", label: "Draft" },
              { value: "aktif", label: "Aktif" },
              { value: "diarsipkan", label: "Diarsipkan" },
            ]}
          />
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={isFetching} scroll={{ x: 1100 }} />
      </Card>
    </Space>
  );
}

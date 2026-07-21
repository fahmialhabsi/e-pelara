// frontend/src/pages/mr/MrPlanningTemuanListPage.jsx
// Modul TLHP — Daftar Temuan di bawah satu LHP

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Row, Space, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import mrPlanningLhpService, { MR_PLANNING_LHP_QUERY_KEYS } from "@/services/mrPlanningLhpService";
import mrPlanningTemuanService, { MR_PLANNING_TEMUAN_QUERY_KEYS } from "@/services/mrPlanningTemuanService";

const { Title, Text } = Typography;

const safeText = (value, fallback = "-") => (value === undefined || value === null || value === "" ? fallback : String(value));

const STATUS_COLOR = { draft: "default", verifikasi: "processing", approved: "success", ditolak: "error" };
const STATUS_LABEL = { draft: "Draft", verifikasi: "Dalam Verifikasi", approved: "Disetujui", ditolak: "Ditolak" };

export default function MrPlanningTemuanListPage() {
  const { lhpId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data: lhp } = useQuery({
    queryKey: MR_PLANNING_LHP_QUERY_KEYS.detail(lhpId),
    queryFn: () => mrPlanningLhpService.getById(lhpId),
    enabled: Boolean(lhpId),
  });

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.byLhp(lhpId),
    queryFn: () => mrPlanningTemuanService.getByLhp(lhpId),
    enabled: Boolean(lhpId),
  });

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, i) => i + 1 },
    { title: "Kode Temuan", dataIndex: "kode_temuan", width: 220, render: (v) => safeText(v) },
    { title: "Judul Temuan", dataIndex: "judul_temuan", render: (v) => safeText(v) },
    { title: "Kategori", dataIndex: "kategori_temuan", width: 150, render: (v) => safeText(v) },
    { title: "Jml Rekomendasi", width: 90, align: "center", render: (_, r) => `${r.jumlah_rekomendasi_selesai || 0}/${r.jumlah_rekomendasi || 0}` },
    { title: "Status Rollup", dataIndex: "status_rollup", width: 140, render: (v) => safeText(v, "Belum Ditindaklanjuti") },
    {
      title: "Status Approval",
      dataIndex: "status_revisi",
      width: 130,
      align: "center",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Eskalasi Risk",
      dataIndex: "risk_escalation_status",
      width: 110,
      align: "center",
      render: (v) => <Tag color={v === "risk_created" ? "success" : "default"}>{v === "risk_created" ? "Sudah" : "Belum"}</Tag>,
    },
    {
      title: "Aksi",
      width: 220,
      align: "center",
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => navigate(`/mr/planning-temuan/edit/${record.id}`)}>
            Ubah
          </Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => navigate(`/mr/planning-temuan/${record.id}/history`)}>
            History
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
            Temuan — {safeText(lhp?.nomor_lhp)}
          </Title>
          <Text type="secondary">{safeText(lhp?.judul_lhp)}</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/mr/planning-lhp")}>
              Kembali
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (lhp?.status_dokumen !== "aktif") {
                  message.warning("LHP harus berstatus Aktif sebelum bisa menambah Temuan.");
                  return;
                }
                navigate(`/mr/planning-lhp/${lhpId}/temuan/create`);
              }}
            >
              Tambah Temuan
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={isFetching} scroll={{ x: 1200 }} />
      </Card>
    </Space>
  );
}

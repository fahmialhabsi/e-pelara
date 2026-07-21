// frontend/src/pages/mr/MrPlanningTemuanHistoryPage.jsx
// Modul TLHP — Riwayat & Approval Temuan (draft -> verifikasi -> approved/ditolak)

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Input, Modal, Row, Space, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningTemuanService, { MR_PLANNING_TEMUAN_QUERY_KEYS } from "@/services/mrPlanningTemuanService";

const { Title, Text } = Typography;

const STATUS_COLOR = { draft: "default", verifikasi: "processing", approved: "success", ditolak: "error" };
const STATUS_LABEL = { draft: "Draft", verifikasi: "Dalam Verifikasi", approved: "Disetujui", ditolak: "Ditolak" };

const getBackendErrorMessage = (error) => error?.response?.data?.message || error?.message || "Aksi belum dapat dilakukan.";

export default function MrPlanningTemuanHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const { data: temuan } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(id),
    queryFn: () => mrPlanningTemuanService.getById(id),
  });

  const { data: histories = [], isFetching, refetch } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.history(id),
    queryFn: () => mrPlanningTemuanService.getHistory(id),
  });

  const invalidate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(id) });
  };

  const verifikasiMutation = useMutation({
    mutationFn: (historyId) => mrPlanningTemuanService.verifikasiHistory(historyId),
    onSuccess: () => {
      message.success("Berhasil diverifikasi.");
      invalidate();
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const approveMutation = useMutation({
    mutationFn: (historyId) => mrPlanningTemuanService.approveHistory(historyId),
    onSuccess: () => {
      message.success("Temuan berhasil disetujui.");
      invalidate();
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const tolakMutation = useMutation({
    mutationFn: ({ historyId, alasan_revisi }) => mrPlanningTemuanService.tolakHistory(historyId, { alasan_revisi }),
    onSuccess: () => {
      message.success("Berhasil ditolak.");
      setRejectTarget(null);
      setRejectReason("");
      invalidate();
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const columns = [
    { title: "ID History", dataIndex: "id", width: 90 },
    { title: "Versi", render: (_, r) => `${r.versi_sebelum ?? "-"} → ${r.versi_sesudah ?? "-"}`, width: 100 },
    {
      title: "Status",
      dataIndex: "status_revisi",
      width: 130,
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    { title: "Alasan", dataIndex: "alasan_revisi", render: (v) => v || "-" },
    { title: "Dibuat Pada", dataIndex: "dibuat_pada", width: 160, render: (v) => (v ? new Date(v).toLocaleString("id-ID") : "-") },
    {
      title: "Aksi",
      width: 260,
      render: (_, record) => (
        <Space size="small">
          {record.status_revisi === "draft" && (
            <Button size="small" icon={<SendOutlined />} loading={verifikasiMutation.isPending} onClick={() => verifikasiMutation.mutate(record.id)}>
              Verifikasi
            </Button>
          )}
          {record.status_revisi === "verifikasi" && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} loading={approveMutation.isPending} onClick={() => approveMutation.mutate(record.id)}>
                Setujui
              </Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => setRejectTarget(record.id)}>
                Tolak
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            Riwayat Approval Temuan
          </Title>
          <Text type="secondary">{temuan?.kode_temuan} — {temuan?.judul_temuan}</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/mr/planning-temuan/edit/${id}`)}>
            Kembali ke Temuan
          </Button>
        </Col>
      </Row>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={histories} loading={isFetching} scroll={{ x: 900 }} />
      </Card>

      <Modal
        title="Tolak History"
        open={Boolean(rejectTarget)}
        onCancel={() => setRejectTarget(null)}
        onOk={() => {
          if (!rejectReason.trim()) {
            message.warning("Alasan penolakan wajib diisi.");
            return;
          }
          tolakMutation.mutate({ historyId: rejectTarget, alasan_revisi: rejectReason });
        }}
        confirmLoading={tolakMutation.isPending}
      >
        <Input.TextArea rows={3} placeholder="Alasan penolakan" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      </Modal>
    </Space>
  );
}

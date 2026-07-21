// frontend/src/pages/mr/MrPlanningTindakLanjutListPage.jsx
// Modul TLHP — Daftar entri Tindak Lanjut (pemantauan periodik) per Rekomendasi

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Modal, Row, Select, Space, Table, Tag, Typography, Upload } from "antd";
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningTemuanService, { MR_PLANNING_TEMUAN_QUERY_KEYS } from "@/services/mrPlanningTemuanService";
import mrPlanningTindakLanjutService, {
  MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS,
} from "@/services/mrPlanningTindakLanjutService";

const { Title, Text } = Typography;

const safeText = (value, fallback = "-") => (value === undefined || value === null || value === "" ? fallback : String(value));

const getBackendErrorMessage = (error) => error?.response?.data?.message || error?.message || "Aksi belum dapat dilakukan.";

const DOCUMENT_TYPE_OPTIONS = [
  { value: "BUKTI_SETORAN", label: "Bukti Setoran" },
  { value: "SURAT_PERTANGGUNGJAWABAN", label: "Surat Pertanggungjawaban" },
  { value: "BERITA_ACARA_TINDAK_LANJUT", label: "Berita Acara Tindak Lanjut" },
  { value: "SK_PENERAPAN", label: "SK Penerapan" },
  { value: "DOKUMEN_PENDUKUNG_LAINNYA", label: "Dokumen Pendukung Lainnya" },
];

export default function MrPlanningTindakLanjutListPage() {
  const { temuanId, rekomendasiId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [uploadTarget, setUploadTarget] = React.useState(null);
  const [uploadDocType, setUploadDocType] = React.useState("BUKTI_SETORAN");
  const [uploadFile, setUploadFile] = React.useState(null);

  const { data: temuan } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(temuanId),
    queryFn: () => mrPlanningTemuanService.getById(temuanId),
    enabled: Boolean(temuanId),
  });

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS.byRekomendasi(rekomendasiId),
    queryFn: () => mrPlanningTindakLanjutService.getByRekomendasi(rekomendasiId),
    enabled: Boolean(rekomendasiId),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ tindakLanjutId, payload }) => mrPlanningTindakLanjutService.uploadDocument(tindakLanjutId, payload),
    onSuccess: () => {
      message.success("Bukti dukung berhasil diunggah.");
      setUploadTarget(null);
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS.byRekomendasi(rekomendasiId) });
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const rekomendasi = rows[0]?.rekomendasi;

  const columns = [
    { title: "Tanggal Pemantauan", dataIndex: "tanggal_pemantauan", width: 140 },
    { title: "Uraian Tindak Lanjut", dataIndex: "uraian_tindak_lanjut" },
    { title: "Status", dataIndex: "status_tindak_lanjut", width: 180, render: (v) => <Tag color={v === "Sesuai/Selesai" ? "success" : "processing"}>{safeText(v)}</Tag> },
    { title: "% Selesai", dataIndex: "persentase_penyelesaian", width: 90, align: "center", render: (v) => `${v || 0}%` },
    { title: "Nilai Setoran (Rp)", dataIndex: "nilai_setoran_rupiah", width: 140, render: (v) => (v ? Number(v).toLocaleString("id-ID") : "-") },
    {
      title: "Status Approval",
      dataIndex: "status_revisi",
      width: 120,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Aksi",
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => navigate(`/mr/planning-tindak-lanjut/edit/${record.id}`)}>
            Ubah
          </Button>
          <Button size="small" icon={<UploadOutlined />} onClick={() => setUploadTarget(record.id)}>
            Bukti Dukung
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
            Tindak Lanjut — {safeText(rekomendasi?.nomor_rekomendasi)}
          </Title>
          <Text type="secondary">Temuan: {safeText(temuan?.kode_temuan)} — {safeText(temuan?.judul_temuan)}</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/mr/planning-temuan/edit/${temuanId}`)}>
              Kembali
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/mr/planning-tindak-lanjut/create/${rekomendasiId}`)}>
              Tambah Pemantauan
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={isFetching} scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title="Unggah Bukti Dukung"
        open={Boolean(uploadTarget)}
        onCancel={() => setUploadTarget(null)}
        onOk={() => {
          if (!uploadFile) {
            message.warning("Pilih berkas terlebih dahulu.");
            return;
          }
          uploadMutation.mutate({
            tindakLanjutId: uploadTarget,
            payload: { file: uploadFile, document_type: uploadDocType, document_title: DOCUMENT_TYPE_OPTIONS.find((o) => o.value === uploadDocType)?.label },
          });
        }}
        confirmLoading={uploadMutation.isPending}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select style={{ width: "100%" }} value={uploadDocType} onChange={setUploadDocType} options={DOCUMENT_TYPE_OPTIONS} />
          <Upload beforeUpload={() => false} maxCount={1} onChange={({ fileList }) => setUploadFile(fileList[0]?.originFileObj || fileList[0] || null)}>
            <Button icon={<UploadOutlined />}>Pilih Berkas</Button>
          </Upload>
        </Space>
      </Modal>
    </Space>
  );
}

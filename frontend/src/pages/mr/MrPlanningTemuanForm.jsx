// frontend/src/pages/mr/MrPlanningTemuanForm.jsx
// Modul TLHP — Form Temuan + Rekomendasi bertingkat + Eskalasi ke Risk Register

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, HistoryOutlined, PlusOutlined, SaveOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningLhpService, { MR_PLANNING_LHP_QUERY_KEYS } from "@/services/mrPlanningLhpService";
import mrPlanningTemuanService, { MR_PLANNING_TEMUAN_QUERY_KEYS } from "@/services/mrPlanningTemuanService";
import mrPlanningRiskService from "@/services/mrPlanningRiskService";

const { Title, Text } = Typography;

const safeText = (value, fallback = "-") => (value === undefined || value === null || value === "" ? fallback : String(value));

const getBackendErrorMessage = (error) => error?.response?.data?.message || error?.message || "Data Temuan belum dapat disimpan.";

// getReferenceItemsByGroup mengembalikan amplop {success, message, data, meta} apa adanya,
// jadi array item aslinya harus dibongkar dari response.data (bukan response itu sendiri).
const getRefRows = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const getRefOptions = (response) => getRefRows(response).map((item) => ({ value: item.id, label: item.nama_item }));

const STATUS_COLOR = { draft: "default", verifikasi: "processing", approved: "success", ditolak: "error" };
const STATUS_LABEL = { draft: "Draft", verifikasi: "Dalam Verifikasi", approved: "Disetujui", ditolak: "Ditolak" };

export default function MrPlanningTemuanForm() {
  const { lhpId, id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [rekomendasiForm] = Form.useForm();
  const [escalateForm] = Form.useForm();

  const [isRekomendasiModalOpen, setRekomendasiModalOpen] = React.useState(false);
  const [editingRekomendasi, setEditingRekomendasi] = React.useState(null);
  const [isEscalateModalOpen, setEscalateModalOpen] = React.useState(false);

  const { data: temuan, isLoading } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(id),
    queryFn: () => mrPlanningTemuanService.getById(id),
    enabled: isEdit,
  });

  const effectiveLhpId = lhpId || temuan?.mr_planning_lhp_id;

  const { data: lhp } = useQuery({
    queryKey: MR_PLANNING_LHP_QUERY_KEYS.detail(effectiveLhpId),
    queryFn: () => mrPlanningLhpService.getById(effectiveLhpId),
    enabled: Boolean(effectiveLhpId),
  });

  const { data: rekomendasiRows = [], refetch: refetchRekomendasi } = useQuery({
    queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.rekomendasi(id),
    queryFn: () => mrPlanningTemuanService.getRekomendasiList(id),
    enabled: isEdit,
  });

  const { data: kategoriItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "MR_TLHP_KATEGORI_TEMUAN"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("MR_TLHP_KATEGORI_TEMUAN"),
  });

  const { data: likelihoodItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "LIKELIHOOD"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("LIKELIHOOD"),
    enabled: isEscalateModalOpen,
  });

  const { data: impactItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "IMPACT"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("IMPACT"),
    enabled: isEscalateModalOpen,
  });

  React.useEffect(() => {
    if (temuan) form.setFieldsValue(temuan);
  }, [temuan, form]);

  const isDraftOrRejected = !isEdit || ["draft", "ditolak"].includes(temuan?.status_revisi);

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? mrPlanningTemuanService.update(id, payload) : mrPlanningTemuanService.createFromLhp(lhpId, payload)),
    onSuccess: (data) => {
      message.success(isEdit ? "Temuan berhasil diperbarui." : "Temuan berhasil dibuat.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
      if (!isEdit && data?.id) navigate(`/mr/planning-temuan/edit/${data.id}`);
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const submitMutation = useMutation({
    mutationFn: () => mrPlanningTemuanService.submit(id),
    onSuccess: () => {
      message.success("Temuan berhasil diajukan untuk verifikasi.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(id) });
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const rekomendasiMutation = useMutation({
    mutationFn: ({ rekomendasiId, payload }) =>
      rekomendasiId ? mrPlanningTemuanService.updateRekomendasi(rekomendasiId, payload) : mrPlanningTemuanService.createRekomendasi(id, payload),
    onSuccess: () => {
      message.success("Rekomendasi berhasil disimpan.");
      refetchRekomendasi();
      setRekomendasiModalOpen(false);
      rekomendasiForm.resetFields();
      setEditingRekomendasi(null);
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const escalateMutation = useMutation({
    mutationFn: (payload) => mrPlanningTemuanService.escalateToRisk(id, payload),
    onSuccess: () => {
      message.success("Temuan berhasil dieskalasi menjadi Risk di Risk Register.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_TEMUAN_QUERY_KEYS.detail(id) });
      setEscalateModalOpen(false);
      escalateForm.resetFields();
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    saveMutation.mutate(values);
  };

  const rekomendasiColumns = [
    { title: "No", dataIndex: "nomor_rekomendasi", width: 70 },
    { title: "Uraian Rekomendasi", dataIndex: "uraian_rekomendasi" },
    { title: "PIC", dataIndex: "pihak_bertanggung_jawab", width: 180, render: (v) => safeText(v) },
    { title: "Target Waktu", dataIndex: "target_waktu_penyelesaian", width: 130, render: (v) => safeText(v) },
    { title: "Status TL", dataIndex: "status_tindak_lanjut", width: 160, render: (v) => safeText(v, "Belum Ditindaklanjuti") },
    { title: "% Selesai", dataIndex: "persentase_penyelesaian", width: 90, align: "center", render: (v) => `${v || 0}%` },
    {
      title: "Aksi",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            disabled={record.is_locked}
            onClick={() => {
              setEditingRekomendasi(record);
              rekomendasiForm.setFieldsValue(record);
              setRekomendasiModalOpen(true);
            }}
          >
            Ubah
          </Button>
          <Button
            size="small"
            onClick={() => navigate(`/mr/planning-temuan/${id}/rekomendasi/${record.id}/tindak-lanjut`)}
          >
            Tindak Lanjut
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
            {isEdit ? "Ubah Temuan" : "Tambah Temuan"}
          </Title>
          <Text type="secondary">LHP: {safeText(lhp?.nomor_lhp)} — {safeText(lhp?.judul_lhp)}</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/mr/planning-lhp/${effectiveLhpId}/temuan`)}>
              Kembali
            </Button>
            {isEdit && (
              <Button icon={<HistoryOutlined />} onClick={() => navigate(`/mr/planning-temuan/${id}/history`)}>
                Riwayat
              </Button>
            )}
            {isEdit && temuan?.status_revisi === "approved" && temuan?.risk_escalation_status === "none" && (
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setEscalateModalOpen(true)}>
                Eskalasi ke Risk Register
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {isEdit && (
        <Tag color={STATUS_COLOR[temuan?.status_revisi] || "default"} style={{ fontSize: 13, padding: "4px 10px" }}>
          Status: {STATUS_LABEL[temuan?.status_revisi] || temuan?.status_revisi}
        </Tag>
      )}

      <Card loading={isLoading}>
        <Form form={form} layout="vertical" disabled={!isDraftOrRejected}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Nomor Temuan" name="nomor_temuan" rules={[{ required: true, message: "Nomor temuan wajib diisi." }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Judul Temuan" name="judul_temuan" rules={[{ required: true, message: "Judul temuan wajib diisi." }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Uraian Temuan" name="uraian_temuan" rules={[{ required: true, message: "Uraian temuan wajib diisi." }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Kondisi" name="kondisi">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Kriteria" name="kriteria">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Sebab" name="sebab">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Akibat" name="akibat">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Kategori Temuan" name="kategori_temuan_ref_id">
                <Select options={getRefOptions(kategoriItems)} allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Nilai Temuan (Rp)" name="nilai_temuan_rupiah">
                <InputNumber style={{ width: "100%" }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" icon={<SaveOutlined />} loading={saveMutation.isPending} onClick={handleSubmit}>
              Simpan
            </Button>
            {isEdit && ["draft", "ditolak"].includes(temuan?.status_revisi) && (
              <Button loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                Ajukan untuk Verifikasi
              </Button>
            )}
          </Space>
        </Form>
      </Card>

      {isEdit && (
        <Card
          title="Rekomendasi"
          extra={
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRekomendasi(null);
                rekomendasiForm.resetFields();
                setRekomendasiModalOpen(true);
              }}
            >
              Tambah Rekomendasi
            </Button>
          }
        >
          <Table rowKey="id" columns={rekomendasiColumns} dataSource={rekomendasiRows} pagination={false} scroll={{ x: 900 }} />
        </Card>
      )}

      <Modal
        title={editingRekomendasi ? "Ubah Rekomendasi" : "Tambah Rekomendasi"}
        open={isRekomendasiModalOpen}
        onCancel={() => setRekomendasiModalOpen(false)}
        onOk={async () => {
          const values = await rekomendasiForm.validateFields();
          rekomendasiMutation.mutate({ rekomendasiId: editingRekomendasi?.id, payload: values });
        }}
        confirmLoading={rekomendasiMutation.isPending}
      >
        <Form form={rekomendasiForm} layout="vertical">
          <Form.Item label="Nomor Rekomendasi" name="nomor_rekomendasi" rules={[{ required: true, message: "Nomor rekomendasi wajib diisi." }]}>
            <Input placeholder="mis. 1.1" />
          </Form.Item>
          <Form.Item label="Uraian Rekomendasi" name="uraian_rekomendasi" rules={[{ required: true, message: "Uraian rekomendasi wajib diisi." }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Pihak Bertanggung Jawab" name="pihak_bertanggung_jawab">
            <Input />
          </Form.Item>
          <Form.Item label="Target Waktu Penyelesaian" name="target_waktu_penyelesaian">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" onChange={(_, dateString) => rekomendasiForm.setFieldsValue({ target_waktu_penyelesaian: dateString })} />
          </Form.Item>
          <Form.Item label="Nilai Rekomendasi (Rp)" name="nilai_rekomendasi_rupiah">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Eskalasi Temuan ke Risk Register"
        open={isEscalateModalOpen}
        onCancel={() => setEscalateModalOpen(false)}
        onOk={async () => {
          const values = await escalateForm.validateFields();
          escalateMutation.mutate(values);
        }}
        confirmLoading={escalateMutation.isPending}
        width={640}
      >
        <Text type="secondary">
          Nomor temuan, judul, ringkasan, dan rekomendasi akan terisi otomatis dari Temuan ini. Lengkapi field yang belum tersedia di bawah ini.
        </Text>
        <Form form={escalateForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Objek Risiko" name="objek_risiko" rules={[{ required: true, message: "Objek risiko wajib diisi." }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Kemungkinan (Likelihood)" name="kemungkinan_ref_id" rules={[{ required: true, message: "Wajib dipilih." }]}>
                <Select options={getRefOptions(likelihoodItems)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Dampak (Impact)" name="dampak_ref_id" rules={[{ required: true, message: "Wajib dipilih." }]}>
                <Select options={getRefOptions(impactItems)} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Jenis Cakupan Waktu" name="periode_type" initialValue="tahunan">
            <Select
              options={[
                { value: "tahunan", label: "Tahunan" },
                { value: "triwulan", label: "Triwulan" },
                { value: "semester", label: "Semester" },
                { value: "bulanan", label: "Bulanan" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

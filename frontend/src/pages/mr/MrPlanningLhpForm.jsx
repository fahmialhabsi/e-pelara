// frontend/src/pages/mr/MrPlanningLhpForm.jsx
// Modul TLHP — Form Laporan Hasil Pemeriksaan (LHP)

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Typography, Upload } from "antd";
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import mrPlanningLhpService, { MR_PLANNING_LHP_QUERY_KEYS } from "@/services/mrPlanningLhpService";
import mrPlanningRiskService from "@/services/mrPlanningRiskService";

const { Title, Text } = Typography;

const getBackendErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Data LHP belum dapat disimpan.";

// getReferenceItemsByGroup mengembalikan amplop {success, message, data, meta} apa adanya,
// jadi array item aslinya harus dibongkar dari response.data (bukan response itu sendiri).
const getRefRows = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const getRefOptions = (response) => getRefRows(response).map((item) => ({ value: item.id, label: item.nama_item }));

export default function MrPlanningLhpForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [fileList, setFileList] = React.useState([]);

  const { data: lhp, isLoading } = useQuery({
    queryKey: MR_PLANNING_LHP_QUERY_KEYS.detail(id),
    queryFn: () => mrPlanningLhpService.getById(id),
    enabled: isEdit,
  });

  const { data: entitasItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "MR_TLHP_ENTITAS_PEMERIKSA"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("MR_TLHP_ENTITAS_PEMERIKSA"),
  });

  const { data: jenisItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "MR_TLHP_JENIS_PEMERIKSAAN"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("MR_TLHP_JENIS_PEMERIKSAAN"),
  });

  React.useEffect(() => {
    if (!lhp) return;
    form.setFieldsValue({
      ...lhp,
      tanggal_lhp: lhp.tanggal_lhp ? dayjs(lhp.tanggal_lhp) : null,
      surat_tugas_tanggal: lhp.surat_tugas_tanggal ? dayjs(lhp.surat_tugas_tanggal) : null,
      tanggal_terima_lhp: lhp.tanggal_terima_lhp ? dayjs(lhp.tanggal_terima_lhp) : null,
      periode_pemeriksaan: lhp.periode_pemeriksaan_awal && lhp.periode_pemeriksaan_akhir
        ? [dayjs(lhp.periode_pemeriksaan_awal), dayjs(lhp.periode_pemeriksaan_akhir)]
        : undefined,
    });
  }, [lhp, form]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? mrPlanningLhpService.update(id, payload) : mrPlanningLhpService.create(payload)),
    onSuccess: (data) => {
      message.success(isEdit ? "LHP berhasil diperbarui." : "LHP berhasil dibuat.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
      if (!isEdit && data?.id) navigate(`/mr/planning-lhp/edit/${data.id}`);
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => mrPlanningLhpService.uploadDocument(id, file),
    onSuccess: () => {
      message.success("Berkas LHP berhasil diunggah.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.detail(id) });
      setFileList([]);
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { periode_pemeriksaan, ...rest } = values;

    saveMutation.mutate({
      ...rest,
      tanggal_lhp: values.tanggal_lhp ? values.tanggal_lhp.format("YYYY-MM-DD") : null,
      surat_tugas_tanggal: values.surat_tugas_tanggal ? values.surat_tugas_tanggal.format("YYYY-MM-DD") : null,
      tanggal_terima_lhp: values.tanggal_terima_lhp ? values.tanggal_terima_lhp.format("YYYY-MM-DD") : null,
      periode_pemeriksaan_awal: periode_pemeriksaan?.[0] ? periode_pemeriksaan[0].format("YYYY-MM-DD") : null,
      periode_pemeriksaan_akhir: periode_pemeriksaan?.[1] ? periode_pemeriksaan[1].format("YYYY-MM-DD") : null,
    });
  };

  const isDraft = !isEdit || lhp?.status_dokumen === "draft";

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            {isEdit ? "Ubah LHP" : "Tambah LHP"}
          </Title>
          <Text type="secondary">Laporan Hasil Pemeriksaan/Pengawasan — BPK, BPKP, atau Inspektorat</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/mr/planning-lhp")}>
            Kembali
          </Button>
        </Col>
      </Row>

      <Card loading={isLoading}>
        <Form form={form} layout="vertical" disabled={!isDraft}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Entitas Pemeriksa" name="entitas_pemeriksa_ref_id" rules={[{ required: true, message: "Entitas pemeriksa wajib dipilih." }]}>
                <Select options={getRefOptions(entitasItems)} placeholder="BPK / BPKP / Inspektorat" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Jenis Pemeriksaan" name="jenis_pemeriksaan_ref_id">
                <Select options={getRefOptions(jenisItems)} allowClear placeholder="Pemeriksaan Keuangan / Kinerja / PDTT / dst" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Tahun Pemantauan" name="tahun" rules={[{ required: true, message: "Tahun wajib diisi." }]}>
                <InputNumber style={{ width: "100%" }} min={2000} max={2100} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Nomor LHP" name="nomor_lhp" rules={[{ required: true, message: "Nomor LHP wajib diisi." }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Judul LHP" name="judul_lhp" rules={[{ required: true, message: "Judul LHP wajib diisi." }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Tanggal LHP" name="tanggal_lhp">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Tahun Objek Pemeriksaan" name="tahun_lhp">
                <InputNumber style={{ width: "100%" }} min={2000} max={2100} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Tanggal Terima LHP" name="tanggal_terima_lhp" extra="Batas waktu tindak lanjut (60 hari) dihitung otomatis dari tanggal ini saat LHP diaktifkan.">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Periode Pemeriksaan" name="periode_pemeriksaan">
                <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Nomor Surat Tugas" name="surat_tugas_nomor">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Tanggal Surat Tugas" name="surat_tugas_tanggal">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Ringkasan LHP" name="ringkasan_lhp">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" icon={<SaveOutlined />} loading={saveMutation.isPending} onClick={handleSubmit}>
              Simpan
            </Button>
          </Space>
        </Form>

        {isEdit && (
          <Card size="small" title="Berkas LHP" style={{ marginTop: 24 }}>
            <Space direction="vertical">
              {lhp?.original_file_name && <Text>Berkas saat ini: {lhp.original_file_name}</Text>}
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl)}
              >
                <Button icon={<UploadOutlined />}>Pilih Berkas</Button>
              </Upload>
              <Button
                type="primary"
                loading={uploadMutation.isPending}
                disabled={!fileList[0]}
                onClick={() => uploadMutation.mutate(fileList[0]?.originFileObj || fileList[0])}
              >
                Unggah
              </Button>
            </Space>
          </Card>
        )}
      </Card>
    </Space>
  );
}

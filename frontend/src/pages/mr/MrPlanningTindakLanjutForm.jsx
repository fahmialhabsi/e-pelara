// frontend/src/pages/mr/MrPlanningTindakLanjutForm.jsx
// Modul TLHP — Form entri Tindak Lanjut (pemantauan periodik per Rekomendasi)

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Radio, Row, Select, Space, Typography } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import mrPlanningTindakLanjutService, {
  MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS,
} from "@/services/mrPlanningTindakLanjutService";
import mrPlanningRiskService from "@/services/mrPlanningRiskService";

const { Title } = Typography;

const getBackendErrorMessage = (error) => error?.response?.data?.message || error?.message || "Data Tindak Lanjut belum dapat disimpan.";

// getReferenceItemsByGroup mengembalikan amplop {success, message, data, meta} apa adanya,
// jadi array item aslinya harus dibongkar dari response.data (bukan response itu sendiri).
const getRefRows = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const getRefOptions = (items = []) => (Array.isArray(items) ? items : []).map((item) => ({ value: item.id, label: item.nama_item }));

export default function MrPlanningTindakLanjutForm() {
  const { rekomendasiId, id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [statusKode, setStatusKode] = React.useState(null);

  const { data: tindakLanjut, isLoading } = useQuery({
    queryKey: MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS.detail(id),
    queryFn: () => mrPlanningTindakLanjutService.getById(id),
    enabled: isEdit,
  });

  const effectiveRekomendasiId = rekomendasiId || tindakLanjut?.mr_planning_temuan_rekomendasi_id;

  const { data: statusItems = [] } = useQuery({
    queryKey: ["mr-reference-items", "group", "MR_TLHP_STATUS_TINDAK_LANJUT"],
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup("MR_TLHP_STATUS_TINDAK_LANJUT"),
    select: getRefRows,
  });

  React.useEffect(() => {
    if (!tindakLanjut) return;
    form.setFieldsValue({
      ...tindakLanjut,
      tanggal_pemantauan: tindakLanjut.tanggal_pemantauan ? dayjs(tindakLanjut.tanggal_pemantauan) : null,
      tanggal_setoran: tindakLanjut.tanggal_setoran ? dayjs(tindakLanjut.tanggal_setoran) : null,
      target_waktu_berikutnya: tindakLanjut.target_waktu_berikutnya ? dayjs(tindakLanjut.target_waktu_berikutnya) : null,
    });
    const item = statusItems.find((i) => i.id === tindakLanjut.status_tindak_lanjut_ref_id);
    setStatusKode(item?.kode_item || null);
  }, [tindakLanjut, statusItems, form]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? mrPlanningTindakLanjutService.update(id, payload) : mrPlanningTindakLanjutService.createFromRekomendasi(effectiveRekomendasiId, payload),
    onSuccess: (data) => {
      message.success(isEdit ? "Tindak Lanjut berhasil diperbarui." : "Tindak Lanjut berhasil dicatat.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS.all });
      navigate(-1);
    },
    onError: (error) => message.error(getBackendErrorMessage(error)),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    saveMutation.mutate({
      ...values,
      tanggal_pemantauan: values.tanggal_pemantauan ? values.tanggal_pemantauan.format("YYYY-MM-DD") : null,
      tanggal_setoran: values.tanggal_setoran ? values.tanggal_setoran.format("YYYY-MM-DD") : null,
      target_waktu_berikutnya: values.target_waktu_berikutnya ? values.target_waktu_berikutnya.format("YYYY-MM-DD") : null,
    });
  };

  const isDraftOrRejected = !isEdit || ["draft", "ditolak"].includes(tindakLanjut?.status_revisi);

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            {isEdit ? "Ubah Tindak Lanjut" : "Tambah Pemantauan Tindak Lanjut"}
          </Title>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        </Col>
      </Row>

      <Card loading={isLoading}>
        <Form form={form} layout="vertical" disabled={!isDraftOrRejected}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Tanggal Pemantauan" name="tanggal_pemantauan" rules={[{ required: true, message: "Tanggal wajib diisi." }]}>
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Status Tindak Lanjut" name="status_tindak_lanjut_ref_id" rules={[{ required: true, message: "Status wajib dipilih." }]}>
                <Select
                  options={getRefOptions(statusItems)}
                  onChange={(_, option) => {
                    const item = statusItems.find((i) => i.id === option?.value);
                    setStatusKode(item?.kode_item || null);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="% Penyelesaian" name="persentase_penyelesaian">
                <InputNumber style={{ width: "100%" }} min={0} max={100} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Uraian Tindak Lanjut" name="uraian_tindak_lanjut" rules={[{ required: true, message: "Uraian wajib diisi." }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>

            {statusKode === "TIDAK_DAPAT_DITINDAKLANJUTI" && (
              <Col span={24}>
                <Form.Item label="Alasan Tidak Dapat Ditindaklanjuti" name="alasan_tidak_dapat_ditindaklanjuti" rules={[{ required: true, message: "Alasan wajib diisi." }]}>
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            )}

            <Col xs={24} md={8}>
              <Form.Item label="Nilai Setoran (Rp)" name="nilai_setoran_rupiah">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Nomor Bukti Setoran" name="nomor_bukti_setoran">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Tanggal Setoran" name="tanggal_setoran">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="PIC" name="pic_nama">
                <Input />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Kendala" name="kendala">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Rencana Tindak Lanjut Berikutnya" name="rencana_tindak_lanjut_berikutnya">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Target Waktu Berikutnya" name="target_waktu_berikutnya">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Status (Matriks TLHP)"
                name="status_matriks"
                extra="Sesuai kolom Status pada Matriks Pemantauan TLHP BPK: apakah tindak lanjut sudah Ada atau masih Belum."
              >
                <Radio.Group>
                  <Radio value="belum">Belum (N)</Radio>
                  <Radio value="ada">Ada (Ad)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Status SPJ"
                name="status_spj"
                extra="Kelengkapan Surat Pertanggungjawaban (bukti keuangan), relevan terutama untuk rekomendasi bernilai uang/setoran."
              >
                <Radio.Group>
                  <Radio value="belum">Belum (N)</Radio>
                  <Radio value="ada">Ada (Ad)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="Rencana Aksi — Dokumen Pendukung"
                name="daftar_dokumen_pendukung"
                extra="Daftar dokumen pendukung penyelesaian, 1 baris = 1 dokumen. Contoh: 'Surat Instruksi Gubernur kepada Kepala Dinas Pangan'."
              >
                <Input.TextArea rows={3} placeholder={"Contoh:\nSurat Instruksi Gubernur kepada Kepala Dinas Pangan\nSurat perintah kepala ke Kepala Subbagian Perencanaan"} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Keterangan" name="keterangan">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" icon={<SaveOutlined />} loading={saveMutation.isPending} onClick={handleSubmit}>
            Simpan
          </Button>
        </Form>
      </Card>
    </Space>
  );
}

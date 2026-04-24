import React, { useEffect, useState } from "react";
import { Card, Table, Button, Space, InputNumber, Typography, Modal, Form, Input, Select, DatePicker, message } from "antd";
import { getKewajibanList, createKewajiban } from "../services/lkApi";

const { Title } = Typography;

const JENIS = [
  "UTANG_BELANJA_PEGAWAI",
  "UTANG_BELANJA_BARANG",
  "UTANG_PFK",
  "PENDAPATAN_DITERIMA_DIMUKA",
  "LAINNYA",
].map((v) => ({ value: v, label: v }));

export default function KewajibanPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getKewajibanList({ tahun_anggaran: tahun });
      setRows(res.data || []);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>
              Kewajiban Jangka Pendek
            </Title>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ tahun_anggaran: tahun, status: "OUTSTANDING" }); setOpen(true); }}>
              Input baru
            </Button>
          </Space>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={[
              { title: "Jenis", dataIndex: "jenis", key: "jenis" },
              { title: "Uraian", dataIndex: "uraian", key: "uraian", ellipsis: true },
              { title: "Nilai", dataIndex: "nilai", key: "nilai", render: (v) => Number(v).toLocaleString("id-ID") },
              { title: "Status", dataIndex: "status", key: "status" },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title="Kewajiban baru"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const v = await form.validateFields();
            await createKewajiban({
              ...v,
              jatuh_tempo: v.jatuh_tempo ? v.jatuh_tempo.format("YYYY-MM-DD") : null,
            });
            message.success("Tersimpan");
            setOpen(false);
            load();
          } catch (e) {
            if (e?.errorFields) return;
            message.error(e.response?.data?.message || e.message);
          }
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tahun_anggaran" label="Tahun" rules={[{ required: true }]}>
            <InputNumber min={2020} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="jenis" label="Jenis" rules={[{ required: true }]}>
            <Select options={JENIS} />
          </Form.Item>
          <Form.Item name="uraian" label="Uraian" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="nilai" label="Nilai" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="jatuh_tempo" label="Jatuh tempo">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: "OUTSTANDING", label: "OUTSTANDING" }, { value: "LUNAS", label: "LUNAS" }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

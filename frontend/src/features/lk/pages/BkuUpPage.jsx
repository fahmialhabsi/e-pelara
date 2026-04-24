import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Space,
  InputNumber,
  Typography,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import { getBkuUpList, createBkuUp } from "../services/lkApi";

const { Title } = Typography;

const JENIS_UP = ["UP", "GU", "TUP"].map((v) => ({ value: v, label: v }));

export default function BkuUpPage() {
  const nav = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBkuUpList(tahun);
      setRows(res.data || []);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat UP/GU/TUP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const columns = [
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal" },
    { title: "Jenis", dataIndex: "jenis", key: "jenis" },
    {
      title: "Nominal",
      dataIndex: "nominal",
      key: "nominal",
      render: (v) =>
        `Rp. ${Number(v).toLocaleString("id-ID", { minimumFractionDigits: 2 })}`,
    },
    { title: "Sisa UP", dataIndex: "sisa_up", key: "sisa_up" },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap>
            <Button onClick={() => nav("/lk/bku")}>Kembali ke BKU</Button>
            <Title level={4} style={{ margin: 0 }}>
              UP / GU / TUP
            </Title>
            <span>Tahun</span>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button type="primary" onClick={() => setOpen(true)}>
              Tambah
            </Button>
          </Space>
          <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} />
        </Space>
      </Card>

      <Modal
        title="Input UP / GU / TUP"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const v = await form.validateFields();
            await createBkuUp({
              tahun_anggaran: v.tahun_anggaran,
              jenis: v.jenis,
              tanggal: v.tanggal.format("YYYY-MM-DD"),
              nominal: v.nominal,
              keterangan: v.keterangan || null,
            });
            message.success("Tersimpan");
            setOpen(false);
            form.resetFields();
            load();
          } catch (e) {
            if (e?.errorFields) return;
            message.error(e.response?.data?.message || e.message);
          }
        }}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            tahun_anggaran: tahun,
            tanggal: dayjs(),
          }}
        >
          <Form.Item name="tahun_anggaran" label="Tahun anggaran" rules={[{ required: true }]}>
            <InputNumber min={2020} max={2035} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="jenis" label="Jenis" rules={[{ required: true }]}>
            <Select options={JENIS_UP} />
          </Form.Item>
          <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="nominal" label="Nominal" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

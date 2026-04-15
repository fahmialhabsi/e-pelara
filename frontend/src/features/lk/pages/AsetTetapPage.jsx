import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
} from "antd";
import {
  getAsetTetapList,
  createAsetTetap,
  updateAsetTetap,
} from "../services/lkApi";

const { Title } = Typography;

const KAT = [
  "TANAH",
  "PERALATAN_MESIN",
  "GEDUNG_BANGUNAN",
  "JALAN_IRIGASI_INSTALASI",
  "ASET_TETAP_LAINNYA",
  "KDP",
].map((v) => ({ value: v, label: v }));

export default function AsetTetapPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAsetTetapList();
      setRows(res.data || []);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat aset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { title: "Kode", dataIndex: "kode_barang", key: "kode_barang" },
    { title: "Nama", dataIndex: "nama_barang", key: "nama_barang" },
    { title: "Kategori", dataIndex: "kategori", key: "kategori" },
    {
      title: "Harga",
      dataIndex: "harga_perolehan",
      key: "harga",
      render: (v) => Number(v).toLocaleString("id-ID"),
    },
    {
      title: "Akum. Susut",
      dataIndex: "akumulasi_penyusutan",
      key: "akum",
      render: (v) => Number(v).toLocaleString("id-ID"),
    },
    { title: "Status", dataIndex: "status", key: "status", render: (s) => <Tag>{s}</Tag> },
    {
      title: "Aksi",
      key: "a",
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setEditing(r);
            form.setFieldsValue({
              ...r,
              harga_perolehan: Number(r.harga_perolehan),
              akumulasi_penyusutan: Number(r.akumulasi_penyusutan),
              tarif_penyusutan: r.tarif_penyusutan != null ? Number(r.tarif_penyusutan) : undefined,
            });
            setOpen(true);
          }}
        >
          Ubah
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>
              Aset Tetap (KIB)
            </Title>
            <Button onClick={() => nav("/lk/penyusutan")}>Hitung penyusutan</Button>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                form.setFieldsValue({ status: "AKTIF", harga_perolehan: 0, akumulasi_penyusutan: 0 });
                setOpen(true);
              }}
            >
              Tambah
            </Button>
          </Space>
          <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }} />
        </Space>
      </Card>

      <Modal
        title={editing ? "Ubah aset" : "Aset baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const v = await form.validateFields();
            if (editing) await updateAsetTetap(editing.id, v);
            else await createAsetTetap(v);
            message.success("Tersimpan");
            setOpen(false);
            load();
          } catch (e) {
            if (e?.errorFields) return;
            message.error(e.response?.data?.message || e.message);
          }
        }}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="kode_barang" label="Kode barang">
            <Input />
          </Form.Item>
          <Form.Item name="nama_barang" label="Nama barang" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="kategori" label="Kategori" rules={[{ required: true }]}>
            <Select options={KAT} />
          </Form.Item>
          <Form.Item name="harga_perolehan" label="Harga perolehan">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="akumulasi_penyusutan" label="Akumulasi penyusutan">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="tarif_penyusutan" label="Tarif penyusutan (0–1, opsional)">
            <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { value: "AKTIF", label: "AKTIF" },
                { value: "DIHAPUS", label: "DIHAPUS" },
                { value: "DIPINDAHKAN", label: "DIPINDAHKAN" },
              ]}
            />
          </Form.Item>
          <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

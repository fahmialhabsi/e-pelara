import React, { useEffect, useState } from "react";
import { Card, Table, Button, Space, InputNumber, Typography, Modal, Form, Input, DatePicker, message } from "antd";
import dayjs from "dayjs";
import { getPersediaanByTahun, createPersediaan, updatePersediaan } from "../services/lkApi";

const { Title } = Typography;

export default function PersediaanPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPersediaanByTahun(tahun);
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
              Persediaan (stock opname)
            </Title>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                form.setFieldsValue({ tahun_anggaran: tahun, jumlah: 0, harga_satuan: 0 });
                setOpen(true);
              }}
            >
              Tambah baris
            </Button>
          </Space>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={[
              { title: "Nama", dataIndex: "nama_barang", key: "nama" },
              { title: "Satuan", dataIndex: "satuan", key: "satuan" },
              { title: "Jumlah", dataIndex: "jumlah", key: "jumlah" },
              { title: "Harga", dataIndex: "harga_satuan", key: "harga" },
              { title: "Nilai", dataIndex: "nilai", key: "nilai", render: (v) => Number(v).toLocaleString("id-ID") },
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
                        tanggal_opname: r.tanggal_opname ? dayjs(r.tanggal_opname) : undefined,
                      });
                      setOpen(true);
                    }}
                  >
                    Ubah
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title={editing ? "Ubah persediaan" : "Persediaan baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const v = await form.validateFields();
            const body = {
              ...v,
              tanggal_opname: v.tanggal_opname ? v.tanggal_opname.format("YYYY-MM-DD") : null,
            };
            if (editing) await updatePersediaan(editing.id, body);
            else await createPersediaan(body);
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
          <Form.Item name="nama_barang" label="Nama barang" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="satuan" label="Satuan">
            <Input />
          </Form.Item>
          <Form.Item name="jumlah" label="Jumlah">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="harga_satuan" label="Harga satuan">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="tanggal_opname" label="Tanggal opname">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

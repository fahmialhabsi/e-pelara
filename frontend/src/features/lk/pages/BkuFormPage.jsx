import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  App,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  DatePicker,
  Table,
  Checkbox,
} from "antd";
import dayjs from "dayjs";
import {
  createBku,
  updateBku,
  getBkuById,
  previewJurnalBku,
} from "../services/lkApi";

const { Title, Text } = Typography;

const JENIS = [
  "UP",
  "GU",
  "TUP",
  "LS_GAJI",
  "LS_BARANG",
  "PENERIMAAN_LAIN",
  "PENGELUARAN_LAIN",
  "SETORAN_SISA_UP",
];

export default function BkuFormPage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith("/baru");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getBkuById(id);
        const r = res.data;
        if (!r) {
          message.error("BKU tidak ditemukan");
          return;
        }
        if (r.status_validasi !== "BELUM") {
          message.warning("Hanya BKU status BELUM yang dapat diubah");
        }
        form.setFieldsValue({
          ...r,
          tanggal: r.tanggal ? dayjs(r.tanggal) : undefined,
        });
      } catch (e) {
        message.error(e.response?.data?.message || "Gagal memuat");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, form]);

  const buildBody = (v) => {
    const tanggal = v.tanggal ? v.tanggal.format("YYYY-MM-DD") : undefined;
    return {
      tahun_anggaran: v.tahun_anggaran,
      tanggal,
      uraian: v.uraian,
      jenis_transaksi: v.jenis_transaksi,
      penerimaan: v.penerimaan ?? 0,
      pengeluaran: v.pengeluaran ?? 0,
      kode_akun: v.kode_akun || null,
      nomor_bukti: v.nomor_bukti || null,
      nomor_spm: v.nomor_spm || null,
      nomor_sp2d: v.nomor_sp2d || null,
      skip_jurnal: !!v.skip_jurnal,
    };
  };

  const onPreview = async () => {
    try {
      const v = await form.validateFields([
        "tahun_anggaran",
        "tanggal",
        "uraian",
        "jenis_transaksi",
        "penerimaan",
        "pengeluaran",
        "kode_akun",
      ]);
      setPreviewLoading(true);
      const res = await previewJurnalBku(buildBody(v));
      setPreview(res);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message || e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onSave = async () => {
    try {
      const v = await form.validateFields();
      const body = buildBody(v);
      if (!isNew) delete body.skip_jurnal;
      if (isNew) {
        await createBku(body);
        message.success("BKU disimpan");
      } else {
        await updateBku(id, body);
        message.success("BKU diperbarui");
      }
      nav("/lk/bku");
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message || e.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title level={4}>{isNew ? "BKU — input baru" : `BKU #${id}`}</Title>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              tahun_anggaran: new Date().getFullYear(),
              penerimaan: 0,
              pengeluaran: 0,
              skip_jurnal: false,
            }}
          >
            <Form.Item name="tahun_anggaran" label="Tahun anggaran" rules={[{ required: true }]}>
              <InputNumber min={2020} max={2035} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="jenis_transaksi" label="Jenis transaksi" rules={[{ required: true }]}>
              <Select options={JENIS.map((x) => ({ value: x, label: x }))} />
            </Form.Item>
            <Form.Item name="uraian" label="Uraian" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="penerimaan" label="Penerimaan">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="pengeluaran" label="Pengeluaran">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="kode_akun" label="Kode akun (belanja / debit)">
              <Input placeholder="Contoh 5.2.01.xx" />
            </Form.Item>
            <Form.Item name="nomor_bukti" label="Nomor bukti">
              <Input />
            </Form.Item>
            <Form.Item name="nomor_spm" label="Nomor SPM">
              <Input />
            </Form.Item>
            <Form.Item name="nomor_sp2d" label="Nomor SP2D">
              <Input />
            </Form.Item>
            {isNew && (
              <Form.Item name="skip_jurnal" valuePropName="checked">
                <Checkbox>Lewati jurnal otomatis (data migrasi / koreksi)</Checkbox>
              </Form.Item>
            )}
          </Form>
          <Space wrap>
            <Button onClick={() => nav("/lk/bku")}>Batal</Button>
            <Button onClick={onPreview} loading={previewLoading}>
              Preview jurnal otomatis
            </Button>
            <Button type="primary" onClick={onSave}>
              Simpan
            </Button>
          </Space>
          {preview && (
            <div>
              <Text strong>Nominal jurnal: {preview.nominal}</Text>
              <Table
                size="small"
                style={{ marginTop: 12 }}
                rowKey={(r) => r.__row}
                dataSource={(preview.baris || []).map((r, i) => ({ ...r, __row: i }))}
                columns={[
                  { title: "Kode", dataIndex: "kode_akun", key: "kode_akun" },
                  { title: "Nama", dataIndex: "nama_akun", key: "nama_akun" },
                  {
                    title: "Posisi",
                    key: "posisi",
                    render: (_, r) => (Number(r.debit) > 0 ? "DEBIT" : "KREDIT"),
                  },
                  { title: "Debit", dataIndex: "debit", key: "debit" },
                  { title: "Kredit", dataIndex: "kredit", key: "kredit" },
                ]}
                pagination={false}
              />
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Button, Space, InputNumber, Typography, message } from "antd";
import { getPenyusutanPreview, prosesPenyusutan } from "../services/lkApi";

const { Title, Text } = Typography;

export default function PenyusutanPage() {
  const nav = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [prosesing, setProsesing] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await getPenyusutanPreview(tahun);
      setPreview(res);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [tahun]);

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap>
            <Button onClick={() => nav("/lk/aset-tetap")}>Kembali ke KIB</Button>
            <Title level={4} style={{ margin: 0 }}>
              Penyusutan aset tetap
            </Title>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button onClick={loadPreview}>Preview</Button>
            <Button
              type="primary"
              loading={prosesing}
              onClick={async () => {
                setProsesing(true);
                try {
                  const res = await prosesPenyusutan(tahun);
                  message.success(`Jurnal dibuat: ${res.jurnal_dibuat}, dilewati: ${res.dilewati}`);
                  loadPreview();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                } finally {
                  setProsesing(false);
                }
              }}
            >
              Proses + jurnal
            </Button>
          </Space>
          <Text type="secondary">
            Idempoten per aset per tahun (referensi jurnal). Jalankan sebelum generate LO jika beban penyusutan
            diperlukan.
          </Text>
          <Text strong>
            Total preview: {preview?.total_penyusutan != null ? preview.total_penyusutan.toLocaleString("id-ID") : "—"}
          </Text>
          <Table
            size="small"
            rowKey="aset_id"
            dataSource={preview?.baris || []}
            columns={[
              { title: "Aset", dataIndex: "nama_barang", key: "n" },
              { title: "Kategori", dataIndex: "kategori", key: "k" },
              { title: "Tarif", dataIndex: "tarif", key: "t" },
              {
                title: "Delta penyusutan",
                dataIndex: "delta_penyusutan",
                key: "d",
                render: (v) => Number(v).toLocaleString("id-ID"),
              },
            ]}
            pagination={false}
          />
        </Space>
      </Card>
    </div>
  );
}

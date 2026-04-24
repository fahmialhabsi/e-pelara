import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Space, InputNumber, Typography, Table, message } from "antd";
import { getBkuCetak } from "../services/lkApi";
import { tampilSaldo, formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

export default function BkuCetakPage() {
  const nav = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBkuCetak(tahun, bulan);
      setPayload(res);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat data cetak");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang via tombol / ganti periode
  }, [tahun, bulan]);

  const columns = [
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal" },
    { title: "No. Bukti", dataIndex: "nomor_bukti", key: "nomor_bukti" },
    { title: "Uraian", dataIndex: "uraian", key: "uraian", ellipsis: true },
    { title: "Jenis", dataIndex: "jenis_transaksi", key: "jenis_transaksi" },
    { title: "Terima", dataIndex: "penerimaan", key: "penerimaan", render: formatRupiah },
    { title: "Keluar", dataIndex: "pengeluaran", key: "pengeluaran", render: formatRupiah },
    { title: "Saldo", dataIndex: "saldo", key: "saldo", render: (v) => tampilSaldo(v) },
    { title: "Akun", dataIndex: "kode_akun", key: "kode_akun" },
  ];

  return (
    <div style={{ padding: 24 }} className="bku-cetak-root">
      <Card loading={loading}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap className="hide-on-print">
            <Button onClick={() => nav("/lk/bku")}>Kembali</Button>
            <Text>Tahun</Text>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Text>Bulan</Text>
            <InputNumber min={1} max={12} value={bulan} onChange={(v) => setBulan(v || bulan)} />
            <Button type="primary" onClick={load}>
              Muat
            </Button>
            <Button onClick={() => window.print()}>Cetak / PDF</Button>
          </Space>
          <div style={{ textAlign: "center" }}>
            <Title level={4} style={{ marginBottom: 0 }}>
              {payload?.judul || "Buku Kas Umum"}
            </Title>
            <Text type="secondary">Bendahara — format standar ringkas</Text>
          </div>
          <Table
            size="small"
            rowKey={(r) =>
              r.id ??
              r.kode_akun ??
              `${r.tanggal ?? ""}-${r.nomor_bukti ?? ""}-${r.uraian ?? ""}`
            }
            dataSource={payload?.baris || []}
            columns={columns}
            pagination={false}
          />
        </Space>
      </Card>
      <style>{`
        @media print {
          .hide-on-print { display: none !important; }
          .bku-cetak-root { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  InputNumber,
  Typography,
  message,
} from "antd";
import { getBkuList, syncBkuSigap } from "../services/lkApi";
import { tampilSaldo, formatRupiah } from "../utils/lkFormat.jsx";

const { Title } = Typography;

const JENIS_OPTS = [
  "UP",
  "GU",
  "TUP",
  "LS_GAJI",
  "LS_BARANG",
  "PENERIMAAN_LAIN",
  "PENGELUARAN_LAIN",
  "SETORAN_SISA_UP",
].map((v) => ({ label: v, value: v }));

export default function BkuPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState();
  const [jenis, setJenis] = useState();

  const load = async () => {
    setLoading(true);
    try {
      const params = { tahun_anggaran: tahun };
      if (bulan) params.bulan = bulan;
      if (jenis) params.jenis_transaksi = jenis;
      const res = await getBkuList(params);
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      message.error(e.response?.data?.message || "Gagal memuat BKU");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun, bulan, jenis]);

  const columns = [
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal", width: 110 },
    { title: "No. Bukti", dataIndex: "nomor_bukti", key: "nomor_bukti", width: 120 },
    { title: "Jenis", dataIndex: "jenis_transaksi", key: "jenis", width: 120 },
    {
      title: "Penerimaan",
      dataIndex: "penerimaan",
      key: "penerimaan",
      render: (v) => formatRupiah(v),
    },
    {
      title: "Pengeluaran",
      dataIndex: "pengeluaran",
      key: "pengeluaran",
      render: (v) => formatRupiah(v),
    },
    {
      title: "Saldo",
      dataIndex: "saldo",
      key: "saldo",
      render: (v) => tampilSaldo(v),
    },
    { title: "Kode Akun", dataIndex: "kode_akun", key: "kode_akun", width: 100 },
    {
      title: "Validasi",
      dataIndex: "status_validasi",
      key: "status_validasi",
      width: 90,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 100,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => nav(`/lk/bku/${r.id}`)}>
          Ubah
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Title level={4} style={{ margin: 0 }}>
              Buku Kas Umum (BKU)
            </Title>
            <Button type="primary" onClick={() => nav("/lk/bku/baru")}>
              Input baru
            </Button>
            <Button onClick={() => nav("/lk/bku/cetak")}>Cetak</Button>
            <Button onClick={() => nav("/lk/bku/up")}>UP / GU / TUP</Button>
          </Space>
          <Space wrap>
            <span>Tahun</span>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <span>Bulan</span>
            <Select
              allowClear
              placeholder="Semua"
              style={{ width: 120 }}
              value={bulan}
              onChange={setBulan}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: String(i + 1),
              }))}
            />
            <span>Jenis</span>
            <Select
              allowClear
              placeholder="Semua"
              style={{ width: 200 }}
              value={jenis}
              onChange={setJenis}
              options={JENIS_OPTS}
            />
            <Button onClick={load}>Muat ulang</Button>
            <Button
              loading={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  const res = await syncBkuSigap({ tahun_anggaran: tahun });
                  message.success(
                    `Sync: berhasil ${res.data?.berhasil ?? 0}, skip ${res.data?.skip_sudah_ada ?? 0}, gagal ${res.data?.gagal ?? 0}`,
                  );
                  if (res.data?.fetch_note) message.info(res.data.fetch_note);
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                } finally {
                  setSyncing(false);
                }
              }}
            >
              Sync SPJ SIGAP
            </Button>
          </Space>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>
    </div>
  );
}

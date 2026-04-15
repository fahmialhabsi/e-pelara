import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  InputNumber,
  Select,
  Typography,
  message,
} from "antd";
import { getSaldoAkun, getSaldoAkunBulan, recalculateSaldo } from "../services/lkApi";

const { Title, Text } = Typography;

function fmtId(n) {
  const x = Number(n) || 0;
  return `Rp. ${x.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SaldoAkunPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (bulan === 0 || bulan === "0") {
        const res = await getSaldoAkun(tahun, {});
        setRows(res.data || []);
      } else {
        const res = await getSaldoAkunBulan(tahun, bulan);
        setRows(res.data || []);
      }
    } catch (e) {
      console.error(e);
      message.error("Gagal memuat saldo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun, bulan]);

  const columns = [
    { title: "Kode", dataIndex: "kode_akun", key: "kode_akun", width: 120 },
    { title: "Nama", dataIndex: "nama_akun", key: "nama_akun", ellipsis: true },
    {
      title: "Saldo awal",
      dataIndex: "saldo_awal",
      align: "right",
      render: (v) => fmtId(v),
    },
    {
      title: "Debit",
      dataIndex: "total_debit",
      align: "right",
      render: (v) => fmtId(v),
    },
    {
      title: "Kredit",
      dataIndex: "total_kredit",
      align: "right",
      render: (v) => fmtId(v),
    },
    {
      title: "Saldo akhir",
      dataIndex: "saldo_akhir",
      align: "right",
      render: (v) => fmtId(v),
    },
  ];

  const recalc = async () => {
    setLoading(true);
    try {
      await recalculateSaldo(tahun);
      message.success("Saldo dihitung ulang dari jurnal POSTED.");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Gagal recalculate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4}>Trial Balance / Saldo Akun</Title>
        <Text type="secondary">
          Bulan 0 = semua periode tersimpan (gabungan baris per bulan). Filter bulan untuk
          posisi satu bulan.
        </Text>
        <Space wrap>
          <span>Tahun:</span>
          <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
          <span>Bulan:</span>
          <Select
            style={{ width: 160 }}
            value={bulan}
            onChange={setBulan}
            options={[
              { value: 0, label: "Semua (raw)" },
              ...Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: `Bulan ${i + 1}`,
              })),
            ]}
          />
          <Button onClick={load}>Muat ulang</Button>
          <Button type="primary" danger ghost onClick={recalc} loading={loading}>
            Hitung ulang saldo
          </Button>
        </Space>
        <Table
          size="small"
          loading={loading}
          rowKey={(r) => `${r.kode_akun}-${r.bulan}-${r.id || ""}`}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 25 }}
        />
      </Space>
    </Card>
  );
}

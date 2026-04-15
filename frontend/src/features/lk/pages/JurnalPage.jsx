import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Select,
  InputNumber,
  Typography,
} from "antd";
import { getJurnalList, postJurnal, voidJurnal } from "../services/lkApi";

const { Title } = Typography;

const statusColor = {
  DRAFT: "gold",
  POSTED: "green",
  VOID: "red",
};

export default function JurnalPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState();
  const [status, setStatus] = useState();

  const load = async () => {
    setLoading(true);
    try {
      const params = { tahun_anggaran: tahun };
      if (bulan) params.bulan = bulan;
      if (status) params.status = status;
      const res = await getJurnalList(params);
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun, bulan, status]);

  const columns = [
    { title: "Nomor", dataIndex: "nomor_jurnal", key: "nomor_jurnal", width: 140 },
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal", width: 120 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s) => <Tag color={statusColor[s] || "default"}>{s}</Tag>,
    },
    { title: "Jenis", dataIndex: "jenis_jurnal", key: "jenis_jurnal", width: 110 },
    {
      title: "Keterangan",
      dataIndex: "keterangan",
      key: "keterangan",
      ellipsis: true,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 220,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => nav(`/lk/jurnal/${r.id}`)}>
            Detail
          </Button>
          {r.status === "DRAFT" && (
            <Button
              type="link"
              size="small"
              onClick={async () => {
                await postJurnal(r.id);
                load();
              }}
            >
              Posting
            </Button>
          )}
          {r.status === "POSTED" && (
            <Button
              type="link"
              size="small"
              danger
              onClick={async () => {
                await voidJurnal(r.id);
                load();
              }}
            >
              Void
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap align="center">
          <Title level={4} style={{ margin: 0 }}>
            Jurnal Umum
          </Title>
          <Button type="primary" onClick={() => nav("/lk/jurnal/baru")}>
            Buat Jurnal Baru
          </Button>
        </Space>
        <Space wrap>
          <span>Tahun:</span>
          <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
          <span>Bulan:</span>
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
          <span>Status:</span>
          <Select
            allowClear
            placeholder="Semua"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "POSTED", label: "Posted" },
              { value: "VOID", label: "Void" },
            ]}
          />
          <Button onClick={load}>Refresh</Button>
        </Space>
        <Table
          size="small"
          loading={loading}
          rowKey="id"
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 15 }}
        />
      </Space>
    </Card>
  );
}

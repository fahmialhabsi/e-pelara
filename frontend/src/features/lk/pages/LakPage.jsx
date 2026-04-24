import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  InputNumber,
  Typography,
  Tag,
  Alert,
  message,
} from "antd";
import { getLak, generateLak, getLakValidasi } from "../services/lkApi";
import { formatRupiahLak } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

const KELOMPOK_LABEL = {
  AKTIVITAS_OPERASI: "Arus Kas dari Aktivitas Operasi",
  AKTIVITAS_INVESTASI: "Arus Kas dari Aktivitas Investasi",
  AKTIVITAS_PENDANAAN: "Arus Kas dari Aktivitas Pendanaan",
  SALDO_KAS: "Saldo Kas",
};

export default function LakPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [validasi, setValidasi] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getLak(tahun);
      setPayload(res);
      const v = await getLakValidasi(tahun);
      setValidasi(v);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat LAK");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const grouped = useMemo(() => {
    const data = payload?.data || [];
    const order = [
      "AKTIVITAS_OPERASI",
      "AKTIVITAS_INVESTASI",
      "AKTIVITAS_PENDANAAN",
      "SALDO_KAS",
    ];
    return order
      .map((k) => ({
        key: k,
        label: KELOMPOK_LABEL[k] || k,
        rows: data.filter((r) => r.kelompok === k).sort((a, b) => (a.urutan || 0) - (b.urutan || 0)),
      }))
      .filter((g) => g.rows.length);
  }, [payload]);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const out = await generateLak(tahun);
      message.success(
        out.balance
          ? "LAK diperbarui — saldo akhir cocok dengan BKU"
          : "LAK diperbarui — periksa validasi saldo",
      );
      await load();
    } catch (e) {
      message.error(e.response?.data?.message || "Generate gagal");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Uraian", dataIndex: "uraian", key: "uraian", width: "55%" },
    {
      title: "Tahun ini",
      dataIndex: "nilai_tahun_ini",
      key: "ini",
      align: "right",
      render: (v) => (
        <Text strong={Number(v) >= 0} type={Number(v) < 0 ? "danger" : undefined}>
          {formatRupiahLak(v)}
        </Text>
      ),
    },
    {
      title: "Tahun lalu",
      dataIndex: "nilai_tahun_lalu",
      key: "lalu",
      align: "right",
      render: (v) => formatRupiahLak(v),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space align="center" wrap style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Laporan Arus Kas (LAK)
        </Title>
        <Text type="secondary">Tahun anggaran</Text>
        <InputNumber min={2000} max={2100} value={tahun} onChange={(v) => v && setTahun(v)} />
        <Button type="primary" onClick={onGenerate} loading={loading}>
          Generate / refresh dari BKU
        </Button>
        <Button onClick={load} loading={loading}>
          Muat ulang
        </Button>
        {payload?.status === "FINAL" ? <Tag color="green">FINAL</Tag> : <Tag>DRAFT</Tag>}
      </Space>

      {validasi && (
        <Alert
          style={{ marginBottom: 16 }}
          type={validasi.balance ? "success" : "warning"}
          showIcon
          message={
            validasi.balance
              ? "Saldo LAK = Saldo BKU (Desember)"
              : `Selisih saldo akhir LAK vs BKU: ${formatRupiahLak(validasi.selisih)}`
          }
          description={
            <span>
              Saldo akhir LAK: {formatRupiahLak(validasi.saldo_akhir_lak)} — Saldo BKU akhir tahun:{" "}
              {formatRupiahLak(validasi.saldo_bku_akhir)}
            </span>
          }
        />
      )}

      {grouped.map((g) => (
        <Card key={g.key} title={g.label} style={{ marginBottom: 16 }} size="small">
          <Table
            size="small"
            pagination={false}
            rowKey={(r) => `${g.key}-${r.komponen}`}
            columns={columns}
            dataSource={g.rows}
            loading={loading}
          />
        </Card>
      ))}

      {!loading && grouped.length === 0 && (
        <Alert type="info" message="Belum ada data LAK — klik Generate setelah BKU terisi." />
      )}
    </div>
  );
}

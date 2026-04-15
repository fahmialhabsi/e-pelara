import React, { useEffect, useState } from "react";
import { Card, Table, Button, Space, InputNumber, Typography, Tag, message } from "antd";
import { useAuth } from "../../../hooks/useAuth";
import { getLo, generateLo, kunciLo } from "../services/lkApi";
import { formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

function canKunci(role) {
  const r = String(role || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return r === "SUPER_ADMIN" || r === "PPK_SKPD";
}

export default function LoPage() {
  const { user } = useAuth();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getLo(tahun);
      setPayload(res);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat LO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const rows = payload?.data || [];
  const pend = rows.filter((r) => r.kelompok === "PENDAPATAN_LO");
  const beb = rows.filter((r) => r.kelompok === "BEBAN_LO");

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>
              Laporan Operasional (LO) — akrual
            </Title>
            <Tag color={payload?.status === "FINAL" ? "green" : "gold"}>{payload?.status || "—"}</Tag>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button
              type="primary"
              onClick={async () => {
                try {
                  await generateLo(tahun);
                  message.success("LO di-generate");
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              Generate / Refresh
            </Button>
            {canKunci(user?.role) && (
              <Button danger onClick={async () => { try { await kunciLo(tahun); message.success("OK"); load(); } catch (e) { message.error(e.response?.data?.message); } }}>
                Kunci LO
              </Button>
            )}
          </Space>
          <div>
            <Text strong>Ringkasan</Text>
            <div>Pendapatan-LO: {formatRupiah(payload?.ringkasan?.total_pendapatan)}</div>
            <div>Beban-LO: {formatRupiah(payload?.ringkasan?.total_beban)}</div>
            <div>
              Surplus / (Defisit):{" "}
              <Text type={payload?.ringkasan?.surplus_defisit >= 0 ? "success" : "danger"}>
                {formatRupiah(payload?.ringkasan?.surplus_defisit)}
              </Text>
            </div>
          </div>
          <Text strong>Pendapatan</Text>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={pend}
            columns={[
              { title: "Kode", dataIndex: "kode_akun", key: "k" },
              { title: "Nama", dataIndex: "nama_akun", key: "n" },
              { title: "Nilai", dataIndex: "nilai_tahun_ini", key: "v", align: "right", render: formatRupiah },
            ]}
          />
          <Text strong>Beban</Text>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={beb}
            columns={[
              { title: "Kode", dataIndex: "kode_akun", key: "k" },
              { title: "Nama", dataIndex: "nama_akun", key: "n" },
              { title: "Nilai", dataIndex: "nilai_tahun_ini", key: "v", align: "right", render: formatRupiah },
            ]}
          />
        </Space>
      </Card>
    </div>
  );
}

import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  InputNumber,
  Typography,
  Table,
  Tag,
  message,
} from "antd";
import { useAuth } from "../../../hooks/useAuth";
import {
  getNeraca,
  generateNeraca,
  kunciNeraca,
  exportNeraca,
} from "../services/lkApi";
import { formatRupiah } from "../utils/lkFormat.jsx";

const { Title, Text } = Typography;

function canKunci(role) {
  const r = String(role || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return r === "SUPER_ADMIN" || r === "PPK_SKPD";
}

export default function NeracaPage() {
  const { user } = useAuth();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNeraca(tahun);
      setPayload(res);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat neraca");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const { totalAset, totalKwj, totalEk, balance, selisih } = useMemo(() => {
    const rows = payload?.data || [];
    const ta = rows
      .filter((r) => r.kelompok === "ASET")
      .reduce((s, r) => s + Number(r.nilai_tahun_ini), 0);
    const tk = rows
      .filter((r) => r.kelompok === "KEWAJIBAN")
      .reduce((s, r) => s + Number(r.nilai_tahun_ini), 0);
    const te = rows
      .filter((r) => r.kelompok === "EKUITAS")
      .reduce((s, r) => s + Number(r.nilai_tahun_ini), 0);
    const rhs = tk + te;
    const s = Math.abs(ta - rhs);
    return {
      totalAset: ta,
      totalKwj: tk,
      totalEk: te,
      balance: s < 1,
      selisih: s,
    };
  }, [payload]);

  const cols = [
    { title: "Kode", dataIndex: "kode_akun", key: "kode", width: 100 },
    { title: "Nama", dataIndex: "nama_akun", key: "nama" },
    {
      title: "Nilai",
      dataIndex: "nilai_tahun_ini",
      key: "nilai",
      align: "right",
      render: (v) => formatRupiah(v),
    },
  ];

  const asetRows = (payload?.data || []).filter((r) => r.kelompok === "ASET");
  const kewRows = (payload?.data || []).filter((r) => r.kelompok === "KEWAJIBAN");
  const ekuRows = (payload?.data || []).filter((r) => r.kelompok === "EKUITAS");

  return (
    <div style={{ padding: 24 }}>
      <Card loading={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap align="center">
            <Title level={4} style={{ margin: 0 }}>
              Neraca (posisi 31 Desember)
            </Title>
            <Tag color={payload?.status === "FINAL" ? "green" : "gold"}>
              {payload?.status === "FINAL" ? "TERKUNCI" : "DRAFT"}
            </Tag>
            <Tag color={balance ? "green" : "red"}>
              {balance ? "BALANCE" : `TIDAK BALANCE (±${formatRupiah(selisih)})`}
            </Tag>
          </Space>
          <Space wrap>
            <Text>Tahun</Text>
            <InputNumber min={2020} max={2035} value={tahun} onChange={(v) => setTahun(v || tahun)} />
            <Button
              type="primary"
              onClick={async () => {
                try {
                  await generateNeraca(tahun);
                  message.success("Neraca di-generate");
                  load();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              Generate / Refresh
            </Button>
            <Button
              onClick={async () => {
                try {
                  const ex = await exportNeraca(tahun);
                  const blob = new Blob([JSON.stringify(ex, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `neraca-${tahun}.json`;
                  a.click();
                } catch (e) {
                  message.error(e.response?.data?.message || e.message);
                }
              }}
            >
              Export
            </Button>
            {canKunci(user?.role) && (
              <Button
                danger
                onClick={async () => {
                  try {
                    await kunciNeraca(tahun);
                    message.success("Neraca dikunci");
                    load();
                  } catch (e) {
                    message.error(e.response?.data?.message || e.message);
                  }
                }}
              >
                Kunci Neraca
              </Button>
            )}
          </Space>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <Text strong>ASET</Text>
              <Table
                size="small"
                rowKey="id"
                columns={cols}
                dataSource={asetRows}
                pagination={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>Total Aset</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <strong>{formatRupiah(totalAset)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
            <div>
              <Text strong>KEWAJIBAN &amp; EKUITAS</Text>
              <Table
                size="small"
                rowKey="id"
                columns={cols}
                dataSource={[...kewRows, ...ekuRows]}
                pagination={false}
                summary={() => (
                  <>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Total Kewajiban</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <strong>{formatRupiah(totalKwj)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Total Ekuitas</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <strong>{formatRupiah(totalEk)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Total Kewajiban + Ekuitas</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <strong>{formatRupiah(totalKwj + totalEk)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                )}
              />
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}

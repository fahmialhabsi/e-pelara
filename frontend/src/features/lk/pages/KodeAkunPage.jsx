import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Select, Space, Typography } from "antd";
import { getKodeAkunTree } from "../services/lkApi";

const { Title, Text } = Typography;

function flattenTree(nodes, acc = []) {
  if (!nodes) return acc;
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

export default function KodeAkunPage() {
  const [tree, setTree] = useState([]);
  const [jenis, setJenis] = useState();
  const [loading, setLoading] = useState(true);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await getKodeAkunTree();
      setTree(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const flat = useMemo(() => flattenTree(tree), [tree]);

  const filtered = useMemo(() => {
    if (!jenis) return flat;
    return flat.filter((r) => r.jenis === jenis);
  }, [flat, jenis]);

  const columns = [
    { title: "Kode", dataIndex: "kode", key: "kode", width: 160 },
    { title: "Nama", dataIndex: "nama", key: "nama" },
    { title: "Level", dataIndex: "level", key: "level", width: 72 },
    {
      title: "Jenis",
      dataIndex: "jenis",
      key: "jenis",
      width: 120,
      render: (v) => <Tag color="geekblue">{v}</Tag>,
    },
    {
      title: "Normal",
      dataIndex: "normal_balance",
      key: "normal_balance",
      width: 100,
      render: (v) => (
        <Tag color={v === "DEBIT" ? "blue" : "green"}>{v}</Tag>
      ),
    },
    {
      title: "Laporan",
      dataIndex: "digunakan_di",
      key: "digunakan_di",
      width: 100,
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            Bagan Akun Standar (BAS)
          </Title>
          <Text type="secondary">
            Hierarki akun untuk LK OPD. Debit = biru, Kredit = hijau.
          </Text>
        </div>
        <Space wrap>
          <span>Filter jenis:</span>
          <Select
            allowClear
            placeholder="Semua"
            style={{ width: 200 }}
            value={jenis}
            onChange={setJenis}
            options={[
              { value: "ASET", label: "Aset" },
              { value: "KEWAJIBAN", label: "Kewajiban" },
              { value: "EKUITAS", label: "Ekuitas" },
              { value: "PENDAPATAN", label: "Pendapatan" },
              { value: "BELANJA", label: "Belanja" },
              { value: "BEBAN", label: "Beban (LO)" },
              { value: "PEMBIAYAAN", label: "Pembiayaan" },
            ]}
          />
        </Space>
        <Table
          size="small"
          loading={loading}
          rowKey={(r) =>
            r.id != null
              ? String(r.id)
              : `${r.kode ?? ""}-${r.nama ?? ""}-${r.kelompok ?? ""}`
          }
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 30 }}
        />
      </Space>
    </Card>
  );
}

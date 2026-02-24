import React, { useEffect, useState } from "react";
import { Table, Select, Spin, message, Tabs } from "antd";
import api from "../services/api";

const columnsByTab = {
  tujuan: [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Kode Tujuan", dataIndex: "no_tujuan", key: "no_tujuan" },
    { title: "Isi Tujuan", dataIndex: "isi_tujuan", key: "isi_tujuan" },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
  sasaran: [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Kode Sasaran", dataIndex: "nomor", key: "nomor" },
    { title: "Isi Sasaran", dataIndex: "isi_sasaran", key: "isi_sasaran" },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
  ],
  strategi: [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Kode Strategi",
      dataIndex: "kode_strategi",
      key: "kode_strategi",
    },
    { title: "Isi Strategi", dataIndex: "deskripsi", key: "deskripsi" },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
  arah_kebijakan: [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "deskripsi", dataIndex: "deskripsi", key: "deskripsi" },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
  program: [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Kode Program", dataIndex: "kode_program", key: "kode_program" },
    { title: "Nama Program", dataIndex: "nama_program", key: "nama_program" },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
  kegiatan: [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Kode Kegiatan",
      dataIndex: "kode_kegiatan",
      key: "kode_kegiatan",
    },
    {
      title: "Nama Kegiatan",
      dataIndex: "nama_kegiatan",
      key: "nama_kegiatan",
    },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
  sub_kegiatan: [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Kode Sub Kegiatan",
      dataIndex: "kode_sub_kegiatan",
      key: "kode_sub_kegiatan",
    },
    {
      title: "Nama Sub Kegiatan",
      dataIndex: "nama_sub_kegiatan",
      key: "nama_sub_kegiatan",
    },
    { title: "Periode", dataIndex: "periode_id", key: "periode_id" },
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
  ],
};

const tabItems = [
  { key: "tujuan", label: "Tujuan" },
  { key: "sasaran", label: "Sasaran" },
  { key: "strategi", label: "Strategi" },
  { key: "arah_kebijakan", label: "Arah Kebijakan" },
  { key: "program", label: "Program" },
  { key: "kegiatan", label: "Kegiatan" },
  { key: "sub_kegiatan", label: "Sub Kegiatan" },
];

export default function ClonedDataTable() {
  const [periode, setPeriode] = useState("");
  const [activeTab, setActiveTab] = useState("tujuan");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!periode || !activeTab) return;

    const fetchEndpoint = `/clone-periode/cloned-${activeTab}?periode_id=${periode}`;
    setLoading(true);
    api
      .get(fetchEndpoint)
      .then((res) => setData(res.data))
      .catch(() => message.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [periode, activeTab]);

  return (
    <>
      <Select
        placeholder="Pilih Periode"
        value={periode}
        onChange={setPeriode}
        style={{ width: 250, marginBottom: 16 }}
      >
        <Select.Option value="1">Periode 1 (2020–2024)</Select.Option>
        <Select.Option value="2">Periode 2 (2025–2029)</Select.Option>
      </Select>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {tabItems.map((tab) => (
          <Tabs.TabPane key={tab.key} tab={tab.label}>
            {loading ? (
              <Spin />
            ) : (
              <Table
                rowKey="id"
                columns={columnsByTab[tab.key]}
                dataSource={data}
                pagination={{ pageSize: 10 }}
              />
            )}
          </Tabs.TabPane>
        ))}
      </Tabs>
    </>
  );
}

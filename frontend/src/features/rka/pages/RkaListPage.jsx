import React, { useEffect, useState } from "react";
import { Table, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { getAllRka } from "../services/rkaApi";

const RkaListPage = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getAllRka()
      .then((rows) => setData(Array.isArray(rows) ? rows : []))
      .catch(console.error);
  }, []);

  const columns = [
    { title: "No", key: "no", width: 50, render: (_, __, i) => i + 1 },
    { title: "Tahun", dataIndex: "tahun", key: "tahun", width: 90 },
    { title: "Program", dataIndex: "program", key: "program", ellipsis: true },
    { title: "Kegiatan", dataIndex: "kegiatan", key: "kegiatan", ellipsis: true },
    {
      title: "Versi",
      dataIndex: "version",
      key: "version",
      width: 70,
      render: (v) => v ?? "—",
    },
    {
      title: "Aksi",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Button size="small" type="link" onClick={() => navigate(`/rka/form/${record.id}`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Daftar Rencana Kerja & Anggaran (RKA)</h1>
        <Button type="primary" onClick={() => navigate("/rka/form/new")}>
          + Tambah RKA
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 10 }} scroll={{ x: 720 }} />
    </div>
  );
};

export default RkaListPage;

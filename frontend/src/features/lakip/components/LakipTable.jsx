// LakipTable.jsx
import React from "react";
import { Table, Button } from "antd";

const LakipTable = ({ data, onEdit, onDelete }) => {
  const columns = [
    { title: "Tahun", dataIndex: "tahun", key: "tahun" },
    { title: "Tujuan", dataIndex: "tujuan", key: "tujuan" },
    { title: "Sasaran", dataIndex: "sasaran", key: "sasaran" },
    { title: "Indikator", dataIndex: "indikator", key: "indikator" },
    { title: "Realisasi", dataIndex: "realisasi", key: "realisasi" },
    {
      title: "Aksi",
      key: "aksi",
      render: (_, record) => (
        <>
          <Button onClick={() => onEdit(record)}>Edit</Button>
          <Button danger onClick={() => onDelete(record.id)}>Hapus</Button>
        </>
      ),
    },
  ];

  return <Table rowKey="id" dataSource={data} columns={columns} />;
};

export default LakipTable;

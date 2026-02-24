// DpaListPage untuk modul DPA
import React, { useEffect, useState } from 'react';
import { Table, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getAllDpa } from '../services/dpaApi';

const DpaListPage = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getAllDpa().then(setData).catch(console.error);
  }, []);

  const columns = [
    { title: 'No', dataIndex: 'no', key: 'no', render: (_, __, i) => i + 1 },
    { title: 'Program', dataIndex: 'program', key: 'program' },
    { title: 'Kegiatan', dataIndex: 'kegiatan', key: 'kegiatan' },
    { title: 'Sub Kegiatan', dataIndex: 'sub_kegiatan', key: 'sub_kegiatan' },
    { title: 'Pagu', dataIndex: 'pagu', key: 'pagu', render: (val) => `Rp ${val.toLocaleString()}` },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button onClick={() => navigate(`/dpa/form/${record.id}`)}>Edit</Button>
          <Button danger>Hapus</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Daftar Dokumen Pelaksanaan Anggaran (DPA)</h1>
      <Button type="primary" onClick={() => navigate('/dpa/form/new')} style={{ marginBottom: '1rem' }}>
        Tambah DPA
      </Button>
      <Table rowKey="id" columns={columns} dataSource={data} pagination />
    </div>
  );
};

export default DpaListPage;

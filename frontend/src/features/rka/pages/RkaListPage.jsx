import React, { useEffect, useState } from 'react';
import { Table, Button, Dropdown, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DownloadOutlined, EditOutlined, DownOutlined } from '@ant-design/icons';
import { getAllRka } from '../services/rkaApi';

const RkaListPage = () => {
  const [data, setData] = useState([]);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getAllRka()
      .then((rows) => setData(Array.isArray(rows) ? rows : []))
      .catch(console.error);
  }, []);

  // Fungsi untuk menangani download berdasarkan format dan ID RKA
  const handleDownload = async (id, format) => {
    setLoadingDownload(true);
    message.loading({
      content: `Sedang menyiapkan berkas ${format.toUpperCase()}...`,
      key: 'downloading',
    });

    try {
      // 1. Alokasi URL murni ke Port Backend 3000
      const BACKEND_URL = 'http://localhost:3000';

      // 2. Pemetaan endpoint sesuai struktur rkaExportController & rkaRoutes
      let endpoint = '';
      if (format === 'pdf') endpoint = `${BACKEND_URL}/api/rka/${id}/export-pdf`;
      else if (format === 'xlsx') endpoint = `${BACKEND_URL}/api/rka/${id}/export-excel`;
      else if (format === 'docx') endpoint = `${BACKEND_URL}/api/rka/${id}/export-word`;

      // 3. Ambil token dari localStorage agar lolos dari middleware verifyToken di backend
      const token = localStorage.getItem('token');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal mengunduh berkas dari server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Menentukan ekstensi file yang tepat saat diunduh
      const extension = format === 'xlsx' ? 'xlsx' : format === 'docx' ? 'docx' : 'pdf';
      a.download = `RKA_LENGKAP_${id}.${extension}`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: `Berhasil mengunduh RKA (${format.toUpperCase()})`,
        key: 'downloading',
        duration: 2,
      });
    } catch (error) {
      console.error(error);
      message.error({
        content: error.message || `Gagal mengunduh berkas ${format.toUpperCase()}.`,
        key: 'downloading',
        duration: 3,
      });
    } finally {
      setLoadingDownload(false);
    }
  };

  // Membuat struktur menu dropdown untuk pilihan format cetak
  const getDownloadMenu = (record) => {
    return {
      items: [
        {
          key: 'pdf',
          label: 'Cetak PDF',
          onClick: () => handleDownload(record.id, 'pdf'),
        },
        {
          key: 'excel',
          label: 'Ekspor Excel',
          onClick: () => handleDownload(record.id, 'xlsx'),
        },
        {
          key: 'word',
          label: 'Ekspor Word',
          onClick: () => handleDownload(record.id, 'docx'),
        },
      ],
    };
  };

  const columns = [
    { title: 'No', key: 'no', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Tahun', dataIndex: 'tahun', key: 'tahun', width: 90 },
    { title: 'Program', dataIndex: 'program', key: 'program', ellipsis: true },
    { title: 'Kegiatan', dataIndex: 'kegiatan', key: 'kegiatan', ellipsis: true },
    {
      title: 'Versi',
      dataIndex: 'version',
      key: 'version',
      width: 70,
      render: (v) => v ?? '—',
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/rka/form/${record.id}`)}
          >
            Edit
          </Button>

          <Dropdown menu={getDownloadMenu(record)} trigger={['click']}>
            <Button
              size="small"
              type="text"
              icon={<DownloadOutlined />}
              loading={loadingDownload}
              style={{ color: '#2f54eb' }}
            >
              Unduh <DownOutlined style={{ fontSize: '10px' }} />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>Daftar Rencana Kerja & Anggaran (RKA)</h1>
        <Button type="primary" onClick={() => navigate('/rka/form/new')}>
          + Tambah RKA
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 720 }}
      />
    </div>
  );
};

export default RkaListPage;

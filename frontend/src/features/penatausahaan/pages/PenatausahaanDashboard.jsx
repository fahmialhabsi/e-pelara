import React from 'react';
import { Button, Card, Col, Dropdown, InputNumber, List, Modal, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { DownOutlined, ReloadOutlined, UploadOutlined, WalletOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import BukuKasUmum, { PENATAUSAHAAN_QUERY_KEY } from '../components/BukuKasUmum';
import UploadSKForm from '../components/UploadSKForm';
import UploadBuktiForm from '../components/UploadBuktiForm';
import { importRealisasiPdf, importRealisasiPdfBatch } from '../services/penatausahaanApi';
import api from '../../../services/api';

const { Title, Text } = Typography;

// Default ke tahun SEBELUMNYA, bukan tahun berjalan — laporan "Realisasi per Sub
// Kegiatan" SIPD selalu melaporkan TA yang sudah/sedang berjalan-selesai, dan
// baru dicetak belakangan (mis. dicetak Juli 2026 utk realisasi TA 2025), jadi
// tahun cetak PDF hampir selalu BUKAN tahun anggaran yang sebenarnya diimpor.
const DEFAULT_TAHUN = new Date().getFullYear() - 1;

const JENIS_TRANSAKSI_LABEL = { KKPD: 'KKPD', UP_GU: 'UP/GU', TU: 'TU', LS: 'LS' };

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const PenatausahaanDashboard = () => {
  const [tahun, setTahun] = React.useState(DEFAULT_TAHUN);
  const [loadingImport, setLoadingImport] = React.useState(false);
  const [loadingBatchImport, setLoadingBatchImport] = React.useState(false);
  const [batchImportResult, setBatchImportResult] = React.useState(null); // null = modal tertutup
  const fileInputRef = React.useRef(null);
  const batchFileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: PENATAUSAHAAN_QUERY_KEY(tahun),
    queryFn: async () => {
      const res = await api.get('/penatausahaan', { params: tahun ? { tahun } : {} });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const refreshTable = () => queryClient.invalidateQueries({ queryKey: PENATAUSAHAAN_QUERY_KEY(tahun) });

  const totalRealisasi = rows.reduce((sum, r) => sum + (Number(r.jumlah) || 0), 0);
  const totalPerJenis = rows.reduce((acc, r) => {
    const key = r.jenis_transaksi || 'LAINNYA';
    acc[key] = (acc[key] || 0) + (Number(r.jumlah) || 0);
    return acc;
  }, {});

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset supaya file yang sama bisa dipilih ulang
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Berkas harus berformat PDF.');
      return;
    }
    if (!tahun) {
      toast.error('Tahun anggaran wajib diisi dulu.');
      return;
    }
    setLoadingImport(true);
    try {
      const res = await importRealisasiPdf(file, tahun);
      toast.success(res.message || 'Realisasi berhasil diimpor dari PDF.');
      refreshTable();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.details?.map?.((d) => d.kode_rekening || d).join(', ') ||
        err.message ||
        'Gagal mengimpor PDF';
      toast.error(msg);
    } finally {
      setLoadingImport(false);
    }
  };

  // Import banyak berkas PDF realisasi SIPD sekaligus — tiap berkas diproses
  // independen di backend, jadi satu berkas gagal (mis. DPA belum ada, atau
  // sudah pernah diimpor) tidak menggagalkan berkas lain. Hasil per-berkas
  // ditampilkan di modal supaya user tahu persis mana yang berhasil/gagal.
  const handleImportBatchFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset supaya berkas yang sama bisa dipilih ulang
    if (!files.length) return;
    const nonPdf = files.filter((f) => f.type !== 'application/pdf');
    if (nonPdf.length) {
      toast.error(`${nonPdf.length} dari ${files.length} berkas yang dipilih bukan PDF. Semua harus berformat PDF.`);
      return;
    }
    if (!tahun) {
      toast.error('Tahun anggaran wajib diisi dulu.');
      return;
    }
    setLoadingBatchImport(true);
    try {
      const res = await importRealisasiPdfBatch(files, tahun);
      setBatchImportResult(res.results || []);
      if (res.success) toast.success(res.message);
      else toast.warning(res.message);
      refreshTable();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Gagal mengimpor berkas secara massal.';
      toast.error(msg);
    } finally {
      setLoadingBatchImport(false);
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            Dashboard Penatausahaan Keuangan
          </Title>
          <Text type="secondary">Buku Kas Umum, realisasi anggaran, dan dokumen pendukung — Dinas Pangan Provinsi Maluku Utara</Text>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card size="small">
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space wrap>
              <Tooltip title="Tahun anggaran realisasi — PDF SIPD tidak mencantumkan tahun secara eksplisit, jadi wajib diisi manual.">
                <InputNumber
                  value={tahun}
                  onChange={setTahun}
                  min={2000}
                  max={2100}
                  style={{ width: 180 }}
                  addonBefore="Tahun Anggaran"
                />
              </Tooltip>
              <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
                Refresh
              </Button>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportFile} />
              <input
                ref={batchFileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleImportBatchFile}
              />
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'import-single', label: 'Import 1 Berkas', onClick: () => fileInputRef.current?.click() },
                    {
                      key: 'import-batch',
                      label: 'Import Banyak Berkas Sekaligus',
                      onClick: () => batchFileInputRef.current?.click(),
                    },
                  ],
                }}
              >
                <Button type="primary" icon={<UploadOutlined />} loading={loadingImport || loadingBatchImport}>
                  Import Realisasi PDF SIPD <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary cards */}
      <Row gutter={12}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Total Transaksi</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>{rows.length}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Total Realisasi</Text>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0958d9', marginTop: 4 }}>{formatRupiah(totalRealisasi)}</div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Rincian per Jenis Transaksi</Text>
            <Space wrap style={{ marginTop: 6 }}>
              {['KKPD', 'UP_GU', 'TU', 'LS'].map((jenis) => (
                <Tag key={jenis} color={totalPerJenis[jenis] ? 'blue' : 'default'}>
                  {JENIS_TRANSAKSI_LABEL[jenis]}: {formatRupiah(totalPerJenis[jenis] || 0)}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Buku Kas Umum */}
      <Card
        title={
          <Space>
            <WalletOutlined style={{ color: '#0958d9' }} />
            <span>Buku Kas Umum</span>
          </Space>
        }
      >
        <BukuKasUmum tahun={tahun} />
      </Card>

      {/* Dokumen pendukung */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <UploadSKForm />
        </Col>
        <Col xs={24} md={12}>
          <UploadBuktiForm />
        </Col>
      </Row>

      <Modal
        title="Hasil Import Banyak Berkas Realisasi PDF SIPD"
        open={!!batchImportResult}
        onCancel={() => setBatchImportResult(null)}
        onOk={() => setBatchImportResult(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Tutup"
        width={640}
      >
        {batchImportResult && (
          <>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#595959' }}>
              {batchImportResult.filter((r) => r.success).length} dari {batchImportResult.length} berkas berhasil diimpor.
            </div>
            <List
              size="small"
              bordered
              dataSource={batchImportResult}
              renderItem={(r) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{r.filename}</span>
                      <Tag color={r.success ? 'success' : 'error'}>{r.success ? 'Berhasil' : 'Gagal'}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: r.success ? '#595959' : '#cf1322' }}>
                      {r.success ? r.message : r.error}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </Space>
  );
};

export default PenatausahaanDashboard;

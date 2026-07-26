// frontend/src/pages/mr/MrPlanningLhpListPage.jsx
// Modul TLHP — Daftar Laporan Hasil Pemeriksaan (LHP)

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import { PlusOutlined, ReloadOutlined, FileTextOutlined, UploadOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningLhpService, { MR_PLANNING_LHP_QUERY_KEYS } from "@/services/mrPlanningLhpService";

const { Title, Text } = Typography;

const safeText = (value, fallback = "-") => (value === undefined || value === null || value === "" ? fallback : String(value));

const STATUS_COLOR = { draft: "default", aktif: "processing", diarsipkan: "success" };
const STATUS_LABEL = { draft: "Draft", aktif: "Aktif", diarsipkan: "Diarsipkan" };

export default function MrPlanningLhpListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState({ tahun: "", status_dokumen: "" });
  const [search, setSearch] = React.useState("");
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importFileList, setImportFileList] = React.useState([]);
  const [importTahun, setImportTahun] = React.useState(undefined);
  const [importResult, setImportResult] = React.useState(null);

  const { data: allData = [], isFetching, refetch } = useQuery({
    queryKey: MR_PLANNING_LHP_QUERY_KEYS.list(filters),
    queryFn: () => mrPlanningLhpService.getAll(filters),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => mrPlanningLhpService.activate(id),
    onSuccess: () => {
      message.success("LHP berhasil diaktifkan — Temuan sudah bisa dibuat di bawahnya.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
    },
    onError: (error) => message.error(error?.response?.data?.message || "Gagal mengaktifkan LHP."),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => mrPlanningLhpService.archive(id),
    onSuccess: () => {
      message.success("LHP berhasil diarsipkan.");
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
    },
    onError: (error) => message.error(error?.response?.data?.message || "Gagal mengarsipkan LHP."),
  });

  const importMutation = useMutation({
    mutationFn: () => mrPlanningLhpService.importMatriksPdf(importFileList[0]?.originFileObj || importFileList[0], { tahun: importTahun }),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: MR_PLANNING_LHP_QUERY_KEYS.all });
    },
    onError: (error) => message.error(error?.response?.data?.message || "Import PDF Matriks TLHP gagal."),
  });

  const handleOpenImportModal = () => {
    setImportFileList([]);
    setImportTahun(undefined);
    setImportResult(null);
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFileList([]);
    setImportResult(null);
  };

  const rows = allData.filter((r) => {
    if (!search) return true;
    const haystack = `${r.nomor_lhp} ${r.judul_lhp} ${r.entitas_pemeriksa}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, i) => i + 1 },
    { title: "Nomor LHP", dataIndex: "nomor_lhp", render: (v) => safeText(v) },
    { title: "Judul", dataIndex: "judul_lhp", render: (v) => safeText(v) },
    { title: "Entitas", dataIndex: "entitas_pemeriksa", width: 130, render: (v) => safeText(v) },
    { title: "Tahun", dataIndex: "tahun", width: 80, align: "center" },
    { title: "Jml Temuan", dataIndex: "jumlah_temuan", width: 100, align: "center" },
    { title: "Jml Rekomendasi", dataIndex: "jumlah_rekomendasi", width: 120, align: "center" },
    {
      title: "Status",
      dataIndex: "status_dokumen",
      width: 110,
      align: "center",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Aksi",
      width: 320,
      align: "center",
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" disabled={record.status_dokumen !== "draft"} onClick={() => navigate(`/mr/planning-lhp/edit/${record.id}`)}>
            Ubah
          </Button>
          <Button size="small" disabled={record.status_dokumen !== "draft"} loading={activateMutation.isPending} onClick={() => activateMutation.mutate(record.id)}>
            Aktifkan
          </Button>
          <Button size="small" disabled={record.status_dokumen !== "aktif"} loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate(record.id)}>
            Arsipkan
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FileTextOutlined />}
            disabled={record.status_dokumen === "draft"}
            onClick={() => navigate(`/mr/planning-lhp/${record.id}/temuan`)}
          >
            Temuan
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            Laporan Hasil Pemeriksaan (LHP)
          </Title>
          <Text type="secondary">Pengelolaan Tindak Lanjut Temuan Inspektorat, BPK, dan BPKP</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleOpenImportModal}>
              Import PDF Matriks TLHP
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/mr/planning-lhp/create")}>
              Tambah LHP
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Space wrap>
          <Input.Search placeholder="Cari nomor/judul LHP..." allowClear style={{ width: 260 }} onSearch={setSearch} onChange={(e) => !e.target.value && setSearch("")} />
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            value={filters.status_dokumen || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, status_dokumen: v || "" }))}
            options={[
              { value: "draft", label: "Draft" },
              { value: "aktif", label: "Aktif" },
              { value: "diarsipkan", label: "Diarsipkan" },
            ]}
          />
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={isFetching} scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title="Import PDF Matriks Pemantauan TLHP BPK"
        open={isImportModalOpen}
        onCancel={handleCloseImportModal}
        footer={
          importResult
            ? [
                <Button key="close" type="primary" onClick={handleCloseImportModal}>
                  Selesai
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={handleCloseImportModal}>
                  Batal
                </Button>,
                <Button
                  key="import"
                  type="primary"
                  loading={importMutation.isPending}
                  disabled={!importFileList.length}
                  onClick={() => importMutation.mutate()}
                >
                  Import
                </Button>,
              ]
        }
        width={640}
      >
        {!importResult ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="Unggah file PDF Matriks Pemantauan Tindak Lanjut Hasil Pemeriksaan BPK (format resmi Inspektorat)."
              description="Data Temuan, Rekomendasi, dan Tindak Lanjut akan otomatis dibaca dan dimasukkan ke database. Data yang sudah pernah diimpor sebelumnya (Temuan/Rekomendasi yang sama) akan otomatis dilewati, tidak dobel."
            />

            <Upload.Dragger
              accept="application/pdf"
              maxCount={1}
              fileList={importFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setImportFileList(fileList)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Klik atau seret file PDF Matriks TLHP ke sini</p>
            </Upload.Dragger>

            <div>
              <Typography.Text>Tahun (opsional — kosongkan untuk deteksi otomatis dari isi PDF):</Typography.Text>
              <InputNumber
                style={{ width: "100%", marginTop: 4 }}
                min={2000}
                max={2100}
                placeholder="Contoh: 2025"
                value={importTahun}
                onChange={setImportTahun}
              />
            </div>
          </Space>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              type="success"
              showIcon
              message={`Import selesai untuk SKPD: ${safeText(importResult.skpd)}`}
              description={`${importResult.temuan_added} Temuan baru, ${importResult.rekomendasi_added} Rekomendasi baru, ${importResult.tindak_lanjut_added} Tindak Lanjut baru ditambahkan.`}
            />

            <List
              size="small"
              bordered
              dataSource={[
                `LHP dibuat baru: ${importResult.lhp_created?.length || 0}`,
                `LHP sudah ada (dipakai ulang): ${importResult.lhp_reused?.length || 0}`,
                `Temuan ditambahkan: ${importResult.temuan_added}`,
                `Temuan dilewati (sudah ada sebelumnya): ${importResult.temuan_skipped_duplicate}`,
                `Rekomendasi ditambahkan: ${importResult.rekomendasi_added}`,
                `Tindak Lanjut ditambahkan: ${importResult.tindak_lanjut_added}`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />

            {importResult.warnings?.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Beberapa baris perlu dicek manual"
                description={
                  <List
                    size="small"
                    dataSource={importResult.warnings}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                }
              />
            )}

            <Alert
              type="info"
              showIcon
              message="Data hasil import berstatus Draft."
              description="Silakan cek dan lengkapi (Nomor LHP, Surat Tugas, dll) lewat menu Ubah sebelum LHP diaktifkan/disetujui."
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}

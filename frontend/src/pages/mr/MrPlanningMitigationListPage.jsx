// frontend/src/pages/mr/MrPlanningMitigationListPage.jsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Tooltip,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from "@/services/mrPlanningRiskService";

import mrPlanningMitigationService, {
  MR_MITIGATION_DOCUMENT_TYPES,
  MR_MITIGATION_DOCUMENT_TYPE_LABELS,
  MR_PLANNING_MITIGATION_QUERY_KEYS,
} from "@/services/mrPlanningMitigationService";

const { Title, Text } = Typography;

const LIST_PATH = "/mr/planning-risk";

const safeText = (value, fallback = "Belum Tersedia") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const normalizeStatus = (value) => String(value || "draft").toLowerCase();

const getStatusLabel = (value) => {
  const map = {
    draft: "Draft",
    verifikasi: "Dalam Verifikasi",
    diajukan: "Diajukan",
    diverifikasi: "Diverifikasi",
    approved: "Disetujui",
    disetujui: "Disetujui",
    ditolak: "Ditolak / Perlu Perbaikan",
  };

  return map[normalizeStatus(value)] || safeText(value);
};

const getStatusColor = (value) => {
  const map = {
    draft: "default",
    verifikasi: "processing",
    diajukan: "processing",
    diverifikasi: "blue",
    approved: "success",
    disetujui: "success",
    ditolak: "error",
  };

  return map[normalizeStatus(value)] || "default";
};

const getRiskCode = (risk = {}) =>
  risk.kode_risiko || risk.risk_code || risk.kode || "Belum Tersedia";

const getRiskName = (risk = {}) =>
  risk.nama_risiko ||
  risk.risk_name ||
  risk.uraian_risiko ||
  risk.deskripsi_risiko ||
  "Belum Tersedia";

const getRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === "string") return data;
  if (error?.message) return error.message;

  return "Data Rencana Tindak Pengendalian belum dapat dimuat.";
};

const getDocumentRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

const getFileFromUpload = (event) => {
  if (Array.isArray(event)) return event;
  return event?.fileList || [];
};

const getSelectedFile = (fileList = []) => {
  const first = Array.isArray(fileList) ? fileList[0] : null;
  return first?.originFileObj || first || null;
};

const getMitigationId = (record = {}) =>
  record?.id || record?.mr_planning_mitigation_id || null;

const getDocumentCountLabel = (count = 0) => {
  const total = Number(count || 0);

  if (!Number.isInteger(total) || total <= 0) {
    return "Belum Ada";
  }

  return `${total} Dokumen`;
};

const getDocumentCountColor = (count = 0) => {
  const total = Number(count || 0);
  return total > 0 ? "success" : "default";
};

const getNextDocumentNumber = (mitigation = {}, documents = []) => {
  const mitigationId = Number(getMitigationId(mitigation) || 0);
  const activeDocumentCount = Array.isArray(documents) ? documents.length : 0;

  const documentDate =
    mitigation.target_tanggal ||
    mitigation.target_waktu ||
    mitigation.target_waktu_selesai ||
    mitigation.tanggal_selesai ||
    new Date().toISOString();

  const year = String(documentDate).slice(0, 4);
  const sequence = String(activeDocumentCount + 1).padStart(3, "0");

  if (!mitigationId || !year) {
    return "";
  }

  return `DRAFT/RTP/${mitigationId}/${sequence}/${year}`;
};

const getOfficialDocumentDownloadUrl = (record = {}, mode = "download") => {
  if (!record?.id) return null;

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000/api";

  const normalizedBaseUrl = String(apiBaseUrl).replace(/\/$/, "");

  return `${normalizedBaseUrl}/mr-planning-mitigation/documents/${record.id}/download?mode=${mode}`;
};

const openDocumentFile = (record = {}) => {
  const url = getOfficialDocumentDownloadUrl(record, "view");

  if (!url) return false;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

const downloadDocumentFile = (record = {}) => {
  const url = getOfficialDocumentDownloadUrl(record, "download");

  if (!url) return false;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

export default function MrPlanningMitigationListPage() {
  const { riskId } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [uploadForm] = Form.useForm();
  const [selectedMitigation, setSelectedMitigation] = React.useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [uploadFileList, setUploadFileList] = React.useState([]);

  const {
    data: riskResponse,
    isLoading: isLoadingRisk,
    error: riskError,
    refetch: refetchRisk,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(riskId),
    queryFn: () =>
      mrPlanningRiskService.getById(riskId, { include_governance: true }),
    enabled: Boolean(riskId),
  });

  const {
    data: mitigationResponse,
    isLoading: isLoadingMitigation,
    isFetching,
    error: mitigationError,
    refetch: refetchMitigation,
  } = useQuery({
    queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.byRisk(riskId),
    queryFn: () => mrPlanningMitigationService.getByRisk(riskId),
    enabled: Boolean(riskId),
  });

  const risk = riskResponse?.data || riskResponse || null;
  const rows = getRows(mitigationResponse);

  const selectedMitigationId =
    selectedMitigation?.id || selectedMitigation?.mr_planning_mitigation_id;

  const {
    data: documentResponse,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.documents(selectedMitigationId),
    queryFn: () => mrPlanningMitigationService.getDocuments(selectedMitigationId),
    enabled: Boolean(isUploadModalOpen && selectedMitigationId),
  });

  const documentRows = getDocumentRows(documentResponse);

  const documentCountQueries = useQueries({
    queries: rows.map((item) => {
      const mitigationId = getMitigationId(item);

      return {
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.documents(mitigationId),
        queryFn: () => mrPlanningMitigationService.getDocuments(mitigationId),
        enabled: Boolean(mitigationId),
        staleTime: 30 * 1000,
      };
    }),
  });

  const documentCountByMitigation = rows.reduce((acc, item, index) => {
    const mitigationId = getMitigationId(item);
    const queryResult = documentCountQueries[index];
    const documentList = getDocumentRows(queryResult?.data);

    acc[String(mitigationId || "")] = {
      count: documentList.length,
      isLoading: Boolean(queryResult?.isLoading || queryResult?.isFetching),
    };

    return acc;
  }, {});

  const getLatestDocumentsForMitigation = async (mitigationId) => {
    if (!mitigationId) return [];

    const queryKey = MR_PLANNING_MITIGATION_QUERY_KEYS.documents(mitigationId);

    const cachedData = queryClient.getQueryData(queryKey);
    const cachedRows = getDocumentRows(cachedData);

    if (cachedRows.length > 0) {
      return cachedRows;
    }

    const fetchedData = await queryClient.fetchQuery({
      queryKey,
      queryFn: () => mrPlanningMitigationService.getDocuments(mitigationId),
    });

    return getDocumentRows(fetchedData);
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, alasan_pembatalan }) =>
      mrPlanningMitigationService.cancelDraft(id, { alasan_pembatalan }),

    onSuccess: () => {
      message.success("Draft Rencana Tindak Pengendalian berhasil dibatalkan.");

      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.byRisk(riskId),
      });
    },

    onError: (error) => {
      message.error(getBackendErrorMessage(error));
    },
  });

  const resetUploadFormToDefault = (
    mitigation = selectedMitigation,
    documents = documentRows
  ) => {
    if (!mitigation) return;

    const currentDocumentType =
      uploadForm.getFieldValue("document_type") || "SK_TIM_TINDAK_LANJUT";

    const defaultValues =
      mrPlanningMitigationService.buildDefaultMitigationDocumentValues(
        mitigation,
        currentDocumentType
      );

    uploadForm.setFieldsValue({
      ...defaultValues,
      document_number: getNextDocumentNumber(mitigation, documents),
    });

    setUploadFileList([]);
  };

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ mitigationId, values }) =>
      mrPlanningMitigationService.uploadDocument(mitigationId, values),

    onSuccess: async () => {
      message.success("Dokumen Rencana Tindak Pengendalian berhasil diunggah.");

      await refetchDocuments();

      await queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.documents(selectedMitigationId),
      });

      await queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.byRisk(riskId),
      });

      handleCloseUploadModal();
      navigate(`${LIST_PATH}/${riskId}/mitigation`);
    },

    onError: (error) => {
      message.error(getBackendErrorMessage(error));
    },
  });

  const cancelDocumentMutation = useMutation({
    mutationFn: ({ documentId, cancelReason }) =>
      mrPlanningMitigationService.cancelDocument(documentId, cancelReason),

    onSuccess: () => {
      message.success("Dokumen Rencana Tindak Pengendalian berhasil dibatalkan.");
      refetchDocuments();

      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.documents(selectedMitigationId),
      });
    },

    onError: (error) => {
      message.error(getBackendErrorMessage(error));
    },
  });

  const hasDraftRtp = rows.some(
    (item) => String(item?.status_revisi || "").toLowerCase() === "draft"
  );

  const isLoading = isLoadingRisk || isLoadingMitigation;

  const handleRefresh = () => {
    refetchRisk();
    refetchMitigation();
    message.success("Data Rencana Tindak Pengendalian diperbarui.");
  };

  const handleCancelDraft = (record) => {
    const id = record?.id || record?.mr_planning_mitigation_id;

    if (!id) {
      message.error("ID Rencana Tindak Pengendalian tidak ditemukan.");
      return;
    }

    if (String(record?.status_revisi || "").toLowerCase() !== "draft") {
      message.warning(
        "Rencana Tindak Pengendalian hanya dapat dibatalkan saat berstatus Draft."
      );
      return;
    }

    modal.confirm({
      title: "Batalkan Draft Rencana Tindak Pengendalian?",
      content:
        "Data tidak akan dihapus permanen. Draft akan dinonaktifkan dan disimpan sebagai jejak audit.",
      okText: "Batalkan Draft",
      cancelText: "Kembali",
      okButtonProps: {
        danger: true,
      },
      onOk: () =>
        cancelMutation.mutate({
          id,
          alasan_pembatalan:
            "Draft Rencana Tindak Pengendalian dibatalkan melalui halaman daftar.",
        }),
    });
  };

  const handleUploadPlanningDocument = async (record) => {
    const id = record?.id || record?.mr_planning_mitigation_id;

    if (!id) {
      message.error("ID Rencana Tindak Pengendalian tidak ditemukan.");
      return;
    }

    setSelectedMitigation(record);
    setUploadFileList([]);

    const latestDocuments = await getLatestDocumentsForMitigation(id);

    const defaultValues =
      mrPlanningMitigationService.buildDefaultMitigationDocumentValues(
        record,
        "SK_TIM_TINDAK_LANJUT"
      );

    uploadForm.setFieldsValue({
      ...defaultValues,
      document_number: getNextDocumentNumber(record, latestDocuments),
    });

    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedMitigation(null);
    setUploadFileList([]);
    uploadForm.resetFields();
  };

  const handleDocumentTypeChange = async (documentType) => {
    if (!selectedMitigation) return;

    const latestDocuments = await getLatestDocumentsForMitigation(
      selectedMitigationId
    );

    const defaultValues =
      mrPlanningMitigationService.buildDefaultMitigationDocumentValues(
        selectedMitigation,
        documentType
      );

    uploadForm.setFieldsValue({
      ...defaultValues,
      document_number: getNextDocumentNumber(selectedMitigation, latestDocuments),
    });
  };

  const handleSubmitUploadDocument = async () => {
    const values = await uploadForm.validateFields();
    const file = getSelectedFile(uploadFileList);

    if (!file) {
      message.error("Dokumen wajib dipilih.");
      return;
    }

    await uploadDocumentMutation.mutateAsync({
      mitigationId: selectedMitigationId,
      values: {
        ...values,
        file,
      },
    });
  };

  const columns = [
    {
      title: "No",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Kegiatan Pengendalian",
      dataIndex: "kegiatan_pengendalian",
      render: (value) => safeText(value),
    },
    {
      title: "Target Output",
      dataIndex: "target_output",
      render: (value) => safeText(value),
    },
    {
      title: "Indikator Keluaran",
      dataIndex: "indikator_keluaran",
      render: (value) => safeText(value),
    },
    {
      title: "Penanggung Jawab",
      dataIndex: "penanggung_jawab",
      width: 220,
      render: (value) => safeText(value),
    },
    {
      title: "Target Waktu",
      width: 160,
      render: (_, record) => {
        const value =
          record?.target_tanggal ||
          record?.target_waktu ||
          record?.target_waktu_selesai ||
          record?.tanggal_selesai;

        if (!value) return "Belum Tersedia";

        return String(value).slice(0, 10);
      },
    },
    {
      title: "Dokumen RTP",
      width: 150,
      align: "center",
      render: (_, record) => {
        const mitigationId = getMitigationId(record);
        const documentInfo =
          documentCountByMitigation[String(mitigationId || "")] || {};
        const count = documentInfo.count || 0;

        if (documentInfo.isLoading) {
          return <Tag>Memuat...</Tag>;
        }

        return (
          <Tag color={getDocumentCountColor(count)}>
            {getDocumentCountLabel(count)}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status_revisi",
      width: 150,
      align: "center",
      render: (value) => (
        <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag>
      ),
    },
    {
      title: "Aksi",
      width: 360,
      align: "center",
      render: (_, record) => {
        const id = record?.id || record?.mr_planning_mitigation_id;

        return (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!id}
              onClick={() =>
                navigate(`${LIST_PATH}/${riskId}/mitigation/${id}/edit`)
              }
            >
              Ubah
            </Button>

            <Tooltip title="Unggah Dokumen Rencana Tindak Pengendalian">
              <Button
                size="small"
                icon={<UploadOutlined />}
                disabled={!id}
                onClick={() => handleUploadPlanningDocument(record)}
              >
                Unggah Dokumen
              </Button>
            </Tooltip>

            <Tooltip title="Batalkan Draft Rencana Tindak Pengendalian">
              <Button
                size="small"
                danger
                disabled={
                  !id ||
                  String(record?.status_revisi || "").toLowerCase() !== "draft"
                }
                loading={cancelMutation.isPending}
                onClick={() => handleCancelDraft(record)}
              >
                Batalkan
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ marginBottom: 0 }}>
              Rencana Tindak Pengendalian
            </Title>
            <Text type="secondary">
              Daftar rencana tindak pengendalian untuk risiko yang dipilih.
            </Text>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(LIST_PATH)}
            >
              Kembali
            </Button>

            <Button
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={handleRefresh}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (hasDraftRtp) {
                  message.warning(
                    "Risiko ini sudah memiliki Draft Rencana Tindak Pengendalian. Periksa daftar terlebih dahulu sebelum membuat rencana tambahan."
                  );
                }

                navigate(`${LIST_PATH}/${riskId}/mitigation/create`);
              }}
            >
              Tambah Rencana
            </Button>
          </Space>
        </Col>
      </Row>

      {(riskError || mitigationError) && (
        <Alert
          type="warning"
          showIcon
          message="Data belum dapat dimuat sepenuhnya"
          description={
            getBackendErrorMessage(riskError) ||
            getBackendErrorMessage(mitigationError)
          }
        />
      )}

      <Card>
        {isLoading ? (
          <Spin />
        ) : (
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 1, md: 2 }}
          >
            <Descriptions.Item label="Kode Risiko">
              {safeText(getRiskCode(risk))}
            </Descriptions.Item>

            <Descriptions.Item label="Status Risiko">
              <Tag color={getStatusColor(risk?.status_revisi)}>
                {getStatusLabel(risk?.status_revisi)}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Nama Risiko" span={2}>
              {safeText(getRiskName(risk))}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Catatan alur"
          description="Rencana Tindak Pengendalian digunakan untuk mencatat kegiatan pengendalian, target output, indikator keluaran, penanggung jawab, dan target waktu. Data ini akan menjadi dasar Lampiran Rencana Tindak Pengendalian pada laporan."
        />

        <Table
          rowKey={(record) =>
            record?.id || record?.mr_planning_mitigation_id || Math.random()
          }
          loading={isLoadingMitigation || isFetching}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1450  }}
          locale={{
            emptyText: (
              <Empty description="Belum ada Rencana Tindak Pengendalian dalam cakupan risiko ini." />
            ),
          }}
        />
      </Card>

      <Modal
        title="Unggah Dokumen Rencana Tindak Pengendalian"
        open={isUploadModalOpen}
        onCancel={handleCloseUploadModal}
        width={1180}
        okText="Unggah Dokumen"
        cancelText="Tutup"
        confirmLoading={uploadDocumentMutation.isPending}
        onOk={handleSubmitUploadDocument}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Catatan Pengisian"
            description="Sebagian informasi dokumen telah diisi otomatis untuk mempercepat pekerjaan. Pemilik Risiko tetap wajib memeriksa kesesuaian jenis dokumen, nomor dokumen, tanggal dokumen, dan dokumen yang diunggah."
          />

          <Form form={uploadForm} layout="vertical">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Jenis Dokumen"
                  name="document_type"
                  rules={[
                    {
                      required: true,
                      message: "Jenis dokumen wajib dipilih.",
                    },
                  ]}
                >
                  <Select
                    options={MR_MITIGATION_DOCUMENT_TYPES}
                    onChange={handleDocumentTypeChange}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Tanggal Dokumen"
                  name="document_date"
                  rules={[
                    {
                      required: true,
                      message: "Tanggal dokumen wajib diisi.",
                    },
                  ]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Nomor Dokumen"
                  name="document_number"
                  extra="Nomor ini diisi otomatis sebagai draft awal, misalnya DRAFT/RTP/7/001/2026, dan dapat disesuaikan dengan nomor resmi pada dokumen."
                >
                  <Input placeholder="Isi nomor dokumen sesuai dokumen resmi" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Judul Dokumen"
                  name="document_title"
                  rules={[
                    {
                      required: true,
                      message: "Judul dokumen wajib diisi.",
                    },
                  ]}
                >
                  <Input placeholder="Judul dokumen" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Keterangan" name="description">
                  <Input.TextArea
                    rows={3}
                    placeholder="Keterangan singkat mengenai dokumen yang diunggah"
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label="Dokumen"
                  name="file"
                  valuePropName="fileList"
                  getValueFromEvent={getFileFromUpload}
                  rules={[
                    {
                      required: true,
                      message: "Dokumen wajib dipilih.",
                    },
                  ]}
                  extra="Dokumen wajib dipilih secara manual. Format yang didukung: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, atau PNG. Maksimal 10 MB."
                >
                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    fileList={uploadFileList}
                    onChange={({ fileList }) => {
                      setUploadFileList(fileList);
                      uploadForm.setFieldsValue({ file: fileList });
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Pilih Dokumen</Button>
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Card
            size="small"
            title="Daftar Dokumen Rencana Tindak Pengendalian"
          >
            <Table
              size="small"
              rowKey={(record) => record.id}
              loading={isLoadingDocuments}
              dataSource={documentRows}
              pagination={false}
              scroll={{ x: 1250 }}
              columns={[
                {
                  title: "Jenis Dokumen",
                  dataIndex: "document_type",
                  width: 190,
                  render: (value, record) =>
                    record.document_type_label ||
                    MR_MITIGATION_DOCUMENT_TYPE_LABELS[value] ||
                    safeText(value),
                },
                {
                  title: "Judul Dokumen",
                  dataIndex: "document_title",
                  width: 220,
                  render: (value) => safeText(value),
                },
                {
                  title: "Nama Dokumen",
                  dataIndex: "original_file_name",
                  width: 220,
                  render: (value) => safeText(value, "-"),
                },
                {
                  title: "Nomor Dokumen",
                  dataIndex: "document_number",
                  width: 170,
                  render: (value) => safeText(value, "-"),
                },
                {
                  title: "Tanggal",
                  dataIndex: "document_date",
                  width: 130,
                  render: (value) => safeText(value, "-"),
                },
                {
                  title: "Status",
                  dataIndex: "status_dokumen",
                  width: 120,
                  render: (value) => (
                    <Tag color={value === "aktif" ? "success" : "default"}>
                      {value === "aktif" ? "Aktif" : safeText(value)}
                    </Tag>
                  ),
                },
                {
                  title: "Lihat",
                  width: 100,
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      disabled={!record?.id}
                      onClick={() => {
                        const opened = openDocumentFile(record);

                        if (!opened) {
                          message.warning("Dokumen belum memiliki tautan yang dapat dibuka.");
                        }
                      }}
                    >
                      Lihat
                    </Button>
                  ),
                },
                {
                  title: "Unduh",
                  width: 110,
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      disabled={!record?.id}
                      onClick={() => {
                        const opened = downloadDocumentFile(record);

                        if (!opened) {
                          message.warning("Dokumen belum memiliki tautan yang dapat diunduh.");
                        }
                      }}
                    >
                      Unduh
                    </Button>
                  ),
                },
                {
                  title: "Ubah",
                  width: 90,
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        uploadForm.setFieldsValue({
                          document_type: record.document_type,
                          document_title: record.document_title,
                          document_number: record.document_number,
                          document_date: record.document_date,
                          description: record.description,
                        });

                        setUploadFileList([]);
                        message.info(
                          "Data dokumen dimuat ke form. Pilih dokumen baru lalu unggah sebagai dokumen pengganti."
                        );
                      }}
                    >
                      Ubah
                    </Button>
                  ),
                },
                {
                  title: "Aksi",
                  width: 190,
                  render: (_, record) => (
                    <Popconfirm
                      title="Batalkan Dokumen?"
                      description="Dokumen akan dibatalkan sebagai arsip tidak aktif dan tidak ditampilkan pada daftar dokumen aktif."
                      okText="Ya, Batalkan"
                      cancelText="Tidak"
                      onConfirm={() =>
                        cancelDocumentMutation.mutate({
                          documentId: record.id,
                          cancelReason:
                            "Dokumen dibatalkan melalui halaman Rencana Tindak Pengendalian.",
                        })
                      }
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={cancelDocumentMutation.isPending}
                      >
                        Batalkan Dokumen
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]}
              locale={{
                emptyText:
                  "Belum ada Dokumen Rencana Tindak Pengendalian yang aktif.",
              }}
            />
          </Card>
        </Space>
      </Modal>
    </Space>
  );
}
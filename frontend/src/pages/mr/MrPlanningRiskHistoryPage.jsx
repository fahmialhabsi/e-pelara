// frontend/src/pages/mr/MrPlanningRiskHistoryPage.jsx

import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from "@/services/mrPlanningRiskService";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { normalizeRole } from "@/utils/roleUtils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const LIST_PATH = "/mr/planning-risk";

const APPROVE_ROLES = ["SUPER_ADMIN"];
const VERIFIKASI_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const TOLAK_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const REBUILD_ROLES = ["SUPER_ADMIN"];

const STATUS_COLOR_MAP = {
  draft: "default",
  verifikasi: "processing",
  approved: "success",
  ditolak: "error",
};

const STATUS_LABEL_MAP = {
  draft: "Draft",
  verifikasi: "Dalam Verifikasi",
  approved: "Disetujui",
  ditolak: "Ditolak",
};

const safeString = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const normalizeStatus = (value) => safeString(value, "draft").toLowerCase();

const getHistoryId = (record) =>
  record?.history_id ??
  record?.id ??
  record?.mr_planning_risk_history_id ??
  record?.risk_history_id;

const getRiskIdFromHistory = (record, fallbackId) =>
  record?.risk_id ??
  record?.mr_planning_risk_id ??
  record?.planning_risk_id ??
  record?.mr_risk_id ??
  record?.id_risk ??
  fallbackId;

const getVersionLabel = (record) => {
  const before = record?.versi_sebelum;
  const after = record?.versi_sesudah;

  if (before !== undefined && after !== undefined) {
    return `${before} → ${after}`;
  }

  if (record?.versi !== undefined) return String(record.versi);

  return "-";
};

const formatJson = (value) => {
  if (!value) return "-";

  try {
    if (typeof value === "string") {
      return JSON.stringify(JSON.parse(value), null, 2);
    }

    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const parseJsonObject = (value) => {
  if (!value) return null;

  try {
    if (typeof value === "string") return JSON.parse(value);
    if (typeof value === "object") return value;
  } catch {
    return null;
  }

  return null;
};

const getRiskNameFromHistory = (record) => {
  const after = parseJsonObject(record?.after_json);
  const before = parseJsonObject(record?.before_json);

  return (
    record?.nama_risiko ||
    record?.risk_name ||
    after?.nama_risiko ||
    after?.uraian_risiko ||
    before?.nama_risiko ||
    before?.uraian_risiko ||
    "-"
  );
};

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === "string") return data;
  if (error?.message) return error.message;

  return "Terjadi kesalahan saat memproses history MR Planning Risk.";
};

const buildBackendDetail = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") return null;

  const details = [];

  if (data.code) details.push(`Kode: ${data.code}`);
  if (data.blocked !== undefined) details.push(`Blocked: ${String(data.blocked)}`);
  if (data.audit_mode !== undefined) {
    details.push(`Audit Mode: ${String(data.audit_mode)}`);
  }
  if (Array.isArray(data.missing_fields) && data.missing_fields.length) {
    details.push(`Missing fields: ${data.missing_fields.join(", ")}`);
  }
  if (Array.isArray(data.blocked_fields) && data.blocked_fields.length) {
    details.push(`Blocked fields: ${data.blocked_fields.join(", ")}`);
  }
  if (Array.isArray(data.details) && data.details.length) {
    details.push(`Details: ${data.details.join(", ")}`);
  }

  return details.length ? details.join(" | ") : null;
};

const getActionAvailability = (status) => {
  const normalized = normalizeStatus(status);

  return {
    verifikasi: normalized === "draft",
    approve: normalized === "verifikasi",
    tolak: normalized === "verifikasi",
    rebuild: normalized === "approved",
  };
};

const getActionHint = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "draft") return "Draft hanya bisa diverifikasi.";
  if (normalized === "verifikasi") return "Siap di-approve atau ditolak.";
  if (normalized === "approved") return "Approved bisa direbuild ke active record.";
  if (normalized === "ditolak") return "Ditolak tidak punya aksi lanjutan di halaman ini.";

  return "Aksi mengikuti status history.";
};

const getAvailableActionText = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "draft") return "Aksi tersedia: Verifikasi";
  if (normalized === "verifikasi") return "Aksi tersedia: Approve, Tolak";
  if (normalized === "approved") return "Aksi tersedia: Rebuild";
  return "Tidak ada aksi lanjutan";
};

const getGovernanceStatusLabel = (status, blockingCount) => {
  const value = String(status || "").toLowerCase();
  if (value === "merah") return "MERAH";
  if (value === "kuning") return "KUNING TERKENDALI";
  if (value.includes("hijau") && Number(blockingCount || 0) === 0) return "HIJAU TERKENDALI";
  return "KUNING";
};

export default function MrPlanningRiskHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const { user } = useAuth();

  const roleNorm = normalizeRole(user?.role);
  const canVerifikasi = VERIFIKASI_ROLES.includes(roleNorm);
  const canApprove = APPROVE_ROLES.includes(roleNorm);
  const canTolak = TOLAK_ROLES.includes(roleNorm);
  const canRebuild = REBUILD_ROLES.includes(roleNorm);

  const [backendError, setBackendError] = useState(null);
  const [jsonModal, setJsonModal] = useState({
    open: false,
    title: "",
    content: "",
  });

  const {
    data: histories = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.history(id),
    queryFn: () => mrPlanningRiskService.getHistory(id),
    enabled: Boolean(id),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: MR_PLANNING_RISK_QUERY_KEYS.all,
    });
    queryClient.invalidateQueries({
      queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(id),
    });
    queryClient.invalidateQueries({
      queryKey: MR_PLANNING_RISK_QUERY_KEYS.history(id),
    });
  };

  const verifikasiMutation = useMutation({
    mutationFn: ({ historyId, payload }) =>
      mrPlanningRiskService.verifikasiHistory(historyId, payload),
    onSuccess: (response) => {
      message.success(response?.message || "History berhasil diverifikasi.");
      setBackendError(null);
      invalidateAll();
    },
    onError: (err) => {
      setBackendError(err);
      message.error(getBackendErrorMessage(err));
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ historyId, payload }) =>
      mrPlanningRiskService.approveHistory(historyId, payload),
    onSuccess: (response) => {
      message.success(response?.message || "History berhasil disetujui.");
      setBackendError(null);
      invalidateAll();
    },
    onError: (err) => {
      setBackendError(err);
      message.error(getBackendErrorMessage(err));
    },
  });

  const tolakMutation = useMutation({
    mutationFn: ({ historyId, payload }) =>
      mrPlanningRiskService.tolakHistory(historyId, payload),
    onSuccess: (response) => {
      message.success(response?.message || "History berhasil ditolak.");
      setBackendError(null);
      invalidateAll();
    },
    onError: (err) => {
      setBackendError(err);
      message.error(getBackendErrorMessage(err));
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: ({ riskId, payload }) =>
      mrPlanningRiskService.rebuildFromHistory(riskId, payload),
    onSuccess: (response) => {
      message.success(
        response?.message || "Active record berhasil direbuild dari approved history."
      );
      setBackendError(null);
      invalidateAll();
    },
    onError: (err) => {
      setBackendError(err);
      message.error(getBackendErrorMessage(err));
    },
  });

  const isMutating =
    verifikasiMutation.isPending ||
    approveMutation.isPending ||
    tolakMutation.isPending ||
    rebuildMutation.isPending;

  const openJsonModal = (title, value) => {
    setJsonModal({
      open: true,
      title,
      content: formatJson(value),
    });
  };

  const resolveContextIdForRecord = async (record) => {
    const fromRecord = record?.context_id ?? record?.mr_planning_context_id ?? null;
    if (fromRecord) return Number(fromRecord);

    const riskId = getRiskIdFromHistory(record, id);
    if (!riskId) return null;

    try {
      const riskDetailResponse = await mrPlanningRiskService.getById(riskId);
      const riskDetail = riskDetailResponse?.data || riskDetailResponse || {};
      return Number(
        riskDetail?.context_id ?? riskDetail?.mr_planning_context_id ?? null
      );
    } catch {
      return null;
    }
  };

  const handleVerifikasi = (record) => {
    const historyId = getHistoryId(record);
    if (!historyId) {
      message.error("History ID tidak ditemukan.");
      return;
    }

    modal.confirm({
      title: "Verifikasi history revisi?",
      content:
        "History akan masuk status verifikasi sesuai workflow draft → verifikasi → approved/ditolak.",
      okText: "Verifikasi",
      cancelText: "Batal",
      onOk: () =>
        verifikasiMutation.mutate({
          historyId,
          payload: {},
        }),
    });
  };

  const handleApprove = (record) => {
    const historyId = getHistoryId(record);
    if (!historyId) {
      message.error("History ID tidak ditemukan.");
      return;
    }

    modal.confirm({
      title: "Approve history revisi?",
      content:
        "History yang disetujui akan menjadi sumber perubahan active record sesuai guard backend.",
      okText: "Approve",
      cancelText: "Batal",
      okButtonProps: { type: "primary" },
      onOk: async () => {
        const contextId = await resolveContextIdForRecord(record);
        if (contextId) {
          const scanRes = await api.get(`/mr-report/context/${contextId}/integrity-scan`);
          const scan = scanRes?.data?.data || scanRes?.data || {};
          const blockingCount = Number(scan?.blocking_count || 0);
          if (blockingCount > 0) {
            const topBlocking = (Array.isArray(scan?.findings) ? scan.findings : [])
              .filter((f) => String(f?.severity || "").toLowerCase() === "blocking")
              .slice(0, 3)
              .map((f) => `- ${f?.message || f?.code || "Temuan blocking"}`)
              .join("\n");
            modal.warning({
              title: "Integrity Gate Menolak Approve",
              content: (
                <div>
                  <p>Status: {getGovernanceStatusLabel(scan?.overall_status, blockingCount)}</p>
                  <p>Jumlah blocker: {blockingCount}</p>
                  <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{topBlocking}</pre>
                </div>
              ),
            });
            return;
          }
        }

        approveMutation.mutate({
          historyId,
          payload: {},
        });
      },
    });
  };

  const handleTolak = (record) => {
    const historyId = getHistoryId(record);
    if (!historyId) {
      message.error("History ID tidak ditemukan.");
      return;
    }

    const status = normalizeStatus(record?.status_revisi);
    if (status !== "verifikasi") {
      message.info("Tolak hanya tersedia untuk history berstatus verifikasi.");
      return;
    }

    let alasan = "";

    modal.confirm({
      title: "Tolak history revisi?",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            Masukkan alasan penolakan agar histori audit tetap lengkap.
          </Text>
          <TextArea
            rows={4}
            placeholder="Alasan penolakan"
            onChange={(event) => {
              alasan = event.target.value;
            }}
          />
        </Space>
      ),
      okText: "Tolak",
      cancelText: "Batal",
      okButtonProps: { danger: true },
      onOk: () => {
        if (!alasan?.trim()) {
          message.warning("Alasan penolakan wajib diisi.");
          return Promise.reject();
        }

        return tolakMutation.mutateAsync({
          historyId,
          payload: {
            alasan_penolakan: alasan,
            catatan: alasan,
          },
        });
      },
    });
  };

  const handleRebuild = (record) => {
    const riskId = getRiskIdFromHistory(record, id);
    if (!riskId) {
      message.error("Risk ID tidak ditemukan.");
      return;
    }

    modal.confirm({
      title: "Rebuild active record dari approved history terakhir?",
      content:
        "Rebuild wajib memakai sumber history approved terakhir dari backend. Frontend tidak mengirim payload manual.",
      okText: "Rebuild",
      cancelText: "Batal",
      okButtonProps: { danger: true },
      onOk: async () => {
        const contextId = await resolveContextIdForRecord(record);
        if (contextId) {
          const scanRes = await api.get(`/mr-report/context/${contextId}/integrity-scan`);
          const scan = scanRes?.data?.data || scanRes?.data || {};
          const blockingCount = Number(scan?.blocking_count || 0);
          if (blockingCount > 0) {
            const topBlocking = (Array.isArray(scan?.findings) ? scan.findings : [])
              .filter((f) => String(f?.severity || "").toLowerCase() === "blocking")
              .slice(0, 3)
              .map((f) => `- ${f?.message || f?.code || "Temuan blocking"}`)
              .join("\n");
            modal.warning({
              title: "Integrity Gate Menolak Rebuild",
              content: (
                <div>
                  <p>Status: {getGovernanceStatusLabel(scan?.overall_status, blockingCount)}</p>
                  <p>Jumlah blocker: {blockingCount}</p>
                  <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{topBlocking}</pre>
                </div>
              ),
            });
            return;
          }
        }

        rebuildMutation.mutate({
          riskId,
          payload: {
            alasan_rebuild:
              "Rebuild active MR Planning Risk dari halaman history frontend.",
          },
        });
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "No",
        width: 70,
        align: "center",
        render: (_, __, index) => index + 1,
      },
      {
        title: "History ID",
        width: 110,
        render: (_, record) => safeString(getHistoryId(record)),
      },
      {
        title: "Risiko",
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{getRiskNameFromHistory(record)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Risk ID: {safeString(getRiskIdFromHistory(record, id))}
            </Text>
          </Space>
        ),
      },
      {
        title: "Versi",
        width: 120,
        align: "center",
        render: (_, record) => getVersionLabel(record),
      },
      {
        title: "Status",
        width: 130,
        align: "center",
        render: (_, record) => {
          const status = normalizeStatus(record?.status_revisi);
          return (
            <Tooltip title={getActionHint(status)}>
              <Tag color={STATUS_COLOR_MAP[status] || "default"}>
                {STATUS_LABEL_MAP[status] || status.toUpperCase()}
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: "Alasan Revisi",
        width: 260,
        render: (_, record) => (
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: "lihat" }}
            style={{ marginBottom: 0 }}
          >
            {safeString(record?.alasan_revisi)}
          </Paragraph>
        ),
      },
      {
        title: "Dibuat",
        width: 190,
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <Text>{safeString(record?.dibuat_pada || record?.created_at)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Oleh: {safeString(record?.dibuat_oleh)}
            </Text>
          </Space>
        ),
      },
      {
        title: "Approval",
        width: 230,
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Verifikasi: {safeString(record?.diverifikasi_oleh)} /{" "}
              {safeString(record?.diverifikasi_pada)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Approve: {safeString(record?.disetujui_oleh)} /{" "}
              {safeString(record?.disetujui_pada)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tolak: {safeString(record?.ditolak_oleh)} /{" "}
              {safeString(record?.ditolak_pada)}
            </Text>
          </Space>
        ),
      },
      {
        title: "JSON",
        width: 170,
        align: "center",
        render: (_, record) => (
          <Space wrap>
            <Tooltip title="Lihat before_json">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openJsonModal("before_json", record?.before_json)}
              >
                Before
              </Button>
            </Tooltip>

            <Tooltip title="Lihat after_json">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openJsonModal("after_json", record?.after_json)}
              >
                After
              </Button>
            </Tooltip>
          </Space>
        ),
      },
      {
        title: "Aksi",
        width: 320,
        fixed: "right",
        render: (_, record) => {
          const status = normalizeStatus(record?.status_revisi);
          const availability = getActionAvailability(status);
          const canDoVerifikasi = canVerifikasi && availability.verifikasi;
          const canDoApprove = canApprove && availability.approve;
          const canDoTolak = canTolak && availability.tolak;
          const canDoRebuild = canRebuild && availability.rebuild;

          return (
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {getActionHint(status)}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {getAvailableActionText(status)}
              </Text>
              <Space wrap>
                {canDoVerifikasi && (
                  <Tooltip title="Pindahkan history draft ke status verifikasi">
                    <Button
                      size="small"
                      icon={<SafetyCertificateOutlined />}
                      loading={verifikasiMutation.isPending}
                      onClick={() => handleVerifikasi(record)}
                    >
                      Verifikasi
                    </Button>
                  </Tooltip>
                )}

                {canDoApprove && (
                  <Tooltip title="Setujui history verifikasi">
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      loading={approveMutation.isPending}
                      onClick={() => handleApprove(record)}
                    >
                      Approve
                    </Button>
                  </Tooltip>
                )}

                {canDoTolak && (
                  <Tooltip title="Tolak history verifikasi dan minta perbaikan">
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      loading={tolakMutation.isPending}
                      onClick={() => handleTolak(record)}
                    >
                      Tolak
                    </Button>
                  </Tooltip>
                )}

                {canDoRebuild && (
                  <Tooltip title="Bangun ulang active record dari history approved terakhir">
                    <Button
                      size="small"
                      danger
                      icon={<RollbackOutlined />}
                      loading={rebuildMutation.isPending}
                      onClick={() => handleRebuild(record)}
                    >
                      Rebuild
                    </Button>
                  </Tooltip>
                )}
              </Space>
            </Space>
          );
        },
      },
    ],
    [
      canApprove,
      canRebuild,
      canTolak,
      canVerifikasi,
      id,
      approveMutation.isPending,
      rebuildMutation.isPending,
      tolakMutation.isPending,
      verifikasiMutation.isPending,
    ]
  );

  const errorMessage = error ? getBackendErrorMessage(error) : null;
  const errorDetail = error ? buildBackendDetail(error) : null;

  const backendMessage = backendError ? getBackendErrorMessage(backendError) : null;
  const backendDetail = backendError ? buildBackendDetail(backendError) : null;

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space
          align="start"
          justify="space-between"
          style={{ width: "100%" }}
          wrap
        >
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              History MR Planning Risk
            </Title>
            <Text type="secondary">
              Riwayat immutable perubahan risiko, before_json, after_json,
              verifikasi, approve, tolak, dan rebuild governance.
            </Text>
          </div>

          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(LIST_PATH)}>
              Kembali
            </Button>

            <Button
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Space>
        </Space>

        <Divider />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Guard History Governance"
          description="Approval wajib memakai history_id. Rebuild wajib memakai endpoint rebuild dan mengambil sumber approved history terakhir dari backend, bukan payload manual frontend."
        />

        {(errorMessage || backendMessage) && (
          <Alert
            type={errorMessage ? "error" : "warning"}
            showIcon
            closable
            style={{ marginBottom: 16 }}
            message={errorMessage || backendMessage}
            description={errorDetail || backendDetail || undefined}
            onClose={() => setBackendError(null)}
          />
        )}

        <Table
          rowKey={(record) => getHistoryId(record)}
          loading={isLoading || isFetching || isMutating}
          columns={columns}
          dataSource={histories}
          bordered
          size="middle"
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} history`,
          }}
        />
      </Card>

      <Modal
        open={jsonModal.open}
        title={jsonModal.title}
        width={900}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setJsonModal({
                open: false,
                title: "",
                content: "",
              })
            }
          >
            Tutup
          </Button>,
        ]}
        onCancel={() =>
          setJsonModal({
            open: false,
            title: "",
            content: "",
          })
        }
      >
        <pre
          style={{
            background: "#111827",
            color: "#d1d5db",
            padding: 16,
            borderRadius: 8,
            maxHeight: 520,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {jsonModal.content}
        </pre>
      </Modal>
    </div>
  );
}

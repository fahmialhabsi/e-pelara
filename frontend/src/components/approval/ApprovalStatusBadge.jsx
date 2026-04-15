/**
 * ApprovalStatusBadge — badge visual untuk status workflow approval.
 * Digunakan di tabel DPA, LAKIP, RKA, dll.
 */
import React from "react";
import { Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";

const STATUS_CONFIG = {
  DRAFT:     { color: "default",  icon: <EditOutlined />,        label: "Draft",     tooltip: "Dokumen masih dalam tahap penyusunan" },
  SUBMITTED: { color: "processing", icon: <ClockCircleOutlined />, label: "Diajukan", tooltip: "Menunggu persetujuan atasan" },
  APPROVED:  { color: "success",  icon: <CheckCircleOutlined />,  label: "Disetujui", tooltip: "Dokumen telah disetujui — tidak dapat diedit" },
  REJECTED:  { color: "error",    icon: <CloseCircleOutlined />,  label: "Ditolak",   tooltip: "Dokumen ditolak — perlu revisi" },
};

const ApprovalStatusBadge = ({ status = "DRAFT" }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <Tooltip title={cfg.tooltip}>
      <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 12 }}>
        {cfg.label}
      </Tag>
    </Tooltip>
  );
};

export default ApprovalStatusBadge;

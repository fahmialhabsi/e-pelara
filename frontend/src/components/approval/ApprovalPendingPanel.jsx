/**
 * ApprovalPendingPanel — panel daftar dokumen yang menunggu persetujuan.
 * Digunakan di admin dashboard.
 */
import React from "react";
import { Table, Tag, Badge, Typography, Alert, Button, Space } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalApi } from "../../services/approvalApi";
import ApprovalActions from "./ApprovalActions";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/id";

dayjs.extend(relativeTime);
dayjs.locale("id");

const { Text } = Typography;

const ENTITY_LABEL = {
  dpa:   "DPA",
  rka:   "RKA",
  lakip: "LAKIP",
  renja: "Renja",
  rkpd:  "RKPD",
  rpjmd: "RPJMD",
};

const ApprovalPendingPanel = ({ userRole }) => {
  const qc = useQueryClient();
  const { data: pending = [], isLoading, error } = useQuery({
    queryKey: ["approvalPending"],
    queryFn: approvalApi.getPending,
    refetchInterval: 30000,
  });

  const refresh = () => qc.invalidateQueries(["approvalPending"]);

  const columns = [
    {
      title: "Jenis",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 80,
      render: (v) => <Tag>{ENTITY_LABEL[v] || v.toUpperCase()}</Tag>,
    },
    {
      title: "ID",
      dataIndex: "entity_id",
      key: "entity_id",
      width: 60,
    },
    {
      title: "Diajukan oleh",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      render: (v) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(v).fromNow()}
        </Text>
      ),
    },
    {
      title: "Catatan",
      dataIndex: "catatan",
      key: "catatan",
      ellipsis: true,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 200,
      render: (_, record) => (
        <ApprovalActions
          entityType={record.entity_type}
          entityId={record.entity_id}
          currentStatus="SUBMITTED"
          userRole={userRole}
          onSuccess={refresh}
        />
      ),
    },
  ];

  if (error) return <Alert type="error" message="Gagal memuat antrian persetujuan" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <span>
          <Badge count={pending.length} overflowCount={99} style={{ marginRight: 8 }} />
          <Text strong>Dokumen Menunggu Persetujuan</Text>
        </span>
        <Button size="small" onClick={refresh}>Refresh</Button>
      </div>
      <Table
        rowKey={(r) => `${r.entity_type}-${r.entity_id}`}
        dataSource={pending}
        columns={columns}
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: "Tidak ada dokumen yang menunggu persetujuan" }}
      />
    </div>
  );
};

export default ApprovalPendingPanel;

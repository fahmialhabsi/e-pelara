/**
 * ApprovalTimeline — menampilkan riwayat approval suatu dokumen.
 */
import React from "react";
import { Timeline, Tag, Typography, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { approvalApi } from "../../services/approvalApi";
import dayjs from "dayjs";

const { Text } = Typography;

const ACTION_COLOR = {
  SUBMIT:  "blue",
  APPROVE: "green",
  REJECT:  "red",
  REVISE:  "orange",
};

const ApprovalTimeline = ({ entityType, entityId }) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["approvalHistory", entityType, entityId],
    queryFn: () => approvalApi.getHistory(entityType, entityId),
    enabled: !!entityId,
  });

  if (isLoading) return <Spin size="small" />;
  if (!logs.length) return <Text type="secondary">Belum ada riwayat persetujuan.</Text>;

  return (
    <Timeline
      items={logs.map((log) => ({
        color: ACTION_COLOR[log.action] || "gray",
        children: (
          <div>
            <Tag color={ACTION_COLOR[log.action]}>{log.action}</Tag>
            <Text strong> {log.username || "Sistem"}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(log.created_at).format("DD MMM YYYY HH:mm")}
            </Text>
            {log.catatan && (
              <div style={{ marginTop: 4, background: "#f5f5f5", padding: "4px 8px", borderRadius: 4 }}>
                <Text italic style={{ fontSize: 12 }}>{log.catatan}</Text>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <Tag bordered={false} style={{ fontSize: 11 }}>{log.from_status}</Tag>
              <Text style={{ fontSize: 11 }}> → </Text>
              <Tag bordered={false} color={ACTION_COLOR[log.action]} style={{ fontSize: 11 }}>{log.to_status}</Tag>
            </div>
          </div>
        ),
      }))}
    />
  );
};

export default ApprovalTimeline;

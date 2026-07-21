// LakipTable.jsx
import React, { useState } from "react";
import { Table, Button, Space, Drawer } from "antd";
import ApprovalStatusBadge from "../../../components/approval/ApprovalStatusBadge";
import ApprovalActions from "../../../components/approval/ApprovalActions";
import ApprovalTimeline from "../../../components/approval/ApprovalTimeline";
import { formatRupiah } from "../../renstra/shared/components/RenstraTabelListCommon";

const LakipTable = ({ data, onEdit, onDelete, onRefresh }) => {
  const [timelineDoc, setTimelineDoc] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "";

  const columns = [
    { title: "Tahun", dataIndex: "tahun", key: "tahun", width: 80 },
    { title: "Program", dataIndex: "program", key: "program", ellipsis: true },
    { title: "Kegiatan", dataIndex: "kegiatan", key: "kegiatan", ellipsis: true },
    { title: "Indikator", dataIndex: "indikator_kinerja", key: "indikator_kinerja", ellipsis: true },
    { title: "Target", dataIndex: "target", key: "target", width: 90 },
    { title: "Realisasi", dataIndex: "realisasi", key: "realisasi", width: 90 },
    {
      title: "Pagu Anggaran",
      dataIndex: "pagu_anggaran",
      key: "pagu_anggaran",
      width: 140,
      align: "right",
      render: (value) => formatRupiah(value),
    },
    {
      title: "Realisasi Anggaran",
      dataIndex: "realisasi_anggaran",
      key: "realisasi_anggaran",
      width: 140,
      align: "right",
      render: (value) => formatRupiah(value),
    },
    {
      title: "Status",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 110,
      render: (status) => <ApprovalStatusBadge status={status || "DRAFT"} />,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 280,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            disabled={record.approval_status === "APPROVED"}
            onClick={() => onEdit(record)}
          >
            Edit
          </Button>
          <Button size="small" onClick={() => setTimelineDoc(record)}>
            Riwayat
          </Button>
          <Button
            size="small"
            danger
            disabled={record.approval_status === "APPROVED"}
            onClick={() => onDelete(record.id)}
          >
            Hapus
          </Button>
          <ApprovalActions
            entityType="lakip"
            entityId={record.id}
            currentStatus={record.approval_status || "DRAFT"}
            userRole={userRole}
            onSuccess={onRefresh}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table rowKey="id" dataSource={data} columns={columns} scroll={{ x: 1180 }} pagination={{ pageSize: 10 }} />
      <Drawer
        title={timelineDoc ? `Riwayat Approval — LAKIP #${timelineDoc.id}` : ""}
        open={!!timelineDoc}
        onClose={() => setTimelineDoc(null)}
        width={420}
      >
        {timelineDoc && <ApprovalTimeline entityType="lakip" entityId={timelineDoc.id} />}
      </Drawer>
    </>
  );
};

export default LakipTable;

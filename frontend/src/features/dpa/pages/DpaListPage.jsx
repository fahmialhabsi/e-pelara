// DpaListPage untuk modul DPA
import React, { useEffect, useState } from "react";
import { Table, Button, Space, Drawer } from "antd";
import { useNavigate } from "react-router-dom";
import { getAllDpa } from "../services/dpaApi";
import ApprovalStatusBadge from "../../../components/approval/ApprovalStatusBadge";
import ApprovalActions from "../../../components/approval/ApprovalActions";
import ApprovalTimeline from "../../../components/approval/ApprovalTimeline";

const DpaListPage = () => {
  const [data, setData] = useState([]);
  const [timelineDoc, setTimelineDoc] = useState(null);
  const navigate = useNavigate();

  // Ambil role dari localStorage (format simpan sesuai authService)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user.role || "";

  const reload = () => {
    getAllDpa().then(setData).catch(console.error);
  };

  useEffect(() => { reload(); }, []);

  const columns = [
    { title: "No", key: "no", render: (_, __, i) => i + 1, width: 50 },
    { title: "Program", dataIndex: "program", key: "program", ellipsis: true },
    { title: "Kegiatan", dataIndex: "kegiatan", key: "kegiatan", ellipsis: true },
    { title: "Sub Kegiatan", dataIndex: "sub_kegiatan", key: "sub_kegiatan", ellipsis: true },
    {
      title: "Kode Rekening",
      key: "kode_rekening",
      width: 160,
      render: (_, record) =>
        record.kode_rekening ? (
          <div>
            <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f5f5f5", padding: "1px 5px", borderRadius: 3, border: "1px solid #d9d9d9" }}>
              {record.kode_rekening}
            </span>
            {record.nama_rekening && (
              <div style={{ fontSize: 10, color: "#888", marginTop: 2, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {record.nama_rekening}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#bbb", fontSize: 11 }}>—</span>
        ),
    },
    {
      title: "Pagu",
      dataIndex: "anggaran",
      key: "anggaran",
      render: (val) => val ? `Rp ${Number(val).toLocaleString("id-ID")}` : "-",
    },
    {
      title: "Status",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 110,
      render: (status) => <ApprovalStatusBadge status={status || "DRAFT"} />,
      filters: [
        { text: "Draft", value: "DRAFT" },
        { text: "Diajukan", value: "SUBMITTED" },
        { text: "Disetujui", value: "APPROVED" },
        { text: "Ditolak", value: "REJECTED" },
      ],
      onFilter: (val, rec) => (rec.approval_status || "DRAFT") === val,
    },
    {
      title: "Aksi",
      key: "actions",
      width: 280,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            disabled={record.approval_status === "APPROVED"}
            onClick={() => navigate(`/dpa/form/${record.id}`)}
          >
            Edit
          </Button>
          <Button size="small" onClick={() => setTimelineDoc(record)}>
            Riwayat
          </Button>
          <ApprovalActions
            entityType="dpa"
            entityId={record.id}
            currentStatus={record.approval_status || "DRAFT"}
            userRole={userRole}
            onSuccess={reload}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Daftar Dokumen Pelaksanaan Anggaran (DPA)</h1>
        <Button type="primary" onClick={() => navigate("/dpa/form/new")}>
          + Tambah DPA
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />

      <Drawer
        title={timelineDoc ? `Riwayat Approval — DPA #${timelineDoc.id}` : ""}
        open={!!timelineDoc}
        onClose={() => setTimelineDoc(null)}
        width={420}
      >
        {timelineDoc && (
          <ApprovalTimeline entityType="dpa" entityId={timelineDoc.id} />
        )}
      </Drawer>
    </div>
  );
};

export default DpaListPage;

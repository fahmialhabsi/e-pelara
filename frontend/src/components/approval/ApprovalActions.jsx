/**
 * ApprovalActions — tombol aksi approval untuk staff dan admin.
 * - Staff: tombol "Ajukan"
 * - Admin: tombol "Setujui", "Tolak", "Buka Revisi"
 */
import React, { useState } from "react";
import { Button, Space, Modal, Input, Popconfirm, message } from "antd";
import {
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { approvalApi } from "../../services/approvalApi";

const { TextArea } = Input;

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];

const ApprovalActions = ({ entityType, entityId, currentStatus, userRole, onSuccess }) => {
  const [rejectModal, setRejectModal] = useState(false);
  const [catatan, setCatatan] = useState("");
  const isAdmin = ADMIN_ROLES.includes(userRole);

  const doAction = async (action, notes = "") => {
    try {
      await approvalApi[action](entityType, entityId, notes);
      message.success(`Berhasil: ${action}`);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.message || `Gagal ${action}`);
    }
  };

  return (
    <>
      <Space size="small" wrap>
        {/* Staff: hanya bisa SUBMIT dari DRAFT atau REJECTED */}
        {(currentStatus === "DRAFT" || currentStatus === "REJECTED") && (
          <Popconfirm
            title="Ajukan dokumen ini untuk persetujuan?"
            onConfirm={() => doAction("submit")}
            okText="Ya"
            cancelText="Batal"
          >
            <Button size="small" type="primary" icon={<SendOutlined />}>
              Ajukan
            </Button>
          </Popconfirm>
        )}

        {/* Admin: Setujui / Tolak hanya dari SUBMITTED */}
        {isAdmin && currentStatus === "SUBMITTED" && (
          <>
            <Popconfirm
              title="Setujui dokumen ini?"
              onConfirm={() => doAction("approve")}
              okText="Setujui"
              cancelText="Batal"
            >
              <Button size="small" type="primary" style={{ background: "#52c41a", border: "none" }} icon={<CheckOutlined />}>
                Setujui
              </Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => setRejectModal(true)}
            >
              Tolak
            </Button>
          </>
        )}

        {/* Admin: Buka Revisi dari APPROVED/SUBMITTED/REJECTED */}
        {isAdmin && ["APPROVED", "SUBMITTED", "REJECTED"].includes(currentStatus) && (
          <Popconfirm
            title="Kembalikan dokumen ke Draft untuk direvisi?"
            onConfirm={() => doAction("revise", "Revisi diminta oleh admin")}
            okText="Ya"
            cancelText="Batal"
          >
            <Button size="small" icon={<RedoOutlined />}>
              Buka Revisi
            </Button>
          </Popconfirm>
        )}
      </Space>

      {/* Modal konfirmasi penolakan */}
      <Modal
        title="Tolak Dokumen"
        open={rejectModal}
        onOk={() => {
          if (!catatan.trim()) {
            message.warning("Alasan penolakan wajib diisi");
            return;
          }
          doAction("reject", catatan);
          setRejectModal(false);
          setCatatan("");
        }}
        onCancel={() => { setRejectModal(false); setCatatan(""); }}
        okText="Tolak"
        okButtonProps={{ danger: true }}
        cancelText="Batal"
      >
        <p>Masukkan alasan penolakan:</p>
        <TextArea
          rows={3}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Contoh: Data anggaran tidak sesuai DPA..."
        />
      </Modal>
    </>
  );
};

export default ApprovalActions;

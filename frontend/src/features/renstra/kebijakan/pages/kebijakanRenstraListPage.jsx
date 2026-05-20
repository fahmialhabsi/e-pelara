import React from "react";
import { Table, Button, Space, Popconfirm, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BsArrowLeftCircle } from "react-icons/bs";

const KebijakanRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["renstra-kebijakan"],
    queryFn: async () => {
      const res = await api.get("/renstra-kebijakan");
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-kebijakan/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renstra-kebijakan"] });
      message.success("Data kebijakan berhasil dihapus");
    },
    onError: () => {
      message.error("Gagal menghapus data kebijakan");
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={() => navigate("/dashboard-renstra")}
          icon={<BsArrowLeftCircle />}
        >
          Kembali
        </Button>
      </Space>

      <Table
        dataSource={data}
        rowKey="id"
        columns={[
          { title: "Kode", dataIndex: "kode_kebjkn" },
          { title: "Nama Arah Kebijakan", dataIndex: "deskripsi" },
          { title: "Prioritas", dataIndex: "prioritas" },
          {
            title: "Aksi",
            key: "aksi",
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => navigate(`/renstra/kebijakan/edit/${record.id}`)}
                >
                  Ubah
                </Button>
                <Popconfirm
                  title="Hapus kebijakan ini?"
                  description="Data akan dihapus permanen."
                  onConfirm={() => deleteMutation.mutate(record.id)}
                  okText="Ya, Hapus"
                  cancelText="Batal"
                >
                  <Button type="link" danger loading={deleteMutation.isPending}>
                    Hapus
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default KebijakanRenstraListPage;

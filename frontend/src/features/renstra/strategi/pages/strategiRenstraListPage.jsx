import React from "react";
import { Table, Button, Space } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

const StrategiRenstraListPage = () => {
  const navigate = useNavigate();

  const { data = [] } = useQuery({
    queryKey: ["renstra-strategi"],
    queryFn: async () => {
      const res = await api.get("/renstra-strategi");
      return res.data?.data || [];
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => navigate("/renstra/strategi/add")}>
        Tambah Strategi
      </Button>
      <Button onClick={() => navigate("/dashboard-renstra")}>
        Kembali
      </Button>
      <Table
        dataSource={data}
        rowKey="id"
        columns={[
          { title: "Strategi", dataIndex: "deskripsi" },
          {
            title: "Aksi",
            render: (_, r) => (
              <Space>
                <Button onClick={() => navigate(`/renstra/strategi/edit/${r.id}`)}>
                  Edit
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default StrategiRenstraListPage;
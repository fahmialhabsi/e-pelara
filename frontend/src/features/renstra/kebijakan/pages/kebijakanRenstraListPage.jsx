import React from "react";
import { Table, Button } from "antd";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

const KebijakanRenstraListPage = () => {
  const { data = [] } = useQuery({
    queryKey: ["renstra-kebijakan"],
    queryFn: async () => {
      const res = await api.get("/renstra-kebijakan");
      return res.data?.data || [];
    },
  });

  return (
    <Table
      dataSource={data}
      rowKey="id"
      columns={[
        { title: "Kebijakan", dataIndex: "deskripsi" },
      ]}
    />
  );
};

export default KebijakanRenstraListPage;
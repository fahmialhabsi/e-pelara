import React, { useState } from "react";
import { Table, Button, message, Tag, Input } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const ListRenstraOPD = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: renstraList = [], isLoading } = useQuery({
    queryKey: ["renstra-opd"],
    queryFn: async () => {
      const res = await api.get("/renstra-opd");
      // Pastikan yang dikembalikan adalah array, meskipun API return null/objek kosong
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const setAktifMutation = useMutation({
    mutationFn: async (id) => api.put(`/renstra-opd/set-aktif/${id}`),
    onSuccess: () => {
      message.success("Berhasil set aktif");
      queryClient.invalidateQueries(["renstra-opd"]);
    },
    onError: () => message.error("Gagal set aktif"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/renstra-opd/${id}`),
    onSuccess: () => {
      message.success("Berhasil dihapus");
      queryClient.invalidateQueries(["renstra-opd"]);
    },
    onError: () => message.error("Gagal menghapus data"),
  });

  const filteredData = renstraList.filter((item) =>
    item.bidang_opd?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Bidang OPD",
      dataIndex: "bidang_opd",
      sorter: (a, b) => a.bidang_opd.localeCompare(b.bidang_opd),
    },
    {
      title: "Sub Bidang",
      dataIndex: "sub_bidang_opd",
    },
    {
      title: "Tahun",
      render: (_, row) => `${row.tahun_mulai} - ${row.tahun_akhir}`,
      sorter: (a, b) => a.tahun_mulai - b.tahun_mulai,
    },
    {
      title: "Status",
      render: (row) =>
        row.is_aktif ? (
          <Tag color="green">Aktif</Tag>
        ) : (
          <Tag color="red">Nonaktif</Tag>
        ),
    },
    {
      title: "Aksi",
      render: (row) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra-opd/edit/${row.id}`)}
          >
            Edit
          </Button>
          <Button
            type="primary"
            onClick={() => setAktifMutation.mutate(row.id)}
            disabled={row.is_aktif}
          >
            Set Aktif
          </Button>
          <Button
            danger
            type="link"
            onClick={() => {
              if (window.confirm("Yakin ingin menghapus data ini?")) {
                deleteMutation.mutate(row.id);
              }
            }}
          >
            Hapus
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <h2>Daftar RENSTRA OPD</h2>
      <Input.Search
        placeholder="Cari Bidang OPD"
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
      />
      <Button type="primary" onClick={() => navigate("/renstra-opd/new")}>
        Tambah Baru
      </Button>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default ListRenstraOPD;

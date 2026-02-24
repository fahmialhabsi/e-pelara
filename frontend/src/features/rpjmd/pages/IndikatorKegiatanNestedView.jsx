import React, { useState } from "react";
import { Table, Button, Spinner } from "react-bootstrap";
import api from "@/services/api";

const IndikatorKegiatanNestedView = ({ data, loading, refetch }) => {
  const [expandedRowId, setExpandedRowId] = useState(null);

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        await api.delete(`/indikator-kegiatan/${id}`);
        refetch();
      } catch (err) {
        console.error("Gagal menghapus indikator:", err);
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th rowSpan={2}>Kode</th>
          <th rowSpan={2}>Nama Indikator</th>
          <th rowSpan={2}>Tolok Ukur</th>
          <th rowSpan={2}>Satuan</th>
          <th rowSpan={2}>Penanggung Jawab</th>
          <th colSpan={5}>Capaian Tahun Ke-</th>
          <th rowSpan={2}>Baseline</th>
          <th colSpan={5}>Target Tahun Ke-</th>
          <th rowSpan={2}>Aksi</th>
        </tr>
        <tr>
          <th>I</th>
          <th>II</th>
          <th>III</th>
          <th>IV</th>
          <th>V</th>
          <th>I</th>
          <th>II</th>
          <th>III</th>
          <th>IV</th>
          <th>V</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <React.Fragment key={item.id}>
            <tr>
              <td>{item.kode_indikator}</td>
              <td>{item.nama_indikator}</td>
              <td>{item.tolok_ukur_kinerja}</td>
              <td>{item.satuan}</td>
              <td>{item.opdPenanggungJawab?.nama_bidang_opd || "-"}</td>
              <td>{item.capaian_tahun_1 ?? "-"}</td>
              <td>{item.capaian_tahun_2 ?? "-"}</td>
              <td>{item.capaian_tahun_3 ?? "-"}</td>
              <td>{item.capaian_tahun_4 ?? "-"}</td>
              <td>{item.capaian_tahun_5 ?? "-"}</td>
              <td>{item.baseline ?? "-"}</td>
              <td>{item.target_tahun_1 ?? "-"}</td>
              <td>{item.target_tahun_2 ?? "-"}</td>
              <td>{item.target_tahun_3 ?? "-"}</td>
              <td>{item.target_tahun_4 ?? "-"}</td>
              <td>{item.target_tahun_5 ?? "-"}</td>
              <td className="d-flex gap-1 flex-wrap">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => toggleExpand(item.id)}
                >
                  {expandedRowId === item.id ? "Tutup" : "Detail"}
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() =>
                    (window.location.href = `/dashboard-rpjmd/indikator-kegiatan-edit/${item.id}`)
                  }
                >
                  Ubah
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  Hapus
                </Button>
              </td>
            </tr>

            {expandedRowId === item.id && (
              <tr>
                <td colSpan={17}>
                  <div className="bg-light p-3 rounded">
                    <p>
                      <strong>Definisi Operasional:</strong>{" "}
                      {item.definisi_operasional || "-"}
                    </p>
                    <p>
                      <strong>Metode Penghitungan:</strong>{" "}
                      {item.metode_penghitungan || "-"}
                    </p>
                    <p>
                      <strong>Kriteria Kuantitatif:</strong>{" "}
                      {item.kriteria_kuantitatif || "-"}
                    </p>
                    <p>
                      <strong>Kriteria Kualitatif:</strong>{" "}
                      {item.kriteria_kualitatif || "-"}
                    </p>
                    <p>
                      <strong>Sumber Data:</strong> {item.sumber_data || "-"}
                    </p>
                    <p>
                      <strong>Keterangan:</strong> {item.keterangan || "-"}
                    </p>
                    <p>
                      <strong>Rekomendasi:</strong> {item.rekomendasi_ai || "-"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </Table>
  );
};

export default IndikatorKegiatanNestedView;

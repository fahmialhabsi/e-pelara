import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button, Spinner, Table } from "react-bootstrap";

const IndikatorProgramNestedView = ({
  data = [],
  loading = false,
  refetch,
}) => {
  const navigate = useNavigate();
  const [expandedRowId, setExpandedRowId] = useState(null);

  const handleDelete = async (item) => {
    try {
      await api.delete(`/indikator-program/${item.id}`);
      if (refetch) refetch();
    } catch (err) {
      console.error("Gagal hapus:", err.message);
    }
  };

  const toggleExpandRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th rowSpan={2}>Kode</th>
            <th rowSpan={2}>Nama Indikator</th>
            <th rowSpan={2}>Tolok Ukur</th>
            <th rowSpan={2}>Satuan</th>
            <th rowSpan={2}>Penanggung Jawab</th>
            <th colSpan={5} className="text-center">
              Capaian Tahun Ke-
            </th>
            <th rowSpan={2}>Baseline</th>
            <th colSpan={5} className="text-center">
              Target Tahun Ke-
            </th>
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
          {data.length === 0 ? (
            <tr>
              <td colSpan={18} className="text-center">
                Tidak ada data.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <React.Fragment key={item.id}>
                <tr>
                  <td>{item.kode_indikator}</td>
                  <td>{item.nama_indikator}</td>
                  <td>{item.tolok_ukur_kinerja}</td>
                  <td>{item.satuan}</td>
                  <td>
                    {item.opdPenanggungJawab?.nama_opd || "Tidak tersedia"}
                  </td>

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

                  <td className="d-flex gap-1">
                    <Button
                      size="sm"
                      variant="info"
                      onClick={() => toggleExpandRow(item.id)}
                    >
                      {expandedRowId === item.id ? "Tutup" : "Detail"}
                    </Button>
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() =>
                        navigate(
                          `/dashboard-rpjmd/indikator-program-edit/${item.id}`
                        )
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(item)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>

                {expandedRowId === item.id && (
                  <tr>
                    <td colSpan={18}>
                      <div className="bg-light p-3 rounded">
                        <p>
                          <strong>Outcome:</strong> {item.jenis}
                        </p>
                        <p>
                          <strong>Jenis Indikator:</strong>{" "}
                          {item.jenis_indikator}
                        </p>
                        <p>
                          <strong>Definisi Operasional:</strong>{" "}
                          {item.definisi_operasional}
                        </p>
                        <p>
                          <strong>Metode Penghitungan:</strong>{" "}
                          {item.metode_penghitungan}
                        </p>
                        <p>
                          <strong>Kriteria Kuantitatif:</strong>{" "}
                          {item.kriteria_kuantitatif}
                        </p>
                        <p>
                          <strong>Kriteria Kualitatif:</strong>{" "}
                          {item.kriteria_kualitatif}
                        </p>
                        <p>
                          <strong>Sumber Data:</strong> {item.sumber_data}
                        </p>
                        <p>
                          <strong>Keterangan:</strong> {item.keterangan}
                        </p>
                        <p>
                          <strong>Rekomendasi:</strong> {item.rekomendasi_ai}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default IndikatorProgramNestedView;

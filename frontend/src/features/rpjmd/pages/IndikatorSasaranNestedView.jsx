import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table } from "react-bootstrap";
import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";

const IndikatorSasaranNestedView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();

  const fetchData = () => {
    if (!dokumen || !tahun) return;

    setLoading(true);
    api
      .get("/indikator-sasaran", {
        params: {
          jenis_dokumen: dokumen.toUpperCase(),
          tahun,
        },
      })
      .then((res) => {
        console.log("✅ Response indikator sasaran:", res.data); // Untuk debug
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          console.warn("❗ Response tidak dalam format array:", res.data);
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  };

  const toggleExpandRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleDelete = (id) => {
    api.delete(`/indikator-sasaran/${id}`).then(fetchData);
  };

  useEffect(() => {
    fetchData();
  }, [dokumen, tahun]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Daftar Indikator Sasaran</h5>
        <Button
          variant="primary"
          onClick={() => navigate("/rpjmd/indikator-sasaran/create")}
        >
          Tambah
        </Button>
      </div>

      <Table bordered responsive size="sm">
        <thead>
          <tr>
            <th rowSpan="2">Uraian Indikator</th>
            <th rowSpan="2">Target</th>
            <th rowSpan="2">Satuan</th>
            <th colSpan="5" className="text-center">
              Capaian Tahun Ke
            </th>
            <th rowSpan="2">Baseline</th>
            <th colSpan="5" className="text-center">
              Target Tahun Ke
            </th>
            <th rowSpan="2">Aksi</th>
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
          {items.map((item) => (
            <React.Fragment key={item.id}>
              <tr>
                <td>
                  {item.kode_indikator} - {item.nama_indikator}
                </td>
                <td>{item.target_kinerja}</td>
                <td>{item.satuan}</td>
                {[1, 2, 3, 4, 5].map((i) => (
                  <td key={`capaian_${i}`}>{item[`capaian_tahun_${i}`]}</td>
                ))}
                <td>{item.baseline}</td>
                {[1, 2, 3, 4, 5].map((i) => (
                  <td key={`target_${i}`}>{item[`target_tahun_${i}`]}</td>
                ))}
                <td>
                  <div className="d-flex gap-2">
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
                          `/dashboard-rpjmd/indikator-sasaran-edit/${item.id}`
                        )
                      }
                    >
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
              {expandedRowId === item.id && (
                <tr>
                  <td colSpan="15">
                    <div className="bg-light p-3 rounded">
                      <p>
                        <strong>Jenis:</strong> {item.indikator_kinerja || item.jenis || '—'}
                      </p>
                      <p>
                        <strong>Jenis Indikator:</strong> {item.jenis_indikator}
                      </p>
                      <p>
                        <strong>Tolok Ukur:</strong> {item.tolok_ukur_kinerja}
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
                        <strong>Nama OPD:</strong>{" "}
                        {item.opdPenanggungJawab?.nama_opd || "Tidak tersedia"}
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
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default IndikatorSasaranNestedView;
